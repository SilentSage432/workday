import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_READ_PURPOSE,
  FLOOR_COMMAND_SOURCE,
} from "@/domain/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

const WEEK = /^\d{4}-W\d{2}$/;
const ZONE = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const POLICY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StandingPolicyProposal = {
  effectiveAt: string;
  expiresAt: string;
  maxPublicationWindows: number;
  reconciliationAllowance: 0 | 1;
};

export type StandingPolicyWindow = {
  kind: "publication_opportunity" | "reconciliation_opportunity";
  operationalWeek: string;
  opensAt: string;
  closesAt: string;
  timeZone: string;
  executable: false;
  sourcePublicationAssumed: false;
  followsSundayPublicationSlot: true | null;
  requiresOutstandingZebraEntryConfirmation: true | null;
  outstandingZebraEntryKnown: false | null;
};

export type StandingPolicyRecord = {
  policyId: string;
  policyVersion: number;
  state: "proposed" | "approved" | "expired" | "revoked";
  authority: "none" | "pending" | "effective";
  operatorId: string;
  source: typeof FLOOR_COMMAND_SOURCE;
  storeNumber: "2587";
  purpose: typeof FLOOR_COMMAND_READ_PURPOSE;
  timeZone: string;
  createdAt: string;
  effectiveAt: string;
  expiresAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  expiredAt: string | null;
  maxPublicationWindows: number;
  maxPublicationPerWindow: 1;
  maxReconciliationPerWindow: 0 | 1;
  automaticRetryLimit: 0;
  sourcePublicationAssumed: false;
  writesFloorCommand: false;
  createsOrientTemporalRecords: false;
  observesArbitraryWeeks: false;
  windows: StandingPolicyWindow[];
};

export type StandingPolicyStatus =
  | "proposed"
  | "approved"
  | "expired"
  | "revoked"
  | "inspected"
  | "unauthorized"
  | "unbound"
  | "timezone_unconfirmed"
  | "timezone_invalid"
  | "timezone_shifts_sunday"
  | "invalid_window"
  | "invalid_reason"
  | "policy_open"
  | "not_found"
  | "not_proposed"
  | "not_revocable"
  | "not_expirable"
  | "still_effective"
  | "elapsed"
  | "scope_changed"
  | "unavailable";

export type StandingPolicyResult = {
  status: StandingPolicyStatus;
  policy?: StandingPolicyRecord;
  policies?: StandingPolicyRecord[];
};

type PolicyDeps = {
  admin?: SupabaseClient;
};

/**
 * Creates a proposed standing grant for the signed-in operator.
 * The client cannot choose the store, the source, or the purpose.
 * This does not read Floor Command.
 */
export async function proposeFloorCommandStandingPolicy(
  session: SupabaseClient,
  input: StandingPolicyProposal,
  deps: PolicyDeps = {},
): Promise<StandingPolicyResult> {
  assertServerOnly("proposeFloorCommandStandingPolicy");
  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };
  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };
  const timeZone = await confirmedTimeZone(admin, userId);
  if (!timeZone) return { status: "timezone_unconfirmed" };
  const { data, error } = await admin.rpc("propose_floor_command_standing_policy", {
    p_user_id: userId,
    p_effective_at: input.effectiveAt,
    p_expires_at: input.expiresAt,
    p_max_publication_windows: input.maxPublicationWindows,
    p_reconciliation_allowance: input.reconciliationAllowance,
    p_time_zone: timeZone,
  });
  if (error) return { status: "unavailable" };
  return policyResult(data);
}

/** Approves one proposed grant. Authority status changes. No source read starts. */
export async function approveFloorCommandStandingPolicy(
  session: SupabaseClient,
  policyId: string,
  deps: PolicyDeps = {},
): Promise<StandingPolicyResult> {
  assertServerOnly("approveFloorCommandStandingPolicy");
  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };
  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };
  const { data, error } = await admin.rpc("approve_floor_command_standing_policy", {
    p_user_id: userId,
    p_policy_id: policyId,
  });
  if (error) return { status: "unavailable" };
  return policyResult(data);
}

/** Revokes a proposed or approved grant and keeps the historical row. */
export async function revokeFloorCommandStandingPolicy(
  session: SupabaseClient,
  policyId: string,
  reason: string,
  deps: PolicyDeps = {},
): Promise<StandingPolicyResult> {
  assertServerOnly("revokeFloorCommandStandingPolicy");
  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };
  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };
  const { data, error } = await admin.rpc("revoke_floor_command_standing_policy", {
    p_user_id: userId,
    p_policy_id: policyId,
    p_reason: reason,
  });
  if (error) return { status: "unavailable" };
  return policyResult(data);
}

