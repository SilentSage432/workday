import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TodayScheduleFact, WorkWeek } from "@/components/WorkWeek";
import {
  afterDaySaved,
  beginWeekEdit,
  cancelShiftDraft,
  closedWeekEdit,
  draftIsMeaningful,
  finishWeekEdit,
  openShiftDraft,
  requestWeekChange,
  scheduleRowFact,
  updateShiftDraft,
} from "@/components/workScheduleSession";
import { offWorkDay, scheduledWorkDay, type WorkScheduleEntry } from "@/domain/workSchedule";

const weekDates = [
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];

const opening = scheduledWorkDay({
  workOn: "2026-10-03",
  startLocal: "06:00",
  endLocal: "15:00",
  shiftType: "opening",
});
const off = offWorkDay("2026-10-04");
const entries: WorkScheduleEntry[] = [opening, off];

const noop = () => undefined;

function markup(session = closedWeekEdit, draftEntries = entries) {
  return renderToStaticMarkup(
    <WorkWeek
      weekDates={weekDates}
      entries={draftEntries}
      today="2026-10-03"
      session={session}
      rowError={null}
      savingOn={null}
      onBeginEdit={noop}
      onFinishEdit={noop}
      onOpenShift={noop}
      onMarkOff={noop}
      onClear={noop}
      onDraftChange={noop}
      onSaveShift={noop}
      onCancelShift={noop}
      onShiftWeek={noop}
    />,
  );
}

