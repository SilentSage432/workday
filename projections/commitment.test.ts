import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { classifyCommitment, projectCommitments } from "@/projections/commitment";

const zone = "America/Boise";

function entry(
  id: string,
  input: Parameters<typeof defineCommitment>[0],
  createdAt = "2026-10-01T00:00:00.000Z",
): Commitment {
  return { ...defineCommitment(input), id, createdAt };
}

describe("commitment projection", () => {
  it("shows current and upcoming commitments in civil order and omits past commitments", () => {
    const past = entry("past", { kind: "all_day", startsOn: "2026-10-02", title: "Yesterday" });
    const today = entry("today", { kind: "all_day", startsOn: "2026-10-03", title: "School event" });
    const later = entry("later", {
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal: "15:00",
      endLocal: "16:00",
      title: "Dentist",
    });
    const rows = [later, past, today];
    const instant = new Date("2026-10-03T16:00:00.000Z");

    expect(classifyCommitment(today, instant, zone)).toBe("current");
    expect(classifyCommitment(past, instant, zone)).toBe("past");
    expect(classifyCommitment(later, instant, zone)).toBe("upcoming");
    expect(projectCommitments({ entries: rows, instant, timeZone: zone }).map((item) => item.id)).toEqual([
      "today",
      "later",
    ]);
    expect(rows.map((item) => item.id)).toEqual(["later", "past", "today"]);
  });

  it("uses the confirmed zone at the UTC date boundary", () => {
    const saturday = entry("saturday", {
      kind: "all_day",
      startsOn: "2026-10-03",
      title: "School event",
    });
    const instant = new Date("2026-10-03T05:30:00.000Z");

    expect(classifyCommitment(saturday, instant, zone)).toBe("upcoming");
    expect(classifyCommitment(saturday, instant, "UTC")).toBe("current");
  });

  it("includes a timed commitment from its start until its end", () => {
    const timed = entry("dentist", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "08:00",
      endLocal: "12:00",
      title: "Dentist",
    });

    expect(classifyCommitment(timed, new Date("2026-10-03T13:59:00.000Z"), zone)).toBe("upcoming");
    expect(classifyCommitment(timed, new Date("2026-10-03T14:00:00.000Z"), zone)).toBe("current");
    expect(classifyCommitment(timed, new Date("2026-10-03T18:00:00.000Z"), zone)).toBe("past");
  });

  it("keeps an overnight commitment current after midnight", () => {
    const overnight = entry("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "01:00",
      title: "Reservation",
    });
    const instant = new Date("2026-10-03T05:00:00.000Z");

    expect(classifyCommitment(overnight, instant, zone)).toBe("current");
  });

  it("keeps overlapping commitments as separate facts", () => {
    const first = entry("first", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "09:00",
      endLocal: "11:00",
      title: "Dentist",
    });
    const second = entry("second", {
      kind: "timed",
      startsOn: "2026-10-03",
      startLocal: "10:00",
      endLocal: "12:00",
      title: "School meeting",
    });
    const instant = new Date("2026-10-03T16:30:00.000Z");

    expect(projectCommitments({ entries: [second, first], instant, timeZone: zone }).map((item) => item.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("does not invent an instant for a local time that does not occur", () => {
    const gap = entry("gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      title: "Appointment",
    });
    const instant = new Date("2026-03-08T18:00:00.000Z");

    expect(() => instantFromZonedLocal("2026-03-08", "02:30", "America/Denver")).toThrow(/does not occur/);
    expect(classifyCommitment(gap, instant, "America/Denver")).toBe("unresolved");
    expect(projectCommitments({ entries: [gap], instant, timeZone: "America/Denver" })).toEqual([gap]);
  });

  it("omits a gap whose civil date can no longer contain an open interval", () => {
    const oldGap = entry("old-gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      title: "Appointment",
    });
    const instant = new Date("2026-03-10T18:00:00.000Z");

    expect(classifyCommitment(oldGap, instant, "America/Denver")).toBe("past");
    expect(projectCommitments({ entries: [oldGap], instant, timeZone: "America/Denver" })).toEqual([]);
  });

  it("leaves an ambiguous local time stored as that local time", () => {
    const ambiguous = entry("fold", {
      kind: "timed",
      startsOn: "2026-11-01",
      startLocal: "01:30",
      endLocal: "01:45",
      title: "Reservation",
    });

    expect(instantFromZonedLocal("2026-11-01", "01:30", "America/Denver")).toBeInstanceOf(Date);
    expect(ambiguous).toMatchObject({ kind: "timed", startLocal: "01:30" });
    expect(classifyCommitment(ambiguous, new Date("2026-11-01T12:00:00.000Z"), "America/Denver")).toBe(
      "past",
    );
  });

  it("does not calculate capacity, conflicts, or a clock", () => {
    const source = readFileSync(new URL("./commitment.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /Date\.now|new Date|capacity|availability|conflict|rankNow|supabase|protectedTime|block\.ts|tasks/,
    );
  });
});
