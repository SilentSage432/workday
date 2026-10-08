import { describe, expect, it } from "vitest";
import { composeActAttention, actStewardshipWorkContext } from "@/components/orient/actAttention";
import type {
  StewardshipDefinition,
  StewardshipDefinitionRevision,
  StewardshipSatisfaction,
} from "@/domain/stewardship";
import type { Task } from "@/domain/task";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";

const ZONE = "America/Denver";
const VIEWPOINT = "2026-10-07";
const NOW = new Date("2026-10-07T15:30:00.000Z");
const DEF_A = "00000000-0000-4000-8000-000000000001";
const DEF_B = "00000000-0000-4000-8000-000000000002";
const REV_A = "00000000-0000-4000-8000-000000000010";
const REV_B = "00000000-0000-4000-8000-000000000011";

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    contextId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: null,
    plannedLocal: null,
    mustDo: false,
    origin: "user_created",
    originatingNoteId: null,
    ...overrides,
  };
}

function definition(partial: Partial<StewardshipDefinition> & Pick<StewardshipDefinition, "id" | "cycleKind">): StewardshipDefinition {
  return {
    contextId: null,
    establishedAt: "2026-10-01T12:00:00.000Z",
    retiredAt: null,
    ...partial,
  };
}

function revision(
  id: string,
  definitionId: string,
  content: string,
  effectiveAt = "2026-10-01T12:00:00.000Z",
): StewardshipDefinitionRevision {
  return { id, definitionId, content, effectiveAt };
}

const scheduled = scheduledWorkDay({
  workOn: VIEWPOINT,
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});

