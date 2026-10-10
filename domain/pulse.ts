import type { Block, TimedBlock } from "@/domain/block";
import type { Commitment, TimedCommitment } from "@/domain/commitment";
import { instantFromZonedLocal, requireIanaTimeZone } from "@/domain/time/localTime";

export const PULSE_SOURCE_KIND_COMMITMENT = "commitment" as const;
export const PULSE_SOURCE_KIND_BLOCK = "block" as const;
export const PULSE_TRANSITION_KIND_START = "start" as const;

export type PulseSourceKind =
  | typeof PULSE_SOURCE_KIND_COMMITMENT
  | typeof PULSE_SOURCE_KIND_BLOCK;
export type PulseTransitionKind = typeof PULSE_TRANSITION_KIND_START;

/** Bounded lead choices for relative start authority. Seconds. */
export const PULSE_LEAD_OFFSET_CHOICES_SECONDS = [5 * 60, 15 * 60, 30 * 60, 60 * 60] as const;

export type PulseLeadOffsetSeconds = (typeof PULSE_LEAD_OFFSET_CHOICES_SECONDS)[number];

export type InterruptGrant = {
  id: string;
  userId: string;
  sourceKind: PulseSourceKind;
  sourceId: string;
  transitionKind: PulseTransitionKind;
  leadOffsetSeconds: number;
  establishedAt: string;
  revokedAt: string | null;
};

export type PulseConditionResult =
  | "withhold"
  | "inactive"
  | "not_yet"
  | "eligible"
  | "satisfied"
  | "elapsed";

export type PulseOccurrence = {
  id: string;
  userId: string;
  grantId: string | null;
  sourceKind: PulseSourceKind;
  sourceId: string | null;
  sourceStartsOn: string;
  sourceStartLocal: string;
  thresholdAt: string;
  sourceStartAt: string;
  establishedAt: string;
};

export type PulseSourceTemporalIdentity = {
  sourceStartsOn: string;
  sourceStartLocal: string;
};

type TimedStartSource = {
  id: string;
  startsOn: string;
  startLocal: string;
};

export function requirePulseSourceKind(value: string): PulseSourceKind {
  if (value === PULSE_SOURCE_KIND_COMMITMENT || value === PULSE_SOURCE_KIND_BLOCK) {
    return value;
  }
  throw new Error("This interrupt grant has an unsupported source kind.");
}

export function requirePulseLeadOffsetSeconds(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("A reminder lead time must be a positive number of seconds.");
  }
  return value;
}

export function requirePulseLeadChoice(value: number): PulseLeadOffsetSeconds {
  const seconds = requirePulseLeadOffsetSeconds(value);
  if (!(PULSE_LEAD_OFFSET_CHOICES_SECONDS as readonly number[]).includes(seconds)) {
    throw new Error("Choose a reminder lead time.");
  }
  return seconds as PulseLeadOffsetSeconds;
}

export function isActiveInterruptGrant(grant: InterruptGrant): boolean {
  return grant.revokedAt === null;
}

export function sourceTemporalIdentityFromTimedStart(source: {
  startsOn: string;
  startLocal: string;
}): PulseSourceTemporalIdentity {
  return {
    sourceStartsOn: source.startsOn,
    sourceStartLocal: source.startLocal,
  };
}

export function sourceTemporalIdentityFromTimedCommitment(
  commitment: TimedCommitment,
): PulseSourceTemporalIdentity {
  return sourceTemporalIdentityFromTimedStart(commitment);
}

export function sourceTemporalIdentityFromTimedBlock(
  block: TimedBlock,
): PulseSourceTemporalIdentity {
  return sourceTemporalIdentityFromTimedStart(block);
}

export function occurrenceMatchesIdentity(
  occurrence: PulseOccurrence,
  grantId: string,
  identity: PulseSourceTemporalIdentity,
): boolean {
  return (
    occurrence.grantId === grantId &&
    occurrence.sourceStartsOn === identity.sourceStartsOn &&
    occurrence.sourceStartLocal === identity.sourceStartLocal
  );
}

