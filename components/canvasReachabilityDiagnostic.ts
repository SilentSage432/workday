/**
 * Temporary phone readout for V0-013A reachability.
 * It records hit-testing and pointer delivery. It does not decide a gesture.
 */

export const REACHABILITY_DIAGNOSTIC_ID = "V0-013A-DIAG";

const EVENT_TYPES = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "gotpointercapture",
  "lostpointercapture",
] as const;

export function describeElement(node: EventTarget | null): string {
  if (!node || !(node instanceof Element)) {
    if (typeof Window !== "undefined" && node instanceof Window) return "Window";
    if (typeof Document !== "undefined" && node instanceof Document) return "Document";
    return node ? node.constructor?.name || "target" : "null";
  }
  const element = node as HTMLElement;
  const bits = [node.tagName];
  if (element.dataset?.timeSurface === "true") bits.push("[data-time-surface]");
  if (element.dataset?.timeColumn === "true") bits.push("[data-time-column]");
  if (element.dataset?.axisScroll) bits.push("[data-axis-scroll]");
  if (element.dataset?.canvasFrame === "true") bits.push("[data-canvas-frame]");
  if (element.dataset?.temporalHandoff === "true") bits.push("[data-temporal-handoff]");
  if (element.dataset?.selection) bits.push(`[data-selection=${element.dataset.selection}]`);
  if (element.dataset?.sourceKind) bits.push(element.dataset.sourceKind);
  if (element.dataset?.region) bits.push(element.dataset.region);
  if (element.id) bits.push(`#${element.id}`);
  return bits.join(" ");
}

export function describePath(event: Event, limit = 8): string {
  if (typeof event.composedPath !== "function") return "path=unsupported";
  const nodes = event
    .composedPath()
    .filter((item): item is Element => item instanceof Element)
    .slice(0, limit)
    .map((item) => describeElement(item));
  return nodes.length > 0 ? nodes.join(" > ") : "path=empty";
}

export function describeStack(nodes: ReadonlyArray<Element | null>, limit = 5): string {
  const labels = nodes
    .filter((node): node is Element => node instanceof Element)
    .slice(0, limit)
    .map((node) => describeElement(node));
  return labels.length > 0 ? labels.join(" | ") : "empty";
}

function styleValue(element: Element, name: string): string {
  if (typeof getComputedStyle !== "function") return "?";
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value.length > 0 ? value : "auto";
}

