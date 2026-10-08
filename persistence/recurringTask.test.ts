import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  establishRecurringTaskDefinition,
  ensureRecurringTaskOccurrence,
  expectedDueOnForOccurrence,
  retireRecurringTaskDefinition,
  toRecurringTaskDefinitionInsert,
  updateRecurringTaskDefinition,
  RECURRING_TASK_DEFINITION_COLUMNS,
} from "@/persistence/recurringTask";
import type { TaskRow } from "@/persistence/contextTaskRows";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DEF_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000099";
const ESTABLISHED = new Date("2026-10-13T15:00:00.000Z");

const migration = readFileSync(
  new URL("../supabase/migrations/20261008120000_recurring_tasks.sql", import.meta.url),
  "utf8",
);

function signedInClient(handlers: {
  from?: unknown;
  rpc?: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
}): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from: handlers.from,
    rpc: handlers.rpc,
  } as unknown as SupabaseClient;
}

function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: TASK_ID,
    context_id: null,
    title: "Complete bay audits",
    created_at: "2026-10-13T15:00:00.000Z",
    completed_at: null,
    due_on: "2026-10-14",
    planned_on: null,
    planned_local: null,
    must_do: false,
    origin: "user_created",
    originating_note_id: null,
    ...overrides,
  };
}

describe("recurring Task persistence", () => {
  it("migration creates definition and occurrence provenance with atomic ensure RPC", () => {
    expect(migration).toContain("create table public.recurring_task_definitions");
    expect(migration).toContain("create table public.recurring_task_occurrences");
    expect(migration).toContain("cycle_kind = 'lowes_fiscal_week'");
    expect(migration).toContain("available_weekday in ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri')");
    expect(migration).toContain("primary key (user_id, definition_id, cycle_kind, cycle_key)");
    expect(migration).toContain("constraint recurring_task_occurrences_task_id_key unique (task_id)");
    expect(migration).toContain("create or replace function public.ensure_recurring_task_occurrence");
    expect(migration).toContain("p_time_zone text");
    expect(migration).toContain("established_civil := (def.established_at at time zone btrim(p_time_zone))::date");
    expect(migration).toContain("if established_civil >= week_end then");
    expect(migration).not.toMatch(/week_end::timestamp at time zone 'UTC'/);
    expect(migration).toContain("security invoker");
    expect(migration).toContain("when unique_violation then");
    expect(migration).not.toMatch(/alter table public\.tasks\b/);
    expect(migration).not.toMatch(/rrule|cron|notification|web.?push/i);
    expect(migration).toContain(
      "grant select, insert, update on table public.recurring_task_definitions to authenticated;",
    );
    expect(migration).toContain(
      "grant select, insert on table public.recurring_task_occurrences to authenticated;",
    );
    expect(migration).not.toMatch(/grant (update|delete) on table public\.recurring_task_occurrences/);
  });

  it("maps Bay Audit and Cycle Count due stamps from fiscal week", () => {
    expect(expectedDueOnForOccurrence("2026-10-10", "wed")).toBe("2026-10-14");
    expect(
      toRecurringTaskDefinitionInsert(USER_ID, {
        id: DEF_ID,
        title: "Complete bay audits",
        availableWeekday: "sat",
        dueWeekday: "wed",
        establishedAt: ESTABLISHED,
      }),
    ).toMatchObject({
      available_weekday: "sat",
      due_weekday: "wed",
      cycle_kind: "lowes_fiscal_week",
      title: "Complete bay audits",
    });
  });

  it("establishes, edits future fields, and retires without deleting Tasks", async () => {
    let stored = {
      id: DEF_ID,
      title: "Complete bay audits",
      context_id: null as string | null,
      cycle_kind: "lowes_fiscal_week",
      available_weekday: "sat",
      due_weekday: "wed",
      established_at: "2026-10-13T15:00:00.000Z",
      retired_at: null as string | null,
    };
    const from = (table: string) => {
      if (table !== "recurring_task_definitions") throw new Error(table);
      return {
        insert(row: typeof stored & { user_id: string }) {
          stored = {
            id: row.id,
            title: row.title,
            context_id: row.context_id,
            cycle_kind: row.cycle_kind,
            available_weekday: row.available_weekday,
            due_weekday: row.due_weekday,
            established_at: row.established_at,
            retired_at: row.retired_at,
          };
          return {
            select(columns: string) {
              expect(columns).toBe(RECURRING_TASK_DEFINITION_COLUMNS);
              return {
                async single() {
                  return { data: stored, error: null };
                },
              };
            },
          };
        },
        update(patch: Partial<typeof stored>) {
          stored = { ...stored, ...patch };
          return {
            eq() {
              return {
                select(columns: string) {
                  expect(columns).toBe(RECURRING_TASK_DEFINITION_COLUMNS);
                  return {
                    async single() {
                      return { data: stored, error: null };
                    },
                  };
                },
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                async single() {
                  return { data: stored, error: null };
                },
              };
            },
          };
        },
      };
    };

    const established = await establishRecurringTaskDefinition(signedInClient({ from }), {
      id: DEF_ID,
      title: "Complete bay audits",
      availableWeekday: "sat",
      dueWeekday: "wed",
      establishedAt: ESTABLISHED,
    });
    expect(established.title).toBe("Complete bay audits");

    const edited = await updateRecurringTaskDefinition(signedInClient({ from }), DEF_ID, {
      title: "Complete specialty bay audits",
      dueWeekday: "thu",
    });
    expect(edited.title).toBe("Complete specialty bay audits");
    expect(edited.dueWeekday).toBe("thu");

    const retired = await retireRecurringTaskDefinition(signedInClient({ from }), {
      definitionId: DEF_ID,
      retiredAt: new Date("2026-10-14T12:00:00.000Z"),
    });
    expect(retired.retiredAt).toBe("2026-10-14T12:00:00.000Z");
  });

  it("calls ensure RPC and maps ordinary Task without planned_on or mustDo", async () => {
    const calls: Record<string, unknown>[] = [];
    const task = await ensureRecurringTaskOccurrence(
      signedInClient({
        rpc: async (name, args) => {
          expect(name).toBe("ensure_recurring_task_occurrence");
          calls.push(args);
          return { data: taskRow(), error: null };
        },
      }),
      {
        definitionId: DEF_ID,
        cycleKey: "2026-10-10",
        civilNow: "2026-10-13",
        timeZone: "America/Denver",
      },
    );
    expect(calls).toEqual([
      {
        p_definition_id: DEF_ID,
        p_cycle_key: "2026-10-10",
        p_civil_now: "2026-10-13",
        p_time_zone: "America/Denver",
      },
    ]);
    expect(task.id).toBe(TASK_ID);
    expect(task.dueOn).toBe("2026-10-14");
    expect(task.plannedOn).toBeNull();
    expect(task.mustDo).toBe(false);
    expect(task.origin).toBe("user_created");
  });

  it("treats repeated ensure as idempotent at the RPC boundary", async () => {
    let count = 0;
    const client = signedInClient({
      rpc: async () => {
        count += 1;
        return { data: taskRow(), error: null };
      },
    });
    const first = await ensureRecurringTaskOccurrence(client, {
      definitionId: DEF_ID,
      cycleKey: "2026-10-10",
      civilNow: "2026-10-13",
      timeZone: "America/Denver",
    });
    const second = await ensureRecurringTaskOccurrence(client, {
      definitionId: DEF_ID,
      cycleKey: "2026-10-10",
      civilNow: "2026-10-13",
      timeZone: "America/Denver",
    });
    expect(count).toBe(2);
    expect(first.id).toBe(second.id);
    expect(migration).toContain("primary key (user_id, definition_id, cycle_kind, cycle_key)");
  });

  it("passes Orient timezone so RPC civil establishment matches the client", async () => {
    const args: Record<string, unknown>[] = [];
    await ensureRecurringTaskOccurrence(
      signedInClient({
        rpc: async (_name, payload) => {
          args.push(payload);
          return { data: taskRow(), error: null };
        },
      }),
      {
        definitionId: DEF_ID,
        cycleKey: "2026-10-10",
        civilNow: "2026-10-16",
        timeZone: "America/Denver",
      },
    );
    expect(args[0]?.p_time_zone).toBe("America/Denver");
    expect(args[0]?.p_civil_now).toBe("2026-10-16");
    expect(migration).toContain(
      "established_civil := (def.established_at at time zone btrim(p_time_zone))::date",
    );
  });
});