describe("composeActAttention", () => {
  it("places MustDo, stewardship, Today, and Other open without duplication", () => {
    const composition = composeActAttention({
      viewpointCivilDate: VIEWPOINT,
      now: NOW,
      timeZone: ZONE,
      workEntries: [scheduled],
      openTasks: [
        task({ id: "remain", title: "Remain", createdAt: "2026-10-02T00:00:00.000Z" }),
        task({ id: "must", title: "Must", mustDo: true, plannedOn: VIEWPOINT, createdAt: "2026-10-03T00:00:00.000Z" }),
        task({
          id: "plan-late",
          title: "Plan late",
          plannedOn: VIEWPOINT,
          plannedLocal: "16:00",
          createdAt: "2026-10-01T00:00:00.000Z",
        }),
        task({
          id: "plan-early",
          title: "Plan early",
          plannedOn: VIEWPOINT,
          plannedLocal: "09:00",
          createdAt: "2026-10-01T01:00:00.000Z",
        }),
      ],
      definitions: [
        definition({ id: DEF_A, cycleKind: "workday" }),
        definition({ id: DEF_B, cycleKind: "lowes_fiscal_week" }),
      ],
      revisions: [
        revision(REV_A, DEF_A, "Review pipelines"),
        revision(REV_B, DEF_B, "Walk Zone A with owner"),
      ],
      satisfactions: [],
    });

    expect(composition.mustDo.map((item) => item.id)).toEqual(["must"]);
    expect(composition.today.map((item) => item.id)).toEqual(["plan-early", "plan-late"]);
    expect(composition.otherOpen.map((item) => item.id)).toEqual(["remain"]);
    expect(composition.stewardship.map((item) => item.wording)).toEqual([
      "Review pipelines",
      "Walk Zone A with owner",
    ]);
    expect(composition.stewardship.map((item) => item.cycleLabel)).toEqual(["Workday", "This week"]);
    expect(composition.mustDo.some((item) => composition.today.includes(item))).toBe(false);
  });

  it("omits stewardship when Work is Off or missing", () => {
    const off = composeActAttention({
      viewpointCivilDate: VIEWPOINT,
      now: NOW,
      timeZone: ZONE,
      workEntries: [offWorkDay(VIEWPOINT)],
      openTasks: [],
      definitions: [definition({ id: DEF_A, cycleKind: "workday" }), definition({ id: DEF_B, cycleKind: "lowes_fiscal_week" })],
      revisions: [revision(REV_A, DEF_A, "Pipelines"), revision(REV_B, DEF_B, "Walk Zone A")],
      satisfactions: [],
    });
    expect(off.stewardship).toEqual([]);

    const missing = composeActAttention({
      viewpointCivilDate: VIEWPOINT,
      now: NOW,
      timeZone: ZONE,
      workEntries: [],
      openTasks: [],
      definitions: [definition({ id: DEF_A, cycleKind: "workday" }), definition({ id: DEF_B, cycleKind: "lowes_fiscal_week" })],
      revisions: [revision(REV_A, DEF_A, "Pipelines"), revision(REV_B, DEF_B, "Walk Zone A")],
      satisfactions: [],
    });
    expect(missing.stewardship).toEqual([]);
  });

  it("hides satisfied stewardship and keeps weekly satisfaction across later Scheduled days", () => {
    const satisfaction: StewardshipSatisfaction = {
      definitionId: DEF_B,
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      satisfiedAt: "2026-10-08T20:10:00.000Z",
    };
    const thursday = composeActAttention({
      viewpointCivilDate: "2026-10-09",
      now: new Date("2026-10-09T15:30:00.000Z"),
      timeZone: ZONE,
      workEntries: [
        scheduledWorkDay({
          workOn: "2026-10-09",
          startLocal: "06:00",
          endLocal: "15:00",
          shiftType: "opening",
        }),
      ],
      openTasks: [],
      definitions: [definition({ id: DEF_B, cycleKind: "lowes_fiscal_week" })],
      revisions: [revision(REV_B, DEF_B, "Walk Zone A with owner")],
      satisfactions: [satisfaction],
    });
    expect(thursday.stewardship).toEqual([]);
  });

  it("uses overnight operative work_on for the workday cycle key", () => {
    const overnight = scheduledWorkDay({
      workOn: "2026-10-07",
      startLocal: "22:00",
      endLocal: "06:00",
      shiftType: "closing",
    });
    const duringTail = new Date("2026-10-08T07:00:00.000Z");
    const context = actStewardshipWorkContext({
      viewpointCivilDate: "2026-10-08",
      now: duringTail,
      timeZone: ZONE,
      workEntries: [overnight],
    });
    expect(context.workdayCycleKey).toBe("2026-10-07");
    expect(context.gateEntry?.state).toBe("scheduled");

    const composition = composeActAttention({
      viewpointCivilDate: "2026-10-08",
      now: duringTail,
      timeZone: ZONE,
      workEntries: [overnight],
      openTasks: [],
      definitions: [definition({ id: DEF_A, cycleKind: "workday" })],
      revisions: [revision(REV_A, DEF_A, "Closing readiness")],
      satisfactions: [],
    });
    expect(composition.stewardship).toEqual([
      expect.objectContaining({
        definitionId: DEF_A,
        cycleKey: "2026-10-07",
        wording: "Closing readiness",
        cycleLabel: "Workday",
      }),
    ]);
  });

  it("renders zero stewardship truthfully and does not invent categories", () => {
    const composition = composeActAttention({
      viewpointCivilDate: VIEWPOINT,
      now: NOW,
      timeZone: ZONE,
      workEntries: [scheduled],
      openTasks: [task({ id: "only", title: "Only", plannedOn: VIEWPOINT })],
      definitions: [],
      revisions: [],
      satisfactions: [],
    });
    expect(composition.stewardship).toEqual([]);
    expect(composition.today.map((item) => item.id)).toEqual(["only"]);
    expect(JSON.stringify(composition)).not.toMatch(/Business|Inventory|People|Environment/);
  });

  it("excludes completed Tasks and keeps stable section membership keys", () => {
    const composition = composeActAttention({
      viewpointCivilDate: VIEWPOINT,
      now: NOW,
      timeZone: ZONE,
      workEntries: [scheduled],
      openTasks: [
        task({ id: "done", title: "Done", mustDo: true, completedAt: "2026-10-07T12:00:00.000Z" }),
        task({ id: "open", title: "Open", mustDo: true }),
      ],
      definitions: [],
      revisions: [],
      satisfactions: [],
    });
    expect(composition.mustDo.map((item) => item.id)).toEqual(["open"]);
    expect(Object.keys(composition)).toEqual(["mustDo", "stewardship", "today", "otherOpen"]);
  });
});
