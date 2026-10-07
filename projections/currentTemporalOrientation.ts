import { timedBlockEndsNextCivilDate, type Block } from "@/domain/block";
import { timedCommitmentEndsNextCivilDate, type Commitment } from "@/domain/commitment";
import {
  admitsExternalFactToPresent,
  deriveExternalObservationFreshness,
  externalAllDayContainsCivilDate,
  externalTimedContainsInstant,
  externalTimedLocalGeometry,
  type ExternalConnectionStatus,
  type ExternalFactLifecycle,
  type ExternalObservationFreshness,
  type ExternalTemporalFact,
} from "@/domain/externalTemporal";
import { timedProtectedTimeEndsNextCivilDate, type ProtectedTime } from "@/domain/protectedTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import type { ShiftType, WorkScheduleEntry } from "@/domain/workSchedule";
import { classifyBlock } from "@/projections/block";
import { classifyCommitment } from "@/projections/commitment";
import { classifyProtectedTime } from "@/projections/protectedTime";
import type { ExternalTemporalTimelineContext } from "@/projections/timeline";
import { projectWorkOrientation } from "@/projections/workOrientation";

/**
 * Facts that contain a supplied instant. This is not NOW.
 * Work contributes only the shift the existing Work orientation already
 * treats as the current schedule. Other kinds are not reduced to it.
 * Order matches Timeline's presentation order. It is not importance.
 */

export type CurrentTimedRange = {
  allDay: false;
  startLocal: string;
  endLocal: string;
  endsNextCivilDate: boolean;
};

export type CurrentAllDayRange = {
  allDay: true;
};

type CurrentTemporalBase = {
  sourceId: string;
  startsOn: string;
};

export type CurrentWorkReading = CurrentTemporalBase &
  CurrentTimedRange & {
    sourceKind: "work_schedule";
    shiftType: ShiftType;
  };

export type CurrentProtectedReading = CurrentTemporalBase & {
  sourceKind: "protected_time";
  label: string | null;
} & (CurrentAllDayRange | CurrentTimedRange);

export type CurrentBlockReading = CurrentTemporalBase & {
  sourceKind: "block";
  purpose: string;
  taskId: string | null;
} & (CurrentAllDayRange | CurrentTimedRange);

export type CurrentCommitmentReading = CurrentTemporalBase & {
  sourceKind: "commitment";
  title: string;
} & (CurrentAllDayRange | CurrentTimedRange);

export type CurrentExternalReading = CurrentTemporalBase & {
  sourceKind: "external_temporal";
  observedSourceId: string;
  sourceDisplayName: string;
  displayLabel: string;
  lifecycle: ExternalFactLifecycle;
  freshness: ExternalObservationFreshness;
  stale: boolean;
  correctionAuthority: "external";
} & (CurrentAllDayRange | CurrentTimedRange);

export type CurrentTemporalFact =
  | CurrentWorkReading
  | CurrentProtectedReading
  | CurrentBlockReading
  | CurrentCommitmentReading
  | CurrentExternalReading;

export type CurrentTemporalOrientation = {
  facts: CurrentTemporalFact[];
};

const SOURCE_KIND_TIE_BREAK = {
  work_schedule: 0,
  protected_time: 1,
  block: 2,
  commitment: 3,
  external_temporal: 4,
} as const;

export function projectCurrentTemporalOrientation(input: {
  instant: Date;
  timeZone: string;
  workSchedule: readonly WorkScheduleEntry[];
  protectedTime: readonly ProtectedTime[];
  blocks: readonly Block[];
  commitments: readonly Commitment[];
  externalTemporalFacts?: readonly ExternalTemporalFact[];
  externalTemporalContext?: ExternalTemporalTimelineContext;
}): CurrentTemporalOrientation {
  const facts: CurrentTemporalFact[] = [];
  const work = currentWork(input.instant, input.timeZone, input.workSchedule);
  if (work) facts.push(work);

  for (const entry of input.protectedTime) {
    if (classifyProtectedTime(entry, input.instant, input.timeZone) !== "current") continue;
    facts.push(protectedReading(entry));
  }
  for (const entry of input.blocks) {
    if (classifyBlock(entry, input.instant, input.timeZone) !== "current") continue;
    facts.push(blockReading(entry));
  }
  for (const entry of input.commitments) {
    if (classifyCommitment(entry, input.instant, input.timeZone) !== "current") continue;
    facts.push(commitmentReading(entry));
  }
  for (const entry of input.externalTemporalFacts ?? []) {
    const reading = externalReading(entry, input.instant, input.timeZone, input.externalTemporalContext);
    if (reading) facts.push(reading);
  }

  facts.sort(compareFacts);
  return { facts };
}

