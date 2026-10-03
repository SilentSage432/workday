/**
 * @vitest-environment happy-dom
 */
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { DayCanvas } from "@/components/DayCanvas";
import {
  REACHABILITY_DIAGNOSTIC_ID,
  attachReachabilityProbe,
  describeElement,
  measureReachability,
  pointerLines,
} from "@/components/canvasReachabilityDiagnostic";
import { composeDayCanvas } from "@/projections/dayCanvas";

function box(element: HTMLElement, rect: { left: number; top: number; width: number; height: number }) {
  element.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

describe("reachability diagnostic helpers", () => {
  it("names the diagnostic build without treating a dispatched event as browser hit-testing", () => {
    const frame = document.createElement("div");
    frame.dataset.canvasFrame = "true";
    const article = document.createElement("article");
    article.dataset.sourceKind = "protected_time";
    frame.appendChild(article);
    document.body.appendChild(frame);
    const lines: string[] = [];
    const previous = document.elementFromPoint;
    document.elementFromPoint = () => article;
    const stop = attachReachabilityProbe(
      (next) => lines.push(...next),
      () => null,
    );
    article.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 40, pointerId: 7, pointerType: "touch", button: 0, buttons: 1, isPrimary: true }),
    );
    stop();
    document.elementFromPoint = previous;
    frame.remove();
    const text = lines.join("\n");
    expect(text).toContain("listener=window-capture");
    expect(text).toContain("pointerType=touch");
    expect(text).toContain("id=7");
    expect(text).toContain("xy=20,40");
    expect(text).toContain("target=ARTICLE protected_time");
    expect(text).toContain("fromPoint=ARTICLE protected_time");
    expect(text).not.toContain("browser hit-testing proved");
  });

  it("reports an injected hit at a fact center and whether the surface rect covers that fact", () => {
    const root = document.createElement("div");
    const scroller = document.createElement("div");
    scroller.dataset.axisScroll = "midnight";
    const column = document.createElement("div");
    column.dataset.timeColumn = "true";
    column.style.isolation = "isolate";
    const fact = document.createElement("article");
    fact.dataset.sourceKind = "protected_time";
    fact.style.zIndex = "1";
    fact.style.pointerEvents = "none";
    const surface = document.createElement("div");
    surface.dataset.timeSurface = "true";
    surface.style.position = "absolute";
    surface.style.zIndex = "21";
    surface.style.pointerEvents = "auto";
    column.append(fact, surface);
    scroller.append(column);
    root.append(scroller);
    box(scroller, { left: 0, top: 0, width: 300, height: 200 });
    box(column, { left: 40, top: 0, width: 260, height: 800 });
    box(surface, { left: 40, top: 0, width: 260, height: 800 });
    box(fact, { left: 48, top: 80, width: 120, height: 40 });
    const lines = measureReachability(root, () => fact);
    const text = lines.join("\n");
    expect(text).toContain(`build=${REACHABILITY_DIAGNOSTIC_ID}`);
    expect(text).toContain("[data-time-surface]");
    expect(text).toContain("w=260");
    expect(text).toContain("h=800");
    expect(text).toContain("surfaceCovers=yes");
    expect(text).toContain("fromPoint=ARTICLE protected_time");
    expect(text).toContain("columnIsolation=");
  });

  it("formats pointer fields and a composed path", () => {
    const surface = document.createElement("div");
    surface.dataset.timeSurface = "true";
    const event = new PointerEvent("pointerup", {
      bubbles: true,
      clientX: 12,
      clientY: 90,
      pointerId: 3,
      pointerType: "touch",
      button: 0,
      buttons: 0,
      isPrimary: true,
    });
    surface.dispatchEvent(event);
    const lines = pointerLines(event, () => surface, () => [surface]);
    const text = lines.join("\n");
    expect(text).toContain("pointerup");
    expect(text).toContain("pointerType=touch");
    expect(text).toContain("id=3");
    expect(text).toContain("def=no");
    expect(text).toContain("fromPoint=DIV [data-time-surface]");
    expect(text).toContain("stack=DIV [data-time-surface]");
    expect(describeElement(surface)).toBe("DIV [data-time-surface]");
  });
});

describe("day canvas diagnostic marker", () => {
  it("renders the diagnostic identifier on the day canvas", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const model = composeDayCanvas({
      selectedDay: "2026-10-03",
      timeZone: "America/Boise",
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
    });
    act(() => {
      root.render(
        <DayCanvas
          selectedDay="2026-10-03"
          today="2026-10-03"
          phase="ready"
          error={null}
          model={model}
          timeZone="America/Boise"
          discardToken="0"
          onPreviousDay={() => undefined}
          onNextDay={() => undefined}
          onToday={() => undefined}
        />,
      );
    });
    const marker = container.querySelector("[data-reachability-diagnostic]");
    expect(marker?.getAttribute("data-reachability-diagnostic")).toBe(REACHABILITY_DIAGNOSTIC_ID);
    expect(marker?.textContent).toContain(`DIAG ${REACHABILITY_DIAGNOSTIC_ID}`);
    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
