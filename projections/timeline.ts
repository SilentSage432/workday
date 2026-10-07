import { timedBlockEndsNextCivilDate, type Block } from "@/domain/block";
import {
  timedCommitmentEndsNextCivilDate,
  type Commitment,
  type CommitmentOrigin,
} from "@/domain/commitment";
import {
  admitsExternalFactToDayWeek,
  deriveExternalObservationFreshness,
  externalTimedLocalGeometry,
  type ExternalConnectionStatus,
  type ExternalFactLifecycle,
  type ExternalObservationFreshness,
  type ExternalTemporalFact,
  type ObservedTemporalSource,
} from "@/domain/externalTemporal";
import { timedProtectedTimeEndsNextCivilDate, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal, requireIanaTimeZone } from "@/domain/time/localTime";
import { addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import { shiftEndsNextCivilDate, type ShiftType, type WorkScheduleEntry } from "@/domain/workSchedule";

export const TIMELINE_SOURCE_KINDS = [
  "work_schedule",
  "protected_time",
  "block",
  "commitment",
  "external_temporal",
] as const;

export type TimelineSourceKind = (typeof TIMELINE_SOURCE_KINDS)[number];

/**
 * Half-open civil range: `startsOn` is included and `endsBefore` is not.
 * This is the caller's requested period. It is not today, this week, or now.
 */
export type CivilDateRange = {
  startsOn: string;
  endsBefore: string;
};

export type ResolvedTimelineInterval = {
  status: "resolved";
  start: Date;
  end: Date;
};

export type UnresolvedTimelineInterval = {
  status: "unresolved";
};

export type TimelineInterval = ResolvedTimelineInterval | UnresolvedTimelineInterval;

export type CivilTimelineInclusion = {
  status: "civil";
};

type TimedGeometry = {
  startsOn: string;
  allDay: false;
  startLocal: string;
  endLocal: string;
  endsNextCivilDate: boolean;
  bounds: TimelineInterval;
  intersection: TimelineInterval;
};

export type WorkScheduleTimelineFact = TimedGeometry & {
  sourceKind: "work_schedule";
  sourceId: string;
  shiftType: ShiftType;
};

export type ProtectedTimeTimelineFact = {
  sourceKind: "protected_time";
  sourceId: string;
  startsOn: string;
  label: string | null;
} & (
  | { allDay: true; intersection: CivilTimelineInclusion }
  | TimedGeometry
);

export type BlockTimelineFact = {
  sourceKind: "block";
  sourceId: string;
  startsOn: string;
  purpose: string;
  contextId: string | null;
  taskId: string | null;
} & (
  | { allDay: true; intersection: CivilTimelineInclusion }
  | TimedGeometry
);

export type CommitmentTimelineFact = {
  sourceKind: "commitment";
  sourceId: string;
  startsOn: string;
  title: string;
  origin: CommitmentOrigin;
} & (
  | { allDay: true; intersection: CivilTimelineInclusion }
  | TimedGeometry
);

/**
 * Provider-owned temporal evidence on the Timeline.
 * Provenance is retained for later UI; this is not Orient-owned truth.
 */
export type ExternalTemporalTimelineFact = {
  sourceKind: "external_temporal";
  sourceId: string;
  observedSourceId: string;
  sourceDisplayName: string;
  displayLabel: string;
  lifecycle: ExternalFactLifecycle;
  freshness: ExternalObservationFreshness;
  stale: boolean;
  correctionAuthority: "external";
  startsOn: string;
} & (
  | {
      allDay: true;
      endsBefore: string;
      intersection: CivilTimelineInclusion;
    }
  | TimedGeometry
);

export type TimelineFact =
  | WorkScheduleTimelineFact
  | ProtectedTimeTimelineFact
  | BlockTimelineFact
  | CommitmentTimelineFact
  | ExternalTemporalTimelineFact;

/** Optional source health + connection status for freshness derivation. */
export type ExternalTemporalTimelineContext = {
  sources: readonly ObservedTemporalSource[];
  connectionStatusById: Readonly<Record<string, ExternalConnectionStatus>>;
};

type RangeBounds = TimelineInterval;

/** Tie-break only. Not importance. */
const SOURCE_KIND_TIE_BREAK: Record<TimelineSourceKind, number> = {
  work_schedule: 0,
  protected_time: 1,
  block: 2,
  commitment: 3,
  external_temporal: 4,
};

const UNRESOLVABLE_LOCAL_TIME = "That local time does not occur once in this time zone.";

export function projectTimeline(input: {
  range: CivilDateRange;
  timeZone: string;
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
  /** Distinct external evidence. Omitted or empty until a real observation path supplies it. */
  externalTemporalFacts?: readonly ExternalTemporalFact[];
  externalTemporalContext?: ExternalTemporalTimelineContext;
}): TimelineFact[] {
  const timeZone = requireIanaTimeZone(input.timeZone);
  const range = requireCivilDateRange(input.range);
  const rangeBounds = resolveRangeBounds(range, timeZone);
  const facts: TimelineFact[] = [];

  for (const entry of input.workSchedule) {
    const fact = workFact(entry, range, timeZone, rangeBounds);
    if (fact) facts.push(fact);
  }
  for (const entry of input.protectedTime) {
    const fact = protectedFact(entry, range, timeZone, rangeBounds);
    if (fact) facts.push(fact);
  }
  for (const entry of input.blocks) {
    const fact = blockFact(entry, range, timeZone, rangeBounds);
    if (fact) facts.push(fact);
  }
  for (const entry of input.commitments) {
    const fact = commitmentFact(entry, range, timeZone, rangeBounds);
    if (fact) facts.push(fact);
  }
  for (const entry of input.externalTemporalFacts ?? []) {
    const fact = externalFact(entry, range, timeZone, rangeBounds, input.externalTemporalContext);
    if (fact) facts.push(fact);
  }

  facts.sort(compareFacts);
  return facts;
}

function requireCivilDateRange(range: CivilDateRange): CivilDateRange {
  const startsOn = formatCivilDate(parseCivilDate(range.startsOn));
  const endsBefore = formatCivilDate(parseCivilDate(range.endsBefore));
  if (startsOn >= endsBefore) {
    throw new Error("A timeline range must start before it ends.");
  }
  return { startsOn, endsBefore };
}

function resolveRangeBounds(range: CivilDateRange, timeZone: string): RangeBounds {
  try {
    return {
      status: "resolved",
      start: instantFromZonedLocal(range.startsOn, "00:00", timeZone),
      end: instantFromZonedLocal(range.endsBefore, "00:00", timeZone),
    };
  } catch (error) {
    if (!isUnresolvableLocalTime(error)) throw error;
    return { status: "unresolved" };
  }
}

function workFact(
  entry: WorkScheduleEntry,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): WorkScheduleTimelineFact | null {
  if (entry.state !== "scheduled") return null;
  const geometry = timedGeometry(
    entry.workOn,
    entry.startLocal,
    entry.endLocal,
    shiftEndsNextCivilDate(entry.startLocal, entry.endLocal),
    range,
    timeZone,
    rangeBounds,
  );
  if (geometry === null) return null;
  return {
    sourceKind: "work_schedule",
    sourceId: entry.workOn,
    shiftType: entry.shiftType,
    ...geometry,
  };
}

function protectedFact(
  entry: ProtectedTime,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): ProtectedTimeTimelineFact | null {
  if (entry.kind === "all_day") {
    if (!civilDateIncluded(entry.startsOn, range)) return null;
    return {
      sourceKind: "protected_time",
      sourceId: entry.id,
      startsOn: entry.startsOn,
      label: entry.label,
      allDay: true,
      intersection: { status: "civil" },
    };
  }

  const geometry = timedGeometry(
    entry.startsOn,
    entry.startLocal,
    entry.endLocal,
    timedProtectedTimeEndsNextCivilDate(entry.startLocal, entry.endLocal),
    range,
    timeZone,
    rangeBounds,
  );
  if (geometry === null) return null;
  return {
    sourceKind: "protected_time",
    sourceId: entry.id,
    label: entry.label,
    ...geometry,
  };
}

function blockFact(
  entry: Block,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): BlockTimelineFact | null {
  if (entry.kind === "all_day") {
    if (!civilDateIncluded(entry.startsOn, range)) return null;
    return {
      sourceKind: "block",
      sourceId: entry.id,
      startsOn: entry.startsOn,
      purpose: entry.purpose,
      contextId: entry.contextId,
      taskId: entry.taskId,
      allDay: true,
      intersection: { status: "civil" },
    };
  }

  const geometry = timedGeometry(
    entry.startsOn,
    entry.startLocal,
    entry.endLocal,
    timedBlockEndsNextCivilDate(entry.startLocal, entry.endLocal),
    range,
    timeZone,
    rangeBounds,
  );
  if (geometry === null) return null;
  return {
    sourceKind: "block",
    sourceId: entry.id,
    purpose: entry.purpose,
    contextId: entry.contextId,
    taskId: entry.taskId,
    ...geometry,
  };
}

function commitmentFact(
  entry: Commitment,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): CommitmentTimelineFact | null {
  if (entry.kind === "all_day") {
    if (!civilDateIncluded(entry.startsOn, range)) return null;
    return {
      sourceKind: "commitment",
      sourceId: entry.id,
      startsOn: entry.startsOn,
      title: entry.title,
      origin: entry.origin,
      allDay: true,
      intersection: { status: "civil" },
    };
  }

  const geometry = timedGeometry(
    entry.startsOn,
    entry.startLocal,
    entry.endLocal,
    timedCommitmentEndsNextCivilDate(entry.startLocal, entry.endLocal),
    range,
    timeZone,
    rangeBounds,
  );
  if (geometry === null) return null;
  return {
    sourceKind: "commitment",
    sourceId: entry.id,
    title: entry.title,
    origin: entry.origin,
    ...geometry,
  };
}

function externalFact(
  entry: ExternalTemporalFact,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
  context: ExternalTemporalTimelineContext | undefined,
): ExternalTemporalTimelineFact | null {
  const source = context?.sources.find((item) => item.id === entry.sourceId) ?? null;
  const connectionStatus =
    source === null
      ? ("connected" as const)
      : (context?.connectionStatusById[source.connectionId] ?? "connected");
  const freshness = deriveExternalObservationFreshness({
    connectionStatus,
    source: source ?? {
      lastAttemptResult: "success_complete",
      lastSuccessfulObservedAt: entry.lastObservedAt,
    },
  });
  if (!admitsExternalFactToDayWeek({ fact: entry, freshness })) return null;

  const provenance = {
    sourceKind: "external_temporal" as const,
    sourceId: entry.id,
    observedSourceId: entry.sourceId,
    sourceDisplayName: source?.displayName ?? "External source",
    displayLabel: entry.displayLabel,
    lifecycle: entry.lifecycle,
    freshness,
    stale: freshness !== "fresh",
    correctionAuthority: "external" as const,
  };

  if (entry.kind === "all_day") {
    if (!civilSpanIntersectsRange(entry.startsOn, entry.endsBefore, range)) return null;
    return {
      ...provenance,
      startsOn: entry.startsOn,
      allDay: true,
      endsBefore: entry.endsBefore,
      intersection: { status: "civil" },
    };
  }

  const geometry = externalTimedGeometry(entry, range, timeZone, rangeBounds);
  if (geometry === null) return null;
  return {
    ...provenance,
    ...geometry,
  };
}

function externalTimedGeometry(
  entry: Extract<ExternalTemporalFact, { kind: "timed" }>,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): TimedGeometry | null {
  const bounds: ResolvedTimelineInterval = {
    status: "resolved",
    start: entry.startAt,
    end: entry.endAt,
  };
  if (rangeBounds.status === "resolved") {
    const intersection = clipToRange(bounds, rangeBounds);
    if (intersection === null) return null;
    const local = externalTimedLocalGeometry(entry, timeZone);
    return {
      startsOn: local.startsOn,
      allDay: false,
      startLocal: local.startLocal,
      endLocal: local.endLocal,
      endsNextCivilDate: local.endsNextCivilDate,
      bounds,
      intersection,
    };
  }

  const local = externalTimedLocalGeometry(entry, timeZone);
  if (!claimedSpanMeetsRange(local.startsOn, local.endsNextCivilDate, range)) return null;
  return {
    startsOn: local.startsOn,
    allDay: false,
    startLocal: local.startLocal,
    endLocal: local.endLocal,
    endsNextCivilDate: local.endsNextCivilDate,
    bounds,
    intersection: { status: "unresolved" },
  };
}

function civilDateIncluded(startsOn: string, range: CivilDateRange): boolean {
  return startsOn >= range.startsOn && startsOn < range.endsBefore;
}

function civilSpanIntersectsRange(startsOn: string, endsBefore: string, range: CivilDateRange): boolean {
  return startsOn < range.endsBefore && endsBefore > range.startsOn;
}

function timedGeometry(
  startsOn: string,
  startLocal: string,
  endLocal: string,
  endsNextCivilDate: boolean,
  range: CivilDateRange,
  timeZone: string,
  rangeBounds: RangeBounds,
): TimedGeometry | null {
  const bounds = resolveTimedBounds(startsOn, startLocal, endLocal, endsNextCivilDate, timeZone);
  if (bounds.status === "resolved" && rangeBounds.status === "resolved") {
    const intersection = clipToRange(bounds, rangeBounds);
    if (intersection === null) return null;
    return {
      startsOn,
      allDay: false,
      startLocal,
      endLocal,
      endsNextCivilDate,
      bounds,
      intersection,
    };
  }

  if (!claimedSpanMeetsRange(startsOn, endsNextCivilDate, range)) return null;
  return {
    startsOn,
    allDay: false,
    startLocal,
    endLocal,
    endsNextCivilDate,
    bounds,
    intersection: { status: "unresolved" },
  };
}

function resolveTimedBounds(
  startsOn: string,
  startLocal: string,
  endLocal: string,
  endsNextCivilDate: boolean,
  timeZone: string,
): TimelineInterval {
  const endOn = endsNextCivilDate ? nextCivilDate(startsOn) : startsOn;
  try {
    return {
      status: "resolved",
      start: instantFromZonedLocal(startsOn, startLocal, timeZone),
      end: instantFromZonedLocal(endOn, endLocal, timeZone),
    };
  } catch (error) {
    if (!isUnresolvableLocalTime(error)) throw error;
    return { status: "unresolved" };
  }
}

function claimedSpanMeetsRange(startsOn: string, endsNextCivilDate: boolean, range: CivilDateRange): boolean {
  const endOn = endsNextCivilDate ? nextCivilDate(startsOn) : startsOn;
  return startsOn < range.endsBefore && endOn >= range.startsOn;
}

function clipToRange(bounds: ResolvedTimelineInterval, rangeBounds: ResolvedTimelineInterval): ResolvedTimelineInterval | null {
  const start = bounds.start.getTime() > rangeBounds.start.getTime() ? bounds.start : rangeBounds.start;
  const end = bounds.end.getTime() < rangeBounds.end.getTime() ? bounds.end : rangeBounds.end;
  if (start.getTime() >= end.getTime()) return null;
  return { status: "resolved", start, end };
}

function nextCivilDate(startsOn: string): string {
  return formatCivilDate(addCivilDays(parseCivilDate(startsOn), 1));
}

function isUnresolvableLocalTime(error: unknown): boolean {
  return error instanceof Error && error.message === UNRESOLVABLE_LOCAL_TIME;
}

function compareFacts(left: TimelineFact, right: TimelineFact): number {
  if (left.startsOn !== right.startsOn) return left.startsOn < right.startsOn ? -1 : 1;
  if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
  const leftLocal = left.allDay ? "" : left.startLocal;
  const rightLocal = right.allDay ? "" : right.startLocal;
  if (leftLocal !== rightLocal) return leftLocal < rightLocal ? -1 : 1;
  if (left.sourceKind !== right.sourceKind) {
    return SOURCE_KIND_TIE_BREAK[left.sourceKind] - SOURCE_KIND_TIE_BREAK[right.sourceKind];
  }
  if (left.sourceId !== right.sourceId) return left.sourceId < right.sourceId ? -1 : 1;
  return 0;
}
