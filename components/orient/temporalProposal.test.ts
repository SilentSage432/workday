import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  localClockDurationMinutes,
  proposeTemporalPlacement,
  quantizeWeekLiftMinute,
  WEEK_LIFT_QUANTUM_MINUTES,
} from "@/components/orient/temporalProposal";

describe("temporal proposal", () => {
  it("preserves a same-day local relationship", () => {
    expect(localClockDurationMinutes("09:00", "10:30")).toBe(90);
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "09:00", endLocal: "10:30" },
        "2026-10-05",
        13 * 60,
      ),
    ).toEqual({ startsOn: "2026-10-05", startLocal: "13:00", endLocal: "14:30" });
  });

  it("keeps an overnight pair when the civil date changes", () => {
    expect(localClockDurationMinutes("22:00", "02:00")).toBe(240);
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "22:00", endLocal: "02:00" },
        "2026-10-08",
        22 * 60,
      ),
    ).toEqual({ startsOn: "2026-10-08", startLocal: "22:00", endLocal: "02:00" });
  });

  it("treats equal clocks as a 24-hour continuation", () => {
    expect(localClockDurationMinutes("09:00", "09:00")).toBe(1440);
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "09:00", endLocal: "09:00" },
        "2026-10-06",
        13 * 60,
      ),
    ).toEqual({ startsOn: "2026-10-06", startLocal: "13:00", endLocal: "13:00" });
  });

  it("wraps the end clock with modulo 1440", () => {
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "22:00", endLocal: "02:00" },
        "2026-10-05",
        23 * 60 + 30,
      ),
    ).toEqual({ startsOn: "2026-10-05", startLocal: "23:30", endLocal: "03:30" });
  });

  it("keeps a start near the end of the day on the destination date", () => {
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "09:00", endLocal: "10:30" },
        "2026-10-07",
        23 * 60 + 30,
      ),
    ).toEqual({ startsOn: "2026-10-07", startLocal: "23:30", endLocal: "01:00" });
  });

  it("quantizes to 30-minute starts and never emits 24:00", () => {
    expect(WEEK_LIFT_QUANTUM_MINUTES).toBe(30);
    expect(quantizeWeekLiftMinute(0)).toBe(0);
    expect(quantizeWeekLiftMinute(14)).toBe(0);
    expect(quantizeWeekLiftMinute(15)).toBe(30);
    expect(quantizeWeekLiftMinute(10 * 60 + 7)).toBe(10 * 60);
    expect(quantizeWeekLiftMinute(1439)).toBe(23 * 60 + 30);
    expect(quantizeWeekLiftMinute(1440)).toBe(23 * 60 + 30);
    expect(
      proposeTemporalPlacement(
        { startsOn: "2026-10-05", startLocal: "10:00", endLocal: "11:00" },
        "2026-10-05",
        13 * 60 + 7,
      ),
    ).toEqual({ startsOn: "2026-10-05", startLocal: "13:00", endLocal: "14:00" });
  });

  it("does not use selection snapping or a persistence writer", () => {
    const source = readFileSync("components/orient/temporalProposal.ts", "utf8");
    expect(source).not.toContain("snapMinute");
    expect(source).not.toContain("normalizeLocalRange");
    expect(source).not.toContain("SELECTION_INCREMENT");
    expect(source).not.toContain("supabase");
    expect(source).not.toContain("updateBlock");
  });
});
