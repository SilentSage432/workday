-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-023
-- Operator-owned standing observation policy. Inert.
-- Approval changes authority status only. No function here reads Floor Command,
-- inserts a governed observation request, or schedules a worker.
-- Not applied to hosted Orient by this tranche.

create table public.floor_command_standing_policies (
  policy_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_version integer not null,
  state text not null,
  source text not null,
  store_number text not null,
  purpose text not null,
  time_zone text not null,
  effective_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid,
  revoked_at timestamptz,
  revocation_reason text,
  expired_at timestamptz,
  max_publication_windows smallint not null,
  max_publication_per_window smallint not null default 1,
  max_reconciliation_per_window smallint not null,
  automatic_retry_limit smallint not null default 0,
  publication_slot_weekday_utc smallint not null default 0,
  publication_slot_hour_utc smallint not null default 12,
  publication_slot_minute_utc smallint not null default 0,
  publication_closes_at_next_local_midnight boolean not null default true,
  reconciliation_opens_on_deadline_midnight boolean not null default true,
  reconciliation_closes_next_local_midnight boolean not null default true,
  source_publication_assumed boolean not null default false,
  writes_floor_command boolean not null default false,
  creates_orient_temporal_records boolean not null default false,
  observes_arbitrary_weeks boolean not null default false,
  constraint floor_command_standing_policies_version_positive check (policy_version >= 1),
  constraint floor_command_standing_policies_source check (source = 'deptsync.floor-command.orient.v1'),
  constraint floor_command_standing_policies_store check (store_number = '2587'),
  constraint floor_command_standing_policies_purpose check (purpose = 'orient_published_week_read'),
  constraint floor_command_standing_policies_zone_shape check (time_zone ~ '^[A-Za-z]+(?:/[A-Za-z0-9_+-]+)+$'),
  constraint floor_command_standing_policies_span check (expires_at > effective_at),
  constraint floor_command_standing_policies_windows check (
    max_publication_windows between 1 and 8
    and max_publication_per_window = 1
    and max_reconciliation_per_window in (0, 1)
    and automatic_retry_limit = 0
  ),
  constraint floor_command_standing_policies_slot check (
    publication_slot_weekday_utc = 0
    and publication_slot_hour_utc = 12
    and publication_slot_minute_utc = 0
    and publication_closes_at_next_local_midnight
    and reconciliation_opens_on_deadline_midnight
    and reconciliation_closes_next_local_midnight
  ),
  constraint floor_command_standing_policies_no_execution check (
    not source_publication_assumed
    and not writes_floor_command
    and not creates_orient_temporal_records
    and not observes_arbitrary_weeks
  ),
  constraint floor_command_standing_policies_state_known check (
    state in ('proposed', 'approved', 'expired', 'revoked')
  ),
  constraint floor_command_standing_policies_lifecycle check (
    (
      state = 'proposed'
      and approved_at is null and approved_by is null
      and revoked_at is null and revocation_reason is null
      and expired_at is null
    )
    or (
      state = 'approved'
      and approved_at is not null and approved_by = user_id
      and revoked_at is null and revocation_reason is null
      and expired_at is null
    )
    or (
      state = 'expired'
      and approved_at is not null and approved_by = user_id
      and expired_at is not null
      and revoked_at is null and revocation_reason is null
    )
    or (
      state = 'revoked'
      and revoked_at is not null
      and revocation_reason is not null
      and char_length(revocation_reason) between 1 and 200
      and expired_at is null
      and (
        (approved_at is null and approved_by is null)
        or (approved_at is not null and approved_by = user_id)
      )
    )
  ),
  constraint floor_command_standing_policies_user_version unique (user_id, policy_version)
);

comment on table public.floor_command_standing_policies is
  'Operator grant for a future standing observation. A row is not a read, a queue, or a publication fact. Sunday 12:00 UTC is the earliest a publication opportunity may open. The local Monday that follows is the handoff deadline date. Passing that slot does not mean Floor Command published.';

