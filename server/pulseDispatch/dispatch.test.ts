import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/pulse/dispatch/route";
import { requirePulseDispatchSecret } from "@/server/pulseDispatch/auth";
import {
  ORIENT_PULSE_DISPATCH_SECRET_ENV,
  PULSE_DISPATCH_SECRET_HEADER,
  readFirebaseServiceAccountConfig,
} from "@/server/pulseDispatch/config";
import { dispatchPulseOccurrence } from "@/server/pulseDispatch/dispatch";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";
import { resetFirebaseAdminForTests } from "@/server/pulseDispatch/firebaseAdmin";
import { parsePulseOccurrenceId } from "@/server/pulseDispatch/parse";

const OCCURRENCE = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const SECRET = "test-dispatch-secret-value";

const root = join(import.meta.dirname, "../..");

function walkFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path, predicate));
    else if (predicate(entry)) out.push(path);
  }
  return out;
}

function mockAdmin(options: {
  occurrence?: { id: string; user_id: string } | null;
  occurrenceError?: boolean;
  tokens?: Array<{ fcm_token: string; platform: string }>;
  tokensError?: boolean;
  onTokensFilter?: (column: string, value: string) => void;
}) {
  const occurrenceBuilder = {
    select: vi.fn(() => occurrenceBuilder),
    eq: vi.fn(() => occurrenceBuilder),
    maybeSingle: vi.fn(async () =>
      options.occurrenceError
        ? { data: null, error: { message: "db" } }
        : { data: options.occurrence ?? null, error: null },
    ),
  };

  const tokenResult = options.tokensError
    ? { data: null, error: { message: "db" } }
    : { data: options.tokens ?? [], error: null };

  const tokenBuilder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    then: PromiseLike<typeof tokenResult>["then"];
  } = {
    select: vi.fn(() => tokenBuilder),
    eq: vi.fn((column: string, value: string) => {
      options.onTokensFilter?.(column, value);
      return tokenBuilder;
    }),
    then: (onfulfilled, onrejected) =>
      Promise.resolve(tokenResult).then(onfulfilled, onrejected),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "pulse_occurrences") return occurrenceBuilder;
      if (table === "orient_device_push_tokens") return tokenBuilder;
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

