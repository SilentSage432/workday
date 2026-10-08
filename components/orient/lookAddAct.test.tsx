/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type { NewTask, Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import { ActSurface } from "@/components/orient/Surfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";
import { scheduledWorkDay } from "@/domain/workSchedule";

const createTaskMock = vi.hoisted(() =>
  vi.fn(async (_client: unknown, input: NewTask): Promise<Task> => ({
    id: `created-${input.title}`,
    title: input.title,
    contextId: input.contextId ?? null,
    createdAt: "2026-10-07T18:00:00.000Z",
    completedAt: null,
    dueOn: input.dueOn ?? null,
    plannedOn: input.plannedOn ?? null,
    plannedLocal: input.plannedLocal ?? null,
    mustDo: input.mustDo ?? false,
    origin: "user_created",
    originatingNoteId: null,
  })),
);

vi.mock("@/persistence/contextsAndTasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/persistence/contextsAndTasks")>();
  return {
    ...actual,
    createTask: createTaskMock,
  };
});

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({}),
}));

const ANCHOR = "2026-10-07";
const NOW = new Date("2026-10-07T15:30:00.000Z");

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

describe("LOOK · ADD · ACT phone grammar", () => {
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

  async function renderPhone(input?: {
    tasks?: SourceRead<Task>;
    thread?: ThreadReading;
    actions?: Partial<OrientActions>;
  }) {
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
          tasks={input?.tasks ?? ready([task({ id: "task-1", title: "Call the school", mustDo: true, plannedOn: ANCHOR })])}
          thread={input?.thread ?? { status: "ready", active: false, taskId: null, resumeTitle: null }}
          capture={captureBridge()}
          actions={actions(input?.actions)}
        />,
      );
    });
    return container!;
  }

  function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
    const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
    if (!found) throw new Error(`Missing button ${name}`);
    return found;
  }

  it("exposes LOOK / + / ACT as permanent phone peers without Capture Position Focus peers", async () => {
    const view = await renderPhone();
    expect(view.querySelector("[data-reach-grammar='look-add-act']")).not.toBeNull();
    expect(view.querySelector("[data-look-control]")?.textContent).toContain("LOOK");
    expect(view.querySelector("[data-add-control]")?.textContent).toContain("+");
    expect(view.querySelector("[data-act-control]")?.textContent).toContain("ACT");
    expect(view.querySelector("[data-capture-control]")).toBeNull();
    expect(view.querySelector("[data-focus-control]")).toBeNull();
    expect(view.querySelector("[data-position]")).toBeNull();
  });

  it("LOOK reaches Present Day Week Month and Position Focus", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-look-surface]")).not.toBeNull();
    expect(view.querySelector("[data-question-list]")).not.toBeNull();
    expect(view.querySelector("[data-relocation]")).not.toBeNull();
    expect(view.querySelector('[aria-label="Context focus"]')).not.toBeNull();
    expect(view.querySelector("[data-look-notes]")?.textContent).toBe("Notes");
    await act(async () => {
      buttonNamed(view.querySelector("[data-question-list]") as HTMLElement, "Present").click();
    });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
  });

  it("LOOK → Notes opens Notes inspection without changing ADD → Note", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-look-notes]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-notes-surface]")).not.toBeNull();
    expect(view.querySelector("[data-look-surface]")).toBeNull();
    expect(view.querySelector("[data-direct-note]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="note"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-note]")).not.toBeNull();
    expect(view.querySelector("[data-notes-surface]")).toBeNull();
  });

  it("ACT opens without ActiveThread and keeps secondary tasks quiet", async () => {
    const view = await renderPhone({
      tasks: ready([
        task({ id: "remain", title: "Remain", createdAt: "2026-10-02T00:00:00.000Z" }),
        task({ id: "must", title: "Must", mustDo: true, createdAt: "2026-10-03T00:00:00.000Z" }),
        task({ id: "plan", title: "Plan", plannedOn: ANCHOR, createdAt: "2026-10-01T00:00:00.000Z" }),
      ]),
    });
    expect(view.querySelector("[data-phone-thread]")?.textContent).toContain("No thread is established.");
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-section='must-do']")).not.toBeNull();
    expect(view.querySelector("[data-act-section='today']")).not.toBeNull();
    expect(view.querySelector("[data-act-section='stewardship']")).toBeNull();
    const primaryRows = [...view.querySelectorAll("[data-act-section='must-do'] [data-act-row], [data-act-section='today'] [data-act-row]")].map(
      (row) => row.getAttribute("data-act-row"),
    );
    expect(primaryRows).toEqual(["must", "plan"]);
    expect(view.querySelector("[data-act-other-open]")?.textContent?.trim()).toBe("1 more task");
    expect(view.querySelector("[data-act-section='other-open']")?.className).not.toContain("orient-action");
    expect(view.querySelector("[data-act-other-list]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-act-other-open]") as HTMLButtonElement).click();
    });
    expect(view.querySelector('[data-act-other-list] [data-act-row="remain"]')).not.toBeNull();
    expect(view.querySelector('[data-act-start="remain"]')).not.toBeNull();
    expect(view.querySelector('[data-act-select="remain"]')).not.toBeNull();
  });

  it("ACT inspect edits without Start and Complete offers Undo without restoring thread", async () => {
    const started: string[] = [];
    const completed: string[] = [];
    const reopened: string[] = [];
    const patches: { id: string; patch: unknown }[] = [];
    const view = await renderPhone({
      tasks: ready([
        task({ id: "task-1", title: "Call the school", contextId: "context-1", plannedOn: ANCHOR }),
      ]),
      actions: {
        onStartThread: async (taskId) => {
          started.push(taskId);
        },
        onCompleteTask: async (taskId) => {
          completed.push(taskId);
        },
        onReopenTask: async (taskId) => {
          reopened.push(taskId);
        },
        onUpdateTask: async (taskId, patch) => {
          patches.push({ id: taskId, patch });
        },
      },
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-act-select="task-1"]') as HTMLButtonElement).click();
    });
    expect(started).toEqual([]);
    expect(view.querySelector("[data-act-inspect]")).not.toBeNull();
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    function fill(selector: string, value: string) {
      const field = view.querySelector(selector) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await act(async () => {
      fill('[aria-label="Planned day"]', "2026-10-08");
      fill('[aria-label="Planned clock"]', "14:00");
      (view.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(patches).toHaveLength(1);
    expect(patches[0]?.id).toBe("task-1");
    expect(patches[0]?.patch).toMatchObject({ plannedOn: "2026-10-08", plannedLocal: "14:00", mustDo: true });
    expect(started).toEqual([]);

    await act(async () => {
      (view.querySelector("[data-complete-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(completed).toEqual(["task-1"]);
    expect(view.querySelector("[data-still-open]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-still-open]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(reopened).toEqual(["task-1"]);
    expect(started).toEqual([]);
  });

  it("Start from ACT establishes ActiveThread explicitly", async () => {
    const started: string[] = [];
    const view = await renderPhone({
      actions: {
        onStartThread: async (taskId) => {
          started.push(taskId);
        },
      },
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-act-start="task-1"]') as HTMLButtonElement).click();
    });
    expect(started).toEqual(["task-1"]);
  });

  it("direct Task checkbox completes on the same row with checked line-through Undo", async () => {
    const completed: string[] = [];
    const reopened: string[] = [];
    const view = await renderPhone({
      tasks: ready([task({ id: "task-1", title: "Call the school", mustDo: true })]),
      actions: {
        onCompleteTask: async (taskId) => {
          completed.push(taskId);
        },
        onReopenTask: async (taskId) => {
          reopened.push(taskId);
        },
      },
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-act-complete="task-1"]') as HTMLInputElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(completed).toEqual(["task-1"]);
    const acknowledged = view.querySelector('[data-act-row="task-1"][data-act-acknowledged="true"]');
    expect(acknowledged).not.toBeNull();
    expect((acknowledged?.querySelector("[data-act-acknowledged-check]") as HTMLInputElement).checked).toBe(true);
    expect(acknowledged?.querySelector(".orient-act-title-done")?.textContent).toBe("Call the school");
    expect(view.textContent).not.toContain("Marked complete.");
    expect(view.querySelector("[data-act-inspect]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-still-open]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(reopened).toEqual(["task-1"]);
  });

  it("Add Task entered from ACT returns to ACT after save and cancel", async () => {
    createTaskMock.mockClear();
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-act-add-task]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-create-task-return]")?.getAttribute("data-create-task-return")).toBe("act");
    expect(view.querySelector("[data-direct-task]")).not.toBeNull();
    await act(async () => {
      const field = view.querySelector('[aria-label="Task title"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "First");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (view.querySelector("[data-add-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(createTaskMock).toHaveBeenCalledTimes(1);
    expect(createTaskMock.mock.calls[0]?.[1]?.title).toBe("First");
    expect(view.querySelector("[data-act-surface]")).not.toBeNull();
    expect(view.querySelector("[data-direct-task]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-act-add-task]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-create-task-return]")?.getAttribute("data-create-task-return")).toBe("act");
    await act(async () => {
      const field = view.querySelector('[aria-label="Task title"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "Second");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (view.querySelector("[data-add-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(createTaskMock).toHaveBeenCalledTimes(2);
    expect(createTaskMock.mock.calls[1]?.[1]?.title).toBe("Second");
    expect(view.querySelector("[data-act-surface]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-act-add-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-surface]")).not.toBeNull();
    expect(view.querySelector("[data-direct-task]")).toBeNull();
  });

  it("ADD chooser Task creation does not force ACT return", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-create-task-return]")?.getAttribute("data-create-task-return")).toBe("none");
  });

  it("keeps Resume outside ACT and Task Detail reachable", async () => {
    const view = await renderPhone({
      tasks: ready([task({ id: "task-1", title: "Call the school", mustDo: true })]),
      thread: {
        status: "ready",
        active: true,
        taskId: "task-1",
        resumeTitle: "Call the school",
      },
    });
    expect(view.querySelector("[data-phone-thread]")?.textContent).toContain("Resume: Call the school");
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-surface]")?.textContent).not.toContain("Resume:");
    await act(async () => {
      (view.querySelector('[data-act-select="task-1"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-inspect]")).not.toBeNull();
    expect(view.querySelector("[data-task-detail]")).not.toBeNull();
  });

  it("ADD routes Task and Note to direct create and Time on the day to Exact", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    const chooser = view.querySelector("[data-add-chooser]");
    expect(chooser?.textContent).toContain("What are you adding?");
    expect(chooser?.textContent).toContain("All day");
    expect(chooser?.textContent).toContain("Time on the day");
    expect(chooser?.textContent).toContain("Stewardship");
    expect(chooser?.textContent).not.toMatch(/Destination|Priority|lowes_fiscal_week/i);
    await act(async () => {
      (view.querySelector('[data-add-choice="task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-task]")).not.toBeNull();
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
    expect(view.textContent).not.toMatch(/General capture|This is a task|Keep as a note/i);
    await act(async () => {
      (view.querySelector('[data-surface-close]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="stewardship"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-stewardship]")).not.toBeNull();
    expect(view.querySelector("[data-direct-task]")).toBeNull();
    expect(view.textContent).toContain("Each workday");
    expect(view.textContent).toContain("Each work week");
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="note"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-note]")).not.toBeNull();
    expect(view.textContent).not.toMatch(/This is a task|Keep as a note/i);
    await act(async () => {
      (view.querySelector('[data-surface-close]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="time-on-the-day"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("exact");
    expect(view.querySelector("[data-orientation-return]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="all-day"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-all-day-establishment]")).not.toBeNull();
    expect(view.querySelector("[data-all-day-establishment]")?.textContent).toMatch(/No clock times/i);
  });

  it("LOOK dismisses from header close without an inline Close row in semantic content", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    const look = view.querySelector("[data-look-surface]") as HTMLElement;
    expect(look.querySelector("[data-surface-close]")?.getAttribute("aria-label")).toBe("Close LOOK");
    expect(look.querySelector("[data-relocation]")?.textContent).not.toMatch(/\bClose\b/);
    expect(look.querySelector("[data-look-notes]")?.textContent).toBe("Notes");
    expect(look.querySelector("[data-look-operations]")?.textContent).toContain("Notes");
    expect(look.querySelector("[data-look-stewardship]")?.textContent).toContain("Stewardship");
    expect(look.querySelector("[data-look-operations]")?.textContent).toContain("Manage Work schedule");
    expect(look.querySelector("[data-look-operations]")?.textContent).toContain("Google Calendar");
    expect(look.querySelector("[data-manage-external-calendars]")).not.toBeNull();
    expect(look.querySelector("[data-look-operations]")?.textContent).toContain("Sign out");
    const closeButtons = [...look.querySelectorAll("button")].filter((item) => item.textContent?.trim() === "Close");
    expect(closeButtons).toHaveLength(0);
    await act(async () => {
      (look.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-look-surface]")).toBeNull();
  });

  it("keeps Exact time and composition thread on Present reading", async () => {
    const view = await renderPhone({
      thread: { status: "ready", active: true, taskId: "task-1", resumeTitle: "Call the school" },
    });
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      buttonNamed(view.querySelector("[data-question-list]") as HTMLElement, "Present").click();
    });
    expect(view.querySelector("[data-region='reach'] [data-exact-time]")).not.toBeNull();
    expect(view.querySelector("[data-phone-thread]")?.textContent).toContain("Resume: Call the school");
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("true");
    expect(view.querySelector("[data-region='around'] [data-phone-thread]")).not.toBeNull();
  });
});

describe("ActSurface acknowledgement", () => {
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

  it("does not Start when Undo succeeds after detail Complete", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const started: string[] = [];
    await act(async () => {
      root!.render(
        <ActSurface
          tasks={ready([task({ id: "task-1", title: "Call the school", mustDo: true })])}
          contexts={contexts()}
          work={ready([])}
          stewardshipDefinitions={ready([])}
          stewardshipRevisions={ready([])}
          stewardshipSatisfactions={ready([])}
          viewpointCivilDate={ANCHOR}
          now={NOW}
          timeZone="America/Denver"
          onStart={async (taskId) => {
            started.push(taskId);
          }}
          onComplete={async () => {}}
          onReopen={async () => {}}
          onUpdate={async () => {}}
          onSatisfyStewardship={async () => {}}
          onWithdrawStewardship={async () => {}}
          onEditStewardshipForward={async () => {}}
          onRetireStewardship={async () => {}}
          onAddTask={() => {}}
          onAddStewardship={() => {}}
          onClose={() => {}}
        />,
      );
    });
    await act(async () => {
      (host!.querySelector('[data-act-select="task-1"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (host!.querySelector("[data-complete-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(host!.querySelector('[data-act-row="task-1"][data-act-acknowledged="true"]')).not.toBeNull();
    await act(async () => {
      (host!.querySelector("[data-still-open]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(started).toEqual([]);
  });

  it("direct stewardship checkbox uses same checked crossed grammar and withdraw writer", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const satisfied: { definitionId: string; cycleKind: string; cycleKey: string }[] = [];
    const withdrawn: { definitionId: string; cycleKind: string; cycleKey: string }[] = [];
    const completed: string[] = [];
    const defId = "00000000-0000-4000-8000-000000000001";
    await act(async () => {
      root!.render(
        <ActSurface
          tasks={ready([])}
          contexts={contexts()}
          work={ready([
            scheduledWorkDay({
              workOn: ANCHOR,
              startLocal: "06:00",
              endLocal: "15:00",
              shiftType: "opening",
            }),
          ])}
          stewardshipDefinitions={ready([
            {
              id: defId,
              contextId: null,
              cycleKind: "workday",
              establishedAt: "2026-10-01T12:00:00.000Z",
              retiredAt: null,
            },
          ])}
          stewardshipRevisions={ready([
            {
              id: "00000000-0000-4000-8000-000000000010",
              definitionId: defId,
              content: "Review pipelines",
              effectiveAt: "2026-10-01T12:00:00.000Z",
            },
          ])}
          stewardshipSatisfactions={ready([])}
          viewpointCivilDate={ANCHOR}
          now={NOW}
          timeZone="America/Denver"
          onStart={async () => {}}
          onComplete={async (taskId) => {
            completed.push(taskId);
          }}
          onReopen={async () => {}}
          onUpdate={async () => {}}
          onSatisfyStewardship={async (input) => {
            satisfied.push(input);
          }}
          onWithdrawStewardship={async (input) => {
            withdrawn.push(input);
          }}
          onEditStewardshipForward={async () => {}}
          onRetireStewardship={async () => {}}
          onAddTask={() => {}}
          onAddStewardship={() => {}}
          onClose={() => {}}
        />,
      );
    });
    expect(host!.querySelector("[data-act-section='stewardship']")?.textContent).toContain("Review pipelines");
    expect(host!.querySelector("[data-act-section='stewardship']")?.textContent).toContain("Workday");
    await act(async () => {
      (host!.querySelector(`[data-act-satisfy="${defId}:workday:${ANCHOR}"]`) as HTMLInputElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(satisfied).toEqual([{ definitionId: defId, cycleKind: "workday", cycleKey: ANCHOR }]);
    expect(completed).toEqual([]);
    const acknowledged = host!.querySelector(`[data-act-row="${defId}:workday:${ANCHOR}"][data-act-acknowledged="true"]`);
    expect(acknowledged).not.toBeNull();
    expect((acknowledged?.querySelector("[data-act-acknowledged-check]") as HTMLInputElement).checked).toBe(true);
    expect(acknowledged?.querySelector(".orient-act-title-done")?.textContent).toBe("Review pipelines");
    expect(host!.textContent).not.toContain("Marked satisfied.");
    expect(host!.querySelector("[data-stewardship-withdraw]")).not.toBeNull();
    await act(async () => {
      (host!.querySelector("[data-stewardship-withdraw]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(withdrawn).toEqual([{ definitionId: defId, cycleKind: "workday", cycleKey: ANCHOR }]);
  });
});
