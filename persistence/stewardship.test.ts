import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  establishStewardshipDefinition,
  editStewardshipDefinitionForward,
  retireStewardshipDefinition,
  rowToStewardshipDefinition,
  satisfyStewardshipOccurrence,
  toStewardshipDefinitionInsert,
  toStewardshipRevisionInsert,
  toStewardshipSatisfactionInsert,
  withdrawStewardshipSatisfaction,
  STEWARDSHIP_DEFINITION_COLUMNS,
  STEWARDSHIP_REVISION_COLUMNS,
  STEWARDSHIP_SATISFACTION_COLUMNS,
  type StewardshipDefinitionRow,
  type StewardshipRevisionRow,
  type StewardshipSatisfactionRow,
} from "@/persistence/stewardship";
import { requireStewardshipCycleKind } from "@/domain/stewardship";
import { toTaskInsert } from "@/persistence/contextTaskMapping";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DEF_ID = "00000000-0000-4000-8000-000000000001";
const REV_ID = "00000000-0000-4000-8000-000000000010";
const REV_ID_2 = "00000000-0000-4000-8000-000000000011";
const CONTEXT_ID = "00000000-0000-4000-8000-000000000020";
const ESTABLISHED = new Date("2026-10-04T15:00:00.000Z");

const migration = readFileSync(
  new URL("../supabase/migrations/20261008050000_stewardship.sql", import.meta.url),
  "utf8",
);

function signedInClient(from: unknown): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
    },
    from,
  } as unknown as SupabaseClient;
}

