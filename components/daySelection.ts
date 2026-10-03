import { DAY_AXIS_MINUTES, adjacentCivilDay } from "@/projections/dayCanvas";
import { formatLocalTimeLabel, instantFromZonedLocal, zonedLocalClock } from "@/domain/time/localTime";

/**
 * Transient local-clock selection on the day canvas.
 * Interaction geometry only. Not a Timeline fact, and not stored.
 * A pointer position is evidence. The selection is a civil date and local minutes.
 */

/** One quarter of an hour row. The axis is 3.25rem per hour, so this is 0.8125rem. */
export const SELECTION_INCREMENT_MINUTES = 15;

/**
 * Touch only. A vertical drag on the scrolling day is a scroll unless the finger
 * rests inside this window. 220ms is long enough for a flick to move, and short
 * of a system long-press. It is a threshold, not an inference.
 */
export const SELECTION_HOLD_MS = 220;

/** Movement beyond this, before the hold completes, means the day is scrolling. */
export const SELECTION_MOVE_SLOP_PX = 10;

const DAY_ELAPSED_MS = 24 * 60 * 60 * 1000;

export type TimeSelection = {
  civilDate: string;
  startMinute: number;
  endMinute: number;
};

export type SelectionClock = "ordinary" | "absent" | "repeated";

type PointerKind = "touch" | "mouse" | "pen";

export type SelectionGesture =
  | { phase: "idle" }
  | {
      phase: "pending";
      pointerId: number;
      kind: PointerKind;
      anchorMinute: number;
      x: number;
      y: number;
      prior: TimeSelection | null;
    }
  | {
      phase: "selecting";
      pointerId: number;
      anchorMinute: number;
      currentMinute: number;
      prior: TimeSelection | null;
    };

export type SelectionSession = {
  gesture: SelectionGesture;
  visible: TimeSelection | null;
};

type PointerSample = {
  pointerId: number;
  pointerType: string;
  ratio: number;
  x: number;
  y: number;
  civilDate: string;
};

export type SelectionInput =
  | ({ type: "down" } & PointerSample)
  | ({ type: "move" } & PointerSample)
  | { type: "up"; pointerId: number; ratio: number; civilDate: string }
  | { type: "hold"; pointerId: number; civilDate: string }
  | { type: "cancel"; pointerId: number }
  | { type: "clear" }
  | { type: "discard" };

export function initialSelectionSession(): SelectionSession {
  return { gesture: { phase: "idle" }, visible: null };
}

export function minuteFromAxisRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return clamped * DAY_AXIS_MINUTES;
}

/** `offsetY` is distance from the top of the timed surface. It is not stored. */
export function minuteFromPointerY(offsetY: number, height: number): number {
  if (!(height > 0) || !Number.isFinite(offsetY) || !Number.isFinite(height)) return 0;
  return minuteFromAxisRatio(offsetY / height);
}

type Box = { top: number; height: number };

/**
 * Maps a pointer to the timed surface. When the scrollport has a height, the
 * pointer is clamped to the visible intersection. The view does not follow.
 */
export function ratioFromVisiblePointer(clientY: number, surface: Box, scroll: Box | null): number {
  if (!(surface.height > 0) || !Number.isFinite(clientY) || !Number.isFinite(surface.top)) return 0;
  let y = clientY;
  if (scroll && scroll.height > 0 && Number.isFinite(scroll.top)) {
    const top = Math.max(surface.top, scroll.top);
    const bottom = Math.min(surface.top + surface.height, scroll.top + scroll.height);
    if (bottom > top) y = Math.min(Math.max(clientY, top), bottom);
  }
  return (y - surface.top) / surface.height;
}

export function axisRatioFromMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return Math.min(Math.max(minute, 0), DAY_AXIS_MINUTES) / DAY_AXIS_MINUTES;
}

/** Nearest increment. A tie at the halfway minute rounds toward the later boundary. */
export function snapMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  const clamped = Math.min(Math.max(minute, 0), DAY_AXIS_MINUTES);
  const snapped = Math.round(clamped / SELECTION_INCREMENT_MINUTES) * SELECTION_INCREMENT_MINUTES;
  return Math.min(Math.max(snapped, 0), DAY_AXIS_MINUTES);
}

