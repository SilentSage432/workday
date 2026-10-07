import { formatLocalTime, requireIanaTimeZone, zonedLocalClock } from "@/domain/time/localTime";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";

const DISPLAY_LABEL_LIMIT = 240;
const SOURCE_DISPLAY_NAME_LIMIT = 160;
const PROVIDER_TYPE_LIMIT = 64;

/** Opaque provider identifier. Not a Google DTO. */
export const EXTERNAL_PROVIDER_GOOGLE_CALENDAR = "google_calendar" as const;

export type ExternalProviderType = string;

export const EXTERNAL_CONNECTION_STATUSES = [
  "pending_auth",
  "connected",
  "auth_failed",
  "disconnected",
] as const;

export type ExternalConnectionStatus = (typeof EXTERNAL_CONNECTION_STATUSES)[number];

export const OBSERVATION_ATTEMPT_RESULTS = [
  "success_complete",
  "success_partial",
  "failure",
] as const;

export type ObservationAttemptResult = (typeof OBSERVATION_ATTEMPT_RESULTS)[number];

export const EXTERNAL_FACT_LIFECYCLES = [
  "active",
  "cancelled",
  "deleted",
  "absent_from_window",
] as const;

export type ExternalFactLifecycle = (typeof EXTERNAL_FACT_LIFECYCLES)[number];

export type ExternalConnection = {
  id: string;
  userId: string;
  providerType: ExternalProviderType;
  status: ExternalConnectionStatus;
  displayLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ObservedTemporalSource = {
  id: string;
  userId: string;
  connectionId: string;
  sourceLocalId: string;
  displayName: string;
  selected: boolean;
  providerAccessRole: string | null;
  sourceTimeZone: string | null;
  lastAttemptedAt: string | null;
  lastAttemptResult: ObservationAttemptResult | null;
  lastSuccessfulObservedAt: string | null;
  lastSuccessfulWindowStartsOn: string | null;
  lastSuccessfulWindowEndsBefore: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExternalFactBase = {
  id: string;
  userId: string;
  sourceId: string;
  sourceEventId: string;
  sourceInstanceId: string | null;
  sourceSeriesId: string | null;
  sourceTimeZone: string | null;
  displayLabel: string;
  lifecycle: ExternalFactLifecycle;
  providerVersionToken: string | null;
  providerUpdatedAt: string | null;
  providerEventType: string | null;
  providerTransparency: string | null;
  lastObservedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExternalTimedFact = ExternalFactBase & {
  kind: "timed";
  startAt: Date;
  endAt: Date;
};

export type ExternalAllDayFact = ExternalFactBase & {
  kind: "all_day";
  startsOn: string;
  endsBefore: string;
};

export type ExternalTemporalFact = ExternalTimedFact | ExternalAllDayFact;

/**
 * Stable source identity for repeated observation.
 * Null instance identity is distinct from empty string at the domain layer;
 * persistence coalesces null to '' only for uniqueness.
 */
export type ExternalFactSourceIdentity = {
  userId: string;
  sourceId: string;
  sourceEventId: string;
  sourceInstanceId: string | null;
};

export function externalFactSourceIdentityKey(identity: ExternalFactSourceIdentity): string {
  return [
    identity.userId,
    identity.sourceId,
    identity.sourceEventId,
    identity.sourceInstanceId ?? "",
  ].join("\0");
}

export function requireExternalConnectionStatus(value: string): ExternalConnectionStatus {
  if ((EXTERNAL_CONNECTION_STATUSES as readonly string[]).includes(value)) {
    return value as ExternalConnectionStatus;
  }
  throw new Error(`Unsupported external connection status "${value}".`);
}

export function requireObservationAttemptResult(value: string): ObservationAttemptResult {
  if ((OBSERVATION_ATTEMPT_RESULTS as readonly string[]).includes(value)) {
    return value as ObservationAttemptResult;
  }
  throw new Error(`Unsupported observation attempt result "${value}".`);
}

export function requireExternalFactLifecycle(value: string): ExternalFactLifecycle {
  if ((EXTERNAL_FACT_LIFECYCLES as readonly string[]).includes(value)) {
    return value as ExternalFactLifecycle;
  }
  throw new Error(`Unsupported external fact lifecycle "${value}".`);
}

export function requireDisplayLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("An external fact needs a display label.");
  }
  if (trimmed.length > DISPLAY_LABEL_LIMIT) {
    throw new Error(`A display label can be at most ${DISPLAY_LABEL_LIMIT} characters.`);
  }
  return trimmed;
}

export function requireSourceDisplayName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("An observed source needs a display name.");
  }
  if (trimmed.length > SOURCE_DISPLAY_NAME_LIMIT) {
    throw new Error(`A source display name can be at most ${SOURCE_DISPLAY_NAME_LIMIT} characters.`);
  }
  return trimmed;
}