create unique index floor_command_standing_policies_one_open
  on public.floor_command_standing_policies (user_id)
  where state in ('proposed', 'approved');

create table public.floor_command_standing_policy_events (
  event_id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.floor_command_standing_policies (policy_id),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  policy_version integer not null,
  actor_user_id uuid not null,
  occurred_at timestamptz not null default now(),
  reason text,
  scope jsonb not null,
  constraint floor_command_standing_policy_events_type check (
    event_type in ('proposed', 'approved', 'expired', 'revoked')
  ),
  constraint floor_command_standing_policy_events_scope check (jsonb_typeof(scope) = 'object'),
  constraint floor_command_standing_policy_events_reason check (
    (event_type = 'revoked' and reason is not null and char_length(reason) between 1 and 200)
    or (event_type <> 'revoked' and reason is null)
  )
);

comment on table public.floor_command_standing_policy_events is
  'Append-only provenance for a standing observation policy. Expiration and revocation leave the row and these events in place.';

create index floor_command_standing_policy_events_policy_idx
  on public.floor_command_standing_policy_events (policy_id, occurred_at);

alter table public.floor_command_standing_policies enable row level security;
alter table public.floor_command_standing_policy_events enable row level security;

revoke all on table public.floor_command_standing_policies from public, anon, authenticated, service_role;
revoke all on table public.floor_command_standing_policy_events from public, anon, authenticated, service_role;
grant select on table public.floor_command_standing_policies to authenticated, service_role;
grant select on table public.floor_command_standing_policy_events to authenticated, service_role;

create policy floor_command_standing_policies_select_own
  on public.floor_command_standing_policies
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy floor_command_standing_policy_events_select_own
  on public.floor_command_standing_policy_events
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.floor_command_standing_policy_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'floor_command_standing_policy_history_retained';
  end if;

  if tg_op = 'INSERT' then
    if new.state is distinct from 'proposed'
       or new.approved_at is not null
       or new.approved_by is not null
       or new.revoked_at is not null
       or new.revocation_reason is not null
       or new.expired_at is not null then
      raise exception 'floor_command_standing_policy_insert_proposed_only';
    end if;
    return new;
  end if;

  if new.policy_id is distinct from old.policy_id
     or new.user_id is distinct from old.user_id
     or new.policy_version is distinct from old.policy_version
     or new.source is distinct from old.source
     or new.store_number is distinct from old.store_number
     or new.purpose is distinct from old.purpose
     or new.time_zone is distinct from old.time_zone
     or new.effective_at is distinct from old.effective_at
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at
     or new.max_publication_windows is distinct from old.max_publication_windows
     or new.max_publication_per_window is distinct from old.max_publication_per_window
     or new.max_reconciliation_per_window is distinct from old.max_reconciliation_per_window
     or new.automatic_retry_limit is distinct from old.automatic_retry_limit
     or new.publication_slot_weekday_utc is distinct from old.publication_slot_weekday_utc
     or new.publication_slot_hour_utc is distinct from old.publication_slot_hour_utc
     or new.publication_slot_minute_utc is distinct from old.publication_slot_minute_utc
     or new.publication_closes_at_next_local_midnight is distinct from old.publication_closes_at_next_local_midnight
     or new.reconciliation_opens_on_deadline_midnight is distinct from old.reconciliation_opens_on_deadline_midnight
     or new.reconciliation_closes_next_local_midnight is distinct from old.reconciliation_closes_next_local_midnight
     or new.source_publication_assumed is distinct from old.source_publication_assumed
     or new.writes_floor_command is distinct from old.writes_floor_command
     or new.creates_orient_temporal_records is distinct from old.creates_orient_temporal_records
     or new.observes_arbitrary_weeks is distinct from old.observes_arbitrary_weeks then
    raise exception 'floor_command_standing_policy_scope_frozen';
  end if;

  if old.state = 'proposed' and new.state = 'approved' then
    if new.approved_at is null or new.approved_by is distinct from new.user_id
       or new.revoked_at is not null or new.expired_at is not null
       or old.approved_at is not null then
      raise exception 'floor_command_standing_policy_approval_invalid';
    end if;
    return new;
  end if;

  if old.state = 'proposed' and new.state = 'revoked' then
    if new.revoked_at is null or new.revocation_reason is null
       or new.approved_at is not null or new.expired_at is not null then
      raise exception 'floor_command_standing_policy_revocation_invalid';
    end if;
    return new;
  end if;

  if old.state = 'approved' and new.state = 'revoked' then
    if new.revoked_at is null or new.revocation_reason is null
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.expired_at is not null then
      raise exception 'floor_command_standing_policy_revocation_invalid';
    end if;
    return new;
  end if;

  if old.state = 'approved' and new.state = 'expired' then
    if new.expired_at is null
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.revoked_at is not null then
      raise exception 'floor_command_standing_policy_expiry_invalid';
    end if;
    return new;
  end if;

  raise exception 'floor_command_standing_policy_transition_forbidden';
