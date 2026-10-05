import { formatLocalTime, localMinutes, parseLocalTime } from "@/domain/time/localTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";

const PURPOSE_LIMIT = 80;

type BlockBase = {
  startsOn: string;
  purpose: string;
  contextId: string | null;
  taskId: string | null;
};

export type AllDayBlock = BlockBase & {
  kind: "all_day";
};

export type TimedBlock = BlockBase & {
  kind: "timed";
  startLocal: string;
  endLocal: string;
};

export type BlockInput = AllDayBlock | TimedBlock;

export type Block = BlockInput & {
  id: string;
  createdAt: string;
};

export function timedBlockEndsNextCivilDate(startLocal: string, endLocal: string): boolean {
  return localMinutes(parseLocalTime(endLocal)) <= localMinutes(parseLocalTime(startLocal));
}

export function defineBlock(input: {
  kind: "all_day" | "timed";
  startsOn: string;
  startLocal?: string | null;
  endLocal?: string | null;
  purpose?: string | null;
  contextId?: string | null;
  taskId?: string | null;
}): BlockInput {
  const startsOn = formatCivilDate(parseCivilDate(input.startsOn));
  const purpose = requirePurpose(input.purpose);
  const contextId = normalizeContextId(input.contextId);
  const taskId = normalizeTaskId(input.taskId);

  if (input.kind === "all_day") {
    return { kind: "all_day", startsOn, purpose, contextId, taskId };
  }

  if (!input.startLocal || !input.endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return {
    kind: "timed",
    startsOn,
    startLocal: formatLocalTime(parseLocalTime(input.startLocal)),
    endLocal: formatLocalTime(parseLocalTime(input.endLocal)),
    purpose,
    contextId,
    taskId,
  };
}

export function requirePurpose(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("A block needs a purpose.");
  }
  if (trimmed.length > PURPOSE_LIMIT) {
    throw new Error("A purpose can be at most 80 characters.");
  }
  return trimmed;
}

function normalizeContextId(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeTaskId(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
