import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireOptionalContextId,
  requireStewardshipContent,
  requireStewardshipCycleKey,
  requireStewardshipCycleKind,
  requireStewardshipId,
  requireStewardshipInstant,
  requireStewardshipInstantText,
  type NewStewardshipDefinition,
  type StewardshipCycleKind,
  type StewardshipDefinition,
  type StewardshipDefinitionRevision,
  type StewardshipOccurrenceIdentity,
  type StewardshipSatisfaction,
} from "@/domain/stewardship";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const STEWARDSHIP_DEFINITION_COLUMNS =
  "id, cycle_kind, context_id, established_at, retired_at";
export const STEWARDSHIP_REVISION_COLUMNS = "id, definition_id, content, effective_at";
export const STEWARDSHIP_SATISFACTION_COLUMNS =
  "definition_id, cycle_kind, cycle_key, satisfied_at";

export type StewardshipDefinitionRow = {
  id: string;
  cycle_kind: string;
  context_id: string | null;
  established_at: string;
  retired_at: string | null;
};

export type StewardshipRevisionRow = {
  id: string;
  definition_id: string;
  content: string;
  effective_at: string;
};

export type StewardshipSatisfactionRow = {
  definition_id: string;
  cycle_kind: string;
  cycle_key: string;
  satisfied_at: string;
};

export type StewardshipDefinitionInsertRow = {
  id: string;
  user_id: string;
  cycle_kind: StewardshipCycleKind;
  context_id: string | null;
  established_at: string;
  retired_at: null;
};

export type StewardshipRevisionInsertRow = {
  id: string;
  definition_id: string;
  user_id: string;
  content: string;
  effective_at: string;
};

export type StewardshipSatisfactionInsertRow = {
  user_id: string;
  definition_id: string;
  cycle_kind: StewardshipCycleKind;
  cycle_key: string;
  satisfied_at: string;
};

export type EstablishedStewardship = {
  definition: StewardshipDefinition;
  revision: StewardshipDefinitionRevision;
};

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

export function rowToStewardshipDefinition(row: StewardshipDefinitionRow): StewardshipDefinition {
  return {
    id: requireStewardshipId(row.id),
    cycleKind: requireStewardshipCycleKind(row.cycle_kind),
    contextId: row.context_id,
    establishedAt: requireStewardshipInstantText(row.established_at, "Definition establishment"),
    retiredAt:
      row.retired_at === null
        ? null
        : requireStewardshipInstantText(row.retired_at, "Definition retirement"),
  };
}

export function rowToStewardshipRevision(row: StewardshipRevisionRow): StewardshipDefinitionRevision {
  return {
    id: requireStewardshipId(row.id, "stewardship revision"),
    definitionId: requireStewardshipId(row.definition_id),
    content: requireStewardshipContent(row.content),
    effectiveAt: requireStewardshipInstantText(row.effective_at, "Revision effectiveness"),
  };
}

export function rowToStewardshipSatisfaction(row: StewardshipSatisfactionRow): StewardshipSatisfaction {
  return {
    definitionId: requireStewardshipId(row.definition_id),
    cycleKind: requireStewardshipCycleKind(row.cycle_kind),
    cycleKey: requireStewardshipCycleKey(row.cycle_key),
    satisfiedAt: requireStewardshipInstantText(row.satisfied_at, "Satisfaction"),
  };
}

export function toStewardshipDefinitionInsert(
  userId: string,
  input: NewStewardshipDefinition,
): StewardshipDefinitionInsertRow {
  return {
    id: requireStewardshipId(input.id),
    user_id: userId,
    cycle_kind: requireStewardshipCycleKind(input.cycleKind),
    context_id: requireOptionalContextId(input.contextId),
    established_at: requireStewardshipInstant(input.establishedAt, "Definition establishment"),
    retired_at: null,
  };
}

