#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-037
# Ephemeral PostgreSQL proof for Window-A hardening and non-consuming inspection.
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
ASSERT="$ROOT/scripts/floor-command-standing-window-a-and-inspect-regression.sql"
PORT="${ORIENT_PG_STANDING_037_PORT:-55461}"
TMP="$(mktemp -d /tmp/orient-floor-command-037-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
command -v rg >/dev/null
for f in "$BASE" "$SEQUENCE" "$APPROVAL" "$CLAIM" "$GOVERNED" "$POLICY" "$OPPORTUNITY" "$LINK" "$HARDEN" "$ASSERT"; do
  test -f "$f"
done

# Static migration safety
if rg -n "drop table|truncate |alter table public\\.floor_command_standing_opportunity_claims|alter table public\\.floor_command_observation" "$HARDEN" >/dev/null; then
  echo "harden migration rewrites historical evidence tables" >&2
  exit 1
fi
if rg -n "http_get|pg_net|cron\\.schedule|published-week|fetch\\(|ORIENT_FLOOR_COMMAND_PULL" "$HARDEN" >/dev/null; then
  echo "harden migration contains execution side effects" >&2
  exit 1
fi
if rg -n "enabled\\s*=\\s*true" "$HARDEN" >/dev/null; then
  echo "harden migration enables the standing-execution gate" >&2
  exit 1
fi

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_standing_037;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_standing_037 -v ON_ERROR_STOP=1 -q)

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
SQL

"${PSQL[@]}" -f "$BASE"
"${PSQL[@]}" -f "$SEQUENCE"
"${PSQL[@]}" -f "$APPROVAL"
"${PSQL[@]}" -f "$CLAIM"

OWNERS=(
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6
  aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7
  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1
  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2
  cccccccc-cccc-4ccc-8ccc-ccccccccccc1
  cccccccc-cccc-4ccc-8ccc-ccccccccccc2
)

for owner in "${OWNERS[@]}"; do
  "${PSQL[@]}" -c "insert into auth.users (id) values ('${owner}');" >/dev/null
  "${PSQL[@]}" -c "select public.bind_floor_command_observation('${owner}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');" >/dev/null
done

"${PSQL[@]}" -f "$GOVERNED"
"${PSQL[@]}" -f "$POLICY"
"${PSQL[@]}" -f "$OPPORTUNITY"
"${PSQL[@]}" -f "$LINK"
"${PSQL[@]}" -f "$HARDEN"

NOTICE_OUT="$("${PSQL[@]}" -f "$ASSERT" 2>&1)"
printf '%s\n' "$NOTICE_OUT"

echo "$NOTICE_OUT" | grep -q 'WINDOW_A_REVOKE_AFTER_REVALIDATE_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_GATE_DISABLE_AFTER_REVALIDATE_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_OUTSIDE_WINDOW_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_AT_MOST_ONCE_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_WRONG_OPERATOR_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_ROLLBACK_OK'
echo "$NOTICE_OUT" | grep -q 'INSPECT_NON_CONSUMING_OK'
echo "$NOTICE_OUT" | grep -q 'WINDOW_A_INSPECT_SECURITY_OK'

# Concurrent revoke vs attempt: only valid linearizations.
OWNER_R="cccccccc-cccc-4ccc-8ccc-ccccccccccc1"
"${PSQL[@]}" <<SQL >/dev/null
select set_config('orient.standing_claim_test_hooks', '1', false);
update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
SQL

META="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_R}'::uuid, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  ) as j
), approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_R}'::uuid,
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

CLAIM_ID="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
select (public.claim_floor_command_standing_opportunity(
  '${OWNER_R}'::uuid, '${POLICY_ID}'::uuid, ${POLICY_VERSION}, '${WEEK}',
  'publication_opportunity', '${AS_OF}'::timestamptz
)->'claim'->>'claim_id');
")"
test -n "$CLAIM_ID"

CONN="host=$TMP port=$PORT user=postgres dbname=floor_command_standing_037"
psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.record_floor_command_standing_opportunity_source_attempt('${OWNER_R}'::uuid, '${CLAIM_ID}'::uuid, '${AS_OF}'::timestamptz)->>'status';" >"$TMP/attempt.txt" &
PID_ATTEMPT=$!
psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "select public.revoke_floor_command_standing_policy('${OWNER_R}'::uuid, '${POLICY_ID}'::uuid, 'release-037-concurrent-revoke')->>'status';" >"$TMP/revoke.txt" &
PID_REVOKE=$!
wait "$PID_ATTEMPT" "$PID_REVOKE" || true

# -t -A still emits set_config's "1" before the status when multiple statements run.
ATTEMPT_STATUS="$(grep -E '^(source_attempted|authorization_revoked|gate_disabled|source_already_attempted)$' "$TMP/attempt.txt" | tail -n1 | tr -d '[:space:]')"
REVOKE_STATUS="$(grep -E '^(revoked|not_revocable)$' "$TMP/revoke.txt" | tail -n1 | tr -d '[:space:]')"
MARKED="$("${PSQL[@]}" -t -A -c "select source_attempted_at is not null from public.floor_command_standing_opportunity_claims where claim_id = '${CLAIM_ID}'::uuid;")"
POLICY_STATE="$("${PSQL[@]}" -t -A -c "select state from public.floor_command_standing_policies where policy_id = '${POLICY_ID}'::uuid;")"

echo "concurrent revoke/attempt attempt=${ATTEMPT_STATUS} revoke=${REVOKE_STATUS} marked=${MARKED} policy=${POLICY_STATE}"

