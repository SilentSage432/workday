/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { DirectNoteSurface, DirectTaskSurface } from "@/components/orient/Surfaces";
import type { Context } from "@/domain/context";
import type { NewNote, Note } from "@/domain/note";
import type { NewTask, Task } from "@/domain/task";

function contexts(): SourceRead<Context> {
  return {
    status: "ready",
    rows: [{ id: "context-1", name: "Family", createdAt: "2026-10-01T00:00:00.000Z" }],
  };
}

function task(input: NewTask): Task {
  return {
    id: "task-created",
    title: input.title,
    contextId: input.contextId ?? null,
    createdAt: "2026-10-07T18:00:00.000Z",
    completedAt: null,
    dueOn: input.dueOn ?? null,
    plannedOn: input.plannedOn ?? null,
    plannedLocal: input.plannedLocal ?? null,
    mustDo: input.mustDo ?? false,
    origin: "user_created",
    originatingNoteId: null,
  };
}

describe("direct Task and Note creation", () => {
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

  function fill(selector: string, value: string) {
    const field = host!.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("creates a title-only Task with one Add Task action and does not Start", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const created: NewTask[] = [];
    const started: string[] = [];
    let changed = 0;
    let closed = 0;
    await act(async () => {
      root!.render(
        <DirectTaskSurface
          contexts={contexts()}
          establish={async (input) => {
            created.push(input);
            return task(input);
          }}
          onChanged={() => {
            changed += 1;
          }}
          onClose={() => {
            closed += 1;
          }}
        />,
      );
    });

    expect(host.querySelector("[data-direct-task]")).not.toBeNull();
    expect(host.textContent).not.toMatch(/General capture|This is a task|Keep as a note|Quick capture/i);
    expect(host.querySelectorAll("[data-add-task]")).toHaveLength(1);
    expect(host.querySelector("[data-add-task]")?.textContent).toBe("Add Task");
    expect((host.querySelector('[aria-label="Planned clock"]') as HTMLInputElement).disabled).toBe(true);

    await act(async () => {
      fill('[aria-label="Task title"]', "Call the school");
    });
    await act(async () => {
      (host!.querySelector("[data-add-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(created).toEqual([
      {
        title: "Call the school",
        contextId: null,
        plannedOn: null,
        plannedLocal: null,
        dueOn: null,
        mustDo: false,
      },
    ]);
    expect(changed).toBe(1);
    expect(closed).toBe(1);
    expect(started).toEqual([]);
  });

  it("establishes planned day, clock only with day, due, Context, and MustDo independently", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const created: NewTask[] = [];
    await act(async () => {
      root!.render(
        <DirectTaskSurface
          contexts={contexts()}
          establish={async (input) => {
            created.push(input);
            return task(input);
          }}
          onChanged={() => {}}
          onClose={() => {}}
        />,
      );
    });

    await act(async () => {
      fill('[aria-label="Task title"]', "File the receipt");
      fill('[aria-label="Planned day"]', "2026-10-08");
    });
    expect((host.querySelector('[aria-label="Planned clock"]') as HTMLInputElement).disabled).toBe(false);
    await act(async () => {
      fill('[aria-label="Planned clock"]', "14:00");
      fill('[aria-label="Due day"]', "2026-10-10");
      const context = host!.querySelector('[aria-label="Task context"]') as HTMLSelectElement;
      context.value = "context-1";
      context.dispatchEvent(new Event("change", { bubbles: true }));
      (host!.querySelector('[aria-label="Must do"]') as HTMLInputElement).click();
    });
    await act(async () => {
      fill('[aria-label="Planned day"]', "");
    });
    expect((host.querySelector('[aria-label="Planned clock"]') as HTMLInputElement).value).toBe("");
    expect((host.querySelector('[aria-label="Planned clock"]') as HTMLInputElement).disabled).toBe(true);
    await act(async () => {
      fill('[aria-label="Planned day"]', "2026-10-08");
      fill('[aria-label="Planned clock"]', "09:30");
    });
    await act(async () => {
      (host!.querySelector("[data-add-task]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(created).toEqual([
      {
        title: "File the receipt",
        contextId: "context-1",
        plannedOn: "2026-10-08",
        plannedLocal: "09:30",
        dueOn: "2026-10-10",
        mustDo: true,
      },
    ]);
  });

  it("creates a Note without Task classification", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const created: NewNote[] = [];
    await act(async () => {
      root!.render(
        <DirectNoteSurface
          establish={async (input) => {
            created.push(input);
            return {
              id: input.id,
              content: input.content,
              capturedAt: input.capturedAt.toISOString(),
              retiredAt: null,
            } satisfies Note;
          }}
          onClose={() => {}}
        />,
      );
    });

    expect(host.querySelector("[data-direct-note]")).not.toBeNull();
    expect(host.textContent).not.toMatch(/This is a task|Keep as a note|Quick capture/i);
    expect(host.querySelector("[data-add-note]")?.textContent).toBe("Add Note");
    await act(async () => {
      fill('[aria-label="Note content"]', "aisle 12");
    });
    await act(async () => {
      (host!.querySelector("[data-add-note]") as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(created).toHaveLength(1);
    expect(created[0]?.content).toBe("aisle 12");
    expect(created[0]?.id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
