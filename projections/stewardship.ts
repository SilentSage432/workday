import {
  cycleInterval,
  definitionActiveForCycle,
  findSatisfaction,
  lowesFiscalWeekCycleKey,
  occurrenceIdentity,
  wordingForOccurrence,
  workdayCycleKeyFromEntry,
  type StewardshipCycleKind,
  type StewardshipDefinition,
  type StewardshipDefinitionRevision,
  type StewardshipOccurrenceIdentity,
  type StewardshipSatisfaction,
} from "@/domain/stewardship";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { projectWorkDay } from "@/projections/workDay";

export type StewardshipOccurrenceReading = {
  identity: StewardshipOccurrenceIdentity;
  wording: string | null;
  admitted: boolean;
  /** Persistence-level relevance for the cycle (Scheduled for workday; always for fiscal week when active). */
  relevant: boolean;
  /**
   * Future ACT primary-visibility gate: Scheduled Work on the operative/viewpoint work date.
   * Weekly occurrences still exist on Off; primary ACT will not demand them there.
   */
  actPrimaryEligible: boolean;
  satisfied: boolean;
  satisfiedAt: string | null;
  /** Admitted and not satisfied — "not yet satisfied this cycle." */
  notYetSatisfied: boolean;
};

/**
 * Operative workday cycle key at an instant, including overnight continuation
 * owned by the previous civil date's Scheduled work_on.
 */
export function operativeWorkdayCycleKey(input: {
  instant: Date;
  timeZone: string;
  todayEntry: WorkScheduleEntry | null;
  previousEntry: WorkScheduleEntry | null;
}): string | null {
  const todayFact =
    input.todayEntry === null
      ? null
      : projectWorkDay({
          entry: input.todayEntry,
          timeZone: input.timeZone,
          instant: input.instant,
        });
  const previousFact =
    input.previousEntry === null
      ? null
      : projectWorkDay({
          entry: input.previousEntry,
          timeZone: input.timeZone,
          instant: input.instant,
        });

  if (todayFact?.state === "scheduled" && todayFact.position === "during" && input.todayEntry) {
    return input.todayEntry.workOn;
  }
  if (
    previousFact?.state === "scheduled" &&
    previousFact.position === "during" &&
    input.previousEntry
  ) {
    return input.previousEntry.workOn;
  }
  if (todayFact?.state === "scheduled" && input.todayEntry) {
    return input.todayEntry.workOn;
  }
  return null;
}

export function currentCycleKeyForDefinition(input: {
  cycleKind: StewardshipCycleKind;
  instant: Date;
  timeZone: string;
  todayEntry: WorkScheduleEntry | null;
  previousEntry: WorkScheduleEntry | null;
}): string | null {
  if (input.cycleKind === "workday") {
    return operativeWorkdayCycleKey({
      instant: input.instant,
      timeZone: input.timeZone,
      todayEntry: input.todayEntry,
      previousEntry: input.previousEntry,
    });
  }
  return lowesFiscalWeekCycleKey(input.instant, input.timeZone);
}

function entryOn(
  entries: readonly WorkScheduleEntry[],
  workOn: string,
): WorkScheduleEntry | null {
  return entries.find((entry) => entry.workOn === workOn) ?? null;
}

/**
 * Workday relevance for a cycle key: Scheduled admits; Off and missing do not.
 * Fiscal-week relevance does not require per-day Scheduled (occurrence still exists on Off).
 */
export function cycleRelevant(input: {
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
  workEntries: readonly WorkScheduleEntry[];
}): boolean {
  if (input.cycleKind === "lowes_fiscal_week") {
    return true;
  }
  return workdayCycleKeyFromEntry(entryOn(input.workEntries, input.cycleKey)) === input.cycleKey;
}

/**
 * Future ACT primary gate: viewpoint/operative work date must be Scheduled.
 * Weekly persistence relevance is separate from this gate.
 */
export function actPrimaryEligibleForStewardship(input: {
  viewpointWorkEntry: WorkScheduleEntry | null;
}): boolean {
  return input.viewpointWorkEntry?.state === "scheduled";
}

export function readStewardshipOccurrence(input: {
  definition: StewardshipDefinition;
  revisions: readonly StewardshipDefinitionRevision[];
  satisfactions: readonly StewardshipSatisfaction[];
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
  timeZone: string;
  workEntries: readonly WorkScheduleEntry[];
  /** Work entry for the ACT viewpoint / operative civil work date (Scheduled gate). */
  viewpointWorkEntry: WorkScheduleEntry | null;
}): StewardshipOccurrenceReading {
  const identity = occurrenceIdentity({
    definitionId: input.definition.id,
    cycleKind: input.cycleKind,
    cycleKey: input.cycleKey,
  });
  const { start, end } = cycleInterval({
    cycleKind: input.cycleKind,
    cycleKey: identity.cycleKey,
    timeZone: input.timeZone,
  });
  const active = definitionActiveForCycle({
    definition: input.definition,
    cycleStart: start,
    cycleEnd: end,
  });
  const relevant = active && cycleRelevant({
    cycleKind: input.cycleKind,
    cycleKey: identity.cycleKey,
    workEntries: input.workEntries,
  });
  const actPrimaryEligible =
    relevant && actPrimaryEligibleForStewardship({ viewpointWorkEntry: input.viewpointWorkEntry });
  const admitted = relevant;
  const satisfaction = findSatisfaction(input.satisfactions, identity);
  const satisfied = satisfaction !== null;
  return {
    identity,
    wording: wordingForOccurrence({
      definition: input.definition,
      revisions: input.revisions,
      cycleStart: start,
      cycleEnd: end,
    }),
    admitted,
    relevant,
    actPrimaryEligible,
    satisfied,
    satisfiedAt: satisfaction?.satisfiedAt ?? null,
    notYetSatisfied: admitted && !satisfied,
  };
}

/** Civil work date before the supplied civil date (for overnight previous entry). */
export function previousCivilWorkDate(civilDate: string): string {
  return formatCivilDate(addCivilDays(parseCivilDate(civilDate), -1));
}

export function civilWorkDateAt(instant: Date, timeZone: string): string {
  return formatCivilDate(civilDateInTimeZone(instant, timeZone));
}
