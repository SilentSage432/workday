-- EXTERNAL-TEMPORAL-CORE-IMPLEMENTATION-001
-- Provider-neutral external temporal observation foundation.
-- Connection / Observed Source / External Temporal Fact only.
-- Credentials, realtime publication, and Google-specific columns are deferred.

-- ---------------------------------------------------------------------------
-- external_temporal_connections
-- Orient's observation relationship with an external provider.
-- Does not store tokens, secrets, or calendar/source rows.
-- ---------------------------------------------------------------------------

create table public.external_temporal_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_type text not null,
  status text not null,
  display_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_temporal_connections_provider_type_shape check (
    char_length(btrim(provider_type)) > 0
    and char_length(provider_type) <= 64
  ),
  constraint external_temporal_connections_status_known check (
    status in ('pending_auth', 'connected', 'auth_failed', 'disconnected')
  ),
  constraint external_temporal_connections_display_label_shape check (
    display_label is null
    or (
      char_length(btrim(display_label)) > 0
      and char_length(display_label) <= 120
    )
  ),
  constraint external_temporal_connections_id_user_unique unique (id, user_id)
);

comment on table public.external_temporal_connections is
  'Orient observation relationship with an external temporal provider. Not a calendar. Not credential storage.';
comment on column public.external_temporal_connections.provider_type is
  'Opaque provider identifier. Not a Google DTO field.';
comment on column public.external_temporal_connections.status is
  'Connection lifecycle for observation authority. Not token material.';
comment on column public.external_temporal_connections.display_label is
  'Optional human label for the connection. Not a calendar name.';

create index external_temporal_connections_user_status_idx
  on public.external_temporal_connections (user_id, status);

alter table public.external_temporal_connections enable row level security;

revoke all on table public.external_temporal_connections from public, anon;
grant select, insert, update, delete on table public.external_temporal_connections to authenticated;

create policy external_temporal_connections_select_own
  on public.external_temporal_connections
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy external_temporal_connections_insert_own
  on public.external_temporal_connections
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy external_temporal_connections_update_own
  on public.external_temporal_connections
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy external_temporal_connections_delete_own
  on public.external_temporal_connections
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- external_temporal_sources
-- Human-selected Observed Source under a Connection.
-- ---------------------------------------------------------------------------

create table public.external_temporal_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null,
  source_local_id text not null,
  display_name text not null,
  selected boolean not null default false,
  provider_access_role text,
  source_time_zone text,
  last_attempted_at timestamptz,
  last_attempt_result text,
  last_successful_observed_at timestamptz,
  last_successful_window_starts_on date,
  last_successful_window_ends_before date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_temporal_sources_connection_same_owner
    foreign key (connection_id, user_id)
    references public.external_temporal_connections (id, user_id)
    on delete cascade,
  constraint external_temporal_sources_source_local_id_shape check (
    char_length(btrim(source_local_id)) > 0
    and char_length(source_local_id) <= 256
  ),
  constraint external_temporal_sources_display_name_shape check (
    char_length(btrim(display_name)) > 0
    and char_length(display_name) <= 160
  ),
  constraint external_temporal_sources_access_role_shape check (
    provider_access_role is null
    or (
      char_length(btrim(provider_access_role)) > 0
      and char_length(provider_access_role) <= 64
    )
  ),
  constraint external_temporal_sources_time_zone_shape check (
    source_time_zone is null
    or (
      char_length(btrim(source_time_zone)) > 0
      and char_length(source_time_zone) <= 64
    )
  ),
  constraint external_temporal_sources_attempt_result_known check (
    last_attempt_result is null
    or last_attempt_result in ('success_complete', 'success_partial', 'failure')
  ),
  constraint external_temporal_sources_success_window_shape check (
    (
      last_successful_window_starts_on is null
      and last_successful_window_ends_before is null
    )
    or (
      last_successful_window_starts_on is not null
      and last_successful_window_ends_before is not null
      and last_successful_window_ends_before > last_successful_window_starts_on
    )
  ),
  constraint external_temporal_sources_user_connection_source_unique
    unique (user_id, connection_id, source_local_id),
  constraint external_temporal_sources_id_user_unique unique (id, user_id)
);

comment on table public.external_temporal_sources is
  'Human-selected external temporal source observed through a Connection. Not Orient-owned time.';
comment on column public.external_temporal_sources.source_local_id is
  'Opaque provider source identity under the Connection.';
comment on column public.external_temporal_sources.display_name is
  'Truthful source/calendar label permitted for display.';
comment on column public.external_temporal_sources.last_attempt_result is
  'Latest observation attempt completeness. Partial/failure must not authorize absence.';
comment on column public.external_temporal_sources.last_successful_window_starts_on is
  'Inclusive civil start of the last successful complete observation window.';
comment on column public.external_temporal_sources.last_successful_window_ends_before is
  'Exclusive civil end of the last successful complete observation window.';

create index external_temporal_sources_user_selected_idx
  on public.external_temporal_sources (user_id, selected);

create index external_temporal_sources_connection_idx
  on public.external_temporal_sources (connection_id);

alter table public.external_temporal_sources enable row level security;

revoke all on table public.external_temporal_sources from public, anon;
grant select, insert, update, delete on table public.external_temporal_sources to authenticated;

