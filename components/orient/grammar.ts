import type { CapacityReading } from "@/components/capacityReading";
import { zonedLocalClock } from "@/domain/time/localTime";
import { addCivilDays, formatCivilDate, formatCivilDateLabel, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { CapacityInterval } from "@/projections/capacity";
import { DAY_AXIS_MINUTES } from "@/projections/dayCanvas";
import type { CivilDateRange, TimelineFact, TimelineSourceKind } from "@/projections/timeline";
import { weekLoadedSpan } from "@/projections/weekShape";

/**
 * Presentation grammar for the production instrument.
 * Question, focus, and window length are interface state.
 * They do not amend Week, Month, or Capacity.
 */

export const WEEK_WINDOW_DAYS = 7;
export const MONTH_WINDOW_DAYS = 28;

export const ALLOCATABLE_GLOSS = "Hatched time inside the shift is allocatable remainder.";

export type OrientQuestion = "present" | "day" | "week" | "month";

export type ContextFocus = { kind: "everything" } | { kind: "context"; id: string; name: string };

export type MarkEmphasis = "ordinary" | "quiet";

export const QUESTION_LABEL: Record<OrientQuestion, string> = {
  present: "Present",
  day: "Day",
  week: "Week",
  month: "Month",
};

export function explicitCivilSpan(anchor: string, length: number): CivilDateRange {
  const startsOn = formatCivilDate(parseCivilDate(anchor));
  return {
    startsOn,
    endsBefore: formatCivilDate(addCivilDays(parseCivilDate(startsOn), length)),
  };
}

/** Look-behind through the explicit month span. Not a fiscal week and not a Gregorian month. */
export function experienceLoadWindow(anchor: string): { from: string; to: string } {
  return weekLoadedSpan(explicitCivilSpan(anchor, MONTH_WINDOW_DAYS));
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

export function shiftedAnchor(anchor: string, delta: number): string {
  return formatCivilDate(addCivilDays(parseCivilDate(anchor), delta));
}

export function questionAllowsEstablishment(question: OrientQuestion): boolean {
  return question === "day";
}

export function questionAllowsReference(question: OrientQuestion): boolean {
  return question === "day" || question === "present";
}

export function questionShowsDirection(question: OrientQuestion): boolean {
  return question === "month";
}

export function questionAllowsCapacityRemainder(question: OrientQuestion): boolean {
  return question === "day" || question === "present";
}

export function windowLength(question: OrientQuestion): number | null {
  if (question === "week") return WEEK_WINDOW_DAYS;
  if (question === "month") return MONTH_WINDOW_DAYS;
  return null;
}

/**
 * Context focus changes emphasis. It does not drop, move, or hide a mark.
 * Context-neutral truths stay ordinary. A block with no Context stays ordinary.
 * A Work shift stays ordinary only when the lens is the Context named Work.
 */
export function markEmphasis(input: {
  sourceKind: TimelineSourceKind;
  contextId: string | null;
  focus: ContextFocus;
}): MarkEmphasis {
  if (input.focus.kind === "everything") return "ordinary";
  if (
    input.sourceKind === "protected_time" ||
    input.sourceKind === "commitment" ||
    input.sourceKind === "external_temporal"
  ) {
    return "ordinary";
  }
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
  if (input.status === "failed") return "The thread could not be read.";
  if (!input.active) return "No thread is established.";
  if (input.resumeTitle) return `Resume: ${input.resumeTitle}`;
  return "A thread is recorded, and its task is not open.";
}

export function threadRestingWeight(input: {
  status: "loading" | "failed" | "ready";
  active: boolean;
}): "quiet" | "ordinary" {
  if (input.status === "ready" && !input.active) return "quiet";
  return "ordinary";
}

export function positionWord(question: OrientQuestion, anchor: string): string {
  if (question === "week" || question === "month") {
    const span = explicitCivilSpan(anchor, question === "week" ? WEEK_WINDOW_DAYS : MONTH_WINDOW_DAYS);
    const dates = civilDatesInSpan(span);
    const last = dates.at(-1) ?? span.startsOn;
    return `${formatCivilDateLabel(span.startsOn)} – ${formatCivilDateLabel(last)}`;
  }
  return formatCivilDateLabel(anchor);
}

export function kindContour(kind: TimelineSourceKind): "solid" | "dashed" | "double" | "dotted" {
  if (kind === "work_schedule") return "solid";
  if (kind === "protected_time") return "dashed";
  if (kind === "block") return "double";
  if (kind === "external_temporal") return "dotted";
  return "dotted";
}

export function compressedKindLabel(kind: TimelineSourceKind): string {
  if (kind === "work_schedule") return "Work";
  if (kind === "protected_time") return "Protected";
  if (kind === "block") return "Block";
  if (kind === "external_temporal") return "External";
  return "Commitment";
}

export function labelStackIndex(
  placement: { sourceKind: string; sourceId: string; visibleStartMinute: number; visibleEndMinute: number },
  placements: readonly { sourceKind: string; sourceId: string; visibleStartMinute: number; visibleEndMinute: number }[],
): number {
  const cluster = placements.filter(
    (other) =>
      other.visibleStartMinute < placement.visibleEndMinute && placement.visibleStartMinute < other.visibleEndMinute,
  );
  const index = cluster.findIndex(
    (other) => other.sourceKind === placement.sourceKind && other.sourceId === placement.sourceId,
  );
  return index < 0 ? 0 : index;
}

export function minuteFraction(minute: number): number {
  return Math.min(Math.max(minute, 0), DAY_AXIS_MINUTES) / DAY_AXIS_MINUTES;
}

/** The civil date of an instant in a confirmed zone. This is the only production "today." */
export function orientCivilDate(instant: Date, timeZone: string): string {
  return zonedLocalClock(instant, timeZone).civilDate;
}

const MONTH_AXIS_FLOOR_MINUTES = 180;
const MONTH_AXIS_PAD = 0.08;
const MONTH_MARK_FLOOR = 0.015;

export type MonthClockAxis = { startMinute: number; endMinute: number };

/**
 * Month paints local clock minutes onto the landscape height.
 * The axis is the earliest and latest established timed minute in the window,
 * padded, and never shorter than three hours. An empty window keeps the full
 * local day. This does not change recorded duration.
 */
export function monthClockAxis(
  placements: readonly { visibleStartMinute: number; visibleEndMinute: number }[],
): MonthClockAxis {
  if (placements.length === 0) return { startMinute: 0, endMinute: DAY_AXIS_MINUTES };
  let start = Math.min(...placements.map((item) => item.visibleStartMinute));
  let end = Math.max(...placements.map((item) => item.visibleEndMinute));
  if (!(end > start)) end = start + 1;
  if (end - start < MONTH_AXIS_FLOOR_MINUTES) {
    const mid = (start + end) / 2;
    start = mid - MONTH_AXIS_FLOOR_MINUTES / 2;
    end = start + MONTH_AXIS_FLOOR_MINUTES;
  }
  if (start < 0) {
    end -= start;
    start = 0;
  }
  if (end > DAY_AXIS_MINUTES) {
    start -= end - DAY_AXIS_MINUTES;
    end = DAY_AXIS_MINUTES;
    if (start < 0) start = 0;
  }
  const pad = (end - start) * MONTH_AXIS_PAD;
  return {
    startMinute: Math.max(0, start - pad),
    endMinute: Math.min(DAY_AXIS_MINUTES, end + pad),
  };
}

/** Linear map from recorded minutes onto the Month axis. Height has a small visibility floor. */
export function monthVisualSpan(
  startMinute: number,
  endMinute: number,
  axis: MonthClockAxis,
): { top: number; height: number } {
  const span = Math.max(axis.endMinute - axis.startMinute, 1);
  return {
    top: (startMinute - axis.startMinute) / span,
    height: Math.max((endMinute - startMinute) / span, MONTH_MARK_FLOOR),
  };
}

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

export type CompressedPlacement =
  | { placement: "all-day" }
  | { placement: "unresolved" }
  | { placement: "timed"; startMinute: number; endMinute: number };

export function compressedPlacement(
  fact: TimelineFact,
  civilDate: string,
  timeZone: string,
): CompressedPlacement | null {
  const date = formatCivilDate(parseCivilDate(civilDate));
  if ("allDay" in fact && fact.allDay) {
    if (fact.sourceKind === "external_temporal") {
      return fact.startsOn <= date && date < fact.endsBefore ? { placement: "all-day" } : null;
    }
    return fact.startsOn === date ? { placement: "all-day" } : null;
  }
  if (fact.intersection.status === "unresolved") {
    return fact.startsOn === date ? { placement: "unresolved" } : null;
  }
  const slice = timedSliceOnCivilDate(fact.intersection.start, fact.intersection.end, date, timeZone);
  if (!slice) return null;
  return { placement: "timed", startMinute: slice.startMinute, endMinute: slice.endMinute };
}

export function factsContainingPoint<T extends { left: number; top: number; right: number; bottom: number }>(
  boxes: readonly T[],
  x: number,
  y: number,
): T[] {
  return boxes.filter((box) => x >= box.left && x < box.right && y >= box.top && y < box.bottom);
}

export function accessibleFactName(label: string, emphasis: MarkEmphasis): string {
  if (emphasis === "quiet") return `${label} quiet`;
  return label;
}
