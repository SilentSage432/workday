#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-013
# Ephemeral PostgreSQL proof for governed multi-observation.
# Does not contact Floor Command and does not use a hosted database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
ASSERT="$ROOT/scripts/floor-command-governed-observation-regression.sql"
PORT="${ORIENT_PG_GOVERNED_PORT:-55454}"
TMP="$(mktemp -d /tmp/orient-floor-command-013-XXXXXX)"
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
test -f "$ASSERT"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_governed;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_governed -v ON_ERROR_STOP=1 -q)

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

"${PSQL[@]}" <<'SQL'
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

select public.bind_floor_command_observation(
  '11111111-1111-4111-8111-111111111111', '2587',
  'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
select public.bind_floor_command_observation(
  '22222222-2222-4222-8222-222222222222', '2587',
  'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);
select public.bind_floor_command_observation(
  '33333333-3333-4333-8333-333333333333', '2587',
  'deptsync.floor-command.orient.v1', 'orient_published_week_read'
);

insert into public.floor_command_observation_attempts (
  user_id, last_attempted_at, last_attempt_result, last_attempt_reason, last_successful_observed_at
) values (
  '11111111-1111-4111-8111-111111111111',
  '2026-10-29T00:40:17.666Z',
  'success_complete',
  null,
  '2026-10-29T00:40:17.666Z'
);

insert into public.floor_command_observation_handoffs (
  user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
  source_revision, source_updated_at, last_successful_observed_at, deadlines_availability,
  snapshot, superseded_assignments, retained_deadlines
) values (
  '11111111-1111-4111-8111-111111111111',
  'fc.zebra-handoff.2587.2026-W44',
  '2587',
  '2026-W44',
  '2026-10-26',
  '2026-11-01',
  'c3a29fab9de35ca0',
  '2026-10-29T00:40:17.666Z',
  '2026-10-29T00:40:17.666Z',
  'ready',
  jsonb_build_object(
    'source', 'deptsync.floor-command.orient.v1',
    'store_number', '2587',
    'operational_week', '2026-W44',
    'week_starting', '2026-10-26',
    'week_ending', '2026-11-01',
    'publication', jsonb_build_object('id', 'fc.publication.2587.2026-W44', 'status', 'published'),
    'handoff', jsonb_build_object(
      'id', 'fc.zebra-handoff.2587.2026-W44',
      'status', 'partial',
      'deadline_date', '2026-10-26',
      'deadline_policy', 'monday_of_operational_week',
      'required_count', 1,
      'confirmed_count', 0,
      'outstanding_count', 1
    ),
    'entries', jsonb_build_array(jsonb_build_object(
      'id', 'fc.assignment.retained',
      'assignment_id', 'retained',
      'bay_id', 'bay-retained',
      'zebra_task_completed', false
    )),
    'deadlines', jsonb_build_object('availability', 'ready', 'commitments', jsonb_build_array()),
    'retired', jsonb_build_array(),
    'freshness', jsonb_build_object(
      'read_at', '2026-10-29T00:40:17.666Z',
      'source_updated_at', '2026-10-29T00:40:17.666Z',
      'revision', 'c3a29fab9de35ca0',
      'week_sequence', 8
    )
  ),
  '[]'::jsonb,
  '[]'::jsonb
);
SQL

"${PSQL[@]}" -f "$GOVERNED"
"${PSQL[@]}" -f "$ASSERT"

OWNER_C="33333333-3333-4333-8333-333333333333"
"${PSQL[@]}" -t -A -c "select public.open_floor_command_governed_observation('${OWNER_C}'::uuid, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');" > "$TMP/open-a.txt" &
"${PSQL[@]}" -t -A -c "select public.open_floor_command_governed_observation('${OWNER_C}'::uuid, '2026-W45', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');" > "$TMP/open-b.txt" &
wait

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.floor_command_observation_requests
  where user_id = '${OWNER_C}'
    and state = 'in_progress';
  if v_count <> 1 then
    raise exception 'concurrent opens left % in-progress rows', v_count;
  end if;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '${OWNER_C}') <> 0 then
    raise exception 'concurrent open wrote a handoff';
  end if;
end \$\$;
SQL

if ! grep -q '"status": "opened"\|"status":"opened"' "$TMP/open-a.txt" "$TMP/open-b.txt"; then
  echo "concurrent open output:" >&2
  cat "$TMP/open-a.txt" "$TMP/open-b.txt" >&2
  exit 1
fi
if ! grep -q '"status": "busy"\|"status":"busy"' "$TMP/open-a.txt" "$TMP/open-b.txt"; then
  echo "concurrent open output:" >&2
  cat "$TMP/open-a.txt" "$TMP/open-b.txt" >&2
  exit 1
fi
echo "CONCURRENT_REQUESTS_OK"
echo "GOVERNED_OBSERVATION_OK"
