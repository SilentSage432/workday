import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SELECTION_HOLD_MS,
  SELECTION_INCREMENT_MINUTES,
  SELECTION_MOVE_SLOP_PX,
  axisRatioFromMinute,
  formatSelectionRange,
  initialSelectionSession,
  minuteFromAxisRatio,
  minuteFromPointerY,
  normalizeLocalRange,
  ratioFromVisiblePointer,
  reduceSelection,
  selectionFrame,
  selectionFromMinutes,
  selectionLocalClock,
  snapMinute,
  type SelectionSession,
  type TimeSelection,
} from "@/components/daySelection";
import { DAY_AXIS_MINUTES } from "@/projections/dayCanvas";

const day = "2026-10-03";

function down(
  session: SelectionSession,
  input: { pointerType?: string; ratio: number; x?: number; y?: number; pointerId?: number; civilDate?: string },
) {
  return reduceSelection(session, {
    type: "down",
    pointerId: input.pointerId ?? 1,
    pointerType: input.pointerType ?? "mouse",
    ratio: input.ratio,
    x: input.x ?? 0,
    y: input.y ?? 0,
    civilDate: input.civilDate ?? day,
  });
}

describe("day selection geometry", () => {
  it("maps the top of the surface to midnight and the bottom to the end of the civil clock", () => {
    expect(minuteFromPointerY(0, 1440)).toBe(0);
    expect(minuteFromAxisRatio(0)).toBe(0);
    expect(minuteFromPointerY(1440, 1440)).toBe(DAY_AXIS_MINUTES);
    expect(minuteFromAxisRatio(1)).toBe(DAY_AXIS_MINUTES);
    expect(snapMinute(minuteFromPointerY(0, 1000))).toBe(0);
    expect(snapMinute(minuteFromPointerY(1000, 1000))).toBe(DAY_AXIS_MINUTES);
  });

  it("snaps to 15 minutes, clamps, and rounds a halfway minute later", () => {
    expect(SELECTION_INCREMENT_MINUTES).toBe(15);
    expect(snapMinute(18 * 60 + 7)).toBe(18 * 60);
    expect(snapMinute(18 * 60 + 7.5)).toBe(18 * 60 + 15);
    expect(snapMinute(18 * 60 + 8)).toBe(18 * 60 + 15);
    expect(snapMinute(-40)).toBe(0);
    expect(snapMinute(DAY_AXIS_MINUTES + 80)).toBe(DAY_AXIS_MINUTES);
    expect(minuteFromAxisRatio(-0.2)).toBe(0);
    expect(minuteFromAxisRatio(1.4)).toBe(DAY_AXIS_MINUTES);
    expect(minuteFromPointerY(-10, 800)).toBe(0);
    expect(minuteFromPointerY(900, 800)).toBe(DAY_AXIS_MINUTES);
    expect(minuteFromPointerY(10, 0)).toBe(0);
  });

  it("clamps a pointer to the visible scrollport without moving the view", () => {
    const surface = { top: -200, height: 1440 };
    const scroll = { top: 0, height: 400 };
    expect(ratioFromVisiblePointer(-40, surface, scroll)).toBe((0 - surface.top) / surface.height);
    expect(ratioFromVisiblePointer(250, surface, scroll)).toBe((250 - surface.top) / surface.height);
    expect(ratioFromVisiblePointer(900, surface, scroll)).toBe((400 - surface.top) / surface.height);
    expect(ratioFromVisiblePointer(900, surface, null)).toBe((900 - surface.top) / surface.height);
  });

  it("normalizes a downward drag and an upward drag into the same ordered range", () => {
    expect(normalizeLocalRange(18 * 60, 21 * 60)).toEqual({ startMinute: 18 * 60, endMinute: 21 * 60 });
    expect(normalizeLocalRange(21 * 60, 19 * 60)).toEqual({ startMinute: 19 * 60, endMinute: 21 * 60 });
    expect(formatSelectionRange(selectionFromMinutes(day, 18 * 60, 21 * 60))).toBe("6:00 PM – 9:00 PM");
    expect(formatSelectionRange(selectionFromMinutes(day, 21 * 60, 19 * 60))).toBe("7:00 PM – 9:00 PM");
  });

  it("refuses a zero-length range and stays inside the civil clock", () => {
    for (let anchor = 0; anchor <= DAY_AXIS_MINUTES; anchor += SELECTION_INCREMENT_MINUTES) {
      for (let current = 0; current <= DAY_AXIS_MINUTES; current += SELECTION_INCREMENT_MINUTES) {
        const range = normalizeLocalRange(anchor, current);
        expect(range.endMinute).toBeGreaterThan(range.startMinute);
        expect(range.endMinute - range.startMinute).toBeGreaterThanOrEqual(SELECTION_INCREMENT_MINUTES);
        expect(range.startMinute).toBeGreaterThanOrEqual(0);
        expect(range.endMinute).toBeLessThanOrEqual(DAY_AXIS_MINUTES);
      }
    }
    expect(normalizeLocalRange(18 * 60, 18 * 60)).toEqual({
      startMinute: 18 * 60,
      endMinute: 18 * 60 + SELECTION_INCREMENT_MINUTES,
    });
    expect(normalizeLocalRange(DAY_AXIS_MINUTES, DAY_AXIS_MINUTES)).toEqual({
      startMinute: DAY_AXIS_MINUTES - SELECTION_INCREMENT_MINUTES,
      endMinute: DAY_AXIS_MINUTES,
    });
    const full = selectionFromMinutes(day, 0, DAY_AXIS_MINUTES);
    expect(full.civilDate).toBe(day);
    expect(full).toEqual({ civilDate: day, startMinute: 0, endMinute: DAY_AXIS_MINUTES });
  });

  it("rounds geometry back to the snapped local minutes", () => {
    const raw = minuteFromPointerY(100, 1440);
    const snapped = snapMinute(raw);
    expect(snapMinute(minuteFromAxisRatio(axisRatioFromMinute(snapped)))).toBe(snapped);
    const selection = selectionFromMinutes(day, snapped, snapped + 40);
    const frame = selectionFrame(selection);
    expect(snapMinute(minuteFromAxisRatio(frame.top))).toBe(selection.startMinute);
    expect(snapMinute(minuteFromAxisRatio(frame.top + frame.height))).toBe(selection.endMinute);
    expect(frame.top).toBeGreaterThanOrEqual(0);
    expect(frame.top + frame.height).toBeLessThanOrEqual(1);
  });
});

