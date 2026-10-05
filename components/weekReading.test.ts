import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composeWeekShapeReading, type WeekEvidenceWindow } from "@/components/weekReading";
import type { SourceRead } from "@/components/currentTemporalReading";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import { projectTimeline, type CivilDateRange } from "@/projections/timeline";
import { weekLoadedSpan } from "@/projections/weekShape";

const zone = "America/Denver";
const range: CivilDateRange = { startsOn: "2026-10-05", endsBefore: "2026-10-08" };

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function failed<T>(message: string): SourceRead<T> {
  return { status: "failed", message };
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

function compose(
  overrides: Partial<Parameters<typeof composeWeekShapeReading>[0]> & { range?: CivilDateRange } = {},
) {
  const asked = overrides.range ?? range;
  return composeWeekShapeReading({
    timeZone: zone,
    work: ready([]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    ...overrides,
    range: asked,
    loaded: overrides.loaded ?? weekLoadedSpan(asked),
  });
}

function expectTimeline(input: {
  range?: CivilDateRange;
  timeZone?: string;
  work?: SourceRead<WorkScheduleEntry>;
  protectedTime?: SourceRead<ProtectedTime>;
  blocks?: SourceRead<Block>;
  commitments?: SourceRead<Commitment>;
  loaded?: WeekEvidenceWindow;
}) {
  const asked = input.range ?? range;
  const work = input.work ?? ready([]);
  const protectedRows = input.protectedTime ?? ready([]);
  const blocks = input.blocks ?? ready([]);
  const commitments = input.commitments ?? ready([]);
  const reading = compose({
    range: asked,
    timeZone: input.timeZone ?? zone,
    loaded: input.loaded,
    work,
    protectedTime: protectedRows,
    blocks,
    commitments,
  });
  expect(work.status).toBe("ready");
  expect(protectedRows.status).toBe("ready");
  expect(blocks.status).toBe("ready");
  expect(commitments.status).toBe("ready");
  if (work.status !== "ready" || protectedRows.status !== "ready" || blocks.status !== "ready" || commitments.status !== "ready") {
    throw new Error("expected ready evidence");
  }
  expect(reading).toEqual({
    status: "complete",
    range: asked,
    facts: projectTimeline({
      range: asked,
      timeZone: input.timeZone ?? zone,
      workSchedule: work.rows,
      protectedTime: protectedRows.rows,
      blocks: blocks.rows,
      commitments: commitments.rows,
    }),
  });
  return reading;
}

describe("week shape reading", () => {
  it("treats a complete range with no facts as nothing established", () => {
    const reading = compose();
    expect(reading).toEqual({ status: "complete", range, facts: [] });
    expect(reading).not.toHaveProperty("remainingMs");
  });

  it("reads a Work-only shape", () => {
    expectTimeline({
      work: ready([scheduledWorkDay({ workOn: "2026-10-06", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })]),
    });
  });

  it("reads a Protected-only shape", () => {
    expectTimeline({
      protectedTime: ready([protectedTime("protected", { kind: "all_day", startsOn: "2026-10-06", label: "Family" })]),
    });
  });

  it("reads a Commitment-only shape", () => {
    expectTimeline({
      commitments: ready([
        commitment("commitment", { kind: "timed", startsOn: "2026-10-06", startLocal: "09:00", endLocal: "10:00", title: "Standup" }),
      ]),
    });
  });

  it("reads a Block-only shape", () => {
    expectTimeline({
      blocks: ready([block("block", { kind: "timed", startsOn: "2026-10-06", startLocal: "14:00", endLocal: "15:00", purpose: "Write" })]),
    });
  });

  it("keeps all four source kinds in one reading", () => {
    const reading = expectTimeline({
      work: ready([scheduledWorkDay({ workOn: "2026-10-05", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })]),
      protectedTime: ready([protectedTime("protected", { kind: "timed", startsOn: "2026-10-06", startLocal: "12:00", endLocal: "13:00" })]),
      commitments: ready([
        commitment("commitment", { kind: "timed", startsOn: "2026-10-07", startLocal: "09:00", endLocal: "10:00", title: "Standup" }),
      ]),
      blocks: ready([block("block", { kind: "timed", startsOn: "2026-10-07", startLocal: "15:00", endLocal: "16:00", purpose: "Close" })]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete shape");
    expect(reading.facts.map((fact) => fact.sourceKind)).toEqual([
      "work_schedule",
      "protected_time",
      "commitment",
      "block",
    ]);
  });

  it("keeps overlapping truths separate", () => {
    const reading = expectTimeline({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-06" },
      work: ready([scheduledWorkDay({ workOn: "2026-10-05", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })]),
      protectedTime: ready([protectedTime("protected", { kind: "timed", startsOn: "2026-10-05", startLocal: "10:00", endLocal: "12:00" })]),
      commitments: ready([
        commitment("commitment", { kind: "timed", startsOn: "2026-10-05", startLocal: "11:00", endLocal: "13:00", title: "Standup" }),
      ]),
      blocks: ready([block("block", { kind: "timed", startsOn: "2026-10-05", startLocal: "12:00", endLocal: "14:00", purpose: "Write" })]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete shape");
    expect(reading.facts).toHaveLength(4);
    expect(new Set(reading.facts.map((fact) => fact.sourceKind)).size).toBe(4);
    expect(JSON.stringify(reading)).not.toContain("remainingMs");
    expect(JSON.stringify(reading)).not.toContain("spokenFor");
    expect(JSON.stringify(reading)).not.toContain("available");
  });

  it("keeps a Task-associated Block as one Block", () => {
    const reading = expectTimeline({
      blocks: ready([
        block("block", { kind: "timed", startsOn: "2026-10-06", startLocal: "14:00", endLocal: "15:00", purpose: "Write" }, "task-1"),
      ]),
    });
    if (reading.status !== "complete") throw new Error("expected a complete shape");
    expect(reading.facts).toEqual([
      expect.objectContaining({ sourceKind: "block", sourceId: "block", taskId: "task-1" }),
    ]);
  });

  it("accepts ready empty sources as complete evidence", () => {
    expect(compose()).toEqual({ status: "complete", range, facts: [] });
  });

  it("fails closed when Work failed", () => {
    const reading = compose({ work: failed("Work schedule failed.") });
    expect(reading).toEqual({
      status: "incomplete",
      message: "Week shape could not be completed. Work schedule failed.",
    });
  });

  it("fails closed when Protected Time failed", () => {
    const reading = compose({ protectedTime: failed("Protected Time failed.") });
    expect(reading.status).toBe("incomplete");
    if (reading.status !== "incomplete") throw new Error("expected incomplete");
    expect(reading.message).toContain("Protected Time failed.");
    expect(reading).not.toHaveProperty("facts");
  });

  it("fails closed when Commitments failed", () => {
    const reading = compose({ commitments: failed("Commitments failed.") });
    expect(reading.status).toBe("incomplete");
    if (reading.status !== "incomplete") throw new Error("expected incomplete");
    expect(reading.message).toContain("Commitments failed.");
  });

  it("fails closed when Blocks failed", () => {
    const reading = compose({ blocks: failed("Blocks failed.") });
    expect(reading.status).toBe("incomplete");
    if (reading.status !== "incomplete") throw new Error("expected incomplete");
    expect(reading.message).toContain("Blocks failed.");
  });

  it("fails closed when the loaded window misses the look-behind", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-04",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const asked = { startsOn: "2026-10-05", endsBefore: "2026-10-06" };
    const reading = compose({
      range: asked,
      loaded: { from: "2026-10-05", to: "2026-10-05" },
      work: ready([overnight]),
    });
    expect(reading).toEqual({
      status: "incomplete",
      message: "Week shape could not be completed. The read does not cover this range.",
    });
  });

  it("preserves the explicit range, including one that is not seven days and not Saturday-Friday", () => {
    const asked = { startsOn: "2026-10-05", endsBefore: "2026-10-08" };
    const reading = compose({
      range: asked,
      work: ready([
        scheduledWorkDay({ workOn: "2026-10-03", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" }),
        scheduledWorkDay({ workOn: "2026-10-05", startLocal: "09:00", endLocal: "15:00", shiftType: "opening" }),
      ]),
    });
    expect(reading).toMatchObject({ status: "complete", range: asked });
    if (reading.status !== "complete") throw new Error("expected a complete shape");
    expect(reading.facts.map((fact) => fact.sourceId)).toEqual(["2026-10-05"]);
  });

  it("does not turn Work Off into temporal structure", () => {
    const reading = compose({
      work: ready([offWorkDay("2026-10-05"), offWorkDay("2026-10-06"), offWorkDay("2026-10-07")]),
    });
    expect(reading).toEqual({ status: "complete", range, facts: [] });
  });

  it("does not turn a missing Work row into temporal structure", () => {
    const reading = compose({ work: ready([]) });
    expect(reading).toEqual({ status: "complete", range, facts: [] });
  });

  it("follows Timeline for an overnight Work shift when the look-behind was loaded", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-04",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const asked = { startsOn: "2026-10-05", endsBefore: "2026-10-06" };
    const reading = expectTimeline({ range: asked, work: ready([overnight]) });
    if (reading.status !== "complete") throw new Error("expected a complete shape");
    expect(reading.facts).toHaveLength(1);
    expect(reading.facts[0]).toMatchObject({
      sourceKind: "work_schedule",
      sourceId: "2026-10-04",
      endsNextCivilDate: true,
    });
  });

  it("follows Timeline across the spring-forward date", () => {
    const asked = { startsOn: "2026-03-08", endsBefore: "2026-03-09" };
    expectTimeline({
      range: asked,
      work: ready([scheduledWorkDay({ workOn: "2026-03-08", startLocal: "01:00", endLocal: "04:00", shiftType: "opening" })]),
    });
  });

  it("follows Timeline across the fall-back date", () => {
    const asked = { startsOn: "2026-11-01", endsBefore: "2026-11-02" };
    expectTimeline({
      range: asked,
      commitments: ready([
        commitment("fold", { kind: "timed", startsOn: "2026-11-01", startLocal: "01:30", endLocal: "01:45", title: "Reservation" }),
      ]),
    });
  });

  it("does not emit a Capacity metric or a synthetic empty fact", () => {
    const reading = compose();
    expect(reading).toEqual({ status: "complete", range, facts: [] });
    expect(Object.keys(reading).sort()).toEqual(["facts", "range", "status"]);
  });

  it("rejects an inverted range instead of normalizing it", () => {
    expect(() => compose({ range: { startsOn: "2026-10-08", endsBefore: "2026-10-05" } })).toThrow(
      "A timeline range must start before it ends.",
    );
  });

  it("does not calculate Capacity or select the Work fiscal week", () => {
    const source = readFileSync(new URL("./weekReading.ts", import.meta.url), "utf8");
    expect(source).toContain("projectWeekShape");
    expect(source).not.toContain("projectTimeline");
    expect(source).not.toContain("projectCapacity");
    expect(source).not.toContain("workFiscalWeekStart");
    expect(source).not.toContain("remainingMs");
  });
});
