import type { SupabaseClient } from "@supabase/supabase-js";
import {
  blockServiceEstablishedAtFromAct,
  requireBlockServiceBlockId,
  requireBlockServiceEstablishedAt,
  requireBlockServicePriorityId,
  type BlockPriorityService,
  type NewBlockPriorityService,
} from "@/domain/executionDirection";
import { readCompleteDateRows } from "@/persistence/completeRead";

export const BLOCK_PRIORITY_SERVICE_COLUMNS = "block_id, priority_id, established_at";

export type BlockPriorityServiceRow = {
  block_id: string;
  priority_id: string;
  established_at: string;
};

export type BlockPriorityServiceInsertRow = BlockPriorityServiceRow & {
  user_id: string;
};

export function rowToBlockPriorityService(row: BlockPriorityServiceRow): BlockPriorityService {
  return {
    blockId: requireBlockServiceBlockId(row.block_id),
    priorityId: requireBlockServicePriorityId(row.priority_id),
    establishedAt: requireBlockServiceEstablishedAt(row.established_at),
  };
}

export function toBlockPriorityServiceInsert(
  userId: string,
  input: NewBlockPriorityService,
): BlockPriorityServiceInsertRow {
  return {
    user_id: userId,
    block_id: requireBlockServiceBlockId(input.blockId),
    priority_id: requireBlockServicePriorityId(input.priorityId),
    established_at: blockServiceEstablishedAtFromAct(input.establishedAt),
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

async function findBlockPriorityService(
  client: SupabaseClient,
  row: BlockPriorityServiceInsertRow,
): Promise<BlockPriorityService | null> {
  const { data, error } = await client
    .from("block_priority_service")
    .select(BLOCK_PRIORITY_SERVICE_COLUMNS)
    .eq("user_id", row.user_id)
    .eq("block_id", row.block_id)
    .eq("priority_id", row.priority_id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return rowToBlockPriorityService(data as BlockPriorityServiceRow);
}

/**
 * Every Block-Priority pair owned by the signed-in user.
 * Order is `established_at` ascending, then `block_id`, then `priority_id`.
 * That order is retrieval order. It is not rank or progress.
 * A short or failed page throws and returns nothing.
 */
export async function loadBlockPriorityService(client: SupabaseClient): Promise<BlockPriorityService[]> {
  const rows = await readCompleteDateRows({
    client,
    table: "block_priority_service",
    columns: BLOCK_PRIORITY_SERVICE_COLUMNS,
    dateColumn: "established_at",
    tieBreakColumns: ["block_id", "priority_id"],
  });
  return (rows as BlockPriorityServiceRow[]).map(rowToBlockPriorityService);
}

/**
 * Explicitly establishes this Block in service of this Priority.
 * A repeated act for the same pair returns the existing row and does not write again.
 */
export async function establishBlockPriorityService(
  client: SupabaseClient,
  input: NewBlockPriorityService,
): Promise<BlockPriorityService> {
  const userId = await requireUserId(client);
  const row = toBlockPriorityServiceInsert(userId, input);
  const existing = await findBlockPriorityService(client, row);
  if (existing) return existing;

  const { data, error } = await client
    .from("block_priority_service")
    .insert(row)
    .select(BLOCK_PRIORITY_SERVICE_COLUMNS)
    .single();
  if (error?.code === "23505") {
    const raced = await findBlockPriorityService(client, row);
    if (raced) return raced;
  }
  return rowToBlockPriorityService(unwrap(data, error) as BlockPriorityServiceRow);
}

/**
 * Removes this Block-Priority pair. The Block and the Priority are not written.
 */
export async function withdrawBlockPriorityService(
  client: SupabaseClient,
  input: { blockId: string; priorityId: string },
): Promise<void> {
  const userId = await requireUserId(client);
  const blockId = requireBlockServiceBlockId(input.blockId);
  const priorityId = requireBlockServicePriorityId(input.priorityId);
  const { error } = await client
    .from("block_priority_service")
    .delete()
    .eq("user_id", userId)
    .eq("block_id", blockId)
    .eq("priority_id", priorityId);
  if (error) {
    throw new Error(error.message);
  }
}
