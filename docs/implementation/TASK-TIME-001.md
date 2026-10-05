# TASK-TIME-001 — Time given to a Task

Date: 2026-10-05.

Baseline: `2c1256a6f3faf0707625302f28dec661576f7b9e`.

This implements [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md). It does not change that contract.

## Storage

`blocks.task_id` is a nullable uuid. Null means the Block does not refer to a Task. A value is the Task this Block was chosen for.

The column is not unique. Many Blocks may refer to one Task. The Task does not store those Blocks.

`tasks` already has `unique (id, user_id)` from the Active Thread migration. The new foreign key is `(task_id, user_id)` referencing `tasks (id, user_id)`, `match simple`, `on delete no action`, `deferrable initially deferred`. No new uniqueness constraint was added. No grant was added. Existing Block row-level security is unchanged.

`ON DELETE NO ACTION` does not delete the Block, does not clear `task_id`, and does not change the purpose. A committed delete of a cited Task fails, and the Block row stays as it was. The check is deferred so account removal can delete that user's blocks and tasks in one transaction. That deferral is not a Task-removal operation. Task-removal semantics remain unresolved.

The migration is `supabase/migrations/20261005092200_block_task.sql`. It was authored in the repository. It was not applied to the hosted Supabase project `ksmhgaamyheyhefbyglb`.

## Domain and persistence

`Block.taskId` is `string | null`. `Task` gains no Block list, no start, no end, and no duration.

Purpose stays the user's words. The Task title is not copied into it. Creating or updating a Block does not write `planned_on`, Must Do, a due date, completion, or the Active Thread.

`createBlock` and `updateBlock` remain one write to `blocks`. An update includes `task_id`, so moving a Block keeps the reference that was supplied with that write. Completing a Task still writes only `completed_at` on `tasks`.

## Scaffold

The time-first Block establishment on the day canvas can optionally cite one open Task. The choice is empty until the human selects one. Save is still the write. Leave and Cancel write nothing. A failed write is not success.

Open Tasks come from the existing complete `loadOpenTasks` read, in that function's order. A failed read is shown as a failure. It is not an empty task list. The human can still establish a Block with no Task reference. Selecting a Task does not change the purpose.

Task-first placement is the same canonical Block. This tranche does not implement that gesture.

## Projections

A Task-associated Block remains a Block in Timeline and in Current Temporal Orientation. `taskId` travels with that Block. The Task is not a separate member. Overlap is unchanged. Capacity is not calculated.

## Not done

Capacity, drag and drop, Task-first gesture, Week, Month, recurrence, reminders, Pulse, reschedule, carry-forward, Start, Adjust, Skip, Task removal, and the final interaction remain unresolved. The hosted migration is not applied.
