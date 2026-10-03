import { SHIFT_TYPE_LABELS } from "@/domain/workSchedule";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import { formatLocalTimeLabel, instantFromZonedLocal, zonedLocalClock } from "@/domain/time/localTime";
import { addCivilDays, formatCivilDate, formatCivilDateLabel, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  projectTimeline,
  type CivilDateRange,
  type TimelineFact,
  type TimelineSourceKind,
} from "@/projections/timeline";

/**
 * Local clock axis for one civil day. This is not elapsed milliseconds.
 * A spring-forward or fall-back day is not assumed to last 24 hours.
 */
export const DAY_AXIS_MINUTES = 24 * 60;

const DAY_ELAPSED_MS = 24 * 60 * 60 * 1000;

const VARIABLE_DAY_NOTE =
  "This civil day is not 24 elapsed hours. Placement uses local clock labels.";

const UNPOSITIONED_NOTE = "Time could not be positioned for this date.";

export type DayCanvasListedFact = {
  sourceKind: TimelineSourceKind;
  sourceId: string;
  kindLabel: string;
  primary: string;
  detail: string;
  accessibleLabel: string;
};

export type DayCanvasTimedPlacement = {
  sourceKind: TimelineSourceKind;
  sourceId: string;
  /**
   * Provisional visual layer. Work and Protected Time are context.
   * Blocks and Commitments are foreground. This is not importance.
   */
  layer: "context" | "foreground";
  lane: number;
  laneCount: number;
  visibleStartMinute: number;
  visibleEndMinute: number;
  top: number;
  height: number;
  clipped: boolean;
  kindLabel: string;
  primary: string;
  sourceInterval: string;
  shownInterval: string | null;
  contextName: string | null;
  accessibleLabel: string;
};

export type DayCanvasModel = {
  selectedDay: string;
  range: CivilDateRange;
  /** Previous civil date. Callers must include that day's timed rows. */
  lookBehindDay: string;
  axis: "local-clock" | "unpositioned";
  clockLabelNote: string | null;
  allDay: DayCanvasListedFact[];
  unresolved: DayCanvasListedFact[];
  context: DayCanvasTimedPlacement[];
  foreground: DayCanvasTimedPlacement[];
};

function canonicalDay(value: string): string {
  return formatCivilDate(parseCivilDate(value));
}

export function adjacentCivilDay(selectedDay: string, delta: -1 | 1): string {
  return formatCivilDate(addCivilDays(parseCivilDate(canonicalDay(selectedDay)), delta));
}

/** Half-open civil day [D, D + 1). The next date is a civil step, not 24 elapsed hours. */
export function dayCanvasRange(selectedDay: string): CivilDateRange {
  const startsOn = canonicalDay(selectedDay);
  return { startsOn, endsBefore: adjacentCivilDay(startsOn, 1) };
}

/**
 * Work schedule rows are queried inclusively. Timed truth continues at most
 * into the next civil date, so the previous civil date is the whole look-behind.
 * Pass `from` through `to` to `loadWorkSchedule`.
 */
export function dayCanvasWorkQuery(selectedDay: string): { from: string; to: string } {
  const day = canonicalDay(selectedDay);
  return { from: adjacentCivilDay(day, -1), to: day };
}

/**
 * Composes one civil day by calling `projectTimeline`, then derives visual geometry.
 * It does not decide which facts exist. The caller supplies rows, including the
 * previous civil day's timed rows. Protected Time, Blocks, and Commitments may be
 * the full stored sets. This function does not prefilter them to `selectedDay`.
 */
