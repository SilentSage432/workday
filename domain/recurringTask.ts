import { requireIanaTimeZone } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
  workFiscalWeekContaining,
  workFiscalWeekStart,
} from "@/domain/time/workFiscalWeek";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RECURRING_TASK_CYCLE_KIND = "lowes_fiscal_week" as const;

export type RecurringTaskCycleKind = typeof RECURRING_TASK_CYCLE_KIND;

export const RECURRING_TASK_WEEKDAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

export type RecurringTaskWeekday = (typeof RECURRING_TASK_WEEKDAYS)[number];

const WEEKDAY_OFFSET: Record<RecurringTaskWeekday, number> = {
  sat: 0,
  sun: 1,
  mon: 2,
  tue: 3,
  wed: 4,
  thu: 5,
  fri: 6,
};

const WEEKDAY_LABEL: Record<RecurringTaskWeekday, string> = {
  sat: "Saturday",
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

export type RecurringTaskDefinition = {
  id: string;
  title: string;
  contextId: string | null;
  cycleKind: RecurringTaskCycleKind;
  availableWeekday: RecurringTaskWeekday;
  dueWeekday: RecurringTaskWeekday;
  establishedAt: string;
  retiredAt: string | null;
};

export type RecurringTaskOccurrence = {
  definitionId: string;
  taskId: string;
  cycleKind: RecurringTaskCycleKind;
  cycleKey: string;
  materializedAt: string;
};

export type NewRecurringTaskDefinition = {
  id: string;
  title: string;
  contextId?: string | null;
  availableWeekday: RecurringTaskWeekday;
  dueWeekday: RecurringTaskWeekday;
  establishedAt: Date;
};

export type RecurringTaskDefinitionPatch = {
  title?: string;
  contextId?: string | null;
  availableWeekday?: RecurringTaskWeekday;
  dueWeekday?: RecurringTaskWeekday;
};

export function isRecurringTaskWeekday(value: string): value is RecurringTaskWeekday {
  return (RECURRING_TASK_WEEKDAYS as readonly string[]).includes(value);
}

export function requireRecurringTaskWeekday(value: string): RecurringTaskWeekday {
  if (!isRecurringTaskWeekday(value)) {
    throw new Error("A recurring Task weekday must be sat through fri.");
  }
  return value;
}

export function recurringTaskWeekdayLabel(weekday: RecurringTaskWeekday): string {
  return WEEKDAY_LABEL[weekday];
}

export function recurringTaskWeekdayOffset(weekday: RecurringTaskWeekday): number {
  return WEEKDAY_OFFSET[weekday];
}

export function requireRecurringTaskId(id: string, label = "recurring Task definition"): string {
  if (!UUID.test(id)) {
    throw new Error(`A ${label} needs a stable identity.`);
  }
  return id;
}

export function requireRecurringTaskTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error("A recurring Task needs the human's words.");
  }
  return trimmed;
}

export function requireRecurringTaskInstant(value: Date, label: string): string {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} requires a real instant.`);
  }
  return value.toISOString();
}

export function requireRecurringTaskInstantText(value: string, label: string): string {
  if (!value.includes("T")) {
    throw new Error(`${label} requires a real instant.`);
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`${label} requires a real instant.`);
  }
  return instant.toISOString();
}

export function requireOptionalContextId(contextId: string | null | undefined): string | null {
  if (contextId == null || contextId.length === 0) {
    return null;
  }
  return requireRecurringTaskId(contextId, "context");
}

export function requireRecurringTaskCycleKey(value: string): string {
  const key = formatCivilDate(parseCivilDate(value));
  if (workFiscalWeekContaining(key) !== key) {
    throw new Error("A recurring Task cycle key must be a Lowe's fiscal-week Saturday.");
  }
  return key;
}

/** Civil date for a weekday inside a Lowe's fiscal week identified by Saturday cycle_key. */
export function civilDateForRecurringWeekday(cycleKey: string, weekday: RecurringTaskWeekday): string {
  const start = parseCivilDate(requireRecurringTaskCycleKey(cycleKey));
  return formatCivilDate(addCivilDays(start, recurringTaskWeekdayOffset(weekday)));
}

export function currentRecurringTaskCycleKey(instant: Date, timeZone: string): string {
  return formatCivilDate(workFiscalWeekStart(instant, timeZone));
}

/**
 * Whether this fiscal week may receive a materialization for the definition
 * given actual local civil now (not navigated viewpoint).
 *
 * Establishment cutoff is civil: ineligible when
 * civilDate(established_at, orientTimeZone) >= weekEnd (next Saturday).
 */
export function recurringTaskWeekEligible(input: {
  definition: Pick<
    RecurringTaskDefinition,
    "availableWeekday" | "dueWeekday" | "establishedAt" | "retiredAt"
  >;
  cycleKey: string;
  civilNow: string;
  timeZone: string;
}): boolean {
  if (input.definition.retiredAt !== null) {
    return false;
  }
  const timeZone = requireIanaTimeZone(input.timeZone);
  const cycleKey = requireRecurringTaskCycleKey(input.cycleKey);
  const civilNow = formatCivilDate(parseCivilDate(input.civilNow));
  const availableOn = civilDateForRecurringWeekday(cycleKey, input.definition.availableWeekday);
  if (civilNow < availableOn) {
    return false;
  }
  const weekEnd = formatCivilDate(addCivilDays(parseCivilDate(cycleKey), 7));
  const establishedInstant = new Date(input.definition.establishedAt);
  if (Number.isNaN(establishedInstant.getTime())) {
    return false;
  }
  const establishedCivil = formatCivilDate(civilDateInTimeZone(establishedInstant, timeZone));
  // Do not materialize a fiscal week that ended before establishment (civil).
  if (establishedCivil >= weekEnd) {
    return false;
  }
  return true;
}
