import { describe, expect, it } from "vitest";
import {
  blockServiceEstablishedAtFromAct,
  requireBlockServiceBlockId,
  requireBlockServiceEstablishedAt,
  requireBlockServicePriorityId,
  requireTaskServiceEstablishedAt,
  requireTaskServicePriorityId,
  requireTaskServiceTaskId,
  taskServiceEstablishedAtFromAct,
} from "@/domain/executionDirection";

const TASK_ID = "00000000-0000-4000-8000-000000000010";
const BLOCK_ID = "00000000-0000-4000-8000-000000000011";
const PRIORITY_ID = "00000000-0000-4000-8000-000000000002";

describe("execution direction domain", () => {
  it("keeps a task pair as the task, the priority, and the establishment instant", () => {
    expect(requireTaskServiceTaskId(TASK_ID)).toBe(TASK_ID);
    expect(requireTaskServicePriorityId(PRIORITY_ID)).toBe(PRIORITY_ID);
    expect(taskServiceEstablishedAtFromAct(new Date("2026-10-05T17:00:00.000Z"))).toBe(
      "2026-10-05T17:00:00.000Z",
    );
  });

  it("keeps a block pair as the block, the priority, and the establishment instant", () => {
    expect(requireBlockServiceBlockId(BLOCK_ID)).toBe(BLOCK_ID);
    expect(requireBlockServicePriorityId(PRIORITY_ID)).toBe(PRIORITY_ID);
    expect(blockServiceEstablishedAtFromAct(new Date("2026-10-05T17:05:00.000Z"))).toBe(
      "2026-10-05T17:05:00.000Z",
    );
  });

  it("rejects a missing endpoint", () => {
    expect(() => requireTaskServiceTaskId("task-1")).toThrow(/stable identity/);
    expect(() => requireBlockServiceBlockId("block-1")).toThrow(/stable identity/);
    expect(() => requireTaskServicePriorityId("priority-1")).toThrow(/established priority/);
    expect(() => requireBlockServicePriorityId("")).toThrow(/established priority/);
  });

  it("records an establishment instant and rejects a civil date", () => {
    expect(requireTaskServiceEstablishedAt("2026-10-05T17:00:00.000Z")).toBe(
      "2026-10-05T17:00:00.000Z",
    );
    expect(requireBlockServiceEstablishedAt("2026-10-05T17:05:00.000Z")).toBe(
      "2026-10-05T17:05:00.000Z",
    );
    expect(() => requireTaskServiceEstablishedAt("2026-10-05")).toThrow(/when it was established/);
    expect(() => requireBlockServiceEstablishedAt("2026-10-05")).toThrow(/when it was established/);
    expect(() => taskServiceEstablishedAtFromAct(new Date("nope"))).toThrow(/when it was established/);
    expect(() => blockServiceEstablishedAtFromAct(new Date("nope"))).toThrow(/when it was established/);
  });
});
