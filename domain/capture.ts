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

export type CaptureSession = {
  open: boolean;
  detailsOpen: boolean;
  draft: CaptureDraft;
};

export function initialCaptureSession(): CaptureSession {
  return {
    open: false,
    detailsOpen: false,
    draft: emptyCaptureDraft(),
  };
}

export function captureDraftHasMeaning(draft: CaptureDraft): boolean {
  return (
    draft.title.trim().length > 0 ||
    draft.contextId.length > 0 ||
    draft.plannedOn.length > 0 ||
    draft.dueOn.length > 0 ||
    draft.mustDo
  );
}

export function openCapture(session: CaptureSession): CaptureSession {
  const detailsFromDraft =
    session.draft.contextId.length > 0 ||
    session.draft.plannedOn.length > 0 ||
    session.draft.dueOn.length > 0 ||
    session.draft.mustDo;
  return {
    ...session,
    open: true,
    detailsOpen: session.detailsOpen || detailsFromDraft,
  };
}

export function collapseCapture(session: CaptureSession): CaptureSession {
  if (!captureDraftHasMeaning(session.draft)) {
    return initialCaptureSession();
  }
  return { ...session, open: false };
}

export function captureAfterSuccessfulSave(): CaptureSession {
  return initialCaptureSession();
}

export function captureAfterFailedSave(session: CaptureSession): CaptureSession {
  return {
    ...session,
    open: true,
    draft: draftAfterFailedSave(session.draft),
  };
}

export function openTasksAfterCompletion(tasks: Task[], completedId: string): Task[] {
  return tasks.filter((task) => task.id !== completedId);
}
