import { requireDestinationId } from "@/domain/destination";

const PRIORITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Priority = {
  id: string;
  content: string;
  destinationId: string;
  establishedAt: string;
};

export type NewPriority = {
  id: string;
  content: string;
  destinationId: string;
  establishedAt: Date;
};

export function requirePriorityContent(content: string): string {
  if (content.trim().length === 0) {
    throw new Error("A priority needs the human's words.");
  }
  return content;
}

export function requirePriorityId(id: string): string {
  if (!PRIORITY_ID.test(id)) {
    throw new Error("A priority needs a stable identity.");
  }
  return id;
}

export function priorityEstablishedAtFromAct(establishedAt: Date): string {
  if (Number.isNaN(establishedAt.getTime())) {
    throw new Error("A priority records when it was established.");
  }
  return establishedAt.toISOString();
}

export function requirePriorityEstablishedAt(value: string): string {
  if (!value.includes("T")) {
    throw new Error("A priority records when it was established.");
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("A priority records when it was established.");
  }
  return instant.toISOString();
}

export function requirePriorityDestinationId(id: string): string {
  try {
    return requireDestinationId(id);
  } catch {
    throw new Error("A priority is downstream of an established destination.");
  }
}
