import type { ActiveThread } from "@/domain/activeThread";
import type { Task } from "@/domain/task";

export type ResumeProjection = {
  task: Task;
  establishedAt: string;
};

export function projectResume(input: {
  activeThread: ActiveThread | null;
  openTasks: readonly Task[];
}): ResumeProjection | null {
  const thread = input.activeThread;
  if (thread === null) {
    return null;
  }

  const task = input.openTasks.find((candidate) => candidate.id === thread.taskId);
  if (!task || task.completedAt !== null) {
    return null;
  }

  return {
    task,
    establishedAt: thread.establishedAt,
  };
}
