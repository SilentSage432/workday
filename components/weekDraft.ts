import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";
import {
  localTimeToTwelveHour,
  twelveHourToLocalTime,
  type TwelveHourClock,
} from "@/components/twelveHourTime";

export type DayDraft =
  | { state: "unknown" }
  | { state: "off" }
  | {
      state: "scheduled";
      start: TwelveHourClock;
      end: TwelveHourClock;
      shiftType: string;
    };

export type WeekDraft = {
  order: string[];
  baseline: Record<string, DayDraft>;
  days: Record<string, DayDraft>;
};

export type WeekWrite =
  | { workOn: string; action: "clear" }
  | { workOn: string; action: "save"; entry: WorkScheduleEntry };

export function dayDraftFromEntry(entry: WorkScheduleEntry | null): DayDraft {
  if (entry === null) {
    return { state: "unknown" };
  }
  if (entry.state === "off") {
    return { state: "off" };
  }
  return {
    state: "scheduled",
    start: localTimeToTwelveHour(entry.startLocal),
    end: localTimeToTwelveHour(entry.endLocal),
    shiftType: entry.shiftType,
  };
}

export function weekDraftFromEntries(dates: string[], entries: WorkScheduleEntry[]): WeekDraft {
  const baseline: Record<string, DayDraft> = {};
  for (const date of dates) {
    baseline[date] = dayDraftFromEntry(entries.find((entry) => entry.workOn === date) ?? null);
  }
  return {
    order: [...dates],
    baseline,
    days: structuredClone(baseline),
  };
}

export function replaceDay(draft: WeekDraft, workOn: string, day: DayDraft): WeekDraft {
  return {
    ...draft,
    days: { ...draft.days, [workOn]: day },
  };
}

export function weekDraftIsDirty(draft: WeekDraft): boolean {
  return draft.order.some((date) => !sameDay(draft.days[date], draft.baseline[date]));
}

export function planWeekSave(
  draft: WeekDraft,
): { ok: true; writes: WeekWrite[] } | { ok: false; workOn: string; message: string } {
  const writes: WeekWrite[] = [];
  for (const workOn of draft.order) {
    const next = draft.days[workOn];
    const previous = draft.baseline[workOn];
    if (!next || !previous || sameDay(next, previous)) {
      continue;
    }
    if (next.state === "unknown") {
      writes.push({ workOn, action: "clear" });
      continue;
    }
    if (next.state === "off") {
      writes.push({ workOn, action: "save", entry: offWorkDay(workOn) });
      continue;
    }
    const startLocal = safeLocal(next.start);
    const endLocal = safeLocal(next.end);
    if (!startLocal || !endLocal || next.shiftType.length === 0) {
      return {
        ok: false,
        workOn,
        message: "A shift needs a start, an end, and Opening, Mid, or Closing.",
      };
    }
    try {
      writes.push({
        workOn,
        action: "save",
        entry: scheduledWorkDay({
          workOn,
          startLocal,
          endLocal,
          shiftType: next.shiftType,
        }),
      });
    } catch (error: unknown) {
      return {
        ok: false,
        workOn,
        message: error instanceof Error ? error.message : "This shift is not valid.",
      };
    }
  }
  return { ok: true, writes };
}

function sameDay(left: DayDraft | undefined, right: DayDraft | undefined): boolean {
  if (!left || !right || left.state !== right.state) {
    return false;
  }
  if (left.state !== "scheduled" || right.state !== "scheduled") {
    return true;
  }
  return (
    safeLocal(left.start) === safeLocal(right.start) &&
    safeLocal(left.end) === safeLocal(right.end) &&
    left.shiftType === right.shiftType
  );
}

function safeLocal(clock: TwelveHourClock): string | null {
  try {
    return twelveHourToLocalTime(clock);
  } catch {
    return null;
  }
}
