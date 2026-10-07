# CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001

Readiness only. No subscription, no listener, no migration, and no configuration change.

Baseline: `a21864a2fe61894cffe876386cd75113f1e751a0` on `main`.

Discovery: [CROSS-CLIENT-COHERENCE-DISCOVERY-001.md](CROSS-CLIENT-COHERENCE-DISCOVERY-001.md).

Labels: **repository**, **hosted evidence**, **Supabase behavior**, **inference**, **recommendation**, **unknown**.

The publication gate is satisfied. The human applied the six-table migration, and hosted verification shows those tables in `supabase_realtime` with replica identity `default`. [CROSS-CLIENT-COHERENCE-001.md](CROSS-CLIENT-COHERENCE-001.md) is physically accepted.

## Accepted boundary

**Repository.** A successful production write calls `setReloadToken`. The existing loaders run. `OrientView` projects those rows. Another mounted client stays stale because nothing external increments its token.

**Recommendation.** A notice may only request that same reload. The notice payload is not domain truth.

## Class A tables

These are the physical tables whose production `/` mutations can change an already-mounted reading. Event types are the ones production semantics actually perform.

| Table | Events | Why these events |
| --- | --- | --- |
| `public.protected_time` | INSERT, UPDATE, DELETE | create, update, delete |
| `public.blocks` | INSERT, UPDATE, DELETE | create, update, including civil-date correction, delete |
| `public.commitments` | INSERT, UPDATE, DELETE | create, update, delete |
| `public.work_schedule_days` | INSERT, UPDATE, DELETE | `save_work_week` inserts, updates on `(user_id, work_on)`, and deletes a day set back to unknown |
| `public.tasks` | INSERT, UPDATE | capture creates a task; edit, MustDo, and completion update it. MustDo is `tasks.must_do`, not a table. RLS grants DELETE. **Repository:** no application function deletes a task |
| `public.active_threads` | INSERT, UPDATE, DELETE | establish upserts the one row; leave deletes it; completing the cited task deletes it in that same transaction |

### Not in the immediate set

**Repository.** `block_priority_service` and `task_priority_service` are loaded, and a change to either would change a priority line on an open inspection without changing the Block or Task row. No production component writes them. They stay Class B. This tranche does not subscribe to them because they exist.

`contexts`, `destinations`, `priorities`, `notes`, and `temporal_settings` stay out. `temporal_settings` is also outside the reload effect, so a token increment would not refresh the time zone.

A Block that still has a priority-service row cannot be deleted (`ON DELETE NO ACTION`). A successful Block delete does not depend on a separate service-table notice.

## Hosted publication

**Hosted evidence.** The human ran the publication query below on the canonical hosted project. It succeeded and returned no rows. No public table is a member of any publication. The six Class-A tables are not published. Postgres Changes must not be implemented as if they were.

The same inspection found replica identity `default` on every public table the project listed, including the six Class-A tables.

The earlier local attempt to read this catalog returned HTTP 403 and did not establish that result. The human query did.

**Repository.** `supabase/migrations/20261006235000_class_a_realtime_publication.sql` is the durable record of the six-table publication. Local `[realtime] enabled = true` only starts the local Realtime process.

**Hosted evidence.** `pg_publication` returned `supabase_realtime` with `puballtables` false, and with insert, update, delete, and truncate enabled. The human then applied that migration. Verification shows the six Class-A tables are members, still at replica identity `default`.

Run this in the canonical project's SQL editor. It only reads.

```sql
select pubname, schemaname, tablename
from pg_publication_tables
where schemaname = 'public'
order by pubname, tablename;
```

That query was the pre-application reading: no public members. The human later applied the publication migration, and verification showed the six Class-A tables. See the publication contract.

## Replica identity

**Repository.** No migration sets `replica identity`. The committed default is `DEFAULT`: the replication row's old image is the primary key.

Primary keys:

