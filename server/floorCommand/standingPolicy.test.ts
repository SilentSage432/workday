import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import { FLOOR_COMMAND_READ_PURPOSE, FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import {
  handleStandingPolicyApprove,
  handleStandingPolicyCreate,
  handleStandingPolicyExpire,
  handleStandingPolicyRevoke,
} from "@/server/floorCommand/standingPolicyRoute";
import {
  proposeFloorCommandStandingPolicy,
  type StandingPolicyRecord,
} from "@/server/floorCommand/standingPolicy";
import { sessionForVerifiedOperator } from "@/server/floorCommand/verifiedSession";
import type { SupabaseClient } from "@supabase/supabase-js";

const USER = "11111111-1111-4111-8111-111111111111";
const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGIN = "http://localhost:3000";

function request(path: string, body: unknown, init: { origin?: string; site?: string } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.origin) headers.set("origin", init.origin);
  if (init.site) headers.set("sec-fetch-site", init.site);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function storedPolicy(state: StandingPolicyRecord["state"] = "proposed") {
  return {
    policy_id: POLICY,
    policy_version: 1,
    state,
    authority: state === "approved" ? "effective" : "none",
    user_id: USER,
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    purpose: FLOOR_COMMAND_READ_PURPOSE,
    time_zone: "America/Denver",
    created_at: "2026-11-01T15:00:00+00:00",
    effective_at: "2026-11-01T15:00:00+00:00",
    expires_at: "2026-12-01T15:00:00+00:00",
    approved_at: state === "proposed" ? null : "2026-11-01T15:01:00+00:00",
    approved_by: state === "proposed" ? null : USER,
    revoked_at: null,
    revocation_reason: null,
    expired_at: null,
    max_publication_windows: 1,
    max_publication_per_window: 1,
    max_reconciliation_per_window: 1,
    automatic_retry_limit: 0,
    source_publication_assumed: false,
    writes_floor_command: false,
    creates_orient_temporal_records: false,
    observes_arbitrary_weeks: false,
    windows: [
      {
        kind: "publication_opportunity",
        operational_week: "2026-W45",
        opens_at: "2026-11-08T12:00:00+00:00",
        closes_at: "2026-11-09T07:00:00+00:00",
        time_zone: "America/Denver",
        executable: false,
        source_publication_assumed: false,
        follows_sunday_publication_slot: true,
      },
    ],
  };
}

describe("standing policy routes", () => {
  it("refuses an unauthenticated create and a body that chooses the store", async () => {
    const calls: string[] = [];
    const missing = await handleStandingPolicyCreate(
      request("/api/integrations/floor-command/standing-policy", {
        effectiveAt: "2026-11-08T15:00:00Z",
        expiresAt: "2026-12-01T15:00:00Z",
        maxPublicationWindows: 1,
        reconciliationAllowance: 1,
      }),
      {
        authenticate: async () => {
          throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
        },
        propose: async () => {
          calls.push("propose");
          return { status: "proposed" };
        },
      },
    );
    expect(missing.status).toBe(401);
    expect(calls).toEqual([]);

    const override = await handleStandingPolicyCreate(
      request("/api/integrations/floor-command/standing-policy", {
        effectiveAt: "2026-11-08T15:00:00Z",
        expiresAt: "2026-12-01T15:00:00Z",
        maxPublicationWindows: 1,
        reconciliationAllowance: 1,
        storeNumber: "1999",
      }),
      {
        authenticate: async () => USER,
        propose: async () => {
          calls.push("propose");
          return { status: "proposed" };
        },
      },
    );
    expect(override.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("refuses approval without an explicit policy id and does not observe", async () => {
    const calls: string[] = [];
    const refused = await handleStandingPolicyApprove(
      request("/api/integrations/floor-command/standing-policy/approve", {}),
      {
        authenticate: async () => USER,
        approve: async () => {
          calls.push("approve");
          return { status: "approved" };
        },
      },
    );
    expect(refused.status).toBe(400);
    expect(calls).toEqual([]);

    const approved = await handleStandingPolicyApprove(
      request("/api/integrations/floor-command/standing-policy/approve", { policyId: POLICY }),
      {
        authenticate: async () => USER,
        approve: async () => {
          calls.push("approve");
          return { status: "approved", policy: mapFixture("approved") };
        },
      },
    );
    expect(approved.status).toBe(200);
    expect(calls).toEqual(["approve"]);
    const body = await approved.json();
    expect(body.policy.authority).toBe("effective");
    expect(body.policy.windows[0].executable).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/token|bearer|secret/i);
  });

  it("keeps revocation and expiry on their own actions", async () => {
    const revoked = await handleStandingPolicyRevoke(
      request("/api/integrations/floor-command/standing-policy/revoke", {
        policyId: POLICY,
        reason: "operator closed the grant",
      }),
      {
        authenticate: async () => USER,
        revoke: async (_session, policyId, reason) => {
          expect(policyId).toBe(POLICY);
          expect(reason).toBe("operator closed the grant");
          return { status: "revoked" };
        },
      },
    );
    expect(revoked.status).toBe(200);

    const expired = await handleStandingPolicyExpire(
      request("/api/integrations/floor-command/standing-policy/expire", { policyId: POLICY }),
      {
        authenticate: async () => USER,
        expire: async () => ({ status: "still_effective" }),
      },
    );
    expect(expired.status).toBe(200);
    expect(await expired.json()).toEqual({ status: "still_effective" });
  });
});

describe("standing policy command", () => {
  it("does not read Floor Command when the confirmed zone is missing or the grant is proposed", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("standing policy fetched");
    });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const calls: string[] = [];
      const missingZone = await proposeFloorCommandStandingPolicy(
        sessionForVerifiedOperator(USER),
        {
          effectiveAt: "2026-11-08T15:00:00Z",
          expiresAt: "2026-12-01T15:00:00Z",
          maxPublicationWindows: 1,
          reconciliationAllowance: 0,
        },
        { admin: zoneAdmin(calls, null) },
      );
      expect(missingZone.status).toBe("timezone_unconfirmed");
      expect(calls).toEqual(["temporal_settings"]);

      const proposed = await proposeFloorCommandStandingPolicy(
        sessionForVerifiedOperator(USER),
        {
          effectiveAt: "2026-11-08T15:00:00Z",
          expiresAt: "2026-12-01T15:00:00Z",
          maxPublicationWindows: 1,
          reconciliationAllowance: 0,
        },
        {
          admin: zoneAdmin(calls, "America/Denver", async (fn) => {
            calls.push(fn);
            return { data: { status: "proposed", policy: storedPolicy() }, error: null };
          }),
        },
      );
      expect(proposed.status).toBe("proposed");
      expect(proposed.policy?.storeNumber).toBe("2587");
      expect(proposed.policy?.automaticRetryLimit).toBe(0);
      expect(calls).toEqual([
        "temporal_settings",
        "temporal_settings",
        "propose_floor_command_standing_policy",
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("has no reader, scheduler, or pull flag in the policy modules", () => {
    const files = [
      "server/floorCommand/standingPolicy.ts",
      "server/floorCommand/standingPolicyRoute.ts",
      "app/api/integrations/floor-command/standing-policy/route.ts",
      "app/api/integrations/floor-command/standing-policy/approve/route.ts",
      "app/api/integrations/floor-command/standing-policy/revoke/route.ts",
      "app/api/integrations/floor-command/standing-policy/expire/route.ts",
      "supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql",
    ];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toContain("published-week");
    expect(source).not.toContain("ORIENT_FLOOR_COMMAND_PULL_ENABLED");
    expect(source).not.toContain("observeGovernedFloorCommandWeek");
    expect(source).not.toContain("pullFloorCommandPublishedWeek");
    expect(source).not.toContain("cron.schedule");
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});

function mapFixture(state: StandingPolicyRecord["state"]): StandingPolicyRecord {
  const stored = storedPolicy(state);
  return {
    policyId: stored.policy_id,
    policyVersion: 1,
    state,
    authority: state === "approved" ? "effective" : "none",
    operatorId: USER,
    source: FLOOR_COMMAND_SOURCE,
    storeNumber: "2587",
    purpose: FLOOR_COMMAND_READ_PURPOSE,
    timeZone: "America/Denver",
    createdAt: stored.created_at,
    effectiveAt: stored.effective_at,
    expiresAt: stored.expires_at,
    approvedAt: stored.approved_at,
    approvedBy: stored.approved_by,
    revokedAt: null,
    revocationReason: null,
    expiredAt: null,
    maxPublicationWindows: 1,
    maxPublicationPerWindow: 1,
    maxReconciliationPerWindow: 1,
    automaticRetryLimit: 0,
    sourcePublicationAssumed: false,
    writesFloorCommand: false,
    createsOrientTemporalRecords: false,
    observesArbitraryWeeks: false,
    windows: [
      {
        kind: "publication_opportunity",
        operationalWeek: "2026-W45",
        opensAt: "2026-11-08T12:00:00+00:00",
        closesAt: "2026-11-09T07:00:00+00:00",
        timeZone: "America/Denver",
        executable: false,
        sourcePublicationAssumed: false,
        followsSundayPublicationSlot: true,
        requiresOutstandingZebraEntryConfirmation: null,
        outstandingZebraEntryKnown: null,
      },
    ],
  };
}

function zoneAdmin(
  calls: string[],
  zone: string | null,
  rpc?: (fn: string) => Promise<{ data: unknown; error: null }>,
): SupabaseClient {
  return {
    from(table: string) {
      calls.push(table);
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: zone ? { time_zone: zone } : null, error: null }),
              };
            },
          };
        },
      };
    },
    rpc: rpc ?? (async () => ({ data: null, error: null })),
  } as unknown as SupabaseClient;
}
