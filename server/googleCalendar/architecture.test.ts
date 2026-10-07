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

describe("Google Calendar Tranche 3 architectural guards", () => {
  it("contains no Google events.list or Event observation in the Google integration boundary", () => {
    const files = [
      ...walkFiles(join(root, "server/googleCalendar"), (name) => name.endsWith(".ts")),
      ...walkFiles(join(root, "app/api/external/google"), (name) => name.endsWith(".ts")),
      join(root, "components/orient/ExternalCalendarsOperation.tsx"),
      join(root, "components/orient/externalCalendarsApi.ts"),
    ].filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("events.list");
      expect(source, file).not.toMatch(/\/calendars\/[^/]+\/events/);
      expect(source, file).not.toContain("external_temporal_facts");
      expect(source, file).not.toMatch(/upsertExternal|insertExternalTemporalFact|GoogleEvent/);
    }
  });

  it("does not import Google Calendar adapter into Present/Day/Week/Month production projections", () => {
    const files = [
      "projections/presentMomentOrientation.ts",
      "projections/dayCanvas.ts",
      "projections/weekShape.ts",
      "projections/month.ts",
      "projections/timeline.ts",
      "projections/currentTemporalOrientation.ts",
      "components/orient/OrientView.tsx",
    ];
    for (const relative of files) {
      const source = readFileSync(join(root, relative), "utf8");
      expect(source).not.toMatch(/server\/googleCalendar|events\.list|enumerateGoogle/);
    }
  });

  it("keeps CalendarList as the only Google Calendar data API URL", () => {
    const googleFiles = walkFiles(join(root, "server/googleCalendar"), (name) =>
      name.endsWith(".ts"),
    ).filter((file) => !file.endsWith(".test.ts"));
    const joined = googleFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    const calendarDataUrls =
      joined.match(/https:\/\/www\.googleapis\.com\/calendar\/[^\s"`']+/g) ?? [];
    expect(calendarDataUrls.length).toBeGreaterThan(0);
    expect(
      calendarDataUrls.every((url) =>
        url.startsWith("https://www.googleapis.com/calendar/v3/users/me/calendarList"),
      ),
    ).toBe(true);
  });

  it("does not add googleapis dependency", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.googleapis).toBeUndefined();
    expect(pkg.devDependencies?.googleapis).toBeUndefined();
  });

  it("does not put Google DTOs into provider-neutral domain", () => {
    const domain = readFileSync(join(root, "domain/externalTemporal.ts"), "utf8");
    expect(domain).not.toMatch(/GoogleToken|CalendarList|google_calendar_id|accessRole/);
  });

  it("keeps oauth initiation server-only with RLS and no realtime publication", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20261007220000_external_oauth_initiations.sql"),
      "utf8",
    );
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.external_oauth_initiations from public, anon, authenticated/);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toMatch(/Intentionally omitted from realtime publication membership/);
  });
});
