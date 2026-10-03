import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { defineBlock } from "@/domain/block";
import {
  createBlock,
  deleteBlock,
  rowToBlock,
  toBlockWrite,
  updateBlock,
  type BlockRow,
} from "@/persistence/block";

const allDayRow: BlockRow = {
  id: "block-1",
  starts_on: "2026-10-03",
  kind: "all_day",
  start_local: null,
  end_local: null,
  context_id: null,
  purpose: "TeamLab retreat",
  created_at: "2026-10-02T18:00:00.000Z",
};

function client(from: () => unknown): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
    from,
  } as unknown as SupabaseClient;
}

describe("block persistence", () => {
  it("maps a block with purpose and an optional context", () => {
    expect(rowToBlock(allDayRow)).toEqual({
      id: "block-1",
      createdAt: "2026-10-02T18:00:00.000Z",
      kind: "all_day",
      startsOn: "2026-10-03",
      purpose: "TeamLab retreat",
      contextId: null,
    });

    const write = toBlockWrite(
      "user-1",
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-03",
        startLocal: "09:00",
        endLocal: "11:07",
        purpose: "Work on Studio",
        contextId: "context-teamlab",
      }),
    );
    expect(write).toEqual({
      user_id: "user-1",
      starts_on: "2026-10-03",
      kind: "timed",
      start_local: "09:00:00",
      end_local: "11:07:00",
      context_id: "context-teamlab",
      purpose: "Work on Studio",
    });
    expect(write).not.toHaveProperty("task_id");
    expect(write).not.toHaveProperty("label");
    expect(write).not.toHaveProperty("recurrence");
  });

  it("creates, updates, and deletes only through the blocks table", async () => {
    const writes: unknown[] = [];
    const created = client(() => ({
      insert(row: unknown) {
        writes.push(row);
        return {
          select: () => ({
            single: async () => ({ data: allDayRow, error: null }),
          }),
        };
      },
    }));
    await createBlock(
      created,
      defineBlock({ kind: "all_day", startsOn: "2026-10-03", purpose: "TeamLab retreat" }),
    );
    expect(writes[0]).toMatchObject({
      user_id: "user-1",
      kind: "all_day",
      purpose: "TeamLab retreat",
      context_id: null,
      start_local: null,
    });

    let updatedId = "";
    let ownedBy = "";
    const updated = client(() => ({
      update(row: unknown) {
        writes.push(row);
        return {
          eq(column: string, value: string) {
            if (column === "id") updatedId = value;
            return {
              eq(nextColumn: string, nextValue: string) {
                if (nextColumn === "user_id") ownedBy = nextValue;
                return {
                  select: () => ({
                    single: async () => ({
                      data: { ...allDayRow, purpose: "Read" },
                      error: null,
                    }),
                  }),
                };
              },
            };
          },
        };
      },
    }));
    const saved = await updateBlock(
      updated,
      "block-1",
      defineBlock({ kind: "all_day", startsOn: "2026-10-03", purpose: "Read" }),
    );
    expect(updatedId).toBe("block-1");
    expect(ownedBy).toBe("user-1");
    expect(saved.purpose).toBe("Read");

    let deleted = "";
    let deletedOwner = "";
    const removed = client(() => ({
      delete() {
        return {
          eq(_column: string, value: string) {
            deleted = value;
            return {
              eq(column: string, owner: string) {
                if (column === "user_id") deletedOwner = owner;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    }));
    await deleteBlock(removed, "block-1");
    expect(deleted).toBe("block-1");
    expect(deletedOwner).toBe("user-1");
  });

  it("does not report a failed write as saved", async () => {
    const failing = client(() => ({
      insert() {
        return {
          select: () => ({ single: async () => ({ data: null, error: { message: "denied" } }) }),
        };
      },
    }));
    await expect(
      createBlock(failing, defineBlock({ kind: "all_day", startsOn: "2026-10-03", purpose: "Rest" })),
    ).rejects.toThrow(/denied/);
  });

  it("limits blocks to the signed-in user and that user's contexts", () => {
    const sql = readFileSync(
      new URL("../supabase/migrations/20261003030000_blocks.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("blocks_select_own");
    expect(sql).toContain("blocks_insert_own");
    expect(sql).toContain("blocks_update_own");
    expect(sql).toContain("blocks_delete_own");
    expect(sql).toContain("user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on table public.blocks from public, anon");
    expect(sql).toContain(
      "grant select, insert, update, delete on table public.blocks to authenticated",
    );
    expect(sql).toContain("blocks_context_same_owner");
    expect(sql).toContain("references public.contexts (id, user_id)");
    expect(sql).toContain("on delete set null (context_id)");
    expect(sql).not.toMatch(/using \(true\)|service_role|task_id|protected_time/);
  });
});
