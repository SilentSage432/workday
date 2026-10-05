import type { Block } from "@/domain/block";
import { timedBlockEndsNextCivilDate } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import { timedCommitmentEndsNextCivilDate } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import { timedProtectedTimeEndsNextCivilDate } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import { shiftEndsNextCivilDate, type WorkScheduleEntry } from "@/domain/workSchedule";
import { scheduledShiftBounds } from "@/projections/workDay";

/**
 * Half-open instant interval. The start counts. The end does not.
 * Capacity geometry does not name the fact that covered a portion.
 */
export type CapacityInterval = {
  start: Date;
  end: Date;
};

export type CapacityGeometry = {
  remaining: CapacityInterval[];
  remainingMs: number;
};

const UNRESOLVABLE_LOCAL_TIME = "That local time does not occur once in this time zone.";

/**
 * Remaining territory inside an already-resolved allocatable boundary.
 * Covered intervals are geometric. Overlap is counted once.
 * The boundary must have a positive elapsed length.
 */
export function projectCapacity(input: {
  boundary: CapacityInterval;
  covered: readonly CapacityInterval[];
}): CapacityGeometry {
  const start = input.boundary.start.getTime();
  const end = input.boundary.end.getTime();
  if (!(end > start)) {
    throw new Error("A Capacity boundary must be a positive interval.");
  }

  const clipped: { start: number; end: number }[] = [];
  for (const interval of input.covered) {
    const pieceStart = Math.max(interval.start.getTime(), start);
    const pieceEnd = Math.min(interval.end.getTime(), end);
    if (pieceEnd > pieceStart) {
      clipped.push({ start: pieceStart, end: pieceEnd });
    }
  }
  clipped.sort((left, right) => left.start - right.start || left.end - right.end);

  const merged: { start: number; end: number }[] = [];
  for (const piece of clipped) {
    const last = merged.at(-1);
    if (!last || piece.start > last.end) {
      merged.push({ start: piece.start, end: piece.end });
    } else if (piece.end > last.end) {
      last.end = piece.end;
    }
  }

  const remaining: CapacityInterval[] = [];
  let cursor = start;
  for (const piece of merged) {
    if (piece.start > cursor) {
      remaining.push({ start: new Date(cursor), end: new Date(piece.start) });
    }
    cursor = Math.max(cursor, piece.end);
  }
  if (cursor < end) {
    remaining.push({ start: new Date(cursor), end: new Date(end) });
  }

  const remainingMs = remaining.reduce(
    (sum, interval) => sum + (interval.end.getTime() - interval.start.getTime()),
    0,
  );
  return { remaining, remainingMs };
}

export type WorkCapacityBoundary =
  | {
      status: "boundary";
      interval: CapacityInterval;
      workOn: string;
      endsNextCivilDate: boolean;
    }
  | { status: "none"; reason: "off" | "missing" }
  | { status: "unresolved" };

/**
 * The question is one civil date.
 * The Work row for that date is the only candidate boundary.
 * An overnight shift owned by that date continues into the next civil date.
 * A shift owned by the previous date is not selected.
 */
export function resolveWorkCapacityBoundary(input: {
  civilDate: string;
  entries: readonly WorkScheduleEntry[];
  timeZone: string;
}): WorkCapacityBoundary {
  const civilDate = formatCivilDate(parseCivilDate(input.civilDate));
  const matches = input.entries.filter((entry) => entry.workOn === civilDate);
  if (matches.length === 0) return { status: "none", reason: "missing" };
  if (matches.length > 1) return { status: "unresolved" };
  const entry = matches[0];
  if (!entry || entry.state === "off") return { status: "none", reason: "off" };

  try {
    const interval = scheduledShiftBounds(entry, input.timeZone);
    if (interval.end.getTime() <= interval.start.getTime()) return { status: "unresolved" };
    return {
      status: "boundary",
      interval,
      workOn: civilDate,
      endsNextCivilDate: shiftEndsNextCivilDate(entry.startLocal, entry.endLocal),
    };
  } catch (error: unknown) {
    if (isUnresolvableLocalTime(error)) return { status: "unresolved" };
    throw error;
  }
}

