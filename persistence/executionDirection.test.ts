import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { defineBlock } from "@/domain/block";
import { TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";
import { toBlockWrite } from "@/persistence/block";
import { toTaskInsert } from "@/persistence/contextTaskMapping";
import { toCompletionUpdate } from "@/persistence/contextTaskMapping";
import {
  BLOCK_PRIORITY_SERVICE_COLUMNS,
  establishBlockPriorityService,
  loadBlockPriorityService,
  rowToBlockPriorityService,
  toBlockPriorityServiceInsert,
  withdrawBlockPriorityService,
  type BlockPriorityServiceRow,
} from "@/persistence/blockPriorityService";
import {
  TASK_PRIORITY_SERVICE_COLUMNS,
  establishTaskPriorityService,
  loadTaskPriorityService,
  rowToTaskPriorityService,
  toTaskPriorityServiceInsert,
  withdrawTaskPriorityService,
  type TaskPriorityServiceRow,
} from "@/persistence/taskPriorityService";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TASK_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_TASK_ID = "00000000-0000-4000-8000-000000000012";
const BLOCK_ID = "00000000-0000-4000-8000-000000000011";
const OTHER_BLOCK_ID = "00000000-0000-4000-8000-000000000013";
const PRIORITY_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_PRIORITY_ID = "00000000-0000-4000-8000-000000000004";
const migration = readFileSync(
  new URL("../supabase/migrations/20261005170800_execution_direction.sql", import.meta.url),
  "utf8",
);

function signedInClient(from: SupabaseClient["from"]): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from,
  } as unknown as SupabaseClient;
}

type StoredPair = {
  user_id: string;
  priority_id: string;
  established_at: string;
  task_id?: string;
  block_id?: string;
};

function project(row: StoredPair, columns: string): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const column of columns.split(", ")) {
    const value = row[column as keyof StoredPair];
    if (value === undefined) throw new Error(`Missing ${column}.`);
    selected[column] = value;
  }
  return selected;
}

function pairClient(input: {
  table: "task_priority_service" | "block_priority_service";
  executionColumn: "task_id" | "block_id";
  columns: string;
  raceOnce?: boolean;
}) {
  const rows: StoredPair[] = [];
  const touched: string[] = [];
  let raced = false;
  const from = (table: string) => {
    if (table !== input.table) throw new Error(`Unexpected table ${table}.`);
    touched.push(table);
    return {
      select(columns: string) {
        if (columns !== input.columns) throw new Error(`Unexpected columns ${columns}.`);
        const filters: Record<string, string> = {};
        const builder = {
          eq(column: string, value: string) {
            filters[column] = value;
            return builder;
          },
          async maybeSingle() {
            if (input.raceOnce && !raced) return { data: null, error: null };
            const found = rows.find((row) =>
              Object.entries(filters).every(
                ([column, value]) => row[column as keyof StoredPair] === value,
              ),
            );
            return { data: found ? project(found, columns) : null, error: null };
          },
        };
        return builder;
      },
      insert(row: StoredPair) {
        return {
          select(columns: string) {
            return {
              async single() {
                const duplicate = rows.some(
                  (existing) =>
                    existing[input.executionColumn] === row[input.executionColumn] &&
                    existing.priority_id === row.priority_id,
                );
                if (duplicate || (input.raceOnce && !raced)) {
                  raced = true;
                  if (input.raceOnce && !duplicate) rows.push({ ...row, established_at: row.established_at });
                  return { data: null, error: { message: "duplicate key", code: "23505" } };
                }
                rows.push({ ...row });
                return { data: project(row, columns), error: null };
              },
            };
          },
        };
      },
      delete() {
        const filters: Record<string, string> = {};
        const builder = {
          eq(column: string, value: string) {
            filters[column] = value;
            return builder;
          },
          then(resolve: (value: { error: null }) => void, reject?: (reason: unknown) => void) {
            for (let index = rows.length - 1; index >= 0; index -= 1) {
              const row = rows[index];
              if (!row) continue;
              const matches = Object.entries(filters).every(
                ([column, value]) => row[column as keyof StoredPair] === value,
              );
              if (matches) rows.splice(index, 1);
            }
            return Promise.resolve({ error: null }).then(resolve, reject);
          },
        };
        return builder;
      },
    };
  };
  return {
    client: signedInClient(from as unknown as SupabaseClient["from"]),
    rows,
    touched,
  };
}

