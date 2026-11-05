import { handleStandingOpportunityInspectPost } from "@/server/floorCommand/standingOpportunityInspectionRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Non-consuming standing-opportunity inspection for the signed-in operator.
 * Does not claim, mark attempts, contact Floor Command, or authorize execution.
 * Opening Work does not call this route.
 */
export async function POST(request: Request): Promise<Response> {
  return handleStandingOpportunityInspectPost(request);
}
