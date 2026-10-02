export type ActiveThread = {
  taskId: string;
  establishedAt: string;
};

export function activeThreadFromEstablishment(
  taskId: string,
  establishedAt: string,
): ActiveThread {
  if (taskId.length === 0) {
    throw new Error("An active thread references a task.");
  }
  if (establishedAt.length === 0) {
    throw new Error("An active thread records when it was established.");
  }

  return { taskId, establishedAt };
}

export function activeThreadAfterCompletion(
  thread: ActiveThread | null,
  completedTaskId: string,
): ActiveThread | null {
  if (thread !== null && thread.taskId === completedTaskId) {
    return null;
  }
  return thread;
}