function collectionClient<T extends { established_at: string }>(input: {
  table: string;
  columns: string;
  rows: readonly T[];
  total?: number | null;
  shortFirstPage?: boolean;
  failOnPage?: number;
}): SupabaseClient {
  const from = (table: string) => {
    if (table !== input.table) throw new Error(`Unexpected table ${table}.`);
    return {
      select(columns: string, options?: { count?: string }) {
        if (columns !== input.columns) throw new Error(`Unexpected columns ${columns}.`);
        if (options?.count !== "exact") throw new Error("The read must ask for an exact count.");
        const builder = {
          order() {
            return builder;
          },
          async range(start: number, end: number) {
            const page = Math.floor(start / TEMPORAL_PAGE_SIZE) + 1;
            if (input.failOnPage === page) {
              return { data: null, error: { message: "later page failed" }, count: null };
            }
            const pageSize = end - start + 1;
            if (pageSize !== TEMPORAL_PAGE_SIZE) {
              throw new Error(`Expected page size ${TEMPORAL_PAGE_SIZE}.`);
            }
            const slice =
              input.shortFirstPage && page === 1
                ? input.rows.slice(start, start + 2)
                : input.rows.slice(start, end + 1);
            return {
              data: slice,
              error: null,
              count: input.total === undefined ? input.rows.length : input.total,
            };
          },
        };
        return builder;
      },
    };
  };
  return { from } as unknown as SupabaseClient;
}

function taskTableSql(): string {
  return migration.slice(
    migration.indexOf("create table public.task_priority_service"),
    migration.indexOf("comment on table public.task_priority_service"),
  );
}

function blockTableSql(): string {
  return migration.slice(
    migration.indexOf("create table public.block_priority_service"),
    migration.indexOf("comment on table public.block_priority_service"),
  );
}

