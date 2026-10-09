/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";

const ANCHOR = "2026-10-05";
const NOW = new Date("2026-10-05T18:30:00.000Z");

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

function actions(): OrientActions {
  return {
    onEstablish: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
    onSignOut: () => {},
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
    onTasksChanged: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
  };
}

function captureBridge(): CaptureBridge {
  return {
    session: readyCaptureSession(),
    update: () => {},
    saving: false,
    saveError: null,
    submit: async () => null,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let anchors: string[] = [];
let anchor = ANCHOR;
let now = NOW;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}

async function paint() {
  await act(async () => {
    root?.render(
      <OrientView
        timeZone="UTC"
        now={now}
        anchor={anchor}
        onAnchor={(date) => {
          anchors.push(date);
        }}
        loaded={experienceLoadWindow(anchor)}
        sources={sources()}
        contexts={ready([])}
        tasks={ready([])}
        thread={{ status: "ready", active: false, taskId: null, resumeTitle: null }}
        pulse={{ grants: { status: "ready", rows: [] }, occurrences: { status: "ready", rows: [] }, expressible: [] }}
        capture={captureBridge()}
        actions={actions()}
      />,
    );
  });
}

async function renderView() {
  anchors = [];
  anchor = ANCHOR;
  now = NOW;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await paint();
  return container as HTMLDivElement;
}

async function applyAnchor(date: string) {
  anchor = date;
  await paint();
}

async function applyNow(next: Date) {
  now = next;
  await paint();
}

function viewpoint(view: ParentNode): string | null {
  return view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint") ?? null;
}

async function ask(view: HTMLElement, name: string) {
  const control = view.querySelector("[data-question-control]") as HTMLButtonElement;
  if (control.getAttribute("aria-expanded") !== "true") {
    await act(async () => {
      control.click();
    });
  }
  const list = view.querySelector("[data-question-list]") as HTMLElement;
  await act(async () => {
    buttonNamed(list, name).click();
  });
}

async function openPosition(view: HTMLElement) {
  const look = view.querySelector("[data-look-control]") as HTMLButtonElement;
  if (look.getAttribute("aria-expanded") !== "true") {
    await act(async () => {
      look.click();
    });
  }
  expect(view.querySelector("[data-relocation]")).not.toBeNull();
}

async function shiftLandscape(view: HTMLElement) {
  const target = view.querySelector(".orient-landscape-days, .orient-month");
  if (!target) throw new Error("Missing landscape");
  await act(async () => {
    target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 48 }));
  });
}

function box(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    left: 0,
    top,
    right: 320,
    bottom: top + height,
    width: 320,
    height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function layOutVerticalField(view: HTMLElement) {
  const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 700 });
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 4200 });
  scroller.getBoundingClientRect = () => box(0, 700);
  const days = [...view.querySelectorAll<HTMLElement>(".orient-day")];
  days.forEach((day, index) => {
    const origin = index * 1400;
    day.getBoundingClientRect = () => box(origin - scroller.scrollTop, 1400);
  });
  return scroller;
}

