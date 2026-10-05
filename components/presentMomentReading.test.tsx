import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composePresentMomentOrientation } from "@/components/presentMomentReading";
import type { SourceRead } from "@/components/currentTemporalReading";
import { activeThreadFromEstablishment, type ActiveThread } from "@/domain/activeThread";
import { defineBlock, type Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import { scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function failed<T>(message: string): SourceRead<T> {
  return { status: "failed", message };
}

const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

const floor: Block = {
  ...defineBlock({
    kind: "timed",
    startsOn: "2026-10-03",
    startLocal: "09:00",
    endLocal: "12:00",
    purpose: "Flooring walk",
  }),
  id: "floor",
  createdAt: "2026-10-01T00:00:00.000Z",
};

const open: Task = {
  id: "task-1",
  title: "Cycle counts",
  contextId: null,
  createdAt: "2026-10-02T15:00:00.000Z",
  completedAt: null,
  dueOn: null,
  plannedOn: null,
  mustDo: false,
  origin: "user_created",
  originatingNoteId: null,
};

const thread = activeThreadFromEstablishment(open.id, "2026-10-03T15:00:00.000Z");

function reading(input: {
  work?: SourceRead<WorkScheduleEntry>;
  protectedTime?: SourceRead<ProtectedTime>;
  blocks?: SourceRead<Block>;
  commitments?: SourceRead<Commitment>;
  activeThread?: SourceRead<ActiveThread>;
  openTasks?: SourceRead<Task>;
}) {
  return composePresentMomentOrientation({
    instant,
    timeZone: zone,
    work: input.work ?? ready([opening]),
    protectedTime: input.protectedTime ?? ready([]),
    blocks: input.blocks ?? ready([floor]),
    commitments: input.commitments ?? ready([]),
    activeThread: input.activeThread ?? ready([thread]),
    openTasks: input.openTasks ?? ready([open]),
  });
}

describe("present-moment completeness", () => {
  it("does not turn a failed temporal source into an empty orientation", () => {
    const result = reading({ blocks: failed("Could not load blocks.") });

    expect(result.status).toBe("incomplete");
    expect(result).not.toHaveProperty("orientation");
    expect(result).not.toHaveProperty("thread");
    if (result.status === "incomplete") {
      expect(result.message).toContain("Could not load blocks.");
      expect(result.message).not.toMatch(/nothing established|no thread|free|available/i);
    }
  });

  it("does not turn a failed Active Thread read into no thread", () => {
    const result = reading({ activeThread: failed("Could not load the active thread.") });

    expect(result.status).toBe("incomplete");
    expect(result).not.toHaveProperty("thread");
    expect(result).not.toHaveProperty("orientation");
    if (result.status === "incomplete") {
      expect(result.message).toContain("Could not load the active thread.");
    }
  });

  it("does not turn an incomplete open-task read into no thread", () => {
    const result = reading({ openTasks: failed("Could not load tasks.") });

    expect(result.status).toBe("incomplete");
    expect(result).not.toHaveProperty("thread");
    if (result.status === "incomplete") {
      expect(result.message).toContain("Could not load tasks.");
      expect(result.message).not.toMatch(/no thread/i);
    }
  });

  it("keeps a successful empty thread distinct from a failed thread read", () => {
    const absent = reading({ activeThread: ready([]) });
    const failedThread = reading({ activeThread: failed("Could not load the active thread.") });

    expect(absent).toMatchObject({ status: "complete", thread: null });
    expect(failedThread.status).toBe("incomplete");
  });

  it("uses Resume when the complete open set does not contain the referenced task", () => {
    const result = reading({ openTasks: ready([]) });

    expect(result).toMatchObject({ status: "complete", thread: null });
    if (result.status === "complete") {
      expect(result.orientation.facts.map((fact) => fact.sourceId)).toEqual(["2026-10-03", "floor"]);
    }
  });

  it("does not read a clock or write", () => {
    const source = readFileSync(new URL("./presentMomentReading.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/Date\.now|new Date\(|supabase|fetch\(|rankNow|insert\(|upsert\(/);
  });
});
