-- V0-003: confirmed IANA time zone, and one personal Work schedule state per civil date.
-- Absence of a work_schedule_days row means no schedule has been entered.
-- That is not the same fact as an Off day.
-- NOW, Timeline, and shift position are not stored.

create table public.temporal_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null,
  confirmed_at timestamptz not null,
  constraint temporal_settings_time_zone_not_blank check (char_length(btrim(time_zone)) > 0)
);

comment on table public.temporal_settings is
  'The user-confirmed IANA time zone. Not a profile, theme, or preference catalog.';
comment on column public.temporal_settings.time_zone is
  'IANA time zone the user confirmed. Local Work times are interpreted in this zone.';
comment on column public.temporal_settings.confirmed_at is
  'Instant the user confirmed this zone. The application does not infer and store a zone by itself.';

create table public.work_schedule_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  work_on date not null,
  day_state text not null,
  start_local time,
  end_local time,
  shift_type text,
  primary key (user_id, work_on),
  constraint work_schedule_days_state_known check (day_state in ('off', 'scheduled')),
  constraint work_schedule_days_shift_type_known check (
    shift_type is null or shift_type in ('opening', 'mid', 'closing')
  ),
  constraint work_schedule_days_shape check (
    (
      day_state = 'off'
      and start_local is null
      and end_local is null
      and shift_type is null
    )
    or (
      day_state = 'scheduled'
      and start_local is not null
      and end_local is not null
      and shift_type is not null
    )
  )
);

comment on table public.work_schedule_days is
  'The user''s personal Work schedule. One Off or scheduled shift per civil date. Not a store schedule.';
comment on column public.work_schedule_days.work_on is
  'Civil date of this Work schedule state. Not an instant.';
comment on column public.work_schedule_days.day_state is
  'off or scheduled. A missing row is unknown, not off.';
comment on column public.work_schedule_days.start_local is
  'Local time of day the shift starts. Null when the day is Off.';
comment on column public.work_schedule_days.end_local is
  'Local time of day the shift ends. Null when the day is Off. If end_local is earlier than or equal to start_local, the shift continues into the next civil date.';
comment on column public.work_schedule_days.shift_type is
  'opening, mid, or closing. Chosen by the user. Not inferred from the clock.';

alter table public.temporal_settings enable row level security;
alter table public.work_schedule_days enable row level security;

revoke all on table public.temporal_settings from public, anon;
revoke all on table public.work_schedule_days from public, anon;
grant select, insert, update, delete on table public.temporal_settings to authenticated;
grant select, insert, update, delete on table public.work_schedule_days to authenticated;

create policy temporal_settings_select_own
  on public.temporal_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy temporal_settings_insert_own
  on public.temporal_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy temporal_settings_update_own
  on public.temporal_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy temporal_settings_delete_own
  on public.temporal_settings
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy work_schedule_days_select_own
  on public.work_schedule_days
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy work_schedule_days_insert_own
  on public.work_schedule_days
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy work_schedule_days_update_own
  on public.work_schedule_days
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy work_schedule_days_delete_own
  on public.work_schedule_days
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
