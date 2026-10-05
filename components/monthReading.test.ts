import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composeMonthReading } from "@/components/monthReading";
import type { SourceRead } from "@/components/currentTemporalReading";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import { defineProtectedTime } from "@/domain/protectedTime";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";
import { projectTimeline, type CivilDateRange } from "@/projections/timeline";
import { weekLoadedSpan } from "@/projections/weekShape";

const zone = "America/Denver";
const range: CivilDateRange = { startsOn: "2026-10-05", endsBefore: "2026-10-08" };
const destinationId = "00000000-0000-4000-8000-000000000001";
const otherDestinationId = "00000000-0000-4000-8000-000000000003";
const priorityId = "00000000-0000-4000-8000-000000000002";
const otherPriorityId = "00000000-0000-4000-8000-000000000004";
const taskId = "00000000-0000-4000-8000-000000000010";
const completedTaskId = "00000000-0000-4000-8000-000000000012";
const uncitedTaskId = "00000000-0000-4000-8000-000000000014";
const blockId = "00000000-0000-4000-8000-000000000011";
const outsideBlockId = "00000000-0000-4000-8000-000000000013";
const contextId = "00000000-0000-4000-8000-000000000020";

const destination: Destination = {
  id: destinationId,
  content: "A calmer practice",
  establishedAt: "2020-01-01T00:00:00.000Z",
};
const laterDestination: Destination = {
  id: otherDestinationId,
  content: "The house",
  establishedAt: "2026-12-01T00:00:00.000Z",
};
const priority: Priority = {
  id: priorityId,
  content: "The morning pages",
  destinationId,
  establishedAt: "2020-02-01T00:00:00.000Z",
};
const laterPriority: Priority = {
  id: otherPriorityId,
  content: "The roof",
  destinationId: otherDestinationId,
  establishedAt: "2026-12-02T00:00:00.000Z",
};

function ready<T>(rows: readonly T[]): { status: "ready"; rows: readonly T[] } {
  return { status: "ready", rows };
}

function failed<T>(message: string): SourceRead<T> {
  return { status: "failed", message };
}

