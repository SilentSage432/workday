import { requirePriorityId } from "@/domain/priority";

const EXECUTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TaskPriorityService = {
  taskId: string;
  priorityId: string;
  establishedAt: string;
};

export type NewTaskPriorityService = {
  taskId: string;
  priorityId: string;
  establishedAt: Date;
};

export type BlockPriorityService = {
  blockId: string;
  priorityId: string;
  establishedAt: string;
};

export type NewBlockPriorityService = {
  blockId: string;
  priorityId: string;
  establishedAt: Date;
};

export function requireTaskServiceTaskId(id: string): string {
  if (!EXECUTION_ID.test(id)) {
    throw new Error("A task needs a stable identity.");
  }
  return id;
}

export function requireBlockServiceBlockId(id: string): string {
  if (!EXECUTION_ID.test(id)) {
    throw new Error("A block needs a stable identity.");
  }
  return id;
}

export function requireTaskServicePriorityId(id: string): string {
  try {
    return requirePriorityId(id);
  } catch {
    throw new Error("A task is in service of an established priority.");
  }
}

export function requireBlockServicePriorityId(id: string): string {
  try {
    return requirePriorityId(id);
  } catch {
    throw new Error("A block is in service of an established priority.");
  }
}

export function taskServiceEstablishedAtFromAct(establishedAt: Date): string {
  if (Number.isNaN(establishedAt.getTime())) {
    throw new Error("A task in service of a priority records when it was established.");
  }
  return establishedAt.toISOString();
}

export function blockServiceEstablishedAtFromAct(establishedAt: Date): string {
  if (Number.isNaN(establishedAt.getTime())) {
    throw new Error("A block in service of a priority records when it was established.");
  }
  return establishedAt.toISOString();
}

export function requireTaskServiceEstablishedAt(value: string): string {
  if (!value.includes("T")) {
    throw new Error("A task in service of a priority records when it was established.");
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("A task in service of a priority records when it was established.");
  }
  return instant.toISOString();
}

export function requireBlockServiceEstablishedAt(value: string): string {
  if (!value.includes("T")) {
    throw new Error("A block in service of a priority records when it was established.");
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("A block in service of a priority records when it was established.");
  }
  return instant.toISOString();
}
