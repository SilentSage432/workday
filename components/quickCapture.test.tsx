import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CapturePanel } from "@/components/CapturePanel";
import { emptyCaptureDraft, readyCaptureSession } from "@/domain/capture";

const noop = () => undefined;

describe("quick capture surface", () => {
  it("submits from the title form and blocks a second write while saving", () => {
    const markup = renderToStaticMarkup(
      <CapturePanel
        session={readyCaptureSession()}
        contexts={[{ id: "family", name: "Family" }]}
        saving={false}
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(markup).toContain("<form");
    expect(markup).toContain('type="text"');
    expect(markup).toContain('enterKeyHint="done"');
    expect(markup).toContain(">Save<");
    expect(markup).not.toContain('disabled=""');

    const saving = renderToStaticMarkup(
      <CapturePanel
        session={{
          ...readyCaptureSession(),
          draft: { ...emptyCaptureDraft(), title: "Call vendor" },
        }}
        contexts={[]}
        saving
        saveError={null}
        onChange={noop}
        onSubmit={noop}
      />,
    );
    expect(saving).toContain('disabled=""');
    expect(saving).toContain(">Saving<");
    expect(saving).toContain("Call vendor");
  });

  it("keeps the draft visible when saving fails", () => {
    const markup = renderToStaticMarkup(
      <CapturePanel
        session={{
          ...readyCaptureSession(),
          detailsOpen: true,
          draft: {
            ...emptyCaptureDraft(),
            title: "Call vendor",
            contextId: "family",
            plannedOn: "2026-10-05",
            dueOn: "2026-10-08",
            mustDo: true,
          },
        }}
        contexts={[{ id: "family", name: "Family" }]}
        saving={false}
        saveError="Could not save this task."
        onChange={noop}
        onSubmit={noop}
      />,
    );

    expect(markup).toContain("Call vendor");
    expect(markup).toContain("Could not save this task.");
    expect(markup).toContain("The draft is still here.");
    expect(markup).toContain("Family");
    expect(markup).toContain("When you intend to work on it.");
    expect(markup).toContain("When completion is required.");
    expect(markup).toContain("Must do");
    expect(markup).toContain('checked=""');
  });

  it("does not add speech, notes, or notifications to the capture path", () => {
    const source = [
      readFileSync(new URL("./QuickCapture.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("./CapturePanel.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../domain/capture.ts", import.meta.url), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(
      /SpeechRecognition|webkitSpeech|getUserMedia|Notification|serviceWorker|from\("notes"\)/,
    );
  });

  it("shares one session above Tasks and Schedule", () => {
    const frame = readFileSync(new URL("./AppFrame.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");
    const schedule = readFileSync(new URL("./WorkSchedule.tsx", import.meta.url), "utf8");
    const quick = readFileSync(new URL("./QuickCapture.tsx", import.meta.url), "utf8");

    expect(frame.indexOf("CaptureContext.Provider")).toBeLessThan(frame.indexOf("{children}"));
    expect(tasks).toContain("<QuickCapture");
    expect(schedule).toContain("<QuickCapture");
    expect(tasks).toContain("onCreated={(created) => setTasks");
    expect(tasks).not.toMatch(/onCreated=\{[^}]*establishActiveThread/);
    expect(quick).toContain("useCapture");
    expect(quick).not.toMatch(/localStorage|sessionStorage/);
    expect(frame).not.toMatch(/localStorage|sessionStorage/);
  });
});