-- ORIENT-PULSE-EXPRESSION-005-I
-- Explicit authorized temporal relationships: relative_before + arrival.
--
-- Evolves pulse_interrupt_grants and pulse_occurrences with durable relationship
-- identity. Backfills all existing rows to relative_before only.
-- Hosted evaluator branches: relative_before threshold = T − L; arrival = T.
-- Preserves LIFECYCLE-003 SECURITY DEFINER source cleanup, occurrence
-- grant_id ON DELETE SET NULL, occurrence uniqueness, cron entrypoint.
-- Does not expose ARRIVAL through human UI. Does not change native clients.
--
-- Production evidence at implementation (ksmhgaamyheyhefbyglb, read-only):
--   grants: all lead_offset_seconds > 0; relationship column absent
--   occurrences: all threshold_at < source_start_at (positive-lead authority)
-- Do not invent ARRIVAL from history.

-- ---------------------------------------------------------------------------
-- 1. Grants: add relationship, backfill, strengthen invariants, uniqueness
-- ---------------------------------------------------------------------------

alter table public.pulse_interrupt_grants
  add column if not exists relationship text;

update public.pulse_interrupt_grants
set relationship = 'relative_before'
where relationship is null;

do $$
declare
  null_count integer;
  non_relative_count integer;
  nonpositive_lead_count integer;
begin
  select count(*) into null_count
  from public.pulse_interrupt_grants
  where relationship is null;

  select count(*) into non_relative_count
  from public.pulse_interrupt_grants
  where relationship is distinct from 'relative_before';

  select count(*) into nonpositive_lead_count
  from public.pulse_interrupt_grants
  where lead_offset_seconds is null or lead_offset_seconds <= 0;

  if null_count <> 0 then
    raise exception '005-I grant backfill left null relationship rows: %', null_count;
  end if;
  if non_relative_count <> 0 then
    raise exception '005-I grant backfill created non-relative_before rows: %', non_relative_count;
  end if;
  if nonpositive_lead_count <> 0 then
    raise exception '005-I grant backfill found non-positive leads: %', nonpositive_lead_count;
  end if;
end;
$$;

alter table public.pulse_interrupt_grants
  alter column relationship set not null;

alter table public.pulse_interrupt_grants
  drop constraint if exists pulse_interrupt_grants_relationship_known;

alter table public.pulse_interrupt_grants
  add constraint pulse_interrupt_grants_relationship_known
  check (relationship in ('relative_before', 'arrival'));

alter table public.pulse_interrupt_grants
  drop constraint if exists pulse_interrupt_grants_lead_positive;

alter table public.pulse_interrupt_grants
  alter column lead_offset_seconds drop not null;

alter table public.pulse_interrupt_grants
  drop constraint if exists pulse_interrupt_grants_relationship_lead;

alter table public.pulse_interrupt_grants
  add constraint pulse_interrupt_grants_relationship_lead
  check (
    (
      relationship = 'relative_before'
      and lead_offset_seconds is not null
      and lead_offset_seconds > 0
    )
    or (
      relationship = 'arrival'
      and lead_offset_seconds is null
    )
  );

comment on column public.pulse_interrupt_grants.relationship is
  'Authorized temporal relationship identity: relative_before (positive lead) or arrival (lead null). Explicit identity; not inferred from lead.';
comment on column public.pulse_interrupt_grants.lead_offset_seconds is
  'Relative_before: positive seconds before source transition. Arrival: must be null. Null does not mean arrival.';

drop index if exists public.pulse_interrupt_grants_one_active_idx;

create unique index pulse_interrupt_grants_one_active_idx
  on public.pulse_interrupt_grants (
    user_id,
    source_kind,
    source_id,
    transition_kind,
    relationship
  )
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- 2. Occurrences: durable relationship provenance
-- ---------------------------------------------------------------------------

alter table public.pulse_occurrences
  add column if not exists relationship text;

update public.pulse_occurrences
set relationship = 'relative_before'
where relationship is null;

do $$
declare
  null_count integer;
  non_relative_count integer;
  non_relative_threshold_count integer;
