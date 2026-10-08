import { instantFromZonedLocal } from "@/domain/time/localTime";
import {
  addCivilDays,
  formatCivilDate,
  parseCivilDate,
  workFiscalWeekContaining,
  workFiscalWeekStart,
} from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STEWARDSHIP_CYCLE_KINDS = ["workday", "lowes_fiscal_week"] as const;

export type StewardshipCycleKind = (typeof STEWARDSHIP_CYCLE_KINDS)[number];

export type StewardshipDefinition = {
  id: string;
  cycleKind: StewardshipCycleKind;
  contextId: string | null;
  establishedAt: string;
  retiredAt: string | null;
};

export type StewardshipDefinitionRevision = {
  id: string;
  definitionId: string;
  content: string;
  effectiveAt: string;
};

export type StewardshipSatisfaction = {
  definitionId: string;
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
  satisfiedAt: string;
};

export type NewStewardshipDefinition = {
  id: string;
  cycleKind: StewardshipCycleKind;
  contextId?: string | null;
  content: string;
  establishedAt: Date;
  revisionId: string;
};

export type StewardshipOccurrenceIdentity = {
  definitionId: string;
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
};

/** Human establishment language for cycle kind. Never expose implementation names. */
export function stewardshipEstablishmentCycleLabel(
  cycleKind: StewardshipCycleKind,
): "Each workday" | "Each work week" {
  return cycleKind === "workday" ? "Each workday" : "Each work week";
}

/** Human occurrence-reading language already used in ACT. */
export function stewardshipOccurrenceCycleLabel(
  cycleKind: StewardshipCycleKind,
): "Workday" | "This week" {
  return cycleKind === "workday" ? "Workday" : "This week";
}

/** Latest revision content by effectiveAt, then id. */
export function latestStewardshipWording(
  revisions: readonly StewardshipDefinitionRevision[],
): string | null {
  let best: StewardshipDefinitionRevision | null = null;
  for (const revision of revisions) {
    const at = new Date(revision.effectiveAt).getTime();
    if (Number.isNaN(at)) continue;
    if (
      best === null ||
      at > new Date(best.effectiveAt).getTime() ||
      (at === new Date(best.effectiveAt).getTime() && revision.id > best.id)
    ) {
      best = revision;
    }
  }
  return best?.content ?? null;
}

export function isStewardshipCycleKind(value: string): value is StewardshipCycleKind {
  return (STEWARDSHIP_CYCLE_KINDS as readonly string[]).includes(value);
}

export function requireStewardshipCycleKind(value: string): StewardshipCycleKind {
  if (!isStewardshipCycleKind(value)) {
    throw new Error('A stewardship cycle kind must be "workday" or "lowes_fiscal_week".');
  }
  return value;
}

export function requireStewardshipId(id: string, label = "stewardship definition"): string {
  if (!UUID.test(id)) {
    throw new Error(`A ${label} needs a stable identity.`);
  }
  return id;
}

export function requireStewardshipContent(content: string): string {
  if (content.trim().length === 0) {
    throw new Error("A stewardship definition needs the human's words.");
  }
  return content;
}

