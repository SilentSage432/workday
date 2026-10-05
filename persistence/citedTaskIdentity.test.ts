import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadCitedTaskIdentities } from "@/persistence/citedTaskIdentity";
import { TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

const taskId = "00000000-0000-4000-8000-000000000010";
const completedTaskId = "00000000-0000-4000-8000-000000000012";
const missingTaskId = "00000000-0000-4000-8000-000000000014";

type Row = { id: string; title: string };

function clientFor(
  rows: readonly Row[],
  options: { fail?: string; count?: number | null; page?: readonly Row[] } = {},
) {
  const calls: { columns: string; ids: readonly string[]; from: number; to: number }[] = [];
  const client = {
    from(table: string) {
      if (table !== "tasks") throw new Error(table);
      return {
        select(columns: string, opts: { count?: string }) {
          expect(columns).toBe("id, title");
          expect(opts.count).toBe("exact");
          expect(columns).not.toContain("completed_at");
          return {
            in(column: string, ids: readonly string[]) {
              expect(column).toBe("id");
              return {
                order(columnName: string, order: { ascending: boolean }) {
                  expect(columnName).toBe("id");
                  expect(order.ascending).toBe(true);
                  return {
                    range(from: number, to: number) {
                      calls.push({ columns, ids, from, to });
                      if (options.fail) {
                        return Promise.resolve({ data: null, error: { message: options.fail }, count: null });
                      }
                      const matched = rows
                        .filter((row) => ids.includes(row.id))
                        .slice()
                        .sort((left, right) => left.id.localeCompare(right.id));
                      const page = options.page ?? matched.slice(from, to + 1);
                      return Promise.resolve({
                        data: page,
                        error: null,
                        count: options.count === undefined ? matched.length : options.count,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

describe("cited task identity", () => {
  it("reads id and title for the requested tasks, including one that is completed", async () => {
    const { client, calls } = clientFor([
      { id: completedTaskId, title: "Finished audit" },
      { id: taskId, title: "Open pages" },
    ]);
    const identities = await loadCitedTaskIdentities(client as never, [completedTaskId, taskId, taskId]);
    expect(identities).toEqual([
      { id: taskId, title: "Open pages" },
      { id: completedTaskId, title: "Finished audit" },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.ids).toEqual([completedTaskId, taskId]);
    expect(calls[0]?.to - (calls[0]?.from ?? 0) + 1).toBe(TEMPORAL_PAGE_SIZE);
    expect(identities[0]).not.toHaveProperty("completedAt");
  });

  it("reads nothing when no task is cited", async () => {
    const { client, calls } = clientFor([{ id: taskId, title: "Open pages" }]);
    await expect(loadCitedTaskIdentities(client as never, [])).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it("fails when a requested identity is absent", async () => {
    const { client } = clientFor([{ id: taskId, title: "Open pages" }]);
    await expect(loadCitedTaskIdentities(client as never, [taskId, missingTaskId])).rejects.toThrow(
      "A cited task identity is missing.",
    );
  });

  it("fails when the read fails", async () => {
    const { client } = clientFor([], { fail: "tasks unavailable" });
    await expect(loadCitedTaskIdentities(client as never, [taskId])).rejects.toThrow("tasks unavailable");
  });

  it("fails when the page stops short of the reported total", async () => {
    const { client } = clientFor([{ id: taskId, title: "Open pages" }], {
      count: 2,
      page: [{ id: taskId, title: "Open pages" }],
    });
    await expect(loadCitedTaskIdentities(client as never, [taskId, completedTaskId])).rejects.toThrow(
      "A temporal read stopped before it was complete.",
    );
  });

  it("does not filter completed tasks or load open tasks", () => {
    const source = readFileSync(new URL("./citedTaskIdentity.ts", import.meta.url), "utf8");
    expect(source).toContain('"id, title"');
    expect(source).not.toContain("completed_at");
    expect(source).not.toContain("loadOpenTasks");
    expect(source).not.toContain("planned_on");
    expect(source).not.toContain("must_do");
  });
});
