import {
  FLOOR_COMMAND_SOURCE,
  FLOOR_COMMAND_THIS_WEEK_HREF,
  FLOOR_COMMAND_WEEK_IDENTITY,
  floorCommandStoreIdentity,
  isFloorCommandSnapshot,
  sameFloorCommandStore,
  type FloorCommandAssignmentInput,
  type FloorCommandDeadlineInput,
  type FloorCommandHandoffStatus,
  type FloorCommandRead,
  type FloorCommandSnapshot,
} from "@/domain/floorCommandObservation";

export type FloorCommandFreshness = "fresh" | "stale" | "unavailable";

export type FloorCommandAttemptReason =
  | "assignments_unavailable"
  | "invalid_week"
  | "store_required"
  | "cross_store"
  | "invalid_snapshot"
  | "ordering_withheld"
  | "sequence_conflict"
  | "credential_rejected"
  | "source_unavailable"
  | "forbidden";

export type FloorCommandDismissal = {
  handoffId: string;
  revision: string;
};

export type FloorCommandSupersededAssignment = {
  id: string;
  assignmentId: string;
  bayId: string;
  rosterSpecialistId: string | null;
  associateName: string;
};

export type FloorCommandObservationMemory = {
  connectedStoreNumber: string;
  handoffs: readonly FloorCommandRetainedHandoff[];
  dismissals: readonly FloorCommandDismissal[];
  lastAttempt: null | {
    readAt: string;
    result: "success_complete" | "failure";
    reason: FloorCommandAttemptReason | null;
  };
};

export type FloorCommandRetainedHandoff = {
  snapshot: FloorCommandSnapshot;
  supersededAssignments: readonly FloorCommandSupersededAssignment[];
  /** Last confirmed SMART dates. Kept when a later deadline read is unavailable. */
  deadlines: readonly FloorCommandDeadlineInput[];
  deadlinesAvailability: "ready" | "unavailable";
};

export type FloorCommandObservedDeadline = {
  id: string;
  rosterSpecialistId: string;
  associateName: string;
  targetDate: string;
  finalDate: string;
  reviewRequired: boolean;
  publishedEntryIds: readonly string[];
};

export type FloorCommandObservedAssignment = {
  id: string;
  assignmentId: string;
  bayId: string;
  department: string;
  rosterSpecialistId: string | null;
  associateName: string;
  zebraConfirmation: "unconfirmed" | "confirmed";
  /** Floor Command does not report associate task completion. This stays false. */
  zebraTaskCompleted: false;
  deadlineId: string | null;
  lifecycle: "current" | "retired" | "superseded";
};

export type FloorCommandHandoffObservation = {
  source: typeof FLOOR_COMMAND_SOURCE;
  correctionAuthority: "external";
  weekIdentity: typeof FLOOR_COMMAND_WEEK_IDENTITY;
  storeNumber: string;
  operationalWeek: string;
  weekStarting: string;
  weekEnding: string;
  publicationId: string;
  publicationStatus: "unpublished" | "published";
  handoffId: string;
  handoffStatus: FloorCommandHandoffStatus;
  deadlineDate: string;
  publishedAssignmentCount: number;
  remainingZebraEntries: number;
  confirmedZebraEntries: number;
  assignments: readonly FloorCommandObservedAssignment[];
  deadlines: readonly FloorCommandObservedDeadline[];
  deadlinesAvailability: "ready" | "unavailable";
  reviewRequired: boolean;
  revision: string;
  readAt: string;
  sourceUpdatedAt: string | null;
  freshness: FloorCommandFreshness;
  dismissed: boolean;
  /** Pending, partial, or review-needed, and not dismissed for this revision. */
  attention: boolean;
  summary: string;
  returnHref: typeof FLOOR_COMMAND_THIS_WEEK_HREF;
};

export type FloorCommandObservationReading =
  | { status: "unobserved"; handoffs: readonly [] }
  | {
      status: "unavailable";
      readAt: string;
      reason: FloorCommandAttemptReason;
      handoffs: readonly [];
    }
  | {
      status: "stale";
      readAt: string;
      reason: FloorCommandAttemptReason;
      handoffs: readonly FloorCommandHandoffObservation[];
    }
  | { status: "fresh"; readAt: string; handoffs: readonly FloorCommandHandoffObservation[] };

