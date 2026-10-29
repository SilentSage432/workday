import { describe, expect, it } from "vitest";
import {
  floorCommandEvidenceCopy,
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
      "Observed October 28 at 6:40 PM MDT. Source sequence 8, revision c3a29fab9de35ca0. This is retained evidence, not a live Floor Command reading.",
    );
    expect(copy.ageSentence).toBe(
      "Not checked since October 28 at 6:40 PM MDT. Source changes since then are not known.",
    );
    expect(copy.observedSentence).not.toContain("up to date");
    expect(copy.observedSentence).not.toContain("current");
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
    expect(unchanged.followUpSentence).toContain("The source revision was the same.");

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
});
