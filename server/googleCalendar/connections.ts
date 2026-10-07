import type { SupabaseClient } from "@supabase/supabase-js";
import { EXTERNAL_PROVIDER_GOOGLE_CALENDAR } from "@/domain/externalTemporal";
import { assertServerOnly } from "@/server/assertServerOnly";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export class GoogleConnectionError extends Error {
  readonly code: "connection_persistence_failure" | "connection_missing";

  constructor(code: GoogleConnectionError["code"], message: string) {
    super(message);
    this.name = "GoogleConnectionError";
    this.code = code;
  }
}

export type GoogleConnectionRow = {
  id: string;
  user_id: string;
  provider_type: string;
  status: string;
  display_label: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Prepare a Connection for OAuth.
 * Reuses the latest non-disconnected Google Calendar connection when present;
 * otherwise inserts pending_auth. Does not mark connected until credential custody succeeds.
 */
export async function prepareGoogleConnection(
  userId: string,
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<GoogleConnectionRow> {
  assertServerOnly("prepareGoogleConnection");
  const { data: existing, error } = await admin
    .from("external_temporal_connections")
    .select("id, user_id, provider_type, status, display_label, created_at, updated_at")
    .eq("user_id", userId)
    .eq("provider_type", EXTERNAL_PROVIDER_GOOGLE_CALENDAR)
    .in("status", ["pending_auth", "connected", "auth_failed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be prepared.");
  }

  const now = new Date().toISOString();
  if (existing) {
    if (existing.status === "connected") {
      return existing as GoogleConnectionRow;
    }
    const { data: updated, error: updateError } = await admin
      .from("external_temporal_connections")
      .update({ status: "pending_auth", updated_at: now })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("id, user_id, provider_type, status, display_label, created_at, updated_at")
      .single();
    if (updateError || !updated) {
      throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be prepared.");
    }
    return updated as GoogleConnectionRow;
  }

  const { data: inserted, error: insertError } = await admin
    .from("external_temporal_connections")
    .insert({
      user_id: userId,
      provider_type: EXTERNAL_PROVIDER_GOOGLE_CALENDAR,
      status: "pending_auth",
      display_label: "Google Calendar",
      created_at: now,
      updated_at: now,
    })
    .select("id, user_id, provider_type, status, display_label, created_at, updated_at")
    .single();

  if (insertError || !inserted) {
    throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be prepared.");
  }
  return inserted as GoogleConnectionRow;
}

export async function markGoogleConnectionConnected(
  input: { userId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("markGoogleConnectionConnected");
  const { error } = await admin
    .from("external_temporal_connections")
    .update({ status: "connected", updated_at: new Date().toISOString() })
    .eq("id", input.connectionId)
    .eq("user_id", input.userId);
  if (error) {
    throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be updated.");
  }
}

export async function markGoogleConnectionAuthFailed(
  input: { userId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("markGoogleConnectionAuthFailed");
  await admin
    .from("external_temporal_connections")
    .update({ status: "auth_failed", updated_at: new Date().toISOString() })
    .eq("id", input.connectionId)
    .eq("user_id", input.userId);
}

export async function markGoogleConnectionDisconnected(
  input: { userId: string; connectionId: string },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<void> {
  assertServerOnly("markGoogleConnectionDisconnected");
  const { error } = await admin
    .from("external_temporal_connections")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("id", input.connectionId)
    .eq("user_id", input.userId);
  if (error) {
    throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be updated.");
  }
}

export async function loadLatestGoogleConnection(
  userId: string,
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<GoogleConnectionRow | null> {
  assertServerOnly("loadLatestGoogleConnection");
  const { data, error } = await admin
    .from("external_temporal_connections")
    .select("id, user_id, provider_type, status, display_label, created_at, updated_at")
    .eq("user_id", userId)
    .eq("provider_type", EXTERNAL_PROVIDER_GOOGLE_CALENDAR)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new GoogleConnectionError("connection_persistence_failure", "Connection could not be read.");
  }
  return (data as GoogleConnectionRow | null) ?? null;
}
