export const TASK_ORIGIN_USER_CREATED = "user_created" as const;

export type TaskOrigin = typeof TASK_ORIGIN_USER_CREATED;

export type Task = {
  id: string;
  title: string;
  contextId: string | null;
  createdAt: string;
  completedAt: string | null;
  dueOn: string | null;
  plannedOn: string | null;
  mustDo: boolean;
  origin: TaskOrigin;
};

export type NewTask = {
  title: string;
  contextId?: string | null;
  dueOn?: string | null;
  plannedOn?: string | null;
  mustDo?: boolean;
};

export type TaskPatch = {
  title?: string;
  contextId?: string | null;
  dueOn?: string | null;
  plannedOn?: string | null;
  mustDo?: boolean;
};
