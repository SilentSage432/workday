import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_SOURCE,
  type FloorCommandAssignmentInput,
  type FloorCommandRead,
  type FloorCommandSnapshot,
} from "@/domain/floorCommandObservation";
import {
  FLOOR_COMMAND_OBSERVATION_READ_HAS_NO_CREDENTIAL_FIELDS,
  FLOOR_COMMAND_OBSERVATION_TABLES,
  FloorCommandObservationUnboundError,
  dismissPersistedFloorCommandRevision,
  planFloorCommandObservationWrite,
  recordFloorCommandObservation,
  type FloorCommandObservationStore,
} from "@/persistence/floorCommandObservation";
import {
  dismissFloorCommandRevision,
  projectFloorCommandObservation,
} from "@/projections/floorCommandObservation";

const USER = "11111111-1111-4111-8111-111111111111";
const WEEK = "2026-W44";
const MONDAY = "2026-10-26";
const SUNDAY = "2026-11-01";

function entry(id: string, confirmed = false): FloorCommandAssignmentInput {
  return {
    id: `fc.assignment.${id}`,
    assignment_id: id,
    bay_id: `bay-${id}`,
    department: "flooring",
    roster_specialist_id: `roster-${id}`,
    associate_name: `Associate ${id}`,
    assignment_status: "assigned",
    zebra_confirmation: confirmed ? "confirmed" : "unconfirmed",
    zebra_entered_at: confirmed ? "2026-10-26T16:00:00.000Z" : null,
    zebra_task_completed: false,
    deadline: null,
    updated_at: "2026-10-25T18:00:00.000Z",
  };
}

function snapshot(revision: string, sourceUpdatedAt: string | null, entries: FloorCommandAssignmentInput[]): FloorCommandSnapshot {
  const confirmed = entries.filter((row) => row.zebra_confirmation === "confirmed").length;
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "02587",
    operational_week: WEEK,
    week_starting: MONDAY,
    week_ending: SUNDAY,
    publication: {
      id: `fc.publication.2587.${WEEK}`,
      status: entries.length > 0 ? "published" : "unpublished",
    },
    handoff: {
      id: `fc.zebra-handoff.2587.${WEEK}`,
      status: entries.length === 0 ? "none" : confirmed === 0 ? "pending" : confirmed === entries.length ? "complete" : "partial",
      deadline_date: MONDAY,
      deadline_policy: "monday_of_operational_week",
      required_count: entries.length,
      confirmed_count: confirmed,
      outstanding_count: entries.length - confirmed,
    },
    entries,
    deadlines: { availability: "ready", commitments: [] },
    retired: [],
    freshness: {
      read_at: sourceUpdatedAt ?? "2026-10-27T12:00:00.000Z",
      source_updated_at: sourceUpdatedAt,
      revision,
      matches_previous_revision: false,
    },
  };
}

function ready(value: FloorCommandSnapshot): FloorCommandRead {
  return { availability: "ready", snapshot: value };
}

function emptyStore(): FloorCommandObservationStore {
  return {
    userId: USER,
    storeNumber: "2587",
    handoffs: [],
    dismissals: [],
    lastAttempt: null,
  };
}

function asStore(plan: ReturnType<typeof planFloorCommandObservationWrite>): FloorCommandObservationStore {
  return {
    userId: USER,
    storeNumber: plan.memory.connectedStoreNumber,
    handoffs: plan.memory.handoffs,
    dismissals: plan.memory.dismissals,
    lastAttempt: plan.memory.lastAttempt,
  };
}

