/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import { desktopSpanCopy } from "@/components/orient/DesktopReading";
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

function overnight(): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "22:00",
      endLocal: "06:00",
      title: "Watch",
    }),
    id: "commitment-night",
    createdAt: "2026-10-05T00:00:00.000Z",
  };
}

function sources(crossDay = false, workOff = false): OrientSources {
  return {
    work: ready(
      workOff
        ? [{ workOn: ANCHOR, state: "off" }]
        : [{ workOn: ANCHOR, state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }],
    ),
    protectedTime: ready([]),
    blocks: ready([block()]),
    commitments: ready(crossDay ? [commitment(), overnight()] : [commitment()]),
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
    plannedLocal: null,
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

function actions(): OrientActions {
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
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let restoreMedia: (() => void) | null = null;

function installMedia(matches: (query: string) => boolean) {
  restoreMedia?.();
  restoreMedia = null;
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

async function renderView(options?: {
  phone?: boolean;
  anchor?: string;
  now?: Date;
  thread?: ThreadReading;
  onAnchor?: (civilDate: string) => void;
  crossDay?: boolean;
  workOff?: boolean;
}) {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  installMedia((query) => (options?.phone ? query.includes("max-width") : false));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const anchor = options?.anchor ?? ANCHOR;
  await act(async () => {
    root?.render(
      <OrientView
        timeZone="UTC"
        now={options?.now ?? NOW}
        anchor={anchor}
        onAnchor={options?.onAnchor ?? (() => {})}
        loaded={experienceLoadWindow(anchor)}
        sources={sources(options?.crossDay, options?.workOff)}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={options?.thread ?? { status: "ready", active: true, taskId: "task-1", resumeTitle: "Cycle counts" }}
        capture={captureBridge()}
        actions={actions()}
      />,
    );
  });
  if (!container) throw new Error("Missing view.");
  return container;
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

describe("desktop reading", () => {
  it("mounts the accepted reading on desktop width and the phone reading when narrow", async () => {
    const desktop = await renderView();
    expect(desktop.querySelector("[data-form]")?.getAttribute("data-form")).toBe("desktop");
    expect(desktop.querySelector("[data-composition]")).toBeNull();
    expect(desktop.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(desktop.querySelector(".orient-desktop")).not.toBeNull();
    expect(desktop.querySelector("[data-time-surface]")).toBeNull();
    expect(desktop.querySelector(".orient-phone")).toBeNull();
    expect(desktop.querySelector("[data-desktop-thread]")).not.toBeNull();
    expect(desktop.querySelector("[data-active-thread]")).toBeNull();

    const phone = await renderView({ phone: true });
    expect(phone.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
    expect(phone.querySelector(".orient-phone")).not.toBeNull();
    expect(phone.querySelector(".orient-desktop")).toBeNull();
    expect(phone.querySelector("[data-time-surface]")).toBeNull();
  });

  it("reads Present from authoritative Now and peer truths, with the thread apart from them", async () => {
    const view = await renderView({});
    expect(view.querySelector("[data-region='where'] [data-desktop-now]")?.textContent).toMatch(/10:30/);
    expect(view.querySelector("[data-desktop-now]")?.textContent).toContain("Oct");
    const memberships = [...view.querySelectorAll("[data-membership] button")];
    expect(memberships.map((item) => item.getAttribute("data-source-kind"))).toEqual(["work_schedule", "block", "commitment"]);
    expect(view.querySelector("[data-membership]")?.getAttribute("data-coexistence")).toBe("true");
    expect(view.querySelector("[data-rank], [data-primary], [data-winner]")).toBeNull();
    const thread = view.querySelector("[data-desktop-thread]") as HTMLButtonElement;
    expect(thread.textContent).toContain("Resume: Cycle counts");
    expect(thread.hasAttribute("data-kind")).toBe(false);
    expect(view.querySelector("[data-active-thread]")).toBeNull();
    expect(view.querySelector("[data-desktop-thread]")?.closest("[data-membership]")).toBeNull();
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    expect(view.querySelector("[data-day-field]")).toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelector(".orient-desktop-hours")).toBeNull();
    expect(view.querySelector("[data-signature-ground]")).toBeNull();
    expect(view.querySelector("[data-signature-now]")).toBeNull();
    expect(view.querySelector("[data-signature-role]")).toBeNull();
    expect(view.querySelector(".orient-desktop-field")).toBeNull();
    const reading = view.querySelector(".orient-desktop")?.textContent ?? "";
    expect(reading).not.toContain("12:00 AM");
    expect(reading).not.toContain("6:00 AM");
    expect(reading).not.toContain("12:00 PM");
    expect(reading).not.toContain("6:00 PM");
    const exact = view.querySelector("[data-exact-time]") as HTMLButtonElement;
    expect(exact.textContent?.trim()).toBe("Exact time");
    expect(exact.getAttribute("data-present-precision")).toBe("true");
    expect(exact.closest("[data-day-signature], .orient-desktop-field")).toBeNull();
  });

  it("opens Exact time from Present without a day signature", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await act(async () => {
      (view.querySelector("[data-present-precision]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("exact");
    expect(view.querySelector("[data-exact-minute]")?.getAttribute("data-exact-minute")).toBe("");
    expect(view.querySelector("[data-time-surface]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop")).toBeNull();
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    const frame = view.querySelector("[data-exact-frame]");
    expect(frame?.querySelector("[data-orientation-return]")).not.toBeNull();
    expect(frame?.textContent).toContain("Exact time");
    expect(frame?.textContent).toContain("Oct 5");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(anchors).toEqual([]);
    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-desktop-question]")?.getAttribute("data-desktop-question")).toBe("present");
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    expect(view.querySelector("[data-present-precision]")).not.toBeNull();
    expect(anchors).toEqual([]);
  });

  it("keeps Day on the selected civil date and does not place Now on another date", async () => {
    const view = await renderView({ anchor: "2026-10-08" });
    await ask(view, "Day");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 8");
    expect(view.querySelector(".orient-desktop-now-quiet")).toBeNull();
    expect(view.querySelector("[data-region='where']")?.textContent).not.toMatch(/\bNow\b/);
    expect(view.querySelector("[data-signature-now]")).toBeNull();
    expect(view.querySelector("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-day-field]")).toBeNull();
    expect(view.querySelector("[data-day-inscription]")?.closest("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop-hours")).not.toBeNull();
    expect(view.querySelector("[data-signature-ground]")).not.toBeNull();
    expect(view.querySelector("[data-day-reading]")?.getAttribute("data-order")).toBe("clock");
    expect(view.querySelector("[data-signature-role]")?.getAttribute("data-signature-role")).toBe("structure");
    expect(view.querySelector("[data-exact-time]")).not.toBeNull();
    expect(view.querySelector("[data-present-precision]")).toBeNull();
    expect(view.querySelector("[data-desktop-now]")).toBeNull();
  });

  it("keeps Day's whole-day signature and Now when the selected day is today", async () => {
    const view = await renderView({});
    await ask(view, "Day");
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    expect(view.querySelector(".orient-desktop-now-quiet")?.textContent).toMatch(/Now/);
    expect(view.querySelector(".orient-desktop-now-quiet")?.textContent).toMatch(/10:30/);
    const work = signaturePlacement(9 * 60, 17 * 60);
    expect(view.querySelector("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop-hours")?.textContent).toContain("12:00 AM");
    expect(view.querySelector(".orient-desktop-hours")?.textContent).toContain("6:00 PM");
    expect(view.querySelector('[data-day-signature] [data-source-id="block-1"]')?.getAttribute("data-start")).toBe(
      String(signaturePlacement(10 * 60, 11 * 60).start),
    );
    expect(view.querySelector("[data-day-signature] [data-source-kind='work_schedule']")?.getAttribute("data-width")).toBe(
      String(work.width),
    );
    expect(view.querySelector("[data-signature-now]")).not.toBeNull();
    expect(view.querySelector("[data-day-field]")).toBeNull();
    expect(view.querySelector("[data-day-inscription]")?.closest("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-signature-role]")?.getAttribute("data-signature-role")).toBe("structure");
    expect(view.querySelector("[data-day-signature]")?.getAttribute("aria-label")).toMatch(/Established shape/);
    expect(view.querySelector("[data-day-signature]")?.getAttribute("aria-label")).toMatch(/Unmarked time is not established/);
    expect(view.querySelector("[data-day-signature]")?.textContent).not.toMatch(/\bfree\b|\bavailable\b|\bopen\b/i);
    expect(view.querySelector("[data-day-signature]")?.textContent).not.toMatch(/Write|Meet/);
    expect(view.querySelector("[data-day-signature]")?.contains(view.querySelector("[data-desktop-thread]"))).toBe(false);
    expect(view.querySelector("[data-day-reading] [data-source-id='block-1']")).not.toBeNull();
    expect(view.querySelector("[data-exact-time]")?.closest(".orient-desktop-field")).not.toBeNull();
    expect(view.querySelector("[data-exact-time]")?.closest("[data-day-inscription]")).toBeNull();
    expect(view.querySelector(".orient-desktop [data-work-off]")).toBeNull();
  });

  it("keeps Work Off off desktop Day and on Week, Month, and Exact time", async () => {
    const view = await renderView({ workOff: true });
    await ask(view, "Day");
    expect(view.querySelector("[data-day-inscription]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop [data-work-off]")).toBeNull();
    expect(view.querySelector(".orient-desktop")?.textContent).not.toMatch(/\bOff\b/);
    const hours = view.querySelector(".orient-desktop-hours")?.textContent ?? "";
    expect(hours).toContain("12:00 AM");
    expect(hours).toContain("6:00 AM");
    expect(hours).toContain("12:00 PM");
    expect(hours).toContain("6:00 PM");
    expect(view.querySelector("[data-signature-now]")).not.toBeNull();
    expect(view.querySelector('[data-day-signature] [data-source-id="block-1"]')?.getAttribute("data-start")).toBe(
      String(signaturePlacement(10 * 60, 11 * 60).start),
    );
    expect(view.querySelector("[data-day-signature] [data-source-kind='work_schedule']")).toBeNull();

    await act(async () => {
      (view.querySelector("[data-exact-time]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-time-surface]")).not.toBeNull();
    expect(view.querySelector("[data-work-off]")?.textContent).toContain("Off");

    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(view.querySelector(".orient-desktop [data-work-off]")).toBeNull();

    await ask(view, "Week");
    expect(view.querySelector("[data-landscape] [data-work-off]")?.textContent).toContain("Off");

    await ask(view, "Month");
    expect(view.querySelector("[data-landscape] [data-work-off]")?.textContent).toContain("Off");
  });

  it("keeps overlapping Day truths coexistent on the day inscription", async () => {
    const view = await renderView({});
    await ask(view, "Day");
    await act(async () => {
      (view.querySelector('[data-day-inscription] [data-source-id="block-1"]') as HTMLButtonElement).click();
    });
    const shared = view.querySelector("[data-overlap-list]");
    expect(shared?.textContent).toContain("These facts share this point.");
    expect(shared?.textContent).toContain("Write");
    expect(shared?.textContent).toContain("Meet");
    expect(view.querySelector("[data-depth]")?.getAttribute("data-depth")).toBe("reading");
    expect(view.querySelector("[data-rank], [data-primary], [data-winner]")).toBeNull();
  });

  it("keeps both civil dates when a Day fact leaves the selected day", async () => {
    const view = await renderView({ crossDay: true });
    await ask(view, "Day");
    const night = view.querySelector('[data-day-reading] [data-source-id="commitment-night"] .orient-membership-interval');
    expect(night?.textContent).toMatch(/Oct 5/);
    expect(night?.textContent).toMatch(/Oct 6/);
    expect(night?.textContent).toMatch(/10:00 PM/);
    expect(night?.textContent).toMatch(/6:00 AM/);
  });

  it("enters the existing clock for Exact time and returns without moving the anchor", async () => {
    const anchors: string[] = [];
    const view = await renderView({ onAnchor: (date) => anchors.push(date) });
    await ask(view, "Day");
    const intervals = [...view.querySelectorAll("[data-day-reading] .orient-membership-interval")].map((item) => item.textContent ?? "");
    expect(intervals).toContain("10:00 AM – 11:00 AM");
    expect(intervals).toContain("9:00 AM – 5:00 PM");
    expect(intervals.join(" ")).not.toMatch(/Mon, Oct/);
    const signature = view.querySelector("[data-day-signature]") as HTMLElement;
    signature.dataset.kept = "yes";
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
    expect(view.querySelector("[data-time-surface]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop")).toBeNull();
    const frame = view.querySelector("[data-exact-frame]");
    expect(frame?.querySelector("[data-orientation-return]")).not.toBeNull();
    expect(frame?.textContent).toContain("Exact time");
    expect(frame?.textContent).toContain("Oct 5");
    expect(view.querySelector("[data-time-surface]")?.contains(frame)).toBe(false);
    expect(view.querySelector(`[data-civil-day="${ANCHOR}"] [data-time-surface]`)).not.toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(anchors).toEqual([]);
    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-desktop-reading]")?.getAttribute("data-desktop-reading")).toBe("true");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector("[data-desktop-day]")?.textContent).toContain("Oct 5");
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    expect(anchors).toEqual([]);
  });

  it("keeps one borrowed surface and does not remount the reading when that surface opens", async () => {
    const view = await renderView({});
    const reading = view.querySelector(".orient-desktop") as HTMLElement;
    reading.dataset.kept = "yes";
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    const capture = view.querySelector("[data-capture-control]") as HTMLButtonElement;
    await act(async () => {
      capture.click();
    });
    expect(view.querySelectorAll("[role='dialog']")).toHaveLength(1);
    expect(view.querySelector("[role='dialog']")?.getAttribute("data-borrowed-surface")).toBe("drawer");
    expect(view.querySelector("[role='dialog']")?.getAttribute("aria-modal")).toBe("false");
    expect(view.querySelector("[data-capture-surface]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop")?.getAttribute("data-kept")).toBe("yes");
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    expect(document.activeElement).toBe(view.querySelector("[role='dialog']"));
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await Promise.resolve();
    });
    expect(view.querySelector("[role='dialog']")).toBeNull();
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
    expect(view.querySelector(".orient-desktop")?.getAttribute("data-kept")).toBe("yes");
    expect(view.querySelector("[data-day-signature]")).toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(document.activeElement).toBe(capture);

    await act(async () => {
      capture.click();
    });
    await act(async () => {
      (view.querySelector("[data-question-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelectorAll("[role='dialog']")).toHaveLength(1);
    expect(view.querySelector("[data-capture-surface]")).toBeNull();
    expect(view.querySelector("[data-question-list]")).not.toBeNull();
  });

  it("keeps the wordmark noninteractive and Week and Month on the shared landscape", async () => {
    const view = await renderView({});
    const mark = view.querySelector("[data-orient-identity] img") as HTMLImageElement;
    expect(view.querySelectorAll("[data-orient-identity]")).toHaveLength(1);
    expect(mark.getAttribute("src")).toBe("/orient-logo.png");
    expect(mark.alt).toBe("Orient");
    expect(mark.closest("button, a")).toBeNull();

    await ask(view, "Week");
    expect(view.querySelector(".orient-desktop")).toBeNull();
    expect(view.querySelector("[data-landscape]")?.getAttribute("data-distance")).toBe("week");
    expect(view.querySelector("[data-desktop-span]")?.textContent).toBe(desktopSpanCopy("2026-10-05", "2026-10-11"));
    expect(view.querySelector("[data-active-thread]")).not.toBeNull();
    expect(view.querySelector("[data-direction-plane]")).toBeNull();

    await ask(view, "Month");
    expect(view.querySelector("[data-month-geometry]")?.getAttribute("data-month-geometry")).toBe("7x4");
    expect(view.querySelector("[data-desktop-span]")?.textContent).toBe(desktopSpanCopy("2026-10-05", "2026-11-01"));
    expect(view.querySelector("[data-desktop-window]")?.contains(view.querySelector("[data-direction-plane]"))).toBe(false);
    const direction = view.querySelector("[data-direction-plane]");
    expect(direction).not.toBeNull();
    expect(direction?.closest("[role='dialog']")).toBeNull();
    expect(direction?.textContent).not.toMatch(/2026|Oct/);
  });

  it("stays on the phone reading when the viewport is narrow", async () => {
    const view = await renderView({ phone: true });
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    expect(view.querySelector(".orient-phone")).not.toBeNull();
    expect(view.querySelector(".orient-desktop")).toBeNull();
    expect(view.querySelector("[data-day-signature]")).not.toBeNull();
    expect(view.querySelector("[data-day-field]")).toBeNull();
    expect(view.querySelector("[data-day-inscription]")).toBeNull();
    expect(view.querySelector("[data-signature-now]")).not.toBeNull();
    expect(view.querySelector("[data-desktop-span]")).toBeNull();
    expect(view.querySelector("[data-time-surface]")).toBeNull();
    const mark = view.querySelector("[data-orient-identity] img") as HTMLImageElement;
    expect(mark.getAttribute("src")).toBe("/orient-logo.png");
    expect(mark.closest("button, a")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-exact-time]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-time-surface]")).not.toBeNull();
    expect(view.querySelector(".orient-desktop")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-orientation-return]") as HTMLButtonElement).click();
    });
    expect(view.querySelector(".orient-phone")).not.toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("day");
    await act(async () => {
      (view.querySelector("[data-capture-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-capture-surface]")).not.toBeNull();
    expect(view.querySelector("[role='dialog']")?.getAttribute("aria-modal")).toBeNull();
    expect(view.querySelector("[role='dialog']")?.getAttribute("data-borrowed-surface")).toBe("sheet");
  });
});

describe("desktop reading seam", () => {
  it("serves the accepted reading from /, keeps the historical instrument, and retires the inspection route", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const instrument = readFileSync("app/instrument/page.tsx", "utf8");
    const phone = readFileSync("components/orient/PhoneContinuity.tsx", "utf8");
    const clock = readFileSync("components/orient/DayField.tsx", "utf8");
    const frame = readFileSync("components/AppFrame.tsx", "utf8");
    const desktop = readFileSync("components/orient/DesktopReading.tsx", "utf8");
    const css = readFileSync("components/orient/orient.css", "utf8");
    expect(page).toContain("OrientInstrument");
    expect(page).not.toContain("desktop-reading");
    expect(() => readFileSync("app/desktop-reading/page.tsx", "utf8")).toThrow();
    expect(instrument).toContain("InstrumentPrototype");
    expect(instrument).not.toContain("DesktopReading");
    expect(phone).not.toContain("desktop-reading");
    expect(phone).not.toContain("DesktopReading");
    expect(phone).toContain('data-day-signature="true"');
    expect(clock).not.toContain("desktop-reading");
    expect(clock).not.toContain("DesktopReading");
    expect(frame).toContain(".getSession()");
    expect(frame).toContain('pathname === "/"');
    expect(frame).not.toContain("/desktop-reading");
    expect(frame).not.toContain("DesktopReading");
    expect(frame).not.toContain("data-day-signature");
    expect(desktop).toContain('data-day-inscription="true"');
    expect(desktop).not.toContain("data-day-field");
    expect(desktop).not.toContain("data-work-off");
    expect(phone).toContain("data-work-off");
    expect(clock).toContain("data-work-off");
    expect(css).not.toContain("clamp(7.5rem, 18vh, 10.75rem)");
    expect(css).not.toContain("inset 0 1px 0 var(--orient-work), inset 0 -1px 0 var(--orient-work)");
    expect(css).toContain('.orient[data-form="desktop"]');
    expect(css).not.toContain("data-composition");
    expect(css).toContain("@media (min-width: 960px)");
    expect(css).not.toContain('.orient-desktop[data-desktop-question="present"] .orient-desktop-signature');
  });
});