/**
 * Orders the two boundaries and refuses a zero-length range.
 * The minimum is one snapping increment. The range stays inside this civil clock.
 */
export function normalizeLocalRange(
  anchorMinute: number,
  currentMinute: number,
): { startMinute: number; endMinute: number } {
  const anchor = snapMinute(anchorMinute);
  const current = snapMinute(currentMinute);
  let startMinute = Math.min(anchor, current);
  let endMinute = Math.max(anchor, current);
  if (endMinute <= startMinute) {
    if (startMinute >= DAY_AXIS_MINUTES) {
      startMinute = DAY_AXIS_MINUTES - SELECTION_INCREMENT_MINUTES;
      endMinute = DAY_AXIS_MINUTES;
    } else {
      endMinute = startMinute + SELECTION_INCREMENT_MINUTES;
      if (endMinute > DAY_AXIS_MINUTES) {
        startMinute = DAY_AXIS_MINUTES - SELECTION_INCREMENT_MINUTES;
        endMinute = DAY_AXIS_MINUTES;
      }
    }
  }
  return { startMinute, endMinute };
}

export function selectionFromMinutes(civilDate: string, anchorMinute: number, currentMinute: number): TimeSelection {
  return { civilDate, ...normalizeLocalRange(anchorMinute, currentMinute) };
}

export function selectionFrame(selection: TimeSelection): { top: number; height: number } {
  return {
    top: selection.startMinute / DAY_AXIS_MINUTES,
    height: (selection.endMinute - selection.startMinute) / DAY_AXIS_MINUTES,
  };
}

