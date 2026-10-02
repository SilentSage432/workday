import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";

export type Meridiem = "AM" | "PM";

export type TwelveHourClock = {
  hour: number | null;
  minute: number | null;
  meridiem: Meridiem;
};

export function emptyTwelveHourClock(): TwelveHourClock {
  return { hour: null, minute: null, meridiem: "AM" };
}

export function localTimeToTwelveHour(value: string): TwelveHourClock {
  if (value.trim().length === 0) {
    return emptyTwelveHourClock();
  }
  const time = parseLocalTime(value);
  const meridiem: Meridiem = time.hour >= 12 ? "PM" : "AM";
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return { hour: hour12, minute: time.minute, meridiem };
}

export function twelveHourToLocalTime(clock: TwelveHourClock): string | null {
  if (clock.hour === null || clock.minute === null) {
    return null;
  }
  if (clock.hour < 1 || clock.hour > 12 || clock.minute < 0 || clock.minute > 59) {
    throw new Error("Choose a real hour and minute.");
  }
  const hour24 = (clock.hour % 12) + (clock.meridiem === "PM" ? 12 : 0);
  return formatLocalTime({ hour: hour24, minute: clock.minute });
}
