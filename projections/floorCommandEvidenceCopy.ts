import type { FloorCommandAttemptReason } from "@/projections/floorCommandObservation";

export type FloorCommandGovernedRequestView = {
  operationalWeek: string;
  outcome: "accepted_new" | "unchanged" | "revised" | "failed" | "rejected";
  reason: string | null;
  terminalAt: string;
  previousObservedAt: string | null;
  previousSequence: number | null;
  previousRevision: string | null;
};

export type FloorCommandEvidenceCopy = {
  observedSentence: string;
  ageSentence: string;
  followUpSentence: string | null;
  originallyObserved: string;
  lastChecked: string;
  retainedEvidence: string;
};

/**
 * Retained Floor Command evidence in the operator's confirmed zone.
 * A successful retrieval is not described as a live reading.
 */
export function floorCommandEvidenceCopy(input: {
  observedAt: string;
  timeZone: string | null;
  sequence: number | null;
  revision: string;
  lastCheckedAt: string | null;
  checkedSequence?: number | null;
  request: FloorCommandGovernedRequestView | null;
}): FloorCommandEvidenceCopy {
  const observed = formatFloorCommandObservedInstant(input.observedAt, input.timeZone);
  const identity =
    input.sequence === null
      ? `Source revision ${input.revision}.`
      : `Source sequence ${input.sequence}, revision ${input.revision}.`;
  const checked = input.lastCheckedAt
    ? formatFloorCommandObservedInstant(input.lastCheckedAt, input.timeZone)
    : null;
  const checkedSequence =
    typeof input.checkedSequence === "number" ? ` Checked sequence ${input.checkedSequence}.` : "";
  const lastChecked = checked
    ? `${checked}.${checkedSequence} Source changes since that check are not known.`
    : "No later check is recorded. Source changes since the original observation are not known.";
  const observedSentence = `Originally observed ${observed}. This is retained evidence, not a live Floor Command reading.`;
  return {
    observedSentence,
    ageSentence: lastChecked,
    followUpSentence: followUp(input),
    originallyObserved: observed,
    lastChecked,
    retainedEvidence: identity,
  };
}

/**
 * Names a terminal observation outcome after the server has returned it.
 * The outcome token stays exact. This does not describe a request that has not finished.
 */
export function floorCommandObservationOutcomeSentence(outcome: string): string {
  if (outcome === "accepted_new") {
    return "Floor Command observation recorded: accepted_new. Orient accepted this reading.";
  }
  if (outcome === "unchanged") {
    return "Floor Command observation recorded: unchanged. The retained revision matched this check. Floor Command can still change later.";
  }
  if (outcome === "revised") {
    return "Floor Command observation recorded: revised. Orient accepted a newer reading. The earlier accepted reading remains in history.";
  }
  if (outcome === "rejected") {
    return "Floor Command observation rejected. The last accepted reading is unchanged.";
  }
  if (outcome === "failed") {
    return "Floor Command observation failed. The last accepted reading is unchanged.";
  }
  return "Floor Command observation was not started.";
}

export function formatFloorCommandObservedInstant(iso: string, timeZone: string | null): string {
  if (!timeZone) return `${iso}. The time zone is unconfirmed`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `${iso}. The time zone is unconfirmed`;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      hourCycle: "h12",
    }).formatToParts(date);
    const month = part(parts, "month");
    const day = part(parts, "day");
    const hour = part(parts, "hour");
    const minute = part(parts, "minute");
    const dayPeriod = part(parts, "dayPeriod");
    const zone = part(parts, "timeZoneName");
    if (!month || !day || !hour || !minute || !dayPeriod || !zone) {
      return `${iso}. The time zone is unconfirmed`;
    }
    return `${month} ${day} at ${hour}:${minute} ${dayPeriod} ${zone}`;
  } catch {
    return `${iso}. The time zone is unconfirmed`;
  }
}

export function floorCommandRequestReasonSentence(reason: string | null): string {
  if (reason === "credential_rejected") return "the read credential was rejected";
  if (reason === "source_unavailable") return "Floor Command could not be reached";
  if (reason === "unpublished") return "the week was unpublished";
  if (reason === "ordering_withheld") return "the snapshot was withheld";
  if (reason === "sequence_conflict") return "the sequence conflicted";
  if (reason === "older_sequence") return "the sequence was older";
  if (reason === "forbidden") return "Floor Command refused this store";
  if (reason === "lease_expired") return "the observation lease expired";
  if (reason === "invalid_snapshot") return "the snapshot was not valid";
  return "Floor Command could not be read";
}

export function floorCommandAttemptReasonSentence(reason: FloorCommandAttemptReason): string {
  return floorCommandRequestReasonSentence(reason);
}

function followUp(input: {
  timeZone: string | null;
  request: FloorCommandGovernedRequestView | null;
}): string | null {
  const request = input.request;
  if (!request) return null;
  const attempted = formatFloorCommandObservedInstant(request.terminalAt, input.timeZone);
  if (request.outcome === "unchanged") {
    return "That check matched the retained revision. Floor Command can still change after it.";
  }
  if (request.outcome === "revised" && request.previousObservedAt && request.previousRevision) {
    const previous = formatFloorCommandObservedInstant(request.previousObservedAt, input.timeZone);
    const sequence = request.previousSequence === null ? "" : `sequence ${request.previousSequence}, `;
    return `This replaces the reading observed ${previous}, ${sequence}revision ${request.previousRevision}.`;
  }
  if (request.outcome === "failed") {
    return `Last attempt ${attempted} did not complete (${floorCommandRequestReasonSentence(request.reason)}). The reading still shown is the last accepted one.`;
  }
  if (request.outcome === "rejected") {
    return `Last attempt ${attempted} was not accepted (${floorCommandRequestReasonSentence(request.reason)}). The reading still shown is the last accepted one.`;
  }
  return null;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}
