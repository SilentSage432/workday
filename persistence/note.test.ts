import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { NoteCitedError } from "@/domain/note";
import { TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";
import {
  createNote,
  deleteNote,
  loadNotes,
  retireNote,
  rowToNote,
  toNoteInsert,
  type NoteRow,
} from "@/persistence/note";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Order = { column: string; ascending: boolean };

function noteId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function noteRow(
  id: string,
  capturedAt: string,
  content = "retained",
  retiredAt: string | null = null,
): NoteRow {
  return { id, content, captured_at: capturedAt, retired_at: retiredAt };
}

function compare(left: NoteRow, right: NoteRow, orders: readonly Order[]): number {
  for (const order of orders) {
    const key = order.column === "captured_at" ? "captured_at" : "id";
    const result = String(left[key]).localeCompare(String(right[key]));
    if (result !== 0) return order.ascending ? result : -result;
  }
  return 0;
}

function noteClient(input: {
  rows: readonly NoteRow[];
  total?: number | null | ((page: number) => number | null);
  failOnPage?: number;
  failMessage?: string;
  shortFirstPage?: boolean;
  returnedCount?: number;
}): { client: SupabaseClient; orders: () => readonly Order[]; filters: () => readonly string[] } {
  let recorded: Order[] = [];
  let filters: string[] = [];

  function pageTotal(page: number, count: number): number | null {
    if (typeof input.total === "function") return input.total(page);
    if (input.total === undefined) return count;
    return input.total;
  }

  const from = (table: string) => {
    if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
    return {
      select(columns: string, options?: { count?: string }) {
        if (columns !== "id, content, captured_at, retired_at") {
          throw new Error("The note read must select the note columns.");
        }
        if (options?.count !== "exact") {
          throw new Error("The note read must ask for an exact count.");
        }
        const orders: Order[] = [];
        const localFilters: string[] = [];
        const builder = {
          is(column: string, value: null) {
            localFilters.push(`${column}:${value}`);
            return builder;
          },
          order(column: string, options: { ascending: boolean }) {
            orders.push({ column, ascending: options.ascending });
            return builder;
          },
          async range(start: number, end: number) {
            recorded = orders;
            filters = localFilters;
            const page = Math.floor(start / TEMPORAL_PAGE_SIZE) + 1;
            if (input.failOnPage === page) {
              return {
                data: null,
                error: { message: input.failMessage ?? "later page failed" },
                count: null,
              };
            }
            const current = input.rows.filter((row) => row.retired_at === null);
            const ordered = [...current].sort((left, right) => compare(left, right, orders));
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
            return { data, error: null, count: pageTotal(page, ordered.length) };
          },
        };
        return builder;
      },
    };
  };

  return {
    client: { from } as unknown as SupabaseClient,
    orders: () => recorded,
    filters: () => filters,
  };
}

function earlyRows(count: number): NoteRow[] {
  return Array.from({ length: count }, (_, index) => {
    const minute = String(Math.floor(index / 60)).padStart(2, "0");
    const second = String(index % 60).padStart(2, "0");
    return noteRow(noteId(index), `2026-10-01T00:${minute}:${second}.000Z`);
  });
}

function signedInClient(from: SupabaseClient["from"]): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from,
  } as unknown as SupabaseClient;
}

