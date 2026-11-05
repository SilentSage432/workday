-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-029
-- Durable standing opportunity claims. Local authority enforcement only.
-- Claiming an opportunity never reads Floor Command, never opens a governed
-- observation request, and never invokes the classifier.
-- Not applied to hosted Orient by this tranche.
-- Standing-execution gate defaults disabled. Production stays closed.

create table public.floor_command_standing_execution_gate (
  gate_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  note text,
  constraint floor_command_standing_execution_gate_key check (
    gate_key = 'standing_opportunity_claim'
  )
);

comment on table public.floor_command_standing_execution_gate is
  'Deployment kill switch for standing opportunity claims. Default false. Distinct from ORIENT_FLOOR_COMMAND_PULL_ENABLED. This tranche never enables it in production.';

insert into public.floor_command_standing_execution_gate (gate_key, enabled, note)
values (
  'standing_opportunity_claim',
  false,
  'RELEASE-029 default off'
);

alter table public.floor_command_standing_execution_gate enable row level security;
revoke all on table public.floor_command_standing_execution_gate from public, anon, authenticated, service_role;
grant select on table public.floor_command_standing_execution_gate to authenticated, service_role;

create policy floor_command_standing_execution_gate_select
  on public.floor_command_standing_execution_gate
  for select
  to authenticated
  using (true);

create table public.floor_command_standing_opportunity_claims (
  claim_id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.floor_command_standing_policies (policy_id),
  policy_version integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_by uuid not null,
  operational_week text not null,
  opportunity_kind text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  time_zone text not null,
  scope jsonb not null,
  claimed_at timestamptz not null default now(),
  -- Distinct evidence columns. Do not collapse into one success flag.
  authority_status text not null,
  source_attempted_at timestamptz,
  source_response_at timestamptz,
  observation_request_id uuid,
  observation_committed_at timestamptz,
  observation_outcome text,
  closed_at timestamptz,
  closure_reason text,
  constraint floor_command_standing_opportunity_claims_week check (
    operational_week ~ '^[0-9]{4}-W[0-9]{2}$'
  ),
  constraint floor_command_standing_opportunity_claims_kind check (
    opportunity_kind in ('publication_opportunity', 'reconciliation_opportunity')
  ),
  constraint floor_command_standing_opportunity_claims_version check (policy_version >= 1),
  constraint floor_command_standing_opportunity_claims_window check (closes_at > opens_at),
  constraint floor_command_standing_opportunity_claims_zone check (
    time_zone ~ '^[A-Za-z]+(?:/[A-Za-z0-9_+-]+)+$'
  ),
  constraint floor_command_standing_opportunity_claims_scope check (jsonb_typeof(scope) = 'object'),
  constraint floor_command_standing_opportunity_claims_authority check (
    authority_status in ('claimed', 'closed')
  ),
  constraint floor_command_standing_opportunity_claims_actor check (claimed_by = user_id),
  constraint floor_command_standing_opportunity_claims_outcome check (
    observation_outcome is null
    or observation_outcome in (
      'accepted_new', 'unchanged', 'revised', 'failed', 'rejected'
    )
  ),
  constraint floor_command_standing_opportunity_claims_closure check (
    (
      authority_status = 'claimed'
      and closed_at is null
      and closure_reason is null
    )
    or (
      authority_status = 'closed'
      and closed_at is not null
      and closure_reason is not null
      and char_length(closure_reason) between 1 and 80
    )
  ),
  constraint floor_command_standing_opportunity_claims_source_order check (
    (source_attempted_at is null and source_response_at is null)
    or (source_attempted_at is not null and source_response_at is null)
    or (source_attempted_at is not null and source_response_at is not null and source_response_at >= source_attempted_at)
  ),
  constraint floor_command_standing_opportunity_claims_observation_order check (
    observation_committed_at is null
    or (
      observation_request_id is not null
      and source_response_at is not null
      and observation_committed_at >= source_response_at
      and observation_outcome is not null
    )
  ),
  constraint floor_command_standing_opportunity_claims_unique
    unique (policy_id, operational_week, opportunity_kind)
);

comment on table public.floor_command_standing_opportunity_claims is
  'One durable consumption of one standing observation opportunity. A row is consumed authority, not a source read and not a governed classification.';

