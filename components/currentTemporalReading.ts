import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type {
  ExternalConnection,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  projectCurrentTemporalOrientation,
  type CurrentTemporalFact,
} from "@/projections/currentTemporalOrientation";
import type { ExternalTemporalTimelineContext } from "@/projections/timeline";

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

export function externalTemporalContextFromReads(input: {
  externalConnections?: SourceRead<ExternalConnection>;
  externalSources?: SourceRead<ObservedTemporalSource>;
}): ExternalTemporalTimelineContext | undefined {
  if (
    !input.externalConnections ||
    !input.externalSources ||
    input.externalConnections.status !== "ready" ||
    input.externalSources.status !== "ready"
  ) {
    return undefined;
  }
  const connectionStatusById: Record<string, ExternalConnection["status"]> = {};
  for (const connection of input.externalConnections.rows) {
    connectionStatusById[connection.id] = connection.status;
  }
  return {
    sources: input.externalSources.rows,
    connectionStatusById,
  };
}

/**
 * Decides whether the current temporal orientation may be shown.
 * The projection stays a pure reading of the rows it is given.
 * A failed Orient-owned source is not an empty source.
 * A failed external read does not erase Orient-owned readiness; external evidence is omitted.
 */
export function composeCurrentTemporalReading(input: {
  instant: Date;
  timeZone: string;
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  externalConnections?: SourceRead<ExternalConnection>;
  externalSources?: SourceRead<ObservedTemporalSource>;
  externalFacts?: SourceRead<ExternalTemporalFact>;
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
  return {
    status: "complete",
    facts: projectCurrentTemporalOrientation({
      instant: input.instant,
      timeZone: input.timeZone,
      workSchedule: input.work.rows,
      protectedTime: input.protectedTime.rows,
      blocks: input.blocks.rows,
      commitments: input.commitments.rows,
      externalTemporalFacts: externalTemporalFacts,
      externalTemporalContext: externalTemporalContextFromReads({
        externalConnections: externalConnectionsRead,
        externalSources: externalSourcesRead,
      }),
    }).facts,
  };
}
