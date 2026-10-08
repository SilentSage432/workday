import { describe, expect, it } from "vitest";
import {
  cycleInterval,
  definitionActiveForCycle,
  findSatisfaction,
  isStewardshipCycleKind,
  lowesFiscalWeekCycleKey,
  lowesFiscalWeekCycleKeyForCivilDate,
  occurrenceIdentity,
  requireStewardshipContent,
  requireStewardshipCycleKind,
  stewardshipEstablishmentCycleLabel,
  stewardshipOccurrenceCycleLabel,
  wordingAtCycleStart,
  wordingForOccurrence,
  workdayCycleKeyFromEntry,
  type StewardshipDefinition,
  type StewardshipDefinitionRevision,
} from "@/domain/stewardship";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";
import { TASK_ORIGIN_USER_CREATED, type Task } from "@/domain/task";
import type { ActiveThread } from "@/domain/activeThread";
import type { Note } from "@/domain/note";

const ZONE = "America/Denver";
const DEF_ID = "00000000-0000-4000-8000-000000000001";

function definition(partial?: Partial<StewardshipDefinition>): StewardshipDefinition {
  return {
    id: DEF_ID,
    cycleKind: "workday",
    contextId: null,
    establishedAt: "2026-10-04T12:00:00.000Z",
    retiredAt: null,
    ...partial,
  };
}

