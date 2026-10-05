/**
 * @vitest-environment happy-dom
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/domain/note";
import type { Task } from "@/domain/task";

const NOTE_ID = "00000000-0000-4000-8000-000000000001";
const NEXT_NOTE_ID = "00000000-0000-4000-8000-000000000002";
const ACTED_AT = new Date("2026-10-04T18:30:00.000Z");
const LATER_AT = new Date("2026-10-04T19:15:00.000Z");

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  createTask: vi.fn(),
  loadNotes: vi.fn(),
}));

vi.mock("@/persistence/note", () => ({
  createNote: (...args: unknown[]) => mocks.createNote(...args),
  loadNotes: (...args: unknown[]) => mocks.loadNotes(...args),
}));

vi.mock("@/persistence/contextsAndTasks", () => ({
  createTask: (...args: unknown[]) => mocks.createTask(...args),
}));

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({ kind: "browser" }),
}));

import { GeneralCapture } from "@/components/GeneralCapture";

function retainedNote(id: string, content: string, capturedAt: string): Note {
  return { id, content, capturedAt };
}

function noteItems(container: ParentNode): HTMLLIElement[] {
  return [...container.querySelectorAll("li")];
}

function createdTask(title: string): Task {
  return {
    id: "task-created",
    title,
    contextId: null,
    createdAt: "2026-10-04T18:30:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
  };
}

function setField(container: ParentNode, selector: string, value: string) {
  const field = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!field) throw new Error(`Missing ${selector}`);
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) throw new Error(`Cannot set ${selector}`);
  setter.call(field, value);
  act(() => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setExpression(container: ParentNode, value: string) {
  setField(container, "#general-expression", value);
}

async function clickText(container: ParentNode, label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${label}`);
  await act(async () => {
    button.click();
  });
}

describe("general capture surface", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = undefined;
    host = undefined;
    vi.resetAllMocks();
  });

  function render(ui: ReactNode) {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(ui);
    });
    if (!host) throw new Error("The surface was not rendered.");
    return host;
  }

  it("types and edits without a persistence write", async () => {
    const now = vi.fn(() => ACTED_AT);
    const surface = render(<GeneralCapture now={now} createNoteId={() => NOTE_ID} />);
    expect(surface.textContent).toContain("Hold an experience");
    expect(surface.querySelector("#general-expression")).toBeNull();
    expect(now).not.toHaveBeenCalled();

    await clickText(surface, "Hold an experience");
    expect(now).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();

    setExpression(surface, "aisle");
    setExpression(surface, "aisle 12");
    expect(surface.querySelector<HTMLTextAreaElement>("#general-expression")?.value).toBe("aisle 12");
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it("does not establish a blank expression", async () => {
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    const note = [...surface.querySelectorAll("button")].find((item) => item.textContent === "Keep as a note");
    const task = [...surface.querySelectorAll("button")].find((item) => item.textContent === "This is a task");
    expect(note).toBeInstanceOf(HTMLButtonElement);
    expect(task).toBeInstanceOf(HTMLButtonElement);
    expect((note as HTMLButtonElement).disabled).toBe(true);
    expect((task as HTMLButtonElement).disabled).toBe(true);

    setExpression(surface, " \n\t ");
    const blankNote = [...surface.querySelectorAll("button")].find((item) => item.textContent === "Keep as a note");
    const blankTask = [...surface.querySelectorAll("button")].find((item) => item.textContent === "This is a task");
    expect((blankNote as HTMLButtonElement).disabled).toBe(true);
    expect((blankTask as HTMLButtonElement).disabled).toBe(true);
    await clickText(surface, "Keep as a note");
    await clickText(surface, "This is a task");
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("establishes one note at the act instant and does not create a task", async () => {
    const now = vi.fn(() => ACTED_AT);
    const surface = render(<GeneralCapture now={now} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "  aisle 12  ");
    mocks.createNote.mockResolvedValue({
      id: NOTE_ID,
      content: "  aisle 12  ",
      capturedAt: ACTED_AT.toISOString(),
    });

    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("#general-expression")).toBeNull();
      });
    });

    expect(now).toHaveBeenCalledOnce();
    expect(mocks.createNote).toHaveBeenCalledTimes(1);
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.createNote.mock.calls[0]?.[1]).toEqual({
      id: NOTE_ID,
      content: "  aisle 12  ",
      capturedAt: ACTED_AT,
    });
    expect(surface.querySelector("#general-expression")).toBeNull();
    expect(surface.textContent).toContain("Hold an experience");
  });

  it("establishes one ordinary task and does not create a note", async () => {
    const onTaskCreated = vi.fn();
    const surface = render(
      <GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} onTaskCreated={onTaskCreated} />,
    );
    await clickText(surface, "Hold an experience");
    setExpression(surface, "Call the school");
    mocks.createTask.mockResolvedValue(createdTask("Call the school"));

    await clickText(surface, "This is a task");
    await act(async () => {
      await vi.waitFor(() => {
        expect(onTaskCreated).toHaveBeenCalledOnce();
      });
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask.mock.calls[0]?.[1]).toEqual({
      title: "Call the school",
      contextId: null,
      plannedOn: null,
      dueOn: null,
      mustDo: false,
    });
    expect(onTaskCreated).toHaveBeenCalledWith(createdTask("Call the school"));
    expect(surface.querySelector("#general-expression")).toBeNull();
  });

  it("leaves without establishing a fact", async () => {
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "aisle 12");
    await clickText(surface, "Leave");

    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(surface.querySelector("#general-expression")).toBeNull();
    await clickText(surface, "Hold an experience");
    expect(surface.querySelector<HTMLTextAreaElement>("#general-expression")?.value).toBe("");
  });

  it("keeps the same note identity when an unchanged write is retried", async () => {
    const now = vi.fn(() => ACTED_AT);
    const createNoteId = vi.fn(() => NOTE_ID);
    const surface = render(<GeneralCapture now={now} createNoteId={createNoteId} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "aisle 12");
    mocks.createNote.mockRejectedValueOnce(new Error("Could not keep this note."));

    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("Could not keep this note.");
      });
    });
    expect(surface.querySelector<HTMLTextAreaElement>("#general-expression")?.value).toBe("aisle 12");
    expect(mocks.createTask).not.toHaveBeenCalled();

    now.mockReturnValue(LATER_AT);
    createNoteId.mockReturnValue(NEXT_NOTE_ID);
    mocks.createNote.mockResolvedValueOnce({
      id: NOTE_ID,
      content: "aisle 12",
      capturedAt: ACTED_AT.toISOString(),
    });
    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("#general-expression")).toBeNull();
      });
    });

    expect(mocks.createNote).toHaveBeenCalledTimes(2);
    expect(mocks.createNote.mock.calls[0]?.[1]).toEqual(mocks.createNote.mock.calls[1]?.[1]);
    expect(mocks.createNote.mock.calls[1]?.[1]).toMatchObject({
      id: NOTE_ID,
      capturedAt: ACTED_AT,
      content: "aisle 12",
    });
    expect(createNoteId).toHaveBeenCalledOnce();
  });

  it("starts a new note attempt after the expression changes", async () => {
    const instants = [ACTED_AT, LATER_AT];
    let instantIndex = 0;
    const now = vi.fn(() => instants[instantIndex++] ?? LATER_AT);
    const ids = [NOTE_ID, NEXT_NOTE_ID];
    let idIndex = 0;
    const createNoteId = vi.fn(() => ids[idIndex++] ?? NEXT_NOTE_ID);
    const surface = render(<GeneralCapture now={now} createNoteId={createNoteId} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "aisle 12");
    mocks.createNote.mockRejectedValueOnce(new Error("Could not keep this note."));
    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("Could not keep this note.");
      });
    });

    setExpression(surface, "aisle 12 bay");
    mocks.createNote.mockResolvedValueOnce({
      id: NEXT_NOTE_ID,
      content: "aisle 12 bay",
      capturedAt: LATER_AT.toISOString(),
    });
    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(mocks.createNote).toHaveBeenCalledTimes(2);
      });
    });

    expect(mocks.createNote.mock.calls[1]?.[1]).toEqual({
      id: NEXT_NOTE_ID,
      content: "aisle 12 bay",
      capturedAt: LATER_AT,
    });
    expect(createNoteId).toHaveBeenCalledTimes(2);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it("does not create a note when task creation fails", async () => {
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "Call the school");
    mocks.createTask.mockRejectedValueOnce(new Error("Could not save this task."));

    await clickText(surface, "This is a task");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("Could not save this task.");
      });
    });

    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(surface.textContent).toContain("Could not save this task.");
    expect(surface.querySelector<HTMLTextAreaElement>("#general-expression")?.value).toBe("Call the school");
  });

  it("reaches retained experience only after capture is opened", async () => {
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    expect(surface.textContent).not.toContain("Retained experiences");
    expect(mocks.loadNotes).not.toHaveBeenCalled();

    await clickText(surface, "Hold an experience");
    expect(surface.textContent).toContain("Retained experiences");
    expect(mocks.loadNotes).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("shows every retained note in the returned order, with content and capture time only", async () => {
    const earlier = retainedNote(NOTE_ID, "  aisle 12  ", ACTED_AT.toISOString());
    const later = retainedNote(NEXT_NOTE_ID, "manager wants the display revisited", LATER_AT.toISOString());
    mocks.loadNotes.mockResolvedValue([earlier, later]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(noteItems(surface)).toHaveLength(2);
      });
    });

    const items = noteItems(surface);
    expect(items[0]?.textContent).toContain("  aisle 12  ");
    expect(items[0]?.querySelector("time")?.dateTime).toBe(ACTED_AT.toISOString());
    expect(items[0]?.querySelector("time")?.textContent).toBe(ACTED_AT.toISOString());
    expect(items[1]?.textContent).toContain("manager wants the display revisited");
    expect(items[1]?.querySelector("time")?.dateTime).toBe(LATER_AT.toISOString());
    expect(items.map((item) => item.querySelector("time")?.dateTime)).toEqual([
      ACTED_AT.toISOString(),
      LATER_AT.toISOString(),
    ]);
    expect(items[0]?.textContent).not.toMatch(/Context|title|tag|folder|important|summary|action/i);
    expect(surface.textContent).not.toContain("No notes have been retained.");
    expect(mocks.loadNotes).toHaveBeenCalledTimes(1);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("keeps the order loadNotes returned instead of sorting it", async () => {
    const earlier = retainedNote(NOTE_ID, "first retained", ACTED_AT.toISOString());
    const later = retainedNote(NEXT_NOTE_ID, "second retained", LATER_AT.toISOString());
    mocks.loadNotes.mockResolvedValue([later, earlier]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(noteItems(surface)).toHaveLength(2);
      });
    });

    expect(noteItems(surface).map((item) => item.querySelector("time")?.dateTime)).toEqual([
      LATER_AT.toISOString(),
      ACTED_AT.toISOString(),
    ]);
  });

  it("says that no notes have been retained only after a complete empty read", async () => {
    mocks.loadNotes.mockResolvedValue([]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("No notes have been retained.");
      });
    });

    expect(noteItems(surface)).toHaveLength(0);
    expect(surface.querySelector("[role='alert']")).toBeNull();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("does not treat a failed note read as an empty collection", async () => {
    mocks.loadNotes.mockRejectedValue(new Error("A temporal read stopped before it was complete."));
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("[role='alert']")?.textContent).toContain(
          "A temporal read stopped before it was complete.",
        );
      });
    });

    expect(surface.textContent).not.toContain("No notes have been retained.");
    expect(surface.textContent).not.toMatch(/no notes|no retained experiences/i);
    expect(noteItems(surface)).toHaveLength(0);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("revisits without writing a note, a task, or another fact", async () => {
    mocks.loadNotes.mockResolvedValue([
      retainedNote(NOTE_ID, "aisle 12", ACTED_AT.toISOString()),
    ]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("aisle 12");
      });
    });

    const source = document.body.textContent ?? "";
    expect(source).toContain("Establish a task from this");
    expect(source).not.toMatch(/Edit|Delete|Archive|Convert|Promote|Turn into|Resolve|Consume/);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.loadNotes).toHaveBeenCalledTimes(1);
  });

  it("shows a newly retained note on the next complete revisit", async () => {
    const kept = retainedNote(NOTE_ID, "aisle 12", ACTED_AT.toISOString());
    mocks.createNote.mockResolvedValue(kept);
    mocks.loadNotes.mockResolvedValue([kept]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    setExpression(surface, "aisle 12");
    await clickText(surface, "Keep as a note");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("#general-expression")).toBeNull();
      });
    });
    expect(mocks.loadNotes).not.toHaveBeenCalled();

    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("aisle 12");
      });
    });

    expect(mocks.createNote).toHaveBeenCalledTimes(1);
    expect(mocks.loadNotes).toHaveBeenCalledTimes(1);
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(surface.querySelector("time")?.dateTime).toBe(ACTED_AT.toISOString());
  });

  async function openRetained(content = "Reminder to check the department") {
    mocks.loadNotes.mockResolvedValue([retainedNote(NOTE_ID, content, ACTED_AT.toISOString())]);
    const surface = render(<GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} />);
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain(content);
      });
    });
    return surface;
  }

  it("refers to a retained note without writing", async () => {
    const surface = await openRetained();
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(surface.querySelector("#sourced-task-title")).toBeNull();
  });

  it("opens sourced task establishment without writing or copying the note", async () => {
    const surface = await openRetained("Reminder to check the department");
    await clickText(surface, "Establish a task from this");
    expect(surface.querySelector<HTMLInputElement>("#sourced-task-title")?.value).toBe("");
    expect(surface.textContent).toContain("Reminder to check the department");
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();
  });

  it("leaves a sourced task unestablished", async () => {
    const surface = await openRetained();
    await clickText(surface, "Establish a task from this");
    setField(surface, "#sourced-task-title", "Check the department");
    await clickText(surface, "Leave this");
    expect(surface.querySelector("#sourced-task-title")).toBeNull();
    expect(surface.textContent).toContain("Reminder to check the department");
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();

    await clickText(surface, "Establish a task from this");
    setField(surface, "#sourced-task-title", "Check the department");
    await clickText(surface, "Leave");
    expect(mocks.createTask).not.toHaveBeenCalled();
    expect(surface.querySelector("#general-expression")).toBeNull();
  });

  it("establishes a sourced task from the human title and one note", async () => {
    const onTaskCreated = vi.fn();
    mocks.loadNotes.mockResolvedValue([
      retainedNote(NOTE_ID, "Reminder to check the department", ACTED_AT.toISOString()),
    ]);
    const surface = render(
      <GeneralCapture now={() => ACTED_AT} createNoteId={() => NOTE_ID} onTaskCreated={onTaskCreated} />,
    );
    await clickText(surface, "Hold an experience");
    await clickText(surface, "Retained experiences");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("Reminder to check the department");
      });
    });
    await clickText(surface, "Establish a task from this");
    setField(surface, "#sourced-task-title", "  Check the department  ");
    mocks.createTask.mockResolvedValue(createdTask("Check the department"));

    await clickText(surface, "Establish this task");
    await act(async () => {
      await vi.waitFor(() => {
        expect(onTaskCreated).toHaveBeenCalledOnce();
      });
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.createTask.mock.calls[0]?.[1]).toEqual({
      title: "Check the department",
      contextId: null,
      plannedOn: null,
      dueOn: null,
      mustDo: false,
      originatingNoteId: NOTE_ID,
    });
    expect(mocks.createTask.mock.calls[0]?.[1].title).not.toBe("Reminder to check the department");
  });

  it("does not report a failed sourced task as established", async () => {
    const surface = await openRetained("Reminder to check the department");
    await clickText(surface, "Establish a task from this");
    setField(surface, "#sourced-task-title", "Check the department");
    mocks.createTask.mockRejectedValueOnce(new Error("Could not save this task."));

    await clickText(surface, "Establish this task");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("[role='alert']")?.textContent).toContain("Could not save this task.");
      });
    });

    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(surface.textContent).toContain("Reminder to check the department");
    expect(surface.querySelector<HTMLInputElement>("#sourced-task-title")?.value).toBe("Check the department");
    expect(surface.querySelector("#general-expression")).not.toBeNull();
  });
});
