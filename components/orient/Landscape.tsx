"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
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
import {
  proposeTemporalPlacement,
  rawMinuteOnColumnBody,
  unquantizedLiftStart,
  type TemporalProposal,
} from "@/components/orient/temporalProposal";
import { localMinutes, parseLocalTime, formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import { adjacentCivilDay, DAY_AXIS_MINUTES, type DayCanvasModel, type DayCanvasStoredFact, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";

/** Desktop Week jitter floor. An interaction constant, not a domain rule, and not the day-selection slop. */
const WEEK_LIFT_JITTER_PX = 10;

type LiftKind = "protected_time" | "block" | "commitment";

type EligiblePress = {
  sourceKind: LiftKind;
  sourceId: string;
  startsOn: string;
  startLocal: string;
  endLocal: string;
  grabOffsetMinutes: number;
};

type PointerClaim =
  | { phase: "pan"; pointerId: number; x: number }
  | ({ phase: "pending"; pointerId: number; x: number; y: number } & EligiblePress)
  | ({ phase: "lifted"; pointerId: number; x: number; y: number; captured: boolean } & EligiblePress);

type LiftPaint = {
  sourceKind: LiftKind;
  sourceId: string;
  proposal: TemporalProposal | null;
};

export function Landscape({
  models,
  words,
  focus,
  contextFor,
  onRefer,
  onAskDay,
  onShift,
  onPropose,
  directManipulation = false,
  probeDetailOpen = false,
  onProbeDetailClear,
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
  onPropose?: (fact: FactAddress, proposal: TemporalProposal) => void;
  directManipulation?: boolean;
  /** Temporary Desktop Week probe. True only after a proposal has opened FactDetail. */
  probeDetailOpen?: boolean;
  onProbeDetailClear?: () => void;
  today: string | null;
  offFor: (civilDate: string) => boolean;
}) {
  const claim = useRef<PointerClaim | null>(null);
  const daysRef = useRef<HTMLDivElement | null>(null);
  const wheel = useRef(0);
  const suppressClick = useRef(false);
  const suppressTimer = useRef<number | null>(null);
  const [lifted, setLifted] = useState<LiftPaint | null>(null);
  const [probe, setProbe] = useState<DtmProbe>(emptyProbe);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const cancelRef = useRef<(paint: boolean) => void>(() => {});
  const probing = words && directManipulation;

  function describeTarget(target: Element): string {
    const classes = [...target.classList].slice(0, 4).join(".");
    return classes ? `${target.tagName.toLowerCase()}.${classes}` : target.tagName.toLowerCase();
  }

  function provisionalNodeMounted(): boolean {
    return Boolean(daysRef.current?.querySelector("[data-provisional]"));
  }

  function noteDown(event: ReactPointerEvent<HTMLDivElement>, eligible: boolean, pending: boolean) {
    if (!probing) return;
    origin.current = { x: event.clientX, y: event.clientY };
    const target = event.target instanceof Element ? describeTarget(event.target) : "non-element";
    setProbe({
      ...emptyProbe(),
      down: true,
      target,
      pointerId: String(event.pointerId),
      pointerType: event.pointerType || "—",
      eligible,
      pending,
    });
    onProbeDetailClear?.();
  }

  function noteMove(
    event: ReactPointerEvent<HTMLDivElement>,
    phase: string,
    math: { dx: number; dy: number; panHalf: boolean; jitter: boolean; vertical: boolean } | null,
  ) {
    if (!probing) return;
    const from = origin.current;
    const dx = math ? math.dx : from ? event.clientX - from.x : null;
    const dy = math ? math.dy : from ? event.clientY - from.y : null;
    setProbe((prev) => ({
      ...prev,
      moves: prev.moves + 1,
      dx: dx === null ? prev.dx : dx.toFixed(1),
      dy: dy === null ? prev.dy : dy.toFixed(1),
      total: dx === null || dy === null ? prev.total : Math.hypot(dx, dy).toFixed(1),
      pendingAtMove: phase === "pending",
      panHalf: math ? math.panHalf : prev.panHalf,
      jitter: math ? math.jitter : prev.jitter,
      vertical: math ? math.vertical : prev.vertical,
      qualified: math ? math.jitter && math.vertical && !math.panHalf : prev.qualified,
    }));
  }

  function noteLift(threw: boolean, hasCapture: boolean, proposalInitialized: boolean) {
    if (!probing) return;
    setProbe((prev) => ({
      ...prev,
      lift: true,
      captureTry: true,
      captureThrew: threw,
      captured: hasCapture,
      proposalInit: proposalInitialized,
    }));
  }

  function noteLost(state: string) {
    if (!probing) return;
    const mounted = provisionalNodeMounted();
    setProbe((prev) => ({ ...prev, lost: true, lostState: state, provisional: prev.provisional || mounted }));
  }

  function noteCancel(state: string) {
    if (!probing) return;
    const mounted = provisionalNodeMounted();
    setProbe((prev) => ({ ...prev, cancel: true, cancelState: state, provisional: prev.provisional || mounted }));
  }

  function noteUp(state: string, column: boolean, emitted: boolean) {
    if (!probing) return;
    const mounted = provisionalNodeMounted();
    setProbe((prev) => ({
      ...prev,
      up: true,
      upState: state,
      column,
      proposal: emitted,
      provisional: prev.provisional || mounted,
    }));
  }

  function latchProvisional() {
    if (!probing || !provisionalNodeMounted()) return;
    setProbe((prev) => (prev.provisional ? prev : { ...prev, provisional: true }));
  }

  function resetProbe() {
    origin.current = null;
    setProbe(emptyProbe());
    onProbeDetailClear?.();
  }

  function rememberClickSuppression() {
    suppressClick.current = true;
    if (suppressTimer.current !== null) window.clearTimeout(suppressTimer.current);
    suppressTimer.current = window.setTimeout(() => {
      suppressClick.current = false;
      suppressTimer.current = null;
    }, 0);
  }

  function releaseCapture(current: PointerClaim) {
    if (current.phase !== "lifted" || !current.captured) return;
    try {
      daysRef.current?.releasePointerCapture(current.pointerId);
    } catch {
      // Capture may already be gone.
    }
  }

  function cancelManipulation(paint: boolean) {
    const current = claim.current;
    if (!current || current.phase === "pan") return;
    claim.current = null;
    if (current.phase === "lifted") {
      releaseCapture(current);
      rememberClickSuppression();
    }
    if (paint) {
      latchProvisional();
      setLifted(null);
    }
  }

  useEffect(() => {
    cancelRef.current = cancelManipulation;
  });

  useEffect(() => {
    if (directManipulation) return;
    cancelRef.current(true);
  }, [directManipulation]);

  useEffect(() => {
    return () => {
      if (suppressTimer.current !== null) window.clearTimeout(suppressTimer.current);
    };
  }, []);

  const setDays = useCallback((node: HTMLDivElement | null) => {
    const previous = daysRef.current;
    if (previous && previous !== node) {
      const current = claim.current;
      if (current?.phase === "lifted" && current.captured) {
        try {
          previous.releasePointerCapture(current.pointerId);
        } catch {
          // The row is leaving.
        }
      }
      if (current && current.phase !== "pan") {
        claim.current = null;
        setLifted(null);
      }
    }
    daysRef.current = node;
  }, []);

  useEffect(() => {
    if (!lifted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelRef.current(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lifted]);

  function referFromClick(event: ReactMouseEvent<HTMLButtonElement>, refer: () => void) {
    if (suppressClick.current && event.detail !== 0) {
      suppressClick.current = false;
      return;
    }
    refer();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (claim.current?.phase === "lifted") {
      releaseCapture(claim.current);
      claim.current = null;
      setLifted(null);
    }
    const eligible = words && directManipulation ? eligiblePress(event, models) : null;
    if (eligible) {
      claim.current = { phase: "pending", pointerId: event.pointerId, x: event.clientX, y: event.clientY, ...eligible };
      noteDown(event, true, true);
      return;
    }
    claim.current = { phase: "pan", pointerId: event.pointerId, x: event.clientX };
    noteDown(event, false, false);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = claim.current;
    if (!current || current.pointerId !== event.pointerId || current.phase === "pan") {
      noteMove(event, current?.phase ?? "none", null);
      return;
    }
    if (current.phase === "pending") {
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      const width = event.currentTarget.clientWidth / Math.max(models.length, 1);
      noteMove(event, "pending", {
        dx,
        dy,
        panHalf: width > 0 && Math.abs(dx) >= width / 2,
        jitter: Math.hypot(dx, dy) > WEEK_LIFT_JITTER_PX,
        vertical: Math.abs(dy) > Math.abs(dx),
      });
      if (width > 0 && Math.abs(dx) >= width / 2) {
        claim.current = { phase: "pan", pointerId: current.pointerId, x: current.x };
        return;
      }
      if (Math.hypot(dx, dy) > WEEK_LIFT_JITTER_PX && Math.abs(dy) > Math.abs(dx)) beginLift(current, event);
      return;
    }
    noteMove(event, "lifted", null);
    const proposal = proposalUnderPointer(event.currentTarget, current, event.clientX, event.clientY);
    setLifted((paint) => {
      if (!paint || sameProposal(paint.proposal, proposal)) return paint;
      return { ...paint, proposal };
    });
  }

  function beginLift(current: Extract<PointerClaim, { phase: "pending" }>, event: ReactPointerEvent<HTMLDivElement>) {
    let captured = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      captured = true;
    } catch {
      captured = false;
    }
    let hasCapture = false;
    if (captured) {
      try {
        hasCapture = event.currentTarget.hasPointerCapture(event.pointerId);
      } catch {
        hasCapture = false;
      }
    }
    const liftedClaim: PointerClaim = { ...current, phase: "lifted", captured };
    claim.current = liftedClaim;
    const proposal = proposalUnderPointer(event.currentTarget, current, event.clientX, event.clientY);
    noteLift(!captured, hasCapture, proposal !== null);
    setLifted({
      sourceKind: current.sourceKind,
      sourceId: current.sourceId,
      proposal,
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = claim.current;
    if (!current || current.pointerId !== event.pointerId) {
      noteUp(current?.phase ?? "none", false, false);
      return;
    }
    if (current.phase === "lifted") {
      const hit = columnBodyAt(event.currentTarget, event.clientX, event.clientY);
      noteUp("lifted", hit !== null, Boolean(hit && onPropose));
      claim.current = null;
      releaseCapture(current);
      rememberClickSuppression();
      setLifted(null);
      if (!hit || !onPropose) return;
      const start = unquantizedLiftStart(rawMinuteOnColumnBody(event.clientY, hit.rect.top, hit.rect.height), current.grabOffsetMinutes);
      onPropose(
        { sourceKind: current.sourceKind, sourceId: current.sourceId },
        proposeTemporalPlacement(
          { startsOn: current.startsOn, startLocal: current.startLocal, endLocal: current.endLocal },
          hit.date,
          start,
        ),
      );
      return;
    }
    noteUp(current.phase, false, false);
    claim.current = null;
    const width = event.currentTarget.clientWidth / Math.max(models.length, 1);
    if (!(width > 0)) return;
    const steps = Math.round((current.x - event.clientX) / width);
    if (steps !== 0) onShift(steps);
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const current = claim.current;
    noteCancel(!current ? "none" : current.pointerId === event.pointerId ? current.phase : `${current.phase}/other-pointer`);
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.phase === "lifted" || current.phase === "pending") cancelManipulation(true);
    else claim.current = null;
  }

  function onLostPointerCapture(event: ReactPointerEvent<HTMLDivElement>) {
    const current = claim.current;
    const lostState = !current ? "none" : current.pointerId !== event.pointerId ? `${current.phase}/other-pointer` : current.phase;
    noteLost(lostState);
    if (!current || current.phase !== "lifted" || current.pointerId !== event.pointerId) return;
    claim.current = null;
    rememberClickSuppression();
    setLifted(null);
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (claim.current?.phase === "lifted") return;
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
  const provisionalMountedNow =
    probing && lifted !== null && models.some((model) => provisionalSlices(lifted, model.selectedDay).length > 0);
  const shownProbe = probing ? { ...probe, provisional: probe.provisional || provisionalMountedNow, detail: probe.detail || probeDetailOpen } : probe;

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
      {probing ? (
        <aside className="orient-dtm-probe" data-dtm-probe="true" aria-label="DTM probe">
          <pre>{formatProbe(shownProbe)}</pre>
          <button type="button" data-dtm-reset="true" onClick={resetProbe}>
            Reset probe
          </button>
        </aside>
      ) : null}
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
      <div
        ref={setDays}
        className="orient-landscape-days"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onWheel={onWheel}
      >
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
                  onClick={(event) => referFromClick(event, () => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }]))}
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
                    onClick={(event) => referFromClick(event, () => onRefer(sharing(placement, placements)))}
                  >
                    {words ? (
                      <span style={{ display: "block", marginTop: `${stack * 0.7}rem` }}>{placement.kindLabel}</span>
                    ) : null}
                  </button>
                );
              })}
              {today === model.selectedDay ? <div data-present-mark="true" className="orient-now" aria-label="Now" /> : null}
              {provisionalSlices(lifted, model.selectedDay).map((slice) => (
                <div
                  key={`${slice.top}:${slice.height}`}
                  data-provisional="true"
                  data-source-kind={lifted?.sourceKind}
                  data-source-id={lifted?.sourceId}
                  data-kind={lifted?.sourceKind}
                  aria-hidden="true"
                  className="orient-fact orient-provisional"
                  style={{ top: `${slice.top * 100}%`, height: `${slice.height * 100}%` }}
                />
              ))}
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

