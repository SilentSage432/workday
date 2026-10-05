"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  establishmentBlocked,
  establishFromSelection,
  updateFromStored,
  type CanvasEstablishment,
  type CanvasFactRemoval,
  type CanvasFactUpdate,
  type OpenTaskChoice,
} from "@/components/canvasEstablishment";
import { composeWorkCapacityReading } from "@/components/capacityReading";
import type { SourceRead } from "@/components/currentTemporalReading";
import {
  formatSelectionRange,
  initialSelectionSession,
  INTENDED_MEANINGS,
  minuteToLocalText,
  ratioFromVisiblePointer,
  reduceSelection,
  selectionClockSentence,
  selectionFrame,
  selectionLocalClock,
  SELECTION_HOLD_MS,
  SELECTION_MOVE_SLOP_PX,
  type SelectionSession,
  type TimeSelection,
} from "@/components/daySelection";
import { factAddress, type FactAddress } from "@/components/factAddress";
import { composeMonthReading } from "@/components/monthReading";
import {
  ALLOCATABLE_REMAINDER_LABEL,
  allocatableRemainderBands,
  civilDatesInSpan,
  coextensiveFrame,
  compressedKindLabel,
  compressedPlacement,
  explicitCivilSpan,
  factsContainingPoint,
  labelStackIndex,
  markEmphasis,
  minuteFraction,
  PROTOTYPE_MONTH_LENGTH,
  PROTOTYPE_WEEK_LENGTH,
  prototypeSpanStep,
  questionAllowsCapacityRemainder,
  questionAllowsEstablishment,
  questionShowsDirection,
  reachStripJob,
  shiftedAnchor,
  threadLine,
  threadRestingWeight,
  type ContextFocus,
  type PrototypeQuestion,
} from "@/components/prototype/instrumentModel";
import { composeWeekShapeReading } from "@/components/weekReading";
import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Context } from "@/domain/context";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
import { localMinutes, parseLocalTime, zonedLocalClock } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { composeDayCanvas, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineFact, TimelineSourceKind } from "@/projections/timeline";

const buttonClass = "min-h-11 border border-stone-500 bg-stone-900 px-3 text-left text-base text-stone-100";
const edgeClass = "min-h-11 border border-stone-500 bg-stone-900 px-2 text-base text-stone-100";
const fieldClass = "mt-1 w-full border border-stone-600 bg-stone-950 px-2 py-2 text-base text-stone-100";

export type ThreadReading =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; active: boolean; resumeTitle: string | null };

export type InstrumentSources = {
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  destinations: SourceRead<Destination>;
  priorities: SourceRead<Priority>;
  taskPriorityService: SourceRead<TaskPriorityService>;
  blockPriorityService: SourceRead<BlockPriorityService>;
  citedTasks: SourceRead<CitedTaskIdentity>;
};

type FactReference = { kind: "choose"; facts: FactAddress[] } | { kind: "inspect"; fact: FactAddress };

const QUESTION_LABEL: Record<PrototypeQuestion, string> = {
  present: "Present",
  day: "Day",
  week: "Week",
  month: "Month",
};

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

/**
 * Disposable low-fidelity body.
 * Question, Context focus, selection, and strip job are transient.
 * Save is the only establishment act this view can request.
 */
