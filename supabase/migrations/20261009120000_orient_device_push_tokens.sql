-- ORIENT-ANDROID-PULSE-BRIDGE-002
-- Owner-scoped Android FCM token registration for future Pulse delivery transport.
--
-- Delivery infrastructure only. Not Pulse authority, temporal truth, Interrupt Grant,
-- occurrence identity, acknowledgment, urgency, or perception evidence.
--
-- This migration does not send FCM, create a dispatcher, create a webhook, or alter
-- pulse_interrupt_grants / pulse_occurrences / hosted Pulse evaluation.

create table public.orient_device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fcm_token text not null,
  platform text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orient_device_push_tokens_platform_known check (platform = 'android'),
  constraint orient_device_push_tokens_token_shape check (char_length(btrim(fcm_token)) > 0),
  constraint orient_device_push_tokens_fcm_token_unique unique (fcm_token)
);

comment on table public.orient_device_push_tokens is
  'Owner-scoped device push token registration for delivery transport. Not Pulse authority, acknowledgment, urgency, or perception evidence.';
comment on column public.orient_device_push_tokens.fcm_token is
  'FCM registration token for one Android app instance. Globally unique. Not an occurrence id.';
comment on column public.orient_device_push_tokens.platform is
  'First proof: android only.';
comment on column public.orient_device_push_tokens.updated_at is
  'Database-controlled instant the owner most recently established or refreshed this token registration. Not behavioral telemetry.';

create index orient_device_push_tokens_user_id_idx
  on public.orient_device_push_tokens (user_id);

create or replace function public.orient_device_push_tokens_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

comment on function public.orient_device_push_tokens_set_updated_at() is
  'Forces updated_at from the database clock on insert and update. Clients cannot author registration time.';

create trigger orient_device_push_tokens_set_updated_at
  before insert or update on public.orient_device_push_tokens
  for each row
  execute function public.orient_device_push_tokens_set_updated_at();

alter table public.orient_device_push_tokens enable row level security;

revoke all on table public.orient_device_push_tokens from public;
revoke all on table public.orient_device_push_tokens from anon;
revoke all on table public.orient_device_push_tokens from authenticated;
revoke all on table public.orient_device_push_tokens from service_role;

grant select, insert, update, delete on table public.orient_device_push_tokens to authenticated;

-- Intended dispatcher lookup surface. Mutation intentionally not granted here.
-- Hosted apply must inspect whether platform-default service_role surplus remains.
grant select on table public.orient_device_push_tokens to service_role;

create policy orient_device_push_tokens_select_own
  on public.orient_device_push_tokens
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy orient_device_push_tokens_insert_own
  on public.orient_device_push_tokens
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy orient_device_push_tokens_update_own
  on public.orient_device_push_tokens
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy orient_device_push_tokens_delete_own
  on public.orient_device_push_tokens
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Intentionally omitted from supabase_realtime. Token registration is not Class-A
-- temporal coherence and is not Pulse occurrence authority.
