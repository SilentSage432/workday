import type { SupabaseClient } from "@supabase/supabase-js";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import { requireTaskServiceTaskId } from "@/domain/executionDirection";
import { readCompleteCollection, TEMPORAL_PAGE_SIZE } from "@/persistence/completeRead";

export const CITED_TASK_COLUMNS = "id, title";

type CitedTaskRow = {
  id: string;
  title: string;
};

function uniqueTaskIds(taskIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const taskId of taskIds) {
    const id = requireTaskServiceTaskId(taskId);
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function rowToCitedTaskIdentity(row: CitedTaskRow): CitedTaskIdentity {
  const id = requireTaskServiceTaskId(row.id);
  if (row.title.trim().length === 0) {
    throw new Error("A task title is required.");
  }
  return { id, title: row.title };
}

/**
 * Identity and title for the requested Tasks, including completed Tasks.
 * An empty request reads nothing and returns nothing.
 * The result is only those identities. Order is `id` ascending.
 * That order is retrieval order. It is not rank or progress.
 * A short page, a failed page, or a missing requested identity throws.
 */
export async function loadCitedTaskIdentities(
  client: SupabaseClient,
  taskIds: readonly string[],
): Promise<CitedTaskIdentity[]> {
  const ids = uniqueTaskIds(taskIds);
  if (ids.length === 0) return [];

  const rows = await readCompleteCollection<CitedTaskRow>({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      const { data, error, count } = await client
        .from("tasks")
        .select(CITED_TASK_COLUMNS, { count: "exact" })
        .in("id", ids)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as CitedTaskRow[], total: count };
    },
  });

  const identities = rows.map(rowToCitedTaskIdentity);
  const found = new Set(identities.map((identity) => identity.id));
  if (ids.some((id) => !found.has(id))) {
    throw new Error("A cited task identity is missing.");
  }
  return identities;
}
