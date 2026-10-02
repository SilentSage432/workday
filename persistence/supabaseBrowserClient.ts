import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = process.env[SUPABASE_URL_ENV];
  const publishableKey = process.env[SUPABASE_PUBLISHABLE_KEY_ENV];

  if (!url || !publishableKey) {
    throw new Error(
      `Supabase is not configured. Set ${SUPABASE_URL_ENV} and ${SUPABASE_PUBLISHABLE_KEY_ENV}. The application shell does not require a database connection.`,
    );
  }

  return createClient(url, publishableKey);
}
