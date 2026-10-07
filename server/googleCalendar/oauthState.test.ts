import { describe, expect, it } from "vitest";
import {
  consumeOAuthInitiation,
  createOAuthInitiation,
  OAuthStateError,
} from "@/server/googleCalendar/oauthState";

type Row = {
  state: string;
  user_id: string;
  connection_id: string;
  code_verifier: string;
  expires_at: string;
  consumed_at: string | null;
};

function memoryAdmin() {
  const rows = new Map<string, Row>();
  const admin = {
    from(table: string) {
      if (table !== "external_oauth_initiations") throw new Error(table);
      return {
        async insert(row: Row) {
          rows.set(row.state, { ...row, consumed_at: row.consumed_at ?? null });
          return { error: null };
        },
        select() {
          return {
            eq(_field: string, value: string) {
              return {
                async maybeSingle() {
                  return { data: rows.get(value) ?? null, error: null };
                },
              };
            },
          };
        },
        update(patch: { consumed_at: string }) {
          return {
            eq(_field: string, value: string) {
              return {
                is(_col: string, expected: null) {
                  return {
                    select() {
                      return {
                        async maybeSingle() {
                          const row = rows.get(value);
                          if (!row || row.consumed_at !== expected) {
                            return { data: null, error: null };
                          }
                          row.consumed_at = patch.consumed_at;
                          return { data: { state: row.state }, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { admin: admin as never, rows };
}

describe("OAuth initiation state", () => {
  it("creates state bound to user/connection and consumes it once", async () => {
    const { admin, rows } = memoryAdmin();
    const now = new Date("2026-10-07T12:00:00.000Z");
    const initiation = await createOAuthInitiation(
      { userId: "user-1", connectionId: "conn-1", now },
      admin,
    );
    expect(initiation.userId).toBe("user-1");
    expect(initiation.connectionId).toBe("conn-1");
    expect(rows.get(initiation.state)?.code_verifier).toBe(initiation.codeVerifier);

    const consumed = await consumeOAuthInitiation(initiation.state, admin, now);
    expect(consumed).toEqual({
      userId: "user-1",
      connectionId: "conn-1",
      codeVerifier: initiation.codeVerifier,
    });

    await expect(consumeOAuthInitiation(initiation.state, admin, now)).rejects.toBeInstanceOf(OAuthStateError);
    await expect(consumeOAuthInitiation(initiation.state, admin, now)).rejects.toMatchObject({
      code: "state_reused",
    });
  });

  it("rejects expired and missing state", async () => {
    const { admin } = memoryAdmin();
    const createdAt = new Date("2026-10-07T12:00:00.000Z");
    const initiation = await createOAuthInitiation(
      { userId: "user-1", connectionId: "conn-1", now: createdAt, ttlMs: 60_000 },
      admin,
    );
    await expect(
      consumeOAuthInitiation(initiation.state, admin, new Date("2026-10-07T12:02:00.000Z")),
    ).rejects.toMatchObject({ code: "state_expired" });
    await expect(consumeOAuthInitiation("missing", admin, createdAt)).rejects.toMatchObject({
      code: "state_invalid",
    });
    await expect(consumeOAuthInitiation(null, admin, createdAt)).rejects.toMatchObject({
      code: "state_missing",
    });
  });
});
