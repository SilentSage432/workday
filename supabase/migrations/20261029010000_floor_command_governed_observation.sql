-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-013
-- Governed multi-observation requests and append-only handoff history.
-- Not applied to hosted Orient by this tranche.
-- Does not change claim_floor_command_controlled_pull, release_floor_command_controlled_pull,
-- or persist_floor_command_observation. The operator one-shot attempt row is not updated here.

alter table public.floor_command_observation_handoffs
  add column last_checked_at timestamptz,
  add column checked_sequence bigint;

comment on column public.floor_command_observation_handoffs.last_checked_at is
  'When an unchanged governed read confirmed the retained revision. Null means that revision has not been rechecked. This is not a source change.';
comment on column public.floor_command_observation_handoffs.checked_sequence is
  'Highest source sequence checked for the retained revision. Null uses the sequence stored in the snapshot.';

create table public.floor_command_observation_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  claim_id uuid not null,
  store_number text not null,
  source text not null,
  purpose text not null,
  operational_week text not null,
  state text not null,
  reason text,
  seen_sequence bigint,
  seen_revision text,
  previous_observed_at timestamptz,
  previous_sequence bigint,
  previous_revision text,
  claimed_at timestamptz not null,
  terminal_at timestamptz,
  created_at timestamptz not null default now(),
  constraint floor_command_observation_requests_store_shape check (store_number ~ '^[1-9][0-9]*$'),
  constraint floor_command_observation_requests_week_shape check (operational_week ~ '^[0-9]{4}-W[0-9]{2}$'),
  constraint floor_command_observation_requests_state_known check (
    state in ('in_progress', 'accepted_new', 'unchanged', 'revised', 'failed', 'rejected')
  ),
  constraint floor_command_observation_requests_terminal check (
    (state = 'in_progress' and terminal_at is null)
    or (state <> 'in_progress' and terminal_at is not null)
  ),
  constraint floor_command_observation_requests_reason_known check (
    reason is null
    or reason in (
      'assignments_unavailable',
      'invalid_week',
      'store_required',
      'cross_store',
      'invalid_snapshot',
      'ordering_withheld',
      'sequence_conflict',
      'older_sequence',
      'credential_rejected',
      'source_unavailable',
      'forbidden',
      'unpublished',
      'lease_expired'
    )
  )
);

comment on table public.floor_command_observation_requests is
  'One explicit operator ask for one Floor Command week. A terminal row does not authorize another read.';

create unique index floor_command_observation_requests_one_inflight
  on public.floor_command_observation_requests (user_id)
  where state = 'in_progress';

create index floor_command_observation_requests_user_week_idx
  on public.floor_command_observation_requests (user_id, operational_week, terminal_at desc);

alter table public.floor_command_observation_requests enable row level security;
revoke all on table public.floor_command_observation_requests from public, anon, authenticated, service_role;
grant select on table public.floor_command_observation_requests to authenticated, service_role;

create policy floor_command_observation_requests_select_own
  on public.floor_command_observation_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table public.floor_command_observation_handoff_revisions (
  user_id uuid not null references auth.users (id) on delete cascade,
  handoff_id text not null,
  source_revision text not null,
  source_sequence bigint,
  observed_at timestamptz not null,
  origin text not null,
  snapshot jsonb not null,
  superseded_assignments jsonb not null,
  retained_deadlines jsonb not null,
  store_number text not null,
  operational_week text not null,
  week_starting date not null,
  week_ending date not null,
  source_updated_at timestamptz,
  deadlines_availability text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, handoff_id, source_revision),
  constraint floor_command_observation_handoff_revisions_origin_known check (
    origin in ('one_shot', 'accepted_new', 'revised')
  ),
  constraint floor_command_observation_handoff_revisions_json check (
    jsonb_typeof(snapshot) = 'object'
    and jsonb_typeof(superseded_assignments) = 'array'
    and jsonb_typeof(retained_deadlines) = 'array'
  )
);

comment on table public.floor_command_observation_handoff_revisions is
  'Append-only accepted Floor Command snapshots. A later revision does not rewrite an earlier row.';

