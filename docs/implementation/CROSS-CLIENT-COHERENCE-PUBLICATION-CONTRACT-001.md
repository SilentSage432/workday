# CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001

Contract only. The migration file is not applied. The hosted project is unchanged. No application subscription is added. Replica identity stays `DEFAULT`.

Baseline: `a21864a2fe61894cffe876386cd75113f1e751a0` on `main`.

Discovery: [CROSS-CLIENT-COHERENCE-DISCOVERY-001.md](CROSS-CLIENT-COHERENCE-DISCOVERY-001.md).

Readiness: [CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001.md](CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001.md).

Labels: **hosted evidence**, **repository**, **Supabase behavior**, **contract**, **unknown**.

## Hosted evidence

The human ran this on the canonical hosted Orient project:

```sql
select pubname, schemaname, tablename
from pg_publication_tables
where schemaname = 'public'
order by pubname, tablename;
```

Success. No rows.

No public table is a member of any PostgreSQL publication. The six Class-A tables are not published. An application `postgres_changes` subscription must not be written as if publication were already ready.

The human also inspected replica identity. Every listed public table is `default`, including:

- `active_threads`
- `blocks`
- `commitments`
- `protected_time`
- `tasks`
- `work_schedule_days`

`block_priority_service`, `task_priority_service`, and the other public tables in that result are `default` as well. This contract does not publish them.

## Publication object

**Supabase behavior.** The Postgres Changes guide names `supabase_realtime` as the publication Postgres Changes reads. Tables are added with `alter publication supabase_realtime add table ...`.

**Repository.** `supabase/config.toml` enables the local Realtime process and does not name a publication. No existing migration creates or alters one. CLI link metadata names the hosted project and does not contain publication SQL.

**Hosted evidence.** Before application, `pg_publication_tables` for `schemaname = 'public'` returned no rows. The six Class-A tables were not members yet.

The human then read `pg_publication`. The hosted row is:

- `pubname` = `supabase_realtime`
- `puballtables` = false
- `pubinsert` = true
- `pubupdate` = true
- `pubdelete` = true
- `pubtruncate` = true

**Contract.** The publication-object prerequisite is satisfied. `supabase_realtime` exists, and it does not publish every table. Insert, update, and delete are enabled on that publication. This migration does not change those flags.

**Hosted evidence, after application.** The human applied `20261006235000_class_a_realtime_publication.sql` on the canonical project. That file remains the durable repository record of the change. Verification shows `supabase_realtime` contains exactly `active_threads`, `blocks`, `commitments`, `protected_time`, `tasks`, and `work_schedule_days`. All six remain replica identity `default`. [CROSS-CLIENT-COHERENCE-001.md](CROSS-CLIENT-COHERENCE-001.md) is physically accepted.

## Six-table contract

**Contract.** The end state is `supabase_realtime` containing exactly these public tables, and no others added by this change:

- `public.protected_time`
- `public.blocks`
- `public.commitments`
- `public.work_schedule_days`
- `public.tasks`
- `public.active_threads`

Do not publish `public` as a schema. Do not publish contexts, destinations, priorities, notes, temporal settings, or the priority-service tables.

**Repository.** `block_priority_service` and `task_priority_service` can change an inspection line, and production `/` does not write them. Leaving them unpublished does not hide a change an Orient client can make today. They stay outside this boundary.

## Database artifact

**Repository.** Durable database change in this project is a file under `supabase/migrations/`. Existing migrations are forward-only. They are not replayed by the migration history table. This change follows that convention and is also safe to apply once if a dashboard has already published some of the six: a table already in `supabase_realtime` is skipped. A missing publication raises, and the transaction rolls back. A missing table raises, and the transaction rolls back. No table is left published by a failed run.

The file is `supabase/migrations/20261006235000_class_a_realtime_publication.sql`.

It does not create `supabase_realtime`. It does not set replica identity. It adds only a Class-A table that is not already a member.

**Contract.** The human has applied this file on the canonical project. Hosted verification passed. Do not apply it again from here.

Privilege failure is a failed migration. The publication owner must run it. This file does not transfer ownership and does not change publication-wide insert, update, or delete flags.

## Replica identity

