/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import {
  FORM_FACTOR_CAPABILITIES,
  parityRequiredCapabilities,
  specializedCapabilities,
} from "@/components/orient/formFactorCapabilities";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";

const ANCHOR = "2026-10-07";
const NOW = new Date("2026-10-07T15:30:00.000Z");

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
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

function actions(): OrientActions {
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
    onEstablishBlockPulseGrant: async () => {},
    onRevokeBlockPulseGrant: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onSignOut: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
  };
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

describe("cross-form-factor capability registry", () => {
  it("declares desktop Week DTM as the only specialized capability", () => {
    const specialized = specializedCapabilities();
    expect(specialized.map((item) => item.id)).toEqual(["desktop-week-dtm"]);
    expect(specialized[0]?.specialization?.form).toBe("desktop");
    expect(parityRequiredCapabilities().every((item) => item.specialization === undefined)).toBe(true);
    expect(FORM_FACTOR_CAPABILITIES.length).toBeGreaterThanOrEqual(14);
  });
});

describe("cross-form-factor semantic parity", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let restoreMedia: (() => void) | null = null;

  function setForm(phone: boolean) {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: phone ? query.includes("max-width: 959px") : query.includes("min-width: 960px") || query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    // Prefer explicit max-width false for desktop:
    if (!phone) {
      window.matchMedia = ((query: string) => ({
        matches: query.includes("max-width: 959px") ? false : query.includes("prefers-reduced-motion") ? false : true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
    }
    restoreMedia = () => {
      window.matchMedia = original;
    };
  }

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

  async function renderForm(phone: boolean) {
    setForm(phone);
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
          tasks={ready([task({ id: "task-1", title: "Call the school", mustDo: true, plannedOn: ANCHOR })])}
          thread={{ status: "ready", active: false, taskId: null, resumeTitle: null } satisfies ThreadReading}
          pulse={{ grants: { status: "ready", rows: [] }, occurrences: { status: "ready", rows: [] }, expressible: [] }}
          capture={captureBridge()}
          actions={actions()}
        />,
      );
    });
    return container!;
  }

  async function openLook(view: HTMLElement) {
    const control = view.querySelector("[data-look-control]") as HTMLButtonElement;
    if (control.getAttribute("aria-expanded") !== "true") {
      await act(async () => {
        control.click();
      });
    }
  }

  async function openAdd(view: HTMLElement) {
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
  }

  for (const form of [true, false] as const) {
    const label = form ? "phone" : "desktop";

    it(`${label} exposes standing LOOK · ADD · ACT without Capture Position Focus peers`, async () => {
      const view = await renderForm(form);
      expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe(label);
      expect(view.querySelector("[data-reach-grammar='look-add-act']")).not.toBeNull();
      expect(view.querySelector("[data-look-control]")).not.toBeNull();
      expect(view.querySelector("[data-add-control]")).not.toBeNull();
      expect(view.querySelector("[data-act-control]")).not.toBeNull();
      expect(view.querySelector("[data-capture-control]")).toBeNull();
      expect(view.querySelector("[data-focus-control]")).toBeNull();
      expect(view.querySelector("[data-position]")).toBeNull();
      for (const capability of parityRequiredCapabilities()) {
        const doorway = form ? capability.phone : capability.desktop;
        if (doorway.opener) {
          expect(view.querySelector(doorway.opener), `${capability.id} missing ${doorway.opener}`).not.toBeNull();
        }
      }
    });
  }

  it("desktop LOOK reaches temporal question, position, focus, Notes, Stewardship, Recurring, Work, Google Calendar", async () => {
    const view = await renderForm(false);
    await openLook(view);
    expect(view.querySelector("[data-look-surface]")).not.toBeNull();
    expect(view.querySelector("[data-spatial-borrow]")?.getAttribute("data-spatial-borrow")).toBe("true");
    expect(view.querySelector("[data-borrow-mode]")?.getAttribute("data-borrow-mode")).toBe("lateral");
    expect(view.querySelector("[data-look-role]")?.getAttribute("data-look-role")).toBe("navigator-lens");
    expect(view.querySelector("[data-look-orientation]")?.textContent).toContain("Day");
    expect(view.querySelector("[data-look-operations-disclosure]")).not.toBeNull();
    expect(view.querySelector("[data-question-list]")).not.toBeNull();
    expect(view.querySelector("[data-relocation]")).not.toBeNull();
    expect(view.querySelector('[aria-label="Context focus"]')).not.toBeNull();
    expect(view.querySelector("[data-look-notes]")).not.toBeNull();
    expect(view.querySelector("[data-look-stewardship]")).not.toBeNull();
    expect(view.querySelector("[data-look-recurring-tasks]")).not.toBeNull();
    expect(view.querySelector("[data-manage-work]")).not.toBeNull();
    expect(view.querySelector("[data-manage-external-calendars]")).not.toBeNull();
  });

  it("desktop ADD reaches Direct Task, Recurring Task, Stewardship, Note, Time on the day, All day, Work", async () => {
    const view = await renderForm(false);
    await openAdd(view);
    expect(view.querySelector("[data-add-chooser]")).not.toBeNull();
    expect(view.querySelector("[data-spatial-borrow]")?.getAttribute("data-spatial-borrow")).toBe("true");
    expect(view.querySelector("[data-borrow-mode]")?.getAttribute("data-borrow-mode")).toBe("lateral");
    expect(view.querySelector("[data-borrow-width]")?.getAttribute("data-borrow-width")).toBe("tight");
    expect(view.querySelector('[data-add-choice="task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="recurring-task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="stewardship"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="note"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="time-on-the-day"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="all-day"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="work"]')).not.toBeNull();

    await act(async () => {
      (view.querySelector('[data-add-choice="task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-task]")).not.toBeNull();
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
  });

  it("desktop ADD reaches Recurring Task and Stewardship establishment surfaces", async () => {
    const view = await renderForm(false);
    await openAdd(view);
    await act(async () => {
      (view.querySelector('[data-add-choice="recurring-task"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-recurring-task], [data-create-recurring-task-return]")).not.toBeNull();

    // create-recurring-task is not kind "add"; one ADD click opens the chooser again.
    await openAdd(view);
    expect(view.querySelector("[data-add-chooser]")).not.toBeNull();
    await act(async () => {
      (view.querySelector('[data-add-choice="stewardship"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-stewardship], [data-create-stewardship-return]")).not.toBeNull();
  });

  it("desktop ADD reaches Note and LOOK returns to retained Notes", async () => {
    const view = await renderForm(false);
    await openAdd(view);
    await act(async () => {
      (view.querySelector('[data-add-choice="note"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-direct-note]")).not.toBeNull();

    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await openLook(view);
    await act(async () => {
      (view.querySelector("[data-look-notes]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-notes-surface], [data-retained-notes]")).not.toBeNull();
  });

  it("desktop standing ACT opens shared ActSurface; Recurring and Stewardship manage via LOOK", async () => {
    const view = await renderForm(false);
    await act(async () => {
      (view.querySelector("[data-act-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-act-surface]")).not.toBeNull();
    expect(view.querySelector("[data-spatial-borrow]")?.getAttribute("data-spatial-borrow")).toBe("true");
    expect(view.querySelector("[data-borrowed-operation]")?.getAttribute("data-borrowed-operation")).toBe("act");
    expect(view.querySelector("[data-borrow-width]")?.getAttribute("data-borrow-width")).toBe("standard");

    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await openLook(view);
    await act(async () => {
      (view.querySelector("[data-look-stewardship]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-stewardship-manage]")).not.toBeNull();
    expect(view.querySelector("[data-borrow-mode]")?.getAttribute("data-borrow-mode")).toBe("lateral");

    await act(async () => {
      (view.querySelector("[data-look-control]") as HTMLButtonElement).click();
    });
    await openLook(view);
    await act(async () => {
      (view.querySelector("[data-look-recurring-tasks]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-recurring-task-manage]")).not.toBeNull();
  });

  it("phone LOOK uses calm progressive disclosure without desktop lateral borrow", async () => {
    const view = await renderForm(true);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    await openLook(view);
    expect(view.querySelector("[data-look-surface]")).not.toBeNull();
    expect(view.querySelector("[data-look-role]")?.getAttribute("data-look-role")).toBe("phone-calm");
    expect(view.querySelector("[data-spatial-borrow]")?.getAttribute("data-spatial-borrow")).toBe("false");
    expect(view.querySelector("[data-borrow-mode]")).toBeNull();
    expect(view.querySelector("[data-look-orientation]")?.textContent).toContain("Day");
    expect(view.querySelector("[data-look-orientation]")?.textContent).toMatch(/Focus/);
    expect(view.querySelector("[data-question-list]")).not.toBeNull();
    expect(view.querySelector("[data-look-position-disclosure]")).not.toBeNull();
    expect(view.querySelector("[data-look-position-disclosure]")?.hasAttribute("open")).toBe(false);
    expect(view.querySelector("[data-look-position-current]")?.textContent?.trim().length).toBeGreaterThan(0);
    expect(view.querySelector("[data-look-focus-disclosure]")).not.toBeNull();
    expect(view.querySelector("[data-look-focus-disclosure]")?.hasAttribute("open")).toBe(false);
    expect(view.querySelector("[data-look-focus-current]")?.textContent).toContain("Everything");
    expect(view.querySelector("[data-look-operations-disclosure]")).not.toBeNull();
    expect(view.querySelector("[data-look-operations-disclosure]")?.hasAttribute("open")).toBe(false);
    expect(view.querySelector("[data-look-notes]")?.textContent).toBe("Notes");
    expect(view.querySelector("[role='dialog']")?.getAttribute("data-borrowed-surface")).toBe("sheet");
  });

  it("desktop LOOK composition stays navigator-lens with full Position and Focus", async () => {
    const view = await renderForm(false);
    await openLook(view);
    expect(view.querySelector("[data-look-role]")?.getAttribute("data-look-role")).toBe("navigator-lens");
    expect(view.querySelector("[data-look-orientation]")).not.toBeNull();
    expect(view.querySelector("[data-question-list]")).not.toBeNull();
    expect(view.querySelector("[data-look-position-disclosure]")).toBeNull();
    expect(view.querySelector("[data-look-focus-disclosure]")).toBeNull();
    expect(view.querySelector("[data-relocation]")).not.toBeNull();
    expect(view.querySelector('[aria-label="Context focus"]')).not.toBeNull();
    expect(view.querySelector("[data-look-operations-disclosure]")).not.toBeNull();
    expect(view.querySelector("[data-spatial-borrow]")?.getAttribute("data-spatial-borrow")).toBe("true");
    expect(view.querySelector("[data-borrow-mode]")?.getAttribute("data-borrow-mode")).toBe("lateral");
  });

  it("desktop and phone fresh startups ask Day, and LOOK still reaches Present", async () => {
    const desktop = await renderForm(false);
    expect(desktop.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    await openLook(desktop);
    await act(async () => {
      const list = desktop.querySelector("[data-question-list]") as HTMLElement;
      const present = [...list.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Present");
      present?.click();
    });
    expect(desktop.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(desktop.querySelector("[data-desktop-now]")).not.toBeNull();

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    restoreMedia?.();

    const phone = await renderForm(true);
    expect(phone.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    await openLook(phone);
    await act(async () => {
      const list = phone.querySelector("[data-question-list]") as HTMLElement;
      const present = [...list.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Present");
      present?.click();
    });
    expect(phone.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
  });

  it("preserves desktop Week DTM specialization and phone LOOK · ADD · ACT chrome density difference", async () => {
    const desktop = await renderForm(false);
    expect(desktop.querySelector("[data-add-control]")?.textContent).toContain("ADD");
    expect(desktop.querySelector(".orient-add-control")).toBeNull();

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    restoreMedia?.();

    const phone = await renderForm(true);
    const phoneAdd = phone.querySelector("[data-add-control]") as HTMLButtonElement;
    expect(phoneAdd.classList.contains("orient-add-control")).toBe(true);
    expect(phoneAdd.getAttribute("aria-label")).toBe("ADD");
    expect(phoneAdd.querySelector(".orient-glyph")).not.toBeNull();
    expect(phoneAdd.querySelector("span")).toBeNull();
    expect(phoneAdd.textContent?.includes("+")).toBe(false);
    expect(phone.querySelectorAll("[data-add-control]")).toHaveLength(1);
    expect(specializedCapabilities()[0]?.id).toBe("desktop-week-dtm");
  });

  it("desktop ADD keeps Plus icon with visible ADD label; phone ADD keeps glyph only", async () => {
    const desktop = await renderForm(false);
    const desktopAdd = desktop.querySelector("[data-add-control]") as HTMLButtonElement;
    expect(desktopAdd.getAttribute("aria-label")).toBe("ADD");
    expect(desktopAdd.querySelector(".orient-glyph")).not.toBeNull();
    expect(desktopAdd.querySelector("span")?.textContent).toBe("ADD");
    expect(desktopAdd.classList.contains("orient-add-control")).toBe(false);

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    restoreMedia?.();

    const phone = await renderForm(true);
    const phoneAdd = phone.querySelector("[data-add-control]") as HTMLButtonElement;
    expect(phoneAdd.getAttribute("aria-label")).toBe("ADD");
    expect(phoneAdd.querySelector(".orient-glyph")).not.toBeNull();
    expect(phoneAdd.querySelector("span")).toBeNull();
    expect(phoneAdd.classList.contains("orient-add-control")).toBe(true);
  });
});
