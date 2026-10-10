#!/usr/bin/env bash
# ORIENT-PULSE-EXPRESSION-005-I — PostgreSQL arrival relationship foundation regression.
# Ephemeral cluster only. Not production. Does not mutate Orient/Wealth hosted DBs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_SQL="$ROOT/supabase/migrations/20261010200000_pulse_authorized_temporal_relationships.sql"
PORT="${ORIENT_PG_REGRESSION_PORT:-55443}"
TMP="$(mktemp -d /tmp/orient-pulse-005i-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
test -f "$MIGRATION_SQL"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done
psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create database pulse_005i;
SQL

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d pulse_005i -v ON_ERROR_STOP=1 -q)

# Pre-005-I production-shaped schema (grants/occurrences without relationship).
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

create table public.temporal_settings (
  user_id uuid primary key references auth.users (id),
  time_zone text
);

create table public.pulse_interrupt_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  transition_kind text not null,
  lead_offset_seconds integer not null,
  established_at timestamptz not null,
  revoked_at timestamptz,
  constraint pulse_interrupt_grants_source_kind_known check (source_kind in ('commitment', 'block')),
  constraint pulse_interrupt_grants_transition_kind_known check (transition_kind = 'start'),
  constraint pulse_interrupt_grants_lead_positive check (lead_offset_seconds > 0),
  constraint pulse_interrupt_grants_revoke_order check (
    revoked_at is null or revoked_at >= established_at
  )
);
create unique index pulse_interrupt_grants_one_active_idx
  on public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind)
  where revoked_at is null;
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
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_id uuid,
  source_kind text not null,
  source_id uuid,
  source_starts_on date not null,
  source_start_local time not null,
  threshold_at timestamptz not null,
  source_start_at timestamptz not null,
  established_at timestamptz not null,
  constraint pulse_occurrences_source_kind_known check (source_kind in ('commitment', 'block')),
  constraint pulse_occurrences_grant_fk
    foreign key (grant_id) references public.pulse_interrupt_grants (id) on delete set null,
  constraint pulse_occurrences_grant_identity unique (grant_id, source_starts_on, source_start_local)
);
alter table public.pulse_occurrences enable row level security;
revoke all on table public.pulse_occurrences from public;
revoke all on table public.pulse_occurrences from anon;
revoke all on table public.pulse_occurrences from authenticated;
grant select, insert on table public.pulse_occurrences to authenticated;

-- Timed-source trigger (pre-relationship shape; migration replaces body).
create or replace function public.pulse_interrupt_grant_requires_timed_source()
returns trigger language plpgsql as $$
declare
  source_row_kind text;
  source_start time;
begin
  if new.transition_kind is distinct from 'start' then
    raise exception 'Interrupt grant requires transition start.';
  end if;
  if new.lead_offset_seconds is null or new.lead_offset_seconds <= 0 then
    raise exception 'Interrupt grant requires a positive lead offset.';
  end if;
  if new.source_kind = 'commitment' then
    select cm.kind, cm.start_local into source_row_kind, source_start
    from public.commitments cm where cm.id = new.source_id and cm.user_id = new.user_id;
    if source_row_kind is null then raise exception 'Interrupt grant requires an owned Commitment.'; end if;
    if source_row_kind <> 'timed' or source_start is null then
      raise exception 'Interrupt grant requires a timed Commitment start.';
    end if;
  elsif new.source_kind = 'block' then
    select bl.kind, bl.start_local into source_row_kind, source_start
    from public.blocks bl where bl.id = new.source_id and bl.user_id = new.user_id;
    if source_row_kind is null then raise exception 'Interrupt grant requires an owned Block.'; end if;
    if source_row_kind <> 'timed' or source_start is null then
      raise exception 'Interrupt grant requires a timed Block start.';
    end if;
  else
    raise exception 'Interrupt grant has an unsupported source kind.';
  end if;
  return new;
end;
$$;
create trigger pulse_interrupt_grants_timed_source
  before insert on public.pulse_interrupt_grants
  for each row execute function public.pulse_interrupt_grant_requires_timed_source();

-- LIFECYCLE-003 DEFINER cleanup (preserved across 005-I).
create or replace function public.pulse_interrupt_grants_cascade_source_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_argv[0] is distinct from 'commitment'
     and tg_argv[0] is distinct from 'block' then
    raise exception 'unsupported pulse source kind for grant cleanup: %', tg_argv[0];
  end if;
  delete from public.pulse_interrupt_grants
  where source_kind = tg_argv[0]
    and source_id = old.id
    and user_id = old.user_id;
  return old;
