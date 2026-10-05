import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import { addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { projectTimeline, type CivilDateRange, type TimelineFact } from "@/projections/timeline";

/**
 * The spatial distribution of established temporal structure for one explicit
 * civil range. The facts are Timeline's facts. An empty list is nothing
 * established from the participating sources. It is not an available interval.
 */
export type WeekShape = {
  range: CivilDateRange;
  facts: TimelineFact[];
};

const RANGE_ORDER = "A timeline range must start before it ends.";

/**
 * The same half-open civil range Timeline accepts.
 * `startsOn` is included. `endsBefore` is excluded.
 * This does not choose a weekday, a length, or the Work fiscal week.
 */
export function canonicalWeekRange(range: CivilDateRange): CivilDateRange {
  const startsOn = formatCivilDate(parseCivilDate(range.startsOn));
  const endsBefore = formatCivilDate(parseCivilDate(range.endsBefore));
  if (startsOn >= endsBefore) {
    throw new Error(RANGE_ORDER);
  }
  return { startsOn, endsBefore };
}

/**
 * Inclusive civil dates a caller must have loaded before this range can be answered.
 *
 * Timed truth continues at most into the next civil date, so the civil day
 * before `startsOn` is the whole look-behind. The last included day is the
 * civil day before `endsBefore`. A fact owned on the exclusive end date does
 * not meet the range. An overnight tail of a fact owned on the last included
 * day is stored on that day, not on the exclusive end.
 */
export function weekLoadedSpan(range: CivilDateRange): { from: string; to: string } {
  const canonical = canonicalWeekRange(range);
  return {
    from: formatCivilDate(addCivilDays(parseCivilDate(canonical.startsOn), -1)),
    to: formatCivilDate(addCivilDays(parseCivilDate(canonical.endsBefore), -1)),
  };
}

/**
 * Binds an explicit civil range to Timeline's composition.
 * It does not place facts itself, and it does not know whether a read failed.
 */
export function projectWeekShape(input: {
  range: CivilDateRange;
  timeZone: string;
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
}): WeekShape {
  const range = canonicalWeekRange(input.range);
  return {
    range,
    facts: projectTimeline({
      range,
      timeZone: input.timeZone,
      workSchedule: input.workSchedule,
      protectedTime: input.protectedTime,
      blocks: input.blocks,
      commitments: input.commitments,
    }),
  };
}