comment on column public.floor_command_standing_opportunity_claims.authority_status is
  'claimed means authorization was acquired. closed means the claim ended without treating observation columns as success by themselves.';
comment on column public.floor_command_standing_opportunity_claims.source_attempted_at is
  'When a later reader begins a source GET. Null after claim alone.';
comment on column public.floor_command_standing_opportunity_claims.source_response_at is
  'When a source response is retained by a later reader. Null until then.';
comment on column public.floor_command_standing_opportunity_claims.observation_committed_at is
  'When commit_floor_command_governed_observation finishes for the linked request. Null until then.';

create index floor_command_standing_opportunity_claims_user_idx
  on public.floor_command_standing_opportunity_claims (user_id, claimed_at desc);

create index floor_command_standing_opportunity_claims_policy_idx
  on public.floor_command_standing_opportunity_claims (policy_id, claimed_at desc);

alter table public.floor_command_standing_opportunity_claims enable row level security;
revoke all on table public.floor_command_standing_opportunity_claims from public, anon, authenticated, service_role;
grant select on table public.floor_command_standing_opportunity_claims to authenticated, service_role;

create policy floor_command_standing_opportunity_claims_select_own
  on public.floor_command_standing_opportunity_claims
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.floor_command_standing_opportunity_claims_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'floor_command_standing_opportunity_claim_history_retained';
  end if;

  if tg_op = 'INSERT' then
    if new.authority_status is distinct from 'claimed'
       or new.source_attempted_at is not null
       or new.source_response_at is not null
       or new.observation_request_id is not null
       or new.observation_committed_at is not null
       or new.observation_outcome is not null
       or new.closed_at is not null
       or new.closure_reason is not null then
      raise exception 'floor_command_standing_opportunity_claim_insert_claimed_only';
    end if;
    return new;
  end if;

  if new.claim_id is distinct from old.claim_id
     or new.policy_id is distinct from old.policy_id
     or new.policy_version is distinct from old.policy_version
     or new.user_id is distinct from old.user_id
     or new.claimed_by is distinct from old.claimed_by
     or new.operational_week is distinct from old.operational_week
     or new.opportunity_kind is distinct from old.opportunity_kind
     or new.opens_at is distinct from old.opens_at
     or new.closes_at is distinct from old.closes_at
     or new.time_zone is distinct from old.time_zone
     or new.scope is distinct from old.scope
     or new.claimed_at is distinct from old.claimed_at then
    raise exception 'floor_command_standing_opportunity_claim_identity_frozen';
  end if;

  -- Observation evidence may advance forward only. Authority may close once.
  if old.authority_status = 'closed' and new.authority_status is distinct from 'closed' then
    raise exception 'floor_command_standing_opportunity_claim_reopen_forbidden';
  end if;
  if old.source_attempted_at is not null
     and new.source_attempted_at is distinct from old.source_attempted_at then
    raise exception 'floor_command_standing_opportunity_claim_source_attempt_frozen';
  end if;
  if old.source_response_at is not null
     and new.source_response_at is distinct from old.source_response_at then
    raise exception 'floor_command_standing_opportunity_claim_source_response_frozen';
  end if;
  if old.observation_committed_at is not null
     and (
       new.observation_committed_at is distinct from old.observation_committed_at
       or new.observation_outcome is distinct from old.observation_outcome
       or new.observation_request_id is distinct from old.observation_request_id
     ) then
    raise exception 'floor_command_standing_opportunity_claim_observation_frozen';
  end if;

  return new;
end;
$$;

create trigger floor_command_standing_opportunity_claims_guard
  before insert or update or delete on public.floor_command_standing_opportunity_claims
  for each row
  execute function public.floor_command_standing_opportunity_claims_guard();

revoke all on function public.floor_command_standing_opportunity_claims_guard()
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_execution_gate_is_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select enabled
      from public.floor_command_standing_execution_gate
      where gate_key = 'standing_opportunity_claim'
    ),
    false
  );
$$;

revoke all on function public.floor_command_standing_execution_gate_is_open()
  from public, anon, authenticated;
grant execute on function public.floor_command_standing_execution_gate_is_open()
  to service_role;

