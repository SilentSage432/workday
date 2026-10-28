#!/usr/bin/env bash
# ORIENT-FLOOR-COMMAND-003 — ephemeral PostgreSQL regression.
# RELEASE-004A adds the controlled-pull claim fence to the same disposable database.
# Not production. Proves retained snapshots, ordering, failed reads,
# dismissal, store isolation, and the absence of personal-record tables.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
APPROVAL="$ROOT/supabase/migrations/20261024230000_floor_command_observation_approval.sql"
CLAIM="$ROOT/supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql"
PORT="${ORIENT_PG_REGRESSION_PORT:-55453}"
TMP="$(mktemp -d /tmp/orient-floor-command-003-XXXXXX)"
cleanup() {
  pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

command -v initdb >/dev/null
command -v pg_ctl >/dev/null
command -v psql >/dev/null
test -f "$MIGRATION"
test -f "$SEQUENCE"
test -f "$APPROVAL"
test -f "$CLAIM"

initdb -D "$TMP/data" --auth-local=trust --auth-host=trust -U postgres >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/logfile" start >/dev/null
for _ in 1 2 3 4 5 6 7 8 9 10; do
  pg_isready -h "$TMP" -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create database floor_command_observation;
SQL

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d floor_command_observation -v ON_ERROR_STOP=1 -q)
OWNER_A="11111111-1111-4111-8111-111111111111"
OWNER_B="22222222-2222-4222-8222-222222222222"
OWNER_C="33333333-3333-4333-8333-333333333333"

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

"${PSQL[@]}" -f "$MIGRATION"
"${PSQL[@]}" -f "$SEQUENCE"
"${PSQL[@]}" -f "$APPROVAL"
"${PSQL[@]}" -f "$CLAIM"

"${PSQL[@]}" <<'SQL'
do $$
begin
  if (select count(*) from public.floor_command_controlled_pull_claims) <> 0 then
    raise exception 'migration created a claim';
  end if;
  if (select count(*) from public.floor_command_observation_bindings) <> 0 then
    raise exception 'migration created a binding';
  end if;
  if (select count(*) from public.floor_command_observation_handoffs) <> 0 then
    raise exception 'migration created an observation';
  end if;
  if (select count(*) from public.floor_command_observation_attempts) <> 0 then
    raise exception 'migration created an attempt';
  end if;
  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'persist_floor_command_observation'
      and pronargs = 5
  ) then
    raise exception 'legacy persistence signature remains';
  end if;
end $$;
SQL
echo "MIGRATION_EMPTY_OK"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values
  ('$OWNER_A'),
  ('$OWNER_B'),
  ('$OWNER_C');

select public.bind_floor_command_observation('$OWNER_A', '02587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_B', '1999', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_C', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');

do \$\$
begin
  perform public.bind_floor_command_observation(
    '$OWNER_A', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
  );
  begin
    perform public.bind_floor_command_observation(
      '$OWNER_A', '1999', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
    );
    raise exception 'a second store was accepted';
  exception
    when others then
      if sqlerrm is distinct from 'floor_command_observation_already_bound' then
        raise;
      end if;
  end;
  begin
    perform public.bind_floor_command_observation(
      '$OWNER_A', '2587', 'deptsync.floor-command.orient.v1', 'write'
    );
    raise exception 'a write purpose was accepted';
  exception
    when others then
      if sqlerrm is distinct from 'floor_command_observation_approval_required' then
        raise;
      end if;
  end;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'floor_command_observation_bindings'
      and column_name in ('token', 'token_hash', 'access_token', 'ciphertext')
  ) then
    raise exception 'the binding stores a credential';
  end if;
  begin
    perform set_config('role', 'authenticated', true);
    perform public.bind_floor_command_observation(
      '$OWNER_A', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read'
    );
    raise exception 'authenticated bind was allowed';
  exception
    when insufficient_privilege then
      null;
  end;
end \$\$;

