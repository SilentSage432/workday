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
import {
  DirectStewardshipSurface,
  StewardshipManageSurface,
} from "@/components/orient/Surfaces";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type {
  StewardshipCycleKind,
  StewardshipDefinition,
  StewardshipDefinitionRevision,
  StewardshipSatisfaction,
} from "@/domain/stewardship";
import type { Task } from "@/domain/task";
import { scheduledWorkDay, offWorkDay } from "@/domain/workSchedule";
import { composeActAttention } from "@/components/orient/actAttention";

const ANCHOR = "2026-10-07";
const NOW = new Date("2026-10-07T15:30:00.000Z");
const ZONE = "America/Denver";
const DEF_ID = "00000000-0000-4000-8000-000000000001";
const REV_ID = "00000000-0000-4000-8000-000000000010";

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

function contexts(): SourceRead<Context> {
  return ready([{ id: "context-1", name: "Family", createdAt: "2026-10-01T00:00:00.000Z" }]);
}

function sources(input?: {
  work?: OrientSources["work"];
  definitions?: readonly StewardshipDefinition[];
  revisions?: readonly StewardshipDefinitionRevision[];
  satisfactions?: readonly StewardshipSatisfaction[];
}): OrientSources {
  return {
    work: input?.work ?? ready([]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
    ...EMPTY_EXTERNAL_ORIENT_SOURCES,
    stewardshipDefinitions: ready(input?.definitions ?? []),
    stewardshipRevisions: ready(input?.revisions ?? []),
    stewardshipSatisfactions: ready(input?.satisfactions ?? []),
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
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onSignOut: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
    ...overrides,
  };
}

describe("stewardship doorway", () => {
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
    sources?: OrientSources;
    actions?: Partial<OrientActions>;
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
          tasks={input?.tasks ?? ready([task({ id: "task-1", title: "Call the school", mustDo: true })])}
          thread={input?.thread ?? { status: "ready", active: false, taskId: null, resumeTitle: null }}
          capture={captureBridge()}
          actions={actions(input?.actions)}
        />,
      );
    });
    return container!;
  }

  it("keeps Task doorway direct and reaches Stewardship from ADD and ACT", async () => {
    const view = await renderPhone();
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector('[data-add-choice="task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="stewardship"]')).not.toBeNull();
    await act(async () => {
      (view.querySelector('[data-add-choice="task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-task]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-add-task]")).not.toBeNull();
    expect(view.querySelector("[data-act-add-stewardship]")?.textContent).toContain("Stewardship");
    await act(async () => {
      (view.querySelector("[data-act-add-stewardship]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-create-stewardship-return]")?.getAttribute("data-create-stewardship-return")).toBe(
      "act",
    );
    expect(view.querySelector("[data-direct-stewardship]")).not.toBeNull();
  });

  it("selects Each workday by default with pressed selected-state semantics", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const localRoot = createRoot(host);
    await act(async () => {
      localRoot.render(
        <DirectStewardshipSurface contexts={contexts()} onEstablish={async () => {}} onClose={() => {}} />,
      );
    });
    const workday = host.querySelector(
      '[data-stewardship-cycle-choice="workday"]',
    ) as HTMLButtonElement;
    const week = host.querySelector(
      '[data-stewardship-cycle-choice="lowes_fiscal_week"]',
    ) as HTMLButtonElement;
    expect(workday.getAttribute("aria-pressed")).toBe("true");
    expect(week.getAttribute("aria-pressed")).toBe("false");
    expect(workday.matches('[aria-pressed="true"]')).toBe(true);
    expect(week.matches('[aria-pressed="true"]')).toBe(false);
    act(() => localRoot.unmount());
    host.remove();
  });

  it("moves cycle selected-state from Each workday to Each work week", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const localRoot = createRoot(host);
    await act(async () => {
      localRoot.render(
        <DirectStewardshipSurface contexts={contexts()} onEstablish={async () => {}} onClose={() => {}} />,
      );
    });
    const workday = () =>
      host.querySelector('[data-stewardship-cycle-choice="workday"]') as HTMLButtonElement;
    const week = () =>
      host.querySelector('[data-stewardship-cycle-choice="lowes_fiscal_week"]') as HTMLButtonElement;
    await act(async () => {
      week().click();
    });
    expect(workday().getAttribute("aria-pressed")).toBe("false");
    expect(week().getAttribute("aria-pressed")).toBe("true");
    expect(workday().matches('[aria-pressed="true"]')).toBe(false);
    expect(week().matches('[aria-pressed="true"]')).toBe(true);
    await act(async () => {
      workday().click();
    });
    expect(workday().getAttribute("aria-pressed")).toBe("true");
    expect(week().getAttribute("aria-pressed")).toBe("false");
    act(() => localRoot.unmount());
    host.remove();
  });

  it("establishes through existing writer with human cycle mapping and optional Context", async () => {
    const established: {
      content: string;
      cycleKind: StewardshipCycleKind;
      contextId: string | null;
    }[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const localRoot = createRoot(host);
    await act(async () => {
      localRoot.render(
        <DirectStewardshipSurface
          contexts={contexts()}
          onEstablish={async (input) => {
            established.push(input);
          }}
          onClose={() => {}}
        />,
      );
    });
    expect(host.querySelector("[data-establish-stewardship]")?.hasAttribute("disabled")).toBe(true);
    const workdayChoice = host.querySelector(
      '[data-stewardship-cycle-choice="workday"]',
    ) as HTMLButtonElement;
    expect(workdayChoice.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      const field = host.querySelector('[aria-label="Stewardship wording"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "Review pipelines");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (host.querySelector('[data-stewardship-cycle-choice="lowes_fiscal_week"]') as HTMLButtonElement).click();
    });
    expect(
      (host.querySelector('[data-stewardship-cycle-choice="workday"]') as HTMLButtonElement).getAttribute(
        "aria-pressed",
      ),
    ).toBe("false");
    expect(
      (
        host.querySelector('[data-stewardship-cycle-choice="lowes_fiscal_week"]') as HTMLButtonElement
      ).getAttribute("aria-pressed"),
    ).toBe("true");
    await act(async () => {
      const select = host.querySelector('[aria-label="Stewardship context"]') as HTMLSelectElement;
      select.value = "context-1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      (host.querySelector("[data-establish-stewardship]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(established).toEqual([
      {
        content: "Review pipelines",
        cycleKind: "lowes_fiscal_week",
        contextId: "context-1",
      },
    ]);
    expect(host.textContent).not.toMatch(/Business|Inventory|People|Environment|RRULE|cron/i);
    act(() => localRoot.unmount());
    host.remove();

    const workdayEstablished: StewardshipCycleKind[] = [];
    const host2 = document.createElement("div");
    document.body.appendChild(host2);
    const root2 = createRoot(host2);
    await act(async () => {
      root2.render(
        <DirectStewardshipSurface
          contexts={contexts()}
          onEstablish={async (input) => {
            workdayEstablished.push(input.cycleKind);
          }}
          onClose={() => {}}
        />,
      );
    });
    await act(async () => {
      const field = host2.querySelector('[aria-label="Stewardship wording"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "Close the store");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(
      (host2.querySelector('[data-stewardship-cycle-choice="workday"]') as HTMLButtonElement).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    await act(async () => {
      (host2.querySelector("[data-establish-stewardship]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(workdayEstablished).toEqual(["workday"]);
    act(() => root2.unmount());
    host2.remove();
  });

  it("returns to ACT after ACT-origin establish and projects only when Work admits", async () => {
    const established: string[] = [];
    const view = await renderPhone({
      sources: sources({
        work: ready([
          scheduledWorkDay({
            workOn: ANCHOR,
            startLocal: "06:00",
            endLocal: "15:00",
            shiftType: "opening",
          }),
        ]),
      }),
      actions: {
        onEstablishStewardship: async (input) => {
          established.push(input.content);
        },
      },
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-act-add-stewardship]") as HTMLButtonElement).click();
    });
    await act(async () => {
      const field = view.querySelector('[aria-label="Stewardship wording"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "Review pipelines");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (view.querySelector("[data-establish-stewardship]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(established).toEqual(["Review pipelines"]);
    expect(view.querySelector("[data-act-surface]")).not.toBeNull();
    expect(view.querySelector("[data-direct-stewardship]")).toBeNull();

    const scheduled = composeActAttention({
      openTasks: [],
      viewpointCivilDate: ANCHOR,
      now: NOW,
      timeZone: ZONE,
      workEntries: [
        scheduledWorkDay({
          workOn: ANCHOR,
          startLocal: "06:00",
          endLocal: "15:00",
          shiftType: "opening",
        }),
      ],
      definitions: [
        {
          id: DEF_ID,
          cycleKind: "workday",
          contextId: null,
          establishedAt: "2026-10-07T12:00:00.000Z",
          retiredAt: null,
        },
      ],
      revisions: [
        {
          id: REV_ID,
          definitionId: DEF_ID,
          content: "Review pipelines",
          effectiveAt: "2026-10-07T12:00:00.000Z",
        },
      ],
      satisfactions: [],
    });
    expect(scheduled.stewardship.map((row) => row.wording)).toEqual(["Review pipelines"]);

    const definition = {
      id: DEF_ID,
      cycleKind: "workday" as const,
      contextId: null,
      establishedAt: "2026-10-07T12:00:00.000Z",
      retiredAt: null,
    };
    const revision = {
      id: REV_ID,
      definitionId: DEF_ID,
      content: "Review pipelines",
      effectiveAt: "2026-10-07T12:00:00.000Z",
    };
    expect(
      composeActAttention({
        openTasks: [],
        viewpointCivilDate: ANCHOR,
        now: NOW,
        timeZone: ZONE,
        workEntries: [offWorkDay(ANCHOR)],
        definitions: [definition],
        revisions: [revision],
        satisfactions: [],
      }).stewardship,
    ).toEqual([]);
    expect(
      composeActAttention({
        openTasks: [],
        viewpointCivilDate: ANCHOR,
        now: NOW,
        timeZone: ZONE,
        workEntries: [],
        definitions: [definition],
        revisions: [revision],
        satisfactions: [],
      }).stewardship,
    ).toEqual([]);
    expect(
      composeActAttention({
        openTasks: [],
        viewpointCivilDate: ANCHOR,
        now: NOW,
        timeZone: ZONE,
        workEntries: [
          scheduledWorkDay({
            workOn: ANCHOR,
            startLocal: "06:00",
            endLocal: "15:00",
            shiftType: "opening",
          }),
        ],
        definitions: [{ ...definition, cycleKind: "lowes_fiscal_week" }],
        revisions: [{ ...revision, content: "Walk Zone A" }],
        satisfactions: [],
      }).stewardship.map((row) => row.cycleLabel),
    ).toEqual(["This week"]);
  });

  it("inspects stewardship with human cycle language and edits/retires through writers", async () => {
    const edited: { definitionId: string; content: string }[] = [];
    const retired: string[] = [];
    const definition: StewardshipDefinition = {
      id: DEF_ID,
      cycleKind: "workday",
      contextId: "context-1",
      establishedAt: "2026-10-07T12:00:00.000Z",
      retiredAt: null,
    };
    const revision: StewardshipDefinitionRevision = {
      id: REV_ID,
      definitionId: DEF_ID,
      content: "Review pipelines",
      effectiveAt: "2026-10-07T12:00:00.000Z",
    };
    const view = await renderPhone({
      sources: sources({
        work: ready([
          scheduledWorkDay({
            workOn: ANCHOR,
            startLocal: "06:00",
            endLocal: "15:00",
            shiftType: "opening",
          }),
        ]),
        definitions: [definition],
        revisions: [revision],
      }),
      actions: {
        onEditStewardshipForward: async (input) => {
          edited.push(input);
        },
        onRetireStewardship: async (definitionId) => {
          retired.push(definitionId);
        },
      },
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-section='stewardship']")?.textContent).toContain("Review pipelines");
    await act(async () => {
      (view.querySelector(`[data-act-stewardship-select="${DEF_ID}:workday:${ANCHOR}"]`) as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-stewardship-inspect]")).not.toBeNull();
    expect(view.querySelector("[data-stewardship-detail-cycle]")?.textContent).toContain("Each workday");
    expect(view.querySelector("[data-stewardship-detail-context]")?.textContent).toContain("Family");
    expect(view.querySelector("[data-stewardship-detail-occurrence]")?.textContent).toContain("Not yet this cycle");
    await act(async () => {
      (view.querySelector("[data-stewardship-edit]") as HTMLButtonElement).click();
    });
    await act(async () => {
      const field = view.querySelector('[aria-label="Stewardship wording"]') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, "Review specialty pipelines");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      (view.querySelector("[data-stewardship-save-edit]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(edited).toEqual([{ definitionId: DEF_ID, content: "Review specialty pipelines" }]);
    await act(async () => {
      (view.querySelector("[data-stewardship-retire]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(retired).toEqual([DEF_ID]);
  });

  it("keeps non-admitted and satisfied definitions reachable from LOOK Stewardship manage", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const localRoot = createRoot(host);
    const opened: string[] = [];
    const defs: StewardshipDefinition[] = [
      {
        id: DEF_ID,
        cycleKind: "workday",
        contextId: null,
        establishedAt: "2026-10-01T12:00:00.000Z",
        retiredAt: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        cycleKind: "lowes_fiscal_week",
        contextId: null,
        establishedAt: "2026-10-01T12:00:00.000Z",
        retiredAt: null,
      },
    ];
    await act(async () => {
      localRoot.render(
        <StewardshipManageSurface
          definitions={ready(defs)}
          revisions={ready([
            {
              id: REV_ID,
              definitionId: DEF_ID,
              content: "Review pipelines",
              effectiveAt: "2026-10-01T12:00:00.000Z",
            },
            {
              id: "00000000-0000-4000-8000-000000000011",
              definitionId: "00000000-0000-4000-8000-000000000002",
              content: "Walk Zone A",
              effectiveAt: "2026-10-01T12:00:00.000Z",
            },
          ])}
          contexts={contexts()}
          onEstablish={() => {}}
          onOpen={(definitionId) => {
            opened.push(definitionId);
          }}
          onClose={() => {}}
        />,
      );
    });
    expect(host.querySelector("[data-stewardship-manage-list]")?.textContent).toContain("Review pipelines");
    expect(host.querySelector("[data-stewardship-manage-list]")?.textContent).toContain("Walk Zone A");
    expect(host.querySelector("[data-stewardship-manage-list]")?.textContent).toContain("Each workday");
    expect(host.querySelector("[data-stewardship-manage-list]")?.textContent).toContain("Each work week");
    await act(async () => {
      (host.querySelector(`[data-stewardship-manage-select="${DEF_ID}"]`) as HTMLButtonElement).click();
    });
    expect(opened).toEqual([DEF_ID]);

    const view = await renderPhone({
      sources: sources({
        work: ready([offWorkDay(ANCHOR)]),
        definitions: defs,
        revisions: [
          {
            id: REV_ID,
            definitionId: DEF_ID,
            content: "Review pipelines",
            effectiveAt: "2026-10-01T12:00:00.000Z",
          },
        ],
        satisfactions: [
          {
            definitionId: "00000000-0000-4000-8000-000000000002",
            cycleKind: "lowes_fiscal_week",
            cycleKey: "2026-10-03",
            satisfiedAt: "2026-10-07T12:00:00.000Z",
          },
        ],
      }),
    });
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-section='stewardship']")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-surface-close]") as HTMLButtonElement | null)?.click();
    });
    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-look-stewardship]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-stewardship-manage]")).not.toBeNull();
    expect(view.querySelector(`[data-stewardship-manage-select="${DEF_ID}"]`)).not.toBeNull();
    expect(
      view.querySelector('[data-stewardship-manage-select="00000000-0000-4000-8000-000000000002"]'),
    ).not.toBeNull();
    act(() => localRoot.unmount());
    host.remove();
  });
});
