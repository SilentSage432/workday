import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  EXTERNAL_CREDENTIAL_KEY_BYTES,
  openCredentialPayload,
  sealCredentialPayload,
} from "@/server/credentials/crypto";
import { storeExternalProviderCredentials } from "@/server/credentials/repository";
import { openAuthorizedGoogleCredential } from "@/server/googleCalendar/authorizedAccess";
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_OAUTH_CLIENT_ID_ENV,
  GOOGLE_OAUTH_CLIENT_SECRET_ENV,
  GOOGLE_OAUTH_REDIRECT_URI_ENV,
} from "@/server/googleCalendar/config";
import { serializeGoogleCredentialPayload } from "@/server/googleCalendar/oauth";

function withGoogleConfig<T>(run: () => Promise<T>): Promise<T> {
  const previous = {
    id: process.env[GOOGLE_OAUTH_CLIENT_ID_ENV],
    secret: process.env[GOOGLE_OAUTH_CLIENT_SECRET_ENV],
    redirect: process.env[GOOGLE_OAUTH_REDIRECT_URI_ENV],
  };
  process.env[GOOGLE_OAUTH_CLIENT_ID_ENV] = "client-id";
  process.env[GOOGLE_OAUTH_CLIENT_SECRET_ENV] = "client-secret";
  process.env[GOOGLE_OAUTH_REDIRECT_URI_ENV] =
    "https://orient-cyan.vercel.app/api/external/google/callback";
  return run().finally(() => {
    if (previous.id === undefined) delete process.env[GOOGLE_OAUTH_CLIENT_ID_ENV];
    else process.env[GOOGLE_OAUTH_CLIENT_ID_ENV] = previous.id;
    if (previous.secret === undefined) delete process.env[GOOGLE_OAUTH_CLIENT_SECRET_ENV];
    else process.env[GOOGLE_OAUTH_CLIENT_SECRET_ENV] = previous.secret;
    if (previous.redirect === undefined) delete process.env[GOOGLE_OAUTH_REDIRECT_URI_ENV];
    else process.env[GOOGLE_OAUTH_REDIRECT_URI_ENV] = previous.redirect;
  });
}

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

function memoryAdmin() {
  const credentials = new Map<string, CredRow>();
  const admin = {
    from(table: string) {
      if (table === "external_temporal_connections") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async maybeSingle() {
                        return { data: { id: "conn-1", user_id: "user-1" }, error: null };
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
          async upsert(row: CredRow) {
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
        };
      }
      throw new Error(table);
    },
  };
  return { admin: admin as unknown as SupabaseClient, credentials };
}

describe("openAuthorizedGoogleCredential", () => {
  it("reuses an unexpired access token without refresh", async () => {
    const key = randomKey();
    const { admin } = memoryAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = (input: Parameters<typeof openCredentialPayload>[0]) =>
      openCredentialPayload({ ...input, keyBytes: key });
    const now = new Date("2026-10-07T12:00:00.000Z");
    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: serializeGoogleCredentialPayload({
          accessToken: "access-live",
          refreshToken: "refresh-1",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: now.getTime() + 120_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        scopes: GOOGLE_CALENDAR_READONLY_SCOPE,
      },
      { adminClient: admin, seal, open },
    );

    const http = vi.fn();
    const payload = await openAuthorizedGoogleCredential({
      authenticatedUserId: "user-1",
      connectionId: "conn-1",
      http: http as unknown as typeof fetch,
      now,
      deps: { adminClient: admin, seal, open },
    });
    expect(payload.accessToken).toBe("access-live");
    expect(http).not.toHaveBeenCalled();
  });

  it("refreshes near-expiry tokens and preserves omitted refresh tokens while resealing", async () => {
    const key = randomKey();
    const { admin, credentials } = memoryAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = (input: Parameters<typeof openCredentialPayload>[0]) =>
      openCredentialPayload({ ...input, keyBytes: key });
    const now = new Date("2026-10-07T12:00:00.000Z");
    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: serializeGoogleCredentialPayload({
          accessToken: "access-old",
          refreshToken: "refresh-kept",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: now.getTime() + 30_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        scopes: GOOGLE_CALENDAR_READONLY_SCOPE,
      },
      { adminClient: admin, seal, open },
    );
    const nonceBefore = credentials.get("conn-1")!.nonce;

    await withGoogleConfig(async () => {
      const http = vi.fn(async () =>
        Response.json({
          access_token: "access-new",
          expires_in: 3600,
          token_type: "Bearer",
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
      );
      const payload = await openAuthorizedGoogleCredential({
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        http: http as unknown as typeof fetch,
        now,
        deps: { adminClient: admin, seal, open },
      });
      expect(payload.accessToken).toBe("access-new");
      expect(payload.refreshToken).toBe("refresh-kept");
      expect(credentials.get("conn-1")!.nonce).not.toBe(nonceBefore);
    });
  });

  it("distinguishes refresh auth failure from transient failure", async () => {
    const key = randomKey();
    const { admin } = memoryAdmin();
    const seal = (input: Parameters<typeof sealCredentialPayload>[0]) =>
      sealCredentialPayload({ ...input, keyBytes: key });
    const open = (input: Parameters<typeof openCredentialPayload>[0]) =>
      openCredentialPayload({ ...input, keyBytes: key });
    const now = new Date("2026-10-07T12:00:00.000Z");
    await storeExternalProviderCredentials(
      {
        authenticatedUserId: "user-1",
        connectionId: "conn-1",
        plaintext: serializeGoogleCredentialPayload({
          accessToken: "access-old",
          refreshToken: "refresh-1",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: now.getTime(),
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        }),
        scopes: GOOGLE_CALENDAR_READONLY_SCOPE,
      },
      { adminClient: admin, seal, open },
    );

    await withGoogleConfig(async () => {
      await expect(
        openAuthorizedGoogleCredential({
          authenticatedUserId: "user-1",
          connectionId: "conn-1",
          http: vi.fn(async () => new Response("denied", { status: 401 })) as unknown as typeof fetch,
          now,
          deps: { adminClient: admin, seal, open },
        }),
      ).rejects.toMatchObject({ code: "oauth_auth_failed" });

      await expect(
        openAuthorizedGoogleCredential({
          authenticatedUserId: "user-1",
          connectionId: "conn-1",
          http: vi.fn(async () => new Response("busy", { status: 503 })) as unknown as typeof fetch,
          now,
          deps: { adminClient: admin, seal, open },
        }),
      ).rejects.toMatchObject({ code: "oauth_transient" });
    });
  });
});