create function public.test_floor_command_handoff(
  p_revision text,
  p_updated text,
  p_status text,
  p_week text,
  p_start date,
  p_end date,
  p_store text,
  p_entries jsonb,
  p_superseded jsonb
) returns jsonb
language sql
as \$\$
  select jsonb_build_array(jsonb_build_object(
    'handoff_id', 'fc.zebra-handoff.' || public.floor_command_store_identity(p_store) || '.' || p_week,
    'operational_week', p_week,
    'week_starting', p_start,
    'week_ending', p_end,
    'source_revision', p_revision,
    'source_updated_at', p_updated,
    'deadlines_availability', 'ready',
    'superseded_assignments', coalesce(p_superseded, '[]'::jsonb),
    'retained_deadlines', '[]'::jsonb,
    'snapshot', jsonb_build_object(
      'source', 'deptsync.floor-command.orient.v1',
      'store_number', p_store,
      'operational_week', p_week,
      'week_starting', p_start,
      'week_ending', p_end,
      'publication', jsonb_build_object(
        'id', 'fc.publication.' || public.floor_command_store_identity(p_store) || '.' || p_week,
        'status', case when p_status = 'none' then 'unpublished' else 'published' end
      ),
      'handoff', jsonb_build_object(
        'id', 'fc.zebra-handoff.' || public.floor_command_store_identity(p_store) || '.' || p_week,
        'status', p_status,
        'deadline_date', p_start,
        'deadline_policy', 'monday_of_operational_week',
        'required_count', jsonb_array_length(coalesce(p_entries, '[]'::jsonb)),
        'confirmed_count', 0,
        'outstanding_count', jsonb_array_length(coalesce(p_entries, '[]'::jsonb))
      ),
      'entries', coalesce(p_entries, '[]'::jsonb),
      'deadlines', jsonb_build_object('availability', 'ready', 'commitments', '[]'::jsonb),
      'retired', '[]'::jsonb,
      'freshness', jsonb_build_object(
        'read_at', coalesce(p_updated, '2026-10-27T12:00:00Z'),
        'source_updated_at', p_updated,
        'revision', p_revision,
        'matches_previous_revision', false
      )
    )
  ));
\$\$;
SQL

"${PSQL[@]}" <<'SQL'
create function public.test_persist_floor_command_observation(
  p_user_id uuid,
  p_attempted_at timestamptz,
  p_attempt_result text,
  p_attempt_reason text,
  p_handoffs jsonb
) returns void
language plpgsql
as $$
declare
  v_claim uuid := gen_random_uuid();
  v_status text;
  v_result text;
begin
  select last_attempt_result
  into v_result
  from public.floor_command_observation_attempts
  where user_id = p_user_id;

  if p_attempt_result = 'failure' and v_result = 'success_complete' then
    raise exception 'floor_command_controlled_pull_already_succeeded';
  end if;

  if p_attempt_result = 'success_complete' and v_result = 'success_complete' then
    update public.floor_command_observation_attempts
    set last_attempt_result = 'failure',
        last_attempt_reason = 'source_unavailable'
    where user_id = p_user_id;
  end if;

  delete from public.floor_command_controlled_pull_claims
  where user_id = p_user_id;

  v_status := public.claim_floor_command_controlled_pull(p_user_id, v_claim);
  if v_status is distinct from 'claimed' then
    raise exception '%', 'floor_command_controlled_pull_' || v_status;
  end if;

  perform public.persist_floor_command_observation(
    p_user_id,
    p_attempted_at,
    p_attempt_result,
    p_attempt_reason,
    p_handoffs,
    v_claim
  );
end;
$$;

revoke all on function public.test_persist_floor_command_observation(uuid, timestamptz, text, text, jsonb)
  from public, anon, authenticated, service_role;
SQL

entry_json='[{"id":"fc.assignment.a1","assignment_id":"a1","bay_id":"bay-a1","zebra_confirmation":"unconfirmed","zebra_task_completed":false}]'

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-25T18:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-1', '2026-10-25T18:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '02587',
    '$entry_json'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> 1 then
    raise exception 'expected one handoff';
  end if;
  if (select operational_week from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> '2026-W44' then
    raise exception 'iso week changed';
  end if;
  if (select week_starting::text from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> '2026-10-26' then
    raise exception 'monday changed';
  end if;
  if exists (select 1 from public.floor_command_observation_handoffs where week_starting = '2026-10-24') then
    raise exception 'fiscal week was stored';
  end if;
end \$\$;
SQL
echo "APPROVAL_OK"
echo "FIRST_SNAPSHOT_OK"
echo "ISO_WEEK_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-25T18:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-1', '2026-10-25T18:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '02587',
    '$entry_json'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> 1 then
    raise exception 'replay added a handoff';
  end if;
end \$\$;
SQL
echo "REPLAY_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T16:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-2', '2026-10-26T16:00:00Z', 'complete', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-2' then
    raise exception 'new revision was not stored';
  end if;
end \$\$;
SQL
echo "NEW_REVISION_OK"

"${PSQL[@]}" <<SQL
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A',
      '2026-10-25T12:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-old', '2026-10-25T12:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      )
    );
    raise exception 'older revision was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_revision_older' then
        raise;
      end if;
  end;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-2' then
    raise exception 'older revision replaced the snapshot';
  end if;
end \$\$;
SQL
echo "OLDER_REJECTED_OK"

"${PSQL[@]}" <<SQL
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A',
      '2026-10-27T12:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-untimed', null, 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      )
    );
    raise exception 'untimed revision was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_revision_unordered' then
        raise;
      end if;
  end;
end \$\$;
SQL
echo "UNTIMED_AFTER_TIMED_REJECTED_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T16:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-equal', '2026-10-26T16:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-equal' then
    raise exception 'equal timestamp did not apply';
  end if;