function block(id: string, input: Parameters<typeof defineBlock>[0]) {
  return { ...defineBlock(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function protectedTime(id: string, input: Parameters<typeof defineProtectedTime>[0]) {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitment(id: string, input: Parameters<typeof defineCommitment>[0]) {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function compose(overrides: Partial<Parameters<typeof composeMonthReading>[0]> = {}) {
  const asked = overrides.range ?? range;
  return composeMonthReading({
    timeZone: zone,
    destinations: ready([]),
    priorities: ready([]),
    work: ready([]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
    ...overrides,
    range: asked,
    loaded: overrides.loaded ?? weekLoadedSpan(asked),
  });
}

describe("month reading", () => {
  it("accepts an explicit half-open civil range that is not a calendar month", () => {
    const short = { startsOn: "2026-10-05", endsBefore: "2026-10-07" };
    const long = { startsOn: "2026-10-05", endsBefore: "2026-11-14" };
    expect(compose({ range: short })).toMatchObject({ status: "complete", range: short, temporalFacts: [] });
    expect(compose({ range: long })).toMatchObject({ status: "complete", range: long, temporalFacts: [] });
  });

  it("rejects an inverted range", () => {
    expect(() => compose({ range: { startsOn: "2026-10-08", endsBefore: "2026-10-05" } })).toThrow(
      "A timeline range must start before it ends.",
    );
  });

  it("includes every retained Destination and Priority, including ones established outside the range", () => {
    const reading = compose({
      destinations: ready([destination, laterDestination]),
      priorities: ready([priority, laterPriority]),
    });
    expect(reading).toMatchObject({
      status: "complete",
      destinations: [destination, laterDestination],
      priorities: [priority, laterPriority],
    });
  });

  it("keeps Priority ancestry and does not give a service pair a Destination", () => {
    const taskPair: TaskPriorityService = {
      taskId: completedTaskId,
      priorityId,
      establishedAt: "2019-01-01T00:00:00.000Z",
    };
    const blockPair: BlockPriorityService = {
      blockId: outsideBlockId,
      priorityId: otherPriorityId,
      establishedAt: "2027-01-01T00:00:00.000Z",
    };
    const reading = compose({
      destinations: ready([destination, laterDestination]),
      priorities: ready([priority, laterPriority]),
      taskPriorityService: ready([taskPair]),
      blockPriorityService: ready([blockPair]),
      citedTasks: ready([{ id: completedTaskId, title: "Finished audit" }]),
      blocks: ready([
        block(outsideBlockId, {
          kind: "timed",
          startsOn: "2026-01-01",
          startLocal: "09:00",
          endLocal: "10:00",
          purpose: "Elsewhere",
          taskId: completedTaskId,
        }),
      ]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.priorities.map((item) => item.destinationId)).toEqual([destinationId, otherDestinationId]);
    expect(reading.taskPriorityService).toEqual([taskPair]);
    expect(reading.blockPriorityService).toEqual([blockPair]);
    expect(reading.temporalFacts).toEqual([]);
    expect(reading.taskPriorityService[0]).not.toHaveProperty("destinationId");
    expect(reading.blockPriorityService[0]).not.toHaveProperty("destinationId");
    expect(JSON.stringify(reading.taskPriorityService)).not.toContain(otherPriorityId);
  });

  it("lets Work, Protected Time, a Commitment, and a Block participate", () => {
    const work = ready([scheduledWorkDay({ workOn: "2026-10-05", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })]);
    const protectedRows = ready([
      protectedTime("protected", { kind: "timed", startsOn: "2026-10-06", startLocal: "12:00", endLocal: "13:00", label: "Family" }),
    ]);
    const commitments = ready([
      commitment("commitment", { kind: "timed", startsOn: "2026-10-07", startLocal: "09:00", endLocal: "10:00", title: "Standup" }),
    ]);
    const blocks = ready([
      block(blockId, {
        kind: "timed",
        startsOn: "2026-10-07",
        startLocal: "15:00",
        endLocal: "16:00",
        purpose: "Write",
        contextId,
        taskId,
      }),
    ]);
    const reading = compose({ work, protectedTime: protectedRows, commitments, blocks });
    expect(reading).toMatchObject({
      status: "complete",
      temporalFacts: projectTimeline({
        range,
        timeZone: zone,
        workSchedule: work.rows,
        protectedTime: protectedRows.rows,
        blocks: blocks.rows,
        commitments: commitments.rows,
      }),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.temporalFacts.map((fact) => fact.sourceKind)).toEqual([
      "work_schedule",
      "protected_time",
      "commitment",
      "block",
    ]);
    expect(reading.temporalFacts.at(-1)).toMatchObject({
      sourceKind: "block",
      sourceId: blockId,
      taskId,
      contextId,
    });
  });

  it("preserves overlap and does not choose a winner", () => {
    const asked = { startsOn: "2026-10-05", endsBefore: "2026-10-06" };
    const reading = compose({
      range: asked,
      work: ready([scheduledWorkDay({ workOn: "2026-10-05", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })]),
      protectedTime: ready([
        protectedTime("protected", { kind: "timed", startsOn: "2026-10-05", startLocal: "10:00", endLocal: "12:00" }),
      ]),
      commitments: ready([
        commitment("commitment", { kind: "timed", startsOn: "2026-10-05", startLocal: "11:00", endLocal: "13:00", title: "Standup" }),
      ]),
      blocks: ready([
        block(blockId, { kind: "timed", startsOn: "2026-10-05", startLocal: "12:00", endLocal: "14:00", purpose: "Write" }),
      ]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.temporalFacts).toHaveLength(4);
    expect(new Set(reading.temporalFacts.map((fact) => fact.sourceKind)).size).toBe(4);
  });

  it("keeps a Task-associated Block as a Block and does not invent a service pair from it", () => {
    const reading = compose({
      blocks: ready([
        block(blockId, {
          kind: "timed",
          startsOn: "2026-10-06",
          startLocal: "14:00",
          endLocal: "15:00",
          purpose: "Write",
          taskId,
        }),
      ]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.temporalFacts).toEqual([
      expect.objectContaining({ sourceKind: "block", sourceId: blockId, taskId }),
    ]);
    expect(reading.taskPriorityService).toEqual([]);
    expect(reading.blockPriorityService).toEqual([]);
    expect(reading.citedTasks).toEqual([]);
  });

  it("preserves look-behind when that civil day was loaded", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-04",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const asked = { startsOn: "2026-10-05", endsBefore: "2026-10-06" };
    const reading = compose({ range: asked, work: ready([overnight]) });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.temporalFacts).toEqual(
      projectTimeline({
        range: asked,
        timeZone: zone,
        workSchedule: [overnight],
        protectedTime: [],
        blocks: [],
        commitments: [],
      }),
    );
    expect(reading.temporalFacts[0]).toMatchObject({
      sourceKind: "work_schedule",
      sourceId: "2026-10-04",
      endsNextCivilDate: true,
    });
  });

  it("fails closed when the loaded window misses the look-behind", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-04",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const reading = compose({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-06" },
      loaded: { from: "2026-10-05", to: "2026-10-05" },
      work: ready([overnight]),
    });
    expect(reading).toEqual({
      status: "incomplete",
      message: "Month could not be completed. The read does not cover this range.",
    });
    expect(reading).not.toHaveProperty("temporalFacts");
  });

  it("follows Timeline across the spring-forward and fall-back dates", () => {
    const spring = { startsOn: "2026-03-08", endsBefore: "2026-03-09" };
    const fall = { startsOn: "2026-11-01", endsBefore: "2026-11-02" };
    const springWork = [scheduledWorkDay({ workOn: "2026-03-08", startLocal: "01:00", endLocal: "04:00", shiftType: "opening" })];
    const fallCommitments = [
      commitment("fold", { kind: "timed", startsOn: "2026-11-01", startLocal: "01:30", endLocal: "01:45", title: "Reservation" }),
    ];
    const springReading = compose({ range: spring, work: ready(springWork) });
    const fallReading = compose({ range: fall, commitments: ready(fallCommitments) });
    expect(springReading).toMatchObject({
      status: "complete",
      temporalFacts: projectTimeline({
        range: spring,
        timeZone: zone,
        workSchedule: springWork,
        protectedTime: [],
        blocks: [],
        commitments: [],
      }),
    });
    expect(fallReading).toMatchObject({
      status: "complete",
      temporalFacts: projectTimeline({
        range: fall,
        timeZone: zone,
        workSchedule: [],
        protectedTime: [],
        blocks: [],
        commitments: fallCommitments,
      }),
    });
  });

  it("does not turn an ordinary Task, Work Off, or a missing Work row into temporal structure", () => {
    const reading = compose({
      work: ready([offWorkDay("2026-10-05")]),
      taskPriorityService: ready([
        { taskId: completedTaskId, priorityId, establishedAt: "2026-10-06T15:00:00.000Z" },
      ]),
      citedTasks: ready([{ id: completedTaskId, title: "Finished audit" }]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.temporalFacts).toEqual([]);
    expect(reading.citedTasks).toEqual([{ id: completedTaskId, title: "Finished audit" }]);
    expect(reading.citedTasks[0]).not.toHaveProperty("completedAt");
    expect(reading.citedTasks[0]).not.toHaveProperty("plannedOn");
    expect(reading.citedTasks[0]).not.toHaveProperty("mustDo");
  });

  it("names only cited Tasks and omits an uncited Task", () => {
    const reading = compose({
      taskPriorityService: ready([
        { taskId: completedTaskId, priorityId, establishedAt: "2026-10-06T15:00:00.000Z" },
      ]),
      citedTasks: ready([
        { id: uncitedTaskId, title: "Not cited" },
        { id: completedTaskId, title: "Finished audit" },
      ]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete reading");
    expect(reading.citedTasks).toEqual([{ id: completedTaskId, title: "Finished audit" }]);
  });

  it("fails closed when a retained Task pair has no cited identity", () => {
    const reading = compose({
      destinations: ready([destination]),
      taskPriorityService: ready([{ taskId, priorityId, establishedAt: "2026-10-06T15:00:00.000Z" }]),
      citedTasks: ready([{ id: uncitedTaskId, title: "Not cited" }]),
    });
    expect(reading).toEqual({
      status: "incomplete",
      message: "Month could not be completed. A cited task identity is missing.",
    });
    expect(reading).not.toHaveProperty("temporalFacts");
    expect(reading).not.toHaveProperty("taskPriorityService");
    expect(reading).not.toHaveProperty("destinations");
  });

  it("fails closed when cited-task retrieval failed and does not drop the pair", () => {
    const reading = compose({
      taskPriorityService: ready([{ taskId, priorityId, establishedAt: "2026-10-06T15:00:00.000Z" }]),
      citedTasks: failed("Cited tasks failed."),
    });
    expect(reading).toEqual({
      status: "incomplete",
      message: "Month could not be completed. Cited tasks failed.",
    });
    expect(reading).not.toHaveProperty("taskPriorityService");
  });

  it.each<[string, Partial<Parameters<typeof composeMonthReading>[0]>, string]>([
    ["destinations", { destinations: failed("Destinations failed.") }, "Destinations failed."],
    ["priorities", { priorities: failed("Priorities failed.") }, "Priorities failed."],
    ["work", { work: failed("Work schedule failed.") }, "Work schedule failed."],
    ["protected time", { protectedTime: failed("Protected Time failed.") }, "Protected Time failed."],
    ["commitments", { commitments: failed("Commitments failed.") }, "Commitments failed."],
    ["blocks", { blocks: failed("Blocks failed.") }, "Blocks failed."],
    ["task service", { taskPriorityService: failed("Task service failed.") }, "Task service failed."],
    ["block service", { blockPriorityService: failed("Block service failed.") }, "Block service failed."],
  ])("fails closed when %s is incomplete", (_name, override, message) => {
    const reading = compose(override);
    expect(reading.status).toBe("incomplete");
    if (reading.status !== "incomplete") throw new Error("expected incomplete");
    expect(reading.message).toContain(message);
    expect(reading).not.toHaveProperty("temporalFacts");
    expect(reading).not.toHaveProperty("destinations");
  });

  it("treats ready empty sources as a complete reading of nothing established", () => {
    const reading = compose();
    expect(reading).toEqual({
      status: "complete",
      range,
      destinations: [],
      priorities: [],
      temporalFacts: [],
      taskPriorityService: [],
      blockPriorityService: [],
      citedTasks: [],
    });
    expect(Object.keys(reading).sort()).toEqual([
      "blockPriorityService",
      "citedTasks",
      "destinations",
      "priorities",
      "range",
      "status",
      "taskPriorityService",
      "temporalFacts",
    ]);
    const serialized = JSON.stringify(reading);
    for (const word of ["available", "progress", "alignment", "utilization", "remaining", "score", "health"]) {
      expect(serialized).not.toContain(word);
    }
  });

  it("does not read Context, Capacity, or Week's shape projection", () => {
    const source = readFileSync(new URL("./monthReading.ts", import.meta.url), "utf8");
    expect(source).toContain("projectMonth");
    expect(source).toContain("weekLoadedSpan");
    expect(source).not.toContain("projectWeekShape");
    expect(source).not.toContain("projectTimeline");
    expect(source).not.toContain("projectCapacity");
    expect(source).not.toContain("loadOpenTasks");
    expect(source).not.toContain("loadContexts");
  });
});
