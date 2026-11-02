import { handleStandingPolicyRevoke } from "@/server/floorCommand/standingPolicyRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Revokes one standing grant and retains the row. This route does not observe. */
export async function POST(request: Request): Promise<Response> {
  return handleStandingPolicyRevoke(request);
}