alter table public.floor_command_observation_handoff_revisions enable row level security;
revoke all on table public.floor_command_observation_handoff_revisions from public, anon, authenticated, service_role;
grant select on table public.floor_command_observation_handoff_revisions to authenticated, service_role;

create policy floor_command_observation_handoff_revisions_select_own
  on public.floor_command_observation_handoff_revisions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.floor_command_observation_history_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'floor_command_observation_history_immutable';
end;
$$;

create trigger floor_command_observation_handoff_revisions_immutable
  before update or delete on public.floor_command_observation_handoff_revisions
  for each row
  execute function public.floor_command_observation_history_immutable();

revoke all on function public.floor_command_observation_history_immutable() from public, anon, authenticated, service_role;

insert into public.floor_command_observation_handoff_revisions (
  user_id,
  handoff_id,
  source_revision,
  source_sequence,
  observed_at,
  origin,
  snapshot,
  superseded_assignments,
  retained_deadlines,
  store_number,
  operational_week,
  week_starting,
  week_ending,
  source_updated_at,
  deadlines_availability
)
select
  handoff.user_id,
  handoff.handoff_id,
  handoff.source_revision,
  case
    when (handoff.snapshot -> 'freshness' ->> 'week_sequence') ~ '^[0-9]+$'
      then (handoff.snapshot -> 'freshness' ->> 'week_sequence')::bigint
    else null
  end,
  handoff.last_successful_observed_at,
  'one_shot',
  handoff.snapshot,
  handoff.superseded_assignments,
  handoff.retained_deadlines,
  handoff.store_number,
  handoff.operational_week,
  handoff.week_starting,
  handoff.week_ending,
  handoff.source_updated_at,
  handoff.deadlines_availability
from public.floor_command_observation_handoffs as handoff;

create or replace function public.floor_command_governed_integer(p_value text)
returns bigint
language plpgsql
immutable
as $$
begin
  if p_value is null or p_value !~ '^[0-9]+$' then
    return null;
  end if;
  return p_value::bigint;
end;
$$;

revoke all on function public.floor_command_governed_integer(text) from public, anon, authenticated, service_role;

create or replace function public.floor_command_governed_rejection(
  p_snapshot jsonb,
  p_synchronization text,
  p_store text,
  p_week text
)
returns text
language plpgsql
stable
as $$
declare
  v_sequence bigint;
  v_required bigint;
  v_confirmed bigint;
  v_outstanding bigint;
  v_status text;
  v_revision text;
