import type { SupabaseClient } from "@supabase/supabase-js";
import { FLOOR_COMMAND_READ_PURPOSE, FLOOR_COMMAND_SOURCE } from "@/domain/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  describeFloorCommandConnection,
  FLOOR_COMMAND_PULL_TIMEOUT_MS,
  readFloorCommandReadToken,
} from "@/server/floorCommand/config";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

const ISO_WEEK = /^\d{4}-W\d{2}$/;

type EnvMap = Record<string, string | undefined>;

export type FloorCommandGovernedOutcome =
  | "accepted_new"
  | "unchanged"
  | "revised"
  | "failed"
  | "rejected";

export type FloorCommandGovernedObservationResult =
  | { outcome: "unauthorized" }
  | { outcome: "unconfigured" }
  | { outcome: "disabled"; storeNumber: string }
  | { outcome: "unbound"; storeNumber: string }
  | { outcome: "wrong_store" }
  | { outcome: "invalid_week" }
  | { outcome: "busy" }
  | {
      outcome: FloorCommandGovernedOutcome;
      reason: string | null;
      requestId: string;
      week: string;
    };

type OpenStatus = "opened" | "busy" | "unbound" | "wrong_store";

/**
 * One explicit observation of a named Floor Command week.
 * The database creates the request id. This function performs one GET.
 * It does not call the one-shot claim, and it does not retry.
 */
export async function observeGovernedFloorCommandWeek(
  session: SupabaseClient,
  weekLabel: string,
  deps: {
    env?: EnvMap;
    fetchImpl?: typeof fetch;
    admin?: SupabaseClient;
  } = {},
): Promise<FloorCommandGovernedObservationResult> {
  assertServerOnly("observeGovernedFloorCommandWeek");
  const userId = await signedInOperator(session);
  if (!userId) return { outcome: "unauthorized" };
  if (!ISO_WEEK.test(weekLabel)) return { outcome: "invalid_week" };

  const env = deps.env ?? process.env;
  const configuration = describeFloorCommandConnection(env);
  if (configuration.status !== "configured") return { outcome: "unconfigured" };
  if (!configuration.pullEnabled) return { outcome: "disabled", storeNumber: configuration.storeNumber };
  const token = readFloorCommandReadToken(env);
  if (!token) return { outcome: "unconfigured" };

  const admin = deps.admin ?? openAdmin();
  if (!admin) return { outcome: "unconfigured" };

  const opened = await openRequest(admin, userId, weekLabel, configuration.storeNumber);
  if (opened.status === "busy") return { outcome: "busy" };
  if (opened.status === "unbound") return { outcome: "unbound", storeNumber: configuration.storeNumber };
  if (opened.status === "wrong_store") return { outcome: "wrong_store" };
  if (opened.status !== "opened" || !opened.requestId || !opened.claimId) {
    return { outcome: "unconfigured" };
  }

  const read = await readOnce(
    deps.fetchImpl ?? fetch,
    publishedWeekUrl(configuration.baseUrl, weekLabel, configuration.storeNumber),
    token,
  );
  try {
    const committed = await commitRequest(admin, userId, opened.requestId, opened.claimId, read);
    return {
      outcome: committed.outcome,
      reason: committed.reason,
      requestId: opened.requestId,
      week: weekLabel,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("floor_command_governed_observation_claim_expired")) {
      return { outcome: "failed", reason: "lease_expired", requestId: opened.requestId, week: weekLabel };
    }
    throw error;
  }
}

async function readOnce(
  fetchImpl: typeof fetch,
  url: string,
  token: string,
): Promise<{
  readClass: "snapshot" | "transport_failure" | "credential_rejected" | "forbidden";
  reason: string | null;
  synchronization: string | null;
  snapshot: unknown;
}> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(FLOOR_COMMAND_PULL_TIMEOUT_MS),
    });
  } catch {
    return { readClass: "transport_failure", reason: "source_unavailable", synchronization: null, snapshot: null };
  }
  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    return { readClass: "transport_failure", reason: "source_unavailable", synchronization: null, snapshot: null };
  }
  if (response.status === 401) {
    return { readClass: "credential_rejected", reason: "credential_rejected", synchronization: null, snapshot: null };
  }
  if (response.status === 403) {
    return { readClass: "forbidden", reason: "forbidden", synchronization: null, snapshot: null };
  }
  if (!response.ok) {
    return { readClass: "transport_failure", reason: "source_unavailable", synchronization: null, snapshot: null };
  }
  const body = await readJson(response);
  if (bodyContainsToken(body, token) || !body || typeof body !== "object" || Array.isArray(body)) {
    return { readClass: "snapshot", reason: null, synchronization: null, snapshot: null };
  }
  const record = body as Record<string, unknown>;
  const synchronization = record.synchronization;
  return {
    readClass: "snapshot",
    reason: null,
    synchronization: synchronization === "comparable" || synchronization === "withheld" ? synchronization : null,
    snapshot: record.snapshot ?? null,
  };
}

async function openRequest(
  admin: SupabaseClient,
  userId: string,
  week: string,
  storeNumber: string,
): Promise<{ status: OpenStatus | "invalid"; requestId?: string; claimId?: string }> {
  const { data, error } = await admin.rpc("open_floor_command_governed_observation", {
    p_user_id: userId,
    p_week: week,
    p_store: storeNumber,
    p_source: FLOOR_COMMAND_SOURCE,
    p_purpose: FLOOR_COMMAND_READ_PURPOSE,
  });
  if (error) {
    if (error.message.includes("floor_command_governed_observation_week_invalid")) {
      return { status: "invalid" };
    }
    throw new Error(error.message);
  }
  const record = data as { status?: string; request_id?: string; claim_id?: string } | null;
  if (record?.status === "opened" || record?.status === "busy" || record?.status === "unbound" || record?.status === "wrong_store") {
    return { status: record.status, requestId: record.request_id, claimId: record.claim_id };
  }
  return { status: "invalid" };
}

async function commitRequest(
  admin: SupabaseClient,
  userId: string,
  requestId: string,
  claimId: string,
  read: {
    readClass: string;
    reason: string | null;
    synchronization: string | null;
    snapshot: unknown;
  },
): Promise<{ outcome: FloorCommandGovernedOutcome; reason: string | null }> {
  const { data, error } = await admin.rpc("commit_floor_command_governed_observation", {
    p_user_id: userId,
    p_request_id: requestId,
    p_claim_id: claimId,
    p_read_class: read.readClass,
    p_reason: read.reason,
    p_synchronization: read.synchronization,
    p_snapshot: read.snapshot,
  });
  if (error) throw new Error(error.message);
  const record = data as { outcome?: string; reason?: string | null } | null;
  if (
    record?.outcome === "accepted_new" ||
    record?.outcome === "unchanged" ||
    record?.outcome === "revised" ||
    record?.outcome === "failed" ||
    record?.outcome === "rejected"
  ) {
    return { outcome: record.outcome, reason: record.reason ?? null };
  }
  throw new Error("Floor Command observation request could not be classified.");
}

function publishedWeekUrl(baseUrl: string, weekLabel: string, storeNumber: string): string {
  const url = new URL("/api/integrations/floor-command/published-week", baseUrl);
  url.searchParams.set("week", weekLabel);
  url.searchParams.set("store", storeNumber);
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function bodyContainsToken(body: unknown, token: string): boolean {
  if (!body || typeof body !== "object") return false;
  return JSON.stringify(body).includes(token);
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
