#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-024
# Ephemeral proof that the standing-policy migration preserves the recorded
# 2026-W44 ledger and does not replace existing observation functions.
# The handoff snapshot is an identity fixture, not the nine production assignments.
# claim_id is a stand-in: RELEASE-019 did not record one, and no claim row is inserted.
# Does not contact a hosted database or Floor Command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
POLICY="$ROOT/supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql"
PORT="${ORIENT_PG_STANDING_DEPLOY_PORT:-55457}"
TMP="$(mktemp -d /tmp/orient-floor-command-024-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
test -f "$POLICY"

if rg -n "alter table public\\.floor_command_observation_|drop table|truncate " "$POLICY" >/dev/null; then
  echo "policy migration touches an existing observation table" >&2
  exit 1
fi

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create database floor_command_policy_deploy;
create database floor_command_policy_rollback;
SQL

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_deploy -v ON_ERROR_STOP=1 -q)

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

"${PSQL[@]}" <<'SQL'
insert into auth.users (id) values ('a499dd01-095e-4bb0-8db9-c284c34a2ab2');
insert into auth.users (id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select public.bind_floor_command_observation(
  'a499dd01-095e-4bb0-8db9-c284c34a2ab2', '2587',
  'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
insert into public.floor_command_observation_attempts (
  user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at
) values (
  'a499dd01-095e-4bb0-8db9-c284c34a2ab2',
  '2026-10-29T00:40:17.666Z', 'success_complete', null, '2026-10-29T00:40:17.666Z'
);
insert into public.floor_command_observation_handoffs (
  user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
  source_revision, source_updated_at, last_successful_observed_at, deadlines_availability,
  snapshot, superseded_assignments, retained_deadlines
) values (
  'a499dd01-095e-4bb0-8db9-c284c34a2ab2',
  'fc.zebra-handoff.2587.2026-W44', '2587', '2026-W44', '2026-10-26', '2026-11-01',
  'c3a29fab9de35ca0', '2026-10-29T00:40:17.666Z', '2026-10-29T00:40:17.666Z', 'ready',
  jsonb_build_object(
    'source', 'deptsync.floor-command.orient.v1',
    'store_number', '2587',
    'operational_week', '2026-W44',
    'publication', jsonb_build_object('status', 'published'),
    'handoff', jsonb_build_object('id', 'fc.zebra-handoff.2587.2026-W44', 'required_count', 9, 'confirmed_count', 6, 'outstanding_count', 3),
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
where user_id = 'a499dd01-095e-4bb0-8db9-c284c34a2ab2'
  and handoff_id = 'fc.zebra-handoff.2587.2026-W44';

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

create table public.deploy_024_proc as
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
    select 1
    from public.floor_command_observation_requests
    where request_id = '879a61f2-6179-479b-a9ad-15f150db44d3'
      and user_id = v_user
      and state = 'unchanged'
      and reason is null
      and seen_sequence = 8
      and seen_revision = 'c3a29fab9de35ca0'
      and previous_sequence is null
      and previous_revision is null
      and claimed_at = timestamptz '2026-10-30T13:55:53.192942Z'
      and terminal_at = timestamptz '2026-10-30T13:55:56.99807Z'
  ) then
    raise exception 'request identity';
  end if;
  if not exists (
    select 1
    from public.floor_command_observation_handoffs
    where user_id = v_user
      and handoff_id = 'fc.zebra-handoff.2587.2026-W44'
      and store_number = '2587'
      and operational_week = '2026-W44'
      and source_revision = 'c3a29fab9de35ca0'
      and snapshot -> 'freshness' ->> 'week_sequence' = '8'
      and snapshot -> 'freshness' ->> 'revision' = 'c3a29fab9de35ca0'
      and last_successful_observed_at = timestamptz '2026-10-29T00:40:17.666Z'
      and last_checked_at = timestamptz '2026-10-30T13:55:56.99807Z'
      and checked_sequence is null
  ) then
    raise exception 'handoff identity';
  end if;
  if (select count(*) from public.floor_command_observation_handoff_revisions) <> 1 then
    raise exception 'history count';
  end if;
  if not exists (
    select 1
    from public.floor_command_observation_handoff_revisions
    where user_id = v_user
      and handoff_id = 'fc.zebra-handoff.2587.2026-W44'
      and origin = 'one_shot'
      and source_revision = 'c3a29fab9de35ca0'
      and source_sequence = 8
      and observed_at = timestamptz '2026-10-29T00:40:17.666Z'
  ) then
    raise exception 'history identity';
  end if;
  if (select snapshot = (select snapshot from public.floor_command_observation_handoffs)
        and superseded_assignments = (select superseded_assignments from public.floor_command_observation_handoffs)
        and retained_deadlines = (select retained_deadlines from public.floor_command_observation_handoffs)
      from public.floor_command_observation_handoff_revisions) is not true then
    raise exception 'history copy drifted';
  end if;
  if not exists (
    select 1
    from public.floor_command_observation_attempts
    where user_id = v_user
      and last_attempt_result = 'success_complete'
      and last_attempt_reason is null
      and last_attempted_at = timestamptz '2026-10-29T00:40:17.666Z'
      and last_successful_observed_at = timestamptz '2026-10-29T00:40:17.666Z'
  ) then
    raise exception 'attempt identity';
  end if;
  if public.claim_floor_command_controlled_pull(v_user, gen_random_uuid()) is distinct from 'already_succeeded' then
    raise exception 'latch opened';
  end if;
  if (select count(*) from public.floor_command_controlled_pull_claims) <> 0 then
    raise exception 'claim row created';
  end if;
  if (select count(*) from public.tasks) <> 39
     or (select count(*) from public.commitments) <> 2
     or (select count(*) from public.blocks) <> 0
     or (select count(*) from public.protected_time) <> 0 then
    raise exception 'orient-owned counts changed';
  end if;
end $$;
SQL
}

assert_ledger
echo "LEDGER_BEFORE_OK"

"${PSQL[@]}" -1 -f "$POLICY"
echo "MIGRATION_ONCE_OK"

assert_ledger
echo "LEDGER_PRESERVED_OK"

"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
  v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_windows jsonb;
  v_pub jsonb;
  v_recon jsonb;
  v_result jsonb;
  v_id uuid;
  v_before text;
  v_after text;
begin
  if exists (
    select 1
    from public.deploy_024_proc saved
    join pg_proc p on p.proname = saved.proname
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where pg_get_function_identity_arguments(p.oid) = saved.args
      and md5(p.prosrc) is distinct from saved.src
  ) or (
    select count(*) from public.deploy_024_proc
  ) <> (
    select count(*)
    from public.deploy_024_proc saved
    join pg_proc p on p.proname = saved.proname
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where pg_get_function_identity_arguments(p.oid) = saved.args
      and md5(p.prosrc) is not distinct from saved.src
  ) then
    raise exception 'existing function body replaced';
  end if;

  v_windows := public.floor_command_standing_policy_windows(
    '2026-10-25 12:00:00+00', '2026-10-27 06:00:00+00', 'America/Denver', 1, 1
  );
  select value into v_pub from jsonb_array_elements(v_windows) value where value->>'kind' = 'publication_opportunity';
  select value into v_recon from jsonb_array_elements(v_windows) value where value->>'kind' = 'reconciliation_opportunity';
  if (v_pub->>'operational_week') is distinct from '2026-W44'
     or (v_pub->>'opens_at')::timestamptz is distinct from '2026-10-25 12:00:00+00'
     or (v_pub->>'closes_at')::timestamptz is distinct from '2026-10-26 06:00:00+00'
     or (v_pub->>'source_publication_assumed') is distinct from 'false'
     or (v_pub->>'executable') is distinct from 'false'
     or (v_recon->>'opens_at')::timestamptz is distinct from '2026-10-26 06:00:00+00'
     or (v_recon->>'closes_at')::timestamptz is distinct from '2026-10-27 06:00:00+00' then
    raise exception 'mdt window %', v_windows;
  end if;

  v_windows := public.floor_command_standing_policy_windows(
    '2026-11-01 12:00:00+00', '2026-11-03 07:00:00+00', 'America/Denver', 1, 1
  );
  select value into v_pub from jsonb_array_elements(v_windows) value where value->>'kind' = 'publication_opportunity';
  select value into v_recon from jsonb_array_elements(v_windows) value where value->>'kind' = 'reconciliation_opportunity';
  if (v_pub->>'operational_week') is distinct from '2026-W45'
     or (v_pub->>'opens_at')::timestamptz is distinct from '2026-11-01 12:00:00+00'
     or (v_pub->>'closes_at')::timestamptz is distinct from '2026-11-02 07:00:00+00'
     or (v_recon->>'closes_at')::timestamptz is distinct from '2026-11-03 07:00:00+00' then
    raise exception 'mst window %', v_windows;
  end if;

  select string_agg(request_id::text || state || coalesce(seen_revision, '') || terminal_at::text, ',' order by request_id)
    || '|' || (select last_checked_at::text || source_revision from public.floor_command_observation_handoffs)
  into v_before
  from public.floor_command_observation_requests;

  v_result := public.propose_floor_command_standing_policy(
    v_user, now(), now() + interval '40 days', 1, 1, 'America/Denver'
  );
  if v_result->>'status' is distinct from 'proposed'
     or v_result->'policy'->>'store_number' is distinct from '2587'
     or v_result->'policy'->>'automatic_retry_limit' is distinct from '0'
     or v_result->'policy'->'windows'->0->>'executable' is distinct from 'false'
     or v_result->'policy'->'windows'->0->>'source_publication_assumed' is distinct from 'false' then
    raise exception 'propose %', v_result;
  end if;
  v_id := (v_result->'policy'->>'policy_id')::uuid;
  if (select count(*) from public.floor_command_observation_requests) <> 1 then
    raise exception 'propose wrote a request';
  end if;

  v_result := public.approve_floor_command_standing_policy(v_user, v_id);
  if v_result->>'status' is distinct from 'approved' or v_result->'policy'->>'authority' is distinct from 'effective' then
    raise exception 'approve %', v_result->>'status';
  end if;
  v_result := public.inspect_floor_command_standing_policies(v_user);
  if v_result->>'status' is distinct from 'inspected' or jsonb_array_length(v_result->'policies') <> 1 then
    raise exception 'inspect %', v_result->>'status';
  end if;
  v_result := public.revoke_floor_command_standing_policy(v_user, v_id, 'deployment proof closed the local grant');
  if v_result->>'status' is distinct from 'revoked' or v_result->'policy'->>'authority' is distinct from 'none' then
    raise exception 'revoke %', v_result->>'status';
  end if;
  v_result := public.approve_floor_command_standing_policy(v_user, v_id);
  if v_result->>'status' is distinct from 'not_proposed' then
    raise exception 'revoked grant regained approval %', v_result->>'status';
  end if;

  select string_agg(request_id::text || state || coalesce(seen_revision, '') || terminal_at::text, ',' order by request_id)
    || '|' || (select last_checked_at::text || source_revision from public.floor_command_observation_handoffs)
  into v_after
  from public.floor_command_observation_requests;
  if v_before is distinct from v_after then
    raise exception 'lifecycle changed the ledger';
  end if;
  if (select count(*) from public.floor_command_standing_policies where state = 'approved') <> 0 then
    raise exception 'an approved grant remained';
  end if;

  begin
    execute 'set local role service_role';
    update public.floor_command_standing_policies
    set revocation_reason = 'rewritten by service role'
    where policy_id = v_id;
    raise exception 'service role updated a policy';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    execute 'set local role service_role';
    insert into public.floor_command_standing_policies (
      user_id, policy_version, state, source, store_number, purpose, time_zone,
      effective_at, expires_at, max_publication_windows, max_reconciliation_per_window
    ) values (
      v_user, 9, 'approved', 'deptsync.floor-command.orient.v1', '2587', 'orient_published_week_read',
      'America/Denver', now(), now() + interval '30 days', 1, 0
    );
    raise exception 'service role inserted a policy';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform set_config('role', 'authenticated', true);
    perform public.propose_floor_command_standing_policy(
      v_user, now(), now() + interval '30 days', 1, 0, 'America/Denver'
    );
    raise exception 'authenticated executed propose';
  exception
    when insufficient_privilege then
      null;
  end;
  perform set_config('role', 'postgres', true);

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config('role', 'authenticated', true);
  if (select count(*) from public.floor_command_standing_policies) <> 0 then
    raise exception 'other operator saw the grant';
  end if;
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('role', 'authenticated', true);
  if (select count(*) from public.floor_command_standing_policies) <> 1 then
    raise exception 'owner could not see the retained grant';
  end if;
  perform set_config('role', 'postgres', true);
end $$;
SQL

assert_ledger
echo "LIFECYCLE_INERT_OK"
echo "WINDOWS_DENVER_OK"
echo "EXISTING_FUNCTIONS_UNCHANGED_OK"
echo "DIRECT_WRITE_REFUSED_OK"

set +e
"${PSQL[@]}" -f "$POLICY" >"$TMP/rerun.txt" 2>&1
rerun_status=$?
set -e
if [[ "$rerun_status" -eq 0 ]]; then
  echo "second apply unexpectedly succeeded" >&2
  exit 1
fi
if ! rg -q "already exists" "$TMP/rerun.txt"; then
  echo "unexpected second-apply error:" >&2
  cat "$TMP/rerun.txt" >&2
  exit 1
fi
assert_ledger
echo "SECOND_APPLY_STOPPED_OK"

psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -q <<'SQL'
create extension if not exists pgcrypto;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
SQL
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -q -f "$BASE" >/dev/null
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -q -f "$SEQUENCE" >/dev/null
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -q -f "$APPROVAL" >/dev/null
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -q -f "$CLAIM" >/dev/null

set +e
{
  cat "$POLICY"
  echo "do \$\$ begin raise exception 'deployment_024_forced_failure'; end \$\$;"
} | psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -v ON_ERROR_STOP=1 -1 -q >"$TMP/rollback.txt" 2>&1
rollback_status=$?
set -e
if [[ "$rollback_status" -eq 0 ]]; then
  echo "forced failure unexpectedly committed" >&2
  exit 1
fi
if ! rg -q "deployment_024_forced_failure" "$TMP/rollback.txt"; then
  echo "unexpected rollback error:" >&2
  cat "$TMP/rollback.txt" >&2
  exit 1
fi
left="$(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_policy_rollback -t -A -c "select to_regclass('public.floor_command_standing_policies')")"
if [[ -n "$left" && "$left" != " " ]]; then
  echo "partial migration left ${left}" >&2
  exit 1
fi
echo "FAILED_TRANSACTION_ROLLED_BACK_OK"
echo "DEPLOYMENT_COMPATIBILITY_OK"
