import type { ActiveThread } from "@/domain/activeThread";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ExternalTemporalFact } from "@/domain/externalTemporal";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  projectCurrentTemporalOrientation,
  type CurrentTemporalOrientation,
} from "@/projections/currentTemporalOrientation";
import { projectResume, type ResumeProjection } from "@/projections/resume";
import type { ExternalTemporalTimelineContext } from "@/projections/timeline";

/**
 * Current temporal orientation and the Active Thread, kept as separate truths.
 * The caller supplies the instant and the confirmed IANA zone.
 * This function does not read a clock, infer a thread, or rank the two members.
 */

export type PresentMomentOrientation = {
  orientation: CurrentTemporalOrientation;
  thread: ResumeProjection | null;
};

export function projectPresentMomentOrientation(input: {
  instant: Date;
  timeZone: string;
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
  externalTemporalFacts?: readonly ExternalTemporalFact[];
  externalTemporalContext?: ExternalTemporalTimelineContext;
  activeThread: ActiveThread | null;
  openTasks: readonly Task[];
}): PresentMomentOrientation {
  return {
    orientation: projectCurrentTemporalOrientation({
      instant: input.instant,
      timeZone: input.timeZone,
      workSchedule: input.workSchedule,
      protectedTime: input.protectedTime,
      blocks: input.blocks,
      commitments: input.commitments,
      externalTemporalFacts: input.externalTemporalFacts,
      externalTemporalContext: input.externalTemporalContext,
    }),
    thread: projectResume({
      activeThread: input.activeThread,
      openTasks: input.openTasks,
    }),
  };
}