describe("stewardship domain", () => {
  it("maps cycle kinds to human establishment and occurrence language", () => {
    expect(stewardshipEstablishmentCycleLabel("workday")).toBe("Each workday");
    expect(stewardshipEstablishmentCycleLabel("lowes_fiscal_week")).toBe("Each work week");
    expect(stewardshipOccurrenceCycleLabel("workday")).toBe("Workday");
    expect(stewardshipOccurrenceCycleLabel("lowes_fiscal_week")).toBe("This week");
    expect(JSON.stringify([stewardshipEstablishmentCycleLabel("workday")])).not.toMatch(
      /Business|Inventory|People|Environment|lowes_fiscal_week/,
    );
  });

  it("accepts only closed cycle kinds", () => {
    expect(isStewardshipCycleKind("workday")).toBe(true);
    expect(isStewardshipCycleKind("lowes_fiscal_week")).toBe(true);
    expect(isStewardshipCycleKind("daily")).toBe(false);
    expect(() => requireStewardshipCycleKind("rrule")).toThrow(/workday/);
  });

  it("rejects blank content and keeps surrounding spaces", () => {
    expect(() => requireStewardshipContent("   ")).toThrow(/words/);
    expect(requireStewardshipContent("  keep  ")).toBe("  keep  ");
  });

  it("derives workday keys only from Scheduled Work", () => {
    expect(
      workdayCycleKeyFromEntry(
        scheduledWorkDay({
          workOn: "2026-10-07",
          startLocal: "06:00",
          endLocal: "15:00",
          shiftType: "opening",
        }),
      ),
    ).toBe("2026-10-07");
    expect(workdayCycleKeyFromEntry(offWorkDay("2026-10-08"))).toBeNull();
    expect(workdayCycleKeyFromEntry(null)).toBeNull();
  });

  it("uses Lowe's Saturday-first fiscal week keys", () => {
    expect(lowesFiscalWeekCycleKey(new Date("2026-10-08T18:00:00.000Z"), ZONE)).toBe("2026-10-03");
    expect(lowesFiscalWeekCycleKeyForCivilDate("2026-10-08")).toBe("2026-10-03");
    expect(lowesFiscalWeekCycleKeyForCivilDate("2026-10-03")).toBe("2026-10-03");
  });

  it("resolves wording at cycle_start and ignores later mid-cycle revisions", () => {
    const { start, end } = cycleInterval({
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-03",
      timeZone: ZONE,
    });
    const revisions: StewardshipDefinitionRevision[] = [
      {
        id: "00000000-0000-4000-8000-000000000010",
        definitionId: DEF_ID,
        content: "Walk Zone A with owner",
        effectiveAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000011",
        definitionId: DEF_ID,
        content: "Walk Zone A with owner and inventory exceptions",
        effectiveAt: "2026-10-08T20:00:00.000Z",
      },
    ];
    expect(wordingAtCycleStart(revisions, start)).toBe("Walk Zone A with owner");
    expect(
      wordingForOccurrence({
        definition: definition({ establishedAt: "2026-10-01T12:00:00.000Z" }),
        revisions,
        cycleStart: start,
        cycleEnd: end,
      }),
    ).toBe("Walk Zone A with owner");
    const nextWeek = cycleInterval({
      cycleKind: "lowes_fiscal_week",
      cycleKey: "2026-10-10",
      timeZone: ZONE,
    });
    expect(wordingAtCycleStart(revisions, nextWeek.start)).toBe(
      "Walk Zone A with owner and inventory exceptions",
    );
  });

  it("makes mid-cycle establishment readable without letting later edits rewrite the cycle", () => {
    const { start, end } = cycleInterval({
      cycleKind: "workday",
      cycleKey: "2026-10-07",
      timeZone: ZONE,
    });
    const revisions: StewardshipDefinitionRevision[] = [
      {
        id: "00000000-0000-4000-8000-000000000010",
        definitionId: DEF_ID,
        content: "Review pipelines",
        effectiveAt: "2026-10-07T18:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000011",
        definitionId: DEF_ID,
        content: "Review specialty pipelines",
        effectiveAt: "2026-10-07T20:00:00.000Z",
      },
    ];
    expect(wordingAtCycleStart(revisions, start)).toBeNull();
    expect(
      wordingForOccurrence({
        definition: definition({ establishedAt: "2026-10-07T18:00:00.000Z" }),
        revisions,
        cycleStart: start,
        cycleEnd: end,
      }),
    ).toBe("Review pipelines");
  });

  it("admits definitions whose active interval overlaps the cycle", () => {
    const { start, end } = cycleInterval({
      cycleKind: "workday",
      cycleKey: "2026-10-07",
      timeZone: ZONE,
    });
    expect(
      definitionActiveForCycle({
        definition: definition({ establishedAt: "2026-10-06T12:00:00.000Z", retiredAt: null }),
        cycleStart: start,
        cycleEnd: end,
      }),
    ).toBe(true);
    expect(
      definitionActiveForCycle({
        definition: definition({
          establishedAt: "2026-10-01T12:00:00.000Z",
          retiredAt: "2026-10-07T00:00:00.000Z",
        }),
        cycleStart: start,
        cycleEnd: end,
      }),
    ).toBe(false);
    expect(
      definitionActiveForCycle({
        definition: definition({
          establishedAt: "2026-10-01T12:00:00.000Z",
          retiredAt: "2026-10-07T18:00:00.000Z",
        }),
        cycleStart: start,
        cycleEnd: end,
      }),
    ).toBe(true);
  });

  it("finds satisfaction by occurrence identity only", () => {
    const identity = occurrenceIdentity({
      definitionId: DEF_ID,
      cycleKind: "workday",
      cycleKey: "2026-10-07",
    });
    expect(
      findSatisfaction(
        [
          {
            definitionId: DEF_ID,
            cycleKind: "workday",
            cycleKey: "2026-10-07",
            satisfiedAt: "2026-10-07T15:40:00.000Z",
          },
        ],
        identity,
      )?.satisfiedAt,
    ).toBe("2026-10-07T15:40:00.000Z");
    expect(findSatisfaction([], identity)).toBeNull();
  });

  it("does not alter Task, MustDo, ActiveThread, or Note shapes", () => {
    const task: Task = {
      id: "00000000-0000-4000-8000-000000000099",
      title: "Call customer",
      contextId: null,
      createdAt: "2026-10-07T12:00:00.000Z",
      completedAt: null,
      dueOn: null,
      plannedOn: null,
      plannedLocal: null,
      mustDo: true,
      origin: TASK_ORIGIN_USER_CREATED,
      originatingNoteId: null,
    };
    const thread: ActiveThread = {
      taskId: task.id,
      establishedAt: "2026-10-07T13:00:00.000Z",
    };
    const note: Note = {
      id: "00000000-0000-4000-8000-000000000098",
      content: "Showroom observation",
      capturedAt: "2026-10-07T14:00:00.000Z",
    };
    expect(task.mustDo).toBe(true);
    expect(thread.taskId).toBe(task.id);
    expect(note.content).toContain("observation");
    expect(occurrenceIdentity).not.toBe(task);
  });
});
