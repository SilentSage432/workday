import type { SupabaseClient } from "@supabase/supabase-js";
import { defineBlock, type Block, type BlockInput } from "@/domain/block";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";
import { readCompleteDateRows, requireCivilWindow, type CivilDateWindow } from "@/persistence/completeRead";

export const BLOCK_COLUMNS =
  "id, starts_on, kind, start_local, end_local, context_id, purpose, task_id, created_at";

export type BlockRow = {
  id: string;
  starts_on: string;
  kind: string;
  start_local: string | null;
  end_local: string | null;
  context_id: string | null;
  purpose: string;
  task_id: string | null;
  created_at: string;
};

export type BlockWriteRow = {
  user_id: string;
  starts_on: string;
  kind: "all_day" | "timed";
  start_local: string | null;
  end_local: string | null;
  context_id: string | null;
  purpose: string;
  task_id: string | null;
};

function localForDatabase(value: string): string {
  return `${formatLocalTime(parseLocalTime(value))}:00`;
}

function localFromDatabase(value: string): string {
  return formatLocalTime(parseLocalTime(value));
}

export function rowToBlock(row: BlockRow): Block {
  if (row.kind !== "all_day" && row.kind !== "timed") {
    throw new Error("This block has an unknown kind.");
  }
  if (row.id.length === 0 || row.created_at.length === 0) {
    throw new Error("This block is missing its identity.");
  }

  const defined = defineBlock({
    kind: row.kind,
    startsOn: row.starts_on,
    startLocal: row.start_local ? localFromDatabase(row.start_local) : null,
    endLocal: row.end_local ? localFromDatabase(row.end_local) : null,
    purpose: row.purpose,
    contextId: row.context_id,
    taskId: row.task_id,
  });

  return { ...defined, id: row.id, createdAt: row.created_at };
}

export function toBlockWrite(userId: string, input: BlockInput): BlockWriteRow {
  const defined = defineBlock(input);
  if (defined.kind === "all_day") {
    return {
      user_id: userId,
      starts_on: defined.startsOn,
      kind: "all_day",
      start_local: null,
      end_local: null,
      context_id: defined.contextId,
      purpose: defined.purpose,
      task_id: defined.taskId,
    };
  }

  return {
    user_id: userId,
    starts_on: defined.startsOn,
    kind: "timed",
    start_local: localForDatabase(defined.startLocal),
    end_local: localForDatabase(defined.endLocal),
    context_id: defined.contextId,
    purpose: defined.purpose,
    task_id: defined.taskId,
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

export async function loadBlocks(client: SupabaseClient, window?: CivilDateWindow): Promise<Block[]> {
  const range = requireCivilWindow(window);
  const rows = await readCompleteDateRows({
    client,
    table: "blocks",
    columns: BLOCK_COLUMNS,
    dateColumn: "starts_on",
    tieBreakColumns: ["created_at", "id"],
    from: range.from,
    to: range.to,
  });
  return (rows as BlockRow[]).map(rowToBlock);
}

export async function createBlock(client: SupabaseClient, input: BlockInput): Promise<Block> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("blocks")
    .insert(toBlockWrite(userId, input))
    .select(BLOCK_COLUMNS)
    .single();

  return rowToBlock(unwrap(data, error) as BlockRow);
}

export async function updateBlock(
  client: SupabaseClient,
  id: string,
  input: BlockInput,
): Promise<Block> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("blocks")
    .update(toBlockWrite(userId, input))
    .eq("id", id)
    .eq("user_id", userId)
    .select(BLOCK_COLUMNS)
    .single();

  return rowToBlock(unwrap(data, error) as BlockRow);
}

export async function deleteBlock(client: SupabaseClient, id: string): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from("blocks").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}
