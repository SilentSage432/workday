import { addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import { shiftEndsNextCivilDate, type ShiftType, type WorkScheduleEntry } from "@/domain/workSchedule";

export type ShiftDraft = {
  workOn: string;
  startLocal: string;
  endLocal: string;
  shiftType: string;
};

export type WeekEditSession = {
  editing: boolean;
  draft: ShiftDraft | null;
  notice: string | null;
};

export const closedWeekEdit: WeekEditSession = {
  editing: false,
  draft: null,
  notice: null,
};

export type ScheduleRowFact =
  | { kind: "unknown" }
  | { kind: "off" }
  | {
      kind: "scheduled";
      startLocal: string;
      endLocal: string;
      shiftType: ShiftType;
      continuesAfterMidnight: boolean;
    };

const SAVE_OR_CANCEL = "Save or cancel this day before changing weeks.";
const SAVE_OR_LEAVE = "Save or cancel this day before leaving Edit week.";
const SAVE_OR_SWITCH = "Save or cancel this day before editing another.";

export function scheduleRowFact(entry: WorkScheduleEntry | null): ScheduleRowFact {
  if (entry === null) {
    return { kind: "unknown" };
  }
  if (entry.state === "off") {
    return { kind: "off" };
  }
  return {
    kind: "scheduled",
    startLocal: entry.startLocal,
    endLocal: entry.endLocal,
    shiftType: entry.shiftType,
    continuesAfterMidnight: shiftEndsNextCivilDate(entry.startLocal, entry.endLocal),
  };
}

export function draftIsMeaningful(draft: ShiftDraft, entry: WorkScheduleEntry | null): boolean {
  const saved = entry?.state === "scheduled" ? entry : null;
  return (
    draft.startLocal !== (saved?.startLocal ?? "") ||
    draft.endLocal !== (saved?.endLocal ?? "") ||
    draft.shiftType !== (saved?.shiftType ?? "")
  );
}

export function beginWeekEdit(): WeekEditSession {
  return { editing: true, draft: null, notice: null };
}

export function finishWeekEdit(
  session: WeekEditSession,
  openEntry: WorkScheduleEntry | null,
): WeekEditSession {
  if (session.draft && draftIsMeaningful(session.draft, openEntry)) {
    return { ...session, notice: SAVE_OR_LEAVE };
  }
  return closedWeekEdit;
}

export function openShiftDraft(
  session: WeekEditSession,
  workOn: string,
  openEntry: WorkScheduleEntry | null,
  targetEntry: WorkScheduleEntry | null,
): WeekEditSession {
  if (!session.editing) {
    return session;
  }
  if (
    session.draft &&
    session.draft.workOn !== workOn &&
    draftIsMeaningful(session.draft, openEntry)
  ) {
    return { ...session, notice: SAVE_OR_SWITCH };
  }
  const scheduled = targetEntry?.state === "scheduled" ? targetEntry : null;
  return {
    editing: true,
    notice: null,
    draft: {
      workOn,
      startLocal: scheduled?.startLocal ?? "",
      endLocal: scheduled?.endLocal ?? "",
      shiftType: scheduled?.shiftType ?? "",
    },
  };
}

export function updateShiftDraft(session: WeekEditSession, draft: ShiftDraft): WeekEditSession {
  if (!session.draft || session.draft.workOn !== draft.workOn) {
    return session;
  }
  return { ...session, draft, notice: null };
}

export function cancelShiftDraft(session: WeekEditSession): WeekEditSession {
  return { ...session, draft: null, notice: null };
}

export function afterDaySaved(session: WeekEditSession): WeekEditSession {
  return { editing: session.editing, draft: null, notice: null };
}

export function requestWeekChange(
  session: WeekEditSession,
  weekStart: string,
  deltaDays: number,
  openEntry: WorkScheduleEntry | null,
): { session: WeekEditSession; weekStart: string } {
  if (session.draft && draftIsMeaningful(session.draft, openEntry)) {
    return { session: { ...session, notice: SAVE_OR_CANCEL }, weekStart };
  }
  return {
    session: { editing: session.editing, draft: null, notice: null },
    weekStart: formatCivilDate(addCivilDays(parseCivilDate(weekStart), deltaDays)),
  };
}