begin
  if p_synchronization is distinct from 'comparable' and p_synchronization is distinct from 'withheld' then
    return 'invalid_snapshot';
  end if;
  if p_synchronization = 'withheld' then
    return 'ordering_withheld';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    return 'invalid_snapshot';
  end if;
  if public.floor_command_observation_json_forbidden(p_snapshot) then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot ->> 'source', '') <> 'deptsync.floor-command.orient.v1' then
    return 'invalid_snapshot';
  end if;
  if public.floor_command_store_identity(p_snapshot ->> 'store_number') is distinct from p_store then
    return 'cross_store';
  end if;
  if coalesce(p_snapshot ->> 'operational_week', '') is distinct from p_week then
    return 'invalid_week';
  end if;
  if coalesce(p_snapshot -> 'publication' ->> 'status', '') is distinct from 'published' then
    return 'unpublished';
  end if;
  v_sequence := public.floor_command_governed_integer(p_snapshot -> 'freshness' ->> 'week_sequence');
  v_revision := btrim(coalesce(p_snapshot -> 'freshness' ->> 'revision', ''));
  if v_sequence is null or v_sequence < 1 or v_revision = '' or char_length(v_revision) > 128 then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot -> 'handoff' ->> 'id', '') is distinct from ('fc.zebra-handoff.' || p_store || '.' || p_week) then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot -> 'handoff' ->> 'deadline_policy', '') is distinct from 'monday_of_operational_week' then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot -> 'handoff' ->> 'deadline_date', '') is distinct from coalesce(p_snapshot ->> 'week_starting', '') then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot ->> 'week_ending', '')::date <= coalesce(p_snapshot ->> 'week_starting', '')::date then
    return 'invalid_snapshot';
  end if;
  v_required := public.floor_command_governed_integer(p_snapshot -> 'handoff' ->> 'required_count');
  v_confirmed := public.floor_command_governed_integer(p_snapshot -> 'handoff' ->> 'confirmed_count');
  v_outstanding := public.floor_command_governed_integer(p_snapshot -> 'handoff' ->> 'outstanding_count');
  v_status := p_snapshot -> 'handoff' ->> 'status';
  if v_required is null or v_confirmed is null or v_outstanding is null
     or v_required < 1
     or v_confirmed + v_outstanding <> v_required then
    return 'invalid_snapshot';
  end if;
  if not (
    (v_status = 'pending' and v_confirmed = 0)
    or (v_status = 'partial' and v_confirmed > 0 and v_confirmed < v_required)
    or (v_status = 'complete' and v_confirmed = v_required)
  ) then
    return 'invalid_snapshot';
  end if;
  if jsonb_typeof(p_snapshot -> 'entries') is distinct from 'array' then
    return 'invalid_snapshot';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_snapshot -> 'entries') as entry
    where entry ->> 'zebra_task_completed' is distinct from 'false'
  ) then
    return 'invalid_snapshot';
  end if;
  if coalesce(p_snapshot -> 'deadlines' ->> 'availability', 'unavailable') not in ('ready', 'unavailable') then
    return 'invalid_snapshot';
  end if;
  if p_snapshot -> 'deadlines' ->> 'availability' = 'ready'
     and jsonb_typeof(p_snapshot -> 'deadlines' -> 'commitments') is distinct from 'array' then
    return 'invalid_snapshot';
  end if;
  return null;
exception
  when others then
    return 'invalid_snapshot';
end;
$$;

