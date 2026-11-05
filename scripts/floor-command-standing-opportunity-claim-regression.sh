#!/usr/bin/env bash
# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-029
# Ephemeral PostgreSQL proof for durable standing opportunity claims.
# Does not contact Floor Command and does not use a hosted database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
GOVERNED="$ROOT/supabase/migrations/20261029010000_floor_command_governed_observation.sql"
POLICY="$ROOT/supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql"
OPPORTUNITY="$ROOT/supabase/migrations/20261103160000_floor_command_standing_opportunity_claims.sql"
ASSERT="$ROOT/scripts/floor-command-standing-opportunity-claim-regression.sql"
PORT="${ORIENT_PG_STANDING_CLAIM_PORT:-55458}"
TMP="$(mktemp -d /tmp/orient-floor-command-029-XXXXXX)"
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
test -f "$OPPORTUNITY"
test -f "$ASSERT"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c 'create database floor_command_standing_claim;'
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_standing_claim -v ON_ERROR_STOP=1 -q)

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
"${PSQL[@]}" -f "$OPPORTUNITY"
"${PSQL[@]}" -f "$ASSERT"
echo "OPPORTUNITY_CLAIM_CORE_OK"
echo "UNAUTHORIZED_OR_GATE_OK"
echo "CLAIM_PREDICATE_OK"
echo "RECONCILIATION_OK"
echo "ROLLBACK_AND_DURABILITY_OK"
echo "REVOCATION_EXPIRY_OK"
echo "SECURITY_OK"

# Concurrent claim race: one winner.
"${PSQL[@]}" -c "select public.bind_floor_command_observation('${OWNER_D}', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');" >/dev/null

