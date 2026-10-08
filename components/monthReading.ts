import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Destination } from "@/domain/destination";
import type {
  ExternalConnection,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  externalTemporalContextFromReads,
  type SourceRead,
} from "@/components/currentTemporalReading";
import { projectMonth, type MonthPerception } from "@/projections/month";
import type { CivilDateRange } from "@/projections/timeline";
import { canonicalWeekRange, weekLoadedSpan } from "@/projections/weekShape";

export type MonthEvidenceWindow = {
  from: string;
  to: string;
};

export type MonthReading =
  | ({ status: "complete" } & MonthPerception)
  | { status: "incomplete"; message: string };

const INCOMPLETE = "Month could not be completed.";

/**
 * Month for an explicit half-open civil range.
 * Timeline composes temporal facts. Direction and service pairs are retained
 * truths and are not placed in the range. The reading withholds every part
 * unless each required source is ready and the declared temporal load covers
 * Timeline's look-behind. `weekLoadedSpan` is that look-behind. A ready empty
 * collection is complete evidence. A missing cited task identity is not.
 */
export function composeMonthReading(input: {
  range: CivilDateRange;
  timeZone: string;
  loaded: MonthEvidenceWindow;
  destinations: SourceRead<Destination>;
  priorities: SourceRead<Priority>;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  taskPriorityService: SourceRead<TaskPriorityService>;
  blockPriorityService: SourceRead<BlockPriorityService>;
  citedTasks: SourceRead<CitedTaskIdentity>;
  externalConnections?: SourceRead<ExternalConnection>;
  externalSources?: SourceRead<ObservedTemporalSource>;
  externalFacts?: SourceRead<ExternalTemporalFact>;
}): MonthReading {
  const range = canonicalWeekRange(input.range);
  const sources = [
    input.destinations,
    input.priorities,
    input.work,
    input.protectedTime,
    input.blocks,
    input.commitments,
    input.taskPriorityService,
    input.blockPriorityService,
    input.citedTasks,
  ];
  const failure = failedMessage(sources);
  if (failure) return { status: "incomplete", message: failure };
  if (
    input.destinations.status !== "ready" ||
    input.priorities.status !== "ready" ||
    input.work.status !== "ready" ||
    input.protectedTime.status !== "ready" ||
    input.blocks.status !== "ready" ||
    input.commitments.status !== "ready" ||
    input.taskPriorityService.status !== "ready" ||
    input.blockPriorityService.status !== "ready" ||
    input.citedTasks.status !== "ready"
  ) {
    return { status: "incomplete", message: INCOMPLETE };
  }

  const from = formatCivilDate(parseCivilDate(input.loaded.from));
  const to = formatCivilDate(parseCivilDate(input.loaded.to));
  const required = weekLoadedSpan(range);
  if (from > to || from > required.from || to < required.to) {
    return { status: "incomplete", message: `${INCOMPLETE} The read does not cover this range.` };
  }

  const named = new Set(input.citedTasks.rows.map((task) => task.id));
  if (input.taskPriorityService.rows.some((pair) => !named.has(pair.taskId))) {
    return { status: "incomplete", message: `${INCOMPLETE} A cited task identity is missing.` };
  }

  const externalFactsRead = input.externalFacts;
  const externalSourcesRead = input.externalSources;
  const externalConnectionsRead = input.externalConnections;
  const externalTemporalFacts =
    externalFactsRead &&
    externalSourcesRead &&
    externalConnectionsRead &&
    externalFactsRead.status === "ready" &&
    externalSourcesRead.status === "ready" &&
    externalConnectionsRead.status === "ready"
      ? externalFactsRead.rows
      : [];

  const perception = projectMonth({
    range,
    timeZone: input.timeZone,
    destinations: input.destinations.rows,
    priorities: input.priorities.rows,
    workSchedule: input.work.rows,
    protectedTime: input.protectedTime.rows,
    blocks: input.blocks.rows,
    commitments: input.commitments.rows,
    taskPriorityService: input.taskPriorityService.rows,
    blockPriorityService: input.blockPriorityService.rows,
    citedTasks: input.citedTasks.rows,
    externalTemporalFacts,
    externalTemporalContext: externalTemporalContextFromReads({
      externalConnections: externalConnectionsRead,
      externalSources: externalSourcesRead,
    }),
  });
  return { status: "complete", ...perception };
}

function failedMessage(sources: readonly SourceRead<unknown>[]): string | null {
  const messages = sources.flatMap((source) => (source.status === "failed" ? [source.message] : []));
  if (messages.length === 0) return null;
  return `${INCOMPLETE} ${messages.join(" ")}`;
}
