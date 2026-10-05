import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeThreadAfterCompletion } from "@/domain/activeThread";
import type { Task } from "@/domain/task";
import { civilDateInTimeZone, formatCivilDate } from "@/domain/time/workFiscalWeek";
import { toCompletionUpdate, toTaskUpdate } from "@/persistence/contextTaskMapping";
import { projectTodayTasks, todayPlanAction } from "@/projections/today";

function openTask(id: string, extras: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    contextId: null,
    createdAt: "2026-10-02T15:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
    ...extras,
  };
}

const today = "2026-10-02";

describe("today projection", () => {
  it("includes an open task planned on the supplied civil date, in that order", () => {
    const first = openTask("first", { plannedOn: today, createdAt: "2026-10-01T15:00:00.000Z" });
    const second = openTask("second", { plannedOn: today, createdAt: "2026-10-02T15:00:00.000Z" });
    const tasks = [first, second];

    expect(projectTodayTasks({ openTasks: tasks, civilDate: today })).toEqual([first, second]);
    expect(tasks[0]).toBe(first);
  });

  it("excludes yesterday, tomorrow, and an unplanned task", () => {
    const tasks = [
      openTask("yesterday", { plannedOn: "2026-10-01" }),
      openTask("tomorrow", { plannedOn: "2026-10-03" }),
      openTask("unplanned"),
    ];

    expect(projectTodayTasks({ openTasks: tasks, civilDate: today })).toEqual([]);
  });

  it("does not treat due, must do, creation, or a thread as a plan", () => {
    const tasks = [
      openTask("due", { dueOn: today }),
      openTask("must", { mustDo: true }),
      openTask("created", { createdAt: "2026-10-02T18:00:00.000Z" }),
      openTask("thread"),
    ];

    expect(projectTodayTasks({ openTasks: tasks, civilDate: today })).toEqual([]);
  });

  it("excludes a completed task that was planned for this civil date", () => {
    const completed = openTask("done", {
      plannedOn: today,
      completedAt: "2026-10-02T20:00:00.000Z",
    });

    expect(projectTodayTasks({ openTasks: [completed], civilDate: today })).toEqual([]);
  });

  it("uses the confirmed zone's civil date across the UTC boundary", () => {
    const instant = new Date("2026-10-03T05:30:00.000Z");
    const boise = formatCivilDate(civilDateInTimeZone(instant, "America/Boise"));
    const utc = formatCivilDate(civilDateInTimeZone(instant, "UTC"));
    const plannedForBoise = openTask("boise", { plannedOn: "2026-10-02" });

    expect(boise).toBe("2026-10-02");
    expect(utc).toBe("2026-10-03");
    expect(projectTodayTasks({ openTasks: [plannedForBoise], civilDate: boise })).toEqual([
      plannedForBoise,
    ]);
    expect(projectTodayTasks({ openTasks: [plannedForBoise], civilDate: utc })).toEqual([]);
  });

  it("names plan, move, and remove from the planned day alone", () => {
    expect(todayPlanAction(null, today)).toBe("plan");
    expect(todayPlanAction("2026-10-03", today)).toBe("move");
    expect(todayPlanAction(today, today)).toBe("remove");
  });

  it("changes only planned_on, and completion leaves that date", () => {
    expect(toTaskUpdate({ plannedOn: today })).toEqual({ planned_on: today });
    expect(toTaskUpdate({ plannedOn: null })).toEqual({ planned_on: null });
    expect(toCompletionUpdate(new Date("2026-10-02T20:00:00.000Z"))).toEqual({
      completed_at: "2026-10-02T20:00:00.000Z",
    });
    expect(
      activeThreadAfterCompletion(
        { taskId: "done", establishedAt: "2026-10-02T18:00:00.000Z" },
        "done",
      ),
    ).toBeNull();
  });

  it("does not read a clock", () => {
    const source = readFileSync(new URL("./today.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Date\.now|new Date|supabase|fetch\(/);
  });
});
