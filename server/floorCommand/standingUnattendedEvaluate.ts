/**
 * Unattended standing evaluation orchestrator (RELEASE-046 local).
 * Trusted wake → eligibility discovery → existing governed execution core.
 * Requires an injected StandingSourceAdapter; never defaults to network fetch.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  executeStandingFloorCommandObservationForOperator,
  type StandingExecutionResult,
} from "@/server/floorCommand/standingExecution";
import type { StandingSourceAdapter } from "@/server/floorCommand/standingSourceAdapter";
import { discoverStandingEligibility } from "@/server/floorCommand/standingUnattendedEligibility";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export type StandingUnattendedEvaluateResult =
  | { status: "unconfigured"; observed: false }
  | { status: "adapter_required"; observed: false }
  | { status: "gate_disabled"; observed: false }
  | { status: "no_approved_policy"; observed: false }
  | { status: "policy_conflict"; observed: false; approvedCount: number }
  | { status: "not_yet_eligible"; observed: false }
  | { status: "expired"; observed: false }
  | { status: "revoked"; observed: false }
  | { status: "already_claimed"; observed: false }
  | { status: "already_attempted"; observed: false; synonym?: "source_attempted" }
  | { status: "already_closed"; observed: false }
  | { status: "unavailable"; observed: false; reason: string }
  | {
      status: "observation_committed";
      observed: true;
      standingClaimId: string;
      observationRequestId: string;
      outcome: "accepted_new" | "unchanged" | "revised" | "failed" | "rejected";
      reason: string | null;
      correlationId: string;
      sourceDispatches: 1;
      linkStatus: string;
    }
  | {
      status: "source_failure";
      observed: false;
      standingClaimId: string;
      observationRequestId: string;
      outcome: "failed" | "rejected";
      reason: string | null;
      correlationId: string;
      sourceDispatches: 1;
      linkStatus: string;
    }
  | {
      status: "dispatch_ambiguous";
      observed: false;
      standingClaimId: string;
      observationRequestId?: string;
      correlationId: string;
      reason: string;
      sourceDispatches: 1;
    }
  | {
      status: "claim_rejected";
      observed: false;
      claimStatus: string;
      correlationId: string;
    }
  | {
      status: "revalidation_rejected";
      observed: false;
      revalidateStatus: string;
      standingClaimId: string;
      correlationId: string;
    }
  | {
      status: "attempt_rejected";
      observed: false;
      attemptStatus: string;
      standingClaimId: string;
      correlationId: string;
    }
  | {
      status: "governed_open_refused";
      observed: false;
      standingClaimId: string;
      openStatus: string;
      correlationId: string;
    };

/**
 * Evaluates and optionally executes one unattended standing opportunity.
 * @param asOf Test-clock seam for local window prefilter and claim/attempt RPCs.
 *   Production callers must omit it so inspect/claim/attempt use database now()
 *   (p_as_of null). Non-null values require DB test hooks and must not ship as a
 *   production bypass.
 */
export async function evaluateStandingOpportunityUnattended(deps: {
  sourceAdapter?: StandingSourceAdapter;
  admin?: SupabaseClient;
  asOf?: string | null;
  correlationId?: string;
  discover?: typeof discoverStandingEligibility;
  execute?: typeof executeStandingFloorCommandObservationForOperator;
}): Promise<StandingUnattendedEvaluateResult> {
  assertServerOnly("evaluateStandingOpportunityUnattended");

  if (!deps.sourceAdapter) return { status: "adapter_required", observed: false };

  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unconfigured", observed: false };

  // Local advisory clock for TypeScript window/policy prefilter only.
  const asOfIso = deps.asOf ?? new Date().toISOString();
  // Production-compatible RPC clock: null → database now(); never wall-clock ISO.
  const rpcAsOf = deps.asOf ?? null;
  const correlationId = deps.correlationId ?? randomUUID();

  const discovery = await (deps.discover ?? discoverStandingEligibility)({
    admin,
    asOfIso,
    inspectAsOf: rpcAsOf,
    correlationId,
  });

  switch (discovery.status) {
    case "gate_disabled":
      return { status: "gate_disabled", observed: false };
    case "no_approved_policy":
      return { status: "no_approved_policy", observed: false };
    case "policy_conflict":
      return {
        status: "policy_conflict",
        observed: false,
        approvedCount: discovery.approvedCount,
      };
    case "not_yet_eligible":
      return { status: "not_yet_eligible", observed: false };
    case "expired":
      return { status: "expired", observed: false };
    case "revoked":
      return { status: "revoked", observed: false };
    case "already_claimed":
      return { status: "already_claimed", observed: false };
    case "already_attempted":
      return { status: "already_attempted", observed: false, synonym: "source_attempted" };
    case "already_closed":
      return { status: "already_closed", observed: false };
    case "unavailable":
      return { status: "unavailable", observed: false, reason: discovery.reason };
    case "eligible":
      break;
    default: {
      const _exhaustive: never = discovery;
      return _exhaustive;
    }
  }

  const executed = await (deps.execute ?? executeStandingFloorCommandObservationForOperator)(
    admin,
    discovery.userId,
    discovery.target,
    deps.sourceAdapter,
    rpcAsOf,
  );

  return mapExecutionResult(executed);
}

