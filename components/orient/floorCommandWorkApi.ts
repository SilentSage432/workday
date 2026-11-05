import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import {
  isFloorCommandWorkReading,
  type FloorCommandWorkReading,
} from "@/projections/floorCommandWorkPresentation";
import { STANDING_COORDINATION_KIND } from "@/components/orient/standingOpportunityInspectionPresentation";

const OBSERVATION_PATH = "/api/integrations/floor-command/observation";
const OBSERVATIONS_PATH = "/api/integrations/floor-command/observations";
const STANDING_POLICY_PATH = "/api/integrations/floor-command/standing-policy";
const STANDING_INSPECT_PATH = "/api/integrations/floor-command/standing-opportunity/inspect";

export type StandingOpportunityInspectClientResult =
  | {
      kind: "advisory";
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
    }
  | { kind: "invalid_intent"; reason: string }
  | { kind: "unauthorized" }
  | { kind: "unconfigured" }
  | { kind: "unavailable" }
  | { kind: "context_unavailable"; reason: string }
  | { kind: "failed" };

/**
 * Loads the retained observation through the authenticated route.
 * The browser session is the Supabase access token. It is not the Floor Command bearer.
 */
export async function loadFloorCommandWorkReading(): Promise<FloorCommandWorkReading | null> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) return null;
  let response: Response;
  try {
    response = await fetch(OBSERVATION_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
  } catch {
    return { posture: "unread" };
  }
  if (response.status === 401) return null;
  if (!response.ok) return { posture: "unread" };
  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body) || !isFloorCommandWorkReading(body)) return { posture: "unread" };
  return body;
}

/**
 * One explicit observation. Opening Work does not call this.
 * The body names only the week. The server chooses the operator, store, and source.
 */
export async function requestFloorCommandObservation(
  week: string,
): Promise<{ outcome: string; reason?: string | null } | null> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) return null;
  let response: Response;
  try {
    response = await fetch(OBSERVATIONS_PATH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ week }),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body) || !body || typeof body !== "object" || Array.isArray(body)) return null;
  const outcome = (body as { outcome?: unknown }).outcome;
  if (typeof outcome !== "string") return null;
  const reason = (body as { reason?: unknown }).reason;
  return { outcome, reason: typeof reason === "string" || reason === null ? reason : null };
}

/**
 * Deliberate standing-opportunity inspection for Work detail.
 * Loads the operator's standing grants only when inspection is requested.
 * Does not claim, execute, or contact Floor Command.
 */
export async function inspectStandingOpportunityForWork(input: {
  operationalWeek: string;
  signal?: AbortSignal;
}): Promise<StandingOpportunityInspectClientResult> {
  const accessToken = await bearerAccessToken();
  if (!accessToken) return { kind: "unauthorized" };

  const policy = await loadSoleApprovedStandingPolicy(accessToken, input.signal);
  if (policy.kind !== "ok") return policy;

  const correlationId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(STANDING_INSPECT_PATH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "inspect_standing_opportunity",
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
        operationalWeek: input.operationalWeek,
        opportunityKind: STANDING_COORDINATION_KIND,
        correlationId,
      }),
      cache: "no-store",
      signal: input.signal,
    });
  } catch (error) {
    if (isAbortError(error)) return { kind: "failed" };
    return { kind: "failed" };
  }

  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body)) return { kind: "failed" };
  return parseInspectResponse(response.status, body);
}

async function loadSoleApprovedStandingPolicy(
  accessToken: string,
  signal?: AbortSignal,
): Promise<
  | { kind: "ok"; policyId: string; policyVersion: number }
  | { kind: "context_unavailable"; reason: string }
  | { kind: "unauthorized" }
  | { kind: "failed" }
> {
  let response: Response;
  try {
    response = await fetch(STANDING_POLICY_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) return { kind: "failed" };
    return { kind: "failed" };
  }
  if (response.status === 401) return { kind: "unauthorized" };
  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body) || !body || typeof body !== "object" || Array.isArray(body)) {
    return { kind: "failed" };
  }
  const record = body as { status?: unknown; policies?: unknown };
  if (record.status !== "inspected" || !Array.isArray(record.policies)) {
    return { kind: "failed" };
  }
  const approved: Array<{ policyId: string; policyVersion: number }> = [];
  for (const item of record.policies) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as { policyId?: unknown; policyVersion?: unknown; state?: unknown };
    if (row.state !== "approved") continue;
    if (typeof row.policyId !== "string" || typeof row.policyVersion !== "number") continue;
    approved.push({ policyId: row.policyId, policyVersion: row.policyVersion });
  }
  if (approved.length === 0) {
    return {
      kind: "context_unavailable",
      reason: "No approved standing grant is available to inspect.",
    };
  }
  if (approved.length > 1) {
    return {
      kind: "context_unavailable",
      reason:
        "Multiple approved standing grants exist. Work does not choose among them in this release.",
    };
  }
  return { kind: "ok", policyId: approved[0].policyId, policyVersion: approved[0].policyVersion };
}

function parseInspectResponse(
  httpStatus: number,
  body: unknown,
): StandingOpportunityInspectClientResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "failed" };
  const record = body as Record<string, unknown>;
  const status = record.status;
  if (typeof status !== "string") return { kind: "failed" };
  if (status === "unauthorized" || httpStatus === 401) return { kind: "unauthorized" };
  if (status === "invalid_intent") {
    return {
      kind: "invalid_intent",
      reason: typeof record.reason === "string" ? record.reason : "invalid_intent",
    };
  }
  if (status === "unconfigured") return { kind: "unconfigured" };
  if (status === "unavailable" || httpStatus >= 500) return { kind: "unavailable" };
  if (record.advisory !== true || record.consumesOpportunity !== false) return { kind: "failed" };
  if (typeof record.correlationId !== "string" || typeof record.disclaimer !== "string") {
    return { kind: "failed" };
  }
  return {
    kind: "advisory",
    status,
    advisory: true,
    consumesOpportunity: false,
    correlationId: record.correlationId,
    asOf: typeof record.asOf === "string" ? record.asOf : null,
    policyId: typeof record.policyId === "string" ? record.policyId : null,
    policyVersion: typeof record.policyVersion === "number" ? record.policyVersion : null,
    operationalWeek: typeof record.operationalWeek === "string" ? record.operationalWeek : null,
    opportunityKind: typeof record.opportunityKind === "string" ? record.opportunityKind : null,
    disclaimer: record.disclaimer,
  };
}

async function bearerAccessToken(): Promise<string | null> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) return null;
  return data.session.access_token;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function carriesCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|service_role|ciphertext/i.test(key)) return true;
    if (carriesCredentialKey(child)) return true;
  }
  return false;
}
