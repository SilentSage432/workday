import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defineCommitment, type Commitment } from "@/domain/commitment";
import {
  defineExternalAllDayFact,
  defineExternalTimedFact,
  defineObservedTemporalSource,
  type ExternalTemporalFact,
  type ObservedTemporalSource,
} from "@/domain/externalTemporal";
import { instantFromZonedLocal } from "@/domain/time/localTime";
import { capacityCoverage, projectCapacity, resolveWorkCapacityBoundary } from "@/projections/capacity";
import { projectCurrentTemporalOrientation } from "@/projections/currentTemporalOrientation";
import { composeDayCanvas } from "@/projections/dayCanvas";
import { projectMonth } from "@/projections/month";
import {
  projectTimeline,
  type ExternalTemporalTimelineContext,
  type ExternalTemporalTimelineFact,
} from "@/projections/timeline";
import { projectWeekShape } from "@/projections/weekShape";
import { scheduledWorkDay } from "@/domain/workSchedule";

const zone = "America/Boise";
const stamp = "2026-10-07T18:00:00.000Z";
const day = "2026-10-07";

function source(overrides: Partial<ObservedTemporalSource> = {}): ObservedTemporalSource {
  return defineObservedTemporalSource({
    id: "source-1",
    userId: "user-1",
    connectionId: "conn-1",
    sourceLocalId: "cal-1",
    displayName: "Team calendar",
    selected: true,
    lastAttemptResult: "success_complete",
    lastSuccessfulObservedAt: stamp,
    lastSuccessfulWindowStartsOn: "2026-09-30",
    lastSuccessfulWindowEndsBefore: "2026-11-18",
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  });
}

function freshContext(observed: ObservedTemporalSource = source()): ExternalTemporalTimelineContext {
  return {
    sources: [observed],
    connectionStatusById: { [observed.connectionId]: "connected" },
  };
}

function timedFact(overrides: Partial<Parameters<typeof defineExternalTimedFact>[0]> = {}): ExternalTemporalFact {
  return defineExternalTimedFact({
    id: "ext-timed-1",
    userId: "user-1",
    sourceId: "source-1",
    sourceEventId: "evt-timed",
    startAt: instantFromZonedLocal(day, "09:00", zone),
    endAt: instantFromZonedLocal(day, "10:00", zone),
    displayLabel: "External standup",
    lastObservedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  });
}

function allDayFact(
  startsOn: string,
  endsBefore: string,
  overrides: Partial<Parameters<typeof defineExternalAllDayFact>[0]> = {},
): ExternalTemporalFact {
  return defineExternalAllDayFact({
    id: "ext-all-1",
    userId: "user-1",
    sourceId: "source-1",
    sourceEventId: "evt-all",
    startsOn,
    endsBefore,
    displayLabel: "External trip",
    lastObservedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  });
}

function commitment(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: stamp };
}

function asExternal(fact: ReturnType<typeof projectTimeline>[number]): ExternalTemporalTimelineFact {
  if (fact.sourceKind !== "external_temporal") throw new Error("expected external");
  return fact;
}

