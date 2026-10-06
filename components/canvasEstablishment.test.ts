import { describe, expect, it } from "vitest";
import { establishFromSelection, establishmentBlocked, updateFromStored } from "@/components/canvasEstablishment";

const TASK_ID = "00000000-0000-4000-8000-000000000010";

const selection = { civilDate: "2026-10-03", startMinute: 18 * 60, endMinute: 21 * 60 };

describe("canvas establishment", () => {
  it("builds the existing timed inputs and refuses an unresolved clock", () => {
    expect(establishmentBlocked("ordinary")).toBeNull();
    expect(establishmentBlocked("absent")).toContain("Save stays unavailable");
    expect(establishmentBlocked("repeated")).toContain("Save stays unavailable");

    expect(
      establishFromSelection({
        selection,
        meaning: "protected_time",
        clock: "ordinary",
        label: "  ",
        purpose: "",
        contextId: "",
        title: "",
      }),
    ).toMatchObject({
      meaning: "protected_time",
      input: { kind: "timed", label: null, startLocal: "18:00", endLocal: "21:00" },
    });

    expect(() =>
      establishFromSelection({
        selection,
        meaning: "block",
        clock: "absent",
        label: "",
        purpose: "Write",
        contextId: "",
        title: "",
      }),
    ).toThrow(/Save stays unavailable/);

    expect(() =>
      establishFromSelection({
        selection,
        meaning: "commitment",
        clock: "repeated",
        label: "",
        purpose: "",
        contextId: "",
        title: "Pickup",
      }),
    ).toThrow(/Save stays unavailable/);
  });

  it("updates the existing fact and keeps its identity, kind, and commitment origin", () => {
    const shared = {
      startsOn: "2026-10-03",
      startMinute: 16 * 60 + 45,
      endMinute: 17 * 60 + 15,
      clock: "ordinary" as const,
      label: "Family",
      purpose: "Studio",
      contextId: "ctx-1",
      title: "School",
    };
    expect(updateFromStored({ ...shared, id: "protect", meaning: "protected_time" })).toEqual({
      id: "protect",
      meaning: "protected_time",
      input: {
        kind: "timed",
        startsOn: "2026-10-03",
        startLocal: "16:45",
        endLocal: "17:15",
        label: "Family",
      },
    });
    expect(() => updateFromStored({ ...shared, id: "studio", meaning: "block", purpose: "  " })).toThrow(
      /purpose/,
    );
    expect(updateFromStored({ ...shared, id: "studio", meaning: "block" })).toMatchObject({
      id: "studio",
      meaning: "block",
      input: { kind: "timed", purpose: "Studio", contextId: "ctx-1", taskId: null, startLocal: "16:45", endLocal: "17:15" },
    });
    const taskId = "00000000-0000-4000-8000-000000000010";
    expect(
      updateFromStored({
        ...shared,
        id: "studio",
        meaning: "block",
        startMinute: 15 * 60,
        endMinute: 15 * 60 + 30,
        taskId,
      }),
    ).toMatchObject({
      input: { purpose: "Studio", taskId, startLocal: "15:00", endLocal: "15:30" },
    });
    expect(
      establishFromSelection({
        selection,
        meaning: "block",
        clock: "ordinary",
        label: "",
        purpose: "Focus",
        contextId: "",
        title: "Complete quarterly report",
        taskId: TASK_ID,
      }),
    ).toMatchObject({
      meaning: "block",
      input: { purpose: "Focus", taskId: TASK_ID, contextId: null },
    });
    expect(
      establishFromSelection({
        selection: { civilDate: "2026-10-06", startMinute: 13 * 60, endMinute: 14 * 60 },
        meaning: "block",
        clock: "ordinary",
        label: "",
        purpose: "Continue",
        contextId: "",
        title: "",
        taskId: TASK_ID,
      }).input,
    ).toMatchObject({ purpose: "Continue", taskId: TASK_ID, startsOn: "2026-10-06" });

    expect(updateFromStored({ ...shared, id: "school", meaning: "commitment" })).toMatchObject({
      id: "school",
      meaning: "commitment",
      input: { kind: "timed", title: "School", origin: "user_created", startLocal: "16:45", endLocal: "17:15" },
    });
    expect(updateFromStored({ ...shared, id: "school", meaning: "commitment", startsOn: "2026-10-08" })).toMatchObject({
      id: "school",
      meaning: "commitment",
      input: { kind: "timed", startsOn: "2026-10-08", title: "School", origin: "user_created", startLocal: "16:45", endLocal: "17:15" },
    });
  });
});
