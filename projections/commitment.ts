import { timedCommitmentEndsNextCivilDate, type Commitment } from "@/domain/commitment";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";

export type CommitmentPlacement = "past" | "current" | "upcoming" | "unresolved";

export function classifyCommitment(
  entry: Commitment,
  instant: Date,
  timeZone: string,
): CommitmentPlacement {
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

export function projectCommitments(input: {
  entries: readonly Commitment[];
  instant: Date;
  timeZone: string;
}): Commitment[] {
  return input.entries
    .filter((entry) => {
      const placement = classifyCommitment(entry, input.instant, input.timeZone);
      return placement === "current" || placement === "upcoming" || placement === "unresolved";
    })
    .slice()
    .sort((left, right) => orderKey(left).localeCompare(orderKey(right)));
}

function timedBounds(
  entry: Extract<Commitment, { kind: "timed" }>,
  timeZone: string,
): { start: Date; end: Date } {
  const endsNext = timedCommitmentEndsNextCivilDate(entry.startLocal, entry.endLocal);
  const endOn = endsNext
    ? formatCivilDate(addCivilDays(parseCivilDate(entry.startsOn), 1))
    : entry.startsOn;
  return {
    start: instantFromZonedLocal(entry.startsOn, entry.startLocal, timeZone),
    end: instantFromZonedLocal(endOn, entry.endLocal, timeZone),
  };
}

function orderKey(entry: Commitment): string {
  const time = entry.kind === "all_day" ? "00:00" : entry.startLocal;
  const kind = entry.kind === "all_day" ? "0" : "1";
  return `${entry.startsOn}T${time}|${kind}|${entry.createdAt}|${entry.id}`;
}
