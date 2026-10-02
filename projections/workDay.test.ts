import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { instantFromZonedLocal, requireIanaTimeZone } from "@/domain/time/localTime";
import { civilDateInTimeZone, formatCivilDate } from "@/domain/time/workFiscalWeek";
import { offWorkDay, scheduledWorkDay, shiftEndsNextCivilDate } from "@/domain/workSchedule";
import { toTaskInsert } from "@/persistence/contextTaskMapping";
import { projectWorkDay } from "@/projections/workDay";

const zone = "America/Denver";

describe("work day projection", () => {
  it("treats a missing entry as unknown and an Off entry as Off", () => {
    const instant = new Date("2026-10-03T18:00:00.000Z");
    expect(projectWorkDay({ entry: null, timeZone: zone, instant })).toEqual({ state: "unknown" });
    expect(projectWorkDay({ entry: offWorkDay("2026-10-03"), timeZone: zone, instant })).toEqual({
      state: "off",
    });
  });

  it("places a supplied instant before, during, and after a same-day shift", () => {
    const entry = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "17:00",
      shiftType: "mid",
    });

    expect(projectWorkDay({ entry, timeZone: zone, instant: new Date("2026-10-03T13:30:00.000Z") })).toMatchObject({
      state: "scheduled",
      shiftType: "mid",
      position: "before",
      endsNextCivilDate: false,
    });
    expect(projectWorkDay({ entry, timeZone: zone, instant: new Date("2026-10-03T16:00:00.000Z") })).toMatchObject({
      position: "during",
    });
    expect(projectWorkDay({ entry, timeZone: zone, instant: new Date("2026-10-03T23:30:00.000Z") })).toMatchObject({
      position: "after",
    });
  });

  it("changes position when the same instant is read in another time zone", () => {
    const entry = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "17:00",
      shiftType: "opening",
    });
    const instant = new Date("2026-10-03T13:30:00.000Z");

    expect(projectWorkDay({ entry, timeZone: "America/Denver", instant }).state).toBe("scheduled");
    expect(projectWorkDay({ entry, timeZone: "America/Denver", instant })).toMatchObject({
      position: "before",
    });
    expect(projectWorkDay({ entry, timeZone: "UTC", instant })).toMatchObject({ position: "during" });
  });

  it("treats an end at or before the start as continuing into the next civil date", () => {
    expect(shiftEndsNextCivilDate("22:00", "06:00")).toBe(true);
    expect(shiftEndsNextCivilDate("10:00", "10:00")).toBe(true);
    expect(shiftEndsNextCivilDate("06:00", "15:00")).toBe(false);

    const entry = scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });

    expect(projectWorkDay({ entry, timeZone: zone, instant: new Date("2026-10-04T06:00:00.000Z") })).toMatchObject({
      position: "during",
      endsNextCivilDate: true,
    });
    expect(projectWorkDay({ entry, timeZone: zone, instant: new Date("2026-10-04T12:00:00.000Z") })).toMatchObject({
      position: "after",
    });
    expect(instantFromZonedLocal("2026-10-03", "06:00", zone).toISOString()).toBe(
      "2026-10-03T12:00:00.000Z",
    );
    expect(instantFromZonedLocal("2026-01-15", "06:00", zone).toISOString()).toBe(
      "2026-01-15T13:00:00.000Z",
    );
  });

  it("does not let a time zone rewrite a planned civil date", () => {
    const plannedOn = "2026-10-05";
    const inserted = toTaskInsert("user-1", { title: "Call the school", plannedOn });
    const instant = new Date("2026-10-05T04:30:00.000Z");

    expect(inserted.planned_on).toBe(plannedOn);
    expect(formatCivilDate(civilDateInTimeZone(instant, "UTC"))).toBe("2026-10-05");
    expect(formatCivilDate(civilDateInTimeZone(instant, "America/Denver"))).toBe("2026-10-04");
    expect(inserted.planned_on).toBe("2026-10-05");
  });

  it("rejects a zone the platform does not recognize", () => {
    expect(() => requireIanaTimeZone("Not/AZone")).toThrow(/IANA/);
  });

  it("has no hidden clock or network dependency", () => {
    const source = readFileSync(new URL("./workDay.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Date\.now|new Date\(\)|fetch\(|supabase|process\.env|setTimeout|setInterval/);
  });
});
