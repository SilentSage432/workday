/**
 * @vitest-environment happy-dom
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/domain/task";

const NOTE_ID = "00000000-0000-4000-8000-000000000001";
const NEXT_NOTE_ID = "00000000-0000-4000-8000-000000000002";
const ACTED_AT = new Date("2026-10-04T18:30:00.000Z");
const LATER_AT = new Date("2026-10-04T19:15:00.000Z");

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  createTask: vi.fn(),
}));

vi.mock("@/persistence/note", () => ({
  createNote: (...args: unknown[]) => mocks.createNote(...args),
}));

vi.mock("@/persistence/contextsAndTasks", () => ({
  createTask: (...args: unknown[]) => mocks.createTask(...args),
}));

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({ kind: "browser" }),
}));

import { GeneralCapture } from "@/components/GeneralCapture";

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
  };
}

function setExpression(container: ParentNode, value: string) {
  const field = container.querySelector<HTMLTextAreaElement>("#general-expression");
  if (!field) throw new Error("Missing expression");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) throw new Error("Cannot set expression");
  setter.call(field, value);
  act(() => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
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
});
