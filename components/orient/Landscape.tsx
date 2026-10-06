"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { FactAddress } from "@/components/factAddress";
import {
  accessibleFactName,
  kindContour,
  labelStackIndex,
  markEmphasis,
  monthClockAxis,
  monthVisualSpan,
  type ContextFocus,
} from "@/components/orient/grammar";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import { DAY_AXIS_MINUTES, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";

export function Landscape({
  models,
  words,
  focus,
  contextFor,
  onRefer,
  onAskDay,
  onShift,
  today,
  offFor,
}: {
  models: readonly DayCanvasModel[];
  words: boolean;
  focus: ContextFocus;
  contextFor: (kind: TimelineSourceKind, id: string) => string | null;
  onRefer: (facts: FactAddress[]) => void;
  onAskDay: (civilDate: string) => void;
  onShift: (days: number) => void;
  today: string | null;
  offFor: (civilDate: string) => boolean;
}) {
  const drag = useRef<{ x: number; pointerId: number } | null>(null);
  const wheel = useRef(0);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, pointerId: event.pointerId };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const width = event.currentTarget.clientWidth / Math.max(models.length, 1);
    if (!(width > 0)) return;
    const steps = Math.round((start.x - event.clientX) / width);
    if (steps !== 0) onShift(steps);
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!Number.isFinite(delta) || delta === 0) return;
    wheel.current += delta;
    if (Math.abs(wheel.current) < 48) return;
    const steps = wheel.current > 0 ? 1 : -1;
    wheel.current = 0;
    onShift(steps);
  }

  const timed = models.flatMap((model) => [...model.context, ...model.foreground]);
  const axis = words ? null : monthClockAxis(timed);

  return (
    <div
      data-landscape="true"
      data-distance={words ? "week" : "month"}
      data-framed={words ? "centered" : undefined}
      data-month-geometry={words ? undefined : "7x4"}
      data-month-axis={axis ? `${Math.round(axis.startMinute)}-${Math.round(axis.endMinute)}` : undefined}
      className="orient-landscape"
      role="group"
      aria-label="Temporal landscape"
    >
      {axis && (axis.startMinute > 0 || axis.endMinute < DAY_AXIS_MINUTES) ? (
        <p className="orient-axis" data-clock-axis="true">
          <span className="sr-only">Local clock from </span>
          {clockLabel(axis.startMinute)}
          <span aria-hidden="true"> – </span>
          <span className="sr-only"> to </span>
          {clockLabel(axis.endMinute)}
        </p>
      ) : null}
      {words ? (
      <div className="orient-landscape-days" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onWheel={onWheel}>
      {models.map((model) => {
        const placements = [...model.context, ...model.foreground];
        const label = formatCivilDateLabel(model.selectedDay);
        const weekday = label.split(",")[0] ?? label;
        const dayNumber = String(Number(model.selectedDay.slice(8)));
        return (
          <section
            key={model.selectedDay}
            className="orient-column"
            data-civil-day={model.selectedDay}
            data-today={today === model.selectedDay ? "true" : "false"}
          >
            <div className="orient-column-body">
              {model.allDay.map((fact) => (
                <button
                  key={`${fact.sourceKind}:${fact.sourceId}`}
                  type="button"
                  data-source-kind={fact.sourceKind}
                  data-source-id={fact.sourceId}
                  data-kind={fact.sourceKind}
                  data-contour={kindContour(fact.sourceKind)}
                  className="orient-fact orient-fact-all-day"
                  aria-label={fact.accessibleLabel}
                  onClick={() => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }])}
                >
                  {words ? fact.kindLabel : null}
                </button>
              ))}
              {placements.map((placement) => {
                const contextId =
                  placement.stored?.sourceKind === "block"
                    ? placement.stored.contextId
                    : contextFor(placement.sourceKind, placement.sourceId);
                const emphasis = markEmphasis({ sourceKind: placement.sourceKind, contextId, focus });
                const stack = labelStackIndex(placement, placements);
                const box = axis
                  ? monthVisualSpan(placement.visibleStartMinute, placement.visibleEndMinute, axis)
                  : { top: placement.top, height: Math.max(placement.height, 0.012) };
                return (
                  <button
                    key={`${placement.sourceKind}:${placement.sourceId}`}
                    type="button"
                    data-source-kind={placement.sourceKind}
                    data-source-id={placement.sourceId}
                    data-kind={placement.sourceKind}
                    data-contour={kindContour(placement.sourceKind)}
                    data-emphasis={emphasis}
                    data-top={`${placement.top * 100}%`}
                    className="orient-fact"
                    aria-label={accessibleFactName(placement.accessibleLabel, emphasis)}
                    style={{
                      top: `${box.top * 100}%`,
                      height: `${box.height * 100}%`,
                    }}
                    onClick={() => onRefer(sharing(placement, placements))}
                  >
                    {words ? (
                      <span style={{ display: "block", marginTop: `${stack * 0.7}rem` }}>{placement.kindLabel}</span>
                    ) : null}
                  </button>
                );
              })}
              {today === model.selectedDay ? <div data-present-mark="true" className="orient-now" aria-label="Now" /> : null}
            </div>
            <footer className="orient-column-foot">
              {offFor(model.selectedDay) ? (
                <span data-work-off="true" className="orient-off">
                  Off
                </span>
              ) : null}
              <button
                type="button"
                className="orient-day-ask"
                aria-label={`Ask Day, ${label}`}
                onClick={() => onAskDay(model.selectedDay)}
              >
                {words ? <span className="orient-coordinate-day">{weekday}</span> : null}
                <span className="orient-coordinate-num">{dayNumber}</span>
                <span className="sr-only">{label}</span>
              </button>
            </footer>
          </section>
        );
      })}
      </div>
      ) : (
        <div
          className="orient-month"
          role="grid"
          aria-label="Twenty-eight civil dates"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        >
          {monthRows(models).map((row, rowIndex) => (
            <div key={row[0]?.selectedDay ?? rowIndex} className="orient-month-row" data-month-row={rowIndex} role="row">
              {row.map((model) => {
                const placements = [...model.context, ...model.foreground];
                const label = formatCivilDateLabel(model.selectedDay);
                const weekday = label.split(",")[0] ?? label;
                const dayNumber = String(Number(model.selectedDay.slice(8)));
                return (
                  <section
                    key={model.selectedDay}
                    className="orient-aperture"
                    data-civil-day={model.selectedDay}
                    data-today={today === model.selectedDay ? "true" : "false"}
                    role="gridcell"
                  >
                    <button
                      type="button"
                      className="orient-aperture-ground"
                      data-ask-day={model.selectedDay}
                      aria-label={`Ask Day, ${label}`}
                      onClick={() => onAskDay(model.selectedDay)}
                    />
                    <button
                      type="button"
                      className="orient-day-ask"
                      aria-label={`Ask Day, ${label}`}
                      onClick={() => onAskDay(model.selectedDay)}
                    >
                      <span className="orient-coordinate-day">{weekday}</span>
                      <span className="orient-coordinate-num">{dayNumber}</span>
                      <span className="sr-only">{label}</span>
                    </button>
                    <div className="orient-aperture-field">
                      {model.allDay.map((fact) => (
                        <button
                          key={`${fact.sourceKind}:${fact.sourceId}`}
                          type="button"
                          data-source-kind={fact.sourceKind}
                          data-source-id={fact.sourceId}
                          data-kind={fact.sourceKind}
                          data-contour={kindContour(fact.sourceKind)}
                          className="orient-fact orient-fact-all-day"
                          aria-label={fact.accessibleLabel}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }]);
                          }}
                        />
                      ))}
                      {placements.map((placement) => {
                        const contextId =
                          placement.stored?.sourceKind === "block"
                            ? placement.stored.contextId
                            : contextFor(placement.sourceKind, placement.sourceId);
                        const emphasis = markEmphasis({ sourceKind: placement.sourceKind, contextId, focus });
                        const box = axis
                          ? monthVisualSpan(placement.visibleStartMinute, placement.visibleEndMinute, axis)
                          : { top: placement.top, height: Math.max(placement.height, 0.015) };
                        return (
                          <button
                            key={`${placement.sourceKind}:${placement.sourceId}`}
                            type="button"
                            data-source-kind={placement.sourceKind}
                            data-source-id={placement.sourceId}
                            data-kind={placement.sourceKind}
                            data-contour={kindContour(placement.sourceKind)}
                            data-emphasis={emphasis}
                            data-top={`${placement.top * 100}%`}
                            className="orient-fact"
                            aria-label={accessibleFactName(placement.accessibleLabel, emphasis)}
                            style={{
                              top: `${box.top * 100}%`,
                              height: `${box.height * 100}%`,
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRefer(sharing(placement, placements));
                            }}
                          />
                        );
                      })}
                      {today === model.selectedDay ? <div data-present-mark="true" className="orient-now" aria-label="Now" /> : null}
                      {offFor(model.selectedDay) ? (
                        <span data-work-off="true" className="orient-off">
                          Off
                        </span>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function monthRows(models: readonly DayCanvasModel[]): DayCanvasModel[][] {
  const rows: DayCanvasModel[][] = [];
  for (let index = 0; index < models.length; index += 7) rows.push(models.slice(index, index + 7));
  return rows;
}

function sharing(placement: DayCanvasTimedPlacement, placements: readonly DayCanvasTimedPlacement[]): FactAddress[] {
  return placements
    .filter(
      (other) =>
        other.visibleStartMinute < placement.visibleEndMinute && placement.visibleStartMinute < other.visibleEndMinute,
    )
    .map((other) => ({ sourceKind: other.sourceKind, sourceId: other.sourceId }));
}

function clockLabel(minute: number): string {
  const bounded = Math.min(Math.max(Math.floor(minute), 0), DAY_AXIS_MINUTES - 1);
  const hour = Math.floor(bounded / 60);
  const min = bounded % 60;
  return formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
}
