-- ORIENT-FLOOR-COMMAND-003
-- Durable Floor Command observation. Not a Commitment, Block, Protected Time,
-- Task, Stewardship satisfaction, Active Thread, or Pulse grant.
-- Service-role functions write operational rows. The operator may select them
-- and dismiss one revision. Dismissal does not change handoff status.
-- No Floor Command credential is stored here.

-- ---------------------------------------------------------------------------
-- Binding: one Orient operator, one Floor Command store.
-- The store is server-owned. A snapshot store number is not authorization.
-- ---------------------------------------------------------------------------

create table public.floor_command_observation_bindings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store_number text not null,
  created_at timestamptz not null default now(),
  constraint floor_command_observation_bindings_store_shape check (
    store_number ~ '^[1-9][0-9]*$'
  )
);

comment on table public.floor_command_observation_bindings is
  'Server-owned Floor Command store for one Orient operator. Not a credential and not a personal temporal record.';
comment on column public.floor_command_observation_bindings.store_number is
  'Digit identity without leading zeros. Client-supplied store numbers do not authorize a read.';

alter table public.floor_command_observation_bindings enable row level security;
revoke all on table public.floor_command_observation_bindings from public, anon;
grant select on table public.floor_command_observation_bindings to authenticated;

create policy floor_command_observation_bindings_select_own
  on public.floor_command_observation_bindings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- One retained snapshot per operator and Floor Command handoff id.
-- Freshness is not stored. A failed attempt leaves these rows in place.
-- ---------------------------------------------------------------------------

create table public.floor_command_observation_handoffs (
  user_id uuid not null references auth.users (id) on delete cascade,
  handoff_id text not null,
  store_number text not null,
  operational_week text not null,
  week_starting date not null,
  week_ending date not null,
  source_revision text not null,
  source_updated_at timestamptz,
  last_successful_observed_at timestamptz not null,
  deadlines_availability text not null,
  snapshot jsonb not null,
  superseded_assignments jsonb not null,
  retained_deadlines jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, handoff_id),
  constraint floor_command_observation_handoffs_store_shape check (
    store_number ~ '^[1-9][0-9]*$'
  ),
  constraint floor_command_observation_handoffs_week_shape check (
    operational_week ~ '^[0-9]{4}-W[0-9]{2}$'
  ),
  constraint floor_command_observation_handoffs_week_order check (
    week_ending > week_starting
  ),
  constraint floor_command_observation_handoffs_revision_shape check (
    char_length(btrim(source_revision)) > 0
    and char_length(source_revision) <= 128
  ),
  constraint floor_command_observation_handoffs_id_shape check (
    char_length(btrim(handoff_id)) > 0
    and char_length(handoff_id) <= 200
  ),
  constraint floor_command_observation_handoffs_deadlines_known check (
    deadlines_availability in ('ready', 'unavailable')
  ),
  constraint floor_command_observation_handoffs_json_arrays check (
    jsonb_typeof(snapshot) = 'object'
    and jsonb_typeof(superseded_assignments) = 'array'
    and jsonb_typeof(retained_deadlines) = 'array'
  )
);

comment on table public.floor_command_observation_handoffs is
  'Last retained Floor Command handoff snapshot. ISO operational week. Not Orient Work-week time and not Zebra completion history.';
comment on column public.floor_command_observation_handoffs.operational_week is
  'Floor Command ISO week, such as 2026-W44. Not a Saturday-first fiscal week.';
comment on column public.floor_command_observation_handoffs.source_updated_at is
  'Producer source time when the snapshot has one. Null does not mean newer.';
comment on column public.floor_command_observation_handoffs.superseded_assignments is
  'Bays removed from the current snapshot. Removal is not completion.';

create index floor_command_observation_handoffs_user_week_idx
  on public.floor_command_observation_handoffs (user_id, operational_week);

alter table public.floor_command_observation_handoffs enable row level security;
revoke all on table public.floor_command_observation_handoffs from public, anon;
grant select on table public.floor_command_observation_handoffs to authenticated;

create policy floor_command_observation_handoffs_select_own
  on public.floor_command_observation_handoffs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Latest attempt for the operator. Failure does not delete handoffs.
-- ---------------------------------------------------------------------------