function eligiblePress(event: ReactPointerEvent<HTMLDivElement>, models: readonly DayCanvasModel[]): EligiblePress | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const button = target.closest("button.orient-fact");
  if (!(button instanceof HTMLButtonElement) || button.classList.contains("orient-fact-all-day")) return null;
  const sourceKind = button.getAttribute("data-source-kind");
  const sourceId = button.getAttribute("data-source-id");
  if (!isLiftKind(sourceKind) || !sourceId) return null;
  const date = button.closest("[data-civil-day]")?.getAttribute("data-civil-day");
  if (!date) return null;
  const model = models.find((item) => item.selectedDay === date);
  const placement = model && [...model.context, ...model.foreground].find((item) => item.sourceKind === sourceKind && item.sourceId === sourceId);
  const stored = placement?.stored;
  if (!stored || stored.startsOn !== date || !hasClock(stored)) return null;
  const body = button.closest(".orient-column-body");
  if (!(body instanceof HTMLElement)) return null;
  let startMinute: number;
  try {
    startMinute = localMinutes(parseLocalTime(stored.startLocal));
  } catch {
    return null;
  }
  const rect = body.getBoundingClientRect();
  return {
    sourceKind,
    sourceId,
    startsOn: stored.startsOn,
    startLocal: stored.startLocal,
    endLocal: stored.endLocal,
    grabOffsetMinutes: rawMinuteOnColumnBody(event.clientY, rect.top, rect.height) - startMinute,
  };
}

