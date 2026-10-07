import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { ExternalCredentialError } from "@/server/credentials/errors";

/**
 * Authority established after verifying the Connection belongs to the authenticated user.
 * Privilege (service role) permits the lookup; this result establishes authority.
 */
export type VerifiedConnectionAccess = {
  userId: string;
  connectionId: string;
};

/**
 * Verify that `connectionId` is owned by `authenticatedUserId`.
 * Does not trust a caller-supplied owner id as authority by itself —
 * the Connection row must match the authenticated user.
 */
export async function requireOwnedExternalConnection(
  admin: SupabaseClient,
  authenticatedUserId: string,
  connectionId: string,
): Promise<VerifiedConnectionAccess> {
  assertServerOnly("requireOwnedExternalConnection");

  const userId = authenticatedUserId.trim();
  const connection = connectionId.trim();
  if (userId.length === 0 || connection.length === 0) {
    throw new ExternalCredentialError(
      "unauthorized_connection",
      "Connection access was denied.",
    );
  }

  const { data, error } = await admin
    .from("external_temporal_connections")
    .select("id, user_id")
    .eq("id", connection)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ExternalCredentialError(
      "persistence_failure",
      "Connection ownership could not be verified.",
    );
  }

  if (!data || data.id !== connection || data.user_id !== userId) {
    throw new ExternalCredentialError(
      "unauthorized_connection",
      "Connection access was denied.",
    );
  }

  return { userId, connectionId: connection };
}
