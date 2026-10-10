-- ORIENT-PULSE-AUTHORITY-004
-- Forward correction for hosted Pulse establishment PL/pgSQL name ambiguity.
--
-- Production failure (AUTHORITY-003 physical acceptance):
--   ERROR: column reference "source_starts_on" is ambiguous
--   in EXISTS: po.source_starts_on = source_starts_on
-- Failure occurs at function *execution* when a past-threshold grant reaches
-- the occurrence-identity EXISTS guard — not at CREATE FUNCTION.
--
-- Cause: PL/pgSQL variables source_starts_on / source_start_local shared names
-- with public.pulse_occurrences columns. Unqualified use inside SQL statements
-- that also expose those columns (EXISTS; ON CONFLICT target) is ambiguous.
--
-- Fix: rename only those colliding PL/pgSQL locals to v_source_starts_on /
-- v_source_start_local. Block-label qualification alone is insufficient because
-- ON CONFLICT (grant_id, source_starts_on, source_start_local) must name table
-- columns and cannot be block-qualified. Public schema / occurrence identity
-- unchanged. AUTHORITY-002 semantics unchanged. Cron entrypoint/cadence unchanged.
--
-- Historical 20261010093000 is intentionally left as applied production evidence.
-- Do not rewrite that migration as the deployable repair.

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
    v_source_starts_on := null;
    v_source_start_local := null;
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

    threshold_at := source_start_at - make_interval(secs => g.lead_offset_seconds);

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
      established_at
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
  'Hosted relative-start Pulse establishment for authorized Commitment-start and Block-start grants. Due when now >= derived threshold under an active relative grant and current timed source identity. Corresponds to domain/pulse.ts startPulseIsDueForEstablishment. No delivery. AUTHORITY-004: PL/pgSQL locals for source start fingerprint avoid column-name collision in EXISTS/ON CONFLICT.';
