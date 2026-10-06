"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { factAddress, type FactAddress } from "@/components/factAddress";
import {
  minuteFromAxisRatio,
  ratioFromVisiblePointer,
  reduceSelection,
  selectionFrame,
  SELECTION_HOLD_MS,
  SELECTION_MOVE_SLOP_PX,
  snapMinute,
  type SelectionSession,
} from "@/components/daySelection";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import type { DayCanvasModel, DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";
import {
  accessibleFactName,
  kindContour,
  labelStackIndex,
  markEmphasis,
  minuteFraction,
  type ContextFocus,
} from "@/components/orient/grammar";

function ratioOnSurface(surface: HTMLElement, clientY: number): number {
  const rect = surface.getBoundingClientRect();
  const scroller = surface.closest("[data-field-scroll]")?.getBoundingClientRect();
  return ratioFromVisiblePointer(
    clientY,
    { top: rect.top, height: rect.height },
    scroller ? { top: scroller.top, height: scroller.height } : null,
  );
}

export function factsUnderPointer(surface: HTMLElement, x: number, y: number): FactAddress[] {
  const boxes: {
    sourceKind: FactAddress["sourceKind"];
    sourceId: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
  }[] = [];
  surface.querySelectorAll<HTMLElement>("article[data-source-kind][data-source-id]").forEach((article) => {
    const address = factAddress(article.dataset.sourceKind ?? "", article.dataset.sourceId ?? "");
    if (!address) return;
    const box = article.getBoundingClientRect();
    boxes.push({ ...address, left: box.left, top: box.top, right: box.right, bottom: box.bottom });
  });
  return boxes
    .filter((box) => x >= box.left && x < box.right && y >= box.top && y < box.bottom)
    .map((box) => ({ sourceKind: box.sourceKind, sourceId: box.sourceId }));
}

function hourLabel(hour: number): string {
  return formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:00`);
}

export function DayClock({
  model,
  manipulate,
  focus,
  contextFor,
  session,
  sessionRef,
  publish,
  onRefer,
  remainder,
  presentMinute,
  gloss,
  off,
  tenseFor,
}: {
  model: DayCanvasModel;
  manipulate: boolean;
  focus: ContextFocus;
  contextFor: (kind: TimelineSourceKind, id: string) => string | null;
  session: SelectionSession;
  sessionRef: { current: SelectionSession };
  publish: (next: SelectionSession) => void;
  onRefer: (facts: FactAddress[]) => void;
  remainder: { startMinute: number; endMinute: number }[];
  presentMinute: number | null;
  gloss: boolean;
  off: boolean;
  tenseFor: (placement: DayCanvasTimedPlacement) => "past" | "present" | "future";
}) {
  const holdTimer = useRef<number | null>(null);
  const arm = useRef<"reducer" | "fact-wait">("reducer");
  const hits = useRef<FactAddress[]>([]);
  const origin = useRef<{ x: number; y: number; ratio: number; pointerId: number } | null>(null);
  const placements = [...model.context, ...model.foreground];
  const selecting = session.gesture.phase === "selecting";
  const frame = session.visible?.civilDate === model.selectedDay ? selectionFrame(session.visible) : null;

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  useEffect(() => clearHold, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!manipulate || event.button !== 0 || event.isPrimary === false) return;
    const surface = event.currentTarget;
    const ratio = ratioOnSurface(surface, event.clientY);
    const facts = factsUnderPointer(surface, event.clientX, event.clientY);
    hits.current = facts;
    origin.current = { x: event.clientX, y: event.clientY, ratio, pointerId: event.pointerId };
    clearHold();
    if (event.pointerType !== "touch" && facts.length > 0) {
      arm.current = "fact-wait";
      return;
    }
    arm.current = "reducer";
    publish(
      reduceSelection(sessionRef.current, {
        type: "down",
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        ratio,
        x: event.clientX,
        y: event.clientY,
        civilDate: model.selectedDay,
      }),
    );
    if (event.pointerType === "touch") {
      const pointerId = event.pointerId;
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        const held = reduceSelection(sessionRef.current, {
          type: "hold",
          pointerId,
          civilDate: model.selectedDay,
        });
        if (held.gesture.phase === "selecting") {
          hits.current = [];
          try {
            surface.setPointerCapture(pointerId);
          } catch {
            // Pointer capture is best-effort.
          }
        }
        publish(held);
      }, SELECTION_HOLD_MS);
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = origin.current;
    if (!manipulate || !start || start.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (arm.current === "fact-wait") {
      if (distance <= SELECTION_MOVE_SLOP_PX) return;
      arm.current = "reducer";
      hits.current = [];
      publish(
        reduceSelection(sessionRef.current, {
          type: "down",
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          ratio: start.ratio,
          x: start.x,
          y: start.y,
          civilDate: model.selectedDay,
        }),
      );
    }
    const next = reduceSelection(sessionRef.current, {
      type: "move",
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      ratio: ratioOnSurface(event.currentTarget, event.clientY),
      x: event.clientX,
      y: event.clientY,
      civilDate: model.selectedDay,
    });
    if (sessionRef.current.gesture.phase === "pending" && next.gesture.phase === "idle") {
      clearHold();
      hits.current = [];
    }
    publish(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = origin.current;
    if (!manipulate || !start || start.pointerId !== event.pointerId) return;
    clearHold();
    origin.current = null;
    if (arm.current === "fact-wait") {
      arm.current = "reducer";
      const facts = hits.current;
      hits.current = [];
      if (facts.length > 0) onRefer(facts);
      return;
    }
    if (sessionRef.current.gesture.phase === "pending" && hits.current.length > 0) {
      const facts = hits.current;
      hits.current = [];
      publish(reduceSelection(sessionRef.current, { type: "cancel", pointerId: event.pointerId }));
      onRefer(facts);
      return;
    }
    hits.current = [];
    publish(
      reduceSelection(sessionRef.current, {
        type: "up",
        pointerId: event.pointerId,
        ratio: ratioOnSurface(event.currentTarget, event.clientY),
        civilDate: model.selectedDay,
      }),
    );
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    clearHold();
    origin.current = null;
    hits.current = [];
    arm.current = "reducer";
    publish(reduceSelection(sessionRef.current, { type: "cancel", pointerId: event.pointerId }));
  }

  function dragBound(edge: "start" | "end", event: ReactPointerEvent<HTMLButtonElement>) {
    if (!manipulate || event.button !== 0 || event.isPrimary === false) return;
    const open = sessionRef.current;
    if (open.gesture.phase !== "idle" || !open.visible || open.visible.civilDate !== model.selectedDay) return;
    event.preventDefault();
    event.stopPropagation();
    const surface = event.currentTarget.closest("[data-time-surface]");
    if (!(surface instanceof HTMLElement)) return;
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    try {
      handle.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is best-effort.
    }

    const apply = (clientY: number) => {
      const live = sessionRef.current;
      if (live.gesture.phase !== "idle" || !live.visible || live.visible.civilDate !== model.selectedDay) return;
      const minute = snapMinute(minuteFromAxisRatio(ratioOnSurface(surface, clientY)));
      const startMinute = edge === "start" ? minute : live.visible.startMinute;
      const endMinute = edge === "end" ? minute : live.visible.endMinute;
      publish(reduceSelection(live, { type: "refine", startMinute, endMinute }));
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      ev.stopPropagation();
      apply(ev.clientY);
    };
    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.stopPropagation();
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", cancel);
      apply(ev.clientY);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.stopPropagation();
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", cancel);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", cancel);
  }

  if (model.axis === "unpositioned") {
    return (
      <p data-reading="unpositioned" className="orient-withheld">
        {model.clockLabelNote ?? "Time could not be positioned for this date."}
      </p>
    );
  }

  return (
    <section className="orient-day" data-civil-day={model.selectedDay}>
      <p className="orient-day-date">{formatCivilDateLabel(model.selectedDay)}</p>
      {model.clockLabelNote ? <p className="orient-note">{model.clockLabelNote}</p> : null}
      {off ? (
        <p className="orient-off" data-work-off="true">
          Off
        </p>
      ) : null}
      {model.allDay.length > 0 ? (
        <div className="orient-all-day">
          {model.allDay.map((fact) => (
            <button
              key={`${fact.sourceKind}:${fact.sourceId}`}
              type="button"
              className={`orient-choice orient-fact orient-fact-static`}
              data-kind={fact.sourceKind}
              data-contour={kindContour(fact.sourceKind)}
              data-source-kind={fact.sourceKind}
              data-source-id={fact.sourceId}
              aria-label={fact.accessibleLabel}
              onClick={() => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }])}
            >
              {fact.kindLabel}
            </button>
          ))}
        </div>
      ) : null}
      {model.unresolved.length > 0 ? (
        <p className="orient-withheld" data-reading="unpositioned">
          Time could not be positioned for a fact on this date.
        </p>
      ) : null}
      {gloss ? (
        <p data-silence-note="allocatable" className="orient-gloss">
          Hatched time inside the shift is allocatable remainder.
        </p>
      ) : null}
      <div
        data-time-surface="true"
        data-axis="local-clock"
        data-selecting={selecting ? "true" : "false"}
        className="orient-clock"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {Array.from({ length: 24 }, (_, hour) => (
          <div
            key={hour}
            className="orient-hour"
            data-calibration={hour % 3 === 0 ? "major" : "minor"}
            style={{ top: `${(hour / 24) * 100}%` }}
          >
            {hour % 3 === 0 ? <span>{hourLabel(hour)}</span> : null}
          </div>
        ))}
        {remainder.map((band) => (
          <div
            key={`${band.startMinute}-${band.endMinute}`}
            data-silence="allocatable"
            className="orient-remainder"
            style={{
              top: `${minuteFraction(band.startMinute) * 100}%`,
              height: `${Math.max(minuteFraction(band.endMinute - band.startMinute) * 100, 0)}%`,
            }}
            aria-hidden="true"
          />
        ))}
        {placements.map((placement) => {
          const contextId =
            placement.stored?.sourceKind === "block"
              ? placement.stored.contextId
              : contextFor(placement.sourceKind, placement.sourceId);
          const emphasis = markEmphasis({ sourceKind: placement.sourceKind, contextId, focus });
          const stack = labelStackIndex(placement, placements);
          return (
            <article
              key={`${placement.sourceKind}:${placement.sourceId}`}
              data-source-kind={placement.sourceKind}
              data-source-id={placement.sourceId}
              data-kind={placement.sourceKind}
              data-contour={kindContour(placement.sourceKind)}
              data-emphasis={emphasis}
              data-tense={tenseFor(placement)}
              data-top={`${placement.top * 100}%`}
              className="orient-fact"
              aria-label={accessibleFactName(placement.accessibleLabel, emphasis)}
              style={{
                top: `${placement.top * 100}%`,
                height: `${placement.height * 100}%`,
              }}
            >
              <span className="orient-kind-word" style={{ display: "block", marginTop: `${stack * 0.95}rem` }}>
                {placement.kindLabel}
              </span>
            </article>
          );
        })}
        {frame ? (
          <div
            data-temporal-reference="true"
            data-establishing={session.intendedMeaning ? "true" : "false"}
            className="orient-selection"
            style={{ top: `${frame.top * 100}%`, height: `${Math.max(frame.height * 100, 0.4)}%` }}
          >
            <button
              type="button"
              className="orient-bound"
              data-edge="start"
              aria-label="Refine the start of this interval"
              onPointerDown={(event) => dragBound("start", event)}
            />
            <button
              type="button"
              className="orient-bound"
              data-edge="end"
              aria-label="Refine the end of this interval"
              onPointerDown={(event) => dragBound("end", event)}
            />
          </div>
        ) : null}
        {presentMinute !== null ? (
          <div
            data-present-mark="true"
            className="orient-now"
            style={{ top: `${minuteFraction(presentMinute) * 100}%` }}
            aria-label="Now"
          />
        ) : null}
      </div>
    </section>
  );
}