export function emptyFloorCommandObservationMemory(
  connectedStoreNumber: string,
): FloorCommandObservationMemory {
  return {
    connectedStoreNumber: floorCommandStoreIdentity(connectedStoreNumber),
    handoffs: [],
    dismissals: [],
    lastAttempt: null,
  };
}

export function applyFloorCommandRead(
  memory: FloorCommandObservationMemory,
  read: FloorCommandRead,
): FloorCommandObservationMemory {
  if (read.availability === "unavailable") {
    return fail(memory, read.read_at, read.reason);
  }
  if (!isFloorCommandSnapshot(read.snapshot)) {
    const readAt = read.snapshot.freshness?.read_at;
    return fail(memory, typeof readAt === "string" ? readAt : "", "invalid_snapshot");
  }
  if (!memory.connectedStoreNumber) {
    return fail(memory, read.snapshot.freshness.read_at, "store_required");
  }
  if (!sameFloorCommandStore(memory.connectedStoreNumber, read.snapshot.store_number)) {
    return fail(memory, read.snapshot.freshness.read_at, "cross_store");
  }

  const snapshot = structuredClone(read.snapshot);
  const previous = memory.handoffs.find((row) => row.snapshot.handoff.id === snapshot.handoff.id);
  const sequenceOutcome = floorCommandSequenceOutcome(
    previous?.snapshot ?? null,
    snapshot,
    read.synchronization,
  );
  if (sequenceOutcome === "reject_older") return memory;
  if (sequenceOutcome === "ordering_withheld" || sequenceOutcome === "sequence_conflict") {
    return fail(memory, snapshot.freshness.read_at, sequenceOutcome);
  }
  if (sequenceOutcome === "legacy" && previous && retainsCurrentSnapshot(previous.snapshot, snapshot)) {
    return memory;
  }
  const deadlinesReady = snapshot.deadlines.availability === "ready";
  const retained: FloorCommandRetainedHandoff = {
    snapshot,
    supersededAssignments: mergeSuperseded(previous, snapshot),
    deadlines: deadlinesReady ? snapshot.deadlines.commitments : (previous?.deadlines ?? []),
    deadlinesAvailability: deadlinesReady ? "ready" : "unavailable",
  };
  const handoffs = [
    ...memory.handoffs.filter((row) => row.snapshot.handoff.id !== snapshot.handoff.id),
    retained,
  ].sort((a, b) => a.snapshot.handoff.id.localeCompare(b.snapshot.handoff.id));

  return {
    connectedStoreNumber: memory.connectedStoreNumber,
    handoffs,
    dismissals: memory.dismissals,
    lastAttempt: {
      readAt: snapshot.freshness.read_at,
      result: "success_complete",
      reason: null,
    },
  };
}

/** A failed attempt. The retained handoffs stay, including a withheld or unreachable source. */
export function noteFloorCommandObservationFailure(
  memory: FloorCommandObservationMemory,
  readAt: string,
  reason: FloorCommandAttemptReason,
): FloorCommandObservationMemory {
  return fail(memory, readAt, reason);
}

export function dismissFloorCommandRevision(
  memory: FloorCommandObservationMemory,
  dismissal: FloorCommandDismissal,
): FloorCommandObservationMemory {
  const handoffId = dismissal.handoffId.trim();
  const revision = dismissal.revision.trim();
  if (!handoffId || !revision) return memory;
  const exists = memory.dismissals.some(
    (row) => row.handoffId === handoffId && row.revision === revision,
  );
  if (exists) return memory;
  return {
    ...memory,
    dismissals: [...memory.dismissals, { handoffId, revision }],
  };
}

export function projectFloorCommandObservation(
  memory: FloorCommandObservationMemory,
): FloorCommandObservationReading {
  const attempt = memory.lastAttempt;
  if (attempt === null) {
    return { status: "unobserved", handoffs: [] };
  }
  if (attempt.result === "failure" && memory.handoffs.length === 0) {
    return {
      status: "unavailable",
      readAt: attempt.readAt,
      reason: attempt.reason ?? "assignments_unavailable",
      handoffs: [],
    };
  }
  const freshness: FloorCommandFreshness = attempt.result === "success_complete" ? "fresh" : "stale";
  const handoffs = memory.handoffs
    .map((row) => projectHandoff(row, memory.dismissals, freshness, attempt.readAt))
    .sort((a, b) => b.weekStarting.localeCompare(a.weekStarting) || a.handoffId.localeCompare(b.handoffId));
  if (freshness === "stale") {
    return {
      status: "stale",
      readAt: attempt.readAt,
      reason: attempt.reason ?? "assignments_unavailable",
      handoffs,
    };
  }
  return { status: "fresh", readAt: attempt.readAt, handoffs };
}

