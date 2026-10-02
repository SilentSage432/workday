export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

const DAYS_SINCE_SATURDAY: Record<string, number> = {
  Sat: 0,
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
};

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return MONTH_LENGTHS[month - 1];
}

export function addCivilDays(date: CivilDate, delta: number): CivilDate {
  let year = date.year;
  let month = date.month;
  let day = date.day;
  let remaining = delta;

  while (remaining < 0) {
    day -= 1;
    if (day < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day = daysInMonth(year, month);
    }
    remaining += 1;
  }

  while (remaining > 0) {
    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    remaining -= 1;
  }

  return { year, month, day };
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
  timeZone: string,
): string {
  const found = parts.find((item) => item.type === type);
  if (!found) {
    throw new Error(`Missing ${type} for time zone ${timeZone}.`);
  }
  return found.value;
}

const CIVIL_DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatCivilDate(date: CivilDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export function formatCivilDateLabel(value: string): string {
  const date = parseCivilDate(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

export function parseCivilDate(value: string): CivilDate {
  const match = CIVIL_DATE_TEXT.exec(value);
  if (!match) {
    throw new Error("A civil date must be YYYY-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error("A civil date must be a real calendar day.");
  }

  return { year, month, day };
}

export function civilDateInTimeZone(instant: Date, timeZone: string): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  return {
    year: Number(part(parts, "year", timeZone)),
    month: Number(part(parts, "month", timeZone)),
    day: Number(part(parts, "day", timeZone)),
  };
}

function weekdayShort(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(instant);
  const weekday = part(parts, "weekday", timeZone);
  if (!(weekday in DAYS_SINCE_SATURDAY)) {
    throw new Error(`Unrecognized weekday "${weekday}" in time zone ${timeZone}.`);
  }
  return weekday;
}

export function workFiscalWeekStart(instant: Date, timeZone: string): CivilDate {
  const civil = civilDateInTimeZone(instant, timeZone);
  const daysSinceSaturday = DAYS_SINCE_SATURDAY[weekdayShort(instant, timeZone)];
  return addCivilDays(civil, -daysSinceSaturday);
}

export function workFiscalWeekDates(weekStart: CivilDate): CivilDate[] {
  return Array.from({ length: 7 }, (_, index) => addCivilDays(weekStart, index));
}
