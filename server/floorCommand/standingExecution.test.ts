import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { handleFloorCommandObservationPost } from "@/app/api/integrations/floor-command/observations/route";
import { FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { observeGovernedFloorCommandWeek } from "@/server/floorCommand/governedObservation";
import {
  FLOOR_COMMAND_BASE_URL_ENV,
  FLOOR_COMMAND_PULL_ENABLED_ENV,
  FLOOR_COMMAND_READ_TOKEN_ENV,
  FLOOR_COMMAND_STORE_NUMBER_ENV,
} from "@/server/floorCommand/config";
import { executeStandingFloorCommandObservation } from "@/server/floorCommand/standingExecution";
import {
  parseStandingExecutionIntent,
  parseStandingInspectionIntent,
  STANDING_CONFIRM_PURPOSE,
  STANDING_CONFIRM_SOURCE,
  STANDING_CONFIRM_STORE,
  STANDING_EXECUTE_CONFIRMATION,
  STANDING_INSPECT_ACTION,
  STANDING_OBSERVE_ACTION,
} from "@/server/floorCommand/standingExecutionIntent";
import { inspectStandingFloorCommandOpportunity } from "@/server/floorCommand/standingOpportunityInspection";
import {
  createFakeStandingSource,
  fakeStandingSourceInvocationCount,
} from "@/server/floorCommand/standingSourceAdapter";

const USER = "11111111-1111-4111-8111-111111111111";
const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLAIM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REQ = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LEASE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORIGIN = "http://localhost:3000";

function session(userId: string | null): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

function intent(overrides: Record<string, unknown> = {}) {
  const base = {
    action: STANDING_OBSERVE_ACTION,
    policyId: POLICY,
    policyVersion: 1,
    operationalWeek: "2026-W45",
    opportunityKind: "publication_opportunity" as const,
    correlationId: CORR,
    confirmation: STANDING_EXECUTE_CONFIRMATION,
    confirmPolicyId: POLICY,
    confirmPolicyVersion: 1,
    confirmOperationalWeek: "2026-W45",
    confirmOpportunityKind: "publication_opportunity" as const,
    confirmStoreNumber: STANDING_CONFIRM_STORE,
    confirmSource: STANDING_CONFIRM_SOURCE,
    confirmPurpose: STANDING_CONFIRM_PURPOSE,
  };
  return { ...base, ...overrides };
}

function inspectBody(overrides: Record<string, unknown> = {}) {
  return {
    action: STANDING_INSPECT_ACTION,
    policyId: POLICY,
    policyVersion: 1,
    operationalWeek: "2026-W45",
    opportunityKind: "publication_opportunity",
    correlationId: CORR,
    ...overrides,
  };
}

function snapshot() {
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: "2026-W45",
    week_starting: "2026-11-02",
    week_ending: "2026-11-08",
    publication: { id: "fc.publication.2587.2026-W45", status: "published" },
    handoff: {
      id: "fc.zebra-handoff.2587.2026-W45",
      status: "pending",
      deadline_date: "2026-11-02",
      deadline_policy: "monday_of_operational_week",
      required_count: 1,
      confirmed_count: 0,
      outstanding_count: 1,
    },
    entries: [{ id: "fc.assignment.a1", zebra_task_completed: false }],
    deadlines: { availability: "ready", commitments: [] },
    freshness: { revision: "rev-1", week_sequence: 1, read_at: "2026-11-02T18:00:00.000Z" },
  };
}

type Script = Array<
  | { name: string; result: Record<string, unknown> }
  | { name: string; error: string }
>;

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
      if ("error" in step) {
        return { data: null, error: { message: step.error } };
      }
      return { data: step.result, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, calls, remaining: () => script.length - index };
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
    result: { status: "source_attempted", claim_id: CLAIM, source_attempted_at: "2026-11-02T18:00:00.000Z" },
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
    result: { status: "linked", claim_id: CLAIM, observation_request_id: REQ, observation_outcome: "accepted_new" },
  },
];