function fail(
  memory: FloorCommandObservationMemory,
  readAt: string,
  reason: FloorCommandAttemptReason,
): FloorCommandObservationMemory {
  return {
    connectedStoreNumber: memory.connectedStoreNumber,
    handoffs: memory.handoffs,
    dismissals: memory.dismissals,
    lastAttempt: { readAt, result: "failure", reason },
  };
}

function mergeSuperseded(
  previous: FloorCommandRetainedHandoff | undefined,
  snapshot: FloorCommandSnapshot,
): FloorCommandSupersededAssignment[] {
  const currentIds = new Set(snapshot.entries.map((entry) => entry.id));
  const retiredIds = new Set(explicitlyRetired(snapshot).map((row) => row.id));
  const kept = (previous?.supersededAssignments ?? []).filter(
    (row) => !currentIds.has(row.id) && !retiredIds.has(row.id),
  );
  const keptIds = new Set(kept.map((row) => row.id));
  const removed = (previous?.snapshot.entries ?? [])
    .filter((entry) => !currentIds.has(entry.id) && !retiredIds.has(entry.id) && !keptIds.has(entry.id))
    .map(supersededFrom);
  return [...kept, ...removed].sort((a, b) => a.id.localeCompare(b.id));
}

function explicitlyRetired(snapshot: FloorCommandSnapshot): FloorCommandSnapshot["retired"] {
  const currentIds = new Set(snapshot.entries.map((entry) => entry.id));
  return snapshot.retired.filter((row) => row.reason === "cleared" && !currentIds.has(row.id));
}

function supersededFrom(entry: FloorCommandAssignmentInput): FloorCommandSupersededAssignment {
  return {
    id: entry.id,
    assignmentId: entry.assignment_id,
    bayId: entry.bay_id,
    rosterSpecialistId: entry.roster_specialist_id,
    associateName: entry.associate_name,
  };
}

function projectHandoff(
  retained: FloorCommandRetainedHandoff,
  dismissals: readonly FloorCommandDismissal[],
  freshness: FloorCommandFreshness,
  attemptReadAt: string,
): FloorCommandHandoffObservation {
  const snapshot = retained.snapshot;
  const dismissed = dismissals.some(
    (row) => row.handoffId === snapshot.handoff.id && row.revision === snapshot.freshness.revision,
  );
  const deadlines = retained.deadlines.map(projectDeadline);
  const reviewRequired = deadlines.some((row) => row.reviewRequired);
  const attention =
    !dismissed &&
    (snapshot.handoff.status === "pending" ||
      snapshot.handoff.status === "partial" ||
      reviewRequired);
  const current = snapshot.entries.map((entry) => projectAssignment(entry, "current"));
  const retired = explicitlyRetired(snapshot).map(
    (row): FloorCommandObservedAssignment => ({
      id: row.id,
      assignmentId: row.assignment_id,
      bayId: row.bay_id,
      department: "",
      rosterSpecialistId: row.roster_specialist_id,
      associateName: "",
      zebraConfirmation: "unconfirmed",
      zebraTaskCompleted: false,
      deadlineId: null,
      lifecycle: "retired",
    }),
  );
  const superseded = retained.supersededAssignments.map(
    (row): FloorCommandObservedAssignment => ({
      id: row.id,
      assignmentId: row.assignmentId,
      bayId: row.bayId,
      department: "",
      rosterSpecialistId: row.rosterSpecialistId,
      associateName: row.associateName,
      zebraConfirmation: "unconfirmed",
      zebraTaskCompleted: false,
      deadlineId: null,
      lifecycle: "superseded",
    }),
  );
  return {
    source: FLOOR_COMMAND_SOURCE,
    correctionAuthority: "external",
    weekIdentity: FLOOR_COMMAND_WEEK_IDENTITY,
    storeNumber: floorCommandStoreIdentity(snapshot.store_number),
    operationalWeek: snapshot.operational_week,
    weekStarting: snapshot.week_starting,
    weekEnding: snapshot.week_ending,
    publicationId: snapshot.publication.id,
    publicationStatus: snapshot.publication.status,
    handoffId: snapshot.handoff.id,
    handoffStatus: snapshot.handoff.status,
    deadlineDate: snapshot.handoff.deadline_date,
    publishedAssignmentCount: snapshot.handoff.required_count,
    remainingZebraEntries: snapshot.handoff.outstanding_count,
    confirmedZebraEntries: snapshot.handoff.confirmed_count,
    assignments: [...current, ...retired, ...superseded],
    deadlines,
    deadlinesAvailability: retained.deadlinesAvailability,
    reviewRequired,
    revision: snapshot.freshness.revision,
    readAt: freshness === "fresh" ? snapshot.freshness.read_at : attemptReadAt,
    sourceUpdatedAt: snapshot.freshness.source_updated_at,
    freshness,
    dismissed,
    attention,
    summary: summaryFor(snapshot.handoff.status, snapshot.handoff.required_count, snapshot.handoff.outstanding_count),
    returnHref: FLOOR_COMMAND_THIS_WEEK_HREF,
  };
}

