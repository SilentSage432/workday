#!/usr/bin/env bash
# ORIENT-PULSE-LIFECYCLE-002 — executable PostgreSQL source-deletion authority regression.
# Ephemeral cluster only. Not production.
# Proves INVOKER cleanup fails with SQLSTATE 42501, then SECURITY DEFINER correction:
# authenticated-equivalent source DELETE hard-cleans grants, retains occurrences
# (grant_id SET NULL), preserves soft revoke, forbids direct grant DELETE, isolates users.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORRECTION_SQL="$ROOT/supabase/migrations/20261010170000_pulse_interrupt_grants_source_delete_authority.sql"
PORT="${ORIENT_PG_REGRESSION_PORT:-55442}"
TMP="$(mktemp -d /tmp/orient-pulse-lifecycle-002-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
test -f "$CORRECTION_SQL"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done
psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create database pulse_lifecycle;
SQL

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d pulse_lifecycle -v ON_ERROR_STOP=1 -q)

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

create table public.commitments (
  id uuid primary key,
  user_id uuid not null references auth.users (id),
  starts_on date not null,
  kind text not null,
  start_local time,
  end_local time,
  title text not null,
  unique (id, user_id)
);
alter table public.commitments enable row level security;
revoke all on table public.commitments from public;
grant select, insert, update, delete on table public.commitments to authenticated;
create policy commitments_all_own on public.commitments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.blocks (
  id uuid primary key,
  user_id uuid not null references auth.users (id),
  starts_on date not null,
  kind text not null,
  start_local time,
  end_local time,
  purpose text not null,
  unique (id, user_id)
);
alter table public.blocks enable row level security;
revoke all on table public.blocks from public;
grant select, insert, update, delete on table public.blocks to authenticated;
create policy blocks_all_own on public.blocks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Privilege posture from 20261008230000 (narrow; no DELETE).
create table public.pulse_interrupt_grants (
  id uuid primary key,
  user_id uuid not null references auth.users (id),
  source_kind text not null,
  source_id uuid not null,
  transition_kind text not null,
  lead_offset_seconds integer not null,
  established_at timestamptz not null,
  revoked_at timestamptz
);
alter table public.pulse_interrupt_grants enable row level security;
revoke all on table public.pulse_interrupt_grants from public;
revoke all on table public.pulse_interrupt_grants from anon;
revoke all on table public.pulse_interrupt_grants from authenticated;
grant select, insert on table public.pulse_interrupt_grants to authenticated;
grant update (revoked_at) on table public.pulse_interrupt_grants to authenticated;
create policy pulse_interrupt_grants_select_own
  on public.pulse_interrupt_grants for select to authenticated
  using (user_id = auth.uid());
create policy pulse_interrupt_grants_insert_own
  on public.pulse_interrupt_grants for insert to authenticated
  with check (user_id = auth.uid());
create policy pulse_interrupt_grants_update_own
  on public.pulse_interrupt_grants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.pulse_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  grant_id uuid,
  source_kind text not null,
  source_id uuid,
  source_starts_on date not null,
  source_start_local time not null,
  threshold_at timestamptz not null,
  source_start_at timestamptz not null,
  established_at timestamptz not null,
  constraint pulse_occurrences_grant_fk
    foreign key (grant_id) references public.pulse_interrupt_grants (id)
    on delete set null
);
alter table public.pulse_occurrences enable row level security;
revoke all on table public.pulse_occurrences from public;
revoke all on table public.pulse_occurrences from anon;
revoke all on table public.pulse_occurrences from authenticated;
grant select, insert on table public.pulse_occurrences to authenticated;
create policy pulse_occurrences_select_own
  on public.pulse_occurrences for select to authenticated
  using (user_id = auth.uid());
create policy pulse_occurrences_insert_own
  on public.pulse_occurrences for insert to authenticated
  with check (user_id = auth.uid());

-- Historical defective cleanup from 20261010093000 (SECURITY INVOKER).
create or replace function public.pulse_interrupt_grants_cascade_source_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.pulse_interrupt_grants
  where source_kind = tg_argv[0]
    and source_id = old.id
    and user_id = old.user_id;
  return old;
end;
$$;

create trigger pulse_interrupt_grants_cascade_commitment_delete
  after delete on public.commitments
  for each row
  execute function public.pulse_interrupt_grants_cascade_source_delete('commitment');

create trigger pulse_interrupt_grants_cascade_block_delete
  after delete on public.blocks
  for each row
  execute function public.pulse_interrupt_grants_cascade_source_delete('block');
