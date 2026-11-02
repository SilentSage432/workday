import { handleStandingPolicyExpire } from "@/server/floorCommand/standingPolicyRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Expires one approved grant after its expiration instant. This route does not observe. */
export async function POST(request: Request): Promise<Response> {
  return handleStandingPolicyExpire(request);
}
