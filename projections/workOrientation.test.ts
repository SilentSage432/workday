import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ActiveThread } from "@/domain/activeThread";
import type { Task } from "@/domain/task";
import { FSR_INTENDED_BEFORE_LOCAL, OPENING_CADENCE_STEPS, POWER_HOUR } from "@/domain/workCadence";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import { formatCivilDate, workFiscalWeekStart } from "@/domain/time/workFiscalWeek";
import { projectWorkOrientation } from "@/projections/workOrientation";

const denver = "America/Denver";
const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

function orient(
  instant: string,
  today: WorkScheduleEntry | null = opening,
  previous: WorkScheduleEntry | null = null,
  timeZone = denver,
) {
  return projectWorkOrientation({
    instant: new Date(instant),
    timeZone,
    todayEntry: today,
    previousEntry: previous,
  });
}

describe("work orientation", () => {
  it("places an opening shift before, during, and after the scheduled interval", () => {
    expect(orient("2026-10-03T11:00:00.000Z").schedule).toMatchObject({
      state: "scheduled",
      shiftType: "opening",
      position: "before",
    });
    expect(orient("2026-10-03T14:00:00.000Z").schedule).toMatchObject({ position: "during" });
    expect(orient("2026-10-03T22:00:00.000Z").schedule).toMatchObject({ position: "after" });
  });

  it("keeps Off distinct from an unknown schedule", () => {
    const instant = "2026-10-03T16:00:00.000Z";
    expect(orient(instant, offWorkDay("2026-10-03")).schedule).toEqual({ state: "off" });
    expect(orient(instant, null).schedule).toEqual({ state: "unknown" });
  });

  it("names Mid and Closing without opening steps or assigned closing duties", () => {
    const mid = orient(
      "2026-10-03T16:00:00.000Z",
      scheduledWorkDay({
        workOn: "2026-10-03",
        startLocal: "08:00",
        endLocal: "17:00",
        shiftType: "mid",
      }),
    );
    expect(mid.cadence).toEqual({ kind: "mid" });
    expect(mid).not.toHaveProperty("steps");

    const closing = orient(
      "2026-10-03T18:00:00.000Z",
      scheduledWorkDay({
        workOn: "2026-10-03",
        startLocal: "11:00",
        endLocal: "20:00",
        shiftType: "closing",
      }),
    );
    expect(closing.schedule).toMatchObject({ shiftType: "closing", position: "during" });
    expect(closing.cadence).toEqual({ kind: "closing" });
    expect(JSON.stringify(closing)).not.toMatch(/cash office|perimeter/i);
  });

  it("projects Power Hour as before, during, and after on the civil date", () => {
    expect(orient("2026-10-03T14:00:00.000Z").powerHour.state).toBe("before");
    expect(orient("2026-10-03T16:00:00.000Z").powerHour.state).toBe("during");
    expect(orient("2026-10-03T20:00:00.000Z").powerHour.state).toBe("after");
    expect(POWER_HOUR).toEqual({ name: "Power Hour", startLocal: "10:00", endLocal: "14:00" });
  });

  it("records the FSR intended boundary without an 11:00 deadline", () => {
    expect(orient("2026-10-03T14:00:00.000Z").cadence).toEqual({
      kind: "opening",
      fsrIntendedBoundary: "before",
    });
    expect(orient("2026-10-03T16:00:00.000Z").cadence).toEqual({
      kind: "opening",
      fsrIntendedBoundary: "reached",
    });
    expect(orient("2026-10-03T11:00:00.000Z").cadence).toEqual({ kind: "none" });
    expect(FSR_INTENDED_BEFORE_LOCAL).toBe("10:00");
    expect(OPENING_CADENCE_STEPS.join(" ")).not.toMatch(/\d/);
  });

  it("chooses the next established boundary by absolute time", () => {
    expect(orient("2026-10-03T11:00:00.000Z").nextBoundary).toEqual({
      kind: "shift-starts",
      localTime: "06:00",
    });
    expect(orient("2026-10-03T14:00:00.000Z").nextBoundary).toEqual({
      kind: "power-hour-starts",
      localTime: "10:00",
    });
    expect(orient("2026-10-03T17:00:00.000Z").nextBoundary).toEqual({
      kind: "power-hour-ends",
      localTime: "14:00",
    });
    expect(orient("2026-10-03T20:30:00.000Z").nextBoundary).toEqual({
      kind: "shift-ends",
      localTime: "15:00",
    });
    expect(orient("2026-10-03T22:00:00.000Z").nextBoundary).toBeNull();
  });

  it("keeps an overnight shift on its start date and Power Hour on the current civil date", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const instant = new Date("2026-10-04T07:00:00.000Z");
    const fact = projectWorkOrientation({
      instant,
      timeZone: denver,
      todayEntry: null,
      previousEntry: overnight,
    });

    expect(fact.workDate).toBe("2026-10-04");
    expect(fact.schedule).toMatchObject({
      state: "scheduled",
      position: "during",
      scheduledOn: "2026-10-03",
      endsNextCivilDate: true,
    });
    expect(fact.powerHour.state).toBe("before");
    expect(fact.nextBoundary).toEqual({ kind: "shift-ends", localTime: "06:00" });
    expect(formatCivilDate(workFiscalWeekStart(instant, denver))).toBe("2026-10-03");
  });

  it("uses the later shift when yesterday's overnight and today's shift both contain the instant", () => {
    const fact = projectWorkOrientation({
      instant: new Date("2026-10-04T14:00:00.000Z"),
      timeZone: denver,
      todayEntry: scheduledWorkDay({
        workOn: "2026-10-04",
        startLocal: "06:00",
        endLocal: "15:00",
        shiftType: "opening",
      }),
      previousEntry: scheduledWorkDay({
        workOn: "2026-10-03",
        startLocal: "22:00",
        endLocal: "10:00",
        shiftType: "closing",
      }),
    });
    expect(fact.schedule).toMatchObject({ scheduledOn: "2026-10-04", shiftType: "opening" });
  });

  it("moves Power Hour with the confirmed timezone", () => {
    const instant = new Date("2026-10-03T15:30:00.000Z");
    const shared = {
      instant,
      todayEntry: opening,
      previousEntry: null,
    };
    expect(projectWorkOrientation({ ...shared, timeZone: denver }).powerHour.state).toBe("before");
    expect(projectWorkOrientation({ ...shared, timeZone: "America/New_York" }).powerHour.state).toBe(
      "during",
    );
  });

  it("keeps the spring-forward Power Hour start at 10:00 local", () => {
    const fact = projectWorkOrientation({
      instant: new Date("2026-03-08T16:00:00.000Z"),
      timeZone: denver,
      todayEntry: scheduledWorkDay({
        workOn: "2026-03-08",
        startLocal: "06:00",
        endLocal: "15:00",
        shiftType: "opening",
      }),
      previousEntry: null,
    });
    expect(fact.powerHour.state).toBe("during");
    expect(fact.cadence).toEqual({ kind: "opening", fsrIntendedBoundary: "reached" });
  });

  it("does not change an Active Thread or a Task", () => {
    const task: Task = {
      id: "task-1",
      title: "Count the aisle",
      contextId: null,
      createdAt: "2026-10-02T18:00:00.000Z",
      completedAt: null,
      dueOn: null,
      plannedOn: null,
      plannedLocal: null,
      mustDo: false,
      origin: "user_created",
      originatingNoteId: null,
    };
    const thread: ActiveThread = {
      taskId: task.id,
      establishedAt: "2026-10-02T18:05:00.000Z",
    };
    const taskBefore = structuredClone(task);
    const threadBefore = structuredClone(thread);
    const fact = orient("2026-10-03T17:00:00.000Z");

    expect(task).toEqual(taskBefore);
    expect(thread).toEqual(threadBefore);
    expect(fact).not.toHaveProperty("task");
    expect(JSON.stringify(fact)).not.toMatch(/Bay Audit|Cycle Count|Email/);
  });

  it("has no hidden clock or network dependency", () => {
    const source = [
      readFileSync(new URL("./workOrientation.ts", import.meta.url), "utf8"),
      readFileSync(new URL("../domain/workCadence.ts", import.meta.url), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(/Date\.now|new Date\(|fetch\(|supabase|rankNow|overdue/i);
  });
});