end;
$$;

create trigger floor_command_standing_policies_guard
  before insert or update or delete on public.floor_command_standing_policies
  for each row
  execute function public.floor_command_standing_policy_guard();

create or replace function public.floor_command_standing_policy_events_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'floor_command_standing_policy_events_immutable';
end;
$$;

create trigger floor_command_standing_policy_events_immutable
  before update or delete on public.floor_command_standing_policy_events
  for each row
  execute function public.floor_command_standing_policy_events_immutable();

revoke all on function public.floor_command_standing_policy_guard() from public, anon, authenticated, service_role;
revoke all on function public.floor_command_standing_policy_events_immutable() from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_policy_windows(
  p_effective_at timestamptz,
  p_expires_at timestamptz,
  p_time_zone text,
  p_max_windows integer,
  p_reconciliation integer
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_zone text := btrim(coalesce(p_time_zone, ''));
  v_day date;
  v_slot timestamptz;
  v_local date;
  v_close timestamptz;
  v_recon_close timestamptz;
  v_week text;
  v_windows jsonb := '[]'::jsonb;
  v_kept integer := 0;
  v_slots integer := 0;
  v_guard integer := 0;
begin
  if p_effective_at is null or p_expires_at is null or p_expires_at <= p_effective_at then
    raise exception 'floor_command_standing_policy_window_invalid';
  end if;
  if p_max_windows is null or p_max_windows < 1 or p_max_windows > 8
     or p_reconciliation is null or p_reconciliation not in (0, 1) then
    raise exception 'floor_command_standing_policy_window_invalid';
  end if;
  if v_zone !~ '^[A-Za-z]+(?:/[A-Za-z0-9_+-]+)+$' then
    raise exception 'floor_command_standing_policy_timezone_invalid';
  end if;
  begin
    perform timezone(v_zone, p_effective_at);
  exception when others then
    raise exception 'floor_command_standing_policy_timezone_invalid';
  end;

  v_day := (p_effective_at at time zone 'UTC')::date;
  loop
    v_guard := v_guard + 1;
    exit when v_guard > 80;
    exit when v_day > (p_expires_at at time zone 'UTC')::date + 1;
    if extract(dow from v_day)::integer = 0 then
      v_slot := (v_day::timestamp + time '12:00') at time zone 'UTC';
      exit when v_slot >= p_expires_at;
      if v_slot >= p_effective_at then
        v_local := (v_slot at time zone v_zone)::date;
        if extract(dow from v_local)::integer <> 0 then
          raise exception 'floor_command_standing_policy_timezone_shifts_sunday';
        end if;
        v_close := ((v_local + 1)::timestamp) at time zone v_zone;
        if v_close <= v_slot then
          raise exception 'floor_command_standing_policy_timezone_shifts_sunday';
        end if;
        v_slots := v_slots + 1;
        if v_kept < p_max_windows then
          v_recon_close := ((v_local + 2)::timestamp) at time zone v_zone;
          v_week := to_char(v_local + 1, 'IYYY') || '-W' || to_char(v_local + 1, 'IW');
          v_windows := v_windows || jsonb_build_array(jsonb_build_object(
            'kind', 'publication_opportunity',
            'operational_week', v_week,
            'opens_at', v_slot,
            'closes_at', least(v_close, p_expires_at),
            'time_zone', v_zone,
            'executable', false,
            'source_publication_assumed', false,
            'follows_sunday_publication_slot', true
          ));
          v_kept := v_kept + 1;
          if p_reconciliation = 1 and v_close < p_expires_at then
            v_windows := v_windows || jsonb_build_array(jsonb_build_object(
              'kind', 'reconciliation_opportunity',
              'operational_week', v_week,
              'opens_at', v_close,
              'closes_at', least(v_recon_close, p_expires_at),
              'time_zone', v_zone,
              'executable', false,
              'source_publication_assumed', false,
              'requires_outstanding_zebra_entry_confirmation', true,
              'outstanding_zebra_entry_known', false
            ));
          end if;
        end if;
      end if;
    end if;
    v_day := v_day + 1;
  end loop;

  if v_slots < p_max_windows then
    raise exception 'floor_command_standing_policy_window_invalid';
  end if;
  return v_windows;
end;
$$;

revoke all on function public.floor_command_standing_policy_windows(timestamptz, timestamptz, text, integer, integer)
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_policy_scope(
  p public.floor_command_standing_policies,
  p_windows jsonb
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'policy_id', p.policy_id,
    'policy_version', p.policy_version,
    'user_id', p.user_id,
    'source', p.source,
    'store_number', p.store_number,
    'purpose', p.purpose,
    'time_zone', p.time_zone,
    'effective_at', p.effective_at,
    'expires_at', p.expires_at,
    'max_publication_windows', p.max_publication_windows,
    'max_publication_per_window', p.max_publication_per_window,
    'max_reconciliation_per_window', p.max_reconciliation_per_window,
    'automatic_retry_limit', p.automatic_retry_limit,
    'publication_slot_weekday_utc', p.publication_slot_weekday_utc,
    'publication_slot_hour_utc', p.publication_slot_hour_utc,
    'publication_slot_minute_utc', p.publication_slot_minute_utc,
    'source_publication_assumed', false,
    'writes_floor_command', false,
    'creates_orient_temporal_records', false,
    'observes_arbitrary_weeks', false,
    'windows', p_windows
  );
$$;

revoke all on function public.floor_command_standing_policy_scope(public.floor_command_standing_policies, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_policy_view(p public.floor_command_standing_policies)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_windows jsonb;
  v_authority text;
begin
  if p.state in ('expired', 'revoked') then
    select scope->'windows'
    into v_windows
    from public.floor_command_standing_policy_events
    where policy_id = p.policy_id
      and event_type in ('approved', 'proposed')
    order by case event_type when 'approved' then 0 else 1 end, occurred_at desc
    limit 1;
  end if;
  if v_windows is null then
    v_windows := public.floor_command_standing_policy_windows(
      p.effective_at,
      p.expires_at,
      p.time_zone,
      p.max_publication_windows,
      p.max_reconciliation_per_window
    );
  end if;
  v_authority := case
    when p.state = 'approved' and p.effective_at <= now() and p.expires_at > now() then 'effective'
    when p.state = 'approved' and p.effective_at > now() then 'pending'
    else 'none'
  end;
  return jsonb_build_object(
    'policy_id', p.policy_id,
    'policy_version', p.policy_version,
    'state', p.state,
    'authority', v_authority,
    'user_id', p.user_id,
    'source', p.source,
    'store_number', p.store_number,
    'purpose', p.purpose,
    'time_zone', p.time_zone,
    'created_at', p.created_at,
    'effective_at', p.effective_at,
    'expires_at', p.expires_at,
    'approved_at', p.approved_at,
    'approved_by', p.approved_by,
    'revoked_at', p.revoked_at,
    'revocation_reason', p.revocation_reason,
    'expired_at', p.expired_at,
    'max_publication_windows', p.max_publication_windows,
    'max_publication_per_window', p.max_publication_per_window,
    'max_reconciliation_per_window', p.max_reconciliation_per_window,
    'automatic_retry_limit', p.automatic_retry_limit,
    'source_publication_assumed', false,
    'writes_floor_command', false,
    'creates_orient_temporal_records', false,
    'observes_arbitrary_weeks', false,
    'windows', v_windows
  );
end;
$$;

revoke all on function public.floor_command_standing_policy_view(public.floor_command_standing_policies)
  from public, anon, authenticated, service_role;

create or replace function public.floor_command_standing_policy_record(
  p public.floor_command_standing_policies,
  p_event text,
  p_actor uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_windows jsonb;
  v_scope jsonb;
begin
  if p_actor is null or p_event not in ('proposed', 'approved', 'expired', 'revoked') then
    raise exception 'floor_command_standing_policy_event_invalid';
  end if;
  if p_event in ('expired', 'revoked') then
    select scope
    into v_scope
    from public.floor_command_standing_policy_events
    where policy_id = p.policy_id
      and event_type in ('approved', 'proposed')
    order by case event_type when 'approved' then 0 else 1 end, occurred_at desc
    limit 1;
    if v_scope is null then
      raise exception 'floor_command_standing_policy_scope_missing';
    end if;
  else
    v_windows := public.floor_command_standing_policy_windows(
      p.effective_at,
      p.expires_at,
      p.time_zone,
      p.max_publication_windows,
      p.max_reconciliation_per_window
    );
    v_scope := public.floor_command_standing_policy_scope(p, v_windows);
  end if;
  if public.floor_command_observation_json_forbidden(v_scope) then
    raise exception 'floor_command_standing_policy_credential_forbidden';
  end if;
  insert into public.floor_command_standing_policy_events (
    policy_id, user_id, event_type, policy_version, actor_user_id, reason, scope
  ) values (
    p.policy_id, p.user_id, p_event, p.policy_version, p_actor, p_reason, v_scope
  );
end;
$$;

revoke all on function public.floor_command_standing_policy_record(public.floor_command_standing_policies, text, uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.propose_floor_command_standing_policy(
  p_user_id uuid,
  p_effective_at timestamptz,
  p_expires_at timestamptz,
  p_max_publication_windows integer,
  p_reconciliation_allowance integer,
  p_time_zone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_source text;
  v_purpose text;
  v_version integer;
  v_windows jsonb;
  v_row public.floor_command_standing_policies%rowtype;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is distinct from '2587'
     or v_source is distinct from 'deptsync.floor-command.orient.v1'
     or v_purpose is distinct from 'orient_published_week_read' then
    return jsonb_build_object('status', 'unbound');
  end if;

  if p_effective_at is null or p_expires_at is null
     or p_expires_at <= p_effective_at
     or p_expires_at <= now()
     or p_effective_at < now() - interval '1 minute'
     or p_expires_at > p_effective_at + interval '70 days'
     or p_max_publication_windows is null
     or p_max_publication_windows < 1
     or p_max_publication_windows > 8
     or p_reconciliation_allowance is null
     or p_reconciliation_allowance not in (0, 1) then
    return jsonb_build_object('status', 'invalid_window');
  end if;

  if exists (
    select 1
    from public.floor_command_standing_policies
    where user_id = p_user_id
      and state in ('proposed', 'approved')
  ) then
    return jsonb_build_object('status', 'policy_open');
  end if;

  begin
    v_windows := public.floor_command_standing_policy_windows(
      p_effective_at,
      p_expires_at,
      p_time_zone,
      p_max_publication_windows,
      p_reconciliation_allowance
    );
  exception
    when others then
      if sqlerrm = 'floor_command_standing_policy_timezone_invalid' then
        return jsonb_build_object('status', 'timezone_invalid');
      end if;
      if sqlerrm = 'floor_command_standing_policy_timezone_shifts_sunday' then
        return jsonb_build_object('status', 'timezone_shifts_sunday');
      end if;
      if sqlerrm = 'floor_command_standing_policy_window_invalid' then
        return jsonb_build_object('status', 'invalid_window');
      end if;
      raise;
  end;

  select coalesce(max(policy_version), 0) + 1
  into v_version
  from public.floor_command_standing_policies
  where user_id = p_user_id;

  insert into public.floor_command_standing_policies (
    user_id,
    policy_version,
    state,
    source,
    store_number,
    purpose,
    time_zone,
    effective_at,
    expires_at,
    max_publication_windows,
    max_reconciliation_per_window
  ) values (
    p_user_id,
    v_version,
    'proposed',
    'deptsync.floor-command.orient.v1',
    '2587',
    'orient_published_week_read',
    btrim(p_time_zone),
    p_effective_at,
    p_expires_at,
    p_max_publication_windows,
    p_reconciliation_allowance
  )
  returning * into v_row;

  perform public.floor_command_standing_policy_record(v_row, 'proposed', p_user_id, null);
  return jsonb_build_object(
    'status', 'proposed',
    'policy', public.floor_command_standing_policy_view(v_row)
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'policy_open');
end;
$$;

create or replace function public.approve_floor_command_standing_policy(
  p_user_id uuid,
  p_policy_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.floor_command_standing_policies%rowtype;
  v_store text;
  v_source text;
  v_purpose text;
  v_proposed jsonb;
  v_windows jsonb;
  v_scope jsonb;
begin
  if p_user_id is null or p_policy_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select *
  into v_row
  from public.floor_command_standing_policies
  where policy_id = p_policy_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.state is distinct from 'proposed' then
    return jsonb_build_object('status', 'not_proposed', 'policy', public.floor_command_standing_policy_view(v_row));
  end if;
  if v_row.expires_at <= now() then
    return jsonb_build_object('status', 'elapsed', 'policy', public.floor_command_standing_policy_view(v_row));
  end if;

  select store_number, source, purpose
  into v_store, v_source, v_purpose
  from public.floor_command_observation_bindings
  where user_id = p_user_id
  for update;

  if v_store is distinct from v_row.store_number
     or v_source is distinct from v_row.source
     or v_purpose is distinct from v_row.purpose then
    return jsonb_build_object('status', 'unbound');
  end if;

  select scope
  into v_proposed
  from public.floor_command_standing_policy_events
  where policy_id = v_row.policy_id
    and event_type = 'proposed';

  v_windows := public.floor_command_standing_policy_windows(
    v_row.effective_at,
    v_row.expires_at,
    v_row.time_zone,
    v_row.max_publication_windows,
    v_row.max_reconciliation_per_window
  );
  v_scope := public.floor_command_standing_policy_scope(v_row, v_windows);
  if v_proposed is null or v_proposed <> v_scope then
    return jsonb_build_object('status', 'scope_changed');
  end if;

  update public.floor_command_standing_policies
  set
    state = 'approved',
    approved_at = now(),
    approved_by = p_user_id
  where policy_id = v_row.policy_id
  returning * into v_row;

  perform public.floor_command_standing_policy_record(v_row, 'approved', p_user_id, null);
  return jsonb_build_object(
    'status', 'approved',
    'policy', public.floor_command_standing_policy_view(v_row)
  );
end;
$$;

create or replace function public.revoke_floor_command_standing_policy(
  p_user_id uuid,
  p_policy_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.floor_command_standing_policies%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_user_id is null or p_policy_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;
  if char_length(v_reason) < 1 or char_length(v_reason) > 200 or v_reason ~ '[[:cntrl:]]' then
    return jsonb_build_object('status', 'invalid_reason');
  end if;

  select *
  into v_row
  from public.floor_command_standing_policies
  where policy_id = p_policy_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.state not in ('proposed', 'approved') then
    return jsonb_build_object('status', 'not_revocable', 'policy', public.floor_command_standing_policy_view(v_row));
  end if;

  update public.floor_command_standing_policies
  set
    state = 'revoked',
    revoked_at = now(),
    revocation_reason = v_reason
  where policy_id = v_row.policy_id
  returning * into v_row;

  perform public.floor_command_standing_policy_record(v_row, 'revoked', p_user_id, v_reason);
  return jsonb_build_object(
    'status', 'revoked',
    'policy', public.floor_command_standing_policy_view(v_row)
  );
end;
$$;

create or replace function public.expire_floor_command_standing_policy(
  p_user_id uuid,
  p_policy_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.floor_command_standing_policies%rowtype;
begin
  if p_user_id is null or p_policy_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  select *
  into v_row
  from public.floor_command_standing_policies
  where policy_id = p_policy_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.state is distinct from 'approved' then
    return jsonb_build_object('status', 'not_expirable', 'policy', public.floor_command_standing_policy_view(v_row));
  end if;
  if v_row.expires_at > now() then
    return jsonb_build_object('status', 'still_effective', 'policy', public.floor_command_standing_policy_view(v_row));
  end if;

  update public.floor_command_standing_policies
  set
    state = 'expired',
    expired_at = now()
  where policy_id = v_row.policy_id
  returning * into v_row;

  perform public.floor_command_standing_policy_record(v_row, 'expired', p_user_id, null);
  return jsonb_build_object(
    'status', 'expired',
    'policy', public.floor_command_standing_policy_view(v_row)
  );
end;
$$;

create or replace function public.inspect_floor_command_standing_policies(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due public.floor_command_standing_policies%rowtype;
  v_expired public.floor_command_standing_policies%rowtype;
  v_row public.floor_command_standing_policies%rowtype;
  v_policies jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  for v_due in
    select *
    from public.floor_command_standing_policies
    where user_id = p_user_id
      and state = 'approved'
      and expires_at <= now()
    order by policy_version
    for update
  loop
    update public.floor_command_standing_policies
    set state = 'expired', expired_at = now()
    where policy_id = v_due.policy_id
    returning * into v_expired;
    perform public.floor_command_standing_policy_record(v_expired, 'expired', p_user_id, null);
  end loop;

  for v_row in
    select *
    from public.floor_command_standing_policies
    where user_id = p_user_id
    order by policy_version
  loop
    v_policies := v_policies || jsonb_build_array(public.floor_command_standing_policy_view(v_row));
  end loop;

  return jsonb_build_object('status', 'inspected', 'policies', v_policies);
end;
$$;

revoke all on function public.propose_floor_command_standing_policy(uuid, timestamptz, timestamptz, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.propose_floor_command_standing_policy(uuid, timestamptz, timestamptz, integer, integer, text)
  to service_role;

revoke all on function public.approve_floor_command_standing_policy(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_floor_command_standing_policy(uuid, uuid) to service_role;

revoke all on function public.revoke_floor_command_standing_policy(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_floor_command_standing_policy(uuid, uuid, text) to service_role;

revoke all on function public.expire_floor_command_standing_policy(uuid, uuid) from public, anon, authenticated;
grant execute on function public.expire_floor_command_standing_policy(uuid, uuid) to service_role;

revoke all on function public.inspect_floor_command_standing_policies(uuid) from public, anon, authenticated;
grant execute on function public.inspect_floor_command_standing_policies(uuid) to service_role;

comment on function public.propose_floor_command_standing_policy(uuid, timestamptz, timestamptz, integer, integer, text) is
  'Creates a proposed standing observation grant for store 2587. Does not read a source.';
comment on function public.approve_floor_command_standing_policy(uuid, uuid) is
  'Approves one proposed grant. Changes authority status only. Does not read a source.';
comment on function public.revoke_floor_command_standing_policy(uuid, uuid, text) is
  'Revokes a proposed or approved grant and keeps the row.';
comment on function public.expire_floor_command_standing_policy(uuid, uuid) is
  'Marks an approved grant expired after expires_at. Does not extend it.';
comment on function public.inspect_floor_command_standing_policies(uuid) is
  'Returns the operator policies and records expiry when expires_at has passed. Does not read a source.';
