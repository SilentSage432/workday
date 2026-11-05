-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-033
-- Durable claim → revalidate → attempt → governed open/commit → link.
-- No network. Run only against the ephemeral database from the sibling shell script.

select set_config('orient.standing_claim_test_hooks', '1', false);

do $$
declare
  v_owner uuid := '55555555-5555-4555-8555-555555555555';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_monday date;
  v_sunday date;
  v_claim jsonb;
  v_claim_id uuid;
  v_revalidate jsonb;
  v_attempt jsonb;
  v_open jsonb;
  v_commit jsonb;
  v_link jsonb;
  v_dup jsonb;
  v_row public.floor_command_standing_opportunity_claims%rowtype;
  v_request public.floor_command_observation_requests%rowtype;
  v_snapshot jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = true, note = 'ephemeral RELEASE-033 proof'
  where gate_key = 'standing_opportunity_claim';

  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  if v_propose->>'status' is distinct from 'proposed' then
    raise exception 'propose failed: %', v_propose;
  end if;
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_version := (v_propose->'policy'->>'policy_version')::integer;
  v_week := v_propose->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_propose->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  if v_approve->>'status' is distinct from 'approved' then
    raise exception 'approve failed: %', v_approve;
  end if;
  v_version := (v_approve->'policy'->>'policy_version')::integer;

  v_monday := to_date(
    split_part(v_week, '-W', 1) || lpad(split_part(v_week, '-W', 2), 2, '0') || '1',
    'IYYYIWID'
  );
  v_sunday := v_monday + 6;

  -- 1) Claim
  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_claim->>'status' is distinct from 'claimed' then
    raise exception 'claim failed: %', v_claim;
  end if;
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  v_dup := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_dup->>'status' is distinct from 'already_claimed' then
    raise exception 'duplicate claim not blocked: %', v_dup;
  end if;

  -- 2) Revalidate
  v_revalidate := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner, v_claim_id, v_as_of
  );
  if v_revalidate->>'status' is distinct from 'still_authorized' then
    raise exception 'revalidate failed: %', v_revalidate;
  end if;

  -- 3) Durable attempt mark BEFORE governed open / synthetic source
  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(v_owner, v_claim_id, v_as_of);
  if v_attempt->>'status' is distinct from 'source_attempted' then
    raise exception 'attempt mark failed: %', v_attempt;
  end if;

  v_dup := public.record_floor_command_standing_opportunity_source_attempt(v_owner, v_claim_id, v_as_of);
  if v_dup->>'status' is distinct from 'source_already_attempted' then
    raise exception 'second attempt mark not blocked: %', v_dup;
  end if;

  v_revalidate := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner, v_claim_id, v_as_of
  );
  if v_revalidate->>'status' is distinct from 'source_already_attempted' then
    raise exception 'revalidate after attempt should block: %', v_revalidate;
  end if;

  -- 4) Governed open + commit with synthetic snapshot (no HTTP)
  v_open := public.open_floor_command_governed_observation(
    v_owner,
    v_week,
    '2587',
    'deptsync.floor-command.orient.v1',
    'orient_published_week_read'
  );
  if v_open->>'status' is distinct from 'opened' then
    raise exception 'governed open failed: %', v_open;
  end if;

  v_snapshot := jsonb_build_object(
    'source', 'deptsync.floor-command.orient.v1',
    'store_number', '2587',
    'operational_week', v_week,
    'week_starting', to_char(v_monday, 'YYYY-MM-DD'),
    'week_ending', to_char(v_sunday, 'YYYY-MM-DD'),
    'publication', jsonb_build_object(
      'id', 'fc.publication.2587.' || v_week,
      'status', 'published'
    ),
    'handoff', jsonb_build_object(
      'id', 'fc.zebra-handoff.2587.' || v_week,
      'status', 'pending',
      'deadline_date', to_char(v_monday, 'YYYY-MM-DD'),
      'deadline_policy', 'monday_of_operational_week',
      'required_count', 1,
      'confirmed_count', 0,
      'outstanding_count', 1
    ),
    'entries', jsonb_build_array(jsonb_build_object(
      'id', 'fc.assignment.fixture',
      'assignment_id', 'fixture',
      'bay_id', 'bay-fixture',
      'department', 'flooring',
      'roster_specialist_id', 'roster-fixture',
      'associate_name', 'Fixture',
      'assignment_status', 'assigned',
      'zebra_confirmation', 'unconfirmed',
      'zebra_entered_at', null,
      'zebra_task_completed', false,
      'deadline', null,
      'updated_at', '2026-11-02T18:00:00.000Z'
    )),
    'deadlines', jsonb_build_object('availability', 'ready', 'commitments', jsonb_build_array()),
    'retired', jsonb_build_array(),
    'freshness', jsonb_build_object(
      'read_at', '2026-11-02T18:00:00.000Z',
      'source_updated_at', '2026-11-02T18:00:00.000Z',
      'revision', 'rev-standing-033',
      'matches_previous_revision', null,
      'week_sequence', 1
    )
  );

  v_commit := public.commit_floor_command_governed_observation(
    v_owner,
    (v_open->>'request_id')::uuid,
    (v_open->>'claim_id')::uuid,
    'snapshot',
    null,
    'comparable',
    v_snapshot
  );
  if v_commit->>'outcome' is distinct from 'accepted_new' then
    raise exception 'governed commit unexpected: %', v_commit;
  end if;

  -- 5) Link observation evidence onto the standing claim
  v_link := public.link_floor_command_standing_opportunity_observation(
    v_owner,
    v_claim_id,
    (v_open->>'request_id')::uuid,
    v_commit->>'outcome'
  );
  if v_link->>'status' is distinct from 'linked' then
    raise exception 'link failed: %', v_link;
  end if;

  select * into v_row from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id;
  if v_row.source_attempted_at is null
     or v_row.source_response_at is null
     or v_row.observation_request_id is distinct from (v_open->>'request_id')::uuid
     or v_row.observation_outcome is distinct from 'accepted_new'
     or v_row.observation_committed_at is null then
    raise exception 'claim evidence incomplete: %', to_jsonb(v_row);
  end if;

  select * into v_request
  from public.floor_command_observation_requests
  where request_id = (v_open->>'request_id')::uuid;
  if v_request.state is distinct from 'accepted_new' then
    raise exception 'request state %', v_request.state;
  end if;

  v_dup := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_dup->>'status' is distinct from 'already_claimed' then
    raise exception 'consumed opportunity reopened: %', v_dup;
  end if;

  raise notice 'STANDING_EXECUTION_HAPPY_PATH_OK week=% outcome=%', v_week, v_commit->>'outcome';
