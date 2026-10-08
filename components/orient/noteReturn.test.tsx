/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type { Note } from "@/domain/note";
import type { NewTask, Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import { DirectNoteSurface, NotesSurface } from "@/components/orient/Surfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";

const ANCHOR = "2026-10-07";
const NOW = new Date("2026-10-07T15:30:00.000Z");
const EARLIER = "2026-10-05T12:00:00.000Z";
const LATER = "2026-10-06T12:00:00.000Z";
const NOTE_A = "00000000-0000-4000-8000-00000000000a";
const NOTE_B = "00000000-0000-4000-8000-00000000000b";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    contextId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    plannedLocal: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
    ...overrides,
  };
}

function note(id: string, content: string, capturedAt: string): Note {
  return { id, content, capturedAt };
}

function sources(): OrientSources {
  return {
    work: ready([]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
    ...EMPTY_EXTERNAL_ORIENT_SOURCES,
  };
}

function contexts(): SourceRead<Context> {
  return ready([{ id: "context-1", name: "Family", createdAt: "2026-10-01T00:00:00.000Z" }]);
}

function captureBridge(): CaptureBridge {
  return { session: readyCaptureSession(), update: () => {}, saving: false, saveError: null, submit: async () => null };
}

function actions(overrides: Partial<OrientActions> = {}): OrientActions {
  return {
    onEstablish: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
    onTasksChanged: () => {},
    onStartThread: async () => {},
    onLeaveThread: async () => {},
    onCompleteTask: async () => {},
    onSatisfyStewardship: async () => {},
    onWithdrawStewardship: async () => {},
    onEstablishStewardship: async () => {},
    onEditStewardshipForward: async () => {},
    onRetireStewardship: async () => {},
    onEstablishRecurringTask: async () => {},
    onUpdateRecurringTask: async () => {},
    onRetireRecurringTask: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onSignOut: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
    ...overrides,
  };
}

describe("NOTE-RETURN-001 LOOK → Notes", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let restoreMedia: (() => void) | null = null;

  beforeEach(() => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width: 959px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    restoreMedia = () => {
      window.matchMedia = original;
    };
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    restoreMedia?.();
    restoreMedia = null;
  });

  async function renderPhone() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <OrientView
          timeZone="UTC"
          now={NOW}
          anchor={ANCHOR}
          onAnchor={() => {}}
          loaded={experienceLoadWindow(ANCHOR)}
          sources={sources()}
          contexts={contexts()}
          tasks={ready([task({ id: "task-1", title: "Call the school" })])}
          thread={{ status: "ready", active: false, taskId: null, resumeTitle: null } satisfies ThreadReading}
          capture={captureBridge()}
          actions={actions()}
        />,
      );
    });
    return container!;
  }

  it("exposes Notes under phone LOOK operations without a permanent Notes bezel control", async () => {
    const view = await renderPhone();
    expect(view.querySelector("[data-look-notes]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-look-notes]")?.textContent).toBe("Notes");
    expect(view.querySelector("[data-reach-grammar='look-add-act']")).not.toBeNull();
    expect(view.querySelector("[data-look-control]")).not.toBeNull();
    expect(view.querySelector("[data-add-control]")).not.toBeNull();
    expect(view.querySelector("[data-act-control]")).not.toBeNull();
  });

  it("keeps ADD → Note on DirectNoteSurface", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="note"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-note]")).not.toBeNull();
    expect(view.querySelector("[data-notes-surface]")).toBeNull();
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
  });
});

describe("NotesSurface on-demand return", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  function fill(selector: string, value: string) {
    const field = host!.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function renderNotes(input: {
    readNotes: () => Promise<Note[]>;
    establishTask?: (input: NewTask) => Promise<Task>;
  }) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <NotesSurface
          readNotes={input.readNotes}
          establishTask={input.establishTask}
          onClose={() => {}}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    return host!;
  }

  it("loads retained Notes on open and shows a newly retained Note", async () => {
    const retained = note(NOTE_A, "aisle 12", EARLIER);
    const surface = await renderNotes({
      readNotes: async () => [retained],
    });
    expect(surface.querySelector("[data-notes-surface]")).not.toBeNull();
    expect(surface.querySelector("[data-notes-collection]")).not.toBeNull();
    expect(surface.textContent).toContain("aisle 12");
    expect(surface.querySelector("time")?.getAttribute("dateTime")).toBe(EARLIER);
  });

  it("preserves loadNotes order without re-sorting", async () => {
    const earlier = note(NOTE_A, "first retained", EARLIER);
    const later = note(NOTE_B, "second retained", LATER);
    const surface = await renderNotes({
      readNotes: async () => [later, earlier],
    });
    const articles = [...surface.querySelectorAll("[data-retained-note]")];
    expect(articles.map((item) => item.getAttribute("data-retained-note"))).toEqual([NOTE_B, NOTE_A]);
    expect(articles.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "second retained",
      "first retained",
    ]);
  });

  it("states emptiness only after a complete empty read", async () => {
    const surface = await renderNotes({
      readNotes: async () => [],
    });
    expect(surface.querySelector("[data-notes-empty]")?.textContent).toBe("No notes have been retained.");
    expect(surface.querySelector("[data-notes-collection]")).toBeNull();
  });

  it("does not render failure as an empty collection", async () => {
    const surface = await renderNotes({
      readNotes: async () => {
        throw new Error("A temporal read stopped before it was complete.");
      },
    });
    expect(surface.querySelector("[data-notes-failed]")?.textContent).toContain(
      "A temporal read stopped before it was complete.",
    );
    expect(surface.querySelector("[data-notes-empty]")).toBeNull();
    expect(surface.querySelector("[data-notes-collection]")).toBeNull();
    expect(surface.textContent).not.toContain("No notes have been retained.");
  });

  it("establishes a Task from a retained Note with originatingNoteId", async () => {
    const created: NewTask[] = [];
    const surface = await renderNotes({
      readNotes: async () => [note(NOTE_A, "aisle 12", EARLIER)],
      establishTask: async (input) => {
        created.push(input);
        return task({ id: "task-from-note", title: input.title, originatingNoteId: input.originatingNoteId ?? null });
      },
    });
    await act(async () => {
      const button = [...surface.querySelectorAll("button")].find(
        (item) => item.textContent === "Establish a task from this",
      );
      (button as HTMLButtonElement).click();
    });
    await act(async () => {
      fill('[aria-label="Task title from note"]', "Check aisle 12");
    });
    await act(async () => {
      const save = [...surface.querySelectorAll("button")].find((item) => item.textContent === "Save");
      (save as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      title: "Check aisle 12",
      originatingNoteId: NOTE_A,
    });
  });

  it("does not introduce edit or delete controls", async () => {
    const surface = await renderNotes({
      readNotes: async () => [note(NOTE_A, "aisle 12", EARLIER)],
    });
    expect(surface.textContent).not.toMatch(/\bEdit\b|\bDelete\b|\bArchive\b/i);
    expect(surface.querySelector("[data-edit-note]")).toBeNull();
    expect(surface.querySelector("[data-delete-note]")).toBeNull();
  });
});