end;
$$;
revoke all on function public.pulse_interrupt_grants_cascade_source_delete() from public;
revoke all on function public.pulse_interrupt_grants_cascade_source_delete() from anon;
grant execute on function public.pulse_interrupt_grants_cascade_source_delete() to authenticated;
create trigger pulse_interrupt_grants_cascade_commitment_delete
  after delete on public.commitments
  for each row execute function public.pulse_interrupt_grants_cascade_source_delete('commitment');
create trigger pulse_interrupt_grants_cascade_block_delete
  after delete on public.blocks
  for each row execute function public.pulse_interrupt_grants_cascade_source_delete('block');

-- Placeholder evaluator; migration replaces with relationship-aware body.
create or replace function public.establish_due_commitment_start_pulse_occurrences(
  p_now timestamptz default timezone('utc', now())
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('examined_grant_count', 0, 'established_count', 0, 'established_identities', '[]'::jsonb);
end;
$$;
SQL

USER_A="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
COMMIT_A="cccccccc-cccc-cccc-cccc-cccccccccccc"
COMMIT_B="dddddddd-dddd-dddd-dddd-dddddddddddd"
BLOCK_A="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
GRANT_REL_HIST="11111111-1111-1111-1111-111111111111"
GRANT_REVOKED="22222222-2222-2222-2222-222222222222"
OCC_HIST="33333333-3333-3333-3333-333333333333"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values ('$USER_A'), ('$USER_B');
insert into public.temporal_settings (user_id, time_zone) values
  ('$USER_A', 'America/Denver'),
  ('$USER_B', 'America/Denver');

insert into public.commitments (id, user_id, starts_on, kind, start_local, end_local, title)
values
  ('$COMMIT_A', '$USER_A', '2026-10-08', 'timed', '15:00', '16:00', 'Doctor'),
  ('$COMMIT_B', '$USER_B', '2026-10-08', 'timed', '15:00', '16:00', 'Other');

insert into public.blocks (id, user_id, starts_on, kind, start_local, end_local, purpose)
values ('$BLOCK_A', '$USER_A', '2026-10-08', 'timed', '15:00', '16:00', 'Deep work');

-- Historical relative-before-shaped grant + revoked grant + occurrence (threshold < T).
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, lead_offset_seconds, established_at, revoked_at)
values
  ('$GRANT_REL_HIST', '$USER_A', 'commitment', '$COMMIT_A', 'start', 900, '2026-10-08T12:00:00Z', null),
  ('$GRANT_REVOKED', '$USER_A', 'block', '$BLOCK_A', 'start', 900, '2026-10-08T11:00:00Z', '2026-10-08T11:30:00Z');

insert into public.pulse_occurrences
  (id, user_id, grant_id, source_kind, source_id, source_starts_on, source_start_local,
   threshold_at, source_start_at, established_at)
values
  ('$OCC_HIST', '$USER_A', '$GRANT_REL_HIST', 'commitment', '$COMMIT_A', '2026-10-08', '15:00',
   '2026-10-08T20:45:00Z', '2026-10-08T21:00:00Z', '2026-10-08T20:45:00Z');
SQL

# Apply 005-I migration.
"${PSQL[@]}" -f "$MIGRATION_SQL"

# --- Migration backfill evidence ---
ARRIVAL_GRANTS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where relationship = 'arrival';")
ARRIVAL_OCCS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where relationship = 'arrival';")
REL_GRANTS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where relationship = 'relative_before';")
REL_OCCS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where relationship = 'relative_before';")
TOTAL_GRANTS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants;")
TOTAL_OCCS=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences;")
REVOKED_STILL=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where id = '$GRANT_REVOKED' and revoked_at is not null;")
[[ "$ARRIVAL_GRANTS" == "0" ]] || { echo "BACKFILL_ARRIVAL_GRANTS=$ARRIVAL_GRANTS" >&2; exit 10; }
[[ "$ARRIVAL_OCCS" == "0" ]] || { echo "BACKFILL_ARRIVAL_OCCS=$ARRIVAL_OCCS" >&2; exit 11; }
[[ "$REL_GRANTS" == "$TOTAL_GRANTS" ]] || { echo "BACKFILL_GRANT_MISMATCH" >&2; exit 12; }
[[ "$REL_OCCS" == "$TOTAL_OCCS" ]] || { echo "BACKFILL_OCC_MISMATCH" >&2; exit 13; }
[[ "$REVOKED_STILL" == "1" ]] || { echo "REVOKED_LOST" >&2; exit 14; }
echo "MIGRATION_BACKFILL_RELATIVE_BEFORE_ONLY_OK"

