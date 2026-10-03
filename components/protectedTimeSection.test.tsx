import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProtectedTimePanel } from "@/components/ProtectedTimeSection";
import { newProtectedDraft, protectedInputFromDraft } from "@/components/protectedTimeDraft";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { defineProtectedTime, type ProtectedTime } from "@/domain/protectedTime";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");
const noop = () => undefined;

function entry(
  id: string,
  input: Parameters<typeof defineProtectedTime>[0],
): ProtectedTime {
  return { ...defineProtectedTime(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

const panelProps = {
  instant,
  loadError: null,
  entriesReady: true,
  saving: false,
  formError: null,
  confirmingId: null,
  removeError: null,
  removing: false,
  onBeginAdd: noop,
  onBeginEdit: noop,
  onCancel: noop,
  onChange: noop,
  onSave: noop,
  onAskRemove: noop,
  onCancelRemove: noop,
  onConfirmRemove: noop,
};

describe("protected time surface", () => {
  it("lists current and upcoming protection without a past row or a clock input", () => {
    const markup = renderToStaticMarkup(
      <ProtectedTimePanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        entries={[
          entry("past", { kind: "all_day", startsOn: "2026-10-02", label: "Yesterday" }),
          entry("today", { kind: "all_day", startsOn: "2026-10-03", label: "Time off" }),
          entry("later", {
            kind: "timed",
            startsOn: "2026-10-03",
            startLocal: "20:00",
            endLocal: "22:00",
            label: null,
          }),
        ]}
      />,
    );

    expect(markup).toContain("Protected time");
    expect(markup).toContain("Unavailable for allocation.");
    expect(markup).toContain("Sat, Oct 3");
    expect(markup).toContain("All day");
    expect(markup).toContain("Time off");
    expect(markup).toContain("8:00 PM–10:00 PM");
    expect(markup).toContain("Includes the current time.");
    expect(markup).toContain("Add protected time");
    expect(markup).toContain("Edit");
    expect(markup).toContain("Remove");
    expect(markup).not.toContain("Yesterday");
    expect(markup).not.toContain('type="time"');
    expect(markup).not.toContain("priority");
    expect(markup).not.toContain("capacity");
  });

  it("opens a timed editor on the direct time fields", () => {
    const draft = {
      ...newProtectedDraft("2026-10-03"),
      kind: "timed" as const,
      start: localTimeToTwelveHour("08:00"),
      end: localTimeToTwelveHour("12:00"),
    };
    const markup = renderToStaticMarkup(
      <ProtectedTimePanel {...panelProps} timeZone={zone} editor={draft} entries={[]} />,
    );

    expect(markup).toContain("All day");
    expect(markup).toContain("Timed");
    expect(markup).toContain("Start hour");
    expect(markup).toContain("End hour");
    expect(markup).toContain('type="date"');
    expect(markup).not.toContain('type="time"');
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Cancel<");
  });

  it("asks before removing and does not offer entry without a confirmed zone", () => {
    const removing = renderToStaticMarkup(
      <ProtectedTimePanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        confirmingId="today"
        entries={[entry("today", { kind: "all_day", startsOn: "2026-10-03", label: null })]}
      />,
    );
    const unsigned = renderToStaticMarkup(
      <ProtectedTimePanel {...panelProps} timeZone={null} editor={null} entries={[]} />,
    );

    expect(removing).toContain("Remove this protected time?");
    expect(removing).toContain(">Keep<");
    expect(unsigned).toContain("Protected time needs a confirmed time zone.");
    expect(unsigned).not.toContain("Add protected time");
  });

  it("turns a timed draft into local times and stays off the bottom bar", () => {
    const input = protectedInputFromDraft({
      ...newProtectedDraft("2026-10-03"),
      kind: "timed",
      start: localTimeToTwelveHour("22:00"),
      end: localTimeToTwelveHour("02:07"),
      label: "Unavailable",
    });
    expect(input).toMatchObject({
      kind: "timed",
      startLocal: "22:00",
      endLocal: "02:07",
      label: "Unavailable",
    });

    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");
    expect(nav).not.toContain("Protected");
    expect(schedule).toContain("Work schedule");
    expect(schedule).toContain("ProtectedTimeSection");
    expect(schedule).not.toContain('type="time"');
    expect(tasks).not.toContain("ProtectedTime");
    expect(tasks).not.toContain("protected_time");
  });
});