describe("NOTE-RETURN-001 isolation and writers", () => {
  it("keeps DirectNoteSurface on createNote and does not open Notes inspection", async () => {
    const localHost = document.createElement("div");
    document.body.appendChild(localHost);
    const localRoot = createRoot(localHost);
    const created: Note[] = [];
    await act(async () => {
      localRoot.render(
        <DirectNoteSurface
          establish={async (input) => {
            const retained = {
              id: input.id,
              content: input.content,
              capturedAt: input.capturedAt.toISOString(),
            } satisfies Note;
            created.push(retained);
            return retained;
          }}
          onClose={() => {}}
        />,
      );
    });
    await act(async () => {
      const field = localHost.querySelector('[aria-label="Note content"]') as HTMLTextAreaElement;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(field, "remember receiving");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (localHost.querySelector("[data-add-note]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(created).toHaveLength(1);
    expect(created[0]?.content).toBe("remember receiving");
    expect(localHost.querySelector("[data-notes-surface]")).toBeNull();
    act(() => {
      localRoot.unmount();
    });
    localHost.remove();
  });

  it("does not load Notes into OrientInstrument or temporal projections", () => {
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    expect(instrument).not.toContain("loadNotes");
    expect(instrument).not.toContain('from("notes")');
    expect(instrument).not.toContain("persistence/note");

    const dayCanvas = readFileSync("projections/dayCanvas.ts", "utf8");
    const timeline = readFileSync("projections/timeline.ts", "utf8");
    const present = readFileSync("projections/presentMomentOrientation.ts", "utf8");
    const landscape = readFileSync("components/orient/Landscape.tsx", "utf8");
    const phone = readFileSync("components/orient/PhoneContinuity.tsx", "utf8");
    const desktop = readFileSync("components/orient/DesktopReading.tsx", "utf8");
    const surfaces = readFileSync("components/orient/Surfaces.tsx", "utf8");
    const view = readFileSync("components/orient/OrientView.tsx", "utf8");
    expect(dayCanvas).not.toMatch(/loadNotes|from\("notes"\)|type Note\b/);
    expect(timeline).not.toMatch(/loadNotes|from\("notes"\)/);
    expect(present).not.toMatch(/loadNotes|from\("notes"\)/);
    expect(landscape).not.toMatch(/loadNotes|NotesSurface|data-notes-surface/);
    expect(phone).not.toMatch(/loadNotes|NotesSurface|data-notes-surface/);
    expect(desktop).not.toMatch(/loadNotes|NotesSurface|data-notes-surface/);
    expect(view).toContain("NotesSurface");
    expect(view).not.toMatch(/loadNotes/);
    expect(surfaces).toContain("export function ActSurface");
    expect(surfaces).toContain("export function NotesSurface");
    const actStart = surfaces.indexOf("export function ActSurface");
    const actEnd = surfaces.indexOf("\nexport function ", actStart + 1);
    const actBlock = surfaces.slice(actStart, actEnd > actStart ? actEnd : undefined);
    expect(actBlock.startsWith("export function ActSurface")).toBe(true);
    expect(actBlock).not.toContain("loadNotes");
    expect(actBlock).not.toContain("data-notes-surface");
    expect(actBlock).not.toContain("RetainedNotesCollection");
  });

  it("does not add Note update or delete writers", () => {
    const persistence = readFileSync("persistence/note.ts", "utf8");
    expect(persistence).toContain("export async function loadNotes");
    expect(persistence).toContain("export async function createNote");
    expect(persistence).not.toMatch(/updateNote|deleteNote|\.update\(|\.delete\(/);
    const surfaces = readFileSync("components/orient/Surfaces.tsx", "utf8");
    expect(surfaces).not.toMatch(/updateNote|deleteNote/);
  });

  it("reaches retained Notes through LOOK on every form factor without Capture peer", () => {
    const view = readFileSync("components/orient/OrientView.tsx", "utf8");
    expect(view).toContain("data-look-control");
    expect(view).toContain("data-reach-grammar");
    expect(view).not.toContain("data-capture-control");
    expect(view).toContain("NotesSurface");
    expect(view).toContain('kind: "notes"');
    const surfaces = readFileSync("components/orient/Surfaces.tsx", "utf8");
    expect(surfaces).toContain("data-look-notes");
    expect(surfaces).toContain("RetainedNotesCollection");
  });
});