expect_fail() {
  local label="$1"
  shift
  set +e
  local out
  out=$("${PSQL[@]}" -v ON_ERROR_STOP=1 -c "$1" 2>&1)
  local rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    echo "EXPECTED_FAIL_MISSING: $label" >&2
    echo "$out" >&2
    exit 20
  fi
  echo "REJECTED_OK: $label"
}

# 1 relative_before valid
"${PSQL[@]}" <<SQL
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at, revoked_at)
values
  ('aaaaaaaa-0001-0001-0001-000000000001', '$USER_B', 'commitment', '$COMMIT_B', 'start',
   'relative_before', 900, '2026-10-08T12:00:00Z', null);
SQL
echo "RELATIVE_BEFORE_VALID_OK"

# 2-4 relative_before lead rules
expect_fail "relative_before_null_lead" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_B', 'commitment', '$COMMIT_B', 'start', 'relative_before', null, now());"
expect_fail "relative_before_zero_lead" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_B', 'commitment', '$COMMIT_B', 'start', 'relative_before', 0, now());"
expect_fail "relative_before_negative_lead" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_B', 'commitment', '$COMMIT_B', 'start', 'relative_before', -1, now());"

GRANT_ARR_A="aaaaaaaa-0002-0002-0002-000000000002"
GRANT_ARR_BLOCK="aaaaaaaa-0003-0003-0003-000000000003"
GRANT_REL_BLOCK="aaaaaaaa-0004-0004-0004-000000000004"

# 5 arrival accepts null lead (controlled insert)
"${PSQL[@]}" <<SQL
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at, revoked_at)
values
  ('$GRANT_ARR_A', '$USER_A', 'commitment', '$COMMIT_A', 'start', 'arrival', null, '2026-10-08T12:05:00Z', null);
SQL
echo "ARRIVAL_NULL_LEAD_OK"

# 6-7 arrival rejects positive/zero lead
expect_fail "arrival_positive_lead" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_A', 'block', '$BLOCK_A', 'start', 'arrival', 900, now());"
expect_fail "arrival_zero_lead" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_A', 'block', '$BLOCK_A', 'start', 'arrival', 0, now());"

# 8 unknown relationship
expect_fail "unknown_relationship" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_A', 'block', '$BLOCK_A', 'start', 'approach', null, now());"

# 9 dual active relationships on same source/start
"${PSQL[@]}" <<SQL
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at, revoked_at)
values
  ('$GRANT_REL_BLOCK', '$USER_A', 'block', '$BLOCK_A', 'start', 'relative_before', 900, '2026-10-08T12:10:00Z', null),
  ('$GRANT_ARR_BLOCK', '$USER_A', 'block', '$BLOCK_A', 'start', 'arrival', null, '2026-10-08T12:11:00Z', null);
SQL
DUAL=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where source_id='$BLOCK_A' and revoked_at is null;")
[[ "$DUAL" == "2" ]] || { echo "DUAL_ACTIVE=$DUAL" >&2; exit 21; }
echo "DUAL_ACTIVE_RELATIONSHIPS_OK"

# 10-11 duplicate active rejected
expect_fail "duplicate_active_relative_before" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_A', 'block', '$BLOCK_A', 'start', 'relative_before', 1800, now());"
expect_fail "duplicate_active_arrival" \
  "insert into public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
   values ('$USER_A', 'block', '$BLOCK_A', 'start', 'arrival', null, now());"

