import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";
import { loadOpenTasks } from "@/persistence/contextsAndTasks";
import type { TaskRow } from "@/persistence/contextTaskRows";
import { projectTodayTasks } from "@/projections/today";

type Order = { column: string; ascending: boolean };

function taskRow(
  id: string,
  createdAt: string,
  extras: Partial<TaskRow> = {},
): TaskRow {
  return {
    id,
    context_id: null,
    title: id,
    created_at: createdAt,
    completed_at: null,
    due_on: null,
    planned_on: null,
    must_do: false,
    origin: "user_created",
    originating_note_id: null,
    ...extras,
  };
}

function compare(left: TaskRow, right: TaskRow, orders: readonly Order[]): number {
  for (const order of orders) {
    const key = order.column === "created_at" ? "created_at" : "id";
    const result = String(left[key]).localeCompare(String(right[key]));
    if (result !== 0) return order.ascending ? result : -result;
  }
  return 0;
}

function openTaskClient(input: {
  rows: readonly TaskRow[];
  total?: number | null | ((page: number) => number | null);
  failOnPage?: number;
  failMessage?: string;
  shortFirstPage?: boolean;
}): { client: SupabaseClient; orders: () => readonly Order[] } {
  let recorded: Order[] = [];

  function pageTotal(page: number, openCount: number): number | null {
    if (typeof input.total === "function") return input.total(page);
    if (input.total === undefined) return openCount;
    return input.total;
  }

  const from = (table: string) => {
    if (table !== "tasks") {
      throw new Error(`Unexpected table ${table}.`);
    }
    return {
      select(columns: string, options?: { count?: string }) {
        if (!columns.includes("created_at") || !columns.includes("id")) {
          throw new Error("The open-task read must select the ordering columns.");
        }
        if (options?.count !== "exact") {
          throw new Error("The open-task read must ask for an exact count.");
        }
        const orders: Order[] = [];
        let openOnly = false;
        const builder = {
          is(column: string, value: null) {
            if (column === "completed_at" && value === null) openOnly = true;
            return builder;
          },
          order(column: string, options: { ascending: boolean }) {
            orders.push({ column, ascending: options.ascending });
            return builder;
          },
          async range(start: number, end: number) {
            recorded = orders;
            const page = Math.floor(start / TEMPORAL_PAGE_SIZE) + 1;
            if (input.failOnPage === page) {
              return { data: null, error: { message: input.failMessage ?? "later page failed" }, count: null };
            }
            const open = openOnly ? input.rows.filter((row) => row.completed_at === null) : [...input.rows];
            const ordered = [...open].sort((left, right) => compare(left, right, orders));
            const pageSize = end - start + 1;
            if (pageSize !== TEMPORAL_PAGE_SIZE) {
              throw new Error(`Expected page size ${TEMPORAL_PAGE_SIZE}, received ${pageSize}.`);
            }
            const slice = input.shortFirstPage && page === 1 ? ordered.slice(start, start + 2) : ordered.slice(start, end + 1);
            return { data: slice, error: null, count: pageTotal(page, ordered.length) };
          },
        };
        return builder;
      },
    };
  };

  return {
    client: { from } as unknown as SupabaseClient,
    orders: () => recorded,
  };
}

function earlyRows(count: number): TaskRow[] {
  return Array.from({ length: count }, (_, index) => {
    const minute = String(Math.floor(index / 60)).padStart(2, "0");
    const second = String(index % 60).padStart(2, "0");
    return taskRow(`early-${String(index).padStart(4, "0")}`, `2026-10-01T00:${minute}:${second}.000Z`);
  });
}

describe("open task reads", () => {
  it("returns every open task when the collection is larger than one page", async () => {
    const rows = [
      ...earlyRows(TEMPORAL_PAGE_SIZE),
      taskRow("last", "2026-10-02T00:00:00.000Z"),
      taskRow("done", "2026-09-01T00:00:00.000Z", {
        completed_at: "2026-10-03T00:00:00.000Z",
      }),
    ];
    const { client } = openTaskClient({ rows });
    const open = await loadOpenTasks(client);
    expect(open).toHaveLength(TEMPORAL_PAGE_SIZE + 1);
    expect(open.map((task) => task.id)).not.toContain("done");
    expect(open.at(-1)?.id).toBe("last");
    expect(open[0]?.id).toBe("early-0000");
  });

  it("keeps creation order across pages and breaks equal creation times by id", async () => {
    const rows = [
      ...earlyRows(TEMPORAL_PAGE_SIZE - 1),
      taskRow("b-later", "2026-10-02T00:00:00.000Z"),
      taskRow("a-earlier", "2026-10-02T00:00:00.000Z"),
    ];
    const { client, orders } = openTaskClient({ rows });
    const open = await loadOpenTasks(client);
    expect(orders()).toEqual([
      { column: "created_at", ascending: true },
      { column: "id", ascending: true },
    ]);
    expect(open.map((task) => task.id).slice(-2)).toEqual(["a-earlier", "b-later"]);
  });

  it("accepts a successful empty collection", async () => {
    const { client } = openTaskClient({ rows: [] });
    await expect(loadOpenTasks(client)).resolves.toEqual([]);
  });

  it("fails when the count is missing", async () => {
    const { client } = openTaskClient({ rows: [], total: null });
    await expect(loadOpenTasks(client)).rejects.toThrow(/complete size/);
  });

  it("fails when a page stops before the reported count", async () => {
    const { client } = openTaskClient({
      rows: earlyRows(5),
      total: 5,
      shortFirstPage: true,
    });
    await expect(loadOpenTasks(client)).rejects.toThrow(/stopped before it was complete/);
  });

  it("fails the whole read when a later page errors", async () => {
    const { client } = openTaskClient({
      rows: [...earlyRows(TEMPORAL_PAGE_SIZE), taskRow("last", "2026-10-02T00:00:00.000Z")],
      failOnPage: 2,
    });
    await expect(loadOpenTasks(client)).rejects.toThrow("later page failed");
  });

  it("fails when the reported count changes between pages", async () => {
    const { client } = openTaskClient({
      rows: [...earlyRows(TEMPORAL_PAGE_SIZE), taskRow("last", "2026-10-02T00:00:00.000Z")],
      total: (page) => (page === 1 ? TEMPORAL_PAGE_SIZE + 1 : TEMPORAL_PAGE_SIZE + 2),
    });
    await expect(loadOpenTasks(client)).rejects.toThrow(/changed before it was complete/);
  });

  it("derives Today from the complete open collection and not from a failed read", async () => {
    const { client } = openTaskClient({
      rows: [
        taskRow("planned", "2026-10-01T00:00:01.000Z", { planned_on: "2026-10-03" }),
        taskRow("later", "2026-10-01T00:00:02.000Z", { planned_on: "2026-10-04" }),
        taskRow("unplanned", "2026-10-01T00:00:03.000Z"),
      ],
    });
    const open = await loadOpenTasks(client);
    expect(projectTodayTasks({ openTasks: open, civilDate: "2026-10-03" }).map((task) => task.id)).toEqual([
      "planned",
    ]);

    const failed = openTaskClient({
      rows: earlyRows(5),
      total: 5,
      shortFirstPage: true,
    });
    await expect(loadOpenTasks(failed.client)).rejects.toThrow(/stopped before it was complete/);
  });
});
