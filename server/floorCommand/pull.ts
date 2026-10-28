import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_SOURCE,
  isFloorCommandSnapshot,
  type FloorCommandRead,
  type FloorCommandSnapshot,
} from "@/domain/floorCommandObservation";
import {
  planFloorCommandObservationFailure,
  recordFloorCommandObservation,
  loadFloorCommandObservationStore,
  type FloorCommandObservationStore,
} from "@/persistence/floorCommandObservation";
import {
  noteFloorCommandObservationFailure,
  type FloorCommandAttemptReason,
  type FloorCommandObservationMemory,
} from "@/projections/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  describeFloorCommandConnection,
  FLOOR_COMMAND_PULL_TIMEOUT_MS,
  readFloorCommandReadToken,
} from "@/server/floorCommand/config";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

const ISO_WEEK = /^\d{4}-W\d{2}$/;

type EnvMap = Record<string, string | undefined>;

export type FloorCommandClaimStatus = "claimed" | "busy" | "already_succeeded" | "unbound";

export type FloorCommandReleaseStatus = "released" | "mismatch" | "already_succeeded";

export type FloorCommandPullResult =
  | { outcome: "unauthorized" }
  | { outcome: "unconfigured" }
  | { outcome: "disabled"; storeNumber: string }
  | { outcome: "unbound"; storeNumber: string }
  | { outcome: "wrong_store"; memory?: FloorCommandObservationMemory }
  | { outcome: "invalid_week" }
  | { outcome: "busy"; memory: FloorCommandObservationMemory }
  | { outcome: "already_succeeded"; memory: FloorCommandObservationMemory }
  | { outcome: "revoked"; memory: FloorCommandObservationMemory }
  | { outcome: "unavailable"; memory: FloorCommandObservationMemory }
  | { outcome: "withheld"; memory: FloorCommandObservationMemory }
  | { outcome: "rejected"; memory: FloorCommandObservationMemory }
  | { outcome: "conflict"; memory: FloorCommandObservationMemory }
  | { outcome: "accepted"; memory: FloorCommandObservationMemory };

type PullCommit = {
  load: (userId: string) => Promise<FloorCommandObservationStore | null>;
  claim: (userId: string, claimId: string) => Promise<FloorCommandClaimStatus>;
  release: (userId: string, claimId: string) => Promise<FloorCommandReleaseStatus>;
  applyRead: (
    userId: string,
    read: FloorCommandRead,
    claimId: string,
  ) => Promise<FloorCommandObservationMemory>;
  noteFailure: (
    userId: string,
    input: { readAt: string; reason: FloorCommandAttemptReason },
    claimId: string,
  ) => Promise<FloorCommandObservationMemory>;
};

/**
 * One server-side read of an approved store-week.
 * A database claim is acquired before the GET. The live call stays off unless
 * the enable flag is exactly "1". HTTP 200 is not acceptance.
 * The result never includes the bearer.
 * A committed success is not fetched again. This is not exactly-once HTTP delivery.
 */
