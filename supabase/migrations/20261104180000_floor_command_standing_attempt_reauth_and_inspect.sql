-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-037
-- Window-A attempt-mark reauthorization + non-consuming opportunity inspection.
-- Additive local migration only. Does not enable the standing-execution gate.
-- Does not contact Floor Command. Does not rewrite historical claim evidence.
-- Not applied to hosted Orient by this tranche.

-- ---------------------------------------------------------------------------
-- Part A: harden record_floor_command_standing_opportunity_source_attempt
-- ---------------------------------------------------------------------------
-- Prior behavior (20261103160000): locked the claim only, required
-- authority_status=claimed and null source_attempted_at, then wrote the mark.
-- It did not re-check policy, gate, binding, or claim window. A revoke or
-- gate-disable that committed after revalidate and before this RPC still
-- authorized dispatch (Window A).
--
-- Hardened behavior: within one transaction, lock claim → policy → gate,
-- re-check live authority, then write source_attempted_at only if still
-- authorized. Optional p_as_of is test-clock only (same GUC as claim).

drop function if exists public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid);

create or replace function public.record_floor_command_standing_opportunity_source_attempt(
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
  v_gate public.floor_command_standing_execution_gate%rowtype;
  v_store text;
  v_source text;
  v_purpose text;
  v_now timestamptz;
  v_close_reason text;
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

  -- Lock order: claim → policy → gate. Compatible with revoke (policy only):
  -- whichever transaction acquires policy first linearizes first.
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
    return jsonb_build_object(
      'status', 'closed',
      'closure_reason', v_claim.closure_reason,
      'claim_id', v_claim.claim_id
    );
  end if;

  if v_claim.source_attempted_at is not null then
    return jsonb_build_object(
      'status', 'source_already_attempted',
      'claim_id', v_claim.claim_id,
      'source_attempted_at', v_claim.source_attempted_at
    );
  end if;

  select *
  into v_policy
  from public.floor_command_standing_policies
  where policy_id = v_claim.policy_id
    and user_id = p_user_id
  for update;

  if not found then
    v_close_reason := 'policy_missing';
  elsif v_policy.policy_id is distinct from v_claim.policy_id then
    v_close_reason := 'policy_mismatch';
  elsif v_policy.policy_version is distinct from v_claim.policy_version then
    v_close_reason := 'version_mismatch';
  elsif v_policy.state is distinct from 'approved'
     or v_policy.revoked_at is not null then
    v_close_reason := 'authorization_revoked';
  elsif v_policy.expired_at is not null
     or v_policy.expires_at <= v_now
     or v_policy.effective_at > v_now then
    v_close_reason := 'expired';
  elsif v_policy.store_number is distinct from '2587'
     or v_policy.source is distinct from 'deptsync.floor-command.orient.v1'
     or v_policy.purpose is distinct from 'orient_published_week_read'
     or coalesce(v_claim.scope->>'store_number', '') is distinct from '2587'
     or coalesce(v_claim.scope->>'source', '') is distinct from 'deptsync.floor-command.orient.v1'
     or coalesce(v_claim.scope->>'purpose', '') is distinct from 'orient_published_week_read' then
    v_close_reason := 'invalid_scope';
  end if;

  if v_close_reason is null then
    select *
    into v_gate
    from public.floor_command_standing_execution_gate
    where gate_key = 'standing_opportunity_claim'
    for update;

    if not found or v_gate.enabled is distinct from true then
      v_close_reason := 'gate_disabled';
    end if;
  end if;

  if v_close_reason is null then
    select store_number, source, purpose
    into v_store, v_source, v_purpose
    from public.floor_command_observation_bindings
    where user_id = p_user_id;

    if v_store is distinct from '2587'
       or v_source is distinct from 'deptsync.floor-command.orient.v1'
       or v_purpose is distinct from 'orient_published_week_read' then
      v_close_reason := 'unbound';
    end if;
  end if;

  if v_close_reason is null then
    if v_claim.opens_at > v_now or v_claim.closes_at <= v_now then
      v_close_reason := 'outside_window';
    end if;
  end if;

  if v_close_reason is not null then
    update public.floor_command_standing_opportunity_claims
    set
      authority_status = 'closed',
      closed_at = now(),
      closure_reason = left(v_close_reason, 80)
    where claim_id = v_claim.claim_id
    returning * into v_claim;

    return jsonb_build_object(
      'status', v_close_reason,
      'claim_id', v_claim.claim_id,
      'closure_reason', v_claim.closure_reason
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

comment on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid, timestamptz) is
  'RELEASE-037: atomically re-checks live standing authority under claim→policy→gate locks, then marks source_attempted_at once. Does not perform HTTP.';

revoke all on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_floor_command_standing_opportunity_source_attempt(uuid, uuid, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Part B: non-consuming opportunity inspection
-- ---------------------------------------------------------------------------
-- Advisory only. No FOR UPDATE. No inserts/updates. Does not call claim,
-- revalidate, attempt, open, commit, or link. Does not expire policies.

create or replace function public.inspect_floor_command_standing_opportunity(
  p_user_id uuid,
  p_policy_id uuid,
  p_policy_version integer,
  p_operational_week text,
  p_opportunity_kind text,
  p_as_of timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_policy public.floor_command_standing_policies%rowtype;
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
  v_store text;
  v_source text;
  v_purpose text;
  v_now timestamptz;
  v_window jsonb;
  v_kind text := btrim(coalesce(p_opportunity_kind, ''));
  v_week text := btrim(coalesce(p_operational_week, ''));
  v_status text;
  v_pub_claim uuid;
  v_evidence text;
begin
  if p_user_id is null or p_policy_id is null or p_policy_version is null then
    return jsonb_build_object(
      'status', 'unauthorized',
      'advisory', true,
      'consumes_opportunity', false
    );
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object(
      'status', 'unauthorized',
      'advisory', true,
      'consumes_opportunity', false
    );
  end if;
  if v_week !~ '^[0-9]{4}-W[0-9]{2}$' then
    return jsonb_build_object(
      'status', 'invalid_week',
      'advisory', true,
      'consumes_opportunity', false
    );
  end if;
  if v_kind not in ('publication_opportunity', 'reconciliation_opportunity') then
    return jsonb_build_object(
      'status', 'invalid_kind',
      'advisory', true,
      'consumes_opportunity', false
    );
  end if;

  begin
    v_now := public.floor_command_standing_claim_clock(p_as_of);
  exception
    when others then
      if sqlerrm = 'floor_command_standing_claim_as_of_forbidden' then
        return jsonb_build_object(
          'status', 'as_of_forbidden',
          'advisory', true,
          'consumes_opportunity', false
        );
      end if;
      raise;
  end;

  -- Ownership miss and unknown policy share not_found (no enumeration).
  select *
  into v_policy
  from public.floor_command_standing_policies
  where policy_id = p_policy_id
    and user_id = p_user_id;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'advisory', true,
      'consumes_opportunity', false,
      'as_of', v_now
    );
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id;

  if v_store is distinct from '2587'
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    return jsonb_build_object(
      'status', 'unbound',
      'advisory', true,
      'consumes_opportunity', false,
      'as_of', v_now
    );
  end if;

  if not public.floor_command_standing_execution_gate_is_open() then
    v_status := 'gate_disabled';
  elsif v_policy.policy_version is distinct from p_policy_version then
    v_status := 'version_mismatch';
  elsif v_policy.state = 'revoked' or v_policy.revoked_at is not null then
    v_status := 'revoked';
  elsif v_policy.state = 'expired' or v_policy.expired_at is not null then
    v_status := 'expired';
  elsif v_policy.state is distinct from 'approved' then
    v_status := 'not_approved';
  elsif v_policy.store_number is distinct from '2587'
     or v_policy.source is distinct from 'deptsync.floor-command.orient.v1'
     or v_policy.purpose is distinct from 'orient_published_week_read' then
    v_status := 'invalid_scope';
  elsif v_policy.effective_at > v_now then
    v_status := 'not_effective';
  elsif v_policy.expires_at <= v_now then
    v_status := 'expired';
  else
    select *
    into v_claim
    from public.floor_command_standing_opportunity_claims
    where policy_id = v_policy.policy_id
      and operational_week = v_week
      and opportunity_kind = v_kind;

    if found then
      if v_claim.source_attempted_at is not null then
        v_status := 'already_attempted';
      elsif v_claim.authority_status = 'closed' then
        v_status := 'already_closed';
      else
        v_status := 'already_claimed';
      end if;
    else
      v_window := public.floor_command_standing_opportunity_window(v_policy, v_week, v_kind);
      if v_window is null
         or (v_window ->> 'opens_at')::timestamptz > v_now
         or (v_window ->> 'closes_at')::timestamptz <= v_now then
        v_status := 'outside_window';
      elsif v_kind = 'publication_opportunity' then
        if v_policy.max_publication_per_window is distinct from 1
           or v_policy.automatic_retry_limit is distinct from 0 then
          v_status := 'invalid_scope';
        else
          v_status := 'eligible_now';
        end if;
      else
        if v_policy.max_reconciliation_per_window is distinct from 1 then
          v_status := 'reconciliation_not_allowed';
        else
          select claim_id
          into v_pub_claim
          from public.floor_command_standing_opportunity_claims
          where policy_id = v_policy.policy_id
            and operational_week = v_week
            and opportunity_kind = 'publication_opportunity';
          if v_pub_claim is null then
            v_status := 'publication_required';
          else
            v_evidence := public.floor_command_standing_reconciliation_evidence(
              p_user_id, v_policy.store_number, v_week, v_now
            );
            if v_evidence is not null then
              v_status := v_evidence;
            else
              v_status := 'eligible_now';
            end if;
          end if;
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'advisory', true,
    'consumes_opportunity', false,
    'as_of', v_now,
    'policy_id', v_policy.policy_id,
    'policy_version', v_policy.policy_version,
    'operational_week', v_week,
    'opportunity_kind', v_kind,
    'disclaimer', 'eligibility_is_not_a_reservation'
  );
end;
$$;

comment on function public.inspect_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz) is
  'RELEASE-037: read-only advisory standing-opportunity eligibility. Does not claim, mark, GET, or open observations.';

revoke all on function public.inspect_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.inspect_floor_command_standing_opportunity(uuid, uuid, integer, text, text, timestamptz)
  to service_role;