export function boundaryCivilSpan(interval: CapacityInterval, timeZone: string): { first: string; last: string } {
  const first = formatCivilDate(civilDateInTimeZone(interval.start, timeZone));
  const last = formatCivilDate(civilDateInTimeZone(new Date(interval.end.getTime() - 1), timeZone));
  return { first, last };
}

export type CapacityFactCoverage =
  | { status: "covered"; intervals: CapacityInterval[] }
  | { status: "unresolved" };

type TimedClaim = {
  startsOn: string;
  startLocal: string;
  endLocal: string;
  endsNextCivilDate: boolean;
};

/**
 * Geometric coverage of one boundary by Protected Time, Commitments, and Blocks.
 * A Task reference on a Block is not a second interval.
 * A fact that might meet the boundary but cannot be placed is unresolved.
 */
export function capacityCoverage(input: {
  boundary: CapacityInterval;
  timeZone: string;
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
}): CapacityFactCoverage {
  const span = boundaryCivilSpan(input.boundary, input.timeZone);
  const intervals: CapacityInterval[] = [];
  const facts: Array<ProtectedTime | Block | Commitment> = [
    ...input.protectedTime,
    ...input.commitments,
    ...input.blocks,
  ];

  for (const fact of facts) {
    const placed = placeFact(fact, span, input.boundary, input.timeZone);
    if (placed === "unresolved") return { status: "unresolved" };
    if (placed) intervals.push(placed);
  }
  return { status: "covered", intervals };
}

function placeFact(
  fact: ProtectedTime | Block | Commitment,
  span: { first: string; last: string },
  boundary: CapacityInterval,
  timeZone: string,
): CapacityInterval | "unresolved" | null {
  if (fact.kind === "all_day") {
    if (!spansMeet(fact.startsOn, fact.startsOn, span.first, span.last)) return null;
    const next = nextCivilDate(fact.startsOn);
    try {
      return clip(
        {
          start: instantFromZonedLocal(fact.startsOn, "00:00", timeZone),
          end: instantFromZonedLocal(next, "00:00", timeZone),
        },
        boundary,
      );
    } catch (error: unknown) {
      if (isUnresolvableLocalTime(error)) return "unresolved";
      throw error;
    }
  }

  const claim = timedClaim(fact);
  const endOn = claim.endsNextCivilDate ? nextCivilDate(claim.startsOn) : claim.startsOn;
  if (!spansMeet(claim.startsOn, endOn, span.first, span.last)) return null;
  try {
    return clip(
      {
        start: instantFromZonedLocal(claim.startsOn, claim.startLocal, timeZone),
        end: instantFromZonedLocal(endOn, claim.endLocal, timeZone),
      },
      boundary,
    );
  } catch (error: unknown) {
    if (isUnresolvableLocalTime(error)) return "unresolved";
    throw error;
  }
}

function timedClaim(fact: ProtectedTime | Block | Commitment): TimedClaim {
  if (fact.kind !== "timed") {
    throw new Error("An all-day fact has no clock.");
  }
  const endsNextCivilDate =
    "purpose" in fact
      ? timedBlockEndsNextCivilDate(fact.startLocal, fact.endLocal)
      : "origin" in fact
        ? timedCommitmentEndsNextCivilDate(fact.startLocal, fact.endLocal)
        : timedProtectedTimeEndsNextCivilDate(fact.startLocal, fact.endLocal);
  return {
    startsOn: fact.startsOn,
    startLocal: fact.startLocal,
    endLocal: fact.endLocal,
    endsNextCivilDate,
  };
}

function clip(interval: CapacityInterval, boundary: CapacityInterval): CapacityInterval | null {
  const start = Math.max(interval.start.getTime(), boundary.start.getTime());
  const end = Math.min(interval.end.getTime(), boundary.end.getTime());
  if (end <= start) return null;
  return { start: new Date(start), end: new Date(end) };
}

function spansMeet(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean {
  return leftStart <= rightEnd && leftEnd >= rightStart;
}

function nextCivilDate(startsOn: string): string {
  return formatCivilDate(addCivilDays(parseCivilDate(startsOn), 1));
}

function isUnresolvableLocalTime(error: unknown): boolean {
  return error instanceof Error && error.message === UNRESOLVABLE_LOCAL_TIME;
}
