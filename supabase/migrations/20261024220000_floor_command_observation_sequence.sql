-- FLOOR-COMMAND-ORIENT-002A consumer ordering.
-- When a snapshot carries week_sequence, that integer is the order.
-- Source timestamps remain only for snapshots that have no sequence.
-- Not applied to production by this tranche.

create or replace function public.floor_command_observation_week_sequence(p_snapshot jsonb)
returns bigint
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_snapshot -> 'freshness' -> 'week_sequence') = 'number'
     and (p_snapshot -> 'freshness' ->> 'week_sequence') ~ '^[0-9]+$'
    then (p_snapshot -> 'freshness' ->> 'week_sequence')::bigint
    else null
  end;
$$;

alter table public.floor_command_observation_attempts
  drop constraint floor_command_observation_attempts_reason_known;

alter table public.floor_command_observation_attempts
  add constraint floor_command_observation_attempts_reason_known check (
    last_attempt_reason is null
    or last_attempt_reason in (
      'assignments_unavailable',
      'invalid_week',
      'store_required',
      'cross_store',
      'invalid_snapshot',
      'ordering_withheld',
      'sequence_conflict'
    )
  );

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
  v_existing_snapshot jsonb;
  v_existing_sequence bigint;
  v_incoming_sequence bigint;
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
         'invalid_snapshot',
         'ordering_withheld',
         'sequence_conflict'
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

    select source_revision, source_updated_at, snapshot
    into v_existing_revision, v_existing_updated, v_existing_snapshot
    from public.floor_command_observation_handoffs
    where user_id = p_user_id
      and handoff_id = v_handoff_id;

    if found and v_existing_revision is distinct from v_revision then
      v_existing_sequence := public.floor_command_observation_week_sequence(v_existing_snapshot);
      v_incoming_sequence := public.floor_command_observation_week_sequence(v_snapshot);
      if v_existing_sequence is not null or v_incoming_sequence is not null then
        if v_existing_sequence is null or v_incoming_sequence is null then
          raise exception 'floor_command_observation_revision_unordered';
        end if;
        if v_incoming_sequence < v_existing_sequence then
          raise exception 'floor_command_observation_revision_older';
        end if;
        if v_incoming_sequence = v_existing_sequence then
          raise exception 'floor_command_observation_sequence_conflict';
        end if;
      else
        if v_existing_updated is null or v_source_updated is null then
          raise exception 'floor_command_observation_revision_unordered';
        end if;
        if v_source_updated < v_existing_updated then
          raise exception 'floor_command_observation_revision_older';
        end if;
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
  'Persists a Floor Command observation. A week_sequence orders sequenced snapshots. Failure does not delete retained handoffs.';
