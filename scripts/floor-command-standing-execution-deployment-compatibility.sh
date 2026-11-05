#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-034
# Ephemeral upgrade proof: apply 20261103210000 after the hosted 20261103160000 baseline.
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
LINK="$ROOT/supabase/migrations/20261103210000_floor_command_standing_opportunity_observation_link.sql"
HARDEN="$ROOT/supabase/migrations/20261104180000_floor_command_standing_attempt_reauth_and_inspect.sql"
PORT="${ORIENT_PG_STANDING_EXEC_DEPLOY_PORT:-55460}"
TMP="$(mktemp -d /tmp/orient-floor-command-034-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
command -v rg >/dev/null
test -f "$OPPORTUNITY"
test -f "$LINK"
test -f "$HARDEN"

# Static migration safety
if rg -n "alter table|drop table|truncate |drop function|create table" "$LINK" >/dev/null; then
  echo "link migration rewrites schema beyond additive functions" >&2
  exit 1
fi
if rg -n "http_get|pg_net|cron\\.schedule|published-week|fetch\\(|ORIENT_FLOOR_COMMAND_PULL" "$LINK" >/dev/null; then
  echo "link migration contains execution side effects" >&2
  exit 1
fi
if rg -n "enabled\\s*=\\s*true|update public\\.floor_command_standing_execution_gate" "$LINK" >/dev/null; then
  echo "link migration mutates the standing-execution gate" >&2
  exit 1
fi
if rg -n "alter table|drop table|truncate |create table" "$HARDEN" >/dev/null; then
  echo "harden migration rewrites tables" >&2
  exit 1
fi
if rg -n "http_get|pg_net|cron\.schedule|published-week|fetch\(|ORIENT_FLOOR_COMMAND_PULL" "$HARDEN" >/dev/null; then
  echo "harden migration contains execution side effects" >&2
  exit 1
fi
if rg -n "enabled\s*=\s*true|update public\.floor_command_standing_execution_gate" "$HARDEN" >/dev/null; then
  echo "harden migration mutates the standing-execution gate" >&2
  exit 1
