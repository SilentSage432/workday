"use client";

import { ChevronRight, Compass, Crosshair, ListTodo, Plus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { composeWorkCapacityReading } from "@/components/capacityReading";
import { initialSelectionSession, reduceSelection, type SelectionSession } from "@/components/daySelection";
import type { FactAddress } from "@/components/factAddress";
import { composeMonthReading } from "@/components/monthReading";
import { composeWeekShapeReading } from "@/components/weekReading";
import type { Block } from "@/domain/block";
import { zonedLocalClock } from "@/domain/time/localTime";
import { formatCivilDateLabel, workFiscalWeekContaining } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { composeDayCanvas, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";
import { DesktopReading, DesktopWindow } from "@/components/orient/DesktopReading";
import { DayClock } from "@/components/orient/DayField";
import {
  contentTop,
  extendSpan,
  nearEdge,
  nowScrollTarget,
  observedCivilDate,
  viewpointAfterScroll,
} from "@/components/orient/fieldScroll";
import { PhoneContinuity } from "@/components/orient/PhoneContinuity";
import type { TemporalProposal } from "@/components/orient/temporalProposal";
import { OrientIdentity } from "@/components/orient/OrientIdentity";
import { signatureScrollTop } from "@/components/orient/phoneSignature";
import {
  allocatableRemainderBands,
  civilDatesInSpan,
  explicitCivilSpan,
  orientCivilDate,
  QUESTION_LABEL,
  questionAllowsCapacityRemainder,
  questionAllowsEstablishment,
  questionAllowsReference,
  questionShowsDirection,
  shiftedAnchor,
  threadLine,
  threadRestingWeight,
  WEEK_WINDOW_DAYS,
  MONTH_WINDOW_DAYS,
  type ContextFocus,
  type OrientQuestion,
} from "@/components/orient/grammar";
import { Landscape } from "@/components/orient/Landscape";
import { ExternalCalendarsOperation } from "@/components/orient/ExternalCalendarsOperation";
import { WorkScheduleOperation, type WorkScheduleDismiss } from "@/components/orient/WorkScheduleOperation";
import {
  ActSurface,
  AddChooser,
  AllDayEstablishmentSurface,
  DirectNoteSurface,
  DirectStewardshipSurface,
  DirectTaskSurface,
  DirectionInspection,
  DirectionPlane,
  EstablishmentSurface,
  InspectionSurface,
  LookSurface,
  NotesSurface,
  StewardshipDetailSurface,
  StewardshipManageSurface,
  ThreadSurface,
} from "@/components/orient/Surfaces";
import {
  DirectRecurringTaskSurface,
  RecurringTaskDetailSurface,
  RecurringTaskManageSurface,
} from "@/components/orient/RecurringTaskSurfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import type { Context } from "@/domain/context";
import type { SourceRead } from "@/components/currentTemporalReading";
import type {
  ExternalConnectionStatus,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { Task } from "@/domain/task";
import type { ExternalTemporalTimelineContext } from "@/projections/timeline";
import "./orient.css";

type ViewpointProvenance = "follows-today" | "moved";

type QuestionPlace = { anchor: string; scroll: number | null; provenance: ViewpointProvenance };

type Surface =
  | { kind: "none" }
  | { kind: "look" }
  | { kind: "notes" }
  | { kind: "add" }
  | { kind: "act" }
  | { kind: "create-task"; returnTo?: "act" }
  | { kind: "create-stewardship"; returnTo?: "act" | "stewardship-manage" }
  | { kind: "stewardship-manage" }
  | { kind: "stewardship-detail"; definitionId: string }
  | { kind: "create-recurring-task"; returnTo?: "recurring-task-manage" }
  | { kind: "recurring-task-manage" }
  | { kind: "recurring-task-detail"; definitionId: string }
  | { kind: "create-note" }
  | { kind: "create-all-day" }
  | { kind: "thread" }
  | { kind: "facts"; facts: FactAddress[]; chosen: FactAddress | null; proposal: TemporalProposal | null }
  | { kind: "direction"; priorityId: string }
  | { kind: "work"; weekStart: string }
  | { kind: "external-calendars"; googleError: string | null };

export function OrientView({
  timeZone,
  now,
  anchor,
  onAnchor,
  loaded,
  sources,
  contexts,
  tasks,
  thread,
  capture: _capture,
  actions,
}: {
  timeZone: string;
  now: Date;
  anchor: string;
  onAnchor: (civilDate: string) => void;
  loaded: { from: string; to: string };
  sources: OrientSources;
  contexts: SourceRead<Context>;
  tasks: SourceRead<Task>;
  thread: ThreadReading;
  /** Retained for instrument bridge; establishment routes through ADD (DirectTask/DirectNote). */
  capture: CaptureBridge;
  actions: OrientActions;
}) {
  void _capture;
  const clock = now;
  const bringNow = useRef(true);
  const [question, setQuestion] = useState<OrientQuestion>("day");
  const [focus, setFocus] = useState<ContextFocus>({ kind: "everything" });
  const [surface, setSurface] = useState<Surface>(() => readExternalCalendarsSurfaceFromLocation());
  const workDismissRef = useRef<WorkScheduleDismiss | null>(null);
  const [session, setSession] = useState<SelectionSession>(initialSelectionSession);
  const [nowEdge, setNowEdge] = useState<"above" | "below" | "before" | "after" | null>(null);
  const [reduced, setReduced] = useState(false);
  const [form, setForm] = useState<"phone" | "desktop">(() => readInstrumentForm());
  const [depth, setDepth] = useState<"reading" | "exact">("reading");
  const [exactAt, setExactAt] = useState<number | null>(null);
  const [daySpan, setDaySpan] = useState<string[]>(() => [shiftedAnchor(anchor, -1), anchor, shiftedAnchor(anchor, 1)]);
  const [provenance, setProvenance] = useState<ViewpointProvenance>("follows-today");
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const places = useRef<Partial<Record<OrientQuestion, QuestionPlace>>>({});
  const previousQuestion = useRef<OrientQuestion>(question);
  const scrollLock = useRef(false);
  const anchorCause = useRef<"explicit" | "observe">("observe");
  const revealDay = useRef<string | null>(null);
  const extendHold = useRef<{ date: string; viewportTop: number } | null>(null);
  const edgeLatch = useRef<number | null>(null);
  const exactMinute = useRef<number | null>(null);
  const exactEntry = useRef(false);
  const questionChosen = useRef(false);
  const entryApplied = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 959px)");
    const apply = () => {
      const next = media.matches ? "phone" : "desktop";
      setForm((current) => (current === next ? current : next));
      if (!entryApplied.current) {
        entryApplied.current = true;
        if (next === "phone" && !questionChosen.current) setQuestion("day");
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const apply = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--orient-keyboard", `${offset}px`);
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
    };
  }, []);

  function publish(next: SelectionSession) {
    sessionRef.current = next;
    setSession(next);
  }

  function finishClose() {
    setSurface({ kind: "none" });
    const opener = openerRef.current;
    openerRef.current = null;
    queueMicrotask(() => opener?.focus());
  }

  function guardWork(proceed: () => void) {
    if (surface.kind === "work" && workDismissRef.current) {
      workDismissRef.current.requestLeave(proceed);
      return;
    }
    proceed();
  }

  function closeSurface() {
    guardWork(finishClose);
  }

  function openFrom(event: { currentTarget: HTMLElement }, next: Surface) {
    const target = event.currentTarget;
    guardWork(() => {
      openerRef.current = target;
      setSurface(next);
    });
  }

  function openWork(civilDate: string) {
    setSurface({ kind: "work", weekStart: workFiscalWeekContaining(civilDate) });
  }

  function openExternalCalendars(googleError: string | null = null) {
    setSurface({ kind: "external-calendars", googleError });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("manage") !== "external-calendars") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("manage");
    url.searchParams.delete("googleError");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  function remember(current: OrientQuestion) {
    if (current === "present") return;
    const element = scrollRef.current;
    const scroll = element ? (current === "week" || current === "month" ? element.scrollLeft : element.scrollTop) : 0;
    places.current[current] = { anchor, scroll, provenance };
  }

  function writeAnchor(date: string) {
    if (date === anchor) return;
    anchorCause.current = "explicit";
    if (question === "present" || question === "day") {
      setDaySpan([shiftedAnchor(date, -1), date, shiftedAnchor(date, 1)]);
    }
    onAnchor(date);
  }

  function chooseQuestion(next: OrientQuestion) {
    guardWork(() => chooseQuestionNow(next));
  }

  function chooseQuestionNow(next: OrientQuestion) {
    questionChosen.current = true;
    remember(question);
    if (next === "present") {
      bringNow.current = true;
      anchorCause.current = "explicit";
      setProvenance("follows-today");
      try {
        const today = orientCivilDate(clock, timeZone);
        if (today !== anchor) onAnchor(today);
      } catch {
        // Present stays on the current anchor when today cannot be read.
      }
    } else {
      const saved = places.current[next];
      if (saved) {
        setProvenance(saved.provenance);
        if (saved.anchor !== anchor) {
          anchorCause.current = "explicit";
          onAnchor(saved.anchor);
        }
      }
    }
    setQuestion(next);
    setSurface({ kind: "none" });
    if (next === "present" || next === "day") {
      exactEntry.current = false;
      setExactAt(null);
      setNowEdge(null);
      setDepth("reading");
    }
  }

  function askDay(civilDate: string) {
    guardWork(() => askDayNow(civilDate));
  }

  function askDayNow(civilDate: string) {
    questionChosen.current = true;
    remember(question);
    places.current.day = { anchor: civilDate, scroll: null, provenance: "moved" };
    setProvenance("moved");
    revealDay.current = civilDate;
    anchorCause.current = "explicit";
    setDaySpan([shiftedAnchor(civilDate, -1), civilDate, shiftedAnchor(civilDate, 1)]);
    if (civilDate !== anchor) onAnchor(civilDate);
    setQuestion("day");
    setSurface({ kind: "none" });
    exactEntry.current = false;
    setExactAt(null);
    setNowEdge(null);
    setDepth("reading");
  }

  function moveViewpoint(date: string) {
    setProvenance("moved");
    writeAnchor(date);
  }

  function adoptToday(date: string) {
    setProvenance("follows-today");
    writeAnchor(date);
  }

  function placeMark(element: HTMLElement): boolean {
    const mark = element.querySelector<HTMLElement>(".orient-clock [data-present-mark]");
    if (!mark || element.clientHeight === 0) return false;
    const top = contentTop(mark.getBoundingClientRect().top, element.getBoundingClientRect().top, element.scrollTop);
    bringNow.current = false;
    scrollLock.current = true;
    element.scrollTop = nowScrollTarget(top, element.clientHeight);
    queueMicrotask(() => {
      scrollLock.current = false;
    });
    return true;
  }

  function alignDay(element: HTMLElement, date: string) {
    const day = element.querySelector<HTMLElement>(`.orient-day[data-civil-day="${date}"]`);
    if (!day || element.clientHeight === 0) return;
    const top = contentTop(day.getBoundingClientRect().top, element.getBoundingClientRect().top, element.scrollTop);
    scrollLock.current = true;
    element.scrollTop = Math.max(0, top);
    queueMicrotask(() => {
      scrollLock.current = false;
    });
  }

  const alignMinute = useCallback((element: HTMLElement, minute: number): boolean => {
    const surface = element.querySelector<HTMLElement>(`.orient-day[data-civil-day="${anchor}"] [data-time-surface]`);
    if (!surface || element.clientHeight === 0) return false;
    const top = contentTop(surface.getBoundingClientRect().top, element.getBoundingClientRect().top, element.scrollTop);
    scrollLock.current = true;
    element.scrollTop = signatureScrollTop(top, surface.getBoundingClientRect().height, minute, element.clientHeight);
    queueMicrotask(() => {
      scrollLock.current = false;
    });
    return true;
  }, [anchor]);

  function enterExact(minute: number | null) {
    exactMinute.current = minute;
    exactEntry.current = true;
    setExactAt(minute);
    bringNow.current = minute === null && question === "present";
    setDepth("exact");
  }

  function leaveExact() {
    exactEntry.current = false;
    setExactAt(null);
    setNowEdge(null);
    setDepth("reading");
  }

  function routeTimeOnTheDay() {
    guardWork(() => {
      if (question !== "present" && question !== "day") {
        askDayNow(anchor);
      }
      enterExact(null);
      setSurface({ kind: "none" });
    });
  }

  useLayoutEffect(() => {
    const element = scrollRef.current;
    const previous = previousQuestion.current;
    const questionChanged = previous !== question;
    previousQuestion.current = question;
    if (!element) return;

    if (question === "week" || question === "month") {
      anchorCause.current = "observe";
      if (!questionChanged) return;
      scrollLock.current = true;
      element.scrollLeft = places.current[question]?.scroll ?? 0;
      queueMicrotask(() => {
        scrollLock.current = false;
      });
      return;
    }

    const reading = continuityReading(depth, question);
    if (reading) {
      anchorCause.current = "observe";
      return;
    }

    if (exactEntry.current && (question === "present" || question === "day")) {
      if (element.clientHeight === 0) return;
      const minute = exactMinute.current;
      exactEntry.current = false;
      revealDay.current = null;
      if (minute !== null) {
        alignMinute(element, minute);
        anchorCause.current = "observe";
        return;
      }
      if (question === "day") {
        anchorCause.current = "observe";
        alignDay(element, anchor);
        return;
      }
    }

    if (bringNow.current && question === "present") {
      if (placeMark(element)) anchorCause.current = "observe";
      return;
    }

    if (revealDay.current) {
      const date = revealDay.current;
      revealDay.current = null;
      anchorCause.current = "observe";
      alignDay(element, date);
      return;
    }

    if (questionChanged && question === "day") {
      const saved = places.current.day;
      anchorCause.current = "observe";
      if (saved && saved.scroll !== null && saved.anchor === anchor) {
        scrollLock.current = true;
        element.scrollTop = saved.scroll;
        queueMicrotask(() => {
          scrollLock.current = false;
        });
      } else {
        alignDay(element, anchor);
      }
      return;
    }

    if (anchorCause.current === "explicit") {
      anchorCause.current = "observe";
      alignDay(element, anchor);
    }
  }, [question, anchor, form, depth, alignMinute]);

  useEffect(() => {
    const reading = continuityReading(depth, question);
    if (reading) return;
    const element = scrollRef.current;
    if (!element || (question !== "present" && question !== "day") || typeof ResizeObserver !== "function") return;
    if (!bringNow.current && !exactEntry.current) return;
    const observer = new ResizeObserver(() => {
      if (exactEntry.current) {
        const minute = exactMinute.current;
        if (element.clientHeight === 0) return;
        exactEntry.current = false;
        if (minute !== null) alignMinute(element, minute);
        else if (question === "present") placeMark(element);
        else alignDay(element, anchor);
        observer.disconnect();
        return;
      }
      if (!bringNow.current || question !== "present") {
        observer.disconnect();
        return;
      }
      if (placeMark(element)) observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [question, anchor, form, depth, alignMinute]);

  const temporalFailure = [sources.work, sources.protectedTime, sources.blocks, sources.commitments].find(
    (source) => source.status === "failed",
  );

  const contextNames = useMemo(() => {
    if (contexts.status !== "ready") return {};
    return Object.fromEntries(contexts.rows.map((context) => [context.id, context.name]));
  }, [contexts]);

  const freshSpan = [shiftedAnchor(anchor, -1), anchor, shiftedAnchor(anchor, 1)];
  if (!daySpan.includes(anchor)) setDaySpan(freshSpan);
  const verticalDates = daySpan.includes(anchor) ? daySpan : freshSpan;

  useLayoutEffect(() => {
    const pending = extendHold.current;
    const element = scrollRef.current;
    if (!pending || !element) return;
    const marker = element.querySelector<HTMLElement>(`.orient-day[data-civil-day="${pending.date}"]`);
    extendHold.current = null;
    if (!marker) {
      scrollLock.current = false;
      return;
    }
    const viewportTop = marker.getBoundingClientRect().top - element.getBoundingClientRect().top;
    const delta = viewportTop - pending.viewportTop;
    if (delta !== 0) element.scrollTop += delta;
    scrollLock.current = false;
  }, [daySpan]);

  const visibleDates = useMemo(() => {
    if (question === "week") return civilDatesInSpan(explicitCivilSpan(anchor, WEEK_WINDOW_DAYS));
    if (question === "month") return civilDatesInSpan(explicitCivilSpan(anchor, MONTH_WINDOW_DAYS));
    return [...verticalDates];
  }, [question, anchor, verticalDates]);

  const models = useMemo(() => {
    if (
      sources.work.status !== "ready" ||
      sources.protectedTime.status !== "ready" ||
      sources.blocks.status !== "ready" ||
      sources.commitments.status !== "ready"
    ) {
      return [] as DayCanvasModel[];
    }
    const workSchedule = sources.work.rows;
    const protectedTime = sources.protectedTime.rows;
    const blockRows = sources.blocks.rows;
    const commitmentRows = sources.commitments.rows;
    let externalTemporalFacts: readonly ExternalTemporalFact[] | undefined;
    let externalTemporalContext: ExternalTemporalTimelineContext | undefined;
    if (
      sources.externalFacts.status === "ready" &&
      sources.externalSources.status === "ready" &&
      sources.externalConnections.status === "ready"
    ) {
      const connectionStatusById: Record<string, ExternalConnectionStatus> = {};
      for (const connection of sources.externalConnections.rows) {
        connectionStatusById[connection.id] = connection.status;
      }
      externalTemporalFacts = sources.externalFacts.rows;
      externalTemporalContext = {
        sources: sources.externalSources.rows as readonly ObservedTemporalSource[],
        connectionStatusById,
      };
    }
    return visibleDates.map((civilDate) =>
      composeDayCanvas({
        selectedDay: civilDate,
        timeZone,
        workSchedule,
        protectedTime,
        blocks: blockRows,
        commitments: commitmentRows,
        contextNames,
        externalTemporalFacts,
        externalTemporalContext,
      }),
    );
  }, [
    visibleDates,
    timeZone,
    sources.work,
    sources.protectedTime,
    sources.blocks,
    sources.commitments,
    sources.externalConnections,
    sources.externalSources,
    sources.externalFacts,
    contextNames,
  ]);

  const weekReading =
    question === "week"
      ? composeWeekShapeReading({
          range: explicitCivilSpan(anchor, WEEK_WINDOW_DAYS),
          timeZone,
          loaded,
          work: sources.work,
          protectedTime: sources.protectedTime,
          blocks: sources.blocks,
          commitments: sources.commitments,
          externalConnections: sources.externalConnections,
          externalSources: sources.externalSources,
          externalFacts: sources.externalFacts,
        })
      : null;
  const monthReading = question === "month"
    ? composeMonthReading({
        range: explicitCivilSpan(anchor, MONTH_WINDOW_DAYS),
        timeZone,
        loaded,
        destinations: sources.destinations,
        priorities: sources.priorities,
        work: sources.work,
        protectedTime: sources.protectedTime,
        blocks: sources.blocks,
        commitments: sources.commitments,
        taskPriorityService: sources.taskPriorityService,
        blockPriorityService: sources.blockPriorityService,
        citedTasks: sources.citedTasks,
        externalConnections: sources.externalConnections,
        externalSources: sources.externalSources,
        externalFacts: sources.externalFacts,
      })
    : null;

  const blocks: readonly Block[] = sources.blocks.status === "ready" ? sources.blocks.rows : [];
  const workRows: readonly WorkScheduleEntry[] = sources.work.status === "ready" ? sources.work.rows : [];

  function contextFor(kind: TimelineSourceKind, id: string): string | null {
    if (kind !== "block") return null;
    return blocks.find((block) => block.id === id)?.contextId ?? null;
  }

  function offFor(civilDate: string): boolean {
    return workRows.some((entry) => entry.workOn === civilDate && entry.state === "off");
  }

  function todayCivil(): string | null {
    try {
      return orientCivilDate(clock, timeZone);
    } catch {
      return null;
    }
  }

  function presentMinute(civilDate: string): number | null {
    if (question === "week" || question === "month") return null;
    const today = todayCivil();
    if (today !== civilDate) return null;
    try {
      const parts = zonedLocalClock(clock, timeZone);
      return parts.hour * 60 + parts.minute;
    } catch {
      return null;
    }
  }

  function tenseFor(civilDate: string, placement: DayCanvasTimedPlacement): "past" | "present" | "future" {
    const today = todayCivil();
    if (!today || civilDate > today) return "future";
    if (civilDate < today) return "past";
    const minute = presentMinute(civilDate);
    if (minute === null) return "future";
    if (placement.visibleEndMinute <= minute) return "past";
    if (placement.visibleStartMinute <= minute) return "present";
    return "future";
  }

  function nowOutsideView(): "before" | "after" | null | "measure" {
    const today = todayCivil();
    if (!today) return null;
    if (question === "week" || question === "month") {
      const dates = civilDatesInSpan(explicitCivilSpan(anchor, question === "week" ? WEEK_WINDOW_DAYS : MONTH_WINDOW_DAYS));
      if (today < dates[0]) return "before";
      if (today > (dates.at(-1) ?? today)) return "after";
      return null;
    }
    const visible = [shiftedAnchor(anchor, -1), anchor, shiftedAnchor(anchor, 1)];
    if (!visible.includes(today)) return today < anchor ? "before" : "after";
    return "measure";
  }

  function measureNow() {
    const today = todayCivil();
    if (question === "week" || question === "month") {
      if (!today) {
        setNowEdge(null);
        return;
      }
      const dates = civilDatesInSpan(explicitCivilSpan(anchor, question === "week" ? WEEK_WINDOW_DAYS : MONTH_WINDOW_DAYS));
      if (today < dates[0]) setNowEdge("before");
      else if (today > (dates.at(-1) ?? today)) setNowEdge("after");
      else setNowEdge(null);
      return;
    }
    const element = scrollRef.current;
    const mark = element?.querySelector(".orient-clock [data-present-mark]");
    if (!element || !(mark instanceof HTMLElement) || element.clientHeight === 0) {
      setNowEdge((current) => {
        const fallback = today && today !== anchor ? (today < anchor ? "before" : "after") : null;
        return current === fallback ? current : fallback;
      });
      return;
    }
    const top = contentTop(mark.getBoundingClientRect().top, element.getBoundingClientRect().top, element.scrollTop);
    let next: "above" | "below" | null = null;
    if (top < element.scrollTop + 8) next = "above";
    else if (top > element.scrollTop + element.clientHeight - 8) next = "below";
    setNowEdge((current) => (current === next ? current : next));
  }

  const outsideNow = nowOutsideView();
  const shownEdge =
    outsideNow === "measure" ? (nowEdge === "before" || nowEdge === "after" ? null : nowEdge) : outsideNow;

  function returnToNow() {
    const today = todayCivil();
    if (!today) return;
    setProvenance("follows-today");
    if (question === "week" || question === "month") {
      if (today !== anchor) writeAnchor(today);
      return;
    }
    bringNow.current = true;
    if (question === "present" || question === "day") {
      exactMinute.current = null;
      exactEntry.current = false;
      setExactAt(null);
      setDepth("exact");
    }
    if (today !== anchor) writeAnchor(today);
    else {
      const element = scrollRef.current;
      if (element) placeMark(element);
    }
  }

  function onFieldScroll() {
    if (continuityReading(depth, question)) return;
    measureNow();
    if (question === "week" || question === "month" || scrollLock.current) return;
    const element = scrollRef.current;
    if (!element) return;
    const days = [...element.querySelectorAll<HTMLElement>(".orient-day[data-civil-day]")];
    const observed = observedCivilDate(
      days.map((day) => ({
        date: day.dataset.civilDay ?? "",
        contentTop: contentTop(day.getBoundingClientRect().top, element.getBoundingClientRect().top, element.scrollTop),
      })),
      element.scrollTop + 48,
      false,
    );
    const nextAnchor = viewpointAfterScroll(anchor, observed);
    if (nextAnchor) {
      bringNow.current = false;
      setProvenance("moved");
      onAnchor(nextAnchor);
    }

    if (edgeLatch.current !== null) {
      if (Math.abs(element.scrollTop - edgeLatch.current) > 64) edgeLatch.current = null;
      else return;
    }
    if (extendHold.current) return;
    const dates = [...verticalDates];
    const edge = nearEdge(element.scrollTop, element.scrollHeight, element.clientHeight, 64);
    if (!edge || dates.length === 0) return;
    const markerDate = edge === "earlier" ? dates[0] : dates[dates.length - 1];
    if (!markerDate) return;
    const marker = element.querySelector<HTMLElement>(`.orient-day[data-civil-day="${markerDate}"]`);
    if (!marker) return;
    extendHold.current = {
      date: markerDate,
      viewportTop: marker.getBoundingClientRect().top - element.getBoundingClientRect().top,
    };
    edgeLatch.current = element.scrollTop;
    scrollLock.current = true;
    setDaySpan(extendSpan(dates, edge, shiftedAnchor));
  }

  function referTo(facts: FactAddress[]) {
    guardWork(() => {
      publish(reduceSelection(sessionRef.current, { type: "discard" }));
      setSurface(
        facts.length === 1
          ? { kind: "facts", facts, chosen: facts[0], proposal: null }
          : { kind: "facts", facts, chosen: null, proposal: null },
      );
    });
  }

  const showRemainder = questionAllowsCapacityRemainder(question);
  const capacity = showRemainder
    ? composeWorkCapacityReading({
        civilDate: anchor,
        timeZone,
        loaded,
        work: sources.work,
        protectedTime: sources.protectedTime,
        blocks: sources.blocks,
        commitments: sources.commitments,
      })
    : null;
  const remainder = capacity ? allocatableRemainderBands(capacity, anchor, timeZone) : [];
  const openTasks =
    tasks.status === "failed"
      ? tasks
      : { status: "ready" as const, rows: tasks.rows.map((task) => ({ id: task.id, title: task.title })) };

  const establishing = questionAllowsEstablishment(question) && session.visible !== null && surface.kind === "none";
  const referring = question === "present" && session.visible !== null && surface.kind === "none";
  const threadText = threadLine({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
    resumeTitle: thread.status === "ready" && thread.active ? thread.resumeTitle : null,
  });
  const threadWeight = threadRestingWeight({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
  });
  let field: ReactNode;
  const phoneReading = form === "phone" && depth === "reading" && (question === "present" || question === "day");
  const desktopReading = continuityReading(depth, question) && form === "desktop";
  const desktopBorrowed = form === "desktop";
  const anchorModel = models.find((model) => model.selectedDay === anchor) ?? null;
  if (question === "week" && weekReading?.status === "incomplete") {
    field = (
      <p data-reading="incomplete" className="orient-withheld">
        This reading is withheld. {weekReading.message}
      </p>
    );
  } else if (question === "month" && monthReading?.status === "incomplete") {
    field = (
      <p data-reading="incomplete" className="orient-withheld">
        This reading is withheld. {monthReading.message}
      </p>
    );
  } else if (phoneReading && (question === "present" || question === "day")) {
    field = (
      <PhoneContinuity
        question={question}
        timeZone={timeZone}
        now={clock}
        anchor={anchor}
        model={anchorModel}
        sources={sources}
        thread={thread}
        focus={focus}
        contextFor={contextFor}
        off={offFor(anchor)}
        withheld={temporalFailure?.message ?? null}
        onRefer={referTo}
        onThread={(event) => openFrom(event, { kind: "thread" })}
        onExact={enterExact}
      />
    );
  } else if (desktopReading && (question === "present" || question === "day")) {
    field = (
      <DesktopReading
        question={question}
        timeZone={timeZone}
        now={clock}
        anchor={anchor}
        model={anchorModel}
        sources={sources}
        thread={thread}
        focus={focus}
        contextFor={contextFor}
        withheld={temporalFailure?.message ?? null}
        onRefer={referTo}
        onThread={(event) => openFrom(event, { kind: "thread" })}
        onExact={enterExact}
        onAllDay={() => guardWork(() => setSurface({ kind: "create-all-day" }))}
      />
    );
  } else if ((question === "present" || question === "day") && temporalFailure) {
    field = (
      <p data-reading="incomplete" className="orient-withheld">
        This reading is withheld. {temporalFailure.message}
      </p>
    );
  } else if (question === "week" || question === "month") {
    const landscape = (
      <Landscape
        models={models}
        words={question === "week"}
        focus={focus}
        contextFor={contextFor}
        onRefer={referTo}
        directManipulation={form === "desktop" && question === "week"}
        onPropose={(fact, proposal) => {
          guardWork(() => {
            publish(reduceSelection(sessionRef.current, { type: "discard" }));
            setSurface({ kind: "facts", facts: [fact], chosen: fact, proposal });
          });
        }}
        onShift={(days) => {
          if (days === 0) return;
          setProvenance("moved");
          onAnchor(shiftedAnchor(anchor, days));
        }}
        onAskDay={askDay}
        today={todayCivil()}
        offFor={offFor}
      />
    );
    field =
      desktopBorrowed && models.length > 0 ? (
        <div className="orient-desktop-resolution" data-desktop-resolution={question}>
          <DesktopWindow distance={question} from={models[0].selectedDay} to={models[models.length - 1].selectedDay} />
          <div className="orient-desktop-resolution-field">{landscape}</div>
        </div>
      ) : (
        landscape
      );
  } else {
    field = (
      <>
        {capacity?.status === "incomplete" ? (
          <p data-reading="incomplete" className="orient-withheld">
            {capacity.message}
          </p>
        ) : null}
        {models.map((model) => (
          <DayClock
            key={model.selectedDay}
            model={model}
            manipulate={questionAllowsReference(question)}
            focus={focus}
            contextFor={contextFor}
            session={session}
            sessionRef={sessionRef}
            publish={publish}
            onRefer={referTo}
            remainder={showRemainder && model.selectedDay === anchor ? remainder : []}
            presentMinute={presentMinute(model.selectedDay)}
            gloss={showRemainder && model.selectedDay === anchor && remainder.length > 0}
            off={offFor(model.selectedDay)}
            tenseFor={(placement) => tenseFor(model.selectedDay, placement)}
          />
        ))}
      </>
    );
  }

  const direction =
    questionShowsDirection(question) && monthReading ? (
      <DirectionPlane
        status={monthReading.status === "complete" ? "complete" : "incomplete"}
        message={monthReading.status === "incomplete" ? monthReading.message : null}
        destinations={monthReading.status === "complete" ? monthReading.destinations : []}
        priorities={monthReading.status === "complete" ? monthReading.priorities : []}
        onInspect={(priorityId) => guardWork(() => setSurface({ kind: "direction", priorityId }))}
      />
    ) : (
      <div className="orient-direction" hidden />
    );

  const borrowedOpen =
    surface.kind !== "none" ||
    (session.visible !== null && (question === "present" || question === "day") && surface.kind === "none");
  const spatialBorrowActive = desktopBorrowed && (surface.kind !== "none" || establishing || referring);
  const borrowedOperation = spatialBorrowActive
    ? surface.kind !== "none"
      ? surface.kind
      : establishing
        ? "establish"
        : "refer"
    : null;
  const borrowWidth = borrowedOperation != null && addBorrowFamily(borrowedOperation) ? "tight" : "standard";

  useEffect(() => {
    if (!desktopBorrowed && surface.kind !== "work") return;
    if (!borrowedOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (surface.kind === "work") {
        workDismissRef.current?.requestLeave(finishClose);
        return;
      }
      if (surface.kind === "none") {
        const next = reduceSelection(sessionRef.current, { type: "discard" });
        sessionRef.current = next;
        setSession(next);
        return;
      }
      finishClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [desktopBorrowed, borrowedOpen, surface.kind]);

  useEffect(() => {
    if (!desktopBorrowed || !borrowedOpen) return;
    const dialog = surfaceRef.current;
    if (!dialog || dialog.contains(document.activeElement)) return;
    dialog.focus();
  }, [desktopBorrowed, borrowedOpen, surface]);

  return (
    <main
      className="orient"
      data-production-instrument="true"
      data-question={question}
      data-form={form}
      data-depth={depth}
      data-phone-reading={phoneReading ? "true" : "false"}
      data-desktop-reading={desktopReading ? "true" : "false"}
      data-exact-minute={exactAt === null ? "" : String(exactAt)}
      data-reduced-motion={reduced ? "true" : "false"}
      data-viewpoint={provenance}
      data-spatial-borrow={spatialBorrowActive ? "true" : "false"}
      data-borrow-mode={spatialBorrowActive ? "lateral" : undefined}
      data-borrowed-operation={borrowedOperation ?? undefined}
      data-borrow-width={spatialBorrowActive ? borrowWidth : undefined}
      aria-label="Orient"
    >
      <OrientIdentity />
      <div className="orient-reach" data-reach="bezel">
        {desktopReading ? null : (
          <button
            type="button"
            className="orient-thread"
            data-active-thread="true"
            data-thread-weight={threadWeight}
            aria-expanded={surface.kind === "thread"}
            onClick={(event) => openFrom(event, { kind: "thread" })}
          >
            <span className="orient-thread-line" aria-hidden="true" />
            <span className="orient-thread-text">{threadText}</span>
            <ChevronRight aria-hidden="true" className="orient-glyph" />
          </button>
        )}
        <div className="orient-reach-row" data-reach-grammar="look-add-act">
          <button
            type="button"
            className="orient-control"
            data-look-control="true"
            data-question-control="true"
            aria-label={`LOOK · ${QUESTION_LABEL[question]}`}
            aria-expanded={
              surface.kind === "look" ||
              surface.kind === "notes" ||
              surface.kind === "stewardship-manage" ||
              surface.kind === "stewardship-detail" ||
              surface.kind === "recurring-task-manage" ||
              surface.kind === "recurring-task-detail"
            }
            onClick={(event) =>
              openFrom(
                event,
                surface.kind === "look" ||
                  surface.kind === "notes" ||
                  surface.kind === "stewardship-manage" ||
                  surface.kind === "stewardship-detail" ||
                  surface.kind === "recurring-task-manage" ||
                  surface.kind === "recurring-task-detail"
                  ? { kind: "none" }
                  : { kind: "look" },
              )
            }
          >
            <Compass aria-hidden="true" className="orient-glyph" />
            <span>LOOK</span>
          </button>
          <button
            type="button"
            className={form === "phone" ? "orient-control orient-add-control" : "orient-control"}
            data-add-control="true"
            aria-label="ADD"
            aria-expanded={
              surface.kind === "add" ||
              surface.kind === "create-task" ||
              surface.kind === "create-stewardship" ||
              surface.kind === "create-recurring-task" ||
              surface.kind === "create-note" ||
              surface.kind === "create-all-day"
            }
            onClick={(event) => openFrom(event, surface.kind === "add" ? { kind: "none" } : { kind: "add" })}
          >
            <Plus aria-hidden="true" className="orient-glyph" />
            {form === "desktop" ? <span>ADD</span> : null}
          </button>
          <button
            type="button"
            className="orient-control"
            data-act-control="true"
            aria-label="ACT · What do I need to do?"
            aria-expanded={
              surface.kind === "act" ||
              (surface.kind === "create-stewardship" && surface.returnTo === "act") ||
              (surface.kind === "create-task" && surface.returnTo === "act")
            }
            onClick={(event) => openFrom(event, surface.kind === "act" ? { kind: "none" } : { kind: "act" })}
          >
            <ListTodo aria-hidden="true" className="orient-glyph" />
            <span>ACT</span>
          </button>
        </div>
      </div>
      <div className="orient-stage">
      {desktopBorrowed && depth === "exact" && (question === "present" || question === "day") ? (
        <header className="orient-desktop-precision" data-exact-frame="true">
          <button type="button" className="orient-desktop-return" data-orientation-return="true" onClick={leaveExact}>
            Orientation
          </button>
          <p className="orient-desktop-precision-day">
            <span className="orient-desktop-precision-date">{formatCivilDateLabel(anchor)}</span>
            <span className="orient-desktop-precision-depth">Exact time</span>
          </p>
        </header>
      ) : null}
      <div
        className="orient-field"
        data-field="true"
        data-field-scroll="true"
        ref={scrollRef}
        onScroll={onFieldScroll}
        tabIndex={0}
        aria-label="Temporal field"
      >
        <div className="orient-question-body" key={question}>
          {field}
        </div>
      </div>
      {form === "phone" && depth === "exact" && (question === "present" || question === "day") ? (
        <button type="button" className="orient-orientation-return" data-orientation-return="true" onClick={leaveExact}>
          Orientation
        </button>
      ) : null}
      {shownEdge ? (
        <button
          type="button"
          className="orient-now-return"
          data-return-now="true"
          style={
            shownEdge === "above" || shownEdge === "before"
              ? { top: "calc(0.5rem + env(safe-area-inset-top))" }
              : { bottom: "0.5rem" }
          }
          onClick={returnToNow}
        >
          <Crosshair aria-hidden="true" className="orient-glyph" />
          Now
        </button>
      ) : null}
      </div>
      {questionShowsDirection(question) ? <div className="orient-direction">{direction}</div> : <div className="orient-direction" />}
      {surface.kind !== "none" || establishing || referring ? (
        <div
          className="orient-surface"
          role="dialog"
          aria-label="Transient working surface"
          aria-modal={desktopBorrowed ? false : undefined}
          tabIndex={desktopBorrowed ? -1 : undefined}
          ref={surfaceRef}
          data-borrowed-surface={desktopBorrowed ? "drawer" : "sheet"}
        >
          {surface.kind === "look" ? (
            <LookSurface
              question={question}
              onChooseQuestion={chooseQuestion}
              anchor={anchor}
              today={todayCivil()}
              onMove={moveViewpoint}
              onAdoptToday={adoptToday}
              onSignOut={actions.onSignOut}
              onManageWork={() => {
                const today = todayCivil();
                if (!today) return;
                openWork(today);
              }}
              onManageExternalCalendars={() => openExternalCalendars()}
              onOpenNotes={() => setSurface({ kind: "notes" })}
              onOpenStewardship={() => setSurface({ kind: "stewardship-manage" })}
              onOpenRecurringTasks={() => setSurface({ kind: "recurring-task-manage" })}
              contexts={contexts}
              focus={focus}
              lookComposition={form === "desktop" ? "navigator-lens" : "phone-calm"}
              onChooseFocus={(next) => {
                setFocus(next);
                closeSurface();
              }}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "notes" ? (
            <NotesSurface onChanged={actions.onTasksChanged} onClose={closeSurface} />
          ) : null}
          {surface.kind === "stewardship-manage" ? (
            <StewardshipManageSurface
              definitions={sources.stewardshipDefinitions}
              revisions={sources.stewardshipRevisions}
              contexts={contexts}
              onEstablish={() => setSurface({ kind: "create-stewardship", returnTo: "stewardship-manage" })}
              onOpen={(definitionId) => setSurface({ kind: "stewardship-detail", definitionId })}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "stewardship-detail" ? (
            <StewardshipDetailSurface
              definitionId={surface.definitionId}
              definitions={sources.stewardshipDefinitions}
              revisions={sources.stewardshipRevisions}
              satisfactions={sources.stewardshipSatisfactions}
              work={sources.work}
              contexts={contexts}
              viewpointCivilDate={anchor}
              now={clock}
              timeZone={timeZone}
              onEdit={actions.onEditStewardshipForward}
              onRetire={async (definitionId) => {
                await actions.onRetireStewardship(definitionId);
                setSurface({ kind: "stewardship-manage" });
              }}
              onClose={() => setSurface({ kind: "stewardship-manage" })}
            />
          ) : null}
          {surface.kind === "recurring-task-manage" ? (
            <RecurringTaskManageSurface
              definitions={sources.recurringTaskDefinitions}
              contexts={contexts}
              onEstablish={() => setSurface({ kind: "create-recurring-task", returnTo: "recurring-task-manage" })}
              onOpen={(definitionId) => setSurface({ kind: "recurring-task-detail", definitionId })}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "recurring-task-detail" ? (
            <RecurringTaskDetailSurface
              definitionId={surface.definitionId}
              definitions={sources.recurringTaskDefinitions}
              contexts={contexts}
              onUpdate={actions.onUpdateRecurringTask}
              onRetire={async (definitionId) => {
                await actions.onRetireRecurringTask(definitionId);
                setSurface({ kind: "recurring-task-manage" });
              }}
              onClose={() => setSurface({ kind: "recurring-task-manage" })}
            />
          ) : null}

          {surface.kind === "add" ? (
            <AddChooser
              onTask={() => setSurface({ kind: "create-task" })}
              onRecurringTask={() => setSurface({ kind: "create-recurring-task" })}
              onStewardship={() => setSurface({ kind: "create-stewardship" })}
              onNote={() => setSurface({ kind: "create-note" })}
              onTimeOnTheDay={routeTimeOnTheDay}
              onAllDay={() => setSurface({ kind: "create-all-day" })}
              onWorkSchedule={() => {
                const today = todayCivil();
                if (!today) return;
                openWork(today);
              }}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "act" ? (
            <ActSurface
              tasks={tasks}
              contexts={contexts}
              work={sources.work}
              stewardshipDefinitions={sources.stewardshipDefinitions}
              stewardshipRevisions={sources.stewardshipRevisions}
              stewardshipSatisfactions={sources.stewardshipSatisfactions}
              viewpointCivilDate={anchor}
              now={clock}
              timeZone={timeZone}
              onStart={actions.onStartThread}
              onComplete={actions.onCompleteTask}
              onReopen={actions.onReopenTask}
              onUpdate={actions.onUpdateTask}
              onSatisfyStewardship={actions.onSatisfyStewardship}
              onWithdrawStewardship={actions.onWithdrawStewardship}
              onEditStewardshipForward={actions.onEditStewardshipForward}
              onRetireStewardship={actions.onRetireStewardship}
              onAddTask={() => setSurface({ kind: "create-task", returnTo: "act" })}
              onAddStewardship={() => setSurface({ kind: "create-stewardship", returnTo: "act" })}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "create-task" ? (
            <div data-create-task-return={surface.returnTo ?? "none"}>
              <DirectTaskSurface
                contexts={contexts}
                onChanged={actions.onTasksChanged}
                onClose={() => {
                  if (surface.returnTo === "act") {
                    setSurface({ kind: "act" });
                    return;
                  }
                  closeSurface();
                }}
              />
            </div>
          ) : null}
          {surface.kind === "create-stewardship" ? (
            <div data-create-stewardship-return={surface.returnTo ?? "none"}>
              <DirectStewardshipSurface
                contexts={contexts}
                onEstablish={actions.onEstablishStewardship}
                onClose={() => {
                  if (surface.returnTo === "act") {
                    setSurface({ kind: "act" });
                    return;
                  }
                  if (surface.returnTo === "stewardship-manage") {
                    setSurface({ kind: "stewardship-manage" });
                    return;
                  }
                  closeSurface();
                }}
              />
            </div>
          ) : null}
          {surface.kind === "create-recurring-task" ? (
            <div data-create-recurring-task-return={surface.returnTo ?? "none"}>
              <DirectRecurringTaskSurface
                contexts={contexts}
                onEstablish={actions.onEstablishRecurringTask}
                onClose={() => {
                  if (surface.returnTo === "recurring-task-manage") {
                    setSurface({ kind: "recurring-task-manage" });
                    return;
                  }
                  closeSurface();
                }}
              />
            </div>
          ) : null}

          {surface.kind === "create-note" ? <DirectNoteSurface onClose={closeSurface} /> : null}
          {surface.kind === "create-all-day" ? (
            <AllDayEstablishmentSurface
              startsOn={anchor}
              contexts={contexts}
              onEstablish={async (establishment) => {
                await actions.onEstablish(establishment);
              }}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "thread" ? (
            <ThreadSurface
              thread={thread}
              tasks={tasks}
              contexts={contexts}
              onStart={actions.onStartThread}
              onLeave={actions.onLeaveThread}
              onComplete={actions.onCompleteTask}
              onReopen={actions.onReopenTask}
              onUpdate={actions.onUpdateTask}
              onOpenAct={() => setSurface({ kind: "act" })}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "facts" ? (
            <InspectionSurface
              facts={surface.facts}
              chosen={surface.chosen}
              proposal={surface.proposal}
              models={models}
              contexts={contexts}
              openTasks={openTasks}
              timeZone={timeZone}
              services={sources}
              onChoose={(fact) => setSurface({ kind: "facts", facts: surface.facts, chosen: fact, proposal: null })}
              onClose={closeSurface}
              onUpdate={actions.onUpdate}
              onRemove={actions.onRemove}
              onManageWork={(civilDate) => openWork(civilDate)}
            />
          ) : null}
          {surface.kind === "work" ? (
            <WorkScheduleOperation
              key={surface.weekStart}
              weekStart={surface.weekStart}
              timeZone={timeZone}
              dismissRef={workDismissRef}
              onWeekStart={(next) => setSurface({ kind: "work", weekStart: next })}
              onLoad={actions.onLoadWorkWeek}
              onSave={actions.onSaveWorkWeek}
              onDismiss={finishClose}
            />
          ) : null}
          {surface.kind === "external-calendars" ? (
            <ExternalCalendarsOperation
              initialError={surface.googleError}
              onDismiss={finishClose}
              onObservationComplete={actions.onExternalObservationComplete}
            />
          ) : null}
          {surface.kind === "direction" ? (
            <DirectionInspection priorityId={surface.priorityId} sources={sources} onClose={closeSurface} />
          ) : null}
          {establishing || referring ? (
            <EstablishmentSurface
              question={question}
              session={session}
              timeZone={timeZone}
              contexts={contexts}
              openTasks={openTasks}
              publish={publish}
              onEstablish={async (establishment) => {
                await actions.onEstablish(establishment);
                publish(initialSelectionSession());
              }}
              onCancel={() => publish(reduceSelection(sessionRef.current, { type: "discard" }))}
            />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function continuityReading(depth: "reading" | "exact", question: OrientQuestion): boolean {
  return depth === "reading" && (question === "present" || question === "day");
}

function addBorrowFamily(operation: string): boolean {
  return (
    operation === "add" ||
    operation === "create-task" ||
    operation === "create-stewardship" ||
    operation === "create-recurring-task" ||
    operation === "create-note" ||
    operation === "create-all-day"
  );
}

function readInstrumentForm(): "phone" | "desktop" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
  return window.matchMedia("(max-width: 959px)").matches ? "phone" : "desktop";
}

function googleCallbackErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "authorization_denied":
      return "Google authorization was denied.";
    case "authorization_incomplete":
      return "Google authorization was incomplete.";
    case "authorization_failed":
      return "Google authorization failed.";
    case "state_expired":
      return "Authorization expired. Connect again.";
    case "state_reused":
    case "state_invalid":
    case "state_missing":
      return "Authorization could not be completed. Connect again.";
    default:
      return "Google authorization could not be completed.";
  }
}

function readExternalCalendarsSurfaceFromLocation(): Surface {
  if (typeof window === "undefined") return { kind: "none" };
  const params = new URLSearchParams(window.location.search);
  if (params.get("manage") !== "external-calendars") return { kind: "none" };
  return {
    kind: "external-calendars",
    googleError: googleCallbackErrorMessage(params.get("googleError")),
  };
}
