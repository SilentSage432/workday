#!/usr/bin/env bash
# ORIENT-FLOOR-COMMAND-003 — ephemeral PostgreSQL regression.
# Not production. Proves retained snapshots, ordering, failed reads,
# dismissal, store isolation, and the absence of personal-record tables.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20261024210000_floor_command_observation.sql"
SEQUENCE="$ROOT/supabase/migrations/20261024220000_floor_command_observation_sequence.sql"
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

"${PSQL[@]}" <<SQL
insert into auth.users (id) values
  ('$OWNER_A'),
  ('$OWNER_B'),
  ('$OWNER_C');

select public.bind_floor_command_observation('$OWNER_A', '02587');
select public.bind_floor_command_observation('$OWNER_B', '1999');
select public.bind_floor_command_observation('$OWNER_C', '2587');

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

entry_json='[{"id":"fc.assignment.a1","assignment_id":"a1","bay_id":"bay-a1","zebra_confirmation":"unconfirmed","zebra_task_completed":false}]'

"${PSQL[@]}" <<SQL
select public.persist_floor_command_observation(
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
echo "FIRST_SNAPSHOT_OK"
echo "ISO_WEEK_OK"

"${PSQL[@]}" <<SQL
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
  '$OWNER_A',
  '2026-10-26T20:00:00Z',
  'failure',
  'assignments_unavailable',
  null
);
do \$\$
begin
  if (select count(*) from public.floor_command_observation_handoffs where user_id = '$OWNER_A') <> 2 then
    raise exception 'failure deleted a snapshot';
  end if;
  if (select source_revision from public.floor_command_observation_handoffs where user_id = '$OWNER_A' and operational_week = '2026-W44') <> 'rev-equal' then
    raise exception 'failure replaced a snapshot';
  end if;
  if (select last_successful_observed_at from public.floor_command_observation_attempts where user_id = '$OWNER_A') <> '2026-10-26T17:00:00Z' then
    raise exception 'failure moved the last success';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts where user_id = '$OWNER_A') <> 'failure' then
    raise exception 'failure was not the latest attempt';
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
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
select public.bind_floor_command_observation('$OWNER_D', '2587');

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

select public.persist_floor_command_observation(
  '$OWNER_D', '2026-11-01T12:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-empty', 0, null, 'none')
);
select public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T13:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-published', 1, null, 'pending')
);
do \$\$
begin
  perform public.persist_floor_command_observation(
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
    perform public.persist_floor_command_observation(
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
select public.persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T16:00:00Z', 'success_complete', null,
  public.test_floor_command_sequenced('rev-deleted', 2, '2026-10-01T00:00:00Z', 'none')
);
select public.persist_floor_command_observation(
  '$OWNER_D', '2026-11-02T17:00:00Z', 'failure', 'ordering_withheld', null
);
do \$\$
begin
  if (select source_revision from public.floor_command_observation_handoffs
      where user_id = '$OWNER_D') <> 'rev-deleted' then
    raise exception 'withheld read replaced the snapshot';
  end if;
  if (select last_attempt_result from public.floor_command_observation_attempts
      where user_id = '$OWNER_D') <> 'failure' then
    raise exception 'withheld read was stored as a success';
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
drop function public.test_floor_command_sequenced(text, bigint, text, text);
drop function public.test_floor_command_handoff(text, text, text, text, date, date, text, jsonb, jsonb);
SQL
echo "SEQUENCE_DISMISSAL_KEPT_OK"
echo "ORIENT-FLOOR-COMMAND-003-PERSISTENCE-CLEAR"