/** Expires an approved grant only after its expiration instant. */
export async function expireFloorCommandStandingPolicy(
  session: SupabaseClient,
  policyId: string,
  deps: PolicyDeps = {},
): Promise<StandingPolicyResult> {
  assertServerOnly("expireFloorCommandStandingPolicy");
  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };
  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };
  const { data, error } = await admin.rpc("expire_floor_command_standing_policy", {
    p_user_id: userId,
    p_policy_id: policyId,
  });
  if (error) return { status: "unavailable" };
  return policyResult(data);
}

/** Lists the operator's policies, including expired and revoked history. */
export async function inspectFloorCommandStandingPolicies(
  session: SupabaseClient,
  deps: PolicyDeps = {},
): Promise<StandingPolicyResult> {
  assertServerOnly("inspectFloorCommandStandingPolicies");
  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };
  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };
  const { data, error } = await admin.rpc("inspect_floor_command_standing_policies", {
    p_user_id: userId,
  });
  if (error) return { status: "unavailable" };
  return policyResult(data);
}

export function readStandingPolicyProposal(value: unknown): StandingPolicyProposal | null {
  if (!isRecord(value)) return null;
  if (!sameKeys(value, ["effectiveAt", "expiresAt", "maxPublicationWindows", "reconciliationAllowance"])) {
    return null;
  }
  if (typeof value.effectiveAt !== "string" || !INSTANT.test(value.effectiveAt)) return null;
  if (typeof value.expiresAt !== "string" || !INSTANT.test(value.expiresAt)) return null;
  if (!Number.isInteger(value.maxPublicationWindows)) return null;
  const windows = value.maxPublicationWindows as number;
  if (windows < 1 || windows > 8) return null;
  if (value.reconciliationAllowance !== 0 && value.reconciliationAllowance !== 1) return null;
  return {
    effectiveAt: value.effectiveAt,
    expiresAt: value.expiresAt,
    maxPublicationWindows: windows,
    reconciliationAllowance: value.reconciliationAllowance,
  };
}

export function readStandingPolicyIdBody(value: unknown): string | null {
  if (!isRecord(value) || !sameKeys(value, ["policyId"])) return null;
  return readPolicyId(value.policyId);
}

export function readStandingPolicyRevocation(value: unknown): { policyId: string; reason: string } | null {
  if (!isRecord(value) || !sameKeys(value, ["policyId", "reason"])) return null;
  const policyId = readPolicyId(value.policyId);
  if (!policyId || typeof value.reason !== "string") return null;
  const reason = value.reason.trim();
  if (reason.length < 1 || reason.length > 200 || /[\u0000-\u001f]/.test(reason)) return null;
  return { policyId, reason };
}

export function standingPolicyHttpStatus(status: StandingPolicyStatus): number {
  switch (status) {
    case "proposed":
    case "approved":
    case "expired":
    case "revoked":
    case "inspected":
    case "still_effective":
      return 200;
    case "unauthorized":
      return 401;
    case "unbound":
      return 403;
    case "invalid_window":
    case "invalid_reason":
    case "timezone_invalid":
    case "timezone_shifts_sunday":
      return 400;
    case "timezone_unconfirmed":
    case "policy_open":
    case "not_proposed":
    case "not_revocable":
    case "not_expirable":
    case "elapsed":
    case "scope_changed":
    case "not_found":
      return 409;
    default:
      return 503;
  }
}

function policyResult(data: unknown): StandingPolicyResult {
  if (!isRecord(data) || typeof data.status !== "string") return { status: "unavailable" };
  const status = data.status as StandingPolicyStatus;
  if (status === "inspected") {
    if (!Array.isArray(data.policies)) return { status: "unavailable" };
    const policies: StandingPolicyRecord[] = [];
    for (const item of data.policies) {
      const policy = standingPolicyRecord(item);
      if (!policy) return { status: "unavailable" };
      policies.push(policy);
    }
    return { status, policies };
  }
  const policy = data.policy === undefined ? undefined : standingPolicyRecord(data.policy);
  if (data.policy !== undefined && !policy) return { status: "unavailable" };
  return policy ? { status, policy } : { status };
}

