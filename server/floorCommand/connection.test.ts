import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { FLOOR_COMMAND_SOURCE, type FloorCommandSnapshot } from "@/domain/floorCommandObservation";
import {
  planFloorCommandObservationFailure,
  planFloorCommandObservationWrite,
  type FloorCommandObservationStore,
} from "@/persistence/floorCommandObservation";
import { projectFloorCommandObservation, type FloorCommandAttemptReason } from "@/projections/floorCommandObservation";
import { approveFloorCommandConnection } from "@/server/floorCommand/approve";
import { describeFloorCommandConnection } from "@/server/floorCommand/config";
import {
  pullFloorCommandPublishedWeek,
  type FloorCommandClaimStatus,
  type FloorCommandPullResult,
  type FloorCommandReleaseStatus,
} from "@/server/floorCommand/pull";

const USER = "11111111-1111-4111-8111-111111111111";
const TOKEN = "fc_orient_test_secret_value";
const NOW = "2026-10-25T18:00:00.000Z";
const WEEK = "2026-W44";

function env(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    ORIENT_FLOOR_COMMAND_READ_TOKEN: TOKEN,
    ORIENT_FLOOR_COMMAND_STORE_NUMBER: "02587",
    ORIENT_FLOOR_COMMAND_BASE_URL: "https://floor-command.test",
    ORIENT_FLOOR_COMMAND_PULL_ENABLED: "1",
    ...overrides,
  };
}

function session(userId: string | null): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

function snapshot(sequence: number, revision: string, entries: FloorCommandSnapshot["entries"] = []): FloorCommandSnapshot {
  const confirmed = entries.filter((row) => row.zebra_confirmation === "confirmed").length;
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: WEEK,
    week_starting: "2026-10-26",
    week_ending: "2026-11-01",
    publication: {
      id: "fc.publication.2587.2026-W44",
      status: entries.length > 0 ? "published" : "unpublished",
    },
    handoff: {
      id: "fc.zebra-handoff.2587.2026-W44",
      status: entries.length === 0 ? "none" : confirmed === entries.length ? "complete" : confirmed === 0 ? "pending" : "partial",
      deadline_date: "2026-10-26",
      deadline_policy: "monday_of_operational_week",
      required_count: entries.length,
      confirmed_count: confirmed,
      outstanding_count: entries.length - confirmed,
    },
    entries,
    deadlines: { availability: "ready", commitments: [] },
    retired: [],
    freshness: {
      read_at: NOW,
      source_updated_at: NOW,
      revision,
      matches_previous_revision: null,
      week_sequence: sequence,
    },
  };
}

function entry(id: string): FloorCommandSnapshot["entries"][number] {
  return {
    id: `fc.assignment.${id}`,
    assignment_id: id,
    bay_id: `bay-${id}`,
    department: "flooring",
    roster_specialist_id: `roster-${id}`,
    associate_name: id,
    assignment_status: "assigned",
    zebra_confirmation: "unconfirmed",
    zebra_entered_at: null,
    zebra_task_completed: false,
    deadline: null,
    updated_at: NOW,
  };
}

function body(value: FloorCommandSnapshot, synchronization: "comparable" | "withheld" = "comparable") {
  return { availability: "ready", snapshot: value, synchronization };
}

