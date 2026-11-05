import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { FLOOR_COMMAND_PULL_ENABLED_ENV } from "@/server/floorCommand/config";
import type { StandingExecutionResult } from "@/server/floorCommand/standingExecution";
import {
  createFakeStandingSource,
  fakeStandingSourceInvocationCount,
} from "@/server/floorCommand/standingSourceAdapter";
import {
  ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET_ENV,
  STANDING_CRON_SECRET_HEADER,
} from "@/server/floorCommand/standingUnattendedConfig";
import { extractBearerToken } from "@/server/floorCommand/standingUnattendedAuth";
import { discoverStandingEligibility } from "@/server/floorCommand/standingUnattendedEligibility";
import {
  evaluateStandingOpportunityUnattended,
  mapExecutionResult,
} from "@/server/floorCommand/standingUnattendedEvaluate";
import { handleStandingOpportunityEvaluateGet } from "@/server/floorCommand/standingUnattendedEvaluateRoute";
import type { StandingEligibilityDiscovery } from "@/server/floorCommand/standingUnattendedEligibility";

const USER = "11111111-1111-4111-8111-111111111111";
const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLAIM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REQ = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LEASE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SECRET = "test-standing-cron-secret-not-for-production-use";
const AS_OF = "2026-03-08T15:00:00.000Z";

function env(secret?: string): Record<string, string | undefined> {
  return {
    [ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET_ENV]: secret,
    [FLOOR_COMMAND_PULL_ENABLED_ENV]: undefined,
  };
}

function cronRequest(
  overrides: {
    method?: string;
    bearer?: string | null;
    customHeaderSecret?: string;
    url?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (overrides.bearer !== null && overrides.bearer !== undefined) {
    headers.set("authorization", `Bearer ${overrides.bearer}`);
  } else if (overrides.bearer === undefined) {
    headers.set("authorization", `Bearer ${SECRET}`);
  }
  if (overrides.customHeaderSecret) {
    headers.set(STANDING_CRON_SECRET_HEADER, overrides.customHeaderSecret);
  }
  return new Request(overrides.url ?? "http://localhost/standing-evaluate", {
    method: overrides.method ?? "GET",
    headers,
  });
}

function eligibleDiscovery(
  overrides: Partial<Extract<StandingEligibilityDiscovery, { status: "eligible" }>> = {},
): StandingEligibilityDiscovery {
  return {
    status: "eligible",
    userId: USER,
    target: {
      policyId: POLICY,
      policyVersion: 1,
      operationalWeek: "2026-W11",
      opportunityKind: "publication_opportunity",
      correlationId: CORR,
    },
    inspectStatus: "eligible_now",
    window: {
      kind: "publication_opportunity",
      operationalWeek: "2026-W11",
      opensAt: "2026-03-08T12:00:00.000Z",
      closesAt: "2026-03-09T07:00:00.000Z",
      timeZone: "America/Boise",
    },
    ...overrides,
  };
}

function completedExecution(
  outcome: "accepted_new" | "unchanged" | "revised" | "failed" | "rejected" = "accepted_new",
): StandingExecutionResult {
  return {
    status: "completed",
    standingClaimId: CLAIM,
    observationRequestId: REQ,
    governedLeaseClaimId: LEASE,
    outcome,
    reason: outcome === "failed" ? "source_unavailable" : null,
    correlationId: CORR,
    sourceDispatches: 1,
    linkStatus: "linked",
  };
}

function snapshot() {
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: "2026-W11",
    freshness: { revision: "rev-1", week_sequence: 1 },
  };
}

type Script = Array<{ name: string; result: Record<string, unknown> } | { name: string; error: string }>;

