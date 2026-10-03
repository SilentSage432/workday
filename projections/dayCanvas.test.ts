import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import {
  adjacentCivilDay,
  composeDayCanvas,
  DAY_AXIS_MINUTES,
  dayCanvasRange,
  dayCanvasWorkQuery,
  type DayCanvasModel,
  type DayCanvasTimedPlacement,
} from "@/projections/dayCanvas";

const zone = "America/Boise";
const day = "2026-10-03";

type ModelKey = keyof DayCanvasModel | keyof DayCanvasTimedPlacement;
type Disallowed = "conflict" | "priority" | "capacity" | "available" | "free" | "winner" | "rank";
type ModelDisallowed = Extract<ModelKey, Disallowed>;
const modelHasNoDisallowedKey: ModelDisallowed extends never ? true : never = true;

function protectedRow(id: string, input: Parameters<typeof defineProtectedTime>[0]): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function blockRow(id: string, input: Parameters<typeof defineBlock>[0]): Block {
  return { ...defineBlock(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function commitmentRow(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

function compose(input: {
  selectedDay?: string;
  timeZone?: string;
  workSchedule?: readonly WorkScheduleEntry[];
  protectedTime?: readonly ProtectedTime[];
  blocks?: readonly Block[];
  commitments?: readonly Commitment[];
  contextNames?: Readonly<Record<string, string>>;
}): DayCanvasModel {
  return composeDayCanvas({
    selectedDay: input.selectedDay ?? day,
    timeZone: input.timeZone ?? zone,
    workSchedule: input.workSchedule ?? [],
    protectedTime: input.protectedTime ?? [],
    blocks: input.blocks ?? [],
    commitments: input.commitments ?? [],
    contextNames: input.contextNames,
  });
}

function placed(model: DayCanvasModel, sourceId: string): DayCanvasTimedPlacement {
  const found = [...model.context, ...model.foreground].find((item) => item.sourceId === sourceId);
  if (!found) throw new Error(`Missing placement ${sourceId}`);
  return found;
}

describe("day canvas range", () => {
  it("uses a half-open civil day, including across a spring-forward date", () => {
    expect(dayCanvasRange(day)).toEqual({ startsOn: day, endsBefore: "2026-10-04" });
    expect(dayCanvasRange("2026-03-08")).toEqual({ startsOn: "2026-03-08", endsBefore: "2026-03-09" });
    expect(adjacentCivilDay("2026-03-08", 1)).toBe("2026-03-09");
    expect(adjacentCivilDay("2026-03-08", -1)).toBe("2026-03-07");

    const start = instantFromZonedLocal("2026-03-08", "00:00", "America/Denver");
    const end = instantFromZonedLocal("2026-03-09", "00:00", "America/Denver");
    expect(end.getTime() - start.getTime()).not.toBe(24 * 60 * 60 * 1000);
    expect(dayCanvasWorkQuery("2026-10-03")).toEqual({ from: "2026-10-02", to: "2026-10-03" });
    expect(modelHasNoDisallowedKey).toBe(true);
  });
});

describe("day canvas composition", () => {
  it("renders work, protected time, a block, and a commitment from Timeline geometry", () => {
    const model = compose({
      workSchedule: [
        scheduledWorkDay({
          workOn: day,
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "opening",
        }),
      ],
      protectedTime: [
        protectedRow("protect", { kind: "all_day", startsOn: day, label: "Family" }),
      ],
      blocks: [
        blockRow("cycle", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Finish cycle counts",
          contextId: "work-context",
        }),
      ],
      commitments: [
        commitmentRow("meeting", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:30",
          endLocal: "11:00",
          title: "Manager meeting",
        }),
      ],
      contextNames: { "work-context": "Work" },
    });

    expect(model.allDay.map((fact) => fact.sourceKind)).toEqual(["protected_time"]);
    expect(model.context.map((fact) => fact.sourceId)).toEqual(["2026-10-03"]);
    expect(model.foreground.map((fact) => fact.sourceId)).toEqual(["cycle", "meeting"]);
    expect(placed(model, day)).toMatchObject({
      layer: "context",
      visibleStartMinute: 8 * 60,
      visibleEndMinute: 17 * 60,
      primary: "Opening",
    });
    const block = placed(model, "cycle");
    const meeting = placed(model, "meeting");
    expect(block.visibleEndMinute - block.visibleStartMinute).toBe(60);
    expect(meeting.visibleEndMinute - meeting.visibleStartMinute).toBe(30);
    expect(meeting.height * 2).toBeCloseTo(block.height);
    expect(block.contextName).toBe("Work");
    expect(meeting.laneCount).toBe(2);
    expect(block.lane).not.toBe(meeting.lane);
    expect(model.allDay[0]?.detail).toContain("All day");
    expect(model.context.some((item) => item.visibleStartMinute === 0 && item.visibleEndMinute === DAY_AXIS_MINUTES)).toBe(
      false,
    );
  });

  it("keeps protected time when a block overlaps it", () => {
    const model = compose({
      protectedTime: [
        protectedRow("protect", {
          kind: "timed",
          startsOn: day,
          startLocal: "08:00",
          endLocal: "14:00",
          label: "Family",
        }),
      ],
      blocks: [
        blockRow("studio", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "12:00",
          purpose: "Work on Studio",
        }),
      ],
    });

    expect(placed(model, "protect")).toMatchObject({
      layer: "context",
      sourceKind: "protected_time",
      visibleStartMinute: 8 * 60,
      visibleEndMinute: 14 * 60,
    });
    expect(placed(model, "studio")).toMatchObject({
      layer: "foreground",
      visibleStartMinute: 10 * 60,
      visibleEndMinute: 12 * 60,
      laneCount: 1,
    });
  });

  it("requires the previous civil day for an overnight tail", () => {
    const friday = scheduledWorkDay({
      workOn: "2026-10-02",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const withLookBehind = compose({ selectedDay: "2026-10-03", workSchedule: [friday] });
    const saturdayOnly = compose({ selectedDay: "2026-10-03", workSchedule: [] });

    expect(withLookBehind.lookBehindDay).toBe("2026-10-02");
    expect(placed(withLookBehind, "2026-10-02")).toMatchObject({
      visibleStartMinute: 0,
      visibleEndMinute: 6 * 60,
      clipped: true,
      primary: "Closing",
    });
    expect(placed(withLookBehind, "2026-10-02").accessibleLabel).toContain("Fri, Oct 2");
    expect(placed(withLookBehind, "2026-10-02").accessibleLabel).toContain("10:00 PM");
    expect(placed(withLookBehind, "2026-10-02").shownInterval).toBe("12:00 AM–6:00 AM");
    expect(saturdayOnly.context).toEqual([]);
  });

  it("clips a selected-day overnight fact at the next midnight", () => {
    const model = compose({
      workSchedule: [
        scheduledWorkDay({
          workOn: day,
          startLocal: "22:00",
          endLocal: "06:00",
          shiftType: "closing",
        }),
      ],
    });
    const work = placed(model, day);
    expect(work).toMatchObject({
      visibleStartMinute: 22 * 60,
      visibleEndMinute: DAY_AXIS_MINUTES,
      clipped: true,
    });
    expect(work.sourceInterval).toContain("10:00 PM");
    expect(work.sourceInterval).toContain("6:00 AM");
    expect(work.shownInterval).toBe("10:00 PM–12:00 AM");
  });

  it("keeps an all-day fact out of the timed axis", () => {
    const model = compose({
      blocks: [blockRow("day", { kind: "all_day", startsOn: day, purpose: "Family day" })],
      commitments: [
        commitmentRow("timed", {
          kind: "timed",
          startsOn: day,
          startLocal: "15:00",
          endLocal: "16:00",
          title: "Appointment",
        }),
      ],
    });
    expect(model.allDay.map((fact) => fact.primary)).toEqual(["Family day"]);
    expect(model.foreground.map((fact) => fact.sourceId)).toEqual(["timed"]);
    expect(model.context).toEqual([]);
  });

  it("does not treat a shared boundary as overlap", () => {
    const model = compose({
      blocks: [
        blockRow("morning", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Counts",
        }),
      ],
      commitments: [
        commitmentRow("next", {
          kind: "timed",
          startsOn: day,
          startLocal: "11:00",
          endLocal: "12:00",
          title: "Handoff",
        }),
      ],
    });
    expect(placed(model, "morning").laneCount).toBe(1);
    expect(placed(model, "next").laneCount).toBe(1);
  });

  it("packs overlapping foreground facts by source id, not by kind", () => {
    const model = compose({
      blocks: [
        blockRow("b-block", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "11:00",
          purpose: "Counts",
        }),
      ],
      commitments: [
        commitmentRow("a-meet", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "11:00",
          title: "Meeting",
        }),
      ],
    });
    expect(placed(model, "a-meet")).toMatchObject({ lane: 0, laneCount: 2, sourceKind: "commitment" });
    expect(placed(model, "b-block")).toMatchObject({ lane: 1, laneCount: 2, sourceKind: "block" });
  });

  it("keeps a short fact at its true duration", () => {
    const model = compose({
      commitments: [
        commitmentRow("brief", {
          kind: "timed",
          startsOn: day,
          startLocal: "10:00",
          endLocal: "10:05",
          title: "Check-in",
        }),
      ],
    });
    const brief = placed(model, "brief");
    expect(brief.visibleEndMinute - brief.visibleStartMinute).toBe(5);
    expect(brief.height).toBe(5 / DAY_AXIS_MINUTES);
  });

  it("does not invent free, available, or capacity intervals", () => {
    const model = compose({
      workSchedule: [offWorkDay(day)],
    });
    expect(model.context).toEqual([]);
    expect(model.foreground).toEqual([]);
    expect(model.allDay).toEqual([]);
    expect(model.unresolved).toEqual([]);
    expect(JSON.stringify(model)).not.toMatch(/free|available|capacity|conflict|priority/i);
  });
});

