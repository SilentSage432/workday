import { formatLocalTime, localMinutes, parseLocalTime } from "@/domain/time/localTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";

const LABEL_LIMIT = 80;

export type AllDayProtectedTime = {
  kind: "all_day";
  startsOn: string;
  label: string | null;
};

export type TimedProtectedTime = {
  kind: "timed";
  startsOn: string;
  startLocal: string;
  endLocal: string;
  label: string | null;
};

export type ProtectedTimeInput = AllDayProtectedTime | TimedProtectedTime;

export type ProtectedTime = ProtectedTimeInput & {
  id: string;
  createdAt: string;
};

export function timedProtectedTimeEndsNextCivilDate(startLocal: string, endLocal: string): boolean {
  return localMinutes(parseLocalTime(endLocal)) <= localMinutes(parseLocalTime(startLocal));
}

export function defineProtectedTime(input: {
  kind: "all_day" | "timed";
  startsOn: string;
  startLocal?: string | null;
  endLocal?: string | null;
  label?: string | null;
}): ProtectedTimeInput {
  const startsOn = formatCivilDate(parseCivilDate(input.startsOn));
  const label = normalizeLabel(input.label);

  if (input.kind === "all_day") {
    return { kind: "all_day", startsOn, label };
  }

  if (!input.startLocal || !input.endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return {
    kind: "timed",
    startsOn,
    startLocal: formatLocalTime(parseLocalTime(input.startLocal)),
    endLocal: formatLocalTime(parseLocalTime(input.endLocal)),
    label,
  };
}

export function normalizeLabel(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > LABEL_LIMIT) {
    throw new Error("A label can be at most 80 characters.");
  }
  return trimmed;
}
