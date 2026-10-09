import type { SupabaseClient } from "@supabase/supabase-js";
import {
  capturedAtFromEstablishment,
  NoteCitedError,
  requireCapturedAt,
  requireNoteContent,
  requireNoteId,
  requireRetiredAt,
  retiredAtFromRetirement,
  type NewNote,
  type Note,
} from "@/domain/note";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const NOTE_COLUMNS = "id, content, captured_at, retired_at";

export type NoteRow = {
  id: string;
  content: string;
  captured_at: string;
  retired_at: string | null;
};

export type NoteInsertRow = {
  id: string;
  user_id: string;
  content: string;
  captured_at: string;
};

export function rowToNote(row: NoteRow): Note {
  return {
    id: requireNoteId(row.id),
    content: requireNoteContent(row.content),
    capturedAt: requireCapturedAt(row.captured_at),
    retiredAt: requireRetiredAt(row.retired_at),
  };
}

export function toNoteInsert(userId: string, input: NewNote): NoteInsertRow {
  const content = requireNoteContent(input.content);
  const id = requireNoteId(input.id);
  return {
    id,
    user_id: userId,
    content,
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

function isProvenanceCitationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23503") return true;
  const message = error.message ?? "";
  return /originating_note|tasks_originating_note|foreign key/i.test(message);
}

/**
 * Current operational Notes for the signed-in user (`retired_at` is null).
 * Order is `captured_at` ascending, then `id` ascending when those instants match.
 * That order is retrieval order. It is not importance and not recency-as-priority.
 * The returned array is the reported complete collection. A short page throws.
 */
export async function loadNotes(client: SupabaseClient): Promise<Note[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("notes")
        .select(NOTE_COLUMNS, { count: "exact" })
        .is("retired_at", null)
        .order("captured_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as NoteRow[], total: count };
    },
  });
  return rows.map(rowToNote);
}

export async function createNote(client: SupabaseClient, input: NewNote): Promise<Note> {
  const userId = await requireUserId(client);
  const row = toNoteInsert(userId, input);
  const { data, error } = await client.from("notes").insert(row).select(NOTE_COLUMNS).single();

  return rowToNote(unwrap(data, error) as NoteRow);
}

/**
 * Leaves current operational Notes. Does not delete. Does not alter content,
 * capture instant, or Task provenance. Fails if the Note is already retired
 * or missing.
 */
export async function retireNote(
  client: SupabaseClient,
  input: { id: string; retiredAt: Date },
): Promise<Note> {
  await requireUserId(client);
  const id = requireNoteId(input.id);
  const retiredAt = retiredAtFromRetirement(input.retiredAt);

  const { data, error } = await client
    .from("notes")
    .update({ retired_at: retiredAt })
    .eq("id", id)
    .is("retired_at", null)
    .select(NOTE_COLUMNS)
    .single();

  return rowToNote(unwrap(data, error) as NoteRow);
}

/**
 * Hard-deletes an owned Note. Cited Notes fail under Task provenance
 * (ON DELETE NO ACTION) and surface as NoteCitedError. Citations are not cleared.
 */
export async function deleteNote(client: SupabaseClient, id: string): Promise<void> {
  await requireUserId(client);
  const noteId = requireNoteId(id);

  const { error } = await client.from("notes").delete().eq("id", noteId);
  if (!error) return;
  if (isProvenanceCitationError(error)) {
    throw new NoteCitedError();
  }
  throw new Error(error.message);
}
