import { emptyTwelveHourClock, localTimeToTwelveHour, twelveHourToLocalTime, type TwelveHourClock } from "@/components/twelveHourTime";
import {
  defineProtectedTime,
  timedProtectedTimeEndsNextCivilDate,
  type ProtectedTime,
  type ProtectedTimeInput,
} from "@/domain/protectedTime";

export type ProtectedDraft = {
  id: string | null;
  startsOn: string;
  kind: "all_day" | "timed";
  start: TwelveHourClock;
  end: TwelveHourClock;
  label: string;
};

export function newProtectedDraft(startsOn: string): ProtectedDraft {
  return {
    id: null,
    startsOn,
    kind: "all_day",
    start: emptyTwelveHourClock(),
    end: emptyTwelveHourClock(),
    label: "",
  };
}

export function draftFromProtectedTime(entry: ProtectedTime): ProtectedDraft {
  if (entry.kind === "all_day") {
    return {
      id: entry.id,
      startsOn: entry.startsOn,
      kind: "all_day",
      start: emptyTwelveHourClock(),
      end: emptyTwelveHourClock(),
      label: entry.label ?? "",
    };
  }

  return {
    id: entry.id,
    startsOn: entry.startsOn,
    kind: "timed",
    start: localTimeToTwelveHour(entry.startLocal),
    end: localTimeToTwelveHour(entry.endLocal),
    label: entry.label ?? "",
  };
}

export function protectedInputFromDraft(draft: ProtectedDraft): ProtectedTimeInput {
  if (draft.startsOn.trim().length === 0) {
    throw new Error("Choose a date.");
  }
  if (draft.kind === "all_day") {
    return defineProtectedTime({
      kind: "all_day",
      startsOn: draft.startsOn,
      label: draft.label,
    });
  }

  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return defineProtectedTime({
    kind: "timed",
    startsOn: draft.startsOn,
    startLocal,
    endLocal,
    label: draft.label,
  });
}

export function draftContinuesAfterMidnight(draft: ProtectedDraft): boolean {
  if (draft.kind !== "timed") return false;
  const startLocal = twelveHourToLocalTime(draft.start);
  const endLocal = twelveHourToLocalTime(draft.end);
  if (!startLocal || !endLocal) return false;
  return timedProtectedTimeEndsNextCivilDate(startLocal, endLocal);
}
