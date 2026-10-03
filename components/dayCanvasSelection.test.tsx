/**
 * @vitest-environment happy-dom
 */
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DayCanvas } from "@/components/DayCanvas";
import type { CanvasEstablishment } from "@/components/canvasEstablishment";
import { SELECTION_HOLD_MS } from "@/components/daySelection";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import { defineProtectedTime } from "@/domain/protectedTime";
import { scheduledWorkDay } from "@/domain/workSchedule";
import { adjacentCivilDay, composeDayCanvas, type DayCanvasModel } from "@/projections/dayCanvas";

const zone = "America/Boise";
const day = "2026-10-03";

function modelFor(selectedDay: string, timeZone: string, occupied: boolean): DayCanvasModel {
  return composeDayCanvas({
    selectedDay,
    timeZone,
    workSchedule: occupied
      ? [
          scheduledWorkDay({
            workOn: selectedDay,
            startLocal: "08:00",
            endLocal: "17:00",
            shiftType: "mid",
          }),
        ]
      : [],
    protectedTime: occupied
      ? [
          {
            ...defineProtectedTime({
              kind: "timed",
              startsOn: selectedDay,
              startLocal: "12:00",
              endLocal: "13:00",
              label: "Family",
            }),
            id: "protect",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ]
      : [],
    blocks: occupied
      ? [
          {
            ...defineBlock({
              kind: "timed",
              startsOn: selectedDay,
              startLocal: "18:00",
              endLocal: "19:00",
              purpose: "Studio",
            }),
            id: "studio",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ]
      : [],
    commitments: occupied
      ? [
          {
            ...defineCommitment({
              kind: "timed",
              startsOn: selectedDay,
              startLocal: "18:30",
              endLocal: "19:30",
              title: "School",
            }),
            id: "school",
            createdAt: "2026-10-01T00:00:00.000Z",
          },
        ]
      : [],
  });
}

function rect(node: HTMLElement) {
  node.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 390,
      bottom: 1440,
      width: 390,
      height: 1440,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    root,
    rerender(next: ReactNode) {
      act(() => {
        root.render(next);
      });
    },
  };
}

const mounted: Array<{ root: Root; container: HTMLDivElement }> = [];

afterEach(() => {
  vi.useRealTimers();
  while (mounted.length > 0) {
    const current = mounted.pop();
    if (!current) break;
    act(() => {
      current.root.unmount();
    });
    current.container.remove();
  }
});

function canvasProps(overrides: Partial<Parameters<typeof DayCanvas>[0]> = {}) {
  const selectedDay = overrides.selectedDay ?? day;
  const timeZone = overrides.timeZone ?? zone;
  return {
    selectedDay,
    today: day,
    phase: "ready" as const,
    error: null,
    model: overrides.model ?? modelFor(selectedDay, timeZone, false),
    timeZone,
    discardToken: "America/Boise:0:0",
    onPreviousDay: () => undefined,
    onNextDay: () => undefined,
    onToday: () => undefined,
    ...overrides,
  };
}

function renderCanvas(overrides: Partial<Parameters<typeof DayCanvas>[0]> = {}) {
  const view = mount(<DayCanvas {...canvasProps(overrides)} />);
  mounted.push(view);
  const surface = view.container.querySelector<HTMLElement>('[data-time-surface="true"]');
  if (!surface) throw new Error("The timed surface was not rendered.");
  rect(surface);
  return { ...view, surface };
}

function pointer(target: EventTarget, type: string, init: PointerEventInit) {
  act(() => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0, ...init }));
  });
}

function selection(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-selection='time']");
}