function isLiftKind(kind: string | null): kind is LiftKind {
  return kind === "protected_time" || kind === "block" || kind === "commitment";
}

function hasClock(stored: DayCanvasStoredFact): stored is DayCanvasStoredFact & { startLocal: string; endLocal: string } {
  return "startLocal" in stored && "endLocal" in stored;
}

function columnBodyAt(root: HTMLElement, x: number, y: number): { date: string; rect: DOMRect } | null {
  const bodies = [...root.querySelectorAll<HTMLElement>(":scope > .orient-column > .orient-column-body")];
  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    if (!body) continue;
    const rect = body.getBoundingClientRect();
    const last = index === bodies.length - 1;
    const insideX = x >= rect.left && (last ? x <= rect.right : x < rect.right);
    const insideY = y >= rect.top && y < rect.bottom;
    if (!insideX || !insideY) continue;
    const date = body.closest("[data-civil-day]")?.getAttribute("data-civil-day");
    if (date) return { date, rect };
  }
  return null;
}

function proposalUnderPointer(
  root: HTMLElement,
  current: EligiblePress,
  clientX: number,
  clientY: number,
): TemporalProposal | null {
  const hit = columnBodyAt(root, clientX, clientY);
  if (!hit) return null;
  const start = unquantizedLiftStart(rawMinuteOnColumnBody(clientY, hit.rect.top, hit.rect.height), current.grabOffsetMinutes);
  return proposeTemporalPlacement(
    { startsOn: current.startsOn, startLocal: current.startLocal, endLocal: current.endLocal },
    hit.date,
    start,
  );
}

