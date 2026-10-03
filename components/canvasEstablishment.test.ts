import { describe, expect, it } from "vitest";
import { establishFromSelection, establishmentBlocked } from "@/components/canvasEstablishment";

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
});
