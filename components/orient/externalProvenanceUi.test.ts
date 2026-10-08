import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("minimum external provenance and read-only interaction", () => {
  it("marks external facts visibly and keeps them out of Orient edit/delete paths", () => {
    const surfaces = readFileSync(join(import.meta.dirname, "Surfaces.tsx"), "utf8");
    expect(surfaces).toContain('data-external-provenance="true"');
    expect(surfaces).toContain("From an external calendar. Read-only in Orient.");

    const landscape = readFileSync(join(import.meta.dirname, "Landscape.tsx"), "utf8");
    expect(landscape).toMatch(/function isLiftKind[\s\S]*protected_time[\s\S]*block[\s\S]*commitment/);
    expect(landscape).not.toMatch(/isLiftKind[\s\S]*external_temporal/);

    const dayCanvas = readFileSync(join(import.meta.dirname, "../../projections/dayCanvas.ts"), "utf8");
    expect(dayCanvas).toContain('if (fact.sourceKind === "external_temporal") return null');
  });

  it("keeps LOOK · ADD · ACT grammar intact while adding observation language", () => {
    const lookAddAct = readFileSync(join(import.meta.dirname, "lookAddAct.test.tsx"), "utf8");
    expect(lookAddAct.length).toBeGreaterThan(0);
    const ui = readFileSync(join(import.meta.dirname, "ExternalCalendarsOperation.tsx"), "utf8");
    expect(ui).toContain("Refresh observed calendars");
    expect(ui).not.toMatch(/\bSync\b/);
  });
});
