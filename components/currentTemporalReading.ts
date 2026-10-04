import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  projectCurrentTemporalOrientation,
  type CurrentTemporalFact,
} from "@/projections/currentTemporalOrientation";

export type SourceRead<T> =
  | { status: "ready"; rows: readonly T[] }
  | { status: "failed"; message: string };

export type CurrentTemporalReading =
  | { status: "complete"; facts: CurrentTemporalFact[] }
  | { status: "incomplete"; message: string };

const INCOMPLETE = "This time could not be completed.";

function failedMessage(sources: readonly SourceRead<unknown>[]): string | null {
  const messages = sources.flatMap((source) => (source.status === "failed" ? [source.message] : []));
  if (messages.length === 0) return null;
  return `${INCOMPLETE} ${messages.join(" ")}`;
}

/**
 * Decides whether the current temporal orientation may be shown.
 * The projection stays a pure reading of the rows it is given.
 * A failed source is not an empty source.
 */
export function composeCurrentTemporalReading(input: {
  instant: Date;
  timeZone: string;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
}): CurrentTemporalReading {
  const message = failedMessage([input.work, input.protectedTime, input.blocks, input.commitments]);
  if (message) return { status: "incomplete", message };
  if (
    input.work.status !== "ready" ||
    input.protectedTime.status !== "ready" ||
    input.blocks.status !== "ready" ||
    input.commitments.status !== "ready"
  ) {
    return { status: "incomplete", message: INCOMPLETE };
  }
  return {
    status: "complete",
    facts: projectCurrentTemporalOrientation({
      instant: input.instant,
      timeZone: input.timeZone,
      workSchedule: input.work.rows,
      protectedTime: input.protectedTime.rows,
      blocks: input.blocks.rows,
      commitments: input.commitments.rows,
    }).facts,
  };
}
