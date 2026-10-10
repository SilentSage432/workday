import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("ORIENT-PULSE-EXPRESSION-005-I ARRIVAL remains human-inaccessible", () => {
  it("does not expose ARRIVAL creation through production Reach-me / Reminder UI", () => {
    const authorityFiles = [
      "components/orient/BlockPulseAuthority.tsx",
      "components/orient/CommitmentPulseAuthority.tsx",
      "components/orient/Surfaces.tsx",
      "components/orient/OrientInstrument.tsx",
      "persistence/pulse.ts",
    ];
    for (const relative of authorityFiles) {
      const source = readFileSync(join(ROOT, relative), "utf8");
      expect(source).not.toMatch(/Reach me when this begins/i);
      expect(source).not.toMatch(/establishArrival/i);
      expect(source).not.toMatch(/relationship:\s*['"]arrival['"]/);
      expect(source).not.toMatch(/PULSE_RELATIONSHIP_ARRIVAL/);
    }

    const surfaces = readFileSync(join(ROOT, "components/orient/Surfaces.tsx"), "utf8");
    expect(surfaces).toContain('entry.relationship === "relative_before"');

    const persistence = readFileSync(join(ROOT, "persistence/pulse.ts"), "utf8");
    expect(persistence).toContain("relationship: PULSE_RELATIONSHIP_RELATIVE_BEFORE");
    expect(persistence).toContain('.eq("relationship", PULSE_RELATIONSHIP_RELATIVE_BEFORE)');
  });
});
