import Link from "next/link";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { SHIFT_TYPE_LABELS } from "@/domain/workSchedule";
import type { CurrentTemporalFact } from "@/projections/currentTemporalOrientation";
import type { TodayZoneStatus } from "@/components/TodayPlan";

const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

export function CurrentTime({
  zoneStatus,
  facts,
  notice,
}: {
  zoneStatus: TodayZoneStatus;
  facts: readonly CurrentTemporalFact[] | null;
  notice: string | null;
}) {
  return (
    <section className="mt-6" aria-labelledby="current-time-heading">
      <h2 id="current-time-heading" className="text-sm font-medium text-stone-400">
        This time
      </h2>
      {zoneStatus === "confirmed" ? <Confirmed facts={facts} notice={notice} /> : null}
      {zoneStatus === "unconfirmed" ? (
        <div className="mt-2">
          <p className="text-sm text-stone-300">This time needs a confirmed time zone.</p>
          <Link href="/schedule" className={`mt-3 inline-flex items-center ${secondaryButtonClass}`}>
            Confirm time zone
          </Link>
        </div>
      ) : null}
      {zoneStatus === "unavailable" ? (
        <p className="mt-2 text-sm text-stone-300" role="status">
          The confirmed time zone could not be loaded.
        </p>
      ) : null}
    </section>
  );
}

function Confirmed({
  facts,
  notice,
}: {
  facts: readonly CurrentTemporalFact[] | null;
  notice: string | null;
}) {
  if (notice) {
    return (
      <p className="mt-2 text-sm text-stone-300" role="status">
        {notice}
      </p>
    );
  }
  if (!facts || facts.length === 0) {
    return <p className="mt-2 text-sm text-stone-300">Nothing established contains this time.</p>;
  }
  return (
    <ul className="mt-2">
      {facts.map((fact) => (
        <li key={`${fact.sourceKind}:${fact.sourceId}`} className="border-t border-stone-800 py-3">
          <p className="text-sm text-stone-400">{kindLabel(fact)}</p>
          {identityLabel(fact) ? <p className="mt-1 text-base">{identityLabel(fact)}</p> : null}
          <p className="mt-1 text-sm text-stone-300">{rangeLabel(fact)}</p>
        </li>
      ))}
    </ul>
  );
}

function kindLabel(fact: CurrentTemporalFact): string {
  if (fact.sourceKind === "work_schedule") return "Work";
  if (fact.sourceKind === "protected_time") return "Protected";
  if (fact.sourceKind === "block") return "Block";
  if (fact.sourceKind === "external_temporal") return "External";
  return "Commitment";
}

function identityLabel(fact: CurrentTemporalFact): string | null {
  if (fact.sourceKind === "work_schedule") return SHIFT_TYPE_LABELS[fact.shiftType];
  if (fact.sourceKind === "protected_time") return fact.label;
  if (fact.sourceKind === "block") return fact.purpose;
  if (fact.sourceKind === "external_temporal") return fact.displayLabel;
  return fact.title;
}

function rangeLabel(fact: CurrentTemporalFact): string {
  if (fact.allDay) return "All day";
  const range = `${formatLocalTimeLabel(fact.startLocal)}–${formatLocalTimeLabel(fact.endLocal)}`;
  return fact.endsNextCivilDate ? `${range} · continues after midnight` : range;
}