export function minuteToLocalText(minute: number): string {
  if (!Number.isFinite(minute) || minute <= 0 || minute >= DAY_AXIS_MINUTES) return "00:00";
  const whole = Math.trunc(minute);
  const hour = Math.floor(whole / 60);
  const mins = whole % 60;
  return `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatSelectionRange(selection: TimeSelection): string {
  const start = formatLocalTimeLabel(minuteToLocalText(selection.startMinute));
  const end = formatLocalTimeLabel(minuteToLocalText(selection.endMinute));
  if (selection.startMinute === 0 && selection.endMinute === DAY_AXIS_MINUTES) {
    return `${start} – ${end}, end of this civil day`;
  }
  return `${start} – ${end}`;
}

export function selectionClockSentence(clock: SelectionClock): string | null {
  if (clock === "absent") return "Part of this local clock range does not occur.";
  if (clock === "repeated") return "Part of this local clock range occurs twice.";
  return null;
}

/**
 * Asks whether the selected local clock minutes occur in the confirmed zone.
 * An instant used for that question is not kept. Ordinary 24-hour civil days
 * return before any minute is probed.
 */
export function selectionLocalClock(selection: TimeSelection, timeZone: string): SelectionClock {
  const elapsed = civilDayElapsedMs(selection.civilDate, timeZone);
  if (elapsed === DAY_ELAPSED_MS) return "ordinary";

  let absent = false;
  let repeated = false;
  for (
    let minute = selection.startMinute;
    minute < selection.endMinute;
    minute += SELECTION_INCREMENT_MINUTES
  ) {
    const occurrence = localMinuteOccurrence(selection.civilDate, minute, timeZone);
    if (occurrence === "absent") absent = true;
    if (occurrence === "repeated") repeated = true;
  }
  if (absent) return "absent";
  if (repeated) return "repeated";
  return "ordinary";
}

export function reduceSelection(session: SelectionSession, input: SelectionInput): SelectionSession {
  switch (input.type) {
    case "clear":
    case "discard":
      return initialSelectionSession();
    case "down":
      return beginGesture(session, input);
    case "hold":
      return holdGesture(session, input.pointerId, input.civilDate);
    case "move":
      return moveGesture(session, input);
    case "up":
      return releaseGesture(session, input.pointerId, input.civilDate);
    case "cancel":
      return cancelGesture(session, input.pointerId);
    default:
      return session;
  }
}

function beginGesture(
  session: SelectionSession,
  input: Extract<SelectionInput, { type: "down" }>,
): SelectionSession {
  const anchorMinute = snapMinute(minuteFromAxisRatio(input.ratio));
  const kind = pointerKind(input.pointerType);
  if (kind === "touch") {
    return {
      gesture: {
        phase: "pending",
        pointerId: input.pointerId,
        kind,
        anchorMinute,
        x: input.x,
        y: input.y,
        prior: session.visible,
      },
      visible: session.visible,
    };
  }
  return {
    gesture: {
      phase: "selecting",
      pointerId: input.pointerId,
      anchorMinute,
      currentMinute: anchorMinute,
      prior: session.visible,
    },
    visible: selectionFromMinutes(input.civilDate, anchorMinute, anchorMinute),
  };
}

function holdGesture(session: SelectionSession, pointerId: number, civilDate: string): SelectionSession {
  const gesture = session.gesture;
  if (gesture.phase !== "pending" || gesture.pointerId !== pointerId || gesture.kind !== "touch") {
    return session;
  }
  return {
    gesture: {
      phase: "selecting",
      pointerId,
      anchorMinute: gesture.anchorMinute,
      currentMinute: gesture.anchorMinute,
      prior: gesture.prior,
    },
    visible: selectionFromMinutes(civilDate, gesture.anchorMinute, gesture.anchorMinute),
  };
}

function moveGesture(
  session: SelectionSession,
  input: Extract<SelectionInput, { type: "move" }>,
): SelectionSession {
  const gesture = session.gesture;
  if (gesture.phase === "idle" || gesture.pointerId !== input.pointerId) return session;
  if (gesture.phase === "pending") {
    if (Math.hypot(input.x - gesture.x, input.y - gesture.y) <= SELECTION_MOVE_SLOP_PX) return session;
    return { gesture: { phase: "idle" }, visible: gesture.prior };
  }
  const currentMinute = snapMinute(minuteFromAxisRatio(input.ratio));
  return {
    gesture: { ...gesture, currentMinute },
    visible: selectionFromMinutes(input.civilDate, gesture.anchorMinute, currentMinute),
  };
}

function releaseGesture(session: SelectionSession, pointerId: number, civilDate: string): SelectionSession {
  const gesture = session.gesture;
  if (gesture.phase === "idle" || gesture.pointerId !== pointerId) return session;
  if (gesture.phase === "pending") {
    return {
      gesture: { phase: "idle" },
      visible: selectionFromMinutes(civilDate, gesture.anchorMinute, gesture.anchorMinute),
    };
  }
  return { gesture: { phase: "idle" }, visible: session.visible };
}

function cancelGesture(session: SelectionSession, pointerId: number): SelectionSession {
  const gesture = session.gesture;
  if (gesture.phase === "idle" || gesture.pointerId !== pointerId) return session;
  return { gesture: { phase: "idle" }, visible: gesture.prior };
}

function pointerKind(pointerType: string): PointerKind {
  if (pointerType === "touch") return "touch";
  if (pointerType === "pen") return "pen";
  return "mouse";
}

function civilDayElapsedMs(civilDate: string, timeZone: string): number | null {
  try {
    const start = instantFromZonedLocal(civilDate, "00:00", timeZone);
    const end = instantFromZonedLocal(adjacentCivilDay(civilDate, 1), "00:00", timeZone);
    return end.getTime() - start.getTime();
  } catch {
    return null;
  }
}

function localMinuteOccurrence(
  civilDate: string,
  minute: number,
  timeZone: string,
): "once" | "absent" | "repeated" {
  let instant: Date;
  try {
    instant = instantFromZonedLocal(civilDate, minuteToLocalText(minute), timeZone);
  } catch {
    return "absent";
  }
  try {
    const later = zonedLocalClock(new Date(instant.getTime() + 60 * 60 * 1000), timeZone);
    const earlier = zonedLocalClock(new Date(instant.getTime() - 60 * 60 * 1000), timeZone);
    const same = (clock: { civilDate: string; hour: number; minute: number }) =>
      clock.civilDate === civilDate && clock.hour * 60 + clock.minute === minute;
    if (same(later) || same(earlier)) return "repeated";
  } catch {
    return "once";
  }
  return "once";
}
