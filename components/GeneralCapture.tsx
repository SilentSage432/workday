"use client";

import { useRef, useState } from "react";
import {
  authorizeNoteEstablishment,
  expressionChanged,
  initialGeneralCapture,
  taskFromExpression,
  type GeneralCaptureState,
} from "@/domain/generalCapture";
import type { Note } from "@/domain/note";
import type { Task } from "@/domain/task";
import { createTask } from "@/persistence/contextsAndTasks";
import { createNote, loadNotes } from "@/persistence/note";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

const fieldClass =
  "mt-1 w-full min-h-24 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

function establishmentInstant(): Date {
  return new Date();
}

function noteIdentity(): string {
  return crypto.randomUUID();
}

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type RetainedExperiences =
  | { phase: "hidden" }
  | { phase: "loading" }
  | { phase: "ready"; notes: readonly Note[] }
  | { phase: "error"; message: string };

/**
 * Provisional typed proof of capture establishment, and the scaffold return to retained Notes.
 * The visible words are not final experience canon.
 * Quick Capture remains the direct Task surface.
 */
export function GeneralCapture({
  now = establishmentInstant,
  createNoteId = noteIdentity,
  onTaskCreated,
}: {
  now?: () => Date;
  createNoteId?: () => string;
  onTaskCreated?: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<GeneralCaptureState>(initialGeneralCapture);
  const [pending, setPending] = useState<"note" | "task" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retained, setRetained] = useState<RetainedExperiences>({ phase: "hidden" });
  const pendingRef = useRef(false);
  const retainedRead = useRef(0);
  const blank = state.expression.trim().length === 0;

  function discardRetainedRead() {
    retainedRead.current += 1;
    setRetained({ phase: "hidden" });
  }

  function leave() {
    if (pendingRef.current) return;
    discardRetainedRead();
    setState(initialGeneralCapture());
    setOpen(false);
    setError(null);
  }

  async function revealRetained() {
    if (pendingRef.current || retained.phase === "loading") return;
    const request = retainedRead.current + 1;
    retainedRead.current = request;
    setRetained({ phase: "loading" });
    try {
      const notes = await loadNotes(getSupabaseBrowserClient());
      if (retainedRead.current !== request) return;
      setRetained({ phase: "ready", notes });
    } catch (caught: unknown) {
      if (retainedRead.current !== request) return;
      setRetained({
        phase: "error",
        message: failureMessage(caught, "Could not read retained experiences."),
      });
    }
  }

  async function establishNote() {
    if (pendingRef.current || blank) return;
    let authorized: ReturnType<typeof authorizeNoteEstablishment>;
    try {
      authorized = authorizeNoteEstablishment(state, now, createNoteId);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A note needs retained experience."));
      return;
    }
    pendingRef.current = true;
    setPending("note");
    setError(null);
    setState(authorized.state);
    try {
      await createNote(getSupabaseBrowserClient(), authorized.note);
      discardRetainedRead();
      setState(initialGeneralCapture());
      setOpen(false);
    } catch (caught: unknown) {
      setState(authorized.state);
      setError(failureMessage(caught, "Could not keep this note."));
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  async function establishTask() {
    if (pendingRef.current || blank) return;
    let intent;
    try {
      intent = taskFromExpression(state.expression);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A task title is required."));
      return;
    }
    pendingRef.current = true;
    setPending("task");
    setError(null);
    try {
      const created = await createTask(getSupabaseBrowserClient(), intent);
      discardRetainedRead();
      setState(initialGeneralCapture());
      setOpen(false);
      onTaskCreated?.(created);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not save this task."));
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  if (!open) {
    return (
      <div className="mt-6">
        <button type="button" onClick={() => setOpen(true)} className={`w-full ${secondaryButtonClass}`}>
          Hold an experience
        </button>
      </div>
    );
  }

  return (
    <section className="mt-6" aria-labelledby="general-capture-heading">
      <h2 id="general-capture-heading" className="text-xl font-medium tracking-tight">
        Hold an experience
      </h2>
      <label className="mt-4 block text-sm font-medium" htmlFor="general-expression">
        Expression
      </label>
      <textarea
        id="general-expression"
        name="expression"
        rows={3}
        autoComplete="off"
        disabled={pending !== null}
        value={state.expression}
        onChange={(event) => {
          const expression = event.target.value;
          setState((current) => expressionChanged(current, expression));
          setError(null);
        }}
        className={fieldClass}
      />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-stone-200">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void establishNote()}
          disabled={pending !== null || blank}
          className={primaryButtonClass}
        >
          {pending === "note" ? "Saving" : "Keep as a note"}
        </button>
        <button
          type="button"
          onClick={() => void establishTask()}
          disabled={pending !== null || blank}
          className={secondaryButtonClass}
        >
          {pending === "task" ? "Saving" : "This is a task"}
        </button>
        <button type="button" onClick={leave} disabled={pending !== null} className={secondaryButtonClass}>
          Leave
        </button>
        <button
          type="button"
          onClick={() => void revealRetained()}
          disabled={pending !== null || retained.phase === "loading"}
          className={secondaryButtonClass}
        >
          {retained.phase === "loading" ? "Reading" : "Retained experiences"}
        </button>
      </div>
      {retained.phase === "loading" ? (
        <p className="mt-3 text-sm text-stone-300">Reading retained experiences.</p>
      ) : null}
      {retained.phase === "error" ? (
        <p role="alert" className="mt-3 text-sm text-stone-200">
          {retained.message}
        </p>
      ) : null}
      {retained.phase === "ready" ? (
        <div className="mt-4">
          {retained.notes.length === 0 ? (
            <p>No notes have been retained.</p>
          ) : (
            <ul>
              {retained.notes.map((note) => (
                <li key={note.id} className="border-t border-stone-800 py-3">
                  <p className="break-words whitespace-pre-wrap text-base">{note.content}</p>
                  <time dateTime={note.capturedAt} className="mt-1 block text-sm text-stone-300">
                    {note.capturedAt}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
