import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeThreadFromEstablishment } from "@/domain/activeThread";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import { scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import { projectPresentMomentOrientation } from "@/projections/presentMomentOrientation";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");

function block(id: string, purpose: string, contextId: string | null = null): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "09:00",
      endLocal: "12:00",
      purpose,
      contextId,
    }),
    id,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function protectedTime(id: string): ProtectedTime {
  return {
    ...defineProtectedTime({
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "09:00",
      endLocal: "12:00",
      label: "School",
    }),
    id,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function commitment(id: string): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "10:00",
      endLocal: "11:00",
      title: "Reservation",
    }),
    id,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

const opening: WorkScheduleEntry = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

function task(id: string, extras: Partial<Task> = {}): Task {
  return {
    id,
    title: "Cycle counts",
    contextId: null,
    createdAt: "2026-10-02T15:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    mustDo: false,
    origin: "user_created",
    ...extras,
  };
}

function compose(input: {
  workSchedule?: readonly WorkScheduleEntry[];
  protectedTime?: readonly ProtectedTime[];
  blocks?: readonly Block[];
  commitments?: readonly Commitment[];
  activeThread?: ReturnType<typeof activeThreadFromEstablishment> | null;
  openTasks?: readonly Task[];
  instant?: Date;
  timeZone?: string;
}) {
  return projectPresentMomentOrientation({
    instant: input.instant ?? instant,
    timeZone: input.timeZone ?? zone,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
    activeThread: input.activeThread === undefined ? null : input.activeThread,
    openTasks: input.openTasks ?? [],
  });
}

