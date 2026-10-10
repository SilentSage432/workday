import type { SupabaseClient } from "@supabase/supabase-js";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import {
  deriveTimedStartThreshold,
  evaluateBlockStartPulseCondition,
  evaluateCommitmentStartPulseCondition,
  PULSE_RELATIONSHIP_RELATIVE_BEFORE,
  PULSE_SOURCE_KIND_BLOCK,
  PULSE_SOURCE_KIND_COMMITMENT,
  PULSE_TRANSITION_KIND_START,
  requireGrantLeadForRelationship,
  requirePulseLeadChoice,
  requirePulseRelationship,
  requirePulseSourceKind,
  startPulseIsDueForEstablishment,
  type InterruptGrant,
  type PulseOccurrence,
  type PulseSourceKind,
} from "@/domain/pulse";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const PULSE_INTERRUPT_GRANT_COLUMNS =
  "id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at, revoked_at";

export const PULSE_OCCURRENCE_COLUMNS =
  "id, user_id, grant_id, source_kind, source_id, relationship, source_starts_on, source_start_local, threshold_at, source_start_at, established_at";

export type PulseInterruptGrantRow = {
  id: string;
  user_id: string;
  source_kind: string;
  source_id: string;
  transition_kind: string;
  relationship: string;
  lead_offset_seconds: number | null;
  established_at: string;
  revoked_at: string | null;
};

export type PulseOccurrenceRow = {
  id: string;
  user_id: string;
  grant_id: string | null;
  source_kind: string;
  source_id: string | null;
  relationship: string;
  source_starts_on: string;
  source_start_local: string;
  threshold_at: string;
  source_start_at: string;
  established_at: string;
};

function localFromDatabase(value: string): string {
  return formatLocalTime(parseLocalTime(value));
}

function localForDatabase(value: string): string {
  return `${formatLocalTime(parseLocalTime(value))}:00`;
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("A signed-in user is required.");
  }
  return data.user.id;
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("The database returned no row.");
  }
  return data;
}

export function rowToInterruptGrant(row: PulseInterruptGrantRow): InterruptGrant {
  const sourceKind = requirePulseSourceKind(row.source_kind);
  if (row.transition_kind !== PULSE_TRANSITION_KIND_START) {
    throw new Error("This interrupt grant has an unsupported transition.");
  }
  const relationship = requirePulseRelationship(row.relationship);
  const leadOffsetSeconds = requireGrantLeadForRelationship(
    relationship,
    row.lead_offset_seconds,
  );
  return {
    id: row.id,
    userId: row.user_id,
    sourceKind,
    sourceId: row.source_id,
    transitionKind: PULSE_TRANSITION_KIND_START,
    relationship,
    leadOffsetSeconds,
    establishedAt: row.established_at,
    revokedAt: row.revoked_at,
  };
}

export function rowToPulseOccurrence(row: PulseOccurrenceRow): PulseOccurrence {
  const sourceKind = requirePulseSourceKind(row.source_kind);
  const relationship = requirePulseRelationship(row.relationship);
  return {
    id: row.id,
    userId: row.user_id,
    grantId: row.grant_id,
    sourceKind,
    sourceId: row.source_id,
    relationship,
    sourceStartsOn: row.source_starts_on,
    sourceStartLocal: localFromDatabase(row.source_start_local),
    thresholdAt: row.threshold_at,
    sourceStartAt: row.source_start_at,
    establishedAt: row.established_at,
  };
}

export async function loadInterruptGrants(client: SupabaseClient): Promise<InterruptGrant[]> {
  const rows = await readCompleteCollection<PulseInterruptGrantRow>({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("pulse_interrupt_grants")
        .select(PULSE_INTERRUPT_GRANT_COLUMNS, { count: "exact" })
        .order("established_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as PulseInterruptGrantRow[], total: count };
    },
  });
  return rows.map(rowToInterruptGrant);
}

export async function loadActiveInterruptGrants(client: SupabaseClient): Promise<InterruptGrant[]> {
  const rows = await readCompleteCollection<PulseInterruptGrantRow>({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("pulse_interrupt_grants")
        .select(PULSE_INTERRUPT_GRANT_COLUMNS, { count: "exact" })
        .is("revoked_at", null)
        .order("established_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as PulseInterruptGrantRow[], total: count };
    },
  });
  return rows.map(rowToInterruptGrant);
}

export async function loadPulseOccurrences(client: SupabaseClient): Promise<PulseOccurrence[]> {
  const rows = await readCompleteCollection<PulseOccurrenceRow>({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("pulse_occurrences")
        .select(PULSE_OCCURRENCE_COLUMNS, { count: "exact" })
        .order("established_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as PulseOccurrenceRow[], total: count };
    },
  });
  return rows.map(rowToPulseOccurrence);
}

/**
 * Human Reach-me / Reminder authority path.
 * Always writes relationship = relative_before with a positive lead choice.
 * ARRIVAL is not creatable through this production surface.
 */