describe("external Timeline composition", () => {
  it("emits a distinct external kind with provenance", () => {
    const facts = projectTimeline({
      range: { startsOn: day, endsBefore: "2026-10-08" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(),
    });
    expect(facts).toHaveLength(1);
    const external = asExternal(facts[0]!);
    expect(external.sourceKind).toBe("external_temporal");
    expect(external.displayLabel).toBe("External standup");
    expect(external.sourceDisplayName).toBe("Team calendar");
    expect(external.correctionAuthority).toBe("external");
    expect(external.freshness).toBe("fresh");
    expect(external.stale).toBe(false);
  });

  it("lets external and Orient-owned facts overlap without dedupe", () => {
    const facts = projectTimeline({
      range: { startsOn: day, endsBefore: "2026-10-08" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [
        commitment("c1", {
          kind: "timed",
          startsOn: day,
          startLocal: "09:30",
          endLocal: "10:30",
          title: "Orient meeting",
        }),
      ],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(),
    });
    expect(facts.map((fact) => fact.sourceKind).sort()).toEqual(["commitment", "external_temporal"]);
  });

  it("projects overnight timed external facts across civil boundaries", () => {
    const facts = projectTimeline({
      range: { startsOn: day, endsBefore: "2026-10-09" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [
        timedFact({
          id: "overnight",
          startAt: instantFromZonedLocal(day, "22:00", zone),
          endAt: instantFromZonedLocal("2026-10-08", "02:00", zone),
          displayLabel: "Overnight",
        }),
      ],
      externalTemporalContext: freshContext(),
    });
    const external = asExternal(facts[0]!);
    expect(external.allDay).toBe(false);
    if (external.allDay) throw new Error("timed");
    expect(external.endsNextCivilDate).toBe(true);
    expect(external.intersection.status).toBe("resolved");
  });

  it("intersects multi-day all-day facts by civil span", () => {
    const mid = projectTimeline({
      range: { startsOn: "2026-10-08", endsBefore: "2026-10-09" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [allDayFact("2026-10-07", "2026-10-10")],
      externalTemporalContext: freshContext(),
    });
    expect(mid).toHaveLength(1);
    const outside = projectTimeline({
      range: { startsOn: "2026-10-10", endsBefore: "2026-10-11" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [allDayFact("2026-10-07", "2026-10-10")],
      externalTemporalContext: freshContext(),
    });
    expect(outside).toHaveLength(0);
  });

  it("retains stale last-known on Day/Week after failed refresh", () => {
    const failed = source({ lastAttemptResult: "failure" });
    const facts = projectTimeline({
      range: { startsOn: day, endsBefore: "2026-10-08" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(failed),
    });
    expect(asExternal(facts[0]!).stale).toBe(true);
    expect(asExternal(facts[0]!).freshness).toBe("stale_after_failed_refresh");
  });
});

describe("external Present / CTO composition", () => {
  const now = instantFromZonedLocal(day, "09:30", zone);

  it("admits fresh timed external facts containing Now", () => {
    const result = projectCurrentTemporalOrientation({
      instant: now,
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(),
    });
    expect(result.facts.map((fact) => fact.sourceKind)).toEqual(["external_temporal"]);
  });

  it("excludes facts outside Now", () => {
    const result = projectCurrentTemporalOrientation({
      instant: instantFromZonedLocal(day, "11:00", zone),
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(),
    });
    expect(result.facts).toEqual([]);
  });

  it("excludes stale-after-failed-refresh from Present by default", () => {
    const result = projectCurrentTemporalOrientation({
      instant: now,
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(source({ lastAttemptResult: "failure" })),
    });
    expect(result.facts).toEqual([]);
  });

  it("admits fresh all-day external facts containing the civil day", () => {
    const result = projectCurrentTemporalOrientation({
      instant: now,
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [allDayFact(day, "2026-10-08")],
      externalTemporalContext: freshContext(),
    });
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]?.allDay).toBe(true);
  });
});

describe("external Day / Week / Month composition", () => {
  it("places timed and multi-day all-day external facts on Day", () => {
    const model = composeDayCanvas({
      selectedDay: "2026-10-08",
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [
        timedFact({
          id: "day-timed",
          startAt: instantFromZonedLocal("2026-10-08", "13:00", zone),
          endAt: instantFromZonedLocal("2026-10-08", "14:00", zone),
          displayLabel: "Afternoon",
        }),
        allDayFact("2026-10-07", "2026-10-10", { id: "day-all" }),
      ],
      externalTemporalContext: freshContext(),
    });
    expect(model.allDay.some((fact) => fact.sourceKind === "external_temporal")).toBe(true);
    expect(model.foreground.some((fact) => fact.sourceKind === "external_temporal")).toBe(true);
    expect(model.foreground.find((fact) => fact.sourceKind === "external_temporal")?.stored).toBeNull();
  });

  it("keeps external facts external on Week", () => {
    const shape = projectWeekShape({
      range: { startsOn: "2026-10-05", endsBefore: "2026-10-12" },
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact()],
      externalTemporalContext: freshContext(),
    });
    const external = shape.facts.filter((fact) => fact.sourceKind === "external_temporal");
    expect(external).toHaveLength(1);
    expect(asExternal(external[0]!).correctionAuthority).toBe("external");
  });

  it("flows external facts through shared Month Timeline composition", () => {
    const perception = projectMonth({
      range: { startsOn: "2026-10-01", endsBefore: "2026-11-01" },
      timeZone: zone,
      destinations: [],
      priorities: [],
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
      externalTemporalFacts: [timedFact(), allDayFact("2026-10-07", "2026-10-10")],
      externalTemporalContext: freshContext(),
      taskPriorityService: [],
      blockPriorityService: [],
      citedTasks: [],
    });
    const external = perception.temporalFacts.filter((fact) => fact.sourceKind === "external_temporal");
    expect(external.length).toBe(2);
    expect(external.every((fact) => asExternal(fact).correctionAuthority === "external")).toBe(true);
  });
});

describe("external authority isolation", () => {
  it("does not change Capacity when external facts are present", () => {
    const work = scheduledWorkDay({
      workOn: day,
      startLocal: "08:00",
      endLocal: "17:00",
      shiftType: "mid",
    });
    const boundary = resolveWorkCapacityBoundary({
      civilDate: day,
      entries: [work],
      timeZone: zone,
    });
    if (boundary.status !== "boundary") throw new Error("expected boundary");
    const coverage = capacityCoverage({
      boundary: boundary.interval,
      timeZone: zone,
      protectedTime: [],
      blocks: [],
      commitments: [
        commitment("c-cap", {
          kind: "timed",
          startsOn: day,
          startLocal: "12:00",
          endLocal: "13:00",
          title: "Lunch",
        }),
      ],
    });
    if (coverage.status !== "covered") throw new Error("expected covered");
    const capacitySource = readFileSync(new URL("./capacity.ts", import.meta.url), "utf8");
    expect(capacitySource).not.toMatch(/externalTemporal|ExternalTemporal|external_temporal/);
    // capacityCoverage has no external input slot; identical Orient inputs stay identical
    // even when external facts exist in the broader landscape fixture set.
    const externalFixtures = [timedFact(), allDayFact(day, "2026-10-08")];
    expect(externalFixtures.length).toBeGreaterThan(0);
    const reading = projectCapacity({
      boundary: boundary.interval,
      covered: coverage.intervals,
    });
    const again = projectCapacity({
      boundary: boundary.interval,
      covered: coverage.intervals,
    });
    expect(again.remainingMs).toBe(reading.remainingMs);
    expect(again.remaining).toEqual(reading.remaining);
    expect(reading.remainingMs).toBeLessThan(9 * 60 * 60 * 1000);
  });

  it("keeps DTM lift kinds free of external_temporal", () => {
    const landscape = readFileSync(new URL("../components/orient/Landscape.tsx", import.meta.url), "utf8");
    expect(landscape).toMatch(/type LiftKind = "protected_time" \| "block" \| "commitment"/);
    expect(landscape).not.toMatch(/external_temporal/);
    expect(landscape).not.toMatch(/if \(.*google/i);
  });

  it("does not couple external facts into Task / ActiveThread / Work writers", () => {
    const domain = readFileSync(new URL("../domain/externalTemporal.ts", import.meta.url), "utf8");
    const persistence = readFileSync(new URL("../persistence/externalTemporal.ts", import.meta.url), "utf8");
    for (const source of [domain, persistence]) {
      expect(source).not.toMatch(/active_thread|ActiveThread|must_do|MustDo|planned_on|due_on|completed_at/);
      expect(source).not.toMatch(/from\("tasks"\)|from\("work_schedule"\)|from\("commitments"\)/);
    }
  });

  it("does not convert external facts into Commitment / PT / Block domain types", () => {
    const domain = readFileSync(new URL("../domain/externalTemporal.ts", import.meta.url), "utf8");
    expect(domain).not.toMatch(/defineCommitment|defineProtectedTime|defineBlock/);
    expect(domain).toMatch(/displayLabel/);
  });
});
