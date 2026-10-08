import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { requireOwnedExternalConnection } from "@/server/credentials/ownership";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";
import type { SelectableGoogleCalendar } from "@/server/googleCalendar/types";

export class GoogleSourceError extends Error {
  readonly code: "source_persistence_failure" | "source_injection_rejected";

  constructor(code: GoogleSourceError["code"], message: string) {
    super(message);
    this.name = "GoogleSourceError";
    this.code = code;
  }
}

export type ObservedSourceRow = {
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
};

/**
 * Persist explicit human selection.
 * Only sourceLocalIds present in `enumerated` may become selected.
 * Unknown/unenumerated IDs are rejected.
 */
export async function saveGoogleSourceSelection(
  input: {
    authenticatedUserId: string;
    connectionId: string;
    selectedSourceLocalIds: readonly string[];
    enumerated: readonly SelectableGoogleCalendar[];
  },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<{ selectedCount: number }> {
  assertServerOnly("saveGoogleSourceSelection");
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );

  const allowed = new Map(input.enumerated.map((item) => [item.sourceLocalId, item]));
  const selectedIds = [...new Set(input.selectedSourceLocalIds.map((id) => id.trim()).filter(Boolean))];
  for (const id of selectedIds) {
    if (!allowed.has(id)) {
      throw new GoogleSourceError(
        "source_injection_rejected",
        "Only calendars available on this Google connection may be selected.",
      );
    }
  }

  const now = new Date().toISOString();
  const selectedSet = new Set(selectedIds);

  // Upsert every enumerated calendar for stable identity; selected flags follow human choice.
  for (const calendar of input.enumerated) {
    const { data: existing, error: readError } = await admin
      .from("external_temporal_sources")
      .select("id")
      .eq("user_id", access.userId)
      .eq("connection_id", access.connectionId)
      .eq("source_local_id", calendar.sourceLocalId)
      .maybeSingle();
    if (readError) {
      throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be saved.");
    }

    const row = {
      user_id: access.userId,
      connection_id: access.connectionId,
      source_local_id: calendar.sourceLocalId,
      display_name: calendar.displayName,
      selected: selectedSet.has(calendar.sourceLocalId),
      provider_access_role: calendar.accessRole,
      source_time_zone: calendar.sourceTimeZone,
      updated_at: now,
    };

    if (existing) {
      const { error } = await admin
        .from("external_temporal_sources")
        .update(row)
        .eq("id", existing.id)
        .eq("user_id", access.userId);
      if (error) {
        throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be saved.");
      }
    } else {
      const { error } = await admin.from("external_temporal_sources").insert({
        ...row,
        created_at: now,
      });
      if (error) {
        throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be saved.");
      }
    }
  }

  // Deselect any previously retained sources not present in this enumeration save set.
  const { data: retained, error: retainedError } = await admin
    .from("external_temporal_sources")
    .select("id, source_local_id")
    .eq("user_id", access.userId)
    .eq("connection_id", access.connectionId);
  if (retainedError) {
    throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be saved.");
  }
  for (const source of retained ?? []) {
    if (!allowed.has(source.source_local_id) && selectedSet.has(source.source_local_id) === false) {
      const { error } = await admin
        .from("external_temporal_sources")
        .update({ selected: false, updated_at: now })
        .eq("id", source.id)
        .eq("user_id", access.userId);
      if (error) {
        throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be saved.");
      }
    }
  }

  return { selectedCount: selectedIds.length };
}

export async function clearGoogleSourceSelection(
  input: { authenticatedUserId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("clearGoogleSourceSelection");
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );
  const { error } = await admin
    .from("external_temporal_sources")
    .update({ selected: false, updated_at: new Date().toISOString() })
    .eq("user_id", access.userId)
    .eq("connection_id", access.connectionId);
  if (error) {
    throw new GoogleSourceError("source_persistence_failure", "Calendar selection could not be cleared.");
  }
}

export async function listGoogleSourcesForConnection(
  input: { authenticatedUserId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<ObservedSourceRow[]> {
  assertServerOnly("listGoogleSourcesForConnection");
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );
  const { data, error } = await admin
    .from("external_temporal_sources")
    .select(
      "id, user_id, connection_id, source_local_id, display_name, selected, provider_access_role, source_time_zone, last_attempted_at, last_attempt_result, last_successful_observed_at, last_successful_window_starts_on, last_successful_window_ends_before",
    )
    .eq("user_id", access.userId)
    .eq("connection_id", access.connectionId)
    .order("display_name", { ascending: true });
  if (error) {
    throw new GoogleSourceError("source_persistence_failure", "Calendar sources could not be read.");
  }
  return (data ?? []) as ObservedSourceRow[];
}