describe("day selection gesture", () => {
  it("keeps the hold and the scroll slop explicit", () => {
    expect(SELECTION_HOLD_MS).toBe(220);
    expect(SELECTION_MOVE_SLOP_PX).toBe(10);
  });

  it("lets a touch drag before the hold scroll, then ignores a late hold", () => {
    let session = down(initialSelectionSession(), { pointerType: "touch", ratio: 0.75, y: 100 });
    expect(session.visible).toBeNull();
    session = reduceSelection(session, {
      type: "move",
      pointerId: 1,
      pointerType: "touch",
      ratio: 0.8,
      x: 0,
      y: 100 + SELECTION_MOVE_SLOP_PX + 1,
      civilDate: day,
    });
    expect(session.gesture.phase).toBe("idle");
    expect(session.visible).toBeNull();
    session = reduceSelection(session, { type: "hold", pointerId: 1, civilDate: day });
    expect(session.visible).toBeNull();
  });

  it("selects on a touch hold, follows the drag, and keeps the range after release", () => {
    let session = down(initialSelectionSession(), { pointerType: "touch", ratio: 18 / 24, y: 400 });
    session = reduceSelection(session, { type: "hold", pointerId: 1, civilDate: day });
    expect(session.visible).toEqual({ civilDate: day, startMinute: 18 * 60, endMinute: 18 * 60 + 15 });
    session = reduceSelection(session, {
      type: "move",
      pointerId: 1,
      pointerType: "touch",
      ratio: 21 / 24,
      x: 0,
      y: 700,
      civilDate: day,
    });
    session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 21 / 24, civilDate: day });
    expect(session.gesture).toEqual({ phase: "idle" });
    expect(session.visible).toEqual({ civilDate: day, startMinute: 18 * 60, endMinute: 21 * 60 });
  });

  it("normalizes an upward touch drag", () => {
    let session = down(initialSelectionSession(), { pointerType: "touch", ratio: 21 / 24, y: 200 });
    session = reduceSelection(session, { type: "hold", pointerId: 1, civilDate: day });
    session = reduceSelection(session, {
      type: "move",
      pointerId: 1,
      pointerType: "touch",
      ratio: 19 / 24,
      x: 0,
      y: 40,
      civilDate: day,
    });
    expect(session.visible).toEqual({ civilDate: day, startMinute: 19 * 60, endMinute: 21 * 60 });
  });

  it("treats a touch tap as one increment and a later tap as a replacement", () => {
    let session = down(initialSelectionSession(), { pointerType: "touch", ratio: 18 / 24, y: 10 });
    session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 18 / 24, civilDate: day });
    expect(session.visible).toEqual({ civilDate: day, startMinute: 18 * 60, endMinute: 18 * 60 + 15 });
    session = down(session, { pointerType: "touch", ratio: 10 / 24, y: 10 });
    session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 10 / 24, civilDate: day });
    expect(session.visible).toEqual({ civilDate: day, startMinute: 10 * 60, endMinute: 10 * 60 + 15 });
  });

  it("selects immediately for a mouse or a pen, including an upward drag", () => {
    for (const pointerType of ["mouse", "pen"]) {
      let session = down(initialSelectionSession(), { pointerType, ratio: 21 / 24, y: 80 });
      expect(session.gesture.phase).toBe("selecting");
      session = reduceSelection(session, {
        type: "move",
        pointerId: 1,
        pointerType,
        ratio: 19 / 24,
        x: 4,
        y: 20,
        civilDate: day,
      });
      session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 19 / 24, civilDate: day });
      expect(session.visible).toEqual({ civilDate: day, startMinute: 19 * 60, endMinute: 21 * 60 });
    }
  });

  it("restores the previous range when the gesture is cancelled", () => {
    let session = down(initialSelectionSession(), { ratio: 18 / 24 });
    session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 21 / 24, civilDate: day });
    const kept = session.visible;
    session = down(session, { pointerType: "touch", ratio: 8 / 24, y: 50 });
    session = reduceSelection(session, { type: "hold", pointerId: 1, civilDate: day });
    session = reduceSelection(session, { type: "cancel", pointerId: 1 });
    expect(session.visible).toEqual(kept);
    expect(session.gesture).toEqual({ phase: "idle" });
  });

  it("clears on an explicit clear and on discard", () => {
    let session = down(initialSelectionSession(), { ratio: 18 / 24 });
    session = reduceSelection(session, { type: "up", pointerId: 1, ratio: 18 / 24, civilDate: day });
    expect(reduceSelection(session, { type: "clear" }).visible).toBeNull();
    expect(reduceSelection(session, { type: "discard" }).visible).toBeNull();
    expect(reduceSelection(session, { type: "discard" }).gesture).toEqual({ phase: "idle" });
  });

  it("stores a civil date and local minutes, not a pointer position", () => {
    const session = reduceSelection(down(initialSelectionSession(), { ratio: 18 / 24, x: 40, y: 900 }), {
      type: "up",
      pointerId: 1,
      ratio: 21 / 24,
      civilDate: day,
    });
    const visible = session.visible as TimeSelection;
    expect(Object.keys(visible).sort()).toEqual(["civilDate", "endMinute", "startMinute"]);
    expect(visible).not.toHaveProperty("x");
    expect(visible).not.toHaveProperty("y");
    expect(session.gesture).toEqual({ phase: "idle" });
  });
});

