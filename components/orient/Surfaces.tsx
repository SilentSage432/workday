"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  establishmentBlocked,
  establishAllDay,
  establishFromSelection,
  updateFromAllDayStored,
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
  type IntendedMeaning,
  type SelectionSession,
  type TimeSelection,
} from "@/components/daySelection";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { InterruptGrant } from "@/domain/pulse";
import type { ProtectedTime } from "@/domain/protectedTime";
import { localMinutes, parseLocalTime } from "@/domain/time/localTime";
import type { FactAddress } from "@/components/factAddress";
import { CommitmentPulseAuthority } from "@/components/orient/CommitmentPulseAuthority";
import type { TemporalProposal } from "@/components/orient/temporalProposal";
import type { Context } from "@/domain/context";
import {
  authorizeNoteEstablishment,
  expressionChanged,
  initialGeneralCapture,
  taskFromExpression,
  taskFromRetainedNote,
  type GeneralCaptureState,
} from "@/domain/generalCapture";
import { NoteCitedError, requireNoteContent, type NewNote, type Note } from "@/domain/note";
import { taskEditDraftFromTask, taskPatchFromEditDraft, type TaskEditDraft } from "@/domain/taskEdit";
import type { NewTask, Task } from "@/domain/task";
import { createTask } from "@/persistence/contextsAndTasks";
import { createNote, deleteNote, loadNotes, retireNote } from "@/persistence/note";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import type { DayCanvasModel, DayCanvasStoredFact } from "@/projections/dayCanvas";
import {
  actSecondaryTasksDisclosureLabel,
  actStewardshipWorkContext,
  composeActAttention,
  type ActStewardshipRow,
} from "@/components/orient/actAttention";
import type { CaptureBridge, OrientSources, ThreadReading } from "@/components/orient/types";
import {
  positionWord,
  QUESTION_LABEL,
  shiftedAnchor,
  type ContextFocus,
  type OrientQuestion,
} from "@/components/orient/grammar";
import {
  cycleInterval,
  latestStewardshipWording,
  requireStewardshipContent,
  stewardshipEstablishmentCycleLabel,
  wordingForOccurrence,
  type StewardshipCycleKind,
  type StewardshipDefinition,
  type StewardshipDefinitionRevision,
  type StewardshipSatisfaction,
} from "@/domain/stewardship";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { readStewardshipOccurrence } from "@/projections/stewardship";

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

