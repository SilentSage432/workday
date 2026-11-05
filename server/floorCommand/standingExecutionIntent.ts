/**
 * Operator intent contracts for standing observation (RELEASE-032/033/037).
 * Does not create or approve grants. Does not accept scope-widening fields.
 *
 * Inspection and execution are distinct actions. Execution requires an explicit
 * confirmation echo because the same session can propose and approve a grant.
 */
const POLICY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEEK = /^\d{4}-W\d{2}$/;
const CORRELATION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STANDING_OBSERVE_ACTION = "observe_standing_opportunity" as const;
export const STANDING_INSPECT_ACTION = "inspect_standing_opportunity" as const;
export const STANDING_EXECUTE_CONFIRMATION = "execute_standing_opportunity" as const;

/** Server-fixed integration identity echoed by execution confirmation. */
export const STANDING_CONFIRM_STORE = "2587" as const;
export const STANDING_CONFIRM_SOURCE = "deptsync.floor-command.orient.v1" as const;
export const STANDING_CONFIRM_PURPOSE = "orient_published_week_read" as const;

export type StandingOpportunityKind = "publication_opportunity" | "reconciliation_opportunity";

export type StandingExecutionIntent = {
  action: typeof STANDING_OBSERVE_ACTION;
  policyId: string;
  policyVersion: number;
  operationalWeek: string;
  opportunityKind: StandingOpportunityKind;
  correlationId: string;
  confirmation: typeof STANDING_EXECUTE_CONFIRMATION;
  confirmPolicyId: string;
  confirmPolicyVersion: number;
  confirmOperationalWeek: string;
  confirmOpportunityKind: StandingOpportunityKind;
  confirmStoreNumber: typeof STANDING_CONFIRM_STORE;
  confirmSource: typeof STANDING_CONFIRM_SOURCE;
  confirmPurpose: typeof STANDING_CONFIRM_PURPOSE;
};

export type StandingInspectionIntent = {
  action: typeof STANDING_INSPECT_ACTION;
  policyId: string;
  policyVersion: number;
  operationalWeek: string;
  opportunityKind: StandingOpportunityKind;
  correlationId: string;
};

export type StandingExecutionIntentParse =
  | { ok: true; intent: StandingExecutionIntent }
  | { ok: false; reason: string };

export type StandingInspectionIntentParse =
  | { ok: true; intent: StandingInspectionIntent }
  | { ok: false; reason: string };

const FORBIDDEN_KEYS = new Set([
  "store",
  "storeNumber",
  "source",
  "purpose",
  "timeZone",
  "timezone",
  "baseUrl",
  "token",
  "credential",
  "readToken",
  "retry",
  "retryCount",
  "reconciliationAllowance",
  "maxPublicationWindows",
  "revision",
  "sequence",
  "weekSequence",
  "claimId",
  "requestId",
  "effectiveAt",
  "expiresAt",
  "asOf",
]);

const EXECUTION_ALLOWED = new Set([
  "action",
  "policyId",
  "policyVersion",
  "operationalWeek",
  "opportunityKind",
  "correlationId",
  "confirmation",
  "confirmPolicyId",
  "confirmPolicyVersion",
  "confirmOperationalWeek",
  "confirmOpportunityKind",
  "confirmStoreNumber",
  "confirmSource",
  "confirmPurpose",
]);

const INSPECTION_ALLOWED = new Set([
  "action",
  "policyId",
  "policyVersion",
  "operationalWeek",
  "opportunityKind",
  "correlationId",
]);

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function refuseForbiddenOrUnknown(
  record: Record<string, unknown>,
  allowed: Set<string>,
): string | null {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.has(key)) return "forbidden_field";
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return "unknown_field";
  }
  return null;
}