export function toStewardshipRevisionInsert(
  userId: string,
  input: {
    id: string;
    definitionId: string;
    content: string;
    effectiveAt: Date;
  },
): StewardshipRevisionInsertRow {
  return {
    id: requireStewardshipId(input.id, "stewardship revision"),
    definition_id: requireStewardshipId(input.definitionId),
    user_id: userId,
    content: requireStewardshipContent(input.content),
    effective_at: requireStewardshipInstant(input.effectiveAt, "Revision effectiveness"),
  };
}

export function toStewardshipSatisfactionInsert(
  userId: string,
  input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
    satisfiedAt: Date;
  },
): StewardshipSatisfactionInsertRow {
  return {
    user_id: userId,
    definition_id: requireStewardshipId(input.definitionId),
    cycle_kind: requireStewardshipCycleKind(input.cycleKind),
    cycle_key: requireStewardshipCycleKey(input.cycleKey),
    satisfied_at: requireStewardshipInstant(input.satisfiedAt, "Satisfaction"),
  };
}

/**
 * Every stewardship definition for the signed-in user.
 * Order is established_at ascending, then id ascending. Retrieval order only.
 */
export async function loadStewardshipDefinitions(
  client: SupabaseClient,
): Promise<StewardshipDefinition[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("stewardship_definitions")
        .select(STEWARDSHIP_DEFINITION_COLUMNS, { count: "exact" })
        .order("established_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as StewardshipDefinitionRow[], total: count };
    },
  });
  return rows.map(rowToStewardshipDefinition);
}

/**
 * Every revision for the signed-in user.
 * Order is effective_at ascending, then id ascending. Retrieval order only.
 */
export async function loadStewardshipDefinitionRevisions(
  client: SupabaseClient,
): Promise<StewardshipDefinitionRevision[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("stewardship_definition_revisions")
        .select(STEWARDSHIP_REVISION_COLUMNS, { count: "exact" })
        .order("effective_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as StewardshipRevisionRow[], total: count };
    },
  });
  return rows.map(rowToStewardshipRevision);
}

/**
 * Every satisfaction Fact for the signed-in user.
 * Order is satisfied_at ascending, then definition_id, cycle_kind, cycle_key.
 */
export async function loadStewardshipSatisfactions(
  client: SupabaseClient,
): Promise<StewardshipSatisfaction[]> {
  const rows = await readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("stewardship_satisfactions")
        .select(STEWARDSHIP_SATISFACTION_COLUMNS, { count: "exact" })
        .order("satisfied_at", { ascending: true })
        .order("definition_id", { ascending: true })
        .order("cycle_kind", { ascending: true })
        .order("cycle_key", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) {
        throw new Error(error.message);
      }
      return { rows: (data ?? []) as StewardshipSatisfactionRow[], total: count };
    },
  });
  return rows.map(rowToStewardshipSatisfaction);
}

/**
 * Establishes a definition and its first revision at the same human instant.
 */
export async function establishStewardshipDefinition(
  client: SupabaseClient,
  input: NewStewardshipDefinition,
): Promise<EstablishedStewardship> {
  const userId = await requireUserId(client);
  const definitionRow = toStewardshipDefinitionInsert(userId, input);
  const revisionRow = toStewardshipRevisionInsert(userId, {
    id: input.revisionId,
    definitionId: input.id,
    content: input.content,
    effectiveAt: input.establishedAt,
  });

  const { data: definitionData, error: definitionError } = await client
    .from("stewardship_definitions")
    .insert(definitionRow)
    .select(STEWARDSHIP_DEFINITION_COLUMNS)
    .single();
  const definition = rowToStewardshipDefinition(
    unwrap(definitionData, definitionError) as StewardshipDefinitionRow,
  );

  const { data: revisionData, error: revisionError } = await client
    .from("stewardship_definition_revisions")
    .insert(revisionRow)
    .select(STEWARDSHIP_REVISION_COLUMNS)
    .single();
  const revision = rowToStewardshipRevision(
    unwrap(revisionData, revisionError) as StewardshipRevisionRow,
  );

  return { definition, revision };
}