function adminFromScript(script: Script) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let index = 0;
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      const step = script[index];
      index += 1;
      if (!step || step.name !== name) {
        throw new Error(`unexpected rpc ${name} at ${index - 1}; expected ${step?.name ?? "end"}`);
      }
      if ("error" in step) return { data: null, error: { message: step.error } };
      return { data: step.result, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const happyScript = (): Script => [
  {
    name: "claim_floor_command_standing_opportunity",
    result: { status: "claimed", claim: { claim_id: CLAIM, policy_id: POLICY } },
  },
  {
    name: "revalidate_floor_command_standing_opportunity_claim",
    result: { status: "still_authorized", claim_id: CLAIM },
  },
  {
    name: "record_floor_command_standing_opportunity_source_attempt",
    result: {
      status: "source_attempted",
      claim_id: CLAIM,
      source_attempted_at: AS_OF,
    },
  },
  {
    name: "open_floor_command_governed_observation",
    result: { status: "opened", request_id: REQ, claim_id: LEASE },
  },
  {
    name: "commit_floor_command_governed_observation",
    result: { outcome: "accepted_new", reason: null },
  },
  {
    name: "link_floor_command_standing_opportunity_observation",
    result: { status: "linked" },
  },
];

describe("standing unattended Vercel Cron authentication", () => {
  it("accepts valid fake Bearer token on GET and still requires an injected adapter", async () => {
    const response = await handleStandingOpportunityEvaluateGet(cronRequest(), {
      env: env(SECRET),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      status: "adapter_required",
      observed: false,
    });
  });

  it("rejects missing Authorization", async () => {
    const response = await handleStandingOpportunityEvaluateGet(cronRequest({ bearer: null }), {
      env: env(SECRET),
      sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      status: "unauthorized",
      observed: false,
    });
  });

  it("rejects incorrect Bearer token", async () => {
    const response = await handleStandingOpportunityEvaluateGet(
      cronRequest({ bearer: "wrong-secret" }),
      { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects empty Bearer token", async () => {
    const headers = new Headers({ authorization: "Bearer " });
    const response = await handleStandingOpportunityEvaluateGet(
      new Request("http://localhost/standing-evaluate", { method: "GET", headers }),
      { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
    );
    expect(response.status).toBe(401);
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("rejects malformed Authorization syntax", async () => {
    const cases = ["Bearer", "bearer", "Token secret", "Bearer tok en", SECRET];
    for (const authorization of cases) {
      expect(extractBearerToken(authorization)).toBeNull();
      const headers = new Headers({ authorization });
      const response = await handleStandingOpportunityEvaluateGet(
        new Request("http://localhost/standing-evaluate", { method: "GET", headers }),
        { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
      );
      expect(response.status).toBe(401);
    }
  });

  it("rejects POST and other unsupported methods", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH", "HEAD"]) {
      const response = await handleStandingOpportunityEvaluateGet(
        cronRequest({ method }),
        { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
      );
      expect(response.status).toBe(405);
    }
  });

  it("rejects custom-header-only authentication", async () => {
    const response = await handleStandingOpportunityEvaluateGet(
      cronRequest({ bearer: null, customHeaderSecret: SECRET }),
      { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
    );
    expect(response.status).toBe(401);
  });

  it("does not accept operator Bearer without the cron secret match", async () => {
    const response = await handleStandingOpportunityEvaluateGet(
      cronRequest({ bearer: "eyJhbGciOiJfake.operator.token" }),
      { env: env(SECRET), sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }) },
    );
    expect(response.status).toBe(401);
  });

  it("fails closed when CRON_SECRET is unconfigured", async () => {
    const response = await handleStandingOpportunityEvaluateGet(cronRequest(), {
      env: env(undefined),
      sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "unconfigured",
      observed: false,
    });
  });

  it("rejects query parameters that could select policy, week, or source", async () => {
    for (const url of [
      "http://localhost/standing-evaluate?policyId=" + POLICY,
      "http://localhost/standing-evaluate?operationalWeek=2026-W11",
      "http://localhost/standing-evaluate?baseUrl=https://evil.example",
      "http://localhost/standing-evaluate?week=2026-W11&source=x",
    ]) {
      const response = await handleStandingOpportunityEvaluateGet(cronRequest({ url }), {
        env: env(SECRET),
        sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }),
        evaluate: async () => {
          throw new Error("evaluate must not run with query scope");
        },
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        reason: "forbidden_field",
        observed: false,
      });
    }
  });

  it("does not invoke evaluate when authentication fails", async () => {
    let called = false;
    const response = await handleStandingOpportunityEvaluateGet(
      cronRequest({ bearer: "wrong" }),
      {
        env: env(SECRET),
        sourceAdapter: createFakeStandingSource({ mode: { kind: "timeout" } }),
        evaluate: async () => {
          called = true;
          return { status: "gate_disabled", observed: false };
        },
      },
    );
    expect(response.status).toBe(401);
    expect(called).toBe(false);
  });

  it("never reflects the cron secret in responses", async () => {
    const response = await handleStandingOpportunityEvaluateGet(
      cronRequest({ bearer: SECRET }),
      { env: env(SECRET) },
    );
    const body = await response.text();
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain("CRON_SECRET");
  });
});

describe("standing unattended inspection clock compatibility (R047-H1)", () => {
  it("production path passes p_as_of null to inspect", async () => {
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const policyRow = {
      policy_id: POLICY,
      policy_version: 1,
      user_id: USER,
      state: "approved",
      store_number: "2587",
      source: FLOOR_COMMAND_SOURCE,
      purpose: "orient_published_week_read",
      revoked_at: null,
      expired_at: null,
      effective_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2027-01-01T00:00:00.000Z",
      time_zone: "America/Boise",
    };
    const admin = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        if (name === "floor_command_standing_execution_gate_is_open") {
          return { data: true, error: null };
        }
        if (name === "inspect_floor_command_standing_opportunity") {
          return { data: { status: "eligible_now", advisory: true }, error: null };
        }
        throw new Error(`unexpected rpc ${name}`);
      },
      from: (table: string) => {
        if (table === "floor_command_standing_policies") {
          const terminal = {
            eq: () => terminal,
            is: async () => ({ data: [policyRow], error: null }),
          };
          return {
            select: () => terminal,
          };
        }
        if (table === "floor_command_standing_policy_events") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          scope: {
                            windows: [
                              {
                                kind: "publication_opportunity",
                                operational_week: "2026-W11",
                                opens_at: "2026-03-08T12:00:00.000Z",
                                closes_at: "2026-03-09T07:00:00.000Z",
                                time_zone: "America/Boise",
                              },
                            ],
                          },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected from ${table}`);
      },
    } as unknown as SupabaseClient;

    const discovery = await discoverStandingEligibility({
      admin,
      asOfIso: AS_OF,
      inspectAsOf: null,
      correlationId: CORR,
    });
    expect(discovery.status).toBe("eligible");
    const inspect = rpcCalls.find((c) => c.name === "inspect_floor_command_standing_opportunity");
    expect(inspect?.args.p_as_of).toBeNull();
  });

  it("evaluate without asOf uses inspectAsOf null (production-compatible)", async () => {
    let capturedInspectAsOf: string | null | undefined = "sentinel";
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      // asOf omitted — production path
      discover: async (deps) => {
        capturedInspectAsOf = deps.inspectAsOf;
        return { status: "gate_disabled" };
      },
      execute: async () => {
        throw new Error("must not execute");
      },
    });
    expect(capturedInspectAsOf).toBeNull();
  });

  it("test seam can supply asOf for deterministic local fixtures without changing production default", async () => {
    let captured: { asOfIso: string; inspectAsOf: string | null } | null = null;
    const adapter = createFakeStandingSource({ mode: { kind: "timeout" } });
    await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      asOf: AS_OF,
      discover: async (deps) => {
        captured = { asOfIso: deps.asOfIso, inspectAsOf: deps.inspectAsOf };
        return { status: "not_yet_eligible" };
      },
      execute: async () => {
        throw new Error("must not execute");
      },
    });
    expect(captured).toEqual({ asOfIso: AS_OF, inspectAsOf: AS_OF });
  });

  it("maps as_of_forbidden inspect status to unavailable", async () => {
    const adapter = createFakeStandingSource({ mode: { kind: "timeout" } });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      discover: async () => ({ status: "unavailable", reason: "as_of_forbidden" }),
      execute: async () => {
        throw new Error("must not execute");
      },
    });
    expect(result).toMatchObject({ status: "unavailable", reason: "as_of_forbidden", observed: false });
  });
});

describe("standing unattended eligibility no-ops", () => {
  const cases: Array<[StandingEligibilityDiscovery["status"], string]> = [
    ["gate_disabled", "gate_disabled"],
    ["no_approved_policy", "no_approved_policy"],
    ["not_yet_eligible", "not_yet_eligible"],
    ["expired", "expired"],
    ["revoked", "revoked"],
    ["already_claimed", "already_claimed"],
    ["already_attempted", "already_attempted"],
  ];

  for (const [discoveryStatus, expected] of cases) {
    it(`returns ${expected} without invoking the source adapter`, async () => {
      const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
      const result = await evaluateStandingOpportunityUnattended({
        sourceAdapter: adapter,
        admin: {} as SupabaseClient,
        asOf: AS_OF,
        discover: async () =>
          discoveryStatus === "policy_conflict"
            ? { status: "policy_conflict", approvedCount: 2 }
            : ({ status: discoveryStatus } as StandingEligibilityDiscovery),
        execute: async () => {
          throw new Error("execute must not run");
        },
      });
      expect(result.status).toBe(expected);
      expect(result.observed).toBe(false);
      expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
    });
  }

  it("returns policy_conflict without guessing among grants", async () => {
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      discover: async () => ({ status: "policy_conflict", approvedCount: 2 }),
      execute: async () => {
        throw new Error("execute must not run");
      },
    });
    expect(result).toMatchObject({ status: "policy_conflict", approvedCount: 2, observed: false });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("valid Cron credential with gate_disabled does not execute", async () => {
    const response = await handleStandingOpportunityEvaluateGet(cronRequest(), {
      env: env(SECRET),
      sourceAdapter: createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } }),
      evaluate: async () => ({ status: "gate_disabled", observed: false }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "gate_disabled",
      observed: false,
    });
  });
});

describe("standing unattended fake-source execution", () => {
  it("commits a valid fake observation through the existing execution core", async () => {
    const { client, calls } = adminFromScript(happyScript());
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: client,
      asOf: AS_OF,
      correlationId: CORR,
      discover: async () => eligibleDiscovery(),
    });
    expect(result).toMatchObject({
      status: "observation_committed",
      observed: true,
      outcome: "accepted_new",
      sourceDispatches: 1,
      linkStatus: "linked",
    });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(1);
    expect(calls.map((c) => c.name)).toEqual([
      "claim_floor_command_standing_opportunity",
      "revalidate_floor_command_standing_opportunity_claim",
      "record_floor_command_standing_opportunity_source_attempt",
      "open_floor_command_governed_observation",
      "commit_floor_command_governed_observation",
      "link_floor_command_standing_opportunity_observation",
    ]);
    expect(JSON.stringify(calls)).not.toContain("ORIENT_FLOOR_COMMAND_PULL");
    expect(calls[0]?.args.p_as_of).toBe(AS_OF);
  });

  it("production execute path passes null asOf into the claim/attempt core", async () => {
    let passedAsOf: string | null | undefined = "sentinel";
    const adapter = createFakeStandingSource({ mode: { kind: "timeout" } });
    await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      discover: async () => eligibleDiscovery(),
      execute: async (_admin, _user, _target, _adapter, asOf) => {
        passedAsOf = asOf;
        return {
          status: "claim_rejected",
          claimStatus: "gate_disabled",
          correlationId: CORR,
        };
      },
    });
    expect(passedAsOf).toBeNull();
  });

  it("maps fake timeout to source_failure without inventing success", async () => {
    const script: Script = [
      ...happyScript().slice(0, 4),
      {
        name: "commit_floor_command_governed_observation",
        result: { outcome: "failed", reason: "source_unavailable" },
      },
      {
        name: "link_floor_command_standing_opportunity_observation",
        result: { status: "linked" },
      },
    ];
    const { client } = adminFromScript(script);
    const adapter = createFakeStandingSource({ mode: { kind: "timeout" } });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: client,
      asOf: AS_OF,
      discover: async () => eligibleDiscovery(),
    });
    expect(result).toMatchObject({
      status: "source_failure",
      observed: false,
      outcome: "failed",
      sourceDispatches: 1,
    });
  });

  it("maps adapter throw after attempt to dispatch_ambiguous", async () => {
    const script: Script = [
      ...happyScript().slice(0, 4),
      {
        name: "close_floor_command_standing_opportunity_after_dispatch",
        result: { status: "closed" },
      },
    ];
    const { client } = adminFromScript(script);
    const adapter = createFakeStandingSource({
      mode: { kind: "throw", message: "ambiguous_dispatch" },
    });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: client,
      asOf: AS_OF,
      discover: async () => eligibleDiscovery(),
    });
    expect(result).toMatchObject({
      status: "dispatch_ambiguous",
      observed: false,
      reason: "ambiguous_dispatch",
      sourceDispatches: 1,
    });
  });

  it("maps credential failure and malformed modes through the core", async () => {
    for (const mode of [
      { kind: "credential_rejected" as const },
      { kind: "malformed" as const },
      { kind: "forbidden" as const },
    ]) {
      const script: Script = [
        ...happyScript().slice(0, 4),
        {
          name: "commit_floor_command_governed_observation",
          result: {
            outcome: mode.kind === "malformed" ? "rejected" : "failed",
            reason: mode.kind,
          },
        },
        {
          name: "link_floor_command_standing_opportunity_observation",
          result: { status: "linked" },
        },
      ];
      const { client } = adminFromScript(script);
      const adapter = createFakeStandingSource({ mode });
      const result = await evaluateStandingOpportunityUnattended({
        sourceAdapter: adapter,
        admin: client,
        asOf: AS_OF,
        discover: async () => eligibleDiscovery(),
      });
      expect(result.observed).toBe(false);
      expect(result.status).toBe("source_failure");
    }
  });
});

describe("standing unattended concurrency and revocation mapping", () => {
  it("maps duplicate claim to already_claimed without a second dispatch", async () => {
    const result = mapExecutionResult({
      status: "claim_rejected",
      claimStatus: "already_claimed",
      correlationId: CORR,
    });
    expect(result).toEqual({ status: "already_claimed", observed: false });
  });

  it("maps attempt rejection after revoke/gate flip", async () => {
    expect(
      mapExecutionResult({
        status: "attempt_rejected",
        attemptStatus: "authorization_revoked",
        standingClaimId: CLAIM,
        correlationId: CORR,
      }),
    ).toEqual({ status: "revoked", observed: false });

    expect(
      mapExecutionResult({
        status: "attempt_rejected",
        attemptStatus: "gate_disabled",
        standingClaimId: CLAIM,
        correlationId: CORR,
      }),
    ).toEqual({ status: "gate_disabled", observed: false });

    expect(
      mapExecutionResult({
        status: "attempt_rejected",
        attemptStatus: "source_already_attempted",
        standingClaimId: CLAIM,
        correlationId: CORR,
      }),
    ).toMatchObject({ status: "already_attempted", observed: false });
  });

  it("runs two concurrent wakes with only one source dispatch when the second is already claimed", async () => {
    let claimCalls = 0;
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const first = evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      asOf: AS_OF,
      discover: async () => eligibleDiscovery(),
      execute: async () => {
        claimCalls += 1;
        return completedExecution();
      },
    });
    const second = evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      asOf: AS_OF,
      discover: async () => eligibleDiscovery(),
      execute: async () => {
        claimCalls += 1;
        return {
          status: "claim_rejected",
          claimStatus: "already_claimed",
          correlationId: CORR,
        };
      },
    });
    const [a, b] = await Promise.all([first, second]);
    expect(claimCalls).toBe(2);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual(["already_claimed", "observation_committed"]);
    expect([a.observed, b.observed].filter(Boolean)).toHaveLength(1);
  });

  it("duplicate wake after committed observation stays non-observing when already attempted", async () => {
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await evaluateStandingOpportunityUnattended({
      sourceAdapter: adapter,
      admin: {} as SupabaseClient,
      discover: async () => ({ status: "already_attempted" }),
      execute: async () => {
        throw new Error("must not execute");
      },
    });
    expect(result).toMatchObject({ status: "already_attempted", observed: false });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });
});

describe("standing unattended isolation", () => {
  it("does not require the pull flag and does not mount an App Router evaluate route", () => {
    expect(process.env[FLOOR_COMMAND_PULL_ENABLED_ENV]).not.toBe("1");
    const root = join(process.cwd(), "app/api/integrations/floor-command");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts")) files.push(path);
      }
    };
    walk(root);
    expect(files.some((path) => path.includes(`${join("standing-opportunity", "evaluate")}`))).toBe(
      false,
    );
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("handleStandingOpportunityEvaluateGet");
      expect(source).not.toContain("handleStandingOpportunityEvaluatePost");
      expect(source).not.toContain("evaluateStandingOpportunityUnattended");
      expect(source).not.toContain("executeStandingFloorCommandObservation");
    }
    expect(existsSync(join(process.cwd(), "vercel.json"))).toBe(false);
    expect(
      existsSync(join(process.cwd(), "server/floorCommand/standingUnattendedEvaluateRoute.ts")),
    ).toBe(true);
    const routeSource = readFileSync(
      join(process.cwd(), "server/floorCommand/standingUnattendedEvaluateRoute.ts"),
      "utf8",
    );
    expect(routeSource).toContain("handleStandingOpportunityEvaluateGet");
    expect(routeSource).toContain('request.method !== "GET"');
  });

  it("HTTP handler does not fall back to a real source when adapter is omitted", async () => {
    const response = await handleStandingOpportunityEvaluateGet(cronRequest(), {
      env: env(SECRET),
      evaluate: async () => {
        throw new Error("evaluate must not run without adapter");
      },
    });
    expect(response.status).toBe(503);
  });

  it("uses CRON_SECRET env name for Vercel compatibility", () => {
    expect(ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET_ENV).toBe("CRON_SECRET");
  });
});
