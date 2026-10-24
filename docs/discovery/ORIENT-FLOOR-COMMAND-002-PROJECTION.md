# ORIENT-FLOOR-COMMAND-002 — External operational observation projection

**Status:** LOCAL FIXTURE PROJECTION. No network, migration, credential, route, worker, notification, or deploy.  
**Date:** 2026-10-24  
**Depends on:** [ORIENT-FLOOR-COMMAND-001-DISCOVERY.md](ORIENT-FLOOR-COMMAND-001-DISCOVERY.md)  
**Producer contract:** `carpet-auditor/docs/product/DEPTSYNC_FLOOR_COMMAND_ORIENT_001_CONTRACT.md`, unchanged. Source version `deptsync.floor-command.orient.v1`.

Live connection remains **NO-GO**. This tranche is the fixture projection named in the discovery. It does not authorize a pull.

---

## 1. Projection

`projectFloorCommandObservation` reads in-memory observation state. It does not read the clock, the network, or a database.

`applyFloorCommandRead` copies one ready snapshot into that state, keyed by the producer handoff id. The caller's snapshot is not mutated. A second copy of the same revision does not add a handoff or a superseded bay.

The input shape is the producer snapshot: store, ISO operational week, Monday `week_starting`, one handoff, bay entries, confirmed SMART deadlines, and `freshness.revision`. Orient does not recompute the Monday date and does not convert the week into a Saturday-first fiscal week. `2026-W44` stays `2026-W44`. Its Monday is `2026-10-26`. The fiscal week that contains that Monday starts `2026-10-24`, and this projection never writes that date.

Store identity strips non-digits and leading zeros. `02587` and `2587` are one store. A snapshot for another store is refused and does not replace the connected store.

Counts, status, and the deadline date come from the snapshot. `zebra_task_completed` is always false on the reading.

## 2. Lifecycle

| Input | Reading |
| --- | --- |
| No published assignments | `publicationStatus: unpublished`, handoff `none`, not an attention line |
| New published week | One handoff id, status from the snapshot, attention on while pending or partial |
| Pending | "None of N entered in Zebra." |
| Partial | "K of N still to enter in Zebra." |
| Complete | Retained. Attention turns off. Associate task completion stays false |
| Reassignment | Same handoff id and same assignment id. Roster and Zebra confirmation update. A dismissal of the previous revision does not hide the new revision |
| Removed bay | That assignment stays on the handoff as `superseded`. A replacement is a new assignment id |
| Confirmed SMART dates | Target and final dates on the handoff. They are not the Monday deadline |
| Review required | `reviewRequired` stays true and the handoff remains on the attention surface |
| Identical snapshot | Same revision, same handoff count, no new superseded rows |
| New revision | The new revision is visible even when the old revision was dismissed |
| Source unavailable, nothing retained | Status `unavailable`. No handoff is invented |
| Source unavailable after a success | Status `stale`. Last handoffs stay, including their week and counts |
| Deadline read unavailable | Assignment status stays. Last confirmed dates stay. They are not relabeled unconfirmed |
| Dismissal | Records handoff id plus revision. Status and remaining count do not change |

A newer operational week is a second handoff. It does not complete the earlier one.

## 3. UI

`FloorCommandObservationView` renders the attention handoffs: one summary, expandable assignment details, confirmed dates, and a link to `https://deptsync-hub.vercel.app/dashboard`. "Hide this revision" calls the dismissal function. There is no checkbox.

The view is exercised with fixtures. It is not mounted in `OrientInstrument`, LOOK, `OrientView`, the Work schedule, or `TaskLoop`. Those surfaces either edit the personal shift or compose established Orient facts. Putting this reading there would add a production source and a new operations destination. The later integration point is a read-only section beside Work inside LOOK, fed by a `SourceRead` of this projection. It is not a nav item, not an ACT row, and not a Task.

An unavailable reading says "Floor Command could not be read." A fresh week with nothing in attention renders nothing. That is not an empty published week.

## 4. Authority

The projection imports neither Pulse, stewardship, Task writers, nor Commitment writers. It grants nothing and ranks nothing. Correction authority on each handoff is `external`.

## 5. Future persistence

Still absent, and not part of this tranche:

- A server-held, store-scoped, read-only Floor Command credential
- A Floor Command read route for this snapshot
- An Orient table, written by the server, keyed by user and handoff id, holding the last complete snapshot, superseded assignment ids, and the last confirmed deadlines
- A separate user-owned dismissal of one revision
- Browser select under row-level security, with no browser write of operational rows
- A focus refresh that calls `applyFloorCommandRead`

Dismissal and the snapshot must not share a column with Tasks, Commitments, or stewardship satisfaction. No migration is authorized here.

## 6. Validation

Focused suites: `projections/floorCommandObservation.test.ts` and `components/orient/floorCommandObservation.test.tsx`. 15 tests passed. ESLint on the new files passed. `npm run typecheck` passed. `npm run build` passed.

## 7. Release

**NO-GO** for connection, production mount, credential, migration, and deploy. The fixture projection is local only.
