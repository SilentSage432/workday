import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  boundaryCivilSpan,
  capacityCoverage,
  projectCapacity,
  resolveWorkCapacityBoundary,
  type CapacityInterval,
} from "@/projections/capacity";
import type { SourceRead } from "@/components/currentTemporalReading";

/**
 * Work Capacity for one explicit civil date.
 * The loaded window is the civil span the caller actually read.
 * It is not inferred from the clock.
 */
export type CapacityEvidenceWindow = {
  from: string;
  to: string;
};

export type CapacityReading =
  | { status: "incomplete"; message: string }
  | { status: "none"; reason: "off" | "missing" }
  | { status: "unresolved" }
  | { status: "reading"; remaining: CapacityInterval[]; remainingMs: number };

const INCOMPLETE = "Work Capacity could not be completed.";

export function composeWorkCapacityReading(input: {
  civilDate: string;
  timeZone: string;
  loaded: CapacityEvidenceWindow;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
}): CapacityReading {
  const failure = failedMessage([input.work, input.protectedTime, input.blocks, input.commitments]);
  if (failure) return { status: "incomplete", message: failure };
  if (
    input.work.status !== "ready" ||
    input.protectedTime.status !== "ready" ||
    input.blocks.status !== "ready" ||
    input.commitments.status !== "ready"
  ) {
    return { status: "incomplete", message: INCOMPLETE };
  }

  const civilDate = formatCivilDate(parseCivilDate(input.civilDate));
  const from = formatCivilDate(parseCivilDate(input.loaded.from));
  const to = formatCivilDate(parseCivilDate(input.loaded.to));
  if (from > to || civilDate < from || civilDate > to) {
    return { status: "incomplete", message: `${INCOMPLETE} The read does not cover this date.` };
  }

  const boundary = resolveWorkCapacityBoundary({
    civilDate,
    entries: input.work.rows,
    timeZone: input.timeZone,
  });
  if (boundary.status === "none") return boundary;
  if (boundary.status === "unresolved") return { status: "unresolved" };

  const span = boundaryCivilSpan(boundary.interval, input.timeZone);
  if (span.first < from || span.last > to) {
    return { status: "incomplete", message: `${INCOMPLETE} The read does not cover the whole boundary.` };
  }

  const coverage = capacityCoverage({
    boundary: boundary.interval,
    timeZone: input.timeZone,
    protectedTime: input.protectedTime.rows,
    blocks: input.blocks.rows,
    commitments: input.commitments.rows,
  });
  if (coverage.status === "unresolved") return { status: "unresolved" };

  const geometry = projectCapacity({
    boundary: boundary.interval,
    covered: coverage.intervals,
  });
  return { status: "reading", remaining: geometry.remaining, remainingMs: geometry.remainingMs };
}

function failedMessage(sources: readonly SourceRead<unknown>[]): string | null {
  const messages = sources.flatMap((source) => (source.status === "failed" ? [source.message] : []));
  if (messages.length === 0) return null;
  return `${INCOMPLETE} ${messages.join(" ")}`;
}