end;
$$;

-- Revocation after claim, before attempt mark.
do $$
declare
  v_owner uuid := '66666666-6666-4666-8666-666666666666';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_revoke jsonb;
  v_revalidate jsonb;
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
  if v_claim->>'status' is distinct from 'claimed' then
    raise exception 'claim failed: %', v_claim;
  end if;
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;

  v_revoke := public.revoke_floor_command_standing_policy(
    v_owner, v_policy, 'release-033-revoke-before-attempt'
  );
  if v_revoke->>'status' is distinct from 'revoked' then
    raise exception 'revoke failed: %', v_revoke;
  end if;

  v_revalidate := public.revalidate_floor_command_standing_opportunity_claim(
    v_owner, v_claim_id, v_as_of
  );
  if v_revalidate->>'status' is distinct from 'authorization_revoked' then
    raise exception 'expected authorization_revoked: %', v_revalidate;
  end if;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(v_owner, v_claim_id, v_as_of);
  if v_attempt->>'status' is distinct from 'closed' then
    raise exception 'attempt after revoke should see closed claim: %', v_attempt;
  end if;

  raise notice 'STANDING_EXECUTION_REVOKE_BEFORE_ATTEMPT_OK';
end;
$$;

-- Attempt mark is the dispatch authorization decision.
do $$
declare
  v_owner uuid := '77777777-7777-4777-8777-777777777777';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_claim_id uuid;
  v_attempt jsonb;
  v_revoke jsonb;
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
    raise exception 'claim failed: %', v_claim;
  end if;
  v_claim_id := (v_claim->'claim'->>'claim_id')::uuid;
  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(v_owner, v_claim_id, v_as_of);
  if v_attempt->>'status' is distinct from 'source_attempted' then
    raise exception 'attempt mark failed: %', v_attempt;
  end if;

  v_revoke := public.revoke_floor_command_standing_policy(
    v_owner, v_policy, 'release-033-revoke-after-attempt'
  );
  if v_revoke->>'status' is distinct from 'revoked' then
    raise exception 'revoke failed: %', v_revoke;
  end if;

  select * into v_row from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id;
  if v_row.source_attempted_at is null then
    raise exception 'revoke cleared dispatch authorization mark';
  end if;

  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(v_owner, v_claim_id, v_as_of);
  if v_attempt->>'status' is distinct from 'source_already_attempted' then
    raise exception 'second dispatch mark allowed after revoke: %', v_attempt;
  end if;

  perform public.close_floor_command_standing_opportunity_after_dispatch(
    v_owner, v_claim_id, 'revoked_after_dispatch_authorization'
  );

  select * into v_row from public.floor_command_standing_opportunity_claims where claim_id = v_claim_id;
  if v_row.authority_status is distinct from 'closed'
     or v_row.observation_outcome is not null then
    raise exception 'close after dispatch invented observation: %', to_jsonb(v_row);
  end if;

  raise notice 'STANDING_EXECUTION_REVOKE_AFTER_ATTEMPT_OK';
end;
$$;

-- Gate disabled before claim
do $$
declare
  v_owner uuid := '88888888-8888-4888-8888-888888888888';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
begin
  update public.floor_command_standing_execution_gate
  set enabled = false
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
  if v_claim->>'status' is distinct from 'gate_disabled' then
    raise exception 'expected gate_disabled: %', v_claim;
  end if;

  raise notice 'STANDING_EXECUTION_GATE_DISABLED_OK';
end;
$$;

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)',
    'execute'
  ) then
    raise exception 'authenticated can execute link';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.close_floor_command_standing_opportunity_after_dispatch(uuid,uuid,text)',
    'execute'
  ) then
    raise exception 'authenticated can execute close';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)',
    'execute'
  ) then
    raise exception 'service_role missing link execute';
  end if;
  raise notice 'STANDING_EXECUTION_SECURITY_OK';
end;
$$;
