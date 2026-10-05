import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import {
  projectTimeline,
  type BlockTimelineFact,
  type CivilDateRange,
  type CommitmentTimelineFact,
  type ProtectedTimeTimelineFact,
  type TimelineFact,
  type WorkScheduleTimelineFact,
} from "@/projections/timeline";

const zone = "America/Boise";
const day = { startsOn: "2026-10-03", endsBefore: "2026-10-04" };

type TimelineFactKey =
  | keyof WorkScheduleTimelineFact
  | keyof Extract<ProtectedTimeTimelineFact, { allDay: true }>
  | keyof Extract<ProtectedTimeTimelineFact, { allDay: false }>
  | keyof Extract<BlockTimelineFact, { allDay: true }>
  | keyof Extract<BlockTimelineFact, { allDay: false }>
  | keyof Extract<CommitmentTimelineFact, { allDay: true }>
  | keyof Extract<CommitmentTimelineFact, { allDay: false }>;

type DisallowedTimelineKey =
  | "conflict"
  | "priority"
  | "capacity"
  | "available"
  | "free"
  | "winner"
  | "loser"
  | "rank";

type TimelineFactDisallowed = Extract<TimelineFactKey, DisallowedTimelineKey>;
const timelineFactHasNoDisallowedKey: TimelineFactDisallowed extends never ? true : never = true;

type TimelineInputKey = keyof Parameters<typeof projectTimeline>[0];
type ExpectedTimelineInput = "range" | "timeZone" | "workSchedule" | "protectedTime" | "blocks" | "commitments";
type TimelineInputExact = Exclude<TimelineInputKey, ExpectedTimelineInput> extends never
  ? Exclude<ExpectedTimelineInput, TimelineInputKey> extends never
    ? true
    : never
  : never;
const timelineInputIsExact: TimelineInputExact = true;

function protectedRow(
  id: string,
  input: Parameters<typeof defineProtectedTime>[0],
): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function blockRow(id: string, input: Parameters<typeof defineBlock>[0]): Block {
  return { ...defineBlock(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitmentRow(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function compose(input: {
  range?: CivilDateRange;
  timeZone?: string;
  workSchedule?: readonly WorkScheduleEntry[];
  protectedTime?: readonly ProtectedTime[];
  blocks?: readonly Block[];
  commitments?: readonly Commitment[];
}): TimelineFact[] {
  return projectTimeline({
    range: input.range ?? day,
    timeZone: input.timeZone ?? zone,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
  });
}

function ids(facts: readonly TimelineFact[]): string[] {
  return facts.map((fact) => `${fact.sourceKind}:${fact.sourceId}`);
}

function containsDate(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsDate);
  }
  return false;
}

describe("timeline composition", () => {
  it("keeps a scheduled shift, protected time, a block, and a commitment distinct", () => {
    const facts = compose({
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "opening",
        }),
      ],
      protectedTime: [
        protectedRow("protect", {
          kind: "all_day",
          startsOn: "2026-10-03",
          label: "Family",
        }),
      ],
      blocks: [
        blockRow("cycle", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Finish cycle counts",
          contextId: "work-context",
        }),
      ],
      commitments: [
        commitmentRow("meeting", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:30",
          endLocal: "11:00",
          title: "Manager meeting",
        }),
      ],
    });

    expect(facts.map((fact) => fact.sourceKind)).toEqual([
      "protected_time",
      "work_schedule",
      "block",
      "commitment",
    ]);
    expect(facts[0]).toEqual({
      sourceKind: "protected_time",
      sourceId: "protect",
      startsOn: "2026-10-03",
      label: "Family",
      allDay: true,
      intersection: { status: "civil" },
    });
    expect(facts[1]).toMatchObject({
      sourceKind: "work_schedule",
      sourceId: "2026-10-03",
      shiftType: "opening",
      allDay: false,
      startLocal: "08:00",
      endLocal: "17:00",
      endsNextCivilDate: false,
    });
    expect(facts[2]).toMatchObject({
      sourceKind: "block",
      sourceId: "cycle",
      purpose: "Finish cycle counts",
      contextId: "work-context",
      allDay: false,
    });
    expect(facts[3]).toMatchObject({
      sourceKind: "commitment",
      sourceId: "meeting",
      title: "Manager meeting",
      origin: "user_created",
    });
    expect(facts[3]).not.toHaveProperty("createdAt");
    expect(facts.every((fact) => !("conflict" in fact))).toBe(true);
  });

  it("does not turn Work Off or a missing Work row into occupied time", () => {
    const facts = compose({
      range: { startsOn: "2026-10-03", endsBefore: "2026-10-06" },
      workSchedule: [
        offWorkDay("2026-10-03"),
        scheduledWorkDay({
          workOn: "2026-10-04",
          startLocal: "09:00",
          endLocal: "17:00",
          shiftType: "mid",
        }),
      ],
    });

    expect(ids(facts)).toEqual(["work_schedule:2026-10-04"]);
    expect(facts[0]).toMatchObject({ shiftType: "mid" });
  });

  it("keeps a blank protected label and a block without a context", () => {
    const facts = compose({
      protectedTime: [protectedRow("quiet", { kind: "all_day", startsOn: "2026-10-03", label: null })],
      blocks: [
        blockRow("focus", {
          kind: "all_day",
          startsOn: "2026-10-03",
          purpose: "Studio",
          contextId: null,
        }),
      ],
    });

    expect(facts[0]).toMatchObject({ sourceKind: "protected_time", label: null, allDay: true });
    expect(facts[1]).toMatchObject({ sourceKind: "block", purpose: "Studio", contextId: null, allDay: true });
    expect(facts[0]).not.toHaveProperty("bounds");
    expect(facts[1]).not.toHaveProperty("startLocal");
  });
});

