import type { SupabaseClient } from "@supabase/supabase-js";
import type { ObservationAttemptResult } from "@/domain/externalTemporal";
import { assertServerOnly } from "@/server/assertServerOnly";
import type { ExternalFactCandidate } from "@/server/googleCalendar/mapEvent";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export class ObservationPersistenceError extends Error {
  readonly code = "observation_persistence_failure" as const;

  constructor(message = "Observation could not be persisted.") {
    super(message);
    this.name = "ObservationPersistenceError";
  }
}

export type PersistSourceObservationInput = {
  userId: string;
  sourceId: string;
  observedAt: string;
  attemptResult: ObservationAttemptResult;
  windowStartsOn: string | null;
  windowEndsBefore: string | null;
  windowTimeMin: string | null;
  windowTimeMax: string | null;
  applyAbsence: boolean;
  facts: readonly ExternalFactCandidate[];
};

/**
 * Durably persist one Source observation attempt through the provider-neutral RPC.
 * Success_complete is claimed only when this call succeeds.
 */
export async function persistSourceObservation(
  input: PersistSourceObservationInput,
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("persistSourceObservation");

  const factsJson =
    input.attemptResult === "success_complete"
      ? input.facts.map(candidateToJson)
      : [];

  const { error } = await admin.rpc("persist_external_source_observation", {
    p_user_id: input.userId,
    p_source_id: input.sourceId,
    p_observed_at: input.observedAt,
    p_attempt_result: input.attemptResult,
    p_window_starts_on: input.windowStartsOn,
    p_window_ends_before: input.windowEndsBefore,
    p_window_time_min: input.windowTimeMin,
    p_window_time_max: input.windowTimeMax,
    p_apply_absence: input.applyAbsence,
    p_facts: factsJson,
  });

  if (error) {
    throw new ObservationPersistenceError(error.message);
  }
}

export async function clearExternalFactsForConnection(
  input: { userId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("clearExternalFactsForConnection");
  const { error } = await admin.rpc("clear_external_facts_for_connection", {
    p_user_id: input.userId,
    p_connection_id: input.connectionId,
  });
  if (error) {
    throw new ObservationPersistenceError(error.message);
  }
}

function candidateToJson(candidate: ExternalFactCandidate): Record<string, string | null> {
  const base = {
    source_event_id: candidate.sourceEventId,
    source_instance_id: candidate.sourceInstanceId,
    source_series_id: candidate.sourceSeriesId,
    display_label: candidate.displayLabel,
    lifecycle: candidate.lifecycle,
    source_time_zone: candidate.temporal.sourceTimeZone,
    provider_version_token: candidate.providerVersionToken,
    provider_updated_at: candidate.providerUpdatedAt,
    provider_event_type: candidate.providerEventType,
    provider_transparency: candidate.providerTransparency,
  };
  if (candidate.temporal.kind === "timed") {
    return {
      ...base,
      temporal_kind: "timed",
      start_at: candidate.temporal.startAt.toISOString(),
      end_at: candidate.temporal.endAt.toISOString(),
      starts_on: null,
      ends_before: null,
    };
  }
  return {
    ...base,
    temporal_kind: "all_day",
    start_at: null,
    end_at: null,
    starts_on: candidate.temporal.startsOn,
    ends_before: candidate.temporal.endsBefore,
  };
}