SQL

OWNER_A="11111111-1111-1111-1111-111111111111"
OWNER_B="22222222-2222-2222-2222-222222222222"
COMMIT_A="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
COMMIT_A2="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
BLOCK_A="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
BLOCK_B="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
GRANT_COMMIT_A="cccccccc-cccc-cccc-cccc-cccccccccccc"
GRANT_COMMIT_A2="cccccccc-cccc-cccc-cccc-ccccccccccc1"
GRANT_BLOCK_A="dddddddd-dddd-dddd-dddd-dddddddddddd"
GRANT_BLOCK_B="dddddddd-dddd-dddd-dddd-ddddddddddd1"
OCC_COMMIT_A="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
OCC_BLOCK_A="ffffffff-ffff-ffff-ffff-ffffffffffff"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values ('$OWNER_A'), ('$OWNER_B');

insert into public.commitments
  (id, user_id, starts_on, kind, start_local, end_local, title)
values
  ('$COMMIT_A', '$OWNER_A', '2026-10-10', 'timed', '10:00', '11:00', 'Owner A commitment'),
  ('$COMMIT_A2', '$OWNER_A', '2026-10-10', 'timed', '14:00', '15:00', 'Owner A second commitment');

insert into public.blocks
  (id, user_id, starts_on, kind, start_local, end_local, purpose)
values
  ('$BLOCK_A', '$OWNER_A', '2026-10-10', 'timed', '12:00', '13:00', 'Owner A block'),
  ('$BLOCK_B', '$OWNER_B', '2026-10-10', 'timed', '12:00', '13:00', 'Owner B block');

insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, lead_offset_seconds, established_at, revoked_at)
values
  ('$GRANT_COMMIT_A', '$OWNER_A', 'commitment', '$COMMIT_A', 'start', 900, '2026-10-10T12:00:00Z', null),
  ('$GRANT_COMMIT_A2', '$OWNER_A', 'commitment', '$COMMIT_A2', 'start', 900, '2026-10-10T12:00:00Z', null),
  ('$GRANT_BLOCK_A', '$OWNER_A', 'block', '$BLOCK_A', 'start', 900, '2026-10-10T12:00:00Z', null),
  ('$GRANT_BLOCK_B', '$OWNER_B', 'block', '$BLOCK_B', 'start', 900, '2026-10-10T12:00:00Z', null);

insert into public.pulse_occurrences
  (id, user_id, grant_id, source_kind, source_id, source_starts_on, source_start_local,
   threshold_at, source_start_at, established_at)
values
  ('$OCC_COMMIT_A', '$OWNER_A', '$GRANT_COMMIT_A', 'commitment', '$COMMIT_A',
   '2026-10-10', '10:00', '2026-10-10T15:45:00Z', '2026-10-10T16:00:00Z', '2026-10-10T15:46:00Z'),
  ('$OCC_BLOCK_A', '$OWNER_A', '$GRANT_BLOCK_A', 'block', '$BLOCK_A',
   '2026-10-10', '12:00', '2026-10-10T17:45:00Z', '2026-10-10T18:00:00Z', '2026-10-10T17:46:00Z');
SQL

