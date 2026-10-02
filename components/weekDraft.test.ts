import { describe, expect, it } from "vitest";
import { emptyTwelveHourClock, localTimeToTwelveHour } from "@/components/twelveHourTime";
import {
  planWeekSave,
  replaceDay,
  weekDraftFromEntries,
  weekDraftIsDirty,
} from "@/components/weekDraft";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";
import { shiftEndsNextCivilDate } from "@/domain/workSchedule";

const dates = [
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];

const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

describe("work week draft", () => {
  it("starts from persisted days and does not treat that copy as dirty", () => {
    const draft = weekDraftFromEntries(dates, [opening, offWorkDay("2026-10-04")]);
    expect(draft.days["2026-10-03"]).toMatchObject({ state: "scheduled", shiftType: "opening" });
    expect(draft.days["2026-10-04"]).toEqual({ state: "off" });
    expect(draft.days["2026-10-05"]).toEqual({ state: "unknown" });
    expect(weekDraftIsDirty(draft)).toBe(false);
  });

  it("keeps several day edits local until a save plan", () => {
    let draft = weekDraftFromEntries(dates, [opening]);
    draft = replaceDay(draft, "2026-10-04", { state: "off" });
    draft = replaceDay(draft, "2026-10-05", {
      state: "scheduled",
      start: localTimeToTwelveHour("08:00"),
      end: localTimeToTwelveHour("17:00"),
      shiftType: "mid",
    });
    draft = replaceDay(draft, "2026-10-03", { state: "unknown" });
    expect(weekDraftIsDirty(draft)).toBe(true);
    const plan = planWeekSave(draft);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.writes.map((write) => write.workOn)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ]);
    expect(plan.writes[0]).toEqual({ workOn: "2026-10-03", action: "clear" });
    expect(plan.writes[1]).toMatchObject({ action: "save", entry: { state: "off" } });
    expect(plan.writes[2]).toMatchObject({
      action: "save",
      entry: { startLocal: "08:00", endLocal: "17:00", shiftType: "mid" },
    });
    expect(plan.writes.some((write) => write.workOn === "2026-10-06")).toBe(false);
  });

  it("plans Off to scheduled, scheduled to Off, and an edited shift", () => {
    let draft = weekDraftFromEntries(dates, [opening, offWorkDay("2026-10-04")]);
    draft = replaceDay(draft, "2026-10-04", {
      state: "scheduled",
      start: localTimeToTwelveHour("11:00"),
      end: localTimeToTwelveHour("20:00"),
      shiftType: "closing",
    });
    draft = replaceDay(draft, "2026-10-03", { state: "off" });
    const plan = planWeekSave(draft);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.writes).toHaveLength(2);
  });

  it("refuses an incomplete shift and clears dirty state only through a new baseline", () => {
    let draft = weekDraftFromEntries(dates, []);
    draft = replaceDay(draft, "2026-10-03", {
      state: "scheduled",
      start: emptyTwelveHourClock(),
      end: localTimeToTwelveHour("15:00"),
      shiftType: "opening",
    });
    const plan = planWeekSave(draft);
    expect(plan.ok).toBe(false);
    const saved = weekDraftFromEntries(dates, [opening]);
    expect(weekDraftIsDirty(saved)).toBe(false);
  });

  it("keeps an overnight shift when the end is not after the start", () => {
    const draft = weekDraftFromEntries(dates, [
      scheduledWorkDay({
        workOn: "2026-10-03",
        startLocal: "22:00",
        endLocal: "06:00",
        shiftType: "closing",
      }),
    ]);
    const plan = planWeekSave(draft);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.writes).toEqual([]);
    expect(shiftEndsNextCivilDate("22:00", "06:00")).toBe(true);
  });
});
