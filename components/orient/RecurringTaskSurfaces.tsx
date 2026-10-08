"use client";

import { useState } from "react";
import type { SourceRead } from "@/components/currentTemporalReading";
import type { Context } from "@/domain/context";
import {
  RECURRING_TASK_WEEKDAYS,
  requireRecurringTaskTitle,
  recurringTaskWeekdayLabel,
  type RecurringTaskDefinition,
  type RecurringTaskDefinitionPatch,
  type RecurringTaskWeekday,
} from "@/domain/recurringTask";

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

function SurfaceClose({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button type="button" className="orient-surface-close" data-surface-close="true" aria-label={label} onClick={onClose}>
      Close
    </button>
  );
}

function contextName(contexts: SourceRead<Context>, contextId: string | null): string | null {
  if (!contextId || contexts.status !== "ready") return null;
  return contexts.rows.find((context) => context.id === contextId)?.name ?? null;
}

export function DirectRecurringTaskSurface({
  contexts,
  onEstablish,
  onClose,
}: {
  contexts: SourceRead<Context>;
  onEstablish: (input: {
    title: string;
    availableWeekday: RecurringTaskWeekday;
    dueWeekday: RecurringTaskWeekday;
    contextId: string | null;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [availableWeekday, setAvailableWeekday] = useState<RecurringTaskWeekday>("sat");
  const [dueWeekday, setDueWeekday] = useState<RecurringTaskWeekday>("wed");
  const [contextId, setContextId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onEstablish({
        title: requireRecurringTaskTitle(title),
        availableWeekday,
        dueWeekday,
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
    <div data-direct-recurring-task="true" className="orient-direct-create">
      <header className="orient-surface-header">
        <h2>Recurring Task</h2>
        <SurfaceClose onClose={onClose} label="Close new Recurring Task" />
      </header>
      <p className="orient-capture-lead">What needs to happen each week?</p>
      <label className="orient-note" htmlFor="orient-direct-recurring-task-title">
        What needs to happen?
        <input
          id="orient-direct-recurring-task-title"
          aria-label="Recurring Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          disabled={saving}
        />
      </label>
      <p className="orient-note" data-recurring-repeats="true">
        Repeats
        <span className="orient-act-meta">Weekly</span>
      </p>
      <label className="orient-note" htmlFor="orient-direct-recurring-available">
        Available
        <select
          id="orient-direct-recurring-available"
          aria-label="Available weekday"
          value={availableWeekday}
          disabled={saving}
          onChange={(event) => setAvailableWeekday(event.target.value as RecurringTaskWeekday)}
        >
          {RECURRING_TASK_WEEKDAYS.map((weekday) => (
            <option key={weekday} value={weekday}>
              {recurringTaskWeekdayLabel(weekday)}
            </option>
          ))}
        </select>
      </label>
      <label className="orient-note" htmlFor="orient-direct-recurring-due">
        Due
        <select
          id="orient-direct-recurring-due"
          aria-label="Due weekday"
          value={dueWeekday}
          disabled={saving}
          onChange={(event) => setDueWeekday(event.target.value as RecurringTaskWeekday)}
        >
          {RECURRING_TASK_WEEKDAYS.map((weekday) => (
            <option key={weekday} value={weekday}>
              {recurringTaskWeekdayLabel(weekday)}
            </option>
          ))}
        </select>
      </label>
      <label className="orient-note" htmlFor="orient-direct-recurring-context">
        Context
        <select
          id="orient-direct-recurring-context"
          aria-label="Recurring Task context"
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
        data-establish-recurring-task="true"
        disabled={saving || title.trim().length === 0}
        onClick={() => void save()}
      >
        {saving ? "Saving" : "Save"}
      </button>
    </div>
  );
}

export function RecurringTaskManageSurface({
  definitions,
  contexts,
  onEstablish,
  onOpen,
  onClose,
}: {
  definitions: SourceRead<RecurringTaskDefinition>;
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
    <div data-recurring-task-manage="true">
      <header className="orient-surface-header">
        <div>
          <h2>Recurring Tasks</h2>
          <p className="orient-capture-lead">Work that returns each week.</p>
        </div>
        <SurfaceClose onClose={onClose} label="Close Recurring Tasks" />
      </header>
      {definitions.status === "failed" ? (
        <p role="alert">Recurring Tasks could not be read. {definitions.message}</p>
      ) : null}
      {definitions.status === "ready" && active.length === 0 ? (
        <p data-recurring-task-manage-empty="true">Nothing is set to recur yet.</p>
      ) : null}
      {definitions.status === "ready" && active.length > 0 ? (
        <ul data-recurring-task-manage-list="true" data-act-list="true">
          {active.map((definition) => {
            const context = contextName(contexts, definition.contextId);
            return (
              <li key={definition.id}>
                <button
                  type="button"
                  className="orient-action orient-act-select"
                  data-recurring-task-manage-select={definition.id}
                  onClick={() => onOpen(definition.id)}
                >
                  <span className="orient-act-title">{definition.title}</span>
                  <span className="orient-act-meta">
                    Available {recurringTaskWeekdayLabel(definition.availableWeekday)} · Due{" "}
                    {recurringTaskWeekdayLabel(definition.dueWeekday)}
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
          data-recurring-task-manage-establish="true"
          onClick={onEstablish}
        >
          Establish recurring Task
        </button>
      </div>
    </div>
  );
}

export function RecurringTaskDetailSurface({
  definitionId,
  definitions,
  contexts,
  onUpdate,
  onRetire,
  onClose,
}: {
  definitionId: string;
  definitions: SourceRead<RecurringTaskDefinition>;
  contexts: SourceRead<Context>;
  onUpdate: (definitionId: string, patch: RecurringTaskDefinitionPatch) => Promise<void>;
  onRetire: (definitionId: string) => Promise<void>;
  onClose: () => void;
}) {
  const definition =
    definitions.status === "ready"
      ? (definitions.rows.find((row) => row.id === definitionId) ?? null)
      : null;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(definition?.title ?? "");
  const [availableWeekday, setAvailableWeekday] = useState<RecurringTaskWeekday>(
    definition?.availableWeekday ?? "sat",
  );
  const [dueWeekday, setDueWeekday] = useState<RecurringTaskWeekday>(definition?.dueWeekday ?? "wed");
  const [contextId, setContextId] = useState(definition?.contextId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!definition) {
    return (
      <div data-recurring-task-detail="true">
        <p>This recurring Task is not available.</p>
        <SurfaceClose onClose={onClose} label="Close recurring Task" />
      </div>
    );
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(definitionId, {
        title: requireRecurringTaskTitle(title),
        availableWeekday,
        dueWeekday,
        contextId: contextId.length > 0 ? contextId : null,
      });
      setEditing(false);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
    } finally {
      setSaving(false);
    }
  }

  async function stop() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onRetire(definitionId);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The write did not happen."));
      setSaving(false);
    }
  }

  const context = contextName(contexts, definition.contextId);

  return (
    <div data-recurring-task-detail="true">
      <header className="orient-surface-header">
        <div>
          <h2>Recurring Task</h2>
          <p className="orient-capture-lead">Weekly concrete work.</p>
        </div>
        <SurfaceClose onClose={onClose} label="Close recurring Task" />
      </header>
      {editing ? (
        <>
          <label className="orient-note" htmlFor="orient-recurring-edit-title">
            What needs to happen?
            <input
              id="orient-recurring-edit-title"
              aria-label="Recurring Task title"
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="orient-note" htmlFor="orient-recurring-edit-available">
            Available
            <select
              id="orient-recurring-edit-available"
              aria-label="Available weekday"
              value={availableWeekday}
              disabled={saving}
              onChange={(event) => setAvailableWeekday(event.target.value as RecurringTaskWeekday)}
            >
              {RECURRING_TASK_WEEKDAYS.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {recurringTaskWeekdayLabel(weekday)}
                </option>
              ))}
            </select>
          </label>
          <label className="orient-note" htmlFor="orient-recurring-edit-due">
            Due
            <select
              id="orient-recurring-edit-due"
              aria-label="Due weekday"
              value={dueWeekday}
              disabled={saving}
              onChange={(event) => setDueWeekday(event.target.value as RecurringTaskWeekday)}
            >
              {RECURRING_TASK_WEEKDAYS.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {recurringTaskWeekdayLabel(weekday)}
                </option>
              ))}
            </select>
          </label>
          <label className="orient-note" htmlFor="orient-recurring-edit-context">
            Context
            <select
              id="orient-recurring-edit-context"
              aria-label="Recurring Task context"
              value={contextId}
              disabled={saving}
              onChange={(event) => setContextId(event.target.value)}
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
        </>
      ) : (
        <>
          <p data-recurring-task-detail-title="true" className="orient-act-title">
            {definition.title}
          </p>
          <p data-recurring-task-detail-cycle="true" className="orient-act-meta">
            Weekly · Available {recurringTaskWeekdayLabel(definition.availableWeekday)} · Due{" "}
            {recurringTaskWeekdayLabel(definition.dueWeekday)}
          </p>
          {context ? (
            <p data-recurring-task-detail-context="true" className="orient-act-meta">
              {context}
            </p>
          ) : null}
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
      <div className="orient-actions">
        {editing ? (
          <button
            type="button"
            className="orient-action"
            data-emphasis="save"
            data-recurring-task-save-edit="true"
            disabled={saving || title.trim().length === 0}
            onClick={() => void saveEdit()}
          >
            {saving ? "Saving" : "Save changes"}
          </button>
        ) : (
          <button
            type="button"
            className="orient-action"
            data-recurring-task-edit="true"
            disabled={saving || definition.retiredAt !== null}
            onClick={() => {
              setTitle(definition.title);
              setAvailableWeekday(definition.availableWeekday);
              setDueWeekday(definition.dueWeekday);
              setContextId(definition.contextId ?? "");
              setEditing(true);
            }}
          >
            Edit
          </button>
        )}
        {definition.retiredAt === null ? (
          <button
            type="button"
            className="orient-action"
            data-recurring-task-retire="true"
            disabled={saving}
            onClick={() => void stop()}
          >
            Stop recurring
          </button>
        ) : null}
      </div>
    </div>
  );
}
