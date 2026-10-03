import { formatLocalTime, localMinutes, parseLocalTime } from "@/domain/time/localTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";

const TITLE_LIMIT = 80;

export const COMMITMENT_ORIGIN_USER_CREATED = "user_created" as const;

export type CommitmentOrigin = typeof COMMITMENT_ORIGIN_USER_CREATED;

type CommitmentBase = {
  startsOn: string;
  title: string;
  origin: CommitmentOrigin;
};

export type AllDayCommitment = CommitmentBase & {
  kind: "all_day";
};

export type TimedCommitment = CommitmentBase & {
  kind: "timed";
  startLocal: string;
  endLocal: string;
};

export type CommitmentInput = AllDayCommitment | TimedCommitment;

export type Commitment = CommitmentInput & {
  id: string;
  createdAt: string;
};

export function timedCommitmentEndsNextCivilDate(startLocal: string, endLocal: string): boolean {
  return localMinutes(parseLocalTime(endLocal)) <= localMinutes(parseLocalTime(startLocal));
}

export function defineCommitment(input: {
  kind: "all_day" | "timed";
  startsOn: string;
  startLocal?: string | null;
  endLocal?: string | null;
  title?: string | null;
}): CommitmentInput {
  const startsOn = formatCivilDate(parseCivilDate(input.startsOn));
  const title = requireTitle(input.title);
  const shared = { startsOn, title, origin: COMMITMENT_ORIGIN_USER_CREATED };

  if (input.kind === "all_day") {
    return { kind: "all_day", ...shared };
  }

  if (!input.startLocal || !input.endLocal) {
    throw new Error("Choose a start and an end.");
  }

  return {
    kind: "timed",
    ...shared,
    startLocal: formatLocalTime(parseLocalTime(input.startLocal)),
    endLocal: formatLocalTime(parseLocalTime(input.endLocal)),
  };
}

export function requireCommitmentOrigin(origin: string): CommitmentOrigin {
  if (origin !== COMMITMENT_ORIGIN_USER_CREATED) {
    throw new Error(`Unsupported commitment origin "${origin}".`);
  }
  return origin;
}

function requireTitle(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("A commitment needs a title.");
  }
  if (trimmed.length > TITLE_LIMIT) {
    throw new Error("A title can be at most 80 characters.");
  }
  return trimmed;
}
