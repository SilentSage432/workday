import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock } from "@/domain/block";
import { toBlockWrite } from "@/persistence/block";

const TASK_ID = "00000000-0000-4000-8000-000000000010";
const migration = readFileSync(
  new URL("../supabase/migrations/20261005092200_block_task.sql", import.meta.url),
  "utf8",
);

describe("block task reference", () => {
  it("keeps an ordinary block valid with no task", () => {
    const write = toBlockWrite(
      "user-1",
      defineBlock({ kind: "all_day", startsOn: "2026-10-03", purpose: "Rest" }),
    );
    expect(write.task_id).toBeNull();
    expect(write.purpose).toBe("Rest");
  });

  it("lets many blocks refer to one task without copying a title", () => {
    const first = toBlockWrite(
      "user-1",
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-05",
        startLocal: "14:00",
        endLocal: "15:00",
        purpose: "Focus",
        taskId: TASK_ID,
      }),
    );
    const second = toBlockWrite(
      "user-1",
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-06",
        startLocal: "13:00",
        endLocal: "14:00",
        purpose: "Continue",
        taskId: TASK_ID,
      }),
    );
    expect(first.task_id).toBe(TASK_ID);
    expect(second.task_id).toBe(TASK_ID);
    expect(first.purpose).toBe("Focus");
    expect(second.purpose).toBe("Continue");
    expect(first.starts_on).toBe("2026-10-05");
    expect(first).not.toHaveProperty("planned_on");
    expect(first).not.toHaveProperty("must_do");
    expect(first).not.toHaveProperty("due_on");
    expect(first).not.toHaveProperty("completed_at");
  });

  it("keeps the task reference when the block time changes", () => {
    const moved = toBlockWrite(
      "user-1",
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-07",
        startLocal: "15:00",
        endLocal: "15:30",
        purpose: "Focus",
        taskId: TASK_ID,
      }),
    );
    expect(moved.starts_on).toBe("2026-10-07");
    expect(moved.start_local).toBe("15:00:00");
    expect(moved.task_id).toBe(TASK_ID);
    expect(moved.purpose).toBe("Focus");
  });

  it("cites a same-owner task without deciding task removal", () => {
    expect(migration).toContain("add column task_id uuid");
    expect(migration).toContain("foreign key (task_id, user_id)");
    expect(migration).toContain("references public.tasks (id, user_id)");
    expect(migration).toContain("match simple");
    expect(migration).toContain("on delete no action");
    expect(migration).toContain("deferrable initially deferred");
    expect(migration).not.toMatch(/on delete cascade|on delete set null|on delete set default/i);
    expect(migration).not.toMatch(/unique \(task_id/);
    expect(migration).not.toMatch(/grant\s+/i);
    expect(migration).not.toMatch(/alter table public\.tasks/i);
    const tasks = readFileSync(
      new URL("../supabase/migrations/20261002223000_active_thread.sql", import.meta.url),
      "utf8",
    );
    expect(tasks).toContain("unique (id, user_id)");
  });

  it("does not mutate a task or the active thread from block writes", () => {
    const store = readFileSync(new URL("./block.ts", import.meta.url), "utf8");
    const create = store.slice(store.indexOf("export async function createBlock"), store.indexOf("export async function updateBlock"));
    const update = store.slice(store.indexOf("export async function updateBlock"), store.indexOf("export async function deleteBlock"));
    expect(create).toContain('.from("blocks")');
    expect(create).not.toMatch(/from\("tasks"\)|from\("active_thread"\)|planned_on|must_do|due_on|completed_at/);
    expect(store.slice(store.indexOf("export function toBlockWrite"), store.indexOf("async function requireUserId"))).toContain("task_id");
    expect(update).not.toMatch(/from\("tasks"\)|from\("active_thread"\)/);
    const completion = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const complete = completion.slice(
      completion.indexOf("export async function completeTask"),
      completion.indexOf("export async function reopenTask"),
    );
    const reopen = completion.slice(completion.indexOf("export async function reopenTask"));
    expect(complete).toContain("toCompletionUpdate");
    expect(complete).not.toMatch(/from\("blocks"\)|task_id/);
    expect(reopen).toContain("toReopenUpdate");
    expect(reopen).not.toMatch(/from\("blocks"\)|task_id|establishActiveThread/);
    const mapping = readFileSync(new URL("./contextTaskMapping.ts", import.meta.url), "utf8");
    expect(mapping.slice(mapping.indexOf("export function toCompletionUpdate"))).toContain("completed_at");
    expect(mapping).toContain("export function toReopenUpdate");
    const schedule = readFileSync(new URL("../components/WorkSchedule.tsx", import.meta.url), "utf8");
    const establish = schedule.slice(
      schedule.indexOf("async function establishSelection"),
      schedule.indexOf("async function updateSelection"),
    );
    expect(establish).toContain("createBlock");
    expect(establish).not.toMatch(/establishActiveThread|updateTask|completeTask|planned_on|mustDo/);
  });
});
