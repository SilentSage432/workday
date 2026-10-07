/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { CanvasEstablishment, CanvasFactUpdate } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";

const ANCHOR = "2026-10-05";
const WORK_ID = "11111111-1111-4111-8111-111111111111";
const LAB_ID = "22222222-2222-4222-8222-222222222222";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function block(): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "10:00",
      endLocal: "11:00",
      purpose: "Write",
      contextId: LAB_ID,
    }),
    id: "block-1",
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

function commitment(): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "10:00",
      endLocal: "11:00",
      title: "Meet",
    }),
    id: "commitment-1",
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

function sources(): OrientSources {
  return {
    work: ready([{ workOn: ANCHOR, state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }]),
    protectedTime: ready([]),
    blocks: ready([block()]),
    commitments: ready([commitment()]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
  };
}

function contexts(): SourceRead<Context> {
  return ready([
    { id: WORK_ID, name: "Work", createdAt: "2026-10-01T00:00:00.000Z" },
    { id: LAB_ID, name: "TeamLab", createdAt: "2026-10-01T00:00:00.000Z" },
  ]);
}

function task(): Task {
  return {
    id: "task-1",
    title: "Cycle counts",
    contextId: null,
    createdAt: "2026-10-05T00:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
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

function actions(overrides?: Partial<OrientActions>): OrientActions {
  return {
    onEstablish: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
    onSignOut: () => {},
    onStartThread: async () => {},
    onLeaveThread: async () => {},
    onCompleteTask: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onTasksChanged: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

async function renderView(overrides?: {
  anchor?: string;
  now?: Date;
  timeZone?: string;
  sources?: OrientSources;
  thread?: ThreadReading;
  onAnchor?: (civilDate: string) => void;
  actions?: Partial<OrientActions>;
}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onAnchor = overrides?.onAnchor ?? (() => {});
  await act(async () => {
    root?.render(
      <OrientView
        timeZone={overrides?.timeZone ?? "UTC"}
        now={overrides?.now ?? new Date("2026-10-05T18:30:00.000Z")}
        anchor={overrides?.anchor ?? ANCHOR}
        onAnchor={onAnchor}
        loaded={experienceLoadWindow(overrides?.anchor ?? ANCHOR)}
        sources={overrides?.sources ?? sources()}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={
          overrides?.thread ?? { status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }
        }
        capture={captureBridge()}
        actions={actions(overrides?.actions)}
      />,
    );
  });
  return container;
}

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}

async function openExact(view: HTMLElement) {
  const exact = view.querySelector("[data-exact-time]") as HTMLButtonElement | null;
  if (!exact) throw new Error("Missing Exact time");
  await act(async () => {
    exact.click();
  });
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

function pointer(type: "pointerdown" | "pointerup" | "pointermove" | "pointercancel", id: number, clientY = 4) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    pointerId: id,
    pointerType: "mouse",
    clientX: 4,
    clientY,
  });
}

function clockBox(): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 1440,
    width: 200,
    height: 1440,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

describe("production orient instrument", () => {
  it("is the signed-in field and does not keep the scaffold navigation", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const frame = readFileSync("components/AppFrame.tsx", "utf8");
    expect(page).toContain("OrientInstrument");
    expect(page).not.toContain("TaskLoop");
    expect(frame).toContain('pathname === "/"');
    expect(frame).toContain("pb-[calc(5rem+env(safe-area-inset-bottom))]");
  });

  it("renders one instrument, keeps Present from establishing, and preserves the field through capture", async () => {
    const view = await renderView();
    expect(view.querySelector("[data-production-instrument]")).not.toBeNull();
    expect(view.querySelector('nav[aria-label="Primary"]')).toBeNull();
    expect(view.textContent).not.toContain("Earlier");
    expect(view.textContent).not.toContain("Later");
    expect([...view.querySelectorAll("button")].some((item) => item.textContent?.trim() === "Sign out")).toBe(false);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.textContent).not.toContain("Protect this time");
    expect(view.querySelector("[data-desktop-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.querySelector("[data-question-control] svg")).not.toBeNull();
    expect(view.querySelector("[data-capture-control] svg")).not.toBeNull();
    expect(view.querySelector("[data-desktop-thread]")?.textContent).toContain("Resume: Cycle counts");
    expect(view.querySelector("[data-active-thread]")).toBeNull();
    const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
    scroller.scrollTop = 120;
    await act(async () => {
      buttonNamed(view, "Capture").click();
    });
    expect(view.querySelector("[data-capture-surface]")).not.toBeNull();
    expect(scroller.scrollTop).toBe(120);
    await act(async () => {
      buttonNamed(view, "Close capture").click();
    });
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
    expect(scroller.scrollTop).toBe(120);
    expect(view.querySelector("[data-field]")).not.toBeNull();
  });

  it("keeps Day establishment explicit and preserves a failed save", async () => {
    const calls: CanvasEstablishment[] = [];
    const view = await renderView({
      actions: {
        onEstablish: async (establishment) => {
          calls.push(establishment);
          throw new Error("The write did not happen.");
        },
      },
    });
    await ask(view, "Day");
    await openExact(view);
    const surface = view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`) as HTMLElement;
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 1));
      surface.dispatchEvent(pointer("pointerup", 1));
    });
    expect(view.querySelector("[data-temporal-reference]")).not.toBeNull();
    expect(view.textContent).not.toContain("Save");
    await act(async () => {
      buttonNamed(view, "Cancel").click();
    });
    expect(calls).toEqual([]);
    expect(view.querySelector("[data-temporal-reference]")).toBeNull();

    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 2));
      surface.dispatchEvent(pointer("pointerup", 2));
    });
    await act(async () => {
      buttonNamed(view, "Protect this time").click();
    });
    const label = view.querySelector('[aria-label="Protected time label"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(label, "Quiet");
      label.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(calls).toHaveLength(1);
    expect(view.querySelector("[role='alert']")?.textContent).toContain("did not happen");
    expect(view.querySelector("[data-temporal-reference]")).not.toBeNull();
    expect((view.querySelector('[aria-label="Protected time label"]') as HTMLInputElement).value).toBe("Quiet");
  });

  it("changes question without moving the anchor, except Present", async () => {
    const anchors: string[] = [];
    const view = await renderView({ anchor: "2026-10-04", onAnchor: (date) => anchors.push(date) });
    await ask(view, "Week");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-distance")).toBe("week");
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-framed")).toBe("centered");
    expect(view.querySelector("[data-month-geometry]")).toBeNull();
    expect(view.querySelectorAll(".orient-day-ask")).toHaveLength(7);
    expect([...view.querySelectorAll("button")].some((item) => item.textContent?.replace(/\s+/g, " ").trim() === "Refer")).toBe(
      false,
    );
    expect([...view.querySelectorAll("button")].some((item) => item.textContent?.replace(/\s+/g, " ").trim() === "Ask Day")).toBe(
      false,
    );
    expect(view.querySelector("[data-direction-plane]")).toBeNull();
    expect(anchors).toEqual([]);
    await ask(view, "Present");
    expect(anchors).toEqual(["2026-10-05"]);
  });

  it("operates Week from the date and from established material", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Week");
    expect(view.querySelector('[data-civil-day="2026-10-05"]')?.getAttribute("data-today")).toBe("true");
    expect(view.querySelector('[data-civil-day="2026-10-05"] [data-present-mark]')?.getAttribute("aria-label")).toBe("Now");
    expect(view.querySelector('[data-civil-day="2026-10-06"] [data-present-mark]')).toBeNull();
    const block = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    expect(block.tagName).toBe("BUTTON");
    await act(async () => {
      block.click();
    });
    expect(view.textContent).toContain("These facts share this point.");
    const askDay = view.querySelector('[data-civil-day="2026-10-06"] .orient-day-ask') as HTMLButtonElement;
    expect(askDay.getAttribute("aria-label")).toContain("Ask Day");
    await act(async () => {
      askDay.click();
    });
    expect(anchors).toEqual(["2026-10-06"]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
  });

  it("focuses emphasis without moving facts", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openExact(view);
    const before = view.querySelector('[data-source-id="block-1"]')?.getAttribute("data-top");
    await act(async () => {
      buttonNamed(view, "Focus: Everything").click();
    });
    await act(async () => {
      buttonNamed(view, "TeamLab").click();
    });
    const blockMark = view.querySelector('[data-source-id="block-1"]') as HTMLElement;
    const workMark = view.querySelector('[data-source-kind="work_schedule"]') as HTMLElement;
    const commitmentMark = view.querySelector('[data-source-id="commitment-1"]') as HTMLElement;
    expect(blockMark.getAttribute("data-top")).toBe(before);
    expect(blockMark.getAttribute("data-emphasis")).toBe("ordinary");
    expect(workMark.getAttribute("data-emphasis")).toBe("quiet");
    expect(commitmentMark.getAttribute("data-emphasis")).toBe("ordinary");
    expect(workMark.getAttribute("aria-label")).toContain("quiet");
    expect(blockMark.getAttribute("aria-label")).toContain("Write");
    expect(blockMark.textContent).not.toContain("Write");
  });

  it("lists every fact that shares a point", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openExact(view);
    const surface = view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`) as HTMLElement;
    for (const id of ["block-1", "commitment-1"]) {
      const article = view.querySelector(`[data-source-id="${id}"]`) as HTMLElement;
      article.getBoundingClientRect = () =>
        ({
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: 40,
          bottom: 40,
          width: 40,
          height: 40,
          toJSON() {
            return {};
          },
        }) as DOMRect;
    }
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 3));
      surface.dispatchEvent(pointer("pointerup", 3));
    });
    expect(view.textContent).toContain("These facts share this point.");
    expect(view.querySelector('[data-source-id="block-1"]')?.textContent).not.toContain("Write");
  });

  it("admits Direction only on Month and does not give it dates", async () => {
    const view = await renderView();
    await ask(view, "Month");
    const direction = view.querySelector("[data-direction-plane]");
    expect(direction).not.toBeNull();
    expect(direction?.textContent).toContain("No direction is established.");
    expect(direction?.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(view.textContent).not.toMatch(/progress|%/);
    const axis = view.querySelector("[data-month-axis]")?.getAttribute("data-month-axis") ?? "";
    const [axisStart, axisEnd] = axis.split("-").map(Number);
    expect(axisStart).toBeGreaterThan(0);
    expect(axisEnd).toBeLessThan(24 * 60);
    expect(axisEnd).toBeGreaterThan(17 * 60);
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-distance")).toBe("month");
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    const rows = [...view.querySelectorAll("[data-month-row]")];
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.querySelectorAll("[data-civil-day]").length === 7)).toBe(true);
    const dates = [...view.querySelectorAll("[data-civil-day]")].map((item) => item.getAttribute("data-civil-day"));
    expect(dates).toHaveLength(28);
    expect(dates[0]).toBe("2026-10-05");
    expect(dates[7]).toBe("2026-10-12");
    expect(dates.at(-1)).toBe("2026-11-01");
    expect(view.querySelector('[data-civil-day="2026-10-05"]')?.getAttribute("data-today")).toBe("true");
    expect(view.querySelector("[data-landscape] [data-present-mark]")).toBeNull();
    expect(view.querySelector('[data-landscape] [aria-label="Now"]')).toBeNull();
  });

  it("asks Day from a Month date and inspects material inside that date", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Month");
    const block = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    expect(block.tagName).toBe("BUTTON");
    await act(async () => {
      block.click();
    });
    expect(view.textContent).toContain("These facts share this point.");
    const askDay = view.querySelector('[data-civil-day="2026-10-06"] .orient-day-ask') as HTMLButtonElement;
    expect(askDay.getAttribute("aria-label")).toContain("Ask Day");
    await act(async () => {
      askDay.click();
    });
    expect(anchors).toEqual(["2026-10-06"]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
  });

  it("refines an open Day draft from either handle without starting another selection", async () => {
    const view = await renderView();
    await ask(view, "Day");
    await openExact(view);
    const surface = view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`) as HTMLElement;
    const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
    scroller.scrollTop = 80;
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 8));
      surface.dispatchEvent(pointer("pointerup", 8));
    });
    surface.getBoundingClientRect = () => clockBox();
    const start = () => (view.querySelector('[aria-label="Interval start"]') as HTMLInputElement).value;
    const end = () => (view.querySelector('[aria-label="Interval end"]') as HTMLInputElement).value;
    expect(start()).toBe("00:00");
    expect(end()).toBe("00:15");
    const endHandle = view.querySelector('[data-edge="end"]') as HTMLButtonElement;
    const startHandle = view.querySelector('[data-edge="start"]') as HTMLButtonElement;
    await act(async () => {
      endHandle.dispatchEvent(pointer("pointerdown", 9, 180));
    });
    expect(end()).toBe("00:15");
    await act(async () => {
      endHandle.dispatchEvent(pointer("pointermove", 9, 180));
      endHandle.dispatchEvent(pointer("pointerup", 9, 180));
    });
    expect(start()).toBe("00:00");
    expect(end()).toBe("03:00");
    expect(view.querySelectorAll("[data-temporal-reference]")).toHaveLength(1);
    expect(scroller.scrollTop).toBe(80);

    await act(async () => {
      startHandle.dispatchEvent(pointer("pointerdown", 10, 60));
      startHandle.dispatchEvent(pointer("pointermove", 10, 60));
      startHandle.dispatchEvent(pointer("pointerup", 10, 60));
    });
    expect(start()).toBe("01:00");
    expect(end()).toBe("03:00");
    await act(async () => {
      startHandle.dispatchEvent(pointer("pointerdown", 11, 0));
      startHandle.dispatchEvent(pointer("pointermove", 11, 0));
      startHandle.dispatchEvent(pointer("pointerup", 11, 0));
    });
    expect(start()).toBe("00:00");
    expect(end()).toBe("03:00");
    await act(async () => {
      endHandle.dispatchEvent(pointer("pointerdown", 12, 120));
      endHandle.dispatchEvent(pointer("pointermove", 12, 120));
      endHandle.dispatchEvent(pointer("pointerup", 12, 120));
    });
    expect(end()).toBe("02:00");
    await act(async () => {
      endHandle.dispatchEvent(pointer("pointerdown", 13, 240));
      endHandle.dispatchEvent(pointer("pointermove", 13, 240));
      endHandle.dispatchEvent(pointer("pointerup", 13, 240));
    });
    expect(start()).toBe("00:00");
    expect(end()).toBe("04:00");

    await act(async () => {
      startHandle.dispatchEvent(pointer("pointerdown", 14, 300));
      startHandle.dispatchEvent(pointer("pointermove", 14, 300));
      startHandle.dispatchEvent(pointer("pointerup", 14, 300));
    });
    expect(start()).toBe("00:00");
    expect(end()).toBe("04:00");

    await act(async () => {
      endHandle.dispatchEvent(pointer("pointerdown", 15, 90));
      endHandle.dispatchEvent(pointer("pointermove", 15, 90));
      endHandle.dispatchEvent(pointer("pointercancel", 15, 400));
    });
    expect(end()).toBe("01:30");
    expect(view.querySelectorAll("[data-temporal-reference]")).toHaveLength(1);
    expect(scroller.scrollTop).toBe(80);

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const endField = view.querySelector('[aria-label="Interval end"]') as HTMLInputElement;
    await act(async () => {
      setter?.call(endField, "05:00");
      endField.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(end()).toBe("05:00");
    expect(start()).toBe("00:00");
    const frame = view.querySelector("[data-temporal-reference]") as HTMLElement;
    expect(frame.style.height.startsWith("20.8")).toBe(true);
    await act(async () => {
      startHandle.dispatchEvent(pointer("pointerdown", 16, 30));
      startHandle.dispatchEvent(pointer("pointermove", 16, 30));
      startHandle.dispatchEvent(pointer("pointerup", 16, 30));
    });
    expect(start()).toBe("00:30");
    expect(end()).toBe("05:00");
    expect(scroller.scrollTop).toBe(80);
  });

  it("keeps the corrected field off the rejected paper ground", () => {
    const css = readFileSync("components/orient/orient.css", "utf8");
    expect(css).not.toContain("#f4f1ea");
    expect(css).toContain("backdrop-filter");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("does not paint a failed read as an empty field", async () => {
    const failed = sources();
    failed.work = { status: "failed", message: "Work could not be read." };
    const view = await renderView({ sources: failed });
    expect(view.querySelector("[data-reading='incomplete']")?.textContent).toContain("withheld");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.textContent).not.toContain("Allocatable remainder");
  });

  it("keeps a failed thread distinct from absence and independent of Now", async () => {
    const view = await renderView({ thread: { status: "failed", message: "Thread storage failed." } });
    const thread = view.querySelector("[data-desktop-thread]");
    expect(thread?.textContent).toContain("could not be read");
    expect(thread?.textContent).not.toContain("No thread is established.");
    expect(thread?.getAttribute("data-thread-weight")).toBe("ordinary");
    expect(view.querySelector("[data-desktop-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
  });

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
    const mark = view.querySelector<HTMLElement>(".orient-clock [data-present-mark]");
    const todayIndex = days.findIndex((day) => day.getAttribute("data-civil-day") === ANCHOR);
    if (mark && todayIndex >= 0) {
      mark.getBoundingClientRect = () => box(todayIndex * 1400 + 900 - scroller.scrollTop, 1);
    }
    return scroller;
  }

  async function scrollField(scroller: HTMLElement) {
    await act(async () => {
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
  }

  it("opens Present on the authoritative day and does not adopt October 3", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    expect(view.querySelector("[data-desktop-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelector(".orient-day")).toBeNull();
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    await openExact(view);
    const dates = [...view.querySelectorAll(".orient-day")].map((day) => day.getAttribute("data-civil-day"));
    expect(dates).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(dates).not.toContain("2026-10-03");
    expect(anchors).toEqual([]);
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    const page = readFileSync("app/page.tsx", "utf8");
    expect(instrument).not.toMatch(/localStorage|sessionStorage|workFiscalWeekStart/);
    expect(page).not.toContain("InstrumentPrototype");
  });

  it("keeps the mounted days when a manual scroll crosses midnight", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await openExact(view);
    const scroller = layOutVerticalField(view);
    scroller.scrollTop = 80;
    await scrollField(scroller);
    expect(anchors).toEqual(["2026-10-04"]);
    await act(async () => {
      root?.render(
        <OrientView
          timeZone="UTC"
          now={new Date("2026-10-05T18:30:00.000Z")}
          anchor="2026-10-04"
          onAnchor={(date) => anchors.push(date)}
          loaded={experienceLoadWindow("2026-10-04")}
          sources={sources()}
          contexts={contexts()}
          tasks={ready([task()])}
          thread={{ status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
          capture={captureBridge()}
          actions={actions()}
        />,
      );
    });
    expect([...view.querySelectorAll(".orient-day")].map((day) => day.getAttribute("data-civil-day"))).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
    ]);
    expect(scroller.scrollTop).toBe(80);
    expect(anchors).toEqual(["2026-10-04"]);
  });

  it("does not recenter for a clock tick, focus, capture, or inspection", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Day");
    await openExact(view);
    const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
    scroller.scrollTop = 640;
    await act(async () => {
      root?.render(
        <OrientView
          timeZone="UTC"
          now={new Date("2026-10-05T19:00:00.000Z")}
          anchor={ANCHOR}
          onAnchor={(date) => anchors.push(date)}
          loaded={experienceLoadWindow(ANCHOR)}
          sources={sources()}
          contexts={contexts()}
          tasks={ready([task()])}
          thread={{ status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
          capture={captureBridge()}
          actions={actions()}
        />,
      );
    });
    expect(scroller.scrollTop).toBe(640);
    expect(anchors).toEqual([]);
    await act(async () => {
      buttonNamed(view, "Focus: Everything").click();
    });
    await act(async () => {
      buttonNamed(view, "TeamLab").click();
    });
    expect(scroller.scrollTop).toBe(640);
    await act(async () => {
      buttonNamed(view, "Capture").click();
    });
    await act(async () => {
      buttonNamed(view, "Close capture").click();
    });
    expect(scroller.scrollTop).toBe(640);
    const surface = view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`) as HTMLElement;
    for (const id of ["block-1", "commitment-1"]) {
      const article = view.querySelector(`[data-source-id="${id}"]`) as HTMLElement;
      article.getBoundingClientRect = () => box(0, 40);
    }
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 21));
      surface.dispatchEvent(pointer("pointerup", 21));
    });
    expect(view.textContent).toContain("These facts share this point.");
    expect(scroller.scrollTop).toBe(640);
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    expect(scroller.scrollTop).toBe(640);
  });

  it("moves only for an explicit return, Today, or chosen date", async () => {
    const anchors: string[] = [];
    const view = await renderView({ anchor: "2026-10-06", onAnchor: (date) => anchors.push(date) });
    await ask(view, "Day");
    await openExact(view);
    const scroller = layOutVerticalField(view);
    scroller.scrollTop = 2000;
    await scrollField(scroller);
    await act(async () => {
      buttonNamed(view, "Now").click();
    });
    expect(anchors).toContain("2026-10-05");
    anchors.length = 0;
    await act(async () => {
      view.querySelector<HTMLButtonElement>("[data-position]")?.click();
    });
    await act(async () => {
      buttonNamed(view, "Today").click();
    });
    expect(anchors).toEqual(["2026-10-05"]);
    anchors.length = 0;
    const input = view.querySelector("#orient-civil-date") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(input, "2026-11-02");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(anchors).toEqual(["2026-11-02"]);
  });

  it("does not let Week or Month replace Day's place", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Day");
    expect(view.querySelector("[data-day-inscription]")).not.toBeNull();
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    await ask(view, "Month");
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelectorAll("[data-civil-day]")).toHaveLength(28);
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    await ask(view, "Week");
    expect(view.querySelector("[data-framed]")?.getAttribute("data-framed")).toBe("centered");
    await ask(view, "Day");
    expect(view.querySelector("[data-day-inscription]")).not.toBeNull();
    expect(view.querySelector(".orient-day")).toBeNull();
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    expect(anchors).toEqual([]);
  });

  it("asks Day from quiet Month ground and keeps a fact tap on the fact", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Month");
    const fact = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    expect(fact.tagName).toBe("BUTTON");
    await act(async () => {
      fact.click();
    });
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("month");
    expect(view.textContent).toContain("These facts share this point.");
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    const ground = view.querySelector('[data-ask-day="2026-10-08"]') as HTMLButtonElement;
    expect(ground.tagName).toBe("BUTTON");
    expect(ground.getAttribute("aria-label")).toContain("Ask Day");
    expect(ground.getAttribute("aria-label")).toContain("Oct");
    ground.focus();
    expect(document.activeElement).toBe(ground);
    await act(async () => {
      ground.click();
    });
    expect(anchors).toEqual(["2026-10-08"]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    await act(async () => {
      root?.render(
        <OrientView
          timeZone="UTC"
          now={new Date("2026-10-05T18:30:00.000Z")}
          anchor="2026-10-08"
          onAnchor={(date) => anchors.push(date)}
          loaded={experienceLoadWindow("2026-10-08")}
          sources={sources()}
          contexts={contexts()}
          tasks={ready([task()])}
          thread={{ status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
          capture={captureBridge()}
          actions={actions()}
        />,
      );
    });
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 8");
    expect(view.querySelector("[data-day-inscription]")).not.toBeNull();
    expect(view.querySelector("[data-signature-now]")).toBeNull();
    expect(view.querySelector("[data-month-geometry]")).toBeNull();
    expect(view.querySelector("[data-direction-plane]")).toBeNull();
  });

  it("stays operable when motion is reduced", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    })) as typeof window.matchMedia;
    try {
      const view = await renderView();
      expect(view.querySelector("[data-reduced-motion]")?.getAttribute("data-reduced-motion")).toBe("true");
      await ask(view, "Week");
      expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("work schedule authority", () => {
  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function setField(node: ParentNode, name: string, value: string) {
    const field = node.querySelector(`[aria-label="${name}"]`) as HTMLInputElement | HTMLSelectElement | null;
    if (!field) throw new Error(`Missing field ${name}`);
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    await act(async () => {
      setter?.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      if (field instanceof HTMLInputElement) {
        field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      }
    });
  }

  async function enterShift(view: HTMLElement, label: string, start: string, end: string, type: string) {
    const open = view.querySelector(
      `[aria-label="Shift for ${label}"], [aria-label="Edit shift for ${label}"]`,
    ) as HTMLButtonElement | null;
    if (!open) throw new Error(`Missing shift control for ${label}`);
    await act(async () => {
      open.click();
    });
    await setField(view, `Start for ${label}`, start);
    await setField(view, `End for ${label}`, end);
    await setField(view, `Shift type for ${label}`, type);
  }

  async function openManage(view: HTMLElement) {
    await act(async () => {
      view.querySelector<HTMLButtonElement>("[data-position]")?.click();
    });
    await act(async () => {
      buttonNamed(view, "Manage Work schedule").click();
    });
    await settle();
  }

  it("reaches Work from nothing and keeps the reading in place", async () => {
    const anchors: string[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      sources: { ...sources(), work: ready([]) },
    });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    await openManage(view);
    const editor = view.querySelector("[data-work-schedule]");
    expect(editor?.getAttribute("data-fiscal-week")).toBe("2026-10-03");
    expect(editor?.getAttribute("data-fiscal-through")).toBe("2026-10-09");
    expect(editor?.textContent).toContain("Sat, Oct 3");
    expect(editor?.textContent).toContain("Fri, Oct 9");
    expect(view.querySelectorAll("[data-work-day]")).toHaveLength(7);
    expect([...view.querySelectorAll("[data-work-state]")].every((day) => day.getAttribute("data-work-state") === "unknown")).toBe(true);
    expect(view.textContent).toContain("Not entered");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    expect(view.querySelector("[data-field]")).not.toBeNull();
    expect(view.querySelector('a[href="/schedule"]')).toBeNull();
    expect(anchors).toEqual([]);
  });

  it("opens the inspected Work fact in the same operation", async () => {
    const anchors: string[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      sources: {
        ...sources(),
        work: ready([{ workOn: "2026-10-10", state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }]),
      },
      actions: {
        onLoadWorkWeek: async () => [
          { workOn: "2026-10-10", state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" },
        ],
      },
    });
    await ask(view, "Week");
    const fact = view.querySelector('[data-civil-day="2026-10-10"] [data-source-kind="work_schedule"]') as HTMLButtonElement;
    await act(async () => {
      fact.click();
    });
    await act(async () => {
      buttonNamed(view, "Edit the work week").click();
    });
    await settle();
    expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-10");
    expect(view.querySelector('[data-work-day="2026-10-10"]')?.textContent).toContain("09:00–17:00 Mid");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    expect(view.querySelector('a[href="/schedule"]')).toBeNull();
    expect(anchors).toEqual([]);
    expect(readFileSync("app/schedule/page.tsx", "utf8")).toContain("WorkSchedule");
  });

  it("keeps unknown distinct from Off and writes a valid week through the existing save", async () => {
    const saves: unknown[] = [];
    let reads = 0;
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: {
        onLoadWorkWeek: async () => {
          reads += 1;
          if (reads === 1) return [];
          return [{ workOn: "2026-10-03", state: "off" }];
        },
        onSaveWorkWeek: async (_weekStart, writes) => {
          saves.push(writes);
        },
      },
    });
    await openManage(view);
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("unknown");
    await act(async () => {
      buttonNamed(view, "Off").click();
    });
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("off");
    expect(view.querySelector('[data-work-day="2026-10-04"]')?.getAttribute("data-work-state")).toBe("unknown");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await settle();
    expect(saves).toHaveLength(1);
    expect(view.querySelector("[data-work-schedule]")).not.toBeNull();
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("off");
    expect(view.querySelector('[data-work-day="2026-10-04"]')?.textContent).toContain("Not entered");
    expect(readFileSync("components/orient/WorkScheduleOperation.tsx", "utf8")).toContain("planWeekSave");
    expect(readFileSync("components/orient/OrientInstrument.tsx", "utf8")).toContain("saveWorkWeek");
  });

  it("writes nothing for an invalid shift and keeps a failed save", async () => {
    const saves: unknown[] = [];
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: {
        onSaveWorkWeek: async () => {
          saves.push("called");
          throw new Error("This week was not saved.");
        },
      },
    });
    await openManage(view);
    await act(async () => {
      buttonNamed(view, "Shift").click();
    });
    await setField(view, "Start for Sat, Oct 3", "09:00");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await settle();
    expect(saves).toEqual([]);
    expect(view.querySelector('[data-work-day="2026-10-03"] [role="alert"]')?.textContent).toContain(
      "A shift needs a start, an end, and Opening, Mid, or Closing.",
    );
    await act(async () => {
      buttonNamed(view, "Off").click();
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await settle();
    expect(saves).toEqual(["called"]);
    expect(view.querySelector("[role='alert']")?.textContent).toContain("This week was not saved.");
    expect(view.querySelector("[data-work-schedule]")).not.toBeNull();
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("off");
  });

  it("refuses to discard a dirty week from Close or Escape", async () => {
    const saves: unknown[] = [];
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: {
        onSaveWorkWeek: async () => {
          saves.push("called");
        },
      },
    });
    await openManage(view);
    await act(async () => {
      buttonNamed(view, "Off").click();
    });
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    expect(view.textContent).toContain("This week has unsaved changes.");
    expect(view.querySelector("[data-work-schedule]")).not.toBeNull();
    await act(async () => {
      buttonNamed(view, "Stay").click();
    });
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("off");
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(view.textContent).toContain("This week has unsaved changes.");
    expect(view.querySelector("[data-work-schedule]")).not.toBeNull();
    await act(async () => {
      buttonNamed(view, "Discard").click();
    });
    expect(view.querySelector("[data-work-schedule]")).toBeNull();
    expect(saves).toEqual([]);
  });

  it("moves only the Work fiscal week", async () => {
    const anchors: string[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      sources: { ...sources(), work: ready([]) },
    });
    await ask(view, "Week");
    expect(view.querySelector('[data-civil-day="2026-10-05"] [data-present-mark]')?.getAttribute("aria-label")).toBe("Now");
    const weekDays = [...view.querySelectorAll("[data-landscape] [data-civil-day]")].map((day) => day.getAttribute("data-civil-day"));
    await openManage(view);
    await act(async () => {
      buttonNamed(view, "Next fiscal week").click();
    });
    await settle();
    expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-10");
    expect([...view.querySelectorAll("[data-landscape] [data-civil-day]")].map((day) => day.getAttribute("data-civil-day"))).toEqual(weekDays);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    expect(anchors).toEqual([]);
    await act(async () => {
      buttonNamed(view, "Off").click();
    });
    await act(async () => {
      buttonNamed(view, "Next fiscal week").click();
    });
    expect(view.textContent).toContain("This week has unsaved changes.");
    expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-10");
    await act(async () => {
      buttonNamed(view, "Stay").click();
    });
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    await act(async () => {
      buttonNamed(view, "Discard").click();
    });
    await ask(view, "Month");
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    expect(view.querySelector("[data-landscape] [data-present-mark]")).toBeNull();
    expect(view.querySelector('[data-landscape] [aria-label="Now"]')).toBeNull();
  });

  it("uses the same operation on the phone sheet without leaving continuity", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    })) as typeof window.matchMedia;
    try {
      const view = await renderView({ sources: { ...sources(), work: ready([]) } });
      expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
      expect(view.querySelector("[data-day-signature]")).not.toBeNull();
      await openManage(view);
      expect(view.querySelector("[data-borrowed-surface]")?.getAttribute("data-borrowed-surface")).toBe("sheet");
      expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-03");
      expect(view.querySelectorAll("[data-work-day]")).toHaveLength(7);
      expect(view.querySelector("[data-day-signature]")).not.toBeNull();
      expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    } finally {
      window.matchMedia = original;
    }
  });

  it("keeps an opened unknown date out of the draft until a shift is entered", async () => {
    const saves: unknown[] = [];
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: { onSaveWorkWeek: async () => { saves.push("called"); } },
    });
    await openManage(view);
    await act(async () => {
      buttonNamed(view, "Shift").click();
    });
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("unknown");
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-open")).toBe("true");
    expect((view.querySelector('[data-emphasis="save"]') as HTMLButtonElement).disabled).toBe(true);
    expect(saves).toEqual([]);
  });

  it("keeps a finished shift while another date is selected", async () => {
    const anchors: string[] = [];
    const saves: unknown[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      sources: { ...sources(), work: ready([]) },
      actions: { onSaveWorkWeek: async () => { saves.push("called"); } },
    });
    await openManage(view);
    await enterShift(view, "Sat, Oct 3", "09:00", "17:00", "opening");
    await act(async () => {
      (view.querySelector('[aria-label="Shift for Sun, Oct 4"]') as HTMLButtonElement).click();
    });
    expect(view.textContent).not.toContain("This week has unsaved changes.");
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.textContent).toContain("09:00–17:00 Opening");
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("scheduled");
    expect(view.querySelector('[data-work-day="2026-10-04"]')?.getAttribute("data-work-state")).toBe("unknown");
    expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-03");
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    expect(saves).toEqual([]);
    expect(anchors).toEqual([]);
  });

  it("saves every changed date in one week write", async () => {
    const saves: { workOn: string; action: string; state?: string }[][] = [];
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: {
        onLoadWorkWeek: async () => [],
        onSaveWorkWeek: async (_weekStart, writes) => {
          saves.push(
            writes.map((write) => ({
              workOn: write.workOn,
              action: write.action,
              state: write.action === "save" ? write.entry.state : undefined,
            })),
          );
        },
      },
    });
    await openManage(view);
    await enterShift(view, "Sat, Oct 3", "06:00", "14:00", "opening");
    await enterShift(view, "Sun, Oct 4", "08:00", "16:00", "mid");
    await act(async () => {
      (view.querySelector('[aria-label="Off for Mon, Oct 5"]') as HTMLButtonElement).click();
    });
    await enterShift(view, "Tue, Oct 6", "14:00", "22:00", "closing");
    await enterShift(view, "Thu, Oct 8", "09:00", "17:00", "mid");
    await act(async () => {
      (view.querySelector('[aria-label="Off for Fri, Oct 9"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector('[data-work-day="2026-10-07"]')?.getAttribute("data-work-state")).toBe("unknown");
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.textContent).toContain("06:00–14:00 Opening");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await settle();
    expect(saves).toHaveLength(1);
    expect(saves[0]?.map((write) => write.workOn)).toEqual([
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(saves[0]?.find((write) => write.workOn === "2026-10-05")).toMatchObject({ action: "save", state: "off" });
    expect(saves[0]?.find((write) => write.workOn === "2026-10-07")).toBeUndefined();
  });

  it("saves a finished shift when another date was only opened", async () => {
    const saves: string[][] = [];
    let saved = false;
    const view = await renderView({
      sources: { ...sources(), work: ready([]) },
      actions: {
        onLoadWorkWeek: async () =>
          saved ? [{ workOn: "2026-10-03", state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "opening" }] : [],
        onSaveWorkWeek: async (_weekStart, writes) => {
          saves.push(writes.map((write) => write.workOn));
          saved = true;
        },
      },
    });
    await openManage(view);
    await enterShift(view, "Sat, Oct 3", "09:00", "17:00", "opening");
    await act(async () => {
      (view.querySelector('[aria-label="Shift for Sun, Oct 4"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    await settle();
    expect(saves).toEqual([["2026-10-03"]]);
    expect(view.querySelector('[data-work-day="2026-10-03"]')?.getAttribute("data-work-state")).toBe("scheduled");
    expect(view.querySelector('[data-work-day="2026-10-04"]')?.getAttribute("data-work-state")).toBe("unknown");
  });

  it("asks before leaving a dirty week for the previous fiscal week", async () => {
    const view = await renderView({ sources: { ...sources(), work: ready([]) } });
    await openManage(view);
    await act(async () => {
      buttonNamed(view, "Off").click();
    });
    await act(async () => {
      buttonNamed(view, "Previous fiscal week").click();
    });
    expect(view.textContent).toContain("This week has unsaved changes.");
    expect(view.querySelector("[data-work-schedule]")?.getAttribute("data-fiscal-week")).toBe("2026-10-03");
  });

  it("keeps the phone week draft when another date is selected", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    })) as typeof window.matchMedia;
    const saves: string[][] = [];
    try {
      const view = await renderView({
        sources: { ...sources(), work: ready([]) },
        actions: {
          onSaveWorkWeek: async (_weekStart, writes) => {
            saves.push(writes.map((write) => write.workOn));
          },
        },
      });
      await openManage(view);
      await enterShift(view, "Sat, Oct 3", "09:00", "17:00", "mid");
      await act(async () => {
        (view.querySelector('[aria-label="Shift for Sun, Oct 4"]') as HTMLButtonElement).click();
      });
      expect(view.querySelector("[data-day-signature]")).not.toBeNull();
      expect(view.querySelector('[data-work-day="2026-10-03"]')?.textContent).toContain("09:00–17:00 Mid");
      expect(view.querySelector('[data-work-day="2026-10-04"]')?.getAttribute("data-work-state")).toBe("unknown");
      expect(saves).toEqual([]);
      await act(async () => {
        buttonNamed(view, "Save").click();
      });
      await settle();
      expect(saves).toEqual([["2026-10-03"]]);
    } finally {
      window.matchMedia = original;
    }
  });
});

function weekBox(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function layWeek(view: HTMLElement) {
  const days = view.querySelector(".orient-landscape-days") as HTMLElement;
  Object.defineProperty(days, "clientWidth", { configurable: true, value: 700 });
  [...view.querySelectorAll<HTMLElement>(".orient-landscape-days .orient-column-body")].forEach((body, index) => {
    body.getBoundingClientRect = () => weekBox(index * 100, 0, 90, 1440);
  });
  return days;
}

function weekPoint(
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "lostpointercapture",
  id: number,
  x: number,
  y: number,
) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    pointerId: id,
    pointerType: "mouse",
    clientX: x,
    clientY: y,
  });
}

