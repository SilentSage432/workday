import { describe, expect, it } from "vitest";
import { composeWorkCapacityReading } from "@/components/capacityReading";
import type { SourceRead } from "@/components/currentTemporalReading";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";

const zone = "America/Denver";
const day = "2026-10-07";
const next = "2026-10-08";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function failed<T>(message: string): SourceRead<T> {
  return { status: "failed", message };
}

function at(civilDate: string, local: string): Date {
  return instantFromZonedLocal(civilDate, local, zone);
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

function compose(overrides: Partial<Parameters<typeof composeWorkCapacityReading>[0]> = {}) {
  return composeWorkCapacityReading({
    civilDate: day,
    timeZone: zone,
    loaded: { from: day, to: day },
    work: ready([shift("08:00", "17:00")]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    ...overrides,
  });
}

describe("work capacity reading", () => {
  it("reads the whole shift when the utilizing collections are ready and empty", () => {
    expect(compose()).toEqual({
      status: "reading",
      remaining: [{ start: at(day, "08:00"), end: at(day, "17:00") }],
      remainingMs: 9 * 60 * 60 * 1000,
    });
  });

  it("removes a Commitment", () => {
    const reading = compose({
      commitments: ready([
        commitment("commitment", { kind: "timed", startsOn: day, startLocal: "09:00", endLocal: "10:00", title: "Standup" }),
      ]),
    });
    expect(reading).toMatchObject({
      status: "reading",
      remaining: [
        { start: at(day, "08:00"), end: at(day, "09:00") },
        { start: at(day, "10:00"), end: at(day, "17:00") },
      ],
    });
  });

  it("removes Protected Time", () => {
    const reading = compose({
      protectedTime: ready([
        protectedTime("protected", { kind: "timed", startsOn: day, startLocal: "12:00", endLocal: "13:00" }),
      ]),
    });
    expect(reading).toMatchObject({
      status: "reading",
      remaining: [
        { start: at(day, "08:00"), end: at(day, "12:00") },
        { start: at(day, "13:00"), end: at(day, "17:00") },
      ],
    });
  });

  it("merges overlapping Protected Time and a Block once", () => {
    const reading = compose({
      protectedTime: ready([
        protectedTime("protected", { kind: "timed", startsOn: day, startLocal: "12:00", endLocal: "13:00" }),
      ]),
      blocks: ready([
        block("block", { kind: "timed", startsOn: day, startLocal: "12:30", endLocal: "13:30", purpose: "Write" }, "task-1"),
      ]),
    });
    expect(reading).toMatchObject({
      status: "reading",
      remaining: [
        { start: at(day, "08:00"), end: at(day, "12:00") },
        { start: at(day, "13:30"), end: at(day, "17:00") },
      ],
      remainingMs: 7.5 * 60 * 60 * 1000,
    });
  });

  it("clips a Block that starts before the shift", () => {
    const reading = compose({
      blocks: ready([block("block", { kind: "timed", startsOn: day, startLocal: "07:00", endLocal: "09:00", purpose: "Early" })]),
    });
    expect(reading).toMatchObject({
      status: "reading",
      remaining: [{ start: at(day, "09:00"), end: at(day, "17:00") }],
    });
  });

  it("clips a Block that ends after the shift", () => {
    const reading = compose({
      blocks: ready([block("block", { kind: "timed", startsOn: day, startLocal: "16:00", endLocal: "18:00", purpose: "Late" })]),
    });
    expect(reading).toMatchObject({
      status: "reading",
      remaining: [{ start: at(day, "08:00"), end: at(day, "16:00") }],
    });
  });

  it("returns known zero when coverage fills the boundary", () => {
    expect(
      compose({
        blocks: ready([block("block", { kind: "timed", startsOn: day, startLocal: "08:00", endLocal: "17:00", purpose: "All" })]),
      }),
    ).toEqual({ status: "reading", remaining: [], remainingMs: 0 });
  });

  it("returns none for Off and for a missing schedule", () => {
    expect(compose({ work: ready([offWorkDay(day)]) })).toEqual({ status: "none", reason: "off" });
    expect(compose({ work: ready([]) })).toEqual({ status: "none", reason: "missing" });
  });

  it("returns incomplete when a required read fails", () => {
    expect(compose({ work: failed("Work failed.") })).toEqual({
      status: "incomplete",
      message: "Work Capacity could not be completed. Work failed.",
    });
    expect(compose({ protectedTime: failed("Protected failed.") })).toMatchObject({ status: "incomplete" });
    expect(compose({ commitments: failed("Commitments failed.") })).toMatchObject({ status: "incomplete" });
    expect(compose({ blocks: failed("Blocks failed.") })).toEqual({
      status: "incomplete",
      message: "Work Capacity could not be completed. Blocks failed.",
    });
  });

  it("returns incomplete when the questioned date is outside the loaded window", () => {
    expect(compose({ civilDate: next, loaded: { from: day, to: day } })).toEqual({
      status: "incomplete",
      message: "Work Capacity could not be completed. The read does not cover this date.",
    });
  });

  it("returns incomplete when the loaded window misses an overnight civil date", () => {
    expect(
      compose({
        loaded: { from: day, to: day },
        work: ready([shift("22:00", "06:00")]),
      }),
    ).toEqual({
      status: "incomplete",
      message: "Work Capacity could not be completed. The read does not cover the whole boundary.",
    });
  });

  it("reads an overnight boundary from both civil dates", () => {
    const reading = compose({
      loaded: { from: day, to: next },
      work: ready([shift("22:00", "06:00")]),
      blocks: ready([
        block("block", { kind: "timed", startsOn: day, startLocal: "23:00", endLocal: "01:00", purpose: "Night" }),
      ]),
      protectedTime: ready([
        protectedTime("protected", { kind: "timed", startsOn: next, startLocal: "05:00", endLocal: "07:00" }),
      ]),
    });
    expect(reading).toEqual({
      status: "reading",
      remaining: [
        { start: at(day, "22:00"), end: at(day, "23:00") },
        { start: at(next, "01:00"), end: at(next, "05:00") },
      ],
      remainingMs: 5 * 60 * 60 * 1000,
    });
  });

  it("covers only the overnight portion of an all-day fact on the second civil date", () => {
    const reading = compose({
      loaded: { from: day, to: next },
      work: ready([shift("22:00", "06:00")]),
      protectedTime: ready([protectedTime("protected", { kind: "all_day", startsOn: next })]),
    });
    expect(reading).toEqual({
      status: "reading",
      remaining: [{ start: at(day, "22:00"), end: at(next, "00:00") }],
      remainingMs: 2 * 60 * 60 * 1000,
    });
  });

  it("returns unresolved when a fact inside the boundary cannot be placed", () => {
    expect(
      compose({
        civilDate: "2026-03-08",
        loaded: { from: "2026-03-08", to: "2026-03-08" },
        work: ready([shift("00:00", "06:00", "2026-03-08")]),
        blocks: ready([
          block("block", {
            kind: "timed",
            startsOn: "2026-03-08",
            startLocal: "02:30",
            endLocal: "03:30",
            purpose: "Missing hour",
          }),
        ]),
      }),
    ).toEqual({ status: "unresolved" });
  });

  it("does not ask the previous overnight row when the questioned date is missing", () => {
    expect(
      compose({
        work: ready([shift("22:00", "06:00", "2026-10-06")]),
      }),
    ).toEqual({ status: "none", reason: "missing" });
  });
});