end \$\$;
SQL
echo "EQUAL_TIMESTAMP_APPLIED_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T17:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-equal', '2026-10-26T16:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  ) || public.test_floor_command_handoff(
    'rev-open', null, 'none', '2026-W45', '2026-11-02', '2026-11-08', '2587',
    '[]'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A',
      '2026-11-01T18:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-equal', '2026-10-26T16:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ) || public.test_floor_command_handoff(
        'rev-ordered-later', '2026-11-01T18:00:00Z', 'pending', '2026-W45', '2026-11-02', '2026-11-08', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      )
    );
    raise exception 'unordered revision was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_revision_unordered' then
        raise;
      end if;
  end;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W45') <> 'rev-open' then
    raise exception 'unordered revision replaced the untimed snapshot';
  end if;
end \$\$;
SQL
echo "UNTIMED_RETAINED_AMBIGUOUS_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_C',
  '2026-10-26T12:00:00Z',
  'failure',
  'assignments_unavailable',
  null
);
do \$\$
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_C') <> 0 then
    raise exception 'failure invented a snapshot';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_C') <> 'failure' then
    raise exception 'failure was not recorded';
  end if;
end \$\$;
SQL
echo "FAILURE_WITHOUT_SNAPSHOT_OK"

"${PSQL[@]}" <<SQL
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A',
      '2026-10-26T20:00:00Z',
      'failure',
      'assignments_unavailable',
      null
    );
    raise exception 'failure rewrote a committed success';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_already_succeeded' then
        raise;
      end if;
  end;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> 2 then
    raise exception 'failure deleted a snapshot';
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-equal' then
    raise exception 'failure replaced a snapshot';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_attempts where user_id = '$OWNER_A') <> '2026-10-26T17:00:00Z' then
    raise exception 'failure moved the last success';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_A') <> 'success_complete' then
    raise exception 'failure cleared a committed success';
  end if;
end \$\$;
SQL
echo "FAILURE_KEEPS_SNAPSHOT_OK"

"${PSQL[@]}" <<SQL
begin;
select set_config('request.jwt.claim.sub', '$OWNER_A', true);
set local role authenticated;
select public.dismiss_floor_command_observation_revision('fc.zebra-handoff.2587.2026-W44', 'rev-equal');
commit;
do \$\$
begin
  if (select snapshot -> 'handoff' ->> 'status' from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'pending' then
    raise exception 'dismissal changed handoff status';
  end if;
  if (select count(*) from public.floor_command_observation_dismissals where user_id = '$OWNER_A' and source_revision = 'rev-equal') <> 1 then
    raise exception 'dismissal was not stored';
  end if;
end \$\$;
SQL
echo "DISMISSAL_OK"
echo "DISMISSAL_NOT_COMPLETION_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T21:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-3', '2026-10-26T21:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  ) || public.test_floor_command_handoff(
    'rev-open', null, 'none', '2026-W45', '2026-11-02', '2026-11-08', '2587',
    '[]'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-3' then
    raise exception 'revision after dismissal was not stored';
  end if;
  if (select count(*) from public.floor_command_observation_dismissals where source_revision = 'rev-equal') <> 1 then
    raise exception 'new revision removed the dismissal';
  end if;
end \$\$;
SQL
echo "NEW_REVISION_AFTER_DISMISSAL_OK"

superseded='[{"id":"fc.assignment.a1","assignmentId":"a1","bayId":"bay-a1","rosterSpecialistId":"roster-a1","associateName":"Associate a1"}]'

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T22:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-cleared', '2026-10-26T22:00:00Z', 'none', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '[]'::jsonb, '$superseded'::jsonb
  ) || public.test_floor_command_handoff(
    'rev-open', null, 'none', '2026-W45', '2026-11-02', '2026-11-08', '2587',
    '[]'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  if (select snapshot -> 'handoff' ->> 'status' from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'none' then
    raise exception 'cleared week was stored as complete';
  end if;
  if jsonb_array_length((select superseded_assignments from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44')) <> 1 then
    raise exception 'cleared bay history was dropped';
  end if;
end \$\$;
SQL
echo "CLEARED_HISTORY_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_B',
  '2026-10-26T18:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-b', '2026-10-26T18:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '1999',
    '$entry_json'::jsonb, '[]'::jsonb
  )
);
do \$\$
begin
  perform set_config('request.jwt.claim.sub', '$OWNER_A', true);
  perform set_config('role', 'authenticated', true);
  if (select count(*) from public.floor_command_observation_handoffs) <> 2 then
    raise exception 'operator saw another store';
  end if;
  if exists (select 1 from public.floor_command_observation_handoffs where store_number <> '2587') then
    raise exception 'operator saw another store number';
  end if;
end \$\$;
SQL
echo "STORE_ISOLATION_OK"

"${PSQL[@]}" <<SQL
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A',
      '2026-10-26T23:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-cross', '2026-10-26T23:00:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '1999',
        '$entry_json'::jsonb, '[]'::jsonb
      )
    );
    raise exception 'cross-store snapshot was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_cross_store' then
        raise;
      end if;
  end;
  if (select store_number from public.floor_command_observation_bindings where user_id = '$OWNER_A') <> '2587' then
    raise exception 'cross-store snapshot changed the binding';
  end if;