export async function pullFloorCommandPublishedWeek(
  session: SupabaseClient,
  weekLabel: string,
  deps: {
    env?: EnvMap;
    now?: string;
    fetchImpl?: typeof fetch;
    admin?: SupabaseClient;
    commit?: PullCommit;
  } = {},
): Promise<FloorCommandPullResult> {
  assertServerOnly("pullFloorCommandPublishedWeek");
  const now = deps.now ?? new Date().toISOString();
  const userId = await signedInOperator(session);
  if (!userId) return { outcome: "unauthorized" };
  if (!ISO_WEEK.test(weekLabel)) return { outcome: "invalid_week" };

  const env = deps.env ?? process.env;
  const configuration = describeFloorCommandConnection(env);
  if (configuration.status !== "configured") return { outcome: "unconfigured" };
  if (!configuration.pullEnabled) {
    return { outcome: "disabled", storeNumber: configuration.storeNumber };
  }
  const token = readFloorCommandReadToken(env);
  if (!token) return { outcome: "unconfigured" };

  const admin = deps.admin ?? openAdmin();
  if (!admin && !deps.commit) return { outcome: "unconfigured" };
  const commit = deps.commit ?? (admin ? defaultCommit(admin) : null);
  if (!commit) return { outcome: "unconfigured" };

  const stored = await commit.load(userId);
  if (!stored) return { outcome: "unbound", storeNumber: configuration.storeNumber };
  if (stored.storeNumber !== configuration.storeNumber) return { outcome: "wrong_store" };

  const claimId = crypto.randomUUID();
  const claim = await commit.claim(userId, claimId);
  const before = noteMemory(stored);
  if (claim === "busy") return { outcome: "busy", memory: before };
  if (claim === "already_succeeded") return { outcome: "already_succeeded", memory: before };
  if (claim === "unbound") return { outcome: "unbound", storeNumber: configuration.storeNumber };
  if (claim !== "claimed") return { outcome: "unavailable", memory: before };

  let response: Response;
  try {
    response = await (deps.fetchImpl ?? fetch)(publishedWeekUrl(configuration.baseUrl, weekLabel, configuration.storeNumber), {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(FLOOR_COMMAND_PULL_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "source_unavailable",
      }, error),
    };
  }

  if (isRedirect(response)) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "source_unavailable",
      }),
    };
  }

  if (response.status === 401) {
    return {
      outcome: "revoked",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "credential_rejected",
      }),
    };
  }
  if (response.status === 403) {
    return {
      outcome: "wrong_store",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "forbidden",
      }),
    };
  }
  if (!response.ok) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "source_unavailable",
      }),
    };
  }

  const body = await readJson(response);
  if (bodyContainsToken(body, token)) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "invalid_snapshot",
      }),
    };
  }
  const read = floorCommandReadFromBody(body);
  if (!read) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "invalid_snapshot",
      }),
    };
  }
  if (read.availability === "ready" && read.snapshot.operational_week !== weekLabel) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "invalid_snapshot",
      }),
    };
  }
  if (read.availability === "ready" && read.snapshot.source !== FLOOR_COMMAND_SOURCE) {
    return {
      outcome: "unavailable",
      memory: await recordFailure(commit, userId, claimId, before, {
        readAt: now,
        reason: "invalid_snapshot",
      }),
    };
  }

  try {
    const memory = await commit.applyRead(userId, read, claimId);
    if (memory.lastAttempt?.result !== "success_complete") {
      await releaseOwnedClaim(commit, userId, claimId);
    }
    return { outcome: classifyAcceptedRead(before, memory, read), memory };
  } catch (error) {
    await releaseOwnedClaim(commit, userId, claimId);
    if (staleClaim(error)) return { outcome: "unavailable", memory: before };
    throw error;
  }
}

export function floorCommandReadFromBody(body: unknown): FloorCommandRead | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (record.availability === "unavailable") {
    if (
      record.reason !== "assignments_unavailable" &&
      record.reason !== "invalid_week" &&
      record.reason !== "store_required"
    ) {
      return null;
    }
    if (typeof record.read_at !== "string" || !record.read_at) return null;
    return { availability: "unavailable", reason: record.reason, read_at: record.read_at };
  }
  if (record.availability !== "ready" || !record.snapshot || typeof record.snapshot !== "object") {
    return null;
  }
  const snapshot = record.snapshot as FloorCommandSnapshot;
  if (!isFloorCommandSnapshot(snapshot) || snapshot.source !== FLOOR_COMMAND_SOURCE) return null;
  const synchronization = record.synchronization;
  if (synchronization !== "comparable" && synchronization !== "withheld") return null;
  return { availability: "ready", snapshot, synchronization };
}

function classifyAcceptedRead(
  before: FloorCommandObservationMemory,
  after: FloorCommandObservationMemory,
  read: FloorCommandRead,
): "accepted" | "rejected" | "withheld" | "conflict" | "unavailable" {
  if (read.availability === "unavailable") return "unavailable";
  if (read.synchronization !== "comparable") return "withheld";
  if (after.lastAttempt === before.lastAttempt && after.handoffs === before.handoffs) return "rejected";
  if (after.lastAttempt?.reason === "sequence_conflict") return "conflict";
  if (after.lastAttempt?.result === "failure") return "withheld";
  return "accepted";
}

