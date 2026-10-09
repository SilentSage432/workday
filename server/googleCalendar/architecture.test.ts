import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");

function walkFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path, predicate));
    else if (predicate(entry)) out.push(path);
  }
  return out;
}

describe("Google Calendar Tranche 4 architectural guards", () => {
  it("keeps Google DTOs out of provider-neutral domain and projections", () => {
    const files = [
      "domain/externalTemporal.ts",
      "projections/timeline.ts",
      "projections/currentTemporalOrientation.ts",
      "projections/dayCanvas.ts",
      "projections/weekShape.ts",
      "projections/month.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(root, relative), "utf8");
      expect(source).not.toMatch(/GoogleEvent|events\.list|googleapis|originalStartTime/);
      expect(source).not.toMatch(/server\/googleCalendar/);
    }
  });

  it("does not import Google Calendar adapter into production OrientView composition", () => {
    const source = readFileSync(join(root, "components/orient/OrientView.tsx"), "utf8");
    expect(source).not.toMatch(/server\/googleCalendar|listGoogleCalendarEvents|mapGoogleEvent/);
  });

  it("does not add googleapis dependency", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.googleapis).toBeUndefined();
    expect(pkg.devDependencies?.googleapis).toBeUndefined();
  });

  it("keeps observation writes on the server observe path, not browser persistence writers", () => {
    const browserPersistence = readFileSync(join(root, "persistence/externalTemporal.ts"), "utf8");
    expect(browserPersistence).not.toMatch(/persist_external_source_observation|insert\(|upsert\(/);
    const observe = readFileSync(join(root, "server/googleCalendar/observe.ts"), "utf8");
    expect(observe).toContain("persistSourceObservation");
    expect(observe).toContain("listGoogleCalendarEvents");
  });

  it("does not create Task/ActiveThread/Work/Commitment writers in observation modules", () => {
    const files = walkFiles(join(root, "server/googleCalendar"), (name) => name.endsWith(".ts")).filter(
      (file) => !file.endsWith(".test.ts"),
    );
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/createTask|establishActiveThread|saveWorkWeek|createCommitment|createBlock|createProtectedTime/);
    }
  });

  it("does not publish external facts/sources to realtime in this tranche", () => {
    const coherence = readFileSync(join(root, "components/orient/canonicalCoherence.ts"), "utf8");
    expect(coherence).not.toMatch(/external_temporal_facts|external_temporal_sources/);
    const migrations = walkFiles(join(root, "supabase/migrations"), (name) => name.endsWith(".sql"));
    for (const file of migrations) {
      const sql = readFileSync(file, "utf8");
      expect(sql).not.toMatch(
        /alter publication supabase_realtime add table public\.external_temporal_(facts|sources|connections)/,
      );
    }
  });

  it("keeps authenticated external fact writes closed (SELECT-only grants unchanged)", () => {
    const sql = readFileSync(join(root, "supabase/migrations/20261007200000_external_temporal.sql"), "utf8");
    expect(sql).toMatch(/grant select on table public\.external_temporal_facts to authenticated/);
    expect(sql).not.toMatch(/grant insert on table public\.external_temporal_facts to authenticated/);
    const observationSql = readFileSync(
      join(root, "supabase/migrations/20261008010000_persist_external_source_observation.sql"),
      "utf8",
    );
    expect(observationSql).toMatch(/grant execute on function public\.persist_external_source_observation/);
    expect(observationSql).toMatch(/to service_role/);
    expect(observationSql).toMatch(/revoke all on function public\.persist_external_source_observation/);
  });

  it("avoids Sync language in the Google management surface", () => {
    const ui = readFileSync(join(root, "components/orient/ExternalCalendarsOperation.tsx"), "utf8");
    expect(ui).toMatch(/Refresh observed calendars/);
    expect(ui).not.toMatch(/\bSync\b|\bImported\b|\bCopied into Orient\b/);
  });
});
