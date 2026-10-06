"use client";

import { useEffect, useState } from "react";
import {
  establishmentBlocked,
  establishFromSelection,
  updateFromStored,
  type CanvasEstablishment,
  type CanvasFactRemoval,
  type CanvasFactUpdate,
  type OpenTaskChoice,
} from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import {
  formatSelectionRange,
  INTENDED_MEANINGS,
  minuteToLocalText,
  reduceSelection,
  selectionClockSentence,
  selectionLocalClock,
  type SelectionSession,
  type TimeSelection,
} from "@/components/daySelection";
import { localMinutes, parseLocalTime } from "@/domain/time/localTime";
import type { FactAddress } from "@/components/factAddress";
import type { Context } from "@/domain/context";
import {
  authorizeNoteEstablishment,
  expressionChanged,
  initialGeneralCapture,
  taskFromExpression,
  taskFromRetainedNote,
  type GeneralCaptureState,
} from "@/domain/generalCapture";
import type { Note } from "@/domain/note";
import { taskEditDraftFromTask, taskPatchFromEditDraft, type TaskEditDraft } from "@/domain/taskEdit";
import type { Task } from "@/domain/task";
import { createTask } from "@/persistence/contextsAndTasks";
import { createNote, loadNotes } from "@/persistence/note";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import type { DayCanvasModel, DayCanvasStoredFact } from "@/projections/dayCanvas";
import type { CaptureBridge, OrientSources, ThreadReading } from "@/components/orient/types";
import { shiftedAnchor, type OrientQuestion } from "@/components/orient/grammar";

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

