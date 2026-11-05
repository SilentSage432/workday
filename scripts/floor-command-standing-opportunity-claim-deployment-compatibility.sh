#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-030
# Ephemeral dark-deployment compatibility proof for
# 20261103160000_floor_command_standing_opportunity_claims.sql
# Preserves the recorded W44 ledger and standing-policy lifecycle.
# Does not contact hosted Orient or Floor Command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
POLICY="$ROOT/supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql"
OPPORTUNITY="$ROOT/supabase/migrations/20261103160000_floor_command_standing_opportunity_claims.sql"
PORT="${ORIENT_PG_STANDING_CLAIM_DEPLOY_PORT:-55459}"
TMP="$(mktemp -d /tmp/orient-floor-command-030-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
command -v rg >/dev/null
test -f "$POLICY"
test -f "$OPPORTUNITY"

if rg -n "alter table public\\.floor_command_observation_|drop table|truncate " "$OPPORTUNITY" >/dev/null; then
  echo "opportunity migration touches an existing observation table" >&2
  exit 1
fi
if rg -n "alter table public\\.floor_command_standing_policies|drop table public\\.floor_command_standing" "$OPPORTUNITY" >/dev/null; then
  echo "opportunity migration rewrites standing-policy tables" >&2
  exit 1
fi
# Comments may name forbidden symbols. Function bodies are scanned after apply.
if rg -n "http_get|pg_net|cron\.schedule|/api/integrations/floor-command/published-week" "$OPPORTUNITY" >/dev/null; then
  echo "opportunity migration contains execution side effects" >&2
  exit 1
fi

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_claim_deploy;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_claim_deploy -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" <<'SQL'
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.tasks (id integer primary key);
create table public.commitments (id integer primary key);
create table public.blocks (id integer primary key);
create table public.protected_time (id integer primary key);
insert into public.tasks (id) select generate_series(1, 39);
insert into public.commitments (id) select generate_series(1, 2);
SQL

"${PSQL[@]}" -f "$BASE"
"${PSQL[@]}" -f "$SEQUENCE"
"${PSQL[@]}" -f "$APPROVAL"
"${PSQL[@]}" -f "$CLAIM"

