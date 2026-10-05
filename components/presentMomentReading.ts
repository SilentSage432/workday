import type { ActiveThread } from "@/domain/activeThread";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  composeCurrentTemporalReading,
  type SourceRead,
} from "@/components/currentTemporalReading";
import {
  projectPresentMomentOrientation,
  type PresentMomentOrientation,
} from "@/projections/presentMomentOrientation";

/**
 * Withholds present-moment orientation unless every source for both members
 * completed. A failed Active Thread or open-Task read is not "no thread."
 * A failed temporal source is not an empty orientation.
 * A ready Active Thread read with no row is a real absence.
 */

export type PresentMomentReading =
  | ({ status: "complete" } & PresentMomentOrientation)
  | { status: "incomplete"; message: string };

function failedMessage(sources: readonly SourceRead<unknown>[]): string | null {
  const messages = sources.flatMap((source) => (source.status === "failed" ? [source.message] : []));
  if (messages.length === 0) return null;
  return messages.join(" ");
}

export function composePresentMomentOrientation(input: {
  instant: Date;
  timeZone: string;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  activeThread: SourceRead<ActiveThread>;
  openTasks: SourceRead<Task>;
}): PresentMomentReading {
  const temporal = composeCurrentTemporalReading({
    instant: input.instant,
    timeZone: input.timeZone,
    work: input.work,
    protectedTime: input.protectedTime,
    blocks: input.blocks,
    commitments: input.commitments,
  });
  const threadFailure = failedMessage([input.activeThread, input.openTasks]);
  if (temporal.status === "incomplete" || threadFailure !== null) {
    const message = [temporal.status === "incomplete" ? temporal.message : null, threadFailure]
      .filter((part): part is string => part !== null)
      .join(" ");
    return { status: "incomplete", message };
  }
  if (
    input.work.status !== "ready" ||
    input.protectedTime.status !== "ready" ||
    input.blocks.status !== "ready" ||
    input.commitments.status !== "ready" ||
    input.activeThread.status !== "ready" ||
    input.openTasks.status !== "ready"
  ) {
    return { status: "incomplete", message: "Present-moment orientation could not be completed." };
  }
  if (input.activeThread.rows.length > 1) {
    return {
      status: "incomplete",
      message: "Present-moment orientation could not be completed.",
    };
  }

  return {
    status: "complete",
    ...projectPresentMomentOrientation({
      instant: input.instant,
      timeZone: input.timeZone,
      workSchedule: input.work.rows,
      protectedTime: input.protectedTime.rows,
      blocks: input.blocks.rows,
      commitments: input.commitments.rows,
      activeThread: input.activeThread.rows[0] ?? null,
      openTasks: input.openTasks.rows,
    }),
  };
}
