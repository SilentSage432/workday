/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceRead } from "@/components/currentTemporalReading";
import { readyCaptureSession } from "@/domain/capture";
import { zonedLocalClock } from "@/domain/time/localTime";
import { formatCivilDate, workFiscalWeekStart } from "@/domain/time/workFiscalWeek";
import {
  civilDatesInSpan,
  experienceLoadWindow,
  explicitCivilSpan,
  monthClockAxis,
  MONTH_WINDOW_DAYS,
  orientCivilDate,
  WEEK_WINDOW_DAYS,
} from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { CaptureBridge, OrientActions, OrientSources } from "@/components/orient/types";
import { EMPTY_EXTERNAL_ORIENT_SOURCES } from "@/components/orient/types";

const PRODUCTION_FILES = [
  "components/orient/OrientInstrument.tsx",
  "components/orient/OrientView.tsx",
  "components/orient/grammar.ts",
  "components/orient/fieldScroll.ts",
  "components/orient/Landscape.tsx",
  "components/orient/DayField.tsx",
  "components/orient/Surfaces.tsx",
];

const CASES = [
  { zone: "America/Denver", now: "2026-10-15T18:00:00.000Z", civil: "2026-10-15" },
  { zone: "America/Denver", now: "2026-03-01T06:30:00.000Z", civil: "2026-02-28" },
  { zone: "America/Denver", now: "2026-01-01T06:30:00.000Z", civil: "2025-12-31" },
  { zone: "America/Denver", now: "2026-07-15T18:00:00.000Z", civil: "2026-07-15" },
  { zone: "America/Denver", now: "2026-01-15T18:00:00.000Z", civil: "2026-01-15" },
] as const;

function ready<T>(rows: readonly T[]): SourceRead<T> {
  return { status: "ready", rows };
}

function sources(): OrientSources {
  return {
    work: ready([]),
    protectedTime: ready([]),
    blocks: ready([]),
    commitments: ready([]),
    destinations: ready([]),
    priorities: ready([]),
    taskPriorityService: ready([]),
    blockPriorityService: ready([]),
    citedTasks: ready([]),
    ...EMPTY_EXTERNAL_ORIENT_SOURCES,
  };
}

function bridge(): CaptureBridge {
  return { session: readyCaptureSession(), update: () => {}, saving: false, saveError: null, submit: async () => null };
}

