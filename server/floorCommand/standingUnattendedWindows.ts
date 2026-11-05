/**
 * Window selection helpers for unattended evaluation (RELEASE-046).
 * Window bounds themselves are authored by SQL at policy approval time
 * (America/Boise close; Sunday 12:00 UTC open). This module only selects
 * among those frozen bounds at an injected clock — it does not invent weeks.
 */
import { assertServerOnly } from "@/server/assertServerOnly";
import type { StandingOpportunityKind } from "@/server/floorCommand/standingExecutionIntent";

export type StandingFrozenWindow = {
  kind: StandingOpportunityKind;
  operationalWeek: string;
  opensAt: string;
  closesAt: string;
  timeZone: string;
};

/**
 * Parses approved-event window JSON into frozen window records.
 * Skips malformed entries rather than guessing.
 */
export function parseFrozenStandingWindows(raw: unknown): StandingFrozenWindow[] {
  assertServerOnly("parseFrozenStandingWindows");
  if (!Array.isArray(raw)) return [];
  const out: StandingFrozenWindow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const kind = record.kind;
    if (kind !== "publication_opportunity" && kind !== "reconciliation_opportunity") continue;
    if (typeof record.operational_week !== "string") continue;
    if (typeof record.opens_at !== "string" || typeof record.closes_at !== "string") continue;
    if (typeof record.time_zone !== "string") continue;
    out.push({
      kind,
      operationalWeek: record.operational_week,
      opensAt: record.opens_at,
      closesAt: record.closes_at,
      timeZone: record.time_zone,
    });
  }
  return out;
}

/**
 * Windows open at asOf: opens_at <= asOf < closes_at (half-open).
 * Prefer publication_opportunity when multiple kinds are somehow open.
 */
export function selectOpenStandingWindows(
  windows: StandingFrozenWindow[],
  asOfIso: string,
): StandingFrozenWindow[] {
  assertServerOnly("selectOpenStandingWindows");
  const asOfMs = Date.parse(asOfIso);
  if (!Number.isFinite(asOfMs)) return [];
  const open = windows.filter((window) => {
    const openMs = Date.parse(window.opensAt);
    const closeMs = Date.parse(window.closesAt);
    if (!Number.isFinite(openMs) || !Number.isFinite(closeMs)) return false;
    return openMs <= asOfMs && asOfMs < closeMs;
  });
  const publications = open.filter((w) => w.kind === "publication_opportunity");
  if (publications.length > 0) return publications;
  return open;
}

/**
 * Classifies a closed opportunity relative to the frozen window set.
 * Used only when nothing is open at asOf.
 */
export function classifyClosedStandingOpportunity(
  windows: StandingFrozenWindow[],
  asOfIso: string,
): "not_yet_eligible" | "expired" | "unavailable" {
  assertServerOnly("classifyClosedStandingOpportunity");
  const asOfMs = Date.parse(asOfIso);
  if (!Number.isFinite(asOfMs) || windows.length === 0) return "unavailable";
  const opens = windows
    .map((w) => Date.parse(w.opensAt))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  const closes = windows
    .map((w) => Date.parse(w.closesAt))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  if (opens.length === 0 || closes.length === 0) return "unavailable";
  if (asOfMs < opens[0]!) return "not_yet_eligible";
  if (asOfMs >= closes[closes.length - 1]!) return "expired";
  return "unavailable";
}
