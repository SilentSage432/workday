import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RECURRING_TASK_CYCLE_KIND,
  civilDateForRecurringWeekday,
  currentRecurringTaskCycleKey,
  requireOptionalContextId,
  requireRecurringTaskCycleKey,
  requireRecurringTaskId,
  requireRecurringTaskInstant,
  requireRecurringTaskInstantText,
  requireRecurringTaskTitle,
  requireRecurringTaskWeekday,
  recurringTaskWeekEligible,
  type NewRecurringTaskDefinition,
  type RecurringTaskDefinition,
  type RecurringTaskDefinitionPatch,
  type RecurringTaskOccurrence,
  type RecurringTaskWeekday,
} from "@/domain/recurringTask";
import { requireIanaTimeZone } from "@/domain/time/localTime";
import {
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import { rowToTask } from "@/persistence/contextTaskMapping";
import type { TaskRow } from "@/persistence/contextTaskRows";
import type { Task } from "@/domain/task";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const RECURRING_TASK_DEFINITION_COLUMNS =
  "id, title, context_id, cycle_kind, available_weekday, due_weekday, established_at, retired_at";

export const RECURRING_TASK_OCCURRENCE_COLUMNS =
  "definition_id, task_id, cycle_kind, cycle_key, materialized_at";

export type RecurringTaskDefinitionRow = {
  id: string;
  title: string;
  context_id: string | null;
  cycle_kind: string;
  available_weekday: string;
  due_weekday: string;
  established_at: string;
  retired_at: string | null;
};

export type RecurringTaskOccurrenceRow = {
  definition_id: string;
  task_id: string;
  cycle_kind: string;
  cycle_key: string;
  materialized_at: string;
};

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("A signed-in user is required.");
  }
  return data.user.id;
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("The database returned no row.");
  }
  return data;
}

export function rowToRecurringTaskDefinition(row: RecurringTaskDefinitionRow): RecurringTaskDefinition {
  if (row.cycle_kind !== RECURRING_TASK_CYCLE_KIND) {
    throw new Error('A recurring Task cycle kind must be "lowes_fiscal_week".');
  }
  return {
    id: requireRecurringTaskId(row.id),
    title: requireRecurringTaskTitle(row.title),
    contextId: row.context_id,
    cycleKind: RECURRING_TASK_CYCLE_KIND,
    availableWeekday: requireRecurringTaskWeekday(row.available_weekday),
    dueWeekday: requireRecurringTaskWeekday(row.due_weekday),
    establishedAt: requireRecurringTaskInstantText(row.established_at, "Definition establishment"),
    retiredAt:
      row.retired_at === null
        ? null
        : requireRecurringTaskInstantText(row.retired_at, "Definition retirement"),
  };
}

export function rowToRecurringTaskOccurrence(row: RecurringTaskOccurrenceRow): RecurringTaskOccurrence {
  if (row.cycle_kind !== RECURRING_TASK_CYCLE_KIND) {
    throw new Error('A recurring Task cycle kind must be "lowes_fiscal_week".');
  }
  return {
    definitionId: requireRecurringTaskId(row.definition_id),
    taskId: requireRecurringTaskId(row.task_id, "Task"),
    cycleKind: RECURRING_TASK_CYCLE_KIND,
    cycleKey: requireRecurringTaskCycleKey(row.cycle_key),
    materializedAt: requireRecurringTaskInstantText(row.materialized_at, "Materialization"),
  };
}

export function toRecurringTaskDefinitionInsert(
  userId: string,
  input: NewRecurringTaskDefinition,
): {
  id: string;
  user_id: string;
  title: string;
  context_id: string | null;
  cycle_kind: typeof RECURRING_TASK_CYCLE_KIND;
  available_weekday: RecurringTaskWeekday;
  due_weekday: RecurringTaskWeekday;
  established_at: string;
  retired_at: null;
} {
  return {
    id: requireRecurringTaskId(input.id),
    user_id: userId,
    title: requireRecurringTaskTitle(input.title),
    context_id: requireOptionalContextId(input.contextId),
    cycle_kind: RECURRING_TASK_CYCLE_KIND,
    available_weekday: requireRecurringTaskWeekday(input.availableWeekday),
    due_weekday: requireRecurringTaskWeekday(input.dueWeekday),
    established_at: requireRecurringTaskInstant(input.establishedAt, "Definition establishment"),
    retired_at: null,
  };
}

export async function loadRecurringTaskDefinitions(
  client: SupabaseClient,
): Promise<RecurringTaskDefinition[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("recurring_task_definitions")
        .select(RECURRING_TASK_DEFINITION_COLUMNS, { count: "exact" })
        .order("established_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as RecurringTaskDefinitionRow[], total: count };
    },
  });
  return rows.map(rowToRecurringTaskDefinition);
}

export async function loadRecurringTaskOccurrences(
  client: SupabaseClient,
): Promise<RecurringTaskOccurrence[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("recurring_task_occurrences")
        .select(RECURRING_TASK_OCCURRENCE_COLUMNS, { count: "exact" })
        .order("cycle_key", { ascending: true })
        .order("definition_id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as RecurringTaskOccurrenceRow[], total: count };
    },
  });
  return rows.map(rowToRecurringTaskOccurrence);
}

