-- CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001
-- Not applied by the tranche that added this file.
-- Publishes exactly six Class-A tables for Postgres Changes.
-- Does not create the publication. Supabase owns that object.
-- Does not set replica identity. All six stay DEFAULT.
-- Does not publish any other table.

do $$
declare
  target text;
  class_a text[] := array[
    'protected_time',
    'blocks',
    'commitments',
    'work_schedule_days',
    'tasks',
    'active_threads'
  ];
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception
      'supabase_realtime is not present. This migration does not create it.';
  end if;

  foreach target in array class_a
  loop
    if to_regclass(format('public.%I', target)) is null then
      raise exception 'public.% is not present.', target;
    end if;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      continue;
    end if;

    execute format(
      'alter publication supabase_realtime add table public.%I',
      target
    );
  end loop;
end $$;
