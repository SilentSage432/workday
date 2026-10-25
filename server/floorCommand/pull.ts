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

export type FloorCommandPullResult =
  | { outcome: "unauthorized" }
  | { outcome: "unconfigured" }
  | { outcome: "disabled"; storeNumber: string }
  | { outcome: "unbound"; storeNumber: string }
  | { outcome: "wrong_store"; memory?: FloorCommandObservationMemory }
  | { outcome: "invalid_week" }
  | { outcome: "revoked"; memory: FloorCommandObservationMemory }
  | { outcome: "unavailable"; memory: FloorCommandObservationMemory }
  | { outcome: "withheld"; memory: FloorCommandObservationMemory }
  | { outcome: "rejected"; memory: FloorCommandObservationMemory }
  | { outcome: "conflict"; memory: FloorCommandObservationMemory }
  | { outcome: "accepted"; memory: FloorCommandObservationMemory };

type PullCommit = {
  load: (userId: string) => Promise<FloorCommandObservationStore | null>;
  applyRead: (userId: string, read: FloorCommandRead) => Promise<FloorCommandObservationMemory>;
  noteFailure: (
    userId: string,
    input: { readAt: string; reason: FloorCommandAttemptReason },
  ) => Promise<FloorCommandObservationMemory>;
};

/**
 * One server-side read of an approved store-week.
 * The live call stays off unless the enable flag is exactly "1".
 * HTTP 200 is not acceptance. A withheld body is a failed attempt.
 * The result never includes the bearer.
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

  const before = noteMemory(stored);
  let response: Response;
  try {
    response = await (deps.fetchImpl ?? fetch)(publishedWeekUrl(configuration.baseUrl, weekLabel, configuration.storeNumber), {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FLOOR_COMMAND_PULL_TIMEOUT_MS),
    });
  } catch {
    return {
      outcome: "unavailable",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "source_unavailable" }),
    };
  }

  if (response.status === 401) {
    return {
      outcome: "revoked",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "credential_rejected" }),
    };
  }
  if (response.status === 403) {
    return {
      outcome: "wrong_store",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "forbidden" }),
    };
  }
  if (!response.ok) {
    return {
      outcome: "unavailable",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "source_unavailable" }),
    };
  }

  const body = await readJson(response);
  if (bodyContainsToken(body, token)) {
    return {
      outcome: "unavailable",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "invalid_snapshot" }),
    };
  }
  const read = floorCommandReadFromBody(body);
  if (!read) {
    return {
      outcome: "unavailable",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "invalid_snapshot" }),
    };
  }
  if (read.availability === "ready" && read.snapshot.source !== FLOOR_COMMAND_SOURCE) {
    return {
      outcome: "unavailable",
      memory: await commit.noteFailure(userId, { readAt: now, reason: "invalid_snapshot" }),
    };
  }

  const memory = await commit.applyRead(userId, read);
  return { outcome: classifyAcceptedRead(before, memory, read), memory };
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
    applyRead: (userId, read) => recordFloorCommandObservation(admin, userId, read),
    noteFailure: async (userId, input) => {
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
      });
      if (error) {
        throw new Error("Floor Command observation could not be stored.");
      }
      return plan.memory;
    },
  };
}
