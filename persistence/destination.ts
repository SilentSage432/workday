import type { SupabaseClient } from "@supabase/supabase-js";
import {
  establishedAtFromAct,
  requireDestinationContent,
  requireDestinationId,
  requireEstablishedAt,
  type Destination,
  type NewDestination,
} from "@/domain/destination";
import { readCompleteDateRows } from "@/persistence/completeRead";

export const DESTINATION_COLUMNS = "id, content, established_at";

export type DestinationRow = {
  id: string;
  content: string;
  established_at: string;
};

export type DestinationInsertRow = {
  id: string;
  user_id: string;
  content: string;
  established_at: string;
};

export function rowToDestination(row: DestinationRow): Destination {
  return {
    id: requireDestinationId(row.id),
    content: requireDestinationContent(row.content),
    establishedAt: requireEstablishedAt(row.established_at),
  };
}

export function toDestinationInsert(userId: string, input: NewDestination): DestinationInsertRow {
  return {
    id: requireDestinationId(input.id),
    user_id: userId,
    content: requireDestinationContent(input.content),
    established_at: establishedAtFromAct(input.establishedAt),
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
 * Every Destination owned by the signed-in user.
 * Order is `established_at` ascending, then `id` ascending when those instants match.
 * That order is retrieval order. It is not rank, importance, or progress.
 * The returned array is the reported complete collection. A short page throws.
 */
export async function loadDestinations(client: SupabaseClient): Promise<Destination[]> {
  const rows = await readCompleteDateRows({
    client,
    table: "destinations",
    columns: DESTINATION_COLUMNS,
    dateColumn: "established_at",
    tieBreakColumns: ["id"],
  });
  return (rows as DestinationRow[]).map(rowToDestination);
}

export async function createDestination(
  client: SupabaseClient,
  input: NewDestination,
): Promise<Destination> {
  const userId = await requireUserId(client);
  const row = toDestinationInsert(userId, input);
  const { data, error } = await client
    .from("destinations")
    .insert(row)
    .select(DESTINATION_COLUMNS)
    .single();

  return rowToDestination(unwrap(data, error) as DestinationRow);
}
