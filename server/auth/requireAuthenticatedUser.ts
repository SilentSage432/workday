import { createClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { SUPABASE_URL_ENV } from "@/server/supabaseServiceRoleClient";

export const SUPABASE_PUBLISHABLE_KEY_ENV = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export class AuthenticatedUserError extends Error {
  readonly code: "unauthenticated" | "auth_unavailable";

  constructor(code: "unauthenticated" | "auth_unavailable", message: string) {
    super(message);
    this.name = "AuthenticatedUserError";
    this.code = code;
  }
}

/**
 * Verify Authorization: Bearer <supabase access token> via Supabase Auth.
 * Does not trust a browser-supplied user_id.
 */
export async function requireAuthenticatedUserId(request: Request): Promise<string> {
  assertServerOnly("requireAuthenticatedUserId");

  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
  }
  const jwt = header.slice("bearer ".length).trim();
  if (jwt.length === 0) {
    throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
  }

  const url = process.env[SUPABASE_URL_ENV];
  const publishableKey = process.env[SUPABASE_PUBLISHABLE_KEY_ENV];
  if (!url || !publishableKey) {
    throw new AuthenticatedUserError(
      "auth_unavailable",
      "Authentication is not configured on the server.",
    );
  }

  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) {
    throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
  }
  return data.user.id;
}