create or replace function public.floor_command_standing_claim_clock(p_as_of timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
begin
  if p_as_of is null then
    return now();
  end if;
  if current_setting('orient.standing_claim_test_hooks', true) is distinct from '1' then
    raise exception 'floor_command_standing_claim_as_of_forbidden';
  end if;
  return p_as_of;
end;
$$;

revoke all on function public.floor_command_standing_claim_clock(timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_opportunity_window(
  p_policy public.floor_command_standing_policies,
  p_week text,
  p_kind text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_windows jsonb;
  v_item jsonb;
begin
  select scope -> 'windows'
  into v_windows
  from public.floor_command_standing_policy_events
  where policy_id = p_policy.policy_id
    and event_type = 'approved'
  order by occurred_at desc
  limit 1;

  if v_windows is null then
    v_windows := public.floor_command_standing_policy_windows(
      p_policy.effective_at,
      p_policy.expires_at,
      p_policy.time_zone,
      p_policy.max_publication_windows,
      p_policy.max_reconciliation_per_window
    );
  end if;

  for v_item in select * from jsonb_array_elements(v_windows)
  loop
    if v_item ->> 'kind' = p_kind
       and v_item ->> 'operational_week' = p_week then
      return v_item;
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.floor_command_standing_opportunity_window(public.floor_command_standing_policies, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_reconciliation_evidence(
  p_user_id uuid,
  p_store text,
  p_week text,
  p_as_of timestamptz
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_handoff public.floor_command_observation_handoffs%rowtype;
  v_outstanding bigint;
  v_deadline date;
begin
  select *
  into v_handoff
  from public.floor_command_observation_handoffs
  where user_id = p_user_id
    and store_number = p_store
    and operational_week = p_week
  order by last_successful_observed_at desc
  limit 1;

  if not found then
    return 'reconciliation_evidence_missing';
  end if;

  begin
    v_outstanding := nullif(btrim(coalesce(v_handoff.snapshot -> 'handoff' ->> 'outstanding_count', '')), '')::bigint;
  exception when others then
    return 'reconciliation_evidence_missing';
  end;

  begin
    v_deadline := nullif(btrim(coalesce(v_handoff.snapshot -> 'handoff' ->> 'deadline_date', '')), '')::date;
  exception when others then
    return 'reconciliation_evidence_missing';
  end;

  if v_outstanding is null or v_deadline is null then
    return 'reconciliation_evidence_missing';
  end if;
  if v_outstanding <= 0 then
    return 'reconciliation_no_outstanding';
  end if;
  if v_deadline is distinct from v_handoff.week_starting then
    return 'reconciliation_evidence_missing';
  end if;
  -- Window open/close already bounds the reconciliation civil day.
  -- Retained outstanding_count > 0 on the working handoff is required evidence.
  return null;
end;
$$;

revoke all on function public.floor_command_standing_reconciliation_evidence(uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.claim_floor_command_standing_opportunity(
  p_user_id uuid,
  p_policy_id uuid,
  p_policy_version integer,
  p_operational_week text,
  p_opportunity_kind text,
  p_as_of timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.floor_command_standing_policies%rowtype;
  v_store text;
  v_source text;
  v_purpose text;
  v_now timestamptz;
  v_window jsonb;
  v_scope jsonb;
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
  v_pub_claim uuid;
  v_evidence text;
  v_kind text := btrim(coalesce(p_opportunity_kind, ''));
  v_week text := btrim(coalesce(p_operational_week, ''));
begin
  if p_user_id is null or p_policy_id is null or p_policy_version is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object('status', 'unauthorized');
  end if;
  if v_week !~ '^[0-9]{4}-W[0-9]{2}$' then
    return jsonb_build_object('status', 'invalid_week');
  end if;
  if v_kind not in ('publication_opportunity', 'reconciliation_opportunity') then
    return jsonb_build_object('status', 'invalid_kind');
  end if;

  begin
    v_now := public.floor_command_standing_claim_clock(p_as_of);
  exception
    when others then
      if sqlerrm = 'floor_command_standing_claim_as_of_forbidden' then
        return jsonb_build_object('status', 'as_of_forbidden');
      end if;
      raise;
  end;

  if not public.floor_command_standing_execution_gate_is_open() then
    return jsonb_build_object('status', 'gate_disabled');
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is distinct from '2587'
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    return jsonb_build_object('status', 'unbound');
  end if;

  select *
  into v_policy
  from public.floor_command_standing_policies
  where policy_id = p_policy_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_policy.policy_version is distinct from p_policy_version then
    return jsonb_build_object('status', 'version_mismatch', 'policy_version', v_policy.policy_version);
  end if;
  if v_policy.state = 'revoked' or v_policy.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;
  if v_policy.state = 'expired' or v_policy.expired_at is not null then
    return jsonb_build_object('status', 'expired');
  end if;
  if v_policy.state is distinct from 'approved' then
    return jsonb_build_object('status', 'not_approved', 'state', v_policy.state);
  end if;
  if v_policy.store_number is distinct from '2587'
     or v_policy.source is distinct from 'deptsync.floor-command.orient.v1'
     or v_policy.purpose is distinct from 'orient_published_week_read' then
    return jsonb_build_object('status', 'invalid_scope');
  end if;
  if v_policy.effective_at > v_now then
    return jsonb_build_object('status', 'not_effective');
  end if;
  if v_policy.expires_at <= v_now then
    return jsonb_build_object('status', 'expired');
  end if;

  if exists (
    select 1
    from public.floor_command_standing_opportunity_claims
    where policy_id = v_policy.policy_id
      and operational_week = v_week
      and opportunity_kind = v_kind
  ) then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  select scope
  into v_scope
  from public.floor_command_standing_policy_events
  where policy_id = v_policy.policy_id
    and event_type = 'approved'
  order by occurred_at desc
  limit 1;
  if v_scope is null then
    return jsonb_build_object('status', 'scope_missing');
  end if;
  if public.floor_command_observation_json_forbidden(v_scope) then
    return jsonb_build_object('status', 'credential_forbidden');
  end if;

  v_window := public.floor_command_standing_opportunity_window(v_policy, v_week, v_kind);
  if v_window is null then
    return jsonb_build_object('status', 'outside_window');
  end if;
  if (v_window ->> 'opens_at')::timestamptz > v_now
     or (v_window ->> 'closes_at')::timestamptz <= v_now then
    return jsonb_build_object('status', 'outside_window');
  end if;
  -- Approved policy windows remain executable=false calendar facts.
  -- This claim row is the separate execution-authority artifact.

  if v_kind = 'publication_opportunity' then
    if v_policy.max_publication_per_window is distinct from 1
       or v_policy.automatic_retry_limit is distinct from 0 then
      return jsonb_build_object('status', 'invalid_scope');
    end if;
  else
    if v_policy.max_reconciliation_per_window is distinct from 1 then
      return jsonb_build_object('status', 'reconciliation_not_allowed');
    end if;
    select claim_id
    into v_pub_claim
    from public.floor_command_standing_opportunity_claims
    where policy_id = v_policy.policy_id
      and operational_week = v_week
      and opportunity_kind = 'publication_opportunity';
    if v_pub_claim is null then
      return jsonb_build_object('status', 'publication_required');
    end if;
    v_evidence := public.floor_command_standing_reconciliation_evidence(
      p_user_id, v_policy.store_number, v_week, v_now
    );
    if v_evidence is not null then
      return jsonb_build_object('status', v_evidence);
    end if;
  end if;

  begin
    insert into public.floor_command_standing_opportunity_claims (
      policy_id,
      policy_version,
      user_id,
      claimed_by,
      operational_week,
      opportunity_kind,
      opens_at,
      closes_at,
      time_zone,
      scope,
      authority_status
    ) values (
      v_policy.policy_id,
      v_policy.policy_version,
      p_user_id,
      p_user_id,
      v_week,
      v_kind,
      (v_window ->> 'opens_at')::timestamptz,
      (v_window ->> 'closes_at')::timestamptz,
      v_policy.time_zone,
      v_scope,
      'claimed'
    )
    returning * into v_claim;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'already_claimed');
  end;

  return jsonb_build_object(
    'status', 'claimed',
    'claim', jsonb_build_object(
      'claim_id', v_claim.claim_id,
      'policy_id', v_claim.policy_id,
      'policy_version', v_claim.policy_version,
      'user_id', v_claim.user_id,
      'claimed_by', v_claim.claimed_by,
      'operational_week', v_claim.operational_week,
      'opportunity_kind', v_claim.opportunity_kind,
      'opens_at', v_claim.opens_at,
      'closes_at', v_claim.closes_at,
      'time_zone', v_claim.time_zone,
      'claimed_at', v_claim.claimed_at,
      'authority_status', v_claim.authority_status,
      'source_attempted_at', v_claim.source_attempted_at,
      'source_response_at', v_claim.source_response_at,
      'observation_request_id', v_claim.observation_request_id,
      'observation_committed_at', v_claim.observation_committed_at,
      'observation_outcome', v_claim.observation_outcome
    )
  );
end;
$$;

comment on function public.claim_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz) is
  'Atomically consumes one standing observation opportunity. Does not read a source and does not open a governed observation request.';

revoke all on function public.claim_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz)
  to service_role;

create or replace function public.revalidate_floor_command_standing_opportunity_claim(
  p_user_id uuid,
  p_claim_id uuid,
  p_as_of timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
  v_policy public.floor_command_standing_policies%rowtype;
  v_now timestamptz;
begin
  if p_user_id is null or p_claim_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  begin
    v_now := public.floor_command_standing_claim_clock(p_as_of);
  exception
    when others then
      if sqlerrm = 'floor_command_standing_claim_as_of_forbidden' then
        return jsonb_build_object('status', 'as_of_forbidden');
      end if;
      raise;
  end;

  select *
  into v_claim
  from public.floor_command_standing_opportunity_claims
  where claim_id = p_claim_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_claim.authority_status = 'closed' then
    return jsonb_build_object(
      'status', 'closed',
      'closure_reason', v_claim.closure_reason,
      'claim_id', v_claim.claim_id
    );
  end if;
  if v_claim.source_attempted_at is not null then
    return jsonb_build_object(
      'status', 'source_already_attempted',
      'claim_id', v_claim.claim_id
    );
  end if;

  select *
  into v_policy
  from public.floor_command_standing_policies
  where policy_id = v_claim.policy_id
    and user_id = p_user_id
  for update;

  if not found
     or v_policy.state is distinct from 'approved'
     or v_policy.revoked_at is not null
     or v_policy.expired_at is not null
     or v_policy.expires_at <= v_now
     or v_policy.effective_at > v_now
     or not public.floor_command_standing_execution_gate_is_open() then
    update public.floor_command_standing_opportunity_claims
    set
      authority_status = 'closed',
      closed_at = now(),
      closure_reason = 'authorization_revoked'
    where claim_id = v_claim.claim_id
    returning * into v_claim;
    return jsonb_build_object(
      'status', 'authorization_revoked',
      'claim_id', v_claim.claim_id,
      'closure_reason', v_claim.closure_reason
    );
  end if;

  return jsonb_build_object(
    'status', 'still_authorized',
    'claim_id', v_claim.claim_id,
    'policy_id', v_claim.policy_id,
    'operational_week', v_claim.operational_week,
    'opportunity_kind', v_claim.opportunity_kind
  );
end;
$$;

comment on function public.revalidate_floor_command_standing_opportunity_claim(uuid, uuid, timestamptz) is
  'Pre-GET authorization re-check required by RELEASE-028. Closes the claim without a source read when authority is gone.';

revoke all on function public.revalidate_floor_command_standing_opportunity_claim(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.revalidate_floor_command_standing_opportunity_claim(uuid, uuid, timestamptz)
  to service_role;

create or replace function public.record_floor_command_standing_opportunity_source_attempt(
  p_user_id uuid,
  p_claim_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
begin
  if p_user_id is null or p_claim_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select *
  into v_claim
  from public.floor_command_standing_opportunity_claims
  where claim_id = p_claim_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_claim.authority_status is distinct from 'claimed' then
    return jsonb_build_object('status', 'closed', 'closure_reason', v_claim.closure_reason);
  end if;
  if v_claim.source_attempted_at is not null then
    return jsonb_build_object(
      'status', 'source_already_attempted',
      'claim_id', v_claim.claim_id,
      'source_attempted_at', v_claim.source_attempted_at
    );
  end if;

  update public.floor_command_standing_opportunity_claims
  set source_attempted_at = now()
  where claim_id = v_claim.claim_id
  returning * into v_claim;

  return jsonb_build_object(
    'status', 'source_attempted',
    'claim_id', v_claim.claim_id,
    'source_attempted_at', v_claim.source_attempted_at,
    'source_response_at', v_claim.source_response_at,
    'observation_committed_at', v_claim.observation_committed_at
  );
end;
$$;

comment on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid) is
  'Marks that a later reader began a source attempt. Does not perform a GET and does not reopen the opportunity.';

revoke all on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid)
  to service_role;