export function describeBox(element: Element): string {
  const rect = element.getBoundingClientRect();
  const elementStyle = element as HTMLElement;
  return [
    describeElement(element),
    `x=${Math.round(rect.left)}`,
    `y=${Math.round(rect.top)}`,
    `w=${Math.round(rect.width)}`,
    `h=${Math.round(rect.height)}`,
    `z=${styleValue(element, "z-index")}`,
    `pe=${styleValue(element, "pointer-events")}`,
    `pos=${styleValue(element, "position")}`,
    `touch=${styleValue(element, "touch-action")}`,
    `top=${styleValue(element, "top")}`,
    `right=${styleValue(element, "right")}`,
    `bottom=${styleValue(element, "bottom")}`,
    `left=${styleValue(element, "left")}`,
    `isolation=${styleValue(element, "isolation")}`,
    `overflow=${styleValue(element, "overflow-y")}`,
    elementStyle.dataset?.startMinute ? `start=${elementStyle.dataset.startMinute}` : "",
    elementStyle.dataset?.endMinute ? `end=${elementStyle.dataset.endMinute}` : "",
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

function intersects(outer: DOMRect, inner: DOMRect): boolean {
  return inner.bottom > outer.top && inner.top < outer.bottom && inner.right > outer.left && inner.left < outer.right;
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export type HitQuery = (x: number, y: number) => Element | null;

/**
 * Reads the mounted day column. `hitAt` is injected so a test can show what a
 * caller claims is under a point. Calling this does not perform browser hit-testing
 * unless `hitAt` itself is `document.elementFromPoint`.
 */
export function measureReachability(root: ParentNode, hitAt: HitQuery | null): string[] {
  const surface = root.querySelector<HTMLElement>('[data-time-surface="true"]');
  const column = root.querySelector<HTMLElement>('[data-time-column="true"]');
  const scroller = root.querySelector<HTMLElement>('[data-axis-scroll="midnight"]');
  const lines = [`build=${REACHABILITY_DIAGNOSTIC_ID}`];
  if (!surface || !column) {
    lines.push("surface=not-mounted");
    return lines;
  }
  const surfaceRect = surface.getBoundingClientRect();
  lines.push(`surface ${describeBox(surface)}`);
  lines.push(`column ${describeBox(column)}`);
  if (scroller) lines.push(`scroll ${describeBox(scroller)}`);
  lines.push(
    `stacking columnIsolation=${styleValue(column, "isolation")} surfaceZ=${styleValue(surface, "z-index")} scrollOverflowY=${scroller ? styleValue(scroller, "overflow-y") : "none"}`,
  );

  const scrollRect = scroller?.getBoundingClientRect();
  const facts = [...root.querySelectorAll<HTMLElement>("article[data-source-kind]")];
  const visibleFacts = facts.filter((fact) => {
    const rect = fact.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (!scrollRect || scrollRect.height <= 0) return true;
    return intersects(scrollRect, rect);
  });
  const shown = (visibleFacts.length > 0 ? visibleFacts : facts).slice(0, 8);
  if (shown.length === 0) lines.push("facts=none");
  for (const fact of shown) {
    const rect = fact.getBoundingClientRect();
    const point = center(rect);
    const covers = surfaceRect.width > 0 && surfaceRect.height > 0 && intersects(surfaceRect, rect);
    const inView =
      !scrollRect ||
      scrollRect.height <= 0 ||
      (point.y >= scrollRect.top && point.y <= scrollRect.bottom && point.x >= scrollRect.left && point.x <= scrollRect.right);
    const hit = inView && hitAt ? describeElement(hitAt(point.x, point.y)) : inView ? "hit=unmeasured" : "offscreen";
    lines.push(
      `hit ${fact.dataset.sourceKind} @${Math.round(point.x)},${Math.round(point.y)} surfaceCovers=${covers ? "yes" : "no"} fromPoint=${hit} factZ=${styleValue(fact, "z-index")} factPe=${styleValue(fact, "pointer-events")}`,
    );
  }

  if (scrollRect && scrollRect.height > 0 && surfaceRect.width > 0) {
    const x = surfaceRect.left + Math.min(surfaceRect.width / 2, Math.max(8, scrollRect.width / 2));
    const y = scrollRect.top + 12;
    const occupied = shown.some((fact) => {
      const rect = fact.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
    lines.push(
      `hit empty-candidate @${Math.round(x)},${Math.round(y)} occupied=${occupied ? "yes" : "no"} fromPoint=${hitAt ? describeElement(hitAt(x, y)) : "unmeasured"}`,
    );
  }
  return lines;
}

export function pointerLines(event: PointerEvent, hitAt: HitQuery | null, stackAt: ((x: number, y: number) => Element[]) | null): string[] {
  const captured = captureState(event);
  return [
    `${event.type} pointerType=${event.pointerType || "none"} id=${event.pointerId} xy=${Math.round(event.clientX)},${Math.round(event.clientY)} btn=${event.button} buttons=${event.buttons} primary=${event.isPrimary ? "yes" : "no"} cancelable=${event.cancelable ? "yes" : "no"} def=${event.defaultPrevented ? "yes" : "no"} cap=${captured}`,
    `target=${describeElement(event.target)}`,
    `currentTarget=${describeElement(event.currentTarget)}`,
    `fromPoint=${hitAt ? describeElement(hitAt(event.clientX, event.clientY)) : "unmeasured"}`,
    `stack=${stackAt ? describeStack(stackAt(event.clientX, event.clientY)) : "unmeasured"}`,
    `path=${describePath(event)}`,
  ];
}

function captureState(event: PointerEvent): string {
  const surface = document.querySelector<HTMLElement>('[data-time-surface="true"]');
  if (!surface || typeof surface.hasPointerCapture !== "function") return "unknown";
  try {
    return surface.hasPointerCapture(event.pointerId) ? "surface" : "no";
  } catch {
    return "unknown";
  }
}

export function eventTouchesCanvas(event: PointerEvent, frame: Element | null): boolean {
  if (!frame) return false;
  const target = event.target instanceof Node ? event.target : null;
  if (target && frame.contains(target)) return true;
  const rect = frame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

export function attachReachabilityProbe(
  onLines: (lines: string[]) => void,
  getSurface: () => HTMLElement | null,
): () => void {
  const hitAt: HitQuery = (x, y) => {
    if (typeof document.elementFromPoint !== "function") return null;
    try {
      return document.elementFromPoint(x, y);
    } catch {
      return null;
    }
  };
  const stackAt = (x: number, y: number): Element[] => {
    const doc = document as Document & { elementsFromPoint?: (x: number, y: number) => Element[] };
    if (typeof doc.elementsFromPoint !== "function") return [];
    try {
      return doc.elementsFromPoint(x, y);
    } catch {
      return [];
    }
  };
  let moves = 0;
  let lastMoveLog = 0;
  const onPointer = (event: Event) => {
    if (!(event instanceof PointerEvent)) return;
    if (!EVENT_TYPES.includes(event.type as (typeof EVENT_TYPES)[number])) return;
    const frame = document.querySelector("[data-canvas-frame]");
    if (!eventTouchesCanvas(event, frame)) return;
    if (event.type === "pointermove") {
      moves += 1;
      const now = Date.now();
      if (moves !== 1 && now - lastMoveLog < 120) return;
      lastMoveLog = now;
      onLines([
        `pointermove n=${moves} xy=${Math.round(event.clientX)},${Math.round(event.clientY)} target=${describeElement(event.target)} def=${event.defaultPrevented ? "yes" : "no"} cap=${captureState(event)}`,
      ]);
      return;
    }
    if ((event.type === "pointerup" || event.type === "pointercancel") && moves > 0) {
      onLines([`pointermove total=${moves}`]);
      moves = 0;
    }
    onLines([`listener=window-capture`, ...pointerLines(event, hitAt, stackAt)]);
    queueMicrotask(() => {
      onLines([`${event.type} defAfter=${event.defaultPrevented ? "yes" : "no"} capAfter=${captureState(event)}`]);
    });
  };
  const surface = getSurface();
  const onSurface = (event: Event) => {
    if (!(event instanceof PointerEvent)) return;
    if (event.type === "pointermove") return;
    onLines([
      `listener=surface-native ${event.type} target=${describeElement(event.target)} currentTarget=${describeElement(event.currentTarget)} def=${event.defaultPrevented ? "yes" : "no"}`,
    ]);
  };
  if (surface) {
    for (const type of EVENT_TYPES) surface.addEventListener(type, onSurface);
  }
  for (const type of EVENT_TYPES) window.addEventListener(type, onPointer, true);
  return () => {
    if (surface) {
      for (const type of EVENT_TYPES) surface.removeEventListener(type, onSurface);
    }
    for (const type of EVENT_TYPES) window.removeEventListener(type, onPointer, true);
  };
}
