import type { Task } from "@/domain/task";

export type TodayPlanAction = "plan" | "move" | "remove";

export function projectTodayTasks(input: {
  openTasks: readonly Task[];
  civilDate: string;
}): Task[] {
  return input.openTasks.filter(
    (task) => task.completedAt === null && task.plannedOn === input.civilDate,
  );
}

export function todayPlanAction(
  plannedOn: string | null,
  civilDate: string,
): TodayPlanAction {
  if (plannedOn === null) {
    return "plan";
  }
  if (plannedOn === civilDate) {
    return "remove";
  }
  return "move";
}
