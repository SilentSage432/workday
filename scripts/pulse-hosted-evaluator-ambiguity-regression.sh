#!/usr/bin/env bash
# ORIENT-PULSE-AUTHORITY-004 — executable PostgreSQL regression (ephemeral cluster).
# Not production. Proves ambiguous EXISTS fails at execution; corrected function
# establishes Block + Commitment occurrences exactly once (second run converges).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BROKEN_SQL="$ROOT/supabase/migrations/20261010093000_pulse_block_start_authority.sql"
FIXED_SQL="$ROOT/supabase/migrations/20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql"
PORT="${ORIENT_PG_REGRESSION_PORT:-55441}"
TMP="$(mktemp -d /tmp/orient-pulse-004-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done
psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create database pulse_reg;
SQL

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d pulse_reg -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" <<'SQL'
create extension if not exists pgcrypto;

create table public.commitments (
  id uuid primary key,
  user_id uuid not null,
  kind text not null,
  starts_on date,
  start_local time
);

create table public.blocks (
  id uuid primary key,
  user_id uuid not null,
  kind text not null,
  starts_on date,
  start_local time
);

create table public.temporal_settings (
  user_id uuid primary key,
  time_zone text
);

create table public.pulse_interrupt_grants (
  id uuid primary key,
  user_id uuid not null,
  source_kind text not null,
  source_id uuid not null,
  transition_kind text not null,
  lead_offset_seconds integer not null,
  established_at timestamptz not null,
  revoked_at timestamptz
);

create table public.pulse_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  grant_id uuid,
  source_kind text not null,
  source_id uuid,
  source_starts_on date not null,
  source_start_local time not null,
  threshold_at timestamptz not null,
  source_start_at timestamptz not null,
  established_at timestamptz not null,
  constraint pulse_occurrences_grant_identity unique (grant_id, source_starts_on, source_start_local)
);
SQL

# Install only the establish_* function body from the historical (broken) migration.
python3 - "$BROKEN_SQL" "$TMP/broken_fn.sql" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
m = re.search(
    r"create or replace function public\.establish_due_commitment_start_pulse_occurrences\([\s\S]*?\n\$\$;\n",
    text,
)
assert m, "broken function not found"
Path(sys.argv[2]).write_text(m.group(0))
PY
"${PSQL[@]}" -f "$TMP/broken_fn.sql"

USER_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
BLOCK_ID="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
COMMIT_ID="cccccccc-cccc-cccc-cccc-cccccccccccc"
GRANT_BLOCK="dddddddd-dddd-dddd-dddd-dddddddddddd"
GRANT_COMMIT="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"

"${PSQL[@]}" <<SQL
insert into public.temporal_settings (user_id, time_zone)
values ('$USER_ID', 'America/Boise');

insert into public.blocks (id, user_id, kind, starts_on, start_local)
values ('$BLOCK_ID', '$USER_ID', 'timed', '2026-10-10', '09:30');

insert into public.commitments (id, user_id, kind, starts_on, start_local)
values ('$COMMIT_ID', '$USER_ID', 'timed', '2026-10-10', '10:00');

insert into public.pulse_interrupt_grants
  (id, user_id, source_kind, source_id, transition_kind, lead_offset_seconds, established_at, revoked_at)
values
  ('$GRANT_BLOCK', '$USER_ID', 'block', '$BLOCK_ID', 'start', 300, '2026-10-10T15:00:00Z', null),
  ('$GRANT_COMMIT', '$USER_ID', 'commitment', '$COMMIT_ID', 'start', 300, '2026-10-10T15:00:00Z', null);
SQL

