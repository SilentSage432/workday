import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurrentTime } from "@/components/CurrentTime";
import { millisecondsUntilNextMinute } from "@/components/minuteClock";
import type { CurrentTemporalFact } from "@/projections/currentTemporalOrientation";

const block: CurrentTemporalFact = {
  sourceKind: "block",
  sourceId: "floor",
  startsOn: "2026-10-03",
  allDay: false,
  startLocal: "10:00",
  endLocal: "11:00",
  endsNextCivilDate: false,
  purpose: "Flooring walk",
};

const work: CurrentTemporalFact = {
  sourceKind: "work_schedule",
  sourceId: "2026-10-03",
  startsOn: "2026-10-03",
  allDay: false,
  startLocal: "06:00",
  endLocal: "15:00",
  endsNextCivilDate: false,
  shiftType: "opening",
};

describe("current time surface", () => {
  it("renders established facts beside a separate resume without asking them to agree", () => {
    const markup = renderToStaticMarkup(
      <>
        <section aria-labelledby="resume-heading">
          <h2 id="resume-heading">Resume</h2>
          <p>Follow up with associate about inventory discrepancy</p>
          <p>This is what you’re doing.</p>
        </section>
        <CurrentTime zoneStatus="confirmed" facts={[work, block]} notice={null} />
      </>,
    );

    expect(markup.indexOf("Resume")).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf("This time")).toBeGreaterThan(markup.indexOf("Resume"));
    expect(markup).toContain("Follow up with associate about inventory discrepancy");
    expect(markup).toContain("This is what you’re doing.");
    expect(markup).toContain("Work");
    expect(markup).toContain("Opening");
    expect(markup).toContain("6:00 AM–3:00 PM");
    expect(markup).toContain("Block");
    expect(markup).toContain("Flooring walk");
    expect(markup).toContain("10:00 AM–11:00 AM");
    expect(markup).not.toMatch(/should|mismatch|instead|conflict|diverge|priority|rank/i);
    expect(markup).not.toMatch(/\b(free|available|unscheduled|unallocated)\b/i);
  });

  it("says nothing is established, without an availability label", () => {
    const markup = renderToStaticMarkup(
      <CurrentTime zoneStatus="confirmed" facts={[]} notice={null} />,
    );

    expect(markup).toContain("Nothing established contains this time.");
    expect(markup.toLowerCase()).not.toMatch(
      /\bfree\b|\bavailable\b|\bopen\b|\bunscheduled\b|\bunallocated\b/,
    );
  });

  it("asks for a confirmed time zone instead of guessing", () => {
    const markup = renderToStaticMarkup(
      <CurrentTime zoneStatus="unconfirmed" facts={null} notice={null} />,
    );

    expect(markup).toContain("This time needs a confirmed time zone.");
    expect(markup).toContain('href="/schedule"');
    expect(markup).not.toContain("Nothing established contains this time.");
  });

  it("names Protected and Commitment ranges, including an all-day row and an overnight row", () => {
    const markup = renderToStaticMarkup(
      <CurrentTime
        zoneStatus="confirmed"
        notice={null}
        facts={[
          {
            sourceKind: "protected_time",
            sourceId: "school",
            startsOn: "2026-10-03",
            label: "School",
            allDay: true,
          },
          {
            sourceKind: "commitment",
            sourceId: "night",
            startsOn: "2026-10-03",
            title: "Reservation",
            allDay: false,
            startLocal: "22:00",
            endLocal: "01:00",
            endsNextCivilDate: true,
          },
        ]}
      />,
    );

    expect(markup).toContain("Protected");
    expect(markup).toContain("School");
    expect(markup).toContain("All day");
    expect(markup).toContain("Commitment");
    expect(markup).toContain("Reservation");
    expect(markup).toContain("10:00 PM–1:00 AM · continues after midnight");
  });

  it("shows a load notice instead of an empty reading", () => {
    const markup = renderToStaticMarkup(
      <CurrentTime
        zoneStatus="confirmed"
        facts={null}
        notice="Could not load established time."
      />,
    );

    expect(markup).toContain("Could not load established time.");
    expect(markup).not.toContain("Nothing established contains this time.");
  });

  it("refreshes on the next minute, not every second", () => {
    expect(millisecondsUntilNextMinute(new Date("2026-10-03T16:00:00.000Z"))).toBe(60_000);
    expect(millisecondsUntilNextMinute(new Date("2026-10-03T16:00:59.500Z"))).toBe(500);
    expect(millisecondsUntilNextMinute(new Date("2026-10-03T16:00:01.000Z"))).toBe(59_000);
  });

  it("places this reading with Resume and leaves Work orientation in place", () => {
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");
    const work = readFileSync(new URL("./WorkOrientation.tsx", import.meta.url), "utf8");
    const current = readFileSync(new URL("./CurrentTime.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");

    expect(tasks.indexOf("resume-heading")).toBeLessThan(tasks.indexOf("<CurrentTime"));
    expect(tasks.indexOf("<CurrentTime")).toBeLessThan(tasks.indexOf("<WorkOrientationView"));
    expect(tasks.indexOf("<WorkOrientationView")).toBeLessThan(tasks.indexOf("<TodayPlan"));
    expect(tasks).toContain("composeCurrentTemporalReading");
    expect(tasks).toContain("loadProtectedTime(client, window)");
    expect(tasks).toContain("loadBlocks(client, window)");
    expect(tasks).toContain("loadCommitments(client, window)");
    expect(tasks).not.toContain("workSchedule: workNotice");
    expect(tasks).toContain("millisecondsUntilNextMinute");
    expect(tasks).toContain("visibilitychange");
    expect(tasks).not.toMatch(/setInterval/);
    expect(work).toContain("Power Hour");
    expect(work).toContain("FSR is intended before");
    expect(current).not.toMatch(/Power Hour|FSR|Resume|Active Thread/);
    expect(schedule).not.toContain("CurrentTime");
    expect(schedule).not.toContain("activeThread");
  });
});
