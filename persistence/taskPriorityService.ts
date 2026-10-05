import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireTaskServiceEstablishedAt,
  requireTaskServicePriorityId,
  requireTaskServiceTaskId,
  taskServiceEstablishedAtFromAct,
  type NewTaskPriorityService,
  type TaskPriorityService,
} from "@/domain/executionDirection";
import { readCompleteDateRows } from "@/persistence/completeRead";

export const TASK_PRIORITY_SERVICE_COLUMNS = "task_id, priority_id, established_at";

export type TaskPriorityServiceRow = {
  task_id: string;
  priority_id: string;
  established_at: string;
};

export type TaskPriorityServiceInsertRow = TaskPriorityServiceRow & {
  user_id: string;
};

export function rowToTaskPriorityService(row: TaskPriorityServiceRow): TaskPriorityService {
  return {
    taskId: requireTaskServiceTaskId(row.task_id),
    priorityId: requireTaskServicePriorityId(row.priority_id),
    establishedAt: requireTaskServiceEstablishedAt(row.established_at),
  };
}

export function toTaskPriorityServiceInsert(
  userId: string,
  input: NewTaskPriorityService,
): TaskPriorityServiceInsertRow {
  return {
    user_id: userId,
    task_id: requireTaskServiceTaskId(input.taskId),
    priority_id: requireTaskServicePriorityId(input.priorityId),
    established_at: taskServiceEstablishedAtFromAct(input.establishedAt),
  };
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("A signed-in user is required.");
  }
  return data.user.id;
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("The database returned no row.");
  }
  return data;
}

async function findTaskPriorityService(
  client: SupabaseClient,
  row: TaskPriorityServiceInsertRow,
): Promise<TaskPriorityService | null> {
  const { data, error } = await client
    .from("task_priority_service")
    .select(TASK_PRIORITY_SERVICE_COLUMNS)
    .eq("user_id", row.user_id)
    .eq("task_id", row.task_id)
    .eq("priority_id", row.priority_id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return rowToTaskPriorityService(data as TaskPriorityServiceRow);
}

/**
 * Every Task-Priority pair owned by the signed-in user.
 * Order is `established_at` ascending, then `task_id`, then `priority_id`.
 * That order is retrieval order. It is not rank or progress.
 * A short or failed page throws and returns nothing.
 */
export async function loadTaskPriorityService(client: SupabaseClient): Promise<TaskPriorityService[]> {
  const rows = await readCompleteDateRows({
    client,
    table: "task_priority_service",
    columns: TASK_PRIORITY_SERVICE_COLUMNS,
    dateColumn: "established_at",
    tieBreakColumns: ["task_id", "priority_id"],
  });
  return (rows as TaskPriorityServiceRow[]).map(rowToTaskPriorityService);
}

/**
 * Explicitly establishes this Task in service of this Priority.
 * A repeated act for the same pair returns the existing row and does not write again.
 */
export async function establishTaskPriorityService(
  client: SupabaseClient,
  input: NewTaskPriorityService,
): Promise<TaskPriorityService> {
  const userId = await requireUserId(client);
  const row = toTaskPriorityServiceInsert(userId, input);
  const existing = await findTaskPriorityService(client, row);
  if (existing) return existing;

  const { data, error } = await client
    .from("task_priority_service")
    .insert(row)
    .select(TASK_PRIORITY_SERVICE_COLUMNS)
    .single();
  if (error?.code === "23505") {
    const raced = await findTaskPriorityService(client, row);
    if (raced) return raced;
  }
  return rowToTaskPriorityService(unwrap(data, error) as TaskPriorityServiceRow);
}

/**
 * Removes this Task-Priority pair. The Task and the Priority are not written.
 */
export async function withdrawTaskPriorityService(
  client: SupabaseClient,
  input: { taskId: string; priorityId: string },
): Promise<void> {
  const userId = await requireUserId(client);
  const taskId = requireTaskServiceTaskId(input.taskId);
  const priorityId = requireTaskServicePriorityId(input.priorityId);
  const { error } = await client
    .from("task_priority_service")
    .delete()
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("priority_id", priorityId);
  if (error) {
    throw new Error(error.message);
  }
}
