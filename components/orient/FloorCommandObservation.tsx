import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import type {
  FloorCommandHandoffObservation,
  FloorCommandObservationReading,
} from "@/projections/floorCommandObservation";

/**
 * Fixture-capable reading of one Floor Command handoff.
 * Not mounted on LOOK, the Work schedule, or the production instrument.
 * Hiding a revision is not Zebra completion.
 */
export function FloorCommandObservationView({
  reading,
  onDismiss,
}: {
  reading: FloorCommandObservationReading;
  onDismiss?: (handoffId: string, revision: string) => void;
}) {
  if (reading.status === "unobserved") return null;
  if (reading.status === "unavailable") {
    return (
      <section aria-label="Floor Command" data-floor-command-observation="unavailable">
        <p>Floor Command could not be read.</p>
      </section>
    );
  }

  const visible = reading.handoffs.filter((handoff) => handoff.attention);
  if (visible.length === 0) {
    if (reading.status === "fresh") return null;
    return (
      <section aria-label="Floor Command" data-floor-command-observation="stale">
        <p>Floor Command could not be read.</p>
      </section>
    );
  }

  return (
    <section aria-label="Floor Command" data-floor-command-observation={reading.status}>
      {reading.status === "stale" ? (
        <p>Floor Command could not be read. Showing the last successful read.</p>
      ) : null}
      {visible.map((handoff) => (
        <HandoffSummary key={handoff.handoffId} handoff={handoff} onDismiss={onDismiss} />
      ))}
    </section>
  );
}

function HandoffSummary({
  handoff,
  onDismiss,
}: {
  handoff: FloorCommandHandoffObservation;
  onDismiss?: (handoffId: string, revision: string) => void;
}) {
  const current = handoff.assignments.filter((row) => row.lifecycle === "current");
  const removed = handoff.assignments.filter((row) => row.lifecycle === "superseded");
  return (
    <article data-floor-command-handoff={handoff.handoffId} data-revision={handoff.revision}>
      <h2>
        Zebra handoff · {handoff.operationalWeek} · {formatCivilDateLabel(handoff.deadlineDate)}
      </h2>
      <p>{handoff.summary}</p>
      <p>Store {handoff.storeNumber}</p>
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
