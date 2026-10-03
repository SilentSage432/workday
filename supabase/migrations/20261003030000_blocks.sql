-- V0-007: a Block is time the user has chosen a purpose for.
-- It is not Protected Time, not a Task, and not a Work shift.
-- An all-day row is one civil date. It is not stored as 00:00–23:59.
-- A timed row stores local start and end on starts_on.
-- If end_local is earlier than or equal to start_local, the interval continues into the next civil date.
-- The confirmed IANA zone lives on temporal_settings. It is not copied onto each row.
-- context_id is optional. Purpose is not derived from Context.

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_on date not null,
  kind text not null,
  start_local time,
  end_local time,
  context_id uuid,
  purpose text not null,
  created_at timestamptz not null default now(),
  constraint blocks_kind_known check (kind in ('all_day', 'timed')),
  constraint blocks_purpose_shape check (
    char_length(btrim(purpose)) > 0
    and char_length(purpose) <= 80
  ),
  constraint blocks_shape check (
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
  ),
  constraint blocks_context_same_owner
    foreign key (context_id, user_id)
    references public.contexts (id, user_id)
    on delete set null (context_id)
);

comment on table public.blocks is
  'Time the user deliberately chose a purpose for. Not Protected Time, not a Task, and not a Commitment.';
comment on column public.blocks.starts_on is
  'Civil date the block starts. Not an instant.';
comment on column public.blocks.kind is
  'all_day or timed. all_day covers that civil date. timed uses start_local and end_local.';
comment on column public.blocks.start_local is
  'Local time of day the timed block starts. Null when the row is all day.';
comment on column public.blocks.end_local is
  'Local time of day the timed block ends. Null when the row is all day. If end_local is earlier than or equal to start_local, the block continues into the next civil date.';
comment on column public.blocks.context_id is
  'Optional Context this block belongs to. Null is valid. Purpose is not copied from the Context name.';
comment on column public.blocks.purpose is
  'User-authored purpose. Required. Not a category and not a priority.';

create index blocks_user_starts_on_idx on public.blocks (user_id, starts_on);

alter table public.blocks enable row level security;

revoke all on table public.blocks from public, anon;
grant select, insert, update, delete on table public.blocks to authenticated;

create policy blocks_select_own
  on public.blocks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy blocks_insert_own
  on public.blocks
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy blocks_update_own
  on public.blocks
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy blocks_delete_own
  on public.blocks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
