/**
 * Standing Floor Command observation sequencer (RELEASE-033/037; unattended reuse in 046).
 *
 * Sequence: claim → revalidate → durable source-attempt mark (atomically
 * reauthorized) → governed open → injected source adapter → governed commit →
 * link observation evidence.
 *
 * Does not read the one-shot pull feature flag.
 * Does not default to network fetch. An injected StandingSourceAdapter is required.
 * Operator entry remains session + confirmation. Unattended entry supplies a
 * server-selected StandingObserveTarget after scheduler auth + eligibility.
 * Does not register an HTTP route.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { FLOOR_COMMAND_READ_PURPOSE, FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  parseStandingExecutionIntent,
  standingObserveTargetFromExecutionIntent,
  type StandingObserveTarget,
} from "@/server/floorCommand/standingExecutionIntent";
import type {
  StandingSourceAdapter,
  StandingSourceRead,
} from "@/server/floorCommand/standingSourceAdapter";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

const STORE = "2587" as const;

export type StandingExecutionResult =
  | { status: "unauthorized" }
  | { status: "invalid_intent"; reason: string }
  | { status: "adapter_required" }
  | { status: "unconfigured" }
  | {
      status: "claim_rejected";
      claimStatus: string;
      correlationId: string;
      detail?: Record<string, unknown>;
    }
  | {
      status: "revalidation_rejected";
      revalidateStatus: string;
      standingClaimId: string;
      correlationId: string;
      detail?: Record<string, unknown>;
    }
  | {
      status: "attempt_rejected";
      attemptStatus: string;
      standingClaimId: string;
      correlationId: string;
      detail?: Record<string, unknown>;
    }
  | {
      status: "governed_open_refused";
      standingClaimId: string;
      openStatus: string;
      correlationId: string;
      closureStatus?: string;
    }
  | {
      status: "completed";
      standingClaimId: string;
      observationRequestId: string;
      governedLeaseClaimId: string;
      outcome: "accepted_new" | "unchanged" | "revised" | "failed" | "rejected";
      reason: string | null;
      correlationId: string;
      sourceDispatches: 1;
      linkStatus: string;
    }
  | {
      status: "classification_incomplete";
      standingClaimId: string;
      observationRequestId: string;
      correlationId: string;
      reason: string;
      sourceDispatches: 1;
    };

type RpcMap = Record<string, unknown>;

/**
 * Executes one standing observation against an injected source adapter.
 * @param asOf Test clock only. Production callers must pass null; the claim RPC
 *   rejects non-null as_of unless orient.standing_claim_test_hooks=1.
 */
export async function executeStandingFloorCommandObservation(
  session: SupabaseClient,
  body: unknown,
  deps: {
    sourceAdapter?: StandingSourceAdapter;
    admin?: SupabaseClient;
    asOf?: string | null;
  },
): Promise<StandingExecutionResult> {
  assertServerOnly("executeStandingFloorCommandObservation");

  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };

  const parsed = parseStandingExecutionIntent(body);
  if (!parsed.ok) return { status: "invalid_intent", reason: parsed.reason };

  if (!deps.sourceAdapter) {
    return { status: "adapter_required" };
  }

  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unconfigured" };

  return executeStandingFloorCommandObservationForOperator(
    admin,
    userId,
    standingObserveTargetFromExecutionIntent(parsed.intent),
    deps.sourceAdapter,
    deps.asOf ?? null,
  );
}

/**
 * Runs the governed standing sequence for an already-authorized operator id.
 * Used by the operator confirmation path and by unattended evaluation after
 * scheduler auth + DB eligibility discovery. Does not authenticate a session.
 */
export async function executeStandingFloorCommandObservationForOperator(
  admin: SupabaseClient,
  userId: string,
  target: StandingObserveTarget,
  sourceAdapter: StandingSourceAdapter,
  asOf: string | null = null,
): Promise<StandingExecutionResult> {
  assertServerOnly("executeStandingFloorCommandObservationForOperator");
  return runStandingSequence(admin, userId, target, sourceAdapter, asOf);
}

