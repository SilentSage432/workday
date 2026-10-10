import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import {
  commitmentStartPulseIsDueForEstablishment,
  deriveBlockStartThreshold,
  deriveCommitmentStartThreshold,
  evaluateBlockStartPulseCondition,
  evaluateCommitmentStartPulseCondition,
  occurrenceMatchesIdentity,
  pulseOccurrenceStillBeforeStart,
  requirePulseLeadChoice,
  type InterruptGrant,
  type PulseOccurrence,
} from "@/domain/pulse";

const USER = "11111111-1111-1111-1111-111111111111";
const GRANT = "22222222-2222-2222-2222-222222222222";
const COMMITMENT = "33333333-3333-3333-3333-333333333333";
const BLOCK = "55555555-5555-5555-5555-555555555555";
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
    sourceStartsOn: "2026-10-08",
    sourceStartLocal: "15:00",
    thresholdAt: "2026-10-08T20:45:00.000Z",
    sourceStartAt: "2026-10-08T21:00:00.000Z",
    establishedAt: "2026-10-08T20:45:00.000Z",
    ...overrides,
  };
}

function denver(local: string): Date {
  // 2026-10-08 is MDT (UTC-6)
  const [hour, minute] = local.split(":").map(Number);
  return new Date(Date.UTC(2026, 9, 8, hour + 6, minute, 0, 0));
}

describe("evaluateCommitmentStartPulseCondition", () => {
  it("returns inactive when Commitment exists without a grant", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: null,
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:30"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
  });

  it("returns not_yet before threshold", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:30"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("not_yet");
  });

  it("returns eligible exactly at threshold", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:45"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("eligible");
  });

  it("returns eligible inside the half-open window", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:59"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("eligible");
  });

  it("returns elapsed exactly at Commitment start", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("15:00"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("elapsed");
  });

  it("returns elapsed after start", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("15:01"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("elapsed");
  });

  it("treats eligible and elapsed as due for establishment, not not_yet", () => {
    expect(commitmentStartPulseIsDueForEstablishment("not_yet")).toBe(false);
    expect(commitmentStartPulseIsDueForEstablishment("eligible")).toBe(true);
    expect(commitmentStartPulseIsDueForEstablishment("elapsed")).toBe(true);
    expect(commitmentStartPulseIsDueForEstablishment("satisfied")).toBe(false);
    expect(commitmentStartPulseIsDueForEstablishment("inactive")).toBe(false);
    expect(commitmentStartPulseIsDueForEstablishment("withhold")).toBe(false);
  });

  it("returns inactive when grant is revoked", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant({ revokedAt: "2026-10-08T20:00:00.000Z" }),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
  });

  it("returns inactive when source is missing", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: null,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
  });

  it("returns inactive for all-day Commitments", () => {
    const allDay: Commitment = {
      ...defineCommitment({ kind: "all_day", startsOn: "2026-10-08", title: "Holiday" }),
      id: COMMITMENT,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: allDay,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
  });

  it("returns withhold when reads are incomplete", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: false,
      }),
    ).toBe("withhold");
  });

  it("returns withhold when zone is missing or unusable", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: null,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("withhold");
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: "Not/AZone",
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("withhold");
  });

  it("returns satisfied when a matching occurrence already exists", () => {
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: timedCommitment(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [occurrence()],
        readsComplete: true,
      }),
    ).toBe("satisfied");
  });

  it("moves threshold when source start moves before occurrence", () => {
    const moved = timedCommitment("16:00");
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: moved,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("not_yet");
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: moved,
        timeZone: ZONE,
        now: denver("15:45"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("eligible");
  });

  it("keeps old occurrence evidence and allows a new identity after source moves", () => {
    const moved = timedCommitment("16:00");
    const old = occurrence();
    expect(
      evaluateCommitmentStartPulseCondition({
        grant: grant(),
        commitment: moved,
        timeZone: ZONE,
        now: denver("15:50"),
        occurrences: [old],
        readsComplete: true,
      }),
    ).toBe("eligible");
    expect(
      occurrenceMatchesIdentity(old, GRANT, {
        sourceStartsOn: "2026-10-08",
        sourceStartLocal: "15:00",
      }),
    ).toBe(true);
    expect(
      occurrenceMatchesIdentity(old, GRANT, {
        sourceStartsOn: "2026-10-08",
        sourceStartLocal: "16:00",
      }),
    ).toBe(false);
  });
});

describe("deriveCommitmentStartThreshold", () => {
  it("derives relative threshold from Commitment start and lead", () => {
    const commitment = timedCommitment();
    if (commitment.kind !== "timed") throw new Error("expected timed");
    const derived = deriveCommitmentStartThreshold({
      commitment,
      leadOffsetSeconds: 15 * 60,
      timeZone: ZONE,
    });
    expect(derived.identity).toEqual({
      sourceStartsOn: "2026-10-08",
      sourceStartLocal: "15:00",
    });
    expect(derived.sourceStartAt.toISOString()).toBe(denver("15:00").toISOString());
    expect(derived.thresholdAt.toISOString()).toBe(denver("14:45").toISOString());
  });
});