create table public.floor_command_observation_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_attempted_at timestamptz not null,
  last_attempt_result text not null,
  last_attempt_reason text,
  last_successful_observed_at timestamptz,
  constraint floor_command_observation_attempts_result_known check (
    last_attempt_result in ('success_complete', 'failure')
  ),
  constraint floor_command_observation_attempts_reason_known check (
    last_attempt_reason is null
    or last_attempt_reason in (
      'assignments_unavailable',
      'invalid_week',
      'store_required',
      'cross_store',
      'invalid_snapshot'
    )
  ),
  constraint floor_command_observation_attempts_reason_matches_result check (
    (
      last_attempt_result = 'success_complete'
      and last_attempt_reason is null
      and last_successful_observed_at is not null
    )
    or (
      last_attempt_result = 'failure'
      and last_attempt_reason is not null
    )
  )
);

comment on table public.floor_command_observation_attempts is
  'Latest Floor Command read attempt. success_complete means the read succeeded. It does not mean the handoff status is complete. Stale and unavailable are derived, not stored.';

alter table public.floor_command_observation_attempts enable row level security;
revoke all on table public.floor_command_observation_attempts from public, anon;
grant select on table public.floor_command_observation_attempts to authenticated;

create policy floor_command_observation_attempts_select_own
  on public.floor_command_observation_attempts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Operator dismissal of one revision. No status column.
-- ---------------------------------------------------------------------------

create table public.floor_command_observation_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  handoff_id text not null,
  source_revision text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, handoff_id, source_revision),
  constraint floor_command_observation_dismissals_id_shape check (
    char_length(btrim(handoff_id)) > 0
    and char_length(handoff_id) <= 200
  ),
  constraint floor_command_observation_dismissals_revision_shape check (
    char_length(btrim(source_revision)) > 0
    and char_length(source_revision) <= 128
  )
);

comment on table public.floor_command_observation_dismissals is
  'Hides one Floor Command revision for one operator. Not Zebra completion and not a personal temporal record.';

alter table public.floor_command_observation_dismissals enable row level security;
revoke all on table public.floor_command_observation_dismissals from public, anon;
grant select on table public.floor_command_observation_dismissals to authenticated;

create policy floor_command_observation_dismissals_select_own
  on public.floor_command_observation_dismissals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.floor_command_store_identity(p_store text)
returns text
language sql
immutable
as $$
  select nullif(ltrim(regexp_replace(coalesce(p_store, ''), '[^0-9]', '', 'g'), '0'), '');
$$;

revoke all on function public.floor_command_store_identity(text) from public, anon, authenticated;

