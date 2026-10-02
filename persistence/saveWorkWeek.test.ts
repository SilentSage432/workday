import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { planWeekSave, replaceDay, weekDraftFromEntries } from "@/components/weekDraft";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { scheduledWorkDay } from "@/domain/workSchedule";
import { saveWorkWeek, toSaveWorkWeekArgs } from "@/persistence/saveWorkWeek";

const dates = ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];

describe("save work week", () => {
  it("sends only changed days and does not call the database when nothing changed", async () => {
    const calls: unknown[] = [];
    const client = {
      rpc: async (_name: string, args: unknown) => {
        calls.push(args);
        return { error: null };
      },
    } as unknown as SupabaseClient;
    const opening = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const unchanged = planWeekSave(weekDraftFromEntries(dates, [opening]));
    expect(unchanged.ok).toBe(true);
    if (!unchanged.ok) return;
    await saveWorkWeek(client, "2026-10-03", unchanged.writes);
    expect(calls).toEqual([]);

    let draft = weekDraftFromEntries(dates, [opening]);
    draft = replaceDay(draft, "2026-10-04", {
      state: "scheduled",
      start: localTimeToTwelveHour("08:00"),
      end: localTimeToTwelveHour("17:00"),
      shiftType: "mid",
    });
    const changed = planWeekSave(draft);
    if (!changed.ok) return;
    await saveWorkWeek(client, "2026-10-03", changed.writes);
    const args = toSaveWorkWeekArgs("2026-10-03", changed.writes);
    expect(calls).toEqual([args]);
    expect(args.changes.map((change) => change.work_on)).toEqual(["2026-10-04"]);
  });

  it("throws when the week save fails and does not resolve", async () => {
    const client = {
      rpc: async () => ({ error: { message: "permission denied" } }),
    } as unknown as SupabaseClient;
    let draft = weekDraftFromEntries(dates, []);
    draft = replaceDay(draft, "2026-10-05", { state: "off" });
    const plan = planWeekSave(draft);
    if (!plan.ok) return;
    await expect(saveWorkWeek(client, "2026-10-03", plan.writes)).rejects.toThrow(/not saved/);
  });
});
