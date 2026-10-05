import type { CapacityReading } from "@/components/capacityReading";
import type { FactAddress } from "@/components/factAddress";
import { zonedLocalClock } from "@/domain/time/localTime";
import { addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { CapacityInterval } from "@/projections/capacity";
import { DAY_AXIS_MINUTES } from "@/projections/dayCanvas";
import type { CivilDateRange, TimelineFact, TimelineSourceKind } from "@/projections/timeline";
import { weekLoadedSpan } from "@/projections/weekShape";

/**
 * Disposable spatial prototype.
 * These helpers describe transient presentation. They are not canon,
 * and they do not create domain truth.
 */

export const PROTOTYPE_WEEK_LENGTH = 7;
export const PROTOTYPE_MONTH_LENGTH = 28;
export const ALLOCATABLE_REMAINDER_LABEL = "Allocatable remainder";

export type PrototypeQuestion = "present" | "day" | "week" | "month";

export type ContextFocus = { kind: "everything" } | { kind: "context"; id: string; name: string };

export type StripJob =
  | "resting"
  | "temporal-reference"
  | "inspection"
  | "capture"
  | "direction-inspection";

export type MarkEmphasis = "ordinary" | "quiet";

export function explicitCivilSpan(anchor: string, length: number): CivilDateRange {
  const startsOn = formatCivilDate(parseCivilDate(anchor));
  return {
    startsOn,
    endsBefore: formatCivilDate(addCivilDays(parseCivilDate(startsOn), length)),
  };
}

/** Look-behind through the explicit month span. Not a fiscal week. */
export function prototypeLoadWindow(anchor: string): { from: string; to: string } {
  return weekLoadedSpan(explicitCivilSpan(anchor, PROTOTYPE_MONTH_LENGTH));
}

export function civilDatesInSpan(span: CivilDateRange): string[] {
  const dates: string[] = [];
  let cursor = formatCivilDate(parseCivilDate(span.startsOn));
  const end = formatCivilDate(parseCivilDate(span.endsBefore));
  while (cursor < end) {
    dates.push(cursor);
    cursor = formatCivilDate(addCivilDays(parseCivilDate(cursor), 1));
  }
  return dates;
}

export function questionAllowsEstablishment(question: PrototypeQuestion): boolean {
  return question === "day";
}

export function questionShowsDirection(question: PrototypeQuestion): boolean {
  return question === "month";
}

export function questionAllowsCapacityRemainder(question: PrototypeQuestion): boolean {
  return question === "day" || question === "present";
}

export function prototypeSpanStep(question: PrototypeQuestion): number | null {
  if (question === "day") return 1;
  if (question === "week") return PROTOTYPE_WEEK_LENGTH;
  if (question === "month") return PROTOTYPE_MONTH_LENGTH;
  return null;
}

export function reachStripJob(input: {
  captureOpen: boolean;
  question: PrototypeQuestion;
  selectionVisible: boolean;
  factReferenced: boolean;
  directionInspection: boolean;
}): StripJob {
  if (input.captureOpen) return "capture";
  if (questionAllowsEstablishment(input.question) && input.selectionVisible) return "temporal-reference";
  if (input.factReferenced) return "inspection";
  if (input.directionInspection) return "direction-inspection";
  return "resting";
}

/**
 * Context focus is a lens. It does not drop, move, or hide a mark.
 * Context-neutral truths stay ordinary. A block with no Context stays ordinary.
 * A Work shift quiets unless the lens is the Context named Work.
 */
export function markEmphasis(input: {
  sourceKind: TimelineSourceKind;
  contextId: string | null;
  focus: ContextFocus;
}): MarkEmphasis {
  if (input.focus.kind === "everything") return "ordinary";
  if (input.sourceKind === "protected_time" || input.sourceKind === "commitment") return "ordinary";
  if (input.sourceKind === "work_schedule") {
    return input.focus.name === "Work" ? "ordinary" : "quiet";
  }
  if (input.contextId == null) return "ordinary";
  return input.contextId === input.focus.id ? "ordinary" : "quiet";
}

export function threadLine(input: {
  status: "loading" | "failed" | "ready";
  active: boolean;
  resumeTitle: string | null;
}): string {
  if (input.status === "loading") return "Reading the thread.";
  if (input.status === "failed") return "Active thread could not be read.";
  if (!input.active) return "No thread is established.";
  if (input.resumeTitle) return `Resume: ${input.resumeTitle}`;
  return "A thread is recorded, and its task is not open.";
}

/** Full width of the temporal column. Lane is ignored. */
export function coextensiveFrame(placement: { top: number; height: number; lane?: number }): {
  top: string;
  height: string;
  left: string;
  width: string;
} {
  return {
    top: `${placement.top * 100}%`,
    height: `${placement.height * 100}%`,
    left: "0%",
    width: "100%",
  };
}

export function factsContainingPoint<T extends { left: number; top: number; right: number; bottom: number }>(
  boxes: readonly T[],
  x: number,
  y: number,
): T[] {
  return boxes.filter((box) => x >= box.left && x < box.right && y >= box.top && y < box.bottom);
}

export function compressedKindLabel(kind: TimelineSourceKind): string {
  if (kind === "work_schedule") return "Work";
  if (kind === "protected_time") return "Protected";
  if (kind === "block") return "Block";
  return "Commitment";
}

export type CompressedPlacement =
  | { placement: "all-day" }
  | { placement: "unresolved" }
  | { placement: "timed"; startMinute: number; endMinute: number };

function instantMinuteOnCivilDate(instant: Date, civilDate: string, timeZone: string): number {
  const clock = zonedLocalClock(instant, timeZone);
  if (clock.civilDate === civilDate) return clock.hour * 60 + clock.minute;
  if (clock.civilDate > civilDate) return DAY_AXIS_MINUTES;
  return 0;
}

export function timedSliceOnCivilDate(
  start: Date,
  end: Date,
  civilDate: string,
  timeZone: string,
): { startMinute: number; endMinute: number } | null {
  if (!(end.getTime() > start.getTime())) return null;
  const startMinute = instantMinuteOnCivilDate(start, civilDate, timeZone);
  const endMinute = instantMinuteOnCivilDate(end, civilDate, timeZone);
  if (endMinute <= startMinute) return null;
  return { startMinute, endMinute };
}

export function compressedPlacement(
  fact: TimelineFact,
  civilDate: string,
  timeZone: string,
): CompressedPlacement | null {
  const date = formatCivilDate(parseCivilDate(civilDate));
  if ("allDay" in fact && fact.allDay) {
    return fact.startsOn === date ? { placement: "all-day" } : null;
  }
  if (fact.intersection.status === "unresolved") {
    return fact.startsOn === date ? { placement: "unresolved" } : null;
  }
  const slice = timedSliceOnCivilDate(fact.intersection.start, fact.intersection.end, date, timeZone);
  if (!slice) return null;
  return { placement: "timed", startMinute: slice.startMinute, endMinute: slice.endMinute };
}

export function allocatableRemainderBands(
  reading: CapacityReading,
  civilDate: string,
  timeZone: string,
): { startMinute: number; endMinute: number }[] {
  if (reading.status !== "reading") return [];
  const bands: { startMinute: number; endMinute: number }[] = [];
  for (const interval of reading.remaining) {
    const slice = remainderSlice(interval, civilDate, timeZone);
    if (slice) bands.push(slice);
  }
  return bands;
}

function remainderSlice(
  interval: CapacityInterval,
  civilDate: string,
  timeZone: string,
): { startMinute: number; endMinute: number } | null {
  try {
    return timedSliceOnCivilDate(interval.start, interval.end, civilDate, timeZone);
  } catch {
    return null;
  }
}

export function minuteFraction(minute: number): number {
  return Math.min(Math.max(minute, 0), DAY_AXIS_MINUTES) / DAY_AXIS_MINUTES;
}

export function shiftedAnchor(anchor: string, delta: number): string {
  return formatCivilDate(addCivilDays(parseCivilDate(anchor), delta));
}

export type { FactAddress };
