import {
  handleStandingPolicyCreate,
  handleStandingPolicyInspect,
} from "@/server/floorCommand/standingPolicyRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lists the signed-in operator's standing observation policies. Does not read Floor Command. */
export async function GET(request: Request): Promise<Response> {
  return handleStandingPolicyInspect(request);
}

/** Proposes a standing observation grant. Does not approve it and does not read Floor Command. */
export async function POST(request: Request): Promise<Response> {
  return handleStandingPolicyCreate(request);
}
