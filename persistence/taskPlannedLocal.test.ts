import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeThreadFromEstablishment } from "@/domain/activeThread";
import { defineBlock } from "@/domain/block";
import type { Task } from "@/domain/task";
import { taskEditDraftFromTask, taskPatchFromEditDraft } from "@/domain/taskEdit";
import { rowToTask, toTaskInsert, toTaskUpdate } from "@/persistence/contextTaskMapping";
import type { TaskRow } from "@/persistence/contextTaskRows";
import { capacityCoverage } from "@/projections/capacity";
import { projectResume } from "@/projections/resume";
import { instantFromZonedLocal } from "@/domain/time/localTime";

const row: TaskRow = {
  id: "task-1",
  context_id: null,
  title: "Call the dentist",
  created_at: "2026-10-07T15:00:00.000Z",
  completed_at: null,
  due_on: "2026-10-10",
  planned_on: "2026-10-08",
  planned_local: "14:00:00",
  must_do: false,
  origin: "user_created",
  originating_note_id: null,
};

describe("task planned local clock point", () => {
  it("keeps a Task without a clock point valid", () => {
    const task = rowToTask({ ...row, planned_local: null });
    expect(task.plannedOn).toBe("2026-10-08");
    expect(task.plannedLocal).toBeNull();
    expect(toTaskInsert("user-1", { title: "Call Mom", plannedOn: "2026-10-08" }).planned_local).toBeNull();
  });

  it("round-trips planned date and local clock canonically", () => {
    const task = rowToTask(row);
    expect(task.plannedLocal).toBe("14:00");
    expect(
      toTaskInsert("user-1", {
        title: "Call the dentist",
        plannedOn: "2026-10-08",
        plannedLocal: "14:00",
      }),
    ).toMatchObject({
      planned_on: "2026-10-08",
      planned_local: "14:00:00",
    });
  });

  it("changes only the clock on the same Task identity", () => {
    expect(toTaskUpdate({ plannedLocal: "15:00" })).toEqual({ planned_local: "15:00:00" });
    expect(toTaskUpdate({ plannedLocal: "15:00" })).not.toHaveProperty("planned_on");
    expect(toTaskUpdate({ plannedLocal: "15:00" })).not.toHaveProperty("due_on");
    expect(toTaskUpdate({ plannedLocal: "15:00" })).not.toHaveProperty("must_do");
    expect(toTaskUpdate({ plannedLocal: "15:00" })).not.toHaveProperty("completed_at");
  });

  it("preserves local clock when the planned day moves", () => {
    const patch = taskPatchFromEditDraft({
      ...taskEditDraftFromTask(rowToTask(row)),
      plannedOn: "2026-10-09",
    });
    expect(patch.plannedOn).toBe("2026-10-09");
    expect(patch.plannedLocal).toBe("14:00");
    expect(toTaskUpdate({ plannedOn: "2026-10-09" })).toEqual({ planned_on: "2026-10-09" });
    expect(toTaskUpdate({ plannedOn: "2026-10-09" })).not.toHaveProperty("planned_local");
  });

  it("clears the clock while retaining the planned day", () => {
    expect(toTaskUpdate({ plannedLocal: null })).toEqual({ planned_local: null });
    expect(toTaskUpdate({ plannedLocal: null })).not.toHaveProperty("planned_on");
  });

  it("clears clock precision when the planned day is cleared", () => {
    expect(toTaskUpdate({ plannedOn: null })).toEqual({ planned_on: null, planned_local: null });
    expect(() =>
      toTaskInsert("user-1", { title: "Call", plannedLocal: "14:00" }),
    ).toThrow(/planned clock needs a planned day/);
    expect(() => toTaskUpdate({ plannedOn: null, plannedLocal: "14:00" })).toThrow(
      /planned clock needs a planned day/,
    );
  });

  it("does not consume capacity or invent Block territory", () => {
    const zone = "America/Denver";
    const day = "2026-10-08";
    const boundary = {
      start: instantFromZonedLocal(day, "08:00", zone),
      end: instantFromZonedLocal(day, "17:00", zone),
    };
    const covered = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [],
      blocks: [],
      commitments: [],
    });
    expect(covered).toMatchObject({ intervals: [] });
    const source = readFileSync(new URL("../projections/capacity.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/planned_local|plannedLocal/);
    expect(source).not.toMatch(/from\("@\/domain\/task"\)/);
    const block = defineBlock({
      kind: "timed",
      startsOn: day,
      startLocal: "14:00",
      endLocal: "14:30",
      purpose: "Call",
      taskId: "task-1",
    });
    expect(block.kind).toBe("timed");
    if (block.kind === "timed") {
      expect(block.startLocal).toBe("14:00");
      expect(block.endLocal).toBe("14:30");
    }
    expect(toTaskUpdate({ plannedLocal: "14:00" })).not.toHaveProperty("task_id");
  });

  it("does not establish Active Thread, Must Do, or due meaning", () => {
    const task: Task = {
      ...rowToTask(row),
      mustDo: false,
      dueOn: "2026-10-10",
      plannedLocal: "14:00",
    };
    expect(projectResume({ activeThread: null, openTasks: [task] })).toBeNull();
    expect(activeThreadFromEstablishment(task.id, "2026-10-08T20:00:00.000Z").taskId).toBe(task.id);
    expect(toTaskUpdate({ plannedLocal: "14:00" })).not.toHaveProperty("must_do");
    expect(toTaskUpdate({ plannedLocal: "14:00" })).not.toHaveProperty("due_on");
    expect(toTaskUpdate({ dueOn: "2026-10-11" })).not.toHaveProperty("planned_local");
  });

  it("keeps Class-A Task UPDATE binding without a new channel", () => {
    const coherence = readFileSync(
      new URL("../components/orient/canonicalCoherence.ts", import.meta.url),
      "utf8",
    );
    expect(coherence).toContain('owned("tasks", ["INSERT", "UPDATE"])');
    expect(coherence).not.toMatch(/planned_local|plannedLocal/);
  });
});
