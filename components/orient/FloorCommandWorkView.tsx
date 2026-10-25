import { FloorCommandObservationView } from "@/components/orient/FloorCommandObservation";
import type { FloorCommandAttemptReason } from "@/projections/floorCommandObservation";
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

/**
 * Floor Command beside the Work schedule.
 * Closed until the operator asks. Per-bay rows stay inside the handoff details.
 * This does not create a Task, Commitment, Block, stewardship row, or Pulse grant.
 */
export function FloorCommandWorkView({ reading }: { reading: FloorCommandWorkReading }) {
  return (
    <details className="orient-floor-command" data-floor-command-work={reading.posture}>
      <summary>{summaryFor(reading)}</summary>
      <p>{sentenceFor(reading)}</p>
      {reading.posture === "unconfigured" || reading.posture === "retained" || reading.posture === "current" ? (
        <>
          {reading.observation.status === "stale" || reading.observation.status === "unavailable" ? (
            <p>{reasonSentence(reading.observation.reason)}</p>
          ) : null}
          {reading.observation.status === "unobserved" || reading.observation.status === "unavailable" ? null : (
            <FloorCommandObservationView reading={reading.observation} placement="work" />
          )}
        </>
      ) : null}
    </details>
  );
}

function summaryFor(reading: FloorCommandWorkReading): string {
  if (reading.posture === "unapproved") return "Floor Command · not approved";
  if (reading.posture === "wrong_store") return "Floor Command · store not authorized";
  if (reading.posture === "unread") return "Floor Command · not read";
  if (reading.posture === "unconfigured") return "Floor Command · not configured";
  if (reading.posture === "current") return "Floor Command · last accepted read";
  return "Floor Command · retained";
}

function sentenceFor(reading: FloorCommandWorkReading): string {
  if (reading.posture === "unapproved") return "Floor Command is not approved for this account.";
  if (reading.posture === "wrong_store") {
    return "This account is not approved for the server store. No Floor Command week is shown.";
  }
  if (reading.posture === "unread") return "The retained Floor Command observation could not be read.";
  if (reading.posture === "unconfigured") {
    return reading.observation.status === "unobserved"
      ? `Approved for store ${reading.storeNumber}. The connection is not configured. No week is retained.`
      : `Approved for store ${reading.storeNumber}. The connection is not configured, so this week was not checked again.`;
  }
  if (reading.posture === "current") {
    return `Last accepted Floor Command read for store ${reading.storeNumber}. This screen did not request a new one.`;
  }
  if (reading.observation.status === "unobserved") {
    return reading.pullEnabled
      ? `Approved for store ${reading.storeNumber}. No week is retained.`
      : `Approved for store ${reading.storeNumber}. Live reading is off. No week is retained.`;
  }
  return reading.pullEnabled
    ? `Retained from the last accepted read for store ${reading.storeNumber}. This screen did not request a new one.`
    : `Retained from the last accepted read for store ${reading.storeNumber}. Live reading is off, so this is not a new check.`;
}

function reasonSentence(reason: FloorCommandAttemptReason): string {
  if (reason === "credential_rejected") return "The read credential was rejected.";
  if (reason === "source_unavailable") return "Floor Command could not be reached.";
  if (reason === "ordering_withheld") return "Floor Command withheld the snapshot.";
  if (reason === "sequence_conflict") return "Floor Command sent a conflicting sequence.";
  if (reason === "forbidden") return "Floor Command refused this store.";
  return "Floor Command could not be read.";
}
