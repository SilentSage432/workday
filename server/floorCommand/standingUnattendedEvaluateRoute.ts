/**
 * HTTP boundary for unattended standing evaluation (RELEASE-046; Vercel Cron
 * contract in RELEASE-048). Not mounted under app/api in this tranche — avoids
 * a reachable production execution route until a separately authorized dark
 * deploy wires it.
 *
 * Vercel Cron shape: GET + Authorization: Bearer $CRON_SECRET.
 * Operator session tokens and legacy custom headers cannot substitute.
 * Injected StandingSourceAdapter required (fake in tests; never auto-network).
 */
import { assertServerOnly } from "@/server/assertServerOnly";
import type { StandingSourceAdapter } from "@/server/floorCommand/standingSourceAdapter";
import { verifyStandingSchedulerCredential } from "@/server/floorCommand/standingUnattendedAuth";
import {
  evaluateStandingOpportunityUnattended,
  type StandingUnattendedEvaluateResult,
} from "@/server/floorCommand/standingUnattendedEvaluate";

const NO_STORE = { "cache-control": "no-store" } as const;

type EnvMap = Record<string, string | undefined>;

/**
 * GET-only unattended evaluate handler (Vercel Cron compatible).
 * Future App Router wiring: export GET that calls this with an injected adapter.
 */
export async function handleStandingOpportunityEvaluateGet(
  request: Request,
  deps: {
    env?: EnvMap;
    sourceAdapter?: StandingSourceAdapter;
    evaluate?: typeof evaluateStandingOpportunityUnattended;
    asOf?: string | null;
  } = {},
): Promise<Response> {
  assertServerOnly("handleStandingOpportunityEvaluateGet");

  if (request.method !== "GET") {
    return withNoStore(
      Response.json({ status: "method_not_allowed", observed: false }, { status: 405 }),
    );
  }

  const auth = verifyStandingSchedulerCredential(request, deps.env ?? process.env);
  if (!auth.ok) {
    const status = auth.status === "unconfigured" ? 503 : 401;
    return withNoStore(
      Response.json(
        {
          status: auth.status,
          observed: false,
        },
        { status },
      ),
    );
  }

  const queryRejection = rejectScopeQuery(request);
  if (queryRejection) return queryRejection;

  if (!deps.sourceAdapter) {
    return withNoStore(
      Response.json({ status: "adapter_required", observed: false }, { status: 503 }),
    );
  }

  const result = await (deps.evaluate ?? evaluateStandingOpportunityUnattended)({
    sourceAdapter: deps.sourceAdapter,
    asOf: deps.asOf,
  });

  return presentEvaluateResponse(result);
}

export function standingUnattendedEvaluateHttpStatus(
  result: StandingUnattendedEvaluateResult,
): number {
  switch (result.status) {
    case "unconfigured":
    case "adapter_required":
      return 503;
    case "gate_disabled":
    case "no_approved_policy":
    case "policy_conflict":
    case "not_yet_eligible":
    case "expired":
    case "revoked":
    case "already_claimed":
    case "already_attempted":
    case "already_closed":
    case "unavailable":
      return 200;
    case "observation_committed":
    case "source_failure":
      return 200;
    case "dispatch_ambiguous":
    case "claim_rejected":
    case "revalidation_rejected":
    case "attempt_rejected":
    case "governed_open_refused":
      return 200;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function presentEvaluateResponse(result: StandingUnattendedEvaluateResult): Response {
  const publicBody = redactEvaluateResult(result);
  return withNoStore(
    Response.json(publicBody, { status: standingUnattendedEvaluateHttpStatus(result) }),
  );
}

function redactEvaluateResult(
  result: StandingUnattendedEvaluateResult,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    status: result.status,
    observed: result.observed,
  };
  for (const [key, value] of Object.entries(result)) {
    if (key === "status" || key === "observed") continue;
    if (key === "detail") continue;
    base[key] = value;
  }
  return base;
}

/**
 * Fail closed on any query string. Scope must come only from DB discovery —
 * never from caller-controlled query fields (policy, week, source URL, etc.).
 */
function rejectScopeQuery(request: Request): Response | null {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return withNoStore(
      Response.json({ status: "invalid_query", observed: false, reason: "invalid_url" }, { status: 400 }),
    );
  }

  if ([...url.searchParams.keys()].length > 0) {
    return withNoStore(
      Response.json(
        { status: "invalid_query", observed: false, reason: "forbidden_field" },
        { status: 400 },
      ),
    );
  }
  return null;
}

function withNoStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", NO_STORE["cache-control"]);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
