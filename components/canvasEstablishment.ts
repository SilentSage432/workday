import { defineBlock, type BlockInput } from "@/domain/block";
import { defineCommitment, type CommitmentInput } from "@/domain/commitment";
import { defineProtectedTime, type ProtectedTimeInput } from "@/domain/protectedTime";
import {
  minuteToLocalText,
  type IntendedMeaning,
  type SelectionClock,
  type TimeSelection,
} from "@/components/daySelection";

/**
 * Builds a timed fact from the one transient selection.
 * The caller persists it only after an explicit establishment action.
 * An unresolved local clock range is refused here so no instant is chosen.
 */

export type CanvasContextOption = {
  id: string;
  name: string;
};

export type OpenTaskChoice = {
  id: string;
  title: string;
};

export type OpenTaskChoices =
  | { status: "loading" }
  | { status: "ready"; tasks: readonly OpenTaskChoice[] }
  | { status: "error"; message: string };

export type CanvasEstablishment =
  | { meaning: "protected_time"; input: ProtectedTimeInput }
  | { meaning: "block"; input: BlockInput }
  | { meaning: "commitment"; input: CommitmentInput };

export type CanvasFactUpdate = { id: string } & CanvasEstablishment;

export type CanvasFactRemoval = {
  meaning: "protected_time" | "block" | "commitment";
  id: string;
};

export const UNRESOLVED_ESTABLISHMENT = "Save stays unavailable for this local clock range.";

export function establishmentBlocked(clock: SelectionClock): string | null {
  if (clock === "ordinary") return null;
  return UNRESOLVED_ESTABLISHMENT;
}

export function establishFromSelection(input: {
  selection: TimeSelection;
  meaning: IntendedMeaning;
  clock: SelectionClock;
  label: string;
  purpose: string;
  contextId: string;
  title: string;
  taskId?: string | null;
}): CanvasEstablishment {
  const blocked = establishmentBlocked(input.clock);
  if (blocked) {
    throw new Error(blocked);
  }
  const bounds = {
    kind: "timed" as const,
    startsOn: input.selection.civilDate,
    startLocal: minuteToLocalText(input.selection.startMinute),
    endLocal: minuteToLocalText(input.selection.endMinute),
  };
  if (input.meaning === "protected_time") {
    return {
      meaning: "protected_time",
      input: defineProtectedTime({ ...bounds, label: input.label }),
    };
  }
  if (input.meaning === "block") {
    return {
      meaning: "block",
      input: defineBlock({
        ...bounds,
        purpose: input.purpose,
        contextId: input.contextId.trim().length === 0 ? null : input.contextId,
        taskId: input.taskId,
      }),
    };
  }
  return {
    meaning: "commitment",
    input: defineCommitment({ ...bounds, title: input.title }),
  };
}

/**
 * Builds an update for one existing fact. The id stays. The kind stays timed.
 * `startsOn` is the draft civil date the caller supplies.
 * A Commitment input still carries user_created through defineCommitment.
 */
export function updateFromStored(input: {
  id: string;
  startsOn: string;
  meaning: CanvasFactRemoval["meaning"];
  startMinute: number;
  endMinute: number;
  clock: SelectionClock;
  label: string;
  purpose: string;
  contextId: string;
  title: string;
  taskId?: string | null;
}): CanvasFactUpdate {
  const blocked = establishmentBlocked(input.clock);
  if (blocked) {
    throw new Error(blocked);
  }
  const bounds = {
    kind: "timed" as const,
    startsOn: input.startsOn,
    startLocal: minuteToLocalText(input.startMinute),
    endLocal: minuteToLocalText(input.endMinute),
  };
  if (input.meaning === "protected_time") {
    return {
      id: input.id,
      meaning: "protected_time",
      input: defineProtectedTime({ ...bounds, label: input.label }),
    };
  }
  if (input.meaning === "block") {
    return {
      id: input.id,
      meaning: "block",
      input: defineBlock({
        ...bounds,
        purpose: input.purpose,
        contextId: input.contextId.trim().length === 0 ? null : input.contextId,
        taskId: input.taskId,
      }),
    };
  }
  return {
    id: input.id,
    meaning: "commitment",
    input: defineCommitment({ ...bounds, title: input.title }),
  };
}

/**
 * Builds an all-day fact from an explicit all-day establishment act.
 * No clock values are invented. Callers must already have chosen all-day.
 */
export function establishAllDay(input: {
  startsOn: string;
  meaning: IntendedMeaning;
  label: string;
  purpose: string;
  contextId: string;
  title: string;
  taskId?: string | null;
}): CanvasEstablishment {
  const startsOn = input.startsOn.trim();
  if (startsOn.length === 0) {
    throw new Error("Choose a date.");
  }
  const bounds = { kind: "all_day" as const, startsOn };
  if (input.meaning === "protected_time") {
    return {
      meaning: "protected_time",
      input: defineProtectedTime({ ...bounds, label: input.label }),
    };
  }
  if (input.meaning === "block") {
    return {
      meaning: "block",
      input: defineBlock({
        ...bounds,
        purpose: input.purpose,
        contextId: input.contextId.trim().length === 0 ? null : input.contextId,
        taskId: input.taskId,
      }),
    };
  }
  return {
    meaning: "commitment",
    input: defineCommitment({ ...bounds, title: input.title }),
  };
}

/**
 * Same-id all-day correction. Kind stays all_day. No clocks are invented.
 */
export function updateFromAllDayStored(input: {
  id: string;
  startsOn: string;
  meaning: CanvasFactRemoval["meaning"];
  label: string;
  purpose: string;
  contextId: string;
  title: string;
  taskId?: string | null;
}): CanvasFactUpdate {
  const established = establishAllDay({
    startsOn: input.startsOn,
    meaning: input.meaning,
    label: input.label,
    purpose: input.purpose,
    contextId: input.contextId,
    title: input.title,
    taskId: input.taskId,
  });
  return { id: input.id, ...established };
}
