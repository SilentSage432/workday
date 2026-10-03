/**
 * @vitest-environment happy-dom
 */
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DayCanvas } from "@/components/DayCanvas";
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
    pointer(window, "pointerup", { pointerId: 1, pointerType: "mouse", clientX: 20, clientY: 10 * 60 });
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

function setClock(container: HTMLElement, label: string, value: string) {
  const select = container.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`);
  if (!select) throw new Error(`Missing ${label}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  act(() => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
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
    expect(handoff?.querySelector('[aria-label="Start minute"]')).not.toBeNull();
    expect(handoff?.querySelector('[aria-label="End minute"]')).not.toBeNull();
  });

  it("updates the one selection when the start or end minute changes", () => {
    const view = renderCanvas({ model: modelFor(day, zone, true) });
    const facts = () => view.container.querySelectorAll("[data-source-kind]").length;
    selectHours(view.surface, 18, 21);
    const before = facts();
    setClock(view.container, "End minute", "7");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 7));
    expect(view.container.querySelector("[data-selection-label]")?.textContent).toContain("6:00 PM – 9:07 PM");
    setClock(view.container, "Start minute", "15");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60 + 15));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 7));
    expect(facts()).toBe(before);
    expect(view.container.querySelectorAll("[data-selection='time']")).toHaveLength(1);
  });

  it("keeps the previous range when a precise edit is reversed or empty", () => {
    const view = renderCanvas();
    selectHours(view.surface, 18, 21);
    setClock(view.container, "Start hour", "10");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
    expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60));
    expect(view.container.querySelector("[data-range-order='reversed']")?.textContent).toContain(
      "The start is after the end.",
    );
    setClock(view.container, "Start hour", "6");
    setClock(view.container, "End hour", "6");
    setClock(view.container, "End minute", "0");
    expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
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
      setClock(view.container, "End minute", "20");
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe(meaning);
      expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 20));
      expect(selection(view.container)?.dataset.startMinute).toBe(String(18 * 60));
      clickLabel(view.container, "Change meaning");
      expect(meaningPanel(view.container)?.dataset.meaningChoice).toBe("asking");
      expect(selection(view.container)?.dataset.endMinute).toBe(String(21 * 60 + 20));
      setClock(view.container, "End minute", "0");
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
    setClock(spring.container, "End hour", "2");
    setClock(spring.container, "End minute", "10");
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
    setClock(fall.container, "Start hour", "1");
    setClock(fall.container, "Start minute", "7");
    setClock(fall.container, "End hour", "1");
    setClock(fall.container, "End minute", "20");
    expect(selection(fall.container)?.dataset.startMinute).toBe("67");
    expect(selection(fall.container)?.dataset.endMinute).toBe("80");
    expect(fall.container.querySelector("[data-clock='repeated']")?.textContent).toContain(
      "Part of this local clock range occurs twice.",
    );
  });
});
