/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CanvasEstablishment, CanvasFactRemoval, CanvasFactUpdate } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { defineBlock, type Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";
import { capacityCoverage } from "@/projections/capacity";
import { composeDayCanvas } from "@/projections/dayCanvas";

const ANCHOR = "2026-10-05";
const NOW = new Date("2026-10-05T10:30:00.000Z");
const BLOCK_ID = "33333333-3333-4333-8333-333333333333";
const PT_ID = "11111111-1111-4111-8111-111111111111";
const COMMITMENT_ID = "77777777-7777-4777-8777-777777777777";
const CONTEXT_ID = "22222222-2222-4222-8222-222222222222";
const CREATED_AT = "2026-10-01T15:00:00.000Z";

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
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
    ...EMPTY_EXTERNAL_ORIENT_SOURCES,
    ...overrides,
  };
}

function contexts(): SourceRead<Context> {
  return ready([{ id: CONTEXT_ID, name: "TeamLab", createdAt: CREATED_AT }]);
}

function captureBridge(): CaptureBridge {
  return { session: readyCaptureSession(), update: () => {}, saving: false, saveError: null, submit: async () => null };
}

const thread: ThreadReading = { status: "ready", active: false, taskId: null, resumeTitle: null };

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
  installMedia(true);
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
  onEstablish,
  onUpdate,
  onRemove,
}: {
  seed: OrientSources;
  onEstablish: (establishment: CanvasEstablishment) => void;
  onUpdate: (update: CanvasFactUpdate) => void;
  onRemove: (removal: CanvasFactRemoval) => void;
}) {
  const [current, setCurrent] = useState(seed);
  const actions: OrientActions = {
    onEstablish: async (establishment) => {
      onEstablish(establishment);
      if (establishment.meaning === "protected_time") {
        const row: ProtectedTime = {
          ...establishment.input,
          id: PT_ID,
          createdAt: CREATED_AT,
        } as ProtectedTime;
        setCurrent((prior) => ({ ...prior, protectedTime: ready([...prior.protectedTime.status === "ready" ? prior.protectedTime.rows : [], row]) }));
      } else if (establishment.meaning === "block") {
        const row: Block = { ...establishment.input, id: BLOCK_ID, createdAt: CREATED_AT } as Block;
        setCurrent((prior) => ({ ...prior, blocks: ready([...prior.blocks.status === "ready" ? prior.blocks.rows : [], row]) }));
      } else {
        const row: Commitment = { ...establishment.input, id: COMMITMENT_ID, createdAt: CREATED_AT } as Commitment;
        setCurrent((prior) => ({
          ...prior,
          commitments: ready([...prior.commitments.status === "ready" ? prior.commitments.rows : [], row]),
        }));
      }
    },
    onUpdate: async (update) => {
      onUpdate(update);
      if (update.meaning === "protected_time") {
        setCurrent((prior) => ({
          ...prior,
          protectedTime: ready([{ ...(update.input as ProtectedTime), id: update.id, createdAt: CREATED_AT }]),
        }));
      } else if (update.meaning === "block") {
        setCurrent((prior) => ({
          ...prior,
          blocks: ready([{ ...(update.input as Block), id: update.id, createdAt: CREATED_AT }]),
        }));
      } else {
        setCurrent((prior) => ({
          ...prior,
          commitments: ready([{ ...(update.input as Commitment), id: update.id, createdAt: CREATED_AT }]),
        }));
      }
    },
    onRemove: async (removal) => {
      onRemove(removal);
      if (removal.meaning === "protected_time") {
        setCurrent((prior) => ({
          ...prior,
          protectedTime: ready((prior.protectedTime.status === "ready" ? prior.protectedTime.rows : []).filter((row) => row.id !== removal.id)),
        }));
      } else if (removal.meaning === "block") {
        setCurrent((prior) => ({
          ...prior,
          blocks: ready((prior.blocks.status === "ready" ? prior.blocks.rows : []).filter((row) => row.id !== removal.id)),
        }));
      } else {
        setCurrent((prior) => ({
          ...prior,
          commitments: ready((prior.commitments.status === "ready" ? prior.commitments.rows : []).filter((row) => row.id !== removal.id)),
        }));
      }
    },
    onSignOut: () => {},
    onStartThread: async () => {},
    onLeaveThread: async () => {},
    onCompleteTask: async () => {},
    onSatisfyStewardship: async () => {},
    onWithdrawStewardship: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onTasksChanged: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
  };
  return (
    <OrientView
      timeZone="UTC"
      now={NOW}
      anchor={ANCHOR}
      onAnchor={() => {}}
      loaded={experienceLoadWindow(ANCHOR)}
      sources={current}
      contexts={contexts()}
      tasks={ready([] as Task[])}
      thread={thread}
      capture={captureBridge()}
      actions={actions}
    />
  );
}

