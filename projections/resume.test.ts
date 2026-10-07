import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeThreadAfterCompletion, activeThreadFromEstablishment } from "@/domain/activeThread";
import { emptyCaptureDraft, newTaskFromCapture, openTasksAfterCompletion } from "@/domain/capture";
import type { Task } from "@/domain/task";
import { projectResume } from "@/projections/resume";

const establishedAt = "2026-10-02T22:00:00.000Z";

function openTask(id: string, title: string, extras: Partial<Task> = {}): Task {
  return {
    id,
    title,
    contextId: null,
    createdAt: "2026-10-02T15:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    plannedLocal: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
    ...extras,
  };
}

const taskA = openTask("task-a", "Cycle counts");
const taskB = openTask("task-b", "Call the school");

describe("resume projection", () => {
  it("is absent when there is no active thread", () => {
    expect(projectResume({ activeThread: null, openTasks: [taskA, taskB] })).toBeNull();
  });

  it("resolves the referenced open task", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    expect(projectResume({ activeThread: thread, openTasks: [taskA, taskB] })).toEqual({
      task: taskA,
      establishedAt,
    });
  });

  it("does not offer a thread whose task is no longer open", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const openTasks = openTasksAfterCompletion([taskA, taskB], taskA.id);
    expect(projectResume({ activeThread: thread, openTasks })).toBeNull();
  });

  it("leaves the previous task open when the thread changes", () => {
    const switched = activeThreadFromEstablishment(taskB.id, "2026-10-02T22:30:00.000Z");
    const resume = projectResume({ activeThread: switched, openTasks: [taskA, taskB] });

    expect(taskA.completedAt).toBeNull();
    expect(taskB.completedAt).toBeNull();
    expect(resume?.task.id).toBe(taskB.id);
    expect(resume?.task.title).toBe("Call the school");
  });

  it("leaves the task open when the thread is cleared", () => {
    expect(projectResume({ activeThread: null, openTasks: [taskA] })).toBeNull();
    expect(taskA.completedAt).toBeNull();
  });

  it("clears resume when the active task is completed", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const openTasks = openTasksAfterCompletion([taskA, taskB], taskA.id);
    const remaining = activeThreadAfterCompletion(thread, taskA.id);

    expect(remaining).toBeNull();
    expect(projectResume({ activeThread: remaining, openTasks })).toBeNull();
    expect(openTasks.map((task) => task.id)).toEqual([taskB.id]);
    expect(openTasks[0]?.completedAt).toBeNull();
  });

  it("does not restore resume when a completed task is open again without Start", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const afterComplete = activeThreadAfterCompletion(thread, taskA.id);
    expect(afterComplete).toBeNull();
    expect(projectResume({ activeThread: afterComplete, openTasks: [taskA, taskB] })).toBeNull();
  });

  it("keeps the thread when a different task is completed", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const openTasks = openTasksAfterCompletion([taskA, taskB], taskB.id);
    const remaining = activeThreadAfterCompletion(thread, taskB.id);

    expect(remaining).toEqual(thread);
    expect(projectResume({ activeThread: remaining, openTasks })?.task.id).toBe(taskA.id);
  });

  it("leaves an existing thread in place when another task is captured", () => {
    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const captured = openTask("task-captured", "Remember this");
    expect(projectResume({ activeThread: thread, openTasks: [taskA, captured] })?.task.id).toBe(
      taskA.id,
    );
  });

  it("does not treat capture as establishing a thread", () => {
    const drafted = newTaskFromCapture({
      ...emptyCaptureDraft(),
      title: "Finish the manager verification",
      mustDo: true,
      plannedOn: "2026-10-02",
      dueOn: "2026-10-03",
    });
    const captured = openTask("task-captured", drafted.title, {
      mustDo: drafted.mustDo,
      plannedOn: drafted.plannedOn ?? null,
      plannedLocal: "09:00",
      dueOn: drafted.dueOn ?? null,
    });

    expect(projectResume({ activeThread: null, openTasks: [captured] })).toBeNull();
  });

  it("does not treat MUST DO as an active thread", () => {
    const mustDo = openTask("task-must", "Bay audits", { mustDo: true });
    expect(projectResume({ activeThread: null, openTasks: [mustDo] })).toBeNull();
  });

  it("does not treat a planned or due task as an active thread", () => {
    const scheduled = openTask("task-scheduled", "Pack down", {
      plannedOn: "2026-10-02",
      plannedLocal: null,
      dueOn: "2026-10-02",
    });
    expect(projectResume({ activeThread: null, openTasks: [scheduled] })).toBeNull();
  });

  it("has no clock or network dependency", () => {
    const source = readFileSync(new URL("./resume.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\bDate\b|fetch\(|supabase|process\.env|setTimeout|setInterval/);

    const thread = activeThreadFromEstablishment(taskA.id, establishedAt);
    const first = projectResume({ activeThread: thread, openTasks: [taskA] });
    const second = projectResume({ activeThread: thread, openTasks: [taskA] });
    expect(second).toEqual(first);
  });
});