function SurfaceClose({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" className="orient-surface-close" data-surface-close="true" aria-label={label} onClick={onClose}>
      <X aria-hidden="true" className="orient-glyph" />
    </button>
  );
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
  onManageExternalCalendars,
  onClose,
  includeDismiss = true,
  includeOperations = true,
}: {
  anchor: string;
  today: string | null;
  onMove: (civilDate: string) => void;
  onAdoptToday: (civilDate: string) => void;
  onSignOut: () => void;
  onManageWork: () => void;
  onManageExternalCalendars: () => void;
  onClose: () => void;
  includeDismiss?: boolean;
  includeOperations?: boolean;
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
      {includeDismiss || includeOperations ? (
        <div className="orient-actions" data-position-operations={includeOperations ? "true" : undefined}>
          {includeDismiss ? (
            <button type="button" className="orient-action" onClick={onClose}>
              Close
            </button>
          ) : null}
          {includeOperations ? (
            <>
              <button type="button" className="orient-action" data-manage-work="true" onClick={onManageWork}>
                Manage Work schedule
              </button>
              <button
                type="button"
                className="orient-action"
                data-manage-external-calendars="true"
                onClick={onManageExternalCalendars}
              >
                Google Calendar
              </button>
              <button type="button" className="orient-action" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function FocusList({
  contexts,
  onChoose,
  focus = { kind: "everything" },
}: {
  contexts: SourceRead<Context>;
  onChoose: (focus: { kind: "everything" } | { kind: "context"; id: string; name: string }) => void;
  focus?: ContextFocus;
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
        <button
          type="button"
          className="orient-action"
          aria-current={focus.kind === "everything" ? "true" : undefined}
          onClick={() => onChoose({ kind: "everything" })}
        >
          Everything
        </button>
        {contexts.rows.map((context) => (
          <button
            key={context.id}
            type="button"
            className="orient-action"
            aria-current={focus.kind === "context" && focus.id === context.id ? "true" : undefined}
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
  proposal = null,
  models,
  contexts,
  openTasks,
  timeZone,
  services,
  interruptGrants = [],
  onEstablishCommitmentPulseGrant,
  onRevokeCommitmentPulseGrant,
  onChoose,
  onClose,
  onUpdate,
  onRemove,
  onManageWork,
}: {
  facts: FactAddress[];
  chosen: FactAddress | null;
  proposal?: TemporalProposal | null;
  models: readonly DayCanvasModel[];
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: OrientSources;
  interruptGrants?: readonly InterruptGrant[];
  onEstablishCommitmentPulseGrant?: (commitmentId: string, leadOffsetSeconds: number) => Promise<void>;
  onRevokeCommitmentPulseGrant?: (grantId: string) => Promise<void>;
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
      key={`${fact.sourceKind}:${fact.sourceId}:${proposal?.startsOn ?? ""}:${proposal?.startLocal ?? ""}:${proposal?.endLocal ?? ""}`}
      fact={fact}
      proposal={proposal}
      models={models}
      contexts={contexts}
      openTasks={openTasks}
      timeZone={timeZone}
      services={services}
      interruptGrants={interruptGrants}
      onEstablishCommitmentPulseGrant={onEstablishCommitmentPulseGrant}
      onRevokeCommitmentPulseGrant={onRevokeCommitmentPulseGrant}
      onClose={onClose}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onManageWork={onManageWork}
    />
  );
}

type AllDayEditable = {
  meaning: "protected_time" | "block" | "commitment";
  startsOn: string;
  label: string;
  purpose: string;
  contextId: string;
  title: string;
  taskId: string | null;
};

function allDayEditableFromSources(fact: FactAddress, services: OrientSources): AllDayEditable | null {
  if (fact.sourceKind === "protected_time" && services.protectedTime.status === "ready") {
    const row = services.protectedTime.rows.find((entry: ProtectedTime) => entry.id === fact.sourceId);
    if (row?.kind !== "all_day") return null;
    return {
      meaning: "protected_time",
      startsOn: row.startsOn,
      label: row.label ?? "",
      purpose: "",
      contextId: "",
      title: "",
      taskId: null,
    };
  }
  if (fact.sourceKind === "block" && services.blocks.status === "ready") {
    const row = services.blocks.rows.find((entry: Block) => entry.id === fact.sourceId);
    if (row?.kind !== "all_day") return null;
    return {
      meaning: "block",
      startsOn: row.startsOn,
      label: "",
      purpose: row.purpose,
      contextId: row.contextId ?? "",
      title: "",
      taskId: row.taskId,
    };
  }
  if (fact.sourceKind === "commitment" && services.commitments.status === "ready") {
    const row = services.commitments.rows.find((entry: Commitment) => entry.id === fact.sourceId);
    if (row?.kind !== "all_day") return null;
    return {
      meaning: "commitment",
      startsOn: row.startsOn,
      label: "",
      purpose: "",
      contextId: "",
      title: row.title,
      taskId: null,
    };
  }
  return null;
}

function FactDetail({
  fact,
  proposal,
  models,
  contexts,
  openTasks,
  timeZone,
  services,
  interruptGrants,
  onEstablishCommitmentPulseGrant,
  onRevokeCommitmentPulseGrant,
  onClose,
  onUpdate,
  onRemove,
  onManageWork,
}: {
  fact: FactAddress;
  proposal: TemporalProposal | null;
  models: readonly DayCanvasModel[];
  contexts: SourceRead<Context>;
  openTasks: SourceRead<OpenTaskChoice>;
  timeZone: string;
  services: OrientSources;
  interruptGrants: readonly InterruptGrant[];
  onEstablishCommitmentPulseGrant?: (commitmentId: string, leadOffsetSeconds: number) => Promise<void>;
  onRevokeCommitmentPulseGrant?: (grantId: string) => Promise<void>;
  onClose: () => void;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
  onManageWork: (civilDate: string) => void;
}) {
  const copy = describe(models, fact);
  const stored = copy.stored;
  const timedStored = stored && "startLocal" in stored ? stored : null;
  const allDay = timedStored ? null : allDayEditableFromSources(fact, services);
  const editable = timedStored !== null || allDay !== null;
  const opening = proposal && timedStored ? proposal : null;
  const [editing, setEditing] = useState(opening !== null);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateDraft, setDateDraft] = useState(opening?.startsOn ?? stored?.startsOn ?? allDay?.startsOn ?? "");
  const [startDraft, setStartDraft] = useState(opening?.startLocal ?? timedStored?.startLocal ?? "");
  const [endDraft, setEndDraft] = useState(opening?.endLocal ?? timedStored?.endLocal ?? "");
  const [label, setLabel] = useState(
    stored?.sourceKind === "protected_time" ? (stored.label ?? "") : (allDay?.meaning === "protected_time" ? allDay.label : ""),
  );
  const [purpose, setPurpose] = useState(stored?.sourceKind === "block" ? stored.purpose : (allDay?.meaning === "block" ? allDay.purpose : ""));
  const [contextId, setContextId] = useState(
    stored?.sourceKind === "block" ? (stored.contextId ?? "") : (allDay?.meaning === "block" ? allDay.contextId : ""),
  );
  const [title, setTitle] = useState(
    stored?.sourceKind === "commitment" ? stored.title : (allDay?.meaning === "commitment" ? allDay.title : ""),
  );
  const [taskId, setTaskId] = useState(
    stored?.sourceKind === "block" ? (stored.taskId ?? "") : (allDay?.meaning === "block" ? (allDay.taskId ?? "") : ""),
  );
  const removable = fact.sourceKind === "protected_time" || fact.sourceKind === "block" || fact.sourceKind === "commitment";
  const editMeaning = timedStored?.sourceKind ?? allDay?.meaning ?? null;
  const blockTaskId = timedStored?.sourceKind === "block" ? timedStored.taskId : allDay?.meaning === "block" ? allDay.taskId : null;

  useEffect(() => {
    if (copy.found) return;
    onClose();
  }, [copy.found, onClose]);

  async function save() {
    if (!editMeaning || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (allDay) {
        const update = updateFromAllDayStored({
          id: fact.sourceId,
          startsOn: dateDraft,
          meaning: editMeaning,
          label,
          purpose,
          contextId,
          title,
          taskId: taskId.length > 0 ? taskId : null,
        });
        await onUpdate(update);
      } else if (timedStored) {
        const startMinute = localMinutes(parseLocalTime(startDraft));
        const endMinute = localMinutes(parseLocalTime(endDraft));
        const update = updateFromStored({
          id: fact.sourceId,
          startsOn: dateDraft,
          meaning: timedStored.sourceKind,
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
      } else {
        return;
      }
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!removable || saving) return;
    if (
      fact.sourceKind !== "protected_time" &&
      fact.sourceKind !== "block" &&
      fact.sourceKind !== "commitment"
    ) {
      return;
    }
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
    blockTaskId
      ? openTasks.status === "ready"
        ? (openTasks.rows.find((task) => task.id === blockTaskId)?.title ?? null)
        : null
      : null;

  return (
    <div data-fact-inspection="true" data-fact-kind={allDay ? "all-day" : timedStored ? "timed" : "other"}>
      <h2>{copy.kindLabel}</h2>
      {copy.primary ? <p>{copy.primary}</p> : null}
      <p>{copy.interval}</p>
      {fact.sourceKind === "external_temporal" ? (
        <p data-external-provenance="true" className="orient-note">
          From an external calendar. Read-only in Orient.
        </p>
      ) : null}
      {copy.contextName ? <p>{copy.contextName}</p> : null}
      {blockTaskId ? <p>{taskTitle ? `Cites task · ${taskTitle}` : "Cites a task."}</p> : null}
      {serviceLines(fact, services).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {fact.sourceKind === "commitment" &&
      services.commitments.status === "ready" &&
      onEstablishCommitmentPulseGrant &&
      onRevokeCommitmentPulseGrant
        ? (() => {
            const commitment = services.commitments.rows.find((entry) => entry.id === fact.sourceId);
            if (!commitment || commitment.kind !== "timed") return null;
            const grant =
              interruptGrants.find(
                (entry) =>
                  entry.sourceKind === "commitment" &&
                  entry.sourceId === commitment.id &&
                  entry.transitionKind === "start" &&
                  entry.revokedAt === null,
              ) ?? null;
            return (
              <CommitmentPulseAuthority
                commitment={commitment}
                grant={grant}
                onEstablish={(leadOffsetSeconds) =>
                  onEstablishCommitmentPulseGrant(commitment.id, leadOffsetSeconds)
                }
                onRevoke={() => {
                  if (!grant) return Promise.resolve();
                  return onRevokeCommitmentPulseGrant(grant.id);
                }}
              />
            );
          })()
        : null}
      {fact.sourceKind === "work_schedule" ? (
        <p>
          <button type="button" className="orient-action" onClick={() => onManageWork(fact.sourceId)}>
            Edit the work week
          </button>
        </p>
      ) : null}
      {editing && editMeaning ? (
        <div data-fact-edit={allDay ? "all-day" : "timed"}>
          <label className="orient-note">
            Date
            <input type="date" aria-label="Fact date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} />
          </label>
          {timedStored ? (
            <>
              <label className="orient-note">
                Start
                <input aria-label="Fact start" value={startDraft} onChange={(event) => setStartDraft(event.target.value)} />
              </label>
              <label className="orient-note">
                End
                <input aria-label="Fact end" value={endDraft} onChange={(event) => setEndDraft(event.target.value)} />
              </label>
            </>
          ) : null}
          {editMeaning === "protected_time" ? (
            <label className="orient-note">
              Label
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
          ) : null}
          {editMeaning === "block" ? (
            <>
              <label className="orient-note">
                Purpose
                <input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </label>
              <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
              <TaskSelect tasks={openTasks} value={taskId} onChange={setTaskId} />
            </>
          ) : null}
          {editMeaning === "commitment" ? (
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
        {editable && !editing ? (
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

/** LOOK composition by form factor. Semantics stay shared; disclosure differs. */
export type LookComposition = "navigator-lens" | "phone-calm";

export function LookSurface({
  question,
  onChooseQuestion,
  anchor,
  today,
  onMove,
  onAdoptToday,
  onSignOut,
  onManageWork,
  onManageExternalCalendars,
  onOpenNotes,
  onOpenStewardship,
  onOpenRecurringTasks,
  contexts,
  focus = { kind: "everything" },
  lookComposition = "navigator-lens",
  onChooseFocus,
  onClose,
}: {
  question: OrientQuestion;
  onChooseQuestion: (question: OrientQuestion) => void;
  anchor: string;
  today: string | null;
  onMove: (civilDate: string) => void;
  onAdoptToday: (civilDate: string) => void;
  onSignOut: () => void;
  onManageWork: () => void;
  onManageExternalCalendars: () => void;
  onOpenNotes: () => void;
  onOpenStewardship: () => void;
  onOpenRecurringTasks: () => void;
  contexts: SourceRead<Context>;
  focus?: ContextFocus;
  /**
   * Form-factor LOOK composition.
   * - navigator-lens: desktop — orientation + full Q/P/F + Operations disclosure
   * - phone-calm: phone — orientation + Q immediate + Position/Focus/Operations disclosures
   */
  lookComposition?: LookComposition;
  onChooseFocus: (focus: { kind: "everything" } | { kind: "context"; id: string; name: string }) => void;
  onClose: () => void;
}) {
  const focusLabel = focus.kind === "everything" ? "Everything" : focus.name;
  const placeLabel = positionWord(question, anchor);
  const phoneCalm = lookComposition === "phone-calm";
  const operations = (
    <div className="orient-actions">
      <button type="button" className="orient-action" data-look-notes="true" onClick={onOpenNotes}>
        Notes
      </button>
      <button type="button" className="orient-action" data-look-stewardship="true" onClick={onOpenStewardship}>
        Stewardship
      </button>
      <button
        type="button"
        className="orient-action"
        data-look-recurring-tasks="true"
        onClick={onOpenRecurringTasks}
      >
        Recurring Tasks
      </button>
      <button type="button" className="orient-action" data-manage-work="true" onClick={onManageWork}>
        Manage Work schedule
      </button>
      <button
        type="button"
        className="orient-action"
        data-manage-external-calendars="true"
        onClick={onManageExternalCalendars}
      >
        Google Calendar
      </button>
      <button type="button" className="orient-action" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );

  const position = (
    <PositionSurface
      anchor={anchor}
      today={today}
      onMove={onMove}
      onAdoptToday={onAdoptToday}
      onSignOut={onSignOut}
      onManageWork={onManageWork}
      onManageExternalCalendars={onManageExternalCalendars}
      onClose={onClose}
      includeDismiss={false}
      includeOperations={false}
    />
  );

  const focusList = <FocusList contexts={contexts} focus={focus} onChoose={onChooseFocus} />;

  return (
    <div data-look-surface="true" data-look-role={lookComposition}>
      <header className="orient-surface-header">
        <div>
          <h2>LOOK</h2>
          <p className="orient-capture-lead">Where am I in time?</p>
          <p className="orient-look-orientation" data-look-orientation="true">
            {QUESTION_LABEL[question]} · {placeLabel} · Focus {focusLabel}
          </p>
        </div>
        <SurfaceClose onClose={onClose} label="Close LOOK" />
      </header>
      <div data-look-lens="true">
        <QuestionList question={question} onChoose={onChooseQuestion} />
        {phoneCalm ? (
          <details className="orient-look-lens-disclosure" data-look-position-disclosure="true">
            <summary>
              <span className="orient-look-disclosure-kind">Where in time</span>
              <span className="orient-look-disclosure-value" data-look-position-current="true">
                {placeLabel}
              </span>
            </summary>
            {position}
          </details>
        ) : (
          position
        )}
        {phoneCalm ? (
          <details className="orient-look-lens-disclosure" data-look-focus-disclosure="true">
            <summary>
              <span className="orient-look-disclosure-kind">Focus</span>
              <span className="orient-look-disclosure-value" data-look-focus-current="true">
                {focusLabel}
              </span>
            </summary>
            {focusList}
          </details>
        ) : (
          focusList
        )}
      </div>
      <section data-look-operations="true" data-look-operations-secondary="true" aria-label="Operations">
        <details className="orient-look-operations-disclosure" data-look-operations-disclosure="true">
          <summary>Operations</summary>
          {operations}
        </details>
      </section>
    </div>
  );
}

export function AddChooser({
  onTask,
  onRecurringTask,
  onStewardship,
  onNote,
  onTimeOnTheDay,
  onAllDay,
  onWorkSchedule,
  onClose,
}: {
  onTask: () => void;
  onRecurringTask: () => void;
  onStewardship: () => void;
  onNote: () => void;
  onTimeOnTheDay: () => void;
  onAllDay: () => void;
  onWorkSchedule?: () => void;
  onClose: () => void;
}) {
  return (
    <div data-add-chooser="true">
      <h2>What are you adding?</h2>
      <div className="orient-actions">
        <button type="button" className="orient-action" data-add-choice="task" onClick={onTask}>
          Task
        </button>
        <button type="button" className="orient-action" data-add-choice="recurring-task" onClick={onRecurringTask}>
          Recurring Task
        </button>
        <button type="button" className="orient-action" data-add-choice="stewardship" onClick={onStewardship}>
          Stewardship
        </button>
        <button type="button" className="orient-action" data-add-choice="note" onClick={onNote}>
          Note
        </button>
        <button type="button" className="orient-action" data-add-choice="time-on-the-day" onClick={onTimeOnTheDay}>
          Time on the day
        </button>
        <button type="button" className="orient-action" data-add-choice="all-day" onClick={onAllDay}>
          All day
        </button>
        {onWorkSchedule ? (
          <button type="button" className="orient-action" data-add-choice="work" onClick={onWorkSchedule}>
            Work schedule
          </button>
        ) : null}
        <button type="button" className="orient-action" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Explicit all-day establishment. Timed vs all-day is already decided by the opener.
 * The human still chooses which sovereign type to establish.
 */
export function AllDayEstablishmentSurface({
  startsOn,
  contexts,
  onEstablish,
  onClose,
}: {
  startsOn: string;
  contexts: SourceRead<Context>;
  onEstablish: (establishment: CanvasEstablishment) => Promise<void>;
  onClose: () => void;
}) {
  const [dateDraft, setDateDraft] = useState(startsOn);
  const [meaning, setMeaning] = useState<IntendedMeaning | null>(null);
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [contextId, setContextId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canSave =
    meaning !== null &&
    dateDraft.trim().length > 0 &&
    (meaning === "protected_time" ||
      (meaning === "block" && purpose.trim().length > 0) ||
      (meaning === "commitment" && title.trim().length > 0));

  async function save() {
    if (!meaning || !canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const establishment = establishAllDay({
        startsOn: dateDraft,
        meaning,
        label,
        purpose,
        contextId,
        title,
        taskId: null,
      });
      await onEstablish(establishment);
      onClose();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-all-day-establishment="true">
      <h2>All day</h2>
      <p>Establishes a fact for the whole civil date. No clock times.</p>
      <label className="orient-note">
        Date
        <input
          type="date"
          aria-label="All-day date"
          value={dateDraft}
          onChange={(event) => setDateDraft(event.target.value)}
        />
      </label>
      <div className="orient-actions" role="group" aria-label="All-day fact type">
        {INTENDED_MEANINGS.map((item) => (
          <button
            key={item.meaning}
            type="button"
            className="orient-action"
            data-all-day-meaning={item.meaning}
            aria-pressed={meaning === item.meaning}
            onClick={() => setMeaning(item.meaning)}
          >
            {item.title}
          </button>
        ))}
      </div>
      {meaning === "protected_time" ? (
        <label className="orient-note">
          Label
          <input aria-label="Protected time label" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
      ) : null}
      {meaning === "block" ? (
        <>
          <label className="orient-note">
            Purpose
            <input aria-label="Block purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          </label>
          <ContextSelect contexts={contexts} value={contextId} onChange={setContextId} />
        </>
      ) : null}
      {meaning === "commitment" ? (
        <label className="orient-note">
          Commitment
          <input aria-label="Commitment title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="orient-actions">
        <button type="button" className="orient-action" data-emphasis="save" disabled={!canSave || saving} onClick={() => void save()}>
          Establish
        </button>
        <button type="button" className="orient-action" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

type ActTaskSection = "must-do" | "today" | "other-open";

type ActCorrection =
  | { kind: "task"; id: string; title: string; section: ActTaskSection }
  | {
      kind: "stewardship";
      definitionId: string;
      cycleKind: StewardshipCycleKind;
      cycleKey: string;
      title: string;
      cycleLabel: "Workday" | "This week";
      contextId: string | null;
    };

function actTaskSectionFor(task: Task, viewpointCivilDate: string): ActTaskSection {
  if (task.mustDo) return "must-do";
  if (task.plannedOn === viewpointCivilDate) return "today";
  return "other-open";
}

export function ActSurface({
  tasks,
  contexts,
  work,
  stewardshipDefinitions,
  stewardshipRevisions,
  stewardshipSatisfactions,
  viewpointCivilDate,
  now,
  timeZone,
  onStart,
  onComplete,
  onReopen,
  onUpdate,
  onSatisfyStewardship,
  onWithdrawStewardship,
  onEditStewardshipForward,
  onRetireStewardship,
  onAddTask,
  onAddStewardship,
  onClose,
}: {
  tasks: SourceRead<Task>;
  contexts: SourceRead<Context>;
  work: SourceRead<WorkScheduleEntry>;
  stewardshipDefinitions: SourceRead<StewardshipDefinition>;
  stewardshipRevisions: SourceRead<StewardshipDefinitionRevision>;
  stewardshipSatisfactions: SourceRead<StewardshipSatisfaction>;
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  onStart: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onReopen: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onSatisfyStewardship: (input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
  }) => Promise<void>;
  onWithdrawStewardship: (input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
  }) => Promise<void>;
  onEditStewardshipForward: (input: { definitionId: string; content: string }) => Promise<void>;
  onRetireStewardship: (definitionId: string) => Promise<void>;
  onAddTask: () => void;
  onAddStewardship: () => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStewardship, setSelectedStewardship] = useState<ActStewardshipRow | null>(null);
  const [correction, setCorrection] = useState<ActCorrection | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [otherOpenExpanded, setOtherOpenExpanded] = useState(false);

  const compositionReady =
    tasks.status === "ready" &&
    work.status === "ready" &&
    stewardshipDefinitions.status === "ready" &&
    stewardshipRevisions.status === "ready" &&
    stewardshipSatisfactions.status === "ready";

  const composition = compositionReady
    ? composeActAttention({
        openTasks: tasks.rows,
        viewpointCivilDate,
        now,
        timeZone,
        workEntries: work.rows,
        definitions: stewardshipDefinitions.rows,
        revisions: stewardshipRevisions.rows,
        satisfactions: stewardshipSatisfactions.rows,
      })
    : null;

  const selected =
    selectedId && tasks.status === "ready" ? (tasks.rows.find((item) => item.id === selectedId) ?? null) : null;

  function locateTask(taskId: string): Task | null {
    if (selected?.id === taskId) return selected;
    if (!composition) return null;
    return (
      composition.mustDo.find((item) => item.id === taskId) ??
      composition.today.find((item) => item.id === taskId) ??
      composition.otherOpen.find((item) => item.id === taskId) ??
      null
    );
  }

  async function completeForCorrection(taskId: string) {
    const task = locateTask(taskId);
    const title = task?.title ?? "";
    const section = task ? actTaskSectionFor(task, viewpointCivilDate) : "other-open";
    await onComplete(taskId);
    setCorrectionError(null);
    setCorrection({ kind: "task", id: taskId, title, section });
    if (section === "other-open") setOtherOpenExpanded(true);
    setSelectedId(null);
  }

  async function satisfyForCorrection(row: ActStewardshipRow) {
    await onSatisfyStewardship({
      definitionId: row.definitionId,
      cycleKind: row.cycleKind,
      cycleKey: row.cycleKey,
    });
    setCorrectionError(null);
    setCorrection({
      kind: "stewardship",
      definitionId: row.definitionId,
      cycleKind: row.cycleKind,
      cycleKey: row.cycleKey,
      title: row.wording,
      cycleLabel: row.cycleLabel,
      contextId: row.contextId,
    });
  }

  async function correct() {
    if (!correction) return;
    setCorrecting(true);
    setCorrectionError(null);
    try {
      if (correction.kind === "task") {
        await onReopen(correction.id);
      } else {
        await onWithdrawStewardship({
          definitionId: correction.definitionId,
          cycleKind: correction.cycleKind,
          cycleKey: correction.cycleKey,
        });
      }
      setCorrection(null);
    } catch (caught: unknown) {
      setCorrectionError(failureMessage(caught, "The write did not happen."));
    } finally {
      setCorrecting(false);
    }
  }

  const primaryEmpty =
    composition !== null &&
    composition.mustDo.length === 0 &&
    composition.stewardship.length === 0 &&
    composition.today.length === 0 &&
    correction === null;

  return (
    <div data-act-surface="true">
      <h2>ACT</h2>
      <p className="orient-capture-lead">What deserves my attention?</p>
      {selected ? (
        <div data-act-inspect="true">
          <TaskDetail
            task={selected}
            contexts={contexts}
            onComplete={completeForCorrection}
            onUpdate={onUpdate}
            onStart={onStart}
            onBack={() => setSelectedId(null)}
          />
        </div>
      ) : selectedStewardship ? (
        <div data-act-stewardship-inspect="true">
          <StewardshipDetail
            definitionId={selectedStewardship.definitionId}
            occurrence={selectedStewardship}
            definitions={stewardshipDefinitions}
            revisions={stewardshipRevisions}
            satisfactions={stewardshipSatisfactions}
            work={work}
            contexts={contexts}
            viewpointCivilDate={viewpointCivilDate}
            now={now}
            timeZone={timeZone}
            onEdit={onEditStewardshipForward}
            onRetire={async (definitionId) => {
              await onRetireStewardship(definitionId);
              setSelectedStewardship(null);
            }}
            onBack={() => setSelectedStewardship(null)}
          />
        </div>
      ) : (
        <ActAttentionList
          tasks={tasks}
          work={work}
          stewardshipDefinitions={stewardshipDefinitions}
          stewardshipRevisions={stewardshipRevisions}
          stewardshipSatisfactions={stewardshipSatisfactions}
          composition={composition}
          correction={correction}
          correctionError={correctionError}
          correcting={correcting}
          primaryEmpty={primaryEmpty}
          contexts={contexts}
          otherOpenExpanded={otherOpenExpanded}
          onToggleOtherOpen={() => setOtherOpenExpanded((value) => !value)}
          onSelect={setSelectedId}
          onSelectStewardship={setSelectedStewardship}
          onStart={onStart}
          onComplete={completeForCorrection}
          onSatisfy={satisfyForCorrection}
          onCorrect={() => void correct()}
        />
      )}

      <div className="orient-actions">
        <button type="button" className="orient-action" data-act-add-task="true" onClick={onAddTask}>
          Add Task
        </button>
        <button
          type="button"
          className="orient-action"
          data-act-add-stewardship="true"
          onClick={onAddStewardship}
        >
          Stewardship
        </button>
        <button
          type="button"
          className="orient-action"
          onClick={() => {
            setCorrection(null);
            setCorrectionError(null);
            setSelectedId(null);
            setSelectedStewardship(null);
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function ThreadSurface({
  thread,
  tasks,
  contexts,
  onLeave,
  onComplete,
  onReopen,
  onUpdate,
  onOpenAct,
  onClose,
}: {
  thread: ThreadReading;
  tasks: SourceRead<Task>;
  contexts: SourceRead<Context>;
  onStart?: (taskId: string) => Promise<void>;
  onLeave: () => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onReopen: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onOpenAct?: () => void;
  onClose: () => void;
}) {
  const [correction, setCorrection] = useState<{ id: string; title: string } | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const task =
    thread.status === "ready" && thread.active
      ? tasks.status === "ready"
        ? (tasks.rows.find((item) => item.id === thread.taskId) ?? null)
        : null
      : null;

  async function completeForCorrection(taskId: string) {
    const title = task?.id === taskId ? task.title : "";
    await onComplete(taskId);
    setCorrectionError(null);
    setCorrection({ id: taskId, title });
  }

  async function stillOpen() {
    if (!correction) return;
    setReopening(true);
    setCorrectionError(null);
    try {
      await onReopen(correction.id);
      setCorrection(null);
    } catch (caught: unknown) {
      setCorrectionError(failureMessage(caught, "The write did not happen."));
    } finally {
      setReopening(false);
    }
  }

  return (
    <div data-thread-inspection="true">
      <h2>Thread</h2>
      {thread.status === "failed" ? (
        <p role="alert">The thread could not be read. {thread.message}</p>
      ) : null}
      {thread.status === "ready" && thread.active && thread.resumeTitle === null && !correction ? (
        <p>A thread is recorded, and its task is not open.</p>
      ) : null}
      {correction ? (
        <div data-completion-correction="true">
          <p>{correction.title}</p>
          <p>Marked complete.</p>
          {correctionError ? <p role="alert">{correctionError}</p> : null}
          <div className="orient-actions">
            <button
              type="button"
              className="orient-action"
              data-still-open="true"
              disabled={reopening}
              onClick={() => void stillOpen()}
            >
              Still open
            </button>
          </div>
        </div>
      ) : task ? (
        <TaskDetail
          task={task}
          contexts={contexts}
          onLeave={onLeave}
          onComplete={completeForCorrection}
          onUpdate={onUpdate}
        />
      ) : null}
      <div className="orient-actions">
        {onOpenAct ? (
          <button type="button" className="orient-action" data-open-act="true" onClick={onOpenAct}>
            ACT
          </button>
        ) : null}
        <button
          type="button"
          className="orient-action"
          onClick={() => {
            setCorrection(null);
            setCorrectionError(null);
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function contextName(contexts: SourceRead<Context>, contextId: string | null): string | null {
  if (!contextId || contexts.status !== "ready") return null;
  return contexts.rows.find((context) => context.id === contextId)?.name ?? null;
}

function ActAttentionList({
  tasks,
  work,
  stewardshipDefinitions,
  stewardshipRevisions,
  stewardshipSatisfactions,
  composition,
  correction,
  correctionError,
  correcting,
  primaryEmpty,
  contexts,
  otherOpenExpanded,
  onToggleOtherOpen,
  onSelect,
  onSelectStewardship,
  onStart,
  onComplete,
  onSatisfy,
  onCorrect,
}: {
  tasks: SourceRead<Task>;
  work: SourceRead<WorkScheduleEntry>;
  stewardshipDefinitions: SourceRead<StewardshipDefinition>;
  stewardshipRevisions: SourceRead<StewardshipDefinitionRevision>;
  stewardshipSatisfactions: SourceRead<StewardshipSatisfaction>;
  composition: ReturnType<typeof composeActAttention> | null;
  correction: ActCorrection | null;
  correctionError: string | null;
  correcting: boolean;
  primaryEmpty: boolean;
  contexts: SourceRead<Context>;
  otherOpenExpanded: boolean;
  onToggleOtherOpen: () => void;
  onSelect: (taskId: string) => void;
  onSelectStewardship: (row: ActStewardshipRow) => void;
  onStart: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onSatisfy: (row: ActStewardshipRow) => Promise<void>;
  onCorrect: () => void;
}) {
  if (tasks.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Open tasks could not be read. {tasks.message}
      </p>
    );
  }
  if (work.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Work could not be read. {work.message}
      </p>
    );
  }
  if (stewardshipDefinitions.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Stewardship could not be read. {stewardshipDefinitions.message}
      </p>
    );
  }
  if (stewardshipRevisions.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Stewardship could not be read. {stewardshipRevisions.message}
      </p>
    );
  }
  if (stewardshipSatisfactions.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete">
        Stewardship could not be read. {stewardshipSatisfactions.message}
      </p>
    );
  }
  if (!composition) return <p>Reading attention.</p>;

  const taskAck = correction?.kind === "task" ? correction : null;
  const stewardshipAck = correction?.kind === "stewardship" ? correction : null;
  const mustDoRows = composition.mustDo.filter((task) => taskAck?.id !== task.id);
  const todayRows = composition.today.filter((task) => taskAck?.id !== task.id);
  const otherOpenRows = composition.otherOpen.filter((task) => taskAck?.id !== task.id);
  const stewardshipRows = composition.stewardship.filter(
    (row) =>
      !(
        stewardshipAck &&
        row.definitionId === stewardshipAck.definitionId &&
        row.cycleKind === stewardshipAck.cycleKind &&
        row.cycleKey === stewardshipAck.cycleKey
      ),
  );
  const secondaryOpenCount = otherOpenRows.length;
  const hasSecondaryOpen = secondaryOpenCount > 0;
  const otherAck = taskAck !== null && taskAck.section === "other-open";
  const showOther = hasSecondaryOpen || otherAck;
  const showMustDo =
    mustDoRows.length > 0 || (taskAck !== null && taskAck.section === "must-do");
  const showStewardship = stewardshipRows.length > 0 || stewardshipAck !== null;
  const showToday =
    todayRows.length > 0 || (taskAck !== null && taskAck.section === "today");
  const showOtherList = otherOpenExpanded || otherAck;

  if (primaryEmpty && !showOther && correction === null) {
    return <p data-act-empty="true">Nothing established needs attention here.</p>;
  }

  return (
    <div data-act-attention="true">
      {showMustDo ? (
        <section data-act-section="must-do">
          <h3 className="orient-act-section-title">Must do</h3>
          <ul data-act-list="true">
            {mustDoRows.map((task) => (
              <ActTaskRow
                key={task.id}
                task={task}
                contexts={contexts}
                onSelect={onSelect}
                onStart={onStart}
                onComplete={onComplete}
              />
            ))}
            {taskAck?.section === "must-do" ? (
              <ActAcknowledgedTaskRow
                id={taskAck.id}
                title={taskAck.title}
                correcting={correcting}
                error={correctionError}
                onCorrect={onCorrect}
              />
            ) : null}
          </ul>
        </section>
      ) : null}
      {showStewardship ? (
        <section data-act-section="stewardship">
          <h3 className="orient-act-section-title">Stewardship</h3>
          <ul data-act-list="true">
            {stewardshipRows.map((row) => (
              <ActStewardshipRowView
                key={`${row.definitionId}:${row.cycleKind}:${row.cycleKey}`}
                row={row}
                contexts={contexts}
                onSelect={onSelectStewardship}
                onSatisfy={onSatisfy}
              />
            ))}
            {stewardshipAck ? (
              <ActAcknowledgedStewardshipRow
                correction={stewardshipAck}
                contexts={contexts}
                correcting={correcting}
                error={correctionError}
                onCorrect={onCorrect}
              />
            ) : null}
          </ul>
        </section>
      ) : null}
      {showToday ? (
        <section data-act-section="today">
          <h3 className="orient-act-section-title">Today</h3>
          <ul data-act-list="true">
            {todayRows.map((task) => (
              <ActTaskRow
                key={task.id}
                task={task}
                contexts={contexts}
                onSelect={onSelect}
                onStart={onStart}
                onComplete={onComplete}
              />
            ))}
            {taskAck?.section === "today" ? (
              <ActAcknowledgedTaskRow
                id={taskAck.id}
                title={taskAck.title}
                correcting={correcting}
                error={correctionError}
                onCorrect={onCorrect}
              />
            ) : null}
          </ul>
        </section>
      ) : null}
      {showOther ? (
        <section data-act-section="other-open" data-act-secondary="true">
          {hasSecondaryOpen ? (
            <button
              type="button"
              className="orient-act-other-toggle"
              data-act-other-open="true"
              aria-expanded={showOtherList}
              onClick={onToggleOtherOpen}
            >
              {actSecondaryTasksDisclosureLabel(secondaryOpenCount)}
            </button>
          ) : null}
          {showOtherList ? (
            <ul data-act-list="true" data-act-other-list="true">
              {otherOpenRows.map((task) => (
                <ActTaskRow
                  key={task.id}
                  task={task}
                  contexts={contexts}
                  onSelect={onSelect}
                  onStart={onStart}
                  onComplete={onComplete}
                />
              ))}
              {otherAck && taskAck ? (
                <ActAcknowledgedTaskRow
                  id={taskAck.id}
                  title={taskAck.title}
                  correcting={correcting}
                  error={correctionError}
                  onCorrect={onCorrect}
                />
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ActTaskRow({
  task,
  contexts,
  onSelect,
  onStart,
  onComplete,
}: {
  task: Task;
  contexts: SourceRead<Context>;
  onSelect: (taskId: string) => void;
  onStart: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
}) {
  const context = contextName(contexts, task.contextId);
  return (
    <li data-act-row={task.id} data-act-kind="task">
      <label className="orient-act-check">
        <input
          type="checkbox"
          aria-label={`Complete ${task.title}`}
          data-act-complete={task.id}
          checked={false}
          onChange={() => void onComplete(task.id)}
        />
      </label>
      <button
        type="button"
        className="orient-action orient-act-select"
        data-act-select={task.id}
        onClick={() => onSelect(task.id)}
      >
        <span className="orient-act-title">{task.title}</span>
        {task.mustDo ? <span className="orient-act-meta">Must do</span> : null}
        {task.plannedOn ? (
          <span className="orient-act-meta">
            Planned {task.plannedOn}
            {task.plannedLocal ? ` at ${task.plannedLocal}` : ""}
          </span>
        ) : null}
        {context ? <span className="orient-act-meta">{context}</span> : null}
      </button>
      <button
        type="button"
        className="orient-action orient-act-start"
        data-act-start={task.id}
        onClick={() => void onStart(task.id)}
      >
        Start
      </button>
    </li>
  );
}

function ActAcknowledgedTaskRow({
  id,
  title,
  correcting,
  error,
  onCorrect,
}: {
  id: string;
  title: string;
  correcting: boolean;
  error: string | null;
  onCorrect: () => void;
}) {
  return (
    <li
      data-act-row={id}
      data-act-kind="task"
      data-act-acknowledged="true"
      data-completion-correction="true"
      data-correction-kind="task"
    >
      <label className="orient-act-check">
        <input
          type="checkbox"
          aria-label={`Completed ${title}`}
          data-act-complete={id}
          data-act-acknowledged-check="true"
          checked
          onChange={() => {}}
        />
      </label>
      <div className="orient-act-select">
        <span className="orient-act-title orient-act-title-done">{title}</span>
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <button
        type="button"
        className="orient-action orient-act-start"
        data-still-open="true"
        disabled={correcting}
        onClick={onCorrect}
      >
        Undo
      </button>
    </li>
  );
}

function ActStewardshipRowView({
  row,
  contexts,
  onSelect,
  onSatisfy,
}: {
  row: ActStewardshipRow;
  contexts: SourceRead<Context>;
  onSelect: (row: ActStewardshipRow) => void;
  onSatisfy: (row: ActStewardshipRow) => Promise<void>;
}) {
  const context = contextName(contexts, row.contextId);
  return (
    <li
      data-act-row={`${row.definitionId}:${row.cycleKind}:${row.cycleKey}`}
      data-act-kind="stewardship"
      data-act-stewardship-definition={row.definitionId}
      data-act-stewardship-cycle-kind={row.cycleKind}
      data-act-stewardship-cycle-key={row.cycleKey}
    >
      <label className="orient-act-check">
        <input
          type="checkbox"
          aria-label={`Satisfy ${row.wording}`}
          data-act-satisfy={`${row.definitionId}:${row.cycleKind}:${row.cycleKey}`}
          checked={false}
          onChange={() => void onSatisfy(row)}
        />
      </label>
      <button
        type="button"
        className="orient-action orient-act-select"
        data-act-stewardship-select={`${row.definitionId}:${row.cycleKind}:${row.cycleKey}`}
        onClick={() => onSelect(row)}
      >
        <span className="orient-act-title">{row.wording}</span>
        <span className="orient-act-meta">{row.cycleLabel}</span>
        {context ? <span className="orient-act-meta">{context}</span> : null}
      </button>
    </li>
  );
}

function ActAcknowledgedStewardshipRow({
  correction,
  contexts,
  correcting,
  error,
  onCorrect,
}: {
  correction: Extract<ActCorrection, { kind: "stewardship" }>;
  contexts: SourceRead<Context>;
  correcting: boolean;
  error: string | null;
  onCorrect: () => void;
}) {
  const context = contextName(contexts, correction.contextId);
  const rowKey = `${correction.definitionId}:${correction.cycleKind}:${correction.cycleKey}`;
  return (
    <li
      data-act-row={rowKey}
      data-act-kind="stewardship"
      data-act-acknowledged="true"
      data-completion-correction="true"
      data-correction-kind="stewardship"
      data-act-stewardship-definition={correction.definitionId}
      data-act-stewardship-cycle-kind={correction.cycleKind}
      data-act-stewardship-cycle-key={correction.cycleKey}
    >
      <label className="orient-act-check">
        <input
          type="checkbox"
          aria-label={`Satisfied ${correction.title}`}
          data-act-satisfy={rowKey}
          data-act-acknowledged-check="true"
          checked
          onChange={() => {}}
        />
      </label>
      <div className="orient-act-select">
        <span className="orient-act-title orient-act-title-done">{correction.title}</span>
        <span className="orient-act-meta">{correction.cycleLabel}</span>
        {context ? <span className="orient-act-meta">{context}</span> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <button
        type="button"
        className="orient-action orient-act-start"
        data-stewardship-withdraw="true"
        disabled={correcting}
        onClick={onCorrect}
      >
        Undo
      </button>
    </li>
  );
}


function TaskDetail({
  task,
  contexts,
  onLeave,
  onComplete,
  onUpdate,
  onStart,
  onBack,
}: {
  task: Task;
  contexts: SourceRead<Context>;
  onLeave?: () => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onStart?: (taskId: string) => Promise<void>;
  onBack?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskEditDraft>(() => taskEditDraftFromTask(task));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const context = contextName(contexts, task.contextId);

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
    <div data-task-detail="true">
      <p>{task.title}</p>
      {task.mustDo ? <p>Must do</p> : null}
      {task.plannedOn ? (
        <p>
          Planned {task.plannedOn}
          {task.plannedLocal ? ` at ${task.plannedLocal}` : ""}
        </p>
      ) : null}
      {task.dueOn ? <p>Due {task.dueOn}</p> : null}
      {context ? <p>Context {context}</p> : null}
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
                ? contexts.rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                : null}
            </select>
          </label>
          <label className="orient-note">
            Planned
            <input
              type="date"
              aria-label="Planned day"
              value={draft.plannedOn}
              onChange={(event) => {
                const plannedOn = event.target.value;
                setDraft({
                  ...draft,
                  plannedOn,
                  plannedLocal: plannedOn.length === 0 ? "" : draft.plannedLocal,
                });
              }}
            />
          </label>
          <label className="orient-note">
            Planned clock
            <input
              type="time"
              aria-label="Planned clock"
              value={draft.plannedLocal}
              disabled={draft.plannedOn.length === 0}
              onChange={(event) => setDraft({ ...draft, plannedLocal: event.target.value })}
            />
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
          {onBack ? (
            <button type="button" className="orient-action" data-act-back="true" onClick={onBack}>
              Back
            </button>
          ) : null}
          <button type="button" className="orient-action" onClick={() => setEditing(true)}>
            Edit
          </button>
          {onStart ? (
            <button type="button" className="orient-action" data-act-inspect-start="true" onClick={() => void onStart(task.id)}>
              Start
            </button>
          ) : null}
          <button
            type="button"
            className="orient-action"
            data-complete-task="true"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              setError(null);
              void onComplete(task.id)
                .catch((caught: unknown) => {
                  setError(failureMessage(caught, "The write did not happen."));
                })
                .finally(() => {
                  setSaving(false);
                });
            }}
          >
            Complete
          </button>
          {onLeave ? (
            <button type="button" className="orient-action" onClick={() => void onLeave()}>
              Leave thread
            </button>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

function taskInputFromDraft(draft: {
  title: string;
  contextId: string;
  plannedOn: string;
  plannedLocal: string;
  dueOn: string;
  mustDo: boolean;
}): NewTask {
  const title = draft.title.trim();
  if (title.length === 0) {
    throw new Error("A task needs a title.");
  }
  const plannedOn = draft.plannedOn.length > 0 ? draft.plannedOn : null;
  return {
    title,
    contextId: draft.contextId.length > 0 ? draft.contextId : null,
    plannedOn,
    plannedLocal: plannedOn && draft.plannedLocal.length > 0 ? draft.plannedLocal : null,
    dueOn: draft.dueOn.length > 0 ? draft.dueOn : null,
    mustDo: draft.mustDo,
  };
}


export function DirectStewardshipSurface({
  contexts,
  onEstablish,
  onClose,
}: {
  contexts: SourceRead<Context>;
  onEstablish: (input: {
    content: string;
    cycleKind: StewardshipCycleKind;
    contextId: string | null;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [cycleKind, setCycleKind] = useState<StewardshipCycleKind>("workday");
  const [contextId, setContextId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const wording = requireStewardshipContent(content);
      await onEstablish({
        content: wording,
        cycleKind,
        contextId: contextId.length > 0 ? contextId : null,
      });
      onClose();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-direct-stewardship="true" className="orient-direct-create">
      <header className="orient-surface-header">
        <h2>Stewardship</h2>
        <SurfaceClose onClose={onClose} label="Close new Stewardship" />
      </header>
      <p className="orient-capture-lead">What do I continually steward?</p>
      <label className="orient-note" htmlFor="orient-direct-stewardship-content">
        What do I steward?
        <input
          id="orient-direct-stewardship-content"
          aria-label="Stewardship wording"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          autoComplete="off"
          disabled={saving}
        />
      </label>
      <fieldset className="orient-note" data-stewardship-cycle="true">
        <legend>Returns</legend>
        <div className="orient-actions">
          <button
            type="button"
            className="orient-action"
            data-stewardship-cycle-choice="workday"
            aria-pressed={cycleKind === "workday"}
            disabled={saving}
            onClick={() => setCycleKind("workday")}
          >
            Each workday
          </button>
          <button
            type="button"
            className="orient-action"
            data-stewardship-cycle-choice="lowes_fiscal_week"
            aria-pressed={cycleKind === "lowes_fiscal_week"}
            disabled={saving}
            onClick={() => setCycleKind("lowes_fiscal_week")}
          >
            Each work week
          </button>
        </div>
      </fieldset>
      <label className="orient-note" htmlFor="orient-direct-stewardship-context">
        Context
        <select
          id="orient-direct-stewardship-context"
          aria-label="Stewardship context"
          value={contextId}
          disabled={saving}
          onChange={(event) => setContextId(event.target.value)}
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
      {error ? <p role="alert">{error}</p> : null}
      <button
        type="button"
        className="orient-action"
        data-emphasis="save"
        data-establish-stewardship="true"
        disabled={saving || content.trim().length === 0}
        onClick={() => void save()}
      >
        {saving ? "Saving" : "Save"}
      </button>
    </div>
  );
}

export function StewardshipManageSurface({
  definitions,
  revisions,
  contexts,
  onEstablish,
  onOpen,
  onClose,
}: {
  definitions: SourceRead<StewardshipDefinition>;
  revisions: SourceRead<StewardshipDefinitionRevision>;
  contexts: SourceRead<Context>;
  onEstablish: () => void;
  onOpen: (definitionId: string) => void;
  onClose: () => void;
}) {
  const active =
    definitions.status === "ready"
      ? definitions.rows.filter((definition) => definition.retiredAt === null)
      : [];

  return (
    <div data-stewardship-manage="true">
      <header className="orient-surface-header">
        <div>
          <h2>Stewardship</h2>
          <p className="orient-capture-lead">What I continually steward.</p>
        </div>
        <SurfaceClose onClose={onClose} label="Close Stewardship" />
      </header>
      {definitions.status === "failed" ? (
        <p role="alert">Stewardship could not be read. {definitions.message}</p>
      ) : null}
      {definitions.status === "ready" && active.length === 0 ? (
        <p data-stewardship-manage-empty="true">Nothing is established to steward yet.</p>
      ) : null}
      {definitions.status === "ready" && active.length > 0 ? (
        <ul data-stewardship-manage-list="true" data-act-list="true">
          {active.map((definition) => {
            const wording =
              revisions.status === "ready"
                ? latestStewardshipWording(
                    revisions.rows.filter((revision) => revision.definitionId === definition.id),
                  )
                : null;
            const context = contextName(contexts, definition.contextId);
            return (
              <li key={definition.id}>
                <button
                  type="button"
                  className="orient-action orient-act-select"
                  data-stewardship-manage-select={definition.id}
                  onClick={() => onOpen(definition.id)}
                >
                  <span className="orient-act-title">{wording ?? "Stewardship"}</span>
                  <span className="orient-act-meta">
                    {stewardshipEstablishmentCycleLabel(definition.cycleKind)}
                  </span>
                  {context ? <span className="orient-act-meta">{context}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="orient-actions">
        <button
          type="button"
          className="orient-action"
          data-stewardship-manage-establish="true"
          onClick={onEstablish}
        >
          Establish stewardship
        </button>
      </div>
    </div>
  );
}

function StewardshipDetail({
  definitionId,
  occurrence,
  definitions,
  revisions,
  satisfactions,
  work,
  contexts,
  viewpointCivilDate,
  now,
  timeZone,
  onEdit,
  onRetire,
  onBack,
}: {
  definitionId: string;
  occurrence: ActStewardshipRow | null;
  definitions: SourceRead<StewardshipDefinition>;
  revisions: SourceRead<StewardshipDefinitionRevision>;
  satisfactions: SourceRead<StewardshipSatisfaction>;
  work: SourceRead<WorkScheduleEntry>;
  contexts: SourceRead<Context>;
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  onEdit: (input: { definitionId: string; content: string }) => Promise<void>;
  onRetire: (definitionId: string) => Promise<void>;
  onBack: () => void;
}) {
  const definition =
    definitions.status === "ready"
      ? (definitions.rows.find((item) => item.id === definitionId) ?? null)
      : null;
  const definitionRevisions =
    revisions.status === "ready"
      ? revisions.rows.filter((revision) => revision.definitionId === definitionId)
      : [];
  const latest = latestStewardshipWording(definitionRevisions);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latest ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (definitions.status === "failed") {
    return <p role="alert">Stewardship could not be read. {definitions.message}</p>;
  }
  if (!definition) {
    return (
      <div data-stewardship-detail="true">
        <p>This stewardship is not available.</p>
        <button type="button" className="orient-action" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const context = contextName(contexts, definition.contextId);
  const cycleLabel = stewardshipEstablishmentCycleLabel(definition.cycleKind);

  let occurrenceState: string | null = null;
  let cycleWording: string | null = null;
  if (
    work.status === "ready" &&
    revisions.status === "ready" &&
    satisfactions.status === "ready"
  ) {
    const workContext = actStewardshipWorkContext({
      viewpointCivilDate,
      now,
      timeZone,
      workEntries: work.rows,
    });
    const cycleKey =
      definition.cycleKind === "workday" ? workContext.workdayCycleKey : workContext.weeklyCycleKey;
    if (cycleKey !== null && workContext.gateEntry) {
      const interval = cycleInterval({
        cycleKind: definition.cycleKind,
        cycleKey,
        timeZone,
      });
      cycleWording = wordingForOccurrence({
        definition,
        revisions: definitionRevisions,
        cycleStart: interval.start,
        cycleEnd: interval.end,
      });
      const reading = readStewardshipOccurrence({
        definition,
        revisions: definitionRevisions,
        satisfactions: satisfactions.rows,
        cycleKind: definition.cycleKind,
        cycleKey,
        timeZone,
        workEntries: work.rows,
        viewpointWorkEntry: workContext.gateEntry,
      });
      if (occurrence) {
        occurrenceState = "Not yet this cycle";
      } else if (reading.satisfied) {
        occurrenceState = "Satisfied this cycle";
      } else if (!reading.actPrimaryEligible) {
        occurrenceState = "Not asked for attention on this day";
      } else if (reading.notYetSatisfied) {
        occurrenceState = "Not yet this cycle";
      }
    } else {
      occurrenceState = "Not asked for attention on this day";
    }
  }

  const midCycleNote =
    cycleWording && latest && cycleWording !== latest
      ? `This cycle still reads “${cycleWording}”. New wording applies from the next cycle.`
      : null;

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      await onEdit({ definitionId, content: requireStewardshipContent(draft) });
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setBusy(false);
    }
  }

  async function retire() {
    setBusy(true);
    setError(null);
    try {
      await onRetire(definitionId);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
      setBusy(false);
    }
  }

  return (
    <div data-stewardship-detail="true">
      <p className="orient-capture-lead">Continual stewardship</p>
      {editing ? (
        <label className="orient-note">
          What do I steward?
          <input
            aria-label="Stewardship wording"
            value={draft}
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      ) : (
        <p data-stewardship-detail-wording="true" className="orient-act-title">
          {occurrence?.wording ?? latest ?? "Stewardship"}
        </p>
      )}
      <p data-stewardship-detail-cycle="true" className="orient-act-meta">
        {cycleLabel}
      </p>
      {context ? (
        <p data-stewardship-detail-context="true" className="orient-act-meta">
          {context}
        </p>
      ) : null}
      {occurrenceState ? (
        <p data-stewardship-detail-occurrence="true" className="orient-act-meta">
          {occurrenceState}
        </p>
      ) : null}
      {midCycleNote ? (
        <p data-stewardship-mid-cycle="true" className="orient-act-meta">
          {midCycleNote}
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="orient-actions">
        {editing ? (
          <button
            type="button"
            className="orient-action"
            data-emphasis="save"
            data-stewardship-save-edit="true"
            disabled={busy || draft.trim().length === 0}
            onClick={() => void saveEdit()}
          >
            Save wording
          </button>
        ) : (
          <button
            type="button"
            className="orient-action"
            data-stewardship-edit="true"
            disabled={busy || definition.retiredAt !== null}
            onClick={() => {
              setDraft(latest ?? "");
              setEditing(true);
            }}
          >
            Edit wording
          </button>
        )}
        {definition.retiredAt === null ? (
          <button
            type="button"
            className="orient-action"
            data-stewardship-retire="true"
            disabled={busy}
            onClick={() => void retire()}
          >
            Stop stewarding
          </button>
        ) : null}
        <button type="button" className="orient-action" onClick={onBack} disabled={busy}>
          Back
        </button>
      </div>
    </div>
  );
}

export function StewardshipDetailSurface({
  definitionId,
  definitions,
  revisions,
  satisfactions,
  work,
  contexts,
  viewpointCivilDate,
  now,
  timeZone,
  onEdit,
  onRetire,
  onClose,
}: {
  definitionId: string;
  definitions: SourceRead<StewardshipDefinition>;
  revisions: SourceRead<StewardshipDefinitionRevision>;
  satisfactions: SourceRead<StewardshipSatisfaction>;
  work: SourceRead<WorkScheduleEntry>;
  contexts: SourceRead<Context>;
  viewpointCivilDate: string;
  now: Date;
  timeZone: string;
  onEdit: (input: { definitionId: string; content: string }) => Promise<void>;
  onRetire: (definitionId: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div data-stewardship-detail-surface="true">
      <header className="orient-surface-header">
        <h2>Stewardship</h2>
        <SurfaceClose onClose={onClose} label="Close Stewardship detail" />
      </header>
      <StewardshipDetail
        definitionId={definitionId}
        occurrence={null}
        definitions={definitions}
        revisions={revisions}
        satisfactions={satisfactions}
        work={work}
        contexts={contexts}
        viewpointCivilDate={viewpointCivilDate}
        now={now}
        timeZone={timeZone}
        onEdit={onEdit}
        onRetire={onRetire}
        onBack={onClose}
      />
    </div>
  );
}

export function DirectTaskSurface({
  contexts,
  onChanged,
  onClose,
  establish = (input) => createTask(getSupabaseBrowserClient(), input),
}: {
  contexts: SourceRead<Context>;
  onChanged: () => void;
  onClose: () => void;
  establish?: (input: NewTask) => Promise<Task>;
}) {
  const [title, setTitle] = useState("");
  const [plannedOn, setPlannedOn] = useState("");
  const [plannedLocal, setPlannedLocal] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [contextId, setContextId] = useState("");
  const [mustDo, setMustDo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await establish(
        taskInputFromDraft({ title, contextId, plannedOn, plannedLocal, dueOn, mustDo }),
      );
      onChanged();
      onClose();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-direct-task="true" className="orient-direct-create">
      <header className="orient-surface-header">
        <h2>New Task</h2>
        <SurfaceClose onClose={onClose} label="Close new Task" />
      </header>
      <label className="orient-note" htmlFor="orient-direct-task-title">
        What needs doing?
        <input
          id="orient-direct-task-title"
          aria-label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          disabled={saving}
        />
      </label>
      <section data-direct-task-when="true" aria-label="When">
        <h3>When</h3>
        <label className="orient-note" htmlFor="orient-direct-task-planned">
          Planned day
          <span className="orient-field-hint">When you intend to work on it.</span>
          <input
            id="orient-direct-task-planned"
            type="date"
            aria-label="Planned day"
            value={plannedOn}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.value;
              setPlannedOn(next);
              if (next.length === 0) setPlannedLocal("");
            }}
          />
        </label>
        <label className="orient-note" htmlFor="orient-direct-task-clock">
          Planned clock
          <span className="orient-field-hint">Optional local time on that day. Not a reserved interval.</span>
          <input
            id="orient-direct-task-clock"
            type="time"
            aria-label="Planned clock"
            value={plannedLocal}
            disabled={saving || plannedOn.length === 0}
            onChange={(event) => setPlannedLocal(event.target.value)}
          />
        </label>
        <label className="orient-note" htmlFor="orient-direct-task-due">
          Due
          <span className="orient-field-hint">When completion is required.</span>
          <input
            id="orient-direct-task-due"
            type="date"
            aria-label="Due day"
            value={dueOn}
            disabled={saving}
            onChange={(event) => setDueOn(event.target.value)}
          />
        </label>
      </section>
      <label className="orient-note" htmlFor="orient-direct-task-context">
        Context
        <select
          id="orient-direct-task-context"
          aria-label="Task context"
          value={contextId}
          disabled={saving}
          onChange={(event) => setContextId(event.target.value)}
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
        <input
          type="checkbox"
          aria-label="Must do"
          checked={mustDo}
          disabled={saving}
          onChange={(event) => setMustDo(event.target.checked)}
        />{" "}
        Must do
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button
        type="button"
        className="orient-action"
        data-emphasis="save"
        data-add-task="true"
        disabled={saving || title.trim().length === 0}
        onClick={() => void save()}
      >
        {saving ? "Adding" : "Add Task"}
      </button>
    </div>
  );
}

type RetainedNotesReading =
  | { status: "loading" }
  | { status: "ready"; rows: readonly Note[] }
  | { status: "failed"; message: string };

function RetainedNotesCollection({
  reading,
  sourced,
  pending,
  confirmingDeleteId,
  onBeginSource,
  onSourceTitle,
  onSaveSourced,
  onRetire,
  onBeginDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  reading: RetainedNotesReading | null;
  sourced: { noteId: string; title: string } | null;
  pending: boolean;
  confirmingDeleteId: string | null;
  onBeginSource: (noteId: string) => void;
  onSourceTitle: (noteId: string, title: string) => void;
  onSaveSourced: () => void;
  onRetire: ((noteId: string) => void) | null;
  onBeginDelete: ((noteId: string) => void) | null;
  onCancelDelete: (() => void) | null;
  onConfirmDelete: ((noteId: string) => void) | null;
}) {
  if (reading == null) return null;
  if (reading.status === "loading") {
    return (
      <p data-notes-loading="true" className="orient-note">
        Reading retained notes.
      </p>
    );
  }
  if (reading.status === "failed") {
    return (
      <p role="alert" data-reading="incomplete" data-notes-failed="true">
        {reading.message}
      </p>
    );
  }
  if (reading.rows.length === 0) {
    return <p data-notes-empty="true">No notes have been retained.</p>;
  }
  const lifecycle = onRetire != null && onBeginDelete != null && onCancelDelete != null && onConfirmDelete != null;
  return (
    <div data-notes-collection="true">
      {reading.rows.map((note) => (
        <article key={note.id} data-retained-note={note.id}>
          <p>{note.content}</p>
          <time dateTime={note.capturedAt}>{note.capturedAt}</time>
          <button type="button" className="orient-action" onClick={() => onBeginSource(note.id)}>
            Establish a task from this
          </button>
          {sourced?.noteId === note.id ? (
            <div>
              <label className="orient-note">
                Task title
                <input
                  aria-label="Task title from note"
                  value={sourced.title}
                  disabled={pending}
                  onChange={(event) => onSourceTitle(note.id, event.target.value)}
                />
              </label>
              <button
                type="button"
                className="orient-action"
                data-emphasis="save"
                disabled={pending || sourced.title.trim().length === 0}
                onClick={() => onSaveSourced()}
              >
                Save
              </button>
            </div>
          ) : null}
          {lifecycle ? (
            confirmingDeleteId === note.id ? (
              <div data-note-delete-confirm={note.id} className="orient-actions">
                <p className="orient-note">This permanently deletes the Note.</p>
                <button
                  type="button"
                  className="orient-action"
                  data-note-delete="true"
                  data-note-delete-confirm-action="true"
                  disabled={pending}
                  onClick={() => onConfirmDelete(note.id)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="orient-action"
                  data-note-delete-cancel="true"
                  disabled={pending}
                  onClick={() => onCancelDelete()}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="orient-actions">
                <button
                  type="button"
                  className="orient-action"
                  data-note-retire="true"
                  disabled={pending}
                  onClick={() => onRetire(note.id)}
                >
                  Retire
                </button>
                <button
                  type="button"
                  className="orient-action"
                  data-note-delete="true"
                  disabled={pending}
                  onClick={() => onBeginDelete(note.id)}
                >
                  Delete
                </button>
              </div>
            )
          ) : null}
        </article>
      ))}
    </div>
  );
}

/**
 * LOOK → Notes. On-demand complete read of retained Notes.
 * Inspection only: not Timeline, not ACT, not Present/Day/Week/Month.
 */
export function NotesSurface({
  onChanged,
  onClose,
  readNotes,
  establishTask,
  retire,
  remove,
}: {
  onChanged?: () => void;
  onClose: () => void;
  readNotes?: () => Promise<Note[]>;
  establishTask?: (input: NewTask) => Promise<Task>;
  retire?: (id: string) => Promise<Note>;
  remove?: (id: string) => Promise<void>;
}) {
  const [reading, setReading] = useState<RetainedNotesReading>({ status: "loading" });
  const [sourced, setSourced] = useState<{ noteId: string; title: string } | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = readNotes ?? (() => loadNotes(getSupabaseBrowserClient()));
    void (async () => {
      try {
        const rows = await loader();
        if (!cancelled) setReading({ status: "ready", rows });
      } catch (caught: unknown) {
        if (!cancelled) {
          setReading({
            status: "failed",
            message: failureMessage(caught, "Notes could not be read."),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readNotes]);

  async function saveSourced() {
    if (!sourced || pending || sourced.title.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      const writer = establishTask ?? ((input: NewTask) => createTask(getSupabaseBrowserClient(), input));
      await writer(taskFromRetainedNote(sourced.title, sourced.noteId));
      setSourced(null);
      onChanged?.();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setPending(false);
    }
  }

  async function retireCurrent(noteId: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    setConfirmingDeleteId(null);
    try {
      const writer =
        retire ?? ((id: string) => retireNote(getSupabaseBrowserClient(), { id, retiredAt: new Date() }));
      await writer(noteId);
      setReading((current) =>
        current.status === "ready"
          ? { status: "ready", rows: current.rows.filter((note) => note.id !== noteId) }
          : current,
      );
      if (sourced?.noteId === noteId) setSourced(null);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The Note could not be retired."));
    } finally {
      setPending(false);
    }
  }

  async function deleteCurrent(noteId: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const writer = remove ?? ((id: string) => deleteNote(getSupabaseBrowserClient(), id));
      await writer(noteId);
      setConfirmingDeleteId(null);
      setReading((current) =>
        current.status === "ready"
          ? { status: "ready", rows: current.rows.filter((note) => note.id !== noteId) }
          : current,
      );
      if (sourced?.noteId === noteId) setSourced(null);
    } catch (caught: unknown) {
      if (caught instanceof NoteCitedError) {
        setError(caught.message);
      } else {
        setError(failureMessage(caught, "The Note could not be deleted."));
      }
      setConfirmingDeleteId(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div data-notes-surface="true" className="orient-capture">
      <header className="orient-surface-header">
        <div>
          <h2>Notes</h2>
          <p className="orient-capture-lead">What Orient remembers.</p>
        </div>
        <SurfaceClose onClose={onClose} label="Close Notes" />
      </header>
      {error ? (
        <p role="alert" data-note-lifecycle-error="true">
          {error}
        </p>
      ) : null}
      <RetainedNotesCollection
        reading={reading}
        sourced={sourced}
        pending={pending}
        confirmingDeleteId={confirmingDeleteId}
        onBeginSource={(noteId) => setSourced({ noteId, title: "" })}
        onSourceTitle={(noteId, title) => setSourced({ noteId, title })}
        onSaveSourced={() => void saveSourced()}
        onRetire={(noteId) => void retireCurrent(noteId)}
        onBeginDelete={(noteId) => {
          setError(null);
          setConfirmingDeleteId(noteId);
        }}
        onCancelDelete={() => setConfirmingDeleteId(null)}
        onConfirmDelete={(noteId) => void deleteCurrent(noteId)}
      />
    </div>
  );
}

export function DirectNoteSurface({
  onChanged,
  onClose,
  establish = (input) => createNote(getSupabaseBrowserClient(), input),
}: {
  onChanged?: () => void;
  onClose: () => void;
  establish?: (input: NewNote) => Promise<Note>;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const retained = requireNoteContent(content);
      await establish({
        id: crypto.randomUUID(),
        content: retained,
        capturedAt: new Date(),
      });
      onChanged?.();
      onClose();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-direct-note="true" className="orient-direct-create">
      <header className="orient-surface-header">
        <h2>New Note</h2>
        <SurfaceClose onClose={onClose} label="Close new Note" />
      </header>
      <label className="orient-note" htmlFor="orient-direct-note-content">
        <span className="sr-only">Note content</span>
        <textarea
          id="orient-direct-note-content"
          aria-label="Note content"
          value={content}
          disabled={saving}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button
        type="button"
        className="orient-action"
        data-emphasis="save"
        data-add-note="true"
        disabled={saving || content.trim().length === 0}
        onClick={() => void save()}
      >
        {saving ? "Adding" : "Add Note"}
      </button>
    </div>
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
  const [notes, setNotes] = useState<RetainedNotesReading | null>(null);
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
    setNotes({ status: "loading" });
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
      <RetainedNotesCollection
        reading={notes}
        sourced={sourced}
        pending={pending !== null}
        confirmingDeleteId={null}
        onBeginSource={(noteId) => setSourced({ noteId, title: "" })}
        onSourceTitle={(noteId, title) => setSourced({ noteId, title })}
        onSaveSourced={() => void saveSourced()}
        onRetire={null}
        onBeginDelete={null}
        onCancelDelete={null}
        onConfirmDelete={null}
      />
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
