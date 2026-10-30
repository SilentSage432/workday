import { describe, expect, it } from "vitest";
import {
  floorCommandEvidenceCopy,
  floorCommandObservationOutcomeSentence,
  formatFloorCommandObservedInstant,
} from "@/projections/floorCommandEvidenceCopy";

const OBSERVED = "2026-10-29T00:40:17.666Z";

describe("Floor Command evidence copy", () => {
  it("renders the retained production instant in the confirmed zone", () => {
    expect(formatFloorCommandObservedInstant(OBSERVED, "America/Denver")).toBe(
      "October 28 at 6:40 PM MDT",
    );
    const copy = floorCommandEvidenceCopy({
      observedAt: OBSERVED,
      timeZone: "America/Denver",
      sequence: 8,
      revision: "c3a29fab9de35ca0",
      lastCheckedAt: null,
      request: null,
    });
    expect(copy.observedSentence).toBe(
      "Originally observed October 28 at 6:40 PM MDT. This is retained evidence, not a live Floor Command reading.",
    );
    expect(copy.originallyObserved).toBe("October 28 at 6:40 PM MDT");
    expect(copy.retainedEvidence).toBe("Source sequence 8, revision c3a29fab9de35ca0.");
    expect(copy.lastChecked).toBe(
      "No later check is recorded. Source changes since the original observation are not known.",
    );
    expect(copy.lastChecked).not.toContain("Checked sequence");
    expect(copy.observedSentence).not.toContain("up to date");
    expect(copy.observedSentence).not.toContain("current");
    expect(copy.retainedEvidence).not.toContain("live");
  });

  it("names an unconfirmed zone instead of assuming one", () => {
    expect(formatFloorCommandObservedInstant(OBSERVED, null)).toContain("time zone is unconfirmed");
    expect(formatFloorCommandObservedInstant(OBSERVED, "Not/AZone")).toContain("time zone is unconfirmed");
  });

  it("names an unchanged check and a revised predecessor", () => {
    const unchanged = floorCommandEvidenceCopy({
      observedAt: OBSERVED,
      timeZone: "America/Denver",
      sequence: 8,
      revision: "c3a29fab9de35ca0",
      lastCheckedAt: "2026-11-02T18:00:00.000Z",
      request: {
        operationalWeek: "2026-W44",
        outcome: "unchanged",
        reason: null,
        terminalAt: "2026-11-02T18:00:00.000Z",
        previousObservedAt: null,
        previousSequence: null,
        previousRevision: null,
      },
    });
    expect(unchanged.lastChecked).toContain(
      `${formatFloorCommandObservedInstant("2026-11-02T18:00:00.000Z", "America/Denver")}.`,
    );
    expect(unchanged.lastChecked).toContain("Source changes since that check are not known.");
    expect(unchanged.lastChecked).not.toContain("Checked sequence");
    expect(unchanged.followUpSentence).toBe(
      "That check matched the retained revision. Floor Command can still change after it.",
    );
    const checkedSequence = floorCommandEvidenceCopy({
      observedAt: OBSERVED,
      timeZone: "America/Denver",
      sequence: 8,
      revision: "c3a29fab9de35ca0",
      lastCheckedAt: "2026-11-02T18:00:00.000Z",
      checkedSequence: 8,
      request: null,
    });
    expect(checkedSequence.lastChecked).toContain("Checked sequence 8.");

    const revised = floorCommandEvidenceCopy({
      observedAt: "2026-11-04T18:00:00.000Z",
      timeZone: "America/Denver",
      sequence: 9,
      revision: "rev-next",
      lastCheckedAt: null,
      request: {
        operationalWeek: "2026-W44",
        outcome: "revised",
        reason: null,
        terminalAt: "2026-11-04T18:00:00.000Z",
        previousObservedAt: OBSERVED,
        previousSequence: 8,
        previousRevision: "c3a29fab9de35ca0",
      },
    });
    expect(revised.followUpSentence).toContain("sequence 8");
    expect(revised.followUpSentence).toContain("c3a29fab9de35ca0");
    expect(revised.followUpSentence).toContain("October 28 at 6:40 PM MDT");
  });

  it("names terminal outcomes without calling an unchanged check permanent", () => {
    expect(floorCommandObservationOutcomeSentence("accepted_new")).toContain("accepted_new");
    expect(floorCommandObservationOutcomeSentence("unchanged")).toContain("unchanged");
    expect(floorCommandObservationOutcomeSentence("unchanged")).toContain("can still change later");
    expect(floorCommandObservationOutcomeSentence("revised")).toContain("revised");
    expect(floorCommandObservationOutcomeSentence("rejected")).toContain("rejected");
    expect(floorCommandObservationOutcomeSentence("failed")).toContain("failed");
    expect(floorCommandObservationOutcomeSentence("disabled")).toBe(
      "Floor Command observation was not started.",
    );
  });
});
