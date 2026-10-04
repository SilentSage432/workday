import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpenTaskPlanButton, TodayPlan } from "@/components/TodayPlan";
import type { Task } from "@/domain/task";

const noop = () => undefined;

function task(id: string, extras: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    contextId: extras.contextId ?? null,
    createdAt: "2026-10-01T15:00:00.000Z",
    completedAt: null,
    dueOn: null,
    plannedOn: "2026-10-02",
    mustDo: false,
    origin: "user_created",
    ...extras,
  };
}

const shared = {
  contextName: (contextId: string | null) => (contextId === "family" ? "Family" : null),
  planningId: null,
  planError: null,
  completingId: null,
  completeError: null,
  startingId: null,
  startError: null,
  onPlan: noop,
  onStart: noop,
  onComplete: noop,
};

describe("today surface", () => {
  it("lists planned tasks without ranking language or a second resume card", () => {
    const markup = renderToStaticMarkup(
      <TodayPlan
        {...shared}
        zoneStatus="confirmed"
        civilDate="2026-10-02"
        activeTaskId="thread"
        tasks={[
          task("thread", { title: "Cycle counts", mustDo: true, dueOn: "2026-10-03" }),
          task("other", {
            title: "Call the school",
            contextId: "family",
            dueOn: "2026-10-02",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Today");
    expect(markup).toContain("Fri, Oct 2");
    expect(markup).toContain("Cycle counts");
    expect(markup).toContain("Current thread");
    expect(markup).toContain("Must do");
    expect(markup).toContain("Due");
    expect(markup).toContain("Call the school");
    expect(markup).toContain("Family");
    expect(markup).toContain("Remove from Today");
    expect(markup).not.toContain("Leave thread");
    expect(markup).not.toContain("priority");
    expect(markup).not.toContain("rank");
    expect(markup).not.toContain("behind");
    expect(markup.indexOf("Cycle counts")).toBeLessThan(markup.indexOf("Call the school"));
    const threadStart = markup.indexOf("Cycle counts");
    const otherStart = markup.indexOf("Call the school");
    expect(markup.slice(threadStart, otherStart)).not.toContain("Start");
    expect(markup.slice(otherStart)).toContain("Start");
  });

  it("asks for a confirmed time zone instead of guessing a civil day", () => {
    const markup = renderToStaticMarkup(
      <TodayPlan {...shared} zoneStatus="unconfirmed" civilDate={null} activeTaskId={null} tasks={[]} />,
    );

    expect(markup).toContain("Today needs a confirmed time zone.");
    expect(markup).toContain('href="/schedule"');
    expect(markup).toContain("Confirm time zone");
    expect(markup).not.toContain("Plan for Today");
    expect(markup).not.toContain("Nothing is planned for today.");
  });

  it("names plan and move, and does not offer either without a civil date", () => {
    const unplanned = task("unplanned", { title: "Pack down", plannedOn: null });
    const later = task("later", { title: "Bay audits", plannedOn: "2026-10-03" });

    const plan = renderToStaticMarkup(
      <OpenTaskPlanButton task={unplanned} civilDate="2026-10-02" pending={false} disabled={false} onPlan={noop} />,
    );
    const move = renderToStaticMarkup(
      <OpenTaskPlanButton task={later} civilDate="2026-10-02" pending={false} disabled={false} onPlan={noop} />,
    );
    const hidden = renderToStaticMarkup(
      <OpenTaskPlanButton task={unplanned} civilDate={null} pending={false} disabled={false} onPlan={noop} />,
    );

    expect(plan).toContain("Plan for Today");
    expect(plan).toContain("Plan Pack down for Today");
    expect(move).toContain("Move to Today");
    expect(move).toContain("Move Bay audits to Today");
    expect(hidden).toBe("");
  });

  it("keeps Today off the bottom bar and the title field ahead of Resume", () => {
    const nav = readFileSync(new URL("./BottomNav.tsx", import.meta.url), "utf8");
    const tasks = readFileSync(new URL("./TaskLoop.tsx", import.meta.url), "utf8");

    expect(nav).toContain("Tasks");
    expect(nav).toContain("Schedule");
    expect(nav).not.toContain("Today");
    expect(nav).not.toContain("/now");
    expect(tasks.indexOf("<QuickCapture")).toBeLessThan(tasks.indexOf("resume-heading"));
    expect(tasks.indexOf("resume-heading")).toBeLessThan(tasks.indexOf("<TodayPlan"));
    expect(tasks.indexOf("<TodayPlan")).toBeLessThan(tasks.indexOf("open-tasks-heading"));
    expect(readFileSync(new URL("./TodayPlan.tsx", import.meta.url), "utf8")).toContain(
      'id="today-heading"',
    );
    expect(tasks).not.toMatch(/openCapture|rankNow|priority/);
    expect(tasks).toContain("updateTask");
  });
});
