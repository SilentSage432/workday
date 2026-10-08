import { describe, expect, it } from "vitest";
import type {
  StewardshipDefinition,
  StewardshipDefinitionRevision,
  StewardshipSatisfaction,
} from "@/domain/stewardship";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";
import {
  civilWorkDateAt,
  currentCycleKeyForDefinition,
  operativeWorkdayCycleKey,
  previousCivilWorkDate,
  readStewardshipOccurrence,
} from "@/projections/stewardship";

const ZONE = "America/Denver";
const DEF_ID = "00000000-0000-4000-8000-000000000001";
const REV_A = "00000000-0000-4000-8000-000000000010";
const REV_B = "00000000-0000-4000-8000-000000000011";

function definition(partial?: Partial<StewardshipDefinition>): StewardshipDefinition {
  return {
    id: DEF_ID,
    cycleKind: "workday",
    contextId: null,
    establishedAt: "2026-10-01T12:00:00.000Z",
    retiredAt: null,
    ...partial,
  };
}

function revision(
  id: string,
  content: string,
  effectiveAt: string,
): StewardshipDefinitionRevision {
  return { id, definitionId: DEF_ID, content, effectiveAt };
}

describe("stewardship projection helpers", () => {
  it("admits workday Scheduled and rejects Off and missing", () => {
    const scheduled = scheduledWorkDay({
      workOn: "2026-10-07",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const reading = readStewardshipOccurrence({
      definition: definition({ cycleKind: "workday" }),
      revisions: [revision(REV_A, "Review pipelines", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "workday",
      cycleKey: "2026-10-07",
      timeZone: ZONE,
      workEntries: [scheduled],
      viewpointWorkEntry: scheduled,
    });
    expect(reading.admitted).toBe(true);
    expect(reading.relevant).toBe(true);
    expect(reading.actPrimaryEligible).toBe(true);
    expect(reading.notYetSatisfied).toBe(true);
    expect(reading.wording).toBe("Review pipelines");

    const off = readStewardshipOccurrence({
      definition: definition({ cycleKind: "workday" }),
      revisions: [revision(REV_A, "Review pipelines", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "workday",
      cycleKey: "2026-10-08",
      timeZone: ZONE,
      workEntries: [offWorkDay("2026-10-08")],
      viewpointWorkEntry: offWorkDay("2026-10-08"),
    });
    expect(off.admitted).toBe(false);
    expect(off.notYetSatisfied).toBe(false);

    const missing = readStewardshipOccurrence({
      definition: definition({ cycleKind: "workday" }),
      revisions: [revision(REV_A, "Review pipelines", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "workday",
      cycleKey: "2026-10-09",
      timeZone: ZONE,
      workEntries: [],
      viewpointWorkEntry: null,
    });
    expect(missing.admitted).toBe(false);
    expect(missing.relevant).toBe(false);
  });

  it("keeps weekly occurrence relevant on Off while ACT primary requires Scheduled", () => {
    const weekKey = "2026-10-03";
    const offDay = offWorkDay("2026-10-08");
    const scheduled = scheduledWorkDay({
      workOn: "2026-10-07",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const onOff = readStewardshipOccurrence({
      definition: definition({ cycleKind: "lowes_fiscal_week" }),
      revisions: [revision(REV_A, "Walk Zone A with owner", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "lowes_fiscal_week",
      cycleKey: weekKey,
      timeZone: ZONE,
      workEntries: [offDay],
      viewpointWorkEntry: offDay,
    });
    expect(onOff.relevant).toBe(true);
    expect(onOff.admitted).toBe(true);
    expect(onOff.actPrimaryEligible).toBe(false);
    expect(onOff.notYetSatisfied).toBe(true);

    const onScheduled = readStewardshipOccurrence({
      definition: definition({ cycleKind: "lowes_fiscal_week" }),
      revisions: [revision(REV_A, "Walk Zone A with owner", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "lowes_fiscal_week",
      cycleKey: weekKey,
      timeZone: ZONE,
      workEntries: [scheduled],
      viewpointWorkEntry: scheduled,
    });
    expect(onScheduled.actPrimaryEligible).toBe(true);
  });

  it("uses overnight Scheduled work_on as the workday cycle key", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-07",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    // 2026-10-08 01:00 MDT = 2026-10-08T07:00:00.000Z
    const duringTail = new Date("2026-10-08T07:00:00.000Z");
    expect(civilWorkDateAt(duringTail, ZONE)).toBe("2026-10-08");
    expect(previousCivilWorkDate("2026-10-08")).toBe("2026-10-07");
    expect(
      operativeWorkdayCycleKey({
        instant: duringTail,
        timeZone: ZONE,
        todayEntry: null,
        previousEntry: overnight,
      }),
    ).toBe("2026-10-07");
    expect(
      currentCycleKeyForDefinition({
        cycleKind: "workday",
        instant: duringTail,
        timeZone: ZONE,
        todayEntry: null,
        previousEntry: overnight,
      }),
    ).toBe("2026-10-07");
  });

  it("uses Saturday fiscal-week keys for weekly definitions", () => {
    const wednesday = new Date("2026-10-07T18:00:00.000Z");
    expect(
      currentCycleKeyForDefinition({
        cycleKind: "lowes_fiscal_week",
        instant: wednesday,
        timeZone: ZONE,
        todayEntry: null,
        previousEntry: null,
      }),
    ).toBe("2026-10-03");
  });

  it("reconstructs satisfied and unsatisfied history without occurrence rows", () => {
    const satisfaction: StewardshipSatisfaction = {
      definitionId: DEF_ID,
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      satisfiedAt: "2026-10-08T20:10:00.000Z",
    };
    const satisfied = readStewardshipOccurrence({
      definition: definition({ cycleKind: "lowes_fiscal_week" }),
      revisions: [
        revision(REV_A, "Walk Zone A with owner", "2026-10-01T12:00:00.000Z"),
        revision(REV_B, "Walk Zone A revised", "2026-10-09T12:00:00.000Z"),
      ],
      satisfactions: [satisfaction],
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      timeZone: ZONE,
      workEntries: [],
      viewpointWorkEntry: scheduledWorkDay({
        workOn: "2026-10-08",
        startLocal: "09:00",
        endLocal: "17:00",
        shiftType: "mid",
      }),
    });
    expect(satisfied.satisfied).toBe(true);
    expect(satisfied.satisfiedAt).toBe("2026-10-08T20:10:00.000Z");
    expect(satisfied.wording).toBe("Walk Zone A with owner");
    expect(satisfied.notYetSatisfied).toBe(false);

    const unsatisfied = readStewardshipOccurrence({
      definition: definition({ cycleKind: "lowes_fiscal_week" }),
      revisions: [revision(REV_A, "Walk Zone B with owner", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      timeZone: ZONE,
      workEntries: [],
      viewpointWorkEntry: null,
    });
    expect(unsatisfied.admitted).toBe(true);
    expect(unsatisfied.satisfied).toBe(false);
    expect(unsatisfied.notYetSatisfied).toBe(true);
    expect(unsatisfied.wording).toBe("Walk Zone B with owner");
  });

  it("stops future admission after retirement without satisfying the current cycle", () => {
    const current = readStewardshipOccurrence({
      definition: definition({
        cycleKind: "lowes_fiscal_week",
        retiredAt: "2026-10-08T18:00:00.000Z",
      }),
      revisions: [revision(REV_A, "Carpet wall ownership", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      timeZone: ZONE,
      workEntries: [],
      viewpointWorkEntry: null,
    });
    expect(current.admitted).toBe(true);
    expect(current.satisfied).toBe(false);

    const nextWeek = readStewardshipOccurrence({
      definition: definition({
        cycleKind: "lowes_fiscal_week",
        retiredAt: "2026-10-08T18:00:00.000Z",
      }),
      revisions: [revision(REV_A, "Carpet wall ownership", "2026-10-01T12:00:00.000Z")],
      satisfactions: [],
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-10",
      timeZone: ZONE,
      workEntries: [],
      viewpointWorkEntry: null,
    });
    expect(nextWeek.admitted).toBe(false);
    expect(nextWeek.notYetSatisfied).toBe(false);
  });
});
