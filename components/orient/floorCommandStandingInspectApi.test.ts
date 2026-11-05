import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectStandingOpportunityForWork } from "@/components/orient/floorCommandWorkApi";

const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

vi.mock("@/persistence/supabaseBrowserClient", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "operator-access-token" } },
        error: null,
      }),
    },
  }),
}));

describe("standing inspect work API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("binds one approved grant then posts only the inspect contract", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "inspected",
            policies: [
              { policyId: POLICY, policyVersion: 2, state: "approved" },
              { policyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", policyVersion: 1, state: "revoked" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "gate_disabled",
            advisory: true,
            consumesOpportunity: false,
            correlationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            asOf: "2026-11-02T18:00:00.000Z",
            policyId: POLICY,
            policyVersion: 2,
            operationalWeek: "2026-W44",
            opportunityKind: "publication_opportunity",
            disclaimer: "eligibility_is_not_a_reservation",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectStandingOpportunityForWork({ operationalWeek: "2026-W44" });
    expect(result).toMatchObject({
      kind: "advisory",
      status: "gate_disabled",
      consumesOpportunity: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/integrations/floor-command/standing-policy");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/integrations/floor-command/standing-opportunity/inspect",
    );
    const inspectInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(inspectInit.method).toBe("POST");
    expect(inspectInit.cache).toBe("no-store");
    const body = JSON.parse(String(inspectInit.body));
    expect(body).toEqual({
      action: "inspect_standing_opportunity",
      policyId: POLICY,
      policyVersion: 2,
      operationalWeek: "2026-W44",
      opportunityKind: "publication_opportunity",
      correlationId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    });
    expect(body).not.toHaveProperty("confirmation");
    expect(body).not.toHaveProperty("storeNumber");
    expect(JSON.stringify(body)).not.toMatch(/service_role|token|secret/i);
  });

  it("does not call inspect when no approved grant exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "inspected", policies: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await inspectStandingOpportunityForWork({ operationalWeek: "2026-W44" });
    expect(result).toEqual({
      kind: "context_unavailable",
      reason: "No approved standing grant is available to inspect.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
