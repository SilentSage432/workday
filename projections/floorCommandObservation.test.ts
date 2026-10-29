import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FLOOR_COMMAND_SOURCE,
  FLOOR_COMMAND_THIS_WEEK_HREF,
  type FloorCommandDeadlineInput,
  type FloorCommandRead,
  type FloorCommandSnapshot,
  type FloorCommandAssignmentInput,
} from "@/domain/floorCommandObservation";
import { workFiscalWeekContaining } from "@/domain/time/workFiscalWeek";
import {
  applyFloorCommandRead,
  dismissFloorCommandRevision,
  emptyFloorCommandObservationMemory,
  projectFloorCommandObservation,
  type FloorCommandObservationMemory,
} from "@/projections/floorCommandObservation";

const READ_AT = "2026-10-25T18:00:00.000Z";
const WEEK = "2026-W44";
const MONDAY = "2026-10-26";
const SUNDAY = "2026-11-01";

function entry(
  id: string,
  overrides: Partial<FloorCommandAssignmentInput> = {},
): FloorCommandAssignmentInput {
  return {
    id: `fc.assignment.${id}`,
    assignment_id: id,
    bay_id: `bay-${id}`,
    department: "flooring",
    roster_specialist_id: `roster-${id}`,
    associate_name: `Associate ${id}`,
    assignment_status: "assigned",
    zebra_confirmation: "unconfirmed",
    zebra_entered_at: null,
    zebra_task_completed: false,
    deadline: null,
    updated_at: READ_AT,
    ...overrides,
  };
}

function deadline(
  rosterId: string,
  overrides: Partial<FloorCommandDeadlineInput> = {},
): FloorCommandDeadlineInput {
  return {
    id: `fc.deadline.2587.${WEEK}.${rosterId}`,
    roster_specialist_id: rosterId,
    associate_name: `Associate ${rosterId}`,
    target_date: "2026-10-28",
    final_date: "2026-10-30",
    review_required: false,
    dates_overridden: false,
    confirmed_at: READ_AT,
    published_entry_ids: [],
    ...overrides,
  };
}

function snapshot(overrides: Partial<FloorCommandSnapshot> = {}): FloorCommandSnapshot {
  const entries = overrides.entries ?? [entry("a1"), entry("a2")];
  const confirmed = entries.filter((row) => row.zebra_confirmation === "confirmed").length;
  const base: FloorCommandSnapshot = {
    source: FLOOR_COMMAND_SOURCE,
    store_number: "02587",
    operational_week: WEEK,
    week_starting: MONDAY,
    week_ending: SUNDAY,
    publication: {
      id: `fc.publication.2587.${WEEK}`,
      status: entries.length > 0 ? "published" : "unpublished",
    },
    handoff: {
      id: `fc.zebra-handoff.2587.${WEEK}`,
      status: entries.length === 0 ? "none" : confirmed === 0 ? "pending" : confirmed === entries.length ? "complete" : "partial",
      deadline_date: MONDAY,
      deadline_policy: "monday_of_operational_week",
      required_count: entries.length,
      confirmed_count: confirmed,
      outstanding_count: entries.length - confirmed,
    },
    entries,
    deadlines: { availability: "ready", commitments: [] },
    retired: [],
    freshness: {
      read_at: READ_AT,
      source_updated_at: READ_AT,
      revision: "rev-published",
      matches_previous_revision: null,
    },
  };
  return {
    ...base,
    ...overrides,
    publication: overrides.publication ?? base.publication,
    handoff: overrides.handoff ?? base.handoff,
    deadlines: overrides.deadlines ?? base.deadlines,
    freshness: overrides.freshness ?? base.freshness,
  };
}

function ready(value: FloorCommandSnapshot): FloorCommandRead {
  return { availability: "ready", snapshot: value };
}

function unavailable(readAt = "2026-10-26T12:00:00.000Z"): FloorCommandRead {
  return { availability: "unavailable", reason: "assignments_unavailable", read_at: readAt };
}

