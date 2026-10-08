import type { SupabaseClient } from "@supabase/supabase-js";
import type { ObservationAttemptResult } from "@/domain/externalTemporal";
import { assertServerOnly } from "@/server/assertServerOnly";
import { openAuthorizedGoogleCredential } from "@/server/googleCalendar/authorizedAccess";
import { loadLatestGoogleConnection } from "@/server/googleCalendar/connections";
import { listGoogleCalendarEvents } from "@/server/googleCalendar/events";
import { computeObservationHorizon } from "@/server/googleCalendar/horizon";
import { mapGoogleEventToExternalFactCandidate } from "@/server/googleCalendar/mapEvent";
import {
  ObservationPersistenceError,
  persistSourceObservation,
} from "@/server/googleCalendar/observationPersistence";
import type { GoogleHttp } from "@/server/googleCalendar/oauth";
import { GoogleOAuthError } from "@/server/googleCalendar/oauth";
import { ExternalCredentialError } from "@/server/credentials/errors";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

/** Conservative V1 throttle between automatic observations (manual/force bypasses). */
export const OBSERVATION_THROTTLE_MS = 15 * 60 * 1000;

export type SourceObservationSummary = {
  sourceId: string;
  sourceLocalId: string;
  displayName: string;
  result: ObservationAttemptResult | "skipped_throttle";
  observedEventCount: number | null;
  code: string | null;
  message: string | null;
  reconnectRequired: boolean;
};

export type GoogleObservationResult = {
  connectionId: string;
  windowStartsOn: string;
  windowEndsBefore: string;
  selectedSourceCount: number;
  successfulSourceCount: number;
  failedSourceCount: number;
  partialSourceCount: number;
  skippedThrottleCount: number;
  reconnectRequired: boolean;
  sources: SourceObservationSummary[];
};

export class GoogleObservationError extends Error {
  readonly code:
    | "not_connected"
    | "timezone_unavailable"
    | "observation_unavailable";

  constructor(code: GoogleObservationError["code"], message: string) {
    super(message);
    this.name = "GoogleObservationError";
    this.code = code;
  }
}

/**
 * Canonical server observation for selected Google Sources.
 * One implementation used by selection-triggered, manual, and throttled load/visibility calls.
 */
