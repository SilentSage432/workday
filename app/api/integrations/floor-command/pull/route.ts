import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { floorCommandObservationHttpError } from "@/server/floorCommand/present";
import { pullFloorCommandPublishedWeek, type FloorCommandPullResult } from "@/server/floorCommand/pull";
import { rejectCrossSiteFloorCommandPost } from "@/server/floorCommand/sameOriginPost";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One controlled Floor Command read for an explicit ISO week.
 * Work does not call this route. Opening Work does not pull.
 */
export async function POST(request: Request): Promise<Response> {
  return handleFloorCommandPullPost(request);
}

export async function handleFloorCommandPullPost(
  request: Request,
  deps: {
    authenticate?: (request: Request) => Promise<string>;
    pull?: typeof pullFloorCommandPublishedWeek;
  } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const week = await readWeek(request);
  if (week instanceof Response) return week;
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.pull ?? pullFloorCommandPublishedWeek)(
      sessionForVerifiedOperator(userId),
      week,
    );
    return pullResponse(result);
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

function pullResponse(result: FloorCommandPullResult): Response {
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