export function requireProviderType(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("A connection needs a provider type.");
  }
  if (trimmed.length > PROVIDER_TYPE_LIMIT) {
    throw new Error(`A provider type can be at most ${PROVIDER_TYPE_LIMIT} characters.`);
  }
  return trimmed;
}

export function defineExternalTimedFact(input: {
  id: string;
  userId: string;
  sourceId: string;
  sourceEventId: string;
  sourceInstanceId?: string | null;
  sourceSeriesId?: string | null;
  startAt: Date;
  endAt: Date;
  sourceTimeZone?: string | null;
  displayLabel: string;
  lifecycle?: ExternalFactLifecycle;
  providerVersionToken?: string | null;
  providerUpdatedAt?: string | null;
  providerEventType?: string | null;
  providerTransparency?: string | null;
  lastObservedAt: string;
  createdAt: string;
  updatedAt: string;
}): ExternalTimedFact {
  requireNonEmptyId(input.id, "external fact");
  requireNonEmptyId(input.userId, "user");
  requireNonEmptyId(input.sourceId, "observed source");
  requireNonEmptyToken(input.sourceEventId, "source event identity");
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) {
    throw new Error("A timed external fact needs a start instant.");
  }
  if (!(input.endAt instanceof Date) || Number.isNaN(input.endAt.getTime())) {
    throw new Error("A timed external fact needs an end instant.");
  }
  if (input.endAt.getTime() <= input.startAt.getTime()) {
    throw new Error("A timed external fact must end after it starts.");
  }
  return {
    kind: "timed",
    id: input.id,
    userId: input.userId,
    sourceId: input.sourceId,
    sourceEventId: input.sourceEventId.trim(),
    sourceInstanceId: optionalToken(input.sourceInstanceId),
    sourceSeriesId: optionalToken(input.sourceSeriesId),
    startAt: input.startAt,
    endAt: input.endAt,
    sourceTimeZone: optionalTimeZone(input.sourceTimeZone),
    displayLabel: requireDisplayLabel(input.displayLabel),
    lifecycle: input.lifecycle ?? "active",
    providerVersionToken: optionalOpaque(input.providerVersionToken),
    providerUpdatedAt: optionalInstantText(input.providerUpdatedAt),
    providerEventType: optionalToken(input.providerEventType),
    providerTransparency: optionalToken(input.providerTransparency),
    lastObservedAt: requireInstantText(input.lastObservedAt),
    createdAt: requireInstantText(input.createdAt),
    updatedAt: requireInstantText(input.updatedAt),
  };
}