export function InstrumentView({
  timeZone,
  now,
  anchor,
  onAnchor,
  loaded,
  sources,
  contexts,
  openTasks,
  thread,
  capture,
  onEstablish,
  onUpdate,
  onRemove,
  onSignOut,
}: {
  timeZone: string;
  now: Date;
  anchor: string;
  onAnchor: (civilDate: string) => void;
  loaded: { from: string; to: string };
  sources: InstrumentSources;
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  thread: ThreadReading;
  capture: ReactNode;
  onEstablish: (establishment: CanvasEstablishment) => Promise<void>;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
  onSignOut: () => void;
}) {
  const [clock, setClock] = useState(now);
  const [question, setQuestion] = useState<PrototypeQuestion>("day");
  const [focus, setFocus] = useState<ContextFocus>({ kind: "everything" });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [factReference, setFactReference] = useState<FactReference | null>(null);
  const [directionId, setDirectionId] = useState<string | null>(null);
  const [session, setSession] = useState<SelectionSession>(initialSelectionSession);
  const sessionRef = useRef(session);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayScroll = useRef(0);
  const weekScroll = useRef(0);
  const monthScroll = useRef(0);
  const previousQuestion = useRef<PrototypeQuestion>(question);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function publish(next: SelectionSession) {
    sessionRef.current = next;
    setSession(next);
  }

  function rememberScroll() {
    const element = scrollRef.current;
    if (!element) return;
    if (question === "week") weekScroll.current = element.scrollTop;
    else if (question === "month") monthScroll.current = element.scrollTop;
    else dayScroll.current = element.scrollTop;
  }

  function chooseQuestion(next: PrototypeQuestion) {
    rememberScroll();
    if (next === "present") {
      try {
        const today = zonedLocalClock(clock, timeZone).civilDate;
        if (today !== anchor) onAnchor(today);
      } catch {
        // The present mark is withheld when the clock cannot be read.
      }
    }
    setQuestion(next);
  }

  useEffect(() => {
    const previous = previousQuestion.current;
    previousQuestion.current = question;
    if (previous === question || question === "present") return;
    const element = scrollRef.current;
    if (!element) return;
    if (question === "day") element.scrollTop = dayScroll.current;
    if (question === "week") element.scrollTop = weekScroll.current;
    if (question === "month") element.scrollTop = monthScroll.current;
  }, [question]);

  useEffect(() => {
    if (question !== "present") return;
    const element = scrollRef.current;
    const mark = element?.querySelector("[data-present-mark]");
    if (!element || !(mark instanceof HTMLElement)) return;
    element.scrollTop = Math.max(0, mark.offsetTop - element.clientHeight / 3);
  }, [question, anchor]);

  function referTo(facts: FactAddress[]) {
    publish(reduceSelection(sessionRef.current, { type: "discard" }));
    setCaptureOpen(false);
    setDirectionId(null);
    setFactReference(facts.length === 1 ? { kind: "inspect", fact: facts[0] } : { kind: "choose", facts });
  }

  const workRows = sources.work.status === "ready" ? sources.work.rows : null;
  const protectedRows = sources.protectedTime.status === "ready" ? sources.protectedTime.rows : null;
  const blockRows = sources.blocks.status === "ready" ? sources.blocks.rows : null;
  const commitmentRows = sources.commitments.status === "ready" ? sources.commitments.rows : null;
  const temporalReady = workRows !== null && protectedRows !== null && blockRows !== null && commitmentRows !== null;
  const temporalFailure = [sources.work, sources.protectedTime, sources.blocks, sources.commitments].find(
    (source): source is { status: "failed"; message: string } => source.status === "failed",
  );

  const dayModel =
    workRows && protectedRows && blockRows && commitmentRows
      ? composeDayCanvas({
          selectedDay: anchor,
          timeZone,
          workSchedule: workRows,
          protectedTime: protectedRows,
          blocks: blockRows,
          commitments: commitmentRows,
        })
      : null;

  const weekSpan = explicitCivilSpan(anchor, PROTOTYPE_WEEK_LENGTH);
  const monthSpan = explicitCivilSpan(anchor, PROTOTYPE_MONTH_LENGTH);
  const weekReading = temporalReady
    ? composeWeekShapeReading({
        range: weekSpan,
        timeZone,
        loaded,
        work: sources.work,
        protectedTime: sources.protectedTime,
        blocks: sources.blocks,
        commitments: sources.commitments,
      })
    : { status: "incomplete" as const, message: temporalFailure?.message ?? "This reading is withheld." };
  const monthReading = composeMonthReading({
    range: monthSpan,
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
  });

  let remainder: { startMinute: number; endMinute: number }[] = [];
  if (questionAllowsCapacityRemainder(question) && workRows && protectedRows && blockRows && commitmentRows) {
    remainder = allocatableRemainderBands(
      composeWorkCapacityReading({
        civilDate: anchor,
        timeZone,
        loaded,
        work: { status: "ready", rows: workRows },
        protectedTime: { status: "ready", rows: protectedRows },
        blocks: { status: "ready", rows: blockRows },
        commitments: { status: "ready", rows: commitmentRows },
      }),
      anchor,
      timeZone,
    );
  }

  let todayClock: { civilDate: string; minute: number } | null = null;
  try {
    const shown = zonedLocalClock(clock, timeZone);
    todayClock = { civilDate: shown.civilDate, minute: shown.hour * 60 + shown.minute };
  } catch {
    todayClock = null;
  }
  const presentMinute = todayClock && todayClock.civilDate === anchor ? todayClock.minute : null;

  const job = reachStripJob({
    captureOpen,
    question,
    selectionVisible: session.visible !== null,
    factReferenced: factReference !== null,
    directionInspection: directionId !== null,
  });
  const threadText = threadLine({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
    resumeTitle: thread.status === "ready" ? thread.resumeTitle : null,
  });
  const threadWeight = threadRestingWeight({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
  });
  const step = prototypeSpanStep(question);
  const dateLabel = formatCivilDateLabel(anchor);

  return (
    <div data-prototype="spatial" className="flex h-dvh min-h-0 flex-col bg-stone-950 text-stone-100 md:flex-row">
      <section data-field="true" className="flex min-h-0 min-w-0 flex-1 flex-col border-stone-700">
        <header className="border-b border-stone-700 px-3 py-2">
          <p data-question={question}>
            {QUESTION_LABEL[question]}
            {question === "week" ? ` · Explicit span of ${PROTOTYPE_WEEK_LENGTH} civil days` : null}
            {question === "month" ? ` · Explicit span of ${PROTOTYPE_MONTH_LENGTH} civil days` : null}
          </p>
          <p>{dateLabel}</p>
          {step !== null ? (
            <div className="mt-2 flex gap-2">
              <button type="button" className={buttonClass} onClick={() => onAnchor(shiftedAnchor(anchor, -step))}>
                Earlier
              </button>
              <button type="button" className={buttonClass} onClick={() => onAnchor(shiftedAnchor(anchor, step))}>
                Later
              </button>
            </div>
          ) : (
            <p>Present is this clock.</p>
          )}
        </header>
        {dayModel && (question === "day" || question === "present") ? (
          <AllDayRow model={dayModel} focus={focus} blocks={blockRows ?? []} onRefer={referTo} />
        ) : null}
        <div
          ref={scrollRef}
          data-field-scroll="true"
          className="min-h-0 flex-1 overflow-y-auto"
          onScroll={rememberScroll}
        >
          {question === "day" || question === "present" ? (
            temporalFailure ? (
              <p data-reading="incomplete" className="p-3">
                This reading is withheld. {temporalFailure.message}
              </p>
            ) : dayModel ? (
              <DayField
                model={dayModel}
                question={question}
                focus={focus}
                blocks={blockRows ?? []}
                session={session}
                sessionRef={sessionRef}
                publish={publish}
                onRefer={referTo}
                remainder={remainder}
                presentMinute={presentMinute}
                anchor={anchor}
              />
            ) : (
              <p data-reading="incomplete" className="p-3">
                This reading is withheld.
              </p>
            )
          ) : null}
          {question === "week" ? (
            weekReading.status === "incomplete" ? (
              <p data-reading="incomplete" className="p-3">
                This reading is withheld. {weekReading.message}
              </p>
            ) : (
              <CompressedField
                dates={civilDatesInSpan(weekReading.range)}
                facts={weekReading.facts}
                timeZone={timeZone}
                focus={focus}
                presentMinute={todayClock?.minute ?? null}
                today={todayClock?.civilDate ?? null}
                dense={false}
              />
            )
          ) : null}
          {question === "month" ? (
            monthReading.status === "incomplete" ? (
              <p data-reading="incomplete" className="p-3">
                This reading is withheld. {monthReading.message}
              </p>
            ) : (
              <CompressedField
                dates={civilDatesInSpan(monthReading.range)}
                facts={monthReading.temporalFacts}
                timeZone={timeZone}
                focus={focus}
                presentMinute={todayClock?.minute ?? null}
                today={todayClock?.civilDate ?? null}
                dense
              />
            )
          ) : null}
        </div>
      </section>
      {questionShowsDirection(question) ? (
        <DirectionPlane
          reading={monthReading}
          selectedId={directionId}
          onSelect={(id) => {
            setDirectionId(id);
            setCaptureOpen(false);
            setFactReference(null);
            publish(reduceSelection(sessionRef.current, { type: "discard" }));
          }}
        />
      ) : null}
      <aside
        data-reach-strip="true"
        data-reach-job={job}
        data-reach-resting={job === "resting" ? "compact" : "expanded"}
        className={
          job === "resting"
            ? "shrink-0 overflow-y-auto border-t border-stone-600 md:w-80 md:border-t-0 md:border-l"
            : "max-h-[42vh] shrink-0 overflow-y-auto border-t border-stone-600 md:max-h-none md:w-80 md:border-t-0 md:border-l"
        }
      >
        <div className="px-3 py-2">
          <p
            data-active-thread="true"
            data-thread-weight={threadWeight}
            className={threadWeight === "quiet" ? "text-xs text-stone-500" : "text-base"}
          >
            {threadText}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <QuestionControl question={question} onChoose={chooseQuestion} />
            <FocusControl contexts={contexts} focus={focus} onFocus={setFocus} />
            {job === "resting" ? (
              <button type="button" className={edgeClass} onClick={() => setCaptureOpen(true)}>
                Capture
              </button>
            ) : null}
            <AccountDisclosure onSignOut={onSignOut} />
          </div>
          {job === "capture" ? (
            <div>
              {capture}
              <button type="button" className={`${buttonClass} mt-2`} onClick={() => setCaptureOpen(false)}>
                Close capture
              </button>
            </div>
          ) : null}
          {job === "temporal-reference" && session.visible ? (
            <ReferenceStrip
              selection={session.visible}
              session={session}
              timeZone={timeZone}
              contexts={contexts}
              openTasks={openTasks}
              publish={publish}
              onEstablish={onEstablish}
            />
          ) : null}
          {job === "inspection" && factReference && dayModel ? (
            <InspectionStrip
              reference={factReference}
              model={dayModel}
              contexts={contexts}
              openTasks={openTasks}
              timeZone={timeZone}
              services={sources}
              onChoose={(fact) => setFactReference({ kind: "inspect", fact })}
              onClose={() => setFactReference(null)}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ) : null}
          {job === "direction-inspection" && directionId && monthReading.status === "complete" ? (
            <DirectionInspection
              priorityId={directionId}
              reading={monthReading}
              blocks={sources.blocks.status === "ready" ? sources.blocks.rows : []}
              onClose={() => setDirectionId(null)}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function QuestionControl({
  question,
  onChoose,
}: {
  question: PrototypeQuestion;
  onChoose: (question: PrototypeQuestion) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div data-question-control="true">
      <button
        type="button"
        className={edgeClass}
        aria-expanded={open}
        aria-label={`Question, ${QUESTION_LABEL[question]}`}
        onClick={() => setOpen((current) => !current)}
      >
        {QUESTION_LABEL[question]}
      </button>
      {open ? (
        <div role="group" aria-label="Questions of this time" className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(QUESTION_LABEL) as PrototypeQuestion[]).map((item) => (
            <button
              key={item}
              type="button"
              className={edgeClass}
              aria-pressed={question === item}
              onClick={() => {
                onChoose(item);
                setOpen(false);
              }}
            >
              {QUESTION_LABEL[item]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FocusControl({
  contexts,
  focus,
  onFocus,
}: {
  contexts: SourceRead<Context>;
  focus: ContextFocus;
  onFocus: (focus: ContextFocus) => void;
}) {
  const [open, setOpen] = useState(false);
  if (contexts.status === "failed") {
    return <p>Context focus could not be read.</p>;
  }
  const name = focus.kind === "everything" ? "Everything" : focus.name;
  return (
    <div data-focus-control="true">
      <button
        type="button"
        className={edgeClass}
        aria-expanded={open}
        aria-label="Context focus"
        onClick={() => setOpen((current) => !current)}
      >
        Focus: {name}
      </button>
      {open ? (
        <div role="group" aria-label="Context focus choices" className="mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            className={edgeClass}
            aria-pressed={focus.kind === "everything"}
            onClick={() => {
              onFocus({ kind: "everything" });
              setOpen(false);
            }}
          >
            Everything
          </button>
          {contexts.rows.map((context) => (
            <button
              key={context.id}
              type="button"
              className={edgeClass}
              aria-pressed={focus.kind === "context" && focus.id === context.id}
              onClick={() => {
                onFocus({ kind: "context", id: context.id, name: context.name });
                setOpen(false);
              }}
            >
              {context.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccountDisclosure({ onSignOut }: { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-account="true">
      <button
        type="button"
        className="min-h-11 px-1 text-xs text-stone-500"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Account
      </button>
      {open ? (
        <button type="button" className={`${buttonClass} mt-1`} onClick={onSignOut}>
          Sign out
        </button>
      ) : null}
    </div>
  );
}

function contextIdFor(sourceKind: TimelineSourceKind, sourceId: string, blocks: readonly Block[]): string | null {
  if (sourceKind !== "block") return null;
  return blocks.find((block) => block.id === sourceId)?.contextId ?? null;
}

function emphasisClass(emphasis: "ordinary" | "quiet", kind: TimelineSourceKind): string {
  const quiet = emphasis === "quiet" ? "border-dotted text-stone-400" : "border-solid text-stone-100";
  const shape =
    kind === "work_schedule"
      ? "border-l-8"
      : kind === "protected_time"
        ? "border-dashed"
        : kind === "commitment"
          ? "border-4 border-double"
          : "border-2";
  return `border border-stone-400 ${shape} ${quiet}`;
}

function AllDayRow({
  model,
  focus,
  blocks,
  onRefer,
}: {
  model: DayCanvasModel;
  focus: ContextFocus;
  blocks: readonly Block[];
  onRefer: (facts: FactAddress[]) => void;
}) {
  if (model.allDay.length === 0 && model.unresolved.length === 0) return null;
  return (
    <div className="border-b border-stone-700 px-3 py-2">
      {model.allDay.map((fact) => {
        const emphasis = markEmphasis({
          sourceKind: fact.sourceKind,
          contextId: contextIdFor(fact.sourceKind, fact.sourceId, blocks),
          focus,
        });
        return (
          <button
            key={`${fact.sourceKind}:${fact.sourceId}`}
            type="button"
            className={`${buttonClass} mb-2 ${emphasisClass(emphasis, fact.sourceKind)}`}
            data-source-kind={fact.sourceKind}
            data-source-id={fact.sourceId}
            data-emphasis={emphasis}
            aria-label={fact.accessibleLabel}
            onClick={() => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }])}
          >
            All day · {fact.kindLabel}
            {emphasis === "quiet" ? " · quiet" : ""}
          </button>
        );
      })}
      {model.unresolved.map((fact) => (
        <p key={`${fact.sourceKind}:${fact.sourceId}`} data-silence="unresolved">
          Unresolved · {fact.kindLabel}. Not placed on an hour.
        </p>
      ))}
    </div>
  );
}

function DayField({
  model,
  question,
  focus,
  blocks,
  session,
  sessionRef,
  publish,
  onRefer,
  remainder,
  presentMinute,
  anchor,
}: {
  model: DayCanvasModel;
  question: PrototypeQuestion;
  focus: ContextFocus;
  blocks: readonly Block[];
  session: SelectionSession;
  sessionRef: { current: SelectionSession };
  publish: (next: SelectionSession) => void;
  onRefer: (facts: FactAddress[]) => void;
  remainder: { startMinute: number; endMinute: number }[];
  presentMinute: number | null;
  anchor: string;
}) {
  if (model.axis === "unpositioned") {
    return (
      <p data-reading="unpositioned" className="p-3">
        {model.clockLabelNote ?? "Time could not be positioned for this date."}
      </p>
    );
  }
  return (
    <div>
      {model.clockLabelNote ? <p className="px-3 py-2 text-sm">{model.clockLabelNote}</p> : null}
      {remainder.length > 0 ? (
        <p data-silence-note="allocatable" className="px-3 py-1 text-xs text-stone-500">
          Dotted regions inside the shift are {ALLOCATABLE_REMAINDER_LABEL.toLowerCase()}.
        </p>
      ) : null}
      <DayClock
        model={model}
        manipulate={questionAllowsEstablishment(question)}
        focus={focus}
        blocks={blocks}
        session={session}
        sessionRef={sessionRef}
        publish={publish}
        onRefer={onRefer}
        remainder={remainder}
        presentMinute={question === "week" || question === "month" ? null : presentMinute}
        anchor={anchor}
      />
    </div>
  );
}

function ratioOnSurface(surface: HTMLElement, clientY: number): number {
  const rect = surface.getBoundingClientRect();
  const scroller = surface.closest("[data-field-scroll]")?.getBoundingClientRect();
  return ratioFromVisiblePointer(
    clientY,
    { top: rect.top, height: rect.height },
    scroller ? { top: scroller.top, height: scroller.height } : null,
  );
}

function factsUnderPointer(surface: HTMLElement, x: number, y: number): FactAddress[] {
  const boxes: { sourceKind: FactAddress["sourceKind"]; sourceId: string; left: number; top: number; right: number; bottom: number }[] =
    [];
  surface.querySelectorAll<HTMLElement>("article[data-source-kind][data-source-id]").forEach((article) => {
    const address = factAddress(article.dataset.sourceKind ?? "", article.dataset.sourceId ?? "");
    if (!address) return;
    const box = article.getBoundingClientRect();
    boxes.push({ ...address, left: box.left, top: box.top, right: box.right, bottom: box.bottom });
  });
  return factsContainingPoint(boxes, x, y).map((box) => ({ sourceKind: box.sourceKind, sourceId: box.sourceId }));
}

function DayClock({
  model,
  manipulate,
  focus,
  blocks,
  session,
  sessionRef,
  publish,
  onRefer,
  remainder,
  presentMinute,
  anchor,
}: {
  model: DayCanvasModel;
  manipulate: boolean;
  focus: ContextFocus;
  blocks: readonly Block[];
  session: SelectionSession;
  sessionRef: { current: SelectionSession };
  publish: (next: SelectionSession) => void;
  onRefer: (facts: FactAddress[]) => void;
  remainder: { startMinute: number; endMinute: number }[];
  presentMinute: number | null;
  anchor: string;
}) {
  const holdTimer = useRef<number | null>(null);
  const arm = useRef<"reducer" | "fact-wait">("reducer");
  const hits = useRef<FactAddress[]>([]);
  const origin = useRef<{ x: number; y: number; ratio: number; pointerId: number } | null>(null);
  const placements = [...model.context, ...model.foreground];
  const selecting = session.gesture.phase === "selecting";

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
        civilDate: anchor,
      }),
    );
    if (event.pointerType === "touch") {
      const pointerId = event.pointerId;
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        const held = reduceSelection(sessionRef.current, { type: "hold", pointerId, civilDate: anchor });
        if (held.gesture.phase === "selecting") {
          hits.current = [];
          try {
            surface.setPointerCapture(pointerId);
          } catch {
            // Pointer capture is best-effort. The selection still follows later moves.
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
          civilDate: anchor,
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
      civilDate: anchor,
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
        civilDate: anchor,
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

  const frame = session.visible ? selectionFrame(session.visible) : null;

  return (
    <div
      data-time-surface="true"
      data-axis="local-clock"
      className="relative select-none"
      style={{ height: "66rem", touchAction: selecting ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          className="pointer-events-none absolute right-0 left-0 border-t border-stone-800 text-xs text-stone-500"
          style={{ top: `${(hour / 24) * 100}%` }}
        >
          {String(hour).padStart(2, "0")}
        </div>
      ))}
      {remainder.map((band) => (
        <div
          key={`${band.startMinute}-${band.endMinute}`}
          data-silence="allocatable"
          className="pointer-events-none absolute right-0 left-0 border border-dotted border-stone-500"
          style={{
            top: `${minuteFraction(band.startMinute) * 100}%`,
            height: `${minuteFraction(band.endMinute - band.startMinute) * 100}%`,
          }}
        />
      ))}
      {placements.map((placement) => {
        const contextId =
          placement.stored?.sourceKind === "block"
            ? placement.stored.contextId
            : contextIdFor(placement.sourceKind, placement.sourceId, blocks);
        const emphasis = markEmphasis({ sourceKind: placement.sourceKind, contextId, focus });
        const box = coextensiveFrame(placement);
        const stack = labelStackIndex(placement, placements);
        const accessible =
          emphasis === "quiet" ? `${placement.accessibleLabel} Outside the current focus.` : placement.accessibleLabel;
        return (
          <article
            key={`${placement.sourceKind}:${placement.sourceId}`}
            data-source-kind={placement.sourceKind}
            data-source-id={placement.sourceId}
            data-emphasis={emphasis}
            data-top={box.top}
            data-height={box.height}
            data-label-index={stack}
            aria-label={accessible}
            className={`pointer-events-none absolute px-1 text-xs ${emphasisClass(emphasis, placement.sourceKind)}`}
            style={box}
          >
            <p className="absolute left-1" style={{ top: `${stack}rem` }}>
              {placement.kindLabel}
              {emphasis === "quiet" ? " quiet" : ""}
            </p>
          </article>
        );
      })}
      {frame ? (
        <div
          data-temporal-reference="true"
          className="pointer-events-none absolute right-0 left-0 border-2 border-stone-100"
          style={{ top: `${frame.top * 100}%`, height: `${frame.height * 100}%` }}
        />
      ) : null}
      {presentMinute !== null ? (
        <div
          data-present-mark="true"
          className="pointer-events-none absolute right-0 left-0 border-t border-stone-400"
          style={{ top: `${minuteFraction(presentMinute) * 100}%` }}
        >
          <span className="sr-only">Now</span>
        </div>
      ) : null}
    </div>
  );
}

function CompressedField({
  dates,
  facts,
  timeZone,
  focus,
  presentMinute,
  today,
  dense,
}: {
  dates: readonly string[];
  facts: readonly TimelineFact[];
  timeZone: string;
  focus: ContextFocus;
  presentMinute: number | null;
  today: string | null;
  dense: boolean;
}) {
  return (
    <div data-compressed-field="true">
      {dates.map((date) => (
        <div key={date} data-civil-date={date} className="grid grid-cols-[6.5rem_5.5rem_1fr] border-b border-stone-700">
          <div className="p-1 text-sm">{formatCivilDateLabel(date)}</div>
          <div className="border-l border-stone-700 p-1">
            {facts.map((fact) => {
              const placed = compressedPlacement(fact, date, timeZone);
              if (!placed || placed.placement === "timed") return null;
              const emphasis = markEmphasis({
                sourceKind: fact.sourceKind,
                contextId: fact.sourceKind === "block" ? fact.contextId : null,
                focus,
              });
              return (
                <p
                  key={`${fact.sourceKind}:${fact.sourceId}:${placed.placement}`}
                  data-source-kind={fact.sourceKind}
                  data-emphasis={emphasis}
                  data-silence={placed.placement === "unresolved" ? "unresolved" : "all-day"}
                  className={emphasisClass(emphasis, fact.sourceKind)}
                >
                  {placed.placement === "unresolved" ? "Unresolved" : "All day"} · {compressedKindLabel(fact.sourceKind)}
                  {emphasis === "quiet" ? " · quiet" : ""}
                </p>
              );
            })}
          </div>
          <div className={`relative border-l border-stone-700 ${dense ? "h-8" : "h-14"}`}>
            {(() => {
              const timed = facts.flatMap((fact) => {
                const placed = compressedPlacement(fact, date, timeZone);
                if (!placed || placed.placement !== "timed") return [];
                return [
                  {
                    fact,
                    placed,
                    sourceKind: fact.sourceKind,
                    sourceId: fact.sourceId,
                    visibleStartMinute: placed.startMinute,
                    visibleEndMinute: placed.endMinute,
                  },
                ];
              });
              return timed.map((item) => {
                const emphasis = markEmphasis({
                  sourceKind: item.fact.sourceKind,
                  contextId: item.fact.sourceKind === "block" ? item.fact.contextId : null,
                  focus,
                });
                const stack = labelStackIndex(item, timed);
                return (
                  <div
                    key={`${item.fact.sourceKind}:${item.fact.sourceId}`}
                    data-source-kind={item.fact.sourceKind}
                    data-emphasis={emphasis}
                    data-label-index={stack}
                    className={`absolute top-0 text-xs ${emphasisClass(emphasis, item.fact.sourceKind)}`}
                    style={{
                      left: `${minuteFraction(item.placed.startMinute) * 100}%`,
                      width: `${minuteFraction(item.placed.endMinute - item.placed.startMinute) * 100}%`,
                      height: "100%",
                    }}
                    title={item.fact.sourceKind === "protected_time" ? "Unavailable for allocation." : undefined}
                  >
                    <span className="absolute top-0" style={{ left: `${stack * 3.25}rem` }}>
                      {compressedKindLabel(item.fact.sourceKind)}
                      {emphasis === "quiet" ? " quiet" : ""}
                    </span>
                  </div>
                );
              });
            })()}
            {today === date && presentMinute !== null ? (
              <div
                data-present-mark="true"
                className="pointer-events-none absolute top-0 bottom-0 border-l border-stone-400"
                style={{ left: `${minuteFraction(presentMinute) * 100}%` }}
              >
                <span className="sr-only">Now</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DirectionPlane({
  reading,
  selectedId,
  onSelect,
}: {
  reading: ReturnType<typeof composeMonthReading>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      data-direction-plane="true"
      className="max-h-[18vh] min-h-0 overflow-y-auto border-t border-stone-600 md:max-h-none md:w-72 md:border-t-0 md:border-l"
    >
      <div className="p-3">
        <h2 className="text-base">Direction</h2>
        {reading.status === "incomplete" ? (
          <p data-reading="incomplete">This reading is withheld. {reading.message}</p>
        ) : (
          <DirectionList reading={reading} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}

function DirectionList({
  reading,
  selectedId,
  onSelect,
}: {
  reading: Extract<ReturnType<typeof composeMonthReading>, { status: "complete" }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const placed = new Set<string>();
  if (reading.destinations.length === 0 && reading.priorities.length === 0) {
    return <p>No direction is established.</p>;
  }
  return (
    <div className="mt-2 flex flex-col gap-3">
      {reading.destinations.map((destination) => {
        const priorities = reading.priorities.filter((priority) => priority.destinationId === destination.id);
        priorities.forEach((priority) => placed.add(priority.id));
        return (
          <section key={destination.id} className="border border-stone-600 p-2">
            <h3 className="text-sm">Destination</h3>
            <p>{destination.content}</p>
            {priorities.map((priority) => (
              <PriorityButton key={priority.id} priority={priority} pressed={selectedId === priority.id} onSelect={onSelect} />
            ))}
          </section>
        );
      })}
      {reading.priorities
        .filter((priority) => !placed.has(priority.id))
        .map((priority) => (
          <PriorityButton key={priority.id} priority={priority} pressed={selectedId === priority.id} onSelect={onSelect} />
        ))}
    </div>
  );
}

function PriorityButton({
  priority,
  pressed,
  onSelect,
}: {
  priority: Priority;
  pressed: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button type="button" className={`${buttonClass} mt-2`} aria-pressed={pressed} onClick={() => onSelect(priority.id)}>
      Priority · {priority.content}
    </button>
  );
}

function DirectionInspection({
  priorityId,
  reading,
  blocks,
  onClose,
}: {
  priorityId: string;
  reading: Extract<ReturnType<typeof composeMonthReading>, { status: "complete" }>;
  blocks: readonly Block[];
  onClose: () => void;
}) {
  const priority = reading.priorities.find((item) => item.id === priorityId);
  const tasks = reading.taskPriorityService
    .filter((pair) => pair.priorityId === priorityId)
    .map((pair) => reading.citedTasks.find((task) => task.id === pair.taskId)?.title ?? "A task serves this priority.");
  const blockLines = reading.blockPriorityService
    .filter((pair) => pair.priorityId === priorityId)
    .map((pair) => blocks.find((block) => block.id === pair.blockId)?.purpose ?? "A block serves this priority.");
  return (
    <div data-direction-inspection="true">
      <p>{priority ? priority.content : "Priority"}</p>
      {tasks.length === 0 && blockLines.length === 0 ? <p>No service is recorded.</p> : null}
      {tasks.map((title, index) => (
        <p key={`${priorityId}:task:${index}`}>Task serves this priority · {title}</p>
      ))}
      {blockLines.map((purpose, index) => (
        <p key={`${priorityId}:block:${index}`}>Block serves this priority · {purpose}</p>
      ))}
      <button type="button" className={`${buttonClass} mt-2`} onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function ReferenceStrip({
  selection,
  session,
  timeZone,
  contexts,
  openTasks,
  publish,
  onEstablish,
}: {
  selection: TimeSelection;
  session: SelectionSession;
  timeZone: string;
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  publish: (next: SelectionSession) => void;
  onEstablish: (establishment: CanvasEstablishment) => Promise<void>;
}) {
  const selectionKey = `${selection.civilDate}:${selection.startMinute}:${selection.endMinute}`;
  const [syncKey, setSyncKey] = useState(selectionKey);
  const [startDraft, setStartDraft] = useState(() => minuteToLocalText(selection.startMinute));
  const [endDraft, setEndDraft] = useState(() => minuteToLocalText(selection.endMinute));
  if (syncKey !== selectionKey) {
    setSyncKey(selectionKey);
    setStartDraft(minuteToLocalText(selection.startMinute));
    setEndDraft(minuteToLocalText(selection.endMinute));
  }
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [title, setTitle] = useState("");
  const [contextId, setContextId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const clock = selectionLocalClock(selection, timeZone);
  const clockNote = selectionClockSentence(clock);

  function applyDraft() {
    try {
      const startMinute = localMinutes(parseLocalTime(startDraft));
      const endMinute = localMinutes(parseLocalTime(endDraft));
      publish(reduceSelection(session, { type: "refine", startMinute, endMinute }));
    } catch {
      setStartDraft(minuteToLocalText(selection.startMinute));
      setEndDraft(minuteToLocalText(selection.endMinute));
    }
  }

  async function save() {
    if (saving || !session.intendedMeaning) return;
    setSaving(true);
    setError(null);
    try {
      const establishment = establishFromSelection({
        selection,
        meaning: session.intendedMeaning,
        clock,
        label,
        purpose,
        contextId,
        title,
        taskId: taskId.length > 0 ? taskId : null,
      });
      await onEstablish(establishment);
      publish(reduceSelection(session, { type: "discard" }));
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not establish this."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-temporal-reference-strip="true">
      <p>{formatSelectionRange(selection)}</p>
      {clockNote ? <p>{clockNote}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-sm">
          Start
          <input
            aria-label="Reference start"
            value={startDraft}
            onChange={(event) => setStartDraft(event.target.value)}
            onBlur={applyDraft}
            className={fieldClass}
          />
        </label>
        <label className="text-sm">
          End
          <input
            aria-label="Reference end"
            value={endDraft}
            onChange={(event) => setEndDraft(event.target.value)}
            onBlur={applyDraft}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {INTENDED_MEANINGS.map((meaning) => (
          <button
            key={meaning.meaning}
            type="button"
            className={buttonClass}
            aria-pressed={session.intendedMeaning === meaning.meaning}
            onClick={() => publish(reduceSelection(session, { type: "choose", meaning: meaning.meaning }))}
          >
            {meaning.action}
          </button>
        ))}
      </div>
      {session.intendedMeaning === "protected_time" ? (
        <label className="mt-2 block text-sm">
          Label
          <input value={label} onChange={(event) => setLabel(event.target.value)} className={fieldClass} />
        </label>
      ) : null}
      {session.intendedMeaning === "block" ? (
        <div className="mt-2">
          <label className="block text-sm">
            Purpose
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className={fieldClass} />
          </label>
          <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
          <TaskAssociation tasks={openTasks} value={taskId} onChange={setTaskId} />
        </div>
      ) : null}
      {session.intendedMeaning === "commitment" ? (
        <label className="mt-2 block text-sm">
          Commitment
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={saving || session.intendedMeaning === null || establishmentBlocked(clock) !== null}
          onClick={() => void save()}
        >
          Save
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => publish(reduceSelection(session, { type: "discard" }))}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContextSelect({
  contexts,
  value,
  onChange,
}: {
  contexts: SourceRead<Context>;
  value: string;
  onChange: (value: string) => void;
}) {
  if (contexts.status === "failed") return <p>Contexts could not be read.</p>;
  return (
    <label className="mt-2 block text-sm">
      Context
      <select aria-label="Block context" className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No context</option>
        {contexts.rows.map((context) => (
          <option key={context.id} value={context.id}>
            {context.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TaskAssociation({
  tasks,
  value,
  onChange,
}: {
  tasks: SourceRead<OpenTaskChoice>;
  value: string;
  onChange: (value: string) => void;
}) {
  if (tasks.status === "failed") return <p>Open tasks could not be read.</p>;
  return (
    <label className="mt-2 block text-sm">
      Task association
      <select aria-label="Task association" className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No task</option>
        {tasks.rows.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function placementFor(model: DayCanvasModel, fact: FactAddress): DayCanvasTimedPlacement | null {
  return (
    [...model.context, ...model.foreground].find(
      (item) => item.sourceKind === fact.sourceKind && item.sourceId === fact.sourceId,
    ) ?? null
  );
}

function listedCopy(model: DayCanvasModel, fact: FactAddress): { kindLabel: string; primary: string } | null {
  const listed = [...model.allDay, ...model.unresolved].find(
    (item) => item.sourceKind === fact.sourceKind && item.sourceId === fact.sourceId,
  );
  return listed ? { kindLabel: listed.kindLabel, primary: listed.primary } : null;
}

function InspectionStrip({
  reference,
  model,
  contexts,
  openTasks,
  timeZone,
  services,
  onChoose,
  onClose,
  onUpdate,
  onRemove,
}: {
  reference: FactReference;
  model: DayCanvasModel;
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: InstrumentSources;
  onChoose: (fact: FactAddress) => void;
  onClose: () => void;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
}) {
  if (reference.kind === "choose") {
    return (
      <div>
        <p>These facts share this point.</p>
        {reference.facts.map((fact) => {
          const placement = placementFor(model, fact);
          const listed = listedCopy(model, fact);
          return (
            <button
              key={`${fact.sourceKind}:${fact.sourceId}`}
              type="button"
              className={`${buttonClass} mt-2`}
              onClick={() => onChoose(fact)}
            >
              {placement?.kindLabel ?? listed?.kindLabel ?? fact.sourceKind}
              {placement?.primary || listed?.primary ? ` · ${placement?.primary ?? listed?.primary}` : ""}
            </button>
          );
        })}
        <button type="button" className={`${buttonClass} mt-2`} onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  const fact = reference.fact;
  const placement = placementFor(model, fact);
  const listed = listedCopy(model, fact);
  const stored = placement?.stored ?? null;
  const editable = stored !== null;
  return (
    <FactEditor
      fact={fact}
      kindLabel={placement?.kindLabel ?? listed?.kindLabel ?? fact.sourceKind}
      primary={placement?.primary ?? listed?.primary ?? ""}
      interval={placement?.shownInterval ?? placement?.sourceInterval ?? "All day"}
      stored={stored}
      contexts={contexts}
      openTasks={openTasks}
      timeZone={timeZone}
      services={services}
      editable={editable}
      onClose={onClose}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />
  );
}

function FactEditor({
  fact,
  kindLabel,
  primary,
  interval,
  stored,
  contexts,
  openTasks,
  timeZone,
  services,
  editable,
  onClose,
  onUpdate,
  onRemove,
}: {
  fact: FactAddress;
  kindLabel: string;
  primary: string;
  interval: string;
  stored: DayCanvasTimedPlacement["stored"];
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: InstrumentSources;
  editable: boolean;
  onClose: () => void;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDraft, setStartDraft] = useState(stored && "startLocal" in stored ? stored.startLocal : "");
  const [endDraft, setEndDraft] = useState(stored && "endLocal" in stored ? stored.endLocal : "");
  const [label, setLabel] = useState(stored?.sourceKind === "protected_time" ? (stored.label ?? "") : "");
  const [purpose, setPurpose] = useState(stored?.sourceKind === "block" ? stored.purpose : "");
  const [contextId, setContextId] = useState(stored?.sourceKind === "block" ? (stored.contextId ?? "") : "");
  const [title, setTitle] = useState(stored?.sourceKind === "commitment" ? stored.title : "");
  const [taskId, setTaskId] = useState(stored?.sourceKind === "block" ? (stored.taskId ?? "") : "");
  const removable = fact.sourceKind === "protected_time" || fact.sourceKind === "block" || fact.sourceKind === "commitment";
  const serviceLines = serviceLinesFor(fact, services);

  async function save() {
    if (!stored || saving) return;
    setSaving(true);
    setError(null);
    try {
      const startMinute = localMinutes(parseLocalTime(startDraft));
      const endMinute = localMinutes(parseLocalTime(endDraft));
      const selection = { civilDate: stored.startsOn, startMinute, endMinute };
      const clock = selectionLocalClock(selection, timeZone);
      const update = updateFromStored({
        id: fact.sourceId,
        startsOn: stored.startsOn,
        meaning: stored.sourceKind,
        startMinute,
        endMinute,
        clock,
        label,
        purpose,
        contextId,
        title,
        taskId: taskId.length > 0 ? taskId : null,
      });
      await onUpdate(update);
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not save this fact."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removable || saving || fact.sourceKind === "work_schedule") return;
    setSaving(true);
    setError(null);
    try {
      await onRemove({ meaning: fact.sourceKind, id: fact.sourceId });
      onClose();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not delete this fact."));
      setSaving(false);
    }
  }

  return (
    <div data-fact-inspection="true">
      <p>
        {kindLabel}
        {primary ? ` · ${primary}` : ""}
      </p>
      <p>{interval}</p>
      {serviceLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {editing && stored ? (
        <div className="mt-2">
          <label className="block text-sm">
            Start
            <input aria-label="Fact start" value={startDraft} onChange={(event) => setStartDraft(event.target.value)} className={fieldClass} />
          </label>
          <label className="mt-2 block text-sm">
            End
            <input aria-label="Fact end" value={endDraft} onChange={(event) => setEndDraft(event.target.value)} className={fieldClass} />
          </label>
          {stored.sourceKind === "protected_time" ? (
            <label className="mt-2 block text-sm">
              Label
              <input value={label} onChange={(event) => setLabel(event.target.value)} className={fieldClass} />
            </label>
          ) : null}
          {stored.sourceKind === "block" ? (
            <>
              <label className="mt-2 block text-sm">
                Purpose
                <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className={fieldClass} />
              </label>
              <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
              <TaskAssociation tasks={openTasks} value={taskId} onChange={setTaskId} />
            </>
          ) : null}
          {stored.sourceKind === "commitment" ? (
            <label className="mt-2 block text-sm">
              Commitment
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
            </label>
          ) : null}
          <button type="button" className={`${buttonClass} mt-2`} disabled={saving} onClick={() => void save()}>
            Save
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-2">
        {editable && !editing ? (
          <button type="button" className={buttonClass} onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : null}
        {removable ? (
          <button type="button" className={buttonClass} onClick={() => (armed ? void remove() : setArmed(true))}>
            {armed ? "Confirm delete" : "Delete this fact"}
          </button>
        ) : null}
        <button type="button" className={buttonClass} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function serviceLinesFor(fact: FactAddress, services: InstrumentSources): string[] {
  if (fact.sourceKind !== "block") return [];
  if (services.blockPriorityService.status !== "ready" || services.priorities.status !== "ready") return [];
  return services.blockPriorityService.rows
    .filter((pair) => pair.blockId === fact.sourceId)
    .map((pair) => {
      const priority = services.priorities.status === "ready" ? services.priorities.rows.find((item) => item.id === pair.priorityId) : null;
      return priority ? `Serves priority · ${priority.content}` : "Serves a priority.";
    });
}
