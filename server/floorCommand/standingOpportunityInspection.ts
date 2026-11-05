/**
 * Non-consuming standing opportunity inspection (RELEASE-037 module).
 * Advisory only. Does not claim, mark attempts, contact Floor Command, or open
 * governed observations. HTTP exposure is via the dedicated inspect route only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  parseStandingInspectionIntent,
  type StandingInspectionIntent,
} from "@/server/floorCommand/standingExecutionIntent";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export type StandingOpportunityInspectionResult =
  | { status: "unauthorized" }
  | { status: "invalid_intent"; reason: string }
  | { status: "unconfigured" }
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
      detail?: Record<string, unknown>;
    };

/**
 * Inspects whether a standing opportunity appears eligible now.
 * Eligibility is not a reservation and does not authorize execution.
 */
export async function inspectStandingFloorCommandOpportunity(
  session: SupabaseClient,
  body: unknown,
  deps: {
    admin?: SupabaseClient;
    asOf?: string | null;
  } = {},
): Promise<StandingOpportunityInspectionResult> {
  assertServerOnly("inspectStandingFloorCommandOpportunity");

  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };

  const parsed = parseStandingInspectionIntent(body);
  if (!parsed.ok) return { status: "invalid_intent", reason: parsed.reason };

  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unconfigured" };

  return readInspection(admin, userId, parsed.intent, deps.asOf ?? null);
}

async function readInspection(
  admin: SupabaseClient,
  userId: string,
  intent: StandingInspectionIntent,
  asOf: string | null,
): Promise<StandingOpportunityInspectionResult> {
  const { data, error } = await admin.rpc("inspect_floor_command_standing_opportunity", {
    p_user_id: userId,
    p_policy_id: intent.policyId,
    p_policy_version: intent.policyVersion,
    p_operational_week: intent.operationalWeek,
    p_opportunity_kind: intent.opportunityKind,
    p_as_of: asOf,
  });
  if (error) throw new Error(error.message);
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  return {
    status: String(record.status ?? "unknown"),
    advisory: true,
    consumesOpportunity: false,
    correlationId: intent.correlationId,
    asOf: typeof record.as_of === "string" ? record.as_of : null,
    policyId: typeof record.policy_id === "string" ? record.policy_id : null,
    policyVersion:
      typeof record.policy_version === "number" ? record.policy_version : null,
    operationalWeek:
      typeof record.operational_week === "string" ? record.operational_week : null,
    opportunityKind:
      typeof record.opportunity_kind === "string" ? record.opportunity_kind : null,
    disclaimer:
      typeof record.disclaimer === "string"
        ? record.disclaimer
        : "eligibility_is_not_a_reservation",
    detail: record,
  };
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