describe("standing execution intent", () => {
  it("accepts the confirmation-echo contract and refuses scope-widening fields", () => {
    expect(parseStandingExecutionIntent(intent())).toEqual({ ok: true, intent: intent() });
    expect(parseStandingExecutionIntent(intent({ store: "2587" }))).toEqual({
      ok: false,
      reason: "forbidden_field",
    });
    expect(parseStandingExecutionIntent(intent({ revision: "abc" }))).toEqual({
      ok: false,
      reason: "forbidden_field",
    });
    expect(parseStandingExecutionIntent(intent({ action: "observe" }))).toEqual({
      ok: false,
      reason: "invalid_action",
    });
    expect(parseStandingExecutionIntent(intent({ extra: true }))).toEqual({
      ok: false,
      reason: "unknown_field",
    });
    expect(parseStandingExecutionIntent(intent({ confirmation: "yes" }))).toEqual({
      ok: false,
      reason: "confirmation_required",
    });
    expect(parseStandingExecutionIntent(intent({ confirmOperationalWeek: "2026-W99" }))).toEqual({
      ok: false,
      reason: "confirmation_week_mismatch",
    });
    expect(parseStandingExecutionIntent(intent({ confirmStoreNumber: "9999" }))).toEqual({
      ok: false,
      reason: "confirmation_store_mismatch",
    });
  });

  it("keeps inspection distinct from execution confirmation", () => {
    expect(parseStandingInspectionIntent(inspectBody())).toEqual({
      ok: true,
      intent: inspectBody(),
    });
    expect(parseStandingInspectionIntent(inspectBody({ confirmation: STANDING_EXECUTE_CONFIRMATION }))).toEqual({
      ok: false,
      reason: "unknown_field",
    });
    expect(parseStandingInspectionIntent(inspectBody({ action: STANDING_OBSERVE_ACTION }))).toEqual({
      ok: false,
      reason: "invalid_action",
    });
  });
});

describe("standing opportunity inspection module", () => {
  it("calls only the inspect RPC and never claim or attempt helpers", async () => {
    const store = adminFromScript([
      {
        name: "inspect_floor_command_standing_opportunity",
        result: {
          status: "eligible_now",
          advisory: true,
          consumes_opportunity: false,
          as_of: "2026-11-02T18:00:00.000Z",
          policy_id: POLICY,
          policy_version: 1,
          operational_week: "2026-W45",
          opportunity_kind: "publication_opportunity",
          disclaimer: "eligibility_is_not_a_reservation",
        },
      },
    ]);
    const result = await inspectStandingFloorCommandOpportunity(session(USER), inspectBody(), {
      admin: store.client,
    });
    expect(result).toMatchObject({
      status: "eligible_now",
      advisory: true,
      consumesOpportunity: false,
      disclaimer: "eligibility_is_not_a_reservation",
    });
    expect(store.calls.map((call) => call.name)).toEqual([
      "inspect_floor_command_standing_opportunity",
    ]);
    expect(JSON.stringify(store.calls)).not.toContain("claim_floor_command_standing");
    expect(JSON.stringify(store.calls)).not.toContain("record_floor_command_standing");
  });

  it("refuses unsigned operators without calling inspect", async () => {
    const store = adminFromScript([]);
    const result = await inspectStandingFloorCommandOpportunity(session(null), inspectBody(), {
      admin: store.client,
    });
    expect(result).toEqual({ status: "unauthorized" });
    expect(store.calls).toEqual([]);
  });
});

