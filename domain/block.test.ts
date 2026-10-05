import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, timedBlockEndsNextCivilDate } from "@/domain/block";

describe("block", () => {
  it("requires a purpose and keeps an all-day civil date", () => {
    expect(
      defineBlock({
        kind: "all_day",
        startsOn: "2026-10-03",
        purpose: " TeamLab retreat ",
        contextId: "  ",
      }),
    ).toEqual({
      kind: "all_day",
      startsOn: "2026-10-03",
      purpose: "TeamLab retreat",
      contextId: null,
      taskId: null,
    });
    expect(() => defineBlock({ kind: "all_day", startsOn: "2026-10-03", purpose: "  " })).toThrow(
      /purpose/,
    );
  });

  it("keeps purpose distinct from an optional context", () => {
    expect(
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-03",
        startLocal: "09:07:00",
        endLocal: "11:00",
        purpose: "Work on Studio",
        contextId: "context-teamlab",
      }),
    ).toEqual({
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "09:07",
      endLocal: "11:00",
      purpose: "Work on Studio",
      contextId: "context-teamlab",
      taskId: null,
    });
  });

  it("treats an end at or before the start as the next civil date", () => {
    expect(timedBlockEndsNextCivilDate("22:00", "01:00")).toBe(true);
    expect(timedBlockEndsNextCivilDate("09:00", "11:00")).toBe(false);
  });

  it("keeps a task reference off the purpose and off the clock", () => {
    const taskId = "00000000-0000-4000-8000-000000000010";
    expect(
      defineBlock({
        kind: "all_day",
        startsOn: "2026-10-03",
        purpose: "Focus",
        taskId,
      }),
    ).toEqual({
      kind: "all_day",
      startsOn: "2026-10-03",
      purpose: "Focus",
      contextId: null,
      taskId,
    });
    expect(
      defineBlock({
        kind: "timed",
        startsOn: "2026-10-07",
        startLocal: "15:00",
        endLocal: "15:30",
        purpose: "Focus",
        taskId: "  ",
      }).taskId,
    ).toBeNull();

    const source = readFileSync(new URL("./block.ts", import.meta.url), "utf8");
    expect(source).toContain("taskId");
    expect(source).not.toMatch(/protected_time|planned_on|mustDo|duration|activeThread|recurrence|Date\.now|new Date/);
  });
});
