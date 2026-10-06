import { describe, expect, it } from "vitest";
import { addCivilDays, formatCivilDate, parseCivilDate, workFiscalWeekStart } from "@/domain/time/workFiscalWeek";
import { orientCivilDate } from "@/components/orient/grammar";
import {
  contentTop,
  extendSpan,
  initialVerticalSpan,
  nearEdge,
  nowScrollTarget,
  observedCivilDate,
  spanContaining,
  viewpointAfterScroll,
} from "@/components/orient/fieldScroll";

function shift(date: string, delta: number): string {
  return formatCivilDate(addCivilDays(parseCivilDate(date), delta));
}

describe("vertical field scroll ownership", () => {
  it("places Now from its position in the scroll content", () => {
    const markInClock = 800;
    const todayStartsAt = 2400;
    const markContentTop = contentTop(todayStartsAt + markInClock, 0, 0);
    expect(markContentTop).toBe(3200);
    expect(nowScrollTarget(markInClock, 700)).toBeLessThan(1200);
    expect(nowScrollTarget(markContentTop, 700)).toBeGreaterThan(todayStartsAt);
  });

  it("does not open a fresh production day on the fiscal Saturday before October 5", () => {
    const monday = new Date("2026-10-05T16:00:00.000Z");
    expect(orientCivilDate(monday, "America/Boise")).toBe("2026-10-05");
    expect(formatCivilDate(workFiscalWeekStart(monday, "America/Boise"))).toBe("2026-10-03");
    expect(initialVerticalSpan("2026-10-05", shift)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(initialVerticalSpan("2026-10-05", shift)).not.toContain("2026-10-03");
  });

  it("keeps mounted days when the viewpoint crosses midnight", () => {
    const mounted = ["2026-10-04", "2026-10-05", "2026-10-06"];
    expect(spanContaining(mounted, "2026-10-04", initialVerticalSpan("2026-10-04", shift))).toBe(mounted);
    expect(spanContaining(mounted, "2026-12-31", ["2026-12-30", "2026-12-31", "2027-01-01"])).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("extends one civil day at an edge without duplicating it", () => {
    const mounted = ["2026-10-04", "2026-10-05", "2026-10-06"];
    expect(extendSpan(mounted, "earlier", shift)).toEqual(["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(extendSpan(mounted, "later", shift)[3]).toBe("2026-10-07");
    expect(extendSpan(["2026-10-04", "2026-10-05"], "earlier", shift)).toEqual(["2026-10-03", "2026-10-04", "2026-10-05"]);
  });

  it("ignores an unmeasured field and a programmatic scroll", () => {
    const days = [
      { date: "2026-10-04", contentTop: 0 },
      { date: "2026-10-05", contentTop: 0 },
      { date: "2026-10-06", contentTop: 0 },
    ];
    expect(observedCivilDate(days, 48, false)).toBeNull();
    expect(
      observedCivilDate(
        [
          { date: "2026-10-04", contentTop: 0 },
          { date: "2026-10-05", contentTop: 1400 },
          { date: "2026-10-06", contentTop: 2800 },
        ],
        1500,
        true,
      ),
    ).toBeNull();
    expect(
      observedCivilDate(
        [
          { date: "2026-10-04", contentTop: 0 },
          { date: "2026-10-05", contentTop: 1400 },
          { date: "2026-10-06", contentTop: 2800 },
        ],
        1500,
        false,
      ),
    ).toBe("2026-10-05");
  });

  it("does not rewrite the viewpoint when the probe stays on the same civil date", () => {
    expect(viewpointAfterScroll("2026-10-06", "2026-10-06")).toBeNull();
    expect(viewpointAfterScroll("2026-10-06", null)).toBeNull();
    expect(viewpointAfterScroll("2026-10-05", "2026-10-04")).toBe("2026-10-04");
  });

  it("does not treat a short field as an edge", () => {
    expect(nearEdge(0, 400, 0, 64)).toBeNull();
    expect(nearEdge(0, 400, 400, 64)).toBeNull();
    expect(nearEdge(10, 4000, 700, 64)).toBe("earlier");
    expect(nearEdge(3300, 4000, 700, 64)).toBe("later");
    expect(nearEdge(800, 4000, 700, 64)).toBeNull();
  });
});