end \$\$;
SQL
echo "CROSS_STORE_REJECTED_OK"

"${PSQL[@]}" <<'SQL'
do $$
begin
  begin
    perform set_config('role', 'authenticated', true);
    insert into public.floor_command_observation_handoffs (
      user_id, handoff_id, store_number, operational_week, week_starting, week_ending,
      source_revision, last_successful_observed_at, deadlines_availability, snapshot,
      superseded_assignments, retained_deadlines
    ) values (
      '11111111-1111-4111-8111-111111111111', 'fc.zebra-handoff.2587.2026-W46', '2587', '2026-W46',
      '2026-11-09', '2026-11-15', 'rev-client', '2026-11-09T00:00:00Z', 'ready', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb
    );
    raise exception 'authenticated insert was accepted';
  exception
    when insufficient_privilege then
      null;
  end;
  begin
    perform set_config('role', 'service_role', true);
    insert into public.floor_command_observation_attempts (
      user_id, last_attempted_at, last_attempt_result, last_attempt_reason
    ) values (
      '11111111-1111-4111-8111-111111111111', '2026-11-09T00:00:00Z', 'failure', 'assignments_unavailable'
    );
    raise exception 'service role direct write was accepted';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;
SQL
echo "AUTHENTICATED_WRITE_FORBIDDEN_OK"
echo "SERVICE_ROLE_DIRECT_WRITE_FORBIDDEN_OK"

"${PSQL[@]}" <<SQL
do \$\$
declare
  payload jsonb := public.test_floor_command_handoff(
    'rev-secret', '2026-10-26T23:30:00Z', 'pending', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  );
begin
  payload := jsonb_set(payload, '{0,snapshot,access_token}', '"secret"'::jsonb);
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_A', '2026-10-26T23:30:00Z', 'success_complete', null, payload
    );
    raise exception 'credential payload was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_credential_forbidden' then
        raise;
      end if;
  end;
end \$\$;
SQL
echo "CREDENTIAL_REJECTED_OK"

"${PSQL[@]}" <<'SQL'
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'commitments',
        'blocks',
        'protected_time',
        'tasks',
        'stewardship_definitions',
        'active_threads',
        'pulse_interrupt_grants'
      )
  ) then
    raise exception 'personal temporal tables were created';
  end if;
end $$;
SQL
echo "NO_PERSONAL_TABLES_OK"

OWNER_D="44444444-4444-4444-8444-444444444444"
"${PSQL[@]}" <<SQL
insert into auth.users (id) values ('$OWNER_D');
select public.bind_floor_command_observation('$OWNER_D', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');

create or replace function public.test_floor_command_sequenced(
  p_revision text,
  p_sequence bigint,
  p_updated text,
  p_status text
) returns jsonb
language sql
as \$\$
  select jsonb_set(
    public.test_floor_command_handoff(
      p_revision, p_updated, p_status, '2026-W45', '2026-11-02', '2026-11-08', '2587',
      case when p_status = 'none' then '[]'::jsonb else '$entry_json'::jsonb end,
      '[]'::jsonb
    ),
    '{0,snapshot,freshness,week_sequence}',
    to_jsonb(p_sequence)
  );
\$\$;

select public.test_persist_floor_command_observation(
  '$OWNER_D', '2026-11-01T12:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-empty', 0, null, 'none')
);
select public.test_persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T12:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-published', 1, null, 'pending')
);
do \$\$
begin
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'rev-published' then
    raise exception 'sequence 0 did not yield to sequence 1 without a source time';
  end if;
end \$\$;
SQL
echo "SEQUENCE_ZERO_TO_PUBLISHED_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T13:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-published', 1, null, 'pending')
);
do \$\$
begin
  perform public.test_persist_floor_command_observation(
    '$OWNER_D', '2026-11-02T14:00:00Z', 'success_complete', null,
    public.test_floor_command_sequenced('rev-conflict', 1, null, 'pending')
  );
  raise exception 'same sequence with a different revision was accepted';
exception
  when others then
    if sqlerrm <> 'floor_command_observation_sequence_conflict' then
      raise;
    end if;
end \$\$;
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_D', '2026-11-02T15:00:00Z', 'success_complete', null,
      public.test_floor_command_sequenced('rev-old', 0, null, 'none')
    );
    raise exception 'lower sequence was accepted';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_revision_older' then
        raise;
      end if;
  end;
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'rev-published' then
    raise exception 'rejected sequence replaced the snapshot';
  end if;
end \$\$;
SQL
echo "SEQUENCE_REPLAY_CONFLICT_OLDER_OK"