export function composeDayCanvas(input: {
  selectedDay: string;
  timeZone: string;
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
  contextNames?: Readonly<Record<string, string>>;
}): DayCanvasModel {
  const selectedDay = canonicalDay(input.selectedDay);
  const range = dayCanvasRange(selectedDay);
  const facts = projectTimeline({
    range,
    timeZone: input.timeZone,
    workSchedule: input.workSchedule,
    protectedTime: input.protectedTime,
    blocks: input.blocks,
    commitments: input.commitments,
  });
  const axis = dayAxis(selectedDay, input.timeZone);
  const allDay: DayCanvasListedFact[] = [];
  const unresolved: DayCanvasListedFact[] = [];
  const context: DayCanvasTimedPlacement[] = [];
  const foreground: DayCanvasTimedPlacement[] = [];

  for (const fact of facts) {
    if (fact.allDay) {
      allDay.push(listedFact(fact, selectedDay, "all-day"));
      continue;
    }
    if (fact.intersection.status !== "resolved" || axis.axis === "unpositioned") {
      unresolved.push(listedFact(fact, selectedDay, "unresolved"));
      continue;
    }
    const placement = placeTimedFact(fact, selectedDay, input.timeZone, input.contextNames ?? {});
    if (!placement) {
      unresolved.push(listedFact(fact, selectedDay, "unresolved"));
      continue;
    }
    if (placement.layer === "context") context.push(placement);
    else foreground.push(placement);
  }

  assignForegroundLanes(foreground);

  return {
    selectedDay,
    range,
    lookBehindDay: adjacentCivilDay(selectedDay, -1),
    axis: axis.axis,
    clockLabelNote: axis.note,
    allDay,
    unresolved,
    context: [
      ...context.filter((item) => item.sourceKind === "work_schedule"),
      ...context.filter((item) => item.sourceKind === "protected_time"),
    ],
    foreground,
  };
}

function dayAxis(selectedDay: string, timeZone: string): { axis: "local-clock" | "unpositioned"; note: string | null } {
  try {
    const start = instantFromZonedLocal(selectedDay, "00:00", timeZone);
    const end = instantFromZonedLocal(adjacentCivilDay(selectedDay, 1), "00:00", timeZone);
    const elapsed = end.getTime() - start.getTime();
    if (elapsed === DAY_ELAPSED_MS) return { axis: "local-clock", note: null };
    return { axis: "local-clock", note: VARIABLE_DAY_NOTE };
  } catch {
    return { axis: "unpositioned", note: UNPOSITIONED_NOTE };
  }
}

function listedFact(fact: TimelineFact, selectedDay: string, mode: "all-day" | "unresolved"): DayCanvasListedFact {
  const kindLabel = kindWord(fact);
  const primary = primaryText(fact);
  const detail = fact.allDay
    ? `${formatCivilDateLabel(fact.startsOn)}. All day.`
    : sourceInterval(fact);
  const uncertainty = mode === "unresolved" ? ` ${UNPOSITIONED_NOTE}` : "";
  const accessibleLabel = `${accessibleKind(fact, primary)} ${detail}${uncertainty}`.trim();
  return {
    sourceKind: fact.sourceKind,
    sourceId: fact.sourceId,
    kindLabel,
    primary,
    detail,
    accessibleLabel:
      mode === "all-day"
        ? accessibleLabel
        : `${accessibleLabel} Selected day ${formatCivilDateLabel(selectedDay)}.`,
  };
}

function placeTimedFact(
  fact: Extract<TimelineFact, { allDay: false }>,
  selectedDay: string,
  timeZone: string,
  contextNames: Readonly<Record<string, string>>,
): DayCanvasTimedPlacement | null {
  if (fact.intersection.status !== "resolved") return null;
  const visible = visibleMinutes(fact.intersection.start, fact.intersection.end, selectedDay, timeZone);
  if (!visible) return null;
  const clipped =
    fact.bounds.status === "resolved" &&
    (fact.bounds.start.getTime() !== fact.intersection.start.getTime() ||
      fact.bounds.end.getTime() !== fact.intersection.end.getTime());
  const source = sourceInterval(fact);
  const shown = `${formatMinuteLabel(visible.start)}–${formatMinuteLabel(visible.end)}`;
  const contextName = fact.sourceKind === "block" && fact.contextId ? contextNames[fact.contextId] ?? null : null;
  const primary = primaryText(fact);
  const shownText = clipped ? ` Shown on ${formatCivilDateLabel(selectedDay)}, ${shown}.` : "";
  const contextText = contextName ? ` ${contextName}.` : "";
  return {
    sourceKind: fact.sourceKind,
    sourceId: fact.sourceId,
    layer: fact.sourceKind === "work_schedule" || fact.sourceKind === "protected_time" ? "context" : "foreground",
    lane: 0,
    laneCount: 1,
    visibleStartMinute: visible.start,
    visibleEndMinute: visible.end,
    top: visible.start / DAY_AXIS_MINUTES,
    height: (visible.end - visible.start) / DAY_AXIS_MINUTES,
    clipped,
    kindLabel: kindWord(fact),
    primary,
    sourceInterval: source,
    shownInterval: clipped ? shown : null,
    contextName,
    accessibleLabel: `${accessibleKind(fact, primary)}${contextText} ${source}.${shownText}`.replace(/\s+/g, " ").trim(),
  };
}

