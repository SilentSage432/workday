-- TASK-TIME-001: a Block may refer to zero or one existing Task.
-- The relationship belongs to the Block. It is not a Task scheduling state.
-- Null means this Block does not refer to a Task.
-- Many Blocks may refer to the same Task. The Task does not store those Blocks.
-- The reference is not a start, an end, or a duration on the Task.
-- tasks already has unique (id, user_id), so this composite key needs no new uniqueness.
-- ON DELETE NO ACTION does not delete the Block, does not clear the reference,
-- and does not change the Block purpose.
-- The check is deferred so account removal can delete that user's blocks and tasks
-- in one transaction. That deferral is not a Task-removal operation.
-- It does not decide what a future Task removal would do. A committed delete of a
-- cited Task fails, and the Block row is left as it was.

alter table public.blocks
  add column task_id uuid;

comment on column public.blocks.task_id is
  'Optional identity of the Task this Block was explicitly chosen for. Null when none. Not Block purpose. Not Task start, end, or duration.';

alter table public.blocks
  add constraint blocks_task_same_owner
  foreign key (task_id, user_id)
  references public.tasks (id, user_id)
  match simple
  on delete no action
  deferrable initially deferred;

comment on constraint blocks_task_same_owner on public.blocks is
  'Same-owner Task. Not unique, so many Blocks may refer to one Task. Does not cascade. Does not set null. Does not decide Task removal.';