"${PSQL[@]}" <<SQL
select public.test_persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T16:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-deleted', 2, '2026-10-01T00:00:00Z', 'none')
);
do \$\$
begin
  begin
    perform public.test_persist_floor_command_observation(
      '$OWNER_D', '2026-11-02T17:00:00Z', 'failure', 'ordering_withheld', null
    );
    raise exception 'withheld read rewrote a committed success';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_already_succeeded' then
        raise;
      end if;
  end;
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'rev-deleted' then
    raise exception 'withheld read replaced the snapshot';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts
      where user_id = '$OWNER_D') <> 'success_complete' then
    raise exception 'withheld read cleared a committed success';
  end if;
  if (select snapshot -> 'handoff' ->> 'status'
      from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'none' then
    raise exception 'sequence did not accept an earlier timestamp';
  end if;
end \$\$;
SQL
echo "SEQUENCE_DELETE_AND_WITHHELD_OK"

"${PSQL[@]}" <<SQL
begin;
select set_config('request.jwt.claim.sub', '$OWNER_D', true);
set local role authenticated;
select public.dismiss_floor_command_observation_revision(
  'fc.zebra-handoff.2587.2026-W45',
  'rev-deleted'
);
commit;
do \$\$
begin
  if (select snapshot -> 'handoff' ->> 'status'
      from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'none' then
    raise exception 'dismissal changed handoff status';
  end if;
  if (select count(*) from public.floor_command_observation_dismissals
      where user_id = '$OWNER_D' and source_revision = 'rev-deleted') <> 1 then
    raise exception 'dismissal was not kept';
  end if;
end \$\$;
SQL
echo "SEQUENCE_DISMISSAL_KEPT_OK"

OWNER_E="55555555-5555-4555-8555-555555555555"
OWNER_F="66666666-6666-4666-8666-666666666666"
OWNER_G="77777777-7777-4777-8777-777777777777"
OWNER_H="88888888-8888-4888-8888-888888888888"
OWNER_I="99999999-9999-4999-8999-999999999999"
OWNER_J="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
OWNER_K="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
CLAIM_E="cccccccc-cccc-4ccc-8ccc-ccccccccccc1"
CLAIM_F1="cccccccc-cccc-4ccc-8ccc-ccccccccccc2"
CLAIM_F2="cccccccc-cccc-4ccc-8ccc-ccccccccccc3"
CLAIM_G1="dddddddd-dddd-4ddd-8ddd-ddddddddddd1"
CLAIM_G2="dddddddd-dddd-4ddd-8ddd-ddddddddddd2"
CLAIM_H="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1"
CLAIM_I1="ffffffff-ffff-4fff-8fff-fffffffffff1"
CLAIM_I2="ffffffff-ffff-4fff-8fff-fffffffffff2"
CLAIM_J1="12121212-1212-4121-8121-121212121212"
CLAIM_J2="13131313-1313-4131-8131-131313131313"
CLAIM_K="14141414-1414-4141-8141-141414141414"

"${PSQL[@]}" <<SQL
insert into auth.users (id) values
  ('$OWNER_E'),
  ('$OWNER_F'),
  ('$OWNER_G'),
  ('$OWNER_H'),
  ('$OWNER_I'),
  ('$OWNER_J'),
  ('$OWNER_K');
select public.bind_floor_command_observation('$OWNER_E', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_F', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_G', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_H', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_I', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_J', '2587', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
select public.bind_floor_command_observation('$OWNER_K', '1999', 'deptsync.floor-command.orient.v1', 'orient_published_week_read');
SQL

"${PSQL[@]}" -c "select public.claim_floor_command_controlled_pull('$OWNER_G'::uuid, '$CLAIM_G1'::uuid);" >"$TMP/g1.out" 2>"$TMP/g1.err" &
pid_g1=$!
"${PSQL[@]}" -c "select public.claim_floor_command_controlled_pull('$OWNER_G'::uuid, '$CLAIM_G2'::uuid);" >"$TMP/g2.out" 2>"$TMP/g2.err" &
pid_g2=$!
wait "$pid_g1"
wait "$pid_g2"
g1="$(grep -oE 'claimed|busy|already_succeeded|unbound' "$TMP/g1.out" | head -n 1 || true)"
g2="$(grep -oE 'claimed|busy|already_succeeded|unbound' "$TMP/g2.out" | head -n 1 || true)"
case "$g1 $g2" in
  "claimed busy"|"busy claimed") ;;
  *)
    echo "simultaneous claims returned: [$g1] [$g2]"
    cat "$TMP/g1.err" "$TMP/g2.err"
    exit 1
    ;;
esac
echo "CLAIM_ONE_OF_TWO_OK"
echo "CLAIM_BUSY_OK"

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_handoffs integer;
begin
  select count(*) into v_handoffs
  from public.floor_command_observation_handoffs
  where user_id = '$OWNER_G';
  if v_handoffs <> 0 then
    raise exception 'a claim wrote an observation before the fetch';
  end if;
  if (select count(*) from public.floor_command_controlled_pull_claims where user_id = '$OWNER_G') <> 1 then
    raise exception 'simultaneous claims left more than one lease';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_G') is not null then
    raise exception 'a claim recorded an attempt';
  end if;
end \$\$;
SQL

"${PSQL[@]}" <<SQL
select public.claim_floor_command_controlled_pull('$OWNER_H', '$CLAIM_H');
SQL

cat > "$TMP/persist-race.sql" <<SQL
select public.persist_floor_command_observation(
  '$OWNER_H',
  '2026-10-26T12:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-race', '2026-10-26T12:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  ),
  '$CLAIM_H'
);
SQL

"${PSQL[@]}" -f "$TMP/persist-race.sql" >"$TMP/h1.out" 2>"$TMP/h1.err" &
pid_h1=$!
"${PSQL[@]}" -f "$TMP/persist-race.sql" >"$TMP/h2.out" 2>"$TMP/h2.err" &
pid_h2=$!
set +e
wait "$pid_h1"
status_h1=$?
wait "$pid_h2"
status_h2=$?
set -e
if [[ "$status_h1" -eq 0 && "$status_h2" -eq 0 ]]; then
  echo "both success persists committed"
  exit 1
fi
if [[ "$status_h1" -ne 0 && "$status_h2" -ne 0 ]]; then
  echo "neither success persist committed"
  cat "$TMP/h1.err" "$TMP/h2.err"
  exit 1
fi
if ! grep -q 'floor_command_controlled_pull_already_succeeded' "$TMP/h1.err" "$TMP/h2.err"; then
  echo "the losing persist was not fenced"
  cat "$TMP/h1.err" "$TMP/h2.err"
  exit 1
fi

"${PSQL[@]}" <<SQL
do \$\$
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_H') <> 1 then
    raise exception 'simultaneous persists wrote more than one handoff';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_H') <> 'success_complete' then
    raise exception 'simultaneous persists did not leave one success';
  end if;
  if exists (select 1 from public.floor_command_controlled_pull_claims where user_id = '$OWNER_H') then
    raise exception 'a committed success left its claim behind';
  end if;
end \$\$;
SQL
echo "SIMULTANEOUS_SUCCESS_OK"

"${PSQL[@]}" <<SQL
select public.claim_floor_command_controlled_pull('$OWNER_I', '$CLAIM_I1');
update public.floor_command_controlled_pull_claims
set claimed_at = now() - interval '16 seconds'
where user_id = '$OWNER_I'
  and claim = '$CLAIM_I1';
do \$\$
begin
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_I',
      '2026-10-26T12:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-stale', '2026-10-26T12:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ),
      '$CLAIM_I1'
    );
    raise exception 'an expired claim committed';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_claim_expired' then
        raise;
      end if;
  end;
  if exists (select 1 from public.floor_command_observation_handoffs where user_id = '$OWNER_I') then
    raise exception 'an expired claim wrote a handoff';
  end if;
  if (select public.claim_floor_command_controlled_pull('$OWNER_I', '$CLAIM_I2')) <> 'claimed' then
    raise exception 'an expired lease was not replaceable';
  end if;
  if (select claim from public.floor_command_controlled_pull_claims where user_id = '$OWNER_I') <> '$CLAIM_I2' then
    raise exception 'replacement did not become the current claim';
  end if;
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_I',
      '2026-10-26T12:01:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-stale', '2026-10-26T12:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ),
      '$CLAIM_I1'
    );
    raise exception 'a replaced claimant committed';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_claim_mismatch' then
        raise;
      end if;
  end;
  perform public.persist_floor_command_observation(
    '$OWNER_I',
    '2026-10-26T12:02:00Z',
    'success_complete',
    null,
    public.test_floor_command_handoff(
      'rev-replacement', '2026-10-26T12:02:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
      '$entry_json'::jsonb, '[]'::jsonb
    ),
    '$CLAIM_I2'
  );
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_I') <> 'rev-replacement' then
    raise exception 'the replacement claimant did not commit';
  end if;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_I') <> 1 then
    raise exception 'replacement wrote a second handoff';
  end if;
