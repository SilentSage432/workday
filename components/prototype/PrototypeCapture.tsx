"use client";

import { useState } from "react";
import { useCapture } from "@/components/AppFrame";
import { CapturePanel } from "@/components/CapturePanel";
import type { CaptureContextOption } from "@/components/CapturePanel";
import {
  authorizeNoteEstablishment,
  expressionChanged,
  initialGeneralCapture,
  taskFromExpression,
  taskFromRetainedNote,
  type GeneralCaptureState,
} from "@/domain/generalCapture";
import type { Note } from "@/domain/note";
import { createNote, loadNotes } from "@/persistence/note";
import { createTask } from "@/persistence/contextsAndTasks";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

const fieldClass =
  "mt-1 w-full border border-stone-600 bg-stone-950 px-2 py-2 text-base text-stone-100";
const buttonClass = "min-h-11 border border-stone-500 bg-stone-900 px-3 text-left text-base text-stone-100";

type NoteRead =
  | { phase: "hidden" }
  | { phase: "loading" }
  | { phase: "ready"; notes: Note[] }
  | { phase: "error"; message: string };

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

/**
 * Capture inside the reach strip.
 * Quick Capture, General Capture, and retained Notes use the existing acts.
 * There is no Orient microphone.
 */
export function PrototypeCapture({ contexts }: { contexts: readonly CaptureContextOption[] }) {
  const capture = useCapture();
  const [mode, setMode] = useState<"quick" | "general" | "notes">("quick");
  const [general, setGeneral] = useState<GeneralCaptureState>(initialGeneralCapture);
  const [notes, setNotes] = useState<NoteRead>({ phase: "hidden" });
  const [sourcedTitle, setSourcedTitle] = useState<{ noteId: string; title: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revealNotes() {
    setMode("notes");
    setNotes({ phase: "loading" });
    setError(null);
    try {
      const rows = await loadNotes(getSupabaseBrowserClient());
      setNotes({ phase: "ready", notes: rows });
    } catch (caught: unknown) {
      setNotes({ phase: "error", message: failureMessage(caught, "Could not read retained experiences.") });
    }
  }

  async function keepNote() {
    if (pending) return;
    let authorized: ReturnType<typeof authorizeNoteEstablishment>;
    try {
      authorized = authorizeNoteEstablishment(general, () => new Date(), () => crypto.randomUUID());
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A note needs retained experience."));
      return;
    }
    setPending(true);
    setError(null);
    setGeneral(authorized.state);
    try {
      await createNote(getSupabaseBrowserClient(), authorized.note);
      setGeneral(initialGeneralCapture());
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not keep this note."));
    } finally {
      setPending(false);
    }
  }

  async function keepTask() {
    if (pending) return;
    let intent;
    try {
      intent = taskFromExpression(general.expression);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A task title is required."));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createTask(getSupabaseBrowserClient(), intent);
      setGeneral(initialGeneralCapture());
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not save this task."));
    } finally {
      setPending(false);
    }
  }

  async function keepSourcedTask() {
    if (pending || sourcedTitle == null || sourcedTitle.title.trim().length === 0) return;
    let intent;
    try {
      intent = taskFromRetainedNote(sourcedTitle.title, sourcedTitle.noteId);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "A task title is required."));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createTask(getSupabaseBrowserClient(), intent);
      setSourcedTitle(null);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Could not save this task."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div data-capture-forms="true">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>
          Quick Capture
        </button>
        <button
          type="button"
          className={buttonClass}
          aria-pressed={mode === "general"}
          onClick={() => setMode("general")}
        >
          General Capture
        </button>
        <button type="button" className={buttonClass} aria-pressed={mode === "notes"} onClick={() => void revealNotes()}>
          Retained notes
        </button>
      </div>
      {mode === "quick" ? (
        <CapturePanel
          session={capture.session}
          contexts={[...contexts]}
          saving={capture.saving}
          saveError={capture.saveError}
          onChange={capture.update}
          onSubmit={(event) => {
            event.preventDefault();
            void capture.submit();
          }}
        />
      ) : null}
      {mode === "general" ? (
        <div className="mt-3">
          <label className="block text-sm" htmlFor="prototype-expression">
            Expression
          </label>
          <textarea
            id="prototype-expression"
            rows={3}
            value={general.expression}
            disabled={pending}
            onChange={(event) => {
              const expression = event.target.value;
              setGeneral((current) => expressionChanged(current, expression));
              setError(null);
            }}
            className={fieldClass}
          />
          <div className="mt-2 flex flex-col gap-2">
            <button type="button" className={buttonClass} disabled={pending} onClick={() => void keepNote()}>
              Keep as a note
            </button>
            <button type="button" className={buttonClass} disabled={pending} onClick={() => void keepTask()}>
              Establish a task
            </button>
          </div>
        </div>
      ) : null}
      {mode === "notes" ? (
        <div className="mt-3">
          {notes.phase === "loading" ? <p>Reading retained experiences.</p> : null}
          {notes.phase === "error" ? (
            <p role="alert">{notes.message}</p>
          ) : null}
          {notes.phase === "ready" && notes.notes.length === 0 ? <p>No notes are retained.</p> : null}
          {notes.phase === "ready"
            ? notes.notes.map((note) => (
                <article key={note.id} className="mt-2 border border-stone-600 p-2">
                  <p>{note.content}</p>
                  {sourcedTitle?.noteId === note.id ? (
                    <div className="mt-2">
                      <label className="block text-sm" htmlFor={`sourced-${note.id}`}>
                        Task title
                      </label>
                      <input
                        id={`sourced-${note.id}`}
                        value={sourcedTitle.title}
                        onChange={(event) => setSourcedTitle({ noteId: note.id, title: event.target.value })}
                        className={fieldClass}
                      />
                      <button type="button" className={`${buttonClass} mt-2`} onClick={() => void keepSourcedTask()}>
                        Establish a task from this
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${buttonClass} mt-2`}
                      onClick={() => setSourcedTitle({ noteId: note.id, title: "" })}
                    >
                      Establish a task from this
                    </button>
                  )}
                </article>
              ))
            : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
