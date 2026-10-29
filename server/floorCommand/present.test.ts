import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/integrations/floor-command/observation/route";
import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import {
  FLOOR_COMMAND_BASE_URL_ENV,
  FLOOR_COMMAND_PULL_ENABLED_ENV,
  FLOOR_COMMAND_READ_TOKEN_ENV,
  FLOOR_COMMAND_STORE_NUMBER_ENV,
} from "@/server/floorCommand/config";
import { floorCommandObservationHttpError, loadFloorCommandWorkReading } from "@/server/floorCommand/present";
import { FLOOR_COMMAND_SOURCE, type FloorCommandSnapshot } from "@/domain/floorCommandObservation";
import {
  applyFloorCommandRead,
  emptyFloorCommandObservationMemory,
  noteFloorCommandObservationFailure,
  type FloorCommandObservationMemory,
} from "@/projections/floorCommandObservation";
import { presentFloorCommandWork } from "@/projections/floorCommandWorkPresentation";

const OPERATOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const TOKEN = "orient-floor-command-bearer-should-not-leak";
const READ_AT = "2026-10-25T18:00:00.000Z";

function snapshot(revision: string): FloorCommandSnapshot {
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: "2026-W44",
    week_starting: "2026-10-26",
    week_ending: "2026-11-01",
    publication: { id: "fc.publication.2587.2026-W44", status: "published" },
    handoff: {
      id: "fc.zebra-handoff.2587.2026-W44",
      status: "pending",
      deadline_date: "2026-10-26",
      deadline_policy: "monday_of_operational_week",
      required_count: 1,
      confirmed_count: 0,
      outstanding_count: 1,
    },
    entries: [
      {
        id: "fc.assignment.a1",
        assignment_id: "a1",
        bay_id: "12",
        department: "flooring",
        roster_specialist_id: null,
        associate_name: "Nick",
        assignment_status: "assigned",
        zebra_confirmation: "unconfirmed",
        zebra_entered_at: null,
        zebra_task_completed: false,
        deadline: null,
        updated_at: READ_AT,
      },
    ],
    deadlines: { availability: "ready", commitments: [] },
    retired: [],
    freshness: {
      read_at: READ_AT,
      source_updated_at: READ_AT,
      revision,
      matches_previous_revision: null,
      week_sequence: 1,
    },
  };
}

function remembered(): FloorCommandObservationMemory {
  return applyFloorCommandRead(emptyFloorCommandObservationMemory("2587"), {
    availability: "ready",
    synchronization: "comparable",
    snapshot: snapshot("rev-1"),
  });
}

function stored(memory: FloorCommandObservationMemory, userId = OPERATOR) {
  return { userId, storeNumber: "2587", memory };
}

describe("Floor Command work presentation", () => {
  it("keeps another operator's observation unapproved", () => {
    const reading = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(remembered(), OTHER),
      serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
    });
    expect(reading).toEqual({ posture: "unapproved" });
    expect(JSON.stringify(reading)).not.toContain("Nick");
    expect(JSON.stringify(reading)).not.toContain(TOKEN);
  });

  it("distinguishes approval, configuration, retention, and a failed read", () => {
    expect(
      presentFloorCommandWork({
        operatorId: OPERATOR,
        stored: null,
        serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
      }),
    ).toEqual({ posture: "unapproved" });

    const unconfigured = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(emptyFloorCommandObservationMemory("2587")),
      serverStore: { status: "unconfigured", storeNumber: null, pullEnabled: false },
    });
    expect(unconfigured.posture).toBe("unconfigured");
    if (unconfigured.posture !== "unconfigured") return;
    expect(unconfigured.observation.status).toBe("unobserved");
    expect(unconfigured.pullEnabled).toBe(false);

    const empty = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(emptyFloorCommandObservationMemory("2587")),
      serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
    });
    expect(empty.posture).toBe("retained");
    if (empty.posture !== "retained") return;
    expect(empty.observation.status).toBe("unobserved");

    const retained = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(remembered()),
      serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
    });
    expect(retained.posture).toBe("retained");
    if (retained.posture !== "retained") return;
    expect(retained.pullEnabled).toBe(false);
    expect(retained.observation.status).toBe("retained");

    const enabled = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(remembered()),
      serverStore: { status: "configured", storeNumber: "2587", pullEnabled: true },
    });
    expect(enabled.posture).toBe("retained");
    if (enabled.posture !== "retained") return;
    expect(enabled.pullEnabled).toBe(true);
    expect(enabled.observation.status).toBe("retained");

    const stale = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(noteFloorCommandObservationFailure(remembered(), "2026-10-26T12:00:00.000Z", "source_unavailable")),
      serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
    });
    expect(stale.posture).toBe("retained");
    if (stale.posture !== "retained") return;
    expect(stale.observation.status).toBe("stale");
    if (stale.observation.status !== "stale") return;
    expect(stale.observation.reason).toBe("source_unavailable");
    expect(stale.observation.handoffs[0]?.revision).toBe("rev-1");
  });

  it("withholds a snapshot when the binding store is not the server store", () => {
    const reading = presentFloorCommandWork({
      operatorId: OPERATOR,
      stored: stored(remembered()),
      serverStore: { status: "configured", storeNumber: "1999", pullEnabled: false },
    });
    expect(reading).toEqual({ posture: "wrong_store" });
    expect(JSON.stringify(reading)).not.toContain("Nick");
    expect(JSON.stringify(reading)).not.toContain("2587");
  });

  it("names a rejected credential, a withheld snapshot, and a sequence conflict without replacing the week", () => {
    for (const reason of ["credential_rejected", "ordering_withheld", "sequence_conflict"] as const) {
      const reading = presentFloorCommandWork({
        operatorId: OPERATOR,
        stored: stored(noteFloorCommandObservationFailure(remembered(), "2026-10-26T12:00:00.000Z", reason)),
        serverStore: { status: "configured", storeNumber: "2587", pullEnabled: false },
      });
      expect(reading.posture).toBe("retained");
      if (reading.posture !== "retained" || reading.observation.status !== "stale") {
        throw new Error(reason);
      }
      expect(reading.observation.reason).toBe(reason);
      expect(reading.observation.handoffs[0]?.revision).toBe("rev-1");
    }
  });
});

