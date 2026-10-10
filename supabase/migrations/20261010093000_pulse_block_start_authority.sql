-- ORIENT-PULSE-AUTHORITY-002
-- Second authorized Pulse source relationship: timed Orient-native Block start.
-- Bounded extension of pulse_interrupt_grants — not a generic source registry.
-- Commitment-start remains valid. Positive relative lead before start only.
-- No lead=0. No Block end. No all-day Block Pulse. No delivery changes.
--
-- Ownership: drop Commitment-only FK; enforce same-owner timed source via
-- kind-aware BEFORE INSERT trigger. Cascade grant removal on source DELETE
-- to preserve Commitment cascade semantics and add the same for Blocks.

alter table public.blocks
  add constraint blocks_id_user_key unique (id, user_id);

comment on constraint blocks_id_user_key on public.blocks is
  'Same-owner identity for Interrupt Grant ownership validation. id is already the primary key.';

alter table public.pulse_interrupt_grants
  drop constraint pulse_interrupt_grants_commitment_same_owner;

alter table public.pulse_interrupt_grants
  drop constraint pulse_interrupt_grants_source_kind_known;

alter table public.pulse_interrupt_grants
  add constraint pulse_interrupt_grants_source_kind_known
  check (source_kind in ('commitment', 'block'));

comment on column public.pulse_interrupt_grants.source_kind is
  'Authorized Interrupt Grant sources: commitment (first proof), block (second proof).';

alter table public.pulse_occurrences
  drop constraint pulse_occurrences_source_kind_known;

alter table public.pulse_occurrences
  add constraint pulse_occurrences_source_kind_known
  check (source_kind in ('commitment', 'block'));

comment on column public.pulse_occurrences.source_kind is
  'Source kind of the authorizing relationship at establishment. commitment or block.';

drop trigger if exists pulse_interrupt_grants_timed_commitment on public.pulse_interrupt_grants;
drop function if exists public.pulse_interrupt_grant_requires_timed_commitment();

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
  if new.lead_offset_seconds is null or new.lead_offset_seconds <= 0 then
    raise exception 'Interrupt grant requires a positive lead offset.';
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
  'Kind-aware same-owner timed-start validation for Interrupt Grants. Commitment and Block only.';

create trigger pulse_interrupt_grants_timed_source
  before insert on public.pulse_interrupt_grants
  for each row
  execute function public.pulse_interrupt_grant_requires_timed_source();

create or replace function public.pulse_interrupt_grants_cascade_source_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.pulse_interrupt_grants
  where source_kind = tg_argv[0]
    and source_id = old.id
    and user_id = old.user_id;
  return old;
end;
$$;

comment on function public.pulse_interrupt_grants_cascade_source_delete() is
  'Removes Interrupt Grants when their authoritative source row is deleted. Parity with prior Commitment FK ON DELETE CASCADE.';

create trigger pulse_interrupt_grants_cascade_commitment_delete
  after delete on public.commitments
  for each row
  execute function public.pulse_interrupt_grants_cascade_source_delete('commitment');

create trigger pulse_interrupt_grants_cascade_block_delete
  after delete on public.blocks
  for each row
  execute function public.pulse_interrupt_grants_cascade_source_delete('block');

-- Hosted establishment: Commitment-start and Block-start under one sovereign evaluator.
-- Function name retained for cron/entrypoint continuity; body now kind-dispatched.
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
  source_starts_on date;
  source_start_local time;
  source_id uuid;
begin
  for g in
    select
      ig.id,
      ig.user_id,
      ig.source_id,
      ig.source_kind,
      ig.lead_offset_seconds
    from public.pulse_interrupt_grants ig
    where ig.revoked_at is null
      and ig.source_kind in ('commitment', 'block')
      and ig.transition_kind = 'start'
      and ig.lead_offset_seconds > 0
    order by ig.established_at asc, ig.id asc
  loop
    examined := examined + 1;
    source_starts_on := null;
    source_start_local := null;
    source_id := null;
    source_start_at := null;
    threshold_at := null;

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
      source_starts_on := c.starts_on;
      source_start_local := c.start_local;
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
      source_starts_on := b.starts_on;
      source_start_local := b.start_local;
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
      source_start_at := ((source_starts_on::timestamp + source_start_local) at time zone zone);
    exception
      when others then
        continue;
    end;

    if source_start_at is null then
      continue;
    end if;

    threshold_at := source_start_at - make_interval(secs => g.lead_offset_seconds);

    if v_now < threshold_at then
      continue;
    end if;

    if exists (
      select 1
      from public.pulse_occurrences po
      where po.grant_id = g.id
        and po.source_starts_on = source_starts_on
        and po.source_start_local = source_start_local
    ) then
      continue;
    end if;

    identity_local := to_char(source_start_local, 'HH24:MI:SS');

    insert into public.pulse_occurrences (
      user_id,
      grant_id,
      source_kind,
      source_id,
      source_starts_on,
      source_start_local,
      threshold_at,
      source_start_at,
      established_at
    )
    values (
      g.user_id,
      g.id,
      g.source_kind,
      source_id,
      source_starts_on,
      source_start_local,
      threshold_at,
      source_start_at,
      v_now
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
          'source_starts_on', source_starts_on,
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
  'Hosted relative-start Pulse establishment for authorized Commitment-start and Block-start grants. Due when now >= derived threshold under an active relative grant and current timed source identity. Corresponds to domain/pulse.ts startPulseIsDueForEstablishment. No delivery.';
