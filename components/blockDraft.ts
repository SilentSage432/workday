import {
  emptyTwelveHourClock,
  localTimeToTwelveHour,
  twelveHourToLocalTime,
  type TwelveHourClock,
} from "@/components/twelveHourTime";
import {
  defineBlock,
  timedBlockEndsNextCivilDate,
  type Block,
  type BlockInput,
} from "@/domain/block";

export type BlockDraft = {
  id: string | null;
  startsOn: string;
  kind: "all_day" | "timed";
  start: TwelveHourClock;
  end: TwelveHourClock;
  contextId: string;
  purpose: string;
  taskId: string | null;
};

export function newBlockDraft(startsOn: string): BlockDraft {
  return {
    id: null,
    startsOn,
    kind: "all_day",
    start: emptyTwelveHourClock(),
    end: emptyTwelveHourClock(),
    contextId: "",
    purpose: "",
    taskId: null,
  };
}

export function draftFromBlock(entry: Block): BlockDraft {
  const shared = {
    id: entry.id,
    startsOn: entry.startsOn,
    contextId: entry.contextId ?? "",
    purpose: entry.purpose,
    taskId: entry.taskId,
  };
  if (entry.kind === "all_day") {
    return {
      ...shared,
      kind: "all_day",
      start: emptyTwelveHourClock(),
      end: emptyTwelveHourClock(),
    };
  }

  return {
    ...shared,
    kind: "timed",
    start: localTimeToTwelveHour(entry.startLocal),
    end: localTimeToTwelveHour(entry.endLocal),
  };
}

export function blockInputFromDraft(draft: BlockDraft): BlockInput {
  if (draft.startsOn.trim().length === 0) {
    throw new Error("Choose a date.");
  }
  if (draft.kind === "all_day") {
    return defineBlock({
      kind: "all_day",
      startsOn: draft.startsOn,
      purpose: draft.purpose,
      contextId: draft.contextId,
      taskId: draft.taskId,
    });
  }

  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return defineBlock({
    kind: "timed",
    startsOn: draft.startsOn,
    startLocal,
    endLocal,
    purpose: draft.purpose,
    contextId: draft.contextId,
    taskId: draft.taskId,
  });
}

export function blockDraftContinuesAfterMidnight(draft: BlockDraft): boolean {
  if (draft.kind !== "timed") return false;
  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) return false;
  return timedBlockEndsNextCivilDate(startLocal, endLocal);
}
