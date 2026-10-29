import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_READ_PURPOSE,
  FLOOR_COMMAND_SOURCE,
  floorCommandStoreIdentity,
  isFloorCommandSnapshot,
  type FloorCommandDeadlineInput,
  type FloorCommandRead,
  type FloorCommandSnapshot,
} from "@/domain/floorCommandObservation";
import type { FloorCommandGovernedRequestView } from "@/projections/floorCommandEvidenceCopy";
import {
  applyFloorCommandRead,
  noteFloorCommandObservationFailure,
  type FloorCommandAttemptReason,
  type FloorCommandDismissal,
  type FloorCommandObservationMemory,
  type FloorCommandSupersededAssignment,
} from "@/projections/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";

export const FLOOR_COMMAND_OBSERVATION_TABLES = [
  "floor_command_observation_bindings",
  "floor_command_observation_handoffs",
  "floor_command_observation_attempts",
  "floor_command_observation_dismissals",
  "floor_command_observation_requests",
  "floor_command_observation_handoff_revisions",
] as const;

export const FLOOR_COMMAND_HANDOFF_COLUMNS =
  "user_id, handoff_id, store_number, operational_week, week_starting, week_ending, source_revision, source_updated_at, last_successful_observed_at, deadlines_availability, snapshot, superseded_assignments, retained_deadlines, last_checked_at, checked_sequence";

export const FLOOR_COMMAND_ATTEMPT_COLUMNS =
  "user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at";

export const FLOOR_COMMAND_OBSERVATION_READ_HAS_NO_CREDENTIAL_FIELDS = [
  FLOOR_COMMAND_HANDOFF_COLUMNS,
  FLOOR_COMMAND_ATTEMPT_COLUMNS,
  "store_number",
  "handoff_id, source_revision",
].every((columns) => !/\b(ciphertext|access_token|refresh_token|client_secret|password)\b/.test(columns));

const FORBIDDEN_PAYLOAD = /"(access_token|refresh_token|client_secret|service_role|password)"\s*:/;

export class FloorCommandObservationPersistenceError extends Error {
  readonly code = "floor_command_observation_persistence_failure" as const;

  constructor(message = "Floor Command observation could not be stored.") {
    super(message);
    this.name = "FloorCommandObservationPersistenceError";
  }
}

export class FloorCommandObservationUnboundError extends Error {
  readonly code = "floor_command_observation_unbound" as const;

  constructor() {
    super("This operator is not bound to a Floor Command store.");
    this.name = "FloorCommandObservationUnboundError";
  }
}

export type FloorCommandObservationHandoffRow = {
  user_id: string;
  handoff_id: string;
  store_number: string;
  operational_week: string;
  week_starting: string;
  week_ending: string;
  source_revision: string;
  source_updated_at: string | null;
  last_successful_observed_at: string;
  deadlines_availability: string;
  snapshot: FloorCommandSnapshot;
  superseded_assignments: unknown;
  retained_deadlines: unknown;
  last_checked_at?: string | null;
  checked_sequence?: number | string | null;
};

