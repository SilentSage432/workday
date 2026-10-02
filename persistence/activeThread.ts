import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activeThreadFromEstablishment,
  type ActiveThread,
} from "@/domain/activeThread";

export type ActiveThreadRow = {
  task_id: string;
  established_at: string;
};

export type ActiveThreadWriteRow = {
  user_id: string;
  task_id: string;
  established_at: string;
};

export const ACTIVE_THREAD_COLUMNS = "task_id, established_at";

export function rowToActiveThread(row: ActiveThreadRow): ActiveThread {
  return activeThreadFromEstablishment(row.task_id, row.established_at);
}

export function toActiveThreadWrite(
  userId: string,
  taskId: string,
  establishedAt: Date,
): ActiveThreadWriteRow {
  if (Number.isNaN(establishedAt.getTime())) {
    throw new Error("Establishing a thread requires a real instant.");
  }

  const thread = activeThreadFromEstablishment(taskId, establishedAt.toISOString());
  return {
    user_id: userId,
    task_id: thread.taskId,
    established_at: thread.establishedAt,
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

export async function loadActiveThread(client: SupabaseClient): Promise<ActiveThread | null> {
  const { data, error } = await client
    .from("active_threads")
    .select(ACTIVE_THREAD_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    return null;
  }
  return rowToActiveThread(data as ActiveThreadRow);
}

export async function establishActiveThread(
  client: SupabaseClient,
  taskId: string,
  establishedAt: Date,
): Promise<ActiveThread> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("active_threads")
    .upsert(toActiveThreadWrite(userId, taskId, establishedAt), { onConflict: "user_id" })
    .select(ACTIVE_THREAD_COLUMNS)
    .single();

  return rowToActiveThread(unwrap(data, error) as ActiveThreadRow);
}

export async function clearActiveThread(client: SupabaseClient): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from("active_threads").delete().eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}