afterEach(() => {
  resetFirebaseAdminForTests();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("pulse dispatch parse/auth", () => {
  it("accepts direct id and webhook record.id; ignores foreign user_id", () => {
    expect(parsePulseOccurrenceId({ pulse_occurrence_id: OCCURRENCE })).toBe(OCCURRENCE);
    expect(
      parsePulseOccurrenceId({
        type: "INSERT",
        table: "pulse_occurrences",
        record: { id: OCCURRENCE, user_id: OTHER, title: "ignore" },
      }),
    ).toBe(OCCURRENCE);
    expect(() => parsePulseOccurrenceId({ pulse_occurrence_id: "not-a-uuid" })).toThrow(
      PulseDispatchError,
    );
    expect(() => parsePulseOccurrenceId({ user_id: OWNER })).toThrow(PulseDispatchError);
  });

  it("rejects missing or wrong dispatch secret without invoking Firebase", () => {
    vi.stubEnv(ORIENT_PULSE_DISPATCH_SECRET_ENV, SECRET);
    expect(() =>
      requirePulseDispatchSecret(new Request("http://localhost/api/pulse/dispatch")),
    ).toThrow(/unauthorized/i);
    expect(() =>
      requirePulseDispatchSecret(
        new Request("http://localhost/api/pulse/dispatch", {
          headers: { [PULSE_DISPATCH_SECRET_HEADER]: "wrong" },
        }),
      ),
    ).toThrow(/unauthorized/i);
  });
});

describe("dispatchPulseOccurrence", () => {
  it("re-reads occurrence ownership and queries tokens only for that owner", async () => {
    const filters: Array<[string, string]> = [];
    const admin = mockAdmin({
      occurrence: { id: OCCURRENCE, user_id: OWNER },
      tokens: [{ fcm_token: "token-aaaa-bbbb", platform: "android" }],
      onTokensFilter: (column, value) => filters.push([column, value]),
    });
    const sendToToken = vi.fn(async () => undefined);

    const result = await dispatchPulseOccurrence({
      pulseOccurrenceId: OCCURRENCE,
      admin: admin as never,
      sendToToken,
    });

    expect(admin.from).toHaveBeenCalledWith("pulse_occurrences");
    expect(admin.from).toHaveBeenCalledWith("orient_device_push_tokens");
    expect(filters).toContainEqual(["user_id", OWNER]);
    expect(filters).not.toContainEqual(["user_id", OTHER]);
    expect(sendToToken).toHaveBeenCalledWith("token-aaaa-bbbb", OCCURRENCE);
    expect(result.status).toBe("dispatched");
    expect(result.ownerUserId).toBe(OWNER);
  });

  it("returns 404 semantics for missing occurrence and ignores webhook user_id", async () => {
    const admin = mockAdmin({ occurrence: null, tokens: [{ fcm_token: "x", platform: "android" }] });
    await expect(
      dispatchPulseOccurrence({
        pulseOccurrenceId: OCCURRENCE,
        admin: admin as never,
        sendToToken: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "occurrence_not_found" });
    expect(admin.from).toHaveBeenCalledWith("pulse_occurrences");
    expect(admin.from).not.toHaveBeenCalledWith("orient_device_push_tokens");
  });

  it("returns calm no_targets when owner has no tokens", async () => {
    const admin = mockAdmin({
      occurrence: { id: OCCURRENCE, user_id: OWNER },
      tokens: [],
    });
    const sendToToken = vi.fn();
    const result = await dispatchPulseOccurrence({
      pulseOccurrenceId: OCCURRENCE,
      admin: admin as never,
      sendToToken,
    });
    expect(result).toMatchObject({
      status: "no_targets",
      tokenCount: 0,
      sentCount: 0,
      failedCount: 0,
    });
    expect(sendToToken).not.toHaveBeenCalled();
  });

  it("allows duplicate dispatcher calls and keeps FCM payload identity-only", async () => {
    const admin = mockAdmin({
      occurrence: { id: OCCURRENCE, user_id: OWNER },
      tokens: [{ fcm_token: "tok-1-long-enough", platform: "android" }],
    });
    const send = vi.fn(async (message: {
      token: string;
      data: Record<string, string>;
      android?: { priority?: string };
    }) => {
      expect(message.data).toEqual({ pulse_occurrence_id: OCCURRENCE });
      expect(Object.keys(message.data)).toEqual(["pulse_occurrence_id"]);
      expect(message.android).toEqual({ priority: "high" });
      expect(message).not.toHaveProperty("notification");
      return "projects/orient/messages/1";
    });

    await dispatchPulseOccurrence({
      pulseOccurrenceId: OCCURRENCE,
      admin: admin as never,
      messaging: { send },
    });
    await dispatchPulseOccurrence({
      pulseOccurrenceId: OCCURRENCE,
      admin: admin as never,
      messaging: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats Firebase failure as transport partial without mutating Pulse truth", async () => {
    const admin = mockAdmin({
      occurrence: { id: OCCURRENCE, user_id: OWNER },
      tokens: [
        { fcm_token: "tok-ok", platform: "android" },
        { fcm_token: "tok-bad", platform: "android" },
      ],
    });
    const sendToToken = vi.fn(async (token: string) => {
      if (token === "tok-bad") {
        throw { code: "messaging/registration-token-not-registered" };
      }
    });

    const result = await dispatchPulseOccurrence({
      pulseOccurrenceId: OCCURRENCE,
      admin: admin as never,
      sendToToken,
    });

    expect(result.status).toBe("partial");
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.results.some((row) => row.errorCode?.includes("registration-token"))).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toContain("tok-bad");
    // No occurrence mutation APIs exist on the mock admin.
    expect(admin.from).not.toHaveBeenCalledWith("pulse_interrupt_grants");
  });
});

describe("POST /api/pulse/dispatch", () => {
  it("rejects missing/wrong secret and malformed body before Firebase", async () => {
    vi.stubEnv(ORIENT_PULSE_DISPATCH_SECRET_ENV, SECRET);

    const missing = await POST(new Request("http://localhost/api/pulse/dispatch", { method: "POST" }));
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ code: "dispatch_unauthorized" });

    const wrong = await POST(
      new Request("http://localhost/api/pulse/dispatch", {
        method: "POST",
        headers: { [PULSE_DISPATCH_SECRET_HEADER]: "nope", "content-type": "application/json" },
        body: JSON.stringify({ pulse_occurrence_id: OCCURRENCE }),
      }),
    );
    expect(wrong.status).toBe(401);

    const malformed = await POST(
      new Request("http://localhost/api/pulse/dispatch", {
        method: "POST",
        headers: { [PULSE_DISPATCH_SECRET_HEADER]: SECRET, "content-type": "application/json" },
        body: JSON.stringify({ record: { user_id: OWNER } }),
      }),
    );
    expect(malformed.status).toBe(400);
    const body = await malformed.json();
    expect(body.code).toBe("dispatch_malformed_input");
    expect(JSON.stringify(body)).not.toMatch(/SECRET|private_key|BEGIN PRIVATE/i);
  });
});

describe("firebase config + isolation", () => {
  it("parses service-account JSON defensively without exposing values", () => {
    expect(() => readFirebaseServiceAccountConfig({})).toThrow(/not configured/i);
    expect(() =>
      readFirebaseServiceAccountConfig({
        FIREBASE_SERVICE_ACCOUNT_JSON: "{not-json",
      }),
    ).toThrow(/invalid/i);
    expect(() =>
      readFirebaseServiceAccountConfig({
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          project_id: "orient",
          client_email: "a@b.c",
          private_key: "not-a-key",
        }),
      }),
    ).toThrow(/invalid/i);

    const config = readFirebaseServiceAccountConfig({
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: "orient",
        client_email: "firebase-adminsdk@orient.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
      }),
    });
    expect(config.projectId).toBe("orient");
    expect(config.privateKey).toContain("BEGIN PRIVATE KEY");
    expect(config.privateKey).toContain("\n");
  });

  it("keeps firebase-admin and pulse dispatch out of client modules", () => {
    const banned = [
      "firebase-admin",
      "FIREBASE_SERVICE_ACCOUNT_JSON",
      "ORIENT_PULSE_DISPATCH_SECRET",
      "@/server/pulseDispatch",
      "server/pulseDispatch",
    ];
    for (const dir of ["components", "domain", "projections", "persistence"]) {
      for (const file of walkFiles(join(root, dir), (name) => name.endsWith(".ts") || name.endsWith(".tsx"))) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const source = readFileSync(file, "utf8");
        for (const token of banned) {
          expect(source, file).not.toContain(token);
        }
      }
    }

    const appFiles = walkFiles(join(root, "app"), (name) => name.endsWith(".ts") || name.endsWith(".tsx"));
    for (const file of appFiles) {
      if (file.includes(`${join("app", "api")}`)) continue;
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const source = readFileSync(file, "utf8");
      for (const token of banned) {
        expect(source, file).not.toContain(token);
      }
    }
  });

  it("does not alter Pulse establishment or token-table migrations", () => {
    const pulse = readFileSync(
      join(root, "supabase/migrations/20261008240000_pulse_hosted_establishment.sql"),
      "utf8",
    );
    const tokens = readFileSync(
      join(root, "supabase/migrations/20261009120000_orient_device_push_tokens.sql"),
      "utf8",
    );
    expect(pulse).toContain("establish_due_commitment_start_pulse_occurrences");
    // Dispatch remains occurrence-id transport only; Block-start does not branch here.
    expect(tokens).toContain("grant select on table public.orient_device_push_tokens to service_role;");
    expect(tokens).not.toMatch(
      /grant (insert|update|delete).* on table public\.orient_device_push_tokens to service_role/i,
    );
  });

  it("documents stale-token cleanup as deferred under SELECT-only service_role", () => {
    const dispatch = readFileSync(join(root, "server/pulseDispatch/dispatch.ts"), "utf8");
    expect(dispatch).toMatch(/Does not delete stale tokens/);
    expect(dispatch).not.toMatch(/\.delete\(/);
  });
});
