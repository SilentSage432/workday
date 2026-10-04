import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";

/**
 * One provider page. Matches `max_rows` in `supabase/config.toml`.
 * A requested page larger than that cap would come back short and would be
 * rejected, so this size stays at the configured cap.
 */
export const TEMPORAL_PAGE_SIZE = 1000;

export type CivilDateWindow = {
  from?: string;
  to?: string;
};

export type CountedPage<T> = {
  rows: readonly T[];
  total: number | null;
};

type OrderedPageQuery = {
  gte: (column: string, value: string) => OrderedPageQuery;
  lte: (column: string, value: string) => OrderedPageQuery;
  order: (column: string, options: { ascending: boolean }) => OrderedPageQuery;
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
    count: number | null;
  }>;
};

export function requireCivilWindow(window?: CivilDateWindow): { from?: string; to?: string } {
  const from = window?.from === undefined ? undefined : formatCivilDate(parseCivilDate(window.from));
  const to = window?.to === undefined ? undefined : formatCivilDate(parseCivilDate(window.to));
  if (from !== undefined && to !== undefined && from > to) {
    throw new Error("A temporal read needs a real date range.");
  }
  return { from, to };
}

/**
 * Reads every row of one ordered query.
 * Completeness is the reported total, not a short page and not an assumed provider cap.
 * A later page that fails, a missing total, or a total that changes throws.
 * The accumulated rows are not returned.
 */
export async function readCompleteCollection<T>(input: {
  pageSize: number;
  readPage: (offset: number, pageSize: number) => Promise<CountedPage<T>>;
}): Promise<T[]> {
  if (!Number.isInteger(input.pageSize) || input.pageSize < 1) {
    throw new Error("A temporal read needs a page size.");
  }

  const collected: T[] = [];
  let expected: number | null = null;
  let offset = 0;

  for (;;) {
    const page = await input.readPage(offset, input.pageSize);
    if (page.total == null || !Number.isInteger(page.total) || page.total < 0) {
      throw new Error("A temporal read did not report its complete size.");
    }
    if (page.rows.length > input.pageSize) {
      throw new Error("A temporal read returned more rows than requested.");
    }
    if (expected == null) {
      expected = page.total;
    } else if (page.total !== expected) {
      throw new Error("A temporal read changed before it was complete.");
    }

    if (page.rows.length === 0) {
      if (collected.length === expected) return collected;
      throw new Error("A temporal read stopped before it was complete.");
    }

    for (const row of page.rows) collected.push(row);

    if (collected.length === expected) return collected;
    if (collected.length > expected) {
      throw new Error("A temporal read returned more rows than it reported.");
    }
    if (page.rows.length < input.pageSize) {
      throw new Error("A temporal read stopped before it was complete.");
    }

    offset += page.rows.length;
  }
}

export async function readCompleteDateRows(input: {
  client: SupabaseClient;
  table: string;
  columns: string;
  dateColumn: string;
  tieBreakColumns: readonly string[];
  from?: string;
  to?: string;
}): Promise<unknown[]> {
  return readCompleteCollection({
    pageSize: TEMPORAL_PAGE_SIZE,
    readPage: async (offset, pageSize) => {
      let query = input.client
        .from(input.table)
        .select(input.columns, { count: "exact" }) as unknown as OrderedPageQuery;
      if (input.from !== undefined) query = query.gte(input.dateColumn, input.from);
      if (input.to !== undefined) query = query.lte(input.dateColumn, input.to);
      query = query.order(input.dateColumn, { ascending: true });
      for (const column of input.tieBreakColumns) {
        query = query.order(column, { ascending: true });
      }
      const { data, error, count } = await query.range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], total: count };
    },
  });
}