export function QuestionList({
  question,
  onChoose,
}: {
  question: OrientQuestion;
  onChoose: (question: OrientQuestion) => void;
}) {
  const questions: OrientQuestion[] = ["present", "day", "week", "month"];
  return (
    <div role="group" aria-label="Question" data-question-list="true">
      <h2>Ask the field</h2>
      <div className="orient-keys">
        {questions.map((item) => (
          <button
            key={item}
            type="button"
            className="orient-key"
            aria-current={item === question ? "true" : undefined}
            onClick={() => onChoose(item)}
          >
            {item === "present" ? "Present" : item === "day" ? "Day" : item === "week" ? "Week" : "Month"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PositionSurface({
  anchor,
  today,
  onMove,
  onAdoptToday,
  onSignOut,
  onManageWork,
  onClose,
}: {
  anchor: string;
  today: string | null;
  onMove: (civilDate: string) => void;
  onAdoptToday: (civilDate: string) => void;
  onSignOut: () => void;
  onManageWork: () => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(anchor);
  return (
    <div data-relocation="true">
      <h2>Where in time</h2>
      <div className="orient-actions">
        <button type="button" className="orient-action" onClick={() => onMove(shiftedAnchor(anchor, -1))}>
          Previous civil day
        </button>
        <button type="button" className="orient-action" onClick={() => onMove(shiftedAnchor(anchor, 1))}>
          Next civil day
        </button>
        {today ? (
          <button type="button" className="orient-action" onClick={() => onAdoptToday(today)}>
            Today
          </button>
        ) : null}
      </div>
      <label className="orient-note" htmlFor="orient-civil-date">
        Civil date
        <input
          id="orient-civil-date"
          type="date"
          value={date}
          onChange={(event) => {
            const next = event.target.value;
            setDate(next);
            if (/^\d{4}-\d{2}-\d{2}$/.test(next)) onMove(next);
          }}
        />
      </label>
      <div className="orient-actions">
        <button type="button" className="orient-action" onClick={onClose}>
          Close
        </button>
        <button type="button" className="orient-action" data-manage-work="true" onClick={onManageWork}>
          Manage Work schedule
        </button>
        <button type="button" className="orient-action" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export function FocusList({
  contexts,
  onChoose,
}: {
  contexts: SourceRead<Context>;
  onChoose: (focus: { kind: "everything" } | { kind: "context"; id: string; name: string }) => void;
}) {
  if (contexts.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        The focus could not be read. {contexts.message}
      </p>
    );
  }
  return (
    <div role="group" aria-label="Context focus">
      <h2>Focus</h2>
      <div className="orient-actions">
        <button type="button" className="orient-action" onClick={() => onChoose({ kind: "everything" })}>
          Everything
        </button>
        {contexts.rows.map((context) => (
          <button
            key={context.id}
            type="button"
            className="orient-action"
            onClick={() => onChoose({ kind: "context", id: context.id, name: context.name })}
          >
            {context.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EstablishmentSurface({
  question,
  session,
  timeZone,
  contexts,
  openTasks,
  publish,
  onEstablish,
  onCancel,
}: {
  question: OrientQuestion;
  session: SelectionSession;
  timeZone: string;
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  publish: (next: SelectionSession) => void;
  onEstablish: (establishment: CanvasEstablishment) => Promise<void>;
  onCancel: () => void;
}) {
  const selection = session.visible;
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [title, setTitle] = useState("");
  const [contextId, setContextId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [draftTimes, setDraftTimes] = useState<{
    start: string;
    end: string;
    startMinute: number;
    endMinute: number;
  } | null>(null);
  const startText =
    selection && draftTimes && draftTimes.startMinute === selection.startMinute && draftTimes.endMinute === selection.endMinute
      ? draftTimes.start
      : selection
        ? minuteToLocalText(selection.startMinute)
        : "";
  const endText =
    selection && draftTimes && draftTimes.startMinute === selection.startMinute && draftTimes.endMinute === selection.endMinute
      ? draftTimes.end
      : selection
        ? minuteToLocalText(selection.endMinute)
        : "";
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!selection) return null;
  const clock = selectionLocalClock(refined(selection, startText, endText) ?? selection, timeZone);
  const clockSentence = selectionClockSentence(clock);
  const meaning = session.intendedMeaning;
  const canSave =
    question === "day" &&
    meaning !== null &&
    establishmentBlocked(clock) === null &&
    (meaning === "protected_time" ||
      (meaning === "block" && purpose.trim().length > 0) ||
      (meaning === "commitment" && title.trim().length > 0));

  function applyTimes(start: string, end: string) {
    if (!selection) return;
    setDraftTimes({ start, end, startMinute: selection.startMinute, endMinute: selection.endMinute });
    try {
      const startMinute = localMinutes(parseLocalTime(start));
      const endMinute = localMinutes(parseLocalTime(end));
      publish(reduceSelection(session, { type: "refine", startMinute, endMinute }));
    } catch {
      // Typed precision stays in the fields until it is a real local time.
    }
  }

  async function save() {
    if (!selection || !canSave || !meaning || saving) return;
    const next = refined(selection, startText, endText);
    if (!next) return;
    setSaving(true);
    setError(null);
    try {
      const establishment = establishFromSelection({
        selection: next,
        meaning,
        clock: selectionLocalClock(next, timeZone),
        label,
        purpose,
        contextId,
        title,
        taskId: taskId.length > 0 ? taskId : null,
      });
      await onEstablish(establishment);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-establishment="true">
      <h2>{question === "day" ? "This time" : "Referred interval"}</h2>
      <p>{formatSelectionRange(refined(selection, startText, endText) ?? selection)}</p>
      {question === "present" ? <p>Present does not establish a new temporal fact.</p> : null}
      <label className="orient-note" htmlFor="orient-start">
        Start
        <input id="orient-start" aria-label="Interval start" value={startText} onChange={(event) => applyTimes(event.target.value, endText)} />
      </label>
      <label className="orient-note" htmlFor="orient-end">
        End
        <input id="orient-end" aria-label="Interval end" value={endText} onChange={(event) => applyTimes(startText, event.target.value)} />
      </label>
      {clockSentence ? <p>{clockSentence}</p> : null}
      {question === "day" && meaning === null ? (
        <div className="orient-actions" role="group" aria-label="Temporal meaning">
          {INTENDED_MEANINGS.map((item) => (
            <button
              key={item.meaning}
              type="button"
              className="orient-action"
              data-meaning={item.meaning}
              onClick={() => publish(reduceSelection(session, { type: "choose", meaning: item.meaning }))}
            >
              {item.action}
            </button>
          ))}
        </div>
      ) : null}
      {question === "day" && meaning === "protected_time" ? (
        <label className="orient-note">
          Label
          <input value={label} onChange={(event) => setLabel(event.target.value)} aria-label="Protected time label" />
        </label>
      ) : null}
      {question === "day" && meaning === "block" ? (
        <>
          <label className="orient-note">
            Purpose
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} aria-label="Block purpose" />
          </label>
          <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
          <TaskSelect tasks={openTasks} value={taskId} onChange={setTaskId} />
        </>
      ) : null}
      {question === "day" && meaning === "commitment" ? (
        <label className="orient-note">
          Commitment
          <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Commitment title" />
        </label>
      ) : null}
      {meaning ? (
        <button type="button" className="orient-action" onClick={() => publish(reduceSelection(session, { type: "change-meaning" }))}>
          Change meaning
        </button>
      ) : null}
      {error ? (
        <p role="alert">{error}</p>
      ) : null}
      <div className="orient-actions">
        {question === "day" && meaning ? (
          <button type="button" className="orient-action" data-emphasis="save" disabled={!canSave || saving} onClick={() => void save()}>
            {saving ? "Saving" : "Save"}
          </button>
        ) : null}
        <button type="button" className="orient-action" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function refined(selection: TimeSelection, startText: string, endText: string): TimeSelection | null {
  try {
    return {
      civilDate: selection.civilDate,
    startMinute: localMinutes(parseLocalTime(startText)),
    endMinute: localMinutes(parseLocalTime(endText)),
    };
  } catch {
    return null;
  }
}

export function InspectionSurface({
  facts,
  chosen,
  models,
  contexts,
  openTasks,
  timeZone,
  services,
  onChoose,
  onClose,
  onUpdate,
  onRemove,
  onManageWork,
}: {
  facts: FactAddress[];
  chosen: FactAddress | null;
  models: readonly DayCanvasModel[];
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: OrientSources;
  onChoose: (fact: FactAddress) => void;
  onClose: () => void;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
  onManageWork: (civilDate: string) => void;
}) {
  if (!chosen && facts.length > 1) {
    return (
      <div data-overlap-list="true">
        <h2>These facts share this point.</h2>
        <div className="orient-actions">
          {facts.map((fact) => {
            const copy = describe(models, fact);
            return (
              <button key={`${fact.sourceKind}:${fact.sourceId}`} type="button" className="orient-action" onClick={() => onChoose(fact)}>
                {copy.kindLabel}
                {copy.primary ? ` · ${copy.primary}` : ""}
              </button>
            );
          })}
          <button type="button" className="orient-action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }
  const fact = chosen ?? facts[0];
  if (!fact) return null;
  return (
    <FactDetail
      fact={fact}
      models={models}
      contexts={contexts}
      openTasks={openTasks}
      timeZone={timeZone}
      services={services}
      onClose={onClose}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onManageWork={onManageWork}
    />
  );
}

function FactDetail({
  fact,
  models,
  contexts,
  openTasks,
  timeZone,
  services,
  onClose,
  onUpdate,
  onRemove,
  onManageWork,
}: {
  fact: FactAddress;
  models: readonly DayCanvasModel[];
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: OrientSources;
  onClose: () => void;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
  onManageWork: (civilDate: string) => void;
}) {
  const copy = describe(models, fact);
  const stored = copy.stored;
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateDraft, setDateDraft] = useState(stored?.startsOn ?? "");
  const [startDraft, setStartDraft] = useState(stored && "startLocal" in stored ? stored.startLocal : "");
  const [endDraft, setEndDraft] = useState(stored && "endLocal" in stored ? stored.endLocal : "");
  const [label, setLabel] = useState(stored?.sourceKind === "protected_time" ? (stored.label ?? "") : "");
  const [purpose, setPurpose] = useState(stored?.sourceKind === "block" ? stored.purpose : "");
  const [contextId, setContextId] = useState(stored?.sourceKind === "block" ? (stored.contextId ?? "") : "");
  const [title, setTitle] = useState(stored?.sourceKind === "commitment" ? stored.title : "");
  const [taskId, setTaskId] = useState(stored?.sourceKind === "block" ? (stored.taskId ?? "") : "");
  const removable = fact.sourceKind === "protected_time" || fact.sourceKind === "block" || fact.sourceKind === "commitment";

  useEffect(() => {
    if (copy.found) return;
    onClose();
  }, [copy.found, onClose]);

  async function save() {
    if (!stored || saving) return;
    setSaving(true);
    setError(null);
    try {
      const startMinute = localMinutes(parseLocalTime(startDraft));
      const endMinute = localMinutes(parseLocalTime(endDraft));
      const update = updateFromStored({
        id: fact.sourceId,
        startsOn: dateDraft,
        meaning: stored.sourceKind,
        startMinute,
        endMinute,
        clock: selectionLocalClock(
          {
            civilDate: dateDraft,
            startMinute,
            endMinute,
          },
          timeZone,
        ),
        label,
        purpose,
        contextId,
        title,
        taskId: taskId.length > 0 ? taskId : null,
      });
      await onUpdate(update);
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
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
      setError(failureMessage(caught, "The write did not happen."));
      setSaving(false);
    }
  }

  if (!copy.found) return null;

  const taskTitle =
    stored?.sourceKind === "block" && stored.taskId
      ? openTasks.status === "ready"
        ? (openTasks.rows.find((task) => task.id === stored.taskId)?.title ?? null)
        : null
      : null;

  return (
    <div data-fact-inspection="true">
      <h2>{copy.kindLabel}</h2>
      {copy.primary ? <p>{copy.primary}</p> : null}
      <p>{copy.interval}</p>
      {copy.contextName ? <p>{copy.contextName}</p> : null}
      {stored?.sourceKind === "block" && stored.taskId ? (
        <p>{taskTitle ? `Cites task · ${taskTitle}` : "Cites a task."}</p>
      ) : null}
      {serviceLines(fact, services).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {fact.sourceKind === "work_schedule" ? (
        <p>
          <button type="button" className="orient-action" onClick={() => onManageWork(fact.sourceId)}>
            Edit the work week
          </button>
        </p>
      ) : null}
      {editing && stored ? (
        <div>
          <label className="orient-note">
            Date
            <input type="date" aria-label="Fact date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} />
          </label>
          <label className="orient-note">
            Start
            <input aria-label="Fact start" value={startDraft} onChange={(event) => setStartDraft(event.target.value)} />
          </label>
          <label className="orient-note">
            End
            <input aria-label="Fact end" value={endDraft} onChange={(event) => setEndDraft(event.target.value)} />
          </label>
          {stored.sourceKind === "protected_time" ? (
            <label className="orient-note">
              Label
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
          ) : null}
          {stored.sourceKind === "block" ? (
            <>
              <label className="orient-note">
                Purpose
                <input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </label>
              <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
              <TaskSelect tasks={openTasks} value={taskId} onChange={setTaskId} />
            </>
          ) : null}
          {stored.sourceKind === "commitment" ? (
            <label className="orient-note">
              Commitment
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          ) : null}
          <button type="button" className="orient-action" data-emphasis="save" disabled={saving} onClick={() => void save()}>
            Save
          </button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="orient-actions">
        {stored && !editing ? (
          <button type="button" className="orient-action" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : null}
        {removable ? (
          <button type="button" className="orient-action" onClick={() => (armed ? void remove() : setArmed(true))}>
            {armed ? "Confirm delete" : "Delete this fact"}
          </button>
        ) : null}
        <button type="button" className="orient-action" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function describe(models: readonly DayCanvasModel[], fact: FactAddress): {
  found: boolean;
  kindLabel: string;
  primary: string;
  interval: string;
  contextName: string | null;
  stored: DayCanvasStoredFact | null;
} {
  for (const model of models) {
    const placement = [...model.context, ...model.foreground].find(
      (item) => item.sourceKind === fact.sourceKind && item.sourceId === fact.sourceId,
    );
    if (placement) {
      return {
        found: true,
        kindLabel: placement.kindLabel,
        primary: placement.primary,
        interval: placement.shownInterval ?? placement.sourceInterval,
        contextName: placement.contextName,
        stored: placement.stored,
      };
    }
    const listed = [...model.allDay, ...model.unresolved].find(
      (item) => item.sourceKind === fact.sourceKind && item.sourceId === fact.sourceId,
    );
    if (listed) {
      return {
        found: true,
        kindLabel: listed.kindLabel,
        primary: listed.primary,
        interval: listed.detail,
        contextName: null,
        stored: null,
      };
    }
  }
  return { found: false, kindLabel: fact.sourceKind, primary: "", interval: "", contextName: null, stored: null };
}

function serviceLines(fact: FactAddress, services: OrientSources): string[] {
  if (fact.sourceKind !== "block") return [];
  if (services.blockPriorityService.status !== "ready" || services.priorities.status !== "ready") return [];
  const priorities = services.priorities.rows;
  return services.blockPriorityService.rows
    .filter((pair) => pair.blockId === fact.sourceId)
    .map((pair) => {
      const priority = priorities.find((item) => item.id === pair.priorityId);
      return priority ? `Serves priority · ${priority.content}` : "Serves a priority.";
    });
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
  return (
    <label className="orient-note">
      Context
      <select aria-label="Block context" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">None</option>
        {contexts.status === "ready"
          ? contexts.rows.map((context) => (
              <option key={context.id} value={context.id}>
                {context.name}
              </option>
            ))
          : null}
      </select>
    </label>
  );
}

function TaskSelect({
  tasks,
  value,
  onChange,
}: {
  tasks: SourceRead<OpenTaskChoice>;
  value: string;
  onChange: (value: string) => void;
}) {
  if (tasks.status === "failed") {
    return <p role="alert">Open tasks could not be read. {tasks.message}</p>;
  }
  return (
    <label className="orient-note">
      Task
      <select aria-label="Cited task" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">None</option>
        {tasks.rows.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ThreadSurface({
  thread,
  tasks,
  contexts,
  onStart,
  onLeave,
  onComplete,
  onUpdate,
  onClose,
}: {
  thread: ThreadReading;
  tasks: SourceRead<Task>;
  contexts: SourceRead<Context>;
  onStart: (taskId: string) => Promise<void>;
  onLeave: () => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onClose: () => void;
}) {
  const [collection, setCollection] = useState(thread.status !== "ready" || !thread.active || thread.resumeTitle === null);
  const task =
    thread.status === "ready" && thread.active
      ? tasks.status === "ready"
        ? (tasks.rows.find((item) => item.id === thread.taskId) ?? null)
        : null
      : null;
  return (
    <div data-thread-inspection="true">
      <h2>Thread</h2>
      {thread.status === "failed" ? (
        <p role="alert">The thread could not be read. {thread.message}</p>
      ) : null}
      {thread.status === "ready" && thread.active && thread.resumeTitle === null ? (
        <p>A thread is recorded, and its task is not open.</p>
      ) : null}
      {task ? (
        <TaskDetail
          task={task}
          contexts={contexts}
          onLeave={onLeave}
          onComplete={onComplete}
          onUpdate={onUpdate}
        />
      ) : null}
      <div className="orient-actions">
        <button type="button" className="orient-action" onClick={() => setCollection((open) => !open)}>
          Open tasks
        </button>
        <button type="button" className="orient-action" onClick={onClose}>
          Close
        </button>
      </div>
      {collection ? <TaskCollection tasks={tasks} onStart={onStart} /> : null}
    </div>
  );
}

function TaskDetail({
  task,
  contexts,
  onLeave,
  onComplete,
  onUpdate,
}: {
  task: Task;
  contexts: SourceRead<Context>;
  onLeave: () => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskEditDraft>(() => taskEditDraftFromTask(task));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(task.id, taskPatchFromEditDraft(draft));
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p>{task.title}</p>
      {task.mustDo ? <p>Must do</p> : null}
      {task.plannedOn ? <p>Planned {task.plannedOn}</p> : null}
      {task.dueOn ? <p>Due {task.dueOn}</p> : null}
      {editing ? (
        <div>
          <label className="orient-note">
            Title
            <input aria-label="Task title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="orient-note">
            Context
            <select
              aria-label="Task context"
              value={draft.contextId}
              onChange={(event) => setDraft({ ...draft, contextId: event.target.value })}
            >
              <option value="">None</option>
              {contexts.status === "ready"
                ? contexts.rows.map((context) => (
                    <option key={context.id} value={context.id}>
                      {context.name}
                    </option>
                  ))
                : null}
            </select>
          </label>
          <label className="orient-note">
            Planned
            <input type="date" aria-label="Planned day" value={draft.plannedOn} onChange={(event) => setDraft({ ...draft, plannedOn: event.target.value })} />
          </label>
          <label className="orient-note">
            Due
            <input type="date" aria-label="Due day" value={draft.dueOn} onChange={(event) => setDraft({ ...draft, dueOn: event.target.value })} />
          </label>
          <label className="orient-note">
            <input
              type="checkbox"
              checked={draft.mustDo}
              onChange={(event) => setDraft({ ...draft, mustDo: event.target.checked })}
            />{" "}
            Must do
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="button" className="orient-action" data-emphasis="save" disabled={saving} onClick={() => void save()}>
            Save
          </button>
          <button type="button" className="orient-action" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="orient-actions">
          <button type="button" className="orient-action" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="orient-action" onClick={() => void onComplete(task.id)}>
            Complete
          </button>
          <button type="button" className="orient-action" onClick={() => void onLeave()}>
            Leave thread
          </button>
        </div>
      )}
    </div>
  );
}

function TaskCollection({
  tasks,
  onStart,
}: {
  tasks: SourceRead<Task>;
  onStart: (taskId: string) => Promise<void>;
}) {
  if (tasks.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Open tasks could not be read. {tasks.message}
      </p>
    );
  }
  if (tasks.rows.length === 0) return <p>No open task is established.</p>;
  return (
    <ul>
      {tasks.rows.map((task) => (
        <li key={task.id}>
          <p>{task.title}</p>
          {task.mustDo ? <p>Must do</p> : null}
          {task.plannedOn ? <p>Planned {task.plannedOn}</p> : null}
          {task.dueOn ? <p>Due {task.dueOn}</p> : null}
          <button type="button" className="orient-action" onClick={() => void onStart(task.id)}>
            Start
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CaptureSurface({
  capture,
  onChanged,
  onClose,
}: {
  capture: CaptureBridge;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [general, setGeneral] = useState<GeneralCaptureState>(initialGeneralCapture);
  const [pending, setPending] = useState<"note" | "task" | "sourced" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<SourceRead<Note> | null>(null);
  const [sourced, setSourced] = useState<{ noteId: string; title: string } | null>(null);
  const blank = general.expression.trim().length === 0;

  async function saveTask(event: { preventDefault: () => void }) {
    event.preventDefault();
    const created = await capture.submit();
    if (created) onChanged();
  }

  async function keepNote() {
    if (pending || blank) return;
    let authorized: ReturnType<typeof authorizeNoteEstablishment>;
    try {
      authorized = authorizeNoteEstablishment(general, () => new Date(), () => crypto.randomUUID());
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A note needs retained experience."));
      return;
    }
    setPending("note");
    setError(null);
    setGeneral(authorized.state);
    try {
      await createNote(getSupabaseBrowserClient(), authorized.note);
      setGeneral(initialGeneralCapture());
      setNotes(null);
    } catch (caught: unknown) {
      setGeneral(authorized.state);
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setPending(null);
    }
  }

  async function keepTask() {
    if (pending || blank) return;
    setPending("task");
    setError(null);
    try {
      await createTask(getSupabaseBrowserClient(), taskFromExpression(general.expression));
      setGeneral(initialGeneralCapture());
      onChanged();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setPending(null);
    }
  }

  async function readNotes() {
    setNotes(null);
    try {
      setNotes({ status: "ready", rows: await loadNotes(getSupabaseBrowserClient()) });
    } catch (caught: unknown) {
      setNotes({ status: "failed", message: failureMessage(caught, "Notes could not be read.") });
    }
  }

  async function saveSourced() {
    if (!sourced || pending || sourced.title.trim().length === 0) return;
    setPending("sourced");
    setError(null);
    try {
      await createTask(getSupabaseBrowserClient(), taskFromRetainedNote(sourced.title, sourced.noteId));
      setSourced(null);
      onChanged();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setPending(null);
    }
  }

  return (
    <div data-capture-surface="true" className="orient-capture">
      <section className="orient-capture-quick" aria-label="Quick action capture">
        <h2>Quick capture</h2>
        <p className="orient-capture-lead">A task, directly.</p>
        <form className="orient-capture-line" onSubmit={(event) => void saveTask(event)}>
          <label className="orient-note" htmlFor="orient-quick-title">
            <span className="sr-only">Quick capture</span>
            <input
              id="orient-quick-title"
              aria-label="Task title"
              value={capture.session.draft.title}
              onChange={(event) =>
                capture.update({ ...capture.session, draft: { ...capture.session.draft, title: event.target.value } })
              }
            />
          </label>
          <button type="submit" className="orient-action" data-emphasis="save" disabled={capture.saving}>
            {capture.saving ? "Saving" : "Save"}
          </button>
        </form>
        {capture.saveError ? <p role="alert">{capture.saveError}</p> : null}
      </section>
      <section className="orient-capture-general" aria-label="General expression">
        <h2>General capture</h2>
        <p className="orient-capture-lead">An expression. You decide what it becomes.</p>
        <label className="orient-note" htmlFor="orient-expression">
          <span className="sr-only">Expression</span>
          <textarea
            id="orient-expression"
            value={general.expression}
            onChange={(event) => {
              const expression = event.target.value;
              setGeneral((current) => expressionChanged(current, expression));
              setError(null);
            }}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="orient-actions orient-capture-authority">
          <button
            type="button"
            className="orient-action"
            data-authority="note"
            disabled={pending !== null || blank}
            onClick={() => void keepNote()}
          >
            Keep as a note
          </button>
          <button
            type="button"
            className="orient-action"
            data-authority="task"
            disabled={pending !== null || blank}
            onClick={() => void keepTask()}
          >
            This is a task
          </button>
          <button type="button" className="orient-action" onClick={() => void readNotes()}>
            Notes
          </button>
          <button type="button" className="orient-action" onClick={onClose}>
            Close capture
          </button>
        </div>
      </section>
      {notes?.status === "failed" ? (
        <p role="alert" data-reading="incomplete">
          {notes.message}
        </p>
      ) : null}
      {notes?.status === "ready" && notes.rows.length === 0 ? <p>No notes have been retained.</p> : null}
      {notes?.status === "ready"
        ? notes.rows.map((note) => (
            <article key={note.id}>
              <p>{note.content}</p>
              <time dateTime={note.capturedAt}>{note.capturedAt}</time>
              <button type="button" className="orient-action" onClick={() => setSourced({ noteId: note.id, title: "" })}>
                Establish a task from this
              </button>
              {sourced?.noteId === note.id ? (
                <div>
                  <label className="orient-note">
                    Task title
                    <input
                      aria-label="Task title from note"
                      value={sourced.title}
                      onChange={(event) => setSourced({ noteId: note.id, title: event.target.value })}
                    />
                  </label>
                  <button type="button" className="orient-action" data-emphasis="save" onClick={() => void saveSourced()}>
                    Save
                  </button>
                </div>
              ) : null}
            </article>
          ))
        : null}
    </div>
  );
}

export function DirectionPlane({
  status,
  message,
  destinations,
  priorities,
  onInspect,
}: {
  status: "complete" | "incomplete";
  message: string | null;
  destinations: { id: string; content: string }[];
  priorities: { id: string; content: string; destinationId: string }[];
  onInspect: (priorityId: string) => void;
}) {
  return (
    <section data-direction-plane="true" aria-label="Direction">
      <h2>Direction</h2>
      {status === "incomplete" ? (
        <p data-reading="incomplete">Direction could not be read. {message}</p>
      ) : destinations.length === 0 && priorities.length === 0 ? (
        <p>No direction is established.</p>
      ) : (
        destinations.map((destination) => (
          <div key={destination.id}>
            <p className="orient-destination">{destination.content}</p>
            <ul>
              {priorities
                .filter((priority) => priority.destinationId === destination.id)
                .map((priority) => (
                  <li key={priority.id}>
                    <button type="button" className="orient-action orient-priority" onClick={() => onInspect(priority.id)}>
                      {priority.content}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
      {status === "complete"
        ? priorities
            .filter((priority) => !destinations.some((destination) => destination.id === priority.destinationId))
            .map((priority) => (
              <button key={priority.id} type="button" className="orient-action orient-priority" onClick={() => onInspect(priority.id)}>
                {priority.content}
              </button>
            ))
        : null}
    </section>
  );
}

export function DirectionInspection({
  priorityId,
  sources,
  onClose,
}: {
  priorityId: string;
  sources: OrientSources;
  onClose: () => void;
}) {
  const priority = sources.priorities.status === "ready" ? sources.priorities.rows.find((item) => item.id === priorityId) : null;
  const tasks =
    sources.taskPriorityService.status === "ready" && sources.citedTasks.status === "ready"
      ? sources.taskPriorityService.rows
          .filter((pair) => pair.priorityId === priorityId)
          .map((pair) => sources.citedTasks.status === "ready" ? sources.citedTasks.rows.find((task) => task.id === pair.taskId) : null)
          .filter((task): task is NonNullable<typeof task> => task != null)
      : [];
  const blocks =
    sources.blockPriorityService.status === "ready"
      ? sources.blockPriorityService.rows.filter((pair) => pair.priorityId === priorityId)
      : [];
  return (
    <div data-direction-inspection="true">
      <h2>{priority?.content ?? "Priority"}</h2>
      {tasks.length === 0 && blocks.length === 0 ? <p>No execution is retained in service of this priority.</p> : null}
      {tasks.map((task) => (
        <p key={task.id}>Task · {task.title}</p>
      ))}
      {blocks.map((pair) => (
        <p key={pair.blockId}>Block in service of this priority.</p>
      ))}
      <button type="button" className="orient-action" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
