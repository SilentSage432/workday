import type { SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "@/domain/context";
import type { NewTask, Task, TaskPatch } from "@/domain/task";
import {
  rowToContext,
  rowToTask,
  toCompletionUpdate,
  toTaskInsert,
  toTaskUpdate,
} from "@/persistence/contextTaskMapping";
import type { ContextRow, TaskRow } from "@/persistence/contextTaskRows";

const CONTEXT_COLUMNS = "id, name, created_at";
const TASK_COLUMNS =
  "id, context_id, title, created_at, completed_at, due_on, planned_on, must_do, origin";

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

export async function loadContexts(client: SupabaseClient): Promise<Context[]> {
  const { data, error } = await client
    .from("contexts")
    .select(CONTEXT_COLUMNS)
    .order("created_at", { ascending: true });

  const rows = unwrap(data, error) as ContextRow[];
  return rows.map(rowToContext);
}

export async function createTask(client: SupabaseClient, input: NewTask): Promise<Task> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("tasks")
    .insert(toTaskInsert(userId, input))
    .select(TASK_COLUMNS)
    .single();

  return rowToTask(unwrap(data, error) as TaskRow);
}

export async function loadOpenTasks(client: SupabaseClient): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select(TASK_COLUMNS)
    .is("completed_at", null)
    .order("created_at", { ascending: true });

  const rows = unwrap(data, error) as TaskRow[];
  return rows.map(rowToTask);
}

export async function updateTask(
  client: SupabaseClient,
  id: string,
  patch: TaskPatch,
): Promise<Task> {
  await requireUserId(client);
  const { data, error } = await client
    .from("tasks")
    .update(toTaskUpdate(patch))
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  return rowToTask(unwrap(data, error) as TaskRow);
}

export async function completeTask(
  client: SupabaseClient,
  id: string,
  completedAt: Date,
): Promise<Task> {
  await requireUserId(client);
  const { data, error } = await client
    .from("tasks")
    .update(toCompletionUpdate(completedAt))
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  return rowToTask(unwrap(data, error) as TaskRow);
}