export function defineExternalAllDayFact(input: {
  id: string;
  userId: string;
  sourceId: string;
  sourceEventId: string;
  sourceInstanceId?: string | null;
  sourceSeriesId?: string | null;
  startsOn: string;
  endsBefore: string;
  sourceTimeZone?: string | null;
  displayLabel: string;
  lifecycle?: ExternalFactLifecycle;
  providerVersionToken?: string | null;
  providerUpdatedAt?: string | null;
  providerEventType?: string | null;
  providerTransparency?: string | null;
  lastObservedAt: string;
  createdAt: string;
  updatedAt: string;
}): ExternalAllDayFact {
  requireNonEmptyId(input.id, "external fact");
  requireNonEmptyId(input.userId, "user");
  requireNonEmptyId(input.sourceId, "observed source");
  requireNonEmptyToken(input.sourceEventId, "source event identity");
  const startsOn = formatCivilDate(parseCivilDate(input.startsOn));
  const endsBefore = formatCivilDate(parseCivilDate(input.endsBefore));
  if (endsBefore <= startsOn) {
    throw new Error("An all-day external fact must end after it starts.");
  }
  return {
    kind: "all_day",
    id: input.id,
    userId: input.userId,
    sourceId: input.sourceId,
    sourceEventId: input.sourceEventId.trim(),
    sourceInstanceId: optionalToken(input.sourceInstanceId),
    sourceSeriesId: optionalToken(input.sourceSeriesId),
    startsOn,
    endsBefore,
    sourceTimeZone: optionalTimeZone(input.sourceTimeZone),
    displayLabel: requireDisplayLabel(input.displayLabel),
    lifecycle: input.lifecycle ?? "active",
    providerVersionToken: optionalOpaque(input.providerVersionToken),
    providerUpdatedAt: optionalInstantText(input.providerUpdatedAt),
    providerEventType: optionalToken(input.providerEventType),
    providerTransparency: optionalToken(input.providerTransparency),
    lastObservedAt: requireInstantText(input.lastObservedAt),
    createdAt: requireInstantText(input.createdAt),
    updatedAt: requireInstantText(input.updatedAt),
  };
}

export function defineObservedTemporalSource(input: {
  id: string;
  userId: string;
  connectionId: string;
  sourceLocalId: string;
  displayName: string;
  selected?: boolean;
  providerAccessRole?: string | null;
  sourceTimeZone?: string | null;
  lastAttemptedAt?: string | null;
  lastAttemptResult?: ObservationAttemptResult | null;
  lastSuccessfulObservedAt?: string | null;
  lastSuccessfulWindowStartsOn?: string | null;
  lastSuccessfulWindowEndsBefore?: string | null;
  createdAt: string;
  updatedAt: string;
}): ObservedTemporalSource {
  requireNonEmptyId(input.id, "observed source");
  requireNonEmptyId(input.userId, "user");
  requireNonEmptyId(input.connectionId, "connection");
  requireNonEmptyToken(input.sourceLocalId, "source local identity");
  const windowStarts = optionalCivil(input.lastSuccessfulWindowStartsOn);
  const windowEnds = optionalCivil(input.lastSuccessfulWindowEndsBefore);
  if ((windowStarts === null) !== (windowEnds === null)) {
    throw new Error("A successful observation window needs both bounds.");
  }
  if (windowStarts !== null && windowEnds !== null && windowEnds <= windowStarts) {
    throw new Error("A successful observation window must end after it starts.");
  }
  return {
    id: input.id,
    userId: input.userId,
    connectionId: input.connectionId,
    sourceLocalId: input.sourceLocalId.trim(),
    displayName: requireSourceDisplayName(input.displayName),
    selected: input.selected ?? false,
    providerAccessRole: optionalToken(input.providerAccessRole),
    sourceTimeZone: optionalTimeZone(input.sourceTimeZone),
    lastAttemptedAt: optionalInstantText(input.lastAttemptedAt),
    lastAttemptResult: input.lastAttemptResult ?? null,
    lastSuccessfulObservedAt: optionalInstantText(input.lastSuccessfulObservedAt),
    lastSuccessfulWindowStartsOn: windowStarts,
    lastSuccessfulWindowEndsBefore: windowEnds,
    createdAt: requireInstantText(input.createdAt),
    updatedAt: requireInstantText(input.updatedAt),
  };
}

export function defineExternalConnection(input: {
  id: string;
  userId: string;
  providerType: string;
  status: ExternalConnectionStatus;
  displayLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}): ExternalConnection {
  requireNonEmptyId(input.id, "connection");
  requireNonEmptyId(input.userId, "user");
  const label = input.displayLabel?.trim() ?? "";
  return {
    id: input.id,
    userId: input.userId,
    providerType: requireProviderType(input.providerType),
    status: input.status,
    displayLabel: label.length === 0 ? null : label,
    createdAt: requireInstantText(input.createdAt),
    updatedAt: requireInstantText(input.updatedAt),
  };
}