describe("day selection clock", () => {
  it("names a spring-forward gap and leaves an ordinary hour alone", () => {
    const gap = selectionFromMinutes("2026-03-08", 2 * 60, 3 * 60);
    const morning = selectionFromMinutes("2026-03-08", 10 * 60, 11 * 60);
    expect(selectionLocalClock(gap, "America/Denver")).toBe("absent");
    expect(selectionLocalClock(morning, "America/Denver")).toBe("ordinary");
    expect(gap).toEqual({ civilDate: "2026-03-08", startMinute: 120, endMinute: 180 });
  });

  it("names a repeated fall-back hour without changing the local range", () => {
    const repeated = selectionFromMinutes("2026-11-01", 60, 120);
    const later = selectionFromMinutes("2026-11-01", 10 * 60, 11 * 60);
    expect(selectionLocalClock(repeated, "America/Denver")).toBe("repeated");
    expect(selectionLocalClock(later, "America/Denver")).toBe("ordinary");
    expect(repeated).toEqual({ civilDate: "2026-11-01", startMinute: 60, endMinute: 120 });
    expect(formatSelectionRange(repeated)).toBe("1:00 AM – 2:00 AM");
  });

  it("leaves an ordinary civil day unmarked", () => {
    const selection = selectionFromMinutes(day, 18 * 60, 21 * 60);
    expect(selectionLocalClock(selection, "America/Boise")).toBe("ordinary");
    expect(formatSelectionRange(selection)).toBe("6:00 PM – 9:00 PM");
    expect(formatSelectionRange(selection)).not.toMatch(/available|free|open|conflict/i);
  });
});

describe("day selection boundaries", () => {
  it("does not persist, compose Timeline, or infer availability", () => {
    const selection = readFileSync(new URL("./daySelection.ts", import.meta.url), "utf8");
    const canvas = readFileSync(new URL("./DayCanvas.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    expect(selection).not.toMatch(/supabase|projectTimeline|Date\.now|capacity|availability|conflict/i);
    expect(canvas).not.toMatch(/supabase|projectTimeline|Date\.now|capacity|conflict|draggable/);
    expect(canvas).not.toContain("resolvedOptions");
    expect(schedule).toContain("noteCanvasReload");
    expect(schedule).toContain("if (!managing) setSelectionDiscard");
    expect(selection).not.toContain("protected_time");
    expect(selection).not.toContain("commitment");
  });
});
