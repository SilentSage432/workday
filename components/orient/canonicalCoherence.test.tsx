/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { defineBlock, type Block } from "@/domain/block";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";
import {
  attachCanonicalVisibilityRecovery,
  canonicalChangeBindings,
  CANONICAL_CHANNEL,
  CANONICAL_RELOAD_DELAY_MS,
  createCanonicalReload,
  subscribeCanonicalChanges,
  type CanonicalChannelStatus,
  type CanonicalRealtimeClient,
} from "@/components/orient/canonicalCoherence";
import { experienceLoadWindow } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources, ThreadReading } from "@/components/orient/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ANCHOR = "2026-10-05";
const BLOCK_ID = "33333333-3333-4333-8333-333333333333";
const CONTEXT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "55555555-5555-4555-8555-555555555555";
const CREATED_AT = "2026-10-01T15:00:00.000Z";

function fakeChannel() {
  const bindings: Array<{ event: string; schema: string; table: string; filter?: string; callback: (...args: unknown[]) => void }> = [];
  let status: ((status: CanonicalChannelStatus) => void) | null = null;
  const channel = {
    on(
      _event: "postgres_changes",
      filter: { event: string; schema: string; table: string; filter?: string },
      callback: (...args: unknown[]) => void,
    ) {
      bindings.push({ ...filter, callback });
      return channel;
    },
    subscribe(callback: (status: CanonicalChannelStatus) => void) {
      status = callback;
      return channel;
    },
  };
  return {
    channel,
    bindings,
    emitStatus(next: CanonicalChannelStatus) {
      status?.(next);
    },
    emit(index = 0, payload?: unknown) {
      bindings[index]?.callback(payload as never);
    },
  };
}

function fakeClient() {
  const opened = fakeChannel();
  let removed = false;
  const client: CanonicalRealtimeClient = {
    channel(name) {
      expect(name).toBe(CANONICAL_CHANNEL);
      return opened.channel;
    },
    removeChannel() {
      removed = true;
    },
  };
  return { client, opened, wasRemoved: () => removed };
}

describe("canonical change notices", () => {
  it("reloads once after a burst, and not when the listener is only attached", () => {
    vi.useFakeTimers();
    const reloads: number[] = [];
    const reload = createCanonicalReload({ reload: () => reloads.push(reloads.length + 1) });
    expect(reloads).toEqual([]);
    reload.request();
    reload.request();
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS - 1);
    expect(reloads).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(reloads).toEqual([1]);
    reload.close();
    vi.useRealTimers();
  });

  it("does not reload after cleanup cancels the pending notice", () => {
    vi.useFakeTimers();
    const reloads: number[] = [];
    const reload = createCanonicalReload({ reload: () => reloads.push(1) });
    reload.request();
    reload.close();
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    expect(reloads).toEqual([]);
    vi.useRealTimers();
  });

  it("treats a later notice, including the writer's own, as another harmless reread", () => {
    vi.useFakeTimers();
    const reloads: number[] = [];
    const reload = createCanonicalReload({ reload: () => reloads.push(1) });
    reload.request();
    reload.request();
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    reload.request();
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    expect(reloads).toEqual([1, 1]);
    vi.useRealTimers();
  });

  it("binds the six class-a tables and does not read a row payload", () => {
    const bindings = canonicalChangeBindings(USER_ID);
    expect(bindings.map((binding) => binding.table)).toEqual([
      "protected_time",
      "protected_time",
      "protected_time",
      "blocks",
      "blocks",
      "blocks",
      "commitments",
      "commitments",
      "commitments",
      "work_schedule_days",
      "work_schedule_days",
      "work_schedule_days",
      "tasks",
      "tasks",
      "active_threads",
      "active_threads",
      "active_threads",
    ]);
    expect(bindings.some((binding) => binding.table === "tasks" && binding.event === "UPDATE")).toBe(true);
    expect(bindings.some((binding) => binding.table === "tasks" && binding.event === "INSERT")).toBe(true);
    expect(bindings.some((binding) => binding.table === "tasks" && binding.event === "DELETE")).toBe(false);
    for (const table of ["protected_time", "blocks", "commitments"] as const) {
      expect(bindings.find((binding) => binding.table === table && binding.event === "DELETE")?.filter).toBeUndefined();
      expect(bindings.find((binding) => binding.table === table && binding.event === "INSERT")?.filter).toBe(`user_id=eq.${USER_ID}`);
    }
    for (const table of ["work_schedule_days", "active_threads"] as const) {
      expect(bindings.find((binding) => binding.table === table && binding.event === "DELETE")?.filter).toBe(`user_id=eq.${USER_ID}`);
    }
    expect(bindings.some((binding) => ["notes", "contexts", "destinations", "priorities", "block_priority_service", "task_priority_service", "temporal_settings"].includes(binding.table))).toBe(false);
    expect(canonicalChangeBindings("not-a-user")).toEqual([]);

    const { client, opened } = fakeClient();
    const seen: unknown[][] = [];
    const request = (...args: unknown[]) => seen.push(args);
    subscribeCanonicalChanges(client, USER_ID, request);
    opened.emit(3, { new: { purpose: "secret" }, old: { id: "other-user" } });
    expect(seen).toEqual([[]]);
  });

  it("ignores the first subscribe, reloads once after a later recovery, and leaves an error unread", () => {
    vi.useFakeTimers();
    const { client, opened, wasRemoved } = fakeClient();
    const reloads: number[] = [];
    const reload = createCanonicalReload({ reload: () => reloads.push(1) });
    const close = subscribeCanonicalChanges(client, USER_ID, () => reload.request());
    opened.emitStatus("SUBSCRIBED");
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    expect(reloads).toEqual([]);
    opened.emitStatus("CHANNEL_ERROR");
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    expect(reloads).toEqual([]);
    opened.emitStatus("SUBSCRIBED");
    opened.emitStatus("SUBSCRIBED");
    vi.advanceTimersByTime(CANONICAL_RELOAD_DELAY_MS);
    expect(reloads).toEqual([1]);
    close();
    expect(wasRemoved()).toBe(true);
    reload.close();
    vi.useRealTimers();
  });

  it("reloads when the document becomes visible and not when the listener attaches", () => {
    const requests: number[] = [];
    let state: DocumentVisibilityState = "visible";
    const listeners = new Set<() => void>();
    const detach = attachCanonicalVisibilityRecovery(
      {
        get visibilityState() {
          return state;
        },
        addEventListener(_type, listener) {
          listeners.add(listener);
        },
        removeEventListener(_type, listener) {
          listeners.delete(listener);
        },
      },
      () => requests.push(1),
    );
    expect(requests).toEqual([]);
    state = "hidden";
    for (const listener of listeners) listener();
    expect(requests).toEqual([]);
    state = "visible";
    for (const listener of listeners) listener();
    expect(requests).toEqual([1]);
    detach();
    state = "visible";
    expect(listeners.size).toBe(0);
  });
});

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function block(startsOn = ANCHOR): Block {
  return {
    ...defineBlock({
      kind: "timed",
      startsOn,
      startLocal: "10:00",
      endLocal: "11:00",
      purpose: "Write",
      contextId: CONTEXT_ID,
      taskId: TASK_ID,
    }),
    id: BLOCK_ID,
    createdAt: CREATED_AT,
  };
}

