-- V0-008: a Commitment is time constrained by something the user has committed to.
-- It is not Protected Time, not a Block, not a Task, and not a Work shift.
-- An all-day row is one civil date. It is not stored as 00:00–23:59.
-- A timed row stores local start and end on starts_on.
-- If end_local is earlier than or equal to start_local, the interval continues into the next civil date.
-- The confirmed IANA zone lives on temporal_settings. It is not copied onto each row.
-- origin records where the truth came from. V0-008 permits only user_created.
-- External ids are not stored until an external source exists.

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_on date not null,
  kind text not null,
  start_local time,
  end_local time,
  title text not null,
  origin text not null,
  created_at timestamptz not null default now(),
  constraint commitments_kind_known check (kind in ('all_day', 'timed')),
  constraint commitments_origin_known check (origin = 'user_created'),
  constraint commitments_title_shape check (
    char_length(btrim(title)) > 0
    and char_length(title) <= 80
  ),
  constraint commitments_shape check (
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

comment on table public.commitments is
  'Time constrained by something the user has committed to. Not Protected Time, not a Block, and not a Task.';
comment on column public.commitments.starts_on is
  'Civil date the commitment starts. Not an instant.';
comment on column public.commitments.kind is
  'all_day or timed. all_day covers that civil date. timed uses start_local and end_local.';
comment on column public.commitments.start_local is
  'Local time of day the timed commitment starts. Null when the row is all day.';
comment on column public.commitments.end_local is
  'Local time of day the timed commitment ends. Null when the row is all day. If end_local is earlier than or equal to start_local, the commitment continues into the next civil date.';
comment on column public.commitments.title is
  'User-authored name of the constraint. Required. Not a category.';
comment on column public.commitments.origin is
  'Where this commitment truth came from. V0-008 permits only user_created. Not a kind of commitment.';

create index commitments_user_starts_on_idx on public.commitments (user_id, starts_on);

alter table public.commitments enable row level security;

revoke all on table public.commitments from public, anon;
grant select, insert, update, delete on table public.commitments to authenticated;

create policy commitments_select_own
  on public.commitments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy commitments_insert_own
  on public.commitments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy commitments_update_own
  on public.commitments
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy commitments_delete_own
  on public.commitments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
