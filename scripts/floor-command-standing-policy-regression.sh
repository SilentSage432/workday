#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-023
# Ephemeral PostgreSQL proof for the inert standing observation policy.
# Does not contact Floor Command and does not use a hosted database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
POLICY="$ROOT/supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql"
ASSERT="$ROOT/scripts/floor-command-standing-policy-regression.sql"
PORT="${ORIENT_PG_STANDING_POLICY_PORT:-55456}"
TMP="$(mktemp -d /tmp/orient-floor-command-023-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
test -f "$BASE"
test -f "$SEQUENCE"
test -f "$APPROVAL"
test -f "$CLAIM"
test -f "$GOVERNED"
test -f "$POLICY"
test -f "$ASSERT"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_standing_policy;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_standing_policy -v ON_ERROR_STOP=1 -q)

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

OWNER_A="11111111-1111-4111-8111-111111111111"
OWNER_B="22222222-2222-4222-8222-222222222222"
OWNER_C="33333333-3333-4333-8333-333333333333"
OWNER_D="44444444-4444-4444-8444-444444444444"

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
  '${OWNER_C}', '1999', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
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
"${PSQL[@]}" -f "$ASSERT"

RACE_ID="$("${PSQL[@]}" -t -A -c "select (public.propose_floor_command_standing_policy('${OWNER_B}'::uuid, now(), now() + interval '30 days', 1, 1, 'America/Denver')->'policy'->>'policy_id')")"
"${PSQL[@]}" -t -A -c "select public.approve_floor_command_standing_policy('${OWNER_B}'::uuid, '${RACE_ID}'::uuid)->>'status'" > "$TMP/approve.txt" &
"${PSQL[@]}" -t -A -c "select public.revoke_floor_command_standing_policy('${OWNER_B}'::uuid, '${RACE_ID}'::uuid, 'concurrent close')->>'status'" > "$TMP/revoke.txt" &
wait
"${PSQL[@]}" <<SQL
do \$\$
declare
  v_state text;
  v_requests integer;
  v_approved integer;
  v_revoked integer;
begin
  select state into v_state
  from public.floor_command_standing_policies
  where policy_id = '${RACE_ID}'::uuid;
  if v_state is distinct from 'revoked' then
    raise exception 'concurrent lifecycle ended %', v_state;
  end if;
  select count(*) into v_approved
  from public.floor_command_standing_policy_events
  where policy_id = '${RACE_ID}'::uuid and event_type = 'approved';
  select count(*) into v_revoked
  from public.floor_command_standing_policy_events
  where policy_id = '${RACE_ID}'::uuid and event_type = 'revoked';
  if v_approved > 1 or v_revoked <> 1 then
    raise exception 'concurrent events approved % revoked %', v_approved, v_revoked;
  end if;
  select count(*) into v_requests from public.floor_command_observation_requests;
  if v_requests <> 0 then
    raise exception 'concurrent policy wrote % observation requests', v_requests;
  end if;
end \$\$;
SQL
echo "CONCURRENT_POLICY_OK"
echo "STANDING_POLICY_OK"
