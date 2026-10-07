# TASK-CLOCK-POINT-ACCEPTANCE-001 — Task local clock-point intention

TASK-CLOCK-POINT-001 — physically accepted.

Implementation candidate: `93c56818dfeae53daa5f477e157d6e63ef0d506b`.

Physical acceptance was intentionally deferred until Task reachability and mobile interaction were sane. Deployed exercise completed after mobile LOOK · + · ACT reorganization and [MOBILE-INTERACTION-REFINEMENT-001](MOBILE-INTERACTION-REFINEMENT-001.md) (`23c14662cebfb7c71aacc9bc7f34f93889d8048b`).

Implementation record: [TASK-CLOCK-POINT-001.md](TASK-CLOCK-POINT-001.md).  
Semantics discovery: [TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md](TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md).

## Implementation commit

`93c56818dfeae53daa5f477e157d6e63ef0d506b` — `TASK-CLOCK-POINT-001: establish Task clock-point intention`

Migration: `supabase/migrations/20261007100600_task_planned_local.sql` (already applied with the implementation tranche; this acceptance adds no migration).

## Automated validation

Recorded at implementation close; this acceptance tranche is documentation-only and does not re-open implementation:

- Mapping / create / update / plannedLocal / reopen / capacity / coherence tests covered the canonical field
- Schema constraint: planned clock requires planned civil date
- Clearing planned day clears planned clock; moving day while omitting clock preserves clock

## Deployed physical evidence

Production phone was exercised through ACT Task inspect/edit after Task reachability became obvious.

Confirmed sequence:

1. A Task was given a planned civil date + planned local clock point.
2. After save/reopen, both planned date and planned clock persisted.
3. Changing only the planned civil date preserved the existing planned clock.
4. Clearing only the planned clock preserved the planned civil date.
5. Planned date + clock could be re-established.
6. Completing the Task and then using **Still open** returned the same Task to open state with its planned date/clock intact.
7. Reopening the completed Task did **not** restore Active Thread.
8. Planned clock remained a clock-point intention — not duration, not Block territory, not capacity.

## Accepted semantics

| Shape | Meaning |
| --- | --- |
| Task only | “I need to do this.” |
| Task + planned date | “I intend to do this on this civil date.” |
| Task + planned date + planned clock | “I intend to do this on this civil date at this local clock point.” |
| Task + linked Block | Separately established temporal territory |

Locked distinction:

> A point says when. An interval says what time has been given to it.

Complete / Still open / Start remain independent authorities. Still open does not restore Active Thread. Planned fields survive completion correction.

## Parked non-blocking observation

Native Android / browser `type="time"` clock interaction preference is recorded only under [MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md](MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md). It does not reopen TASK-CLOCK-POINT semantics.

## Boundary

No further Task clock-point implementation is authorized by this acceptance. No duration field. No automatic Block. No capacity consumption. No timer, reminder, recurrence, or calendar sync.

TASK-CLOCK-POINT-001 is therefore **physically accepted**. The deferred physical-acceptance boundary is closed.
