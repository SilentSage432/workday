/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CanvasFactUpdate } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { defineBlock, type Block } from "@/domain/block";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { capacityCoverage, projectCapacity } from "@/projections/capacity";

const ANCHOR = "2026-10-05";
const NOW = new Date("2026-10-05T10:30:00.000Z");
const BLOCK_ID = "33333333-3333-4333-8333-333333333333";
const CONTEXT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "55555555-5555-4555-8555-555555555555";
const PRIORITY_ID = "44444444-4444-4444-8444-444444444444";
const DESTINATION_ID = "66666666-6666-4666-8666-666666666666";
const CREATED_AT = "2026-10-01T15:00:00.000Z";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function block(input?: Partial<Parameters<typeof defineBlock>[0]> & { id?: string }): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "10:00",
      endLocal: "11:00",
      purpose: "Write",
      contextId: CONTEXT_ID,
      taskId: TASK_ID,
      ...input,
    }),
    id: input?.id ?? BLOCK_ID,
    createdAt: CREATED_AT,
  };
}

function commitment(input?: Partial<Parameters<typeof defineCommitment>[0]> & { id?: string }): Commitment {
  return {
    ...defineCommitment({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "10:00",
      endLocal: "11:00",
      title: "Meet",
      ...input,
    }),
    id: input?.id ?? "commitment-1",
    createdAt: CREATED_AT,
  };
}

function protectedTime(input?: Partial<Parameters<typeof defineProtectedTime>[0]>): ProtectedTime {
  return {
    ...defineProtectedTime({
      kind: "timed",
      startsOn: ANCHOR,
      startLocal: "10:00",
      endLocal: "11:00",
      label: "Family",
      ...input,
    }),
    id: "protected-1",
    createdAt: CREATED_AT,
  };
}

