import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommitmentsPanel } from "@/components/CommitmentsSection";
import { commitmentInputFromDraft, newCommitmentDraft } from "@/components/commitmentDraft";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { defineCommitment, type Commitment } from "@/domain/commitment";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");
const noop = () => undefined;

function entry(id: string, input: Parameters<typeof defineCommitment>[0]): Commitment {
  return { ...defineCommitment(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
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

describe("commitments surface", () => {
  it("lists a current commitment by date, time, and title", () => {
    const markup = renderToStaticMarkup(
      <CommitmentsPanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        entries={[
          entry("past", { kind: "all_day", startsOn: "2026-10-02", title: "Yesterday event" }),
          entry("today", { kind: "all_day", startsOn: "2026-10-03", title: "School event" }),
          entry("later", {
            kind: "timed",
            startsOn: "2026-10-08",
            startLocal: "15:00",
            endLocal: "16:00",
            title: "Dentist",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Commitments");
    expect(markup).toContain("An established constraint.");
    expect(markup).toContain("All day");
    expect(markup).toContain("School event");
    expect(markup).toContain("3:00 PM–4:00 PM");
    expect(markup).toContain("Dentist");
    expect(markup).toContain("Add commitment");
    expect(markup).not.toContain("Yesterday event");
    expect(markup).not.toContain('type="time"');
    expect(markup).not.toContain("priority");
    expect(markup).not.toContain("capacity");
    expect(markup).not.toContain("Context");
  });

  it("opens a timed editor that asks for a title", () => {
    const draft = {
      ...newCommitmentDraft("2026-10-08"),
      kind: "timed" as const,
      start: localTimeToTwelveHour("15:00"),
      end: localTimeToTwelveHour("16:00"),
      title: "Dentist",
    };
    const markup = renderToStaticMarkup(
      <CommitmentsPanel {...panelProps} timeZone={zone} editor={draft} entries={[]} />,
    );

    expect(markup).toContain("Start hour");
    expect(markup).toContain("End hour");
    expect(markup).toContain('type="date"');
    expect(markup).not.toContain('type="time"');
    expect(markup).toContain("Title");
    expect(markup).toContain("Dentist");
    expect(markup).toContain('maxLength="80"');
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Cancel<");
    expect(markup).not.toContain("Context");
  });

  it("asks before removing and does not offer entry without a confirmed zone", () => {
    const removing = renderToStaticMarkup(
      <CommitmentsPanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        confirmingId="today"
        entries={[entry("today", { kind: "all_day", startsOn: "2026-10-03", title: "School event" })]}
      />,
    );
    const unsigned = renderToStaticMarkup(
      <CommitmentsPanel {...panelProps} timeZone={null} editor={null} entries={[]} />,
    );

    expect(removing).toContain("Remove this commitment?");
    expect(removing).toContain(">Keep<");
    expect(unsigned).toContain("A commitment needs a confirmed time zone.");
    expect(unsigned).not.toContain("Add commitment");
  });

  it("does not claim current containment for an unresolved local time", () => {
    const markup = renderToStaticMarkup(
      <CommitmentsPanel
        {...panelProps}
        timeZone="America/Denver"
        instant={new Date("2026-03-08T18:00:00.000Z")}
        editor={null}
        entries={[
          entry("gap", {
            kind: "timed",
            startsOn: "2026-03-08",
            startLocal: "02:30",
            endLocal: "03:30",
            title: "Appointment",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Appointment");
    expect(markup).not.toContain("Includes the current time.");
  });

  it("converts 12-hour drafts and stays on Schedule beside the other sections", () => {
    const morning = commitmentInputFromDraft({
      ...newCommitmentDraft("2026-10-08"),
      kind: "timed",
      start: localTimeToTwelveHour("00:00"),
      end: localTimeToTwelveHour("12:00"),
      title: "Appointment",
    });
    const evening = commitmentInputFromDraft({
      ...newCommitmentDraft("2026-10-02"),
      kind: "timed",
      start: localTimeToTwelveHour("22:00"),
      end: localTimeToTwelveHour("01:07"),
      title: "Reservation",
    });

    expect(morning).toMatchObject({ startLocal: "00:00", endLocal: "12:00", title: "Appointment" });
    expect(evening).toMatchObject({ startLocal: "22:00", endLocal: "01:07" });
    expect(() =>
      commitmentInputFromDraft({ ...newCommitmentDraft("2026-10-08"), title: "   " }),
    ).toThrow(/title/);

    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");
    const section = readFileSync(new URL("./CommitmentsSection.tsx", import.meta.url), "utf8");
    expect(nav).not.toContain("Commitment");
    expect(schedule).toContain("Work schedule");
    expect(schedule).toContain("ProtectedTimeSection");
    expect(schedule).toContain("BlocksSection");
    expect(schedule).toContain("CommitmentsSection");
    expect(schedule).not.toContain('type="time"');
    expect(tasks).not.toContain("CommitmentsSection");
    expect(tasks).not.toMatch(/createCommitment|updateCommitment|deleteCommitment|Add commitment/);
    expect(section).toContain("LocalTimeField");
    expect(section).not.toMatch(/type="time"|[\u{1F300}-\u{1FAFF}]/u);
  });
});