revoke all on function public.floor_command_governed_rejection(jsonb, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.open_floor_command_governed_observation(
  p_user_id uuid,
  p_week text,
  p_store text,
  p_source text,
  p_purpose text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_source text;
  v_purpose text;
  v_request uuid;
  v_claim uuid;
begin
  if p_user_id is null or p_week is null or p_week !~ '^[0-9]{4}-W[0-9]{2}$' then
    raise exception 'floor_command_governed_observation_week_invalid';
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is null
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read'
     or p_source is distinct from 'deptsync.floor-command.orient.v1'
     or p_purpose is distinct from 'orient_published_week_read' then
    return jsonb_build_object('status', 'unbound');
  end if;

  if public.floor_command_store_identity(p_store) is distinct from v_store then
    return jsonb_build_object('status', 'wrong_store');
  end if;

  if exists (
    select 1
    from public.floor_command_controlled_pull_claims
    where user_id = p_user_id
      and claimed_at > now() - public.floor_command_controlled_pull_lease()
  ) then
    return jsonb_build_object('status', 'busy');
  end if;

  perform 1
  from public.floor_command_observation_requests
  where user_id = p_user_id
    and state = 'in_progress'
  for update;

  update public.floor_command_observation_requests
  set
    state = 'failed',
    reason = 'lease_expired',
    terminal_at = now()
  where user_id = p_user_id
    and state = 'in_progress'
    and claimed_at <= now() - public.floor_command_controlled_pull_lease();

  if exists (
    select 1
    from public.floor_command_observation_requests
    where user_id = p_user_id
      and state = 'in_progress'
      and claimed_at > now() - public.floor_command_controlled_pull_lease()
  ) then
    return jsonb_build_object('status', 'busy');
  end if;

  v_claim := gen_random_uuid();
  insert into public.floor_command_observation_requests (
    user_id,
    claim_id,
    store_number,
    source,
    purpose,
    operational_week,
    state,
    claimed_at
  ) values (
    p_user_id,
    v_claim,
    v_store,
    v_source,
    v_purpose,
    p_week,
    'in_progress',
    now()
  )
  returning request_id into v_request;

  return jsonb_build_object(
    'status', 'opened',
    'request_id', v_request,
    'claim_id', v_claim
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'busy');
end;
$$;

comment on function public.open_floor_command_governed_observation(uuid, text, text, text, text) is
  'Opens one governed Floor Command request. Closes an expired lease as failed without a source read. Does not change the one-shot attempt row.';

revoke all on function public.open_floor_command_governed_observation(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.open_floor_command_governed_observation(uuid, text, text, text, text)
  to service_role;

create or replace function public.commit_floor_command_governed_observation(
  p_user_id uuid,
  p_request_id uuid,
  p_claim_id uuid,
  p_read_class text,
  p_reason text,
  p_synchronization text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.floor_command_observation_requests%rowtype;
  v_store text;
  v_source text;
  v_purpose text;
  v_reason text;
  v_outcome text;
  v_seen_sequence bigint;
  v_seen_revision text;
  v_working public.floor_command_observation_handoffs%rowtype;
  v_retained_sequence bigint;
  v_high bigint;
  v_incoming_sequence bigint;
  v_incoming_revision text;
  v_deadlines jsonb;
  v_superseded jsonb;
  v_observed timestamptz;
begin
  if p_user_id is null or p_request_id is null or p_claim_id is null then
    raise exception 'floor_command_governed_observation_claim_required';
  end if;

  select *
  into v_request
  from public.floor_command_observation_requests
  where request_id = p_request_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'floor_command_governed_observation_claim_mismatch';
  end if;

  if v_request.state <> 'in_progress' then
    return jsonb_build_object(
      'outcome', v_request.state,
      'reason', v_request.reason,
      'request_id', v_request.request_id
    );
  end if;

  if v_request.claim_id is distinct from p_claim_id then
    raise exception 'floor_command_governed_observation_claim_mismatch';
  end if;

  if v_request.claimed_at <= now() - public.floor_command_controlled_pull_lease() then
    raise exception 'floor_command_governed_observation_claim_expired';
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is null
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read'
     or v_store is distinct from v_request.store_number then
    v_outcome := 'rejected';
    v_reason := 'store_required';
  elsif p_read_class = 'transport_failure' then
    v_outcome := 'failed';
    v_reason := case
      when p_reason = 'source_unavailable' then 'source_unavailable'
      else 'source_unavailable'
    end;
  elsif p_read_class = 'credential_rejected' then
    v_outcome := 'rejected';
    v_reason := 'credential_rejected';
  elsif p_read_class = 'forbidden' then
    v_outcome := 'rejected';
    v_reason := 'forbidden';
  elsif p_read_class is distinct from 'snapshot' then
    v_outcome := 'rejected';
    v_reason := 'invalid_snapshot';
  else
    v_seen_sequence := public.floor_command_governed_integer(p_snapshot -> 'freshness' ->> 'week_sequence');
    v_seen_revision := nullif(btrim(coalesce(p_snapshot -> 'freshness' ->> 'revision', '')), '');
    v_reason := public.floor_command_governed_rejection(
      p_snapshot,
      p_synchronization,
      v_store,
      v_request.operational_week
    );
    if v_reason is not null then
      v_outcome := 'rejected';
    else
      v_incoming_sequence := public.floor_command_governed_integer(p_snapshot -> 'freshness' ->> 'week_sequence');
      v_incoming_revision := btrim(p_snapshot -> 'freshness' ->> 'revision');
      select *
      into v_working
      from public.floor_command_observation_handoffs
      where user_id = p_user_id
        and operational_week = v_request.operational_week
      for update;

      if not found then
        v_outcome := 'accepted_new';
        v_reason := null;
      elsif v_working.source_revision = v_incoming_revision then
        v_outcome := 'unchanged';
        v_reason := null;
        v_retained_sequence := public.floor_command_governed_integer(v_working.snapshot -> 'freshness' ->> 'week_sequence');
      else
        v_retained_sequence := public.floor_command_governed_integer(v_working.snapshot -> 'freshness' ->> 'week_sequence');
        v_high := coalesce(v_working.checked_sequence, v_retained_sequence);
        if v_retained_sequence is null or v_high is null then
          v_outcome := 'rejected';
          v_reason := 'invalid_snapshot';
        elsif v_incoming_sequence < v_retained_sequence then
          v_outcome := 'rejected';
          v_reason := 'older_sequence';
        elsif v_incoming_sequence <= v_high then
          v_outcome := 'rejected';
          v_reason := 'sequence_conflict';
        else
          v_outcome := 'revised';
          v_reason := null;
        end if;
      end if;
    end if;
  end if;

  if v_outcome = 'accepted_new' then
    v_observed := coalesce(nullif(p_snapshot -> 'freshness' ->> 'read_at', '')::timestamptz, now());
    v_deadlines := case
      when p_snapshot -> 'deadlines' ->> 'availability' = 'ready'
        then coalesce(p_snapshot -> 'deadlines' -> 'commitments', '[]'::jsonb)
      else '[]'::jsonb
    end;
    insert into public.floor_command_observation_handoffs (
      user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
      source_revision, source_updated_at, last_successful_observed_at, deadlines_availability,
      snapshot, superseded_assignments, retained_deadlines, updated_at
    ) values (
      p_user_id,
      p_snapshot -> 'handoff' ->> 'id',
      v_store,
      v_request.operational_week,
      (p_snapshot ->> 'week_starting')::date,
      (p_snapshot ->> 'week_ending')::date,
      btrim(p_snapshot -> 'freshness' ->> 'revision'),
      nullif(p_snapshot -> 'freshness' ->> 'source_updated_at', '')::timestamptz,
      v_observed,
      case when p_snapshot -> 'deadlines' ->> 'availability' = 'ready' then 'ready' else 'unavailable' end,
      p_snapshot,
      '[]'::jsonb,
      v_deadlines,
      v_observed
    );
    insert into public.floor_command_observation_handoff_revisions (
      user_id, handoff_id, source_revision, source_sequence, observed_at, origin,
      snapshot, superseded_assignments, retained_deadlines, store_number, operational_week,
      week_starting, week_ending, source_updated_at, deadlines_availability
    ) values (
      p_user_id,
      p_snapshot -> 'handoff' ->> 'id',
      btrim(p_snapshot -> 'freshness' ->> 'revision'),
      v_incoming_sequence,
      v_observed,
      'accepted_new',
      p_snapshot,
      '[]'::jsonb,
      v_deadlines,
      v_store,
      v_request.operational_week,
      (p_snapshot ->> 'week_starting')::date,
      (p_snapshot ->> 'week_ending')::date,
      nullif(p_snapshot -> 'freshness' ->> 'source_updated_at', '')::timestamptz,
      case when p_snapshot -> 'deadlines' ->> 'availability' = 'ready' then 'ready' else 'unavailable' end
    );
  elsif v_outcome = 'unchanged' then
    update public.floor_command_observation_handoffs
    set
      last_checked_at = now(),
      checked_sequence = case
        when v_incoming_sequence > coalesce(checked_sequence, v_retained_sequence) then v_incoming_sequence
        else checked_sequence
      end
    where user_id = p_user_id
      and handoff_id = v_working.handoff_id;
  elsif v_outcome = 'revised' then
    v_observed := coalesce(nullif(p_snapshot -> 'freshness' ->> 'read_at', '')::timestamptz, now());
    insert into public.floor_command_observation_handoff_revisions (
      user_id, handoff_id, source_revision, source_sequence, observed_at, origin,
      snapshot, superseded_assignments, retained_deadlines, store_number, operational_week,
      week_starting, week_ending, source_updated_at, deadlines_availability
    )
    select
      v_working.user_id, v_working.handoff_id, v_working.source_revision,
      v_retained_sequence, v_working.last_successful_observed_at, 'accepted_new',
      v_working.snapshot, v_working.superseded_assignments, v_working.retained_deadlines,
      v_working.store_number, v_working.operational_week, v_working.week_starting, v_working.week_ending,
      v_working.source_updated_at, v_working.deadlines_availability
    on conflict (user_id, handoff_id, source_revision) do nothing;

    v_deadlines := case
      when p_snapshot -> 'deadlines' ->> 'availability' = 'ready'
        then coalesce(p_snapshot -> 'deadlines' -> 'commitments', '[]'::jsonb)
      else v_working.retained_deadlines
    end;
    select coalesce(jsonb_agg(item order by item ->> 'id'), '[]'::jsonb)
    into v_superseded
    from (
      select item
      from jsonb_array_elements(coalesce(v_working.superseded_assignments, '[]'::jsonb)) as item
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(p_snapshot -> 'entries', '[]'::jsonb)) as current_entry
        where current_entry ->> 'id' = item ->> 'id'
      )
      union all
      select jsonb_build_object(
        'id', old_entry ->> 'id',
        'assignmentId', old_entry ->> 'assignment_id',
        'bayId', old_entry ->> 'bay_id',
        'rosterSpecialistId', old_entry -> 'roster_specialist_id',
        'associateName', coalesce(old_entry ->> 'associate_name', '')
      )
      from jsonb_array_elements(coalesce(v_working.snapshot -> 'entries', '[]'::jsonb)) as old_entry
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(p_snapshot -> 'entries', '[]'::jsonb)) as current_entry
        where current_entry ->> 'id' = old_entry ->> 'id'
      )
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_snapshot -> 'retired', '[]'::jsonb)) as retired_entry
        where retired_entry ->> 'id' = old_entry ->> 'id'
      )
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(v_working.superseded_assignments, '[]'::jsonb)) as kept
        where kept ->> 'id' = old_entry ->> 'id'
      )
    ) as combined;

    update public.floor_command_observation_handoffs
    set
      source_revision = btrim(p_snapshot -> 'freshness' ->> 'revision'),
      source_updated_at = nullif(p_snapshot -> 'freshness' ->> 'source_updated_at', '')::timestamptz,
      last_successful_observed_at = v_observed,
      deadlines_availability = case
        when p_snapshot -> 'deadlines' ->> 'availability' = 'ready' then 'ready'
        else 'unavailable'
      end,
      snapshot = p_snapshot,
      superseded_assignments = v_superseded,
      retained_deadlines = v_deadlines,
      last_checked_at = null,
      checked_sequence = null,
      updated_at = v_observed
    where user_id = p_user_id
      and handoff_id = v_working.handoff_id;

    insert into public.floor_command_observation_handoff_revisions (
      user_id, handoff_id, source_revision, source_sequence, observed_at, origin,
      snapshot, superseded_assignments, retained_deadlines, store_number, operational_week,
      week_starting, week_ending, source_updated_at, deadlines_availability
    ) values (
      p_user_id,
      v_working.handoff_id,
      btrim(p_snapshot -> 'freshness' ->> 'revision'),
      v_incoming_sequence,
      v_observed,
      'revised',
      p_snapshot,
      v_superseded,
      v_deadlines,
      v_store,
      v_request.operational_week,
      (p_snapshot ->> 'week_starting')::date,
      (p_snapshot ->> 'week_ending')::date,
      nullif(p_snapshot -> 'freshness' ->> 'source_updated_at', '')::timestamptz,
      case when p_snapshot -> 'deadlines' ->> 'availability' = 'ready' then 'ready' else 'unavailable' end
    );
  end if;

  update public.floor_command_observation_requests
  set
    state = v_outcome,
    reason = v_reason,
    seen_sequence = v_seen_sequence,
    seen_revision = v_seen_revision,
    previous_observed_at = case when v_outcome = 'revised' then v_working.last_successful_observed_at else null end,
    previous_sequence = case when v_outcome = 'revised' then v_retained_sequence else null end,
    previous_revision = case when v_outcome = 'revised' then v_working.source_revision else null end,
    terminal_at = now()
  where request_id = p_request_id;

  return jsonb_build_object(
    'outcome', v_outcome,
    'reason', v_reason,
    'request_id', p_request_id
  );
end;
$$;

comment on function public.commit_floor_command_governed_observation(uuid, uuid, uuid, text, text, text, jsonb) is
  'Classifies one governed read and commits at most one terminal outcome. An expired claim writes nothing. The one-shot attempt row is not updated.';

revoke all on function public.commit_floor_command_governed_observation(uuid, uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.commit_floor_command_governed_observation(uuid, uuid, uuid, text, text, text, jsonb)
  to service_role;