function integerColumn(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export type FloorCommandObservationAttemptRow = {
  user_id: string;
  last_attempted_at: string;
  last_attempt_result: string;
  last_attempt_reason: string | null;
  last_successful_observed_at: string | null;
};

export type FloorCommandObservationStore = {
  userId: string;
  storeNumber: string;
  handoffs: FloorCommandObservationMemory["handoffs"];
  dismissals: readonly FloorCommandDismissal[];
  lastAttempt: FloorCommandObservationMemory["lastAttempt"];
};

export type FloorCommandObservationWrite = {
  attemptedAt: string;
  attemptResult: "success_complete" | "failure";
  attemptReason: FloorCommandAttemptReason | null;
  handoffs: readonly FloorCommandObservationHandoffPayload[] | null;
};

export type FloorCommandObservationHandoffPayload = {
  handoff_id: string;
  operational_week: string;
  week_starting: string;
  week_ending: string;
  source_revision: string;
  source_updated_at: string | null;
  deadlines_availability: "ready" | "unavailable";
  snapshot: FloorCommandSnapshot;
  superseded_assignments: FloorCommandSupersededAssignment[];
  retained_deadlines: FloorCommandDeadlineInput[];
};

/**
 * Decides the next memory and the database write.
 * The projection owns ordering. An older or unordered ready snapshot produces no write.
 * A failure write carries no handoff payload, so the retained rows stay.
 */
export function planFloorCommandObservationWrite(
  stored: FloorCommandObservationStore,
  read: FloorCommandRead,
): { memory: FloorCommandObservationMemory; write: FloorCommandObservationWrite | null } {
  const memory: FloorCommandObservationMemory = {
    connectedStoreNumber: stored.storeNumber,
    handoffs: stored.handoffs,
    dismissals: stored.dismissals,
    lastAttempt: stored.lastAttempt,
  };
  const next = applyFloorCommandRead(memory, read);
  if (next === memory) {
    return { memory, write: null };
  }
  const write = writeFor(next);
  if (write.handoffs && FORBIDDEN_PAYLOAD.test(JSON.stringify(write.handoffs))) {
    throw new FloorCommandObservationPersistenceError(
      "Floor Command observation payload cannot carry credentials.",
    );
  }
  return { memory: next, write };
}

export function planFloorCommandObservationFailure(
  stored: FloorCommandObservationStore,
  input: { readAt: string; reason: FloorCommandAttemptReason },
): { memory: FloorCommandObservationMemory; write: FloorCommandObservationWrite } {
  const memory = noteFloorCommandObservationFailure(
    floorCommandObservationMemoryFromStore(stored),
    input.readAt,
    input.reason,
  );
  return { memory, write: writeFor(memory) };
}

export function floorCommandObservationMemoryFromStore(
  stored: FloorCommandObservationStore,
): FloorCommandObservationMemory {
  return {
    connectedStoreNumber: stored.storeNumber,
    handoffs: stored.handoffs,
    dismissals: stored.dismissals,
    lastAttempt: stored.lastAttempt,
  };
}

export async function loadFloorCommandObservationStore(
  client: SupabaseClient,
  userId: string,
): Promise<FloorCommandObservationStore | null> {
  const binding = await client
    .from("floor_command_observation_bindings")
    .select("store_number, source, purpose")
    .eq("user_id", userId)
    .maybeSingle();
  if (binding.error) throw new FloorCommandObservationPersistenceError(binding.error.message);
  const bindingRow = binding.data as { store_number: string; source?: string; purpose?: string } | null;
  if (!bindingRow) return null;
  if (bindingRow.source !== FLOOR_COMMAND_SOURCE || bindingRow.purpose !== FLOOR_COMMAND_READ_PURPOSE) {
    return null;
  }
  const storeNumber = floorCommandStoreIdentity(bindingRow.store_number);
  if (!storeNumber) {
    throw new FloorCommandObservationPersistenceError("The bound Floor Command store is invalid.");
  }

  const handoffs = await client
    .from("floor_command_observation_handoffs")
    .select(FLOOR_COMMAND_HANDOFF_COLUMNS)
    .eq("user_id", userId);
  if (handoffs.error) throw new FloorCommandObservationPersistenceError(handoffs.error.message);

  const attempt = await client
    .from("floor_command_observation_attempts")
    .select(FLOOR_COMMAND_ATTEMPT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (attempt.error) throw new FloorCommandObservationPersistenceError(attempt.error.message);

  const dismissals = await client
    .from("floor_command_observation_dismissals")
    .select("handoff_id, source_revision")
    .eq("user_id", userId);
  if (dismissals.error) throw new FloorCommandObservationPersistenceError(dismissals.error.message);

  return {
    userId,
    storeNumber,
    handoffs: ((handoffs.data ?? []) as FloorCommandObservationHandoffRow[]).map(rowToRetainedHandoff),
    dismissals: ((dismissals.data ?? []) as Array<{ handoff_id: string; source_revision: string }>).map(
      (row) => ({ handoffId: row.handoff_id, revision: row.source_revision }),
    ),
    lastAttempt: attempt.data
      ? rowToAttempt(attempt.data as FloorCommandObservationAttemptRow)
      : null,
  };
}

const GOVERNED_TERMINAL = new Set(["accepted_new", "unchanged", "revised", "failed", "rejected"]);

/**
 * Latest terminal governed request for each week. This does not call Floor Command.
 * A missing table is a deployment failure: the migration has to exist before this select.
 */
export async function loadFloorCommandGovernedRequests(
  client: SupabaseClient,
  userId: string,
): Promise<FloorCommandGovernedRequestView[]> {
  const result = await client
    .from("floor_command_observation_requests")
    .select(
      "operational_week, state, reason, terminal_at, previous_observed_at, previous_sequence, previous_revision",
    )
    .eq("user_id", userId);
  if (result.error) throw new FloorCommandObservationPersistenceError(result.error.message);
  const latest = new Map<string, FloorCommandGovernedRequestRow>();
  for (const row of (result.data ?? []) as FloorCommandGovernedRequestRow[]) {
    if (!GOVERNED_TERMINAL.has(row.state) || !row.terminal_at) continue;
    const existing = latest.get(row.operational_week);
    if (!existing || (existing.terminal_at ?? "") < row.terminal_at) latest.set(row.operational_week, row);
  }
  return [...latest.values()].map((row) => ({
    operationalWeek: row.operational_week,
    outcome: row.state as FloorCommandGovernedRequestView["outcome"],
    reason: row.reason,
    terminalAt: row.terminal_at ?? "",
    previousObservedAt: row.previous_observed_at,
    previousSequence: integerColumn(row.previous_sequence),
    previousRevision: row.previous_revision,
  }));
}

type FloorCommandGovernedRequestRow = {
  operational_week: string;
  state: string;
  reason: string | null;
  terminal_at: string | null;
  previous_observed_at: string | null;
  previous_sequence: number | string | null;
  previous_revision: string | null;
};

/**
 * Loads the operator's bound store, applies the read, and persists the result.
 * The store argument is the binding, never a store number from the read.
 * Success and failure both require the claim acquired before the fetch.
 */
export async function recordFloorCommandObservation(
  client: SupabaseClient,
  userId: string,
  read: FloorCommandRead,
  claimId: string,
): Promise<FloorCommandObservationMemory> {
  assertServerOnly("recordFloorCommandObservation");
  if (!userId.trim()) {
    throw new FloorCommandObservationPersistenceError("Operator identity is required.");
  }
  if (!claimId.trim()) {
    throw new FloorCommandObservationPersistenceError("A Floor Command pull claim is required.");
  }
  const stored = await loadFloorCommandObservationStore(client, userId);
  if (!stored) throw new FloorCommandObservationUnboundError();
  const plan = planFloorCommandObservationWrite(stored, read);
  if (plan.write) {
    const { error } = await client.rpc("persist_floor_command_observation", {
      p_user_id: userId,
      p_attempted_at: plan.write.attemptedAt,
      p_attempt_result: plan.write.attemptResult,
      p_attempt_reason: plan.write.attemptReason,
      p_handoffs: plan.write.handoffs,
      p_claim: claimId,
    });
    if (error) throw new FloorCommandObservationPersistenceError(error.message);
  }
  return plan.memory;
}

/** Dismissal is the signed-in operator's act. This call does not send a user or store id. */
export async function dismissPersistedFloorCommandRevision(
  client: SupabaseClient,
  dismissal: FloorCommandDismissal,
): Promise<void> {
  const { error } = await client.rpc("dismiss_floor_command_observation_revision", {
    p_handoff_id: dismissal.handoffId,
    p_source_revision: dismissal.revision,
  });
  if (error) throw new FloorCommandObservationPersistenceError(error.message);
}

function writeFor(memory: FloorCommandObservationMemory): FloorCommandObservationWrite {
  const attempt = memory.lastAttempt;
  if (!attempt) {
    throw new FloorCommandObservationPersistenceError("A Floor Command observation write is missing its attempt.");
  }
  return {
    attemptedAt: attempt.readAt,
    attemptResult: attempt.result,
    attemptReason: attempt.reason,
    handoffs:
      attempt.result === "success_complete"
        ? memory.handoffs.map((row) => ({
            handoff_id: row.snapshot.handoff.id,
            operational_week: row.snapshot.operational_week,
            week_starting: row.snapshot.week_starting,
            week_ending: row.snapshot.week_ending,
            source_revision: row.snapshot.freshness.revision,
            source_updated_at: row.snapshot.freshness.source_updated_at,
            deadlines_availability: row.deadlinesAvailability,
            snapshot: row.snapshot,
            superseded_assignments: [...row.supersededAssignments],
            retained_deadlines: [...row.deadlines],
          }))
        : null,
  };
}

function rowToRetainedHandoff(row: FloorCommandObservationHandoffRow) {
  if (!isFloorCommandSnapshot(row.snapshot)) {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command snapshot is not readable.");
  }
  if (row.snapshot.handoff.id !== row.handoff_id) {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command handoff id does not match its snapshot.");
  }
  if (row.snapshot.operational_week !== row.operational_week) {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command week does not match its snapshot.");
  }
  if (row.snapshot.freshness.revision !== row.source_revision) {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command revision does not match its snapshot.");
  }
  const deadlinesAvailability: "ready" | "unavailable" =
    row.deadlines_availability === "ready"
      ? "ready"
      : row.deadlines_availability === "unavailable"
        ? "unavailable"
        : "unavailable";
  if (row.deadlines_availability !== "ready" && row.deadlines_availability !== "unavailable") {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command deadline state is unknown.");
  }
  return {
    snapshot: row.snapshot,
    supersededAssignments: supersededFrom(row.superseded_assignments),
    deadlines: deadlinesFrom(row.retained_deadlines),
    deadlinesAvailability,
    observedAt: row.last_successful_observed_at,
    lastCheckedAt: row.last_checked_at ?? null,
    checkedSequence: integerColumn(row.checked_sequence),
  };
}

function rowToAttempt(row: FloorCommandObservationAttemptRow): FloorCommandObservationMemory["lastAttempt"] {
  if (row.last_attempt_result !== "success_complete" && row.last_attempt_result !== "failure") {
    throw new FloorCommandObservationPersistenceError("A stored Floor Command attempt result is unknown.");
  }
  return {
    readAt: row.last_attempted_at,
    result: row.last_attempt_result,
    reason: reasonFrom(row.last_attempt_reason),
  };
}

function reasonFrom(value: string | null): FloorCommandAttemptReason | null {
  if (value === null) return null;
  if (
    value === "assignments_unavailable" ||
    value === "invalid_week" ||
    value === "store_required" ||
    value === "cross_store" ||
    value === "invalid_snapshot" ||
    value === "ordering_withheld" ||
    value === "sequence_conflict" ||
    value === "credential_rejected" ||
    value === "source_unavailable" ||
    value === "forbidden"
  ) {
    return value;
  }
  throw new FloorCommandObservationPersistenceError("A stored Floor Command attempt reason is unknown.");
}

function supersededFrom(value: unknown): FloorCommandSupersededAssignment[] {
  if (!Array.isArray(value)) {
    throw new FloorCommandObservationPersistenceError("Stored superseded bays are missing.");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new FloorCommandObservationPersistenceError("A stored superseded bay is unreadable.");
    }
    const row = item as Partial<FloorCommandSupersededAssignment>;
    if (!row.id || !row.assignmentId || !row.bayId) {
      throw new FloorCommandObservationPersistenceError("A stored superseded bay is missing its identity.");
    }
    return {
      id: row.id,
      assignmentId: row.assignmentId,
      bayId: row.bayId,
      rosterSpecialistId: row.rosterSpecialistId ?? null,
      associateName: row.associateName ?? "",
    };
  });
}

function deadlinesFrom(value: unknown): FloorCommandDeadlineInput[] {
  if (!Array.isArray(value)) {
    throw new FloorCommandObservationPersistenceError("Stored Floor Command deadlines are missing.");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new FloorCommandObservationPersistenceError("A stored Floor Command deadline is unreadable.");
    }
    const row = item as Partial<FloorCommandDeadlineInput>;
    if (!row.id || !row.roster_specialist_id || !row.target_date || !row.final_date) {
      throw new FloorCommandObservationPersistenceError("A stored Floor Command deadline is missing its dates.");
    }
    return {
      id: row.id,
      roster_specialist_id: row.roster_specialist_id,
      associate_name: row.associate_name ?? "",
      target_date: row.target_date,
      final_date: row.final_date,
      review_required: row.review_required === true,
      dates_overridden: row.dates_overridden === true,
      confirmed_at: row.confirmed_at ?? "",
      published_entry_ids: Array.isArray(row.published_entry_ids) ? row.published_entry_ids : [],
    };
  });
}
