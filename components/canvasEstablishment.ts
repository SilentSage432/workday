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

export type CanvasEstablishment =
  | { meaning: "protected_time"; input: ProtectedTimeInput }
  | { meaning: "block"; input: BlockInput }
  | { meaning: "commitment"; input: CommitmentInput };

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
      }),
    };
  }
  return {
    meaning: "commitment",
    input: defineCommitment({ ...bounds, title: input.title }),
  };
}
