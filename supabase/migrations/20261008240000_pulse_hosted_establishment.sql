-- ORIENT-PULSE-HOSTED-ESTABLISHMENT-001
-- Sovereign hosted establishment of authorized Commitment-start Pulse occurrences.
-- No client required. No delivery. No grant creation. No Commitment mutation.
--
-- Semantic correspondence: domain/pulse.ts
--   evaluateCommitmentStartPulseCondition + commitmentStartPulseIsDueForEstablishment
-- Establishment is due when now >= threshold under an active grant and current timed
-- Commitment identity. The half-open [threshold, start) window remains the expression
-- distinction (eligible vs elapsed); hosted establishment must not permanently miss
-- when no client is alive inside that window.
--
-- Threshold: source_start_at - lead_offset_seconds.
-- source_start_at: (starts_on + start_local) AT TIME ZONE confirmed temporal_settings.time_zone
--   Corresponds to instantFromZonedLocal for unambiguous civil local times.
-- Relative grant: no absolute fire_at stored. Moving Commitment start moves threshold.
-- Uniqueness: pulse_occurrences (grant_id, source_starts_on, source_start_local).
--
-- Privilege: SECURITY DEFINER evaluator callable only by the database cron role path.
-- Authenticated clients retain existing SELECT/INSERT on occurrences; they cannot invoke
-- this privileged bulk establishment function.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table public.pulse_hosted_evaluator_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null,
  examined_grant_count integer not null default 0,
  established_count integer not null default 0,
  established_identities jsonb not null default '[]'::jsonb,
  error_text text,
  constraint pulse_hosted_evaluator_runs_status_known check (
    status in ('running', 'succeeded', 'failed')
  ),
  constraint pulse_hosted_evaluator_runs_counts_nonnegative check (
    examined_grant_count >= 0
    and established_count >= 0
  )
);

comment on table public.pulse_hosted_evaluator_runs is
  'Minimal hosted Pulse evaluator evidence: when a run happened, whether it succeeded, and which identities it established. Not an analytics product.';
comment on column public.pulse_hosted_evaluator_runs.established_identities is
  'JSON array of {grant_id, source_id, source_starts_on, source_start_local, threshold_at} for rows inserted this run.';

create index pulse_hosted_evaluator_runs_started_at_idx
  on public.pulse_hosted_evaluator_runs (started_at desc);

alter table public.pulse_hosted_evaluator_runs enable row level security;

revoke all on table public.pulse_hosted_evaluator_runs from public;
revoke all on table public.pulse_hosted_evaluator_runs from anon;
revoke all on table public.pulse_hosted_evaluator_runs from authenticated;

-- Inspectable from the SQL console / service role only. Not a client surface.
grant select on table public.pulse_hosted_evaluator_runs to service_role;

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
  zone text;
  source_start_at timestamptz;
  threshold_at timestamptz;
  inserted_id uuid;
  examined integer := 0;
  established integer := 0;
  identities jsonb := '[]'::jsonb;
  identity_local text;
begin
  for g in
    select
      ig.id,
      ig.user_id,
      ig.source_id,
      ig.lead_offset_seconds
    from public.pulse_interrupt_grants ig
    where ig.revoked_at is null
      and ig.source_kind = 'commitment'
      and ig.transition_kind = 'start'
      and ig.lead_offset_seconds > 0
    order by ig.established_at asc, ig.id asc
  loop
    examined := examined + 1;

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

    -- Missing / wrong-owner / deleted source: inactive. Cascade already removes grants on delete.
    if not found then
      continue;
    end if;

    -- All-day or non-timed: inactive. Do not invent a clock threshold.
    if c.kind <> 'timed' or c.start_local is null or c.starts_on is null then
      continue;
    end if;

    select nullif(btrim(ts.time_zone), '')
    into zone
    from public.temporal_settings ts
    where ts.user_id = g.user_id;

    -- Missing timezone: withhold rather than guess.
    if zone is null then
      continue;
    end if;

    begin
      perform timezone(zone, v_now);
    exception
      when invalid_parameter_value then
        -- Bad timezone: withhold.
        continue;
      when others then
        continue;
    end;

    begin
      -- Local civil+clock in the confirmed zone → absolute instant.
      -- Corresponds to domain instantFromZonedLocal for unambiguous wall times.
      source_start_at := ((c.starts_on::timestamp + c.start_local) at time zone zone);
    exception
      when others then
        continue;
    end;

    if source_start_at is null then
      continue;
    end if;

    threshold_at := source_start_at - make_interval(secs => g.lead_offset_seconds);

    -- Not yet due.
    if v_now < threshold_at then
      continue;
    end if;

    -- Already established for this grant + current source temporal identity.
    if exists (
      select 1
      from public.pulse_occurrences po
      where po.grant_id = g.id
        and po.source_starts_on = c.starts_on
        and po.source_start_local = c.start_local
    ) then
      continue;
    end if;

    identity_local := to_char(c.start_local, 'HH24:MI:SS');

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
      'commitment',
      c.id,
      c.starts_on,
      c.start_local,
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
          'source_id', c.id,
          'source_starts_on', c.starts_on,
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
  'Hosted Commitment-start Pulse establishment. Due when now >= derived threshold under an active relative grant and current timed Commitment identity. Corresponds to domain/pulse.ts commitmentStartPulseIsDueForEstablishment. No delivery.';

revoke all on function public.establish_due_commitment_start_pulse_occurrences(timestamptz)
  from public, anon, authenticated;

-- Cron executes as the database superuser / postgres role. No client execute path.
grant execute on function public.establish_due_commitment_start_pulse_occurrences(timestamptz)
  to postgres;

create or replace function public.run_pulse_hosted_establishment(
  p_now timestamptz default timezone('utc', now())
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  started timestamptz := timezone('utc', now());
  result jsonb;
begin
  insert into public.pulse_hosted_evaluator_runs (started_at, status)
  values (started, 'running')
  returning id into run_id;

  begin
    result := public.establish_due_commitment_start_pulse_occurrences(p_now);

    update public.pulse_hosted_evaluator_runs
    set
      finished_at = timezone('utc', now()),
      status = 'succeeded',
      examined_grant_count = coalesce((result ->> 'examined_grant_count')::integer, 0),
      established_count = coalesce((result ->> 'established_count')::integer, 0),
      established_identities = coalesce(result -> 'established_identities', '[]'::jsonb)
    where id = run_id;
  exception
    when others then
      update public.pulse_hosted_evaluator_runs
      set
        finished_at = timezone('utc', now()),
        status = 'failed',
        error_text = left(sqlerrm, 1000)
      where id = run_id;
      raise;
  end;

  return run_id;
end;
$$;

comment on function public.run_pulse_hosted_establishment(timestamptz) is
  'Cron entrypoint for hosted Pulse establishment. Records one pulse_hosted_evaluator_runs row per invocation.';

revoke all on function public.run_pulse_hosted_establishment(timestamptz)
  from public, anon, authenticated;

grant execute on function public.run_pulse_hosted_establishment(timestamptz)
  to postgres;

-- Idempotent job registration. Every minute is sufficient once establishment is due
-- for now >= threshold (including after source start). Cadence does not redefine Pulse.
do $$
declare
  existing_jobid bigint;
begin
  select j.jobid into existing_jobid
  from cron.job j
  where j.jobname = 'orient-pulse-hosted-establishment'
  limit 1;

  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;

  perform cron.schedule(
    'orient-pulse-hosted-establishment',
    '* * * * *',
    $cron$select public.run_pulse_hosted_establishment();$cron$
  );
end;
$$;