end \$\$;
SQL
echo "STALE_PERSIST_REJECTED_OK"
echo "LEASE_REPLACEMENT_OK"

"${PSQL[@]}" <<SQL
select public.claim_floor_command_controlled_pull('$OWNER_J', '$CLAIM_J1');
update public.floor_command_controlled_pull_claims
set claimed_at = now() - interval '16 seconds'
where user_id = '$OWNER_J';
select public.claim_floor_command_controlled_pull('$OWNER_J', '$CLAIM_J2');
do \$\$
begin
  begin
    perform public.release_floor_command_controlled_pull('$OWNER_J', '$CLAIM_J1');
    raise exception 'a stale claimant released the replacement';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_claim_mismatch' then
        raise;
      end if;
  end;
  if (select claim from public.floor_command_controlled_pull_claims where user_id = '$OWNER_J') <> '$CLAIM_J2' then
    raise exception 'stale release removed the replacement claim';
  end if;
  if exists (select 1 from public.floor_command_observation_handoffs where user_id = '$OWNER_J') then
    raise exception 'release created a handoff';
  end if;
  perform public.release_floor_command_controlled_pull('$OWNER_J', '$CLAIM_J2');
  if exists (select 1 from public.floor_command_controlled_pull_claims where user_id = '$OWNER_J') then
    raise exception 'the current owner could not release';
  end if;
  if exists (select 1 from public.floor_command_observation_handoffs where user_id = '$OWNER_J') then
    raise exception 'release deleted or created a handoff';
  end if;
