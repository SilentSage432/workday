import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrentTime } from "@/components/CurrentTime";
import {
  composeCurrentTemporalReading,
  type SourceRead,
} from "@/components/currentTemporalReading";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function failed<T>(message: string): SourceRead<T> {
  return { status: "failed", message };
}

function block(id: string, input: Parameters<typeof defineBlock>[0]): Block {
  return { ...defineBlock(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function protectedTime(id: string, input: Parameters<typeof defineProtectedTime>[0]): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitment(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

const floor = block("floor", {
  kind: "timed",
  startsOn: "2026-10-03",
  startLocal: "10:00",
  endLocal: "11:00",
  contextId: null,
  purpose: "Flooring walk",
});

const school = protectedTime("school", {
  kind: "timed",
  startsOn: "2026-10-03",
  startLocal: "09:00",
  endLocal: "12:00",
  label: "School",
});

const reservation = commitment("reservation", {
  kind: "timed",
  startsOn: "2026-10-03",
  startLocal: "10:00",
  endLocal: "11:00",
  title: "Reservation",
});

function reading(input: {
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
}) {
  return composeCurrentTemporalReading({
    instant,
    timeZone: zone,
    work: input.work,
    protectedTime: input.protectedTime,
    blocks: input.blocks,
    commitments: input.commitments,
  });
}

const emptySources = {
  work: ready<WorkScheduleEntry>([]),
  protectedTime: ready<ProtectedTime>([]),
  blocks: ready<Block>([]),
  commitments: ready<Commitment>([]),
};

describe("current temporal reading completeness", () => {
  it("treats successful sources with no matching facts as an empty reading", () => {
    const result = reading(emptySources);
    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    const markup = renderToStaticMarkup(
      <CurrentTime zoneStatus="confirmed" facts={result.facts} notice={null} />,
    );
    expect(markup).toContain("Nothing established contains this time.");
  });

  it("keeps every overlapping fact when every source succeeded", () => {
    const result = reading({
      work: ready([opening]),
      protectedTime: ready([school]),
      blocks: ready([floor]),
      commitments: ready([reservation]),
    });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    const markup = renderToStaticMarkup(
      <CurrentTime zoneStatus="confirmed" facts={result.facts} notice={null} />,
    );
    expect(markup).toContain("Work");
    expect(markup).toContain("Protected");
    expect(markup).toContain("School");
    expect(markup).toContain("Block");
    expect(markup).toContain("Flooring walk");
    expect(markup).toContain("Commitment");
    expect(markup).toContain("Reservation");
    expect(markup).not.toContain("Nothing established contains this time.");
  });

  it("withholds the reading when Work fails and the other sources succeed", () => {
    const result = reading({
      ...emptySources,
      work: failed("Could not load today's Work schedule."),
      protectedTime: ready([school]),
      blocks: ready([floor]),
      commitments: ready([reservation]),
    });
    expect(result).toEqual({
      status: "incomplete",
      message: "This time could not be completed. Could not load today's Work schedule.",
    });
    const markup = renderToStaticMarkup(
      <CurrentTime zoneStatus="confirmed" facts={null} notice={result.status === "incomplete" ? result.message : null} />,
    );
    expect(markup).toContain("This time could not be completed.");
    expect(markup).not.toContain("Nothing established contains this time.");
    expect(markup).not.toContain("School");
    expect(markup).not.toContain("Flooring walk");
    expect(markup).not.toMatch(/\b(free|available|open|unscheduled|unallocated)\b/i);
  });

  it("withholds the reading when Protected Time fails and the other sources succeed", () => {
    const result = reading({
      ...emptySources,
      work: ready([opening]),
      protectedTime: failed("Could not load protected time."),
      blocks: ready([floor]),
      commitments: ready([reservation]),
    });
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete") return;
    expect(result.message).toContain("Could not load protected time.");
    expect(result).not.toHaveProperty("facts");
  });

  it("withholds the reading when Blocks fail and the other sources succeed", () => {
    const result = reading({
      ...emptySources,
      work: ready([opening]),
      protectedTime: ready([school]),
      blocks: failed("Could not load blocks."),
      commitments: ready([reservation]),
    });
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete") return;
    expect(result.message).toContain("Could not load blocks.");
    expect(result).not.toHaveProperty("facts");
  });

  it("withholds the reading when Commitments fail and the other sources succeed", () => {
    const result = reading({
      ...emptySources,
      work: ready([opening]),
      protectedTime: ready([school]),
      blocks: ready([floor]),
      commitments: failed("Could not load commitments."),
    });
    expect(result.status).toBe("incomplete");
    if (result.status !== "incomplete") return;
    expect(result.message).toContain("Could not load commitments.");
    expect(result).not.toHaveProperty("facts");
  });

  it("treats a successful empty source as different from a failed source", () => {
    const emptyProtected = reading({
      ...emptySources,
      work: ready([opening]),
      blocks: ready([floor]),
    });
    const failedProtected = reading({
      ...emptySources,
      work: ready([opening]),
      protectedTime: failed("Could not load protected time."),
      blocks: ready([floor]),
    });
    expect(emptyProtected.status).toBe("complete");
    expect(failedProtected.status).toBe("incomplete");
    if (emptyProtected.status !== "complete") return;
    expect(emptyProtected.facts.map((fact) => fact.sourceKind).sort()).toEqual(["block", "work_schedule"]);
  });

  it("leaves transport failure out of the projection", () => {
    const projection = readFileSync(
      new URL("../projections/currentTemporalOrientation.ts", import.meta.url),
      "utf8",
    );
    expect(projection).not.toContain("could not be completed");
    expect(projection).not.toContain("SourceRead");
  });
});
