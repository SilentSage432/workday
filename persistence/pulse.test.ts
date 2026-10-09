import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import type { InterruptGrant, PulseOccurrence } from "@/domain/pulse";
import {
  establishCommitmentStartInterruptGrant,
  establishEligiblePulseOccurrences,
  loadActiveInterruptGrants,
  revokeInterruptGrant,
  rowToInterruptGrant,
  rowToPulseOccurrence,
  type PulseInterruptGrantRow,
  type PulseOccurrenceRow,
} from "@/persistence/pulse";

const USER = "11111111-1111-1111-1111-111111111111";
const GRANT = "22222222-2222-2222-2222-222222222222";
const COMMITMENT = "33333333-3333-3333-3333-333333333333";
const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261008230000_pulse_commitment_start.sql",
);

function timedCommitment(): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal: "15:00",
      endLocal: "16:00",
      title: "Doctor appointment",
    }),
    id: COMMITMENT,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function grantRow(overrides: Partial<PulseInterruptGrantRow> = {}): PulseInterruptGrantRow {
  return {
    id: GRANT,
    user_id: USER,
    source_kind: "commitment",
    source_id: COMMITMENT,
    transition_kind: "start",
    lead_offset_seconds: 900,
    established_at: "2026-10-08T12:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("pulse migration privileges", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("revokes defaults before narrow grants and never leaves broad UPDATE", () => {
    expect(sql).toContain("revoke all on table public.pulse_interrupt_grants from authenticated;");
    expect(sql).toContain("revoke all on table public.pulse_occurrences from authenticated;");
    expect(sql).toContain("grant select, insert on table public.pulse_interrupt_grants to authenticated;");
    expect(sql).toContain(
      "grant update (revoked_at) on table public.pulse_interrupt_grants to authenticated;",
    );
    expect(sql).toContain("grant select, insert on table public.pulse_occurrences to authenticated;");
    expect(sql).not.toMatch(/grant update on table public\.pulse_interrupt_grants/);
    expect(sql).not.toMatch(/grant update,|grant select, insert, update, delete on table public\.pulse_/);
    expect(sql).not.toMatch(/grant delete on table public\.pulse_/);
    expect(sql).not.toMatch(/grant .* on table public\.pulse_interrupt_grants to (public|anon)/);
    expect(sql).not.toMatch(/grant .* on table public\.pulse_occurrences to (public|anon)/);
  });

  it("enforces same-owner Commitment FK cascade and occurrence provenance retention", () => {
    expect(sql).toContain("commitments_id_user_key");
    expect(sql).toContain("on delete cascade");
    expect(sql).toContain("on delete set null");
    expect(sql).toContain(
      "unique (grant_id, source_starts_on, source_start_local)",
    );
    expect(sql).toContain(
      "pulse_interrupt_grants_one_active_idx",
    );
    expect(sql).toContain("lead_offset_seconds > 0");
    expect(sql).toContain("source_kind = 'commitment'");
    expect(sql).toContain("transition_kind = 'start'");
    expect(sql).toContain("pulse_interrupt_grant_requires_timed_commitment");
  });

  it("publishes grants and occurrences for reread awareness only", () => {
    expect(sql).toContain("alter publication supabase_realtime add table public.pulse_interrupt_grants;");
    expect(sql).toContain("alter publication supabase_realtime add table public.pulse_occurrences;");
  });
});

