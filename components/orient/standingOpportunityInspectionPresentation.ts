/**
 * Pure presentation helpers for Work-detail standing inspection (RELEASE-042).
 * Does not call APIs, claim, execute, or contact Floor Command.
 */
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

export const STANDING_COORDINATION_KIND = "publication_opportunity" as const;

export type StandingInspectionContext =
  | {
      status: "ready";
      operationalWeek: string;
      opportunityKind: typeof STANDING_COORDINATION_KIND;
      storeNumber: string;
    }
  | { status: "missing_week"; storeNumber: string | null }
  | { status: "unavailable_posture" };

export type StandingInspectionPresentation = {
  category:
    | "eligible"
    | "ineligible"
    | "consumed"
    | "outside_window"
    | "authorization_unavailable"
    | "not_found"
    | "request_failed"
    | "not_requested"
    | "context_unavailable"
    | "loading";
  headline: string;
  detail: string;
};

/** Binds Work retained evidence to the inspect identifiers. Does not invent a policy id. */
export function standingInspectionContextFromReading(
  reading: FloorCommandWorkReading,
): StandingInspectionContext {
  if (reading.posture !== "unconfigured" && reading.posture !== "retained") {
    return { status: "unavailable_posture" };
  }
  const week = retainedOperationalWeek(reading);
  if (!week) {
    return { status: "missing_week", storeNumber: reading.storeNumber };
  }
  return {
    status: "ready",
    operationalWeek: week,
    opportunityKind: STANDING_COORDINATION_KIND,
    storeNumber: reading.storeNumber,
  };
}

export function presentStandingInspectionStatus(
  status: string | null,
  opts: { requestFailed?: boolean; notRequested?: boolean; contextUnavailable?: string } = {},
): StandingInspectionPresentation {
  if (opts.notRequested) {
    return {
      category: "not_requested",
      headline: "Inspection not yet requested",
      detail: "Checking standing coordination is optional and does not start an observation.",
    };
  }
  if (opts.contextUnavailable) {
    return {
      category: "context_unavailable",
      headline: "Standing inspection unavailable",
      detail: opts.contextUnavailable,
    };
  }
  if (opts.requestFailed || status === "unavailable" || status === "unconfigured") {
    return {
      category: "request_failed",
      headline: "Inspection could not be completed",
      detail: "This is a request failure, not a verified policy denial.",
    };
  }
  if (status === "unauthorized" || status === "invalid_intent") {
    return {
      category: "request_failed",
      headline: "Inspection could not be completed",
      detail: "Orient could not authorize this inspection request.",
    };
  }
  if (!status) {
    return {
      category: "not_requested",
      headline: "Inspection not yet requested",
      detail: "Checking standing coordination is optional and does not start an observation.",
    };
  }
  if (status === "eligible_now") {
    return {
      category: "eligible",
      headline: "Eligible when checked",
      detail:
        "Eligible when checked. This does not reserve the opportunity or initiate execution.",
    };
  }
  if (status === "already_claimed" || status === "already_attempted" || status === "already_closed") {
    return {
      category: "consumed",
      headline: "Opportunity already consumed",
      detail: consumedDetail(status),
    };
  }
  if (status === "outside_window") {
    return {
      category: "outside_window",
      headline: "Outside the authorized window",
      detail: "The opportunity window was not open at inspection time.",
    };
  }
  if (
    status === "gate_disabled" ||
    status === "revoked" ||
    status === "expired" ||
    status === "not_approved" ||
    status === "not_effective" ||
    status === "unbound" ||
    status === "version_mismatch" ||
    status === "invalid_scope"
  ) {
    return {
      category: "authorization_unavailable",
      headline: "Standing authorization unavailable",
      detail: authorizationDetail(status),
    };
  }
  if (status === "not_found") {
    return {
      category: "not_found",
      headline: "Standing grant not found",
      detail: "No matching standing grant was available for this operator.",
    };
  }
  return {
    category: "ineligible",
    headline: "Not currently eligible",
    detail: `Inspection returned “${status}”. Eligibility is advisory and was not reserved.`,
  };
}

function retainedOperationalWeek(reading: Extract<FloorCommandWorkReading, { storeNumber: string }>): string | null {
  const observation = reading.observation;
  if (observation.status === "retained" || observation.status === "stale") {
    const week = observation.handoffs[0]?.operationalWeek;
    if (typeof week === "string" && /^\d{4}-W\d{2}$/.test(week)) return week;
  }
  return null;
}

function consumedDetail(status: string): string {
  if (status === "already_attempted") {
    return "A source attempt was already recorded for this opportunity. Inspection does not create another.";
  }
  if (status === "already_closed") {
    return "This opportunity claim is already closed.";
  }
  return "An opportunity claim already exists for this week and kind.";
}

function authorizationDetail(status: string): string {
  if (status === "gate_disabled") {
    return "The standing-execution gate is disabled. Inspection does not enable it.";
  }
  if (status === "revoked") return "The standing grant is revoked.";
  if (status === "expired") return "The standing grant is expired.";
  if (status === "not_approved") return "The standing grant is not approved.";
  if (status === "unbound") return "The operator binding does not match the fixed Floor Command scope.";
  if (status === "version_mismatch") return "The policy version no longer matches.";
  return "Standing authorization was not available at inspection time.";
}
