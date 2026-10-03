"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Icon } from "@/components/Icon";
import { LocalTimeField } from "@/components/LocalTimeField";
import {
  CHANGE_MEANING_LABEL,
  INTENDED_MEANINGS,
  MEANING_QUESTION,
  SELECTION_HOLD_MS,
  SELECTION_MOVE_SLOP_PX,
  formatSelectionRange,
  initialSelectionSession,
  intendedMeaningCopy,
  localRangeOrder,
  localRangeOrderSentence,
  minuteFromAxisRatio,
  minuteToLocalText,
  ratioFromVisiblePointer,
  reduceSelection,
  selectionClockSentence,
  selectionFrame,
  selectionLocalClock,
  type IntendedMeaning,
  type SelectionSession,
  type TimeSelection,
} from "@/components/daySelection";
import { localTimeToTwelveHour, twelveHourToLocalTime, type TwelveHourClock } from "@/components/twelveHourTime";
import { localMinutes, parseLocalTime, formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import { DAY_AXIS_MINUTES, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";

/**
 * Display floor for a timed fact. It is not the fact's duration.
 * True duration stays on `data-minutes`.
 * A selection does not use this floor. Its height is the selected clock span.
 */
export const DAY_CANVAS_MIN_VISUAL_HEIGHT = "1.75rem";

const AXIS_HEIGHT = "78rem";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const PROTECTED_HATCH =
  "repeating-linear-gradient(135deg, transparent, transparent 4px, rgb(168 162 158 / 0.35) 4px, rgb(168 162 158 / 0.35) 5px)";

const HINT = "Hold briefly, then drag, to select time. A tap selects 15 minutes.";

function ratioOnSurface(surface: HTMLElement, clientY: number): number {
  const rect = surface.getBoundingClientRect();
  const scroller = surface.closest("[data-axis-scroll]")?.getBoundingClientRect();
  return ratioFromVisiblePointer(
    clientY,
    { top: rect.top, height: rect.height },
    scroller ? { top: scroller.top, height: scroller.height } : null,
  );
}

export function DayCanvas({
  selectedDay,
  today,
  phase,
  error,
  model,
  timeZone,
  discardToken,
  onPreviousDay,
  onNextDay,
  onToday,
}: {
  selectedDay: string;
  today: string | null;
  phase: "loading" | "ready" | "error";
  error: string | null;
  model: DayCanvasModel | null;
  timeZone: string;
  discardToken: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}) {
  return (
    <DayCanvasSession
      key={`${selectedDay}:${discardToken}`}
      selectedDay={selectedDay}
      today={today}
      phase={phase}
      error={error}
      model={model}
      timeZone={timeZone}
      onPreviousDay={onPreviousDay}
      onNextDay={onNextDay}
      onToday={onToday}
    />
  );
}

function DayCanvasSession({
  selectedDay,
  today,
  phase,
  error,
  model,
  timeZone,
  onPreviousDay,
  onNextDay,
  onToday,
}: {
  selectedDay: string;
  today: string | null;
  phase: "loading" | "ready" | "error";
  error: string | null;
  model: DayCanvasModel | null;
  timeZone: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}) {
  const [session, setSession] = useState<SelectionSession>(initialSelectionSession);
  const sessionRef = useRef(session);
  const selectingRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endGesture = useRef<(() => void) | null>(null);

  function publish(next: SelectionSession) {
    sessionRef.current = next;
    selectingRef.current = next.gesture.phase === "selecting";
    setSession(next);
  }

  function clearHold() {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function detach() {
    endGesture.current?.();
    endGesture.current = null;
  }

  const surfaceReady = phase === "ready" && model?.axis === "local-clock" && model.selectedDay === selectedDay;

  useEffect(() => {
    const surface = surfaceRef.current;
    return () => {
      const gesture = sessionRef.current.gesture;
      endGesture.current?.();
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
      if (gesture.phase !== "idle" && surface) {
        try {
          if (surface.hasPointerCapture(gesture.pointerId)) surface.releasePointerCapture(gesture.pointerId);
        } catch {
          // The surface is already gone.
        }
      }
    };
  }, [surfaceReady]);

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node || !surfaceReady) return;
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.changedTouches[0] ?? event.touches[0];
      if (!touch) return;
      const ratio = ratioOnSurface(node, touch.clientY);
      const gesture = sessionRef.current.gesture;
      if (selectingRef.current && gesture.phase === "selecting") {
        event.preventDefault();
        publish(
          reduceSelection(sessionRef.current, {
            type: "move",
            pointerId: gesture.pointerId,
            pointerType: "touch",
            ratio,
            x: touch.clientX,
            y: touch.clientY,
            civilDate: selectedDay,
          }),
        );
        return;
      }
      if (gesture.phase !== "pending") return;
      if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) <= SELECTION_MOVE_SLOP_PX) return;
      clearHold();
      publish(
        reduceSelection(sessionRef.current, {
          type: "move",
          pointerId: gesture.pointerId,
          pointerType: "touch",
          ratio,
          x: touch.clientX,
          y: touch.clientY,
          civilDate: selectedDay,
        }),
      );
    };
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => node.removeEventListener("touchmove", onTouchMove);
  }, [surfaceReady, selectedDay]);

  function releaseCapture(surface: HTMLDivElement, pointerId: number) {
    try {
      if (surface.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
    } catch {
      // Pointer capture is not available in every environment.
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const surface = event.currentTarget;
    const ratioOf = (clientY: number) => ratioOnSurface(surface, clientY);
    const visibleNow = sessionRef.current.visible;
    if (sessionRef.current.gesture.phase === "idle" && visibleNow) {
      const minute = minuteFromAxisRatio(ratioOf(event.clientY));
      if (minute >= visibleNow.startMinute && minute < visibleNow.endMinute) return;
    }
    const pointerId = event.pointerId;
    const kind = event.pointerType;
    detach();
    clearHold();

    const onMove = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      const next = reduceSelection(sessionRef.current, {
        type: "move",
        pointerId,
        pointerType: kind,
        ratio: ratioOf(native.clientY),
        x: native.clientX,
        y: native.clientY,
        civilDate: selectedDay,
      });
      if (next.gesture.phase === "idle") clearHold();
      publish(next);
    };
    const stop = () => {
      clearHold();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      endGesture.current = null;
    };
    const onUp = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      const next = reduceSelection(sessionRef.current, {
        type: "up",
        pointerId,
        ratio: ratioOf(native.clientY),
        civilDate: selectedDay,
      });
      stop();
      releaseCapture(surface, pointerId);
      publish(next);
    };
    const onCancel = (native: PointerEvent) => {
      if (native.pointerId !== pointerId) return;
      const next = reduceSelection(sessionRef.current, { type: "cancel", pointerId });
      stop();
      releaseCapture(surface, pointerId);
      publish(next);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    endGesture.current = stop;

    publish(
      reduceSelection(sessionRef.current, {
        type: "down",
        pointerId,
        pointerType: kind,
        ratio: ratioOf(event.clientY),
        x: event.clientX,
        y: event.clientY,
        civilDate: selectedDay,
      }),
    );

    if (kind === "touch") {
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        const held = reduceSelection(sessionRef.current, {
          type: "hold",
          pointerId,
          civilDate: selectedDay,
        });
        if (held.gesture.phase !== "selecting") return;
        try {
          surface.setPointerCapture(pointerId);
        } catch {
          // Capture keeps the drag on this surface after the hold. Selection still follows the pointer.
        }
        publish(held);
      }, SELECTION_HOLD_MS);
      return;
    }

    event.preventDefault();
    try {
      surface.setPointerCapture(pointerId);
    } catch {
      // Mouse and pen still update from the window listener.
    }
  }

  function clearSelection() {
    const gesture = sessionRef.current.gesture;
    detach();
    clearHold();
    if (gesture.phase !== "idle" && surfaceRef.current) releaseCapture(surfaceRef.current, gesture.pointerId);
    publish(initialSelectionSession());
  }

  function chooseMeaning(meaning: IntendedMeaning) {
    publish(reduceSelection(sessionRef.current, { type: "choose", meaning }));
  }

  function changeMeaning() {
    publish(reduceSelection(sessionRef.current, { type: "change-meaning" }));
  }

  function refineBounds(startMinute: number, endMinute: number) {
    publish(reduceSelection(sessionRef.current, { type: "refine", startMinute, endMinute }));
  }

  const visible = session.visible;
  const clock = visible ? selectionLocalClock(visible, timeZone) : "ordinary";

  return (
    <section className="mt-4" aria-labelledby="day-canvas-heading">
      <h2 id="day-canvas-heading" className="sr-only">
        Day
      </h2>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={onPreviousDay}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-stone-700 text-stone-200"
        >
          <Icon icon={ChevronLeft} />
        </button>
        <time dateTime={selectedDay} className="text-center text-base font-medium">
          {formatCivilDateLabel(selectedDay)}
        </time>
        <button
          type="button"
          aria-label="Next day"
          onClick={onNextDay}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-stone-700 text-stone-200"
        >
          <Icon icon={ChevronRight} />
        </button>
      </div>
      {today && selectedDay !== today ? (
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={onToday} className="min-h-11 px-3 text-sm text-stone-300">
            Today
          </button>
        </div>
      ) : null}

      {phase === "loading" ? <p className="mt-4 text-sm text-stone-300">Loading this day.</p> : null}
      {phase === "error" && error ? (
        <p role="alert" className="mt-4 text-sm text-stone-200">
          {error}
        </p>
      ) : null}

      {phase === "ready" && model && model.selectedDay === selectedDay ? (
        <DayCanvasBody
          model={model}
          surfaceRef={surfaceRef}
          selection={visible}
          selectionSettled={session.gesture.phase === "idle"}
          intendedMeaning={session.intendedMeaning}
          clockSentence={selectionClockSentence(clock)}
          clock={clock}
          onPointerDown={onPointerDown}
          onClear={clearSelection}
          onChooseMeaning={chooseMeaning}
          onChangeMeaning={changeMeaning}
          onRefine={refineBounds}
        />
      ) : null}
    </section>
  );
}

