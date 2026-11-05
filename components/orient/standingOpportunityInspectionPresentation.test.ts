import { describe, expect, it } from "vitest";
import {
  presentStandingInspectionStatus,
  standingInspectionContextFromReading,
} from "@/components/orient/standingOpportunityInspectionPresentation";
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

function retainedWithWeek(week: string | null): FloorCommandWorkReading {
  if (!week) {
    return {
      posture: "retained",
      storeNumber: "2587",
      pullEnabled: false,
      timeZone: "America/Boise",
      governedRequests: [],
      observation: { status: "unobserved", handoffs: [] },
    };
  }
  return {
    posture: "retained",
    storeNumber: "2587",
    pullEnabled: false,
    timeZone: "America/Boise",
    governedRequests: [],
    observation: {
      status: "retained",
      readAt: "2026-10-29T00:40:17.666Z",
      handoffs: [{ operationalWeek: week } as FloorCommandWorkReading extends {
        observation: { handoffs: readonly (infer H)[] };
      }
        ? H
        : never],
    },
  };
}

describe("standing inspection presentation", () => {
  it("binds retained operational week and does not invent a policy id", () => {
    expect(standingInspectionContextFromReading(retainedWithWeek("2026-W44"))).toEqual({
      status: "ready",
      operationalWeek: "2026-W44",
      opportunityKind: "publication_opportunity",
      storeNumber: "2587",
    });
    expect(standingInspectionContextFromReading(retainedWithWeek(null))).toEqual({
      status: "missing_week",
      storeNumber: "2587",
    });
    expect(standingInspectionContextFromReading({ posture: "unread" })).toEqual({
      status: "unavailable_posture",
    });
  });

  it("keeps eligibility language advisory and separates failures from denials", () => {
    expect(presentStandingInspectionStatus("eligible_now").detail).toContain(
      "does not reserve the opportunity or initiate execution",
    );
    expect(presentStandingInspectionStatus("already_attempted").category).toBe("consumed");
    expect(presentStandingInspectionStatus("outside_window").category).toBe("outside_window");
    expect(presentStandingInspectionStatus("gate_disabled").category).toBe(
      "authorization_unavailable",
    );
    expect(presentStandingInspectionStatus(null, { requestFailed: true }).category).toBe(
      "request_failed",
    );
    expect(
      presentStandingInspectionStatus(null, {
        contextUnavailable: "No approved standing grant is available to inspect.",
      }).detail,
    ).toContain("No approved standing grant");
  });
});
