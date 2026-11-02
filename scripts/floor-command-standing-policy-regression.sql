-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-023
-- Lifecycle proof for an inert standing observation policy.
-- Does not call the published-week reader.

\set owner_a '11111111-1111-4111-8111-111111111111'
\set owner_b '22222222-2222-4222-8222-222222222222'
\set owner_c '33333333-3333-4333-8333-333333333333'
\set owner_d '44444444-4444-4444-8444-444444444444'
\set missing '55555555-5555-4555-8555-555555555555'

do $$
declare
  v_owner_a uuid := '11111111-1111-4111-8111-111111111111';
  v_owner_c uuid := '33333333-3333-4333-8333-333333333333';
  v_owner_d uuid := '44444444-4444-4444-8444-444444444444';
  v_missing uuid := '55555555-5555-4555-8555-555555555555';
  v_requests_before integer;
  v_result jsonb;
  v_policy jsonb;
  v_id uuid;
  v_pub jsonb;
  v_recon jsonb;
  v_open timestamptz;
  v_local date;
  v_close timestamptz;
  v_historical jsonb;
  v_src text;
begin
  select count(*) into v_requests_before from public.floor_command_observation_requests;

  v_result := public.propose_floor_command_standing_policy(
    v_missing, now(), now() + interval '30 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'unauthorized' then
    raise exception 'missing user status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_d, now(), now() + interval '30 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'unbound' then
    raise exception 'unbound status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_c, now(), now() + interval '30 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'unbound' then
    raise exception 'other store status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '30 days', 1, 2, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'invalid_window' then
    raise exception 'reconciliation cap status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '30 days', 9, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'invalid_window' then
    raise exception 'window cap status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now() - interval '2 hours', now() + interval '30 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'invalid_window' then
    raise exception 'past effective status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '30 days', 1, 1, 'MST'
  );
  if v_result->>'status' is distinct from 'timezone_invalid' then
    raise exception 'abbreviation status %', v_result->>'status';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '30 days', 1, 1, 'Pacific/Auckland'
  );
  if v_result->>'status' is distinct from 'timezone_shifts_sunday' then
    raise exception 'shifted sunday status %', v_result->>'status';
  end if;

  if (select count(*) from public.floor_command_standing_policies) <> 0 then
    raise exception 'refused proposals inserted a row';
  end if;

  v_historical := public.floor_command_standing_policy_windows(
    timestamptz '2026-10-20 00:00:00+00',
    timestamptz '2026-11-20 00:00:00+00',
    'America/Denver',
    1,
    1
  );
  if jsonb_array_length(v_historical) <> 2 then
    raise exception 'historical window count %', jsonb_array_length(v_historical);
  end if;
  if v_historical->0->>'operational_week' is distinct from '2026-W44'
     or v_historical->0->>'kind' is distinct from 'publication_opportunity'
     or (v_historical->0->>'opens_at')::timestamptz <> timestamptz '2026-10-25 12:00:00+00'
     or (v_historical->0->>'closes_at')::timestamptz <> timestamptz '2026-10-26 06:00:00+00'
     or v_historical->0->>'source_publication_assumed' is distinct from 'false'
     or v_historical->1->>'kind' is distinct from 'reconciliation_opportunity'
     or (v_historical->1->>'opens_at')::timestamptz <> timestamptz '2026-10-26 06:00:00+00'
     or (v_historical->1->>'closes_at')::timestamptz <> timestamptz '2026-10-27 06:00:00+00'
     or v_historical->1->>'outstanding_zebra_entry_known' is distinct from 'false' then
    raise exception 'historical Denver windows %', v_historical;
  end if;

  v_historical := public.floor_command_standing_policy_windows(
    timestamptz '2026-10-20 00:00:00+00',
    timestamptz '2026-11-20 00:00:00+00',
    'America/Denver',
    2,
    0
  );
  if jsonb_array_length(v_historical) <> 2
     or v_historical->1->>'operational_week' is distinct from '2026-W45'
     or (v_historical->1->>'opens_at')::timestamptz <> timestamptz '2026-11-01 12:00:00+00'
     or (v_historical->1->>'closes_at')::timestamptz <> timestamptz '2026-11-02 07:00:00+00' then
    raise exception 'second Sunday window %', v_historical;
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_historical) as item
    where item->>'kind' = 'reconciliation_opportunity'
  ) then
    raise exception 'zero reconciliation allowance still listed a reconciliation window';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '40 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'proposed' then
    raise exception 'propose status %', v_result->>'status';
  end if;
  v_policy := v_result->'policy';
  v_id := (v_policy->>'policy_id')::uuid;
  if v_policy->>'state' is distinct from 'proposed'
     or v_policy->>'authority' is distinct from 'none'
     or v_policy->>'store_number' is distinct from '2587'
     or v_policy->>'source' is distinct from 'deptsync.floor-command.orient.v1'
     or v_policy->>'purpose' is distinct from 'orient_published_week_read'
     or (v_policy->>'policy_version')::integer <> 1
     or (v_policy->>'automatic_retry_limit')::integer <> 0
     or (v_policy->>'max_publication_per_window')::integer <> 1
     or v_policy->>'writes_floor_command' is distinct from 'false'
     or v_policy->>'creates_orient_temporal_records' is distinct from 'false'
     or v_policy->>'observes_arbitrary_weeks' is distinct from 'false'
     or v_policy->>'source_publication_assumed' is distinct from 'false'
     or jsonb_array_length(v_policy->'windows') <> 2 then
    raise exception 'proposed policy %', v_policy;
  end if;

  v_pub := v_policy->'windows'->0;
  v_recon := v_policy->'windows'->1;
  v_open := (v_pub->>'opens_at')::timestamptz;
  v_local := (v_open at time zone 'America/Denver')::date;
  v_close := ((v_local + 1)::timestamp) at time zone 'America/Denver';
  if v_pub->>'kind' is distinct from 'publication_opportunity'
     or extract(dow from (v_open at time zone 'UTC'))::integer <> 0
     or (v_open at time zone 'UTC')::time <> time '12:00'
     or extract(dow from v_local)::integer <> 0
     or (v_pub->>'closes_at')::timestamptz <> v_close
     or v_pub->>'operational_week' is distinct from to_char(v_local + 1, 'IYYY') || '-W' || to_char(v_local + 1, 'IW')
     or v_pub->>'executable' is distinct from 'false'
     or v_recon->>'kind' is distinct from 'reconciliation_opportunity'
     or (v_recon->>'opens_at')::timestamptz <> v_close
     or (v_recon->>'closes_at')::timestamptz <> ((v_local + 2)::timestamp) at time zone 'America/Denver'
     or v_recon->>'requires_outstanding_zebra_entry_confirmation' is distinct from 'true'
     or v_recon->>'outstanding_zebra_entry_known' is distinct from 'false' then
    raise exception 'live windows %', v_policy->'windows';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '40 days', 1, 0, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'policy_open' then
    raise exception 'second open status %', v_result->>'status';
  end if;

  v_result := public.approve_floor_command_standing_policy(v_owner_d, v_id);
  if v_result->>'status' is distinct from 'not_found' then
    raise exception 'cross-operator approval status %', v_result->>'status';
  end if;

  v_result := public.approve_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'approved'
     or v_result->'policy'->>'authority' is distinct from 'effective'
     or v_result->'policy'->>'approved_by' is distinct from v_owner_a::text
     or v_result->'policy'->'windows'->0->>'source_publication_assumed' is distinct from 'false' then
    raise exception 'approval status %', v_result;
  end if;

  v_result := public.expire_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'still_effective'
     or v_result->'policy'->>'state' is distinct from 'approved' then
    raise exception 'early expire status %', v_result->>'status';
  end if;

  if public.claim_floor_command_controlled_pull(v_owner_a, gen_random_uuid()) is distinct from 'already_succeeded' then
    raise exception 'one-shot latch moved';
  end if;

  begin
    update public.floor_command_standing_policies
    set max_reconciliation_per_window = 0
    where policy_id = v_id;
    raise exception 'scope update was allowed';
  exception
    when others then
      if sqlerrm not like '%scope_frozen%' then
        raise;
      end if;
  end;

  begin
    delete from public.floor_command_standing_policies where policy_id = v_id;
    raise exception 'policy delete was allowed';
  exception
    when others then
      if sqlerrm not like '%history_retained%' then
        raise;
      end if;
  end;

  begin
    update public.floor_command_standing_policy_events
    set reason = 'rewritten'
    where policy_id = v_id;
    raise exception 'event update was allowed';
  exception
    when others then
      if sqlerrm not like '%events_immutable%' then
        raise;
      end if;
  end;

  if (
    select scope
    from public.floor_command_standing_policy_events
    where policy_id = v_id and event_type = 'approved'
  ) is distinct from (
    select scope
    from public.floor_command_standing_policy_events
    where policy_id = v_id and event_type = 'proposed'
  ) then
    raise exception 'approved scope differed from the proposed scope';
  end if;

  v_result := public.revoke_floor_command_standing_policy(v_owner_a, v_id, 'operator closed the grant');
  if v_result->>'status' is distinct from 'revoked'
     or v_result->'policy'->>'authority' is distinct from 'none' then
    raise exception 'revoke status %', v_result->>'status';
  end if;
  v_result := public.revoke_floor_command_standing_policy(v_owner_a, v_id, 'again');
  if v_result->>'status' is distinct from 'not_revocable' then
    raise exception 'second revoke status %', v_result->>'status';
  end if;
  v_result := public.approve_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'not_proposed' then
    raise exception 'approve after revoke status %', v_result->>'status';
  end if;

  begin
    update public.floor_command_standing_policies
    set state = 'approved', approved_at = now(), approved_by = v_owner_a, revoked_at = null, revocation_reason = null
    where policy_id = v_id;
    raise exception 'revoked policy became approved';
  exception
    when others then
      if sqlerrm not like '%transition_forbidden%' and sqlerrm not like '%scope_frozen%' then
        raise;
      end if;
  end;

  v_result := public.propose_floor_command_standing_policy(
    v_owner_a, now(), now() + interval '40 days', 1, 0, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'proposed'
     or (v_result->'policy'->>'policy_version')::integer <> 2
     or jsonb_array_length(v_result->'policy'->'windows') <> 1 then
    raise exception 'replacement proposal %', v_result;
  end if;
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  v_result := public.approve_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'approved' then
    raise exception 'replacement approval %', v_result->>'status';
  end if;
  create temp table standing_policy_expire_target (policy_id uuid);
  insert into standing_policy_expire_target values (v_id);

  v_result := public.inspect_floor_command_standing_policies(v_owner_a);
  if v_result->>'status' is distinct from 'inspected'
     or jsonb_array_length(v_result->'policies') <> 2
     or (select count(*) from jsonb_array_elements(v_result->'policies') as item where item->>'state' = 'approved') <> 1 then
    raise exception 'inspect %', v_result;
  end if;

  if (select count(*) from public.floor_command_observation_requests) <> v_requests_before then
    raise exception 'policy lifecycle wrote an observation request';
  end if;
  if (select count(*) from public.floor_command_controlled_pull_claims where user_id = v_owner_a) <> 0 then
    raise exception 'policy lifecycle took a pull claim';
  end if;

  select string_agg(prosrc, E'\n')
  into v_src
  from pg_proc
  join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where nspname = 'public'
    and proname like '%standing_policy%';
  if v_src ~* 'floor_command_observation_requests|published-week|pg_net|cron\.schedule|http_get' then
    raise exception 'standing policy function can reach a reader';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'floor_command_standing_policies'
      and column_name in ('operational_week', 'weeks', 'bearer', 'token', 'credential')
  ) then
    raise exception 'policy table has an execution or arbitrary-week column';
  end if;

  begin
    perform set_config('role', 'authenticated', true);
    perform public.propose_floor_command_standing_policy(
      v_owner_a, now(), now() + interval '30 days', 1, 1, 'America/Denver'
    );
    raise exception 'authenticated executed propose';
  exception
    when insufficient_privilege then
      null;
  end;
  perform set_config('role', 'postgres', true);

  begin
    perform set_config('role', 'authenticated', true);
    perform public.approve_floor_command_standing_policy(v_owner_a, v_id);
    raise exception 'authenticated executed approve';
  exception
    when insufficient_privilege then
      null;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;