function observe(read: FloorCommandRead, memory?: FloorCommandObservationMemory) {
  const next = applyFloorCommandRead(memory ?? emptyFloorCommandObservationMemory("2587"), read);
  return { memory: next, reading: projectFloorCommandObservation(next) };
}

function handoffOf(reading: ReturnType<typeof projectFloorCommandObservation>) {
  if (reading.status === "unobserved" || reading.status === "unavailable") {
    throw new Error(`expected a snapshot reading, received ${reading.status}`);
  }
  const handoff = reading.handoffs[0];
  if (!handoff) throw new Error("expected a handoff");
  return handoff;
}

describe("floor command observation projection", () => {
  it("does not use the Saturday-first Work week or Orient writers", () => {
    const source = readFileSync(new URL("./floorCommandObservation.ts", import.meta.url), "utf8");
    const domain = readFileSync(new URL("../domain/floorCommandObservation.ts", import.meta.url), "utf8");
    expect(source + domain).not.toMatch(/workFiscalWeek|pulse|stewardship|defineCommitment|createTask|InterruptGrant/);
    expect(workFiscalWeekContaining(MONDAY)).toBe("2026-10-24");
    expect(workFiscalWeekContaining(MONDAY)).not.toBe(MONDAY);
  });

  it("keeps one handoff identity for the ISO week and does not mutate the snapshot", () => {
    const published = snapshot();
    const frozen = structuredClone(published);
    Object.freeze(frozen);
    const { reading } = observe(ready(frozen));
    const handoff = handoffOf(reading);
    expect(reading.status).toBe("retained");
    expect(handoff.source).toBe(FLOOR_COMMAND_SOURCE);
    expect(handoff.weekIdentity).toBe("floor_command_iso_week");
    expect(handoff.storeNumber).toBe("2587");
    expect(handoff.operationalWeek).toBe(WEEK);
    expect(handoff.deadlineDate).toBe(MONDAY);
    expect(handoff.weekStarting).toBe(MONDAY);
    expect(handoff.publishedAssignmentCount).toBe(2);
    expect(handoff.remainingZebraEntries).toBe(2);
    expect(handoff.handoffStatus).toBe("pending");
    expect(handoff.handoffId).toBe("fc.zebra-handoff.2587.2026-W44");
    expect(handoff.publicationId).toBe("fc.publication.2587.2026-W44");
    expect(handoff.assignments.map((row) => row.id)).toEqual(["fc.assignment.a1", "fc.assignment.a2"]);
    expect(handoff.assignments.every((row) => row.zebraTaskCompleted === false)).toBe(true);
    expect(handoff.returnHref).toBe(FLOOR_COMMAND_THIS_WEEK_HREF);
    expect(handoff.correctionAuthority).toBe("external");
    expect(frozen).toEqual(published);
  });

  it("treats an identical snapshot as the same observation", () => {
    const first = observe(ready(snapshot()));
    const second = observe(ready(snapshot()), first.memory);
    expect(projectFloorCommandObservation(second.memory)).toEqual(projectFloorCommandObservation(first.memory));
    expect(second.memory.handoffs).toHaveLength(1);
    expect(handoffOf(second.reading).revision).toBe("rev-published");
    expect(handoffOf(second.reading).assignments.filter((row) => row.lifecycle === "superseded")).toEqual([]);
  });

  it("reports no published assignments without calling the week empty from a failure", () => {
    const { reading } = observe(
      ready(
        snapshot({
          entries: [],
          publication: { id: "fc.publication.2587.2026-W44", status: "unpublished" },
          handoff: {
            id: "fc.zebra-handoff.2587.2026-W44",
            status: "none",
            deadline_date: MONDAY,
            deadline_policy: "monday_of_operational_week",
            required_count: 0,
            confirmed_count: 0,
            outstanding_count: 0,
          },
          freshness: {
            read_at: READ_AT,
            source_updated_at: null,
            revision: "rev-none",
            matches_previous_revision: null,
          },
        }),
      ),
    );
    const handoff = handoffOf(reading);
    expect(handoff.publicationStatus).toBe("unpublished");
    expect(handoff.handoffStatus).toBe("none");
    expect(handoff.attention).toBe(false);
    expect(handoff.summary).toBe("Nothing published for this week.");
  });

  it("shows partial and complete handoffs from Floor Command counts", () => {
    const partial = observe(
      ready(
        snapshot({
          entries: [
            entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
            entry("a2"),
          ],
          freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-partial", matches_previous_revision: false },
        }),
      ),
    );
    expect(handoffOf(partial.reading).handoffStatus).toBe("partial");
    expect(handoffOf(partial.reading).remainingZebraEntries).toBe(1);
    expect(handoffOf(partial.reading).summary).toBe("1 of 2 still to enter in Zebra.");
    expect(handoffOf(partial.reading).attention).toBe(true);

    const complete = observe(
      ready(
        snapshot({
          entries: [
            entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
            entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
          ],
          freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-complete", matches_previous_revision: false },
        }),
      ),
    );
    const done = handoffOf(complete.reading);
    expect(done.handoffStatus).toBe("complete");
    expect(done.remainingZebraEntries).toBe(0);
    expect(done.attention).toBe(false);
    expect(done.assignments.every((row) => row.zebraTaskCompleted === false)).toBe(true);
  });

  it("reopens the same handoff when Floor Command reassigns a bay", () => {
    const confirmed = snapshot({
      entries: [
        entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
      ],
      freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-complete", matches_previous_revision: null },
    });
    const dismissed = dismissFloorCommandRevision(observe(ready(confirmed)).memory, {
      handoffId: confirmed.handoff.id,
      revision: "rev-complete",
    });
    const reassigned = snapshot({
      entries: [
        entry("a1", {
          roster_specialist_id: "roster-new",
          associate_name: "New associate",
          zebra_confirmation: "unconfirmed",
          zebra_entered_at: null,
        }),
        entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
      ],
      freshness: { read_at: "2026-10-26T15:00:00.000Z", source_updated_at: "2026-10-26T15:00:00.000Z", revision: "rev-reassign", matches_previous_revision: false },
    });
    const reading = projectFloorCommandObservation(applyFloorCommandRead(dismissed, ready(reassigned)));
    const handoff = handoffOf(reading);
    expect(handoff.handoffId).toBe(confirmed.handoff.id);
    expect(handoff.revision).toBe("rev-reassign");
    expect(handoff.dismissed).toBe(false);
    expect(handoff.handoffStatus).toBe("partial");
    expect(handoff.attention).toBe(true);
    const bay = handoff.assignments.find((row) => row.id === "fc.assignment.a1");
    expect(bay?.rosterSpecialistId).toBe("roster-new");
    expect(bay?.zebraConfirmation).toBe("unconfirmed");
    expect(bay?.lifecycle).toBe("current");
  });

  it("keeps a source-retired assignment on the first observation and a disappearance as superseded", () => {
    const first = observe(ready(snapshot({
      entries: [entry("a1")],
      retired: [
        {
          id: "fc.assignment.cleared",
          assignment_id: "cleared",
          bay_id: "bay-cleared",
          roster_specialist_id: "roster-cleared",
          reason: "cleared",
        },
      ],
    })));
    const handoff = handoffOf(first.reading);
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.a1")?.lifecycle).toBe("current");
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.cleared")?.lifecycle).toBe("retired");
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.cleared")?.zebraTaskCompleted).toBe(false);
    expect(handoff.summary).not.toContain("complete");

    const removed = observe(
      ready(snapshot({
        entries: [entry("a1")],
        retired: [],
        freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-gone", matches_previous_revision: false, week_sequence: 2 },
      })),
      observe(ready(snapshot({
        entries: [entry("a1"), entry("a2")],
        freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-both", matches_previous_revision: null, week_sequence: 1 },
      }))).memory,
    );
    expect(handoffOf(removed.reading).assignments.find((row) => row.id === "fc.assignment.a2")?.lifecycle).toBe("superseded");
  });

  it("keeps a removed assignment as superseded and accepts its replacement", () => {
    const first = observe(ready(snapshot()));
    const replacement = snapshot({
      entries: [entry("a1"), entry("a3", { associate_name: "Replacement" })],
      retired: [
        {
          id: "fc.assignment.a2",
          assignment_id: "a2",
          bay_id: "bay-a2",
          roster_specialist_id: "roster-a2",
          reason: "cleared",
        },
      ],
      freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-replaced", matches_previous_revision: false },
    });
    const handoff = handoffOf(observe(ready(replacement), first.memory).reading);
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.a2")?.lifecycle).toBe("retired");
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.a3")?.lifecycle).toBe("current");
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.a2")?.zebraTaskCompleted).toBe(false);
    expect(handoff.publishedAssignmentCount).toBe(2);
    expect(handoff.revision).toBe("rev-replaced");
  });

  it("shows confirmed SMART dates and keeps them when a later deadline read fails", () => {
    const confirmed = snapshot({
      deadlines: {
        availability: "ready",
        commitments: [deadline("roster-a1", { review_required: false, published_entry_ids: ["fc.assignment.a1"] })],
      },
    });
    const shown = handoffOf(observe(ready(confirmed)).reading);
    expect(shown.deadlines).toEqual([
      {
        id: "fc.deadline.2587.2026-W44.roster-a1",
        rosterSpecialistId: "roster-a1",
        associateName: "Associate roster-a1",
        targetDate: "2026-10-28",
        finalDate: "2026-10-30",
        reviewRequired: false,
        publishedEntryIds: ["fc.assignment.a1"],
      },
    ]);
    expect(shown.reviewRequired).toBe(false);

    const review = snapshot({
      deadlines: {
        availability: "ready",
        commitments: [deadline("roster-a1", { review_required: true })],
      },
      freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-review", matches_previous_revision: false },
    });
    const needsReview = handoffOf(observe(ready(review)).reading);
    expect(needsReview.reviewRequired).toBe(true);
    expect(needsReview.attention).toBe(true);
    expect(needsReview.handoffStatus).toBe("pending");

    const hiddenDates = snapshot({
      deadlines: { availability: "unavailable", commitments: [] },
      freshness: { read_at: "2026-10-26T12:00:00.000Z", source_updated_at: READ_AT, revision: "rev-dates-down", matches_previous_revision: false },
    });
    const retained = handoffOf(observe(ready(hiddenDates), observe(ready(confirmed)).memory).reading);
    expect(retained.deadlinesAvailability).toBe("unavailable");
    expect(retained.deadlines[0]?.targetDate).toBe("2026-10-28");
    expect(retained.deadlines[0]?.reviewRequired).toBe(false);
    expect(retained.handoffStatus).toBe("pending");
  });

  it("hides only the dismissed revision", () => {
    const published = snapshot();
    const hidden = dismissFloorCommandRevision(observe(ready(published)).memory, {
      handoffId: published.handoff.id,
      revision: "rev-published",
    });
    const quiet = handoffOf(projectFloorCommandObservation(hidden));
    expect(quiet.dismissed).toBe(true);
    expect(quiet.attention).toBe(false);
    expect(quiet.handoffStatus).toBe("pending");
    expect(quiet.remainingZebraEntries).toBe(2);

    const again = dismissFloorCommandRevision(hidden, {
      handoffId: published.handoff.id,
      revision: "rev-published",
    });
    expect(again.dismissals).toHaveLength(1);

    const revised = snapshot({
      freshness: { read_at: READ_AT, source_updated_at: READ_AT, revision: "rev-next", matches_previous_revision: false },
    });
    const visible = handoffOf(observe(ready(revised), hidden).reading);
    expect(visible.dismissed).toBe(false);
    expect(visible.attention).toBe(true);
    expect(visible.revision).toBe("rev-next");
  });

  it("retains the last snapshot when Floor Command cannot be read", () => {
    const none = observe(unavailable());
    expect(none.reading).toEqual({
      status: "unavailable",
      readAt: "2026-10-26T12:00:00.000Z",
      reason: "assignments_unavailable",
      handoffs: [],
    });

    const known = observe(ready(snapshot()));
    const stale = observe(unavailable("2026-10-26T13:00:00.000Z"), known.memory);
    expect(stale.reading.status).toBe("stale");
    const handoff = handoffOf(stale.reading);
    expect(handoff.freshness).toBe("stale");
    expect(handoff.handoffStatus).toBe("pending");
    expect(handoff.publishedAssignmentCount).toBe(2);
    expect(handoff.operationalWeek).toBe(WEEK);
    expect(stale.memory.handoffs).toHaveLength(1);
  });

  it("keeps a new week beside an older outstanding handoff and refuses another store", () => {
    const current = observe(ready(snapshot()));
    const nextWeek = snapshot({
      operational_week: "2026-W45",
      week_starting: "2026-11-02",
      week_ending: "2026-11-08",
      publication: { id: "fc.publication.2587.2026-W45", status: "published" },
      handoff: {
        id: "fc.zebra-handoff.2587.2026-W45",
        status: "pending",
        deadline_date: "2026-11-02",
        deadline_policy: "monday_of_operational_week",
        required_count: 1,
        confirmed_count: 0,
        outstanding_count: 1,
      },
      entries: [entry("b1")],
      freshness: { read_at: "2026-11-01T18:00:00.000Z", source_updated_at: null, revision: "rev-w45", matches_previous_revision: null },
    });
    const both = observe(ready(nextWeek), current.memory);
    expect(both.memory.handoffs).toHaveLength(2);
    expect(both.reading.status).toBe("retained");
    if (both.reading.status !== "retained") return;
    expect(both.reading.handoffs.map((row) => row.operationalWeek)).toEqual(["2026-W45", "2026-W44"]);
    expect(both.reading.handoffs.every((row) => row.attention)).toBe(true);

    const otherStore = snapshot({ store_number: "1999" });
    const rejected = applyFloorCommandRead(both.memory, ready(otherStore));
    expect(rejected.handoffs).toHaveLength(2);
    expect(rejected.lastAttempt?.reason).toBe("cross_store");
    expect(projectFloorCommandObservation(rejected).status).toBe("stale");
    if (projectFloorCommandObservation(rejected).status !== "stale") return;
    expect(projectFloorCommandObservation(rejected).handoffs.map((row) => row.storeNumber)).toEqual(["2587", "2587"]);
  });
});