describe("day canvas time selection", () => {
  it("drags downward and upward with a mouse and keeps the range after release", () => {
    const view = renderCanvas();
    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 18 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });
    const mark = selection(view.container);
    expect(mark?.dataset.startMinute).toBe(String(18 * 60));
    expect(mark?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");

    pointer(view.surface, "pointerdown", { pointerId: 2, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });
    pointer(window, "pointermove", { pointerId: 2, pointerType: "mouse", clientX: 40, clientY: 19 * 60 });
    pointer(window, "pointerup", { pointerId: 2, pointerType: "mouse", clientX: 40, clientY: 19 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(19 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("7:00 PM – 9:00 PM");
  });

  it("uses a 15-minute tap, replaces that range, and clears it", () => {
    const view = renderCanvas();
    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 18 * 60 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 18 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(18 * 60 + 15));

    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 10 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 11 * 60 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 11 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(10 * 60));
    expect(view.container.querySelectorAll("[data-selection='time']")).toHaveLength(1);

    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Clear selected time"]')?.click();
    });
    expect(selection(view.container)).toBeNull();
    expect(view.container.textContent).toContain("Hold briefly, then drag, to select time.");
  });

  it("lets a touch scroll win, and selects after the hold", () => {
    vi.useFakeTimers();
    const view = renderCanvas();
    pointer(view.surface, "pointerdown", { pointerId: 4, pointerType: "touch", clientX: 30, clientY: 18 * 60 });
    pointer(window, "pointermove", {
      pointerId: 4,
      pointerType: "touch",
      clientX: 30,
      clientY: 18 * 60 + 24,
    });
    act(() => {
      vi.advanceTimersByTime(SELECTION_HOLD_MS);
    });
    expect(selection(view.container)).toBeNull();

    pointer(view.surface, "pointerdown", { pointerId: 5, pointerType: "touch", clientX: 30, clientY: 18 * 60 });
    act(() => {
      vi.advanceTimersByTime(SELECTION_HOLD_MS);
    });
    pointer(window, "pointermove", { pointerId: 5, pointerType: "touch", clientX: 30, clientY: 21 * 60 });
    pointer(window, "pointerup", { pointerId: 5, pointerType: "touch", clientX: 30, clientY: 21 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("Selected time");
  });

  it("selects across Work, Protected Time, a Block, and a Commitment", () => {
    const view = renderCanvas({ model: modelFor(day, zone, true) });
    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 80, clientY: 16 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 80, clientY: 20 * 60 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 80, clientY: 20 * 60 });
    const html = view.container.innerHTML;
    expect(html).toContain('data-source-kind="work_schedule"');
    expect(html).toContain('data-source-kind="protected_time"');
    expect(html).toContain('data-source-kind="block"');
    expect(html).toContain('data-source-kind="commitment"');
    expect(html).toContain('data-selection="time"');
    expect(html).not.toMatch(/conflict|available|free time|double booked/i);
    const articles = view.container.querySelectorAll("article");
    expect(articles.length).toBeGreaterThanOrEqual(4);
    for (const article of articles) {
      expect(article.getAttribute("draggable")).toBeNull();
      expect(article.getAttribute("aria-label")?.length).toBeGreaterThan(0);
    }
    const mark = selection(view.container);
    expect(mark?.className).not.toContain("dashed");
    expect(mark?.getAttribute("style")).not.toContain("repeating-linear-gradient");
  });

  it("does not start a selection from the all-day region", () => {
    const occupied = modelFor(day, zone, false);
    occupied.allDay = [
      {
        sourceKind: "protected_time",
        sourceId: "family-day",
        kindLabel: "Protected",
        primary: "Family",
        detail: "All day",
        accessibleLabel: "Protected time, Family.",
      },
    ];
    const view = renderCanvas({ model: occupied });
    const allDay = view.container.querySelector("[data-region='all-day']");
    expect(allDay).not.toBeNull();
    pointer(allDay as HTMLElement, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
    expect(selection(view.container)).toBeNull();
  });

  it("clears when the day changes, when Today navigates, and when the discard token changes", () => {
    function Harness() {
      const [selectedDay, setSelectedDay] = useState(day);
      const [discardToken, setDiscardToken] = useState("America/Boise:0:0");
      return (
        <>
          <button type="button" onClick={() => setDiscardToken("America/Boise:1:1")}>
            Reload day
          </button>
          <button type="button" onClick={() => setDiscardToken("America/Boise:0:1")}>
            Open tools
          </button>
          <DayCanvas
            {...canvasProps({
              selectedDay,
              model: modelFor(selectedDay, zone, false),
              today: "2026-10-02",
              discardToken,
              onPreviousDay: () => setSelectedDay(adjacentCivilDay(selectedDay, -1)),
              onNextDay: () => setSelectedDay(adjacentCivilDay(selectedDay, 1)),
              onToday: () => setSelectedDay("2026-10-02"),
            })}
          />
        </>
      );
    }

    const view = mount(<Harness />);
    mounted.push(view);
    const surface = () => {
      const node = view.container.querySelector<HTMLElement>('[data-time-surface="true"]');
      if (!node) throw new Error("The timed surface was not rendered.");
      rect(node);
      return node;
    };

    const selectSix = () => {
      pointer(surface(), "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 12, clientY: 18 * 60 });
      pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 12, clientY: 18 * 60 });
      expect(selection(view.container)).not.toBeNull();
    };

    selectSix();
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Previous day"]')?.click();
    });
    expect(selection(view.container)).toBeNull();

    selectSix();
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Next day"]')?.click();
    });
    expect(selection(view.container)).toBeNull();

    selectSix();
    act(() => {
      const today = [...view.container.querySelectorAll("button")].find((button) => button.textContent === "Today");
      today?.click();
    });
    expect(selection(view.container)).toBeNull();

    selectSix();
    act(() => {
      [...view.container.querySelectorAll("button")].find((button) => button.textContent === "Open tools")?.click();
    });
    expect(selection(view.container)).toBeNull();

    selectSix();
    act(() => {
      [...view.container.querySelectorAll("button")].find((button) => button.textContent === "Reload day")?.click();
    });
    expect(selection(view.container)).toBeNull();
  });

  it("identifies a missing spring-forward hour and a repeated fall-back hour", () => {
    const spring = renderCanvas({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      model: modelFor("2026-03-08", "America/Denver", false),
      discardToken: "America/Denver:0:0",
    });
    pointer(spring.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 16, clientY: 2 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 16, clientY: 3 * 60 });
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 16, clientY: 3 * 60 });
    expect(spring.container.querySelector("[data-clock='absent']")?.textContent).toContain(
      "Part of this local clock range does not occur.",
    );
    expect(spring.container.innerHTML).not.toContain('role="alert"');
    expect(selection(spring.container)?.dataset.startMinute).toBe("120");

    const fall = renderCanvas({
      selectedDay: "2026-11-01",
      timeZone: "America/Denver",
      model: modelFor("2026-11-01", "America/Denver", false),
      today: "2026-11-01",
      discardToken: "America/Denver:0:0",
    });
    pointer(fall.surface, "pointerdown", { pointerId: 3, pointerType: "mouse", clientX: 16, clientY: 60 });
    pointer(window, "pointermove", { pointerId: 3, pointerType: "mouse", clientX: 16, clientY: 120 });
    pointer(window, "pointerup", { pointerId: 3, pointerType: "mouse", clientX: 16, clientY: 120 });
    expect(fall.container.querySelector("[data-clock='repeated']")?.textContent).toContain(
      "Part of this local clock range occurs twice.",
    );
    expect(fall.container.querySelector("[data-selection-label]")?.textContent).toContain("1:00 AM – 2:00 AM");
    expect(selection(fall.container)?.dataset.endMinute).toBe("120");
  });
});

