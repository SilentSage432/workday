"use client";

import { Aperture, ChevronRight, Compass, Crosshair, Locate, PenLine } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { composeWorkCapacityReading } from "@/components/capacityReading";
import { initialSelectionSession, reduceSelection, type SelectionSession } from "@/components/daySelection";
import type { FactAddress } from "@/components/factAddress";
import { composeMonthReading } from "@/components/monthReading";
import { composeWeekShapeReading } from "@/components/weekReading";
import type { Block } from "@/domain/block";
import { zonedLocalClock } from "@/domain/time/localTime";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { composeDayCanvas, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";
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
import { OrientIdentity } from "@/components/orient/OrientIdentity";
import { signatureScrollTop } from "@/components/orient/phoneSignature";
import {
  allocatableRemainderBands,
  civilDatesInSpan,
  explicitCivilSpan,
  orientCivilDate,
  positionWord,
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
import {
  CaptureSurface,
  DirectionInspection,
  DirectionPlane,
  EstablishmentSurface,
  FocusList,
  InspectionSurface,
  PositionSurface,
  QuestionList,
  ThreadSurface,
} from "@/components/orient/Surfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import type { Context } from "@/domain/context";
import type { SourceRead } from "@/components/currentTemporalReading";
import type { Task } from "@/domain/task";
import "./orient.css";

type QuestionPlace = { anchor: string; scroll: number | null };

type Surface =
  | { kind: "none" }
  | { kind: "question" }
  | { kind: "position" }
  | { kind: "focus" }
  | { kind: "capture" }
  | { kind: "thread" }
  | { kind: "facts"; facts: FactAddress[]; chosen: FactAddress | null }
  | { kind: "direction"; priorityId: string };

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
  capture,
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
  capture: CaptureBridge;
  actions: OrientActions;
}) {
  const clock = now;
  const bringNow = useRef(true);
  const [question, setQuestion] = useState<OrientQuestion>(() => (readInstrumentForm() === "phone" ? "day" : "present"));
  const [focus, setFocus] = useState<ContextFocus>({ kind: "everything" });
  const [surface, setSurface] = useState<Surface>({ kind: "none" });
  const [session, setSession] = useState<SelectionSession>(initialSelectionSession);
  const [nowEdge, setNowEdge] = useState<"above" | "below" | "before" | "after" | null>(null);
  const [reduced, setReduced] = useState(false);
  const [form, setForm] = useState<"phone" | "desktop">(() => readInstrumentForm());
  const [depth, setDepth] = useState<"reading" | "exact">("reading");
  const [exactAt, setExactAt] = useState<number | null>(null);
  const [daySpan, setDaySpan] = useState<string[]>(() => [shiftedAnchor(anchor, -1), anchor, shiftedAnchor(anchor, 1)]);
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
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

  function closeSurface() {
    setSurface({ kind: "none" });
    const opener = openerRef.current;
    openerRef.current = null;
    queueMicrotask(() => opener?.focus());
  }

  function openFrom(event: { currentTarget: HTMLElement }, next: Surface) {
    openerRef.current = event.currentTarget;
    setSurface(next);
  }

  function remember(current: OrientQuestion) {
    const element = scrollRef.current;
    const scroll = element ? (current === "week" || current === "month" ? element.scrollLeft : element.scrollTop) : 0;
    places.current[current] = { anchor, scroll };
  }

  function chooseQuestion(next: OrientQuestion) {
    questionChosen.current = true;
    remember(question);
    if (next === "present") {
      bringNow.current = true;
      anchorCause.current = "explicit";
      try {
        const today = orientCivilDate(clock, timeZone);
        if (today !== anchor) onAnchor(today);
      } catch {
        // Present stays on the current anchor when today cannot be read.
      }
    } else {
      const saved = places.current[next];
      if (saved && saved.anchor !== anchor) {
        anchorCause.current = "explicit";
        onAnchor(saved.anchor);
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
    questionChosen.current = true;
    places.current.day = { anchor: civilDate, scroll: null };
    revealDay.current = civilDate;
    anchorCause.current = "explicit";
    remember(question);
    setDaySpan([shiftedAnchor(civilDate, -1), civilDate, shiftedAnchor(civilDate, 1)]);
    if (civilDate !== anchor) onAnchor(civilDate);
    setQuestion("day");
    setSurface({ kind: "none" });
    exactEntry.current = false;
    setExactAt(null);
    setNowEdge(null);
    setDepth("reading");
  }

  function relocate(date: string) {
    if (date === anchor) return;
    anchorCause.current = "explicit";
    if (question === "present" || question === "day") {
      setDaySpan([shiftedAnchor(date, -1), date, shiftedAnchor(date, 1)]);
    }
    onAnchor(date);
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

    const reading = form === "phone" && depth === "reading" && (question === "present" || question === "day");
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
    const reading = form === "phone" && depth === "reading" && (question === "present" || question === "day");
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
    return visibleDates.map((civilDate) =>
      composeDayCanvas({
        selectedDay: civilDate,
        timeZone,
        workSchedule,
        protectedTime,
        blocks: blockRows,
        commitments: commitmentRows,
        contextNames,
      }),
    );
  }, [visibleDates, timeZone, sources.work, sources.protectedTime, sources.blocks, sources.commitments, contextNames]);

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
    if (question === "week" || question === "month") {
      if (today !== anchor) relocate(today);
      return;
    }
    bringNow.current = true;
    if (form === "phone" && (question === "present" || question === "day")) {
      exactMinute.current = null;
      exactEntry.current = false;
      setExactAt(null);
      setDepth("exact");
    }
    if (today !== anchor) relocate(today);
    else {
      const element = scrollRef.current;
      if (element) placeMark(element);
    }
  }

  function onFieldScroll() {
    if (form === "phone" && depth === "reading" && (question === "present" || question === "day")) return;
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
    publish(reduceSelection(sessionRef.current, { type: "discard" }));
    setSurface(facts.length === 1 ? { kind: "facts", facts, chosen: facts[0] } : { kind: "facts", facts, chosen: null });
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
  const focusLabel =
    contexts.status === "failed"
      ? "The focus could not be read."
      : focus.kind === "everything"
        ? "Focus: Everything"
        : `Focus: ${focus.name}`;

  let field: ReactNode;
  const phoneReading = form === "phone" && depth === "reading" && (question === "present" || question === "day");
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
  } else if ((question === "present" || question === "day") && temporalFailure) {
    field = (
      <p data-reading="incomplete" className="orient-withheld">
        This reading is withheld. {temporalFailure.message}
      </p>
    );
  } else if (question === "week" || question === "month") {
    field = (
      <Landscape
        models={models}
        words={question === "week"}
        focus={focus}
        contextFor={contextFor}
        onRefer={referTo}
        onShift={(days) => {
          if (days !== 0) onAnchor(shiftedAnchor(anchor, days));
        }}
        onAskDay={askDay}
        today={todayCivil()}
        offFor={offFor}
      />
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
        onInspect={(priorityId) => setSurface({ kind: "direction", priorityId })}
      />
    ) : (
      <div className="orient-direction" hidden />
    );

  return (
    <main
      className="orient"
      data-production-instrument="true"
      data-question={question}
      data-form={form}
      data-depth={form === "phone" ? depth : "reading"}
      data-phone-reading={phoneReading ? "true" : "false"}
      data-exact-minute={exactAt === null ? "" : String(exactAt)}
      data-reduced-motion={reduced ? "true" : "false"}
      aria-label="Orient"
    >
      <OrientIdentity />
      <div className="orient-reach" data-reach="bezel">
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
        <div className="orient-reach-row">
          <button
            type="button"
            className="orient-control"
            data-question-control="true"
            aria-expanded={surface.kind === "question"}
            onClick={(event) => openFrom(event, surface.kind === "question" ? { kind: "none" } : { kind: "question" })}
          >
            <Compass aria-hidden="true" className="orient-glyph" />
            <span>{QUESTION_LABEL[question]}</span>
          </button>
          <button
            type="button"
            className="orient-control"
            data-position="true"
            aria-expanded={surface.kind === "position"}
            onClick={(event) => openFrom(event, surface.kind === "position" ? { kind: "none" } : { kind: "position" })}
          >
            <Locate aria-hidden="true" className="orient-glyph" />
            <span>{positionWord(question, anchor)}</span>
          </button>
          <button
            type="button"
            className="orient-control"
            data-focus-control="true"
            aria-expanded={surface.kind === "focus"}
            onClick={(event) => openFrom(event, surface.kind === "focus" ? { kind: "none" } : { kind: "focus" })}
          >
            <Aperture aria-hidden="true" className="orient-glyph" />
            <span>{focusLabel}</span>
          </button>
          <button
            type="button"
            className="orient-control"
            data-capture-control="true"
            aria-expanded={surface.kind === "capture"}
            onClick={(event) => openFrom(event, surface.kind === "capture" ? { kind: "none" } : { kind: "capture" })}
          >
            <PenLine aria-hidden="true" className="orient-glyph" />
            <span>Capture</span>
          </button>
        </div>
      </div>
      <div className="orient-stage">
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
        <div className="orient-surface" role="dialog" aria-label="Transient working surface">
          {surface.kind === "question" ? <QuestionList question={question} onChoose={chooseQuestion} /> : null}
          {surface.kind === "position" ? (
            <PositionSurface
              anchor={anchor}
              today={todayCivil()}
              onAnchor={relocate}
              onSignOut={actions.onSignOut}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "focus" ? (
            <FocusList
              contexts={contexts}
              onChoose={(next) => {
                setFocus(next);
                closeSurface();
              }}
            />
          ) : null}
          {surface.kind === "capture" ? (
            <CaptureSurface capture={capture} onChanged={actions.onTasksChanged} onClose={closeSurface} />
          ) : null}
          {surface.kind === "thread" ? (
            <ThreadSurface
              thread={thread}
              tasks={tasks}
              contexts={contexts}
              onStart={actions.onStartThread}
              onLeave={actions.onLeaveThread}
              onComplete={actions.onCompleteTask}
              onUpdate={actions.onUpdateTask}
              onClose={closeSurface}
            />
          ) : null}
          {surface.kind === "facts" ? (
            <InspectionSurface
              facts={surface.facts}
              chosen={surface.chosen}
              models={models}
              contexts={contexts}
              openTasks={openTasks}
              timeZone={timeZone}
              services={sources}
              onChoose={(fact) => setSurface({ kind: "facts", facts: surface.facts, chosen: fact })}
              onClose={closeSurface}
              onUpdate={actions.onUpdate}
              onRemove={actions.onRemove}
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

function readInstrumentForm(): "phone" | "desktop" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
  return window.matchMedia("(max-width: 959px)").matches ? "phone" : "desktop";
}