- `protected_time`, `blocks`, `commitments`, `tasks`: `id`
- `work_schedule_days`: `(user_id, work_on)`
- `active_threads`: `user_id`

**Supabase behavior**, from the current Postgres Changes guide:

- `REPLICA IDENTITY FULL` is how a subscriber receives the previous column values on UPDATE and DELETE.
- A DELETE filter works only when replica identity is `FULL`.
- RLS is not applied to DELETE events, because Postgres cannot re-check a row that is already gone.

**Inference.** Orient does not need old or new column values. The callback discards the payload. `FULL` is not required to notice that a table changed, and it is not required for a DELETE event to be delivered.

`FULL` is required only to filter DELETE by `user_id` on the tables whose primary key is `id`. On `work_schedule_days` and `active_threads`, the primary key already contains `user_id`, so a DELETE filter on `user_id` can be evaluated under `DEFAULT`.

**Hosted evidence.** The human ran the replica-identity query. Every listed public table, including the six Class-A tables, is `default`. Do not change identity.

```sql
select n.nspname as schema,
       c.relname as table_name,
       case c.relreplident
         when 'd' then 'default'
         when 'n' then 'nothing'
         when 'f' then 'full'
         when 'i' then 'index'
       end as replica_identity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

## Auth, RLS, and filters

**Repository.** Every Class A table has RLS. Select, insert, update, and delete policies require `user_id = auth.uid()`, except where a table has no delete writer. The browser client is one reused client with the persisted session. The canonical reread still goes through those policies.

**Supabase behavior.**

- The installed client evaluates a `postgres_changes` filter on the server. A filtered-out event is not delivered. DELETE filters are the exception above: they require `FULL`.
- The guide says Postgres Changes authorizes each event against the subscriber, and that RLS is not applied to DELETE.
- `private: true` on a channel, in the installed README, decides whether RLS allows the client to join that channel. It is not a substitute for the table policies, and this contract does not use broadcast or presence.

**Recommendation.** Do not subscribe to INSERT or UPDATE without `filter: user_id=eq.<signed-in user id>`. A table-level binding without that filter can deliver another user's insert or update payload even though a later reread would hide it. One provisioned user reduces how often that happens. It does not change the ownership rule.

For DELETE on `protected_time`, `blocks`, `commitments`, and `tasks`: a `user_id` filter does not work until replica identity is `FULL`. Subscribing to DELETE with that filter, while identity is `DEFAULT`, would miss the user's own deletes. Those deletes are the observed gap. The binding for those four tables is therefore DELETE with no filter, and the callback must not read `payload.old` or `payload.new`.

That unfiltered DELETE can arrive for another user's row. The documented reason is that RLS is not applied to DELETE. The payload under `DEFAULT` identity is the primary key. Discarding it keeps it out of domain state. The following reread is still limited by RLS. Single-user operation reduces the practical chance of a foreign delete. It does not make the unfiltered event safe to inspect, log, or store.

`work_schedule_days` and `active_threads` can filter DELETE by `user_id` under the default identity, because that column is in the primary key.

Do not weaken RLS. Do not set replica identity in the implementation tranche unless a later decision explicitly adds `FULL` so every DELETE can be filtered. That would be a migration, and it is not required for the reread itself.

## Subscription shape

**Recommendation**, contingent on publication:

One channel, owned by `OrientInstrument`, with one `postgres_changes` binding per Class A table. Not one channel per table. Not a schema-wide listen: that would include Class B tables.

Each callback calls `requestCanonicalReload()` and nothing else.

Bindings:

- `protected_time`, `blocks`, `commitments`: INSERT and UPDATE with `user_id=eq.<id>`; DELETE with no filter
- `tasks`: INSERT and UPDATE with `user_id=eq.<id>`; no DELETE binding
- `work_schedule_days`, `active_threads`: INSERT, UPDATE, and DELETE, each with `user_id=eq.<id>`

The user id comes from the signed-in session at subscribe time. If it is missing, do not open an unfiltered INSERT or UPDATE binding.

### Coalesce

**Repository.** Completing a task updates `tasks` and deletes `active_threads` in one transaction. `save_work_week` can change several days in one transaction. The load effect already drops a superseded in-flight read, but separate arrivals still become separate reads after each one finishes.

**Recommendation.** A trailing coalesce, armed only by a notice or a recovery request. About 100 milliseconds. One `setReloadToken` when it fires. Cleared on unmount. This is not a polling interval and it does not read on its own.

## Visibility recovery

**Recommendation.** Visibility is the recovery net, not the primary path. The observed desktop was already visible, so a visibility change would not have repaired that moment. Realtime is what shortens that latency. A reread is what makes the reading true.

Expected behavior:

- A transition to `document.visibilityState === "visible"` calls `requestCanonicalReload()`.
- Attaching the listener does not read. The mount effect already performs the initial read.
- Repeating the transition is safe. Coalesce covers a burst. Anchor and question stay.
- No interval.

## Reconnect and missed events

**Supabase behavior.** The installed client reports `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, and `CLOSED`. The Postgres Changes guide describes authorization and filters. It does not describe replay of missed WAL events to a subscriber. Broadcast replay is a different feature and is not this contract.

