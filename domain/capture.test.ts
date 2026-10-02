import { describe, expect, it } from "vitest";
import {
  captureAfterFailedSave,
  captureAfterSuccessfulSave,
  captureDraftHasMeaning,
  collapseCapture,
  draftAfterFailedSave,
  emptyCaptureDraft,
  initialCaptureSession,
  newTaskFromCapture,
  openCapture,
  openTasksAfterCompletion,
} from "@/domain/capture";
import type { Task } from "@/domain/task";
import { toCompletionUpdate, toTaskInsert } from "@/persistence/contextTaskMapping";

const openTask: Task = {
  id: "task-1",
  title: "Call the school",
  contextId: null,
  createdAt: "2026-10-02T15:00:00.000Z",
  completedAt: null,
  dueOn: null,
  plannedOn: null,
  mustDo: false,
  origin: "user_created",
};

describe("capture draft", () => {
  it("requires a nonblank title", () => {
    expect(() => newTaskFromCapture({ ...emptyCaptureDraft(), title: "   " })).toThrow(/title/);
  });

  it("leaves Context optional", () => {
    const task = newTaskFromCapture({ ...emptyCaptureDraft(), title: "Call the school" });
    expect(task.contextId).toBeNull();
    expect(toTaskInsert("user-1", task).context_id).toBeNull();
  });

  it("keeps planned and due independent", () => {
    const drafted = newTaskFromCapture({
      ...emptyCaptureDraft(),
      title: "Call the school",
      plannedOn: "2026-10-05",
      dueOn: "2026-10-08",
    });
    const plannedOnly = newTaskFromCapture({
      ...emptyCaptureDraft(),
      title: "Call the school",
      plannedOn: "2026-10-06",
      dueOn: drafted.dueOn ?? "",
    });

    expect(drafted.plannedOn).toBe("2026-10-05");
    expect(drafted.dueOn).toBe("2026-10-08");
    expect(plannedOnly.plannedOn).toBe("2026-10-06");
    expect(plannedOnly.dueOn).toBe("2026-10-08");
    expect(toTaskInsert("user-1", plannedOnly)).toMatchObject({
      planned_on: "2026-10-06",
      due_on: "2026-10-08",
    });
  });

  it("keeps MUST DO false unless the user sets it", () => {
    expect(emptyCaptureDraft().mustDo).toBe(false);
    const marked = newTaskFromCapture({
      ...emptyCaptureDraft(),
      title: "Call the school",
      mustDo: true,
    });
    expect(marked.mustDo).toBe(true);
    expect(toTaskInsert("user-1", marked).must_do).toBe(true);
  });

  it("keeps the draft when saving fails", () => {
    const draft = {
      ...emptyCaptureDraft(),
      title: "Call the school",
      contextId: "family",
      plannedOn: "2026-10-05",
      dueOn: "2026-10-08",
      mustDo: true,
    };
    expect(draftAfterFailedSave(draft)).toEqual(draft);
  });

  it("drops a task from the open list only by its id", () => {
    const other = { ...openTask, id: "task-2", title: "File the receipt" };
    expect(openTasksAfterCompletion([openTask, other], openTask.id)).toEqual([other]);
  });

  it("starts collapsed, with no draft", () => {
    const session = initialCaptureSession();
    expect(session.open).toBe(false);
    expect(session.detailsOpen).toBe(false);
    expect(captureDraftHasMeaning(session.draft)).toBe(false);
  });

  it("opens onto a title-only save", () => {
    const opened = openCapture(initialCaptureSession());
    expect(opened.open).toBe(true);
    expect(opened.detailsOpen).toBe(false);
    const task = newTaskFromCapture({ ...opened.draft, title: "Call the school" });
    expect(task).toMatchObject({
      title: "Call the school",
      contextId: null,
      plannedOn: null,
      dueOn: null,
      mustDo: false,
    });
  });

  it("keeps a meaningful draft when Capture is closed", () => {
    const opened = openCapture({
      ...initialCaptureSession(),
      draft: { ...emptyCaptureDraft(), title: "Call the school", mustDo: true },
    });
    const collapsed = collapseCapture({ ...opened, detailsOpen: true });
    expect(collapsed.open).toBe(false);
    expect(collapsed.draft.title).toBe("Call the school");
    expect(collapsed.draft.mustDo).toBe(true);
    expect(openCapture(collapsed).detailsOpen).toBe(true);
  });

  it("discards an empty draft when Capture is closed", () => {
    const collapsed = collapseCapture(openCapture(initialCaptureSession()));
    expect(collapsed).toEqual(initialCaptureSession());
  });

  it("clears the draft after a successful save and keeps it after a failed save", () => {
    const open = openCapture({
      ...initialCaptureSession(),
      draft: { ...emptyCaptureDraft(), title: "Call the school" },
    });
    expect(captureAfterSuccessfulSave()).toEqual(initialCaptureSession());
    expect(captureAfterFailedSave(open)).toEqual(open);
  });

  it("sends completion as the supplied instant", () => {
    expect(toCompletionUpdate(new Date("2026-10-02T22:15:00.000Z"))).toEqual({
      completed_at: "2026-10-02T22:15:00.000Z",
    });
  });
});