function currentWork(
  instant: Date,
  timeZone: string,
  entries: readonly WorkScheduleEntry[],
): CurrentWorkReading | null {
  const workDate = formatCivilDate(civilDateInTimeZone(instant, timeZone));
  const previousDate = formatCivilDate(addCivilDays(parseCivilDate(workDate), -1));
  const orientation = projectWorkOrientation({
    instant,
    timeZone,
    todayEntry: entryOn(entries, workDate),
    previousEntry: entryOn(entries, previousDate),
  });
  if (orientation.schedule.state !== "scheduled" || orientation.schedule.position !== "during") {
    return null;
  }
  const schedule = orientation.schedule;
  return {
    sourceKind: "work_schedule",
    sourceId: schedule.scheduledOn,
    startsOn: schedule.scheduledOn,
    allDay: false,
    startLocal: schedule.startLocal,
    endLocal: schedule.endLocal,
    endsNextCivilDate: schedule.endsNextCivilDate,
    shiftType: schedule.shiftType,
  };
}

function entryOn(
  entries: readonly WorkScheduleEntry[],
  workOn: string,
): WorkScheduleEntry | null {
  return entries.find((entry) => entry.workOn === workOn) ?? null;
}

function protectedReading(entry: ProtectedTime): CurrentProtectedReading {
  const shared = {
    sourceKind: "protected_time" as const,
    sourceId: entry.id,
    startsOn: entry.startsOn,
    label: entry.label,
  };
  if (entry.kind === "all_day") {
    return { ...shared, allDay: true };
  }
  return {
    ...shared,
    allDay: false,
    startLocal: entry.startLocal,
    endLocal: entry.endLocal,
    endsNextCivilDate: timedProtectedTimeEndsNextCivilDate(entry.startLocal, entry.endLocal),
  };
}

function blockReading(entry: Block): CurrentBlockReading {
  const shared = {
    sourceKind: "block" as const,
    sourceId: entry.id,
    startsOn: entry.startsOn,
    purpose: entry.purpose,
    taskId: entry.taskId,
  };
  if (entry.kind === "all_day") {
    return { ...shared, allDay: true };
  }
  return {
    ...shared,
    allDay: false,
    startLocal: entry.startLocal,
    endLocal: entry.endLocal,
    endsNextCivilDate: timedBlockEndsNextCivilDate(entry.startLocal, entry.endLocal),
  };
}

function commitmentReading(entry: Commitment): CurrentCommitmentReading {
  const shared = {
    sourceKind: "commitment" as const,
    sourceId: entry.id,
    startsOn: entry.startsOn,
    title: entry.title,
  };
  if (entry.kind === "all_day") {
    return { ...shared, allDay: true };
  }
  return {
    ...shared,
    allDay: false,
    startLocal: entry.startLocal,
    endLocal: entry.endLocal,
    endsNextCivilDate: timedCommitmentEndsNextCivilDate(entry.startLocal, entry.endLocal),
  };
}

function externalReading(
  entry: ExternalTemporalFact,
  instant: Date,
  timeZone: string,
  context: ExternalTemporalTimelineContext | undefined,
): CurrentExternalReading | null {
  const source = context?.sources.find((item) => item.id === entry.sourceId) ?? null;
  const connectionStatus: ExternalConnectionStatus =
    source === null
      ? "connected"
      : (context?.connectionStatusById[source.connectionId] ?? "connected");
  const freshness = deriveExternalObservationFreshness({
    connectionStatus,
    source: source ?? {
      lastAttemptResult: "success_complete",
      lastSuccessfulObservedAt: entry.lastObservedAt,
    },
  });
  if (!admitsExternalFactToPresent({ fact: entry, freshness })) return null;

  if (entry.kind === "timed") {
    if (!externalTimedContainsInstant(entry, instant)) return null;
    const local = externalTimedLocalGeometry(entry, timeZone);
    return {
      sourceKind: "external_temporal",
      sourceId: entry.id,
      startsOn: local.startsOn,
      observedSourceId: entry.sourceId,
      sourceDisplayName: source?.displayName ?? "External source",
      displayLabel: entry.displayLabel,
      lifecycle: entry.lifecycle,
      freshness,
      stale: false,
      correctionAuthority: "external",
      allDay: false,
      startLocal: local.startLocal,
      endLocal: local.endLocal,
      endsNextCivilDate: local.endsNextCivilDate,
    };
  }

  const civilToday = formatCivilDate(civilDateInTimeZone(instant, timeZone));
  if (!externalAllDayContainsCivilDate(entry, civilToday)) return null;
  return {
    sourceKind: "external_temporal",
    sourceId: entry.id,
    startsOn: entry.startsOn,
    observedSourceId: entry.sourceId,
    sourceDisplayName: source?.displayName ?? "External source",
    displayLabel: entry.displayLabel,
    lifecycle: entry.lifecycle,
    freshness,
    stale: false,
    correctionAuthority: "external",
    allDay: true,
  };
}

function compareFacts(left: CurrentTemporalFact, right: CurrentTemporalFact): number {
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
