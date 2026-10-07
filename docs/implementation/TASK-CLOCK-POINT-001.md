# TASK-CLOCK-POINT-001 — Task local clock-point intention

Implements the accepted semantic from [TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md](TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md).

Baseline before this tranche: `a8c7b843e39998e095a674046990bd47bfda920a`.

## Implemented semantic

A Task may establish an optional **local clock-point intention** associated with its planned civil date:

> “I intend to do/start this Task at this clock time.”

This is **not** duration, Block territory, Commitment, Protected Time, Capacity consumption, Active Thread, due time, reminder, timer, or automatic scheduling.

A point says when. An interval says what time has been given to it.

## Canonical representation

| Layer | Shape |
| --- | --- |
| Column | `tasks.planned_local` — nullable PostgreSQL `time` |
| Domain | `Task.plannedLocal: string \| null` as `HH:MM` |
| Constraint | `planned_local` requires `planned_on` (`tasks_planned_local_needs_planned_on`) |

No new table. No invented end. No equal-clock Block encoding.

## Migration

`supabase/migrations/20261007100600_task_planned_local.sql`

- Adds nullable `planned_local time`
- Check: null clock or non-null `planned_on`
- No backfill

## Invariants

1. Clock point without planned day is refused on insert/update mapping.
2. Clearing `planned_on` also clears `planned_local` (same write when date is cleared).
3. Moving planned day while omitting `plannedLocal` from the patch **preserves** the stored clock (Wednesday 2 PM → Thursday 2 PM).
4. Clearing only `plannedLocal` retains `planned_on`.
5. Existing Tasks with null clock remain valid.

## Writer behavior

| Writer | Behavior |
| --- | --- |
| `createTask` / `toTaskInsert` | Optional `plannedLocal`; requires `plannedOn` when set |
| `updateTask` / `toTaskUpdate` | Optional `plannedLocal`; clearing `plannedOn` forces `planned_local` null |
| `completeTask` / `reopenTask` | Unchanged — do not touch planned fields |
| Block / Commitment writers | Unchanged — no sync from/to Task clock |

Same-ID correction path: Wednesday → Wednesday 2 PM → Wednesday 3 PM → Thursday 3 PM → Thursday only via `updateTask` / Task edit draft.

## Projection behavior

- Open Task list / Thread Task detail may show `Planned YYYY-MM-DD at HH:MM`.
- Day / Week / Month Timeline **unchanged** — clock point is not interval territory and is not rendered as a Block band.
- `projectTodayTasks` still keys only on `plannedOn` civil date.
- Limitation documented: no point mark on Day/Week/Month in this tranche (avoids inventing a new visual system).

## Capacity behavior

Capacity coverage still unions only Protected Time, Commitment, and Block. Task / `planned_on` / `planned_local` do not utilize. Regression in `persistence/taskPlannedLocal.test.ts`.

## ActiveThread / MustDo / due / completion

Independent. Clock point does not Start. Does not alter MustDo or due. Complete / Still open preserve planned date and clock on the row.

## Block relationship

Independent coexistence. No automatic Block from clock. No automatic clock from Block.

## Cross-client behavior

Canonical Task field. Existing Class-A `tasks` INSERT/UPDATE bindings remain sufficient. No new channel.

## Reachability status

Production Thread `TaskDetail` edit (and orphaned `TaskEditForm`) expose optional **Planned clock** (`type="time"`), disabled until a planned day exists. Capture quick path unchanged (title-first). Standing ACT list not built.

## Tests

- `persistence/taskPlannedLocal.test.ts` (new)
- Mapping / task edit / today / reopen / resume / capacity / coherence updates
- Fixture compatibility for `plannedLocal` / `planned_local` on Task rows

## Explicit non-goals

ACT, LOOK·ADD·ACT, action list, mobile-bottom redesign, duration inference, Event model, timer, reminder, recurrence, notification, automatic Start/Block/Commitment, AI scheduling, Google Calendar.