begin
  select count(*) into null_count
  from public.pulse_occurrences
  where relationship is null;

  select count(*) into non_relative_count
  from public.pulse_occurrences
  where relationship is distinct from 'relative_before';

  -- Structural corroboration: historical relative_before thresholds precede T.
  select count(*) into non_relative_threshold_count
  from public.pulse_occurrences
  where threshold_at >= source_start_at;

  if null_count <> 0 then
    raise exception '005-I occurrence backfill left null relationship rows: %', null_count;
  end if;
  if non_relative_count <> 0 then
    raise exception '005-I occurrence backfill created non-relative_before rows: %', non_relative_count;
  end if;
  if non_relative_threshold_count <> 0 then
    raise exception
      '005-I occurrence backfill blocked: % rows lack positive-lead threshold evidence',
      non_relative_threshold_count;
  end if;
end;
$$;

alter table public.pulse_occurrences
  alter column relationship set not null;

alter table public.pulse_occurrences
  drop constraint if exists pulse_occurrences_relationship_known;

alter table public.pulse_occurrences
  add constraint pulse_occurrences_relationship_known
  check (relationship in ('relative_before', 'arrival'));

comment on column public.pulse_occurrences.relationship is
  'Durable authorized temporal relationship at establishment. Survives grant_id SET NULL. Not inferred from lead or delivery surface.';

-- Occurrence uniqueness unchanged: (grant_id, source_starts_on, source_start_local).
-- Distinct relationships use distinct grant_id values.

-- ---------------------------------------------------------------------------
-- 3. Insert trigger: relationship-aware lead / timed-source validation
-- ---------------------------------------------------------------------------

create or replace function public.pulse_interrupt_grant_requires_timed_source()
returns trigger
language plpgsql
as $$
declare
  source_row_kind text;
  source_start time;
begin
  if new.transition_kind is distinct from 'start' then
    raise exception 'Interrupt grant requires transition start.';
  end if;

  if new.relationship is distinct from 'relative_before'
     and new.relationship is distinct from 'arrival' then
    raise exception 'Interrupt grant has an unsupported relationship.';
  end if;

  if new.relationship = 'relative_before' then
    if new.lead_offset_seconds is null or new.lead_offset_seconds <= 0 then
      raise exception 'Interrupt grant requires a positive lead offset.';
    end if;
  elsif new.relationship = 'arrival' then
    if new.lead_offset_seconds is not null then
      raise exception 'Arrival interrupt grant requires a null lead offset.';
    end if;
  end if;

  if new.source_kind = 'commitment' then
    select cm.kind, cm.start_local
      into source_row_kind, source_start
    from public.commitments cm
    where cm.id = new.source_id
      and cm.user_id = new.user_id;

    if source_row_kind is null then
      raise exception 'Interrupt grant requires an owned Commitment.';
    end if;
    if source_row_kind <> 'timed' or source_start is null then
      raise exception 'Interrupt grant requires a timed Commitment start.';
    end if;
  elsif new.source_kind = 'block' then
    select bl.kind, bl.start_local
      into source_row_kind, source_start
    from public.blocks bl
    where bl.id = new.source_id
      and bl.user_id = new.user_id;

    if source_row_kind is null then
      raise exception 'Interrupt grant requires an owned Block.';
    end if;
    if source_row_kind <> 'timed' or source_start is null then
      raise exception 'Interrupt grant requires a timed Block start.';
    end if;
  else
    raise exception 'Interrupt grant has an unsupported source kind.';
  end if;

  return new;
end;
$$;

comment on function public.pulse_interrupt_grant_requires_timed_source() is
  'Kind-aware same-owner timed-start validation for Interrupt Grants. Relationship-aware lead: relative_before requires positive lead; arrival requires null lead.';

-- ---------------------------------------------------------------------------
-- 4. Hosted evaluator: explicit relationship threshold branch
-- ---------------------------------------------------------------------------

create or replace function public.establish_due_commitment_start_pulse_occurrences(
  p_now timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_now, timezone('utc', now()));
  g record;
  c record;
  b record;
  zone text;
  source_start_at timestamptz;
  threshold_at timestamptz;
  inserted_id uuid;
  examined integer := 0;
  established integer := 0;
  identities jsonb := '[]'::jsonb;
  identity_local text;
  v_source_starts_on date;
  v_source_start_local time;
  source_id uuid;
  v_relationship text;
