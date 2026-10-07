import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { ExternalCredentialError } from "@/server/credentials/errors";

export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

/**
 * Privileged Supabase client for tightly bounded server operations.
 * Not a replacement for the browser RLS client.
 * Does not persist auth sessions.
 * Env is read only when this factory is invoked — ordinary Orient startup stays config-optional.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  assertServerOnly("createSupabaseServiceRoleClient");

  const url = process.env[SUPABASE_URL_ENV];
  const serviceRoleKey = process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];

  if (!url || url.trim().length === 0) {
    throw new ExternalCredentialError(
      "service_role_unavailable",
      "Supabase URL is not configured for privileged server access.",
    );
  }
  if (!serviceRoleKey || serviceRoleKey.trim().length === 0) {
    throw new ExternalCredentialError(
      "service_role_unavailable",
      "Supabase service-role key is not configured for privileged server access.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