describe("stewardship persistence", () => {
  it("migration creates Model B tables without occurrence materialization", () => {
    expect(migration).toContain("create table public.stewardship_definitions");
    expect(migration).toContain("create table public.stewardship_definition_revisions");
    expect(migration).toContain("create table public.stewardship_satisfactions");
    expect(migration).not.toMatch(/create table public\.stewardship_occurrences\b/);
    expect(migration).toContain("cycle_kind in ('workday', 'lowes_fiscal_week')");
    expect(migration).toContain("foreign key (context_id, user_id)");
    expect(migration).toContain("references public.contexts (id, user_id)");
    expect(migration).toContain("primary key (user_id, definition_id, cycle_kind, cycle_key)");
    expect(migration).not.toMatch(/rrule|cron|recurrence_rule/i);
  });

  it("revokes defaults and grants definition update, revision insert-only, satisfaction delete", () => {
    expect(migration).toContain(
      "grant select, insert, update on table public.stewardship_definitions to authenticated;",
    );
    expect(migration).toContain(
      "grant select, insert on table public.stewardship_definition_revisions to authenticated;",
    );
    expect(migration).toContain(
      "grant select, insert, delete on table public.stewardship_satisfactions to authenticated;",
    );
    expect(migration).not.toMatch(
      /grant delete on table public\.stewardship_definitions|grant update on table public\.stewardship_definition_revisions|grant update on table public\.stewardship_satisfactions/,
    );
    for (const table of [
      "stewardship_definitions",
      "stewardship_definition_revisions",
      "stewardship_satisfactions",
    ]) {
      expect(migration).toContain(`revoke all on table public.${table} from public;`);
      expect(migration).toContain(`revoke all on table public.${table} from anon;`);
      expect(migration).toContain(`revoke all on table public.${table} from authenticated;`);
    }
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("stewardship_definitions_update_own");
    expect(migration).toContain("stewardship_satisfactions_delete_own");
  });

  it("maps establish inserts with nullable Context and closed cycle kinds", () => {
    expect(() => requireStewardshipCycleKind("monthly")).toThrow(/workday/);
    const withContext = toStewardshipDefinitionInsert(USER_ID, {
      id: DEF_ID,
      cycleKind: "workday",
      contextId: CONTEXT_ID,
      content: "Review pipelines",
      establishedAt: ESTABLISHED,
      revisionId: REV_ID,
    });
    expect(withContext).toEqual({
      id: DEF_ID,
      user_id: USER_ID,
      cycle_kind: "workday",
      context_id: CONTEXT_ID,
      established_at: "2026-10-04T15:00:00.000Z",
      retired_at: null,
    });
    const withoutContext = toStewardshipDefinitionInsert(USER_ID, {
      id: DEF_ID,
      cycleKind: "lowes_fiscal_week",
      content: "Walk Zone A",
      establishedAt: ESTABLISHED,
      revisionId: REV_ID,
    });
    expect(withoutContext.context_id).toBeNull();
    expect(
      toStewardshipRevisionInsert(USER_ID, {
        id: REV_ID,
        definitionId: DEF_ID,
        content: "Walk Zone A",
        effectiveAt: ESTABLISHED,
      }),
    ).toMatchObject({
      definition_id: DEF_ID,
      content: "Walk Zone A",
      effective_at: "2026-10-04T15:00:00.000Z",
    });
  });

  it("establishes definition plus initial revision at the same instant", async () => {
    const definitions: StewardshipDefinitionRow[] = [];
    const revisions: StewardshipRevisionRow[] = [];
    const from = (table: string) => {
      if (table === "stewardship_definitions") {
        return {
          insert(row: StewardshipDefinitionRow & { user_id: string; retired_at: null }) {
            definitions.push({
              id: row.id,
              cycle_kind: row.cycle_kind,
              context_id: row.context_id,
              established_at: row.established_at,
              retired_at: row.retired_at,
            });
            return {
              select(columns: string) {
                expect(columns).toBe(STEWARDSHIP_DEFINITION_COLUMNS);
                return {
                  async single() {
                    return { data: definitions[0], error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "stewardship_definition_revisions") {
        return {
          insert(row: StewardshipRevisionRow & { user_id: string }) {
            revisions.push({
              id: row.id,
              definition_id: row.definition_id,
              content: row.content,
              effective_at: row.effective_at,
            });
            return {
              select(columns: string) {
                expect(columns).toBe(STEWARDSHIP_REVISION_COLUMNS);
                return {
                  async single() {
                    return { data: revisions[0], error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    };

    const established = await establishStewardshipDefinition(signedInClient(from), {
      id: DEF_ID,
      cycleKind: "workday",
      contextId: null,
      content: "Review pipelines",
      establishedAt: ESTABLISHED,
      revisionId: REV_ID,
    });
    expect(established.definition).toEqual({
      id: DEF_ID,
      cycleKind: "workday",
      contextId: null,
      establishedAt: "2026-10-04T15:00:00.000Z",
      retiredAt: null,
    });
    expect(established.revision).toEqual({
      id: REV_ID,
      definitionId: DEF_ID,
      content: "Review pipelines",
      effectiveAt: "2026-10-04T15:00:00.000Z",
    });
    expect(definitions).toHaveLength(1);
    expect(revisions).toHaveLength(1);
  });

  it("edit appends a revision and leave prior revision rows unchanged", async () => {
    const revisions: StewardshipRevisionRow[] = [
      {
        id: REV_ID,
        definition_id: DEF_ID,
        content: "Walk Zone A with owner",
        effective_at: "2026-10-04T15:00:00.000Z",
      },
    ];
    const from = (table: string) => {
      if (table !== "stewardship_definition_revisions") throw new Error(table);
      return {
        insert(row: StewardshipRevisionRow & { user_id: string }) {
          const next = {
            id: row.id,
            definition_id: row.definition_id,
            content: row.content,
            effective_at: row.effective_at,
          };
          revisions.push(next);
          return {
            select() {
              return {
                async single() {
                  return { data: next, error: null };
                },
              };
            },
          };
        },
      };
    };

    const edited = await editStewardshipDefinitionForward(signedInClient(from), {
      definitionId: DEF_ID,
      revisionId: REV_ID_2,
      content: "Walk Zone A with owner and inventory exceptions",
      effectiveAt: new Date("2026-10-08T20:00:00.000Z"),
    });
    expect(edited.content).toContain("inventory exceptions");
    expect(revisions[0]?.content).toBe("Walk Zone A with owner");
    expect(revisions).toHaveLength(2);
  });

  it("retirement sets retired_at without writing satisfaction", async () => {
    let updated: { retired_at: string } | null = null;
    const from = (table: string) => {
      if (table !== "stewardship_definitions") throw new Error(table);
      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return {
                    data: {
                      id: DEF_ID,
                      cycle_kind: "workday",
                      context_id: null,
                      established_at: "2026-10-04T15:00:00.000Z",
                      retired_at: null,
                    } satisfies StewardshipDefinitionRow,
                    error: null,
                  };
                },
              };
            },
          };
        },
        update(patch: { retired_at: string }) {
          updated = patch;
          return {
            eq() {
              return {
                is() {
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: {
                              id: DEF_ID,
                              cycle_kind: "workday",
                              context_id: null,
                              established_at: "2026-10-04T15:00:00.000Z",
                              retired_at: patch.retired_at,
                            },
                            error: null,
                          };
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
    };

    const retired = await retireStewardshipDefinition(signedInClient(from), {
      definitionId: DEF_ID,
      retiredAt: new Date("2026-10-09T12:00:00.000Z"),
    });
    expect(updated).toEqual({ retired_at: "2026-10-09T12:00:00.000Z" });
    expect(retired.retiredAt).toBe("2026-10-09T12:00:00.000Z");
    expect(migration).not.toMatch(/satisfied_at.*retire|retire.*satisfied/i);
  });

  it("satisfy writes one Fact and duplicate preserve first satisfied_at", async () => {
    const store = new Map<string, StewardshipSatisfactionRow>();
    const key = (row: {
      definition_id: string;
      cycle_kind: string;
      cycle_key: string;
    }) => `${row.definition_id}|${row.cycle_kind}|${row.cycle_key}`;

    const from = (table: string) => {
      if (table !== "stewardship_satisfactions") throw new Error(table);
      return {
        upsert(
          row: StewardshipSatisfactionRow & { user_id: string },
          options: { ignoreDuplicates?: boolean },
        ) {
          expect(options.ignoreDuplicates).toBe(true);
          const id = key(row);
          if (!store.has(id)) {
            store.set(id, {
              definition_id: row.definition_id,
              cycle_kind: row.cycle_kind,
              cycle_key: row.cycle_key,
              satisfied_at: row.satisfied_at,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        select(columns: string) {
          expect(columns).toBe(STEWARDSHIP_SATISFACTION_COLUMNS);
          let definitionId = "";
          let cycleKind = "";
          let cycleKey = "";
          const builder = {
            eq(column: string, value: string) {
              if (column === "definition_id") definitionId = value;
              if (column === "cycle_kind") cycleKind = value;
              if (column === "cycle_key") cycleKey = value;
              return builder;
            },
            async single() {
              const found = store.get(key({
                definition_id: definitionId,
                cycle_kind: cycleKind,
                cycle_key: cycleKey,
              }));
              return { data: found ?? null, error: found ? null : { message: "missing" } };
            },
          };
          return builder;
        },
      };
    };

    const client = signedInClient(from);
    const first = await satisfyStewardshipOccurrence(client, {
      definitionId: DEF_ID,
      cycleKind: "workday",
      cycleKey: "2026-10-07",
      satisfiedAt: new Date("2026-10-07T15:40:00.000Z"),
    });
    const second = await satisfyStewardshipOccurrence(client, {
      definitionId: DEF_ID,
      cycleKind: "workday",
      cycleKey: "2026-10-07",
      satisfiedAt: new Date("2026-10-07T18:00:00.000Z"),
    });
    expect(first.satisfiedAt).toBe("2026-10-07T15:40:00.000Z");
    expect(second.satisfiedAt).toBe("2026-10-07T15:40:00.000Z");
    expect(store.size).toBe(1);
    expect(
      toStewardshipSatisfactionInsert(USER_ID, {
        definitionId: DEF_ID,
        cycleKind: "workday",
        cycleKey: "2026-10-07",
        satisfiedAt: new Date("2026-10-07T15:40:00.000Z"),
      }),
    ).not.toHaveProperty("quality");
  });

  it("withdraw removes satisfaction and second withdraw is no-op success", async () => {
    const store = new Map<string, StewardshipSatisfactionRow>([
      [
        `${DEF_ID}|workday|2026-10-07`,
        {
          definition_id: DEF_ID,
          cycle_kind: "workday",
          cycle_key: "2026-10-07",
          satisfied_at: "2026-10-07T15:40:00.000Z",
        },
      ],
    ]);
    const from = (table: string) => {
      if (table !== "stewardship_satisfactions") throw new Error(table);
      return {
        delete() {
          let definitionId = "";
          let cycleKind = "";
          let cycleKey = "";
          const builder = {
            eq(column: string, value: string) {
              if (column === "definition_id") definitionId = value;
              if (column === "cycle_kind") cycleKind = value;
              if (column === "cycle_key") cycleKey = value;
              return builder;
            },
            then(resolve: (value: { error: null }) => void) {
              store.delete(`${definitionId}|${cycleKind}|${cycleKey}`);
              resolve({ error: null });
            },
          };
          return builder;
        },
      };
    };

    const client = signedInClient(from);
    await withdrawStewardshipSatisfaction(client, {
      definitionId: DEF_ID,
      cycleKind: "workday",
      cycleKey: "2026-10-07",
    });
    expect(store.size).toBe(0);
    await expect(
      withdrawStewardshipSatisfaction(client, {
        definitionId: DEF_ID,
        cycleKind: "workday",
        cycleKey: "2026-10-07",
      }),
    ).resolves.toBeUndefined();
  });

  it("satisfaction mapping does not rewrite definition rows", () => {
    const definition = rowToStewardshipDefinition({
      id: DEF_ID,
      cycle_kind: "workday",
      context_id: null,
      established_at: "2026-10-04T15:00:00.000Z",
      retired_at: null,
    });
    expect(definition.retiredAt).toBeNull();
    expect(toTaskInsert(USER_ID, { title: "Call customer" }).must_do).toBe(false);
  });
});