describe("none stays distinct from complete", () => {
  function timed(revision: string, sourceUpdatedAt: string) {
    return {
      read_at: sourceUpdatedAt,
      source_updated_at: sourceUpdatedAt,
      revision,
      matches_previous_revision: false,
    };
  }

  function confirmedEntries() {
    return [
      entry("a1", { zebra_confirmation: "confirmed" as const, zebra_entered_at: "2026-10-26T16:00:00.000Z" }),
      entry("a2", { zebra_confirmation: "confirmed" as const, zebra_entered_at: "2026-10-26T16:00:00.000Z" }),
    ];
  }

  it("walks unpublished, pending, partial, complete, reopened, and cleared", () => {
    const unpublished = snapshot({
      entries: [],
      freshness: timed("rev-none", "2026-10-25T12:00:00.000Z"),
    });
    let memory = observe(ready(unpublished)).memory;
    let handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("none");
    expect(handoff.publicationStatus).toBe("unpublished");
    expect(handoff.summary).toBe("Nothing published for this week.");
    expect(handoff.attention).toBe(false);
    expect(handoff.operationalWeek).toBe(WEEK);
    expect(handoff.deadlineDate).toBe(MONDAY);

    memory = applyFloorCommandRead(
      memory,
      ready(snapshot({ freshness: timed("rev-pending", "2026-10-25T18:00:00.000Z") })),
    );
    handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("pending");
    expect(handoff.publicationStatus).toBe("published");
    expect(handoff.summary).toBe("None of 2 entered in Zebra.");
    expect(handoff.attention).toBe(true);

    memory = applyFloorCommandRead(
      memory,
      ready(
        snapshot({
          entries: [
            entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: "2026-10-26T15:00:00.000Z" }),
            entry("a2"),
          ],
          freshness: timed("rev-partial", "2026-10-26T15:00:00.000Z"),
        }),
      ),
    );
    handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("partial");
    expect(handoff.remainingZebraEntries).toBe(1);
    expect(handoff.summary).toBe("1 of 2 still to enter in Zebra.");

    memory = applyFloorCommandRead(
      memory,
      ready(snapshot({ entries: confirmedEntries(), freshness: timed("rev-complete", "2026-10-26T16:00:00.000Z") })),
    );
    handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("complete");
    expect(handoff.summary).toBe("All 2 entered in Zebra.");
    expect(handoff.attention).toBe(false);
    expect(handoff.assignments.every((row) => row.zebraTaskCompleted === false)).toBe(true);

    const replay = applyFloorCommandRead(
      memory,
      ready(snapshot({ entries: confirmedEntries(), freshness: timed("rev-complete", "2026-10-26T16:00:00.000Z") })),
    );
    expect(projectFloorCommandObservation(replay)).toEqual(projectFloorCommandObservation(memory));

    memory = applyFloorCommandRead(
      memory,
      ready(
        snapshot({
          entries: [
            entry("a1", {
              roster_specialist_id: "roster-new",
              associate_name: "New associate",
              zebra_confirmation: "unconfirmed",
              zebra_entered_at: null,
            }),
            entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: "2026-10-26T16:00:00.000Z" }),
          ],
          freshness: timed("rev-reopen", "2026-10-26T17:00:00.000Z"),
        }),
      ),
    );
    handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("partial");
    expect(handoff.attention).toBe(true);
    expect(handoff.assignments.find((row) => row.id === "fc.assignment.a1")?.zebraConfirmation).toBe("unconfirmed");

    memory = applyFloorCommandRead(
      memory,
      ready(snapshot({ entries: confirmedEntries(), freshness: timed("rev-complete-again", "2026-10-26T18:00:00.000Z") })),
    );
    const cleared = snapshot({
      entries: [],
      retired: [
        { id: "fc.assignment.a1", assignment_id: "a1", bay_id: "bay-a1", roster_specialist_id: "roster-a1", reason: "cleared" },
        { id: "fc.assignment.a2", assignment_id: "a2", bay_id: "bay-a2", roster_specialist_id: "roster-a2", reason: "cleared" },
      ],
      freshness: timed("rev-cleared", "2026-10-26T19:00:00.000Z"),
    });
    memory = applyFloorCommandRead(memory, ready(cleared));
    handoff = handoffOf(projectFloorCommandObservation(memory));
    expect(handoff.handoffStatus).toBe("none");
    expect(handoff.publicationStatus).toBe("unpublished");
    expect(handoff.summary).toBe("Nothing published for this week.");
    expect(handoff.summary).not.toContain("entered in Zebra");
    expect(handoff.attention).toBe(false);
    expect(handoff.assignments.every((row) => row.lifecycle === "retired" && row.zebraTaskCompleted === false)).toBe(true);
  });

  it("returns a finished handoff to pending when every current bay is reassigned", () => {
    const complete = observe(
      ready(snapshot({
        entries: confirmedEntries(),
        freshness: timed("rev-complete", "2026-10-26T16:00:00.000Z"),
      })),
    );
    const reopened = observe(
      ready(snapshot({
        entries: [
          entry("a1", { zebra_confirmation: "unconfirmed", zebra_entered_at: null }),
          entry("a2", { zebra_confirmation: "unconfirmed", zebra_entered_at: null }),
        ],
        freshness: timed("rev-all-reassigned", "2026-10-26T17:00:00.000Z"),
      })),
      complete.memory,
    );
    const handoff = handoffOf(reopened.reading);
    expect(handoff.handoffStatus).toBe("pending");
    expect(handoff.summary).toBe("None of 2 entered in Zebra.");
    expect(handoff.attention).toBe(true);
    expect(handoff.assignments.every((row) => row.zebraConfirmation === "unconfirmed" && row.zebraTaskCompleted === false)).toBe(true);
  });

  it("keeps an unpublished new week from completing the previous week", () => {
    const done = observe(
      ready(snapshot({ entries: [
        entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
      ], freshness: timed("rev-w44-done", "2026-10-26T16:00:00.000Z") })),
    );
    const next = snapshot({
      operational_week: "2026-W45",
      week_starting: "2026-11-02",
      week_ending: "2026-11-08",
      entries: [],
      publication: { id: "fc.publication.2587.2026-W45", status: "unpublished" },
      handoff: {
        id: "fc.zebra-handoff.2587.2026-W45",
        status: "none",
        deadline_date: "2026-11-02",
        deadline_policy: "monday_of_operational_week",
        required_count: 0,
        confirmed_count: 0,
        outstanding_count: 0,
      },
      freshness: timed("rev-w45-none", "2026-11-01T18:00:00.000Z"),
    });
    const reading = observe(ready(next), done.memory).reading;
    if (reading.status !== "retained") throw new Error(reading.status);
    expect(reading.handoffs.map((row) => [row.operationalWeek, row.handoffStatus])).toEqual([
      ["2026-W45", "none"],
      ["2026-W44", "complete"],
    ]);
    expect(reading.handoffs[0]?.summary).toBe("Nothing published for this week.");
    expect(reading.handoffs[1]?.summary).toBe("All 2 entered in Zebra.");
  });

  it("keeps the last status when a later read fails", () => {
    const pending = observe(ready(snapshot({ freshness: timed("rev-pending", "2026-10-25T18:00:00.000Z") })));
    const pendingStale = observe(unavailable("2026-10-26T12:00:00.000Z"), pending.memory);
    const pendingHandoff = handoffOf(pendingStale.reading);
    expect(pendingStale.reading.status).toBe("stale");
    expect(pendingHandoff.freshness).toBe("stale");
    expect(pendingHandoff.handoffStatus).toBe("pending");
    expect(pendingHandoff.summary).toBe("None of 2 entered in Zebra.");

    const complete = observe(
      ready(snapshot({
        entries: [
          entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
          entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        ],
        freshness: timed("rev-complete", "2026-10-26T16:00:00.000Z"),
      })),
    );
    const completeStale = observe(unavailable("2026-10-26T20:00:00.000Z"), complete.memory);
    const completeHandoff = handoffOf(completeStale.reading);
    expect(completeStale.reading.status).toBe("stale");
    expect(completeHandoff.freshness).toBe("stale");
    expect(completeHandoff.handoffStatus).toBe("complete");
    expect(completeHandoff.summary).toBe("All 2 entered in Zebra.");
    expect(completeHandoff.attention).toBe(false);
  });

  it("does not let an older snapshot replace a newer revision", () => {
    const newer = observe(
      ready(snapshot({
        entries: [
          entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
          entry("a2", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        ],
        freshness: timed("rev-complete", "2026-10-26T16:00:00.000Z"),
      })),
    );
    const older = applyFloorCommandRead(
      newer.memory,
      ready(snapshot({ freshness: timed("rev-old-pending", "2026-10-25T18:00:00.000Z") })),
    );
    expect(older).toBe(newer.memory);
    const untimed = applyFloorCommandRead(
      newer.memory,
      ready(snapshot({
        freshness: {
          read_at: "2026-10-27T12:00:00.000Z",
          source_updated_at: null,
          revision: "rev-untimed",
          matches_previous_revision: false,
        },
      })),
    );
    expect(untimed).toBe(newer.memory);
    const untimedRetained = observe(
      ready(snapshot({
        freshness: {
          read_at: "2026-10-25T12:00:00.000Z",
          source_updated_at: null,
          revision: "rev-untimed-first",
          matches_previous_revision: null,
        },
      })),
    );
    const timedAfterUntimed = applyFloorCommandRead(
      untimedRetained.memory,
      ready(snapshot({ freshness: timed("rev-later", "2026-10-26T16:00:00.000Z") })),
    );
    expect(timedAfterUntimed).toBe(untimedRetained.memory);
    expect(handoffOf(projectFloorCommandObservation(newer.memory)).revision).toBe("rev-complete");
  });

  it("keeps assignment status when deadline dates cannot be read", () => {
    const known = observe(ready(snapshot({
      entries: [
        entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        entry("a2"),
      ],
      deadlines: { availability: "ready", commitments: [deadline("roster-a1")] },
      freshness: timed("rev-dates", "2026-10-26T15:00:00.000Z"),
    })));
    const missing = observe(ready(snapshot({
      entries: [
        entry("a1", { zebra_confirmation: "confirmed", zebra_entered_at: READ_AT }),
        entry("a2"),
      ],
      deadlines: { availability: "unavailable", commitments: [] },
      freshness: timed("rev-dates-missing", "2026-10-26T18:00:00.000Z"),
    })), known.memory);
    const handoff = handoffOf(missing.reading);
    expect(handoff.handoffStatus).toBe("partial");
    expect(handoff.deadlinesAvailability).toBe("unavailable");
    expect(handoff.deadlines[0]?.targetDate).toBe("2026-10-28");
    expect(handoff.deadlines[0]?.finalDate).toBe("2026-10-30");
    expect(missing.reading.status).toBe("retained");
  });
});

