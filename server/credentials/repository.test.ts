import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CREDENTIAL_KEY_BYTES,
  sealCredentialPayload,
  utf8ToBytes,
} from "@/server/credentials/crypto";
import { ExternalCredentialError } from "@/server/credentials/errors";
import { requireOwnedExternalConnection } from "@/server/credentials/ownership";
import {
  deleteExternalProviderCredentials,
  openExternalProviderCredentials,
  storeExternalProviderCredentials,
} from "@/server/credentials/repository";

function randomKey(): Uint8Array {
  const key = new Uint8Array(EXTERNAL_CREDENTIAL_KEY_BYTES);
  crypto.getRandomValues(key);
  return key;
}

type Row = {
  connection_id: string;
  user_id: string;
  ciphertext: string;
  nonce: string;
  encryption_version: string;
  scopes: string;
  access_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function createMemoryAdmin(options?: {
  connections?: Array<{ id: string; user_id: string }>;
}) {
  const connections = new Map(
    (options?.connections ?? [{ id: "conn-1", user_id: "user-1" }]).map((row) => [row.id, row]),
  );
  const credentials = new Map<string, Row>();

  const admin = {
    from(table: string) {
      if (table === "external_temporal_connections") {
        return {
          select() {
            return {
              eq(field: string, value: string) {
                return {
                  eq(field2: string, value2: string) {
                    return {
                      async maybeSingle() {
                        const row = connections.get(value);
                        if (!row) return { data: null, error: null };
                        if (field === "id" && field2 === "user_id" && row.user_id === value2) {
                          return { data: { id: row.id, user_id: row.user_id }, error: null };
                        }
                        return { data: null, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "external_provider_credentials") {
        return {
          async upsert(row: Row) {
            credentials.set(row.connection_id, {
              ...row,
              created_at: credentials.get(row.connection_id)?.created_at ?? row.updated_at,
            });
            return { error: null };
          },
          select() {
            return {
              eq(field: string, value: string) {
                return {
                  eq(field2: string, value2: string) {
                    return {
                      async maybeSingle() {
                        const row = credentials.get(value);
                        if (!row) return { data: null, error: null };
                        if (field === "connection_id" && field2 === "user_id" && row.user_id === value2) {
                          return { data: row, error: null };
                        }
                        return { data: null, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq(field: string, value: string) {
                return {
                  async eq(field2: string, value2: string) {
                    const row = credentials.get(value);
                    if (row && field === "connection_id" && field2 === "user_id" && row.user_id === value2) {
                      credentials.delete(value);
                    }
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return { admin: admin as unknown as SupabaseClient, credentials, tablesTouched: [] as string[] };
}

describe("external credential ownership", () => {
  it("allows an owned connection", async () => {
    const { admin } = createMemoryAdmin();
    await expect(requireOwnedExternalConnection(admin, "user-1", "conn-1")).resolves.toEqual({
      userId: "user-1",
      connectionId: "conn-1",
    });
  });

  it("rejects another user's connection and does not accept caller-owned user_id alone", async () => {
    const { admin } = createMemoryAdmin({
      connections: [{ id: "conn-2", user_id: "user-2" }],
    });
    await expect(requireOwnedExternalConnection(admin, "user-1", "conn-2")).rejects.toMatchObject({
      code: "unauthorized_connection",
    });
  });
});

describe("external credential repository", () => {
  it("stores, opens, replaces, and deletes one envelope per connection", async () => {
    const key = randomKey();
    const { admin, credentials } = createMemoryAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = async (input: {
      envelope: { encryptionVersion: string; ciphertextBase64: string; nonceBase64: string };
      context: { userId: string; connectionId: string };
    }) =>
      (await import("@/server/credentials/crypto")).openCredentialPayload({
        ...input,
        keyBytes: key,
      });

    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: utf8ToBytes("first-secret"),
        scopes: "calendar.readonly",
      },
      { adminClient: admin, seal },
    );
    expect(credentials.size).toBe(1);
    const firstCipher = credentials.get("conn-1")!.ciphertext;

    const opened = await openExternalProviderCredentials(
      { authenticatedUserId: "user-1", connectionId: "conn-1" },
      { adminClient: admin, open },
    );
    expect(Buffer.from(opened.plaintext).toString("utf8")).toBe("first-secret");
    expect(opened.scopes).toBe("calendar.readonly");

    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: utf8ToBytes("second-secret"),
        scopes: "calendar.readonly",
      },
      { adminClient: admin, seal },
    );
    expect(credentials.size).toBe(1);
    expect(credentials.get("conn-1")!.ciphertext).not.toBe(firstCipher);

    const replaced = await openExternalProviderCredentials(
      { authenticatedUserId: "user-1", connectionId: "conn-1" },
      { adminClient: admin, open },
    );
    expect(Buffer.from(replaced.plaintext).toString("utf8")).toBe("second-secret");

    await deleteExternalProviderCredentials(
      { authenticatedUserId: "user-1", connectionId: "conn-1" },
      { adminClient: admin },
    );
    expect(credentials.size).toBe(0);
  });

  it("rejects store/open for another user's connection", async () => {
    const key = randomKey();
    const { admin } = createMemoryAdmin({
      connections: [{ id: "conn-2", user_id: "user-2" }],
    });
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });

    await expect(
      storeExternalProviderCredentials(
        {
          authenticatedUserId: "user-1",
          connectionId: "conn-2",
          plaintext: "x",
          scopes: "",
        },
        { adminClient: admin, seal },
      ),
    ).rejects.toMatchObject({ code: "unauthorized_connection" });
  });

  it("distinguishes missing credentials from corrupt envelopes", async () => {
    const key = randomKey();
    const { admin, credentials } = createMemoryAdmin();
    const open = async (input: {
      envelope: { encryptionVersion: string; ciphertextBase64: string; nonceBase64: string };
      context: { userId: string; connectionId: string };
    }) =>
      (await import("@/server/credentials/crypto")).openCredentialPayload({
        ...input,
        keyBytes: key,
      });

    await expect(
      openExternalProviderCredentials(
        { authenticatedUserId: "user-1", connectionId: "conn-1" },
        { adminClient: admin, open },
      ),
    ).rejects.toMatchObject({ code: "credential_missing" });

    credentials.set("conn-1", {
      connection_id: "conn-1",
      user_id: "user-1",
      ciphertext: Buffer.from("not-valid-cipher").toString("base64"),
      nonce: Buffer.alloc(12, 7).toString("base64"),
      encryption_version: "v1",
      scopes: "",
      access_token_expires_at: null,
      created_at: "2026-10-07T00:00:00.000Z",
      updated_at: "2026-10-07T00:00:00.000Z",
    });

    await expect(
      openExternalProviderCredentials(
        { authenticatedUserId: "user-1", connectionId: "conn-1" },
        { adminClient: admin, open },
      ),
    ).rejects.toMatchObject({ code: "credential_unopenable" });
  });

  it("does not accept an arbitrary user_id as authority without connection ownership", async () => {
    const key = randomKey();
    const { admin } = createMemoryAdmin({
      connections: [{ id: "conn-1", user_id: "real-owner" }],
    });
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });

    await expect(
      storeExternalProviderCredentials(
        {
          authenticatedUserId: "attacker",
          connectionId: "conn-1",
          plaintext: "x",
          scopes: "",
        },
        { adminClient: admin, seal },
      ),
    ).rejects.toBeInstanceOf(ExternalCredentialError);
  });

  it("keeps delete scoped to credentials only", async () => {
    const memory = createMemoryAdmin();
    memory.credentials.set("conn-1", {
      connection_id: "conn-1",
      user_id: "user-1",
      ciphertext: "x",
      nonce: "y",
      encryption_version: "v1",
      scopes: "",
      access_token_expires_at: null,
      created_at: "2026-10-07T00:00:00.000Z",
      updated_at: "2026-10-07T00:00:00.000Z",
    });
    const tables: string[] = [];
    const trackingAdmin = {
      from(table: string) {
        tables.push(table);
        return (memory.admin as unknown as { from: (table: string) => unknown }).from(table);
      },
    } as unknown as SupabaseClient;
    await deleteExternalProviderCredentials(
      { authenticatedUserId: "user-1", connectionId: "conn-1" },
      { adminClient: trackingAdmin },
    );
    expect(tables).toContain("external_provider_credentials");
    expect(tables).toContain("external_temporal_connections");
    expect(tables).not.toContain("external_temporal_facts");
    expect(tables).not.toContain("external_temporal_sources");
    expect(memory.credentials.size).toBe(0);
  });
});
