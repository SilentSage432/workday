import { handleStandingPolicyApprove } from "@/server/floorCommand/standingPolicyRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Explicit approval of one proposed grant. This route does not observe. */
export async function POST(request: Request): Promise<Response> {
  return handleStandingPolicyApprove(request);
}