function DayCanvasBody({
  model,
  surfaceRef,
  selection,
  selectionSettled,
  intendedMeaning,
  clockSentence,
  clock,
  onPointerDown,
  onClear,
  onChooseMeaning,
  onChangeMeaning,
  onRefine,
}: {
  model: DayCanvasModel;
  surfaceRef: RefObject<HTMLDivElement | null>;
  selection: TimeSelection | null;
  selectionSettled: boolean;
  intendedMeaning: IntendedMeaning | null;
  clockSentence: string | null;
  clock: "ordinary" | "absent" | "repeated";
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onClear: () => void;
  onChooseMeaning: (meaning: IntendedMeaning) => void;
  onChangeMeaning: () => void;
  onRefine: (startMinute: number, endMinute: number) => void;
}) {
  return (
    <div className="mt-4 max-w-full">
      {model.clockLabelNote ? <p className="text-sm leading-6 text-stone-400">{model.clockLabelNote}</p> : null}
      {model.allDay.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="All day">
          {model.allDay.map((fact) => (
            <li
              key={`${fact.sourceKind}:${fact.sourceId}`}
              data-region="all-day"
              data-source-kind={fact.sourceKind}
              className={listedClass(fact.sourceKind)}
              aria-label={fact.accessibleLabel}
            >
              <FactText kind={fact.kindLabel} primary={fact.primary} detail={fact.detail} />
            </li>
          ))}
        </ul>
      ) : null}
      {model.unresolved.length > 0 ? (
        <section className="mt-3" aria-label="Unresolved time">
          <h3 className="text-sm text-stone-400">Unresolved time</h3>
          <p className="mt-1 text-sm text-stone-400">Time could not be positioned for this date.</p>
          <ul className="mt-2 space-y-2">
            {model.unresolved.map((fact) => (
              <li
                key={`${fact.sourceKind}:${fact.sourceId}`}
                data-region="unresolved"
                data-source-kind={fact.sourceKind}
                className="rounded-md border border-stone-700 px-2 py-2 text-stone-300"
                aria-label={fact.accessibleLabel}
              >
                <FactText kind={fact.kindLabel} primary={fact.primary} detail={fact.detail} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {selection && !selectionSettled ? (
        <div className="mt-3 flex items-start justify-between gap-3" data-clock={clock} data-selection-readout="dragging">
          <div>
            <p data-selection-label className="text-sm text-stone-100">
              <span className="sr-only">Selected time </span>
              {formatSelectionRange(selection)}
            </p>
            {clockSentence ? <p className="mt-1 text-sm text-stone-400">{clockSentence}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selected time"
            className="min-h-11 shrink-0 px-3 text-sm text-stone-300"
          >
            Clear
          </button>
        </div>
      ) : !selection && model.axis === "local-clock" ? (
        <p id="day-selection-hint" className="mt-3 text-sm text-stone-500">
          {HINT}
        </p>
      ) : null}
      {model.axis === "local-clock" ? (
        <div className="relative mt-4 max-h-[28rem] max-w-full" data-canvas-frame="true">
          <TimedAxis model={model} surfaceRef={surfaceRef} selection={selection} onPointerDown={onPointerDown} />
          {selection && selectionSettled ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-3">
              <TemporalHandoff
                key={`${selection.civilDate}:${selection.startMinute}:${selection.endMinute}`}
                selection={selection}
                intendedMeaning={intendedMeaning}
                clockSentence={clockSentence}
                clock={clock}
                onClear={onClear}
                onChooseMeaning={onChooseMeaning}
                onChangeMeaning={onChangeMeaning}
                onRefine={onRefine}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TemporalHandoff({
  selection,
  intendedMeaning,
  clockSentence,
  clock,
  onClear,
  onChooseMeaning,
  onChangeMeaning,
  onRefine,
}: {
  selection: TimeSelection;
  intendedMeaning: IntendedMeaning | null;
  clockSentence: string | null;
  clock: "ordinary" | "absent" | "repeated";
  onClear: () => void;
  onChooseMeaning: (meaning: IntendedMeaning) => void;
  onChangeMeaning: () => void;
  onRefine: (startMinute: number, endMinute: number) => void;
}) {
  const [draft, setDraft] = useState<BoundDraft | null>(null);
  const shown = draft ?? draftFromSelection(selection);
  const problem = draft ? draftProblem(shown) : null;

  function edit(next: BoundDraft) {
    const minutes = minutesFromDraft(next);
    if (!minutes || localRangeOrder(minutes.startMinute, minutes.endMinute) !== "valid") {
      setDraft(next);
      return;
    }
    setDraft(null);
    onRefine(minutes.startMinute, minutes.endMinute);
  }

  return (
    <div
      data-temporal-handoff="true"
      role="region"
      aria-label="Selected time"
      data-clock={clock}
      className="pointer-events-auto max-h-full w-full max-w-full overflow-y-auto rounded-md border border-stone-600 bg-stone-950/95 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p data-selection-label className="text-sm text-stone-100">
          <span className="sr-only">Selected time </span>
          {formatSelectionRange(selection)}
        </p>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected time"
          className="min-h-11 shrink-0 px-3 text-sm text-stone-300"
        >
          Clear
        </button>
      </div>
      {clockSentence ? <p className="mt-2 text-sm text-stone-400">{clockSentence}</p> : null}
      <div className="mt-3 space-y-3">
        <LocalTimeField label="Start" value={shown.start} onChange={(start) => edit({ ...shown, start })} />
        {shown.endOfCivilDay ? (
          <p className="text-sm text-stone-300">
            <span className="font-medium text-stone-100">End. </span>
            End of this civil day
          </p>
        ) : (
          <LocalTimeField label="End" value={shown.end} onChange={(end) => edit({ ...shown, end, endOfCivilDay: false })} />
        )}
        <button
          type="button"
          aria-pressed={shown.endOfCivilDay}
          onClick={() => edit({ ...shown, endOfCivilDay: !shown.endOfCivilDay })}
          className="min-h-11 max-w-full text-left text-sm text-stone-300"
        >
          End of this civil day
        </button>
      </div>
      {problem ? (
        <p data-range-order={problem} className="mt-2 text-sm text-stone-300">
          {localRangeOrderSentence(problem)}
        </p>
      ) : null}
      <MeaningChoice
        intendedMeaning={intendedMeaning}
        onChooseMeaning={onChooseMeaning}
        onChangeMeaning={onChangeMeaning}
      />
    </div>
  );
}

type BoundDraft = {
  start: TwelveHourClock;
  end: TwelveHourClock;
  endOfCivilDay: boolean;
};

function draftFromSelection(selection: TimeSelection): BoundDraft {
  const endOfCivilDay = selection.endMinute >= DAY_AXIS_MINUTES;
  const endMinute = endOfCivilDay ? 23 * 60 + 59 : selection.endMinute;
  return {
    start: localTimeToTwelveHour(minuteToLocalText(selection.startMinute)),
    end: localTimeToTwelveHour(minuteToLocalText(endMinute)),
    endOfCivilDay,
  };
}

function minutesFromDraft(draft: BoundDraft): { startMinute: number; endMinute: number } | null {
  const startText = twelveHourToLocalTime(draft.start);
  if (!startText) return null;
  if (draft.endOfCivilDay) {
    return { startMinute: localMinutes(parseLocalTime(startText)), endMinute: DAY_AXIS_MINUTES };
  }
  const endText = twelveHourToLocalTime(draft.end);
  if (!endText) return null;
  return {
    startMinute: localMinutes(parseLocalTime(startText)),
    endMinute: localMinutes(parseLocalTime(endText)),
  };
}

function draftProblem(draft: BoundDraft): Exclude<ReturnType<typeof localRangeOrder>, "valid"> | null {
  const minutes = minutesFromDraft(draft);
  if (!minutes) return "incomplete";
  const order = localRangeOrder(minutes.startMinute, minutes.endMinute);
  return order === "valid" ? null : order;
}

function MeaningChoice({
  intendedMeaning,
  onChooseMeaning,
  onChangeMeaning,
}: {
  intendedMeaning: IntendedMeaning | null;
  onChooseMeaning: (meaning: IntendedMeaning) => void;
  onChangeMeaning: () => void;
}) {
  if (intendedMeaning) {
    const copy = intendedMeaningCopy(intendedMeaning);
    return (
      <div className="mt-3 max-w-full" data-meaning-choice={intendedMeaning} aria-live="polite">
        <p className="text-sm text-stone-100">{copy.title}</p>
        <p className="mt-1 text-sm text-stone-400">{copy.sentence}</p>
        <button
          type="button"
          onClick={onChangeMeaning}
          className="mt-1 min-h-11 max-w-full px-0 text-left text-sm text-stone-300"
        >
          {CHANGE_MEANING_LABEL}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 max-w-full" data-meaning-choice="asking" aria-live="polite">
      <p id="meaning-question" className="text-sm text-stone-300">
        {MEANING_QUESTION}
      </p>
      <div role="group" aria-labelledby="meaning-question" className="mt-1 flex max-w-full flex-col">
        {INTENDED_MEANINGS.map((item) => (
          <button
            key={item.meaning}
            type="button"
            data-meaning-action={item.meaning}
            onClick={() => onChooseMeaning(item.meaning)}
            className="min-h-11 max-w-full border-t border-stone-800 px-0 text-left text-sm text-stone-200 first:border-t-0"
          >
            {item.action}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimedAxis({
  model,
  surfaceRef,
  selection,
  onPointerDown,
}: {
  model: DayCanvasModel;
  surfaceRef: RefObject<HTMLDivElement | null>;
  selection: TimeSelection | null;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="max-h-[28rem] max-w-full overflow-y-auto" data-axis-scroll="midnight">
      <div className="flex max-w-full pt-3" data-axis="local-clock">
        <div className="relative w-14 shrink-0" style={{ height: AXIS_HEIGHT }}>
          {HOURS.map((hour) => (
            <span
              key={hour}
              data-hour={hour}
              className="absolute right-2 w-12 -translate-y-1/2 text-right text-xs text-stone-500"
              style={{ top: `${(hour / 24) * 100}%` }}
            >
              {formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:00`)}
            </span>
          ))}
        </div>
        <div
          ref={surfaceRef}
          data-time-surface="true"
          onPointerDown={onPointerDown}
          className="relative min-w-0 flex-1 touch-pan-y select-none border-l border-stone-800"
          style={{ height: AXIS_HEIGHT }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              data-hour-line={hour}
              className="pointer-events-none absolute inset-x-0 border-t border-stone-800/80"
              style={{ top: `${(hour / 24) * 100}%` }}
            />
          ))}
          {model.context.map((item) => (
            <TimedFact key={`${item.sourceKind}:${item.sourceId}`} item={item} />
          ))}
          {model.foreground.map((item) => (
            <TimedFact key={`${item.sourceKind}:${item.sourceId}`} item={item} />
          ))}
          {selection ? <TimeSelectionMark selection={selection} /> : null}
        </div>
      </div>
    </div>
  );
}

export function TimeSelectionMark({ selection }: { selection: TimeSelection }) {
  const frame = selectionFrame(selection);
  return (
    <div
      data-selection="time"
      data-start-minute={selection.startMinute}
      data-end-minute={selection.endMinute}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 border-y-2 border-stone-100 bg-stone-100/15"
      style={{ top: `${frame.top * 100}%`, height: `${frame.height * 100}%` }}
    />
  );
}

function TimedFact({ item }: { item: DayCanvasTimedPlacement }) {
  const minutes = item.visibleEndMinute - item.visibleStartMinute;
  return (
    <article
      data-source-kind={item.sourceKind}
      data-layer={item.layer}
      data-lane={item.lane}
      data-lane-count={item.laneCount}
      data-minutes={minutes}
      data-start-minute={item.visibleStartMinute}
      data-end-minute={item.visibleEndMinute}
      data-clipped={item.clipped ? "true" : "false"}
      aria-label={item.accessibleLabel}
      className={`pointer-events-none absolute overflow-hidden px-1 py-0.5 ${placementClass(item)}`}
      style={placementStyle(item)}
    >
      <FactText
        kind={item.kindLabel}
        primary={item.primary}
        detail={item.shownInterval ?? item.sourceInterval}
        quiet={item.contextName}
      />
    </article>
  );
}

function FactText({
  kind,
  primary,
  detail,
  quiet,
}: {
  kind: string;
  primary: string;
  detail: string;
  quiet?: string | null;
}) {
  return (
    <>
      <p className="truncate text-[11px] leading-4">
        <span className="text-stone-400">{kind}</span>
        <span className="text-stone-500"> · </span>
        {primary}
      </p>
      <p className="truncate text-[11px] leading-4 text-stone-400">{detail}</p>
      {quiet ? <p className="truncate text-[11px] leading-4 text-stone-500">{quiet}</p> : null}
    </>
  );
}

function listedClass(sourceKind: DayCanvasTimedPlacement["sourceKind"]): string {
  if (sourceKind === "work_schedule") return "rounded-md border-l-2 border-stone-500 bg-stone-800/40 px-2 py-2 text-stone-300";
  if (sourceKind === "protected_time") {
    return "rounded-md border border-dashed border-stone-500 px-2 py-2 text-stone-300";
  }
  if (sourceKind === "block") return "rounded-md border border-stone-300 bg-stone-900 px-2 py-2 text-stone-100";
  return "rounded-md border border-stone-400 px-2 py-2 text-stone-100";
}

function placementClass(item: DayCanvasTimedPlacement): string {
  if (item.sourceKind === "work_schedule") return "z-0 border-l-2 border-stone-500 bg-stone-800/35 text-stone-400";
  if (item.sourceKind === "protected_time") return "z-[1] border border-dashed border-stone-500 text-stone-300";
  if (item.sourceKind === "block") return "z-10 border border-stone-300 bg-stone-900/95 text-stone-100";
  return "z-10 border border-stone-400 bg-stone-950/95 text-stone-100";
}

function placementStyle(item: DayCanvasTimedPlacement): {
  top: string;
  height: string;
  minHeight: string;
  left?: string;
  width?: string;
  backgroundImage?: string;
} {
  const frame = {
    top: `${item.top * 100}%`,
    height: `${item.height * 100}%`,
    minHeight: DAY_CANVAS_MIN_VISUAL_HEIGHT,
  };
  if (item.layer === "context") {
    return item.sourceKind === "protected_time" ? { ...frame, backgroundImage: PROTECTED_HATCH } : frame;
  }
  return {
    ...frame,
    left: `calc(0.375rem + ${item.lane} * (100% - 0.75rem) / ${item.laneCount})`,
    width: `calc((100% - 0.75rem) / ${item.laneCount} - 0.125rem)`,
  };
}