describe("timeline overlap", () => {
  it("keeps work, a block, and a commitment that describe the same hour", () => {
    const facts = compose({
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "mid",
        }),
      ],
      blocks: [
        blockRow("cycle", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Finish cycle counts",
        }),
      ],
      commitments: [
        commitmentRow("meeting", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:30",
          endLocal: "11:00",
          title: "Manager meeting",
        }),
      ],
    });

    expect(ids(facts)).toEqual(["work_schedule:2026-10-03", "block:cycle", "commitment:meeting"]);
    expect(facts).toHaveLength(3);
    const work = facts[0];
    if (work.sourceKind !== "work_schedule") throw new Error("expected the shift");
    expect(work.bounds).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-10-03", "08:00", zone),
      end: instantFromZonedLocal("2026-10-03", "17:00", zone),
    });
  });

  it("does not release or split protected time around a block", () => {
    const facts = compose({
      protectedTime: [
        protectedRow("morning", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "14:00",
          label: "Unavailable",
        }),
      ],
      blocks: [
        blockRow("breakfast", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "12:00",
          purpose: "Breakfast with kids",
        }),
      ],
    });

    expect(ids(facts)).toEqual(["protected_time:morning", "block:breakfast"]);
    const protectedTime = facts[0];
    if (protectedTime.allDay || protectedTime.sourceKind !== "protected_time") {
      throw new Error("expected timed protected time");
    }
    expect(protectedTime.bounds).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-10-03", "08:00", zone),
      end: instantFromZonedLocal("2026-10-03", "14:00", zone),
    });
    expect(protectedTime.intersection).toEqual(protectedTime.bounds);
    expect(protectedTime.label).toBe("Unavailable");
  });

  it("keeps protected time and a commitment without a winner", () => {
    const facts = compose({
      protectedTime: [
        protectedRow("evening", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "18:00",
          endLocal: "21:00",
          label: null,
        }),
      ],
      commitments: [
        commitmentRow("visit", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "19:00",
          endLocal: "20:00",
          title: "School event",
        }),
      ],
    });

    expect(facts).toHaveLength(2);
    expect(JSON.stringify(facts)).not.toMatch(/conflict|winner|loser|priority|capacity|available|free/);
  });
});

