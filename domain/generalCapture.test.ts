import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  authorizeNoteEstablishment,
  expressionChanged,
  initialGeneralCapture,
  taskFromExpression,
  taskFromRetainedNote,
  type GeneralCaptureState,
} from "@/domain/generalCapture";
import { toTaskInsert } from "@/persistence/contextTaskMapping";

const FIRST_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_ID = "00000000-0000-4000-8000-000000000002";
const OPENED_AT = new Date("2026-10-04T12:00:00.000Z");
const ACTED_AT = new Date("2026-10-04T18:30:00.000Z");
const LATER_AT = new Date("2026-10-04T19:15:00.000Z");

function withExpression(expression: string): GeneralCaptureState {
  return { ...initialGeneralCapture(), expression };
}

describe("general capture establishment", () => {
  it("begins with transient expression and no authorized note", () => {
    expect(initialGeneralCapture()).toEqual({ expression: "", noteAttempt: null });
  });

  it("keeps edits in transient state", () => {
    const edited = expressionChanged(withExpression("aisle"), "aisle 12");
    expect(edited).toEqual({ expression: "aisle 12", noteAttempt: null });
  });

  it("rejects a blank or whitespace note", () => {
    expect(() => authorizeNoteEstablishment(initialGeneralCapture(), () => ACTED_AT, () => FIRST_ID)).toThrow(
      /retained experience/,
    );
    expect(() =>
      authorizeNoteEstablishment(withExpression(" \n\t "), () => ACTED_AT, () => FIRST_ID),
    ).toThrow(/retained experience/);
  });

  it("rejects a blank or whitespace task", () => {
    expect(() => taskFromExpression("")).toThrow(/title/);
    expect(() => taskFromExpression(" \n\t ")).toThrow(/title/);
  });

  it("authorizes one note from the expression at the establishment instant", () => {
    const now = vi.fn(() => ACTED_AT);
    const createId = vi.fn(() => FIRST_ID);
    const authorized = authorizeNoteEstablishment(withExpression("  aisle 12  "), now, createId);

    expect(now).toHaveBeenCalledOnce();
    expect(createId).toHaveBeenCalledOnce();
    expect(authorized.note).toEqual({
      id: FIRST_ID,
      content: "  aisle 12  ",
      capturedAt: ACTED_AT,
    });
    expect(authorized.note.capturedAt).not.toEqual(OPENED_AT);
    expect(authorized.state.noteAttempt).toEqual({
      id: FIRST_ID,
      capturedAt: "2026-10-04T18:30:00.000Z",
      content: "  aisle 12  ",
    });
  });

  it("reuses the authorized note id and capturedAt when the expression is unchanged", () => {
    const first = authorizeNoteEstablishment(withExpression("aisle 12"), () => ACTED_AT, () => FIRST_ID);
    const now = vi.fn(() => LATER_AT);
    const createId = vi.fn(() => SECOND_ID);
    const retry = authorizeNoteEstablishment(first.state, now, createId);

    expect(now).not.toHaveBeenCalled();
    expect(createId).not.toHaveBeenCalled();
    expect(retry.note.id).toBe(FIRST_ID);
    expect(retry.note.capturedAt.toISOString()).toBe("2026-10-04T18:30:00.000Z");
    expect(retry.note.content).toBe("aisle 12");
    expect(retry.state.noteAttempt).toEqual(first.state.noteAttempt);
  });

  it("clears a failed note attempt when the expression changes", () => {
    const failed = authorizeNoteEstablishment(withExpression("aisle 12"), () => ACTED_AT, () => FIRST_ID);
    const edited = expressionChanged(failed.state, "aisle 12 bay");
    expect(edited.noteAttempt).toBeNull();
    expect(edited.expression).toBe("aisle 12 bay");

    const now = vi.fn(() => LATER_AT);
    const createId = vi.fn(() => SECOND_ID);
    const next = authorizeNoteEstablishment(edited, now, createId);
    expect(now).toHaveBeenCalledOnce();
    expect(createId).toHaveBeenCalledOnce();
    expect(next.note.id).toBe(SECOND_ID);
    expect(next.note.capturedAt.toISOString()).toBe("2026-10-04T19:15:00.000Z");
    expect(next.note.content).toBe("aisle 12 bay");
  });

  it("establishes one ordinary user-created task and no note fields", () => {
    const task = taskFromExpression("  Call the school  ");
    expect(task).toEqual({
      title: "Call the school",
      contextId: null,
      plannedOn: null,
      dueOn: null,
      mustDo: false,
    });
    expect(toTaskInsert("user-1", task)).toMatchObject({
      title: "Call the school",
      context_id: null,
      planned_on: null,
      due_on: null,
      must_do: false,
      origin: "user_created",
    });
    expect(toTaskInsert("user-1", task)).not.toHaveProperty("note_id");
    expect(toTaskInsert("user-1", task)).not.toHaveProperty("source_note_id");
    expect(toTaskInsert("user-1", task).originating_note_id).toBeNull();
  });

  it("establishes one sourced task from a human title and one note identity", () => {
    const task = taskFromRetainedNote("  Check the department  ", FIRST_ID);
    expect(task).toEqual({
      title: "Check the department",
      contextId: null,
      plannedOn: null,
      dueOn: null,
      mustDo: false,
      originatingNoteId: FIRST_ID,
    });
    expect(task.title).not.toBe("Reminder to check the department");
    const inserted = toTaskInsert("user-1", task);
    expect(inserted).toMatchObject({
      title: "Check the department",
      origin: "user_created",
      originating_note_id: FIRST_ID,
      must_do: false,
      planned_on: null,
      due_on: null,
      context_id: null,
    });
    const again = toTaskInsert("user-2", taskFromRetainedNote("Ask receiving", FIRST_ID));
    expect(again.originating_note_id).toBe(inserted.originating_note_id);
    expect(again.title).toBe("Ask receiving");
  });

  it("does not classify expression or persist capture state", () => {
    const source = readFileSync(new URL("./generalCapture.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /localStorage|sessionStorage|createNote|createTask|from\(|SpeechRecognition|confidence|mustDo:\s*true|note_id|source_note_id/,
    );
    expect(source).not.toMatch(/new Date\(\)/);
  });

  it("keeps quick capture, note reads, task reads, and temporal establishment on their own paths", () => {
    const quick = readFileSync(new URL("../components/QuickCapture.tsx", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../components/CapturePanel.tsx", import.meta.url), "utf8");
    const frame = readFileSync(new URL("../components/AppFrame.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("../components/TaskLoop.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("../components/WorkSchedule.tsx", import.meta.url), "utf8");
    const notes = readFileSync(new URL("../persistence/note.ts", import.meta.url), "utf8");
    const taskStore = readFileSync(new URL("../persistence/contextsAndTasks.ts", import.meta.url), "utf8");
    const canvas = readFileSync(new URL("../components/canvasEstablishment.ts", import.meta.url), "utf8");
    const general = readFileSync(new URL("../components/GeneralCapture.tsx", import.meta.url), "utf8");
    const domain = readFileSync(new URL("./generalCapture.ts", import.meta.url), "utf8");

    expect(quick).toContain("useCapture");
    expect(quick).not.toContain("createNote");
    expect(quick).not.toContain("GeneralCapture");
    expect(panel).toContain("What needs doing?");
    expect(panel).not.toContain("Keep as a note");
    expect(frame).toContain("newTaskFromCapture");
    expect(frame).toContain("createTask");
    expect(frame).not.toContain("createNote");
    expect(tasks.indexOf("<QuickCapture")).toBeLessThan(tasks.indexOf("<GeneralCapture"));
    expect(schedule).toContain("<QuickCapture");
    expect(schedule).not.toContain("GeneralCapture");
    expect(notes).toContain("export async function loadNotes");
    expect(notes).toContain("readCompleteDateRows");
    expect(notes).not.toMatch(/\.update\(|\.delete\(|updateNote|deleteNote/);
    expect(taskStore).toContain("readCompleteCollection");
    expect(taskStore).toContain('.is("completed_at", null)');
    expect(taskStore).not.toContain("notes");
    expect(canvas).toContain("export function establishFromSelection");
    expect(canvas).not.toContain("generalCapture");
    expect(domain).not.toMatch(
      /SpeechRecognition|webkitSpeech|getUserMedia|localStorage|sessionStorage|confidence|note_id|source_note_id|loadNotes/,
    );
    expect(general).toContain("loadNotes");
    expect(general).toContain("Retained experiences");
    expect(general).toContain("Establish a task from this");
    expect(general).not.toMatch(/Convert|Promote|Turn into|Consume|Resolve/);
    expect(general).not.toMatch(
      /SpeechRecognition|webkitSpeech|getUserMedia|localStorage|sessionStorage|confidence|note_id|source_note_id|\.update\(|\.delete\(|updateNote|deleteNote|archiveNote|activeThread|\.sort\(|createProtectedTime|createBlock|createCommitment|updateTask/,
    );
    const nav = readFileSync(new URL("../components/BottomNav.tsx", import.meta.url), "utf8");
    expect(nav).not.toContain("Notes");
    expect(nav).not.toContain("loadNotes");
    expect(schedule).not.toContain("Retained experiences");
  });
});
