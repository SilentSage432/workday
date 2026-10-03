import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlocksPanel } from "@/components/BlocksSection";
import { blockInputFromDraft, newBlockDraft } from "@/components/blockDraft";
import { localTimeToTwelveHour } from "@/components/twelveHourTime";
import { defineBlock, type Block } from "@/domain/block";
import type { Context } from "@/domain/context";

const zone = "America/Boise";
const instant = new Date("2026-10-03T16:00:00.000Z");
const noop = () => undefined;

const contexts: Context[] = [
  { id: "context-teamlab", name: "TeamLab", createdAt: "2026-10-01T00:00:00.000Z" },
];

function entry(id: string, input: Parameters<typeof defineBlock>[0]): Block {
  return { ...defineBlock(input), id, createdAt: "2026-10-01T00:00:00.000Z" };
}

const panelProps = {
  instant,
  contexts,
  contextsReady: true,
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

describe("blocks surface", () => {
  it("lists a current block with its context and purpose", () => {
    const markup = renderToStaticMarkup(
      <BlocksPanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        entries={[
          entry("past", { kind: "all_day", startsOn: "2026-10-02", purpose: "Yesterday rest" }),
          entry("today", {
            kind: "all_day",
            startsOn: "2026-10-03",
            purpose: "Studio work",
            contextId: "context-teamlab",
          }),
          entry("later", {
            kind: "timed",
            startsOn: "2026-10-03",
            startLocal: "21:00",
            endLocal: "22:00",
            purpose: "Read",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Blocks");
    expect(markup).toContain("What this time is for.");
    expect(markup).toContain("All day");
    expect(markup).toContain("TeamLab");
    expect(markup).toContain("Studio work");
    expect(markup).toContain("9:00 PM–10:00 PM");
    expect(markup).toContain("Read");
    expect(markup).toContain("Add block");
    expect(markup).not.toContain("Yesterday rest");
    expect(markup).not.toContain('type="time"');
    expect(markup).not.toContain("priority");
    expect(markup).not.toContain("capacity");
  });

  it("opens a timed editor with purpose and an optional context", () => {
    const draft = {
      ...newBlockDraft("2026-10-03"),
      kind: "timed" as const,
      start: localTimeToTwelveHour("09:00"),
      end: localTimeToTwelveHour("11:00"),
      purpose: "Work on Studio",
    };
    const markup = renderToStaticMarkup(
      <BlocksPanel {...panelProps} timeZone={zone} editor={draft} entries={[]} />,
    );

    expect(markup).toContain("Start hour");
    expect(markup).toContain("End hour");
    expect(markup).toContain('type="date"');
    expect(markup).not.toContain('type="time"');
    expect(markup).toContain("Purpose");
    expect(markup).toContain("Work on Studio");
    expect(markup).toContain("Optional. It does not replace the purpose.");
    expect(markup).toContain("TeamLab");
    expect(markup).toContain(">None<");
    expect(markup).toContain(">Save<");
    expect(markup).toContain(">Cancel<");
  });

  it("asks before removing and does not offer entry without a confirmed zone", () => {
    const removing = renderToStaticMarkup(
      <BlocksPanel
        {...panelProps}
        timeZone={zone}
        editor={null}
        confirmingId="today"
        entries={[entry("today", { kind: "all_day", startsOn: "2026-10-03", purpose: "Rest" })]}
      />,
    );
    const unsigned = renderToStaticMarkup(
      <BlocksPanel {...panelProps} timeZone={null} editor={null} entries={[]} />,
    );

    expect(removing).toContain("Remove this block?");
    expect(removing).toContain(">Keep<");
    expect(unsigned).toContain("A block needs a confirmed time zone.");
    expect(unsigned).not.toContain("Add block");
  });

  it("converts 12-hour drafts and stays off the bottom bar", () => {
    const morning = blockInputFromDraft({
      ...newBlockDraft("2026-10-03"),
      kind: "timed",
      start: localTimeToTwelveHour("00:00"),
      end: localTimeToTwelveHour("12:00"),
      purpose: "Read",
    });
    const evening = blockInputFromDraft({
      ...newBlockDraft("2026-10-02"),
      kind: "timed",
      start: localTimeToTwelveHour("22:00"),
      end: localTimeToTwelveHour("01:07"),
      purpose: "Rest",
    });

    expect(morning).toMatchObject({ startLocal: "00:00", endLocal: "12:00", purpose: "Read" });
    expect(evening).toMatchObject({ startLocal: "22:00", endLocal: "01:07" });

    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");
    expect(nav).not.toContain("Blocks");
    expect(schedule).toContain("Work schedule");
    expect(schedule).toContain("ProtectedTimeSection");
    expect(schedule).toContain("BlocksSection");
    expect(schedule).not.toContain('type="time"');
    expect(tasks).not.toContain("BlocksSection");
    expect(tasks).not.toContain("blocks");
  });
});