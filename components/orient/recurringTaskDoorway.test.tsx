/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import { DirectRecurringTaskSurface } from "@/components/orient/RecurringTaskSurfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type { RecurringTaskDefinition, RecurringTaskWeekday } from "@/domain/recurringTask";
import type { Task } from "@/domain/task";
import { composeActAttention } from "@/components/orient/actAttention";

const ANCHOR = "2026-10-14";
const NOW = new Date("2026-10-14T15:30:00.000Z");
const ZONE = "America/Denver";
const DEF_ID = "00000000-0000-4000-8000-000000000001";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function contexts(): SourceRead<Context> {
  return ready([{ id: "context-1", name: "Work", createdAt: "2026-10-01T00:00:00.000Z" }]);
}

function sources(input?: {
  definitions?: readonly RecurringTaskDefinition[];
}): OrientSources {
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
    recurringTaskDefinitions: ready(input?.definitions ?? []),
  };
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
    onEstablishCommitmentPulseGrant: async () => {},
    onRevokeCommitmentPulseGrant: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onSignOut: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
    ...overrides,
  };
}

describe("recurring Task doorway", () => {
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
    sources?: OrientSources;
    actions?: Partial<OrientActions>;
    tasks?: SourceRead<Task>;
    thread?: ThreadReading;
  }) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <OrientView
          timeZone={ZONE}
          now={NOW}
          anchor={ANCHOR}
          onAnchor={() => {}}
          loaded={experienceLoadWindow(ANCHOR)}
          sources={input?.sources ?? sources()}
          contexts={contexts()}
          tasks={input?.tasks ?? ready([])}
          thread={input?.thread ?? { status: "ready", active: false, taskId: null, resumeTitle: null }}
          pulse={{ grants: { status: "ready", rows: [] }, occurrences: { status: "ready", rows: [] }, expressible: [] }}
          capture={captureBridge()}
          actions={actions(input?.actions)}
        />,
      );
    });
    return container!;
  }

  it("reaches Recurring Task from ADD and LOOK management", async () => {
    const view = await renderPhone({
      sources: sources({
        definitions: [
          {
            id: DEF_ID,
            title: "Complete bay audits",
            contextId: null,
            cycleKind: "lowes_fiscal_week",
            availableWeekday: "sat",
            dueWeekday: "wed",
            establishedAt: "2026-10-10T12:00:00.000Z",
            retiredAt: null,
          },
        ],
      }),
    });
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector('[data-add-choice="task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="recurring-task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="stewardship"]')).not.toBeNull();
    await act(async () => {
      (view.querySelector('[data-add-choice="recurring-task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-recurring-task]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-look-recurring-tasks]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-recurring-task-manage]")).not.toBeNull();
    expect(view.querySelector(`[data-recurring-task-manage-select="${DEF_ID}"]`)?.textContent).toContain(
      "Complete bay audits",
    );
    expect(view.querySelector("[data-act-section='recurring']")).toBeNull();
  });

  it("establishes weekly definition with human weekdays", async () => {
    const established: {
      title: string;
      availableWeekday: RecurringTaskWeekday;
      dueWeekday: RecurringTaskWeekday;
      contextId: string | null;
    }[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const localRoot = createRoot(host);
    await act(async () => {
      localRoot.render(
        <DirectRecurringTaskSurface
          contexts={contexts()}
          onEstablish={async (input) => {
            established.push(input);
          }}
          onClose={() => {}}
        />,
      );
    });
    await act(async () => {
      const field = host.querySelector('[aria-label="Recurring Task title"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        field,
        "Complete cycle counts",
      );
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      const available = host.querySelector('[aria-label="Available weekday"]') as HTMLSelectElement;
      available.value = "sun";
      available.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      const due = host.querySelector('[aria-label="Due weekday"]') as HTMLSelectElement;
      due.value = "wed";
      due.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      (host.querySelector("[data-establish-recurring-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(established).toEqual([
      {
        title: "Complete cycle counts",
        availableWeekday: "sun",
        dueWeekday: "wed",
        contextId: null,
      },
    ]);
    expect(host.textContent).toContain("Weekly");
    expect(host.textContent).not.toMatch(/RRULE|cron|lowes_fiscal_week/i);
    act(() => localRoot.unmount());
    host.remove();
  });

  it("keeps ACT composition free of a Recurring section while ordinary Tasks still compose", () => {
    const composition = composeActAttention({
      openTasks: [
        {
          id: "task-1",
          title: "Complete bay audits",
          contextId: null,
          createdAt: "2026-10-10T12:00:00.000Z",
          completedAt: null,
          dueOn: "2026-10-14",
          plannedOn: null,
          plannedLocal: null,
          mustDo: false,
          origin: "user_created",
          originatingNoteId: null,
        },
      ],
      viewpointCivilDate: ANCHOR,
      now: NOW,
      timeZone: ZONE,
      workEntries: [],
      definitions: [],
      revisions: [],
      satisfactions: [],
    });
    expect(composition.otherOpen.map((task) => task.title)).toEqual(["Complete bay audits"]);
    expect(composition).not.toHaveProperty("recurring");
  });
});
