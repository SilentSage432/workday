import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { defineBlock } from "@/domain/block";
import { TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";
import { toTaskInsert } from "@/persistence/contextTaskMapping";
import {
  createDestination,
  loadDestinations,
  rowToDestination,
  toDestinationInsert,
  type DestinationRow,
} from "@/persistence/destination";
import { toBlockWrite } from "@/persistence/block";
import {
  createPriority,
  loadPriorities,
  rowToPriority,
  toPriorityInsert,
  type PriorityRow,
} from "@/persistence/priority";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DESTINATION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_DESTINATION_ID = "00000000-0000-4000-8000-000000000003";
const PRIORITY_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_PRIORITY_ID = "00000000-0000-4000-8000-000000000004";
const TASK_ID = "00000000-0000-4000-8000-000000000010";
const NOTE_ID = "00000000-0000-4000-8000-000000000020";
const migration = readFileSync(
  new URL("../supabase/migrations/20261005163000_direction.sql", import.meta.url),
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

function destinationId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function compareRows(
  left: { established_at: string; id: string },
  right: { established_at: string; id: string },
): number {
  const byInstant = left.established_at.localeCompare(right.established_at);
  if (byInstant !== 0) return byInstant;
  return left.id.localeCompare(right.id);
}

function collectionClient<T extends { established_at: string; id: string }>(input: {
  table: string;
  columns: string;
  rows: readonly T[];
  total?: number | null | ((page: number) => number | null);
  failOnPage?: number;
  shortFirstPage?: boolean;
  returnedCount?: number;
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
            const ordered = [...input.rows].sort(compareRows);
            const pageSize = end - start + 1;
            if (pageSize !== TEMPORAL_PAGE_SIZE) {
              throw new Error(`Expected page size ${TEMPORAL_PAGE_SIZE}, received ${pageSize}.`);
            }
            const slice =
              input.shortFirstPage && page === 1
                ? ordered.slice(start, start + 2)
                : ordered.slice(start, end + 1);
            const data =
              input.returnedCount === undefined ? slice : ordered.slice(start, start + input.returnedCount);
            const total =
              typeof input.total === "function"
                ? input.total(page)
                : input.total === undefined
                  ? ordered.length
                  : input.total;
            return { data, error: null, count: total };
          },
        };
        return builder;
      },
    };
  };
  return { from } as unknown as SupabaseClient;
}

