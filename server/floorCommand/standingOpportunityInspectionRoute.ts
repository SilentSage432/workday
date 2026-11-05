/**
 * Authenticated HTTP boundary for non-consuming standing-opportunity inspection
 * (RELEASE-041 local). Does not claim, mark attempts, contact Floor Command, or
 * open governed observations. Does not register an execution pathway.
 */
import { AuthenticatedUserError, requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { rejectCrossSiteFloorCommandPost } from "@/server/floorCommand/sameOriginPost";
import {
  inspectStandingFloorCommandOpportunity,
  type StandingOpportunityInspectionResult,
} from "@/server/floorCommand/standingOpportunityInspection";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";

const MAX_BODY_BYTES = 8_192;
const NO_STORE = { "cache-control": "no-store" } as const;

type Inspect = typeof inspectStandingFloorCommandOpportunity;

export type PublicStandingOpportunityInspectionResponse =
  | { status: "unauthorized" }
  | { status: "invalid_intent"; reason: string }
  | { status: "unconfigured" }
  | { status: "unavailable" }
  | {
      status: string;
      advisory: true;
      consumesOpportunity: false;
      correlationId: string;
      asOf: string | null;
      policyId: string | null;
      policyVersion: number | null;
      operationalWeek: string | null;
      opportunityKind: string | null;
      disclaimer: string;
    };

/**
 * POST handler for standing-opportunity inspection.
 * Client never receives raw RPC dumps or credentials.
 */
export async function handleStandingOpportunityInspectPost(
  request: Request,
  deps: {
    authenticate?: (request: Request) => Promise<string>;
    inspect?: Inspect;
  } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) {
    return withNoStore(refused);
  }

  const body = await readInspectionBody(request);
  if (body instanceof Response) return body;

  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.inspect ?? inspectStandingFloorCommandOpportunity)(
      sessionForVerifiedOperator(userId),
      body,
    );
    return inspectionResponse(result);
  } catch (error) {
    return inspectionError(error);
  }
}

export function presentPublicStandingInspection(
  result: StandingOpportunityInspectionResult,
): PublicStandingOpportunityInspectionResponse {
  if (result.status === "unauthorized") return { status: "unauthorized" };
  if (result.status === "unconfigured") return { status: "unconfigured" };
  if ("reason" in result && result.status === "invalid_intent") {
    return { status: "invalid_intent", reason: result.reason };
  }
  if (!("advisory" in result) || result.advisory !== true) {
    return { status: "unavailable" };
  }
  return {
    status: result.status,
    advisory: true,
    consumesOpportunity: false,
    correlationId: result.correlationId,
    asOf: result.asOf,
    policyId: result.policyId,
    policyVersion: result.policyVersion,
    operationalWeek: result.operationalWeek,
    opportunityKind: result.opportunityKind,
    disclaimer: result.disclaimer,
  };
}export function standingOpportunityInspectionHttpStatus(
  result: PublicStandingOpportunityInspectionResponse,
): number {
  switch (result.status) {
    case "unauthorized":
      return 401;
    case "invalid_intent":
      return 400;
    case "unconfigured":
    case "unavailable":
      return 503;
    default:
      // Advisory eligibility/blocker outcomes are successful inspections.
      return 200;
  }
}

function inspectionResponse(result: StandingOpportunityInspectionResult): Response {
  const publicResult = presentPublicStandingInspection(result);
  return Response.json(publicResult, {
    status: standingOpportunityInspectionHttpStatus(publicResult),
    headers: NO_STORE,
  });
}

function inspectionError(error: unknown): Response {
  if (error instanceof AuthenticatedUserError) {
    return Response.json(
      { status: "unauthorized" } satisfies PublicStandingOpportunityInspectionResponse,
      {
        status: error.code === "auth_unavailable" ? 503 : 401,
        headers: NO_STORE,
      },
    );
  }
  return Response.json(
    { status: "unavailable" } satisfies PublicStandingOpportunityInspectionResponse,
    { status: 503, headers: NO_STORE },
  );
}

async function readInspectionBody(request: Request): Promise<unknown | Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      { status: "invalid_intent", reason: "invalid_content_type" },
      { status: 400, headers: NO_STORE },
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return Response.json(
      { status: "invalid_intent", reason: "invalid_body" },
      { status: 400, headers: NO_STORE },
    );
  }
  if (text.length > MAX_BODY_BYTES) {
    return Response.json(
      { status: "invalid_intent", reason: "payload_too_large" },
      { status: 400, headers: NO_STORE },
    );
  }
  if (text.trim().length === 0) {
    return Response.json(
      { status: "invalid_intent", reason: "invalid_body" },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return Response.json(
      { status: "invalid_intent", reason: "invalid_body" },
      { status: 400, headers: NO_STORE },
    );
  }
}

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