function standingPolicyRecord(value: unknown): StandingPolicyRecord | null {
  if (!isRecord(value)) return null;
  const state = value.state;
  const authority = value.authority;
  if (state !== "proposed" && state !== "approved" && state !== "expired" && state !== "revoked") return null;
  if (authority !== "none" && authority !== "pending" && authority !== "effective") return null;
  if (value.source !== FLOOR_COMMAND_SOURCE || value.store_number !== "2587") return null;
  if (value.purpose !== FLOOR_COMMAND_READ_PURPOSE) return null;
  if (typeof value.policy_id !== "string" || !POLICY_ID.test(value.policy_id)) return null;
  if (typeof value.user_id !== "string" || typeof value.time_zone !== "string" || !ZONE.test(value.time_zone)) return null;
  if (!Number.isInteger(value.policy_version) || (value.policy_version as number) < 1) return null;
  if (value.max_publication_per_window !== 1 || value.automatic_retry_limit !== 0) return null;
  if (value.max_reconciliation_per_window !== 0 && value.max_reconciliation_per_window !== 1) return null;
  if (!Number.isInteger(value.max_publication_windows)) return null;
  const maxPublicationWindows = value.max_publication_windows as number;
  if (maxPublicationWindows < 1 || maxPublicationWindows > 8) return null;
  if (
    value.source_publication_assumed !== false
    || value.writes_floor_command !== false
    || value.creates_orient_temporal_records !== false
    || value.observes_arbitrary_weeks !== false
  ) {
    return null;
  }
  const windows = standingWindows(value.windows);
  if (!windows) return null;
  const createdAt = instantText(value.created_at);
  const effectiveAt = instantText(value.effective_at);
  const expiresAt = instantText(value.expires_at);
  if (!createdAt || !effectiveAt || !expiresAt) return null;
  const approvedAt = optionalInstant(value.approved_at);
  const approvedBy = optionalUuid(value.approved_by);
  const revokedAt = optionalInstant(value.revoked_at);
  const expiredAt = optionalInstant(value.expired_at);
  const revocationReason = value.revocation_reason === null
    ? null
    : typeof value.revocation_reason === "string"
      ? value.revocation_reason
      : undefined;
  if (revocationReason === undefined) return null;
  if (state === "proposed" && (approvedAt || approvedBy || revokedAt || revocationReason || expiredAt)) return null;
  if (state === "approved" && (!approvedAt || !approvedBy || revokedAt || revocationReason || expiredAt)) return null;
  if (state === "expired" && (!approvedAt || !approvedBy || !expiredAt || revokedAt || revocationReason)) return null;
  if (state === "revoked" && (!revokedAt || !revocationReason || expiredAt)) return null;
  return {
    policyId: value.policy_id,
    policyVersion: value.policy_version as number,
    state,
    authority,
    operatorId: value.user_id,
    source: FLOOR_COMMAND_SOURCE,
    storeNumber: "2587",
    purpose: FLOOR_COMMAND_READ_PURPOSE,
    timeZone: value.time_zone,
    createdAt,
    effectiveAt,
    expiresAt,
    approvedAt,
    approvedBy,
    revokedAt,
    revocationReason,
    expiredAt,
    maxPublicationWindows,
    maxPublicationPerWindow: 1,
    maxReconciliationPerWindow: value.max_reconciliation_per_window,
    automaticRetryLimit: 0,
    sourcePublicationAssumed: false,
    writesFloorCommand: false,
    createsOrientTemporalRecords: false,
    observesArbitraryWeeks: false,
    windows,
  };
}

function standingWindows(value: unknown): StandingPolicyWindow[] | null {
  if (!Array.isArray(value)) return null;
  const windows: StandingPolicyWindow[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    if (item.executable !== false || item.source_publication_assumed !== false) return null;
    if (item.kind !== "publication_opportunity" && item.kind !== "reconciliation_opportunity") return null;
    if (typeof item.operational_week !== "string" || !WEEK.test(item.operational_week)) return null;
    if (typeof item.time_zone !== "string" || !ZONE.test(item.time_zone)) return null;
    const opensAt = instantText(item.opens_at);
    const closesAt = instantText(item.closes_at);
    if (!opensAt || !closesAt) return null;
    if (item.kind === "publication_opportunity" && item.follows_sunday_publication_slot !== true) return null;
    if (item.kind === "reconciliation_opportunity") {
      if (item.requires_outstanding_zebra_entry_confirmation !== true) return null;
      if (item.outstanding_zebra_entry_known !== false) return null;
    }
    windows.push({
      kind: item.kind,
      operationalWeek: item.operational_week,
      opensAt,
      closesAt,
      timeZone: item.time_zone,
      executable: false,
      sourcePublicationAssumed: false,
      followsSundayPublicationSlot: item.kind === "publication_opportunity" ? true : null,
      requiresOutstandingZebraEntryConfirmation: item.kind === "reconciliation_opportunity" ? true : null,
      outstandingZebraEntryKnown: item.kind === "reconciliation_opportunity" ? false : null,
    });
  }
  return windows;
}

function instantText(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return value;
}

function optionalInstant(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return instantText(value);
}

function optionalUuid(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" && POLICY_ID.test(value) ? value : null;
}

function readPolicyId(value: unknown): string | null {
  return typeof value === "string" && POLICY_ID.test(value) ? value : null;
}

function sameKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const present = Object.keys(value);
  return present.length === keys.length && keys.every((key) => present.includes(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function confirmedTimeZone(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("temporal_settings")
    .select("time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const zone = typeof data?.time_zone === "string" ? data.time_zone.trim() : "";
  return ZONE.test(zone) ? zone : null;
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