export function mapExecutionResult(
  executed: StandingExecutionResult,
): StandingUnattendedEvaluateResult {
  switch (executed.status) {
    case "unauthorized":
    case "invalid_intent":
    case "adapter_required":
    case "unconfigured":
      return { status: "unconfigured", observed: false };
    case "claim_rejected":
      if (executed.claimStatus === "already_claimed") {
        return { status: "already_claimed", observed: false };
      }
      if (executed.claimStatus === "gate_disabled") {
        return { status: "gate_disabled", observed: false };
      }
      if (executed.claimStatus === "outside_window") {
        return { status: "not_yet_eligible", observed: false };
      }
      if (
        executed.claimStatus === "revoked" ||
        executed.claimStatus === "not_approved" ||
        executed.claimStatus === "authorization_revoked"
      ) {
        return { status: "revoked", observed: false };
      }
      if (executed.claimStatus === "expired") {
        return { status: "expired", observed: false };
      }
      return {
        status: "claim_rejected",
        observed: false,
        claimStatus: executed.claimStatus,
        correlationId: executed.correlationId,
      };
    case "revalidation_rejected":
      if (
        executed.revalidateStatus === "authorization_revoked" ||
        executed.revalidateStatus === "revoked"
      ) {
        return { status: "revoked", observed: false };
      }
      if (executed.revalidateStatus === "gate_disabled") {
        return { status: "gate_disabled", observed: false };
      }
      return {
        status: "revalidation_rejected",
        observed: false,
        revalidateStatus: executed.revalidateStatus,
        standingClaimId: executed.standingClaimId,
        correlationId: executed.correlationId,
      };
    case "attempt_rejected":
      if (executed.attemptStatus === "source_already_attempted") {
        return { status: "already_attempted", observed: false, synonym: "source_attempted" };
      }
      if (
        executed.attemptStatus === "authorization_revoked" ||
        executed.attemptStatus === "revoked" ||
        executed.attemptStatus === "gate_disabled"
      ) {
        return executed.attemptStatus === "gate_disabled"
          ? { status: "gate_disabled", observed: false }
          : { status: "revoked", observed: false };
      }
      return {
        status: "attempt_rejected",
        observed: false,
        attemptStatus: executed.attemptStatus,
        standingClaimId: executed.standingClaimId,
        correlationId: executed.correlationId,
      };
    case "governed_open_refused":
      return {
        status: "governed_open_refused",
        observed: false,
        standingClaimId: executed.standingClaimId,
        openStatus: executed.openStatus,
        correlationId: executed.correlationId,
      };
    case "classification_incomplete":
      return {
        status: "dispatch_ambiguous",
        observed: false,
        standingClaimId: executed.standingClaimId,
        observationRequestId: executed.observationRequestId,
        correlationId: executed.correlationId,
        reason: executed.reason,
        sourceDispatches: 1,
      };
    case "completed":
      if (executed.outcome === "failed" || executed.outcome === "rejected") {
        return {
          status: "source_failure",
          observed: false,
          standingClaimId: executed.standingClaimId,
          observationRequestId: executed.observationRequestId,
          outcome: executed.outcome,
          reason: executed.reason,
          correlationId: executed.correlationId,
          sourceDispatches: 1,
          linkStatus: executed.linkStatus,
        };
      }
      return {
        status: "observation_committed",
        observed: true,
        standingClaimId: executed.standingClaimId,
        observationRequestId: executed.observationRequestId,
        outcome: executed.outcome,
        reason: executed.reason,
        correlationId: executed.correlationId,
        sourceDispatches: 1,
        linkStatus: executed.linkStatus,
      };
    default: {
      const _exhaustive: never = executed;
      return _exhaustive;
    }
  }
}

function openAdmin(): SupabaseClient | null {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    return null;
  }
}
