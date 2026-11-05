/**
 * Scheduler-safe standing eligibility discovery (RELEASE-046; H1 clock fix in 048).
 * Discovers at most one approved fixed-scope policy, selects an open frozen
 * window, then re-checks with inspect_floor_command_standing_opportunity.
 * Does not claim, attempt, or contact Floor Command.
 *
 * Production inspect invocations must pass p_as_of = null so the database clock
 * is authoritative. Non-null inspectAsOf is a test-hook seam only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_READ_PURPOSE,
  FLOOR_COMMAND_SOURCE,
} from "@/domain/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import type {
  StandingObserveTarget,
  StandingOpportunityKind,
} from "@/server/floorCommand/standingExecutionIntent";
import {
  classifyClosedStandingOpportunity,
  parseFrozenStandingWindows,
  selectOpenStandingWindows,
  type StandingFrozenWindow,
} from "@/server/floorCommand/standingUnattendedWindows";

export type StandingEligibilityDiscovery =
  | { status: "gate_disabled" }
  | { status: "no_approved_policy" }
  | { status: "policy_conflict"; approvedCount: number }
  | { status: "not_yet_eligible" }
  | { status: "expired" }
  | { status: "unavailable"; reason: string }
  | { status: "revoked" }
  | { status: "already_claimed" }
  | { status: "already_attempted" }
  | { status: "already_closed" }
  | {
      status: "eligible";
      userId: string;
      target: StandingObserveTarget;
      inspectStatus: string;
      window: StandingFrozenWindow;
    };

type ApprovedPolicyRow = {
  policy_id: string;
  policy_version: number;
  user_id: string;
  state: string;
  store_number: string;
  source: string;
  purpose: string;
  revoked_at: string | null;
  expired_at: string | null;
  effective_at: string;
  expires_at: string;
  time_zone: string;
};

/**
 * Discovers a single eligible standing opportunity for unattended evaluation.
 * Caller-supplied policy/week/source fields are never accepted.
 *
 * @param asOfIso Local advisory clock for TypeScript window/policy prefilter only.
 * @param inspectAsOf Value for inspect RPC `p_as_of`. Production must pass null.
 */
export async function discoverStandingEligibility(deps: {
  admin: SupabaseClient;
  asOfIso: string;
  inspectAsOf: string | null;
  correlationId: string;
}): Promise<StandingEligibilityDiscovery> {
  assertServerOnly("discoverStandingEligibility");

  const gateOpen = await readGateOpen(deps.admin);
  if (!gateOpen) return { status: "gate_disabled" };

  const policies = await listApprovedFixedScopePolicies(deps.admin, deps.asOfIso);
  if (policies.length === 0) return { status: "no_approved_policy" };
  if (policies.length > 1) {
    return { status: "policy_conflict", approvedCount: policies.length };
  }

  const policy = policies[0]!;
  const windows = await loadApprovedWindows(deps.admin, policy.policy_id);
  const open = selectOpenStandingWindows(windows, deps.asOfIso);
  if (open.length === 0) {
    const closed = classifyClosedStandingOpportunity(windows, deps.asOfIso);
    if (closed === "unavailable") {
      return { status: "unavailable", reason: "no_open_window" };
    }
    return { status: closed };
  }
  if (open.length > 1) {
    // Multiple publication windows open at once is a configuration conflict.
    const weeks = new Set(open.map((w) => w.operationalWeek));
    if (weeks.size > 1) {
      return { status: "unavailable", reason: "multiple_open_weeks" };
    }
  }

  const window = open[0]!;
  const inspect = await inspectOpportunity(deps.admin, {
    userId: policy.user_id,
    policyId: policy.policy_id,
    policyVersion: policy.policy_version,
    operationalWeek: window.operationalWeek,
    opportunityKind: window.kind,
    inspectAsOf: deps.inspectAsOf,
  });

  return mapInspectToDiscovery(inspect, policy, window, deps.correlationId);
}

