-- Ephemeral assertions for RELEASE-013. This file is not a migration.
\set ON_ERROR_STOP on

create function public.test_governed_snapshot(
  p_week text,
  p_start date,
  p_ending date,
  p_revision text,
  p_sequence int,
  p_published boolean
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'source', 'deptsync.floor-command.orient.v1',
    'store_number', '2587',
    'operational_week', p_week,
    'week_starting', to_char(p_start, 'YYYY-MM-DD'),
    'week_ending', to_char(p_ending, 'YYYY-MM-DD'),
    'publication', jsonb_build_object(
      'id', 'fc.publication.2587.' || p_week,
      'status', case when p_published then 'published' else 'unpublished' end
    ),
    'handoff', jsonb_build_object(
      'id', 'fc.zebra-handoff.2587.' || p_week,
      'status', 'pending',
      'deadline_date', to_char(p_start, 'YYYY-MM-DD'),
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
      'revision', p_revision,
      'matches_previous_revision', null,
      'week_sequence', p_sequence
    )
  );
$$;

create function public.test_governed_commit(
  p_user uuid,
  p_week text,
  p_class text,
  p_reason text,
  p_sync text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_open jsonb;
begin
  v_open := public.open_floor_command_governed_observation(
    p_user, p_week, '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  if v_open ->> 'status' is distinct from 'opened' then
    raise exception 'open failed %', v_open;
  end if;
  return public.commit_floor_command_governed_observation(
    p_user,
    (v_open ->> 'request_id')::uuid,
    (v_open ->> 'claim_id')::uuid,
    p_class,
    p_reason,
    p_sync,
    p_snapshot
  );
end;
$$;

do $$
declare
  v_owner_a uuid := '11111111-1111-4111-8111-111111111111';
  v_owner_b uuid := '22222222-2222-4222-8222-222222222222';
  v_owner_c uuid := '33333333-3333-4333-8333-333333333333';
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
  v_open jsonb;
  v_request uuid;
  v_claim uuid;
  v_checked timestamptz;
  v_observed timestamptz;
  v_history jsonb;
begin
  if (select count(*) from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_a and source_revision = 'c3a29fab9de35ca0' and origin = 'one_shot') <> 1 then
    raise exception 'one-shot history copy missing';
  end if;
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = v_owner_a and operational_week = '2026-W44') <> 'c3a29fab9de35ca0' then
    raise exception 'working revision changed during migration';
  end if;
  if (select snapshot -> 'freshness' ->> 'week_sequence' from public.floor_command_observation_handoffs
      where user_id = v_owner_a) <> '8' then
    raise exception 'working sequence changed during migration';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_handoffs
      where user_id = v_owner_a) <> timestamptz '2026-10-29T00:40:17.666Z' then
    raise exception 'working observed time changed during migration';
  end if;
  if (select last_checked_at from public.floor_command_observation_handoffs where user_id = v_owner_a) is not null then
    raise exception 'migration wrote last_checked_at';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = v_owner_a) <> 'success_complete' then
    raise exception 'attempt row changed during migration';
  end if;

  if public.claim_floor_command_controlled_pull(v_owner_a, gen_random_uuid()) <> 'already_succeeded' then
    raise exception 'one-shot latch did not stay closed';
  end if;
  if (select count(*) from public.floor_command_controlled_pull_claims) <> 0 then
    raise exception 'already_succeeded created a claim';
  end if;
  if position('open_floor_command_governed_observation' in pg_get_functiondef('public.claim_floor_command_controlled_pull(uuid,uuid)'::regprocedure)) > 0 then
    raise exception 'one-shot claim calls the governed open';
  end if;

  select snapshot into v_before
  from public.floor_command_observation_handoffs
  where user_id = v_owner_a and operational_week = '2026-W44';

  v_result := public.test_governed_commit(
    v_owner_a, '2026-W46', 'transport_failure', 'source_unavailable', null, null
  );
  if v_result ->> 'outcome' <> 'failed' or v_result ->> 'reason' <> 'source_unavailable' then
    raise exception 'failure outcome %', v_result;
  end if;

  v_result := public.test_governed_commit(
    v_owner_a,
    '2026-W46',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W46', '2026-11-09', '2026-11-15', 'rev-empty', 0, false)
  );
  if v_result ->> 'outcome' <> 'rejected' or v_result ->> 'reason' <> 'unpublished' then
    raise exception 'unpublished outcome %', v_result;
  end if;

  v_result := public.test_governed_commit(
    v_owner_a,
    '2026-W46',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W46', '2026-11-09', '2026-11-15', 'rev-zero', 0, true)
  );
  if v_result ->> 'outcome' <> 'rejected' or v_result ->> 'reason' <> 'invalid_snapshot' then
    raise exception 'sequence zero published outcome %', v_result;
  end if;

  select snapshot into v_after
  from public.floor_command_observation_handoffs
  where user_id = v_owner_a and operational_week = '2026-W44';
  if v_before is distinct from v_after then
    raise exception 'rejected and failed reads replaced the retained snapshot';
  end if;
  if (select count(*) from public.floor_command_observation_handoffs
      where user_id = v_owner_a and operational_week = '2026-W46') <> 0 then
    raise exception 'unpublished week was stored as a handoff';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = v_owner_a) <> 'success_complete' then
    raise exception 'governed outcome rewrote the one-shot attempt';
  end if;
  if (select count(*) from public.floor_command_observation_attempts where user_id = v_owner_b) <> 0 then
    raise exception 'governed path created an attempt row';
  end if;

  v_result := public.test_governed_commit(
    v_owner_b,
    '2026-W45',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-a', 1, true)
  );
  if v_result ->> 'outcome' <> 'accepted_new' then
    raise exception 'first observation %', v_result;
  end if;
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = v_owner_b and operational_week = '2026-W45') <> 'rev-a' then
    raise exception 'accepted snapshot was not retained';
  end if;
  if (select origin from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_b and source_revision = 'rev-a') <> 'accepted_new' then
    raise exception 'accepted history origin missing';
  end if;

  select last_successful_observed_at into v_observed
  from public.floor_command_observation_handoffs
  where user_id = v_owner_b and operational_week = '2026-W45';

  v_result := public.test_governed_commit(
    v_owner_b,
    '2026-W45',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-a', 3, true)
  );
  if v_result ->> 'outcome' <> 'unchanged' then
    raise exception 'unchanged outcome %', v_result;
  end if;
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = v_owner_b) <> 'rev-a' then
    raise exception 'unchanged replaced the revision';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_handoffs
      where user_id = v_owner_b) <> v_observed then
    raise exception 'unchanged moved the accepted time';
  end if;
  if (select checked_sequence from public.floor_command_observation_handoffs where user_id = v_owner_b) <> 3 then
    raise exception 'unchanged did not record the checked sequence';
  end if;
  if (select last_checked_at from public.floor_command_observation_handoffs where user_id = v_owner_b) is null then
    raise exception 'unchanged did not record last_checked_at';
  end if;

  v_open := public.open_floor_command_governed_observation(
    v_owner_b, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  v_result := public.commit_floor_command_governed_observation(
    v_owner_b,
    (v_open ->> 'request_id')::uuid,
    (v_open ->> 'claim_id')::uuid,
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-a', 3, true)
  );
  select last_checked_at into v_checked
  from public.floor_command_observation_handoffs
  where user_id = v_owner_b;
  v_result := public.commit_floor_command_governed_observation(
    v_owner_b,
    (v_open ->> 'request_id')::uuid,
    (v_open ->> 'claim_id')::uuid,
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-other', 9, true)
  );
  if v_result ->> 'outcome' <> 'unchanged' then
    raise exception 'repeat commit %', v_result;
  end if;
  if (select last_checked_at from public.floor_command_observation_handoffs where user_id = v_owner_b) <> v_checked then
    raise exception 'repeat commit rewrote last_checked_at';
  end if;

  v_result := public.test_governed_commit(
    v_owner_b,
    '2026-W45',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-c', 3, true)
  );
  if v_result ->> 'outcome' <> 'rejected' or v_result ->> 'reason' <> 'sequence_conflict' then
    raise exception 'sequence conflict %', v_result;
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = v_owner_b) <> 'rev-a' then
    raise exception 'rejected revision replaced the snapshot';
  end if;

  select snapshot into v_history
  from public.floor_command_observation_handoff_revisions
  where user_id = v_owner_b and source_revision = 'rev-a';

  v_result := public.test_governed_commit(
    v_owner_b,
    '2026-W45',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-e', 4, true)
  );
  if v_result ->> 'outcome' <> 'revised' then
    raise exception 'revised outcome %', v_result;
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = v_owner_b) <> 'rev-e' then
    raise exception 'revised working snapshot missing';
  end if;
  if (select snapshot from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_b and source_revision = 'rev-a') is distinct from v_history then
    raise exception 'historical snapshot was rewritten';
  end if;
  if (select origin from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_b and source_revision = 'rev-a') <> 'accepted_new' then
    raise exception 'historical origin was rewritten';
  end if;
  if (select origin from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_b and source_revision = 'rev-e') <> 'revised' then
    raise exception 'revised history origin missing';
  end if;
  if (select snapshot -> 'freshness' ->> 'week_sequence'
      from public.floor_command_observation_handoff_revisions
      where user_id = v_owner_b and source_revision = 'rev-a') <> '1' then
    raise exception 'historical sequence was rewritten';
  end if;
  if (select last_checked_at from public.floor_command_observation_handoffs where user_id = v_owner_b) is not null then
    raise exception 'revised kept the previous check time';
  end if;

  v_result := public.test_governed_commit(
    v_owner_b,
    '2026-W45',
    'snapshot',
    null,
    'comparable',
    public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-old', 2, true)
  );
  if v_result ->> 'outcome' <> 'rejected' or v_result ->> 'reason' <> 'older_sequence' then
    raise exception 'older sequence %', v_result;
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = v_owner_b) <> 'rev-e' then
    raise exception 'older sequence replaced the snapshot';
  end if;

  begin
    update public.floor_command_observation_handoff_revisions
    set origin = 'revised'
    where user_id = v_owner_b and source_revision = 'rev-a';
    raise exception 'history update was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_history_immutable' then
        raise;
      end if;
  end;

  begin
    delete from public.floor_command_observation_handoff_revisions
    where user_id = v_owner_b and source_revision = 'rev-a';
    raise exception 'history delete was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_history_immutable' then
        raise;
      end if;
  end;

  v_open := public.open_floor_command_governed_observation(
    v_owner_c, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  if v_open ->> 'status' <> 'opened' then
    raise exception 'lease setup %', v_open;
  end if;
  v_request := (v_open ->> 'request_id')::uuid;
  v_claim := (v_open ->> 'claim_id')::uuid;
  begin
    perform public.commit_floor_command_governed_observation(
      v_owner_c, v_request, gen_random_uuid(), 'transport_failure', 'source_unavailable', null, null
    );
    raise exception 'stale claim wrote';
  exception
    when others then
      if sqlerrm <> 'floor_command_governed_observation_claim_mismatch' then
        raise;
      end if;
  end;
  if (select state from public.floor_command_observation_requests where request_id = v_request) <> 'in_progress' then
    raise exception 'stale claim changed the request';
  end if;

  update public.floor_command_observation_requests
  set claimed_at = now() - interval '20 seconds'
  where request_id = v_request;
  begin
    perform public.commit_floor_command_governed_observation(
      v_owner_c, v_request, v_claim, 'snapshot', null, 'comparable',
      public.test_governed_snapshot('2026-W45', '2026-11-02', '2026-11-08', 'rev-late', 1, true)
    );
    raise exception 'expired claim wrote';
  exception
    when others then
      if sqlerrm <> 'floor_command_governed_observation_claim_expired' then
        raise;
      end if;
  end;
  if (select state from public.floor_command_observation_requests where request_id = v_request) <> 'in_progress' then
    raise exception 'expired commit changed the request';
  end if;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = v_owner_c) <> 0 then
    raise exception 'expired commit wrote a handoff';
  end if;

  v_open := public.open_floor_command_governed_observation(
    v_owner_c, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  if v_open ->> 'status' <> 'opened' then
    raise exception 'reopen after expiry %', v_open;
  end if;
  if (select state from public.floor_command_observation_requests where request_id = v_request) <> 'failed'
     or (select reason from public.floor_command_observation_requests where request_id = v_request) <> 'lease_expired' then
    raise exception 'expired lease was not closed';
  end if;
  v_result := public.commit_floor_command_governed_observation(
    v_owner_c,
    (v_open ->> 'request_id')::uuid,
    (v_open ->> 'claim_id')::uuid,
    'transport_failure',
    'source_unavailable',
    null,
    null
  );
  if v_result ->> 'outcome' <> 'failed' then
    raise exception 'cleanup commit %', v_result;
  end if;

  v_open := public.open_floor_command_governed_observation(
    v_owner_b, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  if v_open ->> 'status' <> 'opened' then
    raise exception 'second open %', v_open;
  end if;
  v_open := public.open_floor_command_governed_observation(
    v_owner_b, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  if v_open ->> 'status' <> 'busy' then
    raise exception 'second in-flight open %', v_open;
  end if;
  if (select count(*) from public.floor_command_observation_requests
      where user_id = v_owner_b and state = 'in_progress') <> 1 then
    raise exception 'more than one in-flight request';
  end if;

  begin
    perform set_config('role', 'authenticated', true);
    perform public.open_floor_command_governed_observation(
      v_owner_a, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
    );
    raise exception 'authenticated executed open';
  exception
    when insufficient_privilege then
      null;
  end;
  perform set_config('role', 'postgres', true);

  begin
    perform set_config('role', 'authenticated', true);
    perform public.commit_floor_command_governed_observation(
      v_owner_a, gen_random_uuid(), gen_random_uuid(), 'transport_failure', 'source_unavailable', null, null
    );
    raise exception 'authenticated executed commit';
  exception
    when insufficient_privilege then
      null;
  end;
  perform set_config('role', 'postgres', true);

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('tasks', 'commitments', 'blocks', 'protected_time')
  ) then
    raise exception 'governed observation created an Orient-owned record table';
  end if;
end;
$$;

\echo ONE_SHOT_PRESERVED_OK
\echo FIRST_PUBLISHED_OK
\echo UNCHANGED_OK
\echo REVISED_HISTORY_OK
\echo UNPUBLISHED_REJECTED_OK
\echo SEQUENCE_REGRESSION_OK
\echo SEQUENCE_CONFLICT_OK
\echo FAILURE_PRESERVED_OK
\echo CLAIM_FENCE_OK
\echo UNAUTHORIZED_SQL_OK
