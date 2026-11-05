import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import {
  STANDING_EXECUTE_CONFIRMATION,
  STANDING_INSPECT_ACTION,
  STANDING_OBSERVE_ACTION,
} from "@/server/floorCommand/standingExecutionIntent";
import type { StandingOpportunityInspectionResult } from "@/server/floorCommand/standingOpportunityInspection";
import {
  handleStandingOpportunityInspectPost,
  presentPublicStandingInspection,
} from "@/server/floorCommand/standingOpportunityInspectionRoute";

const USER = "11111111-1111-4111-8111-111111111111";
const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CORR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORIGIN = "http://localhost:3000";
const PATH = "/api/integrations/floor-command/standing-opportunity/inspect";

function inspectBody(overrides: Record<string, unknown> = {}) {
  return {
    action: STANDING_INSPECT_ACTION,
    policyId: POLICY,
    policyVersion: 1,
    operationalWeek: "2026-W45",
    opportunityKind: "publication_opportunity",
    correlationId: CORR,
    ...overrides,
  };
}

function request(
  init: {
    origin?: string | null;
    site?: string;
    body?: string;
    contentType?: string | null;
  } = {},
): Request {
  const headers = new Headers();
  if (init.contentType !== null) {
    headers.set("content-type", init.contentType ?? "application/json");
  }
  if (init.origin) headers.set("origin", init.origin);
  if (init.site) headers.set("sec-fetch-site", init.site);
  return new Request(`${ORIGIN}${PATH}`, {
    method: "POST",
    headers,
    body: init.body ?? JSON.stringify(inspectBody()),
  });
}

function eligibleResult(
  overrides: Partial<Extract<StandingOpportunityInspectionResult, { advisory: true }>> = {},
): StandingOpportunityInspectionResult {
  return {
    status: "eligible_now",
    advisory: true,
    consumesOpportunity: false,
    correlationId: CORR,
    asOf: "2026-11-02T18:00:00.000Z",
    policyId: POLICY,
    policyVersion: 1,
    operationalWeek: "2026-W45",
    opportunityKind: "publication_opportunity",
    disclaimer: "eligibility_is_not_a_reservation",
    detail: { secret_internal: true, status: "eligible_now" },
    ...overrides,
  };
}

