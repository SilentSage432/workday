import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { approveFloorCommandConnection, type FloorCommandApproval } from "@/server/floorCommand/approve";
import { floorCommandObservationHttpError } from "@/server/floorCommand/present";
import { rejectCrossSiteFloorCommandPost } from "@/server/floorCommand/sameOriginPost";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records the signed-in operator's approval of the server store.
 * The body cannot choose a store, source, or purpose. This route does not pull.
 */
export async function POST(request: Request): Promise<Response> {
  return handleFloorCommandApprovalPost(request);
}

export async function handleFloorCommandApprovalPost(
  request: Request,
  deps: {
    authenticate?: (request: Request) => Promise<string>;
    approve?: typeof approveFloorCommandConnection;
  } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const body = await rejectApprovalBody(request);
  if (body) return body;
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.approve ?? approveFloorCommandConnection)(sessionForVerifiedOperator(userId));
    return approvalResponse(result);
  } catch (error) {
    return floorCommandObservationHttpError(error);
  }
}

function approvalResponse(result: FloorCommandApproval): Response {
  if (result.status === "approved") return Response.json(result);
  if (result.status === "unauthorized") {
    return Response.json({ status: result.status }, { status: 401 });
  }
  if (result.status === "already_bound") {
    return Response.json({ status: result.status }, { status: 409 });
  }
  const status = result.status === "unconfigured" || result.status === "unavailable" ? 503 : 400;
  return Response.json({ status: result.status }, { status });
}

async function rejectApprovalBody(request: Request): Promise<Response | null> {
  const text = await request.text();
  if (!text.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return Response.json({ error: "Approval body is not accepted." }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length > 0) {
    return Response.json({ error: "Approval body is not accepted." }, { status: 400 });
  }
  return null;
}