/**
 * Appends a forward wording revision. Does not rewrite prior revisions.
 */
export async function editStewardshipDefinitionForward(
  client: SupabaseClient,
  input: {
    definitionId: string;
    revisionId: string;
    content: string;
    effectiveAt: Date;
  },
): Promise<StewardshipDefinitionRevision> {
  const userId = await requireUserId(client);
  const row = toStewardshipRevisionInsert(userId, {
    id: input.revisionId,
    definitionId: input.definitionId,
    content: input.content,
    effectiveAt: input.effectiveAt,
  });
  const { data, error } = await client
    .from("stewardship_definition_revisions")
    .insert(row)
    .select(STEWARDSHIP_REVISION_COLUMNS)
    .single();
  return rowToStewardshipRevision(unwrap(data, error) as StewardshipRevisionRow);
}

/**
 * Retires a definition. Idempotent when already retired with the same or earlier instant.
 * Does not satisfy occurrences. V1 does not unretire.
 */
export async function retireStewardshipDefinition(
  client: SupabaseClient,
  input: { definitionId: string; retiredAt: Date },
): Promise<StewardshipDefinition> {
  await requireUserId(client);
  const definitionId = requireStewardshipId(input.definitionId);
  const retiredAt = requireStewardshipInstant(input.retiredAt, "Definition retirement");

  const { data: existing, error: readError } = await client
    .from("stewardship_definitions")
    .select(STEWARDSHIP_DEFINITION_COLUMNS)
    .eq("id", definitionId)
    .single();
  const current = rowToStewardshipDefinition(unwrap(existing, readError) as StewardshipDefinitionRow);
  if (current.retiredAt !== null) {
    return current;
  }

  const { data, error } = await client
    .from("stewardship_definitions")
    .update({ retired_at: retiredAt })
    .eq("id", definitionId)
    .is("retired_at", null)
    .select(STEWARDSHIP_DEFINITION_COLUMNS)
    .single();
  return rowToStewardshipDefinition(unwrap(data, error) as StewardshipDefinitionRow);
}

/**
 * Satisfies one occurrence. Duplicate satisfy preserves the first satisfied_at.
 */
export async function satisfyStewardshipOccurrence(
  client: SupabaseClient,
  input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
    satisfiedAt: Date;
  },
): Promise<StewardshipSatisfaction> {
  const userId = await requireUserId(client);
  const row = toStewardshipSatisfactionInsert(userId, input);
  const { error } = await client.from("stewardship_satisfactions").upsert(row, {
    onConflict: "user_id,definition_id,cycle_kind,cycle_key",
    ignoreDuplicates: true,
  });
  if (error) {
    throw new Error(error.message);
  }

  const { data: existing, error: readError } = await client
    .from("stewardship_satisfactions")
    .select(STEWARDSHIP_SATISFACTION_COLUMNS)
    .eq("definition_id", row.definition_id)
    .eq("cycle_kind", row.cycle_kind)
    .eq("cycle_key", row.cycle_key)
    .single();
  return rowToStewardshipSatisfaction(unwrap(existing, readError) as StewardshipSatisfactionRow);
}

/**
 * Withdraws satisfaction for one occurrence. Missing Fact is a no-op success.
 */
export async function withdrawStewardshipSatisfaction(
  client: SupabaseClient,
  identity: StewardshipOccurrenceIdentity,
): Promise<void> {
  await requireUserId(client);
  const definitionId = requireStewardshipId(identity.definitionId);
  const cycleKind = requireStewardshipCycleKind(identity.cycleKind);
  const cycleKey = requireStewardshipCycleKey(identity.cycleKey);
  const { error } = await client
    .from("stewardship_satisfactions")
    .delete()
    .eq("definition_id", definitionId)
    .eq("cycle_kind", cycleKind)
    .eq("cycle_key", cycleKey);
  if (error) {
    throw new Error(error.message);
  }
}
