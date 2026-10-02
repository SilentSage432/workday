import { describe, expect, it } from "vitest";
import {
  ACTIVE_THREAD_COLUMNS,
  rowToActiveThread,
  toActiveThreadWrite,
} from "@/persistence/activeThread";

describe("active thread mapping", () => {
  it("keeps ownership out of the domain thread", () => {
    const thread = rowToActiveThread({
      task_id: "task-a",
      established_at: "2026-10-02T22:00:00.000Z",
    });

    expect(thread).toEqual({
      taskId: "task-a",
      establishedAt: "2026-10-02T22:00:00.000Z",
    });
    expect(thread).not.toHaveProperty("user_id");
    expect(thread).not.toHaveProperty("userId");
    expect(ACTIVE_THREAD_COLUMNS).not.toContain("user_id");
  });

  it("writes the owner, the task, and the establishment instant", () => {
    expect(toActiveThreadWrite("user-1", "task-a", new Date("2026-10-02T22:00:00.000Z"))).toEqual({
      user_id: "user-1",
      task_id: "task-a",
      established_at: "2026-10-02T22:00:00.000Z",
    });
  });

  it("does not write completion when establishing a thread", () => {
    const row = toActiveThreadWrite("user-1", "task-a", new Date("2026-10-02T22:00:00.000Z"));
    expect(row).not.toHaveProperty("completed_at");
  });

  it("rejects an establishment instant that is not a real time", () => {
    expect(() => toActiveThreadWrite("user-1", "task-a", new Date("not-a-time"))).toThrow(
      /real instant/,
    );
  });
});