function projectAssignment(
  entry: FloorCommandAssignmentInput,
  lifecycle: "current",
): FloorCommandObservedAssignment {
  return {
    id: entry.id,
    assignmentId: entry.assignment_id,
    bayId: entry.bay_id,
    department: entry.department,
    rosterSpecialistId: entry.roster_specialist_id,
    associateName: entry.associate_name,
    zebraConfirmation: entry.zebra_confirmation,
    zebraTaskCompleted: false,
    deadlineId: entry.deadline?.id ?? null,
    lifecycle,
  };
}

function projectDeadline(row: FloorCommandDeadlineInput): FloorCommandObservedDeadline {
  return {
    id: row.id,
    rosterSpecialistId: row.roster_specialist_id,
    associateName: row.associate_name,
    targetDate: row.target_date,
    finalDate: row.final_date,
    reviewRequired: row.review_required,
    publishedEntryIds: row.published_entry_ids,
  };
}

/**
 * A different revision replaces the retained snapshot only when both source
 * times are present and the incoming time is the same or later. A missing
 * time on either side does not establish order.
 */
function weekSequenceOf(snapshot: FloorCommandSnapshot): number | null {
  const value = snapshot.freshness.week_sequence;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

/**
 * Sequence ordering applies when either side has a week sequence or the
 * producer marked synchronization. Snapshots with neither keep the older
 * timestamp rule so an unsequenced fixture still has a defined order.
 */
function floorCommandSequenceOutcome(
  retained: FloorCommandSnapshot | null,
  incoming: FloorCommandSnapshot,
  synchronization: "comparable" | "withheld" | undefined,
): "legacy" | "apply" | "reject_older" | "ordering_withheld" | "sequence_conflict" {
  const next = weekSequenceOf(incoming);
  const previous = retained ? weekSequenceOf(retained) : null;
  if (synchronization == null && next === null && previous === null) return "legacy";
  if (synchronization === "withheld" || next === null) return "ordering_withheld";
  if (!retained) return "apply";
  if (previous === null) return "ordering_withheld";
  if (next > previous) return "apply";
  if (next < previous) return "reject_older";
  if (retained.freshness.revision === incoming.freshness.revision) return "apply";
  return "sequence_conflict";
}

function retainsCurrentSnapshot(retained: FloorCommandSnapshot, incoming: FloorCommandSnapshot): boolean {
  if (retained.freshness.revision === incoming.freshness.revision) return false;
  const previousAt = instantMs(retained.freshness.source_updated_at);
  const incomingAt = instantMs(incoming.freshness.source_updated_at);
  if (previousAt === null || incomingAt === null) return true;
  return incomingAt < previousAt;
}

function instantMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function summaryFor(
  status: FloorCommandHandoffStatus,
  required: number,
  outstanding: number,
): string {
  if (status === "none") return "Nothing published for this week.";
  if (status === "complete") return `All ${required} entered in Zebra.`;
  if (status === "pending") return `None of ${required} entered in Zebra.`;
  return `${outstanding} of ${required} still to enter in Zebra.`;
}
