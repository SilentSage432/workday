/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import { ActSurface } from "@/components/orient/Surfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";

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
    await act(async () => {
      buttonNamed(view.querySelector("[data-question-list]") as HTMLElement, "Present").click();
    });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
  });

  it("ACT opens without ActiveThread and lists ordered open Tasks", async () => {
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
    const rows = [...view.querySelectorAll("[data-act-row]")].map((row) => row.getAttribute("data-act-row"));
    expect(rows).toEqual(["must", "plan", "remain"]);
  });

  it("ACT inspect edits without Start and Complete offers Still open without restoring thread", async () => {
    const started: string[] = [];
    const completed: string[] = [];
    const reopened: string[] = [];
    const patches: { id: string; patch: unknown }[] = [];
    const view = await renderPhone({
      tasks: ready([task({ id: "task-1", title: "Call the school", contextId: "context-1" })]),
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

  it("ADD routes Task and Note to Capture and Time on the day to Exact", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    const chooser = view.querySelector("[data-add-chooser]");
    expect(chooser?.textContent).toContain("What are you adding?");
    expect(chooser?.textContent).not.toMatch(/all-?day/i);
    expect(chooser?.textContent).not.toMatch(/Destination|Priority/i);
    await act(async () => {
      (view.querySelector('[data-add-choice="task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-capture-surface]")).not.toBeNull();
    await act(async () => {
      buttonNamed(view, "Close capture").click();
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector('[data-add-choice="time-on-the-day"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("exact");
    expect(view.querySelector("[data-orientation-return]")).not.toBeNull();
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

describe("ActSurface Still open", () => {
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

  it("does not Start when Still open succeeds", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const started: string[] = [];
    await act(async () => {
      root!.render(
        <ActSurface
          tasks={ready([task({ id: "task-1", title: "Call the school" })])}
          contexts={contexts()}
          viewpointCivilDate={ANCHOR}
          onStart={async (taskId) => {
            started.push(taskId);
          }}
          onComplete={async () => {}}
          onReopen={async () => {}}
          onUpdate={async () => {}}
          onAddTask={() => {}}
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
    await act(async () => {
      (host!.querySelector("[data-still-open]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(started).toEqual([]);
  });
});