function mapInspectToDiscovery(
  inspectStatus: string,
  policy: ApprovedPolicyRow,
  window: StandingFrozenWindow,
  correlationId: string,
): StandingEligibilityDiscovery {
  switch (inspectStatus) {
    case "eligible_now":
      return {
        status: "eligible",
        userId: policy.user_id,
        target: {
          policyId: policy.policy_id,
          policyVersion: policy.policy_version,
          operationalWeek: window.operationalWeek,
          opportunityKind: window.kind,
          correlationId,
        },
        inspectStatus,
        window,
      };
    case "gate_disabled":
      return { status: "gate_disabled" };
    case "revoked":
    case "not_approved":
      return { status: "revoked" };
    case "expired":
    case "not_effective":
      return { status: "expired" };
    case "outside_window":
      return { status: "not_yet_eligible" };
    case "already_claimed":
      return { status: "already_claimed" };
    case "already_attempted":
      return { status: "already_attempted" };
    case "already_closed":
      return { status: "already_closed" };
    case "as_of_forbidden":
      return { status: "unavailable", reason: "as_of_forbidden" };
    case "unbound":
    case "invalid_scope":
    case "version_mismatch":
    case "not_found":
      return { status: "unavailable", reason: inspectStatus };
    default:
      return { status: "unavailable", reason: inspectStatus || "unknown" };
  }
}

async function readGateOpen(admin: SupabaseClient): Promise<boolean> {
  const { data, error } = await admin.rpc("floor_command_standing_execution_gate_is_open");
  if (error) throw new Error(error.message);
  return data === true;
}

async function listApprovedFixedScopePolicies(
  admin: SupabaseClient,
  asOfIso: string,
): Promise<ApprovedPolicyRow[]> {
  const { data, error } = await admin
    .from("floor_command_standing_policies")
    .select(
      "policy_id, policy_version, user_id, state, store_number, source, purpose, revoked_at, expired_at, effective_at, expires_at, time_zone",
    )
    .eq("state", "approved")
    .eq("store_number", "2587")
    .eq("source", FLOOR_COMMAND_SOURCE)
    .eq("purpose", FLOOR_COMMAND_READ_PURPOSE)
    .is("revoked_at", null);

  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? (data as ApprovedPolicyRow[]) : [];
  const asOfMs = Date.parse(asOfIso);
  return rows.filter((row) => {
    if (row.expired_at) return false;
    if (!Number.isFinite(asOfMs)) return false;
    const effective = Date.parse(row.effective_at);
    const expires = Date.parse(row.expires_at);
    if (!Number.isFinite(effective) || !Number.isFinite(expires)) return false;
    return effective <= asOfMs && asOfMs < expires;
  });
}

async function loadApprovedWindows(
  admin: SupabaseClient,
  policyId: string,
): Promise<StandingFrozenWindow[]> {
  const { data, error } = await admin
    .from("floor_command_standing_policy_events")
    .select("scope")
    .eq("policy_id", policyId)
    .eq("event_type", "approved")
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) && data[0] && typeof data[0] === "object" ? data[0] : null;
  const scope =
    row && "scope" in row && row.scope && typeof row.scope === "object"
      ? (row.scope as Record<string, unknown>)
      : null;
  return parseFrozenStandingWindows(scope?.windows);
}

async function inspectOpportunity(
  admin: SupabaseClient,
  args: {
    userId: string;
    policyId: string;
    policyVersion: number;
    operationalWeek: string;
    opportunityKind: StandingOpportunityKind;
    inspectAsOf: string | null;
  },
): Promise<string> {
  // Production-compatible shape: p_as_of is null so floor_command_standing_claim_clock
  // uses database now(). Non-null values require orient.standing_claim_test_hooks=1.
  const { data, error } = await admin.rpc("inspect_floor_command_standing_opportunity", {
    p_user_id: args.userId,
    p_policy_id: args.policyId,
    p_policy_version: args.policyVersion,
    p_operational_week: args.operationalWeek,
    p_opportunity_kind: args.opportunityKind,
    p_as_of: args.inspectAsOf,
  });
  if (error) throw new Error(error.message);
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return String(record.status ?? "unknown");
}
