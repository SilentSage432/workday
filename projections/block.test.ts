import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { classifyBlock, projectBlocks } from "@/projections/block";

const zone = "America/Boise";

function entry(
  id: string,
  input: Parameters<typeof defineBlock>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): Block {
  return { ...defineBlock(input), id, createdAt };
}

describe("block projection", () => {
  it("shows current and upcoming blocks in civil order and omits past blocks", () => {
    const past = entry("past", { kind: "all_day", startsOn: "2026-10-02", purpose: "Rest" });
    const today = entry("today", { kind: "all_day", startsOn: "2026-10-03", purpose: "TeamLab retreat" });
    const later = entry("later", {
      kind: "timed",
      startsOn: "2026-10-04",
      startLocal: "09:00",
      endLocal: "11:00",
      purpose: "Read",
    });
    const rows = [later, past, today];
    const instant = new Date("2026-10-03T16:00:00.000Z");

    expect(classifyBlock(today, instant, zone)).toBe("current");
    expect(classifyBlock(past, instant, zone)).toBe("past");
    expect(classifyBlock(later, instant, zone)).toBe("upcoming");
    expect(projectBlocks({ entries: rows, instant, timeZone: zone }).map((item) => item.id)).toEqual([
      "today",
      "later",
    ]);
    expect(rows.map((item) => item.id)).toEqual(["later", "past", "today"]);
  });

  it("uses the confirmed zone at the UTC date boundary", () => {
    const saturday = entry("saturday", {
      kind: "all_day",
      startsOn: "2026-10-03",
      purpose: "Family",
    });
    const instant = new Date("2026-10-03T05:30:00.000Z");

    expect(classifyBlock(saturday, instant, zone)).toBe("upcoming");
    expect(classifyBlock(saturday, instant, "UTC")).toBe("current");
  });

  it("includes a timed block from its start until its end", () => {
    const timed = entry("morning", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "12:00",
      purpose: "Budget review",
    });

    expect(classifyBlock(timed, new Date("2026-10-03T13:59:00.000Z"), zone)).toBe("upcoming");
    expect(classifyBlock(timed, new Date("2026-10-03T14:00:00.000Z"), zone)).toBe("current");
    expect(classifyBlock(timed, new Date("2026-10-03T18:00:00.000Z"), zone)).toBe("past");
  });

  it("keeps an overnight block current after midnight", () => {
    const overnight = entry("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "01:00",
      purpose: "Read",
    });
    const instant = new Date("2026-10-03T05:00:00.000Z");

    expect(classifyBlock(overnight, instant, zone)).toBe("current");
  });

  it("does not invent an instant for a local time that does not occur", () => {
    const gap = entry("gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      purpose: "Planning",
    });
    const instant = new Date("2026-03-08T18:00:00.000Z");

    expect(() => instantFromZonedLocal("2026-03-08", "02:30", "America/Denver")).toThrow(/does not occur/);
    expect(classifyBlock(gap, instant, "America/Denver")).toBe("unresolved");
    expect(projectBlocks({ entries: [gap], instant, timeZone: "America/Denver" })).toEqual([gap]);
  });

  it("leaves an ambiguous local time stored as that local time", () => {
    const ambiguous = entry("fold", {
      kind: "timed",
      startsOn: "2026-11-01",
      startLocal: "01:30",
      endLocal: "01:45",
      purpose: "Rest",
    });

    expect(instantFromZonedLocal("2026-11-01", "01:30", "America/Denver")).toBeInstanceOf(Date);
    expect(ambiguous).toMatchObject({ kind: "timed", startLocal: "01:30" });
    expect(classifyBlock(ambiguous, new Date("2026-11-01T12:00:00.000Z"), "America/Denver")).toBe("past");
  });

  it("does not calculate capacity or read a clock", () => {
    const source = readFileSync(new URL("./block.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Date\.now|new Date|capacity|conflict|rankNow|supabase|protectedTime/);
  });
});