alter table public.floor_command_standing_policies disable trigger floor_command_standing_policies_guard;
update public.floor_command_standing_policies
set expires_at = now() - interval '1 millisecond'
where policy_id = (select policy_id from standing_policy_expire_target)
  and now() - interval '1 millisecond' > effective_at;
alter table public.floor_command_standing_policies enable trigger floor_command_standing_policies_guard;

do $$
declare
  v_owner_a uuid := '11111111-1111-4111-8111-111111111111';
  v_id uuid;
  v_result jsonb;
  v_requests integer;
begin
  select policy_id into v_id from standing_policy_expire_target;
  if (select expires_at <= now() from public.floor_command_standing_policies where policy_id = v_id) is not true then
    raise exception 'expiry instant was not moved before now()';
  end if;
  v_result := public.expire_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'expired'
     or v_result->'policy'->>'authority' is distinct from 'none' then
    raise exception 'expire status %', v_result->>'status';
  end if;
  if (
    select scope from public.floor_command_standing_policy_events
    where policy_id = v_id and event_type = 'expired'
  ) is distinct from (
    select scope from public.floor_command_standing_policy_events
    where policy_id = v_id and event_type = 'approved'
  ) then
    raise exception 'expired scope differed from the approved scope';
  end if;
  v_result := public.approve_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'not_proposed' then
    raise exception 'approve after expire status %', v_result->>'status';
  end if;
  v_result := public.expire_floor_command_standing_policy(v_owner_a, v_id);
  if v_result->>'status' is distinct from 'not_expirable' then
    raise exception 'second expire status %', v_result->>'status';
  end if;
  begin
    update public.floor_command_standing_policies
    set state = 'approved', expired_at = null
    where policy_id = v_id;
    raise exception 'expired policy became approved';
  exception
    when others then
      if sqlerrm not like '%transition_forbidden%' and sqlerrm not like '%scope_frozen%' and sqlerrm not like '%expiry_invalid%' then
        raise;
      end if;
  end;
  v_result := public.inspect_floor_command_standing_policies(v_owner_a);
  if (select count(*) from jsonb_array_elements(v_result->'policies') as item where item->>'state' = 'expired' and item->>'authority' = 'none') <> 1 then
    raise exception 'expired policy was not retained';
  end if;
  select count(*) into v_requests from public.floor_command_observation_requests;
  if v_requests <> 0 then
    raise exception 'expiry wrote an observation request';
  end if;
end;
$$;

\echo UNAUTHORIZED_POLICY_OK
\echo INVALID_SCOPE_OK
\echo APPROVAL_EXPLICIT_OK
\echo REVOKE_DURABLE_OK
\echo EXPIRE_TERMINAL_OK
\echo SCOPE_FROZEN_OK
\echo NO_OBSERVATION_REQUEST_OK
\echo NO_SOURCE_READ_OK
\echo WINDOWS_LOCAL_OK