/** Derived freshness for projection admission. Not a persisted score. */
export type ExternalObservationFreshness =
  | "never_successfully_observed"
  | "fresh"
  | "stale_after_failed_refresh"
  | "stale_after_partial_refresh"
  | "unavailable";

export function deriveExternalObservationFreshness(input: {
  connectionStatus: ExternalConnectionStatus;
  source: Pick<ObservedTemporalSource, "lastAttemptResult" | "lastSuccessfulObservedAt">;
}): ExternalObservationFreshness {
  if (input.connectionStatus === "disconnected" || input.connectionStatus === "auth_failed") {
    return "unavailable";
  }
  if (input.connectionStatus === "pending_auth") {
    return "never_successfully_observed";
  }
  if (input.source.lastSuccessfulObservedAt === null) {
    return "never_successfully_observed";
  }
  if (input.source.lastAttemptResult === "failure") {
    return "stale_after_failed_refresh";
  }
  if (input.source.lastAttemptResult === "success_partial") {
    return "stale_after_partial_refresh";
  }
  if (input.source.lastAttemptResult === "success_complete") {
    return "fresh";
  }
  return "never_successfully_observed";
}

/** Present admits only active facts whose source freshness is fresh. */
export function admitsExternalFactToPresent(input: {
  fact: ExternalTemporalFact;
  freshness: ExternalObservationFreshness;
}): boolean {
  return input.fact.lifecycle === "active" && input.freshness === "fresh";
}

/**
 * Day/Week may retain last-known active evidence with stale semantics.
 * Cancelled / deleted / absent_from_window are not normal landscape members.
 */
export function admitsExternalFactToDayWeek(input: {
  fact: ExternalTemporalFact;
  freshness: ExternalObservationFreshness;
}): boolean {
  if (input.fact.lifecycle !== "active") return false;
  return (
    input.freshness === "fresh" ||
    input.freshness === "stale_after_failed_refresh" ||
    input.freshness === "stale_after_partial_refresh"
  );
}

export function externalTimedContainsInstant(fact: ExternalTimedFact, instant: Date): boolean {
  const t = instant.getTime();
  return t >= fact.startAt.getTime() && t < fact.endAt.getTime();
}

export function externalAllDayContainsCivilDate(fact: ExternalAllDayFact, civilDate: string): boolean {
  const day = formatCivilDate(parseCivilDate(civilDate));
  return day >= fact.startsOn && day < fact.endsBefore;
}

/** Orient-zone civil/local clocks derived from absolute timed bounds for Timeline geometry. */
export function externalTimedLocalGeometry(
  fact: ExternalTimedFact,
  timeZone: string,
): {
  startsOn: string;
  startLocal: string;
  endLocal: string;
  endsNextCivilDate: boolean;
} {
  const zone = requireIanaTimeZone(timeZone);
  const start = zonedLocalClock(fact.startAt, zone);
  const end = zonedLocalClock(fact.endAt, zone);
  const startLocal = formatLocalTime({ hour: start.hour, minute: start.minute });
  const endLocal = formatLocalTime({ hour: end.hour, minute: end.minute });
  return {
    startsOn: start.civilDate,
    startLocal,
    endLocal,
    endsNextCivilDate: end.civilDate > start.civilDate,
  };
}

function requireNonEmptyId(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`This ${label} is missing its identity.`);
  }
}

function requireNonEmptyToken(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`A ${label} is required.`);
  }
}

function optionalToken(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalOpaque(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.length === 0 ? null : value;
}

function optionalTimeZone(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return requireIanaTimeZone(trimmed);
}

function requireInstantText(value: string): string {
  if (value.trim().length === 0) {
    throw new Error("A timestamp is required.");
  }
  return value;
}

function optionalInstantText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalCivil(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return formatCivilDate(parseCivilDate(trimmed));
}