describe("standing execution sequence", () => {
  it("requires an injected adapter and never defaults to fetch", async () => {
    const store = adminFromScript([]);
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
    });
    expect(result).toEqual({ status: "adapter_required" });
    expect(store.calls).toEqual([]);
  });

  it("refuses an unsigned operator before claiming", async () => {
    const store = adminFromScript([]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(null), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toEqual({ status: "unauthorized" });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("claims, revalidates, marks attempt, then dispatches the fake source once", async () => {
    const store = adminFromScript(happyScript());
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({
      status: "completed",
      standingClaimId: CLAIM,
      observationRequestId: REQ,
      outcome: "accepted_new",
      sourceDispatches: 1,
      linkStatus: "linked",
    });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(1);
    expect(store.calls.map((call) => call.name)).toEqual([
      "claim_floor_command_standing_opportunity",
      "revalidate_floor_command_standing_opportunity_claim",
      "record_floor_command_standing_opportunity_source_attempt",
      "open_floor_command_governed_observation",
      "commit_floor_command_governed_observation",
      "link_floor_command_standing_opportunity_observation",
    ]);
    const attemptIndex = store.calls.findIndex(
      (call) => call.name === "record_floor_command_standing_opportunity_source_attempt",
    );
    const openIndex = store.calls.findIndex((call) => call.name === "open_floor_command_governed_observation");
    expect(attemptIndex).toBeLessThan(openIndex);
    expect(store.calls[0]?.args).toMatchObject({
      p_policy_id: POLICY,
      p_policy_version: 1,
      p_operational_week: "2026-W45",
      p_opportunity_kind: "publication_opportunity",
    });
    expect(JSON.stringify(store.calls)).not.toContain("ORIENT_FLOOR_COMMAND");
  });

  it("does not dispatch when claim is rejected", async () => {
    const store = adminFromScript([
      { name: "claim_floor_command_standing_opportunity", result: { status: "already_claimed" } },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({ status: "claim_rejected", claimStatus: "already_claimed" });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("does not dispatch when revalidation rejects after claim", async () => {
    const store = adminFromScript([
      {
        name: "claim_floor_command_standing_opportunity",
        result: { status: "claimed", claim: { claim_id: CLAIM } },
      },
      {
        name: "revalidate_floor_command_standing_opportunity_claim",
        result: { status: "authorization_revoked", claim_id: CLAIM },
      },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({
      status: "revalidation_rejected",
      revalidateStatus: "authorization_revoked",
    });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("does not dispatch a second time when attempt mark says already attempted", async () => {
    const store = adminFromScript([
      {
        name: "claim_floor_command_standing_opportunity",
        result: { status: "claimed", claim: { claim_id: CLAIM } },
      },
      {
        name: "revalidate_floor_command_standing_opportunity_claim",
        result: { status: "still_authorized", claim_id: CLAIM },
      },
      {
        name: "record_floor_command_standing_opportunity_source_attempt",
        result: { status: "source_already_attempted", claim_id: CLAIM },
      },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({ status: "attempt_rejected", attemptStatus: "source_already_attempted" });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("does not dispatch when hardened attempt mark refuses after Window-A revocation", async () => {
    const store = adminFromScript([
      {
        name: "claim_floor_command_standing_opportunity",
        result: { status: "claimed", claim: { claim_id: CLAIM } },
      },
      {
        name: "revalidate_floor_command_standing_opportunity_claim",
        result: { status: "still_authorized", claim_id: CLAIM },
      },
      {
        name: "record_floor_command_standing_opportunity_source_attempt",
        result: { status: "authorization_revoked", claim_id: CLAIM, closure_reason: "authorization_revoked" },
      },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({ status: "attempt_rejected", attemptStatus: "authorization_revoked" });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("closes after adapter throw without inventing observation success", async () => {
    const store = adminFromScript([
      ...happyScript().slice(0, 4),
      {
        name: "close_floor_command_standing_opportunity_after_dispatch",
        result: { status: "closed", claim_id: CLAIM, closure_reason: "adapter_threw" },
      },
    ]);
    const adapter: ReturnType<typeof createFakeStandingSource> = Object.assign(
      async () => {
        throw new Error("adapter boom");
      },
      { __fakeStandingSource: true as const, invocations: 0 },
    );
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({
      status: "classification_incomplete",
      reason: "adapter boom",
      sourceDispatches: 1,
    });
  });

  it("closes without inventing observation when governed open is busy after attempt mark", async () => {
    const store = adminFromScript([
      {
        name: "claim_floor_command_standing_opportunity",
        result: { status: "claimed", claim: { claim_id: CLAIM } },
      },
      {
        name: "revalidate_floor_command_standing_opportunity_claim",
        result: { status: "still_authorized", claim_id: CLAIM },
      },
      {
        name: "record_floor_command_standing_opportunity_source_attempt",
        result: { status: "source_attempted", claim_id: CLAIM },
      },
      { name: "open_floor_command_governed_observation", result: { status: "busy" } },
      {
        name: "close_floor_command_standing_opportunity_after_dispatch",
        result: { status: "closed", claim_id: CLAIM, closure_reason: "governed_open_busy" },
      },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({ status: "governed_open_refused", openStatus: "busy" });
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(0);
  });

  it("commits fake-source failures through the governed classifier once", async () => {
    const store = adminFromScript([
      ...happyScript().slice(0, 4),
      { name: "commit_floor_command_governed_observation", result: { outcome: "failed", reason: "source_unavailable" } },
      {
        name: "link_floor_command_standing_opportunity_observation",
        result: { status: "linked", observation_outcome: "failed" },
      },
    ]);
    const adapter = createFakeStandingSource({ mode: { kind: "timeout" } });
    const result = await executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: store.client,
      sourceAdapter: adapter,
    });
    expect(result).toMatchObject({ status: "completed", outcome: "failed", sourceDispatches: 1 });
    expect(store.calls[4]?.args).toMatchObject({
      p_read_class: "transport_failure",
      p_reason: "source_unavailable",
      p_snapshot: null,
    });
  });

  it("treats concurrent second intent as claim rejection without a second dispatch", async () => {
    let claimCount = 0;
    const calls: string[] = [];
    const client = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === "claim_floor_command_standing_opportunity") {
          claimCount += 1;
          if (claimCount === 1) {
            return { data: { status: "claimed", claim: { claim_id: CLAIM } }, error: null };
          }
          return { data: { status: "already_claimed" }, error: null };
        }
        if (name === "revalidate_floor_command_standing_opportunity_claim") {
          return { data: { status: "still_authorized", claim_id: CLAIM }, error: null };
        }
        if (name === "record_floor_command_standing_opportunity_source_attempt") {
          return { data: { status: "source_attempted", claim_id: CLAIM }, error: null };
        }
        if (name === "open_floor_command_governed_observation") {
          return { data: { status: "opened", request_id: REQ, claim_id: LEASE }, error: null };
        }
        if (name === "commit_floor_command_governed_observation") {
          return { data: { outcome: "unchanged", reason: null }, error: null };
        }
        if (name === "link_floor_command_standing_opportunity_observation") {
          return { data: { status: "linked" }, error: null };
        }
        throw new Error(name);
      },
    } as unknown as SupabaseClient;

    const adapter = createFakeStandingSource({ mode: { kind: "snapshot", snapshot: snapshot() } });
    const first = executeStandingFloorCommandObservation(session(USER), intent(), {
      admin: client,
      sourceAdapter: adapter,
    });
    const second = executeStandingFloorCommandObservation(
      session(USER),
      intent({ correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff" }),
      { admin: client, sourceAdapter: adapter },
    );
    const results = await Promise.all([first, second]);
    const statuses = results.map((result) => result.status).sort();
    expect(statuses).toEqual(["claim_rejected", "completed"]);
    expect(fakeStandingSourceInvocationCount(adapter)).toBe(1);
  });

  it("does not read the pull flag and does not call human observation helpers", () => {
    const source = readFileSync("server/floorCommand/standingExecution.ts", "utf8");
    expect(source).not.toContain("FLOOR_COMMAND_PULL_ENABLED_ENV");
    expect(source).not.toContain("pullEnabled");
    expect(source).not.toContain("observeGovernedFloorCommandWeek");
    expect(source).not.toContain("readFloorCommandReadToken");
    expect(source).not.toContain("fetch(");
    expect(source).toContain("sourceAdapter");
    expect(source).toContain("record_floor_command_standing_opportunity_source_attempt");
  });
});

describe("manual pathway isolation", () => {
  it("keeps human week observation on the pull flag and away from standing claim RPCs", async () => {
    const calls: Array<{ name: string }> = [];
    const client = {
      rpc: async (name: string) => {
        calls.push({ name });
        if (name === "open_floor_command_governed_observation") {
          return { data: { status: "opened", request_id: REQ, claim_id: LEASE }, error: null };
        }
        return { data: { outcome: "unchanged", reason: null }, error: null };
      },
    } as unknown as SupabaseClient;

    const result = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: {
        [FLOOR_COMMAND_READ_TOKEN_ENV]: "token",
        [FLOOR_COMMAND_STORE_NUMBER_ENV]: "2587",
        [FLOOR_COMMAND_BASE_URL_ENV]: "http://127.0.0.1:9",
        [FLOOR_COMMAND_PULL_ENABLED_ENV]: "1",
      },
      admin: client,
      fetchImpl: async () => Response.json({ synchronization: "comparable", snapshot: snapshot() }),
    });
    expect(result).toMatchObject({ outcome: "unchanged" });
    expect(calls.map((call) => call.name)).toEqual([
      "open_floor_command_governed_observation",
      "commit_floor_command_governed_observation",
    ]);
    expect(calls.map((call) => call.name).join(",")).not.toContain("standing");

    const disabled = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: {
        [FLOOR_COMMAND_READ_TOKEN_ENV]: "token",
        [FLOOR_COMMAND_STORE_NUMBER_ENV]: "2587",
        [FLOOR_COMMAND_BASE_URL_ENV]: "http://127.0.0.1:9",
      },
      admin: client,
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    expect(disabled).toMatchObject({ outcome: "disabled" });

    const observations = readFileSync("app/api/integrations/floor-command/observations/route.ts", "utf8");
    const governed = readFileSync("server/floorCommand/governedObservation.ts", "utf8");
    expect(observations).not.toContain("executeStandingFloorCommandObservation");
    expect(observations).not.toContain("claim_floor_command_standing");
    expect(governed).not.toContain("claim_floor_command_standing");
    expect(governed).not.toContain("standing_execution");
  });

  it("does not register a production standing-observe route", () => {
    const root = "app/api/integrations/floor-command";
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts")) found.push(path);
      }
    };
    walk(root);
    expect(found.some((path) => path.includes("standing-policy"))).toBe(true);
    expect(
      found.some(
        (path) =>
          path.includes("standing") &&
          (path.includes("observe") || path.includes("execution") || path.includes("standing-observe")),
      ),
    ).toBe(false);
    expect(found.some((path) => path.includes("standingExecution"))).toBe(false);
    const standingExecution = readFileSync("server/floorCommand/standingExecution.ts", "utf8");
    expect(standingExecution).toContain("Does not register an HTTP route");
  });

  it("refuses human observation bodies that try to smuggle standing fields", async () => {
    const response = await handleFloorCommandObservationPost(
      new Request(`${ORIGIN}/api/integrations/floor-command/observations`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({
          week: "2026-W45",
          policyId: POLICY,
          action: STANDING_OBSERVE_ACTION,
        }),
      }),
      {
        authenticate: async () => USER,
        observe: async () => {
          throw new Error("observe must not run");
        },
      },
    );
    expect(response.status).toBe(400);
  });
});

describe("fake source isolation", () => {
  it("never uses global fetch and cannot be pointed at a URL", async () => {
    const source = readFileSync("server/floorCommand/standingSourceAdapter.ts", "utf8");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("http://");
    expect(source).not.toContain("https://");
    expect(source).not.toContain("ORIENT_FLOOR_COMMAND_BASE_URL");
    const adapter = createFakeStandingSource({
      mode: { kind: "credential_rejected" },
      delayMs: 1,
    });
    const read = await adapter({
      operationalWeek: "2026-W45",
      storeNumber: "2587",
      correlationId: CORR,
      standingClaimId: CLAIM,
    });
    expect(read).toEqual({
      readClass: "credential_rejected",
      reason: "credential_rejected",
      synchronization: null,
      snapshot: null,
    });
  });
});
