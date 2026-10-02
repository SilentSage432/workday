import { FSR_INTENDED_BEFORE_LOCAL, POWER_HOUR } from "@/domain/workCadence";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import type { ShiftType, WorkScheduleEntry } from "@/domain/workSchedule";
import { projectWorkDay, scheduledShiftBounds, type ShiftPosition } from "@/projections/workDay";

export type NextWorkBoundaryKind =
  | "shift-starts"
  | "shift-ends"
  | "power-hour-starts"
  | "power-hour-ends";

export type NextWorkBoundary = {
  kind: NextWorkBoundaryKind;
  localTime: string;
};

export type WorkOrientation = {
  workDate: string;
  schedule:
    | { state: "unknown" }
    | { state: "off" }
    | {
        state: "scheduled";
        shiftType: ShiftType;
        startLocal: string;
        endLocal: string;
        endsNextCivilDate: boolean;
        position: ShiftPosition;
        scheduledOn: string;
      };
  powerHour: {
    state: "before" | "during" | "after";
    startLocal: typeof POWER_HOUR.startLocal;
    endLocal: typeof POWER_HOUR.endLocal;
  };
  nextBoundary: NextWorkBoundary | null;
  cadence:
    | { kind: "none" }
    | { kind: "opening"; fsrIntendedBoundary: "before" | "reached" }
    | { kind: "mid" }
    | { kind: "closing" };
};

const BOUNDARY_ORDER: Record<NextWorkBoundaryKind, number> = {
  "shift-starts": 0,
  "power-hour-starts": 1,
  "power-hour-ends": 2,
  "shift-ends": 3,
};

export function projectWorkOrientation(input: {
  instant: Date;
  timeZone: string;
  todayEntry: WorkScheduleEntry | null;
  previousEntry: WorkScheduleEntry | null;
}): WorkOrientation {
  const workDate = formatCivilDate(civilDateInTimeZone(input.instant, input.timeZone));
  const previousDate = formatCivilDate(addCivilDays(parseCivilDate(workDate), -1));
  const todayFact = projectWorkDay({
    entry: input.todayEntry,
    timeZone: input.timeZone,
    instant: input.instant,
  });
  const previousFact =
    input.previousEntry === null
      ? null
      : projectWorkDay({
          entry: input.previousEntry,
          timeZone: input.timeZone,
          instant: input.instant,
        });

  const previousStillOn = previousFact?.state === "scheduled" && previousFact.position === "during";
  const todayStillOn = todayFact.state === "scheduled" && todayFact.position === "during";

  let schedule: WorkOrientation["schedule"];
  if (todayStillOn) {
    schedule = scheduledView(todayFact, workDate);
  } else if (previousStillOn && previousFact?.state === "scheduled") {
    schedule = scheduledView(previousFact, previousDate);
  } else if (todayFact.state === "scheduled") {
    schedule = scheduledView(todayFact, workDate);
  } else if (todayFact.state === "off") {
    schedule = { state: "off" };
  } else {
    schedule = { state: "unknown" };
  }

  const powerHour = powerHourState(workDate, input.timeZone, input.instant);
  const nextBoundary = earliestBoundary({
    instant: input.instant,
    timeZone: input.timeZone,
    workDate,
    schedule,
  });

  return {
    workDate,
    schedule,
    powerHour,
    nextBoundary,
    cadence: cadenceFor(schedule, input.timeZone, input.instant),
  };
}

function scheduledView(
  fact: Extract<ReturnType<typeof projectWorkDay>, { state: "scheduled" }>,
  scheduledOn: string,
): Extract<WorkOrientation["schedule"], { state: "scheduled" }> {
  return {
    state: "scheduled",
    shiftType: fact.shiftType,
    startLocal: fact.startLocal,
    endLocal: fact.endLocal,
    endsNextCivilDate: fact.endsNextCivilDate,
    position: fact.position,
    scheduledOn,
  };
}

function powerHourState(
  workDate: string,
  timeZone: string,
  instant: Date,
): WorkOrientation["powerHour"] {
  const start = instantFromZonedLocal(workDate, POWER_HOUR.startLocal, timeZone);
  const end = instantFromZonedLocal(workDate, POWER_HOUR.endLocal, timeZone);
  const at = instant.getTime();
  let state: WorkOrientation["powerHour"]["state"] = "after";
  if (at < start.getTime()) {
    state = "before";
  } else if (at < end.getTime()) {
    state = "during";
  }
  return {
    state,
    startLocal: POWER_HOUR.startLocal,
    endLocal: POWER_HOUR.endLocal,
  };
}

function earliestBoundary(input: {
  instant: Date;
  timeZone: string;
  workDate: string;
  schedule: WorkOrientation["schedule"];
}): NextWorkBoundary | null {
  const candidates: { kind: NextWorkBoundaryKind; at: number; localTime: string }[] = [];
  const powerStart = instantFromZonedLocal(input.workDate, POWER_HOUR.startLocal, input.timeZone);
  const powerEnd = instantFromZonedLocal(input.workDate, POWER_HOUR.endLocal, input.timeZone);
  candidates.push(
    { kind: "power-hour-starts", at: powerStart.getTime(), localTime: POWER_HOUR.startLocal },
    { kind: "power-hour-ends", at: powerEnd.getTime(), localTime: POWER_HOUR.endLocal },
  );

  if (input.schedule.state === "scheduled") {
    const bounds = scheduledShiftBounds(
      {
        workOn: input.schedule.scheduledOn,
        startLocal: input.schedule.startLocal,
        endLocal: input.schedule.endLocal,
      },
      input.timeZone,
    );
    candidates.push(
      { kind: "shift-starts", at: bounds.start.getTime(), localTime: input.schedule.startLocal },
      { kind: "shift-ends", at: bounds.end.getTime(), localTime: input.schedule.endLocal },
    );
  }

  const now = input.instant.getTime();
  const upcoming = candidates
    .filter((candidate) => candidate.at > now)
    .sort((left, right) => left.at - right.at || BOUNDARY_ORDER[left.kind] - BOUNDARY_ORDER[right.kind]);
  const next = upcoming[0];
  if (!next) {
    return null;
  }
  return { kind: next.kind, localTime: next.localTime };
}

function cadenceFor(
  schedule: WorkOrientation["schedule"],
  timeZone: string,
  instant: Date,
): WorkOrientation["cadence"] {
  if (schedule.state !== "scheduled" || schedule.position !== "during") {
    return { kind: "none" };
  }
  if (schedule.shiftType === "mid") {
    return { kind: "mid" };
  }
  if (schedule.shiftType === "closing") {
    return { kind: "closing" };
  }
  const intendedBefore = instantFromZonedLocal(
    schedule.scheduledOn,
    FSR_INTENDED_BEFORE_LOCAL,
    timeZone,
  );
  return {
    kind: "opening",
    fsrIntendedBoundary: instant.getTime() < intendedBefore.getTime() ? "before" : "reached",
  };
}