**Recommendation.** Do not rely on every mutation arriving.

Realtime shortens convergence. The canonical reread establishes truth.

Visibility covers sleep, backgrounding, and a return to the tab. It does not cover one dropped event while the document stays visible and the channel still says `SUBSCRIBED`.

The extra recovery boundary is the channel itself, not a timer. A `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED` leaves the current reading untouched. The next `SUBSCRIBED` after one of those statuses calls `requestCanonicalReload()` once. The first `SUBSCRIBED` after mount does not, because the mount effect is already reading.

No polling.

## Implementation contract

Contingent on the publication query showing every Class A table. Until then, do not implement.

- `OrientInstrument` owns the channel and the visibility listener. `OrientView` does not subscribe.
- Tables and bindings are the set above.
- INSERT and UPDATE are filtered by the signed-in `user_id`. DELETE is filtered by `user_id` where the primary key includes it, and unfiltered where a filter would drop the user's own delete. The callback does not read the payload.
- `requestCanonicalReload()` coalesces into one `setReloadToken`.
- Visibility recovery is the hidden-to-visible transition only.
- Unsubscribe and remove the listener when `OrientInstrument` unmounts, including sign-out. Sign-in mounts a new instrument and a new channel.
- A token refresh keeps the same instrument. The existing client already refreshes the session. The channel must use that session. If the session is gone, tear the channel down.
- Subscribe failure, `CHANNEL_ERROR`, timeout, and close do not clear `truth`, do not change anchor, and do not change question.
- After a dropped channel, the following `SUBSCRIBED` requests one reload.
- No payload is written into domain state. No second store. No `onAnchor`. No question change. No polling. No replica-identity change. No publication change inside the app tranche.

## Tests for that tranche

1. A stand-in notice runs the canonical loaders again.
2. Anchor stays.
3. Question stays.
4. A burst of notices produces one reload.
5. The writer's own success still reloads, and a following notice does not move the viewpoint.
6. Hidden to visible requests one reload.
7. Attaching the listener on an already-visible document does not add a second initial load.
8. After the reread, a deleted fact is gone from the field.
9. An inspection closes when its fact is no longer in the models.
10. A fact moved off the current reading disappears there, and the viewpoint stays.
11. Unmount removes the channel and the listener.
12. A failed subscribe leaves the current reading in place.
13. `persist` still increments the token by itself.

Use a stand-in for the socket. Do not require the hosted project until publication is confirmed.

## Out of scope

Mobile analog time entry, drag and drop, civil-date behavior, Week and Month geometry, Present and Day geometry, and any Class B subscription.