async function establishStartInterruptGrant(
  client: SupabaseClient,
  input: {
    sourceKind: PulseSourceKind;
    sourceId: string;
    leadOffsetSeconds: number;
    establishedAt: Date;
    alreadyActiveMessage: string;
  },
): Promise<InterruptGrant> {
  const leadOffsetSeconds = requirePulseLeadChoice(input.leadOffsetSeconds);
  const userId = await requireUserId(client);

  const { data: existing, error: existingError } = await client
    .from("pulse_interrupt_grants")
    .select(PULSE_INTERRUPT_GRANT_COLUMNS)
    .eq("source_kind", input.sourceKind)
    .eq("source_id", input.sourceId)
    .eq("transition_kind", PULSE_TRANSITION_KIND_START)
    .eq("relationship", PULSE_RELATIONSHIP_RELATIVE_BEFORE)
    .is("revoked_at", null)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing) {
    throw new Error(input.alreadyActiveMessage);
  }

  const { data, error } = await client
    .from("pulse_interrupt_grants")
    .insert({
      user_id: userId,
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      transition_kind: PULSE_TRANSITION_KIND_START,
      relationship: PULSE_RELATIONSHIP_RELATIVE_BEFORE,
      lead_offset_seconds: leadOffsetSeconds,
      established_at: input.establishedAt.toISOString(),
      revoked_at: null,
    })
    .select(PULSE_INTERRUPT_GRANT_COLUMNS)
    .single();

  return rowToInterruptGrant(unwrap(data, error));
}

export async function establishCommitmentStartInterruptGrant(
  client: SupabaseClient,
  input: {
    commitment: Commitment;
    leadOffsetSeconds: number;
    establishedAt: Date;
  },
): Promise<InterruptGrant> {
  if (input.commitment.kind !== "timed") {
    throw new Error("Reminders before a Commitment start need a timed Commitment.");
  }
  return establishStartInterruptGrant(client, {
    sourceKind: PULSE_SOURCE_KIND_COMMITMENT,
    sourceId: input.commitment.id,
    leadOffsetSeconds: input.leadOffsetSeconds,
    establishedAt: input.establishedAt,
    alreadyActiveMessage: "A reminder is already set for this Commitment.",
  });
}

export async function establishBlockStartInterruptGrant(
  client: SupabaseClient,
  input: {
    block: Block;
    leadOffsetSeconds: number;
    establishedAt: Date;
  },
): Promise<InterruptGrant> {
  if (input.block.kind !== "timed") {
    throw new Error("Reach me before a Block start needs a timed Block.");
  }
  return establishStartInterruptGrant(client, {
    sourceKind: PULSE_SOURCE_KIND_BLOCK,
    sourceId: input.block.id,
    leadOffsetSeconds: input.leadOffsetSeconds,
    establishedAt: input.establishedAt,
    alreadyActiveMessage: "Reach me is already set for this Block.",
  });
}

export async function revokeInterruptGrant(
  client: SupabaseClient,
  grantId: string,
  revokedAt: Date,
): Promise<InterruptGrant> {
  const { data, error } = await client
    .from("pulse_interrupt_grants")
    .update({ revoked_at: revokedAt.toISOString() })
    .eq("id", grantId)
    .is("revoked_at", null)
    .select(PULSE_INTERRUPT_GRANT_COLUMNS)
    .single();

  return rowToInterruptGrant(unwrap(data, error));
}

async function upsertPulseOccurrence(
  client: SupabaseClient,
  input: {
    grant: InterruptGrant;
    sourceKind: PulseSourceKind;
    sourceId: string;
    identity: { sourceStartsOn: string; sourceStartLocal: string };
    thresholdAt: Date;
    sourceStartAt: Date;
    now: Date;
    occurrences: readonly PulseOccurrence[];
  },
): Promise<PulseOccurrence | null> {
  const matching = input.occurrences.some(
    (occurrence) =>
      occurrence.grantId === input.grant.id &&
      occurrence.sourceStartsOn === input.identity.sourceStartsOn &&
      occurrence.sourceStartLocal === input.identity.sourceStartLocal,
  );
  if (matching) return null;

  const userId = await requireUserId(client);
  const insertRow = {
    user_id: userId,
    grant_id: input.grant.id,
    source_kind: input.sourceKind,
    source_id: input.sourceId,
    relationship: input.grant.relationship,
    source_starts_on: input.identity.sourceStartsOn,
    source_start_local: localForDatabase(input.identity.sourceStartLocal),
    threshold_at: input.thresholdAt.toISOString(),
    source_start_at: input.sourceStartAt.toISOString(),
    established_at: input.now.toISOString(),
  };

  const { data, error } = await client
    .from("pulse_occurrences")
    .upsert(insertRow, {
      onConflict: "grant_id,source_starts_on,source_start_local",
      ignoreDuplicates: true,
    })
    .select(PULSE_OCCURRENCE_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    return rowToPulseOccurrence(data);
  }

  const { data: existing, error: readError } = await client
    .from("pulse_occurrences")
    .select(PULSE_OCCURRENCE_COLUMNS)
    .eq("grant_id", input.grant.id)
    .eq("source_starts_on", input.identity.sourceStartsOn)
    .eq("source_start_local", localForDatabase(input.identity.sourceStartLocal))
    .maybeSingle();
  if (readError) {
    throw new Error(readError.message);
  }
  if (!existing) {
    throw new Error("The Pulse occurrence could not be established.");
  }
  return rowToPulseOccurrence(existing);
}

