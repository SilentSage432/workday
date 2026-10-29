#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-014
# Isolated before-and-after counts for the governed migration.
# Does not contact a hosted database or Floor Command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
PORT="${ORIENT_PG_BACKFILL_PORT:-55455}"
TMP="$(mktemp -d /tmp/orient-floor-command-014-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_backfill;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_backfill -v ON_ERROR_STOP=1 -q)

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

echo "BEFORE"
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_backfill -v ON_ERROR_STOP=1 -c "select 'tasks' as relation, count(*) from public.tasks union all select 'commitments', count(*) from public.commitments union all select 'blocks', count(*) from public.blocks union all select 'protected_time', count(*) from public.protected_time union all select 'bindings', count(*) from public.floor_command_observation_bindings union all select 'handoffs', count(*) from public.floor_command_observation_handoffs union all select 'attempts', count(*) from public.floor_command_observation_attempts union all select 'claims', count(*) from public.floor_command_controlled_pull_claims order by 1;"

"${PSQL[@]}" -f "$GOVERNED"

echo "AFTER"
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_backfill -v ON_ERROR_STOP=1 <<'SQL'
select 'tasks' as relation, count(*) from public.tasks
union all select 'commitments', count(*) from public.commitments
union all select 'blocks', count(*) from public.blocks
union all select 'protected_time', count(*) from public.protected_time
union all select 'bindings', count(*) from public.floor_command_observation_bindings
union all select 'handoffs', count(*) from public.floor_command_observation_handoffs
union all select 'attempts', count(*) from public.floor_command_observation_attempts
union all select 'claims', count(*) from public.floor_command_controlled_pull_claims
union all select 'requests', count(*) from public.floor_command_observation_requests
union all select 'revisions', count(*) from public.floor_command_observation_handoff_revisions;
SQL

"${PSQL[@]}" <<'SQL'
do $$
declare
  v_user uuid := 'a499dd01-095e-4bb0-8db9-c284c34a2ab2';
begin
  if (select count(*) from public.floor_command_observation_handoff_revisions) <> 1 then
    raise exception 'history count';
  end if;
  if (select origin from public.floor_command_observation_handoff_revisions) <> 'one_shot' then
    raise exception 'origin';
  end if;
  if (select source_sequence from public.floor_command_observation_handoff_revisions) <> 8 then
    raise exception 'history sequence';
  end if;
  if (select source_revision from public.floor_command_observation_handoff_revisions) <> 'c3a29fab9de35ca0' then
    raise exception 'history revision';
  end if;
  if (select observed_at from public.floor_command_observation_handoff_revisions) <> timestamptz '2026-10-29T00:40:17.666Z' then
    raise exception 'history observed';
  end if;
  if (select source_revision from public.floor_command_observation_handoffs) <> 'c3a29fab9de35ca0' then
    raise exception 'working revision';
  end if;
  if (select snapshot -> 'freshness' ->> 'week_sequence' from public.floor_command_observation_handoffs) <> '8' then
    raise exception 'working sequence';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_handoffs) <> timestamptz '2026-10-29T00:40:17.666Z' then
    raise exception 'working observed';
  end if;
  if (select last_checked_at from public.floor_command_observation_handoffs) is not null then
    raise exception 'checked time written';
  end if;
  if (select checked_sequence from public.floor_command_observation_handoffs) is not null then
    raise exception 'checked sequence written';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts) <> 'success_complete' then
    raise exception 'attempt changed';
  end if;
  if (select last_attempt_reason from public.floor_command_observation_attempts) is not null then
    raise exception 'attempt reason changed';
  end if;
  if public.claim_floor_command_controlled_pull(v_user, gen_random_uuid()) <> 'already_succeeded' then
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
echo "BACKFILL_IDENTITY_OK"

set +e
"${PSQL[@]}" -f "$GOVERNED" >"$TMP/rerun.txt" 2>&1
rerun_status=$?
set -e
if [[ "$rerun_status" -eq 0 ]]; then
  echo "rerun unexpectedly succeeded" >&2
  exit 1
fi
if ! rg -q "already exists" "$TMP/rerun.txt"; then
  echo "unexpected rerun error:" >&2
  cat "$TMP/rerun.txt" >&2
  exit 1
fi
psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_backfill -v ON_ERROR_STOP=1 -c "select count(*) as revisions_after_failed_rerun from public.floor_command_observation_handoff_revisions;"
echo "RERUN_DID_NOT_DUPLICATE_OK"
echo "BACKFILL_COMPATIBILITY_OK"
