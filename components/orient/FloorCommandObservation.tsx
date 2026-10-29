import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import {
  floorCommandEvidenceCopy,
  type FloorCommandGovernedRequestView,
} from "@/projections/floorCommandEvidenceCopy";
import type {
  FloorCommandHandoffObservation,
  FloorCommandObservationReading,
} from "@/projections/floorCommandObservation";

/**
 * Fixture-capable reading of one Floor Command handoff.
 * Work mounts this with `placement="work"` inside the schedule surface.
 * Hiding a revision is not Zebra completion.
 */
export function FloorCommandObservationView({
  reading,
  onDismiss,
  placement = "reading",
  timeZone = null,
  governedRequests = [],
}: {
  reading: FloorCommandObservationReading;
  onDismiss?: (handoffId: string, revision: string) => void;
  placement?: "reading" | "work";
  timeZone?: string | null;
  governedRequests?: readonly FloorCommandGovernedRequestView[];
}) {
  if (reading.status === "unobserved") return null;
  if (reading.status === "unavailable") {
    return (
      <section aria-label="Floor Command" data-floor-command-observation="unavailable">
        <p>Floor Command could not be read.</p>
      </section>
    );
  }

  const visible =
    placement === "work"
      ? reading.handoffs.filter((handoff) => !handoff.dismissed)
      : reading.handoffs.filter((handoff) => handoff.attention);
  if (visible.length === 0) {
    if (placement === "work") {
      return (
        <section aria-label="Floor Command" data-floor-command-observation={reading.status}>
          <p>This Floor Command revision is hidden. It was not marked complete.</p>
        </section>
      );
    }
    if (reading.status === "retained") return null;
    return (
      <section aria-label="Floor Command" data-floor-command-observation="stale">
        <p>Floor Command could not be read.</p>
      </section>
    );
  }

  return (
    <section aria-label="Floor Command" data-floor-command-observation={reading.status}>
      {reading.status === "stale" ? (
        <p>
          {placement === "work"
            ? "The reading still shown is the last accepted one."
            : "Floor Command could not be read. Showing the last successful read."}
        </p>
      ) : null}
      {visible.map((handoff) => (
        <HandoffSummary
          key={handoff.handoffId}
          handoff={handoff}
          onDismiss={onDismiss}
          placement={placement}
          timeZone={timeZone}
          request={governedRequests.find((row) => row.operationalWeek === handoff.operationalWeek) ?? null}
        />
      ))}
    </section>
  );
}

function HandoffSummary({
  handoff,
  onDismiss,
  placement,
  timeZone,
  request,
}: {
  handoff: FloorCommandHandoffObservation;
  onDismiss?: (handoffId: string, revision: string) => void;
  placement: "reading" | "work";
  timeZone: string | null;
  request: FloorCommandGovernedRequestView | null;
}) {
  const current = handoff.assignments.filter((row) => row.lifecycle === "current");
  const retired = handoff.assignments.filter((row) => row.lifecycle === "retired");
  const removed = handoff.assignments.filter((row) => row.lifecycle === "superseded");
  return (
    <article data-floor-command-handoff={handoff.handoffId} data-revision={handoff.revision}>
      <h2>
        Zebra handoff · {handoff.operationalWeek} · {formatCivilDateLabel(handoff.deadlineDate)}
      </h2>
      <p>{handoff.summary}</p>
      <p>Store {handoff.storeNumber}</p>
      {placement === "work" ? (
        <>
          <p>{handoff.publicationStatus === "published" ? "Published in Floor Command" : "Not published in Floor Command"}</p>
          <p>Monday Zebra-entry deadline · {formatCivilDateLabel(handoff.deadlineDate)}</p>
          <p>
            {handoff.confirmedZebraEntries} confirmed in Zebra. {handoff.remainingZebraEntries} still to enter.
          </p>
          <p>{evidenceFor(handoff, timeZone, request).ageSentence}</p>
          {evidenceFor(handoff, timeZone, request).followUpSentence ? (
            <p>{evidenceFor(handoff, timeZone, request).followUpSentence}</p>
          ) : null}
        </>
      ) : null}
      {handoff.deadlinesAvailability === "unavailable" ? (
        <p>Deadline dates could not be read.</p>
      ) : null}
      {handoff.deadlines.map((deadline) => (
        <p key={deadline.id}>
          {deadline.associateName || "Associate"} · target {formatCivilDateLabel(deadline.targetDate)} · final{" "}
          {formatCivilDateLabel(deadline.finalDate)}
          {deadline.reviewRequired ? " · Needs review in Floor Command" : ""}
        </p>
      ))}
      <details>
        <summary>Assignment details</summary>
        <ul>
          {current.map((row) => (
            <li key={row.id}>
              {row.associateName || "Name not in Floor Command"} · bay {row.bayId}
              {row.rosterSpecialistId ? "" : " · No roster id"}
              {row.zebraConfirmation === "confirmed" ? " · Entered in Zebra" : " · Not entered in Zebra"}
            </li>
          ))}
        </ul>
        {removed.length > 0 ? (
          <ul aria-label="Removed in Floor Command">
            {removed.map((row) => (
              <li key={row.id}>
                Removed in Floor Command · {row.associateName || "Name not in Floor Command"} · bay {row.bayId}
              </li>
            ))}
          </ul>
        ) : null}
        {retired.length > 0 ? (
          <ul aria-label="Cleared in Floor Command">
            {retired.map((row) => (
              <li key={row.id}>
                Cleared in Floor Command · bay {row.bayId}
              </li>
            ))}
          </ul>
        ) : null}
      </details>
      <p>
        <a href={handoff.returnHref}>Open Floor Command This Week</a>
      </p>
      {onDismiss ? (
        <button type="button" onClick={() => onDismiss(handoff.handoffId, handoff.revision)}>
          Hide this revision
        </button>
      ) : null}
      </article>
  );
}

function evidenceFor(
  handoff: FloorCommandHandoffObservation,
  timeZone: string | null,
  request: FloorCommandGovernedRequestView | null,
) {
  return floorCommandEvidenceCopy({
    observedAt: handoff.observedAt,
    timeZone,
    sequence: handoff.sequence,
    revision: handoff.revision,
    lastCheckedAt: handoff.lastCheckedAt,
    request,
  });
}
