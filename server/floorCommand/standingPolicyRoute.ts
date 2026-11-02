import { AuthenticatedUserError, requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { rejectCrossSiteFloorCommandPost } from "@/server/floorCommand/sameOriginPost";
import {
  approveFloorCommandStandingPolicy,
  expireFloorCommandStandingPolicy,
  inspectFloorCommandStandingPolicies,
  proposeFloorCommandStandingPolicy,
  readStandingPolicyIdBody,
  readStandingPolicyProposal,
  readStandingPolicyRevocation,
  revokeFloorCommandStandingPolicy,
  standingPolicyHttpStatus,
  type StandingPolicyResult,
} from "@/server/floorCommand/standingPolicy";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";

type Propose = typeof proposeFloorCommandStandingPolicy;
type Approve = typeof approveFloorCommandStandingPolicy;
type Revoke = typeof revokeFloorCommandStandingPolicy;
type Expire = typeof expireFloorCommandStandingPolicy;
type Inspect = typeof inspectFloorCommandStandingPolicies;

/**
 * Operator lifecycle for an inert standing observation grant.
 * None of these handlers read Floor Command.
 */
export async function handleStandingPolicyCreate(
  request: Request,
  deps: { authenticate?: (request: Request) => Promise<string>; propose?: Propose } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const proposal = readStandingPolicyProposal(await readJson(request));
  if (!proposal) return Response.json({ status: "invalid_window" }, { status: 400 });
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.propose ?? proposeFloorCommandStandingPolicy)(
      sessionForVerifiedOperator(userId),
      proposal,
    );
    return policyResponse(result);
  } catch (error) {
    return policyError(error);
  }
}

export async function handleStandingPolicyInspect(
  request: Request,
  deps: { authenticate?: (request: Request) => Promise<string>; inspect?: Inspect } = {},
): Promise<Response> {
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.inspect ?? inspectFloorCommandStandingPolicies)(
      sessionForVerifiedOperator(userId),
    );
    return policyResponse(result);
  } catch (error) {
    return policyError(error);
  }
}

export async function handleStandingPolicyApprove(
  request: Request,
  deps: { authenticate?: (request: Request) => Promise<string>; approve?: Approve } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const policyId = readStandingPolicyIdBody(await readJson(request));
  if (!policyId) return Response.json({ status: "not_found" }, { status: 400 });
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.approve ?? approveFloorCommandStandingPolicy)(
      sessionForVerifiedOperator(userId),
      policyId,
    );
    return policyResponse(result);
  } catch (error) {
    return policyError(error);
  }
}

export async function handleStandingPolicyRevoke(
  request: Request,
  deps: { authenticate?: (request: Request) => Promise<string>; revoke?: Revoke } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const revocation = readStandingPolicyRevocation(await readJson(request));
  if (!revocation) return Response.json({ status: "invalid_reason" }, { status: 400 });
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.revoke ?? revokeFloorCommandStandingPolicy)(
      sessionForVerifiedOperator(userId),
      revocation.policyId,
      revocation.reason,
    );
    return policyResponse(result);
  } catch (error) {
    return policyError(error);
  }
}

export async function handleStandingPolicyExpire(
  request: Request,
  deps: { authenticate?: (request: Request) => Promise<string>; expire?: Expire } = {},
): Promise<Response> {
  const refused = rejectCrossSiteFloorCommandPost(request);
  if (refused) return refused;
  const policyId = readStandingPolicyIdBody(await readJson(request));
  if (!policyId) return Response.json({ status: "not_found" }, { status: 400 });
  try {
    const userId = await (deps.authenticate ?? requireAuthenticatedUserId)(request);
    const result = await (deps.expire ?? expireFloorCommandStandingPolicy)(
      sessionForVerifiedOperator(userId),
      policyId,
    );
    return policyResponse(result);
  } catch (error) {
    return policyError(error);
  }
}

function policyResponse(result: StandingPolicyResult): Response {
  return Response.json(result, { status: standingPolicyHttpStatus(result.status) });
}

function policyError(error: unknown): Response {
  if (error instanceof AuthenticatedUserError) {
    return Response.json(
      { status: "unauthorized" },
      { status: error.code === "auth_unavailable" ? 503 : 401 },
    );
  }
  return Response.json({ status: "unavailable" }, { status: 503 });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
