import { describe, expect, it } from "vitest";
import { readCompleteCollection, type CountedPage } from "@/persistence/completeRead";

type Row = {
  startsOn: string;
  createdAt: string;
  id: string;
};

function compare(left: Row, right: Row): number {
  return (
    left.startsOn.localeCompare(right.startsOn) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function orderedPage(rows: readonly Row[], offset: number, pageSize: number): CountedPage<Row> {
  const ordered = [...rows].sort(compare);
  return { rows: ordered.slice(offset, offset + pageSize), total: ordered.length };
}

function row(id: string, startsOn: string, createdAt = "2026-10-01T00:00:00.000Z"): Row {
  return { id, startsOn, createdAt };
}

describe("complete collection reads", () => {
  it("reads every row when the collection is larger than one page", async () => {
    const rows = [row("a", "2026-10-01"), row("b", "2026-10-02"), row("c", "2026-10-03")];
    const result = await readCompleteCollection({
      pageSize: 2,
      readPage: (offset, pageSize) => Promise.resolve(orderedPage(rows, offset, pageSize)),
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("reads a collection that fills the page exactly", async () => {
    const rows = [row("a", "2026-10-01"), row("b", "2026-10-02")];
    let calls = 0;
    const result = await readCompleteCollection({
      pageSize: 2,
      readPage: (offset, pageSize) => {
        calls += 1;
        return Promise.resolve(orderedPage(rows, offset, pageSize));
      },
    });
    expect(result).toHaveLength(2);
    expect(calls).toBe(1);
  });

  it("reads a collection one row shorter than a page", async () => {
    const rows = [row("a", "2026-10-01")];
    let calls = 0;
    const result = await readCompleteCollection({
      pageSize: 2,
      readPage: (offset, pageSize) => {
        calls += 1;
        return Promise.resolve(orderedPage(rows, offset, pageSize));
      },
    });
    expect(result.map((entry) => entry.id)).toEqual(["a"]);
    expect(calls).toBe(1);
  });

  it("keeps deterministic order across pages", async () => {
    const rows = [
      row("m", "2026-10-03", "2026-10-01T00:00:00.000Z"),
      row("a", "2026-10-01", "2026-10-03T00:00:00.000Z"),
      row("z", "2026-10-02", "2026-10-01T00:00:00.000Z"),
    ];
    const result = await readCompleteCollection({
      pageSize: 2,
      readPage: (offset, pageSize) => Promise.resolve(orderedPage(rows, offset, pageSize)),
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "z", "m"]);
  });

  it("keeps every row that shares the primary ordering value", async () => {
    const rows = [
      row("b", "2026-10-03", "2026-10-01T00:00:00.000Z"),
      row("a", "2026-10-03", "2026-10-01T00:00:00.000Z"),
      row("c", "2026-10-03", "2026-10-02T00:00:00.000Z"),
      row("d", "2026-10-03", "2026-10-01T00:00:00.000Z"),
    ];
    const result = await readCompleteCollection({
      pageSize: 2,
      readPage: (offset, pageSize) => Promise.resolve(orderedPage(rows, offset, pageSize)),
    });
    expect(result.map((entry) => entry.id)).toEqual(["a", "b", "d", "c"]);
    expect(new Set(result.map((entry) => entry.id)).size).toBe(4);
  });

  it("does not return earlier pages when a later page fails", async () => {
    const rows = [row("a", "2026-10-01"), row("b", "2026-10-02"), row("c", "2026-10-03")];
    let calls = 0;
    await expect(
      readCompleteCollection({
        pageSize: 2,
        readPage: (offset, pageSize) => {
          calls += 1;
          if (calls === 2) throw new Error("later page failed");
          return Promise.resolve(orderedPage(rows, offset, pageSize));
        },
      }),
    ).rejects.toThrow("later page failed");
    expect(calls).toBe(2);
  });

  it("rejects a short page before the reported total", async () => {
    await expect(
      readCompleteCollection({
        pageSize: 10,
        readPage: () => Promise.resolve({ rows: [row("a", "2026-10-01"), row("b", "2026-10-02")], total: 5 }),
      }),
    ).rejects.toThrow("stopped before it was complete");
  });

  it("rejects a total that changes between pages", async () => {
    const rows = [row("a", "2026-10-01"), row("b", "2026-10-02"), row("c", "2026-10-03"), row("d", "2026-10-04")];
    let calls = 0;
    await expect(
      readCompleteCollection({
        pageSize: 2,
        readPage: (offset, pageSize) => {
          calls += 1;
          const page = orderedPage(rows, offset, pageSize);
          return Promise.resolve({ rows: page.rows, total: calls === 1 ? 4 : 5 });
        },
      }),
    ).rejects.toThrow("changed before it was complete");
  });

  it("keeps a successful empty collection empty", async () => {
    const result = await readCompleteCollection<Row>({
      pageSize: 2,
      readPage: () => Promise.resolve({ rows: [], total: 0 }),
    });
    expect(result).toEqual([]);
  });

  it("rejects a page that does not report its size", async () => {
    await expect(
      readCompleteCollection({
        pageSize: 2,
        readPage: () => Promise.resolve({ rows: [], total: null }),
      }),
    ).rejects.toThrow("complete size");
  });
});