async function runStandingSequence(
  admin: SupabaseClient,
  userId: string,
  target: StandingObserveTarget,
  sourceAdapter: StandingSourceAdapter,
  asOf: string | null,
): Promise<StandingExecutionResult> {
  const claimed = await rpcJson(admin, "claim_floor_command_standing_opportunity", {
    p_user_id: userId,
    p_policy_id: target.policyId,
    p_policy_version: target.policyVersion,
    p_operational_week: target.operationalWeek,
    p_opportunity_kind: target.opportunityKind,
    p_as_of: asOf,
  });
  const claimedRecord =
    claimed.claim && typeof claimed.claim === "object" && !Array.isArray(claimed.claim)
      ? (claimed.claim as Record<string, unknown>)
      : null;
  const standingClaimId =
    typeof claimedRecord?.claim_id === "string"
      ? claimedRecord.claim_id
      : typeof claimed.claim_id === "string"
        ? claimed.claim_id
        : null;
  if (claimed.status !== "claimed" || !standingClaimId) {
    return {
      status: "claim_rejected",
      claimStatus: String(claimed.status ?? "unavailable"),
      correlationId: target.correlationId,
      detail: claimed,
    };
  }

  const revalidated = await rpcJson(admin, "revalidate_floor_command_standing_opportunity_claim", {
    p_user_id: userId,
    p_claim_id: standingClaimId,
    p_as_of: asOf,
  });
  if (revalidated.status !== "still_authorized") {
    return {
      status: "revalidation_rejected",
      revalidateStatus: String(revalidated.status ?? "unavailable"),
      standingClaimId,
      correlationId: target.correlationId,
      detail: revalidated,
    };
  }

  // Durable dispatch authorization with RELEASE-037 atomic reauthorization.
  // No source call before this commit returns. DB txn is not held across HTTP.
  const attempted = await rpcJson(admin, "record_floor_command_standing_opportunity_source_attempt", {
    p_user_id: userId,
    p_claim_id: standingClaimId,
    p_as_of: asOf,
  });
  if (attempted.status !== "source_attempted") {
    return {
      status: "attempt_rejected",
      attemptStatus: String(attempted.status ?? "unavailable"),
      standingClaimId,
      correlationId: target.correlationId,
      detail: attempted,
    };
  }

  const opened = await rpcJson(admin, "open_floor_command_governed_observation", {
    p_user_id: userId,
    p_week: target.operationalWeek,
    p_store: STORE,
    p_source: FLOOR_COMMAND_SOURCE,
    p_purpose: FLOOR_COMMAND_READ_PURPOSE,
  });
  if (opened.status !== "opened" || typeof opened.request_id !== "string" || typeof opened.claim_id !== "string") {
    const closure = await rpcJson(admin, "close_floor_command_standing_opportunity_after_dispatch", {
      p_user_id: userId,
      p_claim_id: standingClaimId,
      p_closure_reason: `governed_open_${String(opened.status ?? "refused")}`.slice(0, 80),
    });
    return {
      status: "governed_open_refused",
      standingClaimId,
      openStatus: String(opened.status ?? "refused"),
      correlationId: target.correlationId,
      closureStatus: String(closure.status ?? "unavailable"),
    };
  }

  const observationRequestId = opened.request_id;
  const governedLeaseClaimId = opened.claim_id;

  let read: StandingSourceRead;
  try {
    read = await sourceAdapter({
      operationalWeek: target.operationalWeek,
      storeNumber: STORE,
      correlationId: target.correlationId,
      standingClaimId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "adapter_failed";
    await rpcJson(admin, "close_floor_command_standing_opportunity_after_dispatch", {
      p_user_id: userId,
      p_claim_id: standingClaimId,
      p_closure_reason: "adapter_threw".slice(0, 80),
    });
    return {
      status: "classification_incomplete",
      standingClaimId,
      observationRequestId,
      correlationId: target.correlationId,
      reason: message.slice(0, 120) || "adapter_threw",
      sourceDispatches: 1,
    };
  }

  let committed: { outcome: string; reason: string | null };
  try {
    committed = await commitGoverned(admin, userId, observationRequestId, governedLeaseClaimId, read);
  } catch (error) {
    const message = error instanceof Error ? error.message : "classification_failed";
    await rpcJson(admin, "close_floor_command_standing_opportunity_after_dispatch", {
      p_user_id: userId,
      p_claim_id: standingClaimId,
      p_closure_reason: "classification_incomplete".slice(0, 80),
    });
    return {
      status: "classification_incomplete",
      standingClaimId,
      observationRequestId,
      correlationId: target.correlationId,
      reason: message.includes("floor_command_governed_observation_claim_expired")
        ? "lease_expired"
        : "commit_failed",
      sourceDispatches: 1,
    };
  }

  if (
    committed.outcome !== "accepted_new" &&
    committed.outcome !== "unchanged" &&
    committed.outcome !== "revised" &&
    committed.outcome !== "failed" &&
    committed.outcome !== "rejected"
  ) {
    await rpcJson(admin, "close_floor_command_standing_opportunity_after_dispatch", {
      p_user_id: userId,
      p_claim_id: standingClaimId,
      p_closure_reason: "invalid_governed_outcome",
    });
    return {
      status: "classification_incomplete",
      standingClaimId,
      observationRequestId,
      correlationId: target.correlationId,
      reason: "invalid_governed_outcome",
      sourceDispatches: 1,
    };
  }

  const linked = await rpcJson(admin, "link_floor_command_standing_opportunity_observation", {
    p_user_id: userId,
    p_claim_id: standingClaimId,
    p_observation_request_id: observationRequestId,
    p_observation_outcome: committed.outcome,
  });

  return {
    status: "completed",
    standingClaimId,
    observationRequestId,
    governedLeaseClaimId,
    outcome: committed.outcome,
    reason: committed.reason,
    correlationId: target.correlationId,
    sourceDispatches: 1,
    linkStatus: String(linked.status ?? "unavailable"),
  };
}

async function commitGoverned(
  admin: SupabaseClient,
  userId: string,
  requestId: string,
  leaseClaimId: string,
  read: StandingSourceRead,
): Promise<{ outcome: string; reason: string | null }> {
  const { data, error } = await admin.rpc("commit_floor_command_governed_observation", {
    p_user_id: userId,
    p_request_id: requestId,
    p_claim_id: leaseClaimId,
    p_read_class: read.readClass,
    p_reason: read.reason,
    p_synchronization: read.synchronization,
    p_snapshot: read.snapshot,
  });
  if (error) throw new Error(error.message);
  const record = data as { outcome?: string; reason?: string | null } | null;
  return { outcome: String(record?.outcome ?? ""), reason: record?.reason ?? null };
}

async function rpcJson(
  admin: SupabaseClient,
  name: string,
  args: RpcMap,
): Promise<Record<string, unknown>> {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  return data as Record<string, unknown>;
}

async function signedInOperator(session: SupabaseClient): Promise<string | null> {
  const { data, error } = await session.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

function openAdmin(): SupabaseClient | null {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    return null;
  }
}
