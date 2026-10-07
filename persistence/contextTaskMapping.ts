import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";
import type { Context } from "@/domain/context";
import { requireNoteId } from "@/domain/note";
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

function localClockOrNull(value: string | null | undefined, field: string): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    return formatLocalTime(parseLocalTime(trimmed));
  } catch {
    throw new Error(`${field} must be a local time in the form HH:MM.`);
  }
}

function localForDatabase(value: string): string {
  return `${formatLocalTime(parseLocalTime(value))}:00`;
}

function localFromDatabase(value: string): string {
  return formatLocalTime(parseLocalTime(value));
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
    plannedLocal: row.planned_local ? localFromDatabase(row.planned_local) : null,
    mustDo: row.must_do,
    origin: requireOrigin(row.origin),
    originatingNoteId: row.originating_note_id,
  };
}

export function toTaskInsert(userId: string, input: NewTask): TaskInsertRow {
  const plannedOn = civilDateOrNull(input.plannedOn, "plannedOn");
  const plannedLocal = localClockOrNull(input.plannedLocal, "plannedLocal");
  if (plannedLocal !== null && plannedOn === null) {
    throw new Error("A planned clock needs a planned day.");
  }

  return {
    user_id: userId,
    title: requireTitle(input.title),
    context_id: input.contextId ?? null,
    due_on: civilDateOrNull(input.dueOn, "dueOn"),
    planned_on: plannedOn,
    planned_local: plannedLocal === null ? null : localForDatabase(plannedLocal),
    must_do: input.mustDo ?? false,
    origin: TASK_ORIGIN_USER_CREATED,
    originating_note_id:
      input.originatingNoteId == null ? null : requireNoteId(input.originatingNoteId),
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

  const plannedOnInPatch =
    patch.plannedOn !== undefined ? civilDateOrNull(patch.plannedOn, "plannedOn") : undefined;
  if (plannedOnInPatch !== undefined) {
    row.planned_on = plannedOnInPatch;
  }

  if (patch.plannedLocal !== undefined) {
    const plannedLocal = localClockOrNull(patch.plannedLocal, "plannedLocal");
    if (plannedLocal !== null && plannedOnInPatch === null) {
      throw new Error("A planned clock needs a planned day.");
    }
    row.planned_local = plannedLocal === null ? null : localForDatabase(plannedLocal);
  } else if (plannedOnInPatch === null) {
    // Clearing the planned day must not leave an orphaned clock point.
    row.planned_local = null;
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

/** Clears completion only. Does not restore Active Thread or touch other Task fields. */
export function toReopenUpdate(): Pick<TaskUpdateRow, "completed_at"> {
  return { completed_at: null };
}