function sources(rows: Block[]): OrientSources {
  return {
    work: ready([]),
    protectedTime: ready([]),
    blocks: ready(rows),
    commitments: ready([]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
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
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
  };
}

const thread: ThreadReading = { status: "ready", active: false, taskId: null, resumeTitle: null };

function captureBridge(): CaptureBridge {
  return { session: readyCaptureSession(), update: () => {}, saving: false, saveError: null, submit: async () => null };
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

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

async function renderReading(replace: { current: ((next: OrientSources) => void) | null }, rows: Block[]) {
  const anchors: string[] = [];
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  })) as typeof window.matchMedia;
  function Host() {
    const [current, setCurrent] = useState(sources(rows));
    replace.current = setCurrent;
    return (
      <OrientView
        timeZone="UTC"
        now={new Date("2026-10-05T10:30:00.000Z")}
        anchor={ANCHOR}
        onAnchor={(date) => anchors.push(date)}
        loaded={experienceLoadWindow(ANCHOR)}
        sources={current}
        contexts={contexts()}
        tasks={ready([task()])}
        thread={thread}
        capture={captureBridge()}
        actions={actions()}
      />
    );
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Host />);
  });
  return { view: container, anchors };
}

async function openBlock(view: HTMLElement) {
  const button = view.querySelector('button[data-source-kind="block"]') as HTMLButtonElement | null;
  if (!button) throw new Error("Missing block");
  await act(async () => {
    button.click();
  });
}

describe("canonical reread on the reading", () => {
  it("drops a deleted fact, closes its inspection, and stays on the same question", async () => {
    const replace: { current: ((next: OrientSources) => void) | null } = { current: null };
    const { view, anchors } = await renderReading(replace, [block()]);
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    await openBlock(view);
    expect(view.querySelector("[data-fact-inspection]")).not.toBeNull();
    await act(async () => {
      replace.current?.(sources([]));
    });
    expect(view.querySelector('button[data-source-kind="block"]')).toBeNull();
    expect(view.querySelector("[data-fact-inspection]")).toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(view.querySelector("[data-viewpoint]")?.getAttribute("data-viewpoint")).toBe("follows-today");
    expect(anchors).toEqual([]);
  });

  it("lets a moved fact leave the current reading without chasing it", async () => {
    const replace: { current: ((next: OrientSources) => void) | null } = { current: null };
    const { view, anchors } = await renderReading(replace, [block()]);
    await openBlock(view);
    await act(async () => {
      replace.current?.(sources([block("2026-12-01")]));
    });
    expect(view.querySelector('button[data-source-kind="block"]')).toBeNull();
    expect(view.querySelector("[data-fact-inspection]")).toBeNull();
    expect(view.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
    expect(anchors).toEqual([]);
  });
});