describe("direction representation", () => {
  it("stores a destination from explicit human words", () => {
    const establishedAt = new Date("2026-10-05T16:00:00.000Z");
    expect(
      toDestinationInsert(USER_ID, {
        id: DESTINATION_ID,
        content: "  learn the floor  ",
        establishedAt,
      }),
    ).toEqual({
      id: DESTINATION_ID,
      user_id: USER_ID,
      content: "  learn the floor  ",
      established_at: "2026-10-05T16:00:00.000Z",
    });
    expect(Object.keys(rowToDestination({
      id: DESTINATION_ID,
      content: "learn the floor",
      established_at: "2026-10-05T16:00:00.000Z",
    }))).toEqual(["id", "content", "establishedAt"]);
  });

  it("gives a destination no progress, deadline, context, or score", () => {
    const destinationTable = migration.slice(
      migration.indexOf("create table public.destinations"),
      migration.indexOf("comment on table public.destinations"),
    );
    expect(destinationTable).not.toMatch(
      /progress|percent|status|health|score|rank|deadline|due_on|planned_on|starts_on|context_id|color|icon|metric|completed_at|archived/,
    );
    expect(destinationTable).toContain("content text not null");
    expect(destinationTable).toContain("established_at timestamptz not null");
    expect(destinationTable).not.toMatch(/established_at timestamptz not null default/);
  });

  it("stores a priority downstream of one established destination", () => {
    const establishedAt = new Date("2026-10-05T16:05:00.000Z");
    const row = toPriorityInsert(USER_ID, {
      id: PRIORITY_ID,
      content: "  showroom standards  ",
      destinationId: DESTINATION_ID,
      establishedAt,
    });
    expect(row).toEqual({
      id: PRIORITY_ID,
      user_id: USER_ID,
      destination_id: DESTINATION_ID,
      content: "  showroom standards  ",
      established_at: "2026-10-05T16:05:00.000Z",
    });
    expect(Object.keys(rowToPriority({
      id: PRIORITY_ID,
      content: "showroom standards",
      destination_id: DESTINATION_ID,
      established_at: "2026-10-05T16:05:00.000Z",
    }))).toEqual(["id", "content", "destinationId", "establishedAt"]);
  });

  it("gives a priority no score, rank, urgency, or progress", () => {
    const priorityTable = migration.slice(
      migration.indexOf("create table public.priorities"),
      migration.indexOf("comment on table public.priorities"),
    );
    expect(priorityTable).toContain("destination_id uuid not null");
    expect(priorityTable).not.toMatch(
      /score|rank|level|urgency|health|progress|percent|status|frequency|cadence|context_id|due_on|must_do|planned_on/,
    );
  });

  it("records the destination relationship as a same-owner foreign key", () => {
    expect(migration).toContain("foreign key (destination_id, user_id)");
    expect(migration).toContain("references public.destinations (id, user_id)");
    expect(migration).toContain("match simple");
    expect(migration).toContain("on delete no action");
    expect(migration).toContain("deferrable initially deferred");
    expect(migration).not.toMatch(/unique \(destination_id/);
    expect(migration).not.toMatch(/create table public\.\w*relationship/);
  });

  it("lets two priorities name one destination without a second destination on either row", () => {
    const first = toPriorityInsert(USER_ID, {
      id: PRIORITY_ID,
      content: "showroom standards",
      destinationId: DESTINATION_ID,
      establishedAt: new Date("2026-10-05T16:05:00.000Z"),
    });
    const second = toPriorityInsert(USER_ID, {
      id: OTHER_PRIORITY_ID,
      content: "remain in stock",
      destinationId: DESTINATION_ID,
      establishedAt: new Date("2026-10-05T16:06:00.000Z"),
    });
    expect(first.destination_id).toBe(DESTINATION_ID);
    expect(second.destination_id).toBe(DESTINATION_ID);
    expect(first).not.toHaveProperty("destination_ids");
    expect(toPriorityInsert(USER_ID, {
      id: PRIORITY_ID,
      content: "another area",
      destinationId: OTHER_DESTINATION_ID,
      establishedAt: new Date("2026-10-05T16:07:00.000Z"),
    }).destination_id).toBe(OTHER_DESTINATION_ID);
  });

  it("leaves an ordinary task valid with no destination or priority", () => {
    const row = toTaskInsert(USER_ID, { title: "Call the school" });
    expect(row).not.toHaveProperty("destination_id");
    expect(row).not.toHaveProperty("priority_id");
    expect(row.title).toBe("Call the school");
    expect(row.must_do).toBe(false);
    expect(row.originating_note_id).toBeNull();
  });

  it("leaves an ordinary block valid with no destination or priority", () => {
    const row = toBlockWrite(
      USER_ID,
      defineBlock({ kind: "all_day", startsOn: "2026-10-05", purpose: "Rest" }),
    );
    expect(row.task_id).toBeNull();
    expect(row.purpose).toBe("Rest");
    expect(row).not.toHaveProperty("destination_id");
    expect(row).not.toHaveProperty("priority_id");
  });

  it("leaves a task-associated block as one block referring to one task", () => {
    const row = toBlockWrite(
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
    expect(row.task_id).toBe(TASK_ID);
    expect(row.purpose).toBe("Focus");
    expect(row).not.toHaveProperty("destination_id");
    const blockMigration = readFileSync(
      new URL("../supabase/migrations/20261005092200_block_task.sql", import.meta.url),
      "utf8",
    );
    expect(blockMigration).toContain("add column task_id uuid");
    expect(blockMigration).not.toMatch(/destination_id|priority_id/);
  });

  it("leaves note provenance as the originating note and not direction", () => {
    const row = toTaskInsert(USER_ID, { title: "Check the department", originatingNoteId: NOTE_ID });
    expect(row.originating_note_id).toBe(NOTE_ID);
    expect(row.origin).toBe("user_created");
    expect(row).not.toHaveProperty("destination_id");
    const provenance = readFileSync(
      new URL("../supabase/migrations/20261005020600_task_originating_note.sql", import.meta.url),
      "utf8",
    );
    expect(provenance).toContain("originating_note_id");
    expect(migration).not.toMatch(/originating_note_id|alter table public\.tasks|alter table public\.blocks/);
  });

  it("does not treat must do, due, planned day, or a context as a priority", () => {
    const row = toTaskInsert(USER_ID, {
      title: "Bay audit",
      mustDo: true,
      dueOn: "2026-10-07",
      plannedOn: "2026-10-06",
      contextId: "00000000-0000-4000-8000-000000000030",
    });
    expect(row.must_do).toBe(true);
    expect(row.due_on).toBe("2026-10-07");
    expect(row.planned_on).toBe("2026-10-06");
    expect(row.context_id).toBe("00000000-0000-4000-8000-000000000030");
    expect(row).not.toHaveProperty("priority_id");
    expect(row).not.toHaveProperty("destination_id");
    const tasks = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    const thread = readFileSync(new URL("./activeThread.ts", import.meta.url), "utf8");
    expect(tasks).not.toMatch(/createDestination|createPriority|destinations|priorities/);
    expect(thread).not.toMatch(/createDestination|createPriority|destinations|priorities/);
  });

  it("does not create direction from temporal activity", () => {
    const files = [
      "../projections/weekShape.ts",
      "../components/weekReading.ts",
      "../projections/capacity.ts",
      "../components/capacityReading.ts",
      "../projections/presentMomentOrientation.ts",
      "../components/presentMomentReading.ts",
      "../projections/currentTemporalOrientation.ts",
      "../projections/timeline.ts",
      "./block.ts",
    ];
    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/createDestination|createPriority|from "@\/persistence\/destination"|from "@\/persistence\/priority"|from "@\/domain\/destination"|from "@\/domain\/priority"/);
    }
  });

  it("limits both tables to the signed-in user for select and insert", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("destinations_select_own");
    expect(migration).toContain("destinations_insert_own");
    expect(migration).toContain("priorities_select_own");
    expect(migration).toContain("priorities_insert_own");
    expect(migration).not.toMatch(/destinations_update_own|destinations_delete_own|priorities_update_own|priorities_delete_own/);
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("revoke all on table public.destinations from public;");
    expect(migration).toContain("revoke all on table public.destinations from anon;");
    expect(migration).toContain("revoke all on table public.destinations from authenticated;");
    expect(migration).toContain("revoke all on table public.priorities from public;");
    expect(migration).toContain("revoke all on table public.priorities from anon;");
    expect(migration).toContain("revoke all on table public.priorities from authenticated;");
    expect(migration).toContain("grant select, insert on table public.destinations to authenticated");
    expect(migration).toContain("grant select, insert on table public.priorities to authenticated");
    expect(migration).not.toMatch(/grant select, insert, update, delete/);
  });

  it("exposes establishment and complete read without a lifecycle", () => {
    const destinationSource = readFileSync(new URL("./destination.ts", import.meta.url), "utf8");
    const prioritySource = readFileSync(new URL("./priority.ts", import.meta.url), "utf8");
    expect(destinationSource).toContain("export async function createDestination");
    expect(destinationSource).toContain("export async function loadDestinations");
    expect(prioritySource).toContain("export async function createPriority");
    expect(prioritySource).toContain("export async function loadPriorities");
    expect(destinationSource).not.toMatch(/\.update\(|\.delete\(|new Date\(/);
    expect(prioritySource).not.toMatch(/\.update\(|\.delete\(|new Date\(/);
    expect(prioritySource).not.toContain("createDestination");
  });

  it("writes only the destination row the human established", async () => {
    let tableName = "";
    let inserted: unknown;
    const client = signedInClient(((table: string) => {
      tableName = table;
      return {
        insert(row: DestinationRow & { user_id: string }) {
          inserted = row;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: row.id,
                  content: row.content,
                  established_at: row.established_at,
                },
                error: null,
              }),
            }),
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    const created = await createDestination(client, {
      id: DESTINATION_ID,
      content: "  learn the floor  ",
      establishedAt: new Date("2026-10-05T16:00:00.000Z"),
    });
    expect(tableName).toBe("destinations");
    expect(inserted).toEqual({
      id: DESTINATION_ID,
      user_id: USER_ID,
      content: "  learn the floor  ",
      established_at: "2026-10-05T16:00:00.000Z",
    });
    expect(created).toEqual({
      id: DESTINATION_ID,
      content: "  learn the floor  ",
      establishedAt: "2026-10-05T16:00:00.000Z",
    });
  });

  it("writes only the priority row the human established", async () => {
    let tableName = "";
    const client = signedInClient(((table: string) => {
      tableName = table;
      return {
        insert(row: PriorityRow & { user_id: string }) {
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: row.id,
                  content: row.content,
                  destination_id: row.destination_id,
                  established_at: row.established_at,
                },
                error: null,
              }),
            }),
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    const created = await createPriority(client, {
      id: PRIORITY_ID,
      content: "showroom standards",
      destinationId: DESTINATION_ID,
      establishedAt: new Date("2026-10-05T16:05:00.000Z"),
    });
    expect(tableName).toBe("priorities");
    expect(created.destinationId).toBe(DESTINATION_ID);
  });

  it("rejects blank direction before writing", async () => {
    const client = signedInClient((() => {
      throw new Error("The write should not start.");
    }) as unknown as SupabaseClient["from"]);
    await expect(
      createDestination(client, {
        id: DESTINATION_ID,
        content: " ",
        establishedAt: new Date("2026-10-05T16:00:00.000Z"),
      }),
    ).rejects.toThrow(/human's words/);
    await expect(
      createPriority(client, {
        id: PRIORITY_ID,
        content: "showroom",
        destinationId: "missing",
        establishedAt: new Date("2026-10-05T16:05:00.000Z"),
      }),
    ).rejects.toThrow(/established destination/);
  });

  it("reads an empty direction collection", async () => {
    await expect(
      loadDestinations(
        collectionClient({ table: "destinations", columns: "id, content, established_at", rows: [] }),
      ),
    ).resolves.toEqual([]);
    await expect(
      loadPriorities(
        collectionClient({
          table: "priorities",
          columns: "id, content, destination_id, established_at",
          rows: [],
        }),
      ),
    ).resolves.toEqual([]);
  });

  it("fails a destination read that does not report its complete size", async () => {
    const client = collectionClient<DestinationRow>({
      table: "destinations",
      columns: "id, content, established_at",
      rows: [],
      total: null,
    });
    await expect(loadDestinations(client)).rejects.toThrow(/complete size/);
  });

  it("does not return a partial priority collection after a failed read", async () => {
    const rows: PriorityRow[] = Array.from({ length: 5 }, (_, index) => ({
      id: destinationId(index + 1),
      content: "kept",
      destination_id: DESTINATION_ID,
      established_at: `2026-10-05T16:0${index}:00.000Z`,
    }));
    const client = collectionClient({
      table: "priorities",
      columns: "id, content, destination_id, established_at",
      rows,
      total: 5,
      shortFirstPage: true,
    });
    let resolved: unknown = "unset";
    try {
      resolved = await loadPriorities(client);
    } catch (error) {
      expect((error as Error).message).toMatch(/stopped before it was complete/);
    }
    expect(resolved).toBe("unset");
  });

  it("fails the whole destination read when a later page errors", async () => {
    const rows = Array.from({ length: TEMPORAL_PAGE_SIZE + 1 }, (_, index) => ({
      id: destinationId(index),
      content: "kept",
      established_at: "2026-10-05T16:00:00.000Z",
    }));
    const client = collectionClient({
      table: "destinations",
      columns: "id, content, established_at",
      rows,
      failOnPage: 2,
    });
    await expect(loadDestinations(client)).rejects.toThrow("later page failed");
  });
});