export async function observeSelectedGoogleSources(input: {
  authenticatedUserId: string;
  force?: boolean;
  now?: Date;
  http?: GoogleHttp;
  admin?: SupabaseClient;
}): Promise<GoogleObservationResult> {
  assertServerOnly("observeSelectedGoogleSources");
  const admin = input.admin ?? createSupabaseServiceRoleClient();
  const now = input.now ?? new Date();
  const force = input.force === true;

  const connection = await loadLatestGoogleConnection(input.authenticatedUserId, admin);
  if (!connection || connection.status !== "connected") {
    throw new GoogleObservationError("not_connected", "Connect Google Calendar before observing.");
  }

  const timeZone = await loadConfirmedTimeZone(input.authenticatedUserId, admin);
  const horizon = computeObservationHorizon({ now, timeZone });

  const { data: sourceRows, error: sourceError } = await admin
    .from("external_temporal_sources")
    .select(
      "id, source_local_id, display_name, selected, last_successful_observed_at, last_attempted_at",
    )
    .eq("user_id", input.authenticatedUserId)
    .eq("connection_id", connection.id)
    .eq("selected", true)
    .order("display_name", { ascending: true });
  if (sourceError) {
    throw new GoogleObservationError("observation_unavailable", "Selected calendars could not be read.");
  }

  const selected = sourceRows ?? [];
  if (selected.length === 0) {
    return {
      connectionId: connection.id,
      windowStartsOn: horizon.windowStartsOn,
      windowEndsBefore: horizon.windowEndsBefore,
      selectedSourceCount: 0,
      successfulSourceCount: 0,
      failedSourceCount: 0,
      partialSourceCount: 0,
      skippedThrottleCount: 0,
      reconnectRequired: false,
      sources: [],
    };
  }

  let credential;
  try {
    credential = await openAuthorizedGoogleCredential({
      authenticatedUserId: input.authenticatedUserId,
      connectionId: connection.id,
      http: input.http,
      now,
    });
  } catch (error) {
    if (
      error instanceof ExternalCredentialError &&
      (error.code === "credential_missing" || error.code === "unauthorized_connection")
    ) {
      throw new GoogleObservationError("not_connected", "Google Calendar must be connected again.");
    }
    if (error instanceof GoogleOAuthError && error.code === "oauth_auth_failed") {
      throw new GoogleObservationError("not_connected", "Google Calendar must be connected again.");
    }
    throw error;
  }

  const summaries: SourceObservationSummary[] = [];
  let successfulSourceCount = 0;
  let failedSourceCount = 0;
  let partialSourceCount = 0;
  let skippedThrottleCount = 0;
  let reconnectRequired = false;

  for (const source of selected) {
    if (!force && shouldThrottle(source.last_attempted_at, now)) {
      skippedThrottleCount += 1;
      summaries.push({
        sourceId: source.id,
        sourceLocalId: source.source_local_id,
        displayName: source.display_name,
        result: "skipped_throttle",
        observedEventCount: null,
        code: "throttled",
        message: "Observation was skipped because a recent attempt already ran.",
        reconnectRequired: false,
      });
      continue;
    }

    const listResult = await listGoogleCalendarEvents({
      accessToken: credential.accessToken,
      calendarId: source.source_local_id,
      timeMin: horizon.timeMin,
      timeMax: horizon.timeMax,
      http: input.http,
    });

    const observedAt = now.toISOString();

    if (listResult.status !== "complete") {
      const attemptResult: ObservationAttemptResult =
        listResult.status === "partial" ? "success_partial" : "failure";
      const reconnect = listResult.code === "authorization_invalid";
      if (reconnect) reconnectRequired = true;

      try {
        await persistSourceObservation(
          {
            userId: input.authenticatedUserId,
            sourceId: source.id,
            observedAt,
            attemptResult,
            windowStartsOn: null,
            windowEndsBefore: null,
            windowTimeMin: null,
            windowTimeMax: null,
            applyAbsence: false,
            facts: [],
          },
          admin,
        );
      } catch (error) {
        if (!(error instanceof ObservationPersistenceError)) throw error;
        // Still report provider failure; persistence of attempt evidence failed.
      }

      if (attemptResult === "success_partial") partialSourceCount += 1;
      else failedSourceCount += 1;

      summaries.push({
        sourceId: source.id,
        sourceLocalId: source.source_local_id,
        displayName: source.display_name,
        result: attemptResult,
        observedEventCount: null,
        code: listResult.code,
        message: listResult.message,
        reconnectRequired: reconnect,
      });
      continue;
    }

    const candidates = [];
    for (const event of listResult.events) {
      const mapped = mapGoogleEventToExternalFactCandidate(event);
      if (mapped.status === "mapped") candidates.push(mapped.candidate);
    }

    try {
      await persistSourceObservation(
        {
          userId: input.authenticatedUserId,
          sourceId: source.id,
          observedAt,
          attemptResult: "success_complete",
          windowStartsOn: horizon.windowStartsOn,
          windowEndsBefore: horizon.windowEndsBefore,
          windowTimeMin: horizon.timeMin,
          windowTimeMax: horizon.timeMax,
          applyAbsence: true,
          facts: candidates,
        },
        admin,
      );
    } catch (error) {
      failedSourceCount += 1;
      summaries.push({
        sourceId: source.id,
        sourceLocalId: source.source_local_id,
        displayName: source.display_name,
        result: "failure",
        observedEventCount: null,
        code: "persistence_failure",
        message:
          error instanceof ObservationPersistenceError
            ? error.message
            : "Observation could not be persisted.",
        reconnectRequired: false,
      });
      continue;
    }

    successfulSourceCount += 1;
    summaries.push({
      sourceId: source.id,
      sourceLocalId: source.source_local_id,
      displayName: source.display_name,
      result: "success_complete",
      observedEventCount: candidates.length,
      code: null,
      message: null,
      reconnectRequired: false,
    });
  }

  return {
    connectionId: connection.id,
    windowStartsOn: horizon.windowStartsOn,
    windowEndsBefore: horizon.windowEndsBefore,
    selectedSourceCount: selected.length,
    successfulSourceCount,
    failedSourceCount,
    partialSourceCount,
    skippedThrottleCount,
    reconnectRequired,
    sources: summaries,
  };
}

function shouldThrottle(lastAttemptedAt: string | null, now: Date): boolean {
  if (!lastAttemptedAt) return false;
  const last = Date.parse(lastAttemptedAt);
  if (Number.isNaN(last)) return false;
  return now.getTime() - last < OBSERVATION_THROTTLE_MS;
}

async function loadConfirmedTimeZone(userId: string, admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from("temporal_settings")
    .select("time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.time_zone) {
    throw new GoogleObservationError(
      "timezone_unavailable",
      "A confirmed Orient time zone is required before observation.",
    );
  }
  return data.time_zone;
}
