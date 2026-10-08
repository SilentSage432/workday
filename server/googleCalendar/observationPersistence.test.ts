import { describe, expect, it, vi } from "vitest";
import {
  clearExternalFactsForConnection,
  persistSourceObservation,
} from "@/server/googleCalendar/observationPersistence";
import type { ExternalFactCandidate } from "@/server/googleCalendar/mapEvent";

describe("observation persistence boundary", () => {
  it("calls the provider-neutral RPC with complete success + absence", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const admin = { rpc } as never;
    const fact: ExternalFactCandidate = {
      sourceEventId: "evt-1",
      sourceInstanceId: null,
      sourceSeriesId: null,
      temporal: {
        kind: "timed",
        startAt: new Date("2026-10-07T15:00:00.000Z"),
        endAt: new Date("2026-10-07T16:00:00.000Z"),
        sourceTimeZone: "America/Boise",
      },
      displayLabel: "Meet",
      lifecycle: "active",
      providerVersionToken: "etag",
      providerUpdatedAt: "2026-10-07T14:00:00.000Z",
      providerEventType: "default",
      providerTransparency: "opaque",
    };

    await persistSourceObservation(
      {
        userId: "user-1",
        sourceId: "source-1",
        observedAt: "2026-10-07T18:00:00.000Z",
        attemptResult: "success_complete",
        windowStartsOn: "2026-09-30",
        windowEndsBefore: "2026-11-19",
        windowTimeMin: "2026-09-30T06:00:00.000Z",
        windowTimeMax: "2026-11-19T07:00:00.000Z",
        applyAbsence: true,
        facts: [fact],
      },
      admin,
    );

    expect(rpc).toHaveBeenCalledWith(
      "persist_external_source_observation",
      expect.objectContaining({
        p_user_id: "user-1",
        p_source_id: "source-1",
        p_attempt_result: "success_complete",
        p_apply_absence: true,
        p_facts: [
          expect.objectContaining({
            source_event_id: "evt-1",
            temporal_kind: "timed",
            display_label: "Meet",
          }),
        ],
      }),
    );
  });

  it("does not send facts or absence on failed attempts", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    await persistSourceObservation(
      {
        userId: "user-1",
        sourceId: "source-1",
        observedAt: "2026-10-07T18:00:00.000Z",
        attemptResult: "failure",
        windowStartsOn: null,
        windowEndsBefore: null,
        windowTimeMin: null,
        windowTimeMax: null,
        applyAbsence: false,
        facts: [],
      },
      { rpc } as never,
    );
    expect(rpc).toHaveBeenCalledWith(
      "persist_external_source_observation",
      expect.objectContaining({
        p_attempt_result: "failure",
        p_apply_absence: false,
        p_facts: [],
      }),
    );
  });

  it("clears connection external facts through the provider-neutral RPC", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    await clearExternalFactsForConnection({ userId: "user-1", connectionId: "conn-1" }, { rpc } as never);
    expect(rpc).toHaveBeenCalledWith("clear_external_facts_for_connection", {
      p_user_id: "user-1",
      p_connection_id: "conn-1",
    });
  });

  it("documents migration SQL absence and identity rules", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sql = readFileSync(
      join(import.meta.dirname, "../../supabase/migrations/20261008010000_persist_external_source_observation.sql"),
      "utf8",
    );
    expect(sql).toMatch(/lifecycle = 'absent_from_window'/);
    expect(sql).toMatch(/p_apply_absence/);
    expect(sql).toMatch(/coalesce\(source_instance_id, ''\)/);
    expect(sql).toMatch(/if p_attempt_result <> 'success_complete' then/);
    expect(sql).not.toMatch(/protected_time|commitments|blocks|tasks|work_schedule/);
  });
});
