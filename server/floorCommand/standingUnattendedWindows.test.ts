import { describe, expect, it } from "vitest";
import {
  classifyClosedStandingOpportunity,
  parseFrozenStandingWindows,
  selectOpenStandingWindows,
  type StandingFrozenWindow,
} from "@/server/floorCommand/standingUnattendedWindows";

const BOISE = "America/Boise";

function publication(week: string, opensAt: string, closesAt: string): StandingFrozenWindow {
  return {
    kind: "publication_opportunity",
    operationalWeek: week,
    opensAt,
    closesAt,
    timeZone: BOISE,
  };
}

describe("standing unattended window selection", () => {
  it("selects the open publication window after Sunday 12:00 UTC", () => {
    // 2026-03-08 Sunday 12:00 UTC open; Boise still MST (UTC-7) → local midnight Monday = 07:00 UTC
    const windows = [
      publication("2026-W11", "2026-03-08T12:00:00.000Z", "2026-03-09T07:00:00.000Z"),
    ];
    expect(selectOpenStandingWindows(windows, "2026-03-08T11:59:59.000Z")).toEqual([]);
    expect(selectOpenStandingWindows(windows, "2026-03-08T12:00:00.000Z")).toHaveLength(1);
    expect(selectOpenStandingWindows(windows, "2026-03-09T06:59:59.000Z")).toHaveLength(1);
    expect(selectOpenStandingWindows(windows, "2026-03-09T07:00:00.000Z")).toEqual([]);
  });

  it("handles America/Boise daylight saving close (MDT UTC-6)", () => {
    // After spring forward 2026-03-08: Monday local midnight is 06:00 UTC
    const windows = [
      publication("2026-W12", "2026-03-15T12:00:00.000Z", "2026-03-16T06:00:00.000Z"),
    ];
    expect(selectOpenStandingWindows(windows, "2026-03-15T12:00:00.000Z")).toHaveLength(1);
    expect(selectOpenStandingWindows(windows, "2026-03-16T05:59:59.000Z")).toHaveLength(1);
    expect(selectOpenStandingWindows(windows, "2026-03-16T06:00:00.000Z")).toEqual([]);
  });

  it("prefers publication over reconciliation when both open", () => {
    const windows: StandingFrozenWindow[] = [
      {
        kind: "reconciliation_opportunity",
        operationalWeek: "2026-W11",
        opensAt: "2026-03-09T07:00:00.000Z",
        closesAt: "2026-03-10T07:00:00.000Z",
        timeZone: BOISE,
      },
      publication("2026-W11", "2026-03-08T12:00:00.000Z", "2026-03-10T07:00:00.000Z"),
    ];
    const open = selectOpenStandingWindows(windows, "2026-03-09T08:00:00.000Z");
    expect(open).toHaveLength(1);
    expect(open[0]?.kind).toBe("publication_opportunity");
  });

  it("classifies before open and after last close", () => {
    const windows = [
      publication("2026-W11", "2026-03-08T12:00:00.000Z", "2026-03-09T07:00:00.000Z"),
      publication("2026-W12", "2026-03-15T12:00:00.000Z", "2026-03-16T06:00:00.000Z"),
    ];
    expect(classifyClosedStandingOpportunity(windows, "2026-03-01T00:00:00.000Z")).toBe(
      "not_yet_eligible",
    );
    expect(classifyClosedStandingOpportunity(windows, "2026-03-20T00:00:00.000Z")).toBe(
      "expired",
    );
  });

  it("parses frozen windows and skips malformed entries", () => {
    const parsed = parseFrozenStandingWindows([
      {
        kind: "publication_opportunity",
        operational_week: "2026-W11",
        opens_at: "2026-03-08T12:00:00.000Z",
        closes_at: "2026-03-09T07:00:00.000Z",
        time_zone: BOISE,
      },
      { kind: "publication_opportunity" },
      null,
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.operationalWeek).toBe("2026-W11");
  });

  it("treats duplicate wake times in the same window as the same open set", () => {
    const windows = [
      publication("2026-W11", "2026-03-08T12:00:00.000Z", "2026-03-09T07:00:00.000Z"),
    ];
    const a = selectOpenStandingWindows(windows, "2026-03-08T13:00:00.000Z");
    const b = selectOpenStandingWindows(windows, "2026-03-08T18:00:00.000Z");
    expect(a[0]?.operationalWeek).toBe(b[0]?.operationalWeek);
  });
});
