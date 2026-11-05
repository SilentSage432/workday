#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-033
# Ephemeral PostgreSQL proof for operator-initiated standing execution sequencing.
# Uses synthetic governed commit payloads only. Does not contact Floor Command.
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
ASSERT="$ROOT/scripts/floor-command-standing-execution-regression.sql"
PORT="${ORIENT_PG_STANDING_EXEC_PORT:-55459}"
TMP="$(mktemp -d /tmp/orient-floor-command-033-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
for f in "$BASE" "$SEQUENCE" "$APPROVAL" "$CLAIM" "$GOVERNED" "$POLICY" "$OPPORTUNITY" "$LINK" "$HARDEN" "$ASSERT"; do
  test -f "$f"
done

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_standing_exec;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_standing_exec -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" <<'SQL'
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
SQL

"${PSQL[@]}" -f "$BASE"
"${PSQL[@]}" -f "$SEQUENCE"
"${PSQL[@]}" -f "$APPROVAL"
"${PSQL[@]}" -f "$CLAIM"

OWNER_A="55555555-5555-4555-8555-555555555555"
OWNER_B="66666666-6666-4666-8666-666666666666"
OWNER_C="77777777-7777-4777-8777-777777777777"
OWNER_D="88888888-8888-4888-8888-888888888888"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values
  ('${OWNER_A}'),
  ('${OWNER_B}'),
  ('${OWNER_C}'),
  ('${OWNER_D}');

select public.bind_floor_command_observation(
  '${OWNER_A}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
select public.bind_floor_command_observation(
  '${OWNER_B}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
select public.bind_floor_command_observation(
  '${OWNER_C}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
select public.bind_floor_command_observation(
  '${OWNER_D}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);

insert into public.floor_command_observation_attempts (
  user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at
) values (
  '${OWNER_A}',
  '2026-10-29T00:40:17.666Z',
  'success_complete',
  null,
  '2026-10-29T00:40:17.666Z'
);
SQL

"${PSQL[@]}" -f "$GOVERNED"
"${PSQL[@]}" -f "$POLICY"
"${PSQL[@]}" -f "$OPPORTUNITY"
"${PSQL[@]}" -f "$LINK"
"${PSQL[@]}" -f "$HARDEN"

NOTICE_OUT="$("${PSQL[@]}" -f "$ASSERT" 2>&1)"
printf '%s\n' "$NOTICE_OUT"

echo "$NOTICE_OUT" | grep -q 'STANDING_EXECUTION_HAPPY_PATH_OK'
echo "$NOTICE_OUT" | grep -q 'STANDING_EXECUTION_REVOKE_BEFORE_ATTEMPT_OK'
echo "$NOTICE_OUT" | grep -q 'STANDING_EXECUTION_REVOKE_AFTER_ATTEMPT_OK'
echo "$NOTICE_OUT" | grep -q 'STANDING_EXECUTION_GATE_DISABLED_OK'
echo "$NOTICE_OUT" | grep -q 'STANDING_EXECUTION_SECURITY_OK'

# Concurrent claim race still collapses to one row after link migration.
"${PSQL[@]}" <<'SQL' >/dev/null
select set_config('orient.standing_claim_test_hooks', '1', false);
update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
SQL

OWNER_E="99999999-9999-4999-8999-999999999999"
"${PSQL[@]}" -c "insert into auth.users (id) values ('${OWNER_E}');" >/dev/null
"${PSQL[@]}" -c "select public.bind_floor_command_observation('${OWNER_E}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');" >/dev/null

META="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_E}'::uuid,
    now(),
    now() + interval '30 days',
    1, 0, 'America/Boise'
  ) as j
),
approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_E}'::uuid,
    (select (j->'policy'->>'policy_id')::uuid from proposed)
  ) as j
)
select
  (select j->'policy'->>'policy_id' from approved),
  (select j->'policy'->>'policy_version' from approved),
  (select j->'policy'->'windows'->0->>'operational_week' from approved),
  (
    select ((j->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour')::text
    from approved
  );
")"
POLICY_ID="$(printf '%s' "$META" | cut -d'|' -f1)"
POLICY_VERSION="$(printf '%s' "$META" | cut -d'|' -f2)"
WEEK="$(printf '%s' "$META" | cut -d'|' -f3)"
AS_OF="$(printf '%s' "$META" | cut -d'|' -f4)"

CONN="host=$TMP port=$PORT user=postgres dbname=floor_command_standing_exec"
psql "$CONN" -v ON_ERROR_STOP=1 -q -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.claim_floor_command_standing_opportunity('${OWNER_E}'::uuid, '${POLICY_ID}'::uuid, ${POLICY_VERSION}, '${WEEK}', 'publication_opportunity', '${AS_OF}'::timestamptz);" >/tmp/orient-033-claim-a.out &
PID_A=$!
psql "$CONN" -v ON_ERROR_STOP=1 -q -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.claim_floor_command_standing_opportunity('${OWNER_E}'::uuid, '${POLICY_ID}'::uuid, ${POLICY_VERSION}, '${WEEK}', 'publication_opportunity', '${AS_OF}'::timestamptz);" >/tmp/orient-033-claim-b.out &
PID_B=$!
wait "$PID_A" "$PID_B" || true

COUNT="$("${PSQL[@]}" -t -A -c "select count(*) from public.floor_command_standing_opportunity_claims where policy_id = '${POLICY_ID}'::uuid and operational_week = '${WEEK}' and opportunity_kind = 'publication_opportunity';")"
test "$COUNT" = "1"

echo "STANDING_EXECUTION_CONCURRENT_CLAIM_OK"
echo "STANDING_EXECUTION_REGRESSION_OK"
