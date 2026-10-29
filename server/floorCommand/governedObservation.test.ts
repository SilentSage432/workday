import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { handleFloorCommandObservationPost } from "@/app/api/integrations/floor-command/observations/route";
import { FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { observeGovernedFloorCommandWeek } from "@/server/floorCommand/governedObservation";
import {
  FLOOR_COMMAND_BASE_URL_ENV,
  FLOOR_COMMAND_PULL_ENABLED_ENV,
  FLOOR_COMMAND_READ_TOKEN_ENV,
  FLOOR_COMMAND_STORE_NUMBER_ENV,
} from "@/server/floorCommand/config";

const USER = "11111111-1111-4111-8111-111111111111";
const TOKEN = "orient-governed-test-token";
const ORIGIN = "http://localhost:3000";

function session(userId: string | null): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

function env(flag: string | undefined): Record<string, string | undefined> {
  return {
    [FLOOR_COMMAND_READ_TOKEN_ENV]: TOKEN,
    [FLOOR_COMMAND_STORE_NUMBER_ENV]: "2587",
    [FLOOR_COMMAND_BASE_URL_ENV]: "http://127.0.0.1:9",
    [FLOOR_COMMAND_PULL_ENABLED_ENV]: flag,
  };
}

function snapshot(publication: "published" | "unpublished", sequence = 1, revision = "rev-1") {
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: "2026-W45",
    week_starting: "2026-11-02",
    week_ending: "2026-11-08",
    publication: { id: "fc.publication.2587.2026-W45", status: publication },
    handoff: {
      id: "fc.zebra-handoff.2587.2026-W45",
      status: "pending",
      deadline_date: "2026-11-02",
      deadline_policy: "monday_of_operational_week",
      required_count: 1,
      confirmed_count: 0,
      outstanding_count: 1,
    },
    entries: [
      {
        id: "fc.assignment.a1",
        zebra_task_completed: false,
      },
    ],
    deadlines: { availability: "ready", commitments: [] },
    freshness: { revision, week_sequence: sequence, read_at: "2026-11-02T18:00:00.000Z" },
  };
}