function visibleMinutes(
  start: Date,
  end: Date,
  selectedDay: string,
  timeZone: string,
): { start: number; end: number } | null {
  const startMinute = minuteOnSelectedDay(start, selectedDay, timeZone);
  const endMinute = minuteOnSelectedDay(end, selectedDay, timeZone);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  return { start: startMinute, end: endMinute };
}

function minuteOnSelectedDay(instant: Date, selectedDay: string, timeZone: string): number | null {
  try {
    const clock = zonedLocalClock(instant, timeZone);
    if (clock.civilDate < selectedDay) return 0;
    if (clock.civilDate > selectedDay) return DAY_AXIS_MINUTES;
    return clock.hour * 60 + clock.minute;
  } catch {
    return null;
  }
}

/**
 * Visual packing for blocks and commitments that overlap on this day.
 * A lane is free when its interval has ended. A shared boundary does not overlap.
 * The same start breaks the tie by source id. That is stability, not importance.
 * Lane count belongs to the overlap cluster, so an isolated fact keeps the full width.
 */
function assignForegroundLanes(items: DayCanvasTimedPlacement[]): void {
  const ordered = [...items].sort(compareLaneOrder);
  let cluster: DayCanvasTimedPlacement[] = [];
  let clusterEnd = -1;
  const clusters: DayCanvasTimedPlacement[][] = [];

  for (const item of ordered) {
    if (cluster.length === 0 || item.visibleStartMinute < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.visibleEndMinute);
    } else {
      clusters.push(cluster);
      cluster = [item];
      clusterEnd = item.visibleEndMinute;
    }
  }
  if (cluster.length > 0) clusters.push(cluster);

  for (const group of clusters) {
    const laneEnds: number[] = [];
    for (const item of [...group].sort(compareLaneOrder)) {
      let lane = laneEnds.findIndex((end) => end <= item.visibleStartMinute);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.visibleEndMinute);
      } else {
        laneEnds[lane] = item.visibleEndMinute;
      }
      item.lane = lane;
      item.laneCount = laneEnds.length;
    }
    const laneCount = laneEnds.length;
    for (const item of group) item.laneCount = laneCount;
  }
}

function compareLaneOrder(left: DayCanvasTimedPlacement, right: DayCanvasTimedPlacement): number {
  if (left.visibleStartMinute !== right.visibleStartMinute) {
    return left.visibleStartMinute - right.visibleStartMinute;
  }
  if (left.visibleEndMinute !== right.visibleEndMinute) return left.visibleEndMinute - right.visibleEndMinute;
  if (left.sourceId !== right.sourceId) return left.sourceId < right.sourceId ? -1 : 1;
  if (left.sourceKind !== right.sourceKind) return left.sourceKind < right.sourceKind ? -1 : 1;
  return 0;
}

function kindWord(fact: TimelineFact): string {
  switch (fact.sourceKind) {
    case "work_schedule":
      return "Work";
    case "protected_time":
      return "Protected";
    case "block":
      return "Block";
    case "commitment":
      return "Commitment";
  }
}

function primaryText(fact: TimelineFact): string {
  switch (fact.sourceKind) {
    case "work_schedule":
      return SHIFT_TYPE_LABELS[fact.shiftType];
    case "protected_time":
      return fact.label && fact.label.length > 0 ? fact.label : "Protected";
    case "block":
      return fact.purpose;
    case "commitment":
      return fact.title;
  }
}

function accessibleKind(fact: TimelineFact, primary: string): string {
  switch (fact.sourceKind) {
    case "work_schedule":
      return `Work schedule, ${primary}.`;
    case "protected_time":
      return fact.label && fact.label.length > 0 ? `Protected time, ${primary}.` : "Protected time.";
    case "block":
      return `Block, ${primary}.`;
    case "commitment":
      return `Commitment, ${primary}.`;
  }
}

function sourceInterval(fact: Extract<TimelineFact, { allDay: false }>): string {
  const endOn = fact.endsNextCivilDate ? adjacentCivilDay(fact.startsOn, 1) : fact.startsOn;
  return `${formatCivilDateLabel(fact.startsOn)}, ${formatLocalTimeLabel(fact.startLocal)}–${formatCivilDateLabel(endOn)}, ${formatLocalTimeLabel(fact.endLocal)}`;
}

function formatMinuteLabel(minute: number): string {
  if (minute <= 0 || minute >= DAY_AXIS_MINUTES) return formatLocalTimeLabel("00:00");
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  return formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
}
