/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { CanvasEstablishment } from "@/components/canvasEstablishment";
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
    onUpdateTask: async () => {},
    onTasksChanged: () => {},
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
