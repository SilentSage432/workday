import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";
import {
  capacityCoverage,
  projectCapacity,
  resolveWorkCapacityBoundary,
  type CapacityInterval,
} from "@/projections/capacity";

const zone = "America/Denver";
const day = "2026-10-07";
const next = "2026-10-08";

function at(civilDate: string, local: string, timeZone = zone): Date {
  return instantFromZonedLocal(civilDate, local, timeZone);
}

function span(start: Date, end: Date): CapacityInterval {
  return { start, end };
}

function shift(startLocal: string, endLocal: string, workOn = day) {
  return scheduledWorkDay({ workOn, startLocal, endLocal, shiftType: "mid" });
}

function block(id: string, input: Parameters<typeof defineBlock>[0], taskId: string | null = null): Block {
  return { ...defineBlock(input), id, taskId, createdAt: "2026-10-01T00:00:00.000Z" };
}

function protectedTime(id: string, input: Parameters<typeof defineProtectedTime>[0]): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitment(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function ordinaryBoundary(): CapacityInterval {
  const resolved = resolveWorkCapacityBoundary({
    civilDate: day,
    entries: [shift("08:00", "17:00")],
    timeZone: zone,
  });
  if (resolved.status !== "boundary") throw new Error("expected a boundary");
  return resolved.interval;
}

describe("capacity geometry", () => {
  const boundary = span(at(day, "08:00"), at(day, "17:00"));

  it("keeps the whole boundary when nothing is covered", () => {
    const reading = projectCapacity({ boundary, covered: [] });
    expect(reading.remaining).toEqual([boundary]);
    expect(reading.remainingMs).toBe(9 * 60 * 60 * 1000);
  });

  it("removes one utilized interval", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "12:00"), at(day, "13:00"))],
    });
    expect(reading.remaining).toEqual([
      span(at(day, "08:00"), at(day, "12:00")),
      span(at(day, "13:00"), at(day, "17:00")),
    ]);
  });

  it("merges overlapping coverage once", () => {
    const reading = projectCapacity({
      boundary,
      covered: [
        span(at(day, "12:30"), at(day, "13:30")),
        span(at(day, "12:00"), at(day, "13:00")),
      ],
    });
    expect(reading.remaining).toEqual([
      span(at(day, "08:00"), at(day, "12:00")),
      span(at(day, "13:30"), at(day, "17:00")),
    ]);
    expect(reading.remainingMs).toBe(7.5 * 60 * 60 * 1000);
  });

  it("merges endpoint-adjacent coverage", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "10:00"), at(day, "11:00")), span(at(day, "09:00"), at(day, "10:00"))],
    });
    expect(reading.remaining).toEqual([
      span(at(day, "08:00"), at(day, "09:00")),
      span(at(day, "11:00"), at(day, "17:00")),
    ]);
  });

  it("clips coverage that begins before the boundary", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "07:00"), at(day, "09:00"))],
    });
    expect(reading.remaining).toEqual([span(at(day, "09:00"), at(day, "17:00"))]);
  });

  it("clips coverage that ends after the boundary", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "16:00"), at(day, "18:00"))],
    });
    expect(reading.remaining).toEqual([span(at(day, "08:00"), at(day, "16:00"))]);
  });

  it("returns a valid zero when the boundary is fully covered", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "08:00"), at(day, "17:00"))],
    });
    expect(reading.remaining).toEqual([]);
    expect(reading.remainingMs).toBe(0);
  });

  it("orders remaining intervals by start", () => {
    const reading = projectCapacity({
      boundary,
      covered: [span(at(day, "14:00"), at(day, "15:00")), span(at(day, "09:00"), at(day, "10:00"))],
    });
    expect(reading.remaining.map((interval) => interval.start.getTime())).toEqual([
      at(day, "08:00").getTime(),
      at(day, "10:00").getTime(),
      at(day, "15:00").getTime(),
    ]);
  });

  it("refuses a boundary that is not positive", () => {
    expect(() =>
      projectCapacity({
        boundary: span(at(day, "17:00"), at(day, "08:00")),
        covered: [],
      }),
    ).toThrow(/positive interval/);
  });
});