async function dispatchWeek(target: EventTarget, events: Event[]) {
  await act(async () => {
    for (const event of events) target.dispatchEvent(event);
  });
}

describe("desktop week direct temporal manipulation", () => {
  it("keeps the gesture out of persistence and realtime", () => {
    const landscape = readFileSync("components/orient/Landscape.tsx", "utf8");
    const coherence = readFileSync("components/orient/canonicalCoherence.ts", "utf8");
    expect(landscape).not.toContain("supabase");
    expect(landscape).not.toContain("updateBlock");
    expect(landscape).not.toContain("updateProtectedTime");
    expect(landscape).not.toContain("postgres_changes");
    expect(landscape).not.toContain("SELECTION_HOLD_MS");
    expect(landscape).not.toContain("SELECTION_MOVE_SLOP_PX");
    expect(landscape).not.toContain("snapMinute");
    expect(coherence).toContain("protected_time");
    expect(coherence).toContain("blocks");
    expect(coherence).toContain("commitments");
  });

  it("still inspects an eligible fact on click and keeps the keyboard editor", async () => {
    const updates: CanvasFactUpdate[] = [];
    const view = await renderView({ actions: { onUpdate: async (update) => void updates.push(update) } });
    await ask(view, "Week");
    const block = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    expect(block.tagName).toBe("BUTTON");
    expect(block.getAttribute("aria-label")).toContain("Write");
    block.focus();
    expect(document.activeElement).toBe(block);
    await act(async () => {
      block.click();
    });
    expect(view.textContent).toContain("These facts share this point.");
    await act(async () => {
      buttonNamed(view, "Block · Write").click();
    });
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    const start = view.querySelector('[aria-label="Fact start"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter?.call(start, "10:15");
      start.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: "block-1",
      meaning: "block",
      input: { kind: "timed", startsOn: ANCHOR, startLocal: "10:15", endLocal: "11:00", purpose: "Write", contextId: LAB_ID },
    });
  });

  it("does not lift Work, an all-day fact, or an overnight continuation", async () => {
    const view = await renderView({
      sources: {
        ...sources(),
        blocks: ready([
          block(),
          {
            ...defineBlock({ kind: "all_day", startsOn: ANCHOR, purpose: "Away", contextId: null }),
            id: "all-day-1",
            createdAt: "2026-10-05T00:00:00.000Z",
          },
          {
            ...defineBlock({
              kind: "timed",
              startsOn: ANCHOR,
              startLocal: "22:00",
              endLocal: "02:00",
              purpose: "Night",
              contextId: null,
            }),
            id: "night-1",
            createdAt: "2026-10-05T00:00:00.000Z",
          },
        ]),
      },
    });
    await ask(view, "Week");
    layWeek(view);
    const work = view.querySelector('[data-civil-day="2026-10-05"] [data-source-kind="work_schedule"]') as HTMLButtonElement;
    const allDay = view.querySelector('[data-source-id="all-day-1"]') as HTMLButtonElement;
    const continuation = view.querySelector('[data-civil-day="2026-10-06"] [data-source-id="night-1"]') as HTMLButtonElement;
    expect(allDay.classList.contains("orient-fact-all-day")).toBe(true);
    expect(continuation).not.toBeNull();
    await dispatchWeek(work, [weekPoint("pointerdown", 1, 40, 600), weekPoint("pointermove", 1, 40, 780), weekPoint("pointerup", 1, 40, 780)]);
    await dispatchWeek(allDay, [weekPoint("pointerdown", 2, 40, 20), weekPoint("pointermove", 2, 40, 200), weekPoint("pointerup", 2, 40, 200)]);
    await dispatchWeek(continuation, [
      weekPoint("pointerdown", 3, 140, 60),
      weekPoint("pointermove", 3, 140, 180),
      weekPoint("pointerup", 3, 140, 180),
    ]);
    expect(view.querySelector("[data-provisional]")).toBeNull();
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    await act(async () => {
      continuation.click();
    });
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(view.textContent).toContain("Night");
    expect(buttonNamed(view, "Edit")).not.toBeNull();
  });

  it("lifts after movement past the jitter floor and does not write", async () => {
    const updates: CanvasFactUpdate[] = [];
    const anchors: string[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      actions: { onUpdate: async (update) => void updates.push(update) },
    });
    await ask(view, "Week");
    layWeek(view);
    const block = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    const before = block.getAttribute("data-top");
    await dispatchWeek(block, [weekPoint("pointerdown", 4, 40, 600), weekPoint("pointermove", 4, 40, 608), weekPoint("pointerup", 4, 40, 608)]);
    expect(view.querySelector("[data-provisional]")).toBeNull();
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(updates).toEqual([]);
    await act(async () => {
      block.click();
    });
    expect(view.textContent).toContain("These facts share this point.");
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    await dispatchWeek(block, [weekPoint("pointerdown", 5, 40, 600), weekPoint("pointermove", 5, 42, 780)]);
    const provisional = view.querySelector("[data-provisional]") as HTMLElement;
    expect(provisional.tagName).toBe("DIV");
    expect(provisional.getAttribute("aria-hidden")).toBe("true");
    expect(view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]')?.getAttribute("data-top")).toBe(before);
    expect(updates).toEqual([]);
    expect(anchors).toEqual([]);
    await dispatchWeek(block, [
      weekPoint("pointerup", 5, 42, 787),
      new MouseEvent("click", { bubbles: true, detail: 1 }),
    ]);
    expect(view.querySelector("[data-provisional]")).toBeNull();
    expect(view.textContent).not.toContain("These facts share this point.");
    expect(view.textContent).toContain("10:00 AM");
    const date = view.querySelector('[aria-label="Fact date"]') as HTMLInputElement;
    const start = view.querySelector('[aria-label="Fact start"]') as HTMLInputElement;
    const end = view.querySelector('[aria-label="Fact end"]') as HTMLInputElement;
    expect(date.value).toBe("2026-10-05");
    expect(start.value).toBe("13:00");
    expect(end.value).toBe("14:00");
    expect(updates).toEqual([]);
    expect(anchors).toEqual([]);
    expect(view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="commitment-1"]')).not.toBeNull();
    expect(view.textContent).toContain("Write");
  });

  it("pans Week from territory and proposes another civil date when a lift crosses columns", async () => {
    const anchors: string[] = [];
    const updates: CanvasFactUpdate[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      actions: { onUpdate: async (update) => void updates.push(update) },
    });
    await ask(view, "Week");
    const days = layWeek(view);
    await dispatchWeek(days, [weekPoint("pointerdown", 6, 40, 600), weekPoint("pointermove", 6, 100, 600), weekPoint("pointerup", 6, 100, 600)]);
    expect(anchors).toEqual(["2026-10-04"]);
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(view.querySelector("[data-provisional]")).toBeNull();
    expect(updates).toEqual([]);
    anchors.length = 0;
    const again = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    await dispatchWeek(again, [weekPoint("pointerdown", 7, 40, 600), weekPoint("pointermove", 7, 42, 640)]);
    await act(async () => {
      days.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 48 }));
    });
    expect(anchors).toEqual([]);
    await dispatchWeek(again, [weekPoint("pointermove", 7, 140, 630), weekPoint("pointerup", 7, 140, 630)]);
    expect(anchors).toEqual([]);
    expect((view.querySelector('[aria-label="Fact date"]') as HTMLInputElement).value).toBe("2026-10-06");
    expect((view.querySelector('[aria-label="Fact start"]') as HTMLInputElement).value).toBe("10:30");
    expect((view.querySelector('[aria-label="Fact end"]') as HTMLInputElement).value).toBe("11:30");
    expect(updates).toEqual([]);
  });

  it("lifts an eligible block when horizontal movement dominates and does not pan the week", async () => {
    const anchors: string[] = [];
    const updates: CanvasFactUpdate[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      actions: { onUpdate: async (update) => void updates.push(update) },
    });
    await ask(view, "Week");
    layWeek(view);
    const block = () => view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    const probe = () => view.querySelector("[data-dtm-probe]") as HTMLElement;
    await dispatchWeek(block(), [weekPoint("pointerdown", 30, 40, 600), weekPoint("pointermove", 30, 70, 620)]);
    expect(view.querySelector("[data-provisional]")).not.toBeNull();
    expect(anchors).toEqual([]);
    expect(updates).toEqual([]);
    await dispatchWeek(block(), [weekPoint("pointerup", 30, -10, 620)]);
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(anchors).toEqual([]);
    await dispatchWeek(block(), [weekPoint("pointerdown", 31, 40, 600), weekPoint("pointermove", 31, 80, 600)]);
    expect(view.querySelector("[data-provisional]")).not.toBeNull();
    expect(probe().textContent).toContain("vertical no");
    expect(probe().textContent).toContain("qualified yes");
    expect(probe().textContent).toContain("lift yes");
    expect(anchors).toEqual([]);
    await dispatchWeek(block(), [weekPoint("pointerup", 31, -10, 600)]);
    expect(anchors).toEqual([]);
    expect(updates).toEqual([]);
    await dispatchWeek(block(), [weekPoint("pointerdown", 32, 40, 600), weekPoint("pointermove", 32, 840, 400)]);
    expect(probe().textContent).toContain("dx 800.0");
    expect(probe().textContent).toContain("dy -200.0");
    expect(probe().textContent).toContain("vertical no");
    expect(probe().textContent).toContain("qualified yes");
    expect(probe().textContent).toContain("lift yes");
    expect(anchors).toEqual([]);
    expect(updates).toEqual([]);
    await dispatchWeek(block(), [weekPoint("pointerup", 32, 140, 600)]);
    expect(anchors).toEqual([]);
    expect(updates).toEqual([]);
    expect((view.querySelector('[aria-label="Fact date"]') as HTMLInputElement).value).toBe("2026-10-06");
    expect((view.querySelector('[aria-label="Fact start"]') as HTMLInputElement).value).toBe("10:00");
    expect((view.querySelector('[aria-label="Fact end"]') as HTMLInputElement).value).toBe("11:00");
  });

  it("preserves an overnight relationship from the stored pair and lets Save keep the same id", async () => {
    const updates: CanvasFactUpdate[] = [];
    const anchors: string[] = [];
    const view = await renderView({
      onAnchor: (date) => anchors.push(date),
      actions: { onUpdate: async (update) => void updates.push(update) },
      sources: {
        ...sources(),
        blocks: ready([
          {
            ...defineBlock({
              kind: "timed",
              startsOn: ANCHOR,
              startLocal: "22:00",
              endLocal: "02:00",
              purpose: "Night",
              contextId: LAB_ID,
            }),
            id: "night-1",
            createdAt: "2026-10-05T00:00:00.000Z",
          },
        ]),
      },
    });
    await ask(view, "Week");
    layWeek(view);
    const night = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="night-1"]') as HTMLButtonElement;
    await dispatchWeek(night, [weekPoint("pointerdown", 8, 40, 1320), weekPoint("pointermove", 8, 40, 1410), weekPoint("pointerup", 8, 40, 1410)]);
    expect(updates).toEqual([]);
    expect(anchors).toEqual([]);
    expect(view.textContent).toContain("10:00 PM");
    expect((view.querySelector('[aria-label="Fact start"]') as HTMLInputElement).value).toBe("23:30");
    expect((view.querySelector('[aria-label="Fact end"]') as HTMLInputElement).value).toBe("03:30");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const start = view.querySelector('[aria-label="Fact start"]') as HTMLInputElement;
    await act(async () => {
      setter?.call(start, "23:07");
      start.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    expect(updates).toEqual([]);
    const again = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="night-1"]') as HTMLButtonElement;
    await dispatchWeek(again, [weekPoint("pointerdown", 9, 40, 1320), weekPoint("pointermove", 9, 40, 1410), weekPoint("pointerup", 9, 40, 1410)]);
    const refined = view.querySelector('[aria-label="Fact start"]') as HTMLInputElement;
    await act(async () => {
      setter?.call(refined, "23:07");
      refined.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: "night-1",
      meaning: "block",
      input: { kind: "timed", startsOn: ANCHOR, startLocal: "23:07", endLocal: "03:30", purpose: "Night", contextId: LAB_ID },
    });
    expect(anchors).toEqual([]);
  });

  it("cancels on pointer cancel, lost capture, Escape, gap, footer, and leaving desktop", async () => {
    const updates: CanvasFactUpdate[] = [];
    const anchors: string[] = [];
    const original = window.matchMedia;
    let phone = false;
    const listeners: EventListener[] = [];
    window.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes("max-width") ? phone : false;
      },
      media: query,
      addEventListener: (_type: string, listener: EventListener) => {
        if (query.includes("max-width")) listeners.push(listener);
      },
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    })) as typeof window.matchMedia;
    try {
      const view = await renderView({
        onAnchor: (date) => anchors.push(date),
        actions: { onUpdate: async (update) => void updates.push(update) },
      });
      await ask(view, "Week");
      const days = layWeek(view);
      const block = () => view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
      await dispatchWeek(block(), [weekPoint("pointerdown", 10, 40, 600), weekPoint("pointermove", 10, 40, 780), weekPoint("pointercancel", 10, 40, 780)]);
      expect(view.querySelector("[data-provisional]")).toBeNull();
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 11, 40, 600), weekPoint("pointermove", 11, 40, 780)]);
      await dispatchWeek(days, [weekPoint("lostpointercapture", 11, 40, 780)]);
      expect(view.querySelector("[data-provisional]")).toBeNull();
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 12, 40, 600), weekPoint("pointermove", 12, 40, 780)]);
      expect(view.querySelector("[data-provisional]")).not.toBeNull();
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      expect(view.querySelector("[data-provisional]")).toBeNull();
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 13, 40, 600), weekPoint("pointermove", 13, 40, 780), weekPoint("pointerup", 13, 95, 780)]);
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 14, 40, 600), weekPoint("pointermove", 14, 40, 780), weekPoint("pointerup", 14, 40, 1440)]);
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 15, 40, 600), weekPoint("pointermove", 15, 40, 780), weekPoint("pointerup", 15, -10, 780)]);
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      await dispatchWeek(block(), [weekPoint("pointerdown", 16, 40, 600), weekPoint("pointermove", 16, 40, 780)]);
      expect(view.querySelector("[data-provisional]")).not.toBeNull();
      phone = true;
      await act(async () => {
        for (const listener of listeners) listener(new Event("change"));
      });
      expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
      expect(view.querySelector("[data-provisional]")).toBeNull();
      await dispatchWeek(days, [weekPoint("pointerup", 16, 40, 780)]);
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
      expect(updates).toEqual([]);
      expect(anchors).toEqual([]);
    } finally {
      window.matchMedia = original;
    }
  });

  it("does not lift on phone Week", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    })) as typeof window.matchMedia;
    try {
      const view = await renderView();
      await ask(view, "Week");
      layWeek(view);
      const block = view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
      await dispatchWeek(block, [weekPoint("pointerdown", 17, 40, 600), weekPoint("pointermove", 17, 40, 780), weekPoint("pointerup", 17, 40, 780)]);
      expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
      expect(view.querySelector("[data-dtm-probe]")).toBeNull();
      expect(view.querySelector("[data-provisional]")).toBeNull();
      expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it("records a synthetic desktop week attempt on the temporary probe", async () => {
    const view = await renderView();
    await ask(view, "Week");
    const days = layWeek(view);
    const probe = () => view.querySelector("[data-dtm-probe]") as HTMLElement;
    const block = () => view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]') as HTMLButtonElement;
    expect(view.querySelector(".orient-landscape-days [data-dtm-probe]")).toBeNull();
    expect(probe().textContent).toContain("down no");
    expect(probe().textContent).toContain("detail no");
    await dispatchWeek(block(), [weekPoint("pointerdown", 21, 40, 600), weekPoint("pointermove", 21, 40, 608)]);
    expect(probe().textContent).toContain("down yes");
    expect(probe().textContent).toContain("eligible yes");
    expect(probe().textContent).toContain("pending yes");
    expect(probe().textContent).toContain("target button.orient-fact");
    expect(probe().textContent).toContain("type mouse");
    expect(probe().textContent).toContain("moves 1");
    expect(probe().textContent).toContain("dy 8.0");
    expect(probe().textContent).toContain("qualified no");
    expect(probe().textContent).toContain("lift no");
    expect(view.querySelector("[data-provisional]")).toBeNull();
    await dispatchWeek(block(), [weekPoint("pointerdown", 22, 40, 600), weekPoint("pointermove", 22, 42, 780)]);
    expect(probe().textContent).toContain("qualified yes");
    expect(probe().textContent).toContain("lift yes");
    expect(probe().textContent).toContain("capture-try yes");
    expect(probe().textContent).toContain("capture-threw no");
    expect(probe().textContent).toContain("capture yes");
    expect(probe().textContent).toContain("proposal-init yes");
    expect(probe().textContent).toContain("provisional yes");
    expect(probe().textContent).toContain("detail no");
    expect(view.querySelector("[data-provisional]")).not.toBeNull();
    expect(view.querySelector('[data-civil-day="2026-10-05"] [data-source-id="block-1"]')).not.toBeNull();
    await dispatchWeek(block(), [weekPoint("pointerup", 22, 42, 787)]);
    expect(probe().textContent).toContain("up yes (lifted)");
    expect(probe().textContent).toContain("column yes");
    expect(probe().textContent).toContain("proposal yes");
    expect(probe().textContent).toContain("detail yes");
    expect(view.querySelector('[aria-label="Fact date"]')).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-dtm-reset]") as HTMLButtonElement).click();
    });
    expect(probe().textContent).toContain("down no");
    expect(probe().textContent).toContain("detail no");
    expect(view.querySelector('[aria-label="Fact date"]')).not.toBeNull();
    await act(async () => {
      buttonNamed(view, "Close").click();
    });
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    await dispatchWeek(block(), [weekPoint("pointerdown", 23, 40, 600), weekPoint("pointermove", 23, 42, 780)]);
    await dispatchWeek(days, [weekPoint("lostpointercapture", 23, 42, 780)]);
    expect(probe().textContent).toContain("lost-capture yes (lifted)");
    expect(view.querySelector("[data-provisional]")).toBeNull();
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    await dispatchWeek(block(), [
      weekPoint("pointerdown", 24, 40, 600),
      weekPoint("pointermove", 24, 42, 780),
      weekPoint("pointercancel", 24, 42, 780),
    ]);
    expect(probe().textContent).toContain("cancel yes (lifted)");
    expect(view.querySelector("[data-provisional]")).toBeNull();
  });
});
