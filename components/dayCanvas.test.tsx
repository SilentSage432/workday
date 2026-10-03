import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DayCanvas, DAY_CANVAS_MIN_VISUAL_HEIGHT } from "@/components/DayCanvas";
import { defineBlock } from "@/domain/block";
import { defineCommitment } from "@/domain/commitment";
import { defineProtectedTime } from "@/domain/protectedTime";
import { scheduledWorkDay } from "@/domain/workSchedule";
import { composeDayCanvas, type DayCanvasModel } from "@/projections/dayCanvas";

const zone = "America/Boise";
const day = "2026-10-03";
const noop = () => undefined;

function modelFor(input: Parameters<typeof composeDayCanvas>[0]): DayCanvasModel {
  return composeDayCanvas(input);
}

function markup(model: DayCanvasModel, selectedDay = day) {
  return renderToStaticMarkup(
    <DayCanvas
      selectedDay={selectedDay}
      today={day}
      phase="ready"
      error={null}
      model={model}
      timeZone={zone}
      discardToken="0"
      onPreviousDay={noop}
      onNextDay={noop}
      onToday={noop}
    />,
  );
}

describe("day canvas presentation", () => {
  it("shows the day, distinct facts, and true short duration", () => {
    const model = modelFor({
      selectedDay: day,
      timeZone: zone,
      workSchedule: [
        scheduledWorkDay({
          workOn: day,
          startLocal: "08:00",
          endLocal: "17:00",
          shiftType: "mid",
        }),
      ],
      protectedTime: [
        defineProtectedTime({ kind: "all_day", startsOn: day, label: "Family" }),
      ].map((entry, index) => ({ ...entry, id: `protect-${index}`, createdAt: "2026-10-01T00:00:00.000Z" })),
      blocks: [
        {
          ...defineBlock({
            kind: "timed",
            startsOn: day,
            startLocal: "10:00",
            endLocal: "11:00",
            purpose: "Finish cycle counts",
          }),
          id: "cycle",
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
      commitments: [
        {
          ...defineCommitment({
            kind: "timed",
            startsOn: day,
            startLocal: "10:00",
            endLocal: "10:05",
            title: "Check-in",
          }),
          id: "brief",
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    });

    const html = markup(model);
    expect(html).toContain('aria-label="Previous day"');
    expect(html).toContain('aria-label="Next day"');
    expect(html).toContain("Sat, Oct 3");
    expect(html).toContain('data-region="all-day"');
    expect(html).toContain("data-source-kind=\"protected_time\"");
    expect(html).toContain("data-source-kind=\"work_schedule\"");
    expect(html).toContain("data-source-kind=\"block\"");
    expect(html).toContain("data-source-kind=\"commitment\"");
    expect(html).toContain('data-layer="context"');
    expect(html).toContain('data-layer="foreground"');
    expect(html).toContain('data-minutes="540"');
    expect(html).toContain('data-minutes="60"');
    expect(html).toContain('data-minutes="5"');
    expect(html).toContain(`min-height:${DAY_CANVAS_MIN_VISUAL_HEIGHT}`);
    expect(html).toContain("12:00 AM");
    expect(html).toContain('data-hour="23"');
    expect(html).toContain("Work schedule, Mid");
    expect(html).toContain("Protected time, Family");
    expect(html).toContain("Block, Finish cycle counts");
    expect(html).toContain("Commitment, Check-in");
    expect(html.indexOf('data-region="all-day"')).toBeLessThan(html.indexOf('data-axis="local-clock"'));
    expect(html).not.toMatch(/free time|available|open slot|capacity|schedulable|conflict|double booked|priority/i);
    expect(html).not.toContain("Now");
  });

  it("keeps unresolved facts out of the timed axis", () => {
    const model = modelFor({
      selectedDay: "2026-03-08",
      timeZone: "America/Denver",
      workSchedule: [],
      protectedTime: [
        {
          ...defineProtectedTime({
            kind: "timed",
            startsOn: "2026-03-08",
            startLocal: "02:30",
            endLocal: "03:30",
            label: "Gap",
          }),
          id: "gap",
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
      blocks: [
        {
          ...defineBlock({ kind: "all_day", startsOn: "2026-03-08", purpose: "Family" }),
          id: "family",
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
      commitments: [],
    });

    const html = markup(model, "2026-03-08");
    expect(html).toContain("Unresolved time");
    expect(html).toContain("Time could not be positioned for this date.");
    expect(html).toContain('data-region="unresolved"');
    expect(html).toContain("2:30 AM");
    expect(html).toContain('data-region="all-day"');
    const unresolved = html.slice(html.indexOf('data-region="unresolved"'), html.indexOf("</section>", html.indexOf('data-region="unresolved"')));
    expect(unresolved).not.toContain("data-start-minute");
    expect(html).not.toContain('role="alert"');
  });

  it("does not label an empty day", () => {
    const model = modelFor({
      selectedDay: day,
      timeZone: zone,
      workSchedule: [],
      protectedTime: [],
      blocks: [],
      commitments: [],
    });
    const html = markup(model);
    expect(html).toContain('data-axis="local-clock"');
    expect(html).not.toContain('data-source-kind');
    expect(html).not.toMatch(/free|available|open|capacity|schedulable/i);
  });

  it("leaves management on the schedule surface and adds no calendar dependency", () => {
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const canvas = readFileSync(new URL("./DayCanvas.tsx", import.meta.url), "utf8");
    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    const frame = readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/schedule/page.tsx", import.meta.url), "utf8");
    const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");

    expect(page).toContain("WorkSchedule");
    expect(schedule).toContain("DayCanvas");
    expect(schedule).toContain("Manage schedule");
    expect(schedule).toContain('id="schedule-tools"');
    expect(schedule).toContain("Work schedule");
    expect(schedule).toContain("ProtectedTimeSection");
    expect(schedule).toContain("BlocksSection");
    expect(schedule).toContain("CommitmentsSection");
    expect(schedule).toContain('id="time-zone"');
    expect(schedule).not.toContain('type="time"');
    expect(nav).toContain('href="/schedule"');
    expect(nav).not.toContain("NOW");
    expect(frame).toContain("pb-[calc(5rem+env(safe-area-inset-bottom))]");
    expect(canvas).toContain("onPointerDown");
    expect(canvas).toContain("data-time-surface");
    expect(canvas).not.toMatch(/onMouseDown|draggable|Date\.now|resolvedOptions/);
    expect(schedule).toContain("noteCanvasReload");
    expect(schedule).toContain("setSelectionDiscard");
    expect(schedule).toContain("discardToken");
    expect(canvas).toContain("max-w-full");
    expect(canvas).toContain("overflow-y-auto");
    expect(canvas).toContain('data-axis-scroll="midnight"');
    expect(canvas).not.toContain("scrollIntoView");
    expect(pkg).not.toMatch(/fullcalendar|react-big-calendar|@dnd-kit|dnd-kit/i);
  });
});
