import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import { projectTimeline, type CivilDateRange, type TimelineFact } from "@/projections/timeline";
import { canonicalWeekRange, projectWeekShape, weekLoadedSpan } from "@/projections/weekShape";

const zone = "America/Denver";

function blockRow(id: string, input: Parameters<typeof defineBlock>[0], taskId: string | null = null): Block {
  return { ...defineBlock(input), id, taskId, createdAt: "2026-10-01T00:00:00.000Z" };
}

function protectedRow(id: string, input: Parameters<typeof defineProtectedTime>[0]): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitmentRow(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function shape(input: {
  range: CivilDateRange;
  timeZone?: string;
  workSchedule?: readonly WorkScheduleEntry[];
  protectedTime?: readonly ProtectedTime[];
  blocks?: readonly Block[];
  commitments?: readonly Commitment[];
}) {
  return projectWeekShape({
    range: input.range,
    timeZone: input.timeZone ?? zone,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
  });
}

function timelineFacts(input: Parameters<typeof shape>[0]): TimelineFact[] {
  return projectTimeline({
    range: canonicalWeekRange(input.range),
    timeZone: input.timeZone ?? zone,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
  });
}

describe("week shape", () => {
  it("returns Timeline's facts for the explicit range and does not choose a week", () => {
    const range = { startsOn: "2026-10-05", endsBefore: "2026-10-08" };
    const workSchedule = [
      scheduledWorkDay({ workOn: "2026-10-03", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" }),
      scheduledWorkDay({ workOn: "2026-10-05", startLocal: "09:00", endLocal: "15:00", shiftType: "opening" }),
    ];
    const reading = shape({ range, workSchedule });
    expect(reading.range).toEqual(range);
    expect(reading.facts).toEqual(timelineFacts({ range, workSchedule }));
    expect(reading.facts.map((fact) => fact.sourceId)).toEqual(["2026-10-05"]);
    expect(weekLoadedSpan(range)).toEqual({ from: "2026-10-04", to: "2026-10-07" });
  });

  it("keeps an empty composition empty", () => {
    const reading = shape({ range: { startsOn: "2026-10-05", endsBefore: "2026-10-07" } });
    expect(reading).toEqual({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-07" },
      facts: [],
    });
  });

  it("keeps overlapping truths as separate Timeline facts", () => {
    const input = {
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-06" },
      workSchedule: [scheduledWorkDay({ workOn: "2026-10-05", startLocal: "08:00", endLocal: "17:00", shiftType: "mid" })],
      protectedTime: [protectedRow("protected", { kind: "timed", startsOn: "2026-10-05", startLocal: "10:00", endLocal: "11:00" })],
      blocks: [blockRow("block", { kind: "timed", startsOn: "2026-10-05", startLocal: "10:00", endLocal: "11:00", purpose: "Write" }, "task-1")],
      commitments: [commitmentRow("commitment", { kind: "timed", startsOn: "2026-10-05", startLocal: "10:00", endLocal: "11:00", title: "Standup" })],
    };
    const reading = shape(input);
    expect(reading.facts).toEqual(timelineFacts(input));
    expect(reading.facts.map((fact) => fact.sourceKind)).toEqual([
      "work_schedule",
      "protected_time",
      "block",
      "commitment",
    ]);
    const block = reading.facts.find((fact) => fact.sourceKind === "block");
    expect(block).toMatchObject({ sourceId: "block", taskId: "task-1" });
    expect(reading.facts.filter((fact) => fact.sourceKind === "block")).toHaveLength(1);
  });

  it("follows Timeline through a spring-forward civil date", () => {
    const input = {
      range: { startsOn: "2026-03-08", endsBefore: "2026-03-09" },
      workSchedule: [scheduledWorkDay({ workOn: "2026-03-08", startLocal: "01:00", endLocal: "04:00", shiftType: "opening" })],
    };
    const reading = shape(input);
    expect(reading.facts).toEqual(timelineFacts(input));
    const fact = reading.facts[0];
    if (!fact || fact.allDay || fact.bounds.status !== "resolved") throw new Error("expected a resolved shift");
    expect(fact.bounds.end.getTime() - fact.bounds.start.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it("follows Timeline through a fall-back civil date", () => {
    const input = {
      range: { startsOn: "2026-11-01", endsBefore: "2026-11-02" },
      commitments: [
        commitmentRow("fold", {
          kind: "timed",
          startsOn: "2026-11-01",
          startLocal: "01:00",
          endLocal: "03:00",
          title: "Reservation",
        }),
      ],
    };
    const reading = shape(input);
    expect(reading.facts).toEqual(timelineFacts(input));
    const fact = reading.facts[0];
    if (!fact || fact.allDay || fact.bounds.status !== "resolved") throw new Error("expected a resolved commitment");
    expect(fact.bounds.start).toEqual(instantFromZonedLocal("2026-11-01", "01:00", zone));
    expect(fact.bounds.end.getTime() - fact.bounds.start.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it("passes an unplaceable local time through as Timeline left it", () => {
    const input = {
      range: { startsOn: "2026-03-08", endsBefore: "2026-03-09" },
      protectedTime: [
        protectedRow("gap", { kind: "timed", startsOn: "2026-03-08", startLocal: "02:30", endLocal: "03:30", label: "Gap" }),
      ],
    };
    const reading = shape(input);
    expect(reading.facts).toEqual(timelineFacts(input));
    expect(reading.facts[0]).toMatchObject({
      bounds: { status: "unresolved" },
      intersection: { status: "unresolved" },
    });
  });

  it("does not turn Work Off into a fact", () => {
    const reading = shape({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-06" },
      workSchedule: [offWorkDay("2026-10-05")],
    });
    expect(reading.facts).toEqual([]);
  });

  it("rejects an inverted range instead of choosing another one", () => {
    expect(() => shape({ range: { startsOn: "2026-10-08", endsBefore: "2026-10-05" } })).toThrow(
      "A timeline range must start before it ends.",
    );
  });

  it("does not know SourceRead, Capacity, or the Work fiscal week", () => {
    const source = readFileSync(new URL("./weekShape.ts", import.meta.url), "utf8");
    expect(source).toContain("projectTimeline");
    expect(source).not.toContain("SourceRead");
    expect(source).not.toContain("projectCapacity");
    expect(source).not.toContain("workFiscalWeekStart");
    expect(source).not.toContain("remainingMs");
    expect(source).not.toContain("projectCurrentTemporalOrientation");
    expect(source).not.toContain("projectPresentMomentOrientation");
  });
});