describe("floor command observation persistence", () => {
  it("does not import personal temporal writers or credential columns", () => {
    const source = readFileSync(new URL("./floorCommandObservation.ts", import.meta.url), "utf8");
    const migration = readFileSync(
      new URL("../supabase/migrations/20261024210000_floor_command_observation.sql", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/commitments|protectedTime|stewardship|activeThread|pulse|workFiscalWeek|createTask/);
    expect(migration).not.toMatch(/insert into public\.(commitments|blocks|tasks|protected_time|stewardship|pulse_interrupt_grants)/);
    expect(FLOOR_COMMAND_OBSERVATION_READ_HAS_NO_CREDENTIAL_FIELDS).toBe(true);
    expect(FLOOR_COMMAND_OBSERVATION_TABLES).not.toContain("commitments");
  });

  it("retains the lifecycle without treating dismissal or an empty week as completion", () => {
    const first = planFloorCommandObservationWrite(
      emptyStore(),
      ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1"), entry("a2")])),
    );
    expect(first.write?.attemptResult).toBe("success_complete");
    expect(first.write?.handoffs).toHaveLength(1);
    expect(first.write?.handoffs?.[0]?.operational_week).toBe(WEEK);
    expect(first.write?.handoffs?.[0]?.week_starting).toBe(MONDAY);
    expect(JSON.stringify(first.write)).not.toContain("2026-10-24");
    expect(first.memory.handoffs[0]?.snapshot.handoff.status).toBe("pending");

    const replay = planFloorCommandObservationWrite(
      asStore(first),
      ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1"), entry("a2")])),
    );
    expect(replay.write?.handoffs).toHaveLength(1);
    expect(replay.write?.handoffs?.[0]?.source_revision).toBe("rev-1");

    const newer = planFloorCommandObservationWrite(
      asStore(replay),
      ready(snapshot("rev-2", "2026-10-26T16:00:00.000Z", [entry("a1", true), entry("a2", true)])),
    );
    expect(newer.write?.handoffs?.[0]?.source_revision).toBe("rev-2");
    expect(newer.memory.handoffs[0]?.snapshot.handoff.status).toBe("complete");
    expect(newer.memory.handoffs[0]?.snapshot.entries.every((row) => row.zebra_task_completed === false)).toBe(true);

    const older = planFloorCommandObservationWrite(
      asStore(newer),
      ready(snapshot("rev-old", "2026-10-25T12:00:00.000Z", [entry("a1"), entry("a2")])),
    );
    expect(older.write).toBeNull();
    expect(older.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-2");

    const untimed = planFloorCommandObservationWrite(
      asStore(newer),
      ready(snapshot("rev-untimed", null, [entry("a1"), entry("a2")])),
    );
    expect(untimed.write).toBeNull();

    const equalTime = planFloorCommandObservationWrite(
      asStore(newer),
      ready(snapshot("rev-equal", "2026-10-26T16:00:00.000Z", [entry("a1"), entry("a2")])),
    );
    expect(equalTime.write?.handoffs?.[0]?.source_revision).toBe("rev-equal");
    expect(equalTime.memory.handoffs[0]?.snapshot.handoff.status).toBe("pending");

    const dismissed = dismissFloorCommandRevision(equalTime.memory, {
      handoffId: "fc.zebra-handoff.2587.2026-W44",
      revision: "rev-equal",
    });
    expect(dismissed.handoffs[0]?.snapshot.handoff.status).toBe("pending");
    expect(projectFloorCommandObservation(dismissed).status).toBe("fresh");

    const afterDismissal = planFloorCommandObservationWrite(
      {
        userId: USER,
        storeNumber: dismissed.connectedStoreNumber,
        handoffs: dismissed.handoffs,
        dismissals: dismissed.dismissals,
        lastAttempt: dismissed.lastAttempt,
      },
      ready(snapshot("rev-3", "2026-10-26T18:00:00.000Z", [entry("a1"), entry("a2")])),
    );
    expect(afterDismissal.write?.handoffs?.[0]?.source_revision).toBe("rev-3");
    expect(afterDismissal.memory.dismissals).toEqual([
      { handoffId: "fc.zebra-handoff.2587.2026-W44", revision: "rev-equal" },
    ]);
    expect(JSON.stringify(afterDismissal.write)).not.toContain("rev-equal");

    const cleared = planFloorCommandObservationWrite(
      asStore(afterDismissal),
      ready(snapshot("rev-cleared", "2026-10-26T19:00:00.000Z", [])),
    );
    expect(cleared.memory.handoffs[0]?.snapshot.handoff.status).toBe("none");
    expect(cleared.write?.handoffs?.[0]?.superseded_assignments.map((row) => row.id)).toEqual([
      "fc.assignment.a1",
      "fc.assignment.a2",
    ]);
    expect(cleared.memory.handoffs[0]?.snapshot.entries).toHaveLength(0);
  });

  it("does not replace an untimed snapshot when a later revision cannot be ordered", () => {
    const first = planFloorCommandObservationWrite(
      emptyStore(),
      ready(snapshot("rev-untimed", null, [entry("a1")])),
    );
    const later = planFloorCommandObservationWrite(
      asStore(first),
      ready(snapshot("rev-timed", "2026-10-26T16:00:00.000Z", [entry("a1", true)])),
    );
    expect(later.write).toBeNull();
    expect(later.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-untimed");
    expect(later.memory.handoffs[0]?.snapshot.handoff.status).toBe("pending");
  });

  it("keeps a retained snapshot when a later read fails", () => {
    const first = planFloorCommandObservationWrite(
      emptyStore(),
      ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")])),
    );
    const failed = planFloorCommandObservationWrite(asStore(first), {
      availability: "unavailable",
      reason: "assignments_unavailable",
      read_at: "2026-10-26T12:00:00.000Z",
    });
    expect(failed.write).toMatchObject({
      attemptResult: "failure",
      attemptReason: "assignments_unavailable",
      handoffs: null,
    });
    expect(failed.memory.handoffs).toHaveLength(1);
    expect(projectFloorCommandObservation(failed.memory).status).toBe("stale");

    const emptyFailure = planFloorCommandObservationWrite(emptyStore(), {
      availability: "unavailable",
      reason: "assignments_unavailable",
      read_at: "2026-10-26T12:00:00.000Z",
    });
    expect(emptyFailure.write?.handoffs).toBeNull();
    expect(emptyFailure.memory.handoffs).toHaveLength(0);
    expect(projectFloorCommandObservation(emptyFailure.memory).status).toBe("unavailable");
  });

  it("refuses another store and does not take the store from the snapshot", () => {
    const kept = planFloorCommandObservationWrite(
      emptyStore(),
      ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")])),
    );
    const other = snapshot("rev-other", "2026-10-26T18:00:00.000Z", [entry("a1")]);
    other.store_number = "1999";
    const rejected = planFloorCommandObservationWrite(asStore(kept), ready(other));
    expect(rejected.write?.attemptResult).toBe("failure");
    expect(rejected.write?.attemptReason).toBe("cross_store");
    expect(rejected.write?.handoffs).toBeNull();
    expect(rejected.memory.connectedStoreNumber).toBe("2587");
    expect(rejected.memory.handoffs[0]?.snapshot.freshness.revision).toBe("rev-1");
  });

  it("refuses a payload that carries a credential field", () => {
    const value = snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")]);
    (value as FloorCommandSnapshot & { access_token?: string }).access_token = "secret";
    expect(() => planFloorCommandObservationWrite(emptyStore(), ready(value))).toThrow(/credentials/i);
  });

  it("writes through the operator id and leaves dismissal free of a store id", async () => {
    const eqs: string[] = [];
    const rpcs: Array<{ name: string; args: Record<string, unknown> }> = [];
    function clientFor(binding: { store_number: string; source?: string; purpose?: string } | null) {
      return {
        from(table: string) {
          const builder = {
            select() {
              return builder;
            },
            eq(_column: string, value: string) {
              eqs.push(`${table}:${value}`);
              return builder;
            },
            maybeSingle: async () => {
              if (table === "floor_command_observation_bindings") return { data: binding, error: null };
              return { data: null, error: null };
            },
            then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
              return Promise.resolve({ data: [], error: null }).then(onFulfilled);
            },
          };
          return builder;
        },
        rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
          rpcs.push({ name, args });
          return { error: null };
        }),
      };
    }

    const client = clientFor({
      store_number: "02587",
      source: "deptsync.floor-command.orient.v1",
      purpose: "orient_published_week_read",
    });
    await expect(
      recordFloorCommandObservation(
        client as unknown as SupabaseClient,
        "",
        ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")])),
        "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
      ),
    ).rejects.toThrow(/operator/i);

    const claimId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
    const memory = await recordFloorCommandObservation(
      client as unknown as SupabaseClient,
      USER,
      ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")])),
      claimId,
    );
    expect(memory.connectedStoreNumber).toBe("2587");
    expect(eqs.every((row) => row.endsWith(USER))).toBe(true);
    expect(rpcs[0]?.name).toBe("persist_floor_command_observation");
    expect(rpcs[0]?.args.p_user_id).toBe(USER);
    expect(rpcs[0]?.args.p_claim).toBe(claimId);
    expect(rpcs[0]?.args).not.toHaveProperty("p_store_number");
    expect(memory.handoffs[0]?.snapshot.operational_week).toBe(WEEK);

    await dismissPersistedFloorCommandRevision(client as unknown as SupabaseClient, {
      handoffId: "fc.zebra-handoff.2587.2026-W44",
      revision: "rev-1",
    });
    expect(rpcs[1]).toEqual({
      name: "dismiss_floor_command_observation_revision",
      args: {
        p_handoff_id: "fc.zebra-handoff.2587.2026-W44",
        p_source_revision: "rev-1",
      },
    });

    await expect(
      recordFloorCommandObservation(
        clientFor(null) as unknown as SupabaseClient,
        USER,
        ready(snapshot("rev-1", "2026-10-25T18:00:00.000Z", [entry("a1")])),
        "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
      ),
    ).rejects.toBeInstanceOf(FloorCommandObservationUnboundError);
  });
});
