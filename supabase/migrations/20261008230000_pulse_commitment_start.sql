-- ORIENT-PULSE-COMMITMENT-START-001
-- First human-authorized Pulse: timed Orient-native Commitment start.
-- Interrupt Grant = explicit human interruption authority (relative lead before start).
-- Pulse occurrence = durable establishment that the authorized condition evaluated true.
-- Expression/delivery channels are not stored here. No push, Wear, or notification stack.
--
-- Privilege lesson from NOTE-LIFECYCLE-001A: revoke defaults from authenticated before
-- granting the narrow surface. Column-level UPDATE alone does not remove table-level UPDATE.

alter table public.commitments
  add constraint commitments_id_user_key unique (id, user_id);

comment on constraint commitments_id_user_key on public.commitments is
  'Same-owner identity for Interrupt Grant foreign keys. id is already the primary key.';

create table public.pulse_interrupt_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null,
  source_id uuid not null,
  transition_kind text not null,
  lead_offset_seconds integer not null,
  established_at timestamptz not null,
  revoked_at timestamptz,
  constraint pulse_interrupt_grants_source_kind_known check (source_kind = 'commitment'),
  constraint pulse_interrupt_grants_transition_kind_known check (transition_kind = 'start'),
  constraint pulse_interrupt_grants_lead_positive check (lead_offset_seconds > 0),
  constraint pulse_interrupt_grants_revoke_order check (
    revoked_at is null or revoked_at >= established_at
  ),
  constraint pulse_interrupt_grants_commitment_same_owner
    foreign key (source_id, user_id)
    references public.commitments (id, user_id)
    match simple
    on delete cascade
);

comment on table public.pulse_interrupt_grants is
  'Explicit human interruption authority for a relative temporal transition. Not a notification, channel list, MustDo, or delivery record.';
comment on column public.pulse_interrupt_grants.source_kind is
  'First proof: commitment only.';
comment on column public.pulse_interrupt_grants.transition_kind is
  'First proof: start only. Lead time is the threshold offset, not an approaching ontology.';
comment on column public.pulse_interrupt_grants.lead_offset_seconds is
  'Positive seconds before the source transition. Relative to current source start; not an absolute fire timestamp.';
comment on column public.pulse_interrupt_grants.established_at is
  'Instant the human established this authority. Supplied by the act. Not silently defaulted by Commitment creation.';
comment on column public.pulse_interrupt_grants.revoked_at is
  'Instant the human withdrew authority. Null means active. Soft revoke preserves inspectability.';

create unique index pulse_interrupt_grants_one_active_idx
  on public.pulse_interrupt_grants (user_id, source_kind, source_id, transition_kind)
  where revoked_at is null;

create index pulse_interrupt_grants_user_active_idx
  on public.pulse_interrupt_grants (user_id, revoked_at, established_at);

alter table public.pulse_interrupt_grants enable row level security;

revoke all on table public.pulse_interrupt_grants from public;
revoke all on table public.pulse_interrupt_grants from anon;
revoke all on table public.pulse_interrupt_grants from authenticated;

grant select, insert on table public.pulse_interrupt_grants to authenticated;
grant update (revoked_at) on table public.pulse_interrupt_grants to authenticated;

create policy pulse_interrupt_grants_select_own
  on public.pulse_interrupt_grants
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy pulse_interrupt_grants_insert_own
  on public.pulse_interrupt_grants
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy pulse_interrupt_grants_update_own
  on public.pulse_interrupt_grants
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.pulse_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_id uuid,
  source_kind text not null,
  source_id uuid,
  source_starts_on date not null,
  source_start_local time not null,
  threshold_at timestamptz not null,
  source_start_at timestamptz not null,
  established_at timestamptz not null,
  constraint pulse_occurrences_source_kind_known check (source_kind = 'commitment'),
  constraint pulse_occurrences_grant_fk
    foreign key (grant_id)
    references public.pulse_interrupt_grants (id)
    on delete set null,
  constraint pulse_occurrences_grant_identity unique (grant_id, source_starts_on, source_start_local)
);

comment on table public.pulse_occurrences is
  'Durable Pulse occurrence: authorized temporal condition evaluated true under a unique identity. Not delivery, acknowledgment, or urgency.';
comment on column public.pulse_occurrences.grant_id is
  'Authorizing grant. SET NULL if the grant row is removed with its Commitment so occurrence evidence can remain.';
comment on column public.pulse_occurrences.source_starts_on is
  'Civil start fingerprint at establishment. Part of occurrence identity. Not rewritten when the live Commitment later moves.';
comment on column public.pulse_occurrences.source_start_local is
  'Local start fingerprint at establishment. Part of occurrence identity.';
comment on column public.pulse_occurrences.threshold_at is
  'Derived threshold instant at establishment. Evidence only.';
comment on column public.pulse_occurrences.source_start_at is
  'Derived Commitment start instant at establishment. Evidence only.';
comment on column public.pulse_occurrences.established_at is
  'Instant the condition was established true. Not proof of perception or action.';

create index pulse_occurrences_user_established_at_idx
  on public.pulse_occurrences (user_id, established_at desc);

alter table public.pulse_occurrences enable row level security;

revoke all on table public.pulse_occurrences from public;
revoke all on table public.pulse_occurrences from anon;
revoke all on table public.pulse_occurrences from authenticated;

grant select, insert on table public.pulse_occurrences to authenticated;

create policy pulse_occurrences_select_own
  on public.pulse_occurrences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy pulse_occurrences_insert_own
  on public.pulse_occurrences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Timed-only grants: all-day Commitments cannot authorize commitment.start lead thresholds.
create or replace function public.pulse_interrupt_grant_requires_timed_commitment()
returns trigger
language plpgsql
as $$
declare
  commitment_kind text;
begin
  select kind into commitment_kind
  from public.commitments
  where id = new.source_id
    and user_id = new.user_id;

  if commitment_kind is null then
    raise exception 'Interrupt grant requires an owned Commitment.';
  end if;
  if commitment_kind <> 'timed' then
    raise exception 'Interrupt grant requires a timed Commitment start.';
  end if;
  return new;
end;
$$;

create trigger pulse_interrupt_grants_timed_commitment
  before insert on public.pulse_interrupt_grants
  for each row
  execute function public.pulse_interrupt_grant_requires_timed_commitment();

-- Cross-client reread awareness. Payloads are never Pulse authority.
alter publication supabase_realtime add table public.pulse_interrupt_grants;
alter publication supabase_realtime add table public.pulse_occurrences;