describe("day canvas unresolved time", () => {
  it("lists an unresolved fact without geometry and still shows all-day truth", () => {
    const model = compose({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      protectedTime: [
        protectedRow("gap", {
          kind: "timed",
          startsOn: "2026-03-08",
          startLocal: "02:30",
          endLocal: "03:30",
          label: "Gap",
        }),
      ],
      blocks: [blockRow("day", { kind: "all_day", startsOn: "2026-03-08", purpose: "Family" })],
    });

    expect(model.axis).toBe("local-clock");
    expect(model.clockLabelNote).toMatch(/not 24 elapsed hours/);
    expect(model.allDay.map((fact) => fact.primary)).toEqual(["Family"]);
    expect(model.unresolved.map((fact) => fact.sourceId)).toEqual(["gap"]);
    expect(model.unresolved[0]?.detail).toContain("2:30 AM");
    expect(model.unresolved[0]?.accessibleLabel).toContain("Time could not be positioned for this date.");
    expect(model.context).toEqual([]);
    expect(model.foreground).toEqual([]);
    expect(JSON.stringify(model.unresolved)).not.toContain("visibleStartMinute");
  });

  it("places a resolved spring-forward span on local clock labels, not elapsed time", () => {
    const model = compose({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      blocks: [
        blockRow("span", {
          kind: "timed",
          startsOn: "2026-03-08",
          startLocal: "01:00",
          endLocal: "03:00",
          purpose: "Count",
        }),
      ],
    });
    const span = placed(model, "span");
    expect(span.visibleEndMinute - span.visibleStartMinute).toBe(120);
    const start = instantFromZonedLocal("2026-03-08", "01:00", "America/Denver");
    const end = instantFromZonedLocal("2026-03-08", "03:00", "America/Denver");
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
  });

  it("places a repeated local hour once, using the resolved clock text", () => {
    const model = compose({
      selectedDay: "2026-11-01",
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
    expect(model.clockLabelNote).toMatch(/not 24 elapsed hours/);
    expect(model.foreground).toHaveLength(1);
    expect(placed(model, "fold")).toMatchObject({
      visibleStartMinute: 90,
      visibleEndMinute: 105,
    });
  });
});

describe("day canvas authority", () => {
  it("keeps semantic composition in Timeline and geometry beside it", () => {
    const projection = readFileSync(new URL("./dayCanvas.ts", import.meta.url), "utf8");
    const component = readFileSync(new URL("../components/DayCanvas.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("../components/WorkSchedule.tsx", import.meta.url), "utf8");
    expect(projection.match(/projectTimeline\(/g)).toHaveLength(1);
    expect(component).not.toContain("projectTimeline");
    expect(schedule).not.toContain("projectTimeline");
    expect(schedule).toContain("composeDayCanvas");
    expect(schedule).toContain("dayCanvasWorkQuery");
    expect(schedule).toContain("loadProtectedTime(client)");
    expect(schedule).toContain("loadBlocks(client)");
    expect(schedule).toContain("loadCommitments(client)");
    expect(schedule).not.toMatch(/protectedTime\.filter|blocks\.filter|commitments\.filter|workSchedule\.filter/);
    expect(projection).not.toContain("Date.now");
    expect(component).not.toContain("Date.now");
    expect(projection).not.toMatch(/86400000|24 \* 60 \* 60 \* 1000 \* /);
  });
});
