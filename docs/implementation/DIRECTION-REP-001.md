# DIRECTION-REP-001 — Stored Destination and Priority

Date: 2026-10-05.

Baseline: `3ceb63ab0c343bc42232ea5b61ddfc9ca011590c`.

## What is representable

A human can explicitly establish a Destination. A human can explicitly establish a Priority downstream of one already established Destination.

Orient can read those facts back. The read is the complete collection for the signed-in user. Order is `established_at` ascending, then `id` ascending. That order is retrieval order. It is not rank, importance, or progress.

## What stays semantic only

This tranche does not store the directional relationship into an execution fact.

[../decisions/2026-10-05-execution-direction-contract.md](../decisions/2026-10-05-execution-direction-contract.md) decides the semantics. [EXECUTION-DIRECTION-REP-001.md](EXECUTION-DIRECTION-REP-001.md) later stores a Task pair and a Block pair. This tranche does not.

Note-to-Task provenance still answers where a Task came from. A task-associated Block still answers what that chosen time is for. Neither field is reused for direction.

## Persistence

`supabase/migrations/20261005163000_direction.sql` adds `public.destinations` and `public.priorities`.

A Destination row is `id`, `user_id`, `content`, and `established_at`. `content` is the human's words. Blank text is rejected. Surrounding spaces are kept. `established_at` is the instant of the explicit act, supplied by the caller. It is not a deadline, a civil day, or a temporal interval. There is no `created_at`.

A Priority row is `id`, `user_id`, `destination_id`, `content`, and `established_at`. `destination_id` is required. The foreign key is `(destination_id, user_id)` referencing `destinations (id, user_id)`, `match simple`, `on delete no action`, deferred until transaction commit.

The foreign key is not unique. Nothing in this schema says a Destination has only one Priority. Each Priority row names one Destination, because that is the Destination the human named for this establishment. Whether one Priority may serve more than one Destination remains unresolved and is not represented. There is no second Destination column and no relationship table.

`on delete no action` does not rewrite a Priority and does not grant delete on `destinations`. A committed delete of a cited Destination fails, and the Priority row is left as it was. The deferral lets account removal delete that user's rows in one transaction. Account removal is not a Destination-deletion operation.

No column was added to `tasks`, `blocks`, `notes`, `commitments`, `protected_time`, or `contexts`.

## Migration status

The migration was applied manually to `ksmhgaamyheyhefbyglb`. The hosted authenticated grants were then repaired to match the revoke and grant in this file. This record does not add a second migration.

## Ownership

Row level security is enabled on both tables. The migration revokes all privileges on each new table from `public`, `anon`, and `authenticated`, then grants `authenticated` only `select` and `insert`. That clears the project's default table privileges before the intended grant. `authenticated` may select and insert only rows whose `user_id` is `auth.uid()`. Update and delete are not granted. Editing, removal, archival, abandonment, supersession, and replacement remain unresolved.

`user_id` is not a domain field. The application writes it from the signed-in user.

## Human establishment

`createDestination` and `createPriority` are the only writes. Each inserts one row from caller-supplied identity, words, and establishment instant. `createPriority` also requires the Destination identity the human supplied. It does not create a Destination. Neither function reads Tasks, Blocks, Must Do, Due, `planned_on`, the Active Thread, Context, cadence, or time spent.

A phrase still does not establish a Destination or a Priority. Capture is unchanged.

## Optionality

Task creation, Block creation, Commitments, Protected Time, Notes, Capture, `planned_on`, Due, Must Do, the Active Thread, the Work schedule, Timeline, Week, Capacity, and present-moment orientation do not require a Destination or a Priority. Their writes and projections do not call these functions.

## Non-inference and progress

No function infers a Destination, a Priority, or a directional relationship. There is no progress, health, percentage, score, rank, urgency, status, metric, deadline, or Context column.

Activity is not proof of progress. This tranche calculates none.

## Month and other readings

Month is not implemented. Week, Timeline, Current Temporal Orientation, present-moment orientation, and Capacity are unchanged and do not read these tables.

## Tests

`domain/destination.test.ts`, `domain/priority.test.ts`, and `persistence/direction.test.ts` cover explicit establishment, the absence of progress and rank fields, the required Destination link, ordinary Tasks and Blocks, the unchanged Task reference and Note citation, the refusal to infer from Must Do, Due, `planned_on`, the Active Thread, Context, or temporal projections, complete-read failure, and owner-only select and insert.
