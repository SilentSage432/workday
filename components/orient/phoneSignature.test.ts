import { describe, expect, it } from "vitest";
import { membershipCopy, minuteFromSignatureRatio, overlappingFacts, signaturePlacement, signatureScrollTop } from "@/components/orient/phoneSignature";
import type { CurrentTemporalFact } from "@/projections/currentTemporalOrientation";

describe("phone day signature", () => {
  it("maps a local-clock minute onto the day without scoring it", () => {
    expect(signaturePlacement(9 * 60, 17 * 60).start).toBeCloseTo(9 / 24, 10);
    expect(signaturePlacement(9 * 60, 17 * 60).width).toBeCloseTo(8 / 24, 10);
    expect(signaturePlacement(10 * 60, 11 * 60).start).toBe(10 / 24);
    expect(signaturePlacement(0, 24 * 60)).toEqual({ start: 0, width: 1 });
    expect(minuteFromSignatureRatio(0.5)).toBe(12 * 60);
    expect(minuteFromSignatureRatio(0)).toBe(0);
    expect(minuteFromSignatureRatio(1)).toBe(24 * 60 - 1);
    expect(minuteFromSignatureRatio(Number.NaN)).toBe(0);
    expect(signatureScrollTop(1000, 1440, 12 * 60, 700)).toBe(1000 + 0.5 * 1440 - 700 * 0.22);
  });

  it("keeps overlapping facts together and does not drop either", () => {
    const work = { sourceKind: "work_schedule" as const, sourceId: "2026-10-05", visibleStartMinute: 9 * 60, visibleEndMinute: 17 * 60 };
    const block = { sourceKind: "block" as const, sourceId: "block-1", visibleStartMinute: 10 * 60, visibleEndMinute: 11 * 60 };
    expect(overlappingFacts(block, [work, block])).toEqual([
      { sourceKind: "work_schedule", sourceId: "2026-10-05" },
      { sourceKind: "block", sourceId: "block-1" },
    ]);
  });

  it("names a containing truth without calling it current activity", () => {
    const fact: CurrentTemporalFact = {
      sourceKind: "block",
      sourceId: "block-1",
      startsOn: "2026-10-05",
      purpose: "Write",
      taskId: null,
      allDay: false,
      startLocal: "10:00",
      endLocal: "11:00",
      endsNextCivilDate: false,
    };
    const copy = membershipCopy(fact);
    expect(copy.kind).toBe("Block");
    expect(copy.name).toBe("Write");
    expect(copy.interval).toContain("10");
    expect(`${copy.kind} ${copy.name} ${copy.interval}`).not.toMatch(/current activity|recommended|coming next|available|free/i);
  });
});