describe("present-moment orientation", () => {
  it("keeps temporal facts and the Active Thread as separate members", () => {
    const floor = block("floor", "Flooring walk");
    const open = task("task-1", { title: "Cycle counts", contextId: "work" });
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({
      blocks: [floor],
      activeThread: thread,
      openTasks: [open],
    });

    expect(Object.keys(result).sort()).toEqual(["orientation", "thread"]);
    expect(result.orientation.facts.map((fact) => fact.sourceId)).toEqual(["floor"]);
    expect(result.thread).toEqual({ task: open, establishedAt: thread.establishedAt });
    expect(result.orientation).not.toHaveProperty("thread");
    expect(result.thread).not.toHaveProperty("facts");
  });

  it("keeps every overlapping temporal truth beside one thread", () => {
    const open = task("task-1");
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({
      workSchedule: [opening],
      protectedTime: [protectedTime("school")],
      blocks: [block("floor", "Flooring walk", "work")],
      commitments: [commitment("reservation")],
      activeThread: thread,
      openTasks: [open],
    });

    expect(result.orientation.facts.map((fact) => fact.sourceKind).sort()).toEqual([
      "block",
      "commitment",
      "protected_time",
      "work_schedule",
    ]);
    expect(result.thread?.task.id).toBe("task-1");
    expect(result).not.toHaveProperty("winner");
    expect(result).not.toHaveProperty("rank");
    expect(result.orientation).not.toHaveProperty("primary");
  });

  it("allows an empty orientation while an Active Thread exists", () => {
    const open = task("task-1");
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({ activeThread: thread, openTasks: [open] });

    expect(result.orientation.facts).toEqual([]);
    expect(result.thread?.task.id).toBe("task-1");
    expect(JSON.stringify(result.orientation)).not.toMatch(
      /free|available|allocatable|unoccupied|nothing important|nothing planned|nothing to do/i,
    );
  });

  it("allows temporal facts while the Active Thread is absent", () => {
    const result = compose({ blocks: [block("floor", "Flooring walk")] });

    expect(result.orientation.facts).toHaveLength(1);
    expect(result.thread).toBeNull();
  });

  it("allows both to be absent without an availability or recommendation claim", () => {
    const result = compose({});

    expect(result.orientation.facts).toEqual([]);
    expect(result.thread).toBeNull();
    expect(result).not.toHaveProperty("available");
    expect(result).not.toHaveProperty("recommendation");
    expect(result).not.toHaveProperty("next");
    expect(JSON.stringify(result)).not.toMatch(/\b(free|available|open|allocatable|unoccupied)\b/i);
  });

  it("does not promote the Active Thread into temporal orientation", () => {
    const open = task("task-1", { title: "Cycle counts" });
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({ activeThread: thread, openTasks: [open] });

    expect(result.orientation.facts).toEqual([]);
    expect(JSON.stringify(result.orientation)).not.toContain("task-1");
    expect(JSON.stringify(result.orientation)).not.toContain("Cycle counts");
  });

  it("does not let a temporal fact establish or replace the Active Thread", () => {
    const other = task("task-other", { title: "Call the school" });
    const current = task("task-1", { title: "Cycle counts" });
    const thread = activeThreadFromEstablishment(current.id, "2026-10-03T15:00:00.000Z");
    const result = compose({
      blocks: [block("floor", "Call the school")],
      activeThread: thread,
      openTasks: [current, other],
    });

    expect(result.thread?.task.id).toBe("task-1");
    expect(result.orientation.facts[0]).toMatchObject({ sourceKind: "block", sourceId: "floor" });
  });

  it("does not admit Must Do, planned, due, or Today as members", () => {
    const mustDo = task("must", { mustDo: true, plannedOn: "2026-10-03", dueOn: "2026-10-03" });
    const result = compose({ openTasks: [mustDo] });

    expect(result.thread).toBeNull();
    expect(result.orientation.facts).toEqual([]);
    expect(result).not.toHaveProperty("today");
    expect(result).not.toHaveProperty("mustDo");
    expect(result).not.toHaveProperty("due");
    expect(result).not.toHaveProperty("planned");
    expect(JSON.stringify(result)).not.toContain("must");
  });

  it("does not infer a current Context from either truth", () => {
    const open = task("task-1", { contextId: "family" });
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({
      blocks: [block("floor", "Flooring walk", "work")],
      activeThread: thread,
      openTasks: [open],
    });

    expect(result).not.toHaveProperty("currentContext");
    expect(result.orientation).not.toHaveProperty("context");
    expect(result.thread?.task.contextId).toBe("family");
    expect(result.orientation.facts[0]).not.toHaveProperty("contextId");
  });

  it("does not rank or recommend", () => {
    const open = task("task-1", { mustDo: true });
    const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");
    const result = compose({
      workSchedule: [opening],
      blocks: [block("floor", "Flooring walk")],
      activeThread: thread,
      openTasks: [open],
    });

    expect(result).not.toHaveProperty("rank");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("recommendation");
    expect(result).not.toHaveProperty("nextAction");
    expect(result.orientation.facts).toHaveLength(2);
  });

  it("returns the same result for the same instant, zone, and complete inputs", () => {
    const open = task("task-1");
    const input = {
      workSchedule: [opening],
      blocks: [block("floor", "Flooring walk")],
      activeThread: activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z"),
      openTasks: [open],
      instant,
      timeZone: zone,
    };

    expect(compose(input)).toEqual(compose(input));
    expect(compose({ ...input, timeZone: "UTC" }).orientation.facts).toEqual([]);
  });

  it("does not choose a winner among overlapping facts", () => {
    const result = compose({
      workSchedule: [opening],
      protectedTime: [protectedTime("school")],
      blocks: [block("floor", "Flooring walk")],
      commitments: [commitment("reservation")],
    });

    expect(result.orientation.facts).toHaveLength(4);
    expect(new Set(result.orientation.facts.map((fact) => fact.sourceKind)).size).toBe(4);
  });

  it("does not write, read a clock, or resurrect rankNow", () => {
    const source = readFileSync(new URL("./presentMomentOrientation.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /Date\.now|new Date\(|supabase|fetch\(|rankNow|NowProjection|projectToday|localStorage|insert\(|update\(|upsert\(/,
    );
    expect(source).not.toMatch(/\b(free|available|recommendation|currentContext|urgency)\b/);
  });
});
