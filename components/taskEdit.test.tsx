/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActiveThread } from "@/domain/activeThread";
import type { Task, TaskPatch } from "@/domain/task";
import { addCivilDays, civilDateInTimeZone, formatCivilDate, formatCivilDateLabel, parseCivilDate } from "@/domain/time/workFiscalWeek";

const mocks = vi.hoisted(() => ({
  loadOpenTasks: vi.fn(),
  loadContexts: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  createTask: vi.fn(),
  loadActiveThread: vi.fn(),
  establishActiveThread: vi.fn(),
  clearActiveThread: vi.fn(),
  loadTemporalSettings: vi.fn(),
}));

vi.mock("@/components/QuickCapture", () => ({
  QuickCapture: () => (
    <form aria-label="Capture">
      <label htmlFor="task-title">What needs doing?</label>
      <input id="task-title" />
    </form>
  ),
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
  updateTask: (...args: unknown[]) => mocks.updateTask(...args),
  completeTask: (...args: unknown[]) => mocks.completeTask(...args),
  createTask: (...args: unknown[]) => mocks.createTask(...args),
}));

vi.mock("@/persistence/activeThread", () => ({
  loadActiveThread: (...args: unknown[]) => mocks.loadActiveThread(...args),
  establishActiveThread: (...args: unknown[]) => mocks.establishActiveThread(...args),
  clearActiveThread: (...args: unknown[]) => mocks.clearActiveThread(...args),
}));

vi.mock("@/persistence/workSchedule", () => ({
  loadTemporalSettings: (...args: unknown[]) => mocks.loadTemporalSettings(...args),
  loadWorkSchedule: async () => [],
}));

vi.mock("@/persistence/block", () => ({ loadBlocks: async () => [] }));
vi.mock("@/persistence/commitment", () => ({ loadCommitments: async () => [] }));
vi.mock("@/persistence/protectedTime", () => ({ loadProtectedTime: async () => [] }));

import { TaskLoop } from "@/components/TaskLoop";

const zone = "America/Boise";
const today = formatCivilDate(civilDateInTimeZone(new Date(), zone));
const planned = formatCivilDate(addCivilDays(parseCivilDate(today), 4));
const due = formatCivilDate(addCivilDays(parseCivilDate(today), 10));

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Call the school",
    contextId: null,
    createdAt: "2026-10-01T15:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    mustDo: false,
    origin: "user_created",
    ...overrides,
  };
}

function region(container: HTMLElement, headingId: string): HTMLElement {
  const heading = container.querySelector(`#${headingId}`);
  const section = heading?.closest("section");
  if (!(section instanceof HTMLElement)) throw new Error(`Missing ${headingId}`);
  return section;
}

function control<T extends HTMLElement>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

