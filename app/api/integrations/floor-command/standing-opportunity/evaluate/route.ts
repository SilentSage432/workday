import { handleStandingOpportunityEvaluateGet } from "@/server/floorCommand/standingUnattendedEvaluateRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unattended standing-evaluation wake boundary (RELEASE-053 local mount).
 *
 * Vercel Cron shape: GET + Authorization: Bearer $CRON_SECRET.
 * Does not inject a StandingSourceAdapter — missing adapter fails closed (503)
 * with no claim, attempt, or Floor Command contact.
 * Does not configure vercel.json Cron. Operator sessions cannot substitute.
 * Opening Work / inspection does not call this route.
 */
export async function GET(request: Request): Promise<Response> {
  return handleStandingOpportunityEvaluateGet(request);
}
