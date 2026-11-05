-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-029
-- Durable opportunity-claim proof. No Floor Command GET. No governed open.

select set_config('orient.standing_claim_test_hooks', '1', false);

do $$
declare
  v_owner_a uuid := '11111111-1111-4111-8111-111111111111';
  v_owner_b uuid := '22222222-2222-4222-8222-222222222222';
  v_owner_c uuid := '33333333-3333-4333-8333-333333333333';
  v_missing uuid := '55555555-5555-4555-8555-555555555555';
  v_result jsonb;
  v_policy jsonb;
  v_policy_id uuid;
  v_version integer;
  v_week text;
  v_open timestamptz;
  v_close timestamptz;
  v_recon_open timestamptz;
  v_as_of timestamptz;
  v_recon_as_of timestamptz;
  v_claim_id uuid;
  v_other uuid;
  v_other_week text;
  v_other_as_of timestamptz;
  v_requests_before integer;
  v_handoffs_before integer;
  v_latch_before integer;
  v_attempt text;
  v_src text;
  v_count integer;
  v_deadline date;
begin
  select count(*) into v_requests_before from public.floor_command_observation_requests;
  select count(*) into v_handoffs_before from public.floor_command_observation_handoffs;
  select count(*) into v_latch_before from public.floor_command_controlled_pull_claims;
  select last_attempt_result into v_attempt
  from public.floor_command_observation_attempts
  where user_id = v_owner_a;

  if public.floor_command_standing_execution_gate_is_open() then
    raise exception 'gate defaulted open';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_missing,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    1,
    '2026-W46',
    'publication_opportunity',
    null
  );
  if v_result->>'status' is distinct from 'unauthorized' then
    raise exception 'missing user status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '30 days', 1, 1, 'America/Boise'
  );
  if v_result->>'status' is distinct from 'proposed' then
    raise exception 'propose status %', v_result;
  end if;
  v_policy := v_result->'policy';
  v_policy_id := (v_policy->>'policy_id')::uuid;
  v_version := (v_policy->>'policy_version')::integer;
  if v_policy->>'time_zone' is distinct from 'America/Boise' then
    raise exception 'zone %', v_policy->>'time_zone';
  end if;
  if v_policy->>'store_number' is distinct from '2587'
     or v_policy->>'source' is distinct from 'deptsync.floor-command.orient.v1'
     or v_policy->>'purpose' is distinct from 'orient_published_week_read' then
    raise exception 'scope %', v_policy;
  end if;

  v_week := v_policy->'windows'->0->>'operational_week';
  v_open := (v_policy->'windows'->0->>'opens_at')::timestamptz;
  v_close := (v_policy->'windows'->0->>'closes_at')::timestamptz;
  v_recon_open := (v_policy->'windows'->1->>'opens_at')::timestamptz;
  v_as_of := v_open + interval '1 hour';
  v_recon_as_of := v_recon_open + interval '1 hour';
  if v_policy->'windows'->0->>'kind' is distinct from 'publication_opportunity'
     or v_policy->'windows'->1->>'kind' is distinct from 'reconciliation_opportunity' then
    raise exception 'window kinds %', v_policy->'windows';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'gate_disabled' then
    raise exception 'expected gate_disabled got %', v_result->>'status';
  end if;

  update public.floor_command_standing_execution_gate
  set enabled = true, updated_at = now(), note = 'ephemeral RELEASE-029 proof'
  where gate_key = 'standing_opportunity_claim';

  perform set_config('orient.standing_claim_test_hooks', '', true);
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'as_of_forbidden' then
    raise exception 'as_of without hooks %', v_result->>'status';
  end if;
  perform set_config('orient.standing_claim_test_hooks', '1', false);

  v_result := public.approve_floor_command_standing_policy(v_owner_a, v_policy_id);
  if v_result->>'status' is distinct from 'approved' then
    raise exception 'approve %', v_result;
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_c, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' not in ('not_found', 'unbound') then
    raise exception 'cross operator %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version + 7, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'version_mismatch' then
    raise exception 'version mismatch %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, '1999-W01', 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'outside_window' then
    raise exception 'bad week %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'not_a_kind', v_as_of
  );
  if v_result->>'status' is distinct from 'invalid_kind' then
    raise exception 'bad kind %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity',
    v_open - interval '1 minute'
  );
  if v_result->>'status' is distinct from 'outside_window' then
    raise exception 'early window %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity',
    v_close + interval '1 minute'
  );
  if v_result->>'status' is distinct from 'outside_window' then
    raise exception 'late window %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'reconciliation_opportunity', v_recon_as_of
  );
  if v_result->>'status' is distinct from 'publication_required' then
    raise exception 'recon before pub %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'claimed' then
    raise exception 'claim failed %', v_result;
  end if;
  v_claim_id := (v_result->'claim'->>'claim_id')::uuid;
  if v_result->'claim'->>'authority_status' is distinct from 'claimed'
     or v_result->'claim'->>'source_attempted_at' is not null
     or v_result->'claim'->>'source_response_at' is not null
     or v_result->'claim'->>'observation_request_id' is not null
     or v_result->'claim'->>'observation_committed_at' is not null
     or v_result->'claim'->>'observation_outcome' is not null then
    raise exception 'claim collapsed evidence %', v_result->'claim';
  end if;
  if v_result->'claim'->>'time_zone' is distinct from 'America/Boise' then
    raise exception 'claim zone %', v_result->'claim'->>'time_zone';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'already_claimed' then
    raise exception 'duplicate %', v_result->>'status';
  end if;

  v_result := public.record_floor_command_standing_opportunity_source_attempt(v_owner_a, v_claim_id);
  if v_result->>'status' is distinct from 'source_attempted' then
    raise exception 'source attempt mark %', v_result;
  end if;
  if v_result->>'source_response_at' is not null
     or v_result->>'observation_committed_at' is not null then
    raise exception 'source attempt advanced observation columns';
  end if;
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'already_claimed' then
    raise exception 'reopen after ambiguous source attempt %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'reconciliation_opportunity', v_recon_as_of
  );
  if v_result->>'status' is distinct from 'reconciliation_evidence_missing' then
    raise exception 'recon without evidence %', v_result->>'status';
  end if;

  v_deadline := (v_recon_open at time zone 'America/Boise')::date;
  insert into public.floor_command_observation_handoffs (
    user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
    source_revision, last_successful_observed_at, deadlines_availability,
    snapshot, superseded_assignments, retained_deadlines
  ) values (
    v_owner_a,
    'fc.zebra-handoff.2587.' || v_week,
    '2587',
    v_week,
    v_deadline,
    v_deadline + 6,
    'claim-proof-rev',
    now(),
    'ready',
    jsonb_build_object(
      'operational_week', v_week,
      'week_starting', v_deadline,
      'week_ending', v_deadline + 6,
      'freshness', jsonb_build_object('week_sequence', 1, 'revision', 'claim-proof-rev'),
      'handoff', jsonb_build_object(
        'id', 'fc.zebra-handoff.2587.' || v_week,
        'deadline_date', v_deadline,
        'required_count', 2,
        'confirmed_count', 1,
        'outstanding_count', 1,
        'status', 'partial'
      ),
      'entries', '[]'::jsonb
    ),
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Zero outstanding must refuse.
  update public.floor_command_observation_handoffs
  set snapshot = jsonb_set(
    snapshot,
    '{handoff,outstanding_count}',
    '0'::jsonb,
    true
  )
  where user_id = v_owner_a and operational_week = v_week;
  update public.floor_command_observation_handoffs
  set snapshot = jsonb_set(
    jsonb_set(snapshot, '{handoff,confirmed_count}', '2'::jsonb, true),
    '{handoff,status}',
    '"complete"'::jsonb,
    true
  )
  where user_id = v_owner_a and operational_week = v_week;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'reconciliation_opportunity', v_recon_as_of
  );
  if v_result->>'status' is distinct from 'reconciliation_no_outstanding' then
    raise exception 'recon no outstanding %', v_result->>'status';
  end if;

  update public.floor_command_observation_handoffs
  set snapshot = jsonb_set(
    jsonb_set(
      jsonb_set(snapshot, '{handoff,outstanding_count}', '1'::jsonb, true),
      '{handoff,confirmed_count}',
      '1'::jsonb,
      true
    ),
    '{handoff,status}',
    '"partial"'::jsonb,
    true
  )
  where user_id = v_owner_a and operational_week = v_week;

  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'reconciliation_opportunity', v_recon_as_of
  );
  if v_result->>'status' is distinct from 'claimed' then
    raise exception 'recon claim %', v_result;
  end if;
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_a, v_policy_id, v_version, v_week, 'reconciliation_opportunity', v_recon_as_of
  );
  if v_result->>'status' is distinct from 'already_claimed' then
    raise exception 'recon duplicate %', v_result->>'status';
  end if;

  -- Transaction rollback must not leave a claim.
  v_result := public.propose_floor_command_standing_policy(
    v_owner_b, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  if v_result->>'status' is distinct from 'proposed' then
    raise exception 'owner_b propose %', v_result;
  end if;
  v_other := (v_result->'policy'->>'policy_id')::uuid;
  v_version := (v_result->'policy'->>'policy_version')::integer;
  v_other_week := v_result->'policy'->'windows'->0->>'operational_week';
  v_other_as_of := (v_result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  perform public.approve_floor_command_standing_policy(v_owner_b, v_other);

  begin
    perform public.claim_floor_command_standing_opportunity(
      v_owner_b, v_other, v_version, v_other_week, 'publication_opportunity', v_other_as_of
    );
    raise exception 'rollback_after_claim';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'rollback_after_claim' then
        raise;
      end if;
  end;
  if exists (
    select 1 from public.floor_command_standing_opportunity_claims where policy_id = v_other
  ) then
    raise exception 'rolled back claim remained durable';
  end if;

  -- Successful claim remains durable.
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_b, v_other, v_version, v_other_week, 'publication_opportunity', v_other_as_of
  );
  if v_result->>'status' is distinct from 'claimed' then
    raise exception 'durable claim %', v_result;
  end if;
  v_claim_id := (v_result->'claim'->>'claim_id')::uuid;
  select count(*) into v_count
  from public.floor_command_standing_opportunity_claims
  where claim_id = v_claim_id and authority_status = 'claimed';
  if v_count <> 1 then
    raise exception 'committed claim missing';
  end if;

  -- Pre-GET revalidation while approved.
  v_result := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner_b, v_claim_id, v_other_as_of
  );
  if v_result->>'status' is distinct from 'still_authorized' then
    raise exception 'still authorized %', v_result;
  end if;

  -- Revoke after claim, before GET.
  perform public.revoke_floor_command_standing_policy(
    v_owner_b, v_other, 'RELEASE-029 revoke after claim before GET'
  );
  v_result := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner_b, v_claim_id, v_other_as_of
  );
  if v_result->>'status' is distinct from 'authorization_revoked' then
    raise exception 'preget revalidate %', v_result;
  end if;
  if (select authority_status from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id)
     is distinct from 'closed' then
    raise exception 'revoked claim not closed';
  end if;

  -- Revocation before claim.
  v_result := public.propose_floor_command_standing_policy(
    v_owner_b, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_other := (v_result->'policy'->>'policy_id')::uuid;
  v_version := (v_result->'policy'->>'policy_version')::integer;
  v_other_week := v_result->'policy'->'windows'->0->>'operational_week';
  v_other_as_of := (v_result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  perform public.approve_floor_command_standing_policy(v_owner_b, v_other);
  perform public.revoke_floor_command_standing_policy(
    v_owner_b, v_other, 'RELEASE-029 revoke before claim'
  );
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_b, v_other, v_version, v_other_week, 'publication_opportunity', v_other_as_of
  );
  if v_result->>'status' is distinct from 'revoked' then
    raise exception 'revoked before claim %', v_result->>'status';
  end if;
  v_result := public.approve_floor_command_standing_policy(v_owner_b, v_other);
  if v_result->>'status' is distinct from 'not_proposed' then
    raise exception 'approve after revoke %', v_result->>'status';
  end if;

  -- Expiration.
  v_result := public.propose_floor_command_standing_policy(
    v_owner_b, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  v_other := (v_result->'policy'->>'policy_id')::uuid;
  v_version := (v_result->'policy'->>'policy_version')::integer;
  v_other_week := v_result->'policy'->'windows'->0->>'operational_week';
  v_other_as_of := (v_result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  perform public.approve_floor_command_standing_policy(v_owner_b, v_other);
  alter table public.floor_command_standing_policies
    disable trigger floor_command_standing_policies_guard;
  update public.floor_command_standing_policies
  set
    effective_at = now() - interval '2 days',
    expires_at = now() - interval '1 millisecond'
  where policy_id = v_other;
  alter table public.floor_command_standing_policies
    enable trigger floor_command_standing_policies_guard;
  v_result := public.claim_floor_command_standing_opportunity(
    v_owner_b, v_other, v_version, v_other_week, 'publication_opportunity', v_other_as_of
  );
  if v_result->>'status' is distinct from 'expired' then
    raise exception 'expired claim %', v_result->>'status';
  end if;
  perform public.revoke_floor_command_standing_policy(
    v_owner_b, v_other, 'RELEASE-029 close expired fixture'
  );

  -- Privilege: authenticated cannot execute claim; service_role cannot mutate table directly.
  begin
    execute 'set local role authenticated';
    begin
      perform public.claim_floor_command_standing_opportunity(
        v_owner_a, v_policy_id, v_version, v_week, 'publication_opportunity', v_as_of
      );
      raise exception 'authenticated executed claim';
    exception
      when insufficient_privilege then
        null;
    end;
    execute 'reset role';
  exception
    when others then
      execute 'reset role';
      raise;
  end;

  begin
    execute 'set local role service_role';
    begin
      insert into public.floor_command_standing_opportunity_claims (
        policy_id, policy_version, user_id, claimed_by, operational_week, opportunity_kind,
        opens_at, closes_at, time_zone, scope, authority_status
      ) values (
        v_policy_id, v_version, v_owner_a, v_owner_a, '2099-W01', 'publication_opportunity',
        now(), now() + interval '1 hour', 'America/Boise', '{}'::jsonb, 'claimed'
      );
      raise exception 'service_role direct insert succeeded';
    exception
      when insufficient_privilege then
        null;
    end;
    begin
      update public.floor_command_standing_execution_gate
      set enabled = false
      where gate_key = 'standing_opportunity_claim';
      raise exception 'service_role gate update succeeded';
    exception
      when insufficient_privilege then
        null;
    end;
    execute 'reset role';
  exception
    when others then
      execute 'reset role';
      raise;
  end;

  select pg_get_functiondef(
    'public.claim_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)'::regprocedure
  ) into v_src;
  if v_src ilike '%published-week%'
     or v_src ilike '%http_get%'
     or v_src ilike '%pg_net%'
     or v_src ilike '%open_floor_command_governed_observation%'
     or v_src ilike '%commit_floor_command_governed_observation%'
     or v_src ilike '%claim_floor_command_controlled_pull%'
     or v_src ilike '%ORIENT_FLOOR_COMMAND_PULL%'
     or v_src ilike '%cron.schedule%' then
    raise exception 'claim function contains execution side effects';
  end if;

  if (select count(*) from public.floor_command_observation_requests) <> v_requests_before then
    raise exception 'observation requests changed';
  end if;
  if (select count(*) from public.floor_command_controlled_pull_claims) <> v_latch_before then
    raise exception 'one-shot latch claims changed';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = v_owner_a)
     is distinct from v_attempt then
    raise exception 'one-shot attempt changed';
  end if;
  -- Handoff insert above is retained evidence fixture only; requests stay unchanged.
  if (select count(*) from public.floor_command_observation_requests where state = 'in_progress') <> 0 then
    raise exception 'in-progress observation appeared';
  end if;

  raise notice 'OPPORTUNITY_CLAIM_CORE_OK week=%', v_week;
end $$;