function admin(commitOutcome = "accepted_new") {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "open_floor_command_governed_observation") {
        return { data: { status: "opened", request_id: "req-1", claim_id: "claim-1" }, error: null };
      }
      return { data: { outcome: commitOutcome, reason: null }, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("governed Floor Command observation", () => {
  it("does not open a request when the pull flag is off", async () => {
    const store = admin();
    let fetched = 0;
    const result = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: env(undefined),
      admin: store.client,
      fetchImpl: async () => {
        fetched += 1;
        throw new Error("fetch");
      },
    });
    expect(result).toEqual({ outcome: "disabled", storeNumber: "2587" });
    expect(store.calls).toEqual([]);
    expect(fetched).toBe(0);
  });

  it("refuses an unsigned caller before a request exists", async () => {
    const store = admin();
    const result = await observeGovernedFloorCommandWeek(session(null), "2026-W45", {
      env: env("1"),
      admin: store.client,
    });
    expect(result.outcome).toBe("unauthorized");
    expect(store.calls).toEqual([]);
  });

  it("performs one GET and one commit for a published week", async () => {
    const store = admin("accepted_new");
    const urls: string[] = [];
    const redirects: Array<RequestRedirect | undefined> = [];
    const result = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: env("1"),
      admin: store.client,
      fetchImpl: async (input, init) => {
        urls.push(String(input));
        redirects.push(init?.redirect);
        return Response.json({ synchronization: "comparable", snapshot: snapshot("published") });
      },
    });
    expect(result).toMatchObject({ outcome: "accepted_new", requestId: "req-1", week: "2026-W45" });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("http://127.0.0.1:9/api/integrations/floor-command/published-week");
    expect(urls[0]).not.toContain("deptsync-hub.vercel.app");
    expect(redirects).toEqual(["manual"]);
    expect(store.calls.map((call) => call.name)).toEqual([
      "open_floor_command_governed_observation",
      "commit_floor_command_governed_observation",
    ]);
    expect(store.calls[1]?.args.p_snapshot).toMatchObject({ publication: { status: "published" } });
    expect(JSON.stringify(store.calls)).not.toContain(TOKEN);
  });

  it("commits a timeout once and does not retry", async () => {
    const store = admin("failed");
    let fetched = 0;
    const result = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: env("1"),
      admin: store.client,
      fetchImpl: async () => {
        fetched += 1;
        throw new Error("timeout");
      },
    });
    expect(fetched).toBe(1);
    expect(result).toMatchObject({ outcome: "failed" });
    expect(store.calls[1]?.args).toMatchObject({
      p_read_class: "transport_failure",
      p_reason: "source_unavailable",
      p_snapshot: null,
    });
  });

  it("sends an unpublished snapshot once and does not probe again", async () => {
    const store = admin("rejected");
    let fetched = 0;
    await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: env("1"),
      admin: store.client,
      fetchImpl: async () => {
        fetched += 1;
        return Response.json({ synchronization: "comparable", snapshot: snapshot("unpublished", 0, "rev-empty") });
      },
    });
    expect(fetched).toBe(1);
    expect(store.calls).toHaveLength(2);
    expect(store.calls[1]?.args.p_read_class).toBe("snapshot");
    expect(store.calls[1]?.args.p_snapshot).toMatchObject({ publication: { status: "unpublished" } });
  });

  it("does not fetch again when the claim expires during the read", async () => {
    const calls: string[] = [];
    let fetched = 0;
    const client = {
      rpc: async (name: string) => {
        calls.push(name);
        if (name === "open_floor_command_governed_observation") {
          return { data: { status: "opened", request_id: "req-1", claim_id: "claim-1" }, error: null };
        }
        return { data: null, error: { message: "floor_command_governed_observation_claim_expired" } };
      },
    };
    const result = await observeGovernedFloorCommandWeek(session(USER), "2026-W45", {
      env: env("1"),
      admin: client as unknown as SupabaseClient,
      fetchImpl: async () => {
        fetched += 1;
        return Response.json({ synchronization: "comparable", snapshot: snapshot("published") });
      },
    });
    expect(fetched).toBe(1);
    expect(calls).toEqual([
      "open_floor_command_governed_observation",
      "commit_floor_command_governed_observation",
    ]);
    expect(result).toEqual({
      outcome: "failed",
      reason: "lease_expired",
      requestId: "req-1",
      week: "2026-W45",
    });
  });

  it("keeps the one-shot pull file on its own claim", () => {
    const governed = readFileSync("server/floorCommand/governedObservation.ts", "utf8");
    const pull = readFileSync("server/floorCommand/pull.ts", "utf8");
    expect(governed).toContain('redirect: "manual"');
    expect(governed).not.toContain("claim_floor_command_controlled_pull");
    expect(governed).not.toContain("persist_floor_command_observation");
    expect(pull).toContain("claim_floor_command_controlled_pull");
    expect(pull).not.toContain("open_floor_command_governed_observation");
    const view = readFileSync("components/orient/FloorCommandWorkView.tsx", "utf8");
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    expect(view).not.toContain("useEffect");
    expect(instrument).not.toContain("requestFloorCommandObservation");
    expect(readFileSync("server/floorCommand/present.ts", "utf8")).not.toContain("published-week");
  });
});

describe("governed Floor Command observation route", () => {
  it("refuses a cross-site post and a body that names anything besides the week", async () => {
    const calls: string[] = [];
    const observe = async () => {
      calls.push("observe");
      return { outcome: "unauthorized" as const };
    };
    const crossSite = await handleFloorCommandObservationPost(
      new Request(`${ORIGIN}/api/integrations/floor-command/observations`, {
        method: "POST",
        headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site", "content-type": "application/json" },
        body: JSON.stringify({ week: "2026-W45" }),
      }),
      { observe },
    );
    expect(crossSite.status).toBe(403);
    expect(calls).toEqual([]);

    const extra = await handleFloorCommandObservationPost(
      new Request(`${ORIGIN}/api/integrations/floor-command/observations`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ week: "2026-W45", store: "1999" }),
      }),
      {
        authenticate: async () => {
          throw new Error("authentication ran");
        },
        observe,
      },
    );
    expect(extra.status).toBe(400);
    expect(calls).toEqual([]);
  });
});
