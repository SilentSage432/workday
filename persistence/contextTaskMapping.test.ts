import { describe, expect, it } from "vitest";
import {
  rowToContext,
  rowToTask,
  toCompletionUpdate,
  toReopenUpdate,
  toTaskInsert,
  toTaskUpdate,
} from "@/persistence/contextTaskMapping";
import type { TaskRow } from "@/persistence/contextTaskRows";

const openTask: TaskRow = {
  id: "task-1",
  context_id: null,
  title: "Pack down aisle 12",
  created_at: "2026-10-02T15:00:00.000Z",
  completed_at: null,
  due_on: "2026-10-08",
  planned_on: "2026-10-05",
  planned_local: null,
  must_do: true,
  origin: "user_created",
  originating_note_id: null,
};

describe("context and task mapping", () => {
  it("keeps a planned day as the civil date that was stored", () => {
    const task = rowToTask(openTask);
    expect(task.plannedOn).toBe("2026-10-05");
    expect(task.dueOn).toBe("2026-10-08");
  });

  it("writes due and planned as separate columns", () => {
    const inserted = toTaskInsert("user-1", {
      title: "Call the school",
      dueOn: "2026-10-08",
      plannedOn: "2026-10-05",
    });

    expect(inserted.due_on).toBe("2026-10-08");
    expect(inserted.planned_on).toBe("2026-10-05");
    expect(inserted.planned_local).toBeNull();

    const dueOnly = toTaskUpdate({ dueOn: "2026-10-09" });
    expect(dueOnly).toEqual({ due_on: "2026-10-09" });
    expect(dueOnly).not.toHaveProperty("planned_on");

    const plannedOnly = toTaskUpdate({ plannedOn: "2026-10-06" });
    expect(plannedOnly).toEqual({ planned_on: "2026-10-06" });
    expect(plannedOnly).not.toHaveProperty("due_on");
    expect(plannedOnly).not.toHaveProperty("planned_local");
  });

  it("rejects an instant where a civil date is required", () => {
    expect(() =>
      toTaskInsert("user-1", {
        title: "Call the school",
        plannedOn: "2026-10-03T04:30:00.000Z",
      }),
    ).toThrow(/civil date/);
  });

  it("preserves MUST DO as the user set it", () => {
    expect(rowToTask(openTask).mustDo).toBe(true);
    expect(toTaskInsert("user-1", { title: "File the receipt" }).must_do).toBe(false);
    expect(toTaskUpdate({ mustDo: true })).toEqual({ must_do: true });
  });

  it("stores planned local clock only with a planned day", () => {
    expect(
      toTaskInsert("user-1", {
        title: "Call Mom",
        plannedOn: "2026-10-08",
        plannedLocal: "18:00",
      }),
    ).toMatchObject({ planned_on: "2026-10-08", planned_local: "18:00:00" });
    expect(rowToTask({ ...openTask, planned_local: "18:00:00" }).plannedLocal).toBe("18:00");
    expect(toTaskUpdate({ plannedOn: null })).toEqual({ planned_on: null, planned_local: null });
    expect(() => toTaskInsert("user-1", { title: "Call Mom", plannedLocal: "18:00" })).toThrow(
      /planned clock/,
    );
  });

  it("preserves the completion instant and leaves the task open when it is null", () => {
    expect(rowToTask(openTask).completedAt).toBeNull();

    const completed = rowToTask({
      ...openTask,
      completed_at: "2026-10-02T22:15:00.000Z",
    });
    expect(completed.completedAt).toBe("2026-10-02T22:15:00.000Z");
    expect(completed.dueOn).toBe("2026-10-08");
    expect(completed.plannedOn).toBe("2026-10-05");
    expect(completed.mustDo).toBe(true);

    const completion = toCompletionUpdate(new Date("2026-10-02T22:15:00.000Z"));
    expect(completion).toEqual({ completed_at: "2026-10-02T22:15:00.000Z" });

    const reopen = toReopenUpdate();
    expect(reopen).toEqual({ completed_at: null });
    expect(Object.keys(reopen)).toEqual(["completed_at"]);
    expect(toTaskUpdate({ title: "Still filing", mustDo: true })).not.toHaveProperty("completed_at");
  });

  it("leaves Context optional", () => {
    expect(rowToTask(openTask).contextId).toBeNull();
    expect(toTaskInsert("user-1", { title: "File the receipt" }).context_id).toBeNull();

    const assigned = toTaskInsert("user-1", {
      title: "File the receipt",
      contextId: "context-family",
    });
    expect(assigned.context_id).toBe("context-family");
    expect(toTaskUpdate({ contextId: null })).toEqual({ context_id: null });
  });

  it("reads an absent originating note as none and keeps a supplied one", () => {
    expect(rowToTask(openTask).originatingNoteId).toBeNull();
    expect(toTaskInsert("user-1", { title: "File the receipt" }).originating_note_id).toBeNull();
    expect(toTaskInsert("user-1", { title: "File the receipt" }).origin).toBe("user_created");

    const sourced = toTaskInsert("user-1", {
      title: "Check the department",
      originatingNoteId: "00000000-0000-4000-8000-000000000001",
    });
    expect(sourced.originating_note_id).toBe("00000000-0000-4000-8000-000000000001");
    expect(sourced.origin).toBe("user_created");
    expect(sourced.must_do).toBe(false);
    expect(sourced.planned_on).toBeNull();
    expect(sourced.due_on).toBeNull();
    expect(sourced.context_id).toBeNull();
    expect(
      rowToTask({ ...openTask, originating_note_id: "00000000-0000-4000-8000-000000000001" })
        .originatingNoteId,
    ).toBe("00000000-0000-4000-8000-000000000001");
    expect(toTaskUpdate({ title: "File the receipt" })).not.toHaveProperty("originating_note_id");
    expect(() =>
      toTaskInsert("user-1", { title: "Check the department", originatingNoteId: "not-a-note" }),
    ).toThrow(/stable identity/);
  });

  it("records a captured task as user-created and reads that origin back", () => {
    expect(toTaskInsert("user-1", { title: "File the receipt" }).origin).toBe("user_created");
    expect(rowToTask(openTask).origin).toBe("user_created");
    expect(rowToContext({
      id: "context-1",
      name: "Family",
      created_at: "2026-10-02T15:00:00.000Z",
    })).toEqual({
      id: "context-1",
      name: "Family",
      createdAt: "2026-10-02T15:00:00.000Z",
    });
  });
});