describe("Floor Command observation route", () => {
  it("refuses a signed-out request before reading a store", async () => {
    const response = await GET(
      new Request("http://orient.test/api/integrations/floor-command/observation?store=1999"),
    );
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toContain("Sign in is required.");
    expect(body).not.toContain("1999");
    expect(body).not.toContain(TOKEN);
  });

  it("does not echo an internal failure", async () => {
    const response = floorCommandObservationHttpError(
      new AuthenticatedUserError("unauthenticated", `${TOKEN} leaked`),
    );
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(TOKEN);

    const stored = floorCommandObservationHttpError(new Error(`password ${TOKEN}`));
    expect(stored.status).toBe(503);
    expect(await stored.text()).toBe('{"error":"Floor Command observation could not be read."}');
  });

  it("loads only the signed-in operator and does not call Floor Command", async () => {
    const previous = {
      token: process.env[FLOOR_COMMAND_READ_TOKEN_ENV],
      store: process.env[FLOOR_COMMAND_STORE_NUMBER_ENV],
      base: process.env[FLOOR_COMMAND_BASE_URL_ENV],
      pull: process.env[FLOOR_COMMAND_PULL_ENABLED_ENV],
    };
    process.env[FLOOR_COMMAND_READ_TOKEN_ENV] = TOKEN;
    process.env[FLOOR_COMMAND_STORE_NUMBER_ENV] = "2587";
    process.env[FLOOR_COMMAND_BASE_URL_ENV] = "https://floor-command.test";
    delete process.env[FLOOR_COMMAND_PULL_ENABLED_ENV];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("live fetch"));
    const eqs: string[] = [];
    const value = snapshot("rev-1");
    const client = {
      from(table: string) {
        const builder = {
          select() {
            return builder;
          },
          eq(_column: string, id: string) {
            eqs.push(`${table}:${id}`);
            return builder;
          },
          maybeSingle: async () => {
            if (table === "floor_command_observation_bindings") {
              return {
                data: {
                  store_number: "2587",
                  source: FLOOR_COMMAND_SOURCE,
                  purpose: "orient_published_week_read",
                },
                error: null,
              };
            }
            if (table === "floor_command_observation_attempts") {
              return {
                data: {
                  user_id: OPERATOR,
                  last_attempted_at: READ_AT,
                  last_attempt_result: "success_complete",
                  last_attempt_reason: null,
                  last_successful_observed_at: READ_AT,
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
          then(onFulfilled: (row: { data: unknown[]; error: null }) => unknown) {
            const data =
              table === "floor_command_observation_handoffs"
                ? [
                    {
                      user_id: OPERATOR,
                      handoff_id: value.handoff.id,
                      store_number: "2587",
                      operational_week: value.operational_week,
                      week_starting: value.week_starting,
                      week_ending: value.week_ending,
                      source_revision: value.freshness.revision,
                      source_updated_at: value.freshness.source_updated_at,
                      last_successful_observed_at: READ_AT,
                      deadlines_availability: "ready",
                      snapshot: value,
                      superseded_assignments: [],
                      retained_deadlines: [],
                    },
                  ]
                : [];
            return Promise.resolve({ data, error: null }).then(onFulfilled);
          },
        };
        return builder;
      },
    };

    try {
      const reading = await loadFloorCommandWorkReading(client as unknown as SupabaseClient, OPERATOR);
      expect(reading.posture).toBe("retained");
      if (reading.posture !== "retained") return;
      expect(reading.pullEnabled).toBe(false);
      expect(reading.observation.status).toBe("retained");
      expect(eqs.every((row) => row.endsWith(OPERATOR))).toBe(true);
      expect(eqs.some((row) => row.includes(OTHER))).toBe(false);
      expect(JSON.stringify(reading)).not.toContain(TOKEN);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      restore(FLOOR_COMMAND_READ_TOKEN_ENV, previous.token);
      restore(FLOOR_COMMAND_STORE_NUMBER_ENV, previous.store);
      restore(FLOOR_COMMAND_BASE_URL_ENV, previous.base);
      restore(FLOOR_COMMAND_PULL_ENABLED_ENV, previous.pull);
    }
  });

  it("does not pull, write temporal rows, or accept a client store", () => {
    const present = readFileSync("server/floorCommand/present.ts", "utf8");
    const route = readFileSync("app/api/integrations/floor-command/observation/route.ts", "utf8");
    const client = readFileSync("components/orient/floorCommandWorkApi.ts", "utf8");
    const view = readFileSync("components/orient/FloorCommandWorkView.tsx", "utf8");
    for (const source of [present, route, client, view]) {
      expect(source).not.toContain("pullFloorCommandPublishedWeek");
      expect(source).not.toContain("published-week");
      expect(source).not.toContain("ORIENT_FLOOR_COMMAND_READ_TOKEN");
      expect(source).not.toMatch(/createTask|createCommitment|createBlock|InterruptGrant|Notification/);
    }
    expect(route).not.toContain("searchParams");
    expect(route).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
    expect(readFileSync("components/orient/WorkScheduleOperation.tsx", "utf8")).not.toContain("FloorCommand");
    expect(readFileSync("app/page.tsx", "utf8")).not.toContain("FloorCommand");
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
