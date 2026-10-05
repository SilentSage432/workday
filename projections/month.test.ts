import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import { defineBlock } from "@/domain/block";
import { scheduledWorkDay } from "@/domain/workSchedule";
import { projectMonth } from "@/projections/month";
import { projectTimeline } from "@/projections/timeline";

const zone = "America/Denver";
const range = { startsOn: "2026-10-05", endsBefore: "2026-10-08" };
const destinationId = "00000000-0000-4000-8000-000000000001";
const otherDestinationId = "00000000-0000-4000-8000-000000000003";
const priorityId = "00000000-0000-4000-8000-000000000002";
const otherPriorityId = "00000000-0000-4000-8000-000000000004";
const taskId = "00000000-0000-4000-8000-000000000010";
const uncitedTaskId = "00000000-0000-4000-8000-000000000014";
const blockId = "00000000-0000-4000-8000-000000000011";

const destination: Destination = {
  id: destinationId,
  content: "A calmer practice",
  establishedAt: "2020-01-01T00:00:00.000Z",
};
const otherDestination: Destination = {
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
const otherPriority: Priority = {
  id: otherPriorityId,
  content: "The roof",
  destinationId: otherDestinationId,
  establishedAt: "2026-12-02T00:00:00.000Z",
};
const taskPair: TaskPriorityService = {
  taskId,
  priorityId,
  establishedAt: "2019-06-01T00:00:00.000Z",
};
const blockPair: BlockPriorityService = {
  blockId,
  priorityId: otherPriorityId,
  establishedAt: "2027-01-01T00:00:00.000Z",
};

describe("month projection", () => {
  it("keeps every retained direction and both service collections, and names only cited tasks", () => {
    const perception = projectMonth({
      range,
      timeZone: zone,
      destinations: [destination, otherDestination],
      priorities: [priority, otherPriority],
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      taskPriorityService: [taskPair],
      blockPriorityService: [blockPair],
      citedTasks: [
        { id: uncitedTaskId, title: "Uncited" },
        { id: taskId, title: "Finished audit" },
      ],
    });

    expect(perception.destinations).toEqual([destination, otherDestination]);
    expect(perception.priorities).toEqual([priority, otherPriority]);
    expect(perception.priorities[0]?.destinationId).toBe(destinationId);
    expect(perception.taskPriorityService).toEqual([taskPair]);
    expect(perception.blockPriorityService).toEqual([blockPair]);
    expect(perception.citedTasks).toEqual([{ id: taskId, title: "Finished audit" }]);
    expect(perception.temporalFacts).toEqual([]);
    expect(perception.taskPriorityService[0]).not.toHaveProperty("destinationId");
    expect(perception.blockPriorityService[0]).not.toHaveProperty("destinationId");
  });

  it("keeps a service pair when the cited task identity was not supplied", () => {
    const perception = projectMonth({
      range,
      timeZone: zone,
      destinations: [],
      priorities: [],
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      taskPriorityService: [taskPair],
      blockPriorityService: [],
      citedTasks: [],
    });
    expect(perception.taskPriorityService).toEqual([taskPair]);
    expect(perception.citedTasks).toEqual([]);
  });

  it("places temporal structure with Timeline and does not place an ordinary Task", () => {
    const work = [scheduledWorkDay({ workOn: "2026-10-06", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })];
    const outside = {
      ...defineBlock({
        kind: "timed" as const,
        startsOn: "2026-01-01",
        startLocal: "09:00",
        endLocal: "10:00",
        purpose: "Elsewhere",
        taskId,
      }),
      id: blockId,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const perception = projectMonth({
      range,
      timeZone: zone,
      destinations: [destination],
      priorities: [priority],
      workSchedule: work,
      protectedTime: [],
      blocks: [outside],
      commitments: [],
      taskPriorityService: [taskPair],
      blockPriorityService: [{ ...blockPair, blockId }],
      citedTasks: [{ id: taskId, title: "Finished audit" }],
    });
    expect(perception.temporalFacts).toEqual(
      projectTimeline({
        range,
        timeZone: zone,
        workSchedule: work,
        protectedTime: [],
        blocks: [outside],
        commitments: [],
      }),
    );
    expect(perception.temporalFacts.map((fact) => fact.sourceKind)).toEqual(["work_schedule"]);
    expect(perception.blockPriorityService).toHaveLength(1);
  });

  it("rejects an inverted range", () => {
    expect(() =>
      projectMonth({
        range: { startsOn: "2026-10-08", endsBefore: "2026-10-05" },
        timeZone: zone,
        destinations: [],
        priorities: [],
        workSchedule: [],
        protectedTime: [],
        blocks: [],
        commitments: [],
        taskPriorityService: [],
        blockPriorityService: [],
        citedTasks: [],
      }),
    ).toThrow("A timeline range must start before it ends.");
  });

  it("composes Timeline and does not calculate Capacity or call Week", () => {
    const source = readFileSync(new URL("./month.ts", import.meta.url), "utf8");
    expect(source).toContain("projectTimeline");
    expect(source).not.toContain("projectWeekShape");
    expect(source).not.toContain("projectCapacity");
    expect(source).not.toContain("loadOpenTasks");
    expect(source).not.toContain("projectCurrentTemporalOrientation");
  });
});