function sameProposal(left: TemporalProposal | null, right: TemporalProposal | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.startsOn === right.startsOn && left.startLocal === right.startLocal && left.endLocal === right.endLocal;
}

function provisionalSlices(lifted: LiftPaint | null, civilDate: string): { top: number; height: number }[] {
  if (!lifted?.proposal) return [];
  const slice = sliceOnDate(lifted.proposal, civilDate);
  return slice ? [slice] : [];
}

function sliceOnDate(proposal: TemporalProposal, civilDate: string): { top: number; height: number } | null {
  let start: number;
  let end: number;
  try {
    start = localMinutes(parseLocalTime(proposal.startLocal));
    end = localMinutes(parseLocalTime(proposal.endLocal));
  } catch {
    return null;
  }
  const overnight = end <= start;
  if (civilDate === proposal.startsOn) {
    const visible = (overnight ? DAY_AXIS_MINUTES : end) - start;
    if (visible <= 0) return null;
    return { top: start / DAY_AXIS_MINUTES, height: Math.max(visible / DAY_AXIS_MINUTES, 0.012) };
  }
  if (overnight && civilDate === adjacentCivilDay(proposal.startsOn, 1)) {
    if (end <= 0) return null;
    return { top: 0, height: Math.max(end / DAY_AXIS_MINUTES, 0.012) };
  }
  return null;
}

