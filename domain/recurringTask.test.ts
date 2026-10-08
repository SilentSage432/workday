import { describe, expect, it } from "vitest";
import {
  civilDateForRecurringWeekday,
  currentRecurringTaskCycleKey,
  isRecurringTaskWeekday,
  recurringTaskWeekEligible,
  recurringTaskWeekdayLabel,
  recurringTaskWeekdayOffset,
  requireRecurringTaskCycleKey,
  requireRecurringTaskWeekday,
} from "@/domain/recurringTask";
import { civilDateInTimeZone, formatCivilDate } from "@/domain/time/workFiscalWeek";

const ZONE = "America/Denver";
const CYCLE = "2026-10-10";
const WEEK_END = "2026-10-17";

function eligible(input: {
  establishedAt: string;
  civilNow: string;
  cycleKey?: string;
  retiredAt?: string | null;
  availableWeekday?: "sat" | "sun";
  timeZone?: string;
}): boolean {
  return recurringTaskWeekEligible({
    definition: {
      availableWeekday: input.availableWeekday ?? "sat",
      dueWeekday: "wed",
      establishedAt: input.establishedAt,
      retiredAt: input.retiredAt ?? null,
    },
    cycleKey: input.cycleKey ?? CYCLE,
    civilNow: input.civilNow,
    timeZone: input.timeZone ?? ZONE,
  });
}

describe("recurring Task domain", () => {
  it("maps closed weekday union to Saturday offsets and human labels", () => {
    expect(recurringTaskWeekdayOffset("sat")).toBe(0);
    expect(recurringTaskWeekdayOffset("sun")).toBe(1);
    expect(recurringTaskWeekdayOffset("wed")).toBe(4);
    expect(recurringTaskWeekdayLabel("sat")).toBe("Saturday");
    expect(recurringTaskWeekdayLabel("wed")).toBe("Wednesday");
    expect(isRecurringTaskWeekday("fri")).toBe(true);
    expect(isRecurringTaskWeekday("saturday")).toBe(false);
    expect(() => requireRecurringTaskWeekday("monday")).toThrow(/weekday/);
  });

  it("derives Bay Audit Saturday→Wednesday and Cycle Count Sunday→Wednesday in one fiscal week", () => {
    expect(requireRecurringTaskCycleKey(CYCLE)).toBe(CYCLE);
    expect(civilDateForRecurringWeekday(CYCLE, "sat")).toBe("2026-10-10");
    expect(civilDateForRecurringWeekday(CYCLE, "sun")).toBe("2026-10-11");
    expect(civilDateForRecurringWeekday(CYCLE, "wed")).toBe("2026-10-14");
    expect(() => requireRecurringTaskCycleKey("2026-10-11")).toThrow(/Saturday/);
  });

  it("reuses Lowe's fiscal week for current cycle key", () => {
    expect(currentRecurringTaskCycleKey(new Date("2026-10-14T18:00:00.000Z"), ZONE)).toBe(CYCLE);
    expect(currentRecurringTaskCycleKey(new Date("2026-10-10T18:00:00.000Z"), ZONE)).toBe(CYCLE);
  });

  it("blocks materialization before availability and after retirement", () => {
    const establishedAt = "2026-10-06T15:00:00.000Z";
    expect(eligible({ establishedAt, civilNow: "2026-10-09" })).toBe(false);
    expect(eligible({ establishedAt, civilNow: "2026-10-10" })).toBe(true);
    expect(eligible({ establishedAt, civilNow: "2026-10-13" })).toBe(true);
    expect(eligible({ establishedAt, civilNow: "2026-10-15" })).toBe(true);
    expect(
      eligible({
        establishedAt,
        civilNow: "2026-10-13",
        retiredAt: "2026-10-12T12:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("uses Orient civil establishment cutoff, not UTC midnight of next Saturday", () => {
    // Friday 2026-10-16 17:00 Denver (MDT) = 2026-10-16T23:00:00.000Z — UTC still Friday
    expect(
      formatCivilDate(civilDateInTimeZone(new Date("2026-10-16T23:00:00.000Z"), ZONE)),
    ).toBe("2026-10-16");
    expect(
      eligible({
        establishedAt: "2026-10-16T23:00:00.000Z",
        civilNow: "2026-10-16",
      }),
    ).toBe(true);

    // Friday 2026-10-16 23:30 Denver = 2026-10-17T05:30:00.000Z — UTC already Saturday
    expect(
      formatCivilDate(civilDateInTimeZone(new Date("2026-10-17T05:30:00.000Z"), ZONE)),
    ).toBe("2026-10-16");
    expect(
      eligible({
        establishedAt: "2026-10-17T05:30:00.000Z",
        civilNow: "2026-10-16",
      }),
    ).toBe(true);

    // Saturday 2026-10-17 00:30 Denver = 2026-10-17T06:30:00.000Z — new fiscal week
    expect(
      formatCivilDate(civilDateInTimeZone(new Date("2026-10-17T06:30:00.000Z"), ZONE)),
    ).toBe(WEEK_END);
    expect(
      eligible({
        establishedAt: "2026-10-17T06:30:00.000Z",
        civilNow: WEEK_END,
        cycleKey: CYCLE,
      }),
    ).toBe(false);
    expect(
      eligible({
        establishedAt: "2026-10-17T06:30:00.000Z",
        civilNow: WEEK_END,
        cycleKey: WEEK_END,
        availableWeekday: "sat",
      }),
    ).toBe(true);

    // Saturday daytime Denver
    expect(
      eligible({
        establishedAt: "2026-10-17T21:00:00.000Z",
        civilNow: WEEK_END,
        cycleKey: WEEK_END,
      }),
    ).toBe(true);
  });

  it("preserves the same civil law under MST (UTC-7) Friday evening", () => {
    // 2026-01-16 is Friday; Denver is MST. Fri 23:30 local = 2026-01-17T06:30:00.000Z
    const mstFriEvening = "2026-01-17T06:30:00.000Z";
    expect(formatCivilDate(civilDateInTimeZone(new Date(mstFriEvening), ZONE))).toBe("2026-01-16");
    expect(currentRecurringTaskCycleKey(new Date(mstFriEvening), ZONE)).toBe("2026-01-10");
    expect(
      eligible({
        establishedAt: mstFriEvening,
        civilNow: "2026-01-16",
        cycleKey: "2026-01-10",
      }),
    ).toBe(true);
    // Prior UTC-midnight law would have rejected (06:30Z >= 2026-01-17T00:00:00.000Z).
    expect(new Date(mstFriEvening).getTime() >= new Date("2026-01-17T00:00:00.000Z").getTime()).toBe(
      true,
    );
  });

  it("keeps availability and due as civil dates inside the fiscal week", () => {
    expect(civilDateForRecurringWeekday(CYCLE, "sat")).toBe("2026-10-10");
    expect(civilDateForRecurringWeekday(CYCLE, "wed")).toBe("2026-10-14");
    expect(civilDateForRecurringWeekday(CYCLE, "sun")).toBe("2026-10-11");
    expect(
      eligible({
        establishedAt: "2026-10-06T15:00:00.000Z",
        civilNow: "2026-10-10",
        availableWeekday: "sat",
      }),
    ).toBe(true);
    expect(
      eligible({
        establishedAt: "2026-10-06T15:00:00.000Z",
        civilNow: "2026-10-11",
        availableWeekday: "sun",
      }),
    ).toBe(true);
    expect(
      eligible({
        establishedAt: "2026-10-06T15:00:00.000Z",
        civilNow: "2026-10-10",
        availableWeekday: "sun",
      }),
    ).toBe(false);
  });
});
