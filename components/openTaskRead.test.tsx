/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadOpenTasks: vi.fn(),
  loadContexts: vi.fn(),
  loadActiveThread: vi.fn(),
}));

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  }),
}));

vi.mock("@/persistence/contextsAndTasks", () => ({
  loadOpenTasks: (...args: unknown[]) => mocks.loadOpenTasks(...args),
  loadContexts: (...args: unknown[]) => mocks.loadContexts(...args),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
}));

vi.mock("@/persistence/activeThread", () => ({
  loadActiveThread: (...args: unknown[]) => mocks.loadActiveThread(...args),
  establishActiveThread: vi.fn(),
  clearActiveThread: vi.fn(),
}));

import { TaskLoop } from "@/components/TaskLoop";

describe("open task surface when the collection is incomplete", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = undefined;
    host = undefined;
    vi.clearAllMocks();
  });

  it("shows the task load error and does not claim the open set or Today", async () => {
    mocks.loadContexts.mockResolvedValue([]);
    mocks.loadActiveThread.mockResolvedValue(null);
    mocks.loadOpenTasks.mockRejectedValue(
      new Error("A temporal read stopped before it was complete."),
    );

    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<TaskLoop />);
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(host?.textContent).toContain("A temporal read stopped before it was complete.");
      });
    });

    const text = host?.textContent ?? "";
    expect(text).toContain("Try again");
    expect(text).not.toContain("No open tasks.");
    expect(text).not.toContain("Every open task is planned today.");
    expect(text).not.toContain("Open tasks");
    expect(text).not.toContain("Today");
  });
});
