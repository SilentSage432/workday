import type { NewTask, Task } from "@/domain/task";

export type CaptureDraft = {
  title: string;
  contextId: string;
  plannedOn: string;
  dueOn: string;
  mustDo: boolean;
};

export function emptyCaptureDraft(): CaptureDraft {
  return {
    title: "",
    contextId: "",
    plannedOn: "",
    dueOn: "",
    mustDo: false,
  };
}

export function newTaskFromCapture(draft: CaptureDraft): NewTask {
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

export function draftAfterFailedSave(draft: CaptureDraft): CaptureDraft {
  return { ...draft };
}

export function openTasksAfterCompletion(tasks: Task[], completedId: string): Task[] {
  return tasks.filter((task) => task.id !== completedId);
}
