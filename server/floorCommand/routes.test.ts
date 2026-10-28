import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import { FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { handleFloorCommandApprovalPost } from "@/app/api/integrations/floor-command/approval/route";
import { handleFloorCommandPullPost } from "@/app/api/integrations/floor-command/pull/route";
import type { FloorCommandApproval } from "@/server/floorCommand/approve";
import type { FloorCommandPullResult } from "@/server/floorCommand/pull";

const USER = "11111111-1111-4111-8111-111111111111";
const ORIGIN = "http://localhost:3000";

function request(path: string, init: { origin?: string | null; site?: string; body?: string } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.origin) headers.set("origin", init.origin);
  if (init.site) headers.set("sec-fetch-site", init.site);
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: init.body,
  });
}

describe("Floor Command approval and pull routes", () => {
  it("refuses a missing session, a cross-site post, and a caller-supplied store", async () => {
    const calls: string[] = [];
    const authenticate = async () => {
      throw new AuthenticatedUserError("unauthenticated", "Sign in is required.");
    };
    const missing = await handleFloorCommandApprovalPost(request("/api/integrations/floor-command/approval", { body: "{}" }), {
      authenticate,
      approve: async () => {
        calls.push("approve");
        return { status: "approved", storeNumber: "2587", source: FLOOR_COMMAND_SOURCE, purpose: "orient_published_week_read" };
      },
    });
    expect(missing.status).toBe(401);
    expect(calls).toEqual([]);

    const crossSite = await handleFloorCommandApprovalPost(
      request("/api/integrations/floor-command/approval", {
        origin: "https://evil.example",
        site: "cross-site",
        body: "{}",
      }),
      {
        authenticate: async () => USER,
        approve: async () => {
          calls.push("approve");
          return { status: "unauthorized" };
        },
      },
    );
    expect(crossSite.status).toBe(403);
    expect(await crossSite.json()).toEqual({ error: "Cross-site request refused." });
    expect(calls).toEqual([]);

    const override = await handleFloorCommandApprovalPost(
      request("/api/integrations/floor-command/approval", { body: JSON.stringify({ store_number: "1999" }) }),
      {
        authenticate: async () => USER,
        approve: async () => {
          calls.push("approve");
          return { status: "unauthorized" };
        },
      },
    );
    expect(override.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("approves only the server store and does not return a bearer", async () => {
    const approved = await handleFloorCommandApprovalPost(request("/api/integrations/floor-command/approval", { body: "{}" }), {
      authenticate: async () => USER,
      approve: async () =>
        ({
          status: "approved",
          storeNumber: "2587",
          source: FLOOR_COMMAND_SOURCE,
          purpose: "orient_published_week_read",
        }) satisfies FloorCommandApproval,
    });
    expect(approved.status).toBe(200);
    const body = await approved.json();
    expect(body).toEqual({
      status: "approved",
      storeNumber: "2587",
      source: FLOOR_COMMAND_SOURCE,
      purpose: "orient_published_week_read",
    });
    expect(JSON.stringify(body)).not.toMatch(/token|bearer|service_role/i);

    const bound = await handleFloorCommandApprovalPost(request("/api/integrations/floor-command/approval"), {
      authenticate: async () => USER,
      approve: async () => ({ status: "already_bound" }),
    });
    expect(bound.status).toBe(409);

    const disabled = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", { body: JSON.stringify({ week: "2026-W44" }) }),
      {
        authenticate: async () => USER,
        pull: async () => ({ outcome: "disabled", storeNumber: "2587" }),
      },
    );
    expect(disabled.status).toBe(403);
    expect(await disabled.json()).toEqual({ outcome: "disabled", storeNumber: "2587" });
  });

  it("pulls one explicit week and refuses a second success, a busy claim, and extra fields", async () => {
    const weeks: string[] = [];
    const pull = async (_session: unknown, week: string): Promise<FloorCommandPullResult> => {
      weeks.push(week);
      if (weeks.length > 1) return { outcome: "already_succeeded", memory: emptyMemory() };
      return { outcome: "accepted", memory: emptyMemory() };
    };
    const first = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", {
        origin: ORIGIN,
        site: "same-origin",
        body: JSON.stringify({ week: "2026-W44" }),
      }),
      { authenticate: async () => USER, pull },
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ outcome: "accepted" });
    const second = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", { body: JSON.stringify({ week: "2026-W44" }) }),
      { authenticate: async () => USER, pull },
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ outcome: "already_succeeded" });
    expect(weeks).toEqual(["2026-W44", "2026-W44"]);

    const busy = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", { body: JSON.stringify({ week: "2026-W44" }) }),
      {
        authenticate: async () => USER,
        pull: async () => ({ outcome: "busy", memory: emptyMemory() }),
      },
    );
    expect(busy.status).toBe(409);

    const extra = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", {
        body: JSON.stringify({ week: "2026-W44", store: "1999" }),
      }),
      {
        authenticate: async () => {
          throw new Error("authentication ran");
        },
      },
    );
    expect(extra.status).toBe(400);
    expect(await extra.json()).toEqual({ outcome: "invalid_week" });

    const badWeek = await handleFloorCommandPullPost(
      request("/api/integrations/floor-command/pull", { body: JSON.stringify({ week: "week" }) }),
      {
        authenticate: async () => USER,
        pull: async () => ({ outcome: "invalid_week" }),
      },
    );
    expect(badWeek.status).toBe(400);
  });

  it("keeps Work and the observation route off the pull", () => {
    const observation = readFileSync("app/api/integrations/floor-command/observation/route.ts", "utf8");
    expect(observation).not.toContain("pullFloorCommandPublishedWeek");
    expect(observation).not.toContain("approveFloorCommandConnection");
    const pullRoute = readFileSync("app/api/integrations/floor-command/pull/route.ts", "utf8");
    const approvalRoute = readFileSync("app/api/integrations/floor-command/approval/route.ts", "utf8");
    expect(pullRoute).not.toContain("ORIENT_FLOOR_COMMAND_READ_TOKEN");
    expect(approvalRoute).not.toContain("ORIENT_FLOOR_COMMAND_READ_TOKEN");
    expect(pullRoute).not.toContain("createTask");
    expect(readFileSync("server/floorCommand/pull.ts", "utf8")).toContain('redirect: "manual"');
    expect(readFileSync("server/floorCommand/pull.ts", "utf8")).toContain("claim_floor_command_controlled_pull");
  });
});

function emptyMemory(): Extract<FloorCommandPullResult, { outcome: "accepted" }>["memory"] {
  return {
    connectedStoreNumber: "2587",
    handoffs: [],
    dismissals: [],
    lastAttempt: null,
  };
}
