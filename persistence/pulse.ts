import type { SupabaseClient } from "@supabase/supabase-js";
import type { Commitment } from "@/domain/commitment";
import {
  deriveCommitmentStartThreshold,
  evaluateCommitmentStartPulseCondition,
  PULSE_SOURCE_KIND_COMMITMENT,
  PULSE_TRANSITION_KIND_START,
  requirePulseLeadChoice,
  requirePulseLeadOffsetSeconds,
  type InterruptGrant,
  type PulseOccurrence,
} from "@/domain/pulse";
import { formatLocalTime, parseLocalTime } from "@/domain/time/localTime";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const PULSE_INTERRUPT_GRANT_COLUMNS =
  "id, user_id, source_kind, source_id, transition_kind, lead_offset_seconds, established_at, revoked_at";

export const PULSE_OCCURRENCE_COLUMNS =
  "id, user_id, grant_id, source_kind, source_id, source_starts_on, source_start_local, threshold_at, source_start_at, established_at";

export type PulseInterruptGrantRow = {
  id: string;
  user_id: string;
  source_kind: string;
  source_id: string;
  transition_kind: string;
  lead_offset_seconds: number;
  established_at: string;
  revoked_at: string | null;
};

export type PulseOccurrenceRow = {
  id: string;
  user_id: string;
  grant_id: string | null;
  source_kind: string;
  source_id: string | null;
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
  if (row.source_kind !== PULSE_SOURCE_KIND_COMMITMENT) {
    throw new Error("This interrupt grant has an unsupported source kind.");
  }
  if (row.transition_kind !== PULSE_TRANSITION_KIND_START) {
    throw new Error("This interrupt grant has an unsupported transition.");
  }
  return {
    id: row.id,
    userId: row.user_id,
    sourceKind: PULSE_SOURCE_KIND_COMMITMENT,
    sourceId: row.source_id,
    transitionKind: PULSE_TRANSITION_KIND_START,
    leadOffsetSeconds: requirePulseLeadOffsetSeconds(row.lead_offset_seconds),
    establishedAt: row.established_at,
    revokedAt: row.revoked_at,
  };
}

export function rowToPulseOccurrence(row: PulseOccurrenceRow): PulseOccurrence {
  if (row.source_kind !== PULSE_SOURCE_KIND_COMMITMENT) {
    throw new Error("This Pulse occurrence has an unsupported source kind.");
  }
  return {
    id: row.id,
    userId: row.user_id,
    grantId: row.grant_id,
    sourceKind: PULSE_SOURCE_KIND_COMMITMENT,
    sourceId: row.source_id,
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
  const leadOffsetSeconds = requirePulseLeadChoice(input.leadOffsetSeconds);
  const userId = await requireUserId(client);

  const { data: existing, error: existingError } = await client
    .from("pulse_interrupt_grants")
    .select(PULSE_INTERRUPT_GRANT_COLUMNS)
    .eq("source_kind", PULSE_SOURCE_KIND_COMMITMENT)
    .eq("source_id", input.commitment.id)
    .eq("transition_kind", PULSE_TRANSITION_KIND_START)
    .is("revoked_at", null)
    .maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing) {
    throw new Error("A reminder is already set for this Commitment.");
  }

  const { data, error } = await client
    .from("pulse_interrupt_grants")
    .insert({
      user_id: userId,
      source_kind: PULSE_SOURCE_KIND_COMMITMENT,
      source_id: input.commitment.id,
      transition_kind: PULSE_TRANSITION_KIND_START,
      lead_offset_seconds: leadOffsetSeconds,
      established_at: input.establishedAt.toISOString(),
      revoked_at: null,
    })
    .select(PULSE_INTERRUPT_GRANT_COLUMNS)
    .single();

  return rowToInterruptGrant(unwrap(data, error));
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
  if (result !== "eligible") {
    return null;
  }

  const derived = deriveCommitmentStartThreshold({
    commitment: input.commitment,
    leadOffsetSeconds: input.grant.leadOffsetSeconds,
    timeZone: input.timeZone,
  });
  const userId = await requireUserId(client);
  const insertRow = {
    user_id: userId,
    grant_id: input.grant.id,
    source_kind: PULSE_SOURCE_KIND_COMMITMENT,
    source_id: input.commitment.id,
    source_starts_on: derived.identity.sourceStartsOn,
    source_start_local: localForDatabase(derived.identity.sourceStartLocal),
    threshold_at: derived.thresholdAt.toISOString(),
    source_start_at: derived.sourceStartAt.toISOString(),
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
    .eq("source_starts_on", derived.identity.sourceStartsOn)
    .eq("source_start_local", localForDatabase(derived.identity.sourceStartLocal))
    .maybeSingle();
  if (readError) {
    throw new Error(readError.message);
  }
  if (!existing) {
    throw new Error("The Pulse occurrence could not be established.");
  }
  return rowToPulseOccurrence(existing);
}

export async function establishEligiblePulseOccurrences(
  client: SupabaseClient,
  input: {
    grants: readonly InterruptGrant[];
    commitments: readonly Commitment[];
    occurrences: readonly PulseOccurrence[];
    timeZone: string;
    now: Date;
  },
): Promise<PulseOccurrence[]> {
  const established: PulseOccurrence[] = [];
  let known = [...input.occurrences];
  for (const grant of input.grants) {
    if (grant.revokedAt !== null) continue;
    if (grant.sourceKind !== PULSE_SOURCE_KIND_COMMITMENT) continue;
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
  }
  return established;
}
