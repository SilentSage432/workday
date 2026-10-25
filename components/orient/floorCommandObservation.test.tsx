/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloorCommandObservationView } from "@/components/orient/FloorCommandObservation";
import { FLOOR_COMMAND_SOURCE, type FloorCommandSnapshot } from "@/domain/floorCommandObservation";
import {
  applyFloorCommandRead,
  dismissFloorCommandRevision,
  emptyFloorCommandObservationMemory,
  projectFloorCommandObservation,
} from "@/projections/floorCommandObservation";

const READ_AT = "2026-10-25T18:00:00.000Z";

function published(): FloorCommandSnapshot {
  return {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "2587",
    operational_week: "2026-W44",
    week_starting: "2026-10-26",
    week_ending: "2026-11-01",
    publication: { id: "fc.publication.2587.2026-W44", status: "published" },
    handoff: {
      id: "fc.zebra-handoff.2587.2026-W44",
      status: "partial",
      deadline_date: "2026-10-26",
      deadline_policy: "monday_of_operational_week",
      required_count: 2,
      confirmed_count: 1,
      outstanding_count: 1,
    },
    entries: [
      {
        id: "fc.assignment.a1",
        assignment_id: "a1",
        bay_id: "12",
        department: "flooring",
        roster_specialist_id: null,
        associate_name: "Nick",
        assignment_status: "assigned",
        zebra_confirmation: "unconfirmed",
        zebra_entered_at: null,
        zebra_task_completed: false,
        deadline: null,
        updated_at: READ_AT,
      },
      {
        id: "fc.assignment.a2",
        assignment_id: "a2",
        bay_id: "14",
        department: "flooring",
        roster_specialist_id: "roster-2",
        associate_name: "Tracy",
        assignment_status: "assigned",
        zebra_confirmation: "confirmed",
        zebra_entered_at: READ_AT,
        zebra_task_completed: false,
        deadline: null,
        updated_at: READ_AT,
      },
    ],
    deadlines: {
      availability: "ready",
      commitments: [
        {
          id: "fc.deadline.2587.2026-W44.roster-2",
          roster_specialist_id: "roster-2",
          associate_name: "Tracy",
          target_date: "2026-10-28",
          final_date: "2026-10-30",
          review_required: true,
          dates_overridden: false,
          confirmed_at: READ_AT,
          published_entry_ids: ["fc.assignment.a2"],
        },
      ],
    },
    retired: [],
    freshness: {
      read_at: READ_AT,
      source_updated_at: READ_AT,
      revision: "rev-ui",
      matches_previous_revision: null,
    },
  };
}

describe("Floor Command observation view", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it("renders one handoff, assignment details, and the Floor Command link", () => {
    const reading = projectFloorCommandObservation(
      applyFloorCommandRead(emptyFloorCommandObservationMemory("2587"), {
        availability: "ready",
        snapshot: published(),
      }),
    );
    act(() => {
      root?.render(<FloorCommandObservationView reading={reading} />);
    });
    const text = host?.textContent ?? "";
    expect(text).toContain("Zebra handoff · 2026-W44");
    expect(text).toContain("1 of 2 still to enter in Zebra.");
    expect(text).toContain("Needs review in Floor Command");
    expect(text).not.toContain("completed");
    expect(host?.querySelector("input[type='checkbox']")).toBeNull();
    expect(host?.querySelector("a")?.getAttribute("href")).toBe("https://deptsync-hub.vercel.app/dashboard");
    const details = host?.querySelector("details");
    expect(details?.textContent).toContain("Nick");
    expect(details?.textContent).toContain("No roster id");
    expect(details?.textContent).toContain("Not entered in Zebra");
    expect(details?.textContent).toContain("Tracy");
    expect(details?.textContent).toContain("Entered in Zebra");
  });

  it("says the source could not be read and does not describe an empty week", () => {
    const reading = projectFloorCommandObservation(
      applyFloorCommandRead(emptyFloorCommandObservationMemory("2587"), {
        availability: "unavailable",
        reason: "assignments_unavailable",
        read_at: READ_AT,
      }),
    );
    act(() => {
      root?.render(<FloorCommandObservationView reading={reading} />);
    });
    expect(host?.textContent).toContain("Floor Command could not be read.");
    expect(host?.textContent).not.toContain("Nothing published");
    expect(host?.textContent).not.toContain("entered in Zebra");
  });

  it("hides a dismissed revision without marking the handoff complete", () => {
    const onDismiss = vi.fn();
    const memory = applyFloorCommandRead(emptyFloorCommandObservationMemory("2587"), {
      availability: "ready",
      snapshot: published(),
    });
    const reading = projectFloorCommandObservation(memory);
    act(() => {
      root?.render(<FloorCommandObservationView reading={reading} onDismiss={onDismiss} />);
    });
    const button = host?.querySelector("button");
    expect(button?.textContent).toBe("Hide this revision");
    act(() => button?.click());
    expect(onDismiss).toHaveBeenCalledWith("fc.zebra-handoff.2587.2026-W44", "rev-ui");

    const hidden = projectFloorCommandObservation(
      dismissFloorCommandRevision(memory, {
        handoffId: "fc.zebra-handoff.2587.2026-W44",
        revision: "rev-ui",
      }),
    );
    act(() => {
      root?.render(<FloorCommandObservationView reading={hidden} onDismiss={onDismiss} />);
    });
    expect(host?.textContent ?? "").toBe("");
    if (hidden.status === "fresh") {
      expect(hidden.handoffs[0]?.handoffStatus).toBe("partial");
    }
  });

  it("does not present a stale completed handoff as freshly verified or as an empty week", () => {
    const complete = applyFloorCommandRead(emptyFloorCommandObservationMemory("2587"), {
      availability: "ready",
      snapshot: {
        ...published(),
        handoff: {
          ...published().handoff,
          status: "complete",
          confirmed_count: 2,
          outstanding_count: 0,
        },
        entries: published().entries.map((row) => ({
          ...row,
          zebra_confirmation: "confirmed" as const,
          zebra_entered_at: READ_AT,
        })),
        deadlines: { availability: "ready" as const, commitments: [] },
        freshness: {
          read_at: READ_AT,
          source_updated_at: READ_AT,
          revision: "rev-complete",
          matches_previous_revision: null,
        },
      },
    });
    const reading = projectFloorCommandObservation(
      applyFloorCommandRead(complete, {
        availability: "unavailable",
        reason: "assignments_unavailable",
        read_at: "2026-10-26T20:00:00.000Z",
      }),
    );
    act(() => {
      root?.render(<FloorCommandObservationView reading={reading} />);
    });
    expect(host?.getAttribute("data-floor-command-observation") ?? host?.querySelector("section")?.getAttribute("data-floor-command-observation")).toBe("stale");
    expect(host?.textContent).toContain("Floor Command could not be read.");
    expect(host?.textContent).not.toContain("Nothing published");
    expect(host?.textContent).not.toContain("entered in Zebra");
    if (reading.status === "stale") {
      expect(reading.handoffs[0]?.handoffStatus).toBe("complete");
      expect(reading.handoffs[0]?.freshness).toBe("stale");
    }
  });

  it("is not mounted on the production instrument or the Work schedule", () => {
    const files = [
      "components/orient/OrientInstrument.tsx",
      "components/orient/Surfaces.tsx",
      "components/orient/OrientView.tsx",
      "components/WorkOrientation.tsx",
      "components/TaskLoop.tsx",
      "app/page.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toContain("FloorCommandObservation");
    }
  });
});
