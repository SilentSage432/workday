import { describe, expect, it } from "vitest";
import {
  admitsExternalFactToDayWeek,
  admitsExternalFactToPresent,
  defineExternalAllDayFact,
  defineExternalConnection,
  defineExternalTimedFact,
  defineObservedTemporalSource,
  deriveExternalObservationFreshness,
  externalFactSourceIdentityKey,
  requireDisplayLabel,
  requireExternalFactLifecycle,
} from "@/domain/externalTemporal";
import { instantFromZonedLocal } from "@/domain/time/localTime";

const zone = "America/Boise";
const stamp = "2026-10-07T12:00:00.000Z";

function timed(overrides: Partial<Parameters<typeof defineExternalTimedFact>[0]> = {}) {
  return defineExternalTimedFact({
    id: "fact-1",
    userId: "user-1",
    sourceId: "source-1",
    sourceEventId: "evt-1",
    startAt: instantFromZonedLocal("2026-10-07", "09:00", zone),
    endAt: instantFromZonedLocal("2026-10-07", "10:00", zone),
    displayLabel: "Standup",
    lastObservedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  });
}

describe("external temporal domain", () => {
  it("preserves connection identity and opaque provider type", () => {
    const connection = defineExternalConnection({
      id: "conn-1",
      userId: "user-1",
      providerType: "google_calendar",
      status: "connected",
      createdAt: stamp,
      updatedAt: stamp,
    });
    expect(connection.id).toBe("conn-1");
    expect(connection.providerType).toBe("google_calendar");
  });

  it("preserves observed source identity under a connection", () => {
    const source = defineObservedTemporalSource({
      id: "source-1",
      userId: "user-1",
      connectionId: "conn-1",
      sourceLocalId: "cal-primary",
      displayName: "Work",
      selected: true,
      lastAttemptResult: "success_complete",
      lastSuccessfulObservedAt: stamp,
      lastSuccessfulWindowStartsOn: "2026-09-30",
      lastSuccessfulWindowEndsBefore: "2026-11-18",
      createdAt: stamp,
      updatedAt: stamp,
    });
    expect(source.sourceLocalId).toBe("cal-primary");
    expect(source.displayName).toBe("Work");
  });

  it("treats null and empty instance identity distinctly in the identity key", () => {
    const withNull = externalFactSourceIdentityKey({
      userId: "u",
      sourceId: "s",
      sourceEventId: "e",
      sourceInstanceId: null,
    });
    const withEmpty = externalFactSourceIdentityKey({
      userId: "u",
      sourceId: "s",
      sourceEventId: "e",
      sourceInstanceId: "",
    });
    expect(withNull).toBe(withEmpty);
  });

  it("accepts valid timed shape and rejects inverted instants", () => {
    expect(timed().kind).toBe("timed");
    expect(() =>
      timed({
        startAt: instantFromZonedLocal("2026-10-07", "10:00", zone),
        endAt: instantFromZonedLocal("2026-10-07", "09:00", zone),
      }),
    ).toThrow(/end after/i);
  });

  it("accepts single-day and multi-day all-day spans", () => {
    const one = defineExternalAllDayFact({
      id: "a1",
      userId: "user-1",
      sourceId: "source-1",
      sourceEventId: "all-1",
      startsOn: "2026-10-07",
      endsBefore: "2026-10-08",
      displayLabel: "Holiday",
      lastObservedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    });
    expect(one.endsBefore).toBe("2026-10-08");
    const multi = defineExternalAllDayFact({
      id: "a2",
      userId: "user-1",
      sourceId: "source-1",
      sourceEventId: "all-2",
      startsOn: "2026-10-07",
      endsBefore: "2026-10-10",
      displayLabel: "Trip",
      lastObservedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp,
    });
    expect(multi.endsBefore).toBe("2026-10-10");
  });

  it("rejects invalid all-day bounds", () => {
    expect(() =>
      defineExternalAllDayFact({
        id: "a3",
        userId: "user-1",
        sourceId: "source-1",
        sourceEventId: "all-3",
        startsOn: "2026-10-08",
        endsBefore: "2026-10-08",
        displayLabel: "Bad",
        lastObservedAt: stamp,
        createdAt: stamp,
        updatedAt: stamp,
      }),
    ).toThrow(/end after/i);
  });

  it("requires a non-empty displayLabel", () => {
    expect(requireDisplayLabel("Busy")).toBe("Busy");
    expect(() => requireDisplayLabel("   ")).toThrow(/display label/i);
  });

  it("exposes the accepted lifecycle vocabulary", () => {
    expect(requireExternalFactLifecycle("active")).toBe("active");
    expect(requireExternalFactLifecycle("cancelled")).toBe("cancelled");
    expect(requireExternalFactLifecycle("deleted")).toBe("deleted");
    expect(requireExternalFactLifecycle("absent_from_window")).toBe("absent_from_window");
    expect(() => requireExternalFactLifecycle("maybe")).toThrow(/lifecycle/i);
  });

  it("derives freshness and Present/Day admission from evidence", () => {
    const fact = timed();
    const fresh = deriveExternalObservationFreshness({
      connectionStatus: "connected",
      source: { lastAttemptResult: "success_complete", lastSuccessfulObservedAt: stamp },
    });
    const stale = deriveExternalObservationFreshness({
      connectionStatus: "connected",
      source: { lastAttemptResult: "failure", lastSuccessfulObservedAt: stamp },
    });
    expect(fresh).toBe("fresh");
    expect(stale).toBe("stale_after_failed_refresh");
    expect(admitsExternalFactToPresent({ fact, freshness: fresh })).toBe(true);
    expect(admitsExternalFactToPresent({ fact, freshness: stale })).toBe(false);
    expect(admitsExternalFactToDayWeek({ fact, freshness: stale })).toBe(true);
    expect(
      admitsExternalFactToDayWeek({
        fact: timed({ lifecycle: "cancelled" }),
        freshness: fresh,
      }),
    ).toBe(false);
  });
});
