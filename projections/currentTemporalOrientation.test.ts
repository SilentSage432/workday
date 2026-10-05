import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeThreadFromEstablishment } from "@/domain/activeThread";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import { projectResume } from "@/projections/resume";
import { projectTodayTasks } from "@/projections/today";
import { TIMELINE_SOURCE_KINDS } from "@/projections/timeline";
import {
  projectCurrentTemporalOrientation,
  type CurrentTemporalFact,
} from "@/projections/currentTemporalOrientation";
import { projectWorkOrientation } from "@/projections/workOrientation";

const boise = "America/Boise";
const denver = "America/Denver";

function block(
  id: string,
  input: Parameters<typeof defineBlock>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): Block {
  return { ...defineBlock(input), id, createdAt };
}

function protectedTime(
  id: string,
  input: Parameters<typeof defineProtectedTime>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt };
}

function commitment(
  id: string,
  input: Parameters<typeof defineCommitment>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): Commitment {
  return { ...defineCommitment(input), id, createdAt };
}

function orient(input: {
  instant: string;
  timeZone?: string;
  workSchedule?: readonly WorkScheduleEntry[];
  protectedTime?: readonly ProtectedTime[];
  blocks?: readonly Block[];
  commitments?: readonly Commitment[];
}) {
  return projectCurrentTemporalOrientation({
    instant: new Date(input.instant),
    timeZone: input.timeZone ?? boise,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
  });
}

function ids(facts: readonly CurrentTemporalFact[]): string[] {
  return facts.map((fact) => `${fact.sourceKind}:${fact.sourceId}`);
}

const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