# 12-14 independent revoke
"${PSQL[@]}" <<SQL
update public.pulse_interrupt_grants
set revoked_at = '2026-10-08T13:00:00Z'
where id = '$GRANT_REL_BLOCK';
SQL
REL_REV=$("${PSQL[@]}" -Atc "select revoked_at is not null from public.pulse_interrupt_grants where id='$GRANT_REL_BLOCK';")
ARR_LIVE=$("${PSQL[@]}" -Atc "select revoked_at is null from public.pulse_interrupt_grants where id='$GRANT_ARR_BLOCK';")
[[ "$REL_REV" == "t" && "$ARR_LIVE" == "t" ]] || { echo "INDEPENDENT_REVOKE_REL_FAILED rel=$REL_REV arr=$ARR_LIVE" >&2; exit 22; }
"${PSQL[@]}" <<SQL
update public.pulse_interrupt_grants
set revoked_at = null
where id = '$GRANT_REL_BLOCK';
update public.pulse_interrupt_grants
set revoked_at = '2026-10-08T13:05:00Z'
where id = '$GRANT_ARR_BLOCK';
SQL
REL_LIVE=$("${PSQL[@]}" -Atc "select revoked_at is null from public.pulse_interrupt_grants where id='$GRANT_REL_BLOCK';")
ARR_REV=$("${PSQL[@]}" -Atc "select revoked_at is not null from public.pulse_interrupt_grants where id='$GRANT_ARR_BLOCK';")
[[ "$REL_LIVE" == "t" && "$ARR_REV" == "t" ]] || { echo "INDEPENDENT_REVOKE_ARR_FAILED rel=$REL_LIVE arr=$ARR_REV" >&2; exit 23; }
# restore both active for later evaluator/cleanup proofs
"${PSQL[@]}" <<SQL
update public.pulse_interrupt_grants set revoked_at = null where id in ('$GRANT_REL_BLOCK', '$GRANT_ARR_BLOCK');
SQL
echo "INDEPENDENT_REVOKE_OK"

# 15 cross-user isolation: user B cannot see user A grants under RLS
ISO=$(
  "${PSQL[@]}" -v ON_ERROR_STOP=1 <<SQL | awk 'NF && $1 ~ /^[0-9]+$/ { print $1; exit }'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$USER_B', true);
SELECT count(*)::text FROM public.pulse_interrupt_grants WHERE user_id = '$USER_A';
COMMIT;
SQL
)
[[ "$ISO" == "0" ]] || { echo "CROSS_USER_LEAK=$ISO" >&2; exit 24; }
echo "CROSS_USER_ISOLATION_OK"

# 16-23 evaluator thresholds + establishment + duplicates
# Historical grant already has an occurrence for its fingerprint — rerun must not duplicate it.
REL_EVAL=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-08T20:50:00Z');")
echo "REL_EVAL=$REL_EVAL"
HIST_COUNT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_REL_HIST';")
[[ "$HIST_COUNT" == "1" ]] || { echo "HIST_DUP=$HIST_COUNT" >&2; exit 40; }
ORIENT_PULSE_JSON="$REL_EVAL" G="$GRANT_REL_HIST" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert not any(i.get("grant_id")==os.environ["G"] for i in r["established_identities"]), r
print("RELATIVE_BEFORE_EXISTING_OCCURRENCE_CONVERGED_OK")
'

# Fresh commitment for relative_before establish proof
COMMIT_NEW="ffffffff-ffff-ffff-ffff-ffffffffffff"
GRANT_REL_NEW="aaaaaaaa-0005-0005-0005-000000000005"
"${PSQL[@]}" <<SQL
insert into public.commitments (id, user_id, starts_on, kind, start_local, end_local, title)
values ('$COMMIT_NEW', '$USER_A', '2026-10-09', 'timed', '10:00', '11:00', 'Fresh');
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
values
  ('$GRANT_REL_NEW', '$USER_A', 'commitment', '$COMMIT_NEW', 'start', 'relative_before', 300, '2026-10-09T12:00:00Z');
SQL
# 10:00 America/Denver = 16:00Z; threshold 15:55Z
REL1=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-09T15:56:00Z');")
G="$GRANT_REL_NEW" ORIENT_PULSE_JSON="$REL1" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert r["established_count"] >= 1, r
assert any(i.get("relationship")=="relative_before" and i.get("grant_id")==os.environ["G"] for i in r["established_identities"]), r
print("COMMITMENT_RELATIVE_BEFORE_ESTABLISHED_OK")
'
THRESH_REL=$("${PSQL[@]}" -Atc "select threshold_at::text from public.pulse_occurrences where grant_id='$GRANT_REL_NEW';")
START_REL=$("${PSQL[@]}" -Atc "select source_start_at::text from public.pulse_occurrences where grant_id='$GRANT_REL_NEW';")
# threshold should be 300s before start
"${PSQL[@]}" -Atc "select (source_start_at - threshold_at) = interval '300 seconds' from public.pulse_occurrences where grant_id='$GRANT_REL_NEW';" \
  | grep -qx t || { echo "REL_THRESHOLD_NOT_T_MINUS_L thresh=$THRESH_REL start=$START_REL" >&2; exit 25; }
