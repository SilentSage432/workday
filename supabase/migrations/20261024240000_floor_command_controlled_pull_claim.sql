-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004A
-- Database claim for one controlled Floor Command pull.
-- Not applied to hosted Orient by this tranche.
--
-- Guarantee: at most one successful controlled observation is committed
-- for the authorized one-shot operation. This is not exactly-once HTTP delivery.
--
-- The claim does not copy store, source, or purpose. The approved binding
-- remains the authority for those facts. A second copy could drift.

create table public.floor_command_controlled_pull_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  claim uuid not null,
  claimed_at timestamptz not null,
  constraint floor_command_controlled_pull_claims_claim_key unique (claim)
);

comment on table public.floor_command_controlled_pull_claims is
  'One in-flight controlled pull for an Orient operator. Presence is a lease, not a successful observation. Store, source, and purpose stay on the binding.';

comment on column public.floor_command_controlled_pull_claims.claim is
  'Caller-generated claim identity. A replacement uses a new identity after the lease expires.';

comment on column public.floor_command_controlled_pull_claims.claimed_at is
  'Database time when this claim identity was acquired. Lease checks use now(), not application time.';

alter table public.floor_command_controlled_pull_claims enable row level security;

revoke all on table public.floor_command_controlled_pull_claims from public, anon, authenticated;
grant select on table public.floor_command_controlled_pull_claims to service_role;
revoke insert, update, delete on table public.floor_command_controlled_pull_claims from service_role;

create function public.floor_command_controlled_pull_lease()
returns interval
language sql
immutable
as $$
  select interval '15 seconds';
$$;

comment on function public.floor_command_controlled_pull_lease() is
  'How long a controlled pull claim remains valid. The pull timeout is shorter than this lease.';

revoke all on function public.floor_command_controlled_pull_lease() from public, anon, authenticated, service_role;

create function public.claim_floor_command_controlled_pull(
  p_user_id uuid,
  p_claim uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_source text;
  v_purpose text;
  v_result text;
  v_existing uuid;
  v_claimed_at timestamptz;
begin
  if p_user_id is null or p_claim is null then
    raise exception 'floor_command_controlled_pull_claim_required';
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is null
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    return 'unbound';
  end if;

  perform 1
  from public.floor_command_observation_attempts
  where user_id = p_user_id
  for update;

  select last_attempt_result
  into v_result
  from public.floor_command_observation_attempts
  where user_id = p_user_id;

  if v_result = 'success_complete' then
    return 'already_succeeded';
  end if;

  select claim, claimed_at
  into v_existing, v_claimed_at
  from public.floor_command_controlled_pull_claims
  where user_id = p_user_id
  for update;

  if found
     and v_existing = p_claim
     and v_claimed_at > now() - public.floor_command_controlled_pull_lease() then
    return 'claimed';
  end if;

  if found
     and v_existing is distinct from p_claim
     and v_claimed_at > now() - public.floor_command_controlled_pull_lease() then
    return 'busy';
  end if;

  begin
    insert into public.floor_command_controlled_pull_claims (user_id, claim, claimed_at)
    values (p_user_id, p_claim, now())
    on conflict (user_id) do update
    set claim = excluded.claim,
        claimed_at = excluded.claimed_at;
  exception
    when unique_violation then
      raise exception 'floor_command_controlled_pull_claim_mismatch';
  end;

  return 'claimed';
end;
$$;

comment on function public.claim_floor_command_controlled_pull(uuid, uuid) is
  'Serialize one controlled pull. Returns claimed, busy, already_succeeded, or unbound. Same claim within the lease does not extend it. A different claim replaces the row only after expiry. Database now() decides expiry.';

revoke all on function public.claim_floor_command_controlled_pull(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_floor_command_controlled_pull(uuid, uuid) to service_role;

create function public.release_floor_command_controlled_pull(
  p_user_id uuid,
  p_claim uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_source text;
  v_purpose text;
  v_result text;
  v_existing uuid;
begin
  if p_user_id is null or p_claim is null then
    raise exception 'floor_command_controlled_pull_claim_required';
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is null
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    raise exception 'floor_command_observation_approval_required';
  end if;

  perform 1
  from public.floor_command_observation_attempts
  where user_id = p_user_id
  for update;

  select last_attempt_result
  into v_result
  from public.floor_command_observation_attempts
  where user_id = p_user_id;

  if v_result = 'success_complete' then
    raise exception 'floor_command_controlled_pull_already_succeeded';
  end if;

  select claim
  into v_existing
  from public.floor_command_controlled_pull_claims
  where user_id = p_user_id
  for update;

  if not found or v_existing is distinct from p_claim then
    raise exception 'floor_command_controlled_pull_claim_mismatch';
  end if;

  delete from public.floor_command_controlled_pull_claims
  where user_id = p_user_id
    and claim = p_claim;
end;
$$;

comment on function public.release_floor_command_controlled_pull(uuid, uuid) is
  'The current claim owner releases an unsuccessful pull. A stale identity cannot release a replacement. Release does not delete a handoff or a committed success.';

revoke all on function public.release_floor_command_controlled_pull(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_floor_command_controlled_pull(uuid, uuid) to service_role;

create function public.persist_floor_command_observation(
  p_user_id uuid,
  p_attempted_at timestamptz,
  p_attempt_result text,
  p_attempt_reason text,
  p_handoffs jsonb,
  p_claim uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_source text;
  v_purpose text;
  v_claim uuid;
  v_claimed_at timestamptz;
  v_previous text;
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
  if p_claim is null then
    raise exception 'floor_command_controlled_pull_claim_required';
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is null
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    raise exception 'floor_command_observation_approval_required';
  end if;

  perform 1
  from public.floor_command_observation_attempts
  where user_id = p_user_id
  for update;

  select last_attempt_result
  into v_previous
  from public.floor_command_observation_attempts
  where user_id = p_user_id;

  if v_previous = 'success_complete' then
    raise exception 'floor_command_controlled_pull_already_succeeded';
  end if;

  select claim, claimed_at
  into v_claim, v_claimed_at
  from public.floor_command_controlled_pull_claims
  where user_id = p_user_id
  for update;

  if not found or v_claim is distinct from p_claim then
    raise exception 'floor_command_controlled_pull_claim_mismatch';
  end if;

  if v_claimed_at <= now() - public.floor_command_controlled_pull_lease() then
    raise exception 'floor_command_controlled_pull_claim_expired';
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
         'sequence_conflict',
         'credential_rejected',
         'source_unavailable',
         'forbidden'
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

  delete from public.floor_command_controlled_pull_claims
  where user_id = p_user_id
    and claim = p_claim;
end;
$$;

comment on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb, uuid) is
  'Commit a controlled observation only for the current unexpired claim of the bound operator, and only when no controlled success is already committed. Sequence, revision, store, and snapshot checks still apply. Failure keeps retained handoffs and does not clear last_successful_observed_at. Failure cannot rewrite success_complete. Success deletes the claim in the same transaction.';

revoke all on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb, uuid)
  to service_role;

drop function public.persist_floor_command_observation(uuid, timestamptz, text, text, jsonb);