function harness(storeNumber = "2587") {
  let stored: FloorCommandObservationStore | null = {
    userId: USER,
    storeNumber,
    handoffs: [],
    dismissals: [],
    lastAttempt: null,
  };
  let activeClaim: string | null = null;
  let claimOverride: FloorCommandClaimStatus | null = null;
  let applyError: string | null = null;
  let releaseStatus: FloorCommandReleaseStatus = "released";
  const calls: string[] = [];
  const releases: string[] = [];
  return {
    calls,
    releases,
    forceClaim(status: FloorCommandClaimStatus) {
      claimOverride = status;
    },
    failApply(message: string) {
      applyError = message;
    },
    forceRelease(status: FloorCommandReleaseStatus) {
      releaseStatus = status;
    },
    keepHandoffWithoutSuccess() {
      if (!stored) return;
      stored = {
        ...stored,
        lastAttempt: { readAt: NOW, result: "failure", reason: "source_unavailable" },
      };
      activeClaim = null;
    },
    commit: {
      load: async () => stored,
      claim: async (_userId: string, claimId: string): Promise<FloorCommandClaimStatus> => {
        if (claimOverride) return claimOverride;
        if (stored?.lastAttempt?.result === "success_complete") return "already_succeeded";
        if (activeClaim && activeClaim !== claimId) return "busy";
        activeClaim = claimId;
        return "claimed";
      },
      release: async (_userId: string, claimId: string): Promise<FloorCommandReleaseStatus> => {
        releases.push(claimId);
        if (releaseStatus !== "released") return releaseStatus;
        if (stored?.lastAttempt?.result === "success_complete") return "already_succeeded";
        if (activeClaim !== claimId) return "mismatch";
        activeClaim = null;
        return "released";
      },
      applyRead: async (_userId: string, read: Parameters<typeof planFloorCommandObservationWrite>[1]) => {
        if (applyError) throw new Error(applyError);
        if (!stored) throw new Error("unbound");
        const plan = planFloorCommandObservationWrite(stored, read);
        calls.push(plan.write ? plan.write.attemptResult : "no-write");
        if (plan.write?.attemptResult === "success_complete") {
          stored = {
            ...stored,
            handoffs: plan.memory.handoffs,
            dismissals: plan.memory.dismissals,
            lastAttempt: plan.memory.lastAttempt,
          };
          activeClaim = null;
        } else if (plan.write?.attemptResult === "failure") {
          stored = { ...stored, lastAttempt: plan.memory.lastAttempt };
        }
        return plan.memory;
      },
      noteFailure: async (
        _userId: string,
        input: { readAt: string; reason: FloorCommandAttemptReason },
      ) => {
        if (!stored) throw new Error("unbound");
        const plan = planFloorCommandObservationFailure(stored, input);
        calls.push(plan.write.attemptResult);
        expect(plan.write.handoffs).toBeNull();
        stored = { ...stored, lastAttempt: plan.memory.lastAttempt };
        return plan.memory;
      },
    },
    clearBinding() {
      stored = null;
    },
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function pull(
  setup: ReturnType<typeof harness>,
  response: Response | Error,
  options: { userId?: string | null; env?: Record<string, string | undefined>; week?: string } = {},
): Promise<{ result: FloorCommandPullResult; urls: string[]; headers: string[]; redirects: Array<RequestRedirect | undefined> }> {
  const urls: string[] = [];
  const headers: string[] = [];
  const redirects: Array<RequestRedirect | undefined> = [];
  const result = await pullFloorCommandPublishedWeek(session(options.userId === undefined ? USER : options.userId), options.week ?? WEEK, {
    env: options.env ?? env(),
    now: NOW,
    commit: setup.commit,
    fetchImpl: async (input, init) => {
      urls.push(String(input));
      headers.push(String(new Headers(init?.headers).get("authorization")));
      redirects.push(init?.redirect);
      if (response instanceof Error) throw response;
      return response;
    },
  });
  return { result, urls, headers, redirects };
}

describe("Floor Command connection boundary", () => {
  it("keeps the bearer in server configuration and allows only the exact production origin", () => {
    expect(describeFloorCommandConnection({})).toEqual({ status: "unconfigured" });
    expect(describeFloorCommandConnection(env({ ORIENT_FLOOR_COMMAND_PULL_ENABLED: undefined }))).toMatchObject({
      status: "configured",
      storeNumber: "2587",
      pullEnabled: false,
    });
    expect(JSON.stringify(describeFloorCommandConnection(env()))).not.toContain(TOKEN);
    expect(
      describeFloorCommandConnection(env({ ORIENT_FLOOR_COMMAND_BASE_URL: "https://deptsync-hub.vercel.app" })),
    ).toMatchObject({ status: "configured", baseUrl: "https://deptsync-hub.vercel.app", pullEnabled: true });
    expect(
      describeFloorCommandConnection(env({ ORIENT_FLOOR_COMMAND_BASE_URL: "https://deptsync-hub.vercel.app/api" })),
    ).toMatchObject({ baseUrl: "https://deptsync-hub.vercel.app" });
    for (const baseUrl of [
      "http://deptsync-hub.vercel.app",
      "https://deptsync-hub.vercel.app:8443",
      "https://user:secret@deptsync-hub.vercel.app",
      "https://deptsync-hub.vercel.app.example",
      "https://not-deptsync-hub.vercel.app",
      "https://evil.vercel.app",
      "https://floor-command.test:8443",
      "http://floor-command.test",
    ]) {
      expect(describeFloorCommandConnection(env({ ORIENT_FLOOR_COMMAND_BASE_URL: baseUrl }))).toEqual({
        status: "unconfigured",
      });
    }
    expect(describeFloorCommandConnection(env({ ORIENT_FLOOR_COMMAND_BASE_URL: "http://127.0.0.1:55474" }))).toMatchObject({
      status: "configured",
      baseUrl: "http://127.0.0.1:55474",
    });
  });

  it("approves only the signed-in operator for the server store and read-only purpose", async () => {
    const rpcs: Array<Record<string, unknown>> = [];
    const admin = {
      rpc: async (_name: string, args: Record<string, unknown>) => {
        rpcs.push(args);
        return { error: null };
      },
    } as unknown as SupabaseClient;
    const approved = await approveFloorCommandConnection(session(USER), { env: env(), admin });
    expect(approved).toEqual({
      status: "approved",
      storeNumber: "2587",
      source: FLOOR_COMMAND_SOURCE,
      purpose: "orient_published_week_read",
    });
    expect(rpcs[0]).toMatchObject({
      p_user_id: USER,
      p_store_number: "2587",
      p_source: FLOOR_COMMAND_SOURCE,
      p_purpose: "orient_published_week_read",
    });
    expect(JSON.stringify(approved)).not.toContain(TOKEN);

    const unsigned = await approveFloorCommandConnection(session(null), { env: env(), admin });
    expect(unsigned).toEqual({ status: "unauthorized" });
    expect(rpcs).toHaveLength(1);

    const missing = await approveFloorCommandConnection(session(USER), {
      env: env({ ORIENT_FLOOR_COMMAND_READ_TOKEN: "" }),
      admin,
    });
    expect(missing).toEqual({ status: "unconfigured" });
    expect(rpcs).toHaveLength(1);

    const bound = {
      rpc: async () => ({ error: { message: "floor_command_observation_already_bound" } }),
    } as unknown as SupabaseClient;
    expect(await approveFloorCommandConnection(session(USER), { env: env(), admin: bound })).toEqual({
      status: "already_bound",
    });
  });

  it("does not fetch until the operator, binding, credential, and enable flag all agree", async () => {
    const setup = harness();
    const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const unauthorized = await pull(setup, jsonResponse(body(snapshot(0, "rev-0"))), { userId: null });
    expect(unauthorized.result.outcome).toBe("unauthorized");
    expect(unauthorized.urls).toEqual([]);
    setup.clearBinding();
    const unbound = await pull(setup, jsonResponse(body(snapshot(0, "rev-0"))));
    expect(unbound.result.outcome).toBe("unbound");
    expect(unbound.urls).toEqual([]);
    const rebound = harness();
    const missing = await pull(rebound, jsonResponse(body(snapshot(0, "rev-0"))), {
      env: env({ ORIENT_FLOOR_COMMAND_READ_TOKEN: " " }),
    });
    expect(missing.result.outcome).toBe("unconfigured");
    expect(missing.urls).toEqual([]);
    const disabled = await pull(rebound, jsonResponse(body(snapshot(0, "rev-0"))), {
      env: env({ ORIENT_FLOOR_COMMAND_PULL_ENABLED: "0" }),
    });
    expect(disabled.result.outcome).toBe("disabled");
    expect(disabled.urls).toEqual([]);
    const wrong = await pull(harness("1999"), jsonResponse(body(snapshot(0, "rev-0"))));
    expect(wrong.result).toMatchObject({ outcome: "wrong_store" });
    expect(wrong.urls).toEqual([]);
    const badWeek = await pull(rebound, jsonResponse(body(snapshot(0, "rev-0"))), { week: "week" });
    expect(badWeek.result.outcome).toBe("invalid_week");
    expect(badWeek.urls).toEqual([]);
    expect(logs.mock.calls.join(" ")).not.toContain(TOKEN);
    expect(errors.mock.calls.join(" ")).not.toContain(TOKEN);
    logs.mockRestore();
    errors.mockRestore();
  });

  it("accepts a comparable week, rejects a withheld 200, and keeps the bearer out of the result", async () => {
    const setup = harness();
    const logs = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const published = snapshot(1, "rev-1", [entry("a1")]);
    published.retired = [
      {
        id: "fc.assignment.cleared",
        assignment_id: "cleared",
        bay_id: "bay-cleared",
        roster_specialist_id: null,
        reason: "cleared",
      },
    ];
    const unpublished = await pull(setup, jsonResponse(body(published)));
    expect(unpublished.result.outcome).toBe("accepted");
    expect(unpublished.urls).toHaveLength(1);
    expect(unpublished.redirects).toEqual(["manual"]);
    expect(unpublished.urls[0]).toContain("week=2026-W44");
    expect(unpublished.urls[0]).toContain("store=2587");
    expect(unpublished.urls[0]).not.toContain(TOKEN);
    expect(unpublished.headers).toEqual([`Bearer ${TOKEN}`]);
    expect(JSON.stringify(unpublished.result)).not.toContain(TOKEN);
    if (unpublished.result.outcome !== "accepted") return;
    expect(unpublished.result.memory.handoffs[0]?.snapshot.freshness.week_sequence).toBe(1);
    expect(setup.releases).toEqual([]);
    const reading = projectFloorCommandObservation(unpublished.result.memory);
    if (reading.status !== "fresh") throw new Error(reading.status);
    expect(reading.handoffs[0]?.assignments.find((row) => row.id === "fc.assignment.cleared")?.lifecycle).toBe(
      "retired",
    );
    expect(reading.handoffs[0]?.assignments.find((row) => row.lifecycle === "retired")?.zebraTaskCompleted).toBe(false);

    const again = await pull(setup, jsonResponse(body(snapshot(2, "rev-2", [entry("a1")]))));
    expect(again.result.outcome).toBe("already_succeeded");
    expect(again.urls).toEqual([]);
    if (again.result.outcome !== "already_succeeded") return;
    expect(again.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-1");
    expect(again.result.memory.lastAttempt?.result).toBe("success_complete");
    expect(setup.calls.filter((call) => call === "success_complete")).toHaveLength(1);

    setup.keepHandoffWithoutSuccess();
    const older = await pull(setup, jsonResponse(body(snapshot(0, "rev-old"))));
    expect(older.result.outcome).toBe("rejected");
    expect(older.urls).toHaveLength(1);
    if (older.result.outcome !== "rejected") return;
    expect(older.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-1");

    const conflict = snapshot(1, "rev-other", [entry("a1")]);
    const conflicted = await pull(setup, jsonResponse(body(conflict)));
    expect(conflicted.result.outcome).toBe("conflict");
    if (conflicted.result.outcome !== "conflict") return;
    expect(conflicted.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-1");
    expect(conflicted.result.memory.lastAttempt?.reason).toBe("sequence_conflict");

    const fresh = harness();
    const withheld = await pull(fresh, jsonResponse(body(snapshot(2, "rev-2", [entry("a1")]), "withheld")));
    expect(withheld.result.outcome).toBe("withheld");
    if (withheld.result.outcome !== "withheld") return;
    expect(withheld.result.memory.handoffs).toHaveLength(0);
    expect(withheld.result.memory.lastAttempt?.reason).toBe("ordering_withheld");
    expect(fresh.releases).toHaveLength(1);

    const wrongWeek = snapshot(1, "rev-week");
    wrongWeek.operational_week = "2026-W45";
    const mismatched = await pull(harness(), jsonResponse(body(wrongWeek)));
    expect(mismatched.result.outcome).toBe("unavailable");
    if (mismatched.result.outcome !== "unavailable") return;
    expect(mismatched.result.memory.lastAttempt?.reason).toBe("invalid_snapshot");
    expect(mismatched.result.memory.handoffs).toHaveLength(0);

    const retained = harness();
    const kept = await pull(retained, jsonResponse(body(snapshot(1, "rev-kept", [entry("a1")]))));
    expect(kept.result.outcome).toBe("accepted");
    retained.keepHandoffWithoutSuccess();
    const revoked = await pull(retained, jsonResponse({ error: "unauthorized" }, 401));
    expect(revoked.result.outcome).toBe("revoked");
    if (revoked.result.outcome !== "revoked") return;
    expect(revoked.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-kept");
    expect(revoked.result.memory.lastAttempt?.reason).toBe("credential_rejected");
    expect(JSON.stringify(revoked.result)).not.toContain(TOKEN);

    const timedOut = await pull(retained, new DOMException("The operation was aborted", "AbortError"));
    expect(timedOut.result.outcome).toBe("unavailable");
    if (timedOut.result.outcome !== "unavailable") return;
    expect(timedOut.result.memory.lastAttempt?.reason).toBe("source_unavailable");
    expect(timedOut.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-kept");

    const malformed = await pull(retained, jsonResponse({ availability: "ready", snapshot: { source: "other" } }));
    expect(malformed.result.outcome).toBe("unavailable");
    if (malformed.result.outcome !== "unavailable") return;
    expect(malformed.result.memory.lastAttempt?.reason).toBe("invalid_snapshot");
    expect(malformed.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-kept");

    const redirected = await pull(retained, jsonResponse({ ok: true }, 302));
    expect(redirected.urls).toHaveLength(1);
    expect(redirected.result.outcome).toBe("unavailable");
    if (redirected.result.outcome !== "unavailable") return;
    expect(redirected.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-kept");

    const wrongStore = await pull(retained, jsonResponse({ error: "forbidden" }, 403));
    expect(wrongStore.result.outcome).toBe("wrong_store");
    if (wrongStore.result.outcome !== "wrong_store" || !wrongStore.result.memory) return;
    expect(wrongStore.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-kept");
    expect(JSON.stringify(wrongStore.result)).not.toContain(TOKEN);
    expect(logs.mock.calls.join(" ")).not.toContain(TOKEN);
    logs.mockRestore();
  });

  it("does not fetch when the claim is busy, and a stale claim cannot replace the observation", async () => {
    const busy = harness();
    busy.forceClaim("busy");
    const blocked = await pull(busy, jsonResponse(body(snapshot(1, "rev-1"))));
    expect(blocked.result.outcome).toBe("busy");
    expect(blocked.urls).toEqual([]);

    const setup = harness();
    const accepted = await pull(setup, jsonResponse(body(snapshot(1, "rev-1", [entry("a1")]))));
    expect(accepted.result.outcome).toBe("accepted");
    setup.keepHandoffWithoutSuccess();
    setup.failApply("floor_command_controlled_pull_claim_expired");
    setup.forceRelease("mismatch");
    const expired = await pull(setup, jsonResponse(body(snapshot(2, "rev-2", [entry("a1")]))));
    expect(expired.result.outcome).toBe("unavailable");
    if (expired.result.outcome !== "unavailable") return;
    expect(expired.result.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-1");
    expect(expired.result.memory.lastAttempt?.result).toBe("failure");
    expect(setup.releases).toEqual([expect.any(String)]);
  });

  it("lets one of two overlapping pulls fetch", async () => {
    const setup = harness();
    let releaseFetch: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    let fetches = 0;
    const first = pullFloorCommandPublishedWeek(session(USER), WEEK, {
      env: env(),
      now: NOW,
      commit: setup.commit,
      fetchImpl: async () => {
        fetches += 1;
        if (fetches === 1) await gate;
        return jsonResponse(body(snapshot(1, "rev-race", [entry("a1")])));
      },
    });
    const second = pullFloorCommandPublishedWeek(session(USER), WEEK, {
      env: env(),
      now: NOW,
      commit: setup.commit,
      fetchImpl: async () => {
        fetches += 1;
        return jsonResponse(body(snapshot(1, "rev-other", [entry("a1")])));
      },
    });
    await vi.waitFor(() => expect(fetches).toBe(1));
    releaseFetch?.();
    const results = await Promise.all([first, second]);
    const outcomes = results.map((result) => result.outcome).sort();
    expect(outcomes).toEqual(["accepted", "busy"]);
    expect(fetches).toBe(1);
  });

  it("mounts the retained reading on Work without the bearer or a live pull", () => {
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    const view = readFileSync("components/orient/OrientView.tsx", "utf8");
    expect(instrument).toContain("loadFloorCommandWorkReading");
    expect(view).toContain("FloorCommandWorkView");
    expect(view).toContain('surface.kind === "work"');
    for (const file of [
      "components/orient/OrientInstrument.tsx",
      "components/orient/OrientView.tsx",
      "components/orient/FloorCommandWorkView.tsx",
      "components/orient/floorCommandWorkApi.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("ORIENT_FLOOR_COMMAND_READ_TOKEN");
      expect(source).not.toContain("pullFloorCommandPublishedWeek");
      expect(source).not.toContain("/api/integrations/floor-command/pull");
      expect(source).not.toContain("/api/integrations/floor-command/approval");
    }
    for (const file of [
      "components/orient/Surfaces.tsx",
      "components/WorkOrientation.tsx",
      "components/TaskLoop.tsx",
      "components/orient/WorkScheduleOperation.tsx",
      "app/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("FloorCommand");
      expect(source).not.toContain("pullFloorCommandPublishedWeek");
    }
    const pullSource = readFileSync("server/floorCommand/pull.ts", "utf8");
    expect(pullSource).not.toMatch(/createTask|createCommitment|createBlock|InterruptGrant|console\./);
    expect(readFileSync("components/orient/FloorCommandObservation.tsx", "utf8")).toContain("Cleared in Floor Command");
  });
});
