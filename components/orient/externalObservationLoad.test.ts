import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composeCurrentTemporalReading,
  type SourceRead,
} from "@/components/currentTemporalReading";
import {
  defineExternalConnection,
  defineExternalTimedFact,
  defineObservedTemporalSource,
} from "@/domain/externalTemporal";

const ready = <T>(rows: readonly T[]): SourceRead<T> => ({ status: "ready", rows });
const failed = <T>(message: string): SourceRead<T> => ({ status: "failed", message });

describe("production external SourceRead wiring", () => {
  it("loads external evidence separately in OrientInstrument", () => {
    const source = readFileSync(join(import.meta.dirname, "OrientInstrument.tsx"), "utf8");
    expect(source).toContain("loadExternalConnections");
    expect(source).toContain("loadObservedTemporalSources");
    expect(source).toContain("loadExternalTemporalFacts");
    expect(source).toContain("externalFacts");
    expect(source).toContain("observeGoogleCalendars");
    // External load remains a separate SourceRead path, not concatenated into Orient arrays.
    expect(source).toMatch(/externalConnections,\s*\n\s*externalSources,\s*\n\s*externalFacts/);
  });

  it("keeps Orient Present complete when external reads fail", () => {
    const reading = composeCurrentTemporalReading({
      instant: new Date("2026-10-07T15:30:00.000Z"),
      timeZone: "UTC",
      work: ready([]),
      protectedTime: ready([]),
      blocks: ready([]),
      commitments: ready([]),
      externalConnections: failed("external down"),
      externalSources: failed("external down"),
      externalFacts: failed("external down"),
    });
    expect(reading.status).toBe("complete");
    if (reading.status !== "complete") throw new Error("complete");
    expect(reading.facts.every((fact) => fact.sourceKind !== "external_temporal")).toBe(true);
  });

  it("admits fresh external facts into Present without credential leakage", () => {
    const connection = defineExternalConnection({
      id: "conn-1",
      userId: "user-1",
      providerType: "google_calendar",
      status: "connected",
      createdAt: "t0",
      updatedAt: "t0",
    });
    const source = defineObservedTemporalSource({
      id: "source-1",
      userId: "user-1",
      connectionId: "conn-1",
      sourceLocalId: "cal-1",
      displayName: "Work",
      selected: true,
      lastAttemptResult: "success_complete",
      lastSuccessfulObservedAt: "2026-10-07T15:00:00.000Z",
      lastSuccessfulWindowStartsOn: "2026-09-30",
      lastSuccessfulWindowEndsBefore: "2026-11-19",
      createdAt: "t0",
      updatedAt: "t0",
    });
    const fact = defineExternalTimedFact({
      id: "fact-1",
      userId: "user-1",
      sourceId: "source-1",
      sourceEventId: "evt-1",
      startAt: new Date("2026-10-07T15:00:00.000Z"),
      endAt: new Date("2026-10-07T16:00:00.000Z"),
      displayLabel: "Standup",
      lastObservedAt: "2026-10-07T15:00:00.000Z",
      createdAt: "t0",
      updatedAt: "t0",
    });
    const reading = composeCurrentTemporalReading({
      instant: new Date("2026-10-07T15:30:00.000Z"),
      timeZone: "UTC",
      work: ready([]),
      protectedTime: ready([]),
      blocks: ready([]),
      commitments: ready([]),
      externalConnections: ready([connection]),
      externalSources: ready([source]),
      externalFacts: ready([fact]),
    });
    expect(reading.status).toBe("complete");
    if (reading.status !== "complete") throw new Error("complete");
    expect(reading.facts.some((item) => item.sourceKind === "external_temporal")).toBe(true);
    expect(JSON.stringify(reading)).not.toMatch(/access_token|refresh_token|ciphertext|client_secret/);
  });
});