describe("viewpoint provenance", () => {
  it("starts as follows Today and keeps that through a question visit", async () => {
    const view = await renderView();
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual([]);
    await ask(view, "Day");
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual([]);
  });

  it("marks Day moved for Previous, Next, and a typed date, including a typed Today", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Previous civil day").click();
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04"]);
    await applyAnchor("2026-10-04");

    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Next civil day").click();
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04", "2026-10-05"]);
    await applyAnchor(ANCHOR);

    await openPosition(view);
    const input = view.querySelector("#orient-civil-date") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(input, "2026-11-02");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04", "2026-10-05", "2026-11-02"]);
    await applyAnchor("2026-11-02");

    await openPosition(view);
    const todayInput = view.querySelector("#orient-civil-date") as HTMLInputElement;
    await act(async () => {
      setter?.call(todayInput, ANCHOR);
      todayInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04", "2026-10-05", "2026-11-02", ANCHOR]);
  });

  it("marks Ask Day moved and restores that moved Day after Present", async () => {
    const view = await renderView();
    await ask(view, "Week");
    await act(async () => {
      (view.querySelector('[data-civil-day="2026-10-08"] .orient-day-ask') as HTMLButtonElement).click();
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-08"]);
    await applyAnchor("2026-10-08");
    await ask(view, "Present");
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-08", ANCHOR]);
    await applyAnchor(ANCHOR);
    await ask(view, "Day");
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-08", ANCHOR, "2026-10-08"]);
  });

  it("marks a Week shift moved and restores Day's follows-Today place", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await ask(view, "Week");
    expect(viewpoint(view)).toBe("follows-today");
    await shiftLandscape(view);
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-06"]);
    await applyAnchor("2026-10-06");
    await ask(view, "Day");
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-06", ANCHOR]);
    await applyAnchor(ANCHOR);
    await ask(view, "Week");
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-06", ANCHOR, "2026-10-06"]);
  });

  it("marks a Month shift moved and leaves the remembered Day place follows Today", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await ask(view, "Month");
    expect(viewpoint(view)).toBe("follows-today");
    await shiftLandscape(view);
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-06"]);
    await applyAnchor("2026-10-06");
    await ask(view, "Day");
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-06", ANCHOR]);
  });

  it("marks an exact-time civil-date crossing moved and leaves that in place on return", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await act(async () => {
      (view.querySelector("[data-exact-time]") as HTMLButtonElement).click();
    });
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual([]);
    const scroller = layOutVerticalField(view);
    scroller.scrollTop = 80;
    await act(async () => {
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04"]);
    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04"]);
  });

  it("establishes follows Today from Today and from Return to Now without inventing a same-date write", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Previous civil day").click();
    });
    await applyAnchor("2026-10-04");
    expect(viewpoint(view)).toBe("moved");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Today").click();
    });
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-04", ANCHOR]);
    await applyAnchor(ANCHOR);
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Today").click();
    });
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-04", ANCHOR]);

    await applyAnchor("2026-10-08");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Previous civil day").click();
    });
    expect(viewpoint(view)).toBe("moved");
    await applyAnchor("2026-10-07");
    await act(async () => {
      buttonNamed(view, "Now").click();
    });
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual(["2026-10-04", ANCHOR, "2026-10-07", ANCHOR]);
  });

  it("restores a moved Day and does not treat a date that equals Today as follows Today", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Next civil day").click();
    });
    expect(anchors).toEqual(["2026-10-06"]);
    await applyAnchor("2026-10-06");
    await applyNow(new Date("2026-10-06T18:30:00.000Z"));
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-06"]);
    await ask(view, "Week");
    await ask(view, "Day");
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-06"]);
  });

  it("keeps follows Today across midnight and does not rewrite the anchor or the provenance", async () => {
    const view = await renderView();
    await ask(view, "Day");
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    await applyNow(new Date("2026-10-06T01:00:00.000Z"));
    expect(viewpoint(view)).toBe("follows-today");
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    expect(view.querySelector(".orient-desktop-now-quiet")).toBeNull();
    expect(anchors).toEqual([]);
  });

  it("keeps a moved viewpoint moved across midnight", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Previous civil day").click();
    });
    await applyAnchor("2026-10-04");
    await applyNow(new Date("2026-10-06T01:00:00.000Z"));
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04"]);
  });

  it("does not restore a previous mount's date or provenance", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openPosition(view);
    await act(async () => {
      buttonNamed(view, "Previous civil day").click();
    });
    expect(viewpoint(view)).toBe("moved");
    expect(anchors).toEqual(["2026-10-04"]);
    await act(async () => {
      root?.unmount();
    });
    anchors = [];
    anchor = ANCHOR;
    now = NOW;
    root = createRoot(container as HTMLDivElement);
    await paint();
    expect(viewpoint(view)).toBe("follows-today");
    expect(anchors).toEqual([]);
  });
});
