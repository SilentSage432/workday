import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { defineCommitment } from "@/domain/commitment";
import {
  createCommitment,
  deleteCommitment,
  rowToCommitment,
  toCommitmentWrite,
  updateCommitment,
  type CommitmentRow,
} from "@/persistence/commitment";

const allDayRow: CommitmentRow = {
  id: "commitment-1",
  starts_on: "2026-10-10",
  kind: "all_day",
  start_local: null,
  end_local: null,
  title: "School event",
  origin: "user_created",
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

describe("commitment persistence", () => {
  it("maps a user-created commitment and stores origin separately from the title", () => {
    expect(rowToCommitment(allDayRow)).toEqual({
      id: "commitment-1",
      createdAt: "2026-10-02T18:00:00.000Z",
      kind: "all_day",
      startsOn: "2026-10-10",
      title: "School event",
      origin: "user_created",
    });

    const write = toCommitmentWrite(
      "user-1",
      defineCommitment({
        kind: "timed",
        startsOn: "2026-10-08",
        startLocal: "15:00",
        endLocal: "16:07",
        title: "Dentist",
      }),
    );
    expect(write).toEqual({
      user_id: "user-1",
      starts_on: "2026-10-08",
      kind: "timed",
      start_local: "15:00:00",
      end_local: "16:07:00",
      title: "Dentist",
      origin: "user_created",
    });
    expect(write).not.toHaveProperty("context_id");
    expect(write).not.toHaveProperty("task_id");
    expect(write).not.toHaveProperty("google_event_id");
    expect(write).not.toHaveProperty("recurrence");
  });

  it("rejects an origin this tranche does not store", () => {
    expect(() => rowToCommitment({ ...allDayRow, origin: "google_calendar" })).toThrow(/origin/);
  });

  it("creates, updates, and deletes only through the commitments table", async () => {
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
    await createCommitment(
      created,
      defineCommitment({ kind: "all_day", startsOn: "2026-10-10", title: "School event" }),
    );
    expect(writes[0]).toMatchObject({
      user_id: "user-1",
      kind: "all_day",
      title: "School event",
      origin: "user_created",
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
                      data: { ...allDayRow, title: "Dentist" },
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
    const saved = await updateCommitment(
      updated,
      "commitment-1",
      defineCommitment({ kind: "all_day", startsOn: "2026-10-10", title: "Dentist" }),
    );
    expect(updatedId).toBe("commitment-1");
    expect(ownedBy).toBe("user-1");
    expect(saved.title).toBe("Dentist");
    expect(writes[1]).toMatchObject({ origin: "user_created" });

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
    await deleteCommitment(removed, "commitment-1");
    expect(deleted).toBe("commitment-1");
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
      createCommitment(
        failing,
        defineCommitment({ kind: "all_day", startsOn: "2026-10-10", title: "School event" }),
      ),
    ).rejects.toThrow(/denied/);
  });

  it("limits commitments to the signed-in user and user-created origin", () => {
    const sql = readFileSync(
      new URL("../supabase/migrations/20261003040000_commitments.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("commitments_select_own");
    expect(sql).toContain("commitments_insert_own");
    expect(sql).toContain("commitments_update_own");
    expect(sql).toContain("commitments_delete_own");
    expect(sql).toContain("user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on table public.commitments from public, anon");
    expect(sql).toContain(
      "grant select, insert, update, delete on table public.commitments to authenticated",
    );
    expect(sql).toContain("origin = 'user_created'");
    expect(sql).not.toMatch(/using \(true\)|service_role|task_id|context_id|google_|recurrence|protected_time|blocks/);
  });

  it("does not write Tasks, Protected Time, Blocks, or Work schedule", () => {
    const source = readFileSync(new URL("./commitment.ts", import.meta.url), "utf8");
    expect(source).toContain('from("commitments")');
    expect(source).not.toMatch(/from\("(tasks|protected_time|blocks|work_schedule|active_threads)"\)/);
    expect(source).not.toMatch(/google_|context_id|planned_on|recurrence/);
  });
});
