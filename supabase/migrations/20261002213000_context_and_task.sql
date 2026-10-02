-- DATA-001: durable Context and Task truth.
-- Canonical schema history for this product. Dashboard edits are not a second source.

create table public.contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint contexts_name_not_blank check (char_length(btrim(name)) > 0),
  constraint contexts_user_name_key unique (user_id, name),
  constraint contexts_id_user_key unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  context_id uuid,
  title text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  due_on date,
  planned_on date,
  must_do boolean not null default false,
  origin text not null default 'user_created',
  constraint tasks_title_not_blank check (char_length(btrim(title)) > 0),
  constraint tasks_origin_known check (origin = 'user_created'),
  constraint tasks_context_same_owner
    foreign key (context_id, user_id)
    references public.contexts (id, user_id)
    on delete set null (context_id)
);

create index tasks_user_id_idx on public.tasks (user_id);

comment on column public.tasks.due_on is
  'Civil date when completion is required. Independent of planned_on. Not an instant.';
comment on column public.tasks.planned_on is
  'Civil date when the user intends to work on the task. Independent of due_on.';
comment on column public.tasks.completed_at is
  'Null while the task is open. When set, the instant the task was completed.';
comment on column public.tasks.must_do is
  'User-set flag. Not a priority score, task state, or separate bucket.';
comment on column public.tasks.origin is
  'How the task was created. V0 permits only user_created.';

alter table public.contexts enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.contexts from public, anon;
revoke all on table public.tasks from public, anon;
grant select, insert, update, delete on table public.contexts to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy contexts_select_own
  on public.contexts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy contexts_insert_own
  on public.contexts
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy contexts_update_own
  on public.contexts
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy contexts_delete_own
  on public.contexts
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_select_own
  on public.tasks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_insert_own
  on public.tasks
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update_own
  on public.tasks
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete_own
  on public.tasks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Per-user canonical Contexts. Not global rows. Not callable by clients.
create function public.seed_canonical_contexts(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contexts (user_id, name)
  select target_user, canonical.name
  from (
    values
      ('Work'::text),
      ('Family'),
      ('TeamLab'),
      ('Financial')
  ) as canonical (name)
  on conflict (user_id, name) do nothing;
end;
$$;

create function public.seed_contexts_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_canonical_contexts(new.id);
  return new;
end;
$$;

revoke all on function public.seed_canonical_contexts(uuid) from public, anon, authenticated;
revoke all on function public.seed_contexts_for_new_user() from public, anon, authenticated;

create trigger seed_contexts_after_user_insert
  after insert on auth.users
  for each row
  execute function public.seed_contexts_for_new_user();

select public.seed_canonical_contexts(id)
from auth.users;
