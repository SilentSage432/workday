import { emptyCaptureDraft, newTaskFromCapture } from "@/domain/capture";
import {
  capturedAtFromEstablishment,
  requireNoteContent,
  requireNoteId,
  type NewNote,
} from "@/domain/note";
import type { NewTask } from "@/domain/task";

/**
 * Transient expression and, after a failed Note write, the authorized retry.
 * This is interaction state. It is not a Note, a Task, or a stored capture.
 */
export type GeneralCaptureState = {
  expression: string;
  noteAttempt: NoteAttempt | null;
};

export type NoteAttempt = {
  id: string;
  capturedAt: string;
  content: string;
};

export function initialGeneralCapture(): GeneralCaptureState {
  return { expression: "", noteAttempt: null };
}

export function expressionChanged(state: GeneralCaptureState, expression: string): GeneralCaptureState {
  if (state.noteAttempt && expression !== state.expression) {
    return { expression, noteAttempt: null };
  }
  return { ...state, expression };
}

/**
 * Authorizes one Note from the current expression.
 * A failed attempt for this same expression keeps its id and capturedAt.
 * The clock and the id source are read only when this act is a new authorization.
 */
export function authorizeNoteEstablishment(
  state: GeneralCaptureState,
  now: () => Date,
  createId: () => string,
): { state: GeneralCaptureState; note: NewNote } {
  const content = requireNoteContent(state.expression);
  if (state.noteAttempt && state.noteAttempt.content === state.expression) {
    return {
      state,
      note: {
        id: state.noteAttempt.id,
        content,
        capturedAt: new Date(state.noteAttempt.capturedAt),
      },
    };
  }

  const capturedAt = capturedAtFromEstablishment(now());
  const id = requireNoteId(createId());
  return {
    state: {
      expression: state.expression,
      noteAttempt: { id, capturedAt, content: state.expression },
    },
    note: { id, content, capturedAt: new Date(capturedAt) },
  };
}

/** One ordinary Task. Optional fields stay at the existing unset defaults. */
export function taskFromExpression(expression: string): NewTask {
  return newTaskFromCapture({ ...emptyCaptureDraft(), title: expression });
}