describe("timeline range", () => {
  it("includes the first civil date and excludes the end boundary", () => {
    const range = { startsOn: "2026-10-03", endsBefore: "2026-10-05" };
    const facts = compose({
      range,
      protectedTime: [
        protectedRow("first", { kind: "all_day", startsOn: "2026-10-03", label: "First" }),
        protectedRow("middle", { kind: "all_day", startsOn: "2026-10-04", label: "Middle" }),
        protectedRow("end", { kind: "all_day", startsOn: "2026-10-05", label: "End" }),
      ],
      commitments: [
        commitmentRow("on-end", {
          kind: "timed",
          startsOn: "2026-10-05",
          startLocal: "09:00",
          endLocal: "10:00",
          title: "Outside",
        }),
      ],
    });

    expect(ids(facts)).toEqual(["protected_time:first", "protected_time:middle"]);
  });

  it("sees an overnight fact from the previous civil date and clips only the intersection", () => {
    const saturday = { startsOn: "2026-10-03", endsBefore: "2026-10-04" };
    const work = scheduledWorkDay({
      workOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const protectedTime = protectedRow("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "06:00",
      label: "Night",
    });
    const block = blockRow("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "06:00",
      purpose: "Close",
    });
    const commitment = commitmentRow("night", {
      kind: "timed",
      startsOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "06:00",
      title: "Reservation",
    });
    const facts = compose({
      range: saturday,
      workSchedule: [work],
      protectedTime: [protectedTime],
      blocks: [block],
      commitments: [commitment],
    });

    expect(facts).toHaveLength(4);
    expect(facts.every((fact) => fact.startsOn === "2026-10-02" && fact.allDay === false)).toBe(true);
    const shift = facts.find((fact) => fact.sourceKind === "work_schedule");
    if (!shift || shift.allDay) throw new Error("expected the overnight shift");
    expect(shift.shiftType).toBe("closing");
    expect(shift.bounds).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-10-02", "22:00", zone),
      end: instantFromZonedLocal("2026-10-03", "06:00", zone),
    });
    expect(shift.intersection).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-10-03", "00:00", zone),
      end: instantFromZonedLocal("2026-10-03", "06:00", zone),
    });
    expect(work).toMatchObject({ workOn: "2026-10-02", startLocal: "22:00", endLocal: "06:00" });
  });

  it("clips an overnight fact at the end of the requested range without rewriting its source", () => {
    const friday = { startsOn: "2026-10-02", endsBefore: "2026-10-03" };
    const [fact] = compose({
      range: friday,
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-10-02",
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
      ],
    });
    if (!fact || fact.allDay || fact.sourceKind !== "work_schedule") throw new Error("expected the shift");
    if (fact.bounds.status !== "resolved") throw new Error("expected resolved source bounds");

    expect(fact.startsOn).toBe("2026-10-02");
    expect(fact.bounds.start).toEqual(instantFromZonedLocal("2026-10-02", "22:00", zone));
    expect(fact.bounds.end).toEqual(instantFromZonedLocal("2026-10-03", "06:00", zone));
    expect(fact.intersection).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-10-02", "22:00", zone),
      end: instantFromZonedLocal("2026-10-03", "00:00", zone),
    });
  });

  it("keeps one overnight fact across a multi-day range and drops facts that do not meet it", () => {
    const facts = compose({
      range: { startsOn: "2026-10-03", endsBefore: "2026-10-05" },
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-09-30",
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
        scheduledWorkDay({
          workOn: "2026-10-01",
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "mid",
        }),
        scheduledWorkDay({
          workOn: "2026-10-02",
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
        scheduledWorkDay({
          workOn: "2026-10-04",
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
      ],
    });

    expect(ids(facts)).toEqual(["work_schedule:2026-10-02", "work_schedule:2026-10-04"]);
    const saturdayTail = facts[0];
    if (!saturdayTail || saturdayTail.allDay || saturdayTail.sourceKind !== "work_schedule") {
      throw new Error("expected the Friday overnight shift");
    }
    if (saturdayTail.bounds.status !== "resolved" || saturdayTail.intersection.status !== "resolved") {
      throw new Error("expected resolved bounds");
    }
    expect(facts.filter((fact) => fact.sourceId === "2026-10-02")).toHaveLength(1);
    expect(saturdayTail.bounds.start).toEqual(instantFromZonedLocal("2026-10-02", "22:00", zone));
    expect(saturdayTail.intersection.start).toEqual(instantFromZonedLocal("2026-10-03", "00:00", zone));
    expect(saturdayTail.bounds.end).toEqual(saturdayTail.intersection.end);
  });

  it("does not treat an overnight end at the next midnight as occupying the next civil date", () => {
    const facts = compose({
      range: { startsOn: "2026-10-03", endsBefore: "2026-10-04" },
      commitments: [
        commitmentRow("edge", {
          kind: "timed",
          startsOn: "2026-10-02",
          startLocal: "22:00",
          endLocal: "00:00",
          title: "Ends at midnight",
        }),
      ],
    });

    expect(facts).toEqual([]);
  });

  it("rejects a range that does not include a civil date", () => {
    expect(() => compose({ range: { startsOn: "2026-10-03", endsBefore: "2026-10-03" } })).toThrow(
      /must start before it ends/,
    );
    expect(() => compose({ range: { startsOn: "2026-10-04", endsBefore: "2026-10-03" } })).toThrow(
      /must start before it ends/,
    );
  });
});

describe("timeline temporal truth", () => {
  it("keeps a local time that does not occur, without an instant", () => {
    const gap = protectedRow("gap", {
      kind: "timed",
      startsOn: "2026-03-08",
      startLocal: "02:30",
      endLocal: "03:30",
      label: "Gap",
    });
    expect(() => instantFromZonedLocal("2026-03-08", "02:30", "America/Denver")).toThrow(/does not occur/);

    const [fact] = compose({
      range: { startsOn: "2026-03-08", endsBefore: "2026-03-09" },
      timeZone: "America/Denver",
      protectedTime: [gap],
    });

    expect(fact).toMatchObject({
      sourceKind: "protected_time",
      sourceId: "gap",
      startsOn: "2026-03-08",
      allDay: false,
      startLocal: "02:30",
      endLocal: "03:30",
      label: "Gap",
      bounds: { status: "unresolved" },
      intersection: { status: "unresolved" },
    });
    expect(containsDate(fact)).toBe(false);
  });

  it("does not keep a resolved start when the end local time does not occur", () => {
    const [fact] = compose({
      range: { startsOn: "2026-03-08", endsBefore: "2026-03-09" },
      timeZone: "America/Denver",
      blocks: [
        blockRow("partial", {
          kind: "timed",
          startsOn: "2026-03-08",
          startLocal: "01:00",
          endLocal: "02:30",
          purpose: "Count",
        }),
      ],
    });

    expect(instantFromZonedLocal("2026-03-08", "01:00", "America/Denver")).toBeInstanceOf(Date);
    expect(fact).toMatchObject({
      bounds: { status: "unresolved" },
      intersection: { status: "unresolved" },
      startLocal: "01:00",
      endLocal: "02:30",
    });
    expect(containsDate(fact)).toBe(false);
  });

  it("includes an unresolved overnight fact on the next civil date", () => {
    const [fact] = compose({
      range: { startsOn: "2026-03-09", endsBefore: "2026-03-10" },
      timeZone: "America/Denver",
      commitments: [
        commitmentRow("fold-night", {
          kind: "timed",
          startsOn: "2026-03-08",
          startLocal: "02:30",
          endLocal: "01:00",
          title: "Overnight gap",
        }),
      ],
    });

    expect(fact).toMatchObject({
      sourceKind: "commitment",
      startsOn: "2026-03-08",
      origin: "user_created",
      endsNextCivilDate: true,
      bounds: { status: "unresolved" },
      intersection: { status: "unresolved" },
    });
  });

  it("uses the existing instant for a repeated local time and keeps the local text", () => {
    const [fact] = compose({
      range: { startsOn: "2026-11-01", endsBefore: "2026-11-02" },
      timeZone: "America/Denver",
      commitments: [
        commitmentRow("fold", {
          kind: "timed",
          startsOn: "2026-11-01",
          startLocal: "01:30",
          endLocal: "01:45",
          title: "Reservation",
        }),
      ],
    });
    if (!fact || fact.allDay || fact.sourceKind !== "commitment") throw new Error("expected the commitment");

    expect(fact.startLocal).toBe("01:30");
    expect(fact.bounds).toEqual({
      status: "resolved",
      start: instantFromZonedLocal("2026-11-01", "01:30", "America/Denver"),
      end: instantFromZonedLocal("2026-11-01", "01:45", "America/Denver"),
    });
  });

  it("keeps all-day truth on a spring-forward civil date", () => {
    const [fact] = compose({
      range: { startsOn: "2026-03-08", endsBefore: "2026-03-09" },
      timeZone: "America/Denver",
      blocks: [
        blockRow("day", {
          kind: "all_day",
          startsOn: "2026-03-08",
          purpose: "Family",
        }),
      ],
    });

    expect(fact).toEqual({
      sourceKind: "block",
      sourceId: "day",
      startsOn: "2026-03-08",
      purpose: "Family",
      contextId: null,
      taskId: null,
      allDay: true,
      intersection: { status: "civil" },
    });
    expect(containsDate(fact)).toBe(false);
  });

  it("returns the same facts for the same inputs", () => {
    const input = {
      range: day,
      timeZone: zone,
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "opening",
        }),
      ],
      protectedTime: [] as ProtectedTime[],
      blocks: [] as Block[],
      commitments: [] as Commitment[],
    };
    const first = projectTimeline(input);
    const second = projectTimeline(input);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("timeline ordering", () => {
  it("orders by source civil date, all-day before timed, local start, then a stable kind tie-break", () => {
    const facts = compose({
      range: { startsOn: "2026-10-02", endsBefore: "2026-10-04" },
      workSchedule: [
        scheduledWorkDay({
          workOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "opening",
        }),
        scheduledWorkDay({
          workOn: "2026-10-02",
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
      ],
      protectedTime: [
        protectedRow("z-protect", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "09:00",
          label: "Same start",
        }),
      ],
      blocks: [
        blockRow("b-later", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Later block",
        }),
        blockRow("a-all-day", {
          kind: "all_day",
          startsOn: "2026-10-03",
          purpose: "Chosen day",
        }),
      ],
      commitments: [
        commitmentRow("m-same", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "08:30",
          title: "Same start",
        }),
        commitmentRow("a-early", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "09:00",
          endLocal: "09:30",
          title: "Earlier than the block",
        }),
        commitmentRow("b-same", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "08:00",
          endLocal: "08:15",
          title: "Also same start",
        }),
      ],
    });

    expect(ids(facts)).toEqual([
      "work_schedule:2026-10-02",
      "block:a-all-day",
      "work_schedule:2026-10-03",
      "protected_time:z-protect",
      "commitment:b-same",
      "commitment:m-same",
      "commitment:a-early",
      "block:b-later",
    ]);
    expect(facts[0]).toMatchObject({ shiftType: "closing" });
    expect(facts[2]).toMatchObject({ shiftType: "opening" });
  });
});

