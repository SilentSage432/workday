import type { Commitment, TimedCommitment } from "@/domain/commitment";
import { instantFromZonedLocal, requireIanaTimeZone } from "@/domain/time/localTime";

export const PULSE_SOURCE_KIND_COMMITMENT = "commitment" as const;
export const PULSE_TRANSITION_KIND_START = "start" as const;

export type PulseSourceKind = typeof PULSE_SOURCE_KIND_COMMITMENT;
export type PulseTransitionKind = typeof PULSE_TRANSITION_KIND_START;

/** Bounded lead choices for the first Commitment-start proof. Seconds. */
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

export function sourceTemporalIdentityFromTimedCommitment(
  commitment: TimedCommitment,
): PulseSourceTemporalIdentity {
  return {
    sourceStartsOn: commitment.startsOn,
    sourceStartLocal: commitment.startLocal,
  };
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

  let zone: string;
  try {
    if (input.timeZone === null || input.timeZone.trim().length === 0) return "withhold";
    zone = requireIanaTimeZone(input.timeZone);
  } catch {
    return "withhold";
  }

  let startInstant: Date;
  try {
    startInstant = instantFromZonedLocal(
      input.commitment.startsOn,
      input.commitment.startLocal,
      zone,
    );
  } catch {
    return "withhold";
  }

  const leadSeconds = requirePulseLeadOffsetSeconds(input.grant.leadOffsetSeconds);
  const thresholdInstant = new Date(startInstant.getTime() - leadSeconds * 1000);
  const identity = sourceTemporalIdentityFromTimedCommitment(input.commitment);
  const matching = input.occurrences.some((occurrence) =>
    occurrenceMatchesIdentity(occurrence, input.grant!.id, identity),
  );
  if (matching) return "satisfied";

  const at = input.now.getTime();
  if (at < thresholdInstant.getTime()) return "not_yet";
  if (at < startInstant.getTime()) return "eligible";
  return "elapsed";
}

export function deriveCommitmentStartThreshold(input: {
  commitment: TimedCommitment;
  leadOffsetSeconds: number;
  timeZone: string;
}): { thresholdAt: Date; sourceStartAt: Date; identity: PulseSourceTemporalIdentity } {
  const zone = requireIanaTimeZone(input.timeZone);
  const sourceStartAt = instantFromZonedLocal(
    input.commitment.startsOn,
    input.commitment.startLocal,
    zone,
  );
  const leadSeconds = requirePulseLeadOffsetSeconds(input.leadOffsetSeconds);
  return {
    thresholdAt: new Date(sourceStartAt.getTime() - leadSeconds * 1000),
    sourceStartAt,
    identity: sourceTemporalIdentityFromTimedCommitment(input.commitment),
  };
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