OWNER="a499dd01-095e-4bb0-8db9-c284c34a2ab2"
"${PSQL[@]}" <<SQL
insert into auth.users (id) values ('${OWNER}');
insert into auth.users (id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select public.bind_floor_command_observation(
  '${OWNER}', '2587',
  'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
insert into public.floor_command_observation_attempts (
  user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at
) values (
  '${OWNER}',
  '2026-10-29T00:40:17.666Z', 'success_complete', null, '2026-10-29T00:40:17.666Z'
);
insert into public.floor_command_observation_handoffs (
  user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
  source_revision, source_updated_at, last_successful_observed_at, deadlines_availability,
  snapshot, superseded_assignments, retained_deadlines
) values (
  '${OWNER}',
  'fc.zebra-handoff.2587.2026-W44', '2587', '2026-W44', '2026-10-26', '2026-11-01',
  'c3a29fab9de35ca0', '2026-10-29T00:40:17.666Z', '2026-10-29T00:40:17.666Z', 'ready',
  jsonb_build_object(
    'source', 'deptsync.floor-command.orient.v1',
    'store_number', '2587',
    'operational_week', '2026-W44',
    'publication', jsonb_build_object('status', 'published'),
    'handoff', jsonb_build_object(
      'id', 'fc.zebra-handoff.2587.2026-W44',
      'deadline_date', '2026-10-26',
      'required_count', 9, 'confirmed_count', 6, 'outstanding_count', 3, 'status', 'partial'
    ),
    'freshness', jsonb_build_object('revision', 'c3a29fab9de35ca0', 'week_sequence', 8, 'read_at', '2026-10-29T00:40:17.666Z')
  ),
  '[]'::jsonb,
  '[]'::jsonb
);
SQL

"${PSQL[@]}" -1 -f "$GOVERNED"
"${PSQL[@]}" <<'SQL'
update public.floor_command_observation_handoffs
set last_checked_at = '2026-10-30T13:55:56.99807Z',
    checked_sequence = null
where handoff_id = 'fc.zebra-handoff.2587.2026-W44';

insert into public.floor_command_observation_requests (
  request_id, user_id, claim_id, store_number, source, purpose, operational_week,
  state, reason, seen_sequence, seen_revision,
  previous_observed_at, previous_sequence, previous_revision,
  claimed_at, terminal_at, created_at
) values (
  '879a61f2-6179-479b-a9ad-15f150db44d3',
  'a499dd01-095e-4bb0-8db9-c284c34a2ab2',
  '00000000-0000-4000-8000-000000000244',
  '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read', '2026-W44',
  'unchanged', null, 8, 'c3a29fab9de35ca0',
  null, null, null,
  '2026-10-30T13:55:53.192942Z', '2026-10-30T13:55:56.99807Z', '2026-10-30T13:55:53.192942Z'
);
SQL

"${PSQL[@]}" -1 -f "$POLICY"

# One historical revoked policy matching production shape.
"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
  v_result jsonb;
  v_id uuid;
begin
  v_result := public.propose_floor_command_standing_policy(
    v_user, now(), now() + interval '7 days', 1, 0, 'America/Boise'
  );
  if v_result->>'status' is distinct from 'proposed' then
    raise exception 'fixture propose %', v_result;
  end if;
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  perform public.approve_floor_command_standing_policy(v_user, v_id);
  perform public.revoke_floor_command_standing_policy(v_user, v_id, 'RELEASE-030 historical revoked fixture');
  if (select count(*) from public.floor_command_standing_policies where state = 'revoked') <> 1 then
    raise exception 'expected one revoked policy';
  end if;
  if (select count(*) from public.floor_command_standing_policies where state = 'approved') <> 0 then
    raise exception 'expected zero approved policies';
  end if;
end $$;
SQL

"${PSQL[@]}" <<'SQL'
create table public.deploy_030_before as
select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(p.prosrc) as src
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';
SQL

assert_ledger() {
  "${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
begin
  if (select count(*) from public.floor_command_observation_requests) <> 1 then
    raise exception 'request count';
  end if;
  if not exists (
    select 1 from public.floor_command_observation_requests
    where request_id = '879a61f2-6179-479b-a9ad-15f150db44d3'
      and state = 'unchanged' and seen_sequence = 8
      and seen_revision = 'c3a29fab9de35ca0'
  ) then
    raise exception 'request identity';
  end if;
  if not exists (
    select 1 from public.floor_command_observation_handoffs
    where handoff_id = 'fc.zebra-handoff.2587.2026-W44'
      and source_revision = 'c3a29fab9de35ca0'
      and snapshot -> 'freshness' ->> 'week_sequence' = '8'
  ) then
    raise exception 'handoff identity';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = v_user)
     is distinct from 'success_complete' then
    raise exception 'latch';
  end if;
  if exists (select 1 from public.floor_command_controlled_pull_claims) then
    raise exception 'pull claims present';
  end if;
  if (select count(*) from public.tasks) <> 39
     or (select count(*) from public.commitments) <> 2
     or (select count(*) from public.blocks) <> 0
     or (select count(*) from public.protected_time) <> 0 then
    raise exception 'temporal counts';
  end if;
end $$;
SQL
}

assert_ledger
echo "LEDGER_BEFORE_OK"

"${PSQL[@]}" -1 -f "$OPPORTUNITY"
echo "MIGRATION_ONCE_OK"

assert_ledger
echo "LEDGER_PRESERVED_OK"

"${PSQL[@]}" <<'SQL'
do $$
declare
  v_priv text;
  v_count integer;
begin
  if not public.floor_command_standing_execution_gate_is_open() is false then
    raise exception 'gate not default disabled';
  end if;
  if (select enabled from public.floor_command_standing_execution_gate
      where gate_key = 'standing_opportunity_claim') is distinct from false then
    raise exception 'gate row not false';
  end if;
  if (select count(*) from public.floor_command_standing_opportunity_claims) <> 0 then
    raise exception 'claims not empty after migration';
  end if;
  if (select count(*) from public.floor_command_standing_policies where state = 'approved') <> 0 then
    raise exception 'approved policies appeared';
  end if;
  if (select count(*) from public.floor_command_standing_policies where state = 'revoked') <> 1 then
    raise exception 'revoked historical policy lost';
  end if;

  -- Grants: no DML for app roles on claim/gate tables.
  select string_agg(privilege_type, ',' order by privilege_type)
  into v_priv
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'floor_command_standing_opportunity_claims'
    and grantee in ('anon', 'authenticated', 'service_role');
  if v_priv is distinct from 'SELECT'
     and v_priv is distinct from 'SELECT,SELECT' then
    -- authenticated + service_role select only
    if exists (
      select 1 from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'floor_command_standing_opportunity_claims'
        and grantee in ('anon', 'authenticated', 'service_role')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
    ) then
      raise exception 'claims table has mutation grants %', v_priv;
    end if;
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'floor_command_standing_execution_gate'
      and grantee in ('anon', 'authenticated', 'service_role')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) then
    raise exception 'gate table has mutation grants';
  end if;

  if has_function_privilege('authenticated', 'public.claim_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'authenticated can execute claim';
  end if;
  if not has_function_privilege('service_role', 'public.claim_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'service_role missing claim execute';
  end if;
  if has_function_privilege('authenticated', 'public.revalidate_floor_command_standing_opportunity_claim(uuid,uuid,timestamptz)', 'EXECUTE') then
    raise exception 'authenticated can execute revalidate';
  end if;
  if not has_function_privilege('service_role', 'public.revalidate_floor_command_standing_opportunity_claim(uuid,uuid,timestamptz)', 'EXECUTE') then
    raise exception 'service_role missing revalidate execute';
  end if;
end $$;
SQL
echo "GATE_DEFAULT_AND_GRANTS_OK"

# Existing public function bodies for observation/policy must be unchanged.
"${PSQL[@]}" <<'SQL'
do $$
declare
  v_changed integer;
begin
  select count(*) into v_changed
  from public.deploy_030_before b
  join pg_proc p on p.proname = b.proname
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where pg_get_function_identity_arguments(p.oid) = b.args
    and md5(p.prosrc) is distinct from b.src
    and b.proname not like 'floor_command_standing_opportunity%'
    and b.proname not like 'floor_command_standing_execution%'
    and b.proname not like 'floor_command_standing_claim%'
    and b.proname not like 'floor_command_standing_reconciliation%';
  if v_changed <> 0 then
    raise exception 'existing function bodies changed: %', v_changed;
  end if;
end $$;
SQL
echo "EXISTING_FUNCTIONS_UNCHANGED_OK"

# Gate combinations. Pull flag is application env only; claim SQL never reads it.
# Simulate "pull-only" by leaving standing gate disabled and asserting gate_disabled.
"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
  v_result jsonb;
  v_id uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim_id uuid;
begin
  perform set_config('orient.standing_claim_test_hooks', '1', false);

  -- Both gates effectively closed for standing claims (standing gate false;
  -- pull flag is not consulted by claim functions).
  if public.floor_command_standing_execution_gate_is_open() then
    raise exception 'gate unexpectedly open';
  end if;

  v_result := public.propose_floor_command_standing_policy(
    v_user, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  if v_result->>'status' is distinct from 'proposed' then
    raise exception 'propose %', v_result;
  end if;
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  v_version := (v_result->'policy'->>'policy_version')::integer;
  v_week := v_result->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  perform public.approve_floor_command_standing_policy(v_user, v_id);

  -- Pull-flag-only simulation: standing gate still false.
  v_result := public.claim_floor_command_standing_opportunity(
    v_user, v_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'gate_disabled' then
    raise exception 'pull-only simulation expected gate_disabled got %', v_result->>'status';
  end if;

  -- Standing gate only: enable durable gate. Full predicate still required.
  update public.floor_command_standing_execution_gate
  set enabled = true, note = '030 local standing-only'
  where gate_key = 'standing_opportunity_claim';

  -- Wrong week still refused even with gate on (both-gates-on simulation also
  -- cannot bypass predicate; pull flag remains irrelevant here).
  v_result := public.claim_floor_command_standing_opportunity(
    v_user, v_id, v_version, '1999-W01', 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'outside_window' then
    raise exception 'gate on still requires window %', v_result->>'status';
  end if;

  v_result := public.claim_floor_command_standing_opportunity(
    v_user, v_id, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_result->>'status' is distinct from 'claimed' then
    raise exception 'standing-only claim %', v_result;
  end if;
  v_claim_id := (v_result->'claim'->>'claim_id')::uuid;

  -- Revalidate while approved.
  v_result := public.revalidate_floor_command_standing_opportunity_claim(v_user, v_claim_id, v_as_of);
  if v_result->>'status' is distinct from 'still_authorized' then
    raise exception 'revalidate %', v_result;
  end if;

  -- Disable gate between claim and revalidate.
  update public.floor_command_standing_execution_gate
  set enabled = false, note = '030 gate closed after claim'
  where gate_key = 'standing_opportunity_claim';
  v_result := public.revalidate_floor_command_standing_opportunity_claim(v_user, v_claim_id, v_as_of);
  if v_result->>'status' is distinct from 'authorization_revoked' then
    raise exception 'gate close revalidate %', v_result;
  end if;

  perform public.revoke_floor_command_standing_policy(v_user, v_id, 'RELEASE-030 close gate combo fixture');

  -- Approval alone never claims.
  if (select count(*) from public.floor_command_standing_opportunity_claims
      where policy_id = v_id and authority_status = 'claimed') <> 0 then
    raise exception 'open claimed rows remain after close';
  end if;
end $$;
SQL
echo "GATE_COMBINATIONS_OK"

# Policy lifecycle remains intact; approval does not create claims when gate off.
"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
  v_result jsonb;
  v_id uuid;
  v_claims_before integer;
  v_requests_before integer;
begin
  update public.floor_command_standing_execution_gate
  set enabled = false
  where gate_key = 'standing_opportunity_claim';
  select count(*) into v_claims_before from public.floor_command_standing_opportunity_claims;
  select count(*) into v_requests_before from public.floor_command_observation_requests;

  v_result := public.propose_floor_command_standing_policy(
    v_user, now(), now() + interval '14 days', 1, 0, 'America/Boise'
  );
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  perform public.approve_floor_command_standing_policy(v_user, v_id);
  if (select count(*) from public.floor_command_standing_opportunity_claims) <> v_claims_before then
    raise exception 'approve created claims';
  end if;
  if (select count(*) from public.floor_command_observation_requests) <> v_requests_before then
    raise exception 'approve created requests';
  end if;
  perform public.revoke_floor_command_standing_policy(v_user, v_id, 'RELEASE-030 lifecycle inert');
end $$;
SQL
echo "POLICY_LIFECYCLE_INERT_OK"

assert_ledger
echo "LEDGER_AFTER_LIFECYCLE_OK"

# Second apply stops.
if "${PSQL[@]}" -1 -f "$OPPORTUNITY" >/tmp/orient-030-second-apply.txt 2>&1; then
  echo "second apply unexpectedly succeeded" >&2
  exit 1
fi
if ! rg -q "already exists|duplicate key|floor_command_standing_execution_gate" /tmp/orient-030-second-apply.txt; then
  echo "second apply failed for unexpected reason:" >&2
  cat /tmp/orient-030-second-apply.txt >&2
  exit 1
fi
echo "SECOND_APPLY_STOPPED_OK"
assert_ledger

# Failed transaction leaves no partial claim objects when wrapping create in a txn
# on a clean database clone is heavy; instead prove claim insert rolls back.
"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
  v_result jsonb;
  v_id uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
begin
  perform set_config('orient.standing_claim_test_hooks', '1', false);
  update public.floor_command_standing_execution_gate set enabled = true
  where gate_key = 'standing_opportunity_claim';
  v_result := public.propose_floor_command_standing_policy(
    v_user, now(), now() + interval '21 days', 1, 0, 'America/Boise'
  );
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  v_version := (v_result->'policy'->>'policy_version')::integer;
  v_week := v_result->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';
  perform public.approve_floor_command_standing_policy(v_user, v_id);
  begin
    perform public.claim_floor_command_standing_opportunity(
      v_user, v_id, v_version, v_week, 'publication_opportunity', v_as_of
    );
    raise exception 'rollback_probe';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'rollback_probe' then
        raise;
      end if;
  end;
  if exists (
    select 1 from public.floor_command_standing_opportunity_claims where policy_id = v_id
  ) then
    raise exception 'partial claim survived rollback';
  end if;
  perform public.revoke_floor_command_standing_policy(v_user, v_id, 'RELEASE-030 rollback fixture');
  update public.floor_command_standing_execution_gate set enabled = false
  where gate_key = 'standing_opportunity_claim';
end $$;
SQL
echo "FAILED_TRANSACTION_ROLLED_BACK_OK"

# Unique constraint present.
"${PSQL[@]}" -t -A -c "
select 1 from pg_constraint
where conname = 'floor_command_standing_opportunity_claims_unique';
" | grep -q 1
echo "UNIQUE_CONSTRAINT_OK"

# Final dark posture.
"${PSQL[@]}" <<'SQL'
do $$
begin
  if public.floor_command_standing_execution_gate_is_open() then
    raise exception 'gate left enabled';
  end if;
  if exists (
    select 1 from public.floor_command_standing_policies where state in ('proposed', 'approved')
  ) then
    raise exception 'open policy remains';
  end if;
  if exists (
    select 1 from public.floor_command_standing_opportunity_claims where authority_status = 'claimed'
  ) then
    raise exception 'open claim remains';
  end if;
  if (select count(*) from public.floor_command_observation_requests) <> 1 then
    raise exception 'request ledger drifted';
  end if;
end $$;
SQL
echo "DARK_POSTURE_OK"
echo "STANDING_OPPORTUNITY_CLAIM_DEPLOYMENT_COMPATIBILITY_OK"