# Privilege matrix probe (authenticated must lack DELETE on grants).
HAS_DELETE=$("${PSQL[@]}" -Atc "
select count(*)::text
from information_schema.role_table_grants
where table_schema='public'
  and table_name='pulse_interrupt_grants'
  and grantee='authenticated'
  and privilege_type='DELETE';
")
[[ "$HAS_DELETE" == "0" ]] || { echo "UNEXPECTED_AUTHENTICATED_DELETE_PRIVILEGE" >&2; exit 2; }

INVOKER_DEF=$("${PSQL[@]}" -Atc "
select case when p.prosecdef then 'definer' else 'invoker' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='pulse_interrupt_grants_cascade_source_delete';
")
[[ "$INVOKER_DEF" == "invoker" ]] || { echo "EXPECTED_INITIAL_INVOKER got=$INVOKER_DEF" >&2; exit 3; }

echo "=== INVOKER FAILURE: commitment delete ==="
set +e
INVOKER_OUT=$(
  "${PSQL[@]}" -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$OWNER_A', true);
DELETE FROM public.commitments WHERE id = '$COMMIT_A';
COMMIT;
SQL
)
INVOKER_RC=$?
set -e
echo "$INVOKER_OUT"
[[ $INVOKER_RC -ne 0 ]] || { echo "EXPECTED_INVOKER_FAILURE_MISSING" >&2; exit 4; }
echo "$INVOKER_OUT" | grep -q 'permission denied for table pulse_interrupt_grants' \
  || { echo "EXPECTED_PERMISSION_DENIED_MESSAGE_MISSING" >&2; exit 5; }
echo "$INVOKER_OUT" | grep -q '42501\|permission denied' \
  || { echo "EXPECTED_SQLSTATE_SIGNAL_MISSING" >&2; exit 6; }
# Capture SQLSTATE explicitly
SQLSTATE=$("${PSQL[@]}" -Atc "
DO \$\$
DECLARE
  err_state text;
BEGIN
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '$OWNER_A', true);
    DELETE FROM public.commitments WHERE id = '$COMMIT_A';
    RAISE EXCEPTION 'unexpected success';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_state = RETURNED_SQLSTATE;
    RAISE NOTICE '%', err_state;
  END;
END \$\$;
" 2>&1 | sed -n 's/.*NOTICE:  //p' | head -1)
[[ "$SQLSTATE" == "42501" ]] || { echo "EXPECTED_SQLSTATE_42501 got=$SQLSTATE" >&2; exit 7; }
echo "REPRODUCED_INVOKER_42501"

# Source and grant must still exist after failed delete.
COMMIT_LEFT=$("${PSQL[@]}" -Atc "select count(*)::text from public.commitments where id='$COMMIT_A';")
GRANT_LEFT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A';")
[[ "$COMMIT_LEFT" == "1" && "$GRANT_LEFT" == "1" ]] || {
  echo "FAILED_DELETE_MUTATED_STATE commit=$COMMIT_LEFT grant=$GRANT_LEFT" >&2
  exit 8
}

echo "=== APPLY CORRECTION ==="
"${PSQL[@]}" -f "$CORRECTION_SQL"

DEFINER=$("${PSQL[@]}" -Atc "
select case when p.prosecdef then 'definer' else 'invoker' end
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='pulse_interrupt_grants_cascade_source_delete';
")
[[ "$DEFINER" == "definer" ]] || { echo "EXPECTED_SECURITY_DEFINER got=$DEFINER" >&2; exit 9; }

SEARCH_PATH=$("${PSQL[@]}" -Atc "
select array_to_string(proconfig, ',')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='pulse_interrupt_grants_cascade_source_delete';
")
echo "$SEARCH_PATH" | grep -q 'search_path=public' \
  || { echo "EXPECTED_PINNED_SEARCH_PATH got=$SEARCH_PATH" >&2; exit 10; }

# Triggers unchanged and sole callers.
TRIG_COMMIT=$("${PSQL[@]}" -Atc "
select count(*)::text from information_schema.triggers
where event_object_schema='public'
  and event_object_table='commitments'
  and trigger_name='pulse_interrupt_grants_cascade_commitment_delete';
")
TRIG_BLOCK=$("${PSQL[@]}" -Atc "
select count(*)::text from information_schema.triggers
where event_object_schema='public'
  and event_object_table='blocks'
  and trigger_name='pulse_interrupt_grants_cascade_block_delete';
")
OTHER_TRIG=$("${PSQL[@]}" -Atc "
select count(*)::text from information_schema.triggers
where action_statement ilike '%pulse_interrupt_grants_cascade_source_delete%'
  and not (
    (event_object_table='commitments' and trigger_name='pulse_interrupt_grants_cascade_commitment_delete')
    or (event_object_table='blocks' and trigger_name='pulse_interrupt_grants_cascade_block_delete')
  );
")
[[ "$TRIG_COMMIT" == "1" && "$TRIG_BLOCK" == "1" && "$OTHER_TRIG" == "0" ]] || {
  echo "TRIGGER_COVERAGE_UNEXPECTED commit=$TRIG_COMMIT block=$TRIG_BLOCK other=$OTHER_TRIG" >&2
  exit 11
}
echo "TRIGGERS_PRESERVED_OK"

# authenticated still has no DELETE table privilege.
HAS_DELETE2=$("${PSQL[@]}" -Atc "
select count(*)::text
from information_schema.role_table_grants
where table_schema='public'
  and table_name='pulse_interrupt_grants'
  and grantee='authenticated'
  and privilege_type='DELETE';
")
[[ "$HAS_DELETE2" == "0" ]] || { echo "CORRECTION_ADDED_DELETE_PRIVILEGE" >&2; exit 12; }

echo "=== COMMITMENT DELETE (authenticated-equivalent) ==="
"${PSQL[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$OWNER_A', true);
DELETE FROM public.commitments WHERE id = '$COMMIT_A';
COMMIT;
SQL

COMMIT_RESULT=$("${PSQL[@]}" -Atc "
select
  (select count(*) from public.commitments where id='$COMMIT_A')::text
  || '|' ||
  (select count(*) from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A')::text
  || '|' ||
  (select count(*) from public.pulse_occurrences where id='$OCC_COMMIT_A')::text
  || '|' ||
  (select case when grant_id is null then 'null' else 'set' end
     from public.pulse_occurrences where id='$OCC_COMMIT_A')
  || '|' ||
  (select source_kind
          || '/' || coalesce(source_id::text, '')
          || '/' || source_starts_on::text
          || '/' || to_char(source_start_local, 'HH24:MI:SS')
          || '/' || extract(epoch from threshold_at)::bigint::text
          || '/' || extract(epoch from source_start_at)::bigint::text
          || '/' || extract(epoch from established_at)::bigint::text
     from public.pulse_occurrences where id='$OCC_COMMIT_A')
")
IFS='|' read -r src_cnt grant_cnt occ_cnt grant_id_state provenance <<<"$COMMIT_RESULT"
[[ "$src_cnt" == "0" ]] || { echo "COMMIT_SOURCE_NOT_DELETED $COMMIT_RESULT" >&2; exit 13; }
[[ "$grant_cnt" == "0" ]] || { echo "COMMIT_GRANT_NOT_REMOVED $COMMIT_RESULT" >&2; exit 14; }
[[ "$occ_cnt" == "1" ]] || { echo "COMMIT_OCCURRENCE_LOST $COMMIT_RESULT" >&2; exit 15; }
[[ "$grant_id_state" == "null" ]] || { echo "COMMIT_GRANT_ID_NOT_NULL $COMMIT_RESULT" >&2; exit 16; }
# 2026-10-10T15:45:00Z / 16:00:00Z / 15:46:00Z
[[ "$provenance" == "commitment/$COMMIT_A/2026-10-10/10:00:00/1791647100/1791648000/1791647160" ]] \
  || { echo "COMMIT_PROVENANCE_UNINTELLIGIBLE $provenance" >&2; exit 17; }
echo "COMMITMENT_SOURCE_DELETE_OK"

# Unrelated grants must survive Commitment delete.
SURVIVE_A2=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A2';")
SURVIVE_BLOCK_A=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_BLOCK_A';")
SURVIVE_B=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_BLOCK_B';")
[[ "$SURVIVE_A2" == "1" && "$SURVIVE_BLOCK_A" == "1" && "$SURVIVE_B" == "1" ]] || {
  echo "UNRELATED_GRANTS_REMOVED a2=$SURVIVE_A2 blockA=$SURVIVE_BLOCK_A blockB=$SURVIVE_B" >&2
  exit 18
}
echo "CROSS_SOURCE_AND_USER_ISOLATION_AFTER_COMMITMENT_OK"

echo "=== BLOCK DELETE (authenticated-equivalent) ==="
"${PSQL[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$OWNER_A', true);
DELETE FROM public.blocks WHERE id = '$BLOCK_A';
COMMIT;
SQL

BLOCK_RESULT=$("${PSQL[@]}" -Atc "
select
  (select count(*) from public.blocks where id='$BLOCK_A')::text
  || '|' ||
  (select count(*) from public.pulse_interrupt_grants where id='$GRANT_BLOCK_A')::text
  || '|' ||
  (select count(*) from public.pulse_occurrences where id='$OCC_BLOCK_A')::text
  || '|' ||
  (select case when grant_id is null then 'null' else 'set' end
     from public.pulse_occurrences where id='$OCC_BLOCK_A')
  || '|' ||
  (select source_kind
          || '/' || coalesce(source_id::text, '')
          || '/' || source_starts_on::text
          || '/' || to_char(source_start_local, 'HH24:MI:SS')
          || '/' || extract(epoch from threshold_at)::bigint::text
          || '/' || extract(epoch from source_start_at)::bigint::text
          || '/' || extract(epoch from established_at)::bigint::text
     from public.pulse_occurrences where id='$OCC_BLOCK_A')
")
IFS='|' read -r src_cnt grant_cnt occ_cnt grant_id_state provenance <<<"$BLOCK_RESULT"
[[ "$src_cnt" == "0" ]] || { echo "BLOCK_SOURCE_NOT_DELETED $BLOCK_RESULT" >&2; exit 19; }
[[ "$grant_cnt" == "0" ]] || { echo "BLOCK_GRANT_NOT_REMOVED $BLOCK_RESULT" >&2; exit 20; }
[[ "$occ_cnt" == "1" ]] || { echo "BLOCK_OCCURRENCE_LOST $BLOCK_RESULT" >&2; exit 21; }
[[ "$grant_id_state" == "null" ]] || { echo "BLOCK_GRANT_ID_NOT_NULL $BLOCK_RESULT" >&2; exit 22; }
# 2026-10-10T17:45:00Z / 18:00:00Z / 17:46:00Z
[[ "$provenance" == "block/$BLOCK_A/2026-10-10/12:00:00/1791654300/1791655200/1791654360" ]] \
  || { echo "BLOCK_PROVENANCE_UNINTELLIGIBLE $provenance" >&2; exit 23; }
echo "BLOCK_SOURCE_DELETE_OK"

SURVIVE_B2=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_BLOCK_B';")
SURVIVE_A2B=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A2';")
[[ "$SURVIVE_B2" == "1" && "$SURVIVE_A2B" == "1" ]] || {
  echo "UNRELATED_AFTER_BLOCK_REMOVED b=$SURVIVE_B2 a2=$SURVIVE_A2B" >&2
  exit 24
}
echo "CROSS_USER_ISOLATION_AFTER_BLOCK_OK"

echo "=== SOFT REVOKE PRESERVED ==="
"${PSQL[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$OWNER_A', true);
UPDATE public.pulse_interrupt_grants
SET revoked_at = '2026-10-10T18:00:00Z'
WHERE id = '$GRANT_COMMIT_A2' AND revoked_at IS NULL;
COMMIT;
SQL
SOFT_COUNT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A2';")
SOFT_REVOKED_EPOCH=$("${PSQL[@]}" -Atc "
select extract(epoch from revoked_at)::bigint::text
from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A2';
")
# 2026-10-10T18:00:00Z
[[ "$SOFT_COUNT" == "1" && "$SOFT_REVOKED_EPOCH" == "1791655200" ]] \
  || { echo "SOFT_REVOKE_FAILED count=$SOFT_COUNT revoked_epoch=$SOFT_REVOKED_EPOCH" >&2; exit 25; }
echo "SOFT_REVOKE_OK"

echo "=== DIRECT GRANT DELETE FORBIDDEN ==="
set +e
DIRECT_OUT=$(
  "${PSQL[@]}" -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$OWNER_A', true);
DELETE FROM public.pulse_interrupt_grants WHERE id = '$GRANT_COMMIT_A2';
COMMIT;
SQL
)
DIRECT_RC=$?
set -e
echo "$DIRECT_OUT"
[[ $DIRECT_RC -ne 0 ]] || { echo "DIRECT_DELETE_UNEXPECTEDLY_SUCCEEDED" >&2; exit 26; }
echo "$DIRECT_OUT" | grep -q 'permission denied for table pulse_interrupt_grants' \
  || { echo "DIRECT_DELETE_WRONG_ERROR" >&2; exit 27; }
DIRECT_LEFT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id='$GRANT_COMMIT_A2';")
[[ "$DIRECT_LEFT" == "1" ]] || { echo "DIRECT_DELETE_REMOVED_ROW" >&2; exit 28; }
echo "DIRECT_GRANT_DELETE_FORBIDDEN_OK"

# EXECUTE posture: authenticated has EXECUTE; anon/public do not (via has_function_privilege).
EXEC_AUTH=$("${PSQL[@]}" -Atc "
select case
  when has_function_privilege('authenticated', 'public.pulse_interrupt_grants_cascade_source_delete()', 'EXECUTE')
  then 'yes' else 'no' end;
")
EXEC_ANON=$("${PSQL[@]}" -Atc "
select case
  when has_function_privilege('anon', 'public.pulse_interrupt_grants_cascade_source_delete()', 'EXECUTE')
  then 'yes' else 'no' end;
")
[[ "$EXEC_AUTH" == "yes" && "$EXEC_ANON" == "no" ]] || {
  echo "EXECUTE_POSTURE_UNEXPECTED auth=$EXEC_AUTH anon=$EXEC_ANON" >&2
  exit 29
}
echo "EXECUTE_POSTURE_OK"

echo "ORIENT-PULSE-SOURCE-DELETION-AUTHORITY-REGRESSION-CLEAR"
