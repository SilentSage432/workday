# TASK-COMPLETION-CORRECTION-001

Implements the accepted semantic from [TASK-COMPLETION-CORRECTION-DISCOVERY-001.md](TASK-COMPLETION-CORRECTION-DISCOVERY-001.md).

Baseline before this tranche: `123a705de3f2cc938ccd862b6acae0e9a4cafa6a`.

## Implemented semantic

A human can correct a mistaken Task completion:

> “I marked this Task complete, but it is still open.”

**Reopen corrects completion only** on the same canonical Task row:

`completed_at`: instant → `null`

Reopen does **not**:

- establish or restore Active Thread
- change title, context, planned, due, MustDo, origin, or originating Note
- rewrite Block citations
- reschedule, carry forward, remove, or create another Task
- create completion history

Complete, Still open / Reopen, and Start remain separate human authorities.

## Writer boundary

| Writer | Path | Mutation |
| --- | --- | --- |
| `completeTask` | `persistence/contextsAndTasks.ts` | `toCompletionUpdate` → `{ completed_at: ISO }` |
| `reopenTask` | same file | `toReopenUpdate` → `{ completed_at: null }` |
| `updateTask` | same file | `TaskPatch` only — still cannot touch completion |

Mapping: `toReopenUpdate` in `persistence/contextTaskMapping.ts`.  
Row typing: `TaskUpdateRow.completed_at` may be `string | null` so the reopen write can clear the column.

No migration. Existing RLS owner `UPDATE` on `tasks` is sufficient.

Production wire: `OrientInstrument.onReopenTask` → `persist(() => reopenTask(...))` → existing `reloadToken` reread. Class-A already listens for `tasks` UPDATE; no new bindings.

## Reachable correction path

Smallest production-compatible affordance: **immediate correction on the Thread surface after Complete**.

1. Human Completes the current thread Task in `ThreadSurface` / `TaskDetail`.
2. On successful Complete, ThreadSurface retains `{ id, title }` locally and shows **Still open** (`data-completion-correction`, `data-still-open`).
3. Still open calls `onReopen` with that **same Task id**.
4. On success, the correction chrome clears; canonical reread returns the Task to open projections.
5. On failure, the correction chrome remains with an alert for retry.

Why this shape: open projections intentionally exclude completed Tasks. Holding the just-completed identity on the still-open Thread surface gives a truthful correction opportunity without a completed-task archive, activity log, or undo stack. Human copy is **Still open**, not Undo.

This tranche does **not** build the standing ACT / action-list surface or reorganize mobile bottom controls.

## Active Thread behavior

Completing the cited Task still clears Active Thread via the existing DB trigger.

Reopen does not write `active_threads`. After reopen:

- Task is open
- Active Thread remains empty (unless some other thread already existed for a different Task)

The human may Start separately.

## Canonical reload / coherence

Local success: `persist` increments `reloadToken`; loaders re-read `loadOpenTasks` and `loadActiveThread`.

Peers: existing Class-A `tasks` UPDATE (and `active_threads` DELETE on complete) → coalesced reread. Reopen produces Task UPDATE only; thread stays absent on both clients until Start.

## Failure behavior

Failed `reopenTask` throws. `persist` does not advance `reloadToken`. ThreadSurface keeps Still open and shows the error. No Active Thread write. No other Task fields written.

Failed Complete does not open the correction chrome; Complete remains available with an alert.

## Files changed

- `persistence/contextsAndTasks.ts` — `reopenTask`
- `persistence/contextTaskMapping.ts` — `toReopenUpdate`
- `persistence/contextTaskRows.ts` — `completed_at` null on update row
- `components/orient/OrientInstrument.tsx` — `onReopenTask`
- `components/orient/OrientView.tsx` — pass `onReopen`
- `components/orient/types.ts` — `onReopenTask`
- `components/orient/Surfaces.tsx` — Still open correction chrome
- Orient action stubs in existing orient tests
- `docs/data/DATA-001.md` — list `reopenTask`
- `docs/implementation/TASK-COMPLETION-CORRECTION-001.md` — this record

## Tests added / changed

- `persistence/reopenTask.test.ts` (new)
- `persistence/contextTaskMapping.test.ts`
- `persistence/blockTask.test.ts`
- `components/orient/taskCompletionCorrection.test.tsx` (new)
- `projections/resume.test.ts`
- `components/orient/canonicalCoherence.test.tsx`
- OrientActions stubs: `orientView`, `phoneExperience`, `desktopReading`, `viewpointProvenance`, `temporalOrigin`, `civilDateCorrection`, `canonicalCoherence`

## Migrations

None.

## Explicit non-goals

- Standing ACT / action-list surface
- Mobile bottom grammar reorganization
- Completed-task history / archive
- Undo stack / event sourcing / audit log
- Task removal, carry-forward, reschedule
- Automatic Active Thread restoration
- Confirmation dialog requirement
- `/schedule`, all-day, recurrence, reminders, Pulse, external temporal sources
- Changing Present / Day / Week / Month / Context / MustDo / Capture / Work / direct temporal manipulation

## Validation

| Check | Result |
| --- | --- |
| Focused reopen / ActiveThread / open Task / Block↔Task / Task edit / coherence tests | Pass |
| Full suite | 79 files, 768 tests passed |
| Lint | Pass (after unused-import cleanup) |
| Typecheck | Pass |
| Production build | Pass |

No commit in this tranche.
