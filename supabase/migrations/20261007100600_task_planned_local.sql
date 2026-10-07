-- TASK-CLOCK-POINT-001: optional local clock-point intention on a Task.
-- Associated with planned_on. Not duration, due time, Block territory, or a UTC instant.

alter table public.tasks
  add column planned_local time;

comment on column public.tasks.planned_local is
  'Optional local clock when the user intends to do or start the task on planned_on. Null when unset. Requires planned_on. Not an interval, due time, reminder, or UTC instant.';

alter table public.tasks
  add constraint tasks_planned_local_needs_planned_on
  check (planned_local is null or planned_on is not null);
