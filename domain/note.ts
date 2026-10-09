const NOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Note = {
  id: string;
  content: string;
  capturedAt: string;
  /** Null means current operational Notes. Set when the Note is retired. */
  retiredAt: string | null;
};

export type NewNote = {
  id: string;
  content: string;
  capturedAt: Date;
};

/** Cited Note deletion failed under Task provenance. Not a generic write failure. */
export class NoteCitedError extends Error {
  readonly code = "note_cited" as const;

  constructor(
    message = "This Note is retained because a Task was established from it. Retire it instead.",
  ) {
    super(message);
    this.name = "NoteCitedError";
  }
}

export function requireNoteContent(content: string): string {
  if (content.trim().length === 0) {
    throw new Error("A note needs retained experience.");
  }
  return content;
}

export function requireNoteId(id: string): string {
  if (!NOTE_ID.test(id)) {
    throw new Error("A note needs a stable identity.");
  }
  return id;
}

export function capturedAtFromEstablishment(capturedAt: Date): string {
  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("A note records when it was retained.");
  }
  return capturedAt.toISOString();
}

export function requireCapturedAt(value: string): string {
  if (!value.includes("T")) {
    throw new Error("A note records when it was retained.");
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("A note records when it was retained.");
  }
  return instant.toISOString();
}

export function retiredAtFromRetirement(retiredAt: Date): string {
  if (Number.isNaN(retiredAt.getTime())) {
    throw new Error("A note records when it left current Notes.");
  }
  return retiredAt.toISOString();
}

export function requireRetiredAt(value: string | null): string | null {
  if (value == null) return null;
  return requireCapturedAt(value);
}

export function isCurrentNote(note: Pick<Note, "retiredAt">): boolean {
  return note.retiredAt === null;
}
