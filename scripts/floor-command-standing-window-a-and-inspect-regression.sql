-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-037
-- Ephemeral proofs for Window-A attempt reauthorization and non-consuming inspection.
-- Requires migrations through 20261104180000. Does not contact Floor Command.

select set_config('orient.standing_claim_test_hooks', '1', false);

-- ---------------------------------------------------------------------------
-- Window A sequential: revalidate succeeds, then revoke, then attempt refuses.
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_revalidate jsonb;
  v_revoke jsonb;
  v_attempt jsonb;
  v_row public.floor_command_standing_opportunity_claims%rowtype;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_claim->>'status' is distinct from 'claimed' then
    raise exception 'window-a claim failed: %', v_claim;
  end if;
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  v_revalidate := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner, v_claim_id, v_as_of
  );
  if v_revalidate->>'status' is distinct from 'still_authorized' then
    raise exception 'window-a revalidate failed: %', v_revalidate;
  end if;

  v_revoke := public.revoke_floor_command_standing_policy(
    v_owner, v_policy, 'release-037-window-a-after-revalidate'
  );
  if v_revoke->>'status' is distinct from 'revoked' then
    raise exception 'window-a revoke failed: %', v_revoke;
  end if;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_as_of
  );
  if v_attempt->>'status' is distinct from 'authorization_revoked' then
    raise exception 'window-a attempt should refuse after revoke: %', v_attempt;
  end if;

  select * into v_row from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id;
  if v_row.source_attempted_at is not null then
    raise exception 'window-a wrote attempt marker after revoke';
  end if;
  if v_row.authority_status is distinct from 'closed' then
    raise exception 'window-a should close claim on refused mark: %', to_jsonb(v_row);
  end if;

  raise notice 'WINDOW_A_REVOKE_AFTER_REVALIDATE_OK';
end;
$$;

-- Gate disable after revalidate refuses attempt mark.
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_revalidate jsonb;
  v_attempt jsonb;
  v_row public.floor_command_standing_opportunity_claims%rowtype;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;
  v_revalidate := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner, v_claim_id, v_as_of
  );
  if v_revalidate->>'status' is distinct from 'still_authorized' then
    raise exception 'gate window revalidate failed: %', v_revalidate;
  end if;

  update public.floor_command_standing_execution_gate
  set enabled = false
  where gate_key = 'standing_opportunity_claim';

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_as_of
  );
  if v_attempt->>'status' is distinct from 'gate_disabled' then
    raise exception 'attempt should refuse when gate disabled: %', v_attempt;
  end if;

  select * into v_row from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id;
  if v_row.source_attempted_at is not null then
    raise exception 'gate-disabled path wrote attempt marker';
  end if;

  raise notice 'WINDOW_A_GATE_DISABLE_AFTER_REVALIDATE_OK';
end;
$$;

-- Outside-window after claim refuses mark (test clock).
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_opens timestamptz;
  v_closes timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_attempt jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_opens := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz;
  v_closes := (v_approve->'policy'->'windows'->0->>'closes_at')::timestamptz;

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity',
    v_opens + interval '1 hour'
  );
  if v_claim->>'status' is distinct from 'claimed' then
    raise exception 'outside-window claim failed: %', v_claim;
  end if;
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_closes + interval '1 minute'
  );
  if v_attempt->>'status' is distinct from 'outside_window' then
    raise exception 'attempt should refuse outside window: %', v_attempt;
  end if;

  raise notice 'WINDOW_A_OUTSIDE_WINDOW_OK';
end;
$$;

-- Duplicate / already-attempted still at-most-once.
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_first jsonb;
  v_second jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;
  v_first := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_as_of
  );
  if v_first->>'status' is distinct from 'source_attempted' then
    raise exception 'first attempt mark failed: %', v_first;
  end if;
  v_second := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_as_of
  );
  if v_second->>'status' is distinct from 'source_already_attempted' then
    raise exception 'second attempt mark allowed: %', v_second;
  end if;

  raise notice 'WINDOW_A_AT_MOST_ONCE_OK';
end;
$$;

-- Identity mismatch / wrong user.
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
  v_other uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_attempt jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_other, v_claim_id, v_as_of
  );
  if v_attempt->>'status' is distinct from 'not_found' then
    raise exception 'wrong operator should not mark attempt: %', v_attempt;
  end if;

  raise notice 'WINDOW_A_WRONG_OPERATOR_OK';
end;
$$;