function clockLabel(minute: number): string {
  const bounded = Math.min(Math.max(Math.floor(minute), 0), DAY_AXIS_MINUTES - 1);
  const hour = Math.floor(bounded / 60);
  const min = bounded % 60;
  return formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
}

/** Temporary Desktop Week readout. Local component state only. */
type DtmProbe = {
  down: boolean;
  target: string;
  pointerId: string;
  pointerType: string;
  eligible: boolean;
  pending: boolean;
  moves: number;
  dx: string;
  dy: string;
  total: string;
  pendingAtMove: boolean;
  panHalf: boolean;
  jitter: boolean;
  vertical: boolean;
  qualified: boolean;
  lift: boolean;
  captureTry: boolean;
  captureThrew: boolean;
  captured: boolean;
  lost: boolean;
  lostState: string;
  cancel: boolean;
  cancelState: string;
  up: boolean;
  upState: string;
  column: boolean;
  proposalInit: boolean;
  proposal: boolean;
  provisional: boolean;
  detail: boolean;
};

function emptyProbe(): DtmProbe {
  return {
    down: false,
    target: "—",
    pointerId: "—",
    pointerType: "—",
    eligible: false,
    pending: false,
    moves: 0,
    dx: "—",
    dy: "—",
    total: "—",
    pendingAtMove: false,
    panHalf: false,
    jitter: false,
    vertical: false,
    qualified: false,
    lift: false,
    captureTry: false,
    captureThrew: false,
    captured: false,
    lost: false,
    lostState: "—",
    cancel: false,
    cancelState: "—",
    up: false,
    upState: "—",
    column: false,
    proposalInit: false,
    proposal: false,
    provisional: false,
    detail: false,
  };
}

function formatProbe(probe: DtmProbe): string {
  const yn = (value: boolean) => (value ? "yes" : "no");
  return [
    "DTM probe",
    `down ${yn(probe.down)}`,
    `eligible ${yn(probe.eligible)}`,
    `pending ${yn(probe.pending)}`,
    `target ${probe.target}`,
    `pointer ${probe.pointerId}`,
    `type ${probe.pointerType}`,
    `moves ${probe.moves}`,
    `dx ${probe.dx}`,
    `dy ${probe.dy}`,
    `dist ${probe.total}`,
    `pending-at-move ${yn(probe.pendingAtMove)}`,
    `pan-half ${yn(probe.panHalf)}`,
    `jitter ${yn(probe.jitter)}`,
    `vertical ${yn(probe.vertical)}`,
    `qualified ${yn(probe.qualified)}`,
    `lift ${yn(probe.lift)}`,
    `capture-try ${yn(probe.captureTry)}`,
    `capture-threw ${yn(probe.captureThrew)}`,
    `capture ${yn(probe.captured)}`,
    `lost-capture ${yn(probe.lost)} (${probe.lostState})`,
    `cancel ${yn(probe.cancel)} (${probe.cancelState})`,
    `up ${yn(probe.up)} (${probe.upState})`,
    `column ${yn(probe.column)}`,
    `proposal-init ${yn(probe.proposalInit)}`,
    `proposal ${yn(probe.proposal)}`,
    `provisional ${yn(probe.provisional)}`,
    `detail ${yn(probe.detail)}`,
  ].join("\n");
}