describe("execution direction representation", () => {
  it("stores a task pair without a destination, score, or single priority column on the task", () => {
    const row = toTaskPriorityServiceInsert(USER_ID, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    expect(row).toEqual({
      user_id: USER_ID,
      task_id: TASK_ID,
      priority_id: PRIORITY_ID,
      established_at: "2026-10-05T17:00:00.000Z",
    });
    expect(row).not.toHaveProperty("destination_id");
    expect(Object.keys(rowToTaskPriorityService({
      task_id: TASK_ID,
      priority_id: PRIORITY_ID,
      established_at: "2026-10-05T17:00:00.000Z",
    }))).toEqual(["taskId", "priorityId", "establishedAt"]);
    expect(taskTableSql()).toContain("primary key (task_id, priority_id)");
    expect(taskTableSql()).not.toMatch(/destination_id|score|rank|status|health|progress|percent|withdrawn_at/);
    expect(toTaskInsert(USER_ID, { title: "Call the school" })).not.toHaveProperty("priority_id");
  });

  it("stores a block pair without inheriting a task citation", () => {
    const row = toBlockPriorityServiceInsert(USER_ID, {
      blockId: BLOCK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:05:00.000Z"),
    });
    expect(row).toEqual({
      user_id: USER_ID,
      block_id: BLOCK_ID,
      priority_id: PRIORITY_ID,
      established_at: "2026-10-05T17:05:00.000Z",
    });
    expect(Object.keys(rowToBlockPriorityService({
      block_id: BLOCK_ID,
      priority_id: PRIORITY_ID,
      established_at: "2026-10-05T17:05:00.000Z",
    }))).toEqual(["blockId", "priorityId", "establishedAt"]);
    const block = toBlockWrite(
      USER_ID,
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-05",
        startLocal: "14:00",
        endLocal: "15:00",
        purpose: "Focus",
        taskId: TASK_ID,
      }),
    );
    expect(block.task_id).toBe(TASK_ID);
    expect(block).not.toHaveProperty("priority_id");
    expect(blockTableSql()).toContain("primary key (block_id, priority_id)");
    expect(blockTableSql()).not.toMatch(/task_id|destination_id/);
  });

  it("requires same-owner endpoints and does not cascade them away", () => {
    expect(migration).toContain("foreign key (task_id, user_id)");
    expect(migration).toContain("references public.tasks (id, user_id)");
    expect(migration).toContain("foreign key (block_id, user_id)");
    expect(migration).toContain("references public.blocks (id, user_id)");
    expect(migration).toContain("foreign key (priority_id, user_id)");
    expect(migration).toContain("references public.priorities (id, user_id)");
    expect(migration).toContain("match simple");
    expect(migration).toContain("on delete no action");
    expect(migration).toContain("deferrable initially deferred");
    expect(migration).toContain("add constraint blocks_id_user_key unique (id, user_id)");
    expect(migration).not.toMatch(/alter table public\.tasks/);
    expect(migration).not.toMatch(/add column/);
  });

  it("lets one task and one block each serve many priorities, and many executions serve one priority", async () => {
    const tasks = pairClient({
      table: "task_priority_service",
      executionColumn: "task_id",
      columns: TASK_PRIORITY_SERVICE_COLUMNS,
    });
    const blocks = pairClient({
      table: "block_priority_service",
      executionColumn: "block_id",
      columns: BLOCK_PRIORITY_SERVICE_COLUMNS,
    });
    await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: OTHER_PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:01:00.000Z"),
    });
    await establishTaskPriorityService(tasks.client, {
      taskId: OTHER_TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:02:00.000Z"),
    });
    await establishBlockPriorityService(blocks.client, {
      blockId: BLOCK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:03:00.000Z"),
    });
    await establishBlockPriorityService(blocks.client, {
      blockId: BLOCK_ID,
      priorityId: OTHER_PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:04:00.000Z"),
    });
    await establishBlockPriorityService(blocks.client, {
      blockId: OTHER_BLOCK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:05:00.000Z"),
    });
    expect(tasks.rows).toHaveLength(3);
    expect(blocks.rows).toHaveLength(3);
    expect(tasks.rows.filter((row) => row.priority_id === PRIORITY_ID)).toHaveLength(2);
    expect(blocks.rows.filter((row) => row.priority_id === PRIORITY_ID)).toHaveLength(2);
    expect(tasks.touched).not.toContain("block_priority_service");
    expect(blocks.touched).not.toContain("task_priority_service");
  });

  it("keeps a repeated pair as the original relationship", async () => {
    const tasks = pairClient({
      table: "task_priority_service",
      executionColumn: "task_id",
      columns: TASK_PRIORITY_SERVICE_COLUMNS,
    });
    const first = await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    const second = await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T18:00:00.000Z"),
    });
    expect(second).toEqual(first);
    expect(tasks.rows).toHaveLength(1);
    expect(tasks.rows[0]?.established_at).toBe("2026-10-05T17:00:00.000Z");
  });

  it("returns the existing pair when a concurrent insert hits the unique pair", async () => {
    const tasks = pairClient({
      table: "task_priority_service",
      executionColumn: "task_id",
      columns: TASK_PRIORITY_SERVICE_COLUMNS,
      raceOnce: true,
    });
    const established = await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    expect(established.establishedAt).toBe("2026-10-05T17:00:00.000Z");
    expect(tasks.rows).toHaveLength(1);
  });

  it("withdraws only the requested pair and leaves the endpoints untouched", async () => {
    const tasks = pairClient({
      table: "task_priority_service",
      executionColumn: "task_id",
      columns: TASK_PRIORITY_SERVICE_COLUMNS,
    });
    await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    await establishTaskPriorityService(tasks.client, {
      taskId: TASK_ID,
      priorityId: OTHER_PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:01:00.000Z"),
    });
    await withdrawTaskPriorityService(tasks.client, { taskId: TASK_ID, priorityId: PRIORITY_ID });
    expect(tasks.rows.map((row) => row.priority_id)).toEqual([OTHER_PRIORITY_ID]);
    expect(tasks.touched).toEqual([
      "task_priority_service",
      "task_priority_service",
      "task_priority_service",
      "task_priority_service",
      "task_priority_service",
    ]);
  });

  it("establishes the same pair again after withdrawal without restoring the old instant", async () => {
    const blocks = pairClient({
      table: "block_priority_service",
      executionColumn: "block_id",
      columns: BLOCK_PRIORITY_SERVICE_COLUMNS,
    });
    await establishBlockPriorityService(blocks.client, {
      blockId: BLOCK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T17:00:00.000Z"),
    });
    await withdrawBlockPriorityService(blocks.client, { blockId: BLOCK_ID, priorityId: PRIORITY_ID });
    const again = await establishBlockPriorityService(blocks.client, {
      blockId: BLOCK_ID,
      priorityId: PRIORITY_ID,
      establishedAt: new Date("2026-10-05T18:30:00.000Z"),
    });
    expect(again.establishedAt).toBe("2026-10-05T18:30:00.000Z");
    expect(blocks.rows).toHaveLength(1);
  });

  it("does not inherit across a task citation or couple completion and passage to withdrawal", () => {
    const taskService = readFileSync(new URL("./taskPriorityService.ts", import.meta.url), "utf8");
    const blockService = readFileSync(new URL("./blockPriorityService.ts", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const blocks = readFileSync(new URL("./block.ts", import.meta.url), "utf8");
    expect(taskService).not.toMatch(/block_priority_service|from\("blocks"\)/);
    expect(blockService).not.toMatch(/task_priority_service|from\("tasks"\)|\btask_id\b/);
    expect(tasks).not.toMatch(/task_priority_service|block_priority_service|establishTaskPriorityService/);
    expect(blocks).not.toMatch(/task_priority_service|block_priority_service|establishBlockPriorityService/);
    expect(toCompletionUpdate(new Date("2026-10-05T19:00:00.000Z"))).toEqual({
      completed_at: "2026-10-05T19:00:00.000Z",
    });
    const complete = tasks.slice(tasks.indexOf("export async function completeTask"));
    expect(complete).not.toMatch(/delete\(|priority/);
  });

  it("revokes default privileges and grants only select, insert, and delete", () => {
    for (const table of ["task_priority_service", "block_priority_service"]) {
      expect(migration).toContain(`revoke all on table public.${table} from public;`);
      expect(migration).toContain(`revoke all on table public.${table} from anon;`);
      expect(migration).toContain(`revoke all on table public.${table} from authenticated;`);
      expect(migration).toContain(
        `grant select, insert, delete on table public.${table} to authenticated;`,
      );
      expect(migration).toContain(`${table}_select_own`);
      expect(migration).toContain(`${table}_insert_own`);
      expect(migration).toContain(`${table}_delete_own`);
    }
    expect(migration).not.toMatch(/_update_own|grant update|grant all|truncate/);
    expect(migration).not.toContain("withdrawn_at timestamptz");
    expect(migration).toContain("user_id = (select auth.uid())");
  });

  it("reads an empty collection and fails a short read without returning it", async () => {
    await expect(
      loadTaskPriorityService(
        collectionClient({
          table: "task_priority_service",
          columns: TASK_PRIORITY_SERVICE_COLUMNS,
          rows: [],
        }),
      ),
    ).resolves.toEqual([]);
    const rows: TaskPriorityServiceRow[] = Array.from({ length: 5 }, (_, index) => ({
      task_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      priority_id: PRIORITY_ID,
      established_at: `2026-10-05T17:0${index}:00.000Z`,
    }));
    let resolved: unknown = "unset";
    try {
      resolved = await loadTaskPriorityService(
        collectionClient({
          table: "task_priority_service",
          columns: TASK_PRIORITY_SERVICE_COLUMNS,
          rows,
          total: 5,
          shortFirstPage: true,
        }),
      );
    } catch (error) {
      expect((error as Error).message).toMatch(/stopped before it was complete/);
    }
    expect(resolved).toBe("unset");
  });

  it("fails the whole block read when a later page errors", async () => {
    const rows: BlockPriorityServiceRow[] = Array.from({ length: TEMPORAL_PAGE_SIZE + 1 }, (_, index) => ({
      block_id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      priority_id: PRIORITY_ID,
      established_at: "2026-10-05T17:00:00.000Z",
    }));
    await expect(
      loadBlockPriorityService(
        collectionClient({
          table: "block_priority_service",
          columns: BLOCK_PRIORITY_SERVICE_COLUMNS,
          rows,
          failOnPage: 2,
        }),
      ),
    ).rejects.toThrow("later page failed");
  });

  it("rejects a missing priority before writing", async () => {
    const client = signedInClient((() => {
      throw new Error("The write should not start.");
    }) as unknown as SupabaseClient["from"]);
    await expect(
      establishTaskPriorityService(client, {
        taskId: TASK_ID,
        priorityId: "missing",
        establishedAt: new Date("2026-10-05T17:00:00.000Z"),
      }),
    ).rejects.toThrow(/established priority/);
  });
});
