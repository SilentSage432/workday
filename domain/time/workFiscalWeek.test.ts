import { describe, expect, it } from "vitest";
import {
  addCivilDays,
  formatCivilDate,
  formatCivilDateLabel,
  parseCivilDate,
  workFiscalWeekContaining,
  workFiscalWeekDates,
  workFiscalWeekStart,
} from "./workFiscalWeek";

describe("workFiscalWeekStart", () => {
  it("starts a Work fiscal week on Saturday", () => {
    const saturdayNoonDenver = new Date("2026-10-03T18:00:00.000Z");

    expect(formatCivilDate(workFiscalWeekStart(saturdayNoonDenver, "America/Denver"))).toBe(
      "2026-10-03",
    );
  });

  it("keeps Friday in the Work fiscal week that began the previous Saturday", () => {
    const fridayNoonDenver = new Date("2026-10-02T18:00:00.000Z");

    expect(formatCivilDate(workFiscalWeekStart(fridayNoonDenver, "America/Denver"))).toBe(
      "2026-09-26",
    );
  });

  it("lists Saturday through Friday for that Work week", () => {
    const start = workFiscalWeekStart(new Date("2026-10-02T18:00:00.000Z"), "America/Denver");
    expect(workFiscalWeekDates(start).map(formatCivilDate)).toEqual([
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(formatCivilDate(addCivilDays(start, 7))).toBe("2026-10-03");
  });

  it("names the Saturday of the Work fiscal week that contains a civil date", () => {
    expect(workFiscalWeekContaining("2026-10-05")).toBe("2026-10-03");
    expect(workFiscalWeekContaining("2026-10-10")).toBe("2026-10-10");
    expect(workFiscalWeekContaining("2026-10-09")).toBe("2026-10-03");
  });

  it("uses the supplied time zone when the same instant falls on different civil dates", () => {
    const instant = new Date("2026-10-03T04:30:00.000Z");

    expect(formatCivilDate(workFiscalWeekStart(instant, "UTC"))).toBe("2026-10-03");
    expect(formatCivilDate(workFiscalWeekStart(instant, "America/Denver"))).toBe("2026-09-26");
  });
});

describe("parseCivilDate", () => {
  it("accepts a real calendar day and rejects a day that does not exist", () => {
    expect(formatCivilDate(parseCivilDate("2024-02-29"))).toBe("2024-02-29");
    expect(() => parseCivilDate("2026-02-29")).toThrow(/calendar day/);
  });

  it("labels a civil date without shifting the calendar day", () => {
    expect(formatCivilDateLabel("2026-10-03")).toBe("Sat, Oct 3");
  });
});
