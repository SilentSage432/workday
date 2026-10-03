import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { defineProtectedTime } from "@/domain/protectedTime";
import {
  createProtectedTime,
  deleteProtectedTime,
  rowToProtectedTime,
  toProtectedTimeWrite,
  updateProtectedTime,
  type ProtectedTimeRow,
} from "@/persistence/protectedTime";

const allDayRow: ProtectedTimeRow = {
  id: "pt-1",
  starts_on: "2026-10-04",
  kind: "all_day",
  start_local: null,
  end_local: null,
  label: null,
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

describe("protected time persistence", () => {
  it("maps an all-day row and a timed row without a context", () => {
    expect(rowToProtectedTime(allDayRow)).toEqual({
      id: "pt-1",
      createdAt: "2026-10-02T18:00:00.000Z",
      kind: "all_day",
      startsOn: "2026-10-04",
      label: null,
    });

    const write = toProtectedTimeWrite(
      "user-1",
      defineProtectedTime({
        kind: "timed",
        startsOn: "2026-10-03",
        startLocal: "08:07",
        endLocal: "12:30",
        label: "Family",
      }),
    );
    expect(write).toEqual({
      user_id: "user-1",
      starts_on: "2026-10-03",
      kind: "timed",
      start_local: "08:07:00",
      end_local: "12:30:00",
      label: "Family",
    });
    expect(write).not.toHaveProperty("context_id");
    expect(write).not.toHaveProperty("recurrence");
  });

  it("creates, updates, and deletes only through the protected time table", async () => {
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
    await createProtectedTime(
      created,
      defineProtectedTime({ kind: "all_day", startsOn: "2026-10-04", label: null }),
    );
    expect(writes).toEqual([
      {
        user_id: "user-1",
        starts_on: "2026-10-04",
        kind: "all_day",
        start_local: null,
        end_local: null,
        label: null,
      },
    ]);

    let updatedId = "";
    const updated = client(() => ({
      update(row: unknown) {
        writes.push(row);
        return {
          eq(column: string, value: string) {
            if (column === "id") updatedId = value;
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { ...allDayRow, label: "Time off" }, error: null }),
                }),
              }),
            };
          },
        };
      },
    }));
    const saved = await updateProtectedTime(
      updated,
      "pt-1",
      defineProtectedTime({ kind: "all_day", startsOn: "2026-10-04", label: "Time off" }),
    );
    expect(updatedId).toBe("pt-1");
    expect(saved.label).toBe("Time off");

    let deleted = "";
    const removed = client(() => ({
      delete() {
        return {
          eq(_column: string, value: string) {
            deleted = value;
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    }));
    await deleteProtectedTime(removed, "pt-1");
    expect(deleted).toBe("pt-1");
  });

  it("does not report a failed write as saved", async () => {
    const failing = client(() => ({
      insert() {
        return { select: () => ({ single: async () => ({ data: null, error: { message: "denied" } }) }) };
      },
    }));
    await expect(
      createProtectedTime(
        failing,
        defineProtectedTime({ kind: "all_day", startsOn: "2026-10-04", label: null }),
      ),
    ).rejects.toThrow(/denied/);
  });

  it("limits protected time to the signed-in user in the migration", () => {
    const sql = readFileSync(
      new URL("../supabase/migrations/20261003020000_protected_time.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("protected_time_select_own");
    expect(sql).toContain("protected_time_insert_own");
    expect(sql).toContain("protected_time_update_own");
    expect(sql).toContain("protected_time_delete_own");
    expect(sql).toContain("user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on table public.protected_time from public, anon");
    expect(sql).toContain("grant select, insert, update, delete on table public.protected_time to authenticated");
    expect(sql).not.toMatch(/using \(true\)|service_role/);
  });
});
