# CROSS-CLIENT-COHERENCE-001

PHYSICALLY ACCEPTED.

Baseline: `a21864a2fe61894cffe876386cd75113f1e751a0` on `main`.

Discovery: [CROSS-CLIENT-COHERENCE-DISCOVERY-001.md](CROSS-CLIENT-COHERENCE-DISCOVERY-001.md).

Readiness: [CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001.md](CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001.md).

Publication: [CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md](CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md).

## What was observed

A Block deleted on the phone left the already-open desktop showing that Block until the desktop read canonical truth again. The database was shared. The gap was propagation.

## What this does

An active Orient client converges on canonical temporal truth changed by another active client without a manual refresh.

Realtime is not canonical truth. A notice means only that canonical truth may have changed. `OrientInstrument` owns the lifecycle. `request` on `createCanonicalReload` increments the existing `reloadToken`. The existing loader effect reads again. `OrientView` projects those rows. There is no second store.

`persist` is unchanged. A successful local write still increments the token immediately.

## Publication

The human applied `supabase/migrations/20261006235000_class_a_realtime_publication.sql` on the canonical project. This tranche does not apply it again and does not alter it.

`supabase_realtime` contains exactly:

- `public.active_threads`
- `public.pulse_interrupt_grants` (Pulse reread awareness; not Class-A temporal territory)
- `public.pulse_occurrences` (Pulse reread awareness; payloads are never authority)
- `public.blocks`
- `public.commitments`
- `public.protected_time`
- `public.tasks`
- `public.work_schedule_days`

All six remain `REPLICA IDENTITY DEFAULT`.

## Channel

One channel, `orient-canonical`, on the existing browser client.

| Table | Events | Filter |
| --- | --- | --- |
| `protected_time`, `blocks`, `commitments` | INSERT, UPDATE | `user_id` equals the signed-in user |
| `protected_time`, `blocks`, `commitments` | DELETE | none. The primary key is `id`, so a `user_id` filter would miss the user's own delete |
| `work_schedule_days`, `active_threads` | INSERT, UPDATE, DELETE | `user_id` equals the signed-in user. That column is in the primary key |
| `tasks` | INSERT, UPDATE | `user_id` equals the signed-in user. No DELETE binding |

Notes, contexts, destinations, priorities, both priority-service tables, and temporal settings are not subscribed.

The callback does not read the payload. A user id that is not a uuid does not open the channel, so INSERT and UPDATE are not left unfiltered.

## Coalesce, recovery, cleanup

Notices share a 100 millisecond trailing delay. The first notice arms it. Further notices in that window do not add reads. One token increment follows the burst. This is not a poll.

The writer's own notice is not identified and is not suppressed. A second reread is acceptable. The delay may fold it into the write's own reload when they land together. `persist` does not wait for the delay.

The visibility listener does not read on attach. A transition to visible requests one coalesced reread. Hidden does not.

The first `SUBSCRIBED` does not reread. `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED` after that join does not clear the reading. The next `SUBSCRIBED` requests one reread, because missed Postgres changes are not replayed.

Unmount removes the listener, cancels a pending delay, and removes the channel. A late callback does not increment the token.

## Viewpoint and inspection

The notice does not call `onAnchor` and does not change the question. A fact that leaves the current models disappears from that reading. The viewpoint stays.

If the reread no longer contains an inspected fact, the existing `FactDetail` effect closes that inspection. This tranche does not add a second closer.

## Security

RLS on the loaders is unchanged. INSERT and UPDATE notices are filtered by the signed-in user. Unfiltered DELETE can still deliver another user's primary key on the socket. The callback does not read, log, or store it. The reread is still `user_id = auth.uid()`.

## Tests

`components/orient/canonicalCoherence.test.tsx` covers the notice, the burst, cleanup of a pending delay, a payload that is not forwarded, the six bindings, the first subscribe, an unhealthy channel, visibility, a deleted fact, a moved fact, and the unchanged question and anchor. The suite does not open the hosted project.

## Acceptance

Physically accepted on a laptop and a Samsung phone, both active Orient clients.

A Block established on the laptop appeared on the phone. Deleting it on the phone removed it from the laptop essentially at once. No refresh, navigation, or other intervention was required. The earlier failure, an already-open desktop staying stale after a phone delete, is closed.

The laptop stayed on a Day that contained an established Block. The phone moved that Block to another civil date. The laptop converged essentially at once. The Block left the Day the laptop was viewing. The laptop stayed on that Day. Orient did not chase the fact.

Desktop and phone are two expressions of the same instrument. They do not keep competing truth. A canonical change on one active surface becomes visible on the other without a manual synchronization. Each surface keeps the viewpoint the human selected. Truth convergence does not move the viewpoint.

The accepted path is a Class-A change, a Realtime awareness signal, a coalesced invalidation, the existing `reloadToken`, an authenticated canonical reread, and the existing projection. Realtime does not establish domain truth. It means only that canonical truth may have changed. Propagate awareness; re-read authority.
