/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { signaturePlacement } from "@/components/orient/phoneSignature";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";

const ANCHOR = "2026-10-05";
const LAB_ID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-10-05T10:30:00.000Z");

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

function sources(work: OrientSources["work"] = ready([{ workOn: ANCHOR, state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }])): OrientSources {
  return {
    work,
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
  return ready([{ id: LAB_ID, name: "TeamLab", createdAt: "2026-10-01T00:00:00.000Z" }]);
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
let restoreMedia: (() => void) | null = null;

function installMedia(matches: (query: string) => boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  })) as typeof window.matchMedia;
  restoreMedia = () => {
    window.matchMedia = original;
  };
}

beforeEach(() => {
  installMedia((query) => query.includes("max-width"));
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

async function renderPhone(overrides?: {
  now?: Date;
  anchor?: string;
  sources?: OrientSources;
  thread?: ThreadReading;
  onAnchor?: (civilDate: string) => void;
  onEstablish?: (establishment: CanvasEstablishment) => Promise<void>;
}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <OrientView
        timeZone="UTC"
        now={overrides?.now ?? NOW}
        anchor={overrides?.anchor ?? ANCHOR}
        onAnchor={overrides?.onAnchor ?? (() => {})}
        loaded={experienceLoadWindow(overrides?.anchor ?? ANCHOR)}
        sources={overrides?.sources ?? sources()}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={overrides?.thread ?? { status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
        capture={captureBridge()}
        actions={actions({ onEstablish: overrides?.onEstablish })}
      />,
    );
  });
  return container;
}

async function rerenderPhone(overrides?: {
  now?: Date;
  anchor?: string;
  onAnchor?: (civilDate: string) => void;
}) {
  await act(async () => {
    root?.render(
      <OrientView
        timeZone="UTC"
        now={overrides?.now ?? NOW}
        anchor={overrides?.anchor ?? ANCHOR}
        onAnchor={overrides?.onAnchor ?? (() => {})}
        loaded={experienceLoadWindow(overrides?.anchor ?? ANCHOR)}
        sources={sources()}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={{ status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
        capture={captureBridge()}
        actions={actions()}
      />,
    );
  });
}

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
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

function pointer(type: "pointerdown" | "pointerup" | "pointermove", id: number, clientY = 4) {
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

describe("phone temporal continuity", () => {
  it("reads Present from authoritative Now, every containing truth, and an independent thread", async () => {
    const view = await renderPhone();
    await ask(view, "Present");
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("true");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.querySelector("[data-phone-now]")?.textContent).toMatch(/10:30/);
    const memberships = [...view.querySelectorAll("[data-membership] button")];
    expect(memberships.map((item) => item.getAttribute("data-source-kind"))).toEqual(["work_schedule", "block", "commitment"]);
    expect(view.querySelector("[data-membership]")?.getAttribute("data-coexistence")).toBe("true");
    expect(view.querySelector("[data-rank], [data-primary], [data-winner]")).toBeNull();
    expect(view.querySelector("[data-phone-reading]")?.textContent).not.toMatch(/current activity|recommended|coming next|priority|urgent/i);
    const thread = view.querySelector("[data-phone-thread]") as HTMLButtonElement;
    expect(thread.textContent).toContain("Resume: Cycle counts");
    expect(thread.hasAttribute("data-kind")).toBe(false);
    const work = signaturePlacement(9 * 60, 17 * 60);
    const blockSpan = signaturePlacement(10 * 60, 11 * 60);
    expect(view.querySelector('[data-day-signature] [data-source-id="block-1"]')?.getAttribute("data-start")).toBe(String(blockSpan.start));
    expect(view.querySelector('[data-day-signature] [data-source-id="block-1"]')?.getAttribute("data-width")).toBe(String(blockSpan.width));
    expect(view.querySelector("[data-day-signature] [data-source-kind='work_schedule']")?.getAttribute("data-start")).toBe(String(work.start));
    expect(view.querySelector("[data-signature-now]")).not.toBeNull();
    expect(view.querySelector("[data-capture-control]")).not.toBeNull();
    expect(view.querySelector("[data-portrait]")?.getAttribute("data-portrait")).toBe("field");
    expect(view.querySelector("[data-region='where'] [data-phone-now]")).not.toBeNull();
    expect(view.querySelector("[data-region='around'] [data-membership]")).not.toBeNull();
    expect(view.querySelector("[data-region='around'] [data-phone-thread]")).not.toBeNull();
    expect(view.querySelector("[data-region='around'] [data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-region='reach'] [data-exact-time]")).not.toBeNull();
    expect(view.querySelector("[data-phone-thread] input, [data-phone-thread] textarea")).toBeNull();
  });

  it("states a quiet absence and keeps a failed thread distinct from absence", async () => {
    const absent = await renderPhone({
      now: new Date("2026-10-05T18:30:00.000Z"),
      thread: { status: "ready", active: false, taskId: null, resumeTitle: null },
    });
    await ask(absent, "Present");
    expect(absent.querySelector("[data-membership-empty]")?.textContent).toContain("No established truth contains this instant.");
    expect(absent.querySelector("[data-phone-thread]")?.textContent).toContain("No thread is established.");
    expect(absent.querySelector("[data-day-signature]")?.textContent).not.toMatch(/\bfree\b|\bavailable\b/i);
    act(() => {
      root?.unmount();
    });
    const failed = await renderPhone({ thread: { status: "failed", message: "The thread could not be read." } });
    await ask(failed, "Present");
    expect(failed.querySelector("[data-phone-thread]")?.textContent).toContain("The thread could not be read.");
    expect(failed.querySelector("[data-phone-thread]")?.textContent).not.toContain("No thread is established.");
    expect(failed.querySelector("[data-membership] [data-source-kind='block']")).not.toBeNull();
  });

  it("inspects signature material and opens exact time at the touched minute", async () => {
    const anchors: string[] = [];
    const view = await renderPhone({ onAnchor: (date) => anchors.push(date) });
    const blockMark = view.querySelector('[data-day-signature] [data-source-id="block-1"]') as HTMLButtonElement;
    await act(async () => {
      blockMark.click();
    });
    expect(view.textContent).toContain("These facts share this point.");
    expect(view.textContent).toContain("Write");
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("reading");
    expect(anchors).toEqual([]);
    const ground = view.querySelector("[data-signature-ground]") as HTMLButtonElement;
    ground.getBoundingClientRect = () =>
      ({
        left: 0,
        width: 240,
        top: 0,
        height: 48,
        right: 240,
        bottom: 48,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    await act(async () => {
      ground.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 120, detail: 1 }));
    });
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("exact");
    expect(view.querySelector("[data-exact-minute]")?.getAttribute("data-exact-minute")).toBe("720");
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("false");
    expect(view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`)).not.toBeNull();
    expect(anchors).toEqual([]);
    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("true");
    expect(anchors).toEqual([]);
  });

  it("does not invent a minute when exact time is entered from the keyboard", async () => {
    const view = await renderPhone();
    const ground = view.querySelector("[data-signature-ground]") as HTMLButtonElement;
    await act(async () => {
      ground.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(view.querySelector("[data-exact-minute]")?.getAttribute("data-exact-minute")).toBe("");
    expect(view.querySelector("[data-time-surface]")).not.toBeNull();
  });

  it("keeps Day as the selected civil day and still refines a draft on the same clock", async () => {
    const view = await renderPhone();
    await ask(view, "Day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct");
    expect(view.querySelector("[data-day-reading]")?.getAttribute("data-order")).toBe("clock");
    expect(view.querySelector("[data-phone-now]")).toBeNull();
    expect(view.querySelector("[data-region='where'] [data-phone-day]")).not.toBeNull();
    expect(view.querySelector("[data-region='around'] [data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-region='reach'] [data-exact-time]")).not.toBeNull();
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-exact-time]") as HTMLButtonElement).click();
    });
    const surface = view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`) as HTMLElement;
    expect(surface).not.toBeNull();
    const scroller = view.querySelector("[data-field-scroll]") as HTMLElement;
    scroller.scrollTop = 40;
    await act(async () => {
      surface.dispatchEvent(pointer("pointerdown", 8));
      surface.dispatchEvent(pointer("pointerup", 8));
    });
    surface.getBoundingClientRect = () => clockBox();
    const endHandle = view.querySelector('[data-edge="end"]') as HTMLButtonElement;
    await act(async () => {
      endHandle.dispatchEvent(pointer("pointerdown", 9, 180));
      endHandle.dispatchEvent(pointer("pointermove", 9, 180));
      endHandle.dispatchEvent(pointer("pointerup", 9, 180));
    });
    expect((view.querySelector('[aria-label="Interval end"]') as HTMLInputElement).value).toBe("03:00");
    expect(scroller.scrollTop).toBe(40);
    await act(async () => {
      buttonNamed(view, "Protect this time").click();
    });
    expect(view.querySelector('[aria-label="Protected time label"]')).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-capture-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-capture-surface]")).not.toBeNull();
    expect(scroller.scrollTop).toBe(40);
    expect(view.querySelector("[data-exact-minute]")?.getAttribute("data-exact-minute")).toBe("");
  });

  it("keeps Week and Month on the shared field and asks Day as phone orientation", async () => {
    const anchors: string[] = [];
    const view = await renderPhone({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Week");
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("false");
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-distance")).toBe("week");
    expect(view.querySelector(".orient-phone")).toBeNull();
    await ask(view, "Month");
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    const ground = view.querySelector('[data-ask-day="2026-10-08"]') as HTMLButtonElement;
    await act(async () => {
      ground.click();
    });
    expect(anchors).toEqual(["2026-10-08"]);
    await act(async () => {
      root?.render(
        <OrientView
          timeZone="UTC"
          now={NOW}
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
    expect(view.querySelector("[data-phone-question]")?.getAttribute("data-phone-question")).toBe("day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct 8");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.querySelector("[data-day-signature]")).not.toBeNull();
  });

  it("quiets other Context-bearing facts without naming a current Context", async () => {
    const view = await renderPhone();
    await ask(view, "Present");
    await act(async () => {
      (view.querySelector("[data-focus-control]") as HTMLButtonElement).click();
    });
    await act(async () => {
      buttonNamed(view, "TeamLab").click();
    });
    expect(view.querySelector("[data-membership] [data-source-kind='block']")?.getAttribute("data-emphasis")).toBe("ordinary");
    expect(view.querySelector("[data-membership] [data-source-kind='work_schedule']")?.getAttribute("data-emphasis")).toBe("quiet");
    expect(view.querySelector("[data-membership] [data-source-kind='commitment']")?.getAttribute("data-emphasis")).toBe("ordinary");
    expect(view.querySelector("[data-phone-reading]")?.textContent).not.toMatch(/current context/i);
  });

  it("names Work Off without calling the day free", async () => {
    const view = await renderPhone({
      now: new Date("2026-10-05T18:30:00.000Z"),
      sources: sources(ready([{ workOn: ANCHOR, state: "off" }])),
      thread: { status: "ready", active: false, taskId: null, resumeTitle: null },
    });
    expect(view.querySelector("[data-work-off]")?.textContent).toContain("Off");
    expect(view.querySelector("[data-day-signature]")?.textContent).not.toMatch(/\bfree\b|\bavailable\b/i);
  });
});

describe("phone entry", () => {
  it("opens a fresh phone on Day for the authoritative civil date", async () => {
    const anchors: string[] = [];
    const view = await renderPhone({ onAnchor: (date) => anchors.push(date) });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-question-control]")?.textContent).toContain("Day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct 5");
    expect(view.querySelector("[data-phone-now]")).toBeNull();
    expect(view.querySelector(".orient-phone-now-quiet")?.textContent).toMatch(/10:30/);
    expect(view.querySelector("[data-day-reading][data-order='clock']")).not.toBeNull();
    expect(view.querySelector("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-signature-now]")).not.toBeNull();
    expect(view.querySelector("[data-phone-thread]")?.textContent).toContain("Resume: Cycle counts");
    expect(view.querySelector("[data-exact-time]")).not.toBeNull();
    expect(view.textContent).not.toContain("Oct 3");
    expect(anchors).toEqual([]);

    await rerenderPhone({ now: new Date("2026-10-06T01:00:00.000Z"), onAnchor: (date) => anchors.push(date) });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct 5");
    expect(view.querySelector(".orient-phone-now-quiet")).toBeNull();
    expect(view.querySelector("[data-signature-now]")).toBeNull();
    expect(anchors).toEqual([]);
  });

  it("keeps a chosen question through passive clock updates", async () => {
    const anchors: string[] = [];
    const onAnchor = (date: string) => anchors.push(date);
    const view = await renderPhone({ onAnchor });
    await ask(view, "Present");
    expect(view.querySelector("[data-phone-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-reading]")).toBeNull();
    await rerenderPhone({ now: new Date("2026-10-05T10:31:00.000Z"), onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(anchors).toEqual([]);

    await ask(view, "Week");
    await rerenderPhone({ now: new Date("2026-10-05T10:32:00.000Z"), onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("week");
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-distance")).toBe("week");

    await ask(view, "Month");
    await rerenderPhone({ now: new Date("2026-10-05T10:33:00.000Z"), onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("month");
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    expect(anchors).toEqual([]);
  });

  it("returns from Present to the Day that Month asked for", async () => {
    const anchors: string[] = [];
    const onAnchor = (date: string) => anchors.push(date);
    const view = await renderPhone({ onAnchor });
    await ask(view, "Month");
    await act(async () => {
      (view.querySelector('[data-ask-day="2026-10-08"]') as HTMLButtonElement).click();
    });
    expect(anchors).toEqual(["2026-10-08"]);
    await rerenderPhone({ anchor: "2026-10-08", onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct 8");
    expect(view.querySelector("[data-signature-now]")).toBeNull();
    expect(view.querySelector(".orient-phone-now-quiet")).toBeNull();

    await ask(view, "Present");
    expect(anchors).toEqual(["2026-10-08", ANCHOR]);
    await rerenderPhone({ anchor: ANCHOR, onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector("[data-phone-now]")?.textContent).toMatch(/10:30/);
    expect(view.querySelector("[data-membership] [data-source-kind='block']")).not.toBeNull();
    expect(view.querySelector("[data-day-reading]")).toBeNull();

    await ask(view, "Day");
    expect(anchors).toEqual(["2026-10-08", ANCHOR, "2026-10-08"]);
    await rerenderPhone({ anchor: "2026-10-08", onAnchor });
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-phone-day]")?.textContent).toContain("Oct 8");
  });
});

describe("desktop composition", () => {
  it("reads Present on the accepted desktop reading when the instrument is not a phone", async () => {
    restoreMedia?.();
    installMedia((query) => query.includes("reduce"));
    const view = await renderPhone();
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("desktop");
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("false");
    expect(view.querySelector(".orient-phone")).toBeNull();
    expect(view.querySelector(".orient-desktop")).not.toBeNull();
    expect(view.querySelector("[data-desktop-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    const mark = view.querySelector("[data-orient-identity] img") as HTMLImageElement;
    expect(mark.getAttribute("src")).toBe("/orient-logo.png");
    expect(mark.alt).toBe("Orient");
    expect(mark.closest("button, a")).toBeNull();
  });
});

describe("production identity", () => {
  it("uses one canonical mark and does not make it a control", async () => {
    const source = readFileSync("components/orient/OrientIdentity.tsx", "utf8");
    expect(source).toContain('src="/orient-logo.png"');
    expect(source).not.toContain("Desktop");
    expect(readFileSync("public/orient-logo.png").byteLength).toBeGreaterThan(0);

    const view = await renderPhone();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelectorAll("[data-orient-identity]")).toHaveLength(1);
    const mark = view.querySelector("[data-orient-identity] img") as HTMLImageElement;
    expect(mark.tagName).toBe("IMG");
    expect(mark.getAttribute("src")).toBe("/orient-logo.png");
    expect(mark.getAttribute("alt")).toBe("Orient");
    expect(mark.alt).not.toMatch(/png|filename/i);
    expect(mark.closest("button, a")).toBeNull();
    expect(mark.getAttribute("tabindex")).toBeNull();

    await ask(view, "Present");
    await ask(view, "Week");
    await ask(view, "Month");
    expect(view.querySelectorAll("[data-orient-identity]")).toHaveLength(1);
    expect(view.querySelector("[data-orient-identity] img")?.getAttribute("src")).toBe("/orient-logo.png");
  });
});