describe("pulse helpers", () => {
  it("accepts only bounded lead choices for human establishment", () => {
    expect(requirePulseLeadChoice(15 * 60)).toBe(900);
    expect(() => requirePulseLeadChoice(7 * 60)).toThrow(/lead time/i);
    expect(() => requirePulseLeadChoice(0)).toThrow(/positive/i);
    expect(() => requirePulseLeadChoice(-900)).toThrow(/positive/i);
  });

  it("treats expression window as before fingerprinted start", () => {
    expect(
      pulseOccurrenceStillBeforeStart({
        occurrence: occurrence(),
        now: denver("14:50"),
        timeZone: ZONE,
      }),
    ).toBe(true);
    expect(
      pulseOccurrenceStillBeforeStart({
        occurrence: occurrence(),
        now: denver("15:00"),
        timeZone: ZONE,
      }),
    ).toBe(false);
  });
});

function timedBlock(startLocal = "15:00"): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal,
      endLocal: "16:00",
      purpose: "Deep work",
    }),
    id: BLOCK,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function blockGrant(overrides: Partial<InterruptGrant> = {}): InterruptGrant {
  return {
    id: GRANT,
    userId: USER,
    sourceKind: "block",
    sourceId: BLOCK,
    transitionKind: "start",
    leadOffsetSeconds: 15 * 60,
    establishedAt: "2026-10-08T12:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

function blockOccurrence(overrides: Partial<PulseOccurrence> = {}): PulseOccurrence {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    userId: USER,
    grantId: GRANT,
    sourceKind: "block",
    sourceId: BLOCK,
    sourceStartsOn: "2026-10-08",
    sourceStartLocal: "15:00",
    thresholdAt: "2026-10-08T20:45:00.000Z",
    sourceStartAt: "2026-10-08T21:00:00.000Z",
    establishedAt: "2026-10-08T20:45:00.000Z",
    ...overrides,
  };
}

describe("evaluateBlockStartPulseCondition", () => {
  it("returns not_yet before threshold, eligible in window, elapsed at start", () => {
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:30"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("not_yet");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:45"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("eligible");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("15:00"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("elapsed");
  });

  it("returns satisfied when occurrence matches current Block start fingerprint", () => {
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [blockOccurrence()],
        readsComplete: true,
      }),
    ).toBe("satisfied");
    expect(commitmentStartPulseIsDueForEstablishment("satisfied")).toBe(false);
  });

  it("returns inactive for all-day Blocks, missing source, revoked grant, or wrong source kind", () => {
    const allDay: Block = {
      ...defineBlock({ kind: "all_day", startsOn: "2026-10-08", purpose: "Focus day" }),
      id: BLOCK,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: allDay,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: null,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant({ revokedAt: "2026-10-08T20:00:00.000Z" }),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
    expect(
      evaluateBlockStartPulseCondition({
        grant: grant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("inactive");
  });

  it("withholds incomplete temporal truth", () => {
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: null,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("withhold");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: timedBlock(),
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: false,
      }),
    ).toBe("withhold");
  });

  it("moves threshold when Block start moves before occurrence and keeps old fingerprint", () => {
    const moved = timedBlock("16:00");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: moved,
        timeZone: ZONE,
        now: denver("14:50"),
        occurrences: [],
        readsComplete: true,
      }),
    ).toBe("not_yet");
    expect(
      evaluateBlockStartPulseCondition({
        grant: blockGrant(),
        block: moved,
        timeZone: ZONE,
        now: denver("15:45"),
        occurrences: [blockOccurrence()],
        readsComplete: true,
      }),
    ).toBe("eligible");
    expect(
      occurrenceMatchesIdentity(blockOccurrence(), GRANT, {
        sourceStartsOn: "2026-10-08",
        sourceStartLocal: "15:00",
      }),
    ).toBe(true);
    expect(
      occurrenceMatchesIdentity(blockOccurrence(), GRANT, {
        sourceStartsOn: "2026-10-08",
        sourceStartLocal: "16:00",
      }),
    ).toBe(false);
  });
});

describe("deriveBlockStartThreshold", () => {
  it("derives relative threshold from Block start and lead", () => {
    const block = timedBlock();
    if (block.kind !== "timed") throw new Error("expected timed");
    const derived = deriveBlockStartThreshold({
      block,
      leadOffsetSeconds: 15 * 60,
      timeZone: ZONE,
    });
    expect(derived.identity).toEqual({
      sourceStartsOn: "2026-10-08",
      sourceStartLocal: "15:00",
    });
    expect(derived.sourceStartAt.toISOString()).toBe(denver("15:00").toISOString());
    expect(derived.thresholdAt.toISOString()).toBe(denver("14:45").toISOString());
  });
});