export function requireStewardshipInstant(value: Date, label: string): string {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${label} requires a real instant.`);
  }
  return value.toISOString();
}

export function requireStewardshipInstantText(value: string, label: string): string {
  if (!value.includes("T")) {
    throw new Error(`${label} requires a real instant.`);
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`${label} requires a real instant.`);
  }
  return instant.toISOString();
}

export function requireStewardshipCycleKey(value: string): string {
  return formatCivilDate(parseCivilDate(value));
}

export function requireOptionalContextId(contextId: string | null | undefined): string | null {
  if (contextId == null || contextId.length === 0) {
    return null;
  }
  return requireStewardshipId(contextId, "context");
}

/** Civil date key for a Lowe's fiscal week containing the supplied instant. */
export function lowesFiscalWeekCycleKey(instant: Date, timeZone: string): string {
  return formatCivilDate(workFiscalWeekStart(instant, timeZone));
}

/** Civil date key for the Lowe's fiscal week containing a civil date. */
export function lowesFiscalWeekCycleKeyForCivilDate(civilDate: string): string {
  return workFiscalWeekContaining(civilDate);
}

/**
 * Workday cycle key from a Scheduled Work row's work_on.
 * Off and missing do not produce a key.
 */
export function workdayCycleKeyFromEntry(entry: WorkScheduleEntry | null): string | null {
  if (entry === null || entry.state !== "scheduled") {
    return null;
  }
  return entry.workOn;
}

export function cycleInterval(input: {
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
  timeZone: string;
}): { start: Date; end: Date } {
  const key = requireStewardshipCycleKey(input.cycleKey);
  if (input.cycleKind === "workday") {
    const start = instantFromZonedLocal(key, "00:00", input.timeZone);
    const next = formatCivilDate(addCivilDays(parseCivilDate(key), 1));
    const end = instantFromZonedLocal(next, "00:00", input.timeZone);
    return { start, end };
  }
  const start = instantFromZonedLocal(key, "00:00", input.timeZone);
  const nextSaturday = formatCivilDate(addCivilDays(parseCivilDate(key), 7));
  const end = instantFromZonedLocal(nextSaturday, "00:00", input.timeZone);
  return { start, end };
}

/**
 * Definition active interval [established_at, retired_at) overlaps the cycle.
 */
export function definitionActiveForCycle(input: {
  definition: Pick<StewardshipDefinition, "establishedAt" | "retiredAt">;
  cycleStart: Date;
  cycleEnd: Date;
}): boolean {
  const established = new Date(input.definition.establishedAt).getTime();
  const retired =
    input.definition.retiredAt === null ? Number.POSITIVE_INFINITY : new Date(input.definition.retiredAt).getTime();
  const cycleStart = input.cycleStart.getTime();
  const cycleEnd = input.cycleEnd.getTime();
  return established < cycleEnd && retired > cycleStart;
}

/**
 * Latest revision with effective_at <= cycle_start.
 * Returns null when no revision applies (should not happen for a well-formed definition).
 */
export function wordingAtCycleStart(
  revisions: readonly StewardshipDefinitionRevision[],
  cycleStart: Date,
): string | null {
  const boundary = cycleStart.getTime();
  let best: StewardshipDefinitionRevision | null = null;
  for (const revision of revisions) {
    const at = new Date(revision.effectiveAt).getTime();
    if (Number.isNaN(at) || at > boundary) continue;
    if (
      best === null ||
      at > new Date(best.effectiveAt).getTime() ||
      (at === new Date(best.effectiveAt).getTime() && revision.id > best.id)
    ) {
      best = revision;
    }
  }
  return best?.content ?? null;
}

/**
 * Occurrence wording for a cycle.
 * Prefer wording fixed at cycle start. If the definition was established during
 * this cycle, use the earliest in-cycle founding revision so mid-cycle
 * establishment is readable without letting later mid-cycle edits rewrite it.
 */
export function wordingForOccurrence(input: {
  definition: Pick<StewardshipDefinition, "establishedAt">;
  revisions: readonly StewardshipDefinitionRevision[];
  cycleStart: Date;
  cycleEnd: Date;
}): string | null {
  const atStart = wordingAtCycleStart(input.revisions, input.cycleStart);
  if (atStart !== null) return atStart;

  const start = input.cycleStart.getTime();
  const end = input.cycleEnd.getTime();
  const established = new Date(input.definition.establishedAt).getTime();
  if (Number.isNaN(established) || established < start || established >= end) {
    return null;
  }

  let founding: StewardshipDefinitionRevision | null = null;
  for (const revision of input.revisions) {
    const at = new Date(revision.effectiveAt).getTime();
    if (Number.isNaN(at) || at < start || at >= end) continue;
    if (
      founding === null ||
      at < new Date(founding.effectiveAt).getTime() ||
      (at === new Date(founding.effectiveAt).getTime() && revision.id < founding.id)
    ) {
      founding = revision;
    }
  }
  return founding?.content ?? null;
}

export function occurrenceIdentity(input: {
  definitionId: string;
  cycleKind: StewardshipCycleKind;
  cycleKey: string;
}): StewardshipOccurrenceIdentity {
  return {
    definitionId: requireStewardshipId(input.definitionId),
    cycleKind: requireStewardshipCycleKind(input.cycleKind),
    cycleKey: requireStewardshipCycleKey(input.cycleKey),
  };
}

export function findSatisfaction(
  satisfactions: readonly StewardshipSatisfaction[],
  identity: StewardshipOccurrenceIdentity,
): StewardshipSatisfaction | null {
  return (
    satisfactions.find(
      (row) =>
        row.definitionId === identity.definitionId &&
        row.cycleKind === identity.cycleKind &&
        row.cycleKey === identity.cycleKey,
    ) ?? null
  );
}