async function renderHost(phone: boolean, seed: OrientSources = sources()) {
  installMedia(phone);
  const establishes: CanvasEstablishment[] = [];
  const updates: CanvasFactUpdate[] = [];
  const removals: CanvasFactRemoval[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <Host
        seed={seed}
        onEstablish={(item) => establishes.push(item)}
        onUpdate={(item) => updates.push(item)}
        onRemove={(item) => removals.push(item)}
      />,
    );
  });
  return { view: container, establishes, updates, removals };
}

async function openAllDayFromAdd(view: HTMLElement) {
  await act(async () => {
    (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
  });
  expect(view.querySelector("[data-add-chooser]")).not.toBeNull();
  await act(async () => {
    (view.querySelector('[data-add-choice="all-day"]') as HTMLButtonElement).click();
  });
  expect(view.querySelector("[data-all-day-establishment]")).not.toBeNull();
}

async function establishMeaning(view: HTMLElement, meaning: "protected_time" | "block" | "commitment", field: { label?: string; purpose?: string; title?: string }) {
  await act(async () => {
    (view.querySelector(`[data-all-day-meaning="${meaning}"]`) as HTMLButtonElement).click();
  });
  if (field.label !== undefined) {
    await setControl(view.querySelector('[aria-label="Protected time label"]') as HTMLInputElement, field.label);
  }
  if (field.purpose !== undefined) {
    await setControl(view.querySelector('[aria-label="Block purpose"]') as HTMLInputElement, field.purpose);
  }
  if (field.title !== undefined) {
    await setControl(view.querySelector('[aria-label="Commitment title"]') as HTMLInputElement, field.title);
  }
  await act(async () => {
    buttonNamed(view, "Establish").click();
  });
}

describe("all-day authority reachability", () => {
  it("exposes all-day establishment on phone ADD without LOOK · + · ACT redesign", async () => {
    const { view } = await renderHost(true);
    expect(view.querySelector("[data-reach-grammar='look-add-act']")).not.toBeNull();
    expect(view.querySelector("[data-look-control]")).not.toBeNull();
    expect(view.querySelector("[data-add-control]")).not.toBeNull();
    expect(view.querySelector("[data-act-control]")).not.toBeNull();
    await openAllDayFromAdd(view);
    expect(view.querySelector('[data-add-choice="task"]')).toBeNull();
    expect(view.textContent).toMatch(/No clock times/i);
  });

  it("establishes all-day Protected Time, Block, and Commitment through existing writers", async () => {
    const { view, establishes } = await renderHost(true);
    await openAllDayFromAdd(view);
    await establishMeaning(view, "protected_time", { label: "Quiet" });
    expect(establishes).toHaveLength(1);
    expect(establishes[0]).toEqual({
      meaning: "protected_time",
      input: { kind: "all_day", startsOn: ANCHOR, label: "Quiet" },
    });
    expect(establishes[0]?.input).not.toHaveProperty("startLocal");
    expect(establishes[0]?.input).not.toHaveProperty("endLocal");

    await openAllDayFromAdd(view);
    await establishMeaning(view, "block", { purpose: "Family day" });
    expect(establishes[1]).toMatchObject({
      meaning: "block",
      input: { kind: "all_day", startsOn: ANCHOR, purpose: "Family day", contextId: null, taskId: null },
    });
    expect(establishes[1]?.input).not.toHaveProperty("startLocal");

    await openAllDayFromAdd(view);
    await establishMeaning(view, "commitment", { title: "Holiday" });
    expect(establishes[2]).toMatchObject({
      meaning: "commitment",
      input: { kind: "all_day", startsOn: ANCHOR, title: "Holiday", origin: "user_created" },
    });
    expect(establishes[2]?.input).not.toHaveProperty("endLocal");
  });

  it("reaches all-day establishment on desktop without LOOK · + · ACT", async () => {
    const { view, establishes } = await renderHost(false);
    expect(view.querySelector("[data-reach-grammar='look-add-act']")).toBeNull();
    expect(view.querySelector("[data-all-day-establish]")).not.toBeNull();
    await act(async () => {
      (view.querySelector("[data-all-day-establish]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-all-day-establishment]")).not.toBeNull();
    await establishMeaning(view, "protected_time", { label: "Rest" });
    expect(establishes).toEqual([
      {
        meaning: "protected_time",
        input: { kind: "all_day", startsOn: ANCHOR, label: "Rest" },
      },
    ]);
  });

  it("edits, civil-date corrects, and removes an all-day fact through same-id update and delete writers", async () => {
    const original: Block = {
      ...defineBlock({ kind: "all_day", startsOn: ANCHOR, purpose: "Family day", contextId: CONTEXT_ID, taskId: null }),
      id: BLOCK_ID,
      createdAt: CREATED_AT,
    };
    const { view, updates, establishes } = await renderHost(true, sources({ blocks: ready([original]) }));
    const fact = view.querySelector('button[data-source-kind="block"]') as HTMLButtonElement;
    await act(async () => {
      fact.click();
    });
    expect(view.querySelector("[data-fact-inspection]")?.getAttribute("data-fact-kind")).toBe("all-day");
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    expect(view.querySelector('[data-fact-edit="all-day"]')).not.toBeNull();
    expect(view.querySelector('[aria-label="Fact start"]')).toBeNull();
    await setControl(view.querySelector('[aria-label="Fact date"]') as HTMLInputElement, "2026-10-08");
    const purposeInput = [...view.querySelectorAll("input")].find((item) => item.value === "Family day") as HTMLInputElement;
    await setControl(purposeInput, "Quiet focus");
    await act(async () => {
      buttonNamed(view, "Save").click();
    });
    expect(establishes).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: BLOCK_ID,
      meaning: "block",
      input: { kind: "all_day", startsOn: "2026-10-08", purpose: "Quiet focus", contextId: CONTEXT_ID },
    });
    expect(updates[0]?.input).not.toHaveProperty("startLocal");
  });

  it("removes an all-day fact through the existing confirm → delete writer path", async () => {
    const { view, removals } = await renderHost(
      true,
      sources({
        blocks: ready([
          {
            ...defineBlock({ kind: "all_day", startsOn: ANCHOR, purpose: "Remove me", contextId: null, taskId: null }),
            id: BLOCK_ID,
            createdAt: CREATED_AT,
          },
        ]),
      }),
    );
    await act(async () => {
      (view.querySelector('button[data-source-kind="block"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      buttonNamed(view, "Delete this fact").click();
    });
    await act(async () => {
      buttonNamed(view, "Confirm delete").click();
    });
    expect(removals).toEqual([{ meaning: "block", id: BLOCK_ID }]);
    expect(view.querySelector("[data-fact-inspection]")).toBeNull();
  });

  it("keeps Task/Note ADD paths and Work schedule and does not invent capacity clocks for all-day facts", async () => {
    const { view } = await renderHost(true);
    await act(async () => {
      (view.querySelector("[data-add-control]") as HTMLButtonElement).click();
    });
    expect(view.querySelector('[data-add-choice="task"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="note"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="time-on-the-day"]')).not.toBeNull();
    expect(view.querySelector('[data-add-choice="work"]')).not.toBeNull();
    expect(view.querySelector("[data-capture-surface]")).toBeNull();

    const allDayPt: ProtectedTime = {
      ...defineProtectedTime({ kind: "all_day", startsOn: ANCHOR, label: "Quiet" }),
      id: PT_ID,
      createdAt: CREATED_AT,
    };
    const boundary = { start: new Date("2026-10-05T09:00:00.000Z"), end: new Date("2026-10-05T17:00:00.000Z") };
    const coverage = capacityCoverage({
      boundary,
      timeZone: "UTC",
      protectedTime: [allDayPt],
      blocks: [],
      commitments: [],
    });
    expect(coverage).toEqual({ status: "covered", intervals: [boundary] });

    const model = composeDayCanvas({
      selectedDay: ANCHOR,
      timeZone: "UTC",
      workSchedule: [],
      protectedTime: [allDayPt],
      blocks: [],
      commitments: [],
    });
    expect(model.allDay).toHaveLength(1);
    expect(model.allDay[0]?.detail).toMatch(/All day/i);
    expect(model.context).toHaveLength(0);
    expect(model.foreground).toHaveLength(0);
  });

  it("does not offer all-day ↔ timed conversion in FactDetail", async () => {
    const { view } = await renderHost(
      true,
      sources({
        protectedTime: ready([
          {
            ...defineProtectedTime({ kind: "all_day", startsOn: ANCHOR, label: "Quiet" }),
            id: PT_ID,
            createdAt: CREATED_AT,
          },
        ]),
      }),
    );
    await act(async () => {
      (view.querySelector('button[data-source-kind="protected_time"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      buttonNamed(view, "Edit").click();
    });
    expect(view.querySelector('[data-fact-edit="all-day"]')).not.toBeNull();
    expect(view.textContent).not.toMatch(/Timed|Convert|clock/i);
    expect(view.querySelector('[aria-label="Fact start"]')).toBeNull();
  });
});
