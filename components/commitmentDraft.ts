import {
  emptyTwelveHourClock,
  localTimeToTwelveHour,
  twelveHourToLocalTime,
  type TwelveHourClock,
} from "@/components/twelveHourTime";
import {
  defineCommitment,
  timedCommitmentEndsNextCivilDate,
  type Commitment,
  type CommitmentInput,
} from "@/domain/commitment";

export type CommitmentDraft = {
  id: string | null;
  startsOn: string;
  kind: "all_day" | "timed";
  start: TwelveHourClock;
  end: TwelveHourClock;
  title: string;
};

export function newCommitmentDraft(startsOn: string): CommitmentDraft {
  return {
    id: null,
    startsOn,
    kind: "all_day",
    start: emptyTwelveHourClock(),
    end: emptyTwelveHourClock(),
    title: "",
  };
}

export function draftFromCommitment(entry: Commitment): CommitmentDraft {
  const shared = {
    id: entry.id,
    startsOn: entry.startsOn,
    title: entry.title,
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

export function commitmentInputFromDraft(draft: CommitmentDraft): CommitmentInput {
  if (draft.startsOn.trim().length === 0) {
    throw new Error("Choose a date.");
  }
  if (draft.kind === "all_day") {
    return defineCommitment({
      kind: "all_day",
      startsOn: draft.startsOn,
      title: draft.title,
    });
  }

  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return defineCommitment({
    kind: "timed",
    startsOn: draft.startsOn,
    startLocal,
    endLocal,
    title: draft.title,
  });
}

export function commitmentDraftContinuesAfterMidnight(draft: CommitmentDraft): boolean {
  if (draft.kind !== "timed") return false;
  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) return false;
  return timedCommitmentEndsNextCivilDate(startLocal, endLocal);
}
