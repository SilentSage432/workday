import { parseCivilDate, type CivilDate } from "@/domain/time/workFiscalWeek";

export type LocalTime = {
  hour: number;
  minute: number;
};

const LOCAL_TIME_TEXT = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function parseLocalTime(value: string): LocalTime {
  const match = LOCAL_TIME_TEXT.exec(value);
  if (!match) {
    throw new Error("A local time must be HH:MM.");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error("A local time must be a real time of day.");
  }

  return { hour, minute };
}

export function formatLocalTime(time: LocalTime): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

export function formatLocalTimeLabel(value: string): string {
  const time = parseLocalTime(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Date.UTC(2020, 0, 1, time.hour, time.minute)));
}

export function localMinutes(time: LocalTime): number {
  return time.hour * 60 + time.minute;
}

type ZonedParts = CivilDate & LocalTime;

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
  } catch {
    throw new Error(`"${timeZone}" is not an IANA time zone.`);
  }

  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const found = parts.find((item) => item.type === type);
    if (!found) {
      throw new Error(`Missing ${type} for time zone ${timeZone}.`);
    }
    return Number(found.value);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
  };
}

function sameLocal(shown: ZonedParts, date: CivilDate, time: LocalTime): boolean {
  return (
    shown.year === date.year &&
    shown.month === date.month &&
    shown.day === date.day &&
    shown.hour === time.hour &&
    shown.minute === time.minute
  );
}

export function instantFromZonedLocal(civilDate: string, localTime: string, timeZone: string): Date {
  const date = parseCivilDate(civilDate);
  const time = parseLocalTime(localTime);
  const desired = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, 0, 0);
  let utc = desired;

  for (let pass = 0; pass < 3; pass += 1) {
    const shown = zonedParts(new Date(utc), timeZone);
    if (sameLocal(shown, date, time)) {
      return new Date(utc);
    }
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0, 0);
    utc -= shownAsUtc - desired;
  }

  throw new Error("That local time does not occur once in this time zone.");
}

export function requireIanaTimeZone(timeZone: string): string {
  const trimmed = timeZone.trim();
  if (trimmed.length === 0) {
    throw new Error("A time zone is required.");
  }
  zonedParts(new Date(Date.UTC(2020, 0, 1, 12, 0, 0)), trimmed);
  return trimmed;
}