end \$\$;
SQL
echo "STALE_RELEASE_REJECTED_OK"

"${PSQL[@]}" <<SQL
select public.claim_floor_command_controlled_pull('$OWNER_F', '$CLAIM_F1');
select public.persist_floor_command_observation(
  '$OWNER_F',
  '2026-10-26T12:00:00Z',
  'failure',
  'source_unavailable',
  null,
  '$CLAIM_F1'
);
do \$\$
declare
  v_seen timestamptz;
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_F') <> 0 then
    raise exception 'failure before success invented a snapshot';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_F') <> 'failure' then
    raise exception 'failure before success was not recorded';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_attempts where user_id = '$OWNER_F') is not null then
    raise exception 'failure before success invented a success time';
  end if;
  if (select public.claim_floor_command_controlled_pull('$OWNER_F', '$CLAIM_F2')) <> 'busy' then
    raise exception 'a failed fetch was retryable before release or expiry';
  end if;
  select claimed_at into v_seen
  from public.floor_command_controlled_pull_claims
  where user_id = '$OWNER_F';
  if (select public.claim_floor_command_controlled_pull('$OWNER_F', '$CLAIM_F1')) <> 'claimed' then
    raise exception 'the current claim could not be repeated';
  end if;
  if (select claimed_at from public.floor_command_controlled_pull_claims where user_id = '$OWNER_F') <> v_seen then
    raise exception 'repeating a live claim extended the lease';
  end if;
  perform public.release_floor_command_controlled_pull('$OWNER_F', '$CLAIM_F1');
  if exists (select 1 from public.floor_command_observation_handoffs where user_id = '$OWNER_F') then
    raise exception 'release after failure deleted or created a handoff';
  end if;
  if (select public.claim_floor_command_controlled_pull('$OWNER_F', '$CLAIM_F2')) <> 'claimed' then
    raise exception 'release after failure did not permit a retry';
  end if;
end \$\$;
SQL
echo "FAILURE_BEFORE_SUCCESS_OK"

"${PSQL[@]}" <<SQL
select public.claim_floor_command_controlled_pull('$OWNER_E', '$CLAIM_E');
select public.persist_floor_command_observation(
  '$OWNER_E',
  '2026-10-26T12:00:00Z',
  'success_complete',
  null,
  public.test_floor_command_handoff(
    'rev-once', '2026-10-26T12:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
    '$entry_json'::jsonb, '[]'::jsonb
  ),
  '$CLAIM_E'
);
SQL

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_success timestamptz;
  v_revision text;
begin
  select last_successful_observed_at into v_success
  from public.floor_command_observation_attempts
  where user_id = '$OWNER_E';
  select source_revision into v_revision
  from public.floor_command_observation_handoffs
  where user_id = '$OWNER_E';
  if (select public.claim_floor_command_controlled_pull('$OWNER_E', '$CLAIM_E')) <> 'already_succeeded' then
    raise exception 'a new connection could claim after success';
  end if;
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_E',
      '2026-10-26T13:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-again', '2026-10-26T13:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ),
      '$CLAIM_E'
    );
    raise exception 'a retry after success committed';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_already_succeeded' then
        raise;
      end if;
  end;
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_E',
      '2026-10-26T13:01:00Z',
      'failure',
      'assignments_unavailable',
      null,
      '$CLAIM_E'
    );
    raise exception 'failure after success rewrote the attempt';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_already_succeeded' then
        raise;
      end if;
  end;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_E') <> 1 then
    raise exception 'retry after success changed the handoff count';
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_E') <> v_revision then
    raise exception 'failure after success replaced the snapshot';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_E') <> 'success_complete' then
    raise exception 'failure after success cleared the success marker';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_attempts where user_id = '$OWNER_E') <> v_success then
    raise exception 'failure after success moved the last success';
  end if;
end \$\$;
SQL
echo "RESTART_AFTER_SUCCESS_OK"
echo "FAILURE_AFTER_SUCCESS_KEEPS_OK"

"${PSQL[@]}" <<SQL
do \$\$
declare
  v_owner_e_handoffs integer;