function parseSharedFields(
  record: Record<string, unknown>,
):
  | {
      ok: true;
      policyId: string;
      policyVersion: number;
      operationalWeek: string;
      opportunityKind: StandingOpportunityKind;
      correlationId: string;
    }
  | { ok: false; reason: string } {
  if (typeof record.policyId !== "string" || !POLICY_ID.test(record.policyId)) {
    return { ok: false, reason: "invalid_policy_id" };
  }
  if (
    typeof record.policyVersion !== "number" ||
    !Number.isInteger(record.policyVersion) ||
    record.policyVersion < 1
  ) {
    return { ok: false, reason: "invalid_policy_version" };
  }
  if (typeof record.operationalWeek !== "string" || !WEEK.test(record.operationalWeek)) {
    return { ok: false, reason: "invalid_week" };
  }
  if (
    record.opportunityKind !== "publication_opportunity" &&
    record.opportunityKind !== "reconciliation_opportunity"
  ) {
    return { ok: false, reason: "invalid_opportunity_kind" };
  }
  if (typeof record.correlationId !== "string" || !CORRELATION.test(record.correlationId)) {
    return { ok: false, reason: "invalid_correlation_id" };
  }
  return {
    ok: true,
    policyId: record.policyId,
    policyVersion: record.policyVersion,
    operationalWeek: record.operationalWeek,
    opportunityKind: record.opportunityKind,
    correlationId: record.correlationId,
  };
}

/**
 * Parses a future standing-observe body. Confirmation echo fields must match the
 * primary identity fields and the server-fixed store/source/purpose constants.
 * Correlation id is tracing only and is not treated as authority or a nonce ledger.
 */
export function parseStandingExecutionIntent(body: unknown): StandingExecutionIntentParse {
  const record = asRecord(body);
  if (!record) return { ok: false, reason: "invalid_body" };
  const shape = refuseForbiddenOrUnknown(record, EXECUTION_ALLOWED);
  if (shape) return { ok: false, reason: shape };
  if (record.action !== STANDING_OBSERVE_ACTION) {
    return { ok: false, reason: "invalid_action" };
  }
  const shared = parseSharedFields(record);
  if (!shared.ok) return shared;

  if (record.confirmation !== STANDING_EXECUTE_CONFIRMATION) {
    return { ok: false, reason: "confirmation_required" };
  }
  if (record.confirmPolicyId !== shared.policyId) {
    return { ok: false, reason: "confirmation_policy_mismatch" };
  }
  if (record.confirmPolicyVersion !== shared.policyVersion) {
    return { ok: false, reason: "confirmation_version_mismatch" };
  }
  if (record.confirmOperationalWeek !== shared.operationalWeek) {
    return { ok: false, reason: "confirmation_week_mismatch" };
  }
  if (record.confirmOpportunityKind !== shared.opportunityKind) {
    return { ok: false, reason: "confirmation_kind_mismatch" };
  }
  if (record.confirmStoreNumber !== STANDING_CONFIRM_STORE) {
    return { ok: false, reason: "confirmation_store_mismatch" };
  }
  if (record.confirmSource !== STANDING_CONFIRM_SOURCE) {
    return { ok: false, reason: "confirmation_source_mismatch" };
  }
  if (record.confirmPurpose !== STANDING_CONFIRM_PURPOSE) {
    return { ok: false, reason: "confirmation_purpose_mismatch" };
  }

  return {
    ok: true,
    intent: {
      action: STANDING_OBSERVE_ACTION,
      policyId: shared.policyId,
      policyVersion: shared.policyVersion,
      operationalWeek: shared.operationalWeek,
      opportunityKind: shared.opportunityKind,
      correlationId: shared.correlationId,
      confirmation: STANDING_EXECUTE_CONFIRMATION,
      confirmPolicyId: shared.policyId,
      confirmPolicyVersion: shared.policyVersion,
      confirmOperationalWeek: shared.operationalWeek,
      confirmOpportunityKind: shared.opportunityKind,
      confirmStoreNumber: STANDING_CONFIRM_STORE,
      confirmSource: STANDING_CONFIRM_SOURCE,
      confirmPurpose: STANDING_CONFIRM_PURPOSE,
    },
  };
}

/** Parses a local standing-opportunity inspection body. Not an execution confirmation. */
export function parseStandingInspectionIntent(body: unknown): StandingInspectionIntentParse {
  const record = asRecord(body);
  if (!record) return { ok: false, reason: "invalid_body" };
  const shape = refuseForbiddenOrUnknown(record, INSPECTION_ALLOWED);
  if (shape) return { ok: false, reason: shape };
  if (record.action !== STANDING_INSPECT_ACTION) {
    return { ok: false, reason: "invalid_action" };
  }
  const shared = parseSharedFields(record);
  if (!shared.ok) return shared;
  return {
    ok: true,
    intent: {
      action: STANDING_INSPECT_ACTION,
      policyId: shared.policyId,
      policyVersion: shared.policyVersion,
      operationalWeek: shared.operationalWeek,
      opportunityKind: shared.opportunityKind,
      correlationId: shared.correlationId,
    },
  };
}
