/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalLocalClock } from "@/components/orient/localClockEntry";
import { WorkScheduleOperation, type WorkScheduleDismiss } from "@/components/orient/WorkScheduleOperation";
import { shiftEndsNextCivilDate, type WorkScheduleEntry } from "@/domain/workSchedule";
import type { WeekWrite } from "@/components/weekDraft";

const SATURDAY = "Sat, Oct 3";

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

async function renderWeek(onSave: (writes: WeekWrite[]) => void = () => {}, rows: WorkScheduleEntry[] = []) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const dismissRef: { current: WorkScheduleDismiss | null } = { current: null };
  await act(async () => {
    root?.render(
      <WorkScheduleOperation
        weekStart="2026-10-03"
        timeZone="America/Boise"
        dismissRef={dismissRef}
        onWeekStart={() => {}}
        onLoad={async () => rows}
        onSave={async (_weekStart, writes) => onSave(writes)}
        onDismiss={() => {}}
      />,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return container;
}

function day(view: HTMLElement, workOn = "2026-10-03") {
  const node = view.querySelector(`[data-work-day="${workOn}"]`);
  if (!node) throw new Error(`Missing ${workOn}`);
  return node;
}

function field(view: ParentNode, name: string) {
  const node = view.querySelector(`[aria-label="${name}"]`);
  if (!(node instanceof HTMLInputElement)) throw new Error(`Missing ${name}`);
  return node;
}

async function openSaturday(view: HTMLElement) {
  const open = view.querySelector(
    `[aria-label="Shift for ${SATURDAY}"], [aria-label="Edit shift for ${SATURDAY}"]`,
  ) as HTMLButtonElement | null;
  if (!open) throw new Error("Missing Saturday shift control");
  await act(async () => {
    open.click();
  });
}

async function typeClock(node: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function pressEnter(node: HTMLInputElement) {
  await act(async () => {
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}

async function pressEscape(node: HTMLInputElement) {
  await act(async () => {
    node.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
}

async function leave(node: HTMLInputElement) {
  await act(async () => {
    node.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

async function chooseType(view: ParentNode, shiftType: string) {
  const select = view.querySelector(`[aria-label="Shift type for ${SATURDAY}"]`);
  if (!(select instanceof HTMLSelectElement)) throw new Error("Missing shift type");
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(select, shiftType);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("canonical local clock", () => {
  it("accepts a zero-padded 24-hour clock and rejects everything else", () => {
    expect(canonicalLocalClock("09:30")).toBe("09:30");
    expect(canonicalLocalClock(" 23:00 ")).toBe("23:00");
    expect(canonicalLocalClock("00:00")).toBe("00:00");
    expect(canonicalLocalClock("24:00")).toBeNull();
    expect(canonicalLocalClock("09:60")).toBeNull();
    expect(canonicalLocalClock("9:30")).toBeNull();
    expect(canonicalLocalClock("09:3")).toBeNull();
    expect(canonicalLocalClock("09:00:00")).toBeNull();
    expect(canonicalLocalClock("")).toBeNull();
  });
});

describe("production Work time entry", () => {
  it("types the same local-clock field on every form and does not render a native time input", async () => {
    const operation = readFileSync(resolve("components/orient/WorkScheduleOperation.tsx"), "utf8");
    const instrument = readFileSync(resolve("components/orient/OrientView.tsx"), "utf8");
    expect(operation).not.toMatch(/type="time"|matchMedia|userAgent|max-width/);
    expect(operation).toContain("LocalClockField");
    expect(operation).not.toContain("LocalTimeField");
    expect(instrument.match(/<WorkScheduleOperation/g)).toHaveLength(1);

    const view = await renderWeek();
    await openSaturday(view);
    const start = field(view, `Start for ${SATURDAY}`);
    const end = field(view, `End for ${SATURDAY}`);
    expect(view.querySelector('input[type="time"]')).toBeNull();
    expect(start.type).toBe("text");
    expect(end.type).toBe("text");
    expect(start.getAttribute("inputmode")).toBe("text");
    expect(end.getAttribute("inputmode")).toBe("text");
    expect(start.placeholder).toBe("");
    expect(end.placeholder).toBe("");
    expect(start.value).toBe("");
    expect(end.value).toBe("");
  });

  it("shows an established clock as the field value", async () => {
    const view = await renderWeek(() => {}, [
      { workOn: "2026-10-03", state: "scheduled", startLocal: "09:00", endLocal: "17:30", shiftType: "mid" },
    ]);
    await openSaturday(view);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("09:00");
    expect(field(view, `End for ${SATURDAY}`).value).toBe("17:30");
    expect(field(view, `Start for ${SATURDAY}`).placeholder).toBe("");
  });

  it("does not establish Scheduled or persist when Saturday is only opened", async () => {
    const saves: WeekWrite[][] = [];
    const view = await renderWeek((writes) => saves.push(writes));
    await openSaturday(view);
    expect(day(view).getAttribute("data-work-state")).toBe("unknown");
    expect(day(view).getAttribute("data-work-open")).toBe("true");
    expect(saves).toEqual([]);
  });

  it("keeps typed text provisional until Enter commits it into the week draft", async () => {
    const saves: WeekWrite[][] = [];
    const view = await renderWeek((writes) => saves.push(writes));
    await openSaturday(view);
    const start = field(view, `Start for ${SATURDAY}`);
    await typeClock(start, "09:30");
    expect(start.value).toBe("09:30");
    expect(day(view).getAttribute("data-work-state")).toBe("unknown");
    expect(saves).toEqual([]);
    await pressEnter(start);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("09:30");
    expect(day(view).getAttribute("data-work-state")).toBe("scheduled");
    expect(saves).toEqual([]);
  });

  it("commits an exact end and shows both clocks from the draft", async () => {
    const view = await renderWeek();
    await openSaturday(view);
    await typeClock(field(view, `Start for ${SATURDAY}`), "13:15");
    await pressEnter(field(view, `Start for ${SATURDAY}`));
    await typeClock(field(view, `End for ${SATURDAY}`), "17:45");
    await pressEnter(field(view, `End for ${SATURDAY}`));
    await chooseType(view, "closing");
    expect(day(view).textContent).toContain("13:15–17:45 Closing");
    expect(day(view).getAttribute("data-work-state")).toBe("scheduled");
  });

  it("confirms a valid clock on blur and restores invalid, incomplete, and escaped text", async () => {
    const view = await renderWeek();
    await openSaturday(view);
    const start = field(view, `Start for ${SATURDAY}`);
    await typeClock(start, " 07:00 ");
    await leave(start);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("07:00");
    expect(day(view).getAttribute("data-work-state")).toBe("scheduled");

    const established = field(view, `Start for ${SATURDAY}`);
    await typeClock(established, "25:00");
    await leave(established);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("07:00");

    const minute = field(view, `Start for ${SATURDAY}`);
    await typeClock(minute, "07:60");
    await leave(minute);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("07:00");

    const partial = field(view, `Start for ${SATURDAY}`);
    await typeClock(partial, "07:0");
    await leave(partial);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("07:00");
    expect(day(view).getAttribute("data-work-state")).toBe("scheduled");

    const escaping = field(view, `Start for ${SATURDAY}`);
    const seen: string[] = [];
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") seen.push("window");
    };
    window.addEventListener("keydown", onEscape);
    await typeClock(escaping, "11:00");
    await pressEscape(field(view, `Start for ${SATURDAY}`));
    window.removeEventListener("keydown", onEscape);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("07:00");
    expect(seen).toEqual([]);
    expect(day(view).textContent).not.toContain("11:00");
  });

  it("leaves an unfinished clock out of the draft when Enter cannot confirm it", async () => {
    const view = await renderWeek();
    await openSaturday(view);
    const start = field(view, `Start for ${SATURDAY}`);
    await typeClock(start, "24:00");
    await pressEnter(start);
    expect(field(view, `Start for ${SATURDAY}`).value).toBe("24:00");
    expect(day(view).getAttribute("data-work-state")).toBe("unknown");
  });

  it("saves an overnight shift through the existing week boundary", async () => {
    const saves: WeekWrite[][] = [];
    const view = await renderWeek((writes) => saves.push(writes));
    await openSaturday(view);
    await typeClock(field(view, `Start for ${SATURDAY}`), "22:00");
    await pressEnter(field(view, `Start for ${SATURDAY}`));
    await typeClock(field(view, `End for ${SATURDAY}`), "06:00");
    await pressEnter(field(view, `End for ${SATURDAY}`));
    await chooseType(view, "closing");
    expect(view.textContent).not.toContain("midnight");
    expect(saves).toEqual([]);
    const save = [...view.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Save");
    if (!save) throw new Error("Missing Save");
    await act(async () => {
      save.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(saves).toHaveLength(1);
    const write = saves[0]?.[0];
    expect(write).toMatchObject({
      workOn: "2026-10-03",
      action: "save",
      entry: { state: "scheduled", startLocal: "22:00", endLocal: "06:00", shiftType: "closing" },
    });
    if (!write || write.action !== "save" || write.entry.state !== "scheduled") return;
    expect(shiftEndsNextCivilDate(write.entry.startLocal, write.entry.endLocal)).toBe(true);
  });
});
