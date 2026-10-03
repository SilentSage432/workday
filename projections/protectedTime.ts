import { instantFromZonedLocal } from "@/domain/time/localTime";
import {
  timedProtectedTimeEndsNextCivilDate,
  type ProtectedTime,
} from "@/domain/protectedTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";

export type ProtectedPlacement = "past" | "current" | "upcoming" | "unresolved";

export function classifyProtectedTime(
  entry: ProtectedTime,
  instant: Date,
  timeZone: string,
): ProtectedPlacement {
  const today = formatCivilDate(civilDateInTimeZone(instant, timeZone));

  if (entry.kind === "all_day") {
    if (entry.startsOn < today) return "past";
    if (entry.startsOn === today) return "current";
    return "upcoming";
  }

  try {
    const bounds = timedBounds(entry, timeZone);
    const at = instant.getTime();
    if (at < bounds.start.getTime()) return "upcoming";
    if (at < bounds.end.getTime()) return "current";
    return "past";
  } catch {
    const yesterday = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
    if (entry.startsOn < yesterday) return "past";
    return "unresolved";
  }
}

export function projectProtectedTime(input: {
  entries: readonly ProtectedTime[];
  instant: Date;
  timeZone: string;
}): ProtectedTime[] {
  return input.entries
    .filter((entry) => {
      const placement = classifyProtectedTime(entry, input.instant, input.timeZone);
      return placement === "current" || placement === "upcoming" || placement === "unresolved";
    })
    .slice()
    .sort((left, right) => orderKey(left).localeCompare(orderKey(right)));
}

function timedBounds(
  entry: Extract<ProtectedTime, { kind: "timed" }>,
  timeZone: string,
): { start: Date; end: Date } {
  const endsNext = timedProtectedTimeEndsNextCivilDate(entry.startLocal, entry.endLocal);
  const endOn = endsNext
    ? formatCivilDate(addCivilDays(parseCivilDate(entry.startsOn), 1))
    : entry.startsOn;
  return {
    start: instantFromZonedLocal(entry.startsOn, entry.startLocal, timeZone),
    end: instantFromZonedLocal(endOn, entry.endLocal, timeZone),
  };
}

function orderKey(entry: ProtectedTime): string {
  const time = entry.kind === "all_day" ? "00:00" : entry.startLocal;
  const kind = entry.kind === "all_day" ? "0" : "1";
  return `${entry.startsOn}T${time}|${kind}|${entry.createdAt}|${entry.id}`;
}
