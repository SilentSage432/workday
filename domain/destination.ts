const DESTINATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Destination = {
  id: string;
  content: string;
  establishedAt: string;
};

export type NewDestination = {
  id: string;
  content: string;
  establishedAt: Date;
};

export function requireDestinationContent(content: string): string {
  if (content.trim().length === 0) {
    throw new Error("A destination needs the human's words.");
  }
  return content;
}

export function requireDestinationId(id: string): string {
  if (!DESTINATION_ID.test(id)) {
    throw new Error("A destination needs a stable identity.");
  }
  return id;
}

export function establishedAtFromAct(establishedAt: Date): string {
  if (Number.isNaN(establishedAt.getTime())) {
    throw new Error("A destination records when it was established.");
  }
  return establishedAt.toISOString();
}

export function requireEstablishedAt(value: string): string {
  if (!value.includes("T")) {
    throw new Error("A destination records when it was established.");
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("A destination records when it was established.");
  }
  return instant.toISOString();
}