export async function establishRecurringTaskDefinition(
  client: SupabaseClient,
  input: NewRecurringTaskDefinition,
): Promise<RecurringTaskDefinition> {
  const userId = await requireUserId(client);
  const row = toRecurringTaskDefinitionInsert(userId, input);
  const { data, error } = await client
    .from("recurring_task_definitions")
    .insert(row)
    .select(RECURRING_TASK_DEFINITION_COLUMNS)
    .single();
  return rowToRecurringTaskDefinition(unwrap(data, error) as RecurringTaskDefinitionRow);
}

export async function updateRecurringTaskDefinition(
  client: SupabaseClient,
  definitionId: string,
  patch: RecurringTaskDefinitionPatch,
): Promise<RecurringTaskDefinition> {
  await requireUserId(client);
  const id = requireRecurringTaskId(definitionId);
  const update: Record<string, string | null> = {};
  if (patch.title !== undefined) {
    update.title = requireRecurringTaskTitle(patch.title);
  }
  if (patch.contextId !== undefined) {
    update.context_id = requireOptionalContextId(patch.contextId);
  }
  if (patch.availableWeekday !== undefined) {
    update.available_weekday = requireRecurringTaskWeekday(patch.availableWeekday);
  }
  if (patch.dueWeekday !== undefined) {
    update.due_weekday = requireRecurringTaskWeekday(patch.dueWeekday);
  }
  if (Object.keys(update).length === 0) {
    throw new Error("A recurring Task definition update needs a change.");
  }
  const { data, error } = await client
    .from("recurring_task_definitions")
    .update(update)
    .eq("id", id)
    .select(RECURRING_TASK_DEFINITION_COLUMNS)
    .single();
  return rowToRecurringTaskDefinition(unwrap(data, error) as RecurringTaskDefinitionRow);
}

export async function retireRecurringTaskDefinition(
  client: SupabaseClient,
  input: { definitionId: string; retiredAt: Date },
): Promise<RecurringTaskDefinition> {
  await requireUserId(client);
  const definitionId = requireRecurringTaskId(input.definitionId);
  const { data: existing, error: readError } = await client
    .from("recurring_task_definitions")
    .select(RECURRING_TASK_DEFINITION_COLUMNS)
    .eq("id", definitionId)
    .single();
  const current = rowToRecurringTaskDefinition(
    unwrap(existing, readError) as RecurringTaskDefinitionRow,
  );
  if (current.retiredAt !== null) {
    const retiredAt = new Date(current.retiredAt).getTime();
    const next = input.retiredAt.getTime();
    if (!Number.isNaN(retiredAt) && !Number.isNaN(next) && next >= retiredAt) {
      return current;
    }
  }
  const { data, error } = await client
    .from("recurring_task_definitions")
    .update({
      retired_at: requireRecurringTaskInstant(input.retiredAt, "Definition retirement"),
    })
    .eq("id", definitionId)
    .select(RECURRING_TASK_DEFINITION_COLUMNS)
    .single();
  return rowToRecurringTaskDefinition(unwrap(data, error) as RecurringTaskDefinitionRow);
}

/**
 * Database-arbitrated ensure for one definition × current fiscal week when eligible.
 */
export async function ensureRecurringTaskOccurrence(
  client: SupabaseClient,
  input: {
    definitionId: string;
    cycleKey: string;
    civilNow: string;
    timeZone: string;
  },
): Promise<Task> {
  await requireUserId(client);
  const definitionId = requireRecurringTaskId(input.definitionId);
  const cycleKey = requireRecurringTaskCycleKey(input.cycleKey);
  const civilNow = formatCivilDate(parseCivilDate(input.civilNow));
  const timeZone = requireIanaTimeZone(input.timeZone);

  const { data, error } = await client.rpc("ensure_recurring_task_occurrence", {
    p_definition_id: definitionId,
    p_cycle_key: cycleKey,
    p_civil_now: civilNow,
    p_time_zone: timeZone,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("The ensure returned no Task.");
  }
  return rowToTask(data as TaskRow);
}

export async function ensureRecurringTaskOccurrenceForDefinition(
  client: SupabaseClient,
  definition: RecurringTaskDefinition,
  input: { instant: Date; timeZone: string },
): Promise<Task | null> {
  const timeZone = requireIanaTimeZone(input.timeZone);
  const civilNow = formatCivilDate(civilDateInTimeZone(input.instant, timeZone));
  const cycleKey = currentRecurringTaskCycleKey(input.instant, timeZone);
  if (
    !recurringTaskWeekEligible({
      definition,
      cycleKey,
      civilNow,
      timeZone,
    })
  ) {
    return null;
  }
  return ensureRecurringTaskOccurrence(client, {
    definitionId: definition.id,
    cycleKey,
    civilNow,
    timeZone,
  });
}

/**
 * Ensures eligible current-week occurrences for every active definition.
 * Driven only by actual instant + timezone — never navigated viewpoint.
 */
export async function ensureEligibleRecurringTaskOccurrences(
  client: SupabaseClient,
  input: {
    definitions: readonly RecurringTaskDefinition[];
    instant: Date;
    timeZone: string;
  },
): Promise<void> {
  for (const definition of input.definitions) {
    if (definition.retiredAt !== null) continue;
    try {
      await ensureRecurringTaskOccurrenceForDefinition(client, definition, {
        instant: input.instant,
        timeZone: input.timeZone,
      });
    } catch {
      // Best-effort per definition; landscape reread remains independent.
    }
  }
}

export function expectedDueOnForOccurrence(
  cycleKey: string,
  dueWeekday: RecurringTaskWeekday,
): string {
  return civilDateForRecurringWeekday(cycleKey, dueWeekday);
}
