-- Provider-neutral transactional observation persistence for one Observed Source.
-- Service-role only. Does not broaden authenticated write grants on external_temporal_facts.
-- No Google-specific schema.

create or replace function public.persist_external_source_observation(
  p_user_id uuid,
  p_source_id uuid,
  p_observed_at timestamptz,
  p_attempt_result text,
  p_window_starts_on date,
  p_window_ends_before date,
  p_window_time_min timestamptz,
  p_window_time_max timestamptz,
  p_apply_absence boolean,
  p_facts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fact jsonb;
  existing_id uuid;
  v_source_event_id text;
  v_source_instance_id text;
  v_source_series_id text;
  v_temporal_kind text;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_starts_on date;
  v_ends_before date;
  v_source_time_zone text;
  v_display_label text;
  v_lifecycle text;
  v_provider_version_token text;
  v_provider_updated_at timestamptz;
  v_provider_event_type text;
  v_provider_transparency text;
  source_owner uuid;
begin
  if p_user_id is null or p_source_id is null then
    raise exception 'Observation persistence requires user and source identity';
  end if;

  if p_attempt_result not in ('success_complete', 'success_partial', 'failure') then
    raise exception 'Unsupported observation attempt result';
  end if;

  select user_id into source_owner
  from public.external_temporal_sources
  where id = p_source_id;

  if source_owner is null or source_owner <> p_user_id then
    raise exception 'Observed source is not owned by this user';
  end if;

  -- Always record the attempt. Success window fields update only on complete success.
  update public.external_temporal_sources
  set
    last_attempted_at = p_observed_at,
    last_attempt_result = p_attempt_result,
    last_successful_observed_at = case
      when p_attempt_result = 'success_complete' then p_observed_at
      else last_successful_observed_at
    end,
    last_successful_window_starts_on = case
      when p_attempt_result = 'success_complete' then p_window_starts_on
      else last_successful_window_starts_on
    end,
    last_successful_window_ends_before = case
      when p_attempt_result = 'success_complete' then p_window_ends_before
      else last_successful_window_ends_before
    end,
    updated_at = p_observed_at
  where id = p_source_id
    and user_id = p_user_id;

  if p_attempt_result <> 'success_complete' then
    return;
  end if;

  if p_facts is null or jsonb_typeof(p_facts) <> 'array' then
    raise exception 'Complete observation requires a fact array';
  end if;

  if p_window_starts_on is null
     or p_window_ends_before is null
     or p_window_ends_before <= p_window_starts_on
     or p_window_time_min is null
     or p_window_time_max is null
     or p_window_time_max <= p_window_time_min then
    raise exception 'Complete observation requires a valid observation window';
  end if;

  for fact in
    select value from jsonb_array_elements(p_facts)
  loop
    v_source_event_id := fact ->> 'source_event_id';
    v_source_instance_id := nullif(fact ->> 'source_instance_id', '');
    v_source_series_id := nullif(fact ->> 'source_series_id', '');
    v_temporal_kind := fact ->> 'temporal_kind';
    v_display_label := fact ->> 'display_label';
    v_lifecycle := fact ->> 'lifecycle';
    v_source_time_zone := nullif(fact ->> 'source_time_zone', '');
    v_provider_version_token := nullif(fact ->> 'provider_version_token', '');
    v_provider_event_type := nullif(fact ->> 'provider_event_type', '');
    v_provider_transparency := nullif(fact ->> 'provider_transparency', '');
    v_provider_updated_at := nullif(fact ->> 'provider_updated_at', '')::timestamptz;

    if v_temporal_kind = 'timed' then
      v_start_at := (fact ->> 'start_at')::timestamptz;
      v_end_at := (fact ->> 'end_at')::timestamptz;
      v_starts_on := null;
      v_ends_before := null;
    elsif v_temporal_kind = 'all_day' then
      v_start_at := null;
      v_end_at := null;
      v_starts_on := (fact ->> 'starts_on')::date;
      v_ends_before := (fact ->> 'ends_before')::date;
    else
      raise exception 'Unsupported external fact temporal kind';
    end if;

    select id into existing_id
    from public.external_temporal_facts
    where user_id = p_user_id
      and source_id = p_source_id
      and source_event_id = v_source_event_id
      and coalesce(source_instance_id, '') = coalesce(v_source_instance_id, '');

    if existing_id is not null then
      update public.external_temporal_facts
      set
        source_series_id = v_source_series_id,
        temporal_kind = v_temporal_kind,
        start_at = v_start_at,
        end_at = v_end_at,
        starts_on = v_starts_on,
        ends_before = v_ends_before,
        source_time_zone = v_source_time_zone,
        display_label = v_display_label,
        lifecycle = v_lifecycle,
        provider_version_token = v_provider_version_token,
        provider_updated_at = v_provider_updated_at,
        provider_event_type = v_provider_event_type,
        provider_transparency = v_provider_transparency,
        last_observed_at = p_observed_at,
        updated_at = p_observed_at
      where id = existing_id
        and user_id = p_user_id;
    else
      insert into public.external_temporal_facts (
        user_id,
        source_id,
        source_event_id,
        source_instance_id,
        source_series_id,
        temporal_kind,
        start_at,
        end_at,
        starts_on,
        ends_before,
        source_time_zone,
        display_label,
        lifecycle,
        provider_version_token,
        provider_updated_at,
        provider_event_type,
        provider_transparency,
        last_observed_at,
        created_at,
        updated_at
      ) values (
        p_user_id,
        p_source_id,
        v_source_event_id,
        v_source_instance_id,
        v_source_series_id,
        v_temporal_kind,
        v_start_at,
        v_end_at,
        v_starts_on,
        v_ends_before,
        v_source_time_zone,
        v_display_label,
        v_lifecycle,
        v_provider_version_token,
        v_provider_updated_at,
        v_provider_event_type,
        v_provider_transparency,
        p_observed_at,
        p_observed_at,
        p_observed_at
      );
    end if;
  end loop;

  if p_apply_absence then
    update public.external_temporal_facts f
    set
      lifecycle = 'absent_from_window',
      updated_at = p_observed_at
    where f.user_id = p_user_id
      and f.source_id = p_source_id
      and f.lifecycle = 'active'
      and (
        (
          f.temporal_kind = 'timed'
          and f.start_at is not null
          and f.end_at is not null
          and f.end_at > p_window_time_min
          and f.start_at < p_window_time_max
        )
        or (
          f.temporal_kind = 'all_day'
          and f.starts_on is not null
          and f.ends_before is not null
          and f.ends_before > p_window_starts_on
          and f.starts_on < p_window_ends_before
        )
      )
      and not exists (
        select 1
        from jsonb_array_elements(p_facts) observed
        where (observed ->> 'source_event_id') = f.source_event_id
          and coalesce(observed ->> 'source_instance_id', '') = coalesce(f.source_instance_id, '')
      );
  end if;
end;
$$;

comment on function public.persist_external_source_observation(
  uuid, uuid, timestamptz, text, date, date, timestamptz, timestamptz, boolean, jsonb
) is
  'Transactionally persists one Observed Source observation result. Service-role only. Bounded absence only when apply_absence is true after complete success.';

revoke all on function public.persist_external_source_observation(
  uuid, uuid, timestamptz, text, date, date, timestamptz, timestamptz, boolean, jsonb
) from public, anon, authenticated;

grant execute on function public.persist_external_source_observation(
  uuid, uuid, timestamptz, text, date, date, timestamptz, timestamptz, boolean, jsonb
) to service_role;

-- Clear cached external facts for a Connection without touching Orient-owned tables.
create or replace function public.clear_external_facts_for_connection(
  p_user_id uuid,
  p_connection_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_connection_id is null then
    raise exception 'Clearing external facts requires user and connection identity';
  end if;

  if not exists (
    select 1
    from public.external_temporal_connections
    where id = p_connection_id
      and user_id = p_user_id
  ) then
    raise exception 'Connection is not owned by this user';
  end if;

  delete from public.external_temporal_facts f
  using public.external_temporal_sources s
  where f.source_id = s.id
    and f.user_id = p_user_id
    and s.user_id = p_user_id
    and s.connection_id = p_connection_id;
end;
$$;

comment on function public.clear_external_facts_for_connection(uuid, uuid) is
  'Deletes cached external temporal facts for one Connection. Does not modify Orient-owned truth.';

revoke all on function public.clear_external_facts_for_connection(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.clear_external_facts_for_connection(uuid, uuid)
  to service_role;
