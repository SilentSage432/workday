import { instantFromZonedLocal } from "@/domain/time/localTime";
import { addCivilDays, formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import {
  shiftEndsNextCivilDate,
  type ShiftType,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";

export type ShiftPosition = "before" | "during" | "after";

export type WorkDayFact =
  | { state: "unknown" }
  | { state: "off" }
  | {
      state: "scheduled";
      shiftType: ShiftType;
      startLocal: string;
      endLocal: string;
      endsNextCivilDate: boolean;
      position: ShiftPosition;
    };

export function projectWorkDay(input: {
  entry: WorkScheduleEntry | null;
  timeZone: string;
  instant: Date;
}): WorkDayFact {
  if (input.entry === null) {
    return { state: "unknown" };
  }
  if (input.entry.state === "off") {
    return { state: "off" };
  }

  const endsNextCivilDate = shiftEndsNextCivilDate(input.entry.startLocal, input.entry.endLocal);
  const endDate = endsNextCivilDate
    ? addCivilDays(parseCivilDate(input.entry.workOn), 1)
    : parseCivilDate(input.entry.workOn);
  const start = instantFromZonedLocal(input.entry.workOn, input.entry.startLocal, input.timeZone);
  const end = instantFromZonedLocal(formatCivilDate(endDate), input.entry.endLocal, input.timeZone);
  const at = input.instant.getTime();

  let position: ShiftPosition = "after";
  if (at < start.getTime()) {
    position = "before";
  } else if (at < end.getTime()) {
    position = "during";
  }

  return {
    state: "scheduled",
    shiftType: input.entry.shiftType,
    startLocal: input.entry.startLocal,
    endLocal: input.entry.endLocal,
    endsNextCivilDate,
    position,
  };
}
