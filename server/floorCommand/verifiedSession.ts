import type { SupabaseClient } from "@supabase/supabase-js";

/** Session view of an operator id that requireAuthenticatedUserId already verified. */
export function sessionForVerifiedOperator(userId: string): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
  } as unknown as SupabaseClient;
}