begin
  select count(*) into v_owner_e_handoffs
  from public.floor_command_observation_handoffs
  where user_id = '$OWNER_E';
  if (select public.claim_floor_command_controlled_pull('$OWNER_K', '$CLAIM_K')) <> 'claimed' then
    raise exception 'the other operator could not claim its own pull';
  end if;
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_F',
      '2026-10-26T14:00:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-cross-operator', '2026-10-26T14:00:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ),
      '$CLAIM_K'
    );
    raise exception 'another operator claim committed this pull';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_claim_mismatch' then
        raise;
      end if;
  end;
  begin
    perform public.release_floor_command_controlled_pull('$OWNER_K', '$CLAIM_F2');
    raise exception 'another operator released this claim';
  exception
    when others then
      if sqlerrm <> 'floor_command_controlled_pull_claim_mismatch' then
        raise;
      end if;
  end;
  if (select claim from public.floor_command_controlled_pull_claims where user_id = '$OWNER_F') <> '$CLAIM_F2' then
    raise exception 'cross-operator release changed this claim';
  end if;
  if (select claim from public.floor_command_controlled_pull_claims where user_id = '$OWNER_K') <> '$CLAIM_K' then
    raise exception 'cross-operator persist changed the other claim';
  end if;
  begin
    perform public.persist_floor_command_observation(
      '$OWNER_K',
      '2026-10-26T14:01:00Z',
      'success_complete',
      null,
      public.test_floor_command_handoff(
        'rev-cross-store', '2026-10-26T14:01:00Z', 'partial', '2026-W44', '2026-10-26', '2026-11-01', '2587',
        '$entry_json'::jsonb, '[]'::jsonb
      ),
      '$CLAIM_K'
    );
    raise exception 'a claim crossed stores';
  exception
    when others then
      if sqlerrm <> 'floor_command_observation_cross_store' then
        raise;
      end if;
  end;
  if exists (select 1 from public.floor_command_observation_handoffs where user_id = '$OWNER_K') then
    raise exception 'cross-store wrote a handoff';
  end if;
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_E') <> v_owner_e_handoffs then
    raise exception 'cross-store changed another operator observation';
  end if;
  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'persist_floor_command_observation'
      and pronargs = 5
  ) then
    raise exception 'legacy persistence signature remains';
  end if;
  begin
    execute 'select public.persist_floor_command_observation(\$1, \$2, \$3, \$4, \$5)'
    using '$OWNER_F'::uuid, timestamptz '2026-10-26T14:02:00Z', 'failure', 'source_unavailable', null::jsonb;
    raise exception 'legacy persistence signature ran';
  exception
    when undefined_function then
      null;
  end;
  if has_function_privilege('authenticated', 'public.claim_floor_command_controlled_pull(uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.claim_floor_command_controlled_pull(uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.release_floor_command_controlled_pull(uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.persist_floor_command_observation(uuid,timestamptz,text,text,jsonb,uuid)', 'execute')
     or has_function_privilege('service_role', 'public.test_persist_floor_command_observation(uuid,timestamptz,text,text,jsonb)', 'execute') then
    raise exception 'claim privileges are too wide';
  end if;
  if not has_function_privilege('service_role', 'public.claim_floor_command_controlled_pull(uuid,uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.release_floor_command_controlled_pull(uuid,uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.persist_floor_command_observation(uuid,timestamptz,text,text,jsonb,uuid)', 'execute') then
    raise exception 'service role cannot execute the claim protocol';
  end if;
  if has_table_privilege('service_role', 'public.floor_command_controlled_pull_claims', 'insert')
     or has_table_privilege('service_role', 'public.floor_command_controlled_pull_claims', 'update')
     or has_table_privilege('service_role', 'public.floor_command_controlled_pull_claims', 'delete')
     or has_table_privilege('authenticated', 'public.floor_command_controlled_pull_claims', 'select')
     or has_table_privilege('anon', 'public.floor_command_controlled_pull_claims', 'select') then
    raise exception 'claim table grants are too wide';
  end if;
  if not (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'floor_command_controlled_pull_claims'
  ) then
    raise exception 'claim row security is off';
  end if;
  begin
    perform set_config('role', 'service_role', true);
    insert into public.floor_command_controlled_pull_claims (user_id, claim, claimed_at)
    values ('$OWNER_J', '15151515-1515-4151-8151-151515151515', now());
    raise exception 'service role inserted a claim directly';
  exception
    when insufficient_privilege then
      null;
  end;
end \$\$;
SQL
echo "CROSS_OPERATOR_CLAIM_REJECTED_OK"
echo "CROSS_STORE_CLAIM_REJECTED_OK"
echo "LEGACY_SIGNATURE_ABSENT_OK"
echo "CLAIM_PRIVILEGE_OK"

"${PSQL[@]}" <<'SQL'
drop function public.test_persist_floor_command_observation(uuid, timestamptz, text, text, jsonb);
drop function public.test_floor_command_sequenced(text, bigint, text, text);
drop function public.test_floor_command_handoff(text, text, text, text, date, date, text, jsonb, jsonb);
SQL
echo "ORIENT-FLOOR-COMMAND-003-PERSISTENCE-CLEAR"
echo "ORIENT-FLOOR-COMMAND-004A-CLAIM-CLEAR"
