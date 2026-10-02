-- V0-002: one current Active Thread per user.
-- Resume is not a table. It is a projection over this row and an open Task.

alter table public.tasks
  add constraint tasks_id_user_key unique (id, user_id);

create table public.active_threads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  task_id uuid not null,
  established_at timestamptz not null,
  constraint active_threads_task_same_owner
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade
);

comment on table public.active_threads is
  'The user''s one current thread of intention. Absence of a row means there is no Active Thread.';
comment on column public.active_threads.task_id is
  'An open Task owned by the same user. Not inferred. Not a second task state.';
comment on column public.active_threads.established_at is
  'Instant the user explicitly established this thread. Not a timer and not a duration.';

alter table public.active_threads enable row level security;

revoke all on table public.active_threads from public, anon;
grant select, insert, update, delete on table public.active_threads to authenticated;

create policy active_threads_select_own
  on public.active_threads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy active_threads_insert_own
  on public.active_threads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy active_threads_update_own
  on public.active_threads
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy active_threads_delete_own
  on public.active_threads
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Reject a thread that points at a completed Task. The composite foreign key
-- already rejects a Task owned by someone else.
create function public.active_thread_requires_open_task()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  task_completed timestamptz;
begin
  select completed_at
    into task_completed
  from public.tasks
  where id = new.task_id
    and user_id = new.user_id;

  if not found then
    raise exception 'An active thread can only reference a task owned by the same user.';
  end if;

  if task_completed is not null then
    raise exception 'An active thread can only reference an open task.';
  end if;

  return new;
end;
$$;

create trigger active_threads_require_open_task
  before insert or update of task_id on public.active_threads
  for each row
  execute function public.active_thread_requires_open_task();

-- Completing the referenced Task clears the thread in the same transaction.
-- The Task row stays, with its completion instant.
create function public.clear_active_thread_on_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.active_threads
  where user_id = new.user_id
    and task_id = new.id;

  return new;
end;
$$;

create trigger tasks_clear_active_thread_on_completion
  after update of completed_at on public.tasks
  for each row
  when (old.completed_at is null and new.completed_at is not null)
  execute function public.clear_active_thread_on_completion();

revoke all on function public.active_thread_requires_open_task() from public, anon;
revoke all on function public.clear_active_thread_on_completion() from public, anon;
grant execute on function public.active_thread_requires_open_task() to authenticated;
grant execute on function public.clear_active_thread_on_completion() to authenticated;
