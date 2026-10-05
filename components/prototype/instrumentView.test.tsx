/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { CanvasEstablishment } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { Context } from "@/domain/context";
import { InstrumentView, type InstrumentSources } from "@/components/prototype/InstrumentView";
import { prototypeLoadWindow } from "@/components/prototype/instrumentModel";

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

function sources(): InstrumentSources {
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
  sources?: InstrumentSources;
  onEstablish?: (establishment: CanvasEstablishment) => Promise<void>;
}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onEstablish = overrides?.onEstablish ?? (async () => {});
  await act(async () => {
    root?.render(
      <InstrumentView
        timeZone="UTC"
        now={new Date("2026-10-05T18:30:00.000Z")}
        anchor={ANCHOR}
        onAnchor={() => {}}
        loaded={prototypeLoadWindow(ANCHOR)}
        sources={overrides?.sources ?? sources()}
        contexts={contexts()}
        openTasks={ready([])}
        thread={{ status: "ready", active: false, resumeTitle: null }}
        capture={<p>Capture forms</p>}
        onEstablish={onEstablish}
        onUpdate={async () => {}}
        onRemove={async () => {}}
        onSignOut={() => {}}
      />,
    );
  });
  return container;
}

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}

function pointer(type: "pointerdown" | "pointerup", id: number) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    pointerId: id,
    pointerType: "mouse",
    clientX: 4,
    clientY: 4,
  });
}

describe("instrument prototype", () => {
  it("keeps the field still through capture, focus, and question changes", async () => {
    const calls: CanvasEstablishment[] = [];
    const view = await renderView({ onEstablish: async (establishment) => { calls.push(establishment); } });
    const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
    const blockMark = view.querySelector('[data-source-id="block-1"]') as HTMLElement;
    const before = blockMark.getAttribute("data-top");
    scroller.scrollTop = 120;

    await act(async () => {
      buttonNamed(view, "Capture").click();
    });
    expect(view.querySelector("[data-reach-strip]")?.getAttribute("data-reach-job")).toBe("capture");
    expect(scroller.scrollTop).toBe(120);
    expect(view.querySelector("[data-field]")).not.toBeNull();

    await act(async () => {
      buttonNamed(view, "Close capture").click();
    });
    expect(view.querySelector("[data-reach-strip]")?.getAttribute("data-reach-job")).toBe("resting");
    expect(scroller.scrollTop).toBe(120);

    const focus = view.querySelector('[aria-label="Context focus"]') as HTMLSelectElement;
    await act(async () => {
      focus.value = LAB_ID;
      focus.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const blockAfter = view.querySelector('[data-source-id="block-1"]') as HTMLElement;
    const workAfter = view.querySelector('[data-source-kind="work_schedule"]') as HTMLElement;
    const commitmentAfter = view.querySelector('[data-source-id="commitment-1"]') as HTMLElement;
    expect(blockAfter.getAttribute("data-top")).toBe(before);
    expect(blockAfter.getAttribute("data-emphasis")).toBe("ordinary");
    expect(workAfter.getAttribute("data-emphasis")).toBe("quiet");
    expect(commitmentAfter.getAttribute("data-emphasis")).toBe("ordinary");
    expect(workAfter.style.width).toBe("100%");
    expect(blockAfter.style.width).toBe("100%");
    expect(scroller.scrollTop).toBe(120);

    await act(async () => {
      buttonNamed(view, "Week").click();
    });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    expect(view.querySelector("[data-compressed-field]")).not.toBeNull();
    expect(view.querySelector("[data-direction-plane]")).toBeNull();
    expect(view.textContent).not.toContain("Allocatable remainder");
    expect(view.textContent).not.toContain("Protect this time");
    expect(view.querySelector("[data-compressed-field] input")).toBeNull();

    await act(async () => {
      buttonNamed(view, "Month").click();
    });
    const direction = view.querySelector("[data-direction-plane]") as HTMLElement;
    expect(direction).not.toBeNull();
    expect(view.textContent).toContain("No direction is established.");
    expect(view.textContent).not.toMatch(/progress|capacity/i);
    direction.scrollTop = 30;
    expect(scroller.scrollTop).toBe(0);
    scroller.scrollTop = 120;
    expect(direction.scrollTop).toBe(30);

    await act(async () => {
      buttonNamed(view, "Day").click();
    });
    expect(view.querySelector("[data-field-scroll]")?.scrollTop).toBe(120);
    expect(view.querySelector("[data-active-thread]")?.textContent).toBe("No thread is established.");
    expect(calls).toEqual([]);
  });

  it("keeps Save as the establishment boundary", async () => {
    const calls: CanvasEstablishment[] = [];
    const view = await renderView({ onEstablish: async (establishment) => { calls.push(establishment); } });
    const surface = view.querySelector("[data-time-surface]") as HTMLElement;
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 1));
      surface.dispatchEvent(pointer("pointerup", 1));
    });
    expect(view.querySelector("[data-reach-job]")?.getAttribute("data-reach-job")).toBe("temporal-reference");
    const reference = view.querySelector("[data-temporal-reference]") as HTMLElement;
    const top = reference?.getAttribute("style");
    await act(async () => {
      buttonNamed(view, "Cancel").click();
    });
    expect(calls).toEqual([]);
    expect(view.querySelector("[data-reach-job]")?.getAttribute("data-reach-job")).toBe("resting");

    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 2));
      surface.dispatchEvent(pointer("pointerup", 2));
    });
    expect(view.querySelector("[data-temporal-reference]")?.getAttribute("style")).toBe(top);
    await act(async () => {
      buttonNamed(view, "Protect this time").click();
    });
    await act(async () => {
      buttonNamed(view, "Save").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.meaning).toBe("protected_time");
  });

  it("withholds a failed temporal read instead of painting a bare clock", async () => {
    const view = await renderView({
      sources: { ...sources(), work: { status: "failed", message: "Work could not be read." } },
    });
    expect(view.querySelector("[data-reading='incomplete']")?.textContent).toContain("withheld");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.textContent).not.toContain("Allocatable remainder");
  });
});