create policy external_temporal_sources_select_own
  on public.external_temporal_sources
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy external_temporal_sources_insert_own
  on public.external_temporal_sources
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy external_temporal_sources_update_own
  on public.external_temporal_sources
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy external_temporal_sources_delete_own
  on public.external_temporal_sources
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- external_temporal_facts
-- Current-state provider-owned temporal evidence retained for observation.
-- Local UUID addresses the row; it does not imply Orient ownership.
-- ---------------------------------------------------------------------------

create table public.external_temporal_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null,
  source_event_id text not null,
  source_instance_id text,
  source_series_id text,
  temporal_kind text not null,
  start_at timestamptz,
  end_at timestamptz,
  starts_on date,
  ends_before date,
  source_time_zone text,
  display_label text not null,
  lifecycle text not null,
  provider_version_token text,
  provider_updated_at timestamptz,
  provider_event_type text,
  provider_transparency text,
  last_observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_temporal_facts_source_same_owner
    foreign key (source_id, user_id)
    references public.external_temporal_sources (id, user_id)
    on delete cascade,
  constraint external_temporal_facts_source_event_id_shape check (
    char_length(btrim(source_event_id)) > 0
    and char_length(source_event_id) <= 512
  ),
  constraint external_temporal_facts_source_instance_id_shape check (
    source_instance_id is null
    or (
      char_length(btrim(source_instance_id)) > 0
      and char_length(source_instance_id) <= 512
    )
  ),
  constraint external_temporal_facts_source_series_id_shape check (
    source_series_id is null
    or (
      char_length(btrim(source_series_id)) > 0
      and char_length(source_series_id) <= 512
    )
  ),
  constraint external_temporal_facts_temporal_kind_known check (
    temporal_kind in ('timed', 'all_day')
  ),
  constraint external_temporal_facts_shape check (
    (
      temporal_kind = 'timed'
      and start_at is not null
      and end_at is not null
      and end_at > start_at
      and starts_on is null
      and ends_before is null
    )
    or (
      temporal_kind = 'all_day'
      and starts_on is not null
      and ends_before is not null
      and ends_before > starts_on
      and start_at is null
      and end_at is null
    )
  ),
  constraint external_temporal_facts_source_time_zone_shape check (
    source_time_zone is null
    or (
      char_length(btrim(source_time_zone)) > 0
      and char_length(source_time_zone) <= 64
    )
  ),
  constraint external_temporal_facts_display_label_shape check (
    char_length(btrim(display_label)) > 0
    and char_length(display_label) <= 240
  ),
  constraint external_temporal_facts_lifecycle_known check (
    lifecycle in ('active', 'cancelled', 'deleted', 'absent_from_window')
  ),
  constraint external_temporal_facts_provider_version_token_shape check (
    provider_version_token is null
    or char_length(provider_version_token) <= 512
  ),
  constraint external_temporal_facts_provider_event_type_shape check (
    provider_event_type is null
    or (
      char_length(btrim(provider_event_type)) > 0
      and char_length(provider_event_type) <= 64
    )
  ),
  constraint external_temporal_facts_provider_transparency_shape check (
    provider_transparency is null
    or (
      char_length(btrim(provider_transparency)) > 0
      and char_length(provider_transparency) <= 64
    )
  )
);

comment on table public.external_temporal_facts is
  'Provider-owned temporal evidence retained by Orient. Local id addresses the row; ownership remains external.';
comment on column public.external_temporal_facts.display_label is
  'Descriptive label the provider permits Orient to display. May be a truthful fallback when detail is restricted.';
comment on column public.external_temporal_facts.start_at is
  'Inclusive start instant for timed facts. Half-open with exclusive end_at.';
comment on column public.external_temporal_facts.end_at is
  'Exclusive end instant for timed facts.';
comment on column public.external_temporal_facts.starts_on is
  'Inclusive first civil date for all-day facts.';
comment on column public.external_temporal_facts.ends_before is
  'Exclusive civil end date for all-day facts. Multi-day spans are one fact.';
comment on column public.external_temporal_facts.lifecycle is
  'Provider-neutral lifecycle. absent_from_window requires successful complete bounded observation.';
comment on column public.external_temporal_facts.provider_version_token is
  'Opaque provider change/version evidence. Not ownership.';

-- Nullable instance identity: treat null as empty string for uniqueness.
create unique index external_temporal_facts_source_identity_uidx
  on public.external_temporal_facts (
    user_id,
    source_id,
    source_event_id,
    coalesce(source_instance_id, '')
  );

create index external_temporal_facts_user_timed_idx
  on public.external_temporal_facts (user_id, start_at, end_at)
  where temporal_kind = 'timed';

create index external_temporal_facts_user_all_day_idx
  on public.external_temporal_facts (user_id, starts_on, ends_before)
  where temporal_kind = 'all_day';

create index external_temporal_facts_source_lifecycle_idx
  on public.external_temporal_facts (source_id, lifecycle);

alter table public.external_temporal_facts enable row level security;

revoke all on table public.external_temporal_facts from public, anon;
-- Browser/authenticated may read own observed evidence. Writes are deferred to
-- the future server observation path (service role). No credential material here.
grant select on table public.external_temporal_facts to authenticated;

create policy external_temporal_facts_select_own
  on public.external_temporal_facts
  for select
  to authenticated
  using (user_id = (select auth.uid()));
