import type { Task, TaskPatch } from "@/domain/task";

/**
 * Transient edit of an existing Task.
 * Empty strings mean an optional field is cleared. They are not persisted as text.
 */
export type TaskEditDraft = {
  title: string;
  contextId: string;
  plannedOn: string;
  dueOn: string;
  mustDo: boolean;
};

export function taskEditDraftFromTask(task: Task): TaskEditDraft {
  return {
    title: task.title,
    contextId: task.contextId ?? "",
    plannedOn: task.plannedOn ?? "",
    dueOn: task.dueOn ?? "",
    mustDo: task.mustDo,
  };
}

export function taskPatchFromEditDraft(draft: TaskEditDraft): TaskPatch {
  const title = draft.title.trim();
  if (title.length === 0) {
    throw new Error("A task title is required.");
  }

  return {
    title,
    contextId: draft.contextId.length > 0 ? draft.contextId : null,
    plannedOn: draft.plannedOn.length > 0 ? draft.plannedOn : null,
    dueOn: draft.dueOn.length > 0 ? draft.dueOn : null,
    mustDo: draft.mustDo,
  };
}
