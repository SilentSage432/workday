import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defineCommitment,
  requireCommitmentOrigin,
  type Commitment,
  type CommitmentInput,
} from "@/domain/commitment";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";

export const COMMITMENT_COLUMNS =
  "id, starts_on, kind, start_local, end_local, title, origin, created_at";

export type CommitmentRow = {
  id: string;
  starts_on: string;
  kind: string;
  start_local: string | null;
  end_local: string | null;
  title: string;
  origin: string;
  created_at: string;
};

export type CommitmentWriteRow = {
  user_id: string;
  starts_on: string;
  kind: "all_day" | "timed";
  start_local: string | null;
  end_local: string | null;
  title: string;
  origin: "user_created";
};

function localForDatabase(value: string): string {
  return `${formatLocalTime(parseLocalTime(value))}:00`;
}

function localFromDatabase(value: string): string {
  return formatLocalTime(parseLocalTime(value));
}

export function rowToCommitment(row: CommitmentRow): Commitment {
  if (row.kind !== "all_day" && row.kind !== "timed") {
    throw new Error("This commitment has an unknown kind.");
  }
  if (row.id.length === 0 || row.created_at.length === 0) {
    throw new Error("This commitment is missing its identity.");
  }
  requireCommitmentOrigin(row.origin);

  const defined = defineCommitment({
    kind: row.kind,
    startsOn: row.starts_on,
    startLocal: row.start_local ? localFromDatabase(row.start_local) : null,
    endLocal: row.end_local ? localFromDatabase(row.end_local) : null,
    title: row.title,
  });

  return { ...defined, id: row.id, createdAt: row.created_at };
}

export function toCommitmentWrite(userId: string, input: CommitmentInput): CommitmentWriteRow {
  const defined = defineCommitment(input);
  if (defined.kind === "all_day") {
    return {
      user_id: userId,
      starts_on: defined.startsOn,
      kind: "all_day",
      start_local: null,
      end_local: null,
      title: defined.title,
      origin: defined.origin,
    };
  }

  return {
    user_id: userId,
    starts_on: defined.startsOn,
    kind: "timed",
    start_local: localForDatabase(defined.startLocal),
    end_local: localForDatabase(defined.endLocal),
    title: defined.title,
    origin: defined.origin,
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

export async function loadCommitments(client: SupabaseClient): Promise<Commitment[]> {
  const { data, error } = await client
    .from("commitments")
    .select(COMMITMENT_COLUMNS)
    .order("starts_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CommitmentRow[]).map(rowToCommitment);
}

export async function createCommitment(
  client: SupabaseClient,
  input: CommitmentInput,
): Promise<Commitment> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("commitments")
    .insert(toCommitmentWrite(userId, input))
    .select(COMMITMENT_COLUMNS)
    .single();

  return rowToCommitment(unwrap(data, error) as CommitmentRow);
}

export async function updateCommitment(
  client: SupabaseClient,
  id: string,
  input: CommitmentInput,
): Promise<Commitment> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("commitments")
    .update(toCommitmentWrite(userId, input))
    .eq("id", id)
    .eq("user_id", userId)
    .select(COMMITMENT_COLUMNS)
    .single();

  return rowToCommitment(unwrap(data, error) as CommitmentRow);
}

export async function deleteCommitment(client: SupabaseClient, id: string): Promise<void> {
  const userId = await requireUserId(client);
  const { error } = await client.from("commitments").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}