case "$ATTEMPT_STATUS" in
  source_attempted)
    test "$MARKED" = "t"
    ;;
  authorization_revoked)
    test "$MARKED" = "f"
    test "$POLICY_STATE" = "revoked"
    ;;
  *)
    echo "unexpected attempt linearization: ${ATTEMPT_STATUS}" >&2
    exit 1
    ;;
esac
test "$REVOKE_STATUS" = "revoked" -o "$REVOKE_STATUS" = "not_revocable"
echo "WINDOW_A_CONCURRENT_REVOKE_LINEARIZATION_OK"

# Concurrent gate disable vs attempt.
OWNER_G="cccccccc-cccc-4ccc-8ccc-ccccccccccc2"
META_G="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_G}'::uuid, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  ) as j
), approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_G}'::uuid,
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
POLICY_G="$(printf '%s' "$META_G" | cut -d'|' -f1)"
VERSION_G="$(printf '%s' "$META_G" | cut -d'|' -f2)"
WEEK_G="$(printf '%s' "$META_G" | cut -d'|' -f3)"
AS_OF_G="$(printf '%s' "$META_G" | cut -d'|' -f4)"
CLAIM_G="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
select (public.claim_floor_command_standing_opportunity(
  '${OWNER_G}'::uuid, '${POLICY_G}'::uuid, ${VERSION_G}, '${WEEK_G}',
  'publication_opportunity', '${AS_OF_G}'::timestamptz
)->'claim'->>'claim_id');
")"

psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.record_floor_command_standing_opportunity_source_attempt('${OWNER_G}'::uuid, '${CLAIM_G}'::uuid, '${AS_OF_G}'::timestamptz)->>'status';" >"$TMP/gate-attempt.txt" &
PID_GA=$!
psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "update public.floor_command_standing_execution_gate set enabled = false where gate_key = 'standing_opportunity_claim'; select 'disabled';" >"$TMP/gate-disable.txt" &
PID_GD=$!
wait "$PID_GA" "$PID_GD" || true

GATE_ATTEMPT="$(grep -E '^(source_attempted|gate_disabled)$' "$TMP/gate-attempt.txt" | tail -n1 | tr -d '[:space:]')"
GATE_MARKED="$("${PSQL[@]}" -t -A -c "select source_attempted_at is not null from public.floor_command_standing_opportunity_claims where claim_id = '${CLAIM_G}'::uuid;")"
echo "concurrent gate/attempt attempt=${GATE_ATTEMPT} marked=${GATE_MARKED}"
case "$GATE_ATTEMPT" in
  source_attempted)
    test "$GATE_MARKED" = "t"
    ;;
  gate_disabled)
    test "$GATE_MARKED" = "f"
    ;;
  *)
    echo "unexpected gate linearization: ${GATE_ATTEMPT}" >&2
    cat "$TMP/gate-attempt.txt" >&2
    exit 1
    ;;
esac
echo "WINDOW_A_CONCURRENT_GATE_LINEARIZATION_OK"

# Concurrent duplicate attempt marks: exactly one source_attempted.
OWNER_D="${OWNER_G}"
# Re-enable gate and use a fresh policy/claim for duplicate attempt race.
META_D="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
update public.floor_command_standing_policies
set state = 'revoked', revoked_at = now(), revocation_reason = 'clear for duplicate attempt'
where user_id = '${OWNER_D}'::uuid and state in ('proposed', 'approved');
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_D}'::uuid, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  ) as j
), approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_D}'::uuid,
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
POLICY_D="$(printf '%s' "$META_D" | cut -d'|' -f1)"
VERSION_D="$(printf '%s' "$META_D" | cut -d'|' -f2)"
WEEK_D="$(printf '%s' "$META_D" | cut -d'|' -f3)"
AS_OF_D="$(printf '%s' "$META_D" | cut -d'|' -f4)"
CLAIM_D="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
select (public.claim_floor_command_standing_opportunity(
  '${OWNER_D}'::uuid, '${POLICY_D}'::uuid, ${VERSION_D}, '${WEEK_D}',
  'publication_opportunity', '${AS_OF_D}'::timestamptz
)->'claim'->>'claim_id');
")"

psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.record_floor_command_standing_opportunity_source_attempt('${OWNER_D}'::uuid, '${CLAIM_D}'::uuid, '${AS_OF_D}'::timestamptz)->>'status';" >"$TMP/dup1.txt" &
psql "$CONN" -v ON_ERROR_STOP=1 -q -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.record_floor_command_standing_opportunity_source_attempt('${OWNER_D}'::uuid, '${CLAIM_D}'::uuid, '${AS_OF_D}'::timestamptz)->>'status';" >"$TMP/dup2.txt" &
wait || true
DUP1="$(grep -E '^(source_attempted|source_already_attempted)$' "$TMP/dup1.txt" | tail -n1 | tr -d '[:space:]')"
DUP2="$(grep -E '^(source_attempted|source_already_attempted)$' "$TMP/dup2.txt" | tail -n1 | tr -d '[:space:]')"
SORT_DUP="$(printf '%s\n%s\n' "$DUP1" "$DUP2" | sort | tr '\n' ',')"
echo "concurrent duplicate attempts=${SORT_DUP}"
echo "$SORT_DUP" | grep -q 'source_already_attempted'
echo "$SORT_DUP" | grep -q 'source_attempted'
echo "WINDOW_A_CONCURRENT_DUPLICATE_ATTEMPT_OK"

echo "STANDING_WINDOW_A_AND_INSPECT_REGRESSION_OK"