async function recordFailure(
  commit: PullCommit,
  userId: string,
  claimId: string,
  before: FloorCommandObservationMemory,
  input: { readAt: string; reason: FloorCommandAttemptReason },
  cause?: unknown,
): Promise<FloorCommandObservationMemory> {
  if (staleClaim(cause)) {
    await releaseOwnedClaim(commit, userId, claimId);
    return before;
  }
  try {
    const memory = await commit.noteFailure(userId, input, claimId);
    await releaseOwnedClaim(commit, userId, claimId);
    return memory;
  } catch (error) {
    await releaseOwnedClaim(commit, userId, claimId);
    if (staleClaim(error)) return before;
    throw error;
  }
}

async function releaseOwnedClaim(
  commit: PullCommit,
  userId: string,
  claimId: string,
): Promise<void> {
  try {
    await commit.release(userId, claimId);
  } catch (error) {
    if (staleClaim(error)) return;
    throw error;
  }
}

function staleClaim(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("floor_command_controlled_pull_claim_expired") ||
    message.includes("floor_command_controlled_pull_claim_mismatch") ||
    message.includes("floor_command_controlled_pull_already_succeeded")
  );
}

function isRedirect(response: Response): boolean {
  return response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400);
}

function noteMemory(stored: FloorCommandObservationStore): FloorCommandObservationMemory {
  return {
    connectedStoreNumber: stored.storeNumber,
    handoffs: stored.handoffs,
    dismissals: stored.dismissals,
    lastAttempt: stored.lastAttempt,
  };
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

function defaultCommit(admin: SupabaseClient): PullCommit {
  return {
    load: (userId) => loadFloorCommandObservationStore(admin, userId),
    claim: (userId, claimId) => claimControlledPull(admin, userId, claimId),
    release: (userId, claimId) => releaseControlledPull(admin, userId, claimId),
    applyRead: (userId, read, claimId) => recordFloorCommandObservation(admin, userId, read, claimId),
    noteFailure: async (userId, input, claimId) => {
      const stored = await loadFloorCommandObservationStore(admin, userId);
      if (!stored) {
        return noteFloorCommandObservationFailure(
          {
            connectedStoreNumber: "",
            handoffs: [],
            dismissals: [],
            lastAttempt: null,
          },
          input.readAt,
          input.reason,
        );
      }
      const plan = planFloorCommandObservationFailure(stored, input);
      const { error } = await admin.rpc("persist_floor_command_observation", {
        p_user_id: userId,
        p_attempted_at: plan.write.attemptedAt,
        p_attempt_result: plan.write.attemptResult,
        p_attempt_reason: plan.write.attemptReason,
        p_handoffs: plan.write.handoffs,
        p_claim: claimId,
      });
      if (error) throw new Error(error.message);
      return plan.memory;
    },
  };
}

async function claimControlledPull(
  admin: SupabaseClient,
  userId: string,
  claimId: string,
): Promise<FloorCommandClaimStatus> {
  const { data, error } = await admin.rpc("claim_floor_command_controlled_pull", {
    p_user_id: userId,
    p_claim: claimId,
  });
  if (error) throw new Error(error.message);
  if (data === "claimed" || data === "busy" || data === "already_succeeded" || data === "unbound") {
    return data;
  }
  throw new Error("Floor Command pull claim could not be acquired.");
}

async function releaseControlledPull(
  admin: SupabaseClient,
  userId: string,
  claimId: string,
): Promise<FloorCommandReleaseStatus> {
  const { error } = await admin.rpc("release_floor_command_controlled_pull", {
    p_user_id: userId,
    p_claim: claimId,
  });
  if (!error) return "released";
  if (error.message.includes("floor_command_controlled_pull_already_succeeded")) {
    return "already_succeeded";
  }
  if (error.message.includes("floor_command_controlled_pull_claim_mismatch")) return "mismatch";
  throw new Error(error.message);
}
