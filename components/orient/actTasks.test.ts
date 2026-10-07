import { describe, expect, it } from "vitest";
import { orderActTasks } from "@/components/orient/actTasks";
import type { Task } from "@/domain/task";

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    contextId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    plannedLocal: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
    ...overrides,
  };
}

describe("orderActTasks", () => {
  it("orders MustDo, then planned for viewpoint, then remaining by created_at and id", () => {
    const ordered = orderActTasks({
      viewpointCivilDate: "2026-10-07",
      openTasks: [
        task({ id: "c", title: "Later remaining", createdAt: "2026-10-03T00:00:00.000Z" }),
        task({ id: "a", title: "Earlier remaining", createdAt: "2026-10-02T00:00:00.000Z" }),
        task({
          id: "p-late",
          title: "Planned late clock",
          createdAt: "2026-10-01T00:00:00.000Z",
          plannedOn: "2026-10-07",
          plannedLocal: "16:00",
        }),
        task({
          id: "p-early",
          title: "Planned early clock",
          createdAt: "2026-10-01T01:00:00.000Z",
          plannedOn: "2026-10-07",
          plannedLocal: "09:00",
        }),
        task({
          id: "p-null",
          title: "Planned no clock",
          createdAt: "2026-10-01T02:00:00.000Z",
          plannedOn: "2026-10-07",
        }),
        task({ id: "m-b", title: "Must later", createdAt: "2026-10-04T00:00:00.000Z", mustDo: true }),
        task({ id: "m-a", title: "Must earlier", createdAt: "2026-10-03T00:00:00.000Z", mustDo: true }),
        task({
          id: "done",
          title: "Completed",
          completedAt: "2026-10-06T00:00:00.000Z",
          mustDo: true,
          plannedOn: "2026-10-07",
        }),
      ],
    });

    expect(ordered.map((item) => item.id)).toEqual([
      "m-a",
      "m-b",
      "p-early",
      "p-late",
      "p-null",
      "a",
      "c",
    ]);
  });

  it("does not invent urgency from due dates", () => {
    const ordered = orderActTasks({
      viewpointCivilDate: "2026-10-07",
      openTasks: [
        task({ id: "due-soon", title: "Due soon", dueOn: "2026-10-07", createdAt: "2026-10-05T00:00:00.000Z" }),
        task({ id: "plain", title: "Plain", createdAt: "2026-10-01T00:00:00.000Z" }),
      ],
    });
    expect(ordered.map((item) => item.id)).toEqual(["plain", "due-soon"]);
  });
});
