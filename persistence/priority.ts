import type { SupabaseClient } from "@supabase/supabase-js";
import {
  priorityEstablishedAtFromAct,
  requirePriorityContent,
  requirePriorityDestinationId,
  requirePriorityEstablishedAt,
  requirePriorityId,
  type NewPriority,
  type Priority,
} from "@/domain/priority";
import { readCompleteDateRows } from "@/persistence/completeRead";

export const PRIORITY_COLUMNS = "id, content, destination_id, established_at";

export type PriorityRow = {
  id: string;
  content: string;
  destination_id: string;
  established_at: string;
};

export type PriorityInsertRow = {
  id: string;
  user_id: string;
  destination_id: string;
  content: string;
  established_at: string;
};

export function rowToPriority(row: PriorityRow): Priority {
  return {
    id: requirePriorityId(row.id),
    content: requirePriorityContent(row.content),
    destinationId: requirePriorityDestinationId(row.destination_id),
    establishedAt: requirePriorityEstablishedAt(row.established_at),
  };
}

export function toPriorityInsert(userId: string, input: NewPriority): PriorityInsertRow {
  return {
    id: requirePriorityId(input.id),
    user_id: userId,
    destination_id: requirePriorityDestinationId(input.destinationId),
    content: requirePriorityContent(input.content),
    established_at: priorityEstablishedAtFromAct(input.establishedAt),
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

/**
 * Every Priority owned by the signed-in user.
 * Order is `established_at` ascending, then `id` ascending when those instants match.
 * That order is retrieval order. It is not rank, urgency, or progress.
 * The returned array is the reported complete collection. A short page throws.
 */
export async function loadPriorities(client: SupabaseClient): Promise<Priority[]> {
  const rows = await readCompleteDateRows({
    client,
    table: "priorities",
    columns: PRIORITY_COLUMNS,
    dateColumn: "established_at",
    tieBreakColumns: ["id"],
  });
  return (rows as PriorityRow[]).map(rowToPriority);
}

export async function createPriority(client: SupabaseClient, input: NewPriority): Promise<Priority> {
  const userId = await requireUserId(client);
  const row = toPriorityInsert(userId, input);
  const { data, error } = await client.from("priorities").insert(row).select(PRIORITY_COLUMNS).single();

  return rowToPriority(unwrap(data, error) as PriorityRow);
}
