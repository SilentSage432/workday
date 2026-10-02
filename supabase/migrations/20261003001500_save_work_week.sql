-- One transaction for the visible Work week's changed days.
-- A missing row stays unknown. Off and scheduled stay the existing row shapes.
-- The function does not store shift position, cadence, or a second shift.

create or replace function public.save_work_week(week_start date, changes jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  work_on_value date;
  state_value text;
  start_value time;
  end_value time;
  shift_value text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if changes is null or jsonb_typeof(changes) <> 'array' then
    raise exception 'Work week changes must be a list';
  end if;

  if jsonb_array_length(changes) > 7 then
    raise exception 'A Work week has seven days';
  end if;

  for item in
    select value from jsonb_array_elements(changes)
  loop
    work_on_value := (item ->> 'work_on')::date;
    state_value := item ->> 'day_state';

    if work_on_value is null or work_on_value < week_start or work_on_value >= week_start + 7 then
      raise exception 'That date is outside this Work week';
    end if;

    if state_value = 'unknown' then
      delete from public.work_schedule_days
      where user_id = uid
        and work_on = work_on_value;
    elsif state_value = 'off' then
      insert into public.work_schedule_days (user_id, work_on, day_state, start_local, end_local, shift_type)
      values (uid, work_on_value, 'off', null, null, null)
      on conflict (user_id, work_on) do update
      set day_state = 'off',
          start_local = null,
          end_local = null,
          shift_type = null;
    elsif state_value = 'scheduled' then
      start_value := (item ->> 'start_local')::time;
      end_value := (item ->> 'end_local')::time;
      shift_value := item ->> 'shift_type';
      if start_value is null or end_value is null or shift_value is null then
        raise exception 'A scheduled day needs a start, an end, and a shift type';
      end if;
      insert into public.work_schedule_days (user_id, work_on, day_state, start_local, end_local, shift_type)
      values (uid, work_on_value, 'scheduled', start_value, end_value, shift_value)
      on conflict (user_id, work_on) do update
      set day_state = 'scheduled',
          start_local = excluded.start_local,
          end_local = excluded.end_local,
          shift_type = excluded.shift_type;
    else
      raise exception 'Unknown Work day state';
    end if;
  end loop;
end;
$$;

comment on function public.save_work_week(date, jsonb) is
  'Saves the changed days of one visible Work week in a single transaction for the signed-in user.';

revoke all on function public.save_work_week(date, jsonb) from public, anon;
grant execute on function public.save_work_week(date, jsonb) to authenticated;
