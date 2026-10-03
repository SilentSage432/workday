import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { classifyProtectedTime, projectProtectedTime } from "@/projections/protectedTime";

const zone = "America/Boise";

function entry(
  id: string,
  input: Parameters<typeof defineProtectedTime>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt };
}

describe("protected time projection", () => {
  it("shows current and upcoming rows in civil order and omits past rows", () => {
    const past = entry("past", { kind: "all_day", startsOn: "2026-10-02", label: null });
    const today = entry("today", { kind: "all_day", startsOn: "2026-10-03", label: "Time off" });
    const later = entry("later", {
      kind: "timed",
      startsOn: "2026-10-04",
      startLocal: "08:00",
      endLocal: "12:00",
      label: null,
    });
    const rows = [later, past, today];
    const instant = new Date("2026-10-03T16:00:00.000Z");

    expect(classifyProtectedTime(today, instant, zone)).toBe("current");
    expect(classifyProtectedTime(past, instant, zone)).toBe("past");
    expect(classifyProtectedTime(later, instant, zone)).toBe("upcoming");
    expect(projectProtectedTime({ entries: rows, instant, timeZone: zone }).map((item) => item.id)).toEqual([
      "today",
      "later",
    ]);
    expect(rows.map((item) => item.id)).toEqual(["later", "past", "today"]);
  });

  it("uses the confirmed zone at the UTC date boundary", () => {
    const saturday = entry("saturday", { kind: "all_day", startsOn: "2026-10-03", label: null });
    const instant = new Date("2026-10-03T05:30:00.000Z");

    expect(classifyProtectedTime(saturday, instant, zone)).toBe("upcoming");
    expect(classifyProtectedTime(saturday, instant, "UTC")).toBe("current");
  });

  it("includes a timed interval from its start until its end", () => {
    const timed = entry("morning", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "12:00",
      label: null,
    });

    expect(classifyProtectedTime(timed, new Date("2026-10-03T13:59:00.000Z"), zone)).toBe("upcoming");
    expect(classifyProtectedTime(timed, new Date("2026-10-03T14:00:00.000Z"), zone)).toBe("current");
    expect(classifyProtectedTime(timed, new Date("2026-10-03T18:00:00.000Z"), zone)).toBe("past");
  });

  it("keeps an overnight interval current after midnight", () => {
    const overnight = entry("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "02:00",
      label: null,
    });
    const instant = new Date("2026-10-03T05:00:00.000Z");

    expect(classifyProtectedTime(overnight, instant, zone)).toBe("current");
    expect(projectProtectedTime({ entries: [overnight], instant, timeZone: zone })).toEqual([overnight]);
  });

  it("does not invent an instant for a local time that does not occur", () => {
    const gap = entry("gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      label: null,
    });
    const instant = new Date("2026-03-08T18:00:00.000Z");

    expect(() => instantFromZonedLocal("2026-03-08", "02:30", "America/Denver")).toThrow(/does not occur/);
    expect(classifyProtectedTime(gap, instant, "America/Denver")).toBe("unresolved");
    expect(projectProtectedTime({ entries: [gap], instant, timeZone: "America/Denver" })).toEqual([gap]);
  });

  it("leaves an ambiguous local time stored as that local time", () => {
    const ambiguous = entry("fold", {
      kind: "timed",
      startsOn: "2026-11-01",
      startLocal: "01:30",
      endLocal: "01:45",
      label: null,
    });

    expect(instantFromZonedLocal("2026-11-01", "01:30", "America/Denver")).toBeInstanceOf(Date);
    expect(ambiguous).toMatchObject({ kind: "timed", startLocal: "01:30" });
    expect(classifyProtectedTime(ambiguous, new Date("2026-11-01T12:00:00.000Z"), "America/Denver")).toBe(
      "past",
    );
  });

  it("does not calculate capacity or read a clock", () => {
    const source = readFileSync(new URL("./protectedTime.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Date\.now|new Date|capacity|free time|rankNow|supabase/);
  });
});
