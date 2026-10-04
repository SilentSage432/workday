import type { SupabaseClient } from "@supabase/supabase-js";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";
import { readCompleteDateRows, requireCivilWindow, type CivilDateWindow } from "@/persistence/completeRead";
import {
  defineProtectedTime,
  type ProtectedTime,
  type ProtectedTimeInput,
} from "@/domain/protectedTime";

export const PROTECTED_TIME_COLUMNS =
  "id, starts_on, kind, start_local, end_local, label, created_at";

export type ProtectedTimeRow = {
  id: string;
  starts_on: string;
  kind: string;
  start_local: string | null;
  end_local: string | null;
  label: string | null;
  created_at: string;
};

export type ProtectedTimeWriteRow = {
  user_id: string;
  starts_on: string;
  kind: "all_day" | "timed";
  start_local: string | null;
  end_local: string | null;
  label: string | null;
};

function localForDatabase(value: string): string {
  return `${formatLocalTime(parseLocalTime(value))}:00`;
}

function localFromDatabase(value: string): string {
  return formatLocalTime(parseLocalTime(value));
}

export function rowToProtectedTime(row: ProtectedTimeRow): ProtectedTime {
  if (row.kind !== "all_day" && row.kind !== "timed") {
    throw new Error("This protected time has an unknown kind.");
  }
  if (row.id.length === 0 || row.created_at.length === 0) {
    throw new Error("This protected time is missing its identity.");
  }

  const defined = defineProtectedTime({
    kind: row.kind,
    startsOn: row.starts_on,
    startLocal: row.start_local ? localFromDatabase(row.start_local) : null,
    endLocal: row.end_local ? localFromDatabase(row.end_local) : null,
    label: row.label,
  });

  return { ...defined, id: row.id, createdAt: row.created_at };
}

export function toProtectedTimeWrite(
  userId: string,
  input: ProtectedTimeInput,
): ProtectedTimeWriteRow {
  const defined = defineProtectedTime(input);
  if (defined.kind === "all_day") {
    return {
      user_id: userId,
      starts_on: defined.startsOn,
      kind: "all_day",
      start_local: null,
      end_local: null,
      label: defined.label,
    };
  }

  return {
    user_id: userId,
    starts_on: defined.startsOn,
    kind: "timed",
    start_local: localForDatabase(defined.startLocal),
    end_local: localForDatabase(defined.endLocal),
    label: defined.label,
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

export async function loadProtectedTime(
  client: SupabaseClient,
  window?: CivilDateWindow,
): Promise<ProtectedTime[]> {
  const range = requireCivilWindow(window);
  const rows = await readCompleteDateRows({
    client,
    table: "protected_time",
    columns: PROTECTED_TIME_COLUMNS,
    dateColumn: "starts_on",
    tieBreakColumns: ["created_at", "id"],
    from: range.from,
    to: range.to,
  });
  return (rows as ProtectedTimeRow[]).map(rowToProtectedTime);
}

export async function createProtectedTime(
  client: SupabaseClient,
  input: ProtectedTimeInput,
): Promise<ProtectedTime> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("protected_time")
    .insert(toProtectedTimeWrite(userId, input))
    .select(PROTECTED_TIME_COLUMNS)
    .single();

  return rowToProtectedTime(unwrap(data, error) as ProtectedTimeRow);
}

export async function updateProtectedTime(
  client: SupabaseClient,
  id: string,
  input: ProtectedTimeInput,
): Promise<ProtectedTime> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("protected_time")
    .update(toProtectedTimeWrite(userId, input))
    .eq("id", id)
    .eq("user_id", userId)
    .select(PROTECTED_TIME_COLUMNS)
    .single();

  return rowToProtectedTime(unwrap(data, error) as ProtectedTimeRow);
}

export async function deleteProtectedTime(client: SupabaseClient, id: string): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client
    .from("protected_time")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
