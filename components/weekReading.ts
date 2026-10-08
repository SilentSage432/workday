import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type {
  ExternalConnection,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { ProtectedTime } from "@/domain/protectedTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  canonicalWeekRange,
  projectWeekShape,
  weekLoadedSpan,
  type WeekShape,
} from "@/projections/weekShape";
import {
  externalTemporalContextFromReads,
  type SourceRead,
} from "@/components/currentTemporalReading";
import type { CivilDateRange } from "@/projections/timeline";

/**
 * Inclusive civil dates the caller actually loaded.
 * Completeness is this declaration plus ready sources.
 * It is not inferred from which rows happen to be in the arrays.
 */
export type WeekEvidenceWindow = {
  from: string;
  to: string;
};

export type WeekShapeReading =
  | ({ status: "complete" } & WeekShape)
  | { status: "incomplete"; message: string };

const INCOMPLETE = "Week shape could not be completed.";

/**
 * Week shape for an explicit half-open civil range.
 * Timeline composes the facts. This reading withholds them unless Work,
 * Protected Time, Commitments, and Blocks were all read for the whole
 * look-behind span. A ready empty collection is complete evidence.
 */
export function composeWeekShapeReading(input: {
  range: CivilDateRange;
  timeZone: string;
  loaded: WeekEvidenceWindow;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  externalConnections?: SourceRead<ExternalConnection>;
  externalSources?: SourceRead<ObservedTemporalSource>;
  externalFacts?: SourceRead<ExternalTemporalFact>;
}): WeekShapeReading {
  const range = canonicalWeekRange(input.range);
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

  const from = formatCivilDate(parseCivilDate(input.loaded.from));
  const to = formatCivilDate(parseCivilDate(input.loaded.to));
  const required = weekLoadedSpan(range);
  if (from > to || from > required.from || to < required.to) {
    return { status: "incomplete", message: `${INCOMPLETE} The read does not cover this range.` };
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

  const shape = projectWeekShape({
    range,
    timeZone: input.timeZone,
    workSchedule: input.work.rows,
    protectedTime: input.protectedTime.rows,
    blocks: input.blocks.rows,
    commitments: input.commitments.rows,
    externalTemporalFacts,
    externalTemporalContext: externalTemporalContextFromReads({
      externalConnections: externalConnectionsRead,
      externalSources: externalSourcesRead,
    }),
  });
  return { status: "complete", range: shape.range, facts: shape.facts };
}

function failedMessage(sources: readonly SourceRead<unknown>[]): string | null {
  const messages = sources.flatMap((source) => (source.status === "failed" ? [source.message] : []));
  if (messages.length === 0) return null;
  return `${INCOMPLETE} ${messages.join(" ")}`;
}
