-- V0-006: Protected Time the user has made unavailable for allocation.
-- Not a Work shift, not a Task, not a Block, and not a Commitment.
-- An all-day row is one civil date. It is not stored as 00:00–23:59.
-- A timed row stores local start and end on starts_on.
-- If end_local is earlier than or equal to start_local, the interval continues into the next civil date.
-- The confirmed IANA zone lives on temporal_settings. It is not copied onto each row.

create table public.protected_time (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_on date not null,
  kind text not null,
  start_local time,
  end_local time,
  label text,
  created_at timestamptz not null default now(),
  constraint protected_time_kind_known check (kind in ('all_day', 'timed')),
  constraint protected_time_label_shape check (
    label is null
    or (char_length(btrim(label)) > 0 and char_length(label) <= 80)
  ),
  constraint protected_time_shape check (
    (
      kind = 'all_day'
      and start_local is null
      and end_local is null
    )
    or (
      kind = 'timed'
      and start_local is not null
      and end_local is not null
    )
  )
);

comment on table public.protected_time is
  'Time the user deliberately made unavailable for allocation. Not occupied time, not a Work Off day, and not a Task.';
comment on column public.protected_time.starts_on is
  'Civil date the protected interval starts. Not an instant.';
comment on column public.protected_time.kind is
  'all_day or timed. all_day covers that civil date. timed uses start_local and end_local.';
comment on column public.protected_time.start_local is
  'Local time of day the timed interval starts. Null when the row is all day.';
comment on column public.protected_time.end_local is
  'Local time of day the timed interval ends. Null when the row is all day. If end_local is earlier than or equal to start_local, the interval continues into the next civil date.';
comment on column public.protected_time.label is
  'Optional user-authored label. Not a category and not a Context.';

create index protected_time_user_starts_on_idx
  on public.protected_time (user_id, starts_on);

alter table public.protected_time enable row level security;

revoke all on table public.protected_time from public, anon;
grant select, insert, update, delete on table public.protected_time to authenticated;

create policy protected_time_select_own
  on public.protected_time
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy protected_time_insert_own
  on public.protected_time
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy protected_time_update_own
  on public.protected_time
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy protected_time_delete_own
  on public.protected_time
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
