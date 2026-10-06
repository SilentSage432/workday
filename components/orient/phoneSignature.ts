import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { SHIFT_TYPE_LABELS } from "@/domain/workSchedule";
import type { CurrentTemporalFact } from "@/projections/currentTemporalOrientation";
import { DAY_AXIS_MINUTES } from "@/projections/dayCanvas";
import type { FactAddress } from "@/components/factAddress";
import { compressedKindLabel, minuteFraction } from "@/components/orient/grammar";
import { nowScrollTarget } from "@/components/orient/fieldScroll";

/**
 * Presentation mapping from the day canvas's local-clock minutes onto the
 * phone's whole-day signature. The minutes stay the canvas minutes.
 * This does not score, rank, or reinterpret a fact.
 */

/** Where exact Day places a signature minute. Same upper-field offset the Now mark uses. */
export function signatureScrollTop(surfaceContentTop: number, surfaceHeight: number, minute: number, clientHeight: number): number {
  return nowScrollTarget(surfaceContentTop + minuteFraction(minute) * surfaceHeight, clientHeight);
}

export function signaturePlacement(startMinute: number, endMinute: number): { start: number; width: number } {
  const start = minuteFraction(startMinute);
  const end = minuteFraction(endMinute);
  return { start, width: Math.max(0, end - start) };
}

/** A point on the signature, as a local-clock minute. Keyboard entry does not invent one. */
export function minuteFromSignatureRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.min(DAY_AXIS_MINUTES - 1, Math.floor(clamped * DAY_AXIS_MINUTES));
}

export function overlappingFacts<T extends { sourceKind: FactAddress["sourceKind"]; sourceId: string; visibleStartMinute: number; visibleEndMinute: number }>(
  placement: T,
  placements: readonly T[],
): FactAddress[] {
  return placements
    .filter(
      (other) =>
        other.visibleStartMinute < placement.visibleEndMinute && placement.visibleStartMinute < other.visibleEndMinute,
    )
    .map((other) => ({ sourceKind: other.sourceKind, sourceId: other.sourceId }));
}

export function membershipCopy(fact: CurrentTemporalFact): { kind: string; name: string; interval: string } {
  const kind = compressedKindLabel(fact.sourceKind);
  if (fact.sourceKind === "work_schedule") {
    return {
      kind,
      name: SHIFT_TYPE_LABELS[fact.shiftType],
      interval: timedInterval(fact.startLocal, fact.endLocal, fact.endsNextCivilDate),
    };
  }
  if (fact.allDay) {
    return { kind, name: membershipName(fact), interval: "All day" };
  }
  return {
    kind,
    name: membershipName(fact),
    interval: timedInterval(fact.startLocal, fact.endLocal, fact.endsNextCivilDate),
  };
}

function membershipName(fact: Exclude<CurrentTemporalFact, { sourceKind: "work_schedule" }>): string {
  if (fact.sourceKind === "protected_time") return fact.label ?? "Protected";
  if (fact.sourceKind === "block") return fact.purpose;
  return fact.title;
}

function timedInterval(startLocal: string, endLocal: string, endsNextCivilDate: boolean): string {
  const span = `${formatLocalTimeLabel(startLocal)} – ${formatLocalTimeLabel(endLocal)}`;
  return endsNextCivilDate ? `${span}, into the next civil date` : span;
}
