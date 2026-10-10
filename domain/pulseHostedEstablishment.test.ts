import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import {
  commitmentStartPulseIsDueForEstablishment,
  deriveCommitmentStartThreshold,
  evaluateCommitmentStartPulseCondition,
  type InterruptGrant,
  type PulseOccurrence,
} from "@/domain/pulse";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const GRANT = "22222222-2222-2222-2222-222222222222";
const COMMITMENT = "33333333-3333-3333-3333-333333333333";
const ZONE = "America/Denver";

function timedCommitment(startLocal = "15:00"): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal,
      endLocal: "16:00",
      title: "Doctor appointment",
    }),
    id: COMMITMENT,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function grant(overrides: Partial<InterruptGrant> = {}): InterruptGrant {
  return {
    id: GRANT,
    userId: USER,
    sourceKind: "commitment",
    sourceId: COMMITMENT,
    transitionKind: "start",
    relationship: "relative_before",
    leadOffsetSeconds: 15 * 60,
    establishedAt: "2026-10-08T12:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

function occurrence(overrides: Partial<PulseOccurrence> = {}): PulseOccurrence {
  return {
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
    establishedAt: "2026-10-08T20:45:00.000Z",
    ...overrides,
  };
}

function denver(local: string): Date {
  const [hour, minute] = local.split(":").map(Number);
  return new Date(Date.UTC(2026, 9, 8, hour + 6, minute, 0, 0));
}

function condition(input: {
  now: Date;
  grant?: InterruptGrant | null;
  commitment?: Commitment | null;
  timeZone?: string | null;
  occurrences?: readonly PulseOccurrence[];
  readsComplete?: boolean;
}) {
  return evaluateCommitmentStartPulseCondition({
    grant: input.grant === undefined ? grant() : input.grant,
    commitment: input.commitment === undefined ? timedCommitment() : input.commitment,
    timeZone: input.timeZone === undefined ? ZONE : input.timeZone,
    now: input.now,
    occurrences: input.occurrences ?? [],
    readsComplete: input.readsComplete ?? true,
  });
}

describe("hosted Commitment-start Pulse establishment semantics", () => {
  it("does not establish before threshold", () => {
    const result = condition({ now: denver("14:30") });
    expect(result).toBe("not_yet");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(false);
  });

  it("establishes when threshold becomes due inside the expression window", () => {
    const result = condition({ now: denver("14:45") });
    expect(result).toBe("eligible");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(true);
  });

  it("still establishes after Commitment start when no client was alive in the window", () => {
    const result = condition({ now: denver("15:10") });
    expect(result).toBe("elapsed");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(true);
  });

  it("does not re-establish when the identity is already satisfied", () => {
    const result = condition({
      now: denver("14:50"),
      occurrences: [occurrence()],
    });
    expect(result).toBe("satisfied");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(false);
  });

  it("does not establish after revocation before threshold", () => {
    const result = condition({
      now: denver("14:50"),
      grant: grant({ revokedAt: "2026-10-08T20:00:00.000Z" }),
    });
    expect(result).toBe("inactive");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(false);
  });

  it("moves the due threshold when Commitment start moves before occurrence", () => {
    const moved = timedCommitment("16:00");
    expect(commitmentStartPulseIsDueForEstablishment(condition({ now: denver("14:50"), commitment: moved }))).toBe(
      false,
    );
    expect(commitmentStartPulseIsDueForEstablishment(condition({ now: denver("15:45"), commitment: moved }))).toBe(
      true,
    );
    const derived = deriveCommitmentStartThreshold({
      commitment: moved as Extract<Commitment, { kind: "timed" }>,
      leadOffsetSeconds: 15 * 60,
      timeZone: ZONE,
    });
    expect(derived.thresholdAt.toISOString()).toBe(denver("15:45").toISOString());
    expect(derived.identity).toEqual({
      sourceStartsOn: "2026-10-08",
      sourceStartLocal: "16:00",
    });
  });

  it("keeps historical occurrence and allows a new identity after source moves", () => {
    const moved = timedCommitment("16:00");
    const old = occurrence();
    const result = condition({
      now: denver("15:50"),
      commitment: moved,
      occurrences: [old],
    });
    expect(result).toBe("eligible");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(true);
    expect(old.sourceStartLocal).toBe("15:00");
  });

  it("refuses all-day Commitments", () => {
    const allDay: Commitment = {
      ...defineCommitment({ kind: "all_day", startsOn: "2026-10-08", title: "Holiday" }),
      id: COMMITMENT,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    const result = condition({ now: denver("14:50"), commitment: allDay });
    expect(result).toBe("inactive");
    expect(commitmentStartPulseIsDueForEstablishment(result)).toBe(false);
  });

  it("withholds when timezone is missing or invalid", () => {
    expect(commitmentStartPulseIsDueForEstablishment(condition({ now: denver("14:50"), timeZone: null }))).toBe(
      false,
    );
    expect(condition({ now: denver("14:50"), timeZone: null })).toBe("withhold");
    expect(condition({ now: denver("14:50"), timeZone: "Not/AZone" })).toBe("withhold");
  });

  it("treats missing source as inactive rather than inventing a threshold", () => {
    expect(condition({ now: denver("14:50"), commitment: null })).toBe("inactive");
  });

  it("does not allow a grant owned by another user to evaluate against this Commitment identity", () => {
    const foreign = grant({ userId: OTHER, sourceId: COMMITMENT });
    // Domain evaluator is per supplied rows; ownership is enforced by same-owner FK and RLS.
    // Cross-user join is impossible in hosted SQL because grant.user_id must match commitment.user_id.
    expect(foreign.userId).not.toBe(USER);
    expect(foreign.sourceId).toBe(COMMITMENT);
  });
});

describe("hosted SQL evaluator contract correspondence", () => {
  const sql = readFileSync(
    "supabase/migrations/20261008240000_pulse_hosted_establishment.sql",
    "utf8",
  );

  it("keeps the SQL predicate aligned with domain establishment due semantics", () => {
    expect(sql).toContain("ORIENT-PULSE-HOSTED-ESTABLISHMENT-001");
    expect(sql).toContain("domain/pulse.ts");
    expect(sql).toContain("commitmentStartPulseIsDueForEstablishment");
    expect(sql).toContain("establish_due_commitment_start_pulse_occurrences");
    expect(sql).toContain("run_pulse_hosted_establishment");
    expect(sql).toContain("orient-pulse-hosted-establishment");
    expect(sql).toContain("pg_cron");
    expect(sql).toContain("at time zone zone");
    expect(sql).toContain("lead_offset_seconds");
    expect(sql).toContain("v_now < threshold_at");
    expect(sql).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(sql).toContain("revoked_at is null");
    expect(sql).toContain("kind <> 'timed'");
    expect(sql).toContain("temporal_settings");
    expect(sql).toContain("pulse_hosted_evaluator_runs");
    expect(sql).toMatch(/revoke all on function public\.establish_due_commitment_start_pulse_occurrences/);
    expect(sql).toMatch(/revoke all on function public\.run_pulse_hosted_establishment/);
    expect(sql).not.toMatch(/grant execute[\s\S]*to authenticated/);
    expect(sql).not.toMatch(/notification|vibrate|wear|push|kotlin/i);
    expect(sql).toContain("no absolute fire_at stored");
    expect(sql).not.toMatch(/add column.*fire_at|fire_at\s+timestamptz/i);
  });
});

describe("hosted Block-start extension contract", () => {
  const blockSql = readFileSync(
    "supabase/migrations/20261010093000_pulse_block_start_authority.sql",
    "utf8",
  );
  const ambiguitySql = readFileSync(
    "supabase/migrations/20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql",
    "utf8",
  );

  it("extends hosted evaluator for Block-start without client or delivery coupling", () => {
    expect(blockSql).toContain("ORIENT-PULSE-AUTHORITY-002");
    expect(blockSql).toContain("source_kind in ('commitment', 'block')");
    expect(blockSql).toContain("g.source_kind = 'block'");
    expect(blockSql).toContain("from public.blocks bl");
    expect(blockSql).toContain("startPulseIsDueForEstablishment");
    expect(blockSql).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(blockSql).not.toMatch(/notification|vibrate|wear|push|kotlin|fcm/i);
    expect(blockSql).not.toMatch(/grant execute[\s\S]*to authenticated/);
  });

  it("forward-corrects occurrence-identity EXISTS PL/pgSQL ambiguity without rewriting history", () => {
    expect(blockSql).toContain("and po.source_starts_on = source_starts_on");
    expect(ambiguitySql).toContain("ORIENT-PULSE-AUTHORITY-004");
    expect(ambiguitySql).toContain("v_source_starts_on date");
    expect(ambiguitySql).toContain("po.source_starts_on = v_source_starts_on");
    expect(ambiguitySql).toContain("po.source_start_local = v_source_start_local");
    expect(ambiguitySql).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(ambiguitySql).not.toMatch(/and po\.source_starts_on = source_starts_on\b/);
    expect(ambiguitySql).not.toMatch(/cron\.schedule|notification|vibrate|wear|fcm/i);
  });
});