fi

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_exec_deploy;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_exec_deploy -v ON_ERROR_STOP=1 -q)

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
REQ="879a61f2-6179-479b-a9ad-15f150db44d3"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values ('${OWNER}');
select public.bind_floor_command_observation(
  '${OWNER}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
insert into public.floor_command_observation_attempts (
  user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at
) values (
  '${OWNER}', '2026-10-29T00:40:17.666Z', 'success_complete', null, '2026-10-29T00:40:17.666Z'
);
SQL

"${PSQL[@]}" -f "$GOVERNED"
"${PSQL[@]}" -f "$POLICY"
"${PSQL[@]}" -f "$OPPORTUNITY"

# Simulate hosted baseline after RELEASE-031: gate off, revoked historical grant, W44 request retained.
"${PSQL[@]}" <<SQL
insert into public.floor_command_observation_requests (
  request_id, user_id, claim_id, store_number, source, purpose, operational_week,
  state, reason, claimed_at, terminal_at, seen_sequence, seen_revision
) values (
  '${REQ}',
  '${OWNER}',
  'c3a29fab-9de3-4ca0-8c3a-29fab9de35ca',
  '2587',
  'deptsync.floor-command.orient.v1',
  'orient_published_week_read',
  '2026-W44',
  'unchanged',
  null,
  '2026-10-30T13:55:56.99807Z',
  '2026-10-30T13:55:56.99807Z',
  8,
  'c3a29fab9de35ca0'
);

insert into public.floor_command_observation_handoffs (
  user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
  source_revision, source_updated_at, last_successful_observed_at, last_checked_at,
  checked_sequence, deadlines_availability, snapshot, superseded_assignments, retained_deadlines, updated_at
) values (
  '${OWNER}',
  'fc.zebra-handoff.2587.2026-W44',
  '2587',
  '2026-W44',
  '2026-10-26',
  '2026-11-01',
  'c3a29fab9de35ca0',
  null,
  '2026-10-29T00:40:17.666Z',
  '2026-10-30T13:55:56.99807Z',
  8,
  'ready',
  '{"source":"deptsync.floor-command.orient.v1","store_number":"2587","operational_week":"2026-W44","freshness":{"revision":"c3a29fab9de35ca0","week_sequence":8}}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '2026-10-29T00:40:17.666Z'
);

insert into public.floor_command_observation_handoff_revisions (
  user_id, handoff_id, source_revision, source_sequence, observed_at, origin,
  snapshot, superseded_assignments, retained_deadlines, store_number, operational_week,
  week_starting, week_ending, source_updated_at, deadlines_availability
) values (
  '${OWNER}',
  'fc.zebra-handoff.2587.2026-W44',
  'c3a29fab9de35ca0',
  8,
  '2026-10-29T00:40:17.666Z',
  'one_shot',
  '{"source":"deptsync.floor-command.orient.v1","store_number":"2587","operational_week":"2026-W44","freshness":{"revision":"c3a29fab9de35ca0","week_sequence":8}}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '2587',
  '2026-W44',
  '2026-10-26',
  '2026-11-01',
  null,
  'ready'
);

-- Historical revoked grant like production.
select set_config('orient.standing_claim_test_hooks', '1', false);
do \$\$
declare
  v_owner uuid := '${OWNER}';
  v_propose jsonb;
  v_approve jsonb;
  v_revoke jsonb;
  v_policy uuid;
begin
  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  if v_propose->>'status' is distinct from 'proposed' then
    raise exception 'baseline propose %', v_propose;
  end if;
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  if v_approve->>'status' is distinct from 'approved' then
    raise exception 'baseline approve %', v_approve;
  end if;
  v_revoke := public.revoke_floor_command_standing_policy(
    v_owner, v_policy, 'release-034-baseline-revoked'
  );
  if v_revoke->>'status' is distinct from 'revoked' then
    raise exception 'baseline revoke %', v_revoke;
  end if;
end;
\$\$;
SQL

BEFORE="$("${PSQL[@]}" -t -A -c "
select jsonb_build_object(
  'gate', (select enabled from public.floor_command_standing_execution_gate where gate_key='standing_opportunity_claim'),
  'claims', (select count(*) from public.floor_command_standing_opportunity_claims),
  'approved', (select count(*) from public.floor_command_standing_policies where state='approved'),
  'req', (select state || ':' || coalesce(seen_revision,'') from public.floor_command_observation_requests where request_id='${REQ}'),
  'tasks', (select count(*) from public.tasks),
  'commitments', (select count(*) from public.commitments),
  'link_exists', (select to_regprocedure('public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)') is not null)
);
")"

"${PSQL[@]}" -f "$LINK"
"${PSQL[@]}" -f "$HARDEN"

AFTER="$("${PSQL[@]}" -t -A -c "
select jsonb_build_object(
  'gate', (select enabled from public.floor_command_standing_execution_gate where gate_key='standing_opportunity_claim'),
  'claims', (select count(*) from public.floor_command_standing_opportunity_claims),
  'approved', (select count(*) from public.floor_command_standing_policies where state='approved'),
  'req', (select state || ':' || coalesce(seen_revision,'') from public.floor_command_observation_requests where request_id='${REQ}'),
  'tasks', (select count(*) from public.tasks),
  'commitments', (select count(*) from public.commitments),
  'link_exists', (select to_regprocedure('public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)') is not null),
  'close_exists', (select to_regprocedure('public.close_floor_command_standing_opportunity_after_dispatch(uuid,uuid,text)') is not null),
  'attempt_hardened', (select to_regprocedure('public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid,timestamptz)') is not null),
  'attempt_old_gone', (select to_regprocedure('public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid)') is null),
  'inspect_exists', (select to_regprocedure('public.inspect_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)') is not null),
  'auth_link', has_function_privilege('authenticated', 'public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)', 'execute'),
  'auth_close', has_function_privilege('authenticated', 'public.close_floor_command_standing_opportunity_after_dispatch(uuid,uuid,text)', 'execute'),
  'auth_attempt', has_function_privilege('authenticated', 'public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid,timestamptz)', 'execute'),
  'auth_inspect', has_function_privilege('authenticated', 'public.inspect_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)', 'execute'),
  'svc_link', has_function_privilege('service_role', 'public.link_floor_command_standing_opportunity_observation(uuid,uuid,uuid,text)', 'execute'),
  'svc_close', has_function_privilege('service_role', 'public.close_floor_command_standing_opportunity_after_dispatch(uuid,uuid,text)', 'execute'),
  'svc_attempt', has_function_privilege('service_role', 'public.record_floor_command_standing_opportunity_source_attempt(uuid,uuid,timestamptz)', 'execute'),
  'svc_inspect', has_function_privilege('service_role', 'public.inspect_floor_command_standing_opportunity(uuid,uuid,integer,text,text,timestamptz)', 'execute'),
  'svc_claim_dml', has_table_privilege('service_role', 'public.floor_command_standing_opportunity_claims', 'INSERT')
    or has_table_privilege('service_role', 'public.floor_command_standing_opportunity_claims', 'UPDATE')
    or has_table_privilege('service_role', 'public.floor_command_standing_opportunity_claims', 'DELETE')
);
")"

python3 - <<PY
import json
before=json.loads('''$BEFORE''')
after=json.loads('''$AFTER''')
assert before['gate'] is False
assert after['gate'] is False
assert before['claims'] == 0 and after['claims'] == 0
assert before['approved'] == 0 and after['approved'] == 0
assert before['req'] == after['req'] == 'unchanged:c3a29fab9de35ca0'
assert before['tasks'] == after['tasks'] == 39
assert before['commitments'] == after['commitments'] == 2
assert before['link_exists'] is False
assert after['link_exists'] is True and after['close_exists'] is True
assert after['attempt_hardened'] is True and after['attempt_old_gone'] is True
assert after['inspect_exists'] is True
assert after['auth_link'] is False and after['auth_close'] is False
assert after['auth_attempt'] is False and after['auth_inspect'] is False
assert after['svc_link'] is True and after['svc_close'] is True
assert after['svc_attempt'] is True and after['svc_inspect'] is True
assert after['svc_claim_dml'] is False
print('UPGRADE_BASELINE_PRESERVED_OK')
print('LINK_PRIVILEGE_OK')
print('HARDEN_PRIVILEGE_OK')
PY

# Approve with gate off still creates no claims and link alone does not execute.
"${PSQL[@]}" <<SQL
select set_config('orient.standing_claim_test_hooks', '1', false);
do \$\$
declare
  v_owner uuid := '${OWNER}';
  v_propose jsonb;
  v_approve jsonb;
  v_policy uuid;
  v_version integer;
  v_week text;
  v_as_of timestamptz;
  v_claim jsonb;
  v_attempt jsonb;
  v_link jsonb;
begin
  -- Need a fresh operator because unique open policy constraints may apply; use same owner after revoke.
  v_propose := public.propose_floor_command_standing_policy(
    v_owner, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  );
  if v_propose->>'status' is distinct from 'proposed' then
    raise exception 'propose %', v_propose;
  end if;
  v_policy := (v_propose->'policy'->>'policy_id')::uuid;
  v_approve := public.approve_floor_command_standing_policy(v_owner, v_policy);
  if v_approve->>'status' is distinct from 'approved' then
    raise exception 'approve %', v_approve;
  end if;
  v_version := (v_approve->'policy'->>'policy_version')::integer;
  v_week := v_approve->'policy'->'windows'->0->>'operational_week';
  v_as_of := (v_approve->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour';

  if (select enabled from public.floor_command_standing_execution_gate where gate_key='standing_opportunity_claim') then
    raise exception 'gate unexpectedly enabled';
  end if;

  v_claim := public.claim_floor_command_standing_opportunity(
    v_owner, v_policy, v_version, v_week, 'publication_opportunity', v_as_of
  );
  if v_claim->>'status' is distinct from 'gate_disabled' then
    raise exception 'expected gate_disabled got %', v_claim;
  end if;

  -- Out-of-order attempt/link without a claim must fail closed.
  v_attempt := public.record_floor_command_standing_opportunity_source_attempt(
    v_owner, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  );
  if v_attempt->>'status' is distinct from 'not_found' then
    raise exception 'attempt without claim %', v_attempt;
  end if;
  v_link := public.link_floor_command_standing_opportunity_observation(
    v_owner,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'accepted_new'
  );
  if v_link->>'status' is distinct from 'not_found' then
    raise exception 'link without claim %', v_link;
  end if;

  if exists (select 1 from public.floor_command_standing_opportunity_claims) then
    raise exception 'claims created while gate disabled';
  end if;

  perform public.revoke_floor_command_standing_policy(v_owner, v_policy, 'release-034-cleanup');
end;
\$\$;
SQL

echo "GATE_INDEPENDENT_APPROVAL_OK"
echo "OUT_OF_ORDER_RPC_REFUSED_OK"

# Duplicate apply of CREATE OR REPLACE is idempotent for function bodies; no second objects.
"${PSQL[@]}" -f "$LINK" >/dev/null
"${PSQL[@]}" -f "$HARDEN" >/dev/null
echo "LINK_REAPPLY_IDEMPOTENT_OK"
echo "HARDEN_REAPPLY_IDEMPOTENT_OK"

# Confirm no new cron and function bodies remain non-HTTP.
FUNCS="$("${PSQL[@]}" -t -A -c "
select string_agg(pg_get_functiondef(oid), E'\n')
from pg_proc
where proname in (
  'link_floor_command_standing_opportunity_observation',
  'close_floor_command_standing_opportunity_after_dispatch',
  'claim_floor_command_standing_opportunity',
  'record_floor_command_standing_opportunity_source_attempt',
  'inspect_floor_command_standing_opportunity'
);
")"
printf '%s' "$FUNCS" | rg -n "http_get|pg_net|cron\\.schedule|published-week" && {
  echo "function body gained network side effects" >&2
  exit 1
} || true
echo "NO_NETWORK_IN_STANDING_FUNCS_OK"

# Temporal counts unchanged
COUNTS="$("${PSQL[@]}" -t -A -c "select count(*)||':'||(select count(*) from public.commitments)||':'||(select count(*) from public.blocks)||':'||(select count(*) from public.protected_time) from public.tasks;")"
test "$COUNTS" = "39:2:0:0"
echo "TEMPORAL_UNCHANGED_OK"

echo "STANDING_EXECUTION_DEPLOY_COMPAT_OK"
