import type { Task } from "@/domain/task";
import {
  lowesFiscalWeekCycleKeyForCivilDate,
  workdayCycleKeyFromEntry,
  type StewardshipCycleKind,
  type StewardshipDefinition,
  type StewardshipDefinitionRevision,
  type StewardshipSatisfaction,
} from "@/domain/stewardship";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import {
  civilWorkDateAt,
  operativeWorkdayCycleKey,
  previousCivilWorkDate,
  readStewardshipOccurrence,
} from "@/projections/stewardship";

function openOnly(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => task.completedAt === null);
}

function byCreatedThenId(a: Task, b: Task): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

function byPlannedLocalThenCreated(a: Task, b: Task): number {
  const aLocal = a.plannedLocal;
  const bLocal = b.plannedLocal;
  if (aLocal === null && bLocal !== null) return 1;
  if (aLocal !== null && bLocal === null) return -1;
  if (aLocal !== null && bLocal !== null && aLocal !== bLocal) {
    return aLocal < bLocal ? -1 : 1;
  }
  return byCreatedThenId(a, b);
}

function entryOn(
  entries: readonly WorkScheduleEntry[],
  workOn: string,
): WorkScheduleEntry | null {
  return entries.find((entry) => entry.workOn === workOn) ?? null;
}

/**
 * ACT stewardship follows the instrument viewpoint (anchor).
 * When the viewpoint is the civil date of `now`, overnight uses the operative
 * Scheduled work_on. Today Tasks also use the same viewpoint civil date.
 */
export function actStewardshipWorkContext(input: {
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  workEntries: readonly WorkScheduleEntry[];
}): {
  workdayCycleKey: string | null;
  weeklyCycleKey: string;
  gateEntry: WorkScheduleEntry | null;
} {
  const civilNow = civilWorkDateAt(input.now, input.timeZone);
  if (input.viewpointCivilDate === civilNow) {
    const todayEntry = entryOn(input.workEntries, civilNow);
    const previousEntry = entryOn(input.workEntries, previousCivilWorkDate(civilNow));
    const workdayCycleKey = operativeWorkdayCycleKey({
      instant: input.now,
      timeZone: input.timeZone,
      todayEntry,
      previousEntry,
    });
    const gateEntry =
      workdayCycleKey !== null ? entryOn(input.workEntries, workdayCycleKey) : todayEntry;
    return {
      workdayCycleKey,
      weeklyCycleKey: lowesFiscalWeekCycleKeyForCivilDate(input.viewpointCivilDate),
      gateEntry,
    };
  }

  const gateEntry = entryOn(input.workEntries, input.viewpointCivilDate);
  return {
    workdayCycleKey: workdayCycleKeyFromEntry(gateEntry),
    weeklyCycleKey: lowesFiscalWeekCycleKeyForCivilDate(input.viewpointCivilDate),
    gateEntry,
  };
}

export type ActStewardshipRow = {
  definitionId: string;
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
  wording: string;
  cycleLabel: "Workday" | "This week";
  contextId: string | null;
};

export type ActAttentionComposition = {
  mustDo: Task[];
  stewardship: ActStewardshipRow[];
  today: Task[];
  otherOpen: Task[];
};

function projectActStewardshipRows(input: {
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  workEntries: readonly WorkScheduleEntry[];
  definitions: readonly StewardshipDefinition[];
  revisions: readonly StewardshipDefinitionRevision[];
  satisfactions: readonly StewardshipSatisfaction[];
}): ActStewardshipRow[] {
  const { workdayCycleKey, weeklyCycleKey, gateEntry } = actStewardshipWorkContext(input);
  if (gateEntry?.state !== "scheduled") {
    return [];
  }

  const rows: ActStewardshipRow[] = [];
  for (const definition of input.definitions) {
    if (definition.retiredAt !== null) {
      // Still may be active for current cycle via overlap; readStewardshipOccurrence decides.
    }
    const cycleKey =
      definition.cycleKind === "workday" ? workdayCycleKey : weeklyCycleKey;
    if (cycleKey === null) continue;

    const revisions = input.revisions.filter((revision) => revision.definitionId === definition.id);
    const reading = readStewardshipOccurrence({
      definition,
      revisions,
      satisfactions: input.satisfactions,
      cycleKind: definition.cycleKind,
      cycleKey,
      timeZone: input.timeZone,
      workEntries: input.workEntries,
      viewpointWorkEntry: gateEntry,
    });
    if (!reading.actPrimaryEligible || !reading.notYetSatisfied) continue;
    if (!reading.wording) continue;
    rows.push({
      definitionId: definition.id,
      cycleKind: definition.cycleKind,
      cycleKey,
      wording: reading.wording,
      cycleLabel: definition.cycleKind === "workday" ? "Workday" : "This week",
      contextId: definition.contextId,
    });
  }

  return rows.sort((a, b) => {
    if (a.cycleKind !== b.cycleKind) {
      return a.cycleKind === "workday" ? -1 : 1;
    }
    if (a.wording !== b.wording) return a.wording < b.wording ? -1 : 1;
    return a.definitionId < b.definitionId ? -1 : 1;
  });
}

/**
 * Deterministic ACT actionable-attention composition.
 * Section order is navigation structure, not algorithmic importance.
 */
export function composeActAttention(input: {
  openTasks: readonly Task[];
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  workEntries: readonly WorkScheduleEntry[];
  definitions: readonly StewardshipDefinition[];
  revisions: readonly StewardshipDefinitionRevision[];
  satisfactions: readonly StewardshipSatisfaction[];
}): ActAttentionComposition {
  const open = openOnly(input.openTasks);
  const mustDo = open.filter((task) => task.mustDo).sort(byCreatedThenId);
  const today = open
    .filter((task) => !task.mustDo && task.plannedOn === input.viewpointCivilDate)
    .sort(byPlannedLocalThenCreated);
  const otherOpen = open
    .filter((task) => !task.mustDo && task.plannedOn !== input.viewpointCivilDate)
    .sort(byCreatedThenId);
  const stewardship = projectActStewardshipRows(input);
  return { mustDo, stewardship, today, otherOpen };
}

/**
 * Legacy flat order for tests that still need MustDo → Today → remaining.
 * Other open is included after primary sections; UI treats it as secondary.
 */
export function orderActTasks(input: {
  openTasks: readonly Task[];
  viewpointCivilDate: string;
}): Task[] {
  const open = openOnly(input.openTasks);
  const mustDo = open.filter((task) => task.mustDo).sort(byCreatedThenId);
  const plannedForViewpoint = open
    .filter((task) => !task.mustDo && task.plannedOn === input.viewpointCivilDate)
    .sort(byPlannedLocalThenCreated);
  const remaining = open
    .filter((task) => !task.mustDo && task.plannedOn !== input.viewpointCivilDate)
    .sort(byCreatedThenId);
  return [...mustDo, ...plannedForViewpoint, ...remaining];
}
