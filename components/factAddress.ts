import type { TimelineSourceKind } from "@/projections/timeline";

/**
 * A transient reference to a fact already painted on the day.
 * It is not a copy of the fact and it is not stored.
 */
export type FactAddress = {
  sourceKind: TimelineSourceKind;
  sourceId: string;
};

export type RenderedFactBox = FactAddress & {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /**
   * Used paint order. Higher z-index paints above.
   * `paintIndex` is DOM order among the articles. It is not importance.
   */
  zIndex: number;
  paintIndex: number;
};

const SOURCE_KINDS: ReadonlySet<string> = new Set([
  "work_schedule",
  "protected_time",
  "block",
  "commitment",
]);

export function factAddress(sourceKind: string, sourceId: string): FactAddress | null {
  if (!SOURCE_KINDS.has(sourceKind) || sourceId.length === 0) return null;
  return { sourceKind: sourceKind as TimelineSourceKind, sourceId };
}

/**
 * The article whose box contains the point and paints above the others.
 * Equal boxes use later paint order. That follows the canvas stacking.
 * It does not rank Work, Protected Time, Blocks, or Commitments.
 */
export function topmostRenderedFact(
  facts: readonly RenderedFactBox[],
  x: number,
  y: number,
): FactAddress | null {
  const hits = facts.filter(
    (fact) =>
      fact.right > fact.left &&
      fact.bottom > fact.top &&
      x >= fact.left &&
      x <= fact.right &&
      y >= fact.top &&
      y <= fact.bottom,
  );
  if (hits.length === 0) return null;
  hits.sort((left, right) => right.zIndex - left.zIndex || right.paintIndex - left.paintIndex);
  const top = hits[0];
  return top ? { sourceKind: top.sourceKind, sourceId: top.sourceId } : null;
}
