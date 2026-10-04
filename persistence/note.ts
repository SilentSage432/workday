import type { SupabaseClient } from "@supabase/supabase-js";
import {
  capturedAtFromEstablishment,
  requireCapturedAt,
  requireNoteContent,
  requireNoteId,
  type NewNote,
  type Note,
} from "@/domain/note";
import { readCompleteDateRows } from "@/persistence/completeRead";

export const NOTE_COLUMNS = "id, content, captured_at";

export type NoteRow = {
  id: string;
  content: string;
  captured_at: string;
};

export type NoteInsertRow = {
  user_id: string;
  content: string;
  captured_at: string;
};

export function rowToNote(row: NoteRow): Note {
  return {
    id: requireNoteId(row.id),
    content: requireNoteContent(row.content),
    capturedAt: requireCapturedAt(row.captured_at),
  };
}

export function toNoteInsert(userId: string, input: NewNote): NoteInsertRow {
  return {
    user_id: userId,
    content: requireNoteContent(input.content),
    captured_at: capturedAtFromEstablishment(input.capturedAt),
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
 * Every Note owned by the signed-in user.
 * Order is `captured_at` ascending, then `id` ascending when those instants match.
 * That order is retrieval order. It is not importance and not recency-as-priority.
 * The returned array is the reported complete collection. A short page throws.
 */
export async function loadNotes(client: SupabaseClient): Promise<Note[]> {
  const rows = await readCompleteDateRows({
    client,
    table: "notes",
    columns: NOTE_COLUMNS,
    dateColumn: "captured_at",
    tieBreakColumns: ["id"],
  });
  return (rows as NoteRow[]).map(rowToNote);
}

export async function createNote(client: SupabaseClient, input: NewNote): Promise<Note> {
  const userId = await requireUserId(client);
  const row = toNoteInsert(userId, input);
  const { data, error } = await client.from("notes").insert(row).select(NOTE_COLUMNS).single();

  return rowToNote(unwrap(data, error) as NoteRow);
}
