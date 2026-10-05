-- DIRECTION-REP-001: a Destination and a Priority the human explicitly established.
-- A Destination is where the human is deliberately trying to take some part of life.
-- A Priority is sustained attention downstream of one established Destination.
-- user_id is ownership for row level security. It is not part of either fact.
-- established_at is the instant of that explicit act. It is not insertion time,
-- not a civil day, not a deadline, and not a temporal interval.
-- content is the human's words. There is no title, description, metric, or status.
-- There is no created_at, Context, rank, score, or lifecycle column.
-- Unique (id, user_id) is the same-owner target a later fact could use.
-- This migration does not add a reference from Task, Block, Commitment,
-- Protected Time, Note, or any other execution fact.
-- Whether one Priority may name more than one Destination is not decided.
-- This table records the one Destination named when the Priority was established.

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  established_at timestamptz not null,
  constraint destinations_content_not_blank check (char_length(btrim(content)) > 0),
  constraint destinations_id_user_key unique (id, user_id)
);

comment on table public.destinations is
  'Where the human is deliberately trying to take some part of life or reality. Not a Task, Block, Priority, Context, Deadline, Target, or Objective.';
comment on column public.destinations.content is
  'The human''s words for this Destination. Required. Non-blank after trim. Not rewritten.';
comment on column public.destinations.established_at is
  'Instant the human established this Destination. Supplied at that act. Not a deadline and not row-insert time.';
comment on constraint destinations_id_user_key on public.destinations is
  'Same-owner identity. This migration does not add an execution reference.';

create index destinations_user_established_at_idx
  on public.destinations (user_id, established_at, id);

alter table public.destinations enable row level security;

-- Default privileges grant authenticated every table privilege at creation.
-- Revoke that set, then grant only select and insert.
-- Editing and removal are unresolved, so update and delete are not granted.
revoke all on table public.destinations from public;
revoke all on table public.destinations from anon;
revoke all on table public.destinations from authenticated;

grant select, insert on table public.destinations to authenticated;

create policy destinations_select_own
  on public.destinations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy destinations_insert_own
  on public.destinations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  destination_id uuid not null,
  content text not null,
  established_at timestamptz not null,
  constraint priorities_content_not_blank check (char_length(btrim(content)) > 0),
  constraint priorities_id_user_key unique (id, user_id),
  constraint priorities_destination_same_owner
    foreign key (destination_id, user_id)
    references public.destinations (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred
);

comment on table public.priorities is
  'Sustained attention the human established downstream of one Destination. Not a score, rank, Must Do, Due, or Task.';
comment on column public.priorities.destination_id is
  'The Destination this Priority was explicitly established downstream of. Required. Not Context. Not an execution fact.';
comment on column public.priorities.content is
  'The human''s words for this Priority. Required. Non-blank after trim. Not rewritten.';
comment on column public.priorities.established_at is
  'Instant the human established this Priority. Supplied at that act. Not a deadline and not row-insert time.';
comment on constraint priorities_destination_same_owner on public.priorities is
  'Same-owner Destination. Not unique, so nothing here says a Destination has only one Priority. Does not cascade. Does not set null. Does not decide Destination removal. A committed delete of a cited Destination fails, and the Priority row is left as it was. The check is deferred so account removal can delete that user''s rows in one transaction. That deferral is not a Destination-deletion operation.';

create index priorities_user_established_at_idx
  on public.priorities (user_id, established_at, id);

alter table public.priorities enable row level security;

revoke all on table public.priorities from public;
revoke all on table public.priorities from anon;
revoke all on table public.priorities from authenticated;

grant select, insert on table public.priorities to authenticated;

create policy priorities_select_own
  on public.priorities
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy priorities_insert_own
  on public.priorities
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