describe("pulse persistence mapping", () => {
  it("maps grant and occurrence rows without inventing channels", () => {
    expect(rowToInterruptGrant(grantRow())).toEqual({
      id: GRANT,
      userId: USER,
      sourceKind: "commitment",
      sourceId: COMMITMENT,
      transitionKind: "start",
      leadOffsetSeconds: 900,
      establishedAt: "2026-10-08T12:00:00.000Z",
      revokedAt: null,
    });
    const occurrenceRow: PulseOccurrenceRow = {
      id: "44444444-4444-4444-4444-444444444444",
      user_id: USER,
      grant_id: GRANT,
      source_kind: "commitment",
      source_id: COMMITMENT,
      source_starts_on: "2026-10-08",
      source_start_local: "15:00:00",
      threshold_at: "2026-10-08T20:45:00.000Z",
      source_start_at: "2026-10-08T21:00:00.000Z",
      established_at: "2026-10-08T20:45:00.000Z",
    };
    expect(rowToPulseOccurrence(occurrenceRow).sourceStartLocal).toBe("15:00");
  });

  it("establishes a grant only for timed Commitments and refuses a second active grant", async () => {
    const allDay: Commitment = {
      ...defineCommitment({ kind: "all_day", startsOn: "2026-10-08", title: "Holiday" }),
      id: COMMITMENT,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    await expect(
      establishCommitmentStartInterruptGrant(
        { auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) } } as never,
        { commitment: allDay, leadOffsetSeconds: 900, establishedAt: new Date() },
      ),
    ).rejects.toThrow(/timed Commitment/i);

    let inserts = 0;
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
      from(table: string) {
        if (table !== "pulse_interrupt_grants") throw new Error(table);
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          maybeSingle: async () =>
            inserts === 0
              ? { data: null, error: null }
              : { data: grantRow(), error: null },
          insert(row: Record<string, unknown>) {
            inserts += 1;
            expect(row.lead_offset_seconds).toBe(900);
            expect(row.revoked_at).toBeNull();
            return {
              select() {
                return {
                  single: async () => ({ data: grantRow(), error: null }),
                };
              },
            };
          },
        };
      },
    };

    const first = await establishCommitmentStartInterruptGrant(client as never, {
      commitment: timedCommitment(),
      leadOffsetSeconds: 900,
      establishedAt: new Date("2026-10-08T12:00:00.000Z"),
    });
    expect(first.id).toBe(GRANT);

    await expect(
      establishCommitmentStartInterruptGrant(client as never, {
        commitment: timedCommitment(),
        leadOffsetSeconds: 1800,
        establishedAt: new Date("2026-10-08T12:05:00.000Z"),
      }),
    ).rejects.toThrow(/already set/i);
  });

  it("revokes by setting revoked_at only", async () => {
    const updates: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        expect(table).toBe("pulse_interrupt_grants");
        return {
          update(patch: Record<string, unknown>) {
            updates.push(patch);
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          select() {
            return this;
          },
          single: async () => ({
            data: grantRow({ revoked_at: "2026-10-08T13:00:00.000Z" }),
            error: null,
          }),
        };
      },
    };
    const revoked = await revokeInterruptGrant(
      client as never,
      GRANT,
      new Date("2026-10-08T13:00:00.000Z"),
    );
    expect(updates).toEqual([{ revoked_at: "2026-10-08T13:00:00.000Z" }]);
    expect(revoked.revokedAt).toBe("2026-10-08T13:00:00.000Z");
    expect(revoked.establishedAt).toBe("2026-10-08T12:00:00.000Z");
    expect(revoked.leadOffsetSeconds).toBe(900);
  });

  it("establishes at most one occurrence for an eligible grant and converges on conflict", async () => {
    const grant: InterruptGrant = rowToInterruptGrant(grantRow());
    const commitment = timedCommitment();
    if (commitment.kind !== "timed") throw new Error("timed");
    const now = new Date(Date.UTC(2026, 9, 8, 20, 50, 0, 0)); // 14:50 Denver
    let upsertCalls = 0;
    const occurrence: PulseOccurrence = {
      id: "44444444-4444-4444-4444-444444444444",
      userId: USER,
      grantId: GRANT,
      sourceKind: "commitment",
      sourceId: COMMITMENT,
      sourceStartsOn: "2026-10-08",
      sourceStartLocal: "15:00",
      thresholdAt: "2026-10-08T20:45:00.000Z",
      sourceStartAt: "2026-10-08T21:00:00.000Z",
      establishedAt: now.toISOString(),
    };

    const client = {
      auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
      from(table: string) {
        expect(table).toBe("pulse_occurrences");
        return {
          upsert() {
            upsertCalls += 1;
            return {
              select() {
                return {
                  maybeSingle: async () =>
                    upsertCalls === 1
                      ? {
                          data: {
                            id: occurrence.id,
                            user_id: USER,
                            grant_id: GRANT,
                            source_kind: "commitment",
                            source_id: COMMITMENT,
                            source_starts_on: "2026-10-08",
                            source_start_local: "15:00:00",
                            threshold_at: occurrence.thresholdAt,
                            source_start_at: occurrence.sourceStartAt,
                            established_at: occurrence.establishedAt,
                          },
                          error: null,
                        }
                      : { data: null, error: null },
                };
              },
            };
          },
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({
            data: {
              id: occurrence.id,
              user_id: USER,
              grant_id: GRANT,
              source_kind: "commitment",
              source_id: COMMITMENT,
              source_starts_on: "2026-10-08",
              source_start_local: "15:00:00",
              threshold_at: occurrence.thresholdAt,
              source_start_at: occurrence.sourceStartAt,
              established_at: occurrence.establishedAt,
            },
            error: null,
          }),
        };
      },
    };

    const first = await establishEligiblePulseOccurrences(client as never, {
      grants: [grant],
      commitments: [commitment],
      occurrences: [],
      timeZone: "America/Denver",
      now,
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.id).toBe(occurrence.id);

    const second = await establishEligiblePulseOccurrences(client as never, {
      grants: [grant],
      commitments: [commitment],
      occurrences: first,
      timeZone: "America/Denver",
      now,
    });
    expect(second).toHaveLength(0);
    expect(upsertCalls).toBe(1);
  });

  it("loads only active grants when requested", async () => {
    const range = vi.fn(async () => ({ data: [grantRow()], error: null, count: 1 }));
    const client = {
      from() {
        return {
          select(_columns: string, options?: { count?: string }) {
            expect(options?.count).toBe("exact");
            return this;
          },
          is(column: string, value: null) {
            expect(column).toBe("revoked_at");
            expect(value).toBeNull();
            return this;
          },
          order() {
            return this;
          },
          range,
        };
      },
    };
    const rows = await loadActiveInterruptGrants(client as never);
    expect(rows).toHaveLength(1);
    expect(range).toHaveBeenCalled();
  });
});