RACE_META="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_D}'::uuid, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  ) as result
), approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_D}'::uuid,
    (select (result->'policy'->>'policy_id')::uuid from proposed)
  ) as result
)
select
  (result->'policy'->>'policy_id') || '|' ||
  (result->'policy'->>'policy_version') || '|' ||
  (result->'policy'->'windows'->0->>'operational_week') || '|' ||
  (((result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour')::text)
from approved;
")"
RACE_POLICY="${RACE_META%%|*}"
REST="${RACE_META#*|}"
RACE_VERSION="${REST%%|*}"
REST="${REST#*|}"
RACE_WEEK="${REST%%|*}"
RACE_AS_OF="${REST#*|}"

"${PSQL[@]}" -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.claim_floor_command_standing_opportunity('${OWNER_D}'::uuid, '${RACE_POLICY}'::uuid, ${RACE_VERSION}, '${RACE_WEEK}', 'publication_opportunity', '${RACE_AS_OF}'::timestamptz)->>'status';" > "$TMP/claim1.txt" &
"${PSQL[@]}" -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.claim_floor_command_standing_opportunity('${OWNER_D}'::uuid, '${RACE_POLICY}'::uuid, ${RACE_VERSION}, '${RACE_WEEK}', 'publication_opportunity', '${RACE_AS_OF}'::timestamptz)->>'status';" > "$TMP/claim2.txt" &
wait
SORT_STATUSES="$(printf '%s\n%s\n' "$(cat "$TMP/claim1.txt")" "$(cat "$TMP/claim2.txt")" | sort | tr '\n' ',')"
echo "concurrent statuses=${SORT_STATUSES}"
"${PSQL[@]}" <<SQL
do \$\$
declare
  v_claimed integer;
  v_statuses text;
begin
  select count(*) into v_claimed
  from public.floor_command_standing_opportunity_claims
  where policy_id = '${RACE_POLICY}'::uuid
    and opportunity_kind = 'publication_opportunity';
  if v_claimed <> 1 then
    raise exception 'concurrent claims stored %', v_claimed;
  end if;
end \$\$;
SQL
if ! grep -q 'claimed' "$TMP/claim1.txt" && ! grep -q 'claimed' "$TMP/claim2.txt"; then
  echo "missing claimed winner" >&2
  cat "$TMP/claim1.txt" "$TMP/claim2.txt" >&2
  exit 1
fi
if ! grep -q 'already_claimed' "$TMP/claim1.txt" && ! grep -q 'already_claimed' "$TMP/claim2.txt"; then
  # One session may see unique_violation mapped to already_claimed; both claimed is impossible due to unique.
  # If serialization made one wait, statuses are claimed + already_claimed.
  echo "expected already_claimed loser" >&2
  cat "$TMP/claim1.txt" "$TMP/claim2.txt" >&2
  exit 1
fi
echo "CONCURRENT_CLAIM_OK"

# Concurrent claim vs revoke.
# Prior race left approved policy open for D — revoke it first if needed.
"${PSQL[@]}" <<SQL
do \$\$
declare
  v_id uuid;
  v_meta text;
begin
  perform set_config('orient.standing_claim_test_hooks', '1', false);
  update public.floor_command_standing_execution_gate set enabled = true where gate_key = 'standing_opportunity_claim';
  select policy_id into v_id
  from public.floor_command_standing_policies
  where user_id = '${OWNER_D}'::uuid and state in ('proposed', 'approved')
  limit 1;
  if v_id is not null then
    perform public.revoke_floor_command_standing_policy('${OWNER_D}'::uuid, v_id, 'clear for revoke race');
  end if;
end \$\$;
SQL
RACE2_META="$("${PSQL[@]}" -t -A -c "
select set_config('orient.standing_claim_test_hooks', '1', false);
with proposed as (
  select public.propose_floor_command_standing_policy(
    '${OWNER_D}'::uuid, now(), now() + interval '30 days', 1, 0, 'America/Boise'
  ) as result
), approved as (
  select public.approve_floor_command_standing_policy(
    '${OWNER_D}'::uuid,
    (select (result->'policy'->>'policy_id')::uuid from proposed)
  ) as result
)
select
  (result->'policy'->>'policy_id') || '|' ||
  (result->'policy'->>'policy_version') || '|' ||
  (result->'policy'->'windows'->0->>'operational_week') || '|' ||
  (((result->'policy'->'windows'->0->>'opens_at')::timestamptz + interval '1 hour')::text)
from approved;
")"
RACE2_POLICY="${RACE2_META%%|*}"
REST="${RACE2_META#*|}"
RACE2_VERSION="${REST%%|*}"
REST="${REST#*|}"
RACE2_WEEK="${REST%%|*}"
RACE2_AS_OF="${REST#*|}"

"${PSQL[@]}" -t -A -c "select set_config('orient.standing_claim_test_hooks', '1', false); select public.claim_floor_command_standing_opportunity('${OWNER_D}'::uuid, '${RACE2_POLICY}'::uuid, ${RACE2_VERSION}, '${RACE2_WEEK}', 'publication_opportunity', '${RACE2_AS_OF}'::timestamptz)->>'status';" > "$TMP/revclaim.txt" &
"${PSQL[@]}" -t -A -c "select public.revoke_floor_command_standing_policy('${OWNER_D}'::uuid, '${RACE2_POLICY}'::uuid, 'concurrent revoke race')->>'status';" > "$TMP/revrevoke.txt" &
wait
echo "claim_vs_revoke claim=$(cat "$TMP/revclaim.txt") revoke=$(cat "$TMP/revrevoke.txt")"
"${PSQL[@]}" <<SQL
do \$\$
declare
  v_state text;
  v_claims integer;
begin
  select state into v_state
  from public.floor_command_standing_policies
  where policy_id = '${RACE2_POLICY}'::uuid;
  if v_state is distinct from 'revoked' then
    raise exception 'revoke race final state %', v_state;
  end if;
  select count(*) into v_claims
  from public.floor_command_standing_opportunity_claims
  where policy_id = '${RACE2_POLICY}'::uuid;
  if v_claims not in (0, 1) then
    raise exception 'revoke race claim count %', v_claims;
  end if;
  -- If a claim committed, it must be auditable and cannot be duplicated later.
  if v_claims > 1 then
    raise exception 'duplicate after revoke race';
  end if;
end \$\$;
SQL
echo "REVOKE_RACE_OK"

# Final non-execution census.
"${PSQL[@]}" <<SQL
do \$\$
declare
  v_requests integer;
  v_inflight integer;
  v_latch text;
begin
  select count(*) into v_requests from public.floor_command_observation_requests;
  select count(*) into v_inflight from public.floor_command_observation_requests where state = 'in_progress';
  select last_attempt_result into v_latch
  from public.floor_command_observation_attempts
  where user_id = '${OWNER_A}'::uuid;
  if v_inflight <> 0 then
    raise exception 'inflight requests %', v_inflight;
  end if;
  if v_latch is distinct from 'success_complete' then
    raise exception 'latch %', v_latch;
  end if;
  if exists (select 1 from public.floor_command_controlled_pull_claims) then
    raise exception 'controlled pull claims present';
  end if;
  -- Gate may remain enabled only in this ephemeral database.
end \$\$;
SQL
echo "NO_OBSERVATION_SIDE_EFFECT_OK"
echo "STANDING_OPPORTUNITY_CLAIM_OK"