const MEANING_ACTIONS = ["Protect this time", "Choose a purpose", "Add a commitment"] as const;

function selectHours(
  surface: HTMLElement,
  startHour: number,
  endHour: number,
  pointerId = 1,
) {
  pointer(surface, "pointerdown", { pointerId, pointerType: "mouse", clientX: 40, clientY: startHour * 60 });
  if (endHour !== startHour) {
    pointer(window, "pointermove", { pointerId, pointerType: "mouse", clientX: 40, clientY: endHour * 60 });
  }
  pointer(window, "pointerup", { pointerId, pointerType: "mouse", clientX: 40, clientY: endHour * 60 });
}

function clickLabel(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => {
    button.click();
  });
}

function step(container: HTMLElement, label: string, times = 1) {
  for (let index = 0; index < times; index += 1) {
    const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
    if (!button) throw new Error(`Missing ${label}`);
    act(() => {
      button.click();
    });
  }
}

function typeInto(container: HTMLElement, id: string, value: string) {
  const field = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!field) throw new Error(`Missing ${id}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(field, value);
  act(() => {
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function meaningPanel(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-meaning-choice]");
}

describe("temporal meaning choice on the day canvas", () => {
  it("asks what a completed selection means and hides the question while the drag is open", () => {
    const view = renderCanvas();
    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 18 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });
    expect(view.container.textContent).not.toContain("What does this time mean?");
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });

    const panel = meaningPanel(view.container);
    expect(panel?.dataset.meaningChoice).toBe("asking");
    expect(panel?.getAttribute("role")).toBeNull();
    const actions = [...(panel?.querySelectorAll("[data-meaning-action]") ?? [])];
    expect(actions.map((button) => button.textContent)).toEqual([...MEANING_ACTIONS]);
    expect(actions).toHaveLength(3);
    for (const button of actions) expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(panel?.textContent).toContain("What does this time mean?");
    expect(panel?.textContent).not.toMatch(/\b(available|free|conflict|priority|recommendation|should)\b|open slot/i);
    expect(panel?.textContent).not.toMatch(/\bwork\b|\btask\b|shift|opening|closing|add work|make this a shift/i);
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("Selected time");
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
  });

  it("records each intended meaning, keeps the range, and writes no fact", () => {
    const view = renderCanvas({ model: modelFor(day, zone, true) });
    const facts = () => view.container.querySelectorAll("[data-source-kind]").length;
    selectHours(view.surface, 18, 21);
    const before = facts();
    const cases = [
      ["Protect this time", "protected_time", "Protected time", "Unavailable for allocation."],
      ["Choose a purpose", "block", "Block", "What this time is for."],
      ["Add a commitment", "commitment", "Commitment", "An established constraint."],
    ] as const;

    for (const [action, meaning, title, sentence] of cases) {
      clickLabel(view.container, action);
      const panel = meaningPanel(view.container);
      expect(panel?.dataset.meaningChoice).toBe(meaning);
      expect(panel?.textContent).toContain(title);
      expect(panel?.textContent).toContain(sentence);
      expect(panel?.textContent).not.toMatch(/\b(available|free|conflict|priority|recommendation|should)\b|open slot/i);
      expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
      expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
      expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
      expect(facts()).toBe(before);
      expect(view.container.querySelector("[data-meaning-choice] input, [data-meaning-choice] textarea, [data-meaning-choice] select")).toBeNull();
      clickLabel(view.container, "Change meaning");
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
      expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
      expect(view.container.textContent).not.toContain(sentence);
    }
  });

  it("clears meaning with the range, and a new range starts without the previous meaning", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Protect this time");
    clickLabel(view.container, "Clear");
    expect(selection(view.container)).toBeNull();
    expect(meaningPanel(view.container)).toBeNull();
    expect(view.container.textContent).not.toContain("Unavailable for allocation.");
    expect(view.container.textContent).toContain("Hold briefly, then drag, to select time.");

    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Add a commitment");
    selectHours(view.surface, 10, 11, 2);
    expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("10:00 AM – 11:00 AM");
    expect(view.container.textContent).not.toContain("An established constraint.");
  });

  it("clears a chosen meaning on day navigation, Manage schedule, and a source refresh", () => {
    function Harness() {
      const [selectedDay, setSelectedDay] = useState(day);
      const [discardToken, setDiscardToken] = useState("America/Boise:0:0");
      return (
        <>
          <button type="button" onClick={() => setDiscardToken("America/Boise:1:1")}>
            Reload day
          </button>
          <button type="button" onClick={() => setDiscardToken("America/Boise:0:1")}>
            Open tools
          </button>
          <button type="button" onClick={() => setDiscardToken("America/Denver:0:0")}>
            Change zone
          </button>
          <DayCanvas
            {...canvasProps({
              selectedDay,
              model: modelFor(selectedDay, zone, false),
              today: "2026-10-02",
              discardToken,
              onPreviousDay: () => setSelectedDay(adjacentCivilDay(selectedDay, -1)),
              onNextDay: () => setSelectedDay(adjacentCivilDay(selectedDay, 1)),
              onToday: () => setSelectedDay("2026-10-02"),
            })}
          />
        </>
      );
    }

    const view = mount(<Harness />);
    mounted.push(view);
    const surface = () => {
      const node = view.container.querySelector<HTMLElement>('[data-time-surface="true"]');
      if (!node) throw new Error("The timed surface was not rendered.");
      rect(node);
      return node;
    };
    const choose = () => {
      selectHours(surface(), 18, 21);
      clickLabel(view.container, "Choose a purpose");
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("block");
    };
    const expectCleared = () => {
      expect(selection(view.container)).toBeNull();
      expect(meaningPanel(view.container)).toBeNull();
      expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();
      expect(view.container.textContent).not.toContain("What this time is for.");
    };

    choose();
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Previous day"]')?.click();
    });
    expectCleared();

    choose();
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Next day"]')?.click();
    });
    expectCleared();

    choose();
    clickLabel(view.container, "Today");
    expectCleared();

    choose();
    clickLabel(view.container, "Open tools");
    expectCleared();

    choose();
    clickLabel(view.container, "Reload day");
    expectCleared();

    choose();
    clickLabel(view.container, "Change zone");
    expectCleared();
  });

  it("keeps every meaning choice available across Work, Protected Time, a Block, and a Commitment", () => {
    const view = renderCanvas({ model: modelFor(day, zone, true) });
    const ranges = [
      [10, 11],
      [12, 13],
      [18, 19],
      [10, 19],
    ] as const;
    for (const [start, end] of ranges) {
      selectHours(view.surface, start, end, start);
      const panel = meaningPanel(view.container);
      expect(panel?.dataset.meaningChoice).toBe("asking");
      const buttons = [...(panel?.querySelectorAll("button") ?? [])] as HTMLButtonElement[];
      expect(buttons.map((button) => button.textContent)).toEqual([...MEANING_ACTIONS]);
      for (const button of buttons) expect(button.disabled).toBe(false);
      expect(panel?.textContent).not.toMatch(/occupied|conflict|available|free|priority/i);
    }
    expect(view.container.innerHTML).toContain('data-source-kind="work_schedule"');
    expect(view.container.innerHTML).toContain('data-source-kind="protected_time"');
    expect(view.container.innerHTML).toContain('data-source-kind="block"');
    expect(view.container.innerHTML).toContain('data-source-kind="commitment"');
  });

  it("keeps an unresolved local-clock sentence beside the meaning question", () => {
    const spring = renderCanvas({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      model: modelFor("2026-03-08", "America/Denver", false),
      discardToken: "America/Denver:0:0",
    });
    selectHours(spring.surface, 2, 3);
    expect(spring.container.querySelector("[data-clock='absent']")?.textContent).toContain(
      "Part of this local clock range does not occur.",
    );
    expect(meaningPanel(spring.container)?.dataset.meaningChoice).toBe("asking");
    clickLabel(spring.container, "Protect this time");
    expect(spring.container.querySelector("[data-clock='absent']")?.textContent).toContain(
      "Part of this local clock range does not occur.",
    );
    expect(meaningPanel(spring.container)?.dataset.meaningChoice).toBe("protected_time");
    expect(selection(spring.container)?.dataset.startMinute).toBe("120");
    expect(selection(spring.container)?.dataset.endMinute).toBe("180");

    const fall = renderCanvas({
      selectedDay: "2026-11-01",
      timeZone: "America/Denver",
      model: modelFor("2026-11-01", "America/Denver", false),
      today: "2026-11-01",
      discardToken: "America/Denver:0:0",
    });
    selectHours(fall.surface, 1, 2);
    expect(fall.container.querySelector("[data-clock='repeated']")?.textContent).toContain(
      "Part of this local clock range occurs twice.",
    );
    clickLabel(fall.container, "Add a commitment");
    expect(fall.container.querySelector("[data-clock='repeated']")?.textContent).toContain(
      "Part of this local clock range occurs twice.",
    );
    expect(meaningPanel(fall.container)?.dataset.meaningChoice).toBe("commitment");
    expect(fall.container.querySelector("[data-selection-label]")?.textContent).toContain("1:00 AM – 2:00 AM");
  });

  it("opens the handoff on the canvas as soon as the selection settles", () => {
    const view = renderCanvas();
    pointer(view.surface, "pointerdown", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 18 * 60 });
    pointer(window, "pointermove", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });
    expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();
    expect(view.container.querySelector("[data-selection-readout='dragging']")).not.toBeNull();
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 21 * 60 });

    const frame = view.container.querySelector("[data-canvas-frame]");
    const handoff = frame?.querySelector("[data-temporal-handoff]");
    expect(handoff).not.toBeNull();
    expect(handoff?.getAttribute("aria-label")).toBe("Selected time");
    expect(handoff?.querySelector("[data-meaning-choice='asking']")).not.toBeNull();
    expect(handoff?.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:00 PM");
    expect(selection(view.container)).not.toBeNull();
    expect(view.container.querySelector("[data-selection-readout]")).toBeNull();
    expect(view.container.querySelectorAll('[aria-label="Clear selected time"]')).toHaveLength(1);
    expect(view.container.textContent).not.toContain("Continue");
    expect(view.container.querySelector("[data-resize-handle]")).toBeNull();
    expect(handoff?.querySelector('[aria-label="Later Start minute"]')).not.toBeNull();
    expect(handoff?.querySelector('[aria-label="Later End minute"]')).not.toBeNull();
    expect(handoff?.querySelector("select")).toBeNull();
    expect(handoff?.querySelector('input[type="time"]')).toBeNull();
  });

  it("updates the one selection when the start or end minute changes", () => {
    const view = renderCanvas({ model: modelFor(day, zone, true) });
    const facts = () => view.container.querySelectorAll("[data-source-kind]").length;
    selectHours(view.surface, 18, 21);
    const before = facts();
    step(view.container, "Later End minute", 7);
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 7));
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:07 PM");
    step(view.container, "Later Start minute", 15);
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60 + 15));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 7));
    expect(facts()).toBe(before);
    expect(view.container.querySelectorAll("[data-selection='time']")).toHaveLength(1);
  });

  it("keeps the previous range when a precise edit is reversed or empty", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    step(view.container, "End AM or PM");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-range-order='reversed']")?.textContent).toContain(
      "The start is after the end.",
    );
    step(view.container, "End AM or PM");
    step(view.container, "Later Start hour", 2);
    expect(selection(view.container)?.dataset.startMinute).toBe(String(20 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    step(view.container, "Later Start hour");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(20 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-range-order='empty']")?.textContent).toContain(
      "The start and the end are the same moment.",
    );
  });

  it("keeps a chosen meaning while the same range is refined, and drops it for a new gesture", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    for (const [action, meaning] of [
      ["Protect this time", "protected_time"],
      ["Choose a purpose", "block"],
      ["Add a commitment", "commitment"],
    ] as const) {
      clickLabel(view.container, action);
      step(view.container, "Later End minute", 20);
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe(meaning);
      expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 20));
      expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
      clickLabel(view.container, "Change meaning");
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
      expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 20));
      step(view.container, "Earlier End minute", 20);
    }

    clickLabel(view.container, "Protect this time");
    selectHours(view.surface, 8, 9, 4);
    expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("8:00 AM – 9:00 AM");
    expect(view.container.textContent).not.toContain("Unavailable for allocation.");
  });

  it("leaves a tap inside the selected region on the current interaction", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    pointer(view.surface, "pointerdown", { pointerId: 9, pointerType: "mouse", clientX: 40, clientY: 19 * 60 });
    pointer(window, "pointerup", { pointerId: 9, pointerType: "mouse", clientX: 40, clientY: 19 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("block");
  });

  it("keeps the local-clock sentence when a refined range enters a gap or a repeated hour", () => {
    const spring = renderCanvas({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      model: modelFor("2026-03-08", "America/Denver", false),
      discardToken: "America/Denver:0:0",
    });
    selectHours(spring.surface, 1, 2);
    step(spring.container, "Later End minute", 10);
    expect(selection(spring.container)?.dataset.startMinute).toBe("60");
    expect(selection(spring.container)?.dataset.endMinute).toBe("130");
    expect(spring.container.querySelector("[data-clock='absent']")?.textContent).toContain(
      "Part of this local clock range does not occur.",
    );

    const fall = renderCanvas({
      selectedDay: "2026-11-01",
      timeZone: "America/Denver",
      model: modelFor("2026-11-01", "America/Denver", false),
      today: "2026-11-01",
      discardToken: "America/Denver:0:0",
    });
    selectHours(fall.surface, 3, 4);
    step(fall.container, "Earlier Start hour", 2);
    step(fall.container, "Later Start minute", 7);
    step(fall.container, "Earlier End hour", 3);
    step(fall.container, "Later End minute", 20);
    expect(selection(fall.container)?.dataset.startMinute).toBe("67");
    expect(selection(fall.container)?.dataset.endMinute).toBe("80");
    expect(fall.container.querySelector("[data-clock='repeated']")?.textContent).toContain(
      "Part of this local clock range occurs twice.",
    );
  });
});

function EstablishHarness({
  sink,
  fail,
  occupied = false,
  contexts = [],
  selectedDay = day,
  timeZone = zone,
}: {
  sink: CanvasEstablishment[];
  fail?: string;
  occupied?: boolean;
  contexts?: { id: string; name: string }[];
  selectedDay?: string;
  timeZone?: string;
}) {
  const [token, setToken] = useState(`${timeZone}:0:0`);
  return (
    <DayCanvas
      {...canvasProps({
        selectedDay,
        timeZone,
        today: selectedDay,
        model: modelFor(selectedDay, timeZone, occupied),
        discardToken: token,
        contexts,
      })}
      onEstablish={async (establishment) => {
        sink.push(establishment);
        if (fail) throw new Error(fail);
        setToken(`${timeZone}:1:0`);
      }}
    />
  );
}

function renderHarness(node: ReactNode) {
  const view = mount(node);
  mounted.push(view);
  const surface = view.container.querySelector<HTMLElement>('[data-time-surface="true"]');
  if (!surface) throw new Error("The timed surface was not rendered.");
  rect(surface);
  return { ...view, surface };
}

function saveButton(container: HTMLElement) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Save");
  if (!button) throw new Error("Missing Save");
  return button;
}

async function clickSave(container: HTMLElement) {
  const button = saveButton(container);
  await act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("establishing selected temporal truth", () => {
  it("writes nothing until the explicit Save for each meaning", async () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(
      <EstablishHarness sink={sink} contexts={[{ id: "context-1", name: "Deep work" }]} />,
    );
    selectHours(view.surface, 18, 21);
    step(view.container, "Later End minute", 2);
    expect(sink).toHaveLength(0);

    clickLabel(view.container, "Protect this time");
    typeInto(view.container, "canvas-protected-label", "Family");
    expect(sink).toHaveLength(0);
    expect(saveButton(view.container).hasAttribute("disabled")).toBe(false);
    await clickSave(view.container);
    expect(sink).toHaveLength(1);
    expect(sink[0]?.meaning).toBe("protected_time");
    if (sink[0]?.meaning !== "protected_time") throw new Error("Expected protected time.");
    expect(sink[0].input).toMatchObject({
      kind: "timed",
      startsOn: day,
      startLocal: "18:00",
      endLocal: "21:02",
      label: "Family",
    });
    expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();
    expect(selection(view.container)).toBeNull();
  });

  it("requires a purpose, keeps Context optional, and does not infer it", async () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(
      <EstablishHarness sink={sink} contexts={[{ id: "context-1", name: "Deep work" }]} />,
    );
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    expect(saveButton(view.container).hasAttribute("disabled")).toBe(true);
    await clickSave(view.container);
    expect(sink).toHaveLength(0);
    typeInto(view.container, "canvas-block-purpose", "Write");
    expect(sink).toHaveLength(0);
    const context = view.container.querySelector<HTMLSelectElement>("#canvas-block-context");
    expect(context?.value).toBe("");
    await clickSave(view.container);
    expect(sink).toHaveLength(1);
    if (sink[0]?.meaning !== "block") throw new Error("Expected a block.");
    expect(sink[0].input).toMatchObject({
      kind: "timed",
      purpose: "Write",
      contextId: null,
      startLocal: "18:00",
      endLocal: "21:00",
    });
    expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();

    const chosen: CanvasEstablishment[] = [];
    const again = renderHarness(
      <EstablishHarness sink={chosen} contexts={[{ id: "context-1", name: "Deep work" }]} />,
    );
    selectHours(again.surface, 8, 9, 4);
    clickLabel(again.container, "Choose a purpose");
    typeInto(again.container, "canvas-block-purpose", "Read");
    const select = again.container.querySelector<HTMLSelectElement>("#canvas-block-context");
    if (!select) throw new Error("Missing context");
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, "context-1");
    act(() => {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await clickSave(again.container);
    if (chosen[0]?.meaning !== "block") throw new Error("Expected a block.");
    expect(chosen[0].input).toMatchObject({ purpose: "Read", contextId: "context-1" });
  });

  it("requires a commitment title and establishes only that fact", async () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(<EstablishHarness sink={sink} />);
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Add a commitment");
    expect(saveButton(view.container).hasAttribute("disabled")).toBe(true);
    typeInto(view.container, "canvas-commitment-title", "School pickup");
    expect(sink).toHaveLength(0);
    await clickSave(view.container);
    if (sink[0]?.meaning !== "commitment") throw new Error("Expected a commitment.");
    expect(sink[0].input).toMatchObject({
      kind: "timed",
      title: "School pickup",
      origin: "user_created",
      startLocal: "18:00",
      endLocal: "21:00",
    });
    expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();
    expect(selection(view.container)).toBeNull();
  });

  it("keeps the draft and the surface when persistence fails, and allows another Save", async () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(<EstablishHarness sink={sink} fail="The block was not saved." />);
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    typeInto(view.container, "canvas-block-purpose", "Write");
    await clickSave(view.container);
    expect(sink).toHaveLength(1);
    expect(view.container.querySelector("[data-temporal-handoff]")).not.toBeNull();
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("block");
    expect(view.container.querySelector<HTMLInputElement>("#canvas-block-purpose")?.value).toBe("Write");
    expect(view.container.querySelector("[role='alert']")?.textContent).toContain("The block was not saved.");
    await clickSave(view.container);
    expect(sink).toHaveLength(2);
    expect(view.container.querySelector("[data-temporal-handoff]")).not.toBeNull();
  });

  it("abandons from Close, Clear, and a completed outside tap without writing", () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(<EstablishHarness sink={sink} />);
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    typeInto(view.container, "canvas-block-purpose", "Write");
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[aria-label="Close selected time"]')?.click();
    });
    expect(selection(view.container)).toBeNull();
    expect(view.container.querySelector("[data-temporal-handoff]")).toBeNull();
    expect(sink).toHaveLength(0);

    selectHours(view.surface, 18, 21, 2);
    clickLabel(view.container, "Add a commitment");
    typeInto(view.container, "canvas-commitment-title", "Pickup");
    clickLabel(view.container, "Clear");
    expect(selection(view.container)).toBeNull();
    expect(sink).toHaveLength(0);

    selectHours(view.surface, 18, 21, 3);
    clickLabel(view.container, "Protect this time");
    typeInto(view.container, "canvas-protected-label", "Rest");
    pointer(view.surface, "pointerdown", { pointerId: 11, pointerType: "mouse", clientX: 40, clientY: 10 * 60 });
    pointer(window, "pointermove", { pointerId: 11, pointerType: "mouse", clientX: 44, clientY: 10 * 60 + 4 });
    pointer(window, "pointerup", { pointerId: 11, pointerType: "mouse", clientX: 44, clientY: 10 * 60 + 4 });
    expect(selection(view.container)).toBeNull();
    expect(sink).toHaveLength(0);
  });

  it("does not treat a scroll or an in-progress drag as abandonment", () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(<EstablishHarness sink={sink} />);
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    typeInto(view.container, "canvas-block-purpose", "Write");

    pointer(view.surface, "pointerdown", { pointerId: 12, pointerType: "touch", clientX: 40, clientY: 10 * 60 });
    pointer(window, "pointermove", { pointerId: 12, pointerType: "touch", clientX: 40, clientY: 10 * 60 + 40 });
    pointer(window, "pointerup", { pointerId: 12, pointerType: "touch", clientX: 40, clientY: 10 * 60 + 40 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(view.container.querySelector<HTMLInputElement>("#canvas-block-purpose")?.value).toBe("Write");
    expect(sink).toHaveLength(0);

    pointer(view.surface, "pointerdown", { pointerId: 13, pointerType: "mouse", clientX: 40, clientY: 8 * 60 });
    pointer(window, "pointermove", { pointerId: 13, pointerType: "mouse", clientX: 40, clientY: 9 * 60 });
    pointer(window, "pointerup", { pointerId: 13, pointerType: "mouse", clientX: 40, clientY: 9 * 60 });
    expect(selection(view.container)?.dataset.startMinute).toBe(String(8 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(9 * 60));
    expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
    expect(view.container.querySelector("#canvas-block-purpose")).toBeNull();
    expect(sink).toHaveLength(0);
  });

  it("keeps meaning-specific drafts across refinement and clears them when the meaning changes", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    clickLabel(view.container, "Choose a purpose");
    typeInto(view.container, "canvas-block-purpose", "Write");
    step(view.container, "Later End minute", 4);
    expect(view.container.querySelector<HTMLInputElement>("#canvas-block-purpose")?.value).toBe("Write");
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 4));

    clickLabel(view.container, "Change meaning");
    clickLabel(view.container, "Add a commitment");
    expect(view.container.querySelector("#canvas-block-purpose")).toBeNull();
    expect(view.container.querySelector<HTMLInputElement>("#canvas-commitment-title")?.value).toBe("");
    typeInto(view.container, "canvas-commitment-title", "Pickup");
    step(view.container, "Later Start minute", 3);
    expect(view.container.querySelector<HTMLInputElement>("#canvas-commitment-title")?.value).toBe("Pickup");

    clickLabel(view.container, "Change meaning");
    clickLabel(view.container, "Protect this time");
    expect(view.container.querySelector("#canvas-commitment-title")).toBeNull();
    typeInto(view.container, "canvas-protected-label", "Rest");
    step(view.container, "Later End minute");
    expect(view.container.querySelector<HTMLInputElement>("#canvas-protected-label")?.value).toBe("Rest");
    expect(view.container.textContent).not.toContain("Write");
    expect(view.container.textContent).not.toContain("Pickup");
  });

  it("still establishes over work, protected time, a block, and a commitment", async () => {
    const sink: CanvasEstablishment[] = [];
    const view = renderHarness(<EstablishHarness sink={sink} occupied />);
    selectHours(view.surface, 8, 20);
    const kinds = [...view.container.querySelectorAll("[data-source-kind]")].map(
      (node) => (node as HTMLElement).dataset.sourceKind,
    );
    expect(kinds).toEqual(expect.arrayContaining(["work_schedule", "protected_time", "block", "commitment"]));
    clickLabel(view.container, "Protect this time");
    expect(view.container.textContent).not.toMatch(/conflict|capacity|free\/busy|\bavailable\b|priority/i);
    expect(saveButton(view.container).hasAttribute("disabled")).toBe(false);
    await clickSave(view.container);
    expect(sink).toHaveLength(1);
    expect(sink[0]?.meaning).toBe("protected_time");
  });

  it("refuses to save an unresolved spring-forward or fall-back range", async () => {
    const springSink: CanvasEstablishment[] = [];
    const spring = renderHarness(
      <EstablishHarness
        sink={springSink}
        selectedDay="2026-03-08"
        timeZone="America/Denver"
      />,
    );
    selectHours(spring.surface, 1, 3);
    clickLabel(spring.container, "Protect this time");
    expect(spring.container.querySelector("[data-clock='absent']")?.textContent).toContain(
      "Part of this local clock range does not occur.",
    );
    expect(spring.container.textContent).toContain("Save stays unavailable for this local clock range.");
    expect(saveButton(spring.container).hasAttribute("disabled")).toBe(true);
    await clickSave(spring.container);
    expect(springSink).toHaveLength(0);
    expect(spring.container.querySelector("[data-temporal-handoff]")).not.toBeNull();

    const fallSink: CanvasEstablishment[] = [];
    const fall = renderHarness(
      <EstablishHarness sink={fallSink} selectedDay="2026-11-01" timeZone="America/Denver" />,
    );
    selectHours(fall.surface, 1, 2);
    clickLabel(fall.container, "Add a commitment");
    typeInto(fall.container, "canvas-commitment-title", "Repeated hour");
    expect(fall.container.querySelector("[data-clock='repeated']")).not.toBeNull();
    expect(saveButton(fall.container).hasAttribute("disabled")).toBe(true);
    await clickSave(fall.container);
    expect(fallSink).toHaveLength(0);

    const ordinarySink: CanvasEstablishment[] = [];
    const ordinary = renderHarness(
      <EstablishHarness sink={ordinarySink} selectedDay="2026-03-08" timeZone="America/Denver" />,
    );
    selectHours(ordinary.surface, 8, 9, 6);
    clickLabel(ordinary.container, "Protect this time");
    expect(saveButton(ordinary.container).hasAttribute("disabled")).toBe(false);
    await clickSave(ordinary.container);
    expect(ordinarySink).toHaveLength(1);
  });
});
