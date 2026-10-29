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
  request: FloorCommandGovernedRequestView | null;
}): FloorCommandEvidenceCopy {
  const observed = formatFloorCommandObservedInstant(input.observedAt, input.timeZone);
  const identity =
    input.sequence === null
      ? `Source revision ${input.revision}.`
      : `Source sequence ${input.sequence}, revision ${input.revision}.`;
  const observedSentence = `Observed ${observed}. ${identity} This is retained evidence, not a live Floor Command reading.`;
  const checked = input.lastCheckedAt
    ? formatFloorCommandObservedInstant(input.lastCheckedAt, input.timeZone)
    : null;
  const ageSentence = checked
    ? `Last checked ${checked}. Source changes since that check are not known.`
    : `Not checked since ${observed}. Source changes since then are not known.`;
  return {
    observedSentence,
    ageSentence,
    followUpSentence: followUp(input, observed),
  };
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

function followUp(
  input: {
    timeZone: string | null;
    request: FloorCommandGovernedRequestView | null;
  },
  observed: string,
): string | null {
  const request = input.request;
  if (!request) return null;
  const attempted = formatFloorCommandObservedInstant(request.terminalAt, input.timeZone);
  if (request.outcome === "unchanged") {
    return `Last checked ${attempted}. The source revision was the same.`;
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
  return observed ? null : null;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}