echo "RELATIVE_BEFORE_THRESHOLD_T_MINUS_L_OK"

REL2=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-09T15:56:00Z');")
ORIENT_PULSE_JSON="$REL2" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert r["established_count"] == 0, r
print("RELATIVE_BEFORE_RERUN_NO_DUPLICATE_OK")
'

# Controlled Commitment arrival: threshold = T
GRANT_ARR_NEW="aaaaaaaa-0006-0006-0006-000000000006"
"${PSQL[@]}" <<SQL
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
values
  ('$GRANT_ARR_NEW', '$USER_A', 'commitment', '$COMMIT_NEW', 'start', 'arrival', null, '2026-10-09T12:01:00Z');
SQL
# Before T: no establish
ARR0=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-09T15:59:00Z');")
ORIENT_PULSE_JSON="$ARR0" G="$GRANT_ARR_NEW" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert not any(i.get("grant_id")==os.environ["G"] for i in r["established_identities"]), r
print("ARRIVAL_BEFORE_T_WITHHELD_OK")
'
ARR1=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-09T16:00:00Z');")
ORIENT_PULSE_JSON="$ARR1" G="$GRANT_ARR_NEW" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert any(i.get("relationship")=="arrival" and i.get("grant_id")==os.environ["G"] for i in r["established_identities"]), r
print("COMMITMENT_ARRIVAL_ESTABLISHED_OK")
'
"${PSQL[@]}" -Atc "select threshold_at = source_start_at from public.pulse_occurrences where grant_id='$GRANT_ARR_NEW';" \
  | grep -qx t || { echo "ARRIVAL_THRESHOLD_NOT_T" >&2; exit 26; }
echo "ARRIVAL_THRESHOLD_T_OK"
ARR_REL=$("${PSQL[@]}" -Atc "select relationship from public.pulse_occurrences where grant_id='$GRANT_ARR_NEW';")
[[ "$ARR_REL" == "arrival" ]] || { echo "ARRIVAL_OCC_RELATIONSHIP=$ARR_REL" >&2; exit 27; }

ARR2=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-09T16:00:00Z');")
ORIENT_PULSE_JSON="$ARR2" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert r["established_count"] == 0, r
print("ARRIVAL_RERUN_NO_DUPLICATE_OK")
'

# Block relative_before may already have been established in the earlier 20:50Z tick.
# Assert durable occurrence provenance rather than this-run identities only.
BLOCK_REL_OCC=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_REL_BLOCK' and relationship='relative_before';")
[[ "$BLOCK_REL_OCC" == "1" ]] || { echo "BLOCK_REL_OCC=$BLOCK_REL_OCC" >&2; exit 41; }
echo "BLOCK_RELATIVE_BEFORE_ESTABLISHED_OK"
BLOCK_ARR1=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-08T21:00:00Z');")
echo "BLOCK_ARR1=$BLOCK_ARR1"
BLOCK_ARR_OCC=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_ARR_BLOCK' and relationship='arrival' and threshold_at = source_start_at;")
[[ "$BLOCK_ARR_OCC" == "1" ]] || { echo "BLOCK_ARR_OCC=$BLOCK_ARR_OCC" >&2; exit 42; }
echo "BLOCK_ARRIVAL_ESTABLISHED_OK"

# 24 source rescheduling before occurrence follows live T
COMMIT_MOVE="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0007"
GRANT_MOVE_REL="aaaaaaaa-0007-0007-0007-000000000007"
GRANT_MOVE_ARR="aaaaaaaa-0008-0008-0008-000000000008"
"${PSQL[@]}" <<SQL
insert into public.commitments (id, user_id, starts_on, kind, start_local, end_local, title)
values ('$COMMIT_MOVE', '$USER_A', '2026-10-11', 'timed', '09:00', '10:00', 'Moveable');
insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, relationship, lead_offset_seconds, established_at)
values
  ('$GRANT_MOVE_REL', '$USER_A', 'commitment', '$COMMIT_MOVE', 'start', 'relative_before', 300, now()),
  ('$GRANT_MOVE_ARR', '$USER_A', 'commitment', '$COMMIT_MOVE', 'start', 'arrival', null, now());