function sources(overrides?: Partial<OrientSources>): OrientSources {
  return {
    work: ready([{ workOn: ANCHOR, state: "scheduled", startLocal: "09:00", endLocal: "17:00", shiftType: "mid" }]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
    ...overrides,
  };
}

function contexts(): SourceRead<Context> {
  return ready([{ id: CONTEXT_ID, name: "TeamLab", createdAt: CREATED_AT }]);
}

function task(): Task {
  return {
    id: TASK_ID,
    title: "Cycle counts",
    contextId: null,
    createdAt: CREATED_AT,
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

const thread: ThreadReading = { status: "ready", active: true, taskId: TASK_ID, resumeTitle: "Cycle counts" };

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let restoreMedia: (() => void) | null = null;

function installMedia(phone: boolean) {
  restoreMedia?.();
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: phone && query.includes("max-width"),
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
  installMedia(false);
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

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}

async function setControl(input: HTMLInputElement, value: string) {
  await act(async () => {
    const prototype = Object.getPrototypeOf(input) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function Host({
  seed,
  now = NOW,
  anchor = ANCHOR,
  timeZone = "UTC",
  fail,
  apply,
  onAnchor,
  onUpdate,
}: {
  seed: OrientSources;
  now?: Date;
  anchor?: string;
  timeZone?: string;
  fail?: string;
  apply?: (update: CanvasFactUpdate, current: OrientSources) => OrientSources;
  onAnchor: (civilDate: string) => void;
  onUpdate: (update: CanvasFactUpdate) => void;
}) {
  const [current, setCurrent] = useState(seed);
  const [workSaves, setWorkSaves] = useState(0);
  const actions: OrientActions = {
    onEstablish: async () => {
      throw new Error("Establishment is not this correction.");
    },
    onUpdate: async (update) => {
      onUpdate(update);
      if (fail) throw new Error(fail);
      if (apply) setCurrent(apply(update, current));
    },
    onRemove: async () => {
      throw new Error("Delete is not this correction.");
    },
    onSignOut: () => {},
    onStartThread: async () => {},
    onLeaveThread: async () => {},
    onCompleteTask: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onTasksChanged: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {
      setWorkSaves((count) => count + 1);
    },
  };
  return (
    <div data-work-saves={workSaves}>
      <OrientView
        timeZone={timeZone}
        now={now}
        anchor={anchor}
        onAnchor={onAnchor}
        loaded={experienceLoadWindow(anchor)}
        sources={current}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={thread}
        capture={captureBridge()}
        actions={actions}
      />
    </div>
  );
}

async function renderHost(input: Omit<Parameters<typeof Host>[0], "phone" | "onAnchor" | "onUpdate"> & { phone?: boolean }) {
  const anchors: string[] = [];
  const updates: CanvasFactUpdate[] = [];
  installMedia(input.phone === true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <Host
        seed={input.seed}
        now={input.now}
        anchor={input.anchor}
        timeZone={input.timeZone}
        fail={input.fail}
        apply={input.apply}
        onAnchor={(civilDate) => {
          anchors.push(civilDate);
        }}
        onUpdate={(update) => {
          updates.push(update);
        }}
      />,
    );
  });
  return { view: container, anchors, updates };
}

async function openFact(view: HTMLElement, kind: string) {
  const button = view.querySelector(`button[data-source-kind="${kind}"]`) as HTMLButtonElement | null;
  if (!button) throw new Error(`Missing ${kind} fact`);
  await act(async () => {
    button.click();
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

function dateInput(view: ParentNode): HTMLInputElement {
  const input = view.querySelector('[aria-label="Fact date"]') as HTMLInputElement | null;
  if (!input) throw new Error("Missing fact date");
  return input;
}

async function editTimedBlock(view: HTMLElement, question: "Week" | "Month") {
  await ask(view, question);
  expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe(question.toLowerCase());
  const field = view.querySelector("[data-landscape]") as HTMLElement | null;
  expect(field?.getAttribute("data-distance")).toBe(question.toLowerCase());
  const button = field?.querySelector('button[data-source-kind="block"]') as HTMLButtonElement | null;
  if (!button) throw new Error(`Missing block on ${question}`);
  await act(async () => {
    button.click();
  });
  const shared = view.querySelector("[data-overlap-list]");
  if (shared) {
    await act(async () => {
      buttonNamed(shared, "Block · Write").click();
    });
  }
  await act(async () => {
    buttonNamed(view, "Edit").click();
  });
  const inspection = view.querySelector("[data-fact-inspection]") as HTMLElement | null;
  if (!inspection) throw new Error(`Missing inspection on ${question}`);
  const date = inspection.querySelector('[aria-label="Fact date"]') as HTMLInputElement | null;
  const start = inspection.querySelector('[aria-label="Fact start"]') as HTMLInputElement | null;
  expect(date?.type).toBe("date");
  expect(date?.disabled).toBe(false);
  expect(date?.readOnly).toBe(false);
  expect(date?.value).toBe(ANCHOR);
  expect(start?.value).toBe("10:00");
  await act(async () => {
    buttonNamed(inspection, "Close").click();
  });
}

describe("timed fact civil-date correction", () => {
  it("keeps a protected time's identity and clock, then lets capacity follow the reloaded row", async () => {
    const original = protectedTime();
    const { view, anchors, updates } = await renderHost({
      seed: sources({ protectedTime: ready([original]) }),
      apply: (update, current) => {
        if (update.meaning !== "protected_time") throw new Error("Expected protected time.");
        return {
          ...current,
          protectedTime: ready([{ ...update.input, id: update.id, createdAt: original.createdAt }]),
        };
      },
    });
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("desktop");
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    await openFact(view, "protected_time");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    const date = dateInput(view);
    expect(date.value).toBe(ANCHOR);
    await setControl(date, "2026-10-08");
    expect(updates).toHaveLength(0);
    expect(anchors).toEqual([]);
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: "protected-1",
      meaning: "protected_time",
      input: { kind: "timed", startsOn: "2026-10-08", startLocal: "10:00", endLocal: "11:00", label: "Family" },
    });
    expect(updates[0]?.input).not.toHaveProperty("createdAt");
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector('button[data-source-kind="protected_time"]')).toBeNull();
    expect(view.querySelector("[data-fact-inspection]")).toBeNull();
    expect(view.querySelector("[data-work-saves]")?.getAttribute("data-work-saves")).toBe("0");

    const moved = protectedTime({ startsOn: "2026-10-08" });
    const oldDay = cover([original], "2026-10-05", "2026-10-06");
    const oldAfter = cover([moved], "2026-10-05", "2026-10-06");
    const newDay = cover([moved], "2026-10-08", "2026-10-09");
    expect(oldDay.status).toBe("covered");
    expect(oldAfter.status).toBe("covered");
    expect(newDay.status).toBe("covered");
    if (oldDay.status !== "covered" || oldAfter.status !== "covered" || newDay.status !== "covered") return;
    expect(oldDay.intervals).toHaveLength(1);
    expect(oldAfter.intervals).toHaveLength(0);
    expect(newDay.intervals).toHaveLength(1);
    expect(projectCapacity({ boundary: dayBoundary("2026-10-05", "2026-10-06"), covered: oldAfter.intervals }).remainingMs).toBeGreaterThan(
      projectCapacity({ boundary: dayBoundary("2026-10-05", "2026-10-06"), covered: oldDay.intervals }).remainingMs,
    );
  });

  it("moves a block in one save and leaves its relationships in place", async () => {
    const original = block();
    const serviceEstablishedAt = "2026-10-02T00:00:00.000Z";
    const { view, anchors, updates } = await renderHost({
      seed: sources({
        blocks: ready([original]),
        priorities: ready([
          {
            id: PRIORITY_ID,
            content: "Keep the bench",
            destinationId: DESTINATION_ID,
            establishedAt: CREATED_AT,
          },
        ]),
        blockPriorityService: ready([{ blockId: BLOCK_ID, priorityId: PRIORITY_ID, establishedAt: serviceEstablishedAt }]),
      }),
      apply: (update, current) => {
        if (update.meaning !== "block") throw new Error("Expected a block.");
        return {
          ...current,
          blocks: ready([{ ...update.input, id: update.id, createdAt: original.createdAt }]),
        };
      },
    });
    await openFact(view, "block");
    expect(view.querySelector("[data-fact-inspection]")?.textContent).toContain("Serves priority · Keep the bench");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    await setControl(dateInput(view), "2026-10-06");
    await setControl(view.querySelector('[aria-label="Fact start"]') as HTMLInputElement, "11:00");
    await setControl(view.querySelector('[aria-label="Fact end"]') as HTMLInputElement, "12:00");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: BLOCK_ID,
      meaning: "block",
      input: {
        kind: "timed",
        startsOn: "2026-10-06",
        startLocal: "11:00",
        endLocal: "12:00",
        purpose: "Write",
        contextId: CONTEXT_ID,
        taskId: TASK_ID,
      },
    });
    expect(updates[0]?.input).not.toHaveProperty("createdAt");
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector('button[data-source-kind="block"]')).toBeNull();
    const inspection = view.querySelector("[data-fact-inspection]");
    expect(inspection?.textContent).toContain("Write");
    expect(inspection?.textContent).toContain("Serves priority · Keep the bench");
    expect(inspection?.textContent).toContain("Cycle counts");
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(buttonNamed(inspection as HTMLElement, "Edit")).toBeTruthy();
  });

  it("moves a commitment without replacing its provenance", async () => {
    const original = commitment();
    const { view, updates } = await renderHost({
      seed: sources({ commitments: ready([original]) }),
    });
    await openFact(view, "commitment");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    await setControl(dateInput(view), "2026-10-08");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toEqual([
      expect.objectContaining({
        id: "commitment-1",
        meaning: "commitment",
        input: expect.objectContaining({
          kind: "timed",
          startsOn: "2026-10-08",
          startLocal: "10:00",
          endLocal: "11:00",
          title: "Meet",
          origin: "user_created",
        }),
      }),
    ]);
    expect(updates[0]?.input).not.toHaveProperty("createdAt");
    expect(updates[0]?.input).not.toHaveProperty("id");
  });

  it("keeps a same-day clock edit on the stored civil date", async () => {
    const { view, anchors, updates } = await renderHost({
      seed: sources({ blocks: ready([block()]) }),
    });
    await openFact(view, "block");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    expect(dateInput(view).value).toBe(ANCHOR);
    await setControl(view.querySelector('[aria-label="Fact end"]') as HTMLInputElement, "12:00");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates[0]).toMatchObject({
      id: BLOCK_ID,
      input: { kind: "timed", startsOn: ANCHOR, startLocal: "10:00", endLocal: "12:00", purpose: "Write", contextId: CONTEXT_ID, taskId: TASK_ID },
    });
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-fact-inspection]")).not.toBeNull();
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
  });

  it("keeps overnight local times when only the civil date changes", async () => {
    const { view, updates } = await renderHost({
      seed: sources({ commitments: ready([commitment({ id: "commitment-night", startLocal: "22:00", endLocal: "06:00", title: "Watch" })]) }),
    });
    await ask(view, "Day");
    await openFact(view, "commitment");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    await setControl(dateInput(view), "2026-10-08");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates[0]).toMatchObject({
      id: "commitment-night",
      input: { kind: "timed", startsOn: "2026-10-08", startLocal: "22:00", endLocal: "06:00", title: "Watch", origin: "user_created" },
    });
  });

  it("keeps the draft and the viewpoint when the writer fails", async () => {
    const { view, anchors, updates } = await renderHost({
      seed: sources({ blocks: ready([block()]) }),
      fail: "Could not save this block.",
    });
    const viewpoint = view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint");
    await openFact(view, "block");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    await setControl(dateInput(view), "2026-10-08");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(view.querySelector("[role='alert']")?.textContent).toContain("Could not save this block.");
    expect(dateInput(view).value).toBe("2026-10-08");
    expect(buttonNamed(view, "Save")).toBeTruthy();
    expect(view.querySelector('button[data-source-kind="block"]')).not.toBeNull();
    expect(anchors).toEqual([]);
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe(viewpoint);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
  });

  it("refuses a draft date whose local clock does not occur, without writing", async () => {
    const { view, updates } = await renderHost({
      seed: sources({ blocks: ready([block({ startsOn: "2026-03-07", startLocal: "02:30", endLocal: "03:30" })]) }),
      now: new Date("2026-03-07T08:00:00.000Z"),
      anchor: "2026-03-07",
      timeZone: "America/New_York",
    });
    await openFact(view, "block");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    await setControl(dateInput(view), "2026-03-08");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(0);
    expect(view.querySelector("[role='alert']")?.textContent).toContain("Save stays unavailable");
    expect(dateInput(view).value).toBe("2026-03-08");
    expect((view.querySelector('[aria-label="Fact start"]') as HTMLInputElement).value).toBe("02:30");
    expect((view.querySelector('[aria-label="Fact end"]') as HTMLInputElement).value).toBe("03:30");
  });

  it("offers the date field when a timed block is edited from Week and from Month", async () => {
    const { view } = await renderHost({
      seed: sources({ blocks: ready([block()]) }),
    });
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("desktop");
    await editTimedBlock(view, "Week");
    await editTimedBlock(view, "Month");
  });

  it("offers the same date field from phone Week", async () => {
    const { view } = await renderHost({
      phone: true,
      seed: sources({ blocks: ready([block()]) }),
    });
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
    await editTimedBlock(view, "Week");
  });

  it("offers the same date field on the phone", async () => {
    const { view } = await renderHost({
      phone: true,
      seed: sources({ blocks: ready([block()]) }),
    });
    expect(view.querySelector("[data-form]")?.getAttribute("data-form")).toBe("phone");
    await openFact(view, "block");
    const shared = view.querySelector("[data-overlap-list]");
    if (shared) {
      await act(async () => {
        buttonNamed(shared, "Block · Write").click();
      });
    }
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    expect(dateInput(view).value).toBe(ANCHOR);
    expect(view.querySelector("[data-phone-reading]")?.getAttribute("data-phone-reading")).toBe("true");
  });

  it("corrects an all-day fact civil date on the same id without inventing clocks", async () => {
    const original = {
      ...defineBlock({ kind: "all_day", startsOn: ANCHOR, purpose: "Family day", contextId: null, taskId: null }),
      id: BLOCK_ID,
      createdAt: CREATED_AT,
    };
    const { view, anchors, updates } = await renderHost({
      seed: sources({ blocks: ready([original]) }),
      apply: (update, current) => {
        if (update.meaning !== "block" || update.input.kind !== "all_day") return current;
        return {
          ...current,
          blocks: ready([{ ...defineBlock(update.input), id: update.id, createdAt: CREATED_AT }]),
        };
      },
    });
    await openFact(view, "block");
    expect(view.querySelector("[data-fact-inspection]")?.getAttribute("data-fact-kind")).toBe("all-day");
    expect(buttonNamed(view, "Edit")).toBeTruthy();
    expect(buttonNamed(view, "Delete this fact")).toBeTruthy();
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    expect(view.querySelector('[data-fact-edit="all-day"]')).not.toBeNull();
    expect(view.querySelector('[aria-label="Fact start"]')).toBeNull();
    expect(view.querySelector('[aria-label="Fact end"]')).toBeNull();
    await setControl(dateInput(view), "2026-10-08");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: BLOCK_ID,
      meaning: "block",
      input: { kind: "all_day", startsOn: "2026-10-08", purpose: "Family day" },
    });
    expect(updates[0]?.input).not.toHaveProperty("startLocal");
    expect(updates[0]?.input).not.toHaveProperty("endLocal");
    expect(anchors).toEqual([]);
  });

  it("does not attach the date field to a work shift", async () => {
    const { view, updates } = await renderHost({ seed: sources() });
    await openFact(view, "work_schedule");
    expect(view.querySelector('[aria-label="Fact date"]')).toBeNull();
    expect(buttonNamed(view, "Edit the work week")).toBeTruthy();
    expect(updates).toHaveLength(0);
    expect(view.querySelector("[data-work-saves]")?.getAttribute("data-work-saves")).toBe("0");
  });
});

function dayBoundary(start: string, end: string) {
  return { start: new Date(`${start}T00:00:00.000Z`), end: new Date(`${end}T00:00:00.000Z`) };
}

function cover(rows: ProtectedTime[], start: string, end: string) {
  return capacityCoverage({
    boundary: dayBoundary(start, end),
    timeZone: "UTC",
    protectedTime: rows,
    blocks: [],
    commitments: [],
  });
}
