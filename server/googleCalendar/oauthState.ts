import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";
import { generateOAuthState, generatePkceVerifier, pkceS256Challenge } from "@/server/googleCalendar/pkce";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export class OAuthStateError extends Error {
  readonly code:
    | "state_missing"
    | "state_invalid"
    | "state_expired"
    | "state_reused"
    | "state_persistence_failure";

  constructor(
    code: OAuthStateError["code"],
    message: string,
  ) {
    super(message);
    this.name = "OAuthStateError";
    this.code = code;
  }
}

export type OAuthInitiation = {
  state: string;
  userId: string;
  connectionId: string;
  codeVerifier: string;
  codeChallenge: string;
  expiresAt: string;
};

export async function createOAuthInitiation(
  input: {
    userId: string;
    connectionId: string;
    now?: Date;
    ttlMs?: number;
  },
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
): Promise<OAuthInitiation> {
  assertServerOnly("createOAuthInitiation");
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? OAUTH_STATE_TTL_MS;
  const state = generateOAuthState();
  const codeVerifier = generatePkceVerifier();
  const codeChallenge = pkceS256Challenge(codeVerifier);
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const { error } = await admin.from("external_oauth_initiations").insert({
    state,
    user_id: input.userId,
    connection_id: input.connectionId,
    code_verifier: codeVerifier,
    expires_at: expiresAt,
  });

  if (error) {
    throw new OAuthStateError("state_persistence_failure", "Authorization could not be started.");
  }

  return {
    state,
    userId: input.userId,
    connectionId: input.connectionId,
    codeVerifier,
    codeChallenge,
    expiresAt,
  };
}

/**
 * Consume one-time OAuth state. Returns initiation context for callback ownership binding.
 * Fail closed on missing, expired, or reused state.
 */
export async function consumeOAuthInitiation(
  state: string | null | undefined,
  admin: SupabaseClient = createSupabaseServiceRoleClient(),
  now: Date = new Date(),
): Promise<{ userId: string; connectionId: string; codeVerifier: string }> {
  assertServerOnly("consumeOAuthInitiation");
  const value = state?.trim() ?? "";
  if (value.length === 0) {
    throw new OAuthStateError("state_missing", "Authorization could not be completed.");
  }

  const { data, error } = await admin
    .from("external_oauth_initiations")
    .select("state, user_id, connection_id, code_verifier, expires_at, consumed_at")
    .eq("state", value)
    .maybeSingle();

  if (error) {
    throw new OAuthStateError("state_persistence_failure", "Authorization could not be completed.");
  }
  if (!data) {
    throw new OAuthStateError("state_invalid", "Authorization could not be completed.");
  }
  if (data.consumed_at) {
    throw new OAuthStateError("state_reused", "Authorization could not be completed.");
  }
  if (new Date(data.expires_at).getTime() <= now.getTime()) {
    throw new OAuthStateError("state_expired", "Authorization expired. Connect again.");
  }

  const { data: updated, error: updateError } = await admin
    .from("external_oauth_initiations")
    .update({ consumed_at: now.toISOString() })
    .eq("state", value)
    .is("consumed_at", null)
    .select("state")
    .maybeSingle();

  if (updateError || !updated) {
    throw new OAuthStateError("state_reused", "Authorization could not be completed.");
  }

  return {
    userId: data.user_id,
    connectionId: data.connection_id,
    codeVerifier: data.code_verifier,
  };
}
