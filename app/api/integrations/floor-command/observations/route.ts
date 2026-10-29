import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import {
  observeGovernedFloorCommandWeek,
  type FloorCommandGovernedObservationResult,
} from "@/server/floorCommand/governedObservation";
import { floorCommandObservationHttpError } from "@/server/floorCommand/present";
import { rejectCrossSiteFloorCommandPost } from "@/server/floorCommand/sameOriginPost";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One explicit Floor Command observation for a named week.
 * Opening Work does not call this route.
 */
export async function POST(request: Request): Promise<Response> {
  return handleFloorCommandObservationPost(request);
}

export async function handleFloorCommandObservationPost(
  request: Request,
  deps: {
    authenticate?: (request: Request) => Promise<string>;
    observe?: typeof observeGovernedFloorCommandWeek;
  } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const week = await readWeek(request);
  if (week instanceof Response) return week;
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.observe ?? observeGovernedFloorCommandWeek)(
      sessionForVerifiedOperator(userId),
      week,
    );
    return observationResponse(result);
  } catch (error) {
    return floorCommandObservationHttpError(error);
  }
}

async function readWeek(request: Request): Promise<string | Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ outcome: "invalid_week" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return Response.json({ outcome: "invalid_week" }, { status: 400 });
  }
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.week !== "string") {
    return Response.json({ outcome: "invalid_week" }, { status: 400 });
  }
  return record.week;
}

function observationResponse(result: FloorCommandGovernedObservationResult): Response {
  switch (result.outcome) {
    case "unauthorized":
      return Response.json(result, { status: 401 });
    case "invalid_week":
      return Response.json(result, { status: 400 });
    case "unconfigured":
      return Response.json(result, { status: 503 });
    case "disabled":
    case "wrong_store":
      return Response.json(result, { status: 403 });
    case "unbound":
    case "busy":
      return Response.json(result, { status: 409 });
    default:
      return Response.json(result);
  }
}