describe("note persistence", () => {
  it("maps a stored note without rewriting retained content", () => {
    const note = rowToNote(noteRow(noteId(1), "2026-10-04T18:30:00.000Z", "  aisle 12  "));
    expect(note).toEqual({
      id: noteId(1),
      content: "  aisle 12  ",
      capturedAt: "2026-10-04T18:30:00.000Z",
      retiredAt: null,
    });
  });

  it("maps a retired note honestly", () => {
    const note = rowToNote(
      noteRow(noteId(1), "2026-10-04T18:30:00.000Z", "aisle 12", "2026-10-08T12:00:00.000Z"),
    );
    expect(note.retiredAt).toBe("2026-10-08T12:00:00.000Z");
    expect(note.content).toBe("aisle 12");
    expect(note.capturedAt).toBe("2026-10-04T18:30:00.000Z");
  });

  it("rejects a malformed stored note", () => {
    expect(() => rowToNote(noteRow("note-1", "2026-10-04T18:30:00.000Z"))).toThrow(/stable identity/);
    expect(() => rowToNote(noteRow(noteId(1), "2026-10-04T18:30:00.000Z", "   "))).toThrow(
      /retained experience/,
    );
    expect(() => rowToNote(noteRow(noteId(1), "2026-10-04", "kept"))).toThrow(/when it was retained/);
    expect(() => rowToNote(noteRow(noteId(1), "not-an-instant", "kept"))).toThrow(/when it was retained/);
  });

  it("stores the supplied capture instant and the retained text", () => {
    const capturedAt = new Date("2026-01-15T08:00:00.000Z");
    expect(toNoteInsert(USER_ID, { id: noteId(1), content: "  aisle 12  ", capturedAt })).toEqual({
      id: noteId(1),
      user_id: USER_ID,
      content: "  aisle 12  ",
      captured_at: "2026-01-15T08:00:00.000Z",
    });
  });

  it("sends the supplied capture instant when creating a note", async () => {
    const capturedAt = new Date("2026-01-15T08:00:00.000Z");
    let inserted: unknown;
    const client = signedInClient(((table: string) => {
      if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
      return {
        insert(row: { id: string; content: string; captured_at: string }) {
          inserted = row;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: row.id,
                  content: row.content,
                  captured_at: row.captured_at,
                  retired_at: null,
                },
                error: null,
              }),
            }),
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    const created = await createNote(client, { id: noteId(1), content: "  aisle 12  ", capturedAt });
    expect(inserted).toEqual({
      id: noteId(1),
      user_id: USER_ID,
      content: "  aisle 12  ",
      captured_at: "2026-01-15T08:00:00.000Z",
    });
    expect(created.id).toBe(noteId(1));
    expect(created.capturedAt).toBe("2026-01-15T08:00:00.000Z");
    expect(created.content).toBe("  aisle 12  ");
    expect(created.retiredAt).toBeNull();
  });

  it("rejects blank content before writing", async () => {
    const client = signedInClient((() => {
      throw new Error("The note write should not start.");
    }) as unknown as SupabaseClient["from"]);
    await expect(
      createNote(client, {
        id: noteId(1),
        content: " \n\t ",
        capturedAt: new Date("2026-01-15T08:00:00.000Z"),
      }),
    ).rejects.toThrow(/retained experience/);
  });

  it("reads an empty note collection", async () => {
    const { client } = noteClient({ rows: [] });
    await expect(loadNotes(client)).resolves.toEqual([]);
  });

  it("excludes retired notes from the current operational collection", async () => {
    const rows = [
      noteRow(noteId(1), "2026-10-01T00:00:00.000Z", "current"),
      noteRow(noteId(2), "2026-10-02T00:00:00.000Z", "retired", "2026-10-08T00:00:00.000Z"),
    ];
    const { client, filters } = noteClient({ rows });
    const notes = await loadNotes(client);
    expect(filters()).toEqual(["retired_at:null"]);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe(noteId(1));
    expect(notes[0]?.retiredAt).toBeNull();
  });

  it("reads every current note when the collection is larger than one page", async () => {
    const rows = [...earlyRows(TEMPORAL_PAGE_SIZE), noteRow(noteId(5000), "2026-10-02T00:00:00.000Z")];
    const { client } = noteClient({ rows });
    const notes = await loadNotes(client);
    expect(notes).toHaveLength(TEMPORAL_PAGE_SIZE + 1);
    expect(notes[0]?.id).toBe(noteId(0));
    expect(notes.at(-1)?.id).toBe(noteId(5000));
  });

  it("orders by capture instant and breaks equal instants by id", async () => {
    const rows = [
      ...earlyRows(TEMPORAL_PAGE_SIZE - 1),
      noteRow(noteId(9001), "2026-10-02T00:00:00.000Z"),
      noteRow(noteId(9000), "2026-10-02T00:00:00.000Z"),
    ];
    const { client, orders } = noteClient({ rows });
    const notes = await loadNotes(client);
    expect(orders()).toEqual([
      { column: "captured_at", ascending: true },
      { column: "id", ascending: true },
    ]);
    expect(notes.map((note) => note.id).slice(-2)).toEqual([noteId(9000), noteId(9001)]);
  });

  it("fails when the count is missing", async () => {
    const { client } = noteClient({ rows: [], total: null });
    await expect(loadNotes(client)).rejects.toThrow(/complete size/);
  });

  it("fails when a page stops before the reported count", async () => {
    const { client } = noteClient({ rows: earlyRows(5), total: 5, shortFirstPage: true });
    await expect(loadNotes(client)).rejects.toThrow(/stopped before it was complete/);
  });

  it("fails the whole read when a later page errors", async () => {
    const { client } = noteClient({
      rows: [...earlyRows(TEMPORAL_PAGE_SIZE), noteRow(noteId(5000), "2026-10-02T00:00:00.000Z")],
      failOnPage: 2,
    });
    await expect(loadNotes(client)).rejects.toThrow("later page failed");
  });

  it("fails when the reported count changes between pages", async () => {
    const { client } = noteClient({
      rows: [...earlyRows(TEMPORAL_PAGE_SIZE), noteRow(noteId(5000), "2026-10-02T00:00:00.000Z")],
      total: (page) => (page === 1 ? TEMPORAL_PAGE_SIZE + 1 : TEMPORAL_PAGE_SIZE + 2),
    });
    await expect(loadNotes(client)).rejects.toThrow(/changed before it was complete/);
  });

  it("fails when the collected notes do not match the reported count", async () => {
    const { client } = noteClient({
      rows: [noteRow(noteId(1), "2026-10-01T00:00:00.000Z"), noteRow(noteId(2), "2026-10-01T00:00:01.000Z")],
      total: 1,
      returnedCount: 2,
    });
    await expect(loadNotes(client)).rejects.toThrow(/more rows than it reported/);
  });

  it("does not return a partial note collection after a failed read", async () => {
    const { client } = noteClient({ rows: earlyRows(5), total: 5, shortFirstPage: true });
    let resolved: unknown = "unset";
    try {
      resolved = await loadNotes(client);
    } catch (error) {
      expect((error as Error).message).toMatch(/stopped before it was complete/);
    }
    expect(resolved).toBe("unset");
  });

  it("retires a current note without altering content or capture instant", async () => {
    const retiredAt = new Date("2026-10-08T18:00:00.000Z");
    let updated: unknown;
    let filterRetired: unknown;
    const client = signedInClient(((table: string) => {
      if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
      return {
        update(patch: { retired_at: string }) {
          updated = patch;
          return {
            eq(column: string, value: string) {
              expect(column).toBe("id");
              expect(value).toBe(noteId(1));
              return {
                is(column: string, value: null) {
                  filterRetired = `${column}:${value}`;
                  return {
                    select: () => ({
                      single: async () => ({
                        data: {
                          id: noteId(1),
                          content: "aisle 12",
                          captured_at: "2026-10-04T18:30:00.000Z",
                          retired_at: patch.retired_at,
                        },
                        error: null,
                      }),
                    }),
                  };
                },
              };
            },
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    const retired = await retireNote(client, { id: noteId(1), retiredAt });
    expect(updated).toEqual({ retired_at: "2026-10-08T18:00:00.000Z" });
    expect(filterRetired).toBe("retired_at:null");
    expect(retired).toEqual({
      id: noteId(1),
      content: "aisle 12",
      capturedAt: "2026-10-04T18:30:00.000Z",
      retiredAt: "2026-10-08T18:00:00.000Z",
    });
  });

  it("fails honestly when retirement finds no current row", async () => {
    const client = signedInClient(((table: string) => {
      if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
      return {
        update() {
          return {
            eq() {
              return {
                is() {
                  return {
                    select: () => ({
                      single: async () => ({
                        data: null,
                        error: { message: "JSON object requested, multiple (or no) rows returned" },
                      }),
                    }),
                  };
                },
              };
            },
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    await expect(
      retireNote(client, { id: noteId(1), retiredAt: new Date("2026-10-08T18:00:00.000Z") }),
    ).rejects.toThrow(/multiple \(or no\) rows returned/);
  });

  it("deletes an uncited note", async () => {
    let deletedId: string | null = null;
    const client = signedInClient(((table: string) => {
      if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
      return {
        delete() {
          return {
            eq(column: string, value: string) {
              expect(column).toBe("id");
              deletedId = value;
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    await deleteNote(client, noteId(1));
    expect(deletedId).toBe(noteId(1));
  });

  it("maps a provenance foreign-key failure to NoteCitedError", async () => {
    const client = signedInClient(((table: string) => {
      if (table !== "notes") throw new Error(`Unexpected table ${table}.`);
      return {
        delete() {
          return {
            eq() {
              return Promise.resolve({
                error: {
                  code: "23503",
                  message: 'update or delete on table "notes" violates foreign key constraint "tasks_originating_note_same_owner"',
                },
              });
            },
          };
        },
      };
    }) as unknown as SupabaseClient["from"]);

    await expect(deleteNote(client, noteId(1))).rejects.toBeInstanceOf(NoteCitedError);
    await expect(deleteNote(client, noteId(1))).rejects.toThrow(/Task was established from it/);
  });

  it("keeps select and insert ownership and adds update and delete ownership", () => {
    const createSql = readFileSync(
      new URL("../supabase/migrations/20261004180000_notes.sql", import.meta.url),
      "utf8",
    );
    const lifecycleSql = readFileSync(
      new URL("../supabase/migrations/20261008210000_note_lifecycle.sql", import.meta.url),
      "utf8",
    );
    expect(createSql).toContain("enable row level security");
    expect(createSql).toContain("notes_select_own");
    expect(createSql).toContain("notes_insert_own");
    expect(createSql).toContain("grant select, insert on table public.notes to authenticated");
    expect(lifecycleSql).toContain("add column retired_at timestamptz");
    expect(lifecycleSql).toContain("grant update (retired_at) on table public.notes to authenticated");
    expect(lifecycleSql).toContain("grant delete on table public.notes to authenticated");
    expect(lifecycleSql).not.toMatch(/grant update, delete on table public\.notes/);
    expect(lifecycleSql).not.toMatch(/grant update on table public\.notes/);
    expect(lifecycleSql).toContain("notes_update_own");
    expect(lifecycleSql).toContain("notes_delete_own");
    expect(lifecycleSql).toContain("user_id = (select auth.uid())");
    expect(lifecycleSql).not.toMatch(/on delete cascade|on delete set null/i);
    expect(lifecycleSql).not.toMatch(/alter table public\.tasks/);
    expect(lifecycleSql).not.toMatch(/grant .+ on table public\.notes to (anon|public)/);
    const provenance = readFileSync(
      new URL("../supabase/migrations/20261005020600_task_originating_note.sql", import.meta.url),
      "utf8",
    );
    expect(provenance).toContain("on delete no action");
  });

  it("exposes create, current read, retire, and delete", () => {
    const source = readFileSync(new URL("./note.ts", import.meta.url), "utf8");
    expect(source).toContain("export async function createNote");
    expect(source).toContain("export async function loadNotes");
    expect(source).toContain("export async function retireNote");
    expect(source).toContain("export async function deleteNote");
    expect(source).toContain('.is("retired_at", null)');
    expect(source).toContain("NoteCitedError");
    expect(source).not.toMatch(/archiveNote|unretire|updateNote\b/);
  });

  it("leaves quick capture creating a task", () => {
    const frame = readFileSync(new URL("../components/AppFrame.tsx", import.meta.url), "utf8");
    const capture = readFileSync(new URL("../domain/capture.ts", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../components/CapturePanel.tsx", import.meta.url), "utf8");
    expect(frame).toContain("createTask");
    expect(frame).toContain("newTaskFromCapture");
    expect(frame).not.toContain("createNote");
    expect(capture).toContain("export function newTaskFromCapture");
    expect(capture).not.toContain("createNote");
    expect(panel).not.toContain("createNote");
  });

  it("leaves the open-task complete read unchanged", () => {
    const source = readFileSync(new URL("./contextsAndTasks.ts", import.meta.url), "utf8");
    expect(source).toContain("readCompleteCollection");
    expect(source).toContain('.is("completed_at", null)');
    expect(source).toContain('.order("created_at", { ascending: true })');
    expect(source).not.toContain("notes");
  });

  it("leaves the complete-read helper unchanged", () => {
    const source = readFileSync(new URL("./completeRead.ts", import.meta.url), "utf8");
    expect(source).toContain("A temporal read did not report its complete size.");
    expect(source).toContain("A temporal read stopped before it was complete.");
    expect(source).toContain("A temporal read changed before it was complete.");
    expect(source).toContain("A temporal read returned more rows than it reported.");
    expect(source).not.toContain("notes");
  });
});