function setField(container: ParentNode, id: string, value: string) {
  const field = control<HTMLInputElement | HTMLSelectElement>(container, `#${id}`);
  const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) throw new Error(`Cannot set ${id}`);
  setter.call(field, value);
  act(() => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(container: ParentNode, label: string) {
  const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
  if (!button) throw new Error(`Missing ${label}`);
  act(() => {
    button.click();
  });
}

async function clickText(container: ParentNode, label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${label}`);
  await act(async () => {
    button.click();
  });
}

function lastUpdate(): { id: string; patch: TaskPatch } {
  const call = mocks.updateTask.mock.calls.at(-1);
  if (!call) throw new Error("updateTask was not called");
  return { id: call[1] as string, patch: call[2] as TaskPatch };
}

describe("editing an open task", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = undefined;
    host = undefined;
    vi.resetAllMocks();
  });

  async function show(rows: Task[], thread: ActiveThread | null = null) {
    mocks.loadContexts.mockResolvedValue([
      { id: "work", name: "Work", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "family", name: "Family", createdAt: "2026-10-01T00:00:01.000Z" },
    ]);
    mocks.loadActiveThread.mockResolvedValue(thread);
    mocks.loadOpenTasks.mockResolvedValue(rows);
    mocks.loadTemporalSettings.mockResolvedValue({
      timeZone: zone,
      confirmedAt: "2026-10-01T00:00:00.000Z",
    });
    mocks.completeTask.mockResolvedValue(null);
    mocks.updateTask.mockImplementation(async (_client: unknown, id: string, patch: TaskPatch) => {
      const existing = rows.find((item) => item.id === id);
      if (!existing) throw new Error("Missing task.");
      return { ...existing, ...patch, id: existing.id };
    });

    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<TaskLoop />);
    });
    await act(async () => {
      await vi.waitFor(() => {
        expect(host?.textContent).toContain("Open tasks");
      });
    });
    if (!host) throw new Error("The task surface was not rendered.");
    return host;
  }

  it("opens an edit with the task's current values", async () => {
    const surface = await show([
      task({
        contextId: "family",
        plannedOn: planned,
        dueOn: due,
        mustDo: true,
      }),
    ]);

    click(surface, "Edit Call the school");

    expect(control<HTMLInputElement>(surface, "#edit-task-title").value).toBe("Call the school");
    expect(control<HTMLSelectElement>(surface, "#edit-task-context").value).toBe("family");
    expect(control<HTMLInputElement>(surface, "#edit-task-planned").value).toBe(planned);
    expect(control<HTMLInputElement>(surface, "#edit-task-due").value).toBe(due);
    expect(control<HTMLInputElement>(surface, "#edit-task-must-do").checked).toBe(true);
    expect(surface.textContent).toContain("When you intend to work on it.");
    expect(surface.textContent).toContain("When completion is required.");
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it("saves a new title on the same task", async () => {
    const surface = await show([task()]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-title", "  File the receipt  ");
    expect(mocks.updateTask).not.toHaveBeenCalled();

    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain("File the receipt");
      });
    });

    const update = lastUpdate();
    expect(update.id).toBe("task-1");
    expect(update.patch.title).toBe("File the receipt");
    expect(update.patch).not.toHaveProperty("id");
    expect(surface.textContent).not.toContain("Call the school");
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("keeps a blank title from being established", async () => {
    const surface = await show([task()]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-title", "   ");
    await clickText(surface, "Save");

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(surface.textContent).toContain("A task title is required.");
    expect(surface.textContent).toContain("The draft is still here.");
    expect(control<HTMLInputElement>(surface, "#edit-task-title").value).toBe("   ");
    await clickText(surface, "Cancel");
    expect(region(surface, "open-tasks-heading").textContent).toContain("Call the school");
  });

  it("can change or clear Context", async () => {
    const surface = await show([task()]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-context", "family");
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain("Family");
      });
    });
    expect(lastUpdate().patch.contextId).toBe("family");

    click(surface, "Edit Call the school");
    setField(surface, "edit-task-context", "");
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.querySelector("#edit-task-context")).toBeNull();
      });
    });
    expect(lastUpdate().patch.contextId).toBeNull();
    expect(region(surface, "open-tasks-heading").textContent).not.toContain("Family");
  });

  it("sets, changes, and clears the planned day without changing due", async () => {
    const surface = await show([task({ dueOn: due })]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-planned", today);
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "today-heading").textContent).toContain("Call the school");
      });
    });
    expect(lastUpdate().patch).toMatchObject({ plannedOn: today, dueOn: due });
    expect(region(surface, "open-tasks-heading").textContent).not.toContain("Call the school");
    expect(region(surface, "today-heading").textContent).toContain(formatCivilDateLabel(due));

    click(region(surface, "today-heading"), "Edit Call the school");
    setField(surface, "edit-task-planned", planned);
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain("Call the school");
      });
    });
    expect(lastUpdate().patch).toMatchObject({ plannedOn: planned, dueOn: due });
    expect(region(surface, "today-heading").textContent).not.toContain("Call the school");
    expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(planned));
    expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(due));

    click(surface, "Edit Call the school");
    setField(surface, "edit-task-planned", "");
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).not.toContain(formatCivilDateLabel(planned));
      });
    });
    expect(lastUpdate().patch).toMatchObject({ plannedOn: null, dueOn: due });
    expect(region(surface, "today-heading").textContent).toContain("Nothing is planned for today.");
    expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(due));
  });

  it("sets, changes, and clears the due day without changing the plan", async () => {
    const surface = await show([task({ plannedOn: planned })]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-due", due);
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(due));
      });
    });
    expect(lastUpdate().patch).toMatchObject({ dueOn: due, plannedOn: planned });

    const changedDue = formatCivilDate(addCivilDays(parseCivilDate(due), 1));
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-due", changedDue);
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(changedDue));
      });
    });
    expect(lastUpdate().patch).toMatchObject({ dueOn: changedDue, plannedOn: planned });
    expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(planned));

    click(surface, "Edit Call the school");
    setField(surface, "edit-task-due", "");
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).not.toContain(formatCivilDateLabel(changedDue));
      });
    });
    expect(lastUpdate().patch).toMatchObject({ dueOn: null, plannedOn: planned });
    expect(region(surface, "open-tasks-heading").textContent).toContain(formatCivilDateLabel(planned));
    expect(region(surface, "today-heading").textContent).not.toContain("Call the school");
  });

  it("can enable or disable Must Do without changing the other fields", async () => {
    const surface = await show([task({ contextId: "family", plannedOn: planned, dueOn: due })]);
    click(surface, "Edit Call the school");
    act(() => {
      control<HTMLInputElement>(surface, "#edit-task-must-do").click();
    });
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).toContain("Must do");
      });
    });
    expect(lastUpdate().patch).toEqual({
      title: "Call the school",
      contextId: "family",
      plannedOn: planned,
      dueOn: due,
      mustDo: true,
    });

    click(surface, "Edit Call the school");
    act(() => {
      control<HTMLInputElement>(surface, "#edit-task-must-do").click();
    });
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "open-tasks-heading").textContent).not.toContain("Must do");
      });
    });
    expect(lastUpdate().patch).toEqual({
      title: "Call the school",
      contextId: "family",
      plannedOn: planned,
      dueOn: due,
      mustDo: false,
    });
  });

  it("cancels without a persistence write", async () => {
    const surface = await show([task({ dueOn: due })]);
    click(surface, "Edit Call the school");
    setField(surface, "edit-task-title", "File the receipt");
    setField(surface, "edit-task-due", "");
    await clickText(surface, "Cancel");

    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(surface.querySelector("#edit-task-title")).toBeNull();
    const open = region(surface, "open-tasks-heading");
    expect(open.textContent).toContain("Call the school");
    expect(open.textContent).toContain(formatCivilDateLabel(due));
    expect(open.textContent).not.toContain("File the receipt");
  });

  it("keeps a failed save as a draft and allows another save", async () => {
    const thread = { taskId: "task-1", establishedAt: "2026-10-02T18:00:00.000Z" };
    const surface = await show([task()], thread);
    click(region(surface, "open-tasks-heading"), "Edit Call the school");
    setField(surface, "edit-task-title", "File the receipt");
    mocks.updateTask.mockRejectedValueOnce(new Error("Could not save this task."));
    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("Could not save this task.");
      });
    });

    expect(surface.textContent).toContain("This task is unchanged.");
    expect(surface.textContent).toContain("The draft is still here.");
    expect(control<HTMLInputElement>(surface, "#edit-task-title").value).toBe("File the receipt");
    expect(region(surface, "resume-heading").textContent).toContain("Call the school");
    expect(region(surface, "resume-heading").textContent).not.toContain("File the receipt");

    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "resume-heading").textContent).toContain("File the receipt");
      });
    });
    expect(mocks.updateTask).toHaveBeenCalledTimes(2);
    expect(lastUpdate()).toMatchObject({ id: "task-1", patch: { title: "File the receipt" } });
  });

  it("keeps the Active Thread and shows the edited task on Resume", async () => {
    const thread = { taskId: "task-1", establishedAt: "2026-10-02T18:00:00.000Z" };
    const surface = await show([task({ dueOn: due })], thread);
    click(region(surface, "open-tasks-heading"), "Edit Call the school");
    setField(surface, "edit-task-title", "File the receipt");
    setField(surface, "edit-task-context", "work");
    setField(surface, "edit-task-due", planned);
    act(() => {
      control<HTMLInputElement>(surface, "#edit-task-must-do").click();
    });
    expect(region(surface, "resume-heading").textContent).toContain("Call the school");

    await clickText(surface, "Save");
    await act(async () => {
      await vi.waitFor(() => {
        expect(region(surface, "resume-heading").textContent).toContain("File the receipt");
      });
    });

    const resume = region(surface, "resume-heading");
    expect(resume.textContent).toContain("Work");
    expect(resume.textContent).toContain("Must do");
    expect(resume.textContent).toContain(formatCivilDateLabel(planned));
    expect(resume.textContent).toContain("Leave thread");
    expect(resume.textContent).not.toContain("Call the school");
    expect(lastUpdate().id).toBe("task-1");
    expect(mocks.establishActiveThread).not.toHaveBeenCalled();
    expect(mocks.clearActiveThread).not.toHaveBeenCalled();
    expect(mocks.completeTask).not.toHaveBeenCalled();
  });

  it("still completes through the existing completion write", async () => {
    const surface = await show([task()]);
    await clickText(region(surface, "open-tasks-heading"), "Complete");
    await act(async () => {
      await vi.waitFor(() => {
        expect(surface.textContent).toContain("No open tasks.");
      });
    });

    expect(mocks.completeTask).toHaveBeenCalledTimes(1);
    expect(mocks.completeTask.mock.calls[0]?.[1]).toBe("task-1");
    expect(mocks.updateTask).not.toHaveBeenCalled();
    expect(mocks.clearActiveThread).not.toHaveBeenCalled();
  });
});
