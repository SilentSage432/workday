import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defineExternalAllDayFact,
  defineExternalConnection,
  defineExternalTimedFact,
  defineObservedTemporalSource,
  requireExternalConnectionStatus,
  requireExternalFactLifecycle,
  requireObservationAttemptResult,
  type ExternalConnection,
  type ExternalTemporalFact,
  type ObservedTemporalSource,
} from "@/domain/externalTemporal";

export const EXTERNAL_CONNECTION_COLUMNS =
  "id, user_id, provider_type, status, display_label, created_at, updated_at";

export const EXTERNAL_SOURCE_COLUMNS =
  "id, user_id, connection_id, source_local_id, display_name, selected, provider_access_role, source_time_zone, last_attempted_at, last_attempt_result, last_successful_observed_at, last_successful_window_starts_on, last_successful_window_ends_before, created_at, updated_at";

export const EXTERNAL_FACT_COLUMNS =
  "id, user_id, source_id, source_event_id, source_instance_id, source_series_id, temporal_kind, start_at, end_at, starts_on, ends_before, source_time_zone, display_label, lifecycle, provider_version_token, provider_updated_at, provider_event_type, provider_transparency, last_observed_at, created_at, updated_at";

export type ExternalConnectionRow = {
  id: string;
  user_id: string;
  provider_type: string;
  status: string;
  display_label: string | null;
  created_at: string;
  updated_at: string;
};

export type ObservedTemporalSourceRow = {
  id: string;
  user_id: string;
  connection_id: string;
  source_local_id: string;
  display_name: string;
  selected: boolean;
  provider_access_role: string | null;
  source_time_zone: string | null;
  last_attempted_at: string | null;
  last_attempt_result: string | null;
  last_successful_observed_at: string | null;
  last_successful_window_starts_on: string | null;
  last_successful_window_ends_before: string | null;
  created_at: string;
  updated_at: string;
};

export type ExternalTemporalFactRow = {
  id: string;
  user_id: string;
  source_id: string;
  source_event_id: string;
  source_instance_id: string | null;
  source_series_id: string | null;
  temporal_kind: string;
  start_at: string | null;
  end_at: string | null;
  starts_on: string | null;
  ends_before: string | null;
  source_time_zone: string | null;
  display_label: string;
  lifecycle: string;
  provider_version_token: string | null;
  provider_updated_at: string | null;
  provider_event_type: string | null;
  provider_transparency: string | null;
  last_observed_at: string;
  created_at: string;
  updated_at: string;
};

export function rowToExternalConnection(row: ExternalConnectionRow): ExternalConnection {
  return defineExternalConnection({
    id: row.id,
    userId: row.user_id,
    providerType: row.provider_type,
    status: requireExternalConnectionStatus(row.status),
    displayLabel: row.display_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function rowToObservedTemporalSource(row: ObservedTemporalSourceRow): ObservedTemporalSource {
  return defineObservedTemporalSource({
    id: row.id,
    userId: row.user_id,
    connectionId: row.connection_id,
    sourceLocalId: row.source_local_id,
    displayName: row.display_name,
    selected: row.selected,
    providerAccessRole: row.provider_access_role,
    sourceTimeZone: row.source_time_zone,
    lastAttemptedAt: row.last_attempted_at,
    lastAttemptResult:
      row.last_attempt_result === null
        ? null
        : requireObservationAttemptResult(row.last_attempt_result),
    lastSuccessfulObservedAt: row.last_successful_observed_at,
    lastSuccessfulWindowStartsOn: row.last_successful_window_starts_on,
    lastSuccessfulWindowEndsBefore: row.last_successful_window_ends_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function rowToExternalTemporalFact(row: ExternalTemporalFactRow): ExternalTemporalFact {
  if (row.temporal_kind !== "timed" && row.temporal_kind !== "all_day") {
    throw new Error("This external fact has an unknown temporal kind.");
  }
  const lifecycle = requireExternalFactLifecycle(row.lifecycle);
  const shared = {
    id: row.id,
    userId: row.user_id,
    sourceId: row.source_id,
    sourceEventId: row.source_event_id,
    sourceInstanceId: row.source_instance_id,
    sourceSeriesId: row.source_series_id,
    sourceTimeZone: row.source_time_zone,
    displayLabel: row.display_label,
    lifecycle,
    providerVersionToken: row.provider_version_token,
    providerUpdatedAt: row.provider_updated_at,
    providerEventType: row.provider_event_type,
    providerTransparency: row.provider_transparency,
    lastObservedAt: row.last_observed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.temporal_kind === "timed") {
    if (row.start_at == null || row.end_at == null) {
      throw new Error("A timed external fact is missing its instants.");
    }
    if (row.starts_on != null || row.ends_before != null) {
      throw new Error("A timed external fact cannot carry all-day civil bounds.");
    }
    return defineExternalTimedFact({
      ...shared,
      startAt: parseInstant(row.start_at),
      endAt: parseInstant(row.end_at),
    });
  }

  if (row.start_at != null || row.end_at != null) {
    throw new Error("An all-day external fact cannot carry timed instants.");
  }
  if (row.starts_on == null || row.ends_before == null) {
    throw new Error("An all-day external fact is missing its civil bounds.");
  }
  return defineExternalAllDayFact({
    ...shared,
    startsOn: row.starts_on,
    endsBefore: row.ends_before,
  });
}

/** Confirms credential columns are not part of the external temporal read surface. */
export const EXTERNAL_TEMPORAL_READ_HAS_NO_CREDENTIAL_FIELDS = [
  EXTERNAL_CONNECTION_COLUMNS,
  EXTERNAL_SOURCE_COLUMNS,
  EXTERNAL_FACT_COLUMNS,
].every((columns) => !/\b(ciphertext|access_token|refresh_token|client_secret)\b/.test(columns));

export async function loadExternalConnections(client: SupabaseClient): Promise<ExternalConnection[]> {
  const { data, error } = await client
    .from("external_temporal_connections")
    .select(EXTERNAL_CONNECTION_COLUMNS)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToExternalConnection(row as ExternalConnectionRow));
}

export async function loadObservedTemporalSources(client: SupabaseClient): Promise<ObservedTemporalSource[]> {
  const { data, error } = await client
    .from("external_temporal_sources")
    .select(EXTERNAL_SOURCE_COLUMNS)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToObservedTemporalSource(row as ObservedTemporalSourceRow));
}

export async function loadExternalTemporalFacts(client: SupabaseClient): Promise<ExternalTemporalFact[]> {
  const { data, error } = await client
    .from("external_temporal_facts")
    .select(EXTERNAL_FACT_COLUMNS)
    .order("last_observed_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToExternalTemporalFact(row as ExternalTemporalFactRow));
}

function parseInstant(value: string): Date {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new Error("This external fact has an unreadable instant.");
  }
  return instant;
}