function deriveThresholdForGrant(input: {
  grant: InterruptGrant;
  startsOn: string;
  startLocal: string;
  timeZone: string;
}): { thresholdAt: Date; sourceStartAt: Date; identity: { sourceStartsOn: string; sourceStartLocal: string } } {
  return deriveTimedStartThreshold({
    startsOn: input.startsOn,
    startLocal: input.startLocal,
    relationship: input.grant.relationship,
    leadOffsetSeconds: input.grant.leadOffsetSeconds,
    timeZone: input.timeZone,
  });
}

export async function ensurePulseOccurrenceForEligibleGrant(
  client: SupabaseClient,
  input: {
    grant: InterruptGrant;
    commitment: Extract<Commitment, { kind: "timed" }>;
    timeZone: string;
    now: Date;
    occurrences: readonly PulseOccurrence[];
  },
): Promise<PulseOccurrence | null> {
  const result = evaluateCommitmentStartPulseCondition({
    grant: input.grant,
    commitment: input.commitment,
    timeZone: input.timeZone,
    now: input.now,
    occurrences: input.occurrences,
    readsComplete: true,
  });
  if (!startPulseIsDueForEstablishment(result)) {
    return null;
  }

  const derived = deriveThresholdForGrant({
    grant: input.grant,
    startsOn: input.commitment.startsOn,
    startLocal: input.commitment.startLocal,
    timeZone: input.timeZone,
  });
  return upsertPulseOccurrence(client, {
    grant: input.grant,
    sourceKind: PULSE_SOURCE_KIND_COMMITMENT,
    sourceId: input.commitment.id,
    identity: derived.identity,
    thresholdAt: derived.thresholdAt,
    sourceStartAt: derived.sourceStartAt,
    now: input.now,
    occurrences: input.occurrences,
  });
}

export async function ensurePulseOccurrenceForEligibleBlockGrant(
  client: SupabaseClient,
  input: {
    grant: InterruptGrant;
    block: Extract<Block, { kind: "timed" }>;
    timeZone: string;
    now: Date;
    occurrences: readonly PulseOccurrence[];
  },
): Promise<PulseOccurrence | null> {
  const result = evaluateBlockStartPulseCondition({
    grant: input.grant,
    block: input.block,
    timeZone: input.timeZone,
    now: input.now,
    occurrences: input.occurrences,
    readsComplete: true,
  });
  if (!startPulseIsDueForEstablishment(result)) {
    return null;
  }

  const derived = deriveThresholdForGrant({
    grant: input.grant,
    startsOn: input.block.startsOn,
    startLocal: input.block.startLocal,
    timeZone: input.timeZone,
  });
  return upsertPulseOccurrence(client, {
    grant: input.grant,
    sourceKind: PULSE_SOURCE_KIND_BLOCK,
    sourceId: input.block.id,
    identity: derived.identity,
    thresholdAt: derived.thresholdAt,
    sourceStartAt: derived.sourceStartAt,
    now: input.now,
    occurrences: input.occurrences,
  });
}

export async function establishEligiblePulseOccurrences(
  client: SupabaseClient,
  input: {
    grants: readonly InterruptGrant[];
    commitments: readonly Commitment[];
    blocks?: readonly Block[];
    occurrences: readonly PulseOccurrence[];
    timeZone: string;
    now: Date;
  },
): Promise<PulseOccurrence[]> {
  const established: PulseOccurrence[] = [];
  let known = [...input.occurrences];
  const blocks = input.blocks ?? [];

  for (const grant of input.grants) {
    if (grant.revokedAt !== null) continue;

    if (grant.sourceKind === PULSE_SOURCE_KIND_COMMITMENT) {
      const commitment = input.commitments.find((row) => row.id === grant.sourceId) ?? null;
      if (!commitment || commitment.kind !== "timed") continue;
      const occurrence = await ensurePulseOccurrenceForEligibleGrant(client, {
        grant,
        commitment,
        timeZone: input.timeZone,
        now: input.now,
        occurrences: known,
      });
      if (occurrence) {
        established.push(occurrence);
        known = [...known, occurrence];
      }
      continue;
    }

    if (grant.sourceKind === PULSE_SOURCE_KIND_BLOCK) {
      const block = blocks.find((row) => row.id === grant.sourceId) ?? null;
      if (!block || block.kind !== "timed") continue;
      const occurrence = await ensurePulseOccurrenceForEligibleBlockGrant(client, {
        grant,
        block,
        timeZone: input.timeZone,
        now: input.now,
        occurrences: known,
      });
      if (occurrence) {
        established.push(occurrence);
        known = [...known, occurrence];
      }
    }
  }
  return established;
}