function evaluateTimedStartPulseCondition(input: {
  grant: InterruptGrant | null;
  expectedSourceKind: PulseSourceKind;
  source: TimedStartSource | null;
  timeZone: string | null;
  now: Date;
  occurrences: readonly PulseOccurrence[];
  readsComplete: boolean;
}): PulseConditionResult {
  if (!input.readsComplete) return "withhold";
  if (input.grant === null) return "inactive";
  if (input.grant.revokedAt !== null) return "inactive";
  if (input.grant.sourceKind !== input.expectedSourceKind) return "inactive";
  if (input.grant.transitionKind !== PULSE_TRANSITION_KIND_START) return "inactive";
  if (input.source === null) return "inactive";
  if (input.source.id !== input.grant.sourceId) return "inactive";

  let zone: string;
  try {
    if (input.timeZone === null || input.timeZone.trim().length === 0) return "withhold";
    zone = requireIanaTimeZone(input.timeZone);
  } catch {
    return "withhold";
  }

  let startInstant: Date;
  try {
    startInstant = instantFromZonedLocal(input.source.startsOn, input.source.startLocal, zone);
  } catch {
    return "withhold";
  }

  const leadSeconds = requirePulseLeadOffsetSeconds(input.grant.leadOffsetSeconds);
  const thresholdInstant = new Date(startInstant.getTime() - leadSeconds * 1000);
  const identity = sourceTemporalIdentityFromTimedStart(input.source);
  const matching = input.occurrences.some((occurrence) =>
    occurrenceMatchesIdentity(occurrence, input.grant!.id, identity),
  );
  if (matching) return "satisfied";

  const at = input.now.getTime();
  if (at < thresholdInstant.getTime()) return "not_yet";
  if (at < startInstant.getTime()) return "eligible";
  return "elapsed";
}

export function evaluateCommitmentStartPulseCondition(input: {
  grant: InterruptGrant | null;
  commitment: Commitment | null;
  timeZone: string | null;
  now: Date;
  occurrences: readonly PulseOccurrence[];
  readsComplete: boolean;
}): PulseConditionResult {
  if (!input.readsComplete) return "withhold";
  if (input.grant === null) return "inactive";
  if (input.grant.revokedAt !== null) return "inactive";
  if (input.grant.sourceKind !== PULSE_SOURCE_KIND_COMMITMENT) return "inactive";
  if (input.grant.transitionKind !== PULSE_TRANSITION_KIND_START) return "inactive";
  if (input.commitment === null) return "inactive";
  if (input.commitment.id !== input.grant.sourceId) return "inactive";
  if (input.commitment.kind !== "timed") return "inactive";

  return evaluateTimedStartPulseCondition({
    grant: input.grant,
    expectedSourceKind: PULSE_SOURCE_KIND_COMMITMENT,
    source: {
      id: input.commitment.id,
      startsOn: input.commitment.startsOn,
      startLocal: input.commitment.startLocal,
    },
    timeZone: input.timeZone,
    now: input.now,
    occurrences: input.occurrences,
    readsComplete: true,
  });
}

export function evaluateBlockStartPulseCondition(input: {
  grant: InterruptGrant | null;
  block: Block | null;
  timeZone: string | null;
  now: Date;
  occurrences: readonly PulseOccurrence[];
  readsComplete: boolean;
}): PulseConditionResult {
  if (!input.readsComplete) return "withhold";
  if (input.grant === null) return "inactive";
  if (input.grant.revokedAt !== null) return "inactive";
  if (input.grant.sourceKind !== PULSE_SOURCE_KIND_BLOCK) return "inactive";
  if (input.grant.transitionKind !== PULSE_TRANSITION_KIND_START) return "inactive";
  if (input.block === null) return "inactive";
  if (input.block.id !== input.grant.sourceId) return "inactive";
  if (input.block.kind !== "timed") return "inactive";

  return evaluateTimedStartPulseCondition({
    grant: input.grant,
    expectedSourceKind: PULSE_SOURCE_KIND_BLOCK,
    source: {
      id: input.block.id,
      startsOn: input.block.startsOn,
      startLocal: input.block.startLocal,
    },
    timeZone: input.timeZone,
    now: input.now,
    occurrences: input.occurrences,
    readsComplete: true,
  });
}

