# Context and Task storage

Date: 2026-10-02.

## Decision

V0 stores Context and Task as user-owned rows.

A Task has at most one Context, through a composite foreign key on `(context_id, user_id)`. There is no join table.

A Task due boundary is a nullable civil date, `due_on`. The planned day is a separate nullable civil date, `planned_on`. Completion is a nullable instant, `completed_at`. MUST DO is a boolean. A directly captured Task has origin `user_created`.

Work, Family, TeamLab, and Financial are inserted for each authenticated user. They are not shared global rows.

## Context

ARCHITECTURE-001 required separate planned and due fields, one optional Context reference, and small provenance. It did not choose whether a Task due boundary is a date or an instant. Established Task examples are date-level, such as due Thursday and planned Monday. A time of day that needs attention is a Reminder, and reminders are not in this schema.

An ordinary foreign key on `context_id` would let one user's Task point at another user's Context. The composite key closes that gap. `ON DELETE SET NULL (context_id)` leaves the Task and keeps its owner.

## Consequences

- A later time-of-day due instant can be added as a new nullable column. It must not replace `due_on` or be inferred from it.
- Changing `due_on` does not write `planned_on`, and the reverse.
- `completed_at` null means open. A separate status column is not used.
- Origin may later widen for a recurring definition or an external authority. V0 still rejects every other origin. [2026-10-04-note-representation.md](2026-10-04-note-representation.md) supersedes note conversion as an origin. A user-established Task remains `user_created`. The originating Note is a reference on the fact, not an origin value.
- NOW, Timeline, Today, Pulse, and Resume remain projections. This decision does not rank Tasks.

The schema and policies are in [../data/DATA-001.md](../data/DATA-001.md).
