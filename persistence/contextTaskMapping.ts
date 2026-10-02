import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { Context } from "@/domain/context";
import {
  TASK_ORIGIN_USER_CREATED,
  type NewTask,
  type Task,
  type TaskOrigin,
  type TaskPatch,
} from "@/domain/task";
import type { ContextRow, TaskInsertRow, TaskRow, TaskUpdateRow } from "@/persistence/contextTaskRows";

function civilDateOrNull(value: string | null | undefined, field: string): string | null {
  if (value == null) {
    return null;
  }

  try {
    return formatCivilDate(parseCivilDate(value));
  } catch {
    throw new Error(`${field} must be a civil date in the form YYYY-MM-DD.`);
  }
}

function requireTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error("A task title is required.");
  }
  return trimmed;
}

function requireOrigin(origin: string): TaskOrigin {
  if (origin !== TASK_ORIGIN_USER_CREATED) {
    throw new Error(`Unsupported task origin "${origin}".`);
  }
  return origin;
}

export function rowToContext(row: ContextRow): Context {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    contextId: row.context_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    dueOn: row.due_on,
    plannedOn: row.planned_on,
    mustDo: row.must_do,
    origin: requireOrigin(row.origin),
  };
}

export function toTaskInsert(userId: string, input: NewTask): TaskInsertRow {
  return {
    user_id: userId,
    title: requireTitle(input.title),
    context_id: input.contextId ?? null,
    due_on: civilDateOrNull(input.dueOn, "dueOn"),
    planned_on: civilDateOrNull(input.plannedOn, "plannedOn"),
    must_do: input.mustDo ?? false,
    origin: TASK_ORIGIN_USER_CREATED,
  };
}

export function toTaskUpdate(patch: TaskPatch): TaskUpdateRow {
  const row: TaskUpdateRow = {};

  if (patch.title !== undefined) {
    row.title = requireTitle(patch.title);
  }
  if (patch.contextId !== undefined) {
    row.context_id = patch.contextId;
  }
  if (patch.dueOn !== undefined) {
    row.due_on = civilDateOrNull(patch.dueOn, "dueOn");
  }
  if (patch.plannedOn !== undefined) {
    row.planned_on = civilDateOrNull(patch.plannedOn, "plannedOn");
  }
  if (patch.mustDo !== undefined) {
    row.must_do = patch.mustDo;
  }

  return row;
}

export function toCompletionUpdate(completedAt: Date): Pick<TaskUpdateRow, "completed_at"> {
  if (Number.isNaN(completedAt.getTime())) {
    throw new Error("Completion requires a real instant.");
  }

  return { completed_at: completedAt.toISOString() };
}
