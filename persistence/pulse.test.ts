import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import type { InterruptGrant, PulseOccurrence } from "@/domain/pulse";
import {
  establishBlockStartInterruptGrant,
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
const BLOCK = "55555555-5555-5555-5555-555555555555";
const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261008230000_pulse_commitment_start.sql",
);
const BLOCK_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261010093000_pulse_block_start_authority.sql",
);
const SOURCE_DELETE_AUTHORITY_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261010170000_pulse_interrupt_grants_source_delete_authority.sql",
);
const RELATIONSHIP_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261010200000_pulse_authorized_temporal_relationships.sql",
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
    relationship: "relative_before",
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
      relationship: "relative_before",
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
      relationship: "relative_before",
      source_starts_on: "2026-10-08",
      source_start_local: "15:00:00",
      threshold_at: "2026-10-08T20:45:00.000Z",
      source_start_at: "2026-10-08T21:00:00.000Z",
      established_at: "2026-10-08T20:45:00.000Z",
    };
    expect(rowToPulseOccurrence(occurrenceRow).sourceStartLocal).toBe("15:00");
    expect(rowToPulseOccurrence(occurrenceRow).relationship).toBe("relative_before");
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
            expect(row.relationship).toBe("relative_before");
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
      relationship: "relative_before",
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
                            relationship: "relative_before",
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
              relationship: "relative_before",
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

  it("establishes after Commitment start when the half-open expression window was missed", async () => {
    const grant: InterruptGrant = rowToInterruptGrant(grantRow());
    const commitment = timedCommitment();
    if (commitment.kind !== "timed") throw new Error("timed");
    const now = new Date(Date.UTC(2026, 9, 8, 21, 10, 0, 0)); // 15:10 Denver — elapsed
    const occurrence: PulseOccurrence = {
      id: "55555555-5555-5555-5555-555555555555",
      userId: USER,
      grantId: GRANT,
      sourceKind: "commitment",
      sourceId: COMMITMENT,
      relationship: "relative_before",
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
            return {
              select() {
                return {
                  maybeSingle: async () => ({
                    data: {
                      id: occurrence.id,
                      user_id: USER,
                      grant_id: GRANT,
                      source_kind: "commitment",
                      source_id: COMMITMENT,
                      relationship: "relative_before",
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
          },
        };
      },
    };

    const minted = await establishEligiblePulseOccurrences(client as never, {
      grants: [grant],
      commitments: [commitment],
      occurrences: [],
      timeZone: "America/Denver",
      now,
    });
    expect(minted).toHaveLength(1);
    expect(minted[0]?.id).toBe(occurrence.id);
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

function timedBlock(): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal: "15:00",
      endLocal: "16:00",
      purpose: "Deep work",
    }),
    id: BLOCK,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function blockGrantRow(overrides: Partial<PulseInterruptGrantRow> = {}): PulseInterruptGrantRow {
  return {
    id: GRANT,
    user_id: USER,
    source_kind: "block",
    source_id: BLOCK,
    transition_kind: "start",
    relationship: "relative_before",
    lead_offset_seconds: 900,
    established_at: "2026-10-08T12:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("pulse authorized temporal relationship migration", () => {
  const sql = readFileSync(RELATIONSHIP_MIGRATION, "utf8");

  it("adds explicit relationship identity without ARRIVAL UI or native coupling", () => {
    expect(sql).toContain("ORIENT-PULSE-EXPRESSION-005-I");
    expect(sql).toContain("relative_before");
    expect(sql).toContain("arrival");
    expect(sql).toContain("pulse_interrupt_grants_relationship_lead");
    expect(sql).toContain("set relationship = 'relative_before'");
    expect(sql).toContain("threshold_at := source_start_at");
    expect(sql).not.toMatch(/add constraint blocks_id_user_key/i);
    expect(sql).not.toMatch(/grant delete on table public\.pulse_interrupt_grants/i);
    expect(sql).not.toMatch(/notification|vibrate|wear|fcm|kotlin/i);
  });
});

describe("pulse relationship persistence mapping", () => {
  it("maps arrival grants with null lead and fails closed on unknown relationship", () => {
    expect(
      rowToInterruptGrant(
        grantRow({
          relationship: "arrival",
          lead_offset_seconds: null,
        }),
      ),
    ).toMatchObject({
      relationship: "arrival",
      leadOffsetSeconds: null,
    });
    expect(() => rowToInterruptGrant(grantRow({ relationship: "approach" }))).toThrow(
      /unsupported relationship/i,
    );
    expect(() =>
      rowToInterruptGrant(grantRow({ relationship: "arrival", lead_offset_seconds: 900 })),
    ).toThrow(/does not take a lead/i);
    expect(() =>
      rowToPulseOccurrence({
        id: "44444444-4444-4444-4444-444444444444",
        user_id: USER,
        grant_id: GRANT,
        source_kind: "commitment",
        source_id: COMMITMENT,
        relationship: "approach",
        source_starts_on: "2026-10-08",
        source_start_local: "15:00:00",
        threshold_at: "2026-10-08T21:00:00.000Z",
        source_start_at: "2026-10-08T21:00:00.000Z",
        established_at: "2026-10-08T21:00:00.000Z",
      }),
    ).toThrow(/unsupported relationship/i);
  });
});

describe("pulse source-deletion authority migration", () => {
  const sql = readFileSync(SOURCE_DELETE_AUTHORITY_MIGRATION, "utf8");

  it("corrects cascade cleanup to SECURITY DEFINER without authenticated DELETE", () => {
    expect(sql).toContain("ORIENT-PULSE-LIFECYCLE-002");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("pulse_interrupt_grants_cascade_source_delete");
    expect(sql).toContain("delete from public.pulse_interrupt_grants");
    expect(sql).toContain("source_kind = tg_argv[0]");
    expect(sql).toContain("source_id = old.id");
    expect(sql).toContain("user_id = old.user_id");
    expect(sql).toContain("grant execute on function public.pulse_interrupt_grants_cascade_source_delete()");
    expect(sql).toContain("revoke all on function public.pulse_interrupt_grants_cascade_source_delete()");
    expect(sql).not.toMatch(/grant delete on table public\.pulse_interrupt_grants/i);
    expect(sql).not.toMatch(/create policy[\s\S]*for delete/i);
    expect(sql).not.toMatch(/drop trigger/i);
  });
});

describe("pulse Block-start authority migration", () => {
  const sql = readFileSync(BLOCK_MIGRATION, "utf8");

  it("widens source kinds with kind-aware ownership and delete cascade", () => {
    expect(sql).toContain("ORIENT-PULSE-AUTHORITY-002");
    // Depends on predecessor blocks_id_user_key from execution_direction; must not re-ADD it.
    expect(sql).toContain("20261005170800_execution_direction.sql");
    expect(sql).toContain("blocks_id_user_key UNIQUE (id, user_id)");
    expect(sql).not.toMatch(/add constraint blocks_id_user_key/i);
    expect(sql).toContain("drop constraint pulse_interrupt_grants_commitment_same_owner");
    expect(sql).toContain("source_kind in ('commitment', 'block')");
    expect(sql).toContain("pulse_interrupt_grant_requires_timed_source");
    expect(sql).toContain("Interrupt grant requires an owned Block");
    expect(sql).toContain("Interrupt grant requires a timed Block start");
    expect(sql).toContain("pulse_interrupt_grants_cascade_source_delete");
    expect(sql).toContain("pulse_interrupt_grants_cascade_block_delete");
    expect(sql).toContain("pulse_interrupt_grants_cascade_commitment_delete");
    expect(sql).toContain("source_kind in ('commitment', 'block')");
    expect(sql).toContain("g.source_kind = 'block'");
    expect(sql).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(sql).not.toMatch(/lead_offset_seconds\s*=\s*0|lead_offset_seconds\s*>=\s*0/);
    expect(sql).not.toMatch(/transition_kind.*end|'end'/);
    expect(sql).not.toMatch(/notification|vibrate|wear|fcm|kotlin/i);
  });
});

describe("pulse Block-start persistence", () => {
  it("maps Block grants and refuses all-day / duplicate active grants / lead=0", async () => {
    expect(rowToInterruptGrant(blockGrantRow())).toMatchObject({
      sourceKind: "block",
      sourceId: BLOCK,
      leadOffsetSeconds: 900,
    });
    expect(() => rowToInterruptGrant(blockGrantRow({ source_kind: "task" }))).toThrow(
      /unsupported source kind/i,
    );
    expect(() => rowToInterruptGrant(blockGrantRow({ lead_offset_seconds: 0 }))).toThrow(/positive/i);
    expect(() => rowToInterruptGrant(blockGrantRow({ lead_offset_seconds: -1 }))).toThrow(/positive/i);

    const allDay: Block = {
      ...defineBlock({ kind: "all_day", startsOn: "2026-10-08", purpose: "Focus day" }),
      id: BLOCK,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    await expect(
      establishBlockStartInterruptGrant(
        { auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) } } as never,
        { block: allDay, leadOffsetSeconds: 900, establishedAt: new Date() },
      ),
    ).rejects.toThrow(/timed Block/i);

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
            inserts === 0 ? { data: null, error: null } : { data: blockGrantRow(), error: null },
          insert(row: Record<string, unknown>) {
            inserts += 1;
            expect(row.source_kind).toBe("block");
            expect(row.source_id).toBe(BLOCK);
            expect(row.relationship).toBe("relative_before");
            expect(row.lead_offset_seconds).toBe(900);
            return {
              select() {
                return {
                  single: async () => ({ data: blockGrantRow(), error: null }),
                };
              },
            };
          },
        };
      },
    };

    const first = await establishBlockStartInterruptGrant(client as never, {
      block: timedBlock(),
      leadOffsetSeconds: 900,
      establishedAt: new Date("2026-10-08T12:00:00.000Z"),
    });
    expect(first.sourceKind).toBe("block");
    await expect(
      establishBlockStartInterruptGrant(client as never, {
        block: timedBlock(),
        leadOffsetSeconds: 1800,
        establishedAt: new Date("2026-10-08T12:05:00.000Z"),
      }),
    ).rejects.toThrow(/already set/i);
  });

  it("establishes one Block occurrence for a fingerprint and converges on conflict", async () => {
    const grant: InterruptGrant = rowToInterruptGrant(blockGrantRow());
    const block = timedBlock();
    if (block.kind !== "timed") throw new Error("timed");
    const now = new Date(Date.UTC(2026, 9, 8, 20, 50, 0, 0));
    let upsertCalls = 0;
    const occurrence: PulseOccurrence = {
      id: "66666666-6666-6666-6666-666666666666",
      userId: USER,
      grantId: GRANT,
      sourceKind: "block",
      sourceId: BLOCK,
      relationship: "relative_before",
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
          upsert(row: Record<string, unknown>) {
            upsertCalls += 1;
            expect(row.source_kind).toBe("block");
            expect(row.source_starts_on).toBe("2026-10-08");
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
                            source_kind: "block",
                            source_id: BLOCK,
                            relationship: "relative_before",
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
              source_kind: "block",
              source_id: BLOCK,
              relationship: "relative_before",
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
      commitments: [],
      blocks: [block],
      occurrences: [],
      timeZone: "America/Denver",
      now,
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.sourceKind).toBe("block");
    expect(first[0]?.sourceStartLocal).toBe("15:00");

    const second = await establishEligiblePulseOccurrences(client as never, {
      grants: [grant],
      commitments: [],
      blocks: [block],
      occurrences: first,
      timeZone: "America/Denver",
      now,
    });
    expect(second).toHaveLength(0);
    expect(upsertCalls).toBe(1);
  });

  it("keeps Commitment establishment path unchanged beside Block grants", async () => {
    const grant: InterruptGrant = rowToInterruptGrant(grantRow());
    const commitment = timedCommitment();
    if (commitment.kind !== "timed") throw new Error("timed");
    const now = new Date(Date.UTC(2026, 9, 8, 20, 50, 0, 0));
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
      from(table: string) {
        expect(table).toBe("pulse_occurrences");
        return {
          upsert(row: Record<string, unknown>) {
            expect(row.source_kind).toBe("commitment");
            return {
              select() {
                return {
                  maybeSingle: async () => ({
                    data: {
                      id: "44444444-4444-4444-4444-444444444444",
                      user_id: USER,
                      grant_id: GRANT,
                      source_kind: "commitment",
                      source_id: COMMITMENT,
                      relationship: "relative_before",
                      source_starts_on: "2026-10-08",
                      source_start_local: "15:00:00",
                      threshold_at: "2026-10-08T20:45:00.000Z",
                      source_start_at: "2026-10-08T21:00:00.000Z",
                      established_at: now.toISOString(),
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
    };
    const minted = await establishEligiblePulseOccurrences(client as never, {
      grants: [grant],
      commitments: [commitment],
      blocks: [timedBlock()],
      occurrences: [],
      timeZone: "America/Denver",
      now,
    });
    expect(minted).toHaveLength(1);
    expect(minted[0]?.sourceKind).toBe("commitment");
  });
});
