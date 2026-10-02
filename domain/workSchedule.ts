import { localMinutes, parseLocalTime, type LocalTime } from "@/domain/time/localTime";

export const SHIFT_TYPES = ["opening", "mid", "closing"] as const;

export type ShiftType = (typeof SHIFT_TYPES)[number];

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  opening: "Opening",
  mid: "Mid",
  closing: "Closing",
};

export type TemporalSettings = {
  timeZone: string;
  confirmedAt: string;
};

export type ScheduledWorkDay = {
  workOn: string;
  state: "scheduled";
  startLocal: string;
  endLocal: string;
  shiftType: ShiftType;
};

export type OffWorkDay = {
  workOn: string;
  state: "off";
};

export type WorkScheduleEntry = ScheduledWorkDay | OffWorkDay;

export function isShiftType(value: string): value is ShiftType {
  return (SHIFT_TYPES as readonly string[]).includes(value);
}

export function shiftEndsNextCivilDate(startLocal: string, endLocal: string): boolean {
  return localMinutes(parseLocalTime(endLocal)) <= localMinutes(parseLocalTime(startLocal));
}

export function scheduledWorkDay(input: {
  workOn: string;
  startLocal: string;
  endLocal: string;
  shiftType: string;
}): ScheduledWorkDay {
  if (!isShiftType(input.shiftType)) {
    throw new Error("Choose Opening, Mid, or Closing.");
  }

  return {
    workOn: input.workOn,
    state: "scheduled",
    startLocal: formatStoredLocalTime(input.startLocal),
    endLocal: formatStoredLocalTime(input.endLocal),
    shiftType: input.shiftType,
  };
}

export function offWorkDay(workOn: string): OffWorkDay {
  return { workOn, state: "off" };
}

function formatStoredLocalTime(value: string): string {
  const time: LocalTime = parseLocalTime(value);
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
