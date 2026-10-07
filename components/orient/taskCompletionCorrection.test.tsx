/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { ThreadSurface } from "@/components/orient/Surfaces";
import type { ThreadReading } from "@/components/orient/types";
import type { Context } from "@/domain/context";
import type { Task } from "@/domain/task";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Call the school",
    contextId: null,
    createdAt: "2026-10-01T15:00:00.000Z",
    completedAt: null,
    dueOn: "2026-10-10",
    plannedOn: "2026-10-07",
    mustDo: true,
    origin: "user_created",
    originatingNoteId: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

function readyTasks(rows: Task[]): SourceRead<Task> {
  return { status: "ready", rows };
}

function readyContexts(): SourceRead<Context> {
  return { status: "ready", rows: [{ id: "context-1", name: "Family", createdAt: "2026-10-01T00:00:00.000Z" }] };
}

describe("task completion correction surface", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  async function renderSurface(input: {
    thread?: ThreadReading;
    tasks?: SourceRead<Task>;
    onComplete?: (taskId: string) => Promise<void>;
    onReopen?: (taskId: string) => Promise<void>;
  }) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const onComplete = input.onComplete ?? (async () => {});
    const onReopen = input.onReopen ?? (async () => {});
    await act(async () => {
      root!.render(
        <ThreadSurface
          thread={input.thread ?? { status: "ready", active: true, taskId: "task-1", resumeTitle: "Call the school" }}
          tasks={input.tasks ?? readyTasks([task()])}
          contexts={readyContexts()}
          onStart={async () => {}}
          onLeave={async () => {}}
          onComplete={onComplete}
          onReopen={onReopen}
          onUpdate={async () => {}}
          onClose={() => {}}
        />,
      );
    });
    return host!;
  }

  it("offers Still open for the same Task id after Complete and does not Start a thread", async () => {
    const completed: string[] = [];
    const reopened: string[] = [];
    const started: string[] = [];
    const surface = await renderSurface({
      onComplete: async (taskId) => {
        completed.push(taskId);
      },
      onReopen: async (taskId) => {
        reopened.push(taskId);
      },
    });

    await act(async () => {
      surface.querySelector<HTMLButtonElement>("[data-complete-task]")?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(completed).toEqual(["task-1"]);
    const correction = surface.querySelector("[data-completion-correction]");
    expect(correction?.textContent).toContain("Call the school");
    expect(correction?.textContent).toContain("Marked complete.");
    expect(surface.querySelector("[data-still-open]")?.textContent).toBe("Still open");
    expect(surface.textContent).not.toContain("Undo");

    await act(async () => {
      surface.querySelector<HTMLButtonElement>("[data-still-open]")?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(reopened).toEqual(["task-1"]);
    expect(started).toEqual([]);
    expect(surface.querySelector("[data-completion-correction]")).toBeNull();
  });

  it("keeps Still open available when reopen fails and does not claim success", async () => {
    const surface = await renderSurface({
      onComplete: async () => {},
      onReopen: async () => {
        throw new Error("write refused");
      },
    });

    await act(async () => {
      surface.querySelector<HTMLButtonElement>("[data-complete-task]")?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      surface.querySelector<HTMLButtonElement>("[data-still-open]")?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(surface.querySelector("[data-completion-correction]")).not.toBeNull();
    expect(surface.querySelector("[role='alert']")?.textContent).toContain("write refused");
    expect(surface.querySelector("[data-still-open]")).not.toBeNull();
  });

  it("does not show Still open when Complete fails", async () => {
    const surface = await renderSurface({
      onComplete: async () => {
        throw new Error("complete refused");
      },
    });

    await act(async () => {
      surface.querySelector<HTMLButtonElement>("[data-complete-task]")?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(surface.querySelector("[data-completion-correction]")).toBeNull();
    expect(surface.querySelector("[role='alert']")?.textContent).toContain("complete refused");
    expect(surface.querySelector("[data-complete-task]")).not.toBeNull();
  });
});
