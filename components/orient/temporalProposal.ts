import { formatLocalTime, localMinutes, parseLocalTime } from "@/domain/time/localTime";

/**
 * V1 gesture precision on desktop Week. Thirty minutes is a physical constant.
 * It is not stored-clock precision and it is not a domain invariant.
 * FactDetail remains free to save any minute.
 */
export const WEEK_LIFT_QUANTUM_MINUTES = 30;

const DAY_MINUTES = 1440;

export type StoredTemporalPair = {
  startsOn: string;
  startLocal: string;
  endLocal: string;
};

export type TemporalProposal = {
  startsOn: string;
  startLocal: string;
  endLocal: string;
};

/** Local-clock relationship. Equal clocks are a 24-hour continuation, not an empty range. */
export function localClockDurationMinutes(startLocal: string, endLocal: string): number {
  const start = localMinutes(parseLocalTime(startLocal));
  const end = localMinutes(parseLocalTime(endLocal));
  if (end <= start) return end - start + DAY_MINUTES;
  return end - start;
}

/**
 * Nearest 30-minute start in 00:00–23:30.
 * A halfway minute rounds toward the later slot. Minute 1440 is not a start.
 */
export function quantizeWeekLiftMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  const clamped = Math.min(Math.max(minute, 0), DAY_MINUTES - 1);
  const snapped = Math.round(clamped / WEEK_LIFT_QUANTUM_MINUTES) * WEEK_LIFT_QUANTUM_MINUTES;
  if (snapped >= DAY_MINUTES) return DAY_MINUTES - WEEK_LIFT_QUANTUM_MINUTES;
  return Math.max(snapped, 0);
}

/** Full-day fraction of a column body. The bottom edge stays below minute 1440. */
export function rawMinuteOnColumnBody(clientY: number, top: number, height: number): number {
  if (!(height > 0) || !Number.isFinite(clientY) || !Number.isFinite(top)) return 0;
  const ratio = (clientY - top) / height;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return DAY_MINUTES - 1e-6;
  return ratio * DAY_MINUTES;
}

/** Grab-adjusted start, clamped so it cannot name the previous civil date or minute 1440. */
export function unquantizedLiftStart(destinationRawMinute: number, grabOffsetMinutes: number): number {
  if (!Number.isFinite(destinationRawMinute) || !Number.isFinite(grabOffsetMinutes)) return 0;
  const next = destinationRawMinute - grabOffsetMinutes;
  if (next <= 0) return 0;
  if (next >= DAY_MINUTES) return DAY_MINUTES - 1e-6;
  return next;
}

export function proposeTemporalPlacement(
  stored: StoredTemporalPair,
  destinationCivilDate: string,
  proposedStartMinute: number,
): TemporalProposal {
  const duration = localClockDurationMinutes(stored.startLocal, stored.endLocal);
  const start = quantizeWeekLiftMinute(proposedStartMinute);
  const end = (start + duration) % DAY_MINUTES;
  return {
    startsOn: destinationCivilDate,
    startLocal: clockText(start),
    endLocal: clockText(end),
  };
}

function clockText(minute: number): string {
  const whole = Math.min(Math.max(Math.trunc(minute), 0), DAY_MINUTES - 1);
  return formatLocalTime({ hour: Math.floor(whole / 60), minute: whole % 60 });
}
