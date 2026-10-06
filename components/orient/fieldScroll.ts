/**
 * Scroll ownership for the production vertical field.
 * Today is a fact. The anchor is where the human is looking.
 * Crossing a civil date may rename that place. It does not rebuild the field.
 */

export function contentTop(nodeTop: number, scrollerTop: number, scrollTop: number): number {
  return nodeTop - scrollerTop + scrollTop;
}

/** Now sits in the upper portion of the field, clear of the bezel. */
export function nowScrollTarget(markContentTop: number, clientHeight: number): number {
  if (!(clientHeight > 0)) return 0;
  return Math.max(0, markContentTop - clientHeight * 0.22);
}

export function initialVerticalSpan(anchor: string, shift: (date: string, delta: number) => string): string[] {
  return [shift(anchor, -1), anchor, shift(anchor, 1)];
}

/** Keep the mounted days when the viewpoint is already among them. */
export function spanContaining(span: readonly string[] | null, date: string, fresh: readonly string[]): readonly string[] {
  if (span && span.includes(date)) return span;
  return fresh;
}

export function extendSpan(
  span: readonly string[],
  edge: "earlier" | "later",
  shift: (date: string, delta: number) => string,
): string[] {
  if (span.length === 0) return [];
  if (edge === "earlier") {
    const next = shift(span[0], -1);
    if (span.includes(next)) return [...span];
    return [next, ...span];
  }
  const next = shift(span[span.length - 1], 1);
  if (span.includes(next)) return [...span];
  return [...span, next];
}

/**
 * Unmeasured days share one content top. That is not a crossing.
 * A programmatic scroll does not choose a new viewpoint.
 */
export function observedCivilDate(
  days: readonly { date: string; contentTop: number }[],
  probe: number,
  programmatic: boolean,
): string | null {
  if (programmatic || days.length === 0) return null;
  const tops = days.map((day) => day.contentTop);
  if (!tops.some((top) => top !== tops[0])) return null;
  let found = days[0]?.date ?? null;
  for (const day of days) {
    if (!day.date) continue;
    if (day.contentTop <= probe) found = day.date;
  }
  return found;
}

export function viewpointAfterScroll(anchor: string, observed: string | null): string | null {
  if (!observed || observed === anchor) return null;
  return observed;
}

export function nearEdge(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  edge: number,
): "earlier" | "later" | null {
  if (!(clientHeight > 0) || !(scrollHeight > clientHeight + 1)) return null;
  if (scrollTop <= edge) return "earlier";
  if (scrollHeight - scrollTop - clientHeight <= edge) return "later";
  return null;
}