**Contract.** Leave `REPLICA IDENTITY DEFAULT` on all six tables.

**Supabase behavior.** `DEFAULT` puts the primary key in the old image. `FULL` is what puts the previous column values on UPDATE and DELETE, and it is what makes a DELETE filter on a non-key column work. This architecture discards the payload. A notice is only “this table changed.” `FULL` is not required for that notice to arrive. It is not adopted here.

Primary keys, from the migrations:

- `protected_time`, `blocks`, `commitments`, `tasks`: `id`
- `work_schedule_days`: `(user_id, work_on)`
- `active_threads`: `user_id`

## DELETE filtering

**Contract.** For `protected_time`, `blocks`, `commitments`, and `tasks`, a DELETE subscription must not use a `user_id` filter while replica identity stays `DEFAULT`. The old image does not contain `user_id`, so that filter cannot see the user’s own delete.

The application still does not subscribe to `tasks` DELETE. Production does not delete tasks. Insert and update on `tasks` remain filtered by `user_id`.

For `work_schedule_days` and `active_threads`, `user_id` is in the primary key, so it is in the default old image. DELETE on those two tables is filtered by the signed-in `user_id`.

The callback does not read payload fields. The authenticated loaders decide what remains.

## Security

**Contract.** Realtime is not a domain-data transport. Its authority is “canonical truth may have changed.” Existing RLS on the reread remains the security boundary. RLS is not weakened.

INSERT and UPDATE bindings use `user_id=eq.<signed-in user id>`. One provisioned user does not remove that filter.

An unfiltered DELETE on the `id` tables can deliver another user’s delete event to the browser. Under `DEFAULT`, that old image is the primary key, not the rest of the row. If the callback does not read, render, log, or store the payload, Orient’s domain state does not gain that key or that row. The disclosure that remains is on the socket: a delete happened, and its primary key was in the frame. That is narrower than a row body, and it is still a disclosure. Single-user operation makes it unlikely. It is not the control that prevents it.

`FULL` would let a `user_id` filter drop other users’ deletes, and it would also put full old rows on the wire whenever a filter did not. This tranche does not take that trade. The application contract forbids using the payload. The reread stays inside `user_id = auth.uid()`.

## Rollback

Not executed. Rollback removes only these six tables from `supabase_realtime` and skips one that is not a member. It does not drop the publication and does not remove any other member.

```sql
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
    raise exception 'supabase_realtime is not present.';
  end if;

  foreach target in array class_a
  loop
    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime drop table public.%I',
        target
      );
    end if;
  end loop;
end $$;
```

## Verification after application

Do not treat the dashboard as acceptance. Both queries only read.

Membership. The result must be these six rows and no other public table under `supabase_realtime`:

```sql
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
```

Expected `tablename` values: `active_threads`, `blocks`, `commitments`, `protected_time`, `tasks`, `work_schedule_days`.

Identity. All six must still be `default`:

```sql
select c.relname as table_name,
       case c.relreplident
         when 'd' then 'default'
         when 'n' then 'nothing'
         when 'f' then 'full'
         when 'i' then 'index'
       end as replica_identity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'protected_time',
    'blocks',
    'commitments',
    'work_schedule_days',
    'tasks',
    'active_threads'
  )
order by c.relname;
```

## Application tranche, not this one

After that verification, and not before, the application tranche is:

`OrientInstrument` owns one channel. A Class-A `postgres_changes` notice calls a coalesced `requestCanonicalReload()`, which increments `reloadToken`. The existing loaders run. `OrientView` projects. A hidden-to-visible transition requests one reread. A channel that becomes `SUBSCRIBED` again after `CHANNEL_ERROR`, timeout, or close requests one reread. The first subscribe after mount does not.

No payload enters domain state. No second store. No polling. Anchor and question stay.

## Remaining gate

1. The `pg_publication` query has been run. `supabase_realtime` exists, `puballtables` is false, and insert, update, and delete are enabled.
2. The human applied `20261006235000_class_a_realtime_publication.sql` on the canonical project.
3. Verification passed. Those six tables are the public members, and replica identity is still `default`.
4. The application tranche is [CROSS-CLIENT-COHERENCE-001.md](CROSS-CLIENT-COHERENCE-001.md). It is physically accepted.