describe("standing opportunity inspection route", () => {
  it("refuses missing session, cross-site posts, and never calls inspect", async () => {
    const calls: string[] = [];
    const inspect = async () => {
      calls.push("inspect");
      return eligibleResult();
    };

    const missing = await handleStandingOpportunityInspectPost(request(), {
      authenticate: async () => {
        throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
      },
      inspect,
    });
    expect(missing.status).toBe(401);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toEqual({ status: "unauthorized" });
    expect(calls).toEqual([]);

    const crossSite = await handleStandingOpportunityInspectPost(
      request({
        origin: "https://evil.example",
        site: "cross-site",
      }),
      {
        authenticate: async () => USER,
        inspect,
      },
    );
    expect(crossSite.status).toBe(403);
    expect(crossSite.headers.get("cache-control")).toBe("no-store");
    expect(await crossSite.json()).toEqual({ error: "Cross-site request refused." });
    expect(calls).toEqual([]);
  });

  it("rejects invalid content type, oversized payloads, and malformed JSON", async () => {
    const calls: string[] = [];
    const inspect = async () => {
      calls.push("inspect");
      return eligibleResult();
    };

    const wrongType = await handleStandingOpportunityInspectPost(
      request({ contentType: "text/plain", body: JSON.stringify(inspectBody()) }),
      { authenticate: async () => USER, inspect },
    );
    expect(wrongType.status).toBe(400);
    expect(await wrongType.json()).toEqual({
      status: "invalid_intent",
      reason: "invalid_content_type",
    });

    const oversized = await handleStandingOpportunityInspectPost(
      request({ body: JSON.stringify({ pad: "x".repeat(9000) }) }),
      { authenticate: async () => USER, inspect },
    );
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({
      status: "invalid_intent",
      reason: "payload_too_large",
    });

    const malformed = await handleStandingOpportunityInspectPost(
      request({ body: "{not-json" }),
      { authenticate: async () => USER, inspect },
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({
      status: "invalid_intent",
      reason: "invalid_body",
    });
    expect(calls).toEqual([]);
  });

  it("rejects missing identifiers, unknown fields, and execution-oriented payloads before inspect", async () => {
    const bodies = [
      { action: STANDING_INSPECT_ACTION, policyVersion: 1, operationalWeek: "2026-W45", opportunityKind: "publication_opportunity", correlationId: CORR },
      inspectBody({ policyId: "not-a-uuid" }),
      inspectBody({ operationalWeek: "2026W45" }),
      inspectBody({ opportunityKind: "other" }),
      inspectBody({ confirmation: STANDING_EXECUTE_CONFIRMATION }),
      inspectBody({ action: STANDING_OBSERVE_ACTION }),
      inspectBody({ storeNumber: "2587" }),
      inspectBody({ asOf: "2026-11-02T18:00:00.000Z" }),
      inspectBody({ extra: true }),
      { action: STANDING_INSPECT_ACTION },
    ];

    for (const body of bodies) {
      // Use the real module so parseStandingInspectionIntent rejects without RPC.
      const response = await handleStandingOpportunityInspectPost(
        request({ body: JSON.stringify(body) }),
        { authenticate: async () => USER },
      );
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.status).toBe("invalid_intent");
      expect(typeof json.reason).toBe("string");
      expect(json).not.toHaveProperty("detail");
    }
  });

  it("returns advisory eligible results without raw detail and without authorizing execution", async () => {
    let seenBody: unknown = null;
    const response = await handleStandingOpportunityInspectPost(request({ origin: ORIGIN }), {
      authenticate: async () => USER,
      inspect: async (_session, body) => {
        seenBody = body;
        return eligibleResult();
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const json = await response.json();
    expect(json).toEqual({
      status: "eligible_now",
      advisory: true,
      consumesOpportunity: false,
      correlationId: CORR,
      asOf: "2026-11-02T18:00:00.000Z",
      policyId: POLICY,
      policyVersion: 1,
      operationalWeek: "2026-W45",
      opportunityKind: "publication_opportunity",
      disclaimer: "eligibility_is_not_a_reservation",
    });
    expect(json).not.toHaveProperty("detail");
    expect(JSON.stringify(json)).not.toMatch(/secret_internal|service_role|token|bearer/i);
    expect(seenBody).toEqual(inspectBody());
  });

  it("maps supported advisory blocker statuses without inventing timestamps", async () => {
    const statuses = [
      "gate_disabled",
      "revoked",
      "expired",
      "outside_window",
      "already_claimed",
      "already_attempted",
      "already_closed",
      "not_approved",
      "unbound",
      "version_mismatch",
      "invalid_scope",
      "not_found",
    ] as const;

    for (const status of statuses) {
      const response = await handleStandingOpportunityInspectPost(request(), {
        authenticate: async () => USER,
        inspect: async () => eligibleResult({ status, asOf: null, policyId: null }),
      });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.status).toBe(status);
      expect(json.advisory).toBe(true);
      expect(json.consumesOpportunity).toBe(false);
      expect(json.disclaimer).toBe("eligibility_is_not_a_reservation");
      expect(json).not.toHaveProperty("opensAt");
      expect(json).not.toHaveProperty("closesAt");
      expect(json).not.toHaveProperty("expiresAt");
    }
  });

  it("treats repeated inspection as non-reserving and does not invoke claim or attempt helpers", async () => {
    const calls: string[] = [];
    const inspect = async (): Promise<StandingOpportunityInspectionResult> => {
      calls.push("inspect");
      return eligibleResult({ status: "gate_disabled" });
    };
    const first = await handleStandingOpportunityInspectPost(request(), {
      authenticate: async () => USER,
      inspect,
    });
    const second = await handleStandingOpportunityInspectPost(request(), {
      authenticate: async () => USER,
      inspect,
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toEqual(["inspect", "inspect"]);
    expect(await first.json()).toMatchObject({
      status: "gate_disabled",
      consumesOpportunity: false,
    });
    expect(await second.json()).toMatchObject({
      status: "gate_disabled",
      consumesOpportunity: false,
    });
  });

  it("returns unavailable when the inspection adapter throws", async () => {
    const response = await handleStandingOpportunityInspectPost(request(), {
      authenticate: async () => USER,
      inspect: async () => {
        throw new Error("rpc failed");
      },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("redacts detail even when presentPublicStandingInspection is used directly", () => {
    const publicResult = presentPublicStandingInspection(eligibleResult());
    expect(publicResult).not.toHaveProperty("detail");
    expect(publicResult).toMatchObject({
      status: "eligible_now",
      advisory: true,
      consumesOpportunity: false,
    });
  });
});

describe("standing opportunity inspection route isolation", () => {
  it("keeps execution unreachable from app routes while allowing only the inspect route module", () => {
    const root = join(process.cwd(), "app/api/integrations/floor-command");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts")) files.push(path);
      }
    };
    walk(root);

    const inspectRoute = join(root, "standing-opportunity/inspect/route.ts");
    expect(files).toContain(inspectRoute);

    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("executeStandingFloorCommandObservation");
      expect(source).not.toContain("createFakeStandingSource");
      expect(source).not.toContain("link_floor_command_standing_opportunity_observation");
      expect(source).not.toContain("record_floor_command_standing_opportunity_source_attempt");
      expect(source).not.toContain("claim_floor_command_standing_opportunity");
      if (path === inspectRoute) {
        expect(source).toContain("handleStandingOpportunityInspectPost");
        expect(source).not.toContain("inspect_floor_command_standing_opportunity");
      } else {
        expect(source).not.toContain("inspectStandingFloorCommandOpportunity");
        expect(source).not.toContain("handleStandingOpportunityInspectPost");
        expect(source).not.toContain("inspect_floor_command_standing_opportunity");
      }
    }
  });
});
