# ORIENT-FLOOR-COMMAND-003 — Durable external observation storage

**Status:** LOCAL SCHEMA AND ADAPTER. No production migration, network connection, route, credential, push, or deploy.  
**Date:** 2026-10-24  
**Depends on:** [ORIENT-FLOOR-COMMAND-001-DISCOVERY.md](ORIENT-FLOOR-COMMAND-001-DISCOVERY.md), [ORIENT-FLOOR-COMMAND-002-PROJECTION.md](ORIENT-FLOOR-COMMAND-002-PROJECTION.md)  
**Producer contract:** `carpet-auditor/docs/product/DEPTSYNC_FLOOR_COMMAND_ORIENT_001_CONTRACT.md`, unchanged.

Live connection remains **NO-GO**. This tranche stores the observation the projection already knows how to read. It does not fetch Floor Command.

---

## 1. Existing persistence

Orient's database is the Supabase project behind the app. Schema changes are ordered SQL files in `supabase/migrations/`. This file is `20261024210000_floor_command_observation.sql`. It was not applied to production.

Google Calendar does not use a second storage framework. A connected calendar is an `external_temporal_sources` row. Facts are timed or all-day intervals in `external_temporal_facts`. The server writes them through `persist_external_source_observation`, which is `SECURITY DEFINER` and executable by `service_role` only. The signed-in operator can select. A failed or partial attempt updates source health and does not delete the last facts. Freshness is derived from `last_attempted_at`, `last_attempt_result`, and `last_successful_observed_at`. Credentials live in a separate table and are not selected with the facts.

That shape cannot hold this observation. A Floor Command handoff has an ISO week, a Monday deadline, partial Zebra confirmation, and a retained deadline list when a later deadline read fails. Putting it in `external_temporal_facts` would place it on the calendar and would hide it when Sunday is outside an interval.

The projection in `projections/floorCommandObservation.ts` remains the owner of status, ordering, dismissal meaning, and the reading. The database stores the result. It does not recompute Zebra completion.

Executable persistence checks in this repository use an ephemeral PostgreSQL cluster (`initdb`, `pg_ctl`, `psql`) and a vitest wrapper. This tranche uses that convention. It needs PostgreSQL client tools on the machine running the test. It does not need the hosted database.

## 2. Schema

Four tables, all private to the operator through `user_id = auth.uid()`:

| Table | What it stores |
| --- | --- |
| `floor_command_observation_bindings` | One server-owned store number for one operator |
| `floor_command_observation_handoffs` | One retained snapshot per operator and handoff id |
| `floor_command_observation_attempts` | The latest attempt time, result, reason, and last successful observation time |
| `floor_command_observation_dismissals` | One hidden revision, with no status column |

The handoff row keeps the producer snapshot, the source revision, the source time when the producer sent one, the ISO `operational_week`, the Monday `week_starting`, superseded bay identity, and the last confirmed SMART dates. `2026-W44` stays `2026-W44`. Its Monday stays `2026-10-26`. The Saturday-first Work week is not written.

`success_complete` on the attempt means the read succeeded. It does not mean the handoff status is `complete`. Stale and unavailable are not columns. The projection derives them: a failure with no handoff is unavailable; a failure with a retained handoff is stale.

Dismissal is a separate row of handoff id plus revision. It does not update the snapshot.

## 3. Adapter

`persistence/floorCommandObservation.ts` loads those rows and calls `applyFloorCommandRead`. `recordFloorCommandObservation` then calls `persist_floor_command_observation` with the operator id taken from the server, not with a store number. The store is the binding. A snapshot for another store becomes a failed attempt and does not replace the binding or the retained handoff.

`dismissPersistedFloorCommandRevision` calls `dismiss_floor_command_observation_revision`. That function reads `auth.uid()`. The client does not send an operator id or a store id.

No route, poll, notification, or automatic binding was added. Binding is an explicit service-role call, `bind_floor_command_observation`. A snapshot that names a store does not create the binding.

## 4. Ordering and failure

A different revision replaces a retained handoff only when both source times are present and the incoming time is the same or later. The same revision may replay. A missing source time on either side does not establish order, so the retained snapshot stays and the ready read is not written. The projection and the SQL function use that same rule. The function raises `floor_command_observation_revision_older` or `floor_command_observation_revision_unordered` rather than guessing.

A failed read updates the attempt and does not delete handoff rows. The last successful observation time does not move backward. A success payload must include every retained handoff id, so a partial payload cannot drop a week.

Clearing the published bays stores status `none` and the superseded bay list. That is not completion history. Dismissal does not change status. A later revision remains visible; the old dismissal row stays attached to the old revision.

## 5. Security

The operator can select the four tables. The operator cannot insert, update, or delete operational rows. Dismissal goes through the definer function and can hide only the signed-in operator's revision.

`service_role` can execute the bind and persist functions and can select. Direct insert, update, and delete are revoked from `service_role` on these tables. The functions are the write path.

The payload is refused when it contains `access_token`, `refresh_token`, `client_secret`, `service_role`, `password`, or `zebra_task_completed: true`. No credential column exists. A future Floor Command credential stays in the existing server-side credential store, not in this snapshot.

## 6. Validation

Ephemeral cluster: `scripts/floor-command-observation-persistence-regression.sh`, wrapped by `persistence/floorCommandObservation.pg.test.ts`. Requires local `initdb`, `pg_ctl`, and `psql`. It does not connect to hosted Supabase.

Adapter and projection suites, plus the ephemeral regression: 30 tests passed. ESLint on the touched TypeScript passed. `npm run typecheck` passed. `npm run build` passed. No Floor Command route was added.

The migration has not been applied to the Orient project `ksmhgaamyheyhefbyglb`.

## 7. Release

**NO-GO** for production migration, connection, credential, route, mount, and deploy.

Still required before a live read:

- A server-held, store-scoped, read-only Floor Command credential
- A Floor Command read route for this snapshot
- An explicit binding of the signed-in operator to one store
- A server call that loads this store, applies one read, and persists through the function above

None of those are authorized by this tranche.

## 8. Later claim fence

RELEASE-004A adds `20261024240000_floor_command_controlled_pull_claim.sql` after the three observation migrations. The five-argument `persist_floor_command_observation` described above is dropped. Success now requires the operator's current unexpired claim, and a committed `success_complete` is not rewritten by a later failure. The claim table does not copy store, source, or purpose. Those stay on the binding. Canonical record: [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md). This later migration is also not applied to hosted Orient.