describe("timeline non-goals", () => {
  it("does not change the supplied rows", () => {
    const workSchedule = [
      offWorkDay("2026-10-03"),
      scheduledWorkDay({
        workOn: "2026-10-04",
        startLocal: "08:00",
        endLocal: "17:00",
        shiftType: "mid",
      }),
    ];
    const before = JSON.stringify(workSchedule);
    compose({
      range: { startsOn: "2026-10-03", endsBefore: "2026-10-05" },
      workSchedule,
    });
    expect(JSON.stringify(workSchedule)).toBe(before);
    expect(workSchedule.map((entry) => entry.workOn)).toEqual(["2026-10-03", "2026-10-04"]);
  });

  it("carries a block task reference without adding a task source", () => {
    const taskId = "00000000-0000-4000-8000-000000000010";
    const facts = compose({
      blocks: [
        blockRow("monday", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "14:00",
          endLocal: "15:00",
          purpose: "Focus",
          taskId,
        }),
        blockRow("tuesday", {
          kind: "timed",
          startsOn: "2026-10-03",
          startLocal: "16:00",
          endLocal: "17:00",
          purpose: "Another period",
          taskId,
        }),
      ],
    });
    expect(facts).toHaveLength(2);
    expect(facts.map((fact) => fact.sourceKind)).toEqual(["block", "block"]);
    expect(facts.map((fact) => (fact.sourceKind === "block" ? fact.taskId : null))).toEqual([taskId, taskId]);
    expect(facts.map((fact) => (fact.sourceKind === "block" ? fact.purpose : null))).toEqual([
      "Focus",
      "Another period",
    ]);
  });

  it("has no disallowed input or fact key, and does not read a clock or another projection", () => {
    expect(timelineFactHasNoDisallowedKey).toBe(true);
    expect(timelineInputIsExact).toBe(true);
    const source = readFileSync(new URL("./timeline.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /Date\.now|new Date\(|capacity|availability|\bfree\b|conflict|rankNow|supabase|@\/domain\/task|@\/projections\/today|activeThread|mustDo|google|gemini/,
    );
  });
});
