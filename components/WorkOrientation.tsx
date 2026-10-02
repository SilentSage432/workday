import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { FSR_INTENDED_BEFORE_LOCAL } from "@/domain/workCadence";
import { SHIFT_TYPE_LABELS } from "@/domain/workSchedule";
import type { NextWorkBoundary, WorkOrientation } from "@/projections/workOrientation";

export function WorkOrientationView({ orientation }: { orientation: WorkOrientation }) {
  return (
    <section className="mt-6" aria-labelledby="work-orientation-heading">
      <h2 id="work-orientation-heading" className="text-sm text-stone-400">
        Work
      </h2>
      {orientation.schedule.state === "unknown" ? (
        <p className="mt-1 text-sm text-stone-300">No Work schedule entered.</p>
      ) : null}
      {orientation.schedule.state === "off" ? <p className="mt-1 text-sm text-stone-300">Off</p> : null}
      {orientation.schedule.state === "scheduled" ? (
        <ScheduledFacts orientation={orientation} />
      ) : null}
    </section>
  );
}

function ScheduledFacts({ orientation }: { orientation: WorkOrientation }) {
  if (orientation.schedule.state !== "scheduled") {
    return null;
  }
  const schedule = orientation.schedule;
  const times = `${formatLocalTimeLabel(schedule.startLocal)}–${formatLocalTimeLabel(schedule.endLocal)}`;
  const continues = schedule.endsNextCivilDate ? " · continues after midnight" : "";

  return (
    <div className="mt-1 space-y-1 text-sm text-stone-300">
      <p>
        {SHIFT_TYPE_LABELS[schedule.shiftType]} · {times}
        {continues}
      </p>
      <p>{positionLabel(schedule.position)}</p>
      {orientation.powerHour.state === "during" ? <p>Power Hour</p> : null}
      {orientation.nextBoundary ? <p>{boundaryLabel(orientation.nextBoundary)}</p> : null}
      {orientation.cadence.kind === "opening" && orientation.cadence.fsrIntendedBoundary === "before" ? (
        <p>FSR is intended before {formatLocalTimeLabel(FSR_INTENDED_BEFORE_LOCAL)}.</p>
      ) : null}
    </div>
  );
}

function positionLabel(position: "before" | "during" | "after"): string {
  if (position === "before") return "Before this shift";
  if (position === "during") return "During this shift";
  return "After this shift";
}

function boundaryLabel(boundary: NextWorkBoundary): string {
  const time = formatLocalTimeLabel(boundary.localTime);
  if (boundary.kind === "shift-starts") return `Shift begins at ${time}`;
  if (boundary.kind === "shift-ends") return `Shift ends at ${time}`;
  if (boundary.kind === "power-hour-starts") return `Power Hour begins at ${time}`;
  return `Power Hour ends at ${time}`;
}
