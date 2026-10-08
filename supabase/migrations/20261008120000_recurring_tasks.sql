-- RECURRING-TASK-IMPLEMENTATION-001
-- Weekly Recurring Task definitions + occurrence provenance.
-- Occurrences materialize as ordinary tasks. No Task reset. No Work gate.

create table public.recurring_task_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  context_id uuid,
  cycle_kind text not null,
  available_weekday text not null,
  due_weekday text not null,
  established_at timestamptz not null,
  retired_at timestamptz,
  constraint recurring_task_definitions_title_not_blank check (
    char_length(btrim(title)) > 0
  ),
  constraint recurring_task_definitions_cycle_kind_known check (
    cycle_kind = 'lowes_fiscal_week'
  ),
  constraint recurring_task_definitions_available_weekday_known check (
    available_weekday in ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri')
  ),
  constraint recurring_task_definitions_due_weekday_known check (
    due_weekday in ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri')
  ),
  constraint recurring_task_definitions_retired_after_established check (
    retired_at is null or retired_at >= established_at
  ),
  constraint recurring_task_definitions_id_user_key unique (id, user_id),
  constraint recurring_task_definitions_context_same_owner
    foreign key (context_id, user_id)
    references public.contexts (id, user_id)
    match simple
    on delete set null (context_id)
);

comment on table public.recurring_task_definitions is
  'Human-established weekly recurring Task definition. Not itself a Task occurrence.';
comment on column public.recurring_task_definitions.cycle_kind is
  'V1 closed set: lowes_fiscal_week only.';
comment on column public.recurring_task_definitions.available_weekday is
  'Fiscal-week weekday when the occurrence may materialize. Not planned_on or due_on.';
comment on column public.recurring_task_definitions.due_weekday is
  'Fiscal-week weekday stamped onto Task.due_on at materialization.';

create index recurring_task_definitions_user_established_at_idx
  on public.recurring_task_definitions (user_id, established_at, id);

create table public.recurring_task_occurrences (
  user_id uuid not null references auth.users (id) on delete cascade,
  definition_id uuid not null,
  task_id uuid not null,
  cycle_kind text not null,
  cycle_key date not null,
  materialized_at timestamptz not null,
  primary key (user_id, definition_id, cycle_kind, cycle_key),
  constraint recurring_task_occurrences_cycle_kind_known check (
    cycle_kind = 'lowes_fiscal_week'
  ),
  constraint recurring_task_occurrences_task_id_key unique (task_id),
  constraint recurring_task_occurrences_definition_same_owner
    foreign key (definition_id, user_id)
    references public.recurring_task_definitions (id, user_id)
    match simple
    on delete no action,
  constraint recurring_task_occurrences_task_same_owner
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    match simple
    on delete no action
);

comment on table public.recurring_task_occurrences is
  'Provenance linking one ordinary Task to one recurring definition × Lowe''s fiscal week.';
comment on column public.recurring_task_occurrences.cycle_key is
  'Saturday civil date that begins the Lowe''s fiscal week.';

create index recurring_task_occurrences_user_definition_idx
  on public.recurring_task_occurrences (user_id, definition_id);

alter table public.recurring_task_definitions enable row level security;
alter table public.recurring_task_occurrences enable row level security;

revoke all on table public.recurring_task_definitions from public;
revoke all on table public.recurring_task_definitions from anon;
revoke all on table public.recurring_task_definitions from authenticated;

revoke all on table public.recurring_task_occurrences from public;
revoke all on table public.recurring_task_occurrences from anon;
revoke all on table public.recurring_task_occurrences from authenticated;

grant select, insert, update on table public.recurring_task_definitions to authenticated;
grant select, insert on table public.recurring_task_occurrences to authenticated;

create policy recurring_task_definitions_select_own
  on public.recurring_task_definitions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy recurring_task_definitions_insert_own
  on public.recurring_task_definitions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy recurring_task_definitions_update_own
  on public.recurring_task_definitions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy recurring_task_occurrences_select_own
  on public.recurring_task_occurrences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy recurring_task_occurrences_insert_own
  on public.recurring_task_occurrences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Atomic ensure: one Task + one provenance row per definition × week.
-- Unique violation on provenance rolls back the losing Task insert (subtransaction).
-- Establishment cutoff is civil in p_time_zone, not UTC midnight of week_end.
drop function if exists public.ensure_recurring_task_occurrence(uuid, date, date);

