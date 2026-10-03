import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineProtectedTime, timedProtectedTimeEndsNextCivilDate } from "@/domain/protectedTime";

describe("protected time", () => {
  it("stores an all-day civil date without inventing clock times", () => {
    expect(
      defineProtectedTime({ kind: "all_day", startsOn: "2026-10-04", label: "  " }),
    ).toEqual({
      kind: "all_day",
      startsOn: "2026-10-04",
      label: null,
    });
  });

  it("keeps a timed local interval and an optional label", () => {
    expect(
      defineProtectedTime({
        kind: "timed",
        startsOn: "2026-10-03",
        startLocal: "08:07:00",
        endLocal: "12:00",
        label: " Time to myself ",
      }),
    ).toEqual({
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:07",
      endLocal: "12:00",
      label: "Time to myself",
    });
  });

  it("treats an end at or before the start as the next civil date", () => {
    expect(timedProtectedTimeEndsNextCivilDate("22:00", "02:00")).toBe(true);
    expect(timedProtectedTimeEndsNextCivilDate("08:00", "08:00")).toBe(true);
    expect(timedProtectedTimeEndsNextCivilDate("08:00", "12:00")).toBe(false);
  });

  it("rejects a long label and does not invent categories", () => {
    expect(() =>
      defineProtectedTime({ kind: "all_day", startsOn: "2026-10-04", label: "x".repeat(81) }),
    ).toThrow(/80/);
    const source = readFileSync(new URL("./protectedTime.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/context_id|planned_on|recurrence|Date\.now|new Date/);
  });
});