describe("source week sequence", () => {
  function sequenced(
    sequence: number,
    revision: string,
    entries: FloorCommandAssignmentInput[] = [entry("a1")],
    synchronization: "comparable" | "withheld" = "comparable",
  ) {
    return {
      availability: "ready" as const,
      synchronization,
      snapshot: snapshot({
        entries,
        freshness: {
          read_at: READ_AT,
          source_updated_at: null,
          revision,
          matches_previous_revision: null,
          week_sequence: sequence,
        },
      }),
    };
  }

  it("accepts publication after sequence zero and rejects an older or conflicting sequence", () => {
    const empty = observe(sequenced(0, "rev-empty", []));
    expect(handoffOf(empty.reading).handoffStatus).toBe("none");
    const published = observe(sequenced(1, "rev-published"), empty.memory);
    expect(handoffOf(published.reading).revision).toBe("rev-published");
    expect(published.memory.lastAttempt?.result).toBe("success_complete");

    const replay = applyFloorCommandRead(published.memory, sequenced(1, "rev-published"));
    expect(replay.handoffs[0]?.snapshot.freshness.revision).toBe("rev-published");
    expect(replay.lastAttempt?.result).toBe("success_complete");

    const older = applyFloorCommandRead(replay, sequenced(0, "rev-empty", []));
    expect(older).toBe(replay);

    const conflict = applyFloorCommandRead(replay, sequenced(1, "rev-other"));
    expect(conflict.handoffs[0]?.snapshot.freshness.revision).toBe("rev-published");
    expect(conflict.lastAttempt).toMatchObject({ result: "failure", reason: "sequence_conflict" });

    const withheld = applyFloorCommandRead(replay, sequenced(2, "rev-next", [entry("a1")], "withheld"));
    expect(withheld.handoffs[0]?.snapshot.freshness.revision).toBe("rev-published");
    expect(withheld.lastAttempt?.reason).toBe("ordering_withheld");

    const deleted = observe(sequenced(2, "rev-deleted", []), replay);
    expect(handoffOf(deleted.reading).revision).toBe("rev-deleted");
    const dismissed = dismissFloorCommandRevision(deleted.memory, {
      handoffId: "fc.zebra-handoff.2587.2026-W44",
      revision: "rev-deleted",
    });
    expect(dismissed.handoffs[0]?.snapshot.handoff.status).toBe("none");
    expect(dismissed.dismissals).toEqual([
      { handoffId: "fc.zebra-handoff.2587.2026-W44", revision: "rev-deleted" },
    ]);
    const hidden = projectFloorCommandObservation(dismissed);
    expect(hidden.status).toBe("retained");
    if (hidden.status !== "retained") return;
    expect(hidden.handoffs[0]?.handoffStatus).toBe("none");
    expect(hidden.handoffs[0]?.attention).toBe(false);
  });
});
