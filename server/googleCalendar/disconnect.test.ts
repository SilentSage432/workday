import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  EXTERNAL_CREDENTIAL_KEY_BYTES,
  sealCredentialPayload,
  openCredentialPayload,
} from "@/server/credentials/crypto";
import { storeExternalProviderCredentials } from "@/server/credentials/repository";
import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/server/googleCalendar/config";
import { disconnectGoogleCalendarForUser } from "@/server/googleCalendar/disconnect";
import {
  revokeGoogleToken,
  serializeGoogleCredentialPayload,
} from "@/server/googleCalendar/oauth";
import { EXTERNAL_PROVIDER_GOOGLE_CALENDAR } from "@/domain/externalTemporal";

function randomKey(): Uint8Array {
  const key = new Uint8Array(EXTERNAL_CREDENTIAL_KEY_BYTES);
  crypto.getRandomValues(key);
  return key;
}

type CredRow = {
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

function createDisconnectAdmin() {
  const connection = {
    id: "conn-1",
    user_id: "user-1",
    provider_type: EXTERNAL_PROVIDER_GOOGLE_CALENDAR,
    status: "connected",
    display_label: "Google Calendar",
    created_at: "t0",
    updated_at: "t0",
  };
  const credentials = new Map<string, CredRow>();
  const sources = new Map<string, { id: string; selected: boolean; user_id: string; connection_id: string }>([
    ["s1", { id: "s1", selected: true, user_id: "user-1", connection_id: "conn-1" }],
  ]);

  const clearedFacts: string[] = [];
  const admin = {
    async rpc(name: string, args: { p_user_id: string; p_connection_id: string }) {
      if (name === "clear_external_facts_for_connection") {
        clearedFacts.push(`${args.p_user_id}:${args.p_connection_id}`);
        return { error: null };
      }
      return { error: { message: `unexpected rpc ${name}` } };
    },
    from(table: string) {
      if (table === "external_temporal_connections") {
        return {
          select() {
            return {
              eq(field: string, value: string) {
                return {
                  eq(field2: string, value2: string) {
                    return {
                      order() {
                        return {
                          limit() {
                            return {
                              async maybeSingle() {
                                if (
                                  field === "user_id" &&
                                  value === "user-1" &&
                                  field2 === "provider_type"
                                ) {
                                  return { data: { ...connection }, error: null };
                                }
                                return { data: null, error: null };
                              },
                            };
                          },
                        };
                      },
                      async maybeSingle() {
                        if (field === "id" && value === "conn-1" && field2 === "user_id" && value2 === "user-1") {
                          return { data: { id: "conn-1", user_id: "user-1" }, error: null };
                        }
                        return { data: null, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          update(row: { status?: string; updated_at?: string }) {
            return {
              eq() {
                return {
                  async eq() {
                    if (row.status) connection.status = row.status;
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "external_provider_credentials") {
        return {
          async upsert(row: CredRow) {
            credentials.set(row.connection_id, row);
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
      if (table === "external_temporal_sources") {
        return {
          update(row: { selected?: boolean }) {
            return {
              eq() {
                return {
                  async eq() {
                    for (const [id, source] of sources) {
                      sources.set(id, { ...source, selected: row.selected === true });
                    }
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(table);
    },
  };

  return {
    admin: admin as unknown as SupabaseClient,
    credentials,
    sources,
    connection,
    clearedFacts,
  };
}

describe("Google token revoke", () => {
  it("reports remote success and failure without throwing", async () => {
    const ok = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(
      revokeGoogleToken({ token: "refresh", http: ok as unknown as typeof fetch }),
    ).resolves.toEqual({ revokedRemotely: true });

    const fail = vi.fn(async () => new Response("nope", { status: 400 }));
    await expect(
      revokeGoogleToken({ token: "refresh", http: fail as unknown as typeof fetch }),
    ).resolves.toEqual({ revokedRemotely: false });
  });
});

describe("Google disconnect orchestration", () => {
  it("revokes best-effort, deletes custody, clears selection, marks disconnected", async () => {
    const key = randomKey();
    const { admin, credentials, sources, connection, clearedFacts } = createDisconnectAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = (input: Parameters<typeof openCredentialPayload>[0]) =>
      openCredentialPayload({ ...input, keyBytes: key });

    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: serializeGoogleCredentialPayload({
          accessToken: "access",
          refreshToken: "refresh",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: Date.now() + 60_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        scopes: GOOGLE_CALENDAR_READONLY_SCOPE,
      },
      { adminClient: admin, seal, open },
    );
    expect(credentials.size).toBe(1);

    const http = vi.fn(async () => new Response(null, { status: 200 }));
    const result = await disconnectGoogleCalendarForUser({
      authenticatedUserId: "user-1",
      admin,
      http: http as unknown as typeof fetch,
      deps: { adminClient: admin, seal, open },
    });

    expect(result).toEqual({
      status: "disconnected",
      revokedRemotely: true,
      message: null,
    });
    expect(credentials.size).toBe(0);
    expect(connection.status).toBe("disconnected");
    expect([...sources.values()].every((row) => row.selected === false)).toBe(true);
    expect(clearedFacts).toEqual(["user-1:conn-1"]);
    const firstCall = http.mock.calls[0] as unknown as [string];
    expect(String(firstCall[0])).toContain("oauth2.googleapis.com/revoke");
  });

  it("ends local relationship when remote revoke fails", async () => {
    const key = randomKey();
    const { admin, credentials, connection, clearedFacts } = createDisconnectAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = (input: Parameters<typeof openCredentialPayload>[0]) =>
      openCredentialPayload({ ...input, keyBytes: key });

    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: serializeGoogleCredentialPayload({
          accessToken: "access",
          refreshToken: "refresh",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: Date.now() + 60_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        scopes: GOOGLE_CALENDAR_READONLY_SCOPE,
      },
      { adminClient: admin, seal, open },
    );

    const http = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await disconnectGoogleCalendarForUser({
      authenticatedUserId: "user-1",
      admin,
      http: http as unknown as typeof fetch,
      deps: { adminClient: admin, seal, open },
    });

    expect(result.revokedRemotely).toBe(false);
    expect(result.message).toMatch(/Disconnected in Orient/);
    expect(credentials.size).toBe(0);
    expect(connection.status).toBe("disconnected");
    expect(clearedFacts).toEqual(["user-1:conn-1"]);
  });
});
