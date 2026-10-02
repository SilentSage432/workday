import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CapturePanel } from "@/components/CapturePanel";
import { destinationFromPathname } from "@/components/BottomNav";
import { LocalTimeField } from "@/components/LocalTimeField";
import { WorkWeek } from "@/components/WorkWeek";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { weekDraftFromEntries } from "@/components/weekDraft";
import { captureAfterSuccessfulSave, initialCaptureSession, openCapture } from "@/domain/capture";
import { offWorkDay, scheduledWorkDay } from "@/domain/workSchedule";

const dates = [
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];
const noop = () => undefined;

function weekMarkup(editing = false) {
  const draft = weekDraftFromEntries(dates, [
    scheduledWorkDay({
      workOn: "2026-10-03",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    }),
    offWorkDay("2026-10-04"),
  ]);
  return renderToStaticMarkup(
    <WorkWeek
      draft={draft}
      today="2026-10-03"
      editing={editing}
      openWorkOn={null}
      rowError={null}
      saving={false}
      prompt={null}
      onBeginEdit={noop}
      onCancelEdit={noop}
      onSaveWeek={noop}
      onOpenDay={noop}
      onSetDay={noop}
      onShiftWeek={noop}
      onDiscardPrompt={noop}
      onStay={noop}
    />,
  );
}

describe("mobile interaction", () => {
  it("keeps Capture closed until it is opened, including a preserved draft", () => {
    const closed = renderToStaticMarkup(
      <CapturePanel
        session={initialCaptureSession()}
        contexts={[]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(closed).toContain("Capture");
    expect(closed).not.toContain("What needs doing?");
    expect(closed).not.toContain("+ Capture");

    const preserved = initialCaptureSession();
    preserved.draft.title = "Count the aisle";
    const held = renderToStaticMarkup(
      <CapturePanel
        session={preserved}
        contexts={[]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(held).toContain("An unsaved capture is still here.");
    expect(held).not.toContain("What needs doing?");

    const opened = renderToStaticMarkup(
      <CapturePanel
        session={openCapture(preserved)}
        contexts={[]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(opened).toContain("What needs doing?");
    expect(renderToStaticMarkup(
      <CapturePanel
        session={captureAfterSuccessfulSave()}
        contexts={[]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    )).not.toContain("What needs doing?");
  });

  it("does not let the schedule surface open Capture", () => {
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/schedule/page.tsx", import.meta.url), "utf8");
    const frame = readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8");
    expect(`${schedule}\n${page}`).not.toMatch(/openCapture|setCapture/);
    expect(frame).not.toMatch(/openCapture/);
    expect(frame).toContain("initialCaptureSession");
  });

  it("uses direct time fields instead of a clock-face input", () => {
    const html = renderToStaticMarkup(
      <LocalTimeField
        label="Start"
        value={localTimeToTwelveHour("14:30")}
        onChange={noop}
      />,
    );
    expect(html).toContain('aria-label="Start hour"');
    expect(html).toContain('aria-label="Start minute"');
    expect(html).toContain(">PM<");
    expect(html).toContain(">07<");
    expect(html).not.toContain('type="time"');
    const week = readFileSync(new URL("./WorkWeek.tsx", import.meta.url), "utf8");
    expect(week).not.toContain('type="time"');
    expect(week).toContain("Save week");
    expect(week).not.toContain("Save shift");
  });

  it("shows a compact week, Edit week, and one Save week action", () => {
    const reading = weekMarkup(false);
    expect(reading).toContain("Edit week");
    expect(reading).toContain("Today");
    expect(reading).toContain("Not entered");
    expect(reading).toContain("6:00 AM–3:00 PM");
    expect(reading).toContain(">Off<");
    expect(reading).not.toContain("Save week");
    expect(reading).toContain("Previous");
    expect(reading).toContain("Next");

    const editing = weekMarkup(true);
    expect(editing).toContain("Save week");
    expect(editing).toContain("Cancel");
    expect(editing).toContain("Shift for Mon, Oct 5");
    expect(editing).toContain("Off for Mon, Oct 5");
    expect(editing).not.toContain("Save shift");
  });

  it("names the two primary destinations and keeps content padding for the bar", () => {
    expect(destinationFromPathname("/")).toBe("tasks");
    expect(destinationFromPathname("/schedule")).toBe("schedule");
    const frame = readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8");
    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    expect(nav).toContain('aria-label="Primary"');
    expect(nav).toContain("Tasks");
    expect(nav).toContain("Schedule");
    expect(nav).toContain('href="/"');
    expect(nav).toContain('href="/schedule"');
    expect(frame).toContain("env(safe-area-inset-bottom)");
    expect(nav).toContain("ListTodo");
    expect(nav).toContain("CalendarDays");
  });
});