/**
 * Establishment due predicate for relative start Pulse (Commitment or Block).
 *
 * Condition evaluation still distinguishes `eligible` `[threshold, start)` from
 * `elapsed` `now >= start` for expression clarity. Hosted evaluation cannot rely
 * on a live client remaining open inside that half-open window, so establishment
 * is due whenever the authorized threshold has been reached and the identity is
 * not yet satisfied: `eligible | elapsed`.
 *
 * `satisfied` means an occurrence already exists for this grant + current source
 * temporal identity — same meaning for Block-start as for Commitment-start.
 */
export function commitmentStartPulseIsDueForEstablishment(
  result: PulseConditionResult,
): boolean {
  return result === "eligible" || result === "elapsed";
}

export const startPulseIsDueForEstablishment = commitmentStartPulseIsDueForEstablishment;

export function deriveTimedStartThreshold(input: {
  startsOn: string;
  startLocal: string;
  leadOffsetSeconds: number;
  timeZone: string;
}): { thresholdAt: Date; sourceStartAt: Date; identity: PulseSourceTemporalIdentity } {
  const zone = requireIanaTimeZone(input.timeZone);
  const sourceStartAt = instantFromZonedLocal(input.startsOn, input.startLocal, zone);
  const leadSeconds = requirePulseLeadOffsetSeconds(input.leadOffsetSeconds);
  return {
    thresholdAt: new Date(sourceStartAt.getTime() - leadSeconds * 1000),
    sourceStartAt,
    identity: sourceTemporalIdentityFromTimedStart({
      startsOn: input.startsOn,
      startLocal: input.startLocal,
    }),
  };
}

export function deriveCommitmentStartThreshold(input: {
  commitment: TimedCommitment;
  leadOffsetSeconds: number;
  timeZone: string;
}): { thresholdAt: Date; sourceStartAt: Date; identity: PulseSourceTemporalIdentity } {
  return deriveTimedStartThreshold({
    startsOn: input.commitment.startsOn,
    startLocal: input.commitment.startLocal,
    leadOffsetSeconds: input.leadOffsetSeconds,
    timeZone: input.timeZone,
  });
}

export function deriveBlockStartThreshold(input: {
  block: TimedBlock;
  leadOffsetSeconds: number;
  timeZone: string;
}): { thresholdAt: Date; sourceStartAt: Date; identity: PulseSourceTemporalIdentity } {
  return deriveTimedStartThreshold({
    startsOn: input.block.startsOn,
    startLocal: input.block.startLocal,
    leadOffsetSeconds: input.leadOffsetSeconds,
    timeZone: input.timeZone,
  });
}

export function leadOffsetLabel(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes === 60) return "60 minutes";
  if (Number.isInteger(minutes)) return `${minutes} minutes`;
  return `${seconds} seconds`;
}

/** Expression remains while the occurrence's fingerprinted start is still ahead of now. */
export function pulseOccurrenceStillBeforeStart(input: {
  occurrence: PulseOccurrence;
  now: Date;
  timeZone: string;
}): boolean {
  try {
    const start = instantFromZonedLocal(
      input.occurrence.sourceStartsOn,
      input.occurrence.sourceStartLocal,
      requireIanaTimeZone(input.timeZone),
    );
    return input.now.getTime() < start.getTime();
  } catch {
    return false;
  }
}
