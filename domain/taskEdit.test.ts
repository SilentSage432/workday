import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Task } from "@/domain/task";
import { taskEditDraftFromTask, taskPatchFromEditDraft } from "@/domain/taskEdit";
import { toTaskUpdate } from "@/persistence/contextTaskMapping";

const task: Task = {
  id: "task-1",
  title: "Call the school",
  contextId: "family",
  createdAt: "2026-10-01T15:00:00.000Z",
  completedAt: null,
  dueOn: "2026-10-08",
  plannedOn: "2026-10-05",
  plannedLocal: null,
  mustDo: false,
  origin: "user_created",
  originatingNoteId: null,
};

describe("task edit draft", () => {
  it("starts from the task's current established fields", () => {
    expect(taskEditDraftFromTask(task)).toEqual({
      title: "Call the school",
      contextId: "family",
      plannedOn: "2026-10-05",
      plannedLocal: "",
      dueOn: "2026-10-08",
      mustDo: false,
    });
    expect(taskEditDraftFromTask({ ...task, contextId: null, plannedOn: null, dueOn: null })).toEqual({
      title: "Call the school",
      contextId: "",
      plannedOn: "",
      plannedLocal: "",
      dueOn: "",
      mustDo: false,
    });
  });

  it("changes the title without replacing the task", () => {
    const patch = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), title: "  File the receipt  " });

    expect(patch.title).toBe("File the receipt");
    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("completedAt");
    expect(patch).not.toHaveProperty("origin");
    expect(toTaskUpdate(patch)).toMatchObject({ title: "File the receipt" });
    expect(toTaskUpdate(patch)).not.toHaveProperty("completed_at");
  });

  it("rejects a blank title", () => {
    const draft = taskEditDraftFromTask(task);
    expect(() => taskPatchFromEditDraft({ ...draft, title: "" })).toThrow(/title/);
    expect(() => taskPatchFromEditDraft({ ...draft, title: "   " })).toThrow(/title/);
  });

  it("can change or clear Context", () => {
    const draft = taskEditDraftFromTask(task);
    expect(taskPatchFromEditDraft({ ...draft, contextId: "work" }).contextId).toBe("work");
    expect(taskPatchFromEditDraft({ ...draft, contextId: "" }).contextId).toBeNull();
    expect(toTaskUpdate(taskPatchFromEditDraft({ ...draft, contextId: "" }))).toMatchObject({
      context_id: null,
    });
  });

  it("can set, change, or clear the planned day without changing due", () => {
    const cleared = taskEditDraftFromTask({ ...task, plannedOn: null, dueOn: "2026-10-08" });
    expect(taskPatchFromEditDraft({ ...cleared, plannedOn: "2026-10-05" })).toMatchObject({
      plannedOn: "2026-10-05",
      plannedLocal: null,
      dueOn: "2026-10-08",
    });

    const changed = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), plannedOn: "2026-10-06" });
    expect(changed.plannedOn).toBe("2026-10-06");
    expect(changed.dueOn).toBe("2026-10-08");
    expect(toTaskUpdate(changed)).toMatchObject({ planned_on: "2026-10-06", due_on: "2026-10-08" });

    const removed = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), plannedOn: "" });
    expect(removed.plannedOn).toBeNull();
    expect(removed.plannedLocal).toBeNull();
    expect(removed.dueOn).toBe("2026-10-08");
    expect(toTaskUpdate(removed)).toMatchObject({ planned_on: null, planned_local: null });
  });

  it("can set, change, or clear planned clock without inventing duration", () => {
    const withClock = taskPatchFromEditDraft({
      ...taskEditDraftFromTask(task),
      plannedLocal: "14:00",
    });
    expect(withClock).toMatchObject({
      plannedOn: "2026-10-05",
      plannedLocal: "14:00",
      dueOn: "2026-10-08",
      mustDo: false,
    });
    expect(toTaskUpdate(withClock)).toMatchObject({
      planned_on: "2026-10-05",
      planned_local: "14:00:00",
      due_on: "2026-10-08",
    });

    const movedDay = taskPatchFromEditDraft({
      ...taskEditDraftFromTask({ ...task, plannedLocal: "14:00" }),
      plannedOn: "2026-10-06",
    });
    expect(movedDay.plannedOn).toBe("2026-10-06");
    expect(movedDay.plannedLocal).toBe("14:00");

    const clockCleared = taskPatchFromEditDraft({
      ...taskEditDraftFromTask({ ...task, plannedLocal: "14:00" }),
      plannedLocal: "",
    });
    expect(clockCleared.plannedOn).toBe("2026-10-05");
    expect(clockCleared.plannedLocal).toBeNull();

    expect(() =>
      toTaskUpdate(taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), plannedOn: "", plannedLocal: "14:00" })),
    ).not.toThrow();
    expect(
      toTaskUpdate(taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), plannedOn: "", plannedLocal: "14:00" })),
    ).toMatchObject({ planned_on: null, planned_local: null });
  });

  it("can set, change, or clear the due day without changing the plan", () => {
    const cleared = taskEditDraftFromTask({ ...task, dueOn: null, plannedOn: "2026-10-05" });
    expect(taskPatchFromEditDraft({ ...cleared, dueOn: "2026-10-08" })).toMatchObject({
      dueOn: "2026-10-08",
      plannedOn: "2026-10-05",
      plannedLocal: null,
    });

    const changed = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), dueOn: "2026-10-09" });
    expect(changed.dueOn).toBe("2026-10-09");
    expect(changed.plannedOn).toBe("2026-10-05");
    expect(toTaskUpdate(changed)).toMatchObject({ due_on: "2026-10-09", planned_on: "2026-10-05" });

    const removed = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), dueOn: "" });
    expect(removed.dueOn).toBeNull();
    expect(removed.plannedOn).toBe("2026-10-05");
  });

  it("rejects a time-of-day value for either day", () => {
    const draft = taskEditDraftFromTask(task);
    expect(() =>
      toTaskUpdate(taskPatchFromEditDraft({ ...draft, plannedOn: "2026-10-05T16:00:00.000Z" })),
    ).toThrow(/civil date/);
    expect(() =>
      toTaskUpdate(taskPatchFromEditDraft({ ...draft, dueOn: "2026-10-08T16:00:00.000Z" })),
    ).toThrow(/civil date/);
  });

  it("can enable or disable Must Do without changing the other fields", () => {
    const enabled = taskPatchFromEditDraft({ ...taskEditDraftFromTask(task), mustDo: true });
    expect(enabled).toEqual({
      title: "Call the school",
      contextId: "family",
      plannedOn: "2026-10-05",
      plannedLocal: null,
      dueOn: "2026-10-08",
      mustDo: true,
    });
    expect(toTaskUpdate(enabled)).toEqual({
      title: "Call the school",
      context_id: "family",
      planned_on: "2026-10-05",
      planned_local: null,
      due_on: "2026-10-08",
      must_do: true,
    });
    expect(enabled.plannedLocal).toBeNull();

    const disabled = taskPatchFromEditDraft({
      ...taskEditDraftFromTask({ ...task, mustDo: true }),
      mustDo: false,
    });
    expect(disabled.mustDo).toBe(false);
    expect(disabled.title).toBe("Call the school");
    expect(disabled.contextId).toBe("family");
    expect(disabled.plannedOn).toBe("2026-10-05");
    expect(disabled.dueOn).toBe("2026-10-08");
  });
});

describe("task edit boundaries", () => {
  it("leaves quick capture and the complete open-task read in place", () => {
    const tasks = readFileSync(new URL("../components/TaskLoop.tsx", import.meta.url), "utf8");
    const quick = readFileSync(new URL("../components/QuickCapture.tsx", import.meta.url), "utf8");
    const capture = readFileSync(new URL("./capture.ts", import.meta.url), "utf8");
    const persistence = readFileSync(new URL("../persistence/contextsAndTasks.ts", import.meta.url), "utf8");
    const form = readFileSync(new URL("../components/TaskEditForm.tsx", import.meta.url), "utf8");

    expect(tasks).toContain("<QuickCapture");
    expect(tasks).not.toMatch(/onCreated=\{[^}]*establishActiveThread/);
    expect(quick).toContain("useCapture");
    expect(capture).toContain("newTaskFromCapture");
    expect(persistence).toContain("readCompleteCollection");
    expect(persistence).toContain('.is("completed_at", null)');
    expect(form).not.toMatch(/Delete|Reschedule|Carry forward|Priority|createTask|completeTask/);
  });
});
