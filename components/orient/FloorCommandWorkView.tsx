import { useState } from "react";
import { FloorCommandObservationView } from "@/components/orient/FloorCommandObservation";
import {
  loadFloorCommandWorkReading,
  requestFloorCommandObservation,
} from "@/components/orient/floorCommandWorkApi";
import type { FloorCommandAttemptReason } from "@/projections/floorCommandObservation";
import {
  floorCommandEvidenceCopy,
  floorCommandObservationOutcomeSentence,
  type FloorCommandGovernedRequestView,
} from "@/projections/floorCommandEvidenceCopy";
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

const ISO_WEEK = /^\d{4}-W\d{2}$/;

/**
 * Floor Command beside the Work schedule.
 * Closed until the operator asks. Per-bay rows stay inside the handoff details.
 * This does not create a Task, Commitment, Block, stewardship row, or Pulse grant.
 * Opening this view does not request an observation.
 */
export function FloorCommandWorkView({
  reading,
  onRecorded,
}: {
  reading: FloorCommandWorkReading;
  onRecorded?: (reading: FloorCommandWorkReading) => void;
}) {
  return (
    <details className="orient-floor-command" data-floor-command-work={reading.posture}>
      <summary>{summaryFor(reading)}</summary>
      <p>{sentenceFor(reading)}</p>
      {reading.posture === "unconfigured" || reading.posture === "retained" ? (
        <>
          {reading.observation.status === "stale" || reading.observation.status === "unavailable" ? (
            <p>{reasonSentence(reading.observation.reason)}</p>
          ) : null}
          {reading.observation.status === "unobserved" || reading.observation.status === "unavailable" ? null : (
            <FloorCommandObservationView
              reading={reading.observation}
              placement="work"
              timeZone={reading.timeZone}
              governedRequests={reading.governedRequests}
            />
          )}
          <ObservationRequest onRecorded={onRecorded} />
        </>
      ) : null}
    </details>
  );
}

function ObservationRequest({ onRecorded }: { onRecorded?: (reading: FloorCommandWorkReading) => void }) {
  const [week, setWeek] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      data-floor-command-request="week"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ISO_WEEK.test(week) || pending) return;
        setPending(true);
        setMessage(null);
        void requestFloorCommandObservation(week)
          .then(async (result) => {
            if (!result) {
              setMessage("Floor Command could not be read.");
              return;
            }
            setMessage(floorCommandObservationOutcomeSentence(result.outcome));
            if (onRecorded) {
              const next = await loadFloorCommandWorkReading();
              if (next && next.posture !== "unread") onRecorded(next);
            }
          })
          .finally(() => setPending(false));
      }}
    >
      <label>
        Floor Command week
        <input
          name="week"
          value={week}
          autoComplete="off"
          onChange={(event) => setWeek(event.target.value)}
        />
      </label>
      <div className="orient-actions">
        <button
          type="submit"
          className="orient-action"
          data-emphasis={pending ? undefined : "save"}
          data-floor-command-pending={pending ? "true" : undefined}
          disabled={!ISO_WEEK.test(week) || pending}
          aria-busy={pending || undefined}
        >
          {pending ? "Observing this week" : "Observe this week"}
        </button>
      </div>
      {message ? (
        <p role="status" data-floor-command-outcome="true">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function summaryFor(reading: FloorCommandWorkReading): string {
  if (reading.posture === "unapproved") return "Floor Command · not approved";
  if (reading.posture === "wrong_store") return "Floor Command · store not authorized";
  if (reading.posture === "unread") return "Floor Command · not read";
  if (reading.posture === "unconfigured") return "Floor Command · not configured";
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
  if (reading.observation.status === "unobserved") {
    return `Approved for store ${reading.storeNumber}. No week is retained.`;
  }
  const handoff = reading.observation.status === "stale" || reading.observation.status === "retained"
    ? reading.observation.handoffs[0]
    : null;
  if (!handoff) return "This is retained evidence, not a live Floor Command reading.";
  const request = requestFor(reading.governedRequests, handoff.operationalWeek);
  return floorCommandEvidenceCopy({
    observedAt: handoff.observedAt,
    timeZone: reading.timeZone,
    sequence: handoff.sequence,
    revision: handoff.revision,
    lastCheckedAt: handoff.lastCheckedAt,
    checkedSequence: handoff.checkedSequence,
    request,
  }).observedSentence;
}

function requestFor(
  requests: readonly FloorCommandGovernedRequestView[],
  week: string,
): FloorCommandGovernedRequestView | null {
  return requests.find((request) => request.operationalWeek === week) ?? null;
}

function reasonSentence(reason: FloorCommandAttemptReason): string {
  if (reason === "credential_rejected") return "The read credential was rejected.";
  if (reason === "source_unavailable") return "Floor Command could not be reached.";
  if (reason === "ordering_withheld") return "Floor Command withheld the snapshot.";
  if (reason === "sequence_conflict") return "Floor Command sent a conflicting sequence.";
  if (reason === "forbidden") return "Floor Command refused this store.";
  return "Floor Command could not be read.";
}
