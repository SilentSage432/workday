import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import { projectTimeline } from "@/projections/timeline";
import { composeWorkCapacityReading } from "@/components/capacityReading";
import {
  ALLOCATABLE_REMAINDER_LABEL,
  allocatableRemainderBands,
  civilDatesInSpan,
  coextensiveFrame,
  compressedKindLabel,
  compressedPlacement,
  explicitCivilSpan,
  factsContainingPoint,
  markEmphasis,
  prototypeLoadWindow,
  questionAllowsCapacityRemainder,
  questionAllowsEstablishment,
  questionShowsDirection,
  reachStripJob,
  threadLine,
} from "@/components/prototype/instrumentModel";

const directory = fileURLToPath(new URL(".", import.meta.url));

function block(input: { id: string; start: string; end: string; purpose: string; contextId?: string | null }): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: "2026-10-05",
      startLocal: input.start,
      endLocal: input.end,
      purpose: input.purpose,
      contextId: input.contextId ?? null,
    }),
    id: input.id,
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

function commitment(id: string): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: "2026-10-05",
      startLocal: "10:00",
      endLocal: "11:00",
      title: "Meet",
    }),
    id,
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

describe("prototype spatial model", () => {
  it("uses an explicit span instead of a fiscal week", () => {
    const week = explicitCivilSpan("2026-10-05", 7);
    expect(week).toEqual({ startsOn: "2026-10-05", endsBefore: "2026-10-12" });
    expect(civilDatesInSpan(week)).toHaveLength(7);
    const month = explicitCivilSpan("2026-10-05", 28);
    expect(month.endsBefore).toBe("2026-11-02");
    const loaded = prototypeLoadWindow("2026-10-05");
    expect(loaded.from < week.startsOn).toBe(true);
    expect(loaded.to >= "2026-11-01").toBe(true);
  });

  it("keeps establishment, direction, and capacity on their questions", () => {
    expect(questionAllowsEstablishment("day")).toBe(true);
    expect(questionAllowsEstablishment("present")).toBe(false);
    expect(questionAllowsEstablishment("week")).toBe(false);
    expect(questionAllowsEstablishment("month")).toBe(false);
    expect(questionShowsDirection("month")).toBe(true);
    expect(questionShowsDirection("day")).toBe(false);
    expect(questionShowsDirection("week")).toBe(false);
    expect(questionAllowsCapacityRemainder("day")).toBe(true);
    expect(questionAllowsCapacityRemainder("present")).toBe(true);
    expect(questionAllowsCapacityRemainder("week")).toBe(false);
    expect(questionAllowsCapacityRemainder("month")).toBe(false);
  });

  it("treats capture, selection, and inspection as transient strip jobs", () => {
    expect(
      reachStripJob({
        captureOpen: true,
        question: "day",
        selectionVisible: true,
        factReferenced: true,
        directionInspection: true,
      }),
    ).toBe("capture");
    expect(
      reachStripJob({
        captureOpen: false,
        question: "week",
        selectionVisible: true,
        factReferenced: false,
        directionInspection: false,
      }),
    ).toBe("resting");
    expect(
      reachStripJob({
        captureOpen: false,
        question: "day",
        selectionVisible: false,
        factReferenced: false,
        directionInspection: false,
      }),
    ).toBe("resting");
    expect(
      reachStripJob({
        captureOpen: false,
        question: "month",
        selectionVisible: false,
        factReferenced: false,
        directionInspection: true,
      }),
    ).toBe("direction-inspection");
  });

  it("quiets context-bearing marks in place and leaves neutral truths ordinary", () => {
    const team = { kind: "context" as const, id: "lab", name: "TeamLab" };
    expect(markEmphasis({ sourceKind: "commitment", contextId: null, focus: team })).toBe("ordinary");
    expect(markEmphasis({ sourceKind: "protected_time", contextId: null, focus: team })).toBe("ordinary");
    expect(markEmphasis({ sourceKind: "block", contextId: null, focus: team })).toBe("ordinary");
    expect(markEmphasis({ sourceKind: "block", contextId: "lab", focus: team })).toBe("ordinary");
    expect(markEmphasis({ sourceKind: "block", contextId: "work", focus: team })).toBe("quiet");
    expect(markEmphasis({ sourceKind: "work_schedule", contextId: null, focus: team })).toBe("quiet");
    expect(markEmphasis({ sourceKind: "work_schedule", contextId: null, focus: { kind: "context", id: "work", name: "Work" } })).toBe(
      "ordinary",
    );
    expect(markEmphasis({ sourceKind: "block", contextId: "work", focus: { kind: "everything" } })).toBe("ordinary");
  });

  it("does not invent a thread", () => {
    expect(threadLine({ status: "ready", active: false, resumeTitle: null })).toBe("No thread is established.");
    expect(threadLine({ status: "failed", active: false, resumeTitle: null })).toBe("Active thread could not be read.");
    expect(threadLine({ status: "ready", active: true, resumeTitle: "Count the aisle" })).toBe("Resume: Count the aisle");
    expect(threadLine({ status: "ready", active: true, resumeTitle: null })).toBe(
      "A thread is recorded, and its task is not open.",
    );
  });

  it("paints coextensive marks without using lanes", () => {
    const first = coextensiveFrame({ top: 0.25, height: 0.1, lane: 0 });
    const second = coextensiveFrame({ top: 0.25, height: 0.1, lane: 3 });
    expect(first).toEqual(second);
    expect(first.width).toBe("100%");
    expect(first.left).toBe("0%");
  });

  it("returns every fact under a point", () => {
    const boxes = [
      { sourceId: "a", left: 0, top: 0, right: 10, bottom: 10 },
      { sourceId: "b", left: 0, top: 0, right: 10, bottom: 10 },
    ];
    expect(factsContainingPoint(boxes, 5, 5).map((box) => box.sourceId)).toEqual(["a", "b"]);
  });

  it("slices overnight truth onto each civil date and drops words", () => {
    const facts = projectTimeline({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-07" },
      timeZone: "UTC",
      workSchedule: [],
      protectedTime: [],
      blocks: [block({ id: "night", start: "22:00", end: "02:00", purpose: "Night watch" })],
      commitments: [],
    });
    const owned = compressedPlacement(facts[0], "2026-10-05", "UTC");
    const next = compressedPlacement(facts[0], "2026-10-06", "UTC");
    expect(owned).toEqual({ placement: "timed", startMinute: 22 * 60, endMinute: 24 * 60 });
    expect(next).toEqual({ placement: "timed", startMinute: 0, endMinute: 2 * 60 });
    expect(compressedKindLabel("block")).toBe("Block");
    expect(compressedKindLabel("block")).not.toContain("Night");
  });

  it("keeps two meanings on the same minutes", () => {
    const facts = projectTimeline({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-06" },
      timeZone: "UTC",
      workSchedule: [],
      protectedTime: [],
      blocks: [block({ id: "focus", start: "10:00", end: "11:00", purpose: "Write" })],
      commitments: [commitment("meet")],
    });
    const slices = facts.map((fact) => compressedPlacement(fact, "2026-10-05", "UTC"));
    expect(slices).toEqual([
      { placement: "timed", startMinute: 10 * 60, endMinute: 11 * 60 },
      { placement: "timed", startMinute: 10 * 60, endMinute: 11 * 60 },
    ]);
  });

  it("withholds allocatable remainder unless a reading exists", () => {
    expect(allocatableRemainderBands({ status: "incomplete", message: "withheld" }, "2026-10-05", "UTC")).toEqual([]);
    expect(allocatableRemainderBands({ status: "none", reason: "off" }, "2026-10-05", "UTC")).toEqual([]);
    expect(allocatableRemainderBands({ status: "none", reason: "missing" }, "2026-10-05", "UTC")).toEqual([]);
    expect(allocatableRemainderBands({ status: "unresolved" }, "2026-10-05", "UTC")).toEqual([]);
    const reading = composeWorkCapacityReading({
      civilDate: "2026-10-05",
      timeZone: "UTC",
      loaded: prototypeLoadWindow("2026-10-05"),
      work: {
        status: "ready",
        rows: [{ workOn: "2026-10-05", state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }],
      },
      protectedTime: { status: "ready", rows: [] },
      blocks: { status: "ready", rows: [] },
      commitments: { status: "ready", rows: [] },
    });
    expect(allocatableRemainderBands(reading, "2026-10-05", "UTC")).toEqual([
      { startMinute: 9 * 60, endMinute: 17 * 60 },
    ]);
    expect(ALLOCATABLE_REMAINDER_LABEL).toBe("Allocatable remainder");
  });

  it("does not persist prototype state or borrow a finished visual language", () => {
    const files = readdirSync(directory).filter(
      (name) => (name.endsWith(".ts") || name.endsWith(".tsx")) && !name.includes(".test."),
    );
    const source = files.map((name) => readFileSync(join(directory, name), "utf8")).join("\n");
    const page = readFileSync(new URL("../../app/instrument/page.tsx", import.meta.url), "utf8");
    const combined = `${source}\n${page}`;
    expect(combined).not.toMatch(/localStorage|sessionStorage/);
    expect(combined).not.toMatch(/\bfree\b|\bavailable\b/i);
    expect(combined).not.toMatch(/gradient|backdrop-blur|shadow-/);
    expect(combined).not.toContain("current_context");
    expect(page).toContain("InstrumentPrototype");
  });
});