-- Rollback: rejected mark leaves no source_attempted_at (already covered) and
-- a deliberate exception after mark rolls back the mark.
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_count integer;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  begin
    perform public.record_floor_command_standing_opportunity_source_attempt(
      v_owner, v_claim_id, v_as_of
    );
    raise exception 'rollback_marker_probe';
  exception
    when others then
      if sqlerrm is distinct from 'rollback_marker_probe' then
        raise;
      end if;
  end;

  select count(*) into v_count
  from public.floor_command_standing_opportunity_claims
  where claim_id = v_claim_id and source_attempted_at is not null;
  if v_count <> 0 then
    raise exception 'rolled-back attempt left durable marker';
  end if;

  raise notice 'WINDOW_A_ROLLBACK_OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- Non-consuming inspection
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_inspect jsonb;
  v_claims_before integer;
  v_claims_after integer;
  v_requests_before integer;
  v_requests_after integer;
  v_policies_before integer;
  v_policies_after integer;
  v_gate_before boolean;
  v_gate_after boolean;
  v_claim jsonb;
  v_claim_id uuid;
  v_attempt jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  select count(*) into v_claims_before from public.floor_command_standing_opportunity_claims;
  select count(*) into v_requests_before from public.floor_command_observation_requests;
  select count(*) into v_policies_before from public.floor_command_standing_policies;
  select enabled into v_gate_before
  from public.floor_command_standing_execution_gate
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;

  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, 1, '2026-W01', 'publication_opportunity', now()
  );
  if v_inspect->>'status' is distinct from 'not_approved' then
    raise exception 'proposed policy should inspect not_approved: %', v_inspect;
  end if;

  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'eligible_now' then
    raise exception 'approved in-window should be eligible_now: %', v_inspect;
  end if;
  if (v_inspect->>'advisory')::boolean is distinct from true
     or (v_inspect->>'consumes_opportunity')::boolean is distinct from false then
    raise exception 'inspect must remain advisory: %', v_inspect;
  end if;

  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_other, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'not_found' then
    raise exception 'wrong operator must not enumerate policy: %', v_inspect;
  end if;

  update public.floor_command_standing_execution_gate
  set enabled = false
  where gate_key = 'standing_opportunity_claim';
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'gate_disabled' then
    raise exception 'inspect gate_disabled expected: %', v_inspect;
  end if;

  update public.floor_command_standing_execution_gate
  set enabled = true
  where gate_key = 'standing_opportunity_claim';

  perform public.revoke_floor_command_standing_policy(
    v_owner, v_policy, 'release-037-inspect-revoked'
  );
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'revoked' then
    raise exception 'inspect revoked expected: %', v_inspect;
  end if;

  -- Fresh approved policy for claim/attempt inspection states.
  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'already_claimed' then
    raise exception 'inspect already_claimed expected: %', v_inspect;
  end if;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, v_claim_id, v_as_of
  );
  if v_attempt->>'status' is distinct from 'source_attempted' then
    raise exception 'inspect fixture attempt failed: %', v_attempt;
  end if;
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'already_attempted' then
    raise exception 'inspect already_attempted expected: %', v_inspect;
  end if;

  -- Repeated inspection is idempotent and still non-consuming.
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'already_attempted' then
    raise exception 'repeated inspect drifted: %', v_inspect;
  end if;

  select count(*) into v_claims_after from public.floor_command_standing_opportunity_claims;
  select count(*) into v_requests_after from public.floor_command_observation_requests;
  select count(*) into v_policies_after from public.floor_command_standing_policies;
  select enabled into v_gate_after
  from public.floor_command_standing_execution_gate
  where gate_key = 'standing_opportunity_claim';

  -- Inspection itself must not create requests. Claims/policies may grow from
  -- fixture setup above, not from inspect RPC. Verify inspect did not open requests.
  if v_requests_after <> v_requests_before then
    raise exception 'inspection created observation requests % -> %',
      v_requests_before, v_requests_after;
  end if;
  if v_gate_after is distinct from true then
    raise exception 'inspection mutated gate';
  end if;

  -- Malformed inputs
  v_inspect := public.inspect_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, 'bad-week', 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'invalid_week' then
    raise exception 'invalid week expected: %', v_inspect;
  end if;

  v_inspect := public.inspect_floor_command_standing_opportunity(
    null, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_inspect->>'status' is distinct from 'unauthorized' then
    raise exception 'null user should be unauthorized: %', v_inspect;
  end if;

  raise notice 'INSPECT_NON_CONSUMING_OK claims=% policies=%', v_claims_after, v_policies_after;
end;
$$;

-- Security: authenticated lacks EXECUTE on new functions.
do $$
declare
  v_attempt boolean;
  v_inspect boolean;
begin
  select has_function_privilege(
    'authenticated',
    'public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid,timestamptz)',
    'execute'
  ) into v_attempt;
  select has_function_privilege(
    'authenticated',
    'public.inspect_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)',
    'execute'
  ) into v_inspect;
  if v_attempt or v_inspect then
    raise exception 'authenticated must not execute hardened attempt/inspect';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid,timestamptz)',
    'execute'
  ) then
    raise exception 'service_role must execute hardened attempt';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.inspect_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)',
    'execute'
  ) then
    raise exception 'service_role must execute inspect';
  end if;
  raise notice 'WINDOW_A_INSPECT_SECURITY_OK';
end;
$$;