create or replace function public.floor_command_observation_json_forbidden(p_payload jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(p_payload, 'null'::jsonb)::text
    ~* '"(access_token|refresh_token|client_secret|service_role|password)"\s*:|(zebra_task_completed"\s*:\s*true)';
$$;

revoke all on function public.floor_command_observation_json_forbidden(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Bind. Explicit server call. Not automatic source registration.
-- ---------------------------------------------------------------------------

create or replace function public.bind_floor_command_observation(
  p_user_id uuid,
  p_store_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text := public.floor_command_store_identity(p_store_number);
begin
  if p_user_id is null or v_store is null then
    raise exception 'floor_command_observation_store_required';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'floor_command_observation_user_required';
  end if;
  if exists (
    select 1 from public.floor_command_observation_bindings where user_id = p_user_id
  ) then
    raise exception 'floor_command_observation_already_bound';
  end if;
  insert into public.floor_command_observation_bindings (user_id, store_number)
  values (p_user_id, v_store);
end;
$$;

comment on function public.bind_floor_command_observation(uuid, text) is
  'Binds one Orient operator to one normalized Floor Command store. Does not store a credential or open a read route.';

revoke all on function public.bind_floor_command_observation(uuid, text) from public, anon, authenticated;
grant execute on function public.bind_floor_command_observation(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Persist one attempt and, on success, the retained handoffs.
-- Ordering matches the projection: same revision may replay; a different
-- revision applies only when both source times exist and the incoming time
-- is the same or later. A missing time does not become a newer revision.
-- ---------------------------------------------------------------------------

create or replace function public.persist_floor_command_observation(
  p_user_id uuid,
  p_attempted_at timestamptz,
  p_attempt_result text,
  p_attempt_reason text,
  p_handoffs jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_row jsonb;
  v_handoff_id text;
  v_revision text;
  v_source_updated timestamptz;
  v_existing_revision text;
  v_existing_updated timestamptz;
  v_snapshot jsonb;
begin
  if p_user_id is null or p_attempted_at is null then
    raise exception 'floor_command_observation_attempt_required';
  end if;
  if p_attempt_result not in ('success_complete', 'failure') then
    raise exception 'floor_command_observation_attempt_result_unknown';
  end if;

  select store_number into v_store
  from public.floor_command_observation_bindings
  where user_id = p_user_id;

  if v_store is null then
    raise exception 'floor_command_observation_store_required';
  end if;

  if p_attempt_result = 'failure' then
    if p_attempt_reason is null
       or p_attempt_reason not in (
         'assignments_unavailable',
         'invalid_week',
         'store_required',
         'cross_store',
         'invalid_snapshot'
       ) then
      raise exception 'floor_command_observation_failure_reason_required';
    end if;

    insert into public.floor_command_observation_attempts (
      user_id,
      last_attempted_at,
      last_attempt_result,
      last_attempt_reason,
      last_successful_observed_at
    ) values (
      p_user_id,
      p_attempted_at,
      'failure',
      p_attempt_reason,
      null
    )
    on conflict (user_id) do update
    set
      last_attempted_at = excluded.last_attempted_at,
      last_attempt_result = 'failure',
      last_attempt_reason = excluded.last_attempt_reason;
    return;
  end if;

  if p_attempt_reason is not null then
    raise exception 'floor_command_observation_success_reason_forbidden';
  end if;
  if p_handoffs is null or jsonb_typeof(p_handoffs) <> 'array' then
    raise exception 'floor_command_observation_handoffs_required';
  end if;
  if public.floor_command_observation_json_forbidden(p_handoffs) then
    raise exception 'floor_command_observation_credential_forbidden';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_handoffs) incoming
    where public.floor_command_store_identity(incoming -> 'snapshot' ->> 'store_number') is distinct from v_store
  ) then
    raise exception 'floor_command_observation_cross_store';
  end if;

  if exists (
    select 1
    from public.floor_command_observation_handoffs existing
    where existing.user_id = p_user_id
      and not exists (
        select 1
        from jsonb_array_elements(p_handoffs) incoming
        where incoming ->> 'handoff_id' = existing.handoff_id
      )
  ) then
    raise exception 'floor_command_observation_incomplete_retention';
  end if;

  for v_row in
    select value from jsonb_array_elements(p_handoffs)
  loop
    v_handoff_id := btrim(v_row ->> 'handoff_id');
    v_revision := btrim(v_row ->> 'source_revision');
    v_snapshot := v_row -> 'snapshot';
    v_source_updated := nullif(v_row ->> 'source_updated_at', '')::timestamptz;

    if v_handoff_id is null or v_revision is null or v_snapshot is null then
      raise exception 'floor_command_observation_handoff_incomplete';
    end if;
    if public.floor_command_store_identity(v_snapshot ->> 'store_number') is distinct from v_store then
      raise exception 'floor_command_observation_cross_store';
    end if;
    if coalesce(v_snapshot ->> 'source', '') <> 'deptsync.floor-command.orient.v1' then
      raise exception 'floor_command_observation_source_unknown';
    end if;
    if coalesce(v_snapshot -> 'handoff' ->> 'id', '') <> v_handoff_id
       or coalesce(v_snapshot ->> 'operational_week', '') <> coalesce(v_row ->> 'operational_week', '')
       or coalesce(v_snapshot -> 'freshness' ->> 'revision', '') <> v_revision
       or nullif(v_snapshot -> 'freshness' ->> 'source_updated_at', '')::timestamptz
          is distinct from v_source_updated then
      raise exception 'floor_command_observation_snapshot_identity_mismatch';
    end if;
    if coalesce(v_row ->> 'operational_week', '') !~ '^[0-9]{4}-W[0-9]{2}$' then
      raise exception 'floor_command_observation_week_invalid';
    end if;

    select source_revision, source_updated_at
    into v_existing_revision, v_existing_updated
    from public.floor_command_observation_handoffs
    where user_id = p_user_id
      and handoff_id = v_handoff_id;

    if found and v_existing_revision is distinct from v_revision then
      if v_existing_updated is null or v_source_updated is null then
        raise exception 'floor_command_observation_revision_unordered';
      end if;
      if v_source_updated < v_existing_updated then
        raise exception 'floor_command_observation_revision_older';
      end if;
    end if;

    insert into public.floor_command_observation_handoffs (
      user_id,
      handoff_id,
      store_number,
      operational_week,
      week_starting,
      week_ending,
      source_revision,
      source_updated_at,
      last_successful_observed_at,
      deadlines_availability,
      snapshot,
      superseded_assignments,
      retained_deadlines,
      updated_at
    ) values (
      p_user_id,
      v_handoff_id,
      v_store,
      v_row ->> 'operational_week',
      (v_row ->> 'week_starting')::date,
      (v_row ->> 'week_ending')::date,
      v_revision,
      v_source_updated,
      coalesce(nullif(v_snapshot -> 'freshness' ->> 'read_at', '')::timestamptz, p_attempted_at),
      v_row ->> 'deadlines_availability',
      v_snapshot,
      coalesce(v_row -> 'superseded_assignments', '[]'::jsonb),
      coalesce(v_row -> 'retained_deadlines', '[]'::jsonb),
      p_attempted_at
    )
    on conflict (user_id, handoff_id) do update
    set
      store_number = excluded.store_number,
      operational_week = excluded.operational_week,
      week_starting = excluded.week_starting,
      week_ending = excluded.week_ending,
      source_revision = excluded.source_revision,
      source_updated_at = excluded.source_updated_at,
      last_successful_observed_at = excluded.last_successful_observed_at,
      deadlines_availability = excluded.deadlines_availability,
      snapshot = excluded.snapshot,
      superseded_assignments = excluded.superseded_assignments,
      retained_deadlines = excluded.retained_deadlines,
      updated_at = excluded.updated_at;
  end loop;

  insert into public.floor_command_observation_attempts (
    user_id,
    last_attempted_at,
    last_attempt_result,
    last_attempt_reason,
    last_successful_observed_at
  ) values (
    p_user_id,
    p_attempted_at,
    'success_complete',
    null,
    p_attempted_at
  )
  on conflict (user_id) do update
  set
    last_attempted_at = excluded.last_attempted_at,
    last_attempt_result = 'success_complete',
    last_attempt_reason = null,
    last_successful_observed_at = greatest(
      public.floor_command_observation_attempts.last_successful_observed_at,
      excluded.last_successful_observed_at
    );
end;
$$;

comment on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb) is
  'Persists a Floor Command observation attempt. Failure does not delete retained handoffs. Older or unordered revisions do not replace a retained snapshot.';

revoke all on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Dismissal uses the signed-in operator. It does not write a handoff.
-- ---------------------------------------------------------------------------

create or replace function public.dismiss_floor_command_observation_revision(
  p_handoff_id text,
  p_source_revision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_handoff text := btrim(coalesce(p_handoff_id, ''));
  v_revision text := btrim(coalesce(p_source_revision, ''));
begin
  if v_user is null then
    raise exception 'floor_command_observation_authentication_required';
  end if;
  if v_handoff = '' or v_revision = '' then
    raise exception 'floor_command_observation_dismissal_incomplete';
  end if;
  insert into public.floor_command_observation_dismissals (
    user_id,
    handoff_id,
    source_revision
  ) values (
    v_user,
    v_handoff,
    v_revision
  )
  on conflict (user_id, handoff_id, source_revision) do nothing;
end;
$$;

comment on function public.dismiss_floor_command_observation_revision(text, text) is
  'Records the signed-in operator''s dismissal of one Floor Command revision. Does not change handoff status.';

revoke all on function public.dismiss_floor_command_observation_revision(text, text)
  from public, anon;
grant execute on function public.dismiss_floor_command_observation_revision(text, text)
  to authenticated;

grant select on table public.floor_command_observation_bindings to service_role;
grant select on table public.floor_command_observation_handoffs to service_role;
grant select on table public.floor_command_observation_attempts to service_role;
grant select on table public.floor_command_observation_dismissals to service_role;
revoke insert, update, delete on table public.floor_command_observation_bindings from service_role;
revoke insert, update, delete on table public.floor_command_observation_handoffs from service_role;
revoke insert, update, delete on table public.floor_command_observation_attempts from service_role;
revoke insert, update, delete on table public.floor_command_observation_dismissals from service_role;
