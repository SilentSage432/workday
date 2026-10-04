import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CapturePanel } from "@/components/CapturePanel";
import { destinationFromPathname } from "@/components/BottomNav";
import { LocalTimeField } from "@/components/LocalTimeField";
import { WorkWeek } from "@/components/WorkWeek";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { weekDraftFromEntries } from "@/components/weekDraft";
import {
  captureAfterSuccessfulSave,
  closedCaptureSession,
  initialCaptureSession,
  openCapture,
} from "@/domain/capture";
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
  it("shows the title immediately and keeps a closed draft collapsed", () => {
    const ready = renderToStaticMarkup(
      <CapturePanel
        session={initialCaptureSession()}
        contexts={[]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(ready).toContain("What needs doing?");
    expect(ready).toContain('id="task-title"');
    expect(ready).toContain("More options");
    expect(ready).not.toContain(">Context<");
    expect(ready).not.toContain("+ Capture");

    const preserved = closedCaptureSession();
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
    expect(opened).toContain("Count the aisle");
    expect(
      renderToStaticMarkup(
        <CapturePanel
          session={captureAfterSuccessfulSave()}
          contexts={[]}
          saving={false}
          saveError={null}
          onChange={noop}
          onSubmit={noop}
        />,
      ),
    ).toContain('id="task-title"');
  });

  it("uses the same capture on Schedule without leaving that day", () => {
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/schedule/page.tsx", import.meta.url), "utf8");
    const frame = readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8");
    const quick = readFileSync(new URL("./QuickCapture.tsx", import.meta.url), "utf8");
    expect(page).toContain("WorkSchedule");
    expect(schedule).toMatch(/<QuickCapture\s+contexts=\{blockContexts\}\s*\/>/);
    expect(schedule).not.toMatch(/<QuickCapture[\s\S]*?onCreated/);
    expect(quick).not.toMatch(
      /useRouter|setSelectedDay|establishActiveThread|createBlock|createCommitment|createProtectedTime|projectCurrentTemporalOrientation/,
    );
    expect(frame).toContain("initialCaptureSession");
    expect(frame).toContain("newTaskFromCapture");
    expect(frame).toContain("if (savingRef.current) return null");
    expect(frame).not.toMatch(/establishActiveThread|createBlock|createCommitment|createProtectedTime|localStorage/);
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