begin
  for g in
    select
      ig.id,
      ig.user_id,
      ig.source_id,
      ig.source_kind,
      ig.relationship,
      ig.lead_offset_seconds
    from public.pulse_interrupt_grants ig
    where ig.revoked_at is null
      and ig.source_kind in ('commitment', 'block')
      and ig.transition_kind = 'start'
      and ig.relationship in ('relative_before', 'arrival')
      and (
        (
          ig.relationship = 'relative_before'
          and ig.lead_offset_seconds is not null
          and ig.lead_offset_seconds > 0
        )
        or (
          ig.relationship = 'arrival'
          and ig.lead_offset_seconds is null
        )
      )
    order by ig.established_at asc, ig.id asc
  loop
    examined := examined + 1;
    v_source_starts_on := null;
    v_source_start_local := null;
    source_id := null;
    source_start_at := null;
    threshold_at := null;
    v_relationship := g.relationship;

    if g.source_kind = 'commitment' then
      select
        cm.id,
        cm.user_id,
        cm.kind,
        cm.starts_on,
        cm.start_local
      into c
      from public.commitments cm
      where cm.id = g.source_id
        and cm.user_id = g.user_id;

      if not found then
        continue;
      end if;
      if c.kind <> 'timed' or c.start_local is null or c.starts_on is null then
        continue;
      end if;
      source_id := c.id;
      v_source_starts_on := c.starts_on;
      v_source_start_local := c.start_local;
    elsif g.source_kind = 'block' then
      select
        bl.id,
        bl.user_id,
        bl.kind,
        bl.starts_on,
        bl.start_local
      into b
      from public.blocks bl
      where bl.id = g.source_id
        and bl.user_id = g.user_id;

      if not found then
        continue;
      end if;
      if b.kind <> 'timed' or b.start_local is null or b.starts_on is null then
        continue;
      end if;
      source_id := b.id;
      v_source_starts_on := b.starts_on;
      v_source_start_local := b.start_local;
    else
      continue;
    end if;

    select nullif(btrim(ts.time_zone), '')
    into zone
    from public.temporal_settings ts
    where ts.user_id = g.user_id;

    if zone is null then
      continue;
    end if;

    begin
      perform timezone(zone, v_now);
    exception
      when invalid_parameter_value then
        continue;
      when others then
        continue;
    end;

    begin
      source_start_at := ((v_source_starts_on::timestamp + v_source_start_local) at time zone zone);
    exception
      when others then
        continue;
    end;

    if source_start_at is null then
      continue;
    end if;

    -- Relationship identity is authoritative. Do not infer from lead.
    if v_relationship = 'relative_before' then
      threshold_at := source_start_at - make_interval(secs => g.lead_offset_seconds);
    elsif v_relationship = 'arrival' then
      threshold_at := source_start_at;
    else
      continue;
    end if;

    if v_now < threshold_at then
      continue;
    end if;

    if exists (
      select 1
      from public.pulse_occurrences po
      where po.grant_id = g.id
        and po.source_starts_on = v_source_starts_on
        and po.source_start_local = v_source_start_local
    ) then
      continue;
    end if;

    identity_local := to_char(v_source_start_local, 'HH24:MI:SS');

    insert into public.pulse_occurrences (
      user_id,
      grant_id,
      source_kind,
      source_id,
      source_starts_on,
      source_start_local,
      threshold_at,
      source_start_at,
      established_at,
      relationship
    )
    values (
      g.user_id,
      g.id,
      g.source_kind,
      source_id,
      v_source_starts_on,
      v_source_start_local,
      threshold_at,
      source_start_at,
      v_now,
      v_relationship
    )
    on conflict (grant_id, source_starts_on, source_start_local) do nothing
    returning id into inserted_id;

    if inserted_id is not null then
      established := established + 1;
      identities := identities || jsonb_build_array(
        jsonb_build_object(
          'grant_id', g.id,
          'source_kind', g.source_kind,
          'source_id', source_id,
          'relationship', v_relationship,
          'source_starts_on', v_source_starts_on,
          'source_start_local', identity_local,
          'threshold_at', threshold_at
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'examined_grant_count', examined,
    'established_count', established,
    'established_identities', identities,
    'evaluated_at', v_now
  );
end;
$$;

comment on function public.establish_due_commitment_start_pulse_occurrences(timestamptz) is
  'Hosted Pulse establishment for authorized Commitment-start and Block-start grants. relative_before threshold = T − lead; arrival threshold = T. Relationship identity is authoritative. Corresponds to domain/pulse.ts startPulseIsDueForEstablishment. No delivery.';

-- Source cleanup function intentionally unchanged (LIFECYCLE-003):
-- public.pulse_interrupt_grants_cascade_source_delete remains SECURITY DEFINER,
-- deletes all grants for (source_kind, source_id, user_id) regardless of relationship.
