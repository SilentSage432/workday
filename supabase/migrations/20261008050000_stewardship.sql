-- RECURRING-STEWARDSHIP-PERSISTENCE-IMPLEMENTATION-001
-- Model B: durable definitions, append-only revisions, satisfaction Facts.
-- Occurrences are derived. No occurrence table is created.
-- Not a Task, MustDo, Active Thread, Note, Cadence step, metric, or employee assignment.

create table public.stewardship_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle_kind text not null,
  context_id uuid,
  established_at timestamptz not null,
  retired_at timestamptz,
  constraint stewardship_definitions_cycle_kind_known check (
    cycle_kind in ('workday', 'lowes_fiscal_week')
  ),
  constraint stewardship_definitions_retired_after_established check (
    retired_at is null or retired_at >= established_at
  ),
  constraint stewardship_definitions_id_user_key unique (id, user_id),
  constraint stewardship_definitions_context_same_owner
    foreign key (context_id, user_id)
    references public.contexts (id, user_id)
    match simple
    on delete set null (context_id)
);

comment on table public.stewardship_definitions is
  'Human-established recurring stewardship responsibility. Durable across cycles. Not a Task. Not an occurrence.';
comment on column public.stewardship_definitions.cycle_kind is
  'Closed V1 set: workday or lowes_fiscal_week. Not arbitrary recurrence.';
comment on column public.stewardship_definitions.context_id is
  'Optional Context. Null is valid. Not inferred from Work.';
comment on column public.stewardship_definitions.established_at is
  'Instant the human established this definition. Supplied at that act.';
comment on column public.stewardship_definitions.retired_at is
  'Instant the human retired this definition. Null while active. Retirement does not satisfy occurrences.';

create index stewardship_definitions_user_established_at_idx
  on public.stewardship_definitions (user_id, established_at, id);

create table public.stewardship_definition_revisions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  effective_at timestamptz not null,
  constraint stewardship_definition_revisions_content_not_blank check (
    char_length(btrim(content)) > 0
  ),
  constraint stewardship_definition_revisions_id_user_key unique (id, user_id),
  constraint stewardship_definition_revisions_definition_same_owner
    foreign key (definition_id, user_id)
    references public.stewardship_definitions (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred
);

comment on table public.stewardship_definition_revisions is
  'Append-only wording for a stewardship definition. Occurrence wording uses the latest revision with effective_at <= cycle_start.';
comment on column public.stewardship_definition_revisions.content is
  'The human''s words for this revision. Required. Non-blank after trim. Not rewritten.';
comment on column public.stewardship_definition_revisions.effective_at is
  'Instant this wording becomes effective for future cycle_start resolution.';

create index stewardship_definition_revisions_definition_effective_at_idx
  on public.stewardship_definition_revisions (user_id, definition_id, effective_at, id);

create table public.stewardship_satisfactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  definition_id uuid not null,
  cycle_kind text not null,
  cycle_key date not null,
  satisfied_at timestamptz not null,
  primary key (user_id, definition_id, cycle_kind, cycle_key),
  constraint stewardship_satisfactions_cycle_kind_known check (
    cycle_kind in ('workday', 'lowes_fiscal_week')
  ),
  constraint stewardship_satisfactions_definition_same_owner
    foreign key (definition_id, user_id)
    references public.stewardship_definitions (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred
);

comment on table public.stewardship_satisfactions is
  'Human-established satisfaction Fact for one derived stewardship occurrence. Not Task completion. Not quality or performance.';
comment on column public.stewardship_satisfactions.cycle_key is
  'Civil date key: Scheduled work_on for workday, or Lowe''s fiscal-week Saturday start.';
comment on column public.stewardship_satisfactions.satisfied_at is
  'Instant the human established sufficient attention for this occurrence. First write wins on duplicate.';

create index stewardship_satisfactions_user_definition_idx
  on public.stewardship_satisfactions (user_id, definition_id, cycle_kind, cycle_key);

alter table public.stewardship_definitions enable row level security;
alter table public.stewardship_definition_revisions enable row level security;
alter table public.stewardship_satisfactions enable row level security;

revoke all on table public.stewardship_definitions from public;
revoke all on table public.stewardship_definitions from anon;
revoke all on table public.stewardship_definitions from authenticated;

revoke all on table public.stewardship_definition_revisions from public;
revoke all on table public.stewardship_definition_revisions from anon;
revoke all on table public.stewardship_definition_revisions from authenticated;

revoke all on table public.stewardship_satisfactions from public;
revoke all on table public.stewardship_satisfactions from anon;
revoke all on table public.stewardship_satisfactions from authenticated;

grant select, insert, update on table public.stewardship_definitions to authenticated;
grant select, insert on table public.stewardship_definition_revisions to authenticated;
grant select, insert, delete on table public.stewardship_satisfactions to authenticated;

create policy stewardship_definitions_select_own
  on public.stewardship_definitions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy stewardship_definitions_insert_own
  on public.stewardship_definitions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy stewardship_definitions_update_own
  on public.stewardship_definitions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy stewardship_definition_revisions_select_own
  on public.stewardship_definition_revisions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy stewardship_definition_revisions_insert_own
  on public.stewardship_definition_revisions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy stewardship_satisfactions_select_own
  on public.stewardship_satisfactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy stewardship_satisfactions_insert_own
  on public.stewardship_satisfactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy stewardship_satisfactions_delete_own
  on public.stewardship_satisfactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
