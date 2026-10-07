import type { Task } from "@/domain/task";

function openOnly(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => task.completedAt === null);
}

function byCreatedThenId(a: Task, b: Task): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

function byPlannedLocalThenCreated(a: Task, b: Task): number {
  const aLocal = a.plannedLocal;
  const bLocal = b.plannedLocal;
  if (aLocal === null && bLocal !== null) return 1;
  if (aLocal !== null && bLocal === null) return -1;
  if (aLocal !== null && bLocal !== null && aLocal !== bLocal) {
    return aLocal < bLocal ? -1 : 1;
  }
  return byCreatedThenId(a, b);
}

/**
 * Deterministic ACT presentation order over canonical open Tasks.
 * MustDo → planned for viewpoint civil date → remaining.
 * No urgency, overdue inference, or AI ranking.
 */
export function orderActTasks(input: {
  openTasks: readonly Task[];
  viewpointCivilDate: string;
}): Task[] {
  const open = openOnly(input.openTasks);
  const mustDo = open.filter((task) => task.mustDo).sort(byCreatedThenId);
  const plannedForViewpoint = open
    .filter((task) => !task.mustDo && task.plannedOn === input.viewpointCivilDate)
    .sort(byPlannedLocalThenCreated);
  const remaining = open
    .filter((task) => !task.mustDo && task.plannedOn !== input.viewpointCivilDate)
    .sort(byCreatedThenId);
  return [...mustDo, ...plannedForViewpoint, ...remaining];
}
