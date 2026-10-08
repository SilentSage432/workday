import { describe, expect, it } from "vitest";
import { computeObservationHorizon } from "@/server/googleCalendar/horizon";

describe("computeObservationHorizon", () => {
  it("uses Orient today −7 / +42 civil days and exclusive Google bounds", () => {
    // 2026-10-07 18:00 UTC is still 2026-10-07 in America/Boise (UTC-6).
    const horizon = computeObservationHorizon({
      now: new Date("2026-10-07T18:00:00.000Z"),
      timeZone: "America/Boise",
    });
    expect(horizon.windowStartsOn).toBe("2026-09-30");
    expect(horizon.windowEndsBefore).toBe("2026-11-19");
    expect(horizon.timeMin).toBe(new Date("2026-09-30T06:00:00.000Z").toISOString());
    expect(horizon.timeMax).toBe(new Date("2026-11-19T07:00:00.000Z").toISOString());
    expect(Date.parse(horizon.timeMax)).toBeGreaterThan(Date.parse(horizon.timeMin));
  });
});
