import { describe, expect, it } from "vitest";
import { topmostRenderedFact, type RenderedFactBox } from "@/components/factAddress";

function box(overrides: Partial<RenderedFactBox> & Pick<RenderedFactBox, "sourceKind" | "sourceId">): RenderedFactBox {
  return {
    left: 0,
    top: 0,
    right: 100,
    bottom: 40,
    zIndex: 0,
    paintIndex: 0,
    ...overrides,
  };
}

describe("topmost rendered fact", () => {
  it("returns nothing where no painted box contains the point", () => {
    expect(
      topmostRenderedFact([box({ sourceKind: "protected_time", sourceId: "a", top: 100, bottom: 140 })], 10, 10),
    ).toBeNull();
  });

  it("uses the higher painted layer when boxes overlap, without ranking kinds", () => {
    const work = box({ sourceKind: "work_schedule", sourceId: "day", zIndex: 0, paintIndex: 0 });
    const protectedTime = box({
      sourceKind: "protected_time",
      sourceId: "family",
      zIndex: 1,
      paintIndex: 1,
    });
    expect(topmostRenderedFact([work, protectedTime], 20, 20)).toEqual({
      sourceKind: "protected_time",
      sourceId: "family",
    });
    expect(topmostRenderedFact([protectedTime, work], 20, 20)?.sourceKind).toBe("protected_time");
  });

  it("uses later paint order when the stacking value is the same", () => {
    const earlier = box({ sourceKind: "block", sourceId: "studio", zIndex: 10, paintIndex: 2, right: 50 });
    const later = box({ sourceKind: "commitment", sourceId: "school", zIndex: 10, paintIndex: 3, left: 40 });
    expect(topmostRenderedFact([earlier, later], 45, 10)).toEqual({
      sourceKind: "commitment",
      sourceId: "school",
    });
    expect(topmostRenderedFact([earlier, later], 10, 10)).toEqual({
      sourceKind: "block",
      sourceId: "studio",
    });
  });
});