-- Reschedule start to 10:00 before any occurrence
update public.commitments set start_local = '10:00' where id = '$COMMIT_MOVE';
SQL
# 10:00 Denver = 16:00Z; relative threshold 15:55Z; arrival 16:00Z
MOVE_EARLY=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-11T15:50:00Z');")
ORIENT_PULSE_JSON="$MOVE_EARLY" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert r["established_count"] == 0, r
print("RESCHEDULE_BEFORE_THRESHOLD_OK")
'
MOVE_REL=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-11T15:56:00Z');")
ORIENT_PULSE_JSON="$MOVE_REL" G="$GRANT_MOVE_REL" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert any(i.get("grant_id")==os.environ["G"] and i.get("source_start_local")=="10:00:00" for i in r["established_identities"]), r
print("RESCHEDULE_RELATIVE_BEFORE_FOLLOWS_LIVE_T_OK")
'
MOVE_ARR=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-11T16:00:00Z');")
ORIENT_PULSE_JSON="$MOVE_ARR" G="$GRANT_MOVE_ARR" python3 -c '
import json,os
r=json.loads(os.environ["ORIENT_PULSE_JSON"])
assert any(i.get("grant_id")==os.environ["G"] and i.get("relationship")=="arrival" and i.get("source_start_local")=="10:00:00" for i in r["established_identities"]), r
print("RESCHEDULE_ARRIVAL_FOLLOWS_LIVE_T_OK")
'

# 25-27 source deletion removes both relationship grants; occurrences survive with relationship
OCC_BEFORE=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where source_id='$BLOCK_A';")
"${PSQL[@]}" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$USER_A', true);
DELETE FROM public.blocks WHERE id = '$BLOCK_A';
COMMIT;
SQL
GRANT_LEFT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_interrupt_grants where source_id='$BLOCK_A';")
OCC_AFTER=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where source_id='$BLOCK_A';")
NULL_GRANT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where source_id='$BLOCK_A' and grant_id is null;")
REL_SURVIVE=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where source_id='$BLOCK_A' and relationship is not null;")
[[ "$GRANT_LEFT" == "0" ]] || { echo "SOURCE_DELETE_GRANTS_LEFT=$GRANT_LEFT" >&2; exit 28; }
[[ "$OCC_AFTER" == "$OCC_BEFORE" ]] || { echo "OCC_LOST before=$OCC_BEFORE after=$OCC_AFTER" >&2; exit 29; }
[[ "$NULL_GRANT" == "$OCC_AFTER" ]] || { echo "GRANT_ID_NOT_SET_NULL=$NULL_GRANT/$OCC_AFTER" >&2; exit 30; }
[[ "$REL_SURVIVE" == "$OCC_AFTER" ]] || { echo "RELATIONSHIP_LOST" >&2; exit 31; }
echo "SOURCE_DELETE_BOTH_RELATIONSHIPS_OCCURRENCES_RETAINED_OK"

# 28 authenticated direct grant DELETE forbidden
set +e
DEL_OUT=$(
  "${PSQL[@]}" -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$USER_A', true);
DELETE FROM public.pulse_interrupt_grants WHERE id = '$GRANT_REL_HIST';
COMMIT;
SQL
)
DEL_RC=$?
set -e
if [[ $DEL_RC -eq 0 ]]; then
  echo "DIRECT_GRANT_DELETE_UNEXPECTEDLY_ALLOWED" >&2
  echo "$DEL_OUT" >&2
  exit 32
fi
echo "$DEL_OUT" | grep -qi 'permission denied' || { echo "DIRECT_DELETE_UNEXPECTED: $DEL_OUT" >&2; exit 33; }
echo "DIRECT_GRANT_DELETE_FORBIDDEN_OK"

# Cleanup function posture preserved
DEF=$("${PSQL[@]}" -Atc "select prosecdef from pg_proc where proname='pulse_interrupt_grants_cascade_source_delete';")
[[ "$DEF" == "t" ]] || { echo "CLEANUP_NOT_DEFINER def=$DEF" >&2; exit 34; }
echo "CLEANUP_SECURITY_DEFINER_OK"

echo "ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-REGRESSION-CLEAR"