describe("capacity fact coverage", () => {
  const boundary = ordinaryBoundary();

  it("covers Protected Time, a Commitment, and a Block together", () => {
    const coverage = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [protectedTime("protected", { kind: "timed", startsOn: day, startLocal: "12:00", endLocal: "13:00" })],
      commitments: [commitment("commitment", { kind: "timed", startsOn: day, startLocal: "09:00", endLocal: "10:00", title: "Standup" })],
      blocks: [block("block", { kind: "timed", startsOn: day, startLocal: "14:00", endLocal: "15:00", purpose: "Write" })],
    });
    expect(coverage.status).toBe("covered");
    if (coverage.status !== "covered") return;
    const reading = projectCapacity({ boundary, covered: coverage.intervals });
    expect(reading.remaining).toEqual([
      span(at(day, "08:00"), at(day, "09:00")),
      span(at(day, "10:00"), at(day, "12:00")),
      span(at(day, "13:00"), at(day, "14:00")),
      span(at(day, "15:00"), at(day, "17:00")),
    ]);
  });

  it("counts a Task-associated Block once and ignores the Task", () => {
    const ordinary = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [],
      commitments: [],
      blocks: [block("block", { kind: "timed", startsOn: day, startLocal: "14:00", endLocal: "15:00", purpose: "Write" }, null)],
    });
    const associated = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [],
      commitments: [],
      blocks: [
        block("block", { kind: "timed", startsOn: day, startLocal: "14:00", endLocal: "15:00", purpose: "Write" }, "task-1"),
      ],
    });
    expect(associated).toEqual(ordinary);
  });

  it("covers the portion of an all-day fact inside the boundary", () => {
    const coverage = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [protectedTime("protected", { kind: "all_day", startsOn: day })],
      commitments: [],
      blocks: [],
    });
    expect(coverage).toEqual({ status: "covered", intervals: [boundary] });
  });

  it("ignores a fact wholly outside the boundary", () => {
    const coverage = capacityCoverage({
      boundary,
      timeZone: zone,
      protectedTime: [],
      commitments: [],
      blocks: [block("block", { kind: "timed", startsOn: day, startLocal: "18:00", endLocal: "19:00", purpose: "Later" })],
    });
    expect(coverage).toEqual({ status: "covered", intervals: [] });
  });

  it("leaves an unmappable fact that may meet the boundary unresolved", () => {
    const spring = resolveWorkCapacityBoundary({
      civilDate: "2026-03-08",
      entries: [shift("00:00", "06:00", "2026-03-08")],
      timeZone: zone,
    });
    if (spring.status !== "boundary") throw new Error("expected a spring boundary");
    const coverage = capacityCoverage({
      boundary: spring.interval,
      timeZone: zone,
      protectedTime: [],
      commitments: [],
      blocks: [
        block("block", {
          kind: "timed",
          startsOn: "2026-03-08",
          startLocal: "02:30",
          endLocal: "03:30",
          purpose: "Missing hour",
        }),
      ],
    });
    expect(coverage).toEqual({ status: "unresolved" });
  });
});

describe("work capacity boundary", () => {
  it("resolves an ordinary scheduled shift", () => {
    const resolved = resolveWorkCapacityBoundary({
      civilDate: day,
      entries: [shift("08:00", "17:00")],
      timeZone: zone,
    });
    expect(resolved).toEqual({
      status: "boundary",
      interval: span(at(day, "08:00"), at(day, "17:00")),
      workOn: day,
      endsNextCivilDate: false,
    });
  });

  it("treats Off as no boundary", () => {
    expect(
      resolveWorkCapacityBoundary({ civilDate: day, entries: [offWorkDay(day)], timeZone: zone }),
    ).toEqual({ status: "none", reason: "off" });
  });

  it("treats a missing row for the questioned date as no boundary", () => {
    expect(
      resolveWorkCapacityBoundary({
        civilDate: day,
        entries: [shift("22:00", "06:00", "2026-10-06")],
        timeZone: zone,
      }),
    ).toEqual({ status: "none", reason: "missing" });
  });

  it("resolves an overnight shift from its own civil date", () => {
    const resolved = resolveWorkCapacityBoundary({
      civilDate: day,
      entries: [shift("22:00", "06:00")],
      timeZone: zone,
    });
    expect(resolved).toEqual({
      status: "boundary",
      interval: span(at(day, "22:00"), at(next, "06:00")),
      workOn: day,
      endsNextCivilDate: true,
    });
  });

  it("leaves an unmappable scheduled boundary unresolved", () => {
    expect(
      resolveWorkCapacityBoundary({
        civilDate: "2026-03-08",
        entries: [shift("02:30", "10:00", "2026-03-08")],
        timeZone: zone,
      }),
    ).toEqual({ status: "unresolved" });
  });

  it("uses elapsed instant length across the spring-forward gap", () => {
    const resolved = resolveWorkCapacityBoundary({
      civilDate: "2026-03-08",
      entries: [shift("01:00", "04:00", "2026-03-08")],
      timeZone: zone,
    });
    if (resolved.status !== "boundary") throw new Error("expected a boundary");
    const reading = projectCapacity({ boundary: resolved.interval, covered: [] });
    expect(reading.remainingMs).toBe(2 * 60 * 60 * 1000);
    expect(reading.remainingMs).toBeLessThan(3 * 60 * 60 * 1000);
  });

  it("keeps the longer elapsed length of a repeated local hour", () => {
    const resolved = resolveWorkCapacityBoundary({
      civilDate: "2026-11-01",
      entries: [shift("01:00", "03:00", "2026-11-01")],
      timeZone: zone,
    });
    if (resolved.status !== "boundary") throw new Error("expected a boundary");
    const reading = projectCapacity({ boundary: resolved.interval, covered: [] });
    expect(reading.remainingMs).toBe(resolved.interval.end.getTime() - resolved.interval.start.getTime());
    expect(reading.remainingMs).toBe(3 * 60 * 60 * 1000);
  });
});

describe("capacity projection source", () => {
  it("does not know SourceRead, Timeline, or orientation", () => {
    const source = readFileSync(new URL("./capacity.ts", import.meta.url), "utf8");
    expect(source).not.toContain("SourceRead");
    expect(source).not.toContain("projectTimeline");
    expect(source).not.toContain("projectCurrentTemporalOrientation");
    expect(source).not.toContain("projectPresentMomentOrientation");
    expect(source).not.toContain("projectWorkOrientation");
  });
});