function actions(): OrientActions {
  return {
    onEstablish: async () => {},
    onUpdate: async () => {},
    onRemove: async () => {},
    onSignOut: () => {},
    onStartThread: async () => {},
    onLeaveThread: async () => {},
    onCompleteTask: async () => {},
    onSatisfyStewardship: async () => {},
    onWithdrawStewardship: async () => {},
    onReopenTask: async () => {},
    onUpdateTask: async () => {},
    onTasksChanged: () => {},
    onLoadWorkWeek: async () => [],
    onSaveWorkWeek: async () => {},
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

async function renderAt(input: { zone: string; now: string; anchor: string; onAnchor?: (date: string) => void }) {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const onAnchor = input.onAnchor ?? (() => {});
  await act(async () => {
    root?.render(
      <OrientView
        timeZone={input.zone}
        now={new Date(input.now)}
        anchor={input.anchor}
        onAnchor={onAnchor}
        loaded={experienceLoadWindow(input.anchor)}
        sources={sources()}
        contexts={ready([])}
        tasks={ready([])}
        thread={{ status: "ready", active: false, taskId: null, resumeTitle: null }}
        capture={bridge()}
        actions={actions()}
      />,
    );
  });
  return container;
}

function buttonNamed(node: ParentNode, name: string): HTMLButtonElement {
  const found = [...node.querySelectorAll("button")].find((item) => item.textContent?.replace(/\s+/g, " ").trim() === name);
  if (!found) throw new Error(`Missing button ${name}`);
  return found;
}

describe("production temporal origin", () => {
  it("follows the authoritative civil date across month, year, and daylight-saving instants", () => {
    for (const sample of CASES) {
      const instant = new Date(sample.now);
      expect(orientCivilDate(instant, sample.zone)).toBe(sample.civil);
      expect(zonedLocalClock(instant, sample.zone).civilDate).toBe(sample.civil);
      expect(sample.civil).not.toBe("2026-10-03");
    }
    const monday = new Date("2026-10-05T18:00:00.000Z");
    expect(orientCivilDate(monday, "America/Denver")).toBe("2026-10-05");
    expect(formatCivilDate(workFiscalWeekStart(monday, "America/Denver"))).toBe("2026-10-03");
  });

  it("keeps October 3 out of the production instrument", () => {
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    expect(instrument).toContain("orientCivilDate");
    expect(instrument).not.toContain("workFiscalWeekStart");
    expect(instrument).not.toContain("2026-10-03");
    const interval = instrument.slice(instrument.indexOf("setInterval"), instrument.indexOf("clearInterval"));
    expect(interval).not.toContain("setAnchor");
    for (const file of PRODUCTION_FILES) {
      expect(readFileSync(file, "utf8")).not.toContain("2026-10-03");
    }
  });

  it("derives Week and Month windows from the anchor, not from a fiscal Saturday", () => {
    expect(civilDatesInSpan(explicitCivilSpan("2026-10-05", WEEK_WINDOW_DAYS))).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    const month = civilDatesInSpan(explicitCivilSpan("2026-02-28", MONTH_WINDOW_DAYS));
    expect(month).toHaveLength(28);
    expect(month[0]).toBe("2026-02-28");
    expect(month.at(-1)).toBe("2026-03-27");
    const year = civilDatesInSpan(explicitCivilSpan("2025-12-31", WEEK_WINDOW_DAYS));
    expect(year[0]).toBe("2025-12-31");
    expect(year.at(-1)).toBe("2026-01-06");
  });

  it("maps Month geometry from established minutes", () => {
    expect(monthClockAxis([])).toEqual({ startMinute: 0, endMinute: 24 * 60 });
    const axis = monthClockAxis([{ visibleStartMinute: 9 * 60, visibleEndMinute: 17 * 60 }]);
    expect(axis.startMinute).toBeGreaterThan(0);
    expect(axis.startMinute).toBeLessThan(9 * 60);
    expect(axis.endMinute).toBeGreaterThan(17 * 60);
    expect(axis.endMinute).toBeLessThan(24 * 60);
  });

  it("uses authoritative today for Present, Today, and Now without moving a chosen place when the clock advances", async () => {
    for (const sample of CASES) {
      const anchors: string[] = [];
      const away = await renderAt({
        zone: sample.zone,
        now: sample.now,
        anchor: "2026-06-15",
        onAnchor: (date) => anchors.push(date),
      });
      await act(async () => {
        buttonNamed(away, "Now").click();
      });
      expect(anchors).toEqual([sample.civil]);

      anchors.length = 0;
      const positioned = await renderAt({
        zone: sample.zone,
        now: sample.now,
        anchor: "2026-06-15",
        onAnchor: (date) => anchors.push(date),
      });
      await act(async () => {
        positioned.querySelector<HTMLButtonElement>("[data-position]")?.click();
      });
      await act(async () => {
        buttonNamed(positioned, "Today").click();
      });
      expect(anchors).toEqual([sample.civil]);

      anchors.length = 0;
      const asked = await renderAt({
        zone: sample.zone,
        now: sample.now,
        anchor: "2026-06-15",
        onAnchor: (date) => anchors.push(date),
      });
      await act(async () => {
        asked.querySelector<HTMLButtonElement>("[data-question-control]")?.click();
      });
      await act(async () => {
        buttonNamed(asked.querySelector("[data-question-list]") as HTMLElement, "Week").click();
      });
      expect(anchors).toEqual([]);
      expect([...asked.querySelectorAll("[data-civil-day]")].map((item) => item.getAttribute("data-civil-day"))).toEqual(
        civilDatesInSpan(explicitCivilSpan("2026-06-15", WEEK_WINDOW_DAYS)),
      );
      await act(async () => {
        asked.querySelector<HTMLButtonElement>("[data-question-control]")?.click();
      });
      await act(async () => {
        buttonNamed(asked.querySelector("[data-question-list]") as HTMLElement, "Present").click();
      });
      expect(anchors).toEqual([sample.civil]);

      const held = await renderAt({ zone: sample.zone, now: sample.now, anchor: sample.civil, onAnchor: (date) => anchors.push(date) });
      anchors.length = 0;
      await act(async () => {
        root?.render(
          <OrientView
            timeZone={sample.zone}
            now={new Date(new Date(sample.now).getTime() + 30 * 60 * 1000)}
            anchor={sample.civil}
            onAnchor={(date) => anchors.push(date)}
            loaded={experienceLoadWindow(sample.civil)}
            sources={sources()}
            contexts={ready([])}
            tasks={ready([])}
            thread={{ status: "ready", active: false, taskId: null, resumeTitle: null }}
            capture={bridge()}
            actions={actions()}
          />,
        );
      });
      expect(anchors).toEqual([]);
      expect(held.querySelector("[data-question]")?.getAttribute("data-question")).toBe("present");
      await act(async () => {
        held.querySelector<HTMLButtonElement>("[data-question-control]")?.click();
      });
      await act(async () => {
        buttonNamed(held.querySelector("[data-question-list]") as HTMLElement, "Month").click();
      });
      expect(anchors).toEqual([]);
      const monthDays = [...held.querySelectorAll("[data-civil-day]")].map((item) => item.getAttribute("data-civil-day"));
      expect(monthDays).toEqual(civilDatesInSpan(explicitCivilSpan(sample.civil, MONTH_WINDOW_DAYS)));
    }
  });
});