describe("current temporal orientation", () => {
  it("returns an empty result when no established fact contains the instant", () => {
    const result = orient({
      instant: "2026-10-03T22:00:00.000Z",
      workSchedule: [opening],
      protectedTime: [
        protectedTime("later", {
          kind: "timed",
          startsOn: "2026-10-04",
          startLocal: "09:00",
          endLocal: "10:00",
          label: "School",
        }),
      ],
      blocks: [
        block("yesterday", {
          kind: "timed",
          startsOn: "2026-10-02",
          startLocal: "09:00",
          endLocal: "10:00",
          purpose: "Pack down",
        }),
      ],
      commitments: [
        commitment("tomorrow", {
          kind: "all_day",
          startsOn: "2026-10-04",
          title: "Appointment",
        }),
      ],
    });

    expect(result).toEqual({ facts: [] });
    expect(JSON.stringify(result)).not.toMatch(
      /free|available|unscheduled|unallocated|\bopen\b|conflict|capacity|priority|rank/i,
    );
  });

  it("keeps Work when the current schedule contains the instant", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      workSchedule: [opening],
    });

    expect(result.facts).toEqual([
      {
        sourceKind: "work_schedule",
        sourceId: "2026-10-03",
        startsOn: "2026-10-03",
        allDay: false,
        startLocal: "06:00",
        endLocal: "15:00",
        endsNextCivilDate: false,
        shiftType: "opening",
      },
    ]);
  });

  it("omits Work that is off, unknown, before the shift, or after the shift", () => {
    const during = "2026-10-03T16:00:00.000Z";
    expect(orient({ instant: during, workSchedule: [offWorkDay("2026-10-03")] }).facts).toEqual([]);
    expect(orient({ instant: during }).facts).toEqual([]);
    expect(orient({ instant: "2026-10-03T11:00:00.000Z", workSchedule: [opening] }).facts).toEqual([]);
    expect(orient({ instant: "2026-10-03T22:00:00.000Z", workSchedule: [opening] }).facts).toEqual([]);
  });

  it("keeps Protected Time that contains the instant", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      protectedTime: [
        protectedTime("school", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "11:00",
          label: "School",
        }),
      ],
    });

    expect(result.facts).toMatchObject([
      { sourceKind: "protected_time", sourceId: "school", label: "School", allDay: false },
    ]);
  });

  it("keeps a Block that contains the instant", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "11:00",
          purpose: "Flooring walk",
        }),
      ],
    });

    expect(result.facts).toMatchObject([
      { sourceKind: "block", sourceId: "floor", purpose: "Flooring walk" },
    ]);
  });

  it("keeps a Commitment that contains the instant", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      commitments: [
        commitment("dentist", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "11:00",
          title: "Dentist",
        }),
      ],
    });

    expect(result.facts).toMatchObject([
      { sourceKind: "commitment", sourceId: "dentist", title: "Dentist" },
    ]);
  });

  it("keeps Work and a Block together", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      workSchedule: [opening],
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Flooring walk",
        }),
      ],
    });

    expect(ids(result.facts)).toEqual(["work_schedule:2026-10-03", "block:floor"]);
  });

  it("keeps Work and Protected Time together", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      workSchedule: [opening],
      protectedTime: [
        protectedTime("school", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "12:00",
          label: "School",
        }),
      ],
    });

    expect(ids(result.facts)).toEqual(["work_schedule:2026-10-03", "protected_time:school"]);
  });

  it("keeps a Block and a Commitment together", () => {
    const result = orient({
      instant: "2026-10-03T16:30:00.000Z",
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "12:00",
          purpose: "Flooring walk",
        }),
      ],
      commitments: [
        commitment("dentist", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:30",
          endLocal: "11:00",
          title: "Dentist",
        }),
      ],
    });

    expect(ids(result.facts)).toEqual(["block:floor", "commitment:dentist"]);
  });

  it("keeps three simultaneous truths", () => {
    const result = orient({
      instant: "2026-10-03T16:30:00.000Z",
      workSchedule: [opening],
      protectedTime: [
        protectedTime("school", {
          kind: "all_day",
          startsOn: "2026-10-03",
          label: "Family",
        }),
      ],
      commitments: [
        commitment("dentist", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          title: "Dentist",
        }),
      ],
    });

    expect(ids(result.facts)).toEqual([
      "protected_time:school",
      "work_schedule:2026-10-03",
      "commitment:dentist",
    ]);
    expect(result.facts).toHaveLength(3);
  });

  it("does not rank facts or let Work outrank an earlier Block", () => {
    const blockFirst = block("floor", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "12:00",
      purpose: "Flooring walk",
    });
    const laterWork = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "10:00",
      endLocal: "15:00",
      shiftType: "mid",
    });
    const forward = orient({
      instant: "2026-10-03T17:00:00.000Z",
      workSchedule: [laterWork],
      blocks: [blockFirst],
    });
    const reversed = orient({
      instant: "2026-10-03T17:00:00.000Z",
      workSchedule: [laterWork],
      blocks: [blockFirst],
    });

    expect(ids(forward.facts)).toEqual(["block:floor", "work_schedule:2026-10-03"]);
    expect(reversed).toEqual(forward);
    expect(forward.facts[0]).not.toHaveProperty("rank");
    expect(JSON.stringify(forward)).not.toMatch(/priority|winner|loser|rankNow/);
  });

  it("uses the timeline source sequence only as a tie-break", () => {
    const result = orient({
      instant: "2026-10-03T16:30:00.000Z",
      workSchedule: [opening],
      protectedTime: [
        protectedTime("school", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "06:00",
          endLocal: "15:00",
          label: null,
        }),
      ],
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "06:00",
          endLocal: "15:00",
          purpose: "Flooring walk",
        }),
      ],
      commitments: [
        commitment("dentist", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "06:00",
          endLocal: "15:00",
          title: "Dentist",
        }),
      ],
    });

    expect(result.facts.map((fact) => fact.sourceKind)).toEqual([...TIMELINE_SOURCE_KINDS]);
  });

  it("has no conflict, availability, or capacity result", () => {
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      workSchedule: [opening],
      protectedTime: [
        protectedTime("school", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "12:00",
          label: "School",
        }),
      ],
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Flooring walk",
        }),
      ],
    });

    expect(result).not.toHaveProperty("conflict");
    expect(result).not.toHaveProperty("available");
    expect(result).not.toHaveProperty("capacity");
    expect(result.facts).toHaveLength(3);
  });

  it("does not let a current Block establish an Active Thread", () => {
    const task: Task = {
      id: "task-1",
      title: "Follow up with associate about inventory discrepancy",
      contextId: null,
      createdAt: "2026-10-03T15:00:00.000Z",
      completedAt: null,
      dueOn: "2026-10-03",
      plannedOn: "2026-10-03",
      mustDo: true,
      origin: "user_created",
      originatingNoteId: null,
    };
    const result = orient({
      instant: "2026-10-03T16:00:00.000Z",
      blocks: [
        block("floor", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "11:00",
          purpose: "Flooring walk",
        }),
      ],
    });

    expect(projectResume({ activeThread: null, openTasks: [task] })).toBeNull();
    expect(result.facts.map((fact) => fact.sourceKind)).toEqual(["block"]);
    expect(JSON.stringify(result)).not.toMatch(/task-1|activeThread|mustDo/);
  });

  it("does not let an Active Thread create temporal truth", () => {
    const task: Task = {
      id: "task-1",
      title: "Follow up with associate about inventory discrepancy",
      contextId: null,
      createdAt: "2026-10-03T15:00:00.000Z",
      completedAt: null,
      dueOn: "2026-10-04",
      plannedOn: "2026-10-03",
      mustDo: true,
      origin: "user_created",
      originatingNoteId: null,
    };
    const thread = activeThreadFromEstablishment(task.id, "2026-10-03T15:05:00.000Z");
    const result = orient({ instant: "2026-10-03T16:00:00.000Z" });
    const resume = projectResume({ activeThread: thread, openTasks: [task] });

    expect(result.facts).toEqual([]);
    expect(resume?.task).toEqual(task);
    expect(resume?.establishedAt).toBe("2026-10-03T15:05:00.000Z");
  });

  it("leaves Resume, Today, Must Do, and due unchanged", () => {
    const task: Task = {
      id: "task-1",
      title: "Cycle counts",
      contextId: null,
      createdAt: "2026-10-02T15:00:00.000Z",
      completedAt: null,
      dueOn: "2026-10-03",
      plannedOn: "2026-10-03",
      mustDo: true,
      origin: "user_created",
      originatingNoteId: null,
    };
    const thread = activeThreadFromEstablishment(task.id, "2026-10-03T15:00:00.000Z");
    const beforeResume = projectResume({ activeThread: thread, openTasks: [task] });
    const beforeToday = projectTodayTasks({ openTasks: [task], civilDate: "2026-10-03" });
    orient({
      instant: "2026-10-03T16:00:00.000Z",
      blocks: [
        block("floor", {
          kind: "all_day",
          startsOn: "2026-10-03",
          purpose: "Flooring walk",
        }),
      ],
    });

    expect(projectResume({ activeThread: thread, openTasks: [task] })).toEqual(beforeResume);
    expect(projectTodayTasks({ openTasks: [task], civilDate: "2026-10-03" })).toEqual(beforeToday);
    expect(task.mustDo).toBe(true);
    expect(task.dueOn).toBe("2026-10-03");
    expect(task.plannedOn).toBe("2026-10-03");
  });

  it("uses the confirmed zone at the UTC date boundary", () => {
    const saturday = block("saturday", {
      kind: "all_day",
      startsOn: "2026-10-03",
      purpose: "Family",
    });
    const instant = "2026-10-03T05:30:00.000Z";

    expect(orient({ instant, timeZone: boise, blocks: [saturday] }).facts).toEqual([]);
    expect(ids(orient({ instant, timeZone: "UTC", blocks: [saturday] }).facts)).toEqual([
      "block:saturday",
    ]);
  });

  it("follows the existing half-open interval", () => {
    const timed = block("morning", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "12:00",
      purpose: "Budget review",
    });

    expect(orient({ instant: "2026-10-03T13:59:00.000Z", blocks: [timed] }).facts).toEqual([]);
    expect(ids(orient({ instant: "2026-10-03T14:00:00.000Z", blocks: [timed] }).facts)).toEqual([
      "block:morning",
    ]);
    expect(ids(orient({ instant: "2026-10-03T17:59:00.000Z", blocks: [timed] }).facts)).toEqual([
      "block:morning",
    ]);
    expect(orient({ instant: "2026-10-03T18:00:00.000Z", blocks: [timed] }).facts).toEqual([]);
    expect(orient({ instant: "2026-10-03T18:01:00.000Z", blocks: [timed] }).facts).toEqual([]);
  });

  it("keeps overnight Work that the existing orientation still calls current", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const instant = new Date("2026-10-04T07:00:00.000Z");
    const result = projectCurrentTemporalOrientation({
      instant,
      timeZone: denver,
      workSchedule: [overnight],
      protectedTime: [],
      blocks: [],
      commitments: [],
    });
    const orientation = projectWorkOrientation({
      instant,
      timeZone: denver,
      todayEntry: null,
      previousEntry: overnight,
    });

    expect(orientation.schedule).toMatchObject({
      state: "scheduled",
      position: "during",
      scheduledOn: "2026-10-03",
    });
    expect(result.facts).toMatchObject([
      {
        sourceKind: "work_schedule",
        sourceId: "2026-10-03",
        startLocal: "22:00",
        endLocal: "06:00",
        endsNextCivilDate: true,
        shiftType: "closing",
      },
    ]);
  });

  it("keeps the later shift when yesterday and today both contain the instant", () => {
    const previous = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "22:00",
      endLocal: "10:00",
      shiftType: "closing",
    });
    const today = scheduledWorkDay({
      workOn: "2026-10-04",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const result = orient({
      instant: "2026-10-04T14:00:00.000Z",
      timeZone: denver,
      workSchedule: [previous, today],
    });

    expect(ids(result.facts)).toEqual(["work_schedule:2026-10-04"]);
  });

  it("follows existing unresolved and repeated local-time rules", () => {
    const gap = block("gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      purpose: "Planning",
    });
    const valid = block("later", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "10:00",
      endLocal: "11:00",
      purpose: "Flooring walk",
    });
    const ambiguous = commitment("fold", {
      kind: "timed",
      startsOn: "2026-11-01",
      startLocal: "01:30",
      endLocal: "01:45",
      title: "Rest",
    });

    expect(() => instantFromZonedLocal("2026-03-08", "02:30", denver)).toThrow(/does not occur/);
    expect(
      orient({
        instant: "2026-03-08T16:30:00.000Z",
        timeZone: denver,
        blocks: [gap, valid],
      }).facts.map((fact) => fact.sourceId),
    ).toEqual(["later"]);
    expect(
      orient({
        instant: "2026-11-01T18:00:00.000Z",
        timeZone: denver,
        commitments: [ambiguous],
      }).facts,
    ).toEqual([]);
  });

  it("does not read a clock, the network, or task truth", () => {
    const source = readFileSync(new URL("./currentTemporalOrientation.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /Date\.now|new Date\(|setTimeout|setInterval|supabase|fetch\(|mustDo|dueOn|plannedOn|activeThread|@\/domain\/task/,
    );
    expect(source).not.toMatch(/\b(free|available|unscheduled|unallocated|conflict|capacity|rankNow)\b/i);
  });
});
