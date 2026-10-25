import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { floorCommandObservationHttpError, loadFloorCommandWorkReading } from "@/server/floorCommand/present";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retained Floor Command observation for the signed-in operator.
 * GET only. The store is the server binding. This route does not pull.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const admin = createSupabaseServiceRoleClient();
    const reading = await loadFloorCommandWorkReading(admin, userId);
    return Response.json(reading);
  } catch (error) {
    return floorCommandObservationHttpError(error);
  }
}
