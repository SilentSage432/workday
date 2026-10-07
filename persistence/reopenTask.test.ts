import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { activeThreadAfterCompletion, activeThreadFromEstablishment } from "@/domain/activeThread";
import type { Task } from "@/domain/task";
import { completeTask, loadOpenTasks, reopenTask, updateTask } from "@/persistence/contextsAndTasks";
import { toCompletionUpdate, toReopenUpdate, toTaskUpdate } from "@/persistence/contextTaskMapping";
import type { TaskRow } from "@/persistence/contextTaskRows";
import { projectResume } from "@/projections/resume";

const COMPLETED_AT = "2026-10-07T15:30:00.000Z";

function completedRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "task-1",
    context_id: "context-family",
    title: "Call the school",
    created_at: "2026-10-01T15:00:00.000Z",
    completed_at: COMPLETED_AT,
    due_on: "2026-10-10",
    planned_on: "2026-10-07",
    must_do: true,
    origin: "user_created",
    originating_note_id: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

function authClient(handlers: {
  update?: (payload: Record<string, unknown>) => { data: TaskRow | null; error: { message: string } | null };
  openRows?: TaskRow[];
}): SupabaseClient {
  const from = (table: string) => {
    if (table !== "tasks") throw new Error(`Unexpected table ${table}.`);
    return {
      update(payload: Record<string, unknown>) {
        return {
          eq(column: string, id: string) {
            expect(column).toBe("id");
            expect(id).toBe("task-1");
            return {
              select() {
                return {
                  async single() {
                    return handlers.update?.(payload) ?? { data: null, error: { message: "missing update" } };
                  },
                };
              },
            };
          },
        };
      },
      select() {
        return {
          is(column: string, value: null) {
            expect(column).toBe("completed_at");
            expect(value).toBeNull();
            return this;
          },
          order() {
            return this;
          },
          async range() {
            const rows = (handlers.openRows ?? []).filter((row) => row.completed_at === null);
            return { data: rows, error: null, count: rows.length };
          },
        };
      },
    };
  };
  return {
    from,
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
  } as unknown as SupabaseClient;
}

describe("reopenTask", () => {
  it("clears completed_at only and preserves the same Task facts", async () => {
    const before = completedRow();
    let written: Record<string, unknown> | null = null;
    const client = authClient({
      update(payload) {
        written = payload;
        return {
          data: { ...before, completed_at: null },
          error: null,
        };
      },
    });

    const reopened = await reopenTask(client, "task-1");
    expect(written).toEqual({ completed_at: null });
    expect(reopened).toEqual({
      id: "task-1",
      title: "Call the school",
      contextId: "context-family",
      createdAt: "2026-10-01T15:00:00.000Z",
      completedAt: null,
      dueOn: "2026-10-10",
      plannedOn: "2026-10-07",
      mustDo: true,
      origin: "user_created",
      originatingNoteId: "00000000-0000-4000-8000-000000000001",
    } satisfies Task);
  });

  it("leaves canonical completion unchanged when the write fails", async () => {
    const client = authClient({
      update() {
        return { data: null, error: { message: "write refused" } };
      },
    });
    await expect(reopenTask(client, "task-1")).rejects.toThrow(/write refused/);
  });

  it("returns the Task to the open projection after reread", async () => {
    const open = completedRow({ completed_at: null });
    const client = authClient({ openRows: [open, completedRow({ id: "task-2" })] });
    const rows = await loadOpenTasks(client);
    expect(rows.map((task) => task.id)).toEqual(["task-1"]);
    expect(rows[0]?.completedAt).toBeNull();
  });

  it("does not restore Active Thread when the Task is open again", () => {
    const thread = activeThreadFromEstablishment("task-1", "2026-10-07T12:00:00.000Z");
    const afterComplete = activeThreadAfterCompletion(thread, "task-1");
    expect(afterComplete).toBeNull();
    const openAgain = {
      id: "task-1",
      title: "Call the school",
      contextId: "context-family",
      createdAt: "2026-10-01T15:00:00.000Z",
      completedAt: null,
      dueOn: "2026-10-10",
      plannedOn: "2026-10-07",
      mustDo: true,
      origin: "user_created" as const,
      originatingNoteId: "00000000-0000-4000-8000-000000000001",
    };
    expect(projectResume({ activeThread: afterComplete, openTasks: [openAgain] })).toBeNull();
  });

  it("keeps complete and reopen as narrow symmetrical writers", () => {
    expect(toCompletionUpdate(new Date(COMPLETED_AT))).toEqual({ completed_at: COMPLETED_AT });
    expect(toReopenUpdate()).toEqual({ completed_at: null });
    expect(toTaskUpdate({ title: "Call", plannedOn: "2026-10-08", mustDo: false })).not.toHaveProperty(
      "completed_at",
    );

    const source = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const complete = source.slice(source.indexOf("export async function completeTask"), source.indexOf("export async function reopenTask"));
    const reopen = source.slice(source.indexOf("export async function reopenTask"));
    expect(complete).toContain("toCompletionUpdate");
    expect(complete).not.toMatch(/establishActiveThread|active_threads|planned_on|must_do|due_on|context_id|title/);
    expect(reopen).toContain("toReopenUpdate");
    expect(reopen).not.toMatch(/establishActiveThread|active_threads|planned_on|must_do|due_on|context_id|title|toCompletionUpdate/);
    expect(source.indexOf("export async function updateTask")).toBeLessThan(source.indexOf("export async function completeTask"));
    void completeTask;
    void updateTask;
  });

  it("does not rewrite Block citations from the reopen writer", () => {
    const tasks = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const reopen = tasks.slice(tasks.indexOf("export async function reopenTask"));
    expect(reopen).not.toMatch(/from\("blocks"\)|task_id/);
    const blocks = readFileSync(new URL("./block.ts", import.meta.url), "utf8");
    expect(blocks).toContain("task_id");
    expect(blocks).not.toMatch(/reopenTask|toReopenUpdate/);
  });
});