describe("compact work schedule", () => {
  it("reads unknown, Off, and a scheduled shift as different facts", () => {
    expect(scheduleRowFact(null)).toEqual({ kind: "unknown" });
    expect(scheduleRowFact(off)).toEqual({ kind: "off" });
    expect(scheduleRowFact(opening)).toMatchObject({
      kind: "scheduled",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
      continuesAfterMidnight: false,
    });
  });

  it("shows a compact week without edit controls", () => {
    const html = markup();
    expect(html).toContain("Edit week");
    expect(html).toContain("Today");
    expect(html).toContain("Not entered");
    expect(html).toContain("6:00 AM–3:00 PM");
    expect(html).toContain("Opening");
    expect(html).toContain(">Off<");
    expect(html).not.toContain("Save shift");
    expect(html).not.toContain("Shift for");
    expect(html).not.toContain("Before this shift");
    expect(html.match(/<button/g)?.length).toBe(3);
  });

  it("keeps an unknown day distinct from Off in the markup", () => {
    const html = markup();
    const saturday = html.slice(html.indexOf("Sat, Oct 3"), html.indexOf("Sun, Oct 4"));
    const sunday = html.slice(html.indexOf("Sun, Oct 4"), html.indexOf("Mon, Oct 5"));
    const monday = html.slice(html.indexOf("Mon, Oct 5"), html.indexOf("Tue, Oct 6"));
    expect(saturday).toContain("Opening");
    expect(saturday).not.toContain("Not entered");
    expect(sunday).toContain(">Off<");
    expect(sunday).not.toContain("Not entered");
    expect(monday).toContain("Not entered");
    expect(monday).not.toContain(">Off<");
  });

  it("reveals day controls in Edit week and keeps that mode after a save", () => {
    const editing = beginWeekEdit();
    const html = markup(editing);
    expect(html).toContain("Shift for Mon, Oct 5");
    expect(html).toContain("Off for Mon, Oct 5");
    expect(html).toContain("Edit shift for Sat, Oct 3");
    expect(html).toContain("Off for Sat, Oct 3");
    expect(html).toContain("Remove Sat, Oct 3");
    expect(html).toContain("Shift for Sun, Oct 4");
    expect(html).toContain("Remove Sun, Oct 4");
    expect(html).not.toContain("Off for Sun, Oct 4");
    expect(html).toContain(">Done<");

    const saved = afterDaySaved(editing);
    expect(saved.editing).toBe(true);
    expect(saved.draft).toBeNull();
    expect(markup(saved)).toContain("Edit shift for Sat, Oct 3");
    expect(markup(saved)).not.toContain("Save shift");
  });

  it("opens one day for editing and can change a scheduled shift", () => {
    const editing = beginWeekEdit();
    const opened = openShiftDraft(editing, opening.workOn, null, opening);
    expect(opened.draft).toMatchObject({
      workOn: "2026-10-03",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const html = markup(opened);
    expect(html).toContain('id="start-2026-10-03"');
    expect(html).toContain("Save shift");
    expect(html).not.toContain("Edit shift for Sat, Oct 3");

    const changed = updateShiftDraft(opened, {
      workOn: "2026-10-03",
      startLocal: "11:00",
      endLocal: "20:00",
      shiftType: "closing",
    });
    expect(changed.draft).not.toBeNull();
    if (!changed.draft) return;
    expect(draftIsMeaningful(changed.draft, opening)).toBe(true);
    expect(afterDaySaved(changed).editing).toBe(true);
  });

  it("moves an unknown day to a shift draft and an Off day back to a shift draft", () => {
    const editing = beginWeekEdit();
    expect(openShiftDraft(editing, "2026-10-05", null, null).draft).toMatchObject({
      workOn: "2026-10-05",
      startLocal: "",
      shiftType: "",
    });
    expect(openShiftDraft(editing, off.workOn, null, off).draft).toMatchObject({
      workOn: "2026-10-04",
      startLocal: "",
      shiftType: "",
    });
  });

  it("moves the Work week by seven civil days and keeps a meaningful draft", () => {
    const clean = requestWeekChange(closedWeekEdit, "2026-10-03", 7, null);
    expect(clean.weekStart).toBe("2026-10-10");
    expect(clean.session.editing).toBe(false);

    const previous = requestWeekChange(beginWeekEdit(), "2026-10-03", -7, null);
    expect(previous.weekStart).toBe("2026-09-26");
    expect(previous.session.editing).toBe(true);

    const dirty = updateShiftDraft(openShiftDraft(beginWeekEdit(), opening.workOn, null, opening), {
      workOn: opening.workOn,
      startLocal: "07:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const blocked = requestWeekChange(dirty, "2026-10-03", 7, opening);
    expect(blocked.weekStart).toBe("2026-10-03");
    expect(blocked.session.notice).toMatch(/Save or cancel/);
    expect(blocked.session.draft?.startLocal).toBe("07:00");
    expect(finishWeekEdit(dirty, opening).editing).toBe(true);
    expect(cancelShiftDraft(dirty).draft).toBeNull();
    expect(requestWeekChange(cancelShiftDraft(dirty), "2026-10-03", 7, opening).weekStart).toBe(
      "2026-10-10",
    );
  });

  it("states today's stored schedule without a shift position", () => {
    expect(renderToStaticMarkup(<TodayScheduleFact entry={null} />)).toContain("No schedule entered");
    expect(renderToStaticMarkup(<TodayScheduleFact entry={off} />)).toContain(">Off<");
    const scheduled = renderToStaticMarkup(<TodayScheduleFact entry={opening} />);
    expect(scheduled).toContain("Opening");
    expect(scheduled).toContain("6:00 AM–3:00 PM");
    expect(scheduled).not.toContain("During this shift");
  });

  it("leaves storage and orientation files out of the schedule interaction", () => {
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const session = readFileSync(new URL("./workScheduleSession.ts", import.meta.url), "utf8");
    expect(schedule).toContain("saveWorkScheduleEntry");
    expect(schedule).toContain("clearWorkScheduleEntry");
    expect(schedule).toContain("saveTemporalSettings");
    expect(schedule).toContain("afterDaySaved");
    expect(schedule).not.toMatch(/projectWorkOrientation|projectWorkDay|rankNow/);
    expect(session).not.toMatch(/supabase|Date\.now|projectWork/);
  });
});