create or replace function public.ensure_recurring_task_occurrence(
  p_definition_id uuid,
  p_cycle_key date,
  p_civil_now date,
  p_time_zone text
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  def public.recurring_task_definitions%rowtype;
  available_on date;
  due_on_date date;
  existing_task_id uuid;
  new_task_id uuid;
  available_offset integer;
  due_offset integer;
  week_end date;
  established_civil date;
  result_row public.tasks%rowtype;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_definition_id is null or p_cycle_key is null or p_civil_now is null then
    raise exception 'Definition, cycle key, and civil now are required.';
  end if;

  if p_time_zone is null or btrim(p_time_zone) = '' then
    raise exception 'A time zone is required.';
  end if;

  -- Reject unknown IANA zones before civil conversion.
  begin
    perform timezone(btrim(p_time_zone), now());
  exception
    when invalid_parameter_value then
      raise exception 'A time zone is required.';
  end;

  -- PostgreSQL DOW: 0 = Sunday … 6 = Saturday. Cycle key must be Saturday.
  if extract(dow from p_cycle_key)::integer <> 6 then
    raise exception 'cycle_key must be a Saturday civil date.';
  end if;

  select * into def
  from public.recurring_task_definitions
  where id = p_definition_id
    and user_id = uid;

  if not found then
    raise exception 'Recurring Task definition not found.';
  end if;

  if def.cycle_kind <> 'lowes_fiscal_week' then
    raise exception 'Unsupported recurring cycle kind.';
  end if;

  available_offset := case def.available_weekday
    when 'sat' then 0
    when 'sun' then 1
    when 'mon' then 2
    when 'tue' then 3
    when 'wed' then 4
    when 'thu' then 5
    when 'fri' then 6
    else null
  end;
  due_offset := case def.due_weekday
    when 'sat' then 0
    when 'sun' then 1
    when 'mon' then 2
    when 'tue' then 3
    when 'wed' then 4
    when 'thu' then 5
    when 'fri' then 6
    else null
  end;

  if available_offset is null or due_offset is null then
    raise exception 'Unknown weekday on recurring definition.';
  end if;

  available_on := p_cycle_key + available_offset;
  due_on_date := p_cycle_key + due_offset;
  week_end := p_cycle_key + 7;

  select occ.task_id into existing_task_id
  from public.recurring_task_occurrences as occ
  where occ.user_id = uid
    and occ.definition_id = p_definition_id
    and occ.cycle_kind = 'lowes_fiscal_week'
    and occ.cycle_key = p_cycle_key;

  if existing_task_id is not null then
    select * into result_row from public.tasks where id = existing_task_id and user_id = uid;
    if not found then
      raise exception 'Occurrence Task is missing.';
    end if;
    return result_row;
  end if;

  if def.retired_at is not null then
    raise exception 'Recurring Task definition is retired.';
  end if;

  if p_civil_now < available_on then
    raise exception 'Recurring Task is not yet available this week.';
  end if;

  -- Civil cutoff in Orient timezone: established local civil date >= next Saturday.
  established_civil := (def.established_at at time zone btrim(p_time_zone))::date;
  if established_civil >= week_end then
    raise exception 'Recurring Task was established after this fiscal week ended.';
  end if;

  new_task_id := gen_random_uuid();

  begin
    insert into public.tasks (
      id,
      user_id,
      title,
      context_id,
      due_on,
      planned_on,
      planned_local,
      must_do,
      origin
    ) values (
      new_task_id,
      uid,
      def.title,
      def.context_id,
      due_on_date,
      null,
      null,
      false,
      'user_created'
    );

    insert into public.recurring_task_occurrences (
      user_id,
      definition_id,
      task_id,
      cycle_kind,
      cycle_key,
      materialized_at
    ) values (
      uid,
      p_definition_id,
      new_task_id,
      'lowes_fiscal_week',
      p_cycle_key,
      now()
    );
  exception
    when unique_violation then
      select occ.task_id into existing_task_id
      from public.recurring_task_occurrences as occ
      where occ.user_id = uid
        and occ.definition_id = p_definition_id
        and occ.cycle_kind = 'lowes_fiscal_week'
        and occ.cycle_key = p_cycle_key;
      if existing_task_id is null then
        raise;
      end if;
      select * into result_row from public.tasks where id = existing_task_id and user_id = uid;
      if not found then
        raise exception 'Occurrence Task is missing after race.';
      end if;
      return result_row;
  end;

  select * into result_row from public.tasks where id = new_task_id and user_id = uid;
  if not found then
    raise exception 'Materialized Task is missing.';
  end if;
  return result_row;
end;
$$;

revoke all on function public.ensure_recurring_task_occurrence(uuid, date, date, text) from public;
revoke all on function public.ensure_recurring_task_occurrence(uuid, date, date, text) from anon;
grant execute on function public.ensure_recurring_task_occurrence(uuid, date, date, text) to authenticated;

comment on function public.ensure_recurring_task_occurrence(uuid, date, date, text) is
  'Idempotently materializes one ordinary Task for a recurring definition × Lowe''s fiscal week. Establishment eligibility is civil in p_time_zone.';
