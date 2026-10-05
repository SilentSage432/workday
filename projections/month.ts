import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { projectTimeline, type CivilDateRange, type TimelineFact } from "@/projections/timeline";
import { canonicalWeekRange } from "@/projections/weekShape";

/**
 * Direction beside temporal structure for one explicit civil range.
 * Destinations, Priorities, and service pairs are retained truths.
 * They are not filtered by the range. Temporal facts are Timeline's facts.
 * An empty temporal list is nothing established from the participating sources.
 * It is not an available interval.
 */
export type MonthPerception = {
  range: CivilDateRange;
  destinations: Destination[];
  priorities: Priority[];
  temporalFacts: TimelineFact[];
  taskPriorityService: TaskPriorityService[];
  blockPriorityService: BlockPriorityService[];
  citedTasks: CitedTaskIdentity[];
};

/**
 * Composes an explicit half-open civil range with retained direction and
 * Timeline's placement. It does not place facts itself, and it does not know
 * whether a read failed. Service pairs stay two collections. A cited task
 * that no retained Task pair names is omitted. A pair is not dropped here.
 */
export function projectMonth(input: {
  range: CivilDateRange;
  timeZone: string;
  destinations: readonly Destination[];
  priorities: readonly Priority[];
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
  taskPriorityService: readonly TaskPriorityService[];
  blockPriorityService: readonly BlockPriorityService[];
  citedTasks: readonly CitedTaskIdentity[];
}): MonthPerception {
  const range = canonicalWeekRange(input.range);
  const citedIds = new Set(input.taskPriorityService.map((pair) => pair.taskId));
  return {
    range,
    destinations: [...input.destinations],
    priorities: [...input.priorities],
    temporalFacts: projectTimeline({
      range,
      timeZone: input.timeZone,
      workSchedule: input.workSchedule,
      protectedTime: input.protectedTime,
      blocks: input.blocks,
      commitments: input.commitments,
    }),
    taskPriorityService: [...input.taskPriorityService],
    blockPriorityService: [...input.blockPriorityService],
    citedTasks: input.citedTasks.filter((task) => citedIds.has(task.id)),
  };
}
