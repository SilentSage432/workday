const NOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Note = {
  id: string;
  content: string;
  capturedAt: string;
};

export type NewNote = {
  content: string;
  capturedAt: Date;
};

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