# Threshold for Block 09:30 America/Boise - 300s = 15:25Z; evaluate at 15:26Z.
set +e
BROKEN_OUT=$("${PSQL[@]}" -v ON_ERROR_STOP=1 -c "select public.establish_due_commitment_start_pulse_occurrences('2026-10-10T15:26:00Z');" 2>&1)
BROKEN_RC=$?
set -e
echo "$BROKEN_OUT" | tee "$TMP/broken.out"
if [[ $BROKEN_RC -eq 0 ]]; then
  echo "EXPECTED_AMBIGUOUS_FAILURE_MISSING" >&2
  exit 2
fi
echo "$BROKEN_OUT" | grep -qi 'source_starts_on.*ambiguous\|ambiguous.*source_starts_on' \
  || { echo "EXPECTED_AMBIGUOUS_MESSAGE_MISSING" >&2; exit 3; }
echo "REPRODUCED_AMBIGUOUS_AT_EXECUTION"

# Apply forward correction (function replace only).
"${PSQL[@]}" -f "$FIXED_SQL"

assert_json() {
  local payload="$1"
  local py="$2"
  ORIENT_PULSE_JSON="$payload" python3 -c "$py"
}

BLOCK1=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-10T15:26:00Z');")
echo "BLOCK_FIRST=$BLOCK1"
assert_json "$BLOCK1" 'import json,os; r=json.loads(os.environ["ORIENT_PULSE_JSON"]); assert r["established_count"] >= 1, r; assert "block" in {i.get("source_kind") for i in r["established_identities"]}, r; print("BLOCK_ESTABLISHED_OK")'

BLOCK_COUNT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_BLOCK' and source_starts_on='2026-10-10' and source_start_local='09:30:00';")
[[ "$BLOCK_COUNT" == "1" ]] || { echo "BLOCK_OCC_COUNT=$BLOCK_COUNT" >&2; exit 4; }

BLOCK2=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-10T15:26:00Z');")
echo "BLOCK_SECOND=$BLOCK2"
assert_json "$BLOCK2" 'import json,os; r=json.loads(os.environ["ORIENT_PULSE_JSON"]); assert r["established_count"] == 0, r; print("BLOCK_SECOND_NO_DUPLICATE_OK")'
BLOCK_COUNT2=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_BLOCK';")
[[ "$BLOCK_COUNT2" == "1" ]] || { echo "BLOCK_DUP_COUNT=$BLOCK_COUNT2" >&2; exit 5; }

# Commitment path: start 10:00 America/Boise = 16:00Z; threshold 15:55Z; evaluate 15:56Z.
COMMIT1=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-10T15:56:00Z');")
echo "COMMIT_FIRST=$COMMIT1"
assert_json "$COMMIT1" 'import json,os; r=json.loads(os.environ["ORIENT_PULSE_JSON"]); assert r["established_count"] >= 1, r; assert "commitment" in {i.get("source_kind") for i in r["established_identities"]}, r; print("COMMITMENT_ESTABLISHED_OK")'
COMMIT_COUNT=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_COMMIT' and source_starts_on='2026-10-10' and source_start_local='10:00:00';")
[[ "$COMMIT_COUNT" == "1" ]] || { echo "COMMIT_OCC_COUNT=$COMMIT_COUNT" >&2; exit 6; }

COMMIT2=$("${PSQL[@]}" -Atc "select public.establish_due_commitment_start_pulse_occurrences('2026-10-10T15:56:00Z');")
assert_json "$COMMIT2" 'import json,os; r=json.loads(os.environ["ORIENT_PULSE_JSON"]); assert r["established_count"] == 0, r; print("COMMITMENT_SECOND_NO_DUPLICATE_OK")'
COMMIT_COUNT2=$("${PSQL[@]}" -Atc "select count(*)::text from public.pulse_occurrences where grant_id='$GRANT_COMMIT';")
[[ "$COMMIT_COUNT2" == "1" ]] || { echo "COMMIT_DUP_COUNT=$COMMIT_COUNT2" >&2; exit 7; }

echo "ORIENT-PULSE-HOSTED-EVALUATOR-AMBIGUITY-REGRESSION-CLEAR"
