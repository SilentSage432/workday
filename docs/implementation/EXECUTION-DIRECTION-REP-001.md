# EXECUTION-DIRECTION-REP-001 — Stored execution in service of a Priority

Date: 2026-10-05.

Baseline: `51262e66869bb948619e35a9c9376e3610580237`.

## What is representable

A human can explicitly establish an already-established Task in service of an already-established Priority.

A human can explicitly establish an already-established Block in service of an already-established Priority.

Those are different pairs. A Block does not receive a Task's pairs. A Task does not receive a Block's pairs. `blocks.task_id` is not consulted.

Each pair is one row. Repeating the act returns that row and does not change `established_at`. Withdrawal deletes that row. A later act may insert the pair again. The deleted row is not restored.

Orient can read each collection back. The read is the complete collection for the signed-in user. Order is `established_at` ascending, then the execution id, then `priority_id`. That order is retrieval order. It is not rank or progress. A short or failed read throws and returns nothing.

## What this does not store

No execution-to-Destination edge. No `priority_id` on `tasks` or `blocks`. No progress, rank, score, status, or health. No `withdrawn_at` and no event history. No Month reading and no production interaction.

Whether one Priority may serve more than one Destination stays unresolved. Destination and Priority lifecycle stay unresolved. A committed delete of a cited Task, Block, or Priority fails while a pair row cites it, and that pair row is left as it was. That is not a decision to delete or keep the endpoint.

## Persistence

`supabase/migrations/20261005170800_execution_direction.sql` adds `public.task_priority_service` and `public.block_priority_service`.

A Task pair is `user_id`, `task_id`, `priority_id`, and `established_at`. The primary key is `(task_id, priority_id)`. `established_at` is the instant of the explicit act, supplied by the caller. It has no default.

A Block pair is `user_id`, `block_id`, `priority_id`, and `established_at`. The primary key is `(block_id, priority_id)`.

Both foreign keys are composite same-owner keys, `match simple`, `on delete no action`, deferred until transaction commit. The Priority key references `priorities (id, user_id)`. It does not copy `destination_id`.

`blocks` gains `blocks_id_user_key` on `(id, user_id)`. `id` is already the primary key, so this adds no Block column and no Block cardinality. It is the target of the Block pair's foreign key. `tasks` already had `tasks_id_user_key`. This migration does not alter `tasks`.

## Migration status

The migration is not applied to `ksmhgaamyheyhefbyglb`.

## Ownership

Row level security is enabled on both new tables. The migration revokes all privileges on each from `public`, `anon`, and `authenticated`, then grants `authenticated` only `select`, `insert`, and `delete`. `authenticated` may select, insert, and delete only rows whose `user_id` is `auth.uid()`. Update is not granted. There is no update policy.

`user_id` is not a domain field. The application writes it from the signed-in user.

## Operations

`establishTaskPriorityService` and `establishBlockPriorityService` are the writes that create a pair. Each requires the caller to name both endpoints and the establishment instant. Neither creates a Task, a Block, or a Priority. If the pair is already retained, the function returns it and does not write.

`withdrawTaskPriorityService` and `withdrawBlockPriorityService` delete that pair only.

`loadTaskPriorityService` and `loadBlockPriorityService` are the complete reads.

Task completion writes `completed_at` on the Task and does not call these functions. Block passage is not a write. Nothing here deletes a pair because time passed.

## Non-inference

No function reads Must Do, Due, `planned_on`, the Active Thread, Context, cadence, overlap, or time spent. Capture is unchanged. Week, Timeline, Capacity, and present-moment orientation do not read these tables.
