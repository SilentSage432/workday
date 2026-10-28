# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004

**Status:** RELEASE-004B completed the local application on `959903d1a775a15a35cbe3d90ec6b570f3433df1`. The pull claims before it fetches, persists with that claim, and releases the claim after a failure. Hosted Orient was not migrated. Nothing was deployed or pulled.

**Date:** 2026-10-28

**Base:** `959903d1a775a15a35cbe3d90ec6b570f3433df1`

**Guarantee:** At most one successful controlled observation is committed for the authorized one-shot operation. This is not exactly-once HTTP delivery.

**Recommendation:** **GO** to request Gate B deployment preparation. **NO-GO** to deploy, apply the hosted migration, issue a credential, bind an operator, change environment, or pull.

## 1. Why the application gate stopped

RELEASE-003 allowed a route to read `last_attempt_result` and skip the network call when it was already `success_complete`. Two requests can both observe the absence of that row, both call Floor Command, and both reach persist. Disposable PostgreSQL, with only `20261024210000`, `20261024220000`, and `20261024230000` applied, accepted two concurrent success calls for one bound operator. The attempt constraint allows only `success_complete` and `failure`, so a claim cannot be stored as a third attempt result. `service_role` can select the attempt table and cannot insert, update, or delete it. PostgREST commits each RPC when it returns, so a row lock inside one call does not cover the outbound fetch.

That stop did not add a route, an origin allowlist, a redirect refusal, or a migration. 004A is the migration that stop required.

## 2. Migration and function changes

New file, applied after the three observation migrations and not edited into them:

`supabase/migrations/20261024240000_floor_command_controlled_pull_claim.sql`

The migration creates no binding, attempt, handoff, dismissal, or claim row.

| Object | Change |
| --- | --- |
| `floor_command_controlled_pull_claims` | New table. `user_id` primary key, `claim` unique, `claimed_at` not null. One active claim per operator. |
| Store, source, purpose | Not columns on the claim. The approved binding remains the authority. Copying them onto the claim would let the two diverge. |
| `floor_command_controlled_pull_lease()` | Returns `15 seconds`. Not executable by `anon`, `authenticated`, or `service_role`. |
| `claim_floor_command_controlled_pull(uuid, uuid)` | New. Returns text. `service_role` execute only. |
| `release_floor_command_controlled_pull(uuid, uuid)` | New. `service_role` execute only. |
| `persist_floor_command_observation(uuid, timestamptz, text, text, jsonb, uuid)` | New six-argument function. Existing sequence, revision, store, and snapshot checks remain. |
| `persist_floor_command_observation(uuid, timestamptz, text, text, jsonb)` | Dropped. A caller cannot commit success without a claim. |

Unchanged files:

- `supabase/migrations/20261024210000_floor_command_observation.sql`
- `supabase/migrations/20261024220000_floor_command_observation_sequence.sql`
- `supabase/migrations/20261024230000_floor_command_observation_approval.sql`

The claim locks the binding, then the attempt, then the claim row. Persist uses the same order. Competing calls for one operator wait on the binding row. Lease checks use database `now()`, not application time. Repeating the same claim identity inside the lease returns `claimed` and does not move `claimed_at`, so a retry cannot extend the lease.

## 3. Claim acquisition

`claim_floor_command_controlled_pull(p_user_id, p_claim)` runs in one transaction:

1. Reject a null operator or a null claim.
2. Lock the binding. A missing binding, a different source, or a different purpose returns `unbound`.
3. Lock the attempt when one exists. `success_complete` returns `already_succeeded`.
4. Lock the claim row. The same identity, still inside the lease, returns `claimed`.
5. A different identity, still inside the lease, returns `busy`.
6. Otherwise insert or replace the row with `now()` and return `claimed`. A claim identity already held by another operator raises `floor_command_controlled_pull_claim_mismatch`.

No process-local variable is part of this decision.

## 4. Persistence fencing

A controlled success commits only when all of these hold inside the persist transaction:

- The claim argument matches the operator's current claim row.
- That row belongs to the same operator whose binding was locked.
- `claimed_at` is still inside the 15-second lease.
- The attempt is not already `success_complete`.
- The existing approval, store, snapshot, sequence, and revision checks pass.

Success writes the handoff and the attempt, then deletes that claim in the same transaction. An expired claimant raises `floor_command_controlled_pull_claim_expired` and writes nothing. A replaced claimant raises `floor_command_controlled_pull_claim_mismatch` and does not change the replacement's row or a newer handoff.

A failure with a current unexpired claim, and with no committed success, records `failure` and a reason. It does not delete handoffs and does not clear `last_successful_observed_at`. It also leaves the claim in place. The owner releases it, or the lease expires, before another identity can retry.

A failure after `success_complete` raises `floor_command_controlled_pull_already_succeeded`. It does not flip the attempt back to `failure`. That change is deliberate: the older failure update would have reopened the one-shot. The retained snapshot and the last success time stay.

## 5. Lease, release, and retry

| Situation | Result |
| --- | --- |
| Crash before the fetch | The claim is committed. No handoff and no success exist. Another identity is `busy` until the owner releases or 15 seconds pass. |
| Crash after the fetch, before persist | Same database state as a crash before the fetch. A later retry can call Floor Command again. This is why the guarantee is not exactly-once HTTP delivery. |
| HTTP timeout | The owner calls `release_floor_command_controlled_pull`. A later claim can proceed. If the process is gone, the next claim waits for lease expiry. |
| Lease expires during a delayed request | The original persist raises `floor_command_controlled_pull_claim_expired` and does not write. A replacement may then claim and commit. The expired identity cannot overwrite that result. |
| Replacement claimant | After expiry, a new claim identity replaces the row. The old identity cannot persist and cannot release the new row. |
| Retry after a recorded success | `claim` returns `already_succeeded`. Persist raises `floor_command_controlled_pull_already_succeeded`. No second success is committed. |

Release deletes the claim only when the identity matches the current row and the attempt is not `success_complete`. A stale identity raises `floor_command_controlled_pull_claim_mismatch`. Release does not delete a handoff.

The public functions do not clear `success_complete` to allow another observation. A later cadence is a different operation and needs its own authorization. The disposable regression re-arms an attempt only inside `test_persist_floor_command_observation`, which is created by the test script, revoked from `service_role`, and absent from the migration. That helper lets the older sequence scenarios keep running. It is not a production path.

## 6. Security privileges

Row security is enabled on `floor_command_controlled_pull_claims`. There is no authenticated policy.

| Role | Claim table | Claim, release, and six-argument persist |
| --- | --- | --- |
| `anon` | No select | No execute |
| `authenticated` | No select | No execute |
| `service_role` | Select only. Insert, update, and delete are revoked. | Execute |
| Direct `service_role` insert | Rejected | The disposable test recorded `insufficient_privilege` |

`service_role` on hosted Supabase bypasses row security. The revoked table privileges are the restriction that still applies. The functions are `SECURITY DEFINER` with `search_path = public`.

## 7. Concurrency evidence

`scripts/floor-command-observation-persistence-regression.sh` starts a disposable PostgreSQL cluster, applies the four migrations in order, and destroys the cluster on exit. It does not connect to hosted Orient. The run exited 0 and printed:

- `MIGRATION_EMPTY_OK` — the migration created no binding, attempt, handoff, or claim, and the five-argument function was already gone.
- `CLAIM_ONE_OF_TWO_OK` and `CLAIM_BUSY_OK` — two simultaneous claim calls returned one `claimed` and one `busy`, with one claim row and no handoff.
- `SIMULTANEOUS_SUCCESS_OK` — two simultaneous persists of the same claim left one handoff, one `success_complete`, and no claim row. The loser raised `floor_command_controlled_pull_already_succeeded`.
- `STALE_PERSIST_REJECTED_OK` and `LEASE_REPLACEMENT_OK` — a claim backdated by 16 seconds could not persist. The replacement identity committed, and the stale identity could not overwrite it.
- `STALE_RELEASE_REJECTED_OK` — the stale identity could not release the replacement. The current owner could release. No handoff appeared.
- `FAILURE_BEFORE_SUCCESS_OK` — failure stored no handoff, a second identity was `busy`, repeating the same identity did not move `claimed_at`, and release allowed a later claim.
- `RESTART_AFTER_SUCCESS_OK` — a new database session saw `already_succeeded` and could not persist again.
- `FAILURE_AFTER_SUCCESS_KEEPS_OK` — failure did not change the snapshot, the success marker, or `last_successful_observed_at`.
- `CROSS_OPERATOR_CLAIM_REJECTED_OK` and `CROSS_STORE_CLAIM_REJECTED_OK` — another operator's claim could not persist or release this operator's row, and a claim could not write another store's snapshot.
- `LEGACY_SIGNATURE_ABSENT_OK` and `CLAIM_PRIVILEGE_OK`.

Lease expiry was tested by backdating `claimed_at`. The script did not sleep and did not change the database clock.

## 8. Existing test compatibility

The same script still prints the observation echoes, including `APPROVAL_OK`, `FIRST_SNAPSHOT_OK`, `REPLAY_OK`, `NEW_REVISION_OK`, `OLDER_REJECTED_OK`, `FAILURE_WITHOUT_SNAPSHOT_OK`, `FAILURE_KEEPS_SNAPSHOT_OK`, `SEQUENCE_ZERO_TO_PUBLISHED_OK`, `SEQUENCE_REPLAY_CONFLICT_OLDER_OK`, `SEQUENCE_DELETE_AND_WITHHELD_OK`, and `ORIENT-FLOOR-COMMAND-003-PERSISTENCE-CLEAR`.

`FAILURE_KEEPS_SNAPSHOT_OK` and `SEQUENCE_DELETE_AND_WITHHELD_OK` now require the committed success to remain. They previously expected the attempt result to become `failure` while the snapshot stayed. The snapshot and `last_successful_observed_at` still stay. A failure before any success still records `failure`.

`persistence/floorCommandObservation.pg.test.ts` requires both the old echoes and the 004A echoes.

At the end of 004A, application TypeScript still called the five-argument RPC. RELEASE-004B changed `recordFloorCommandObservation` and the pull failure writer to pass `p_claim`. Hosted Orient still has the old function until the migration and this application ship together.

## 9. Remaining risks

- Applying `20261024240000` to hosted Orient before the application passes `p_claim` removes the persist function the deployed code calls.
- A crash after Floor Command responds and before persist can produce a second HTTP call after the lease. Only one of those calls can commit.
- The 15-second lease is longer than the 8-second pull timeout, and shorter than a request that stalls past the lease. The stalled caller must fail closed.
- The first committed controlled success is terminal for that operator under these functions. A future weekly cadence cannot reuse this one-shot without a new authorization.
- The test re-arm helper must not be copied into a hosted migration.
- This tranche did not re-read hosted Orient table counts or environment names. Gate B still has to do that before any allowlist deploy.

## 10. What this tranche did not do

No hosted migration. No application deployment. No production credential. No environment change. No approval binding. No HTTP route. No origin allowlist change. No live pull. No Floor Command mutation.

## 11. Decision

**GO** for a later local Gate A implementation. That work calls `claim_floor_command_controlled_pull` before the fetch, passes the same claim to the six-argument persist, and calls `release_floor_command_controlled_pull` when the fetch fails. It still has to add the exact origin allowlist, the approval route, the pull route, manual redirect refusal, and the snapshot-week check. It must not apply this migration to hosted Orient until those callers ship with it.

**NO-GO** for hosted migration, deployment, credential issuance, environment changes, approval binding, and any live pull.

## 12. RELEASE-004B application

Failure persistence did not need a new database function. A failed fetch calls the six-argument `persist_floor_command_observation` with the claim it already holds, then `release_floor_command_controlled_pull` with that same claim. `busy`, `unbound`, and `already_succeeded` return before any GET. An expired or replaced claim raises inside persist or release. The caller releases only its own claim id, and a mismatch does not delete the replacement.

### Flow

1. The route verifies the Orient session bearer.
2. The server store comes from `ORIENT_FLOOR_COMMAND_STORE_NUMBER`.
3. The approved binding must match that store.
4. `ORIENT_FLOOR_COMMAND_PULL_ENABLED` must be exactly `1`.
5. `claim_floor_command_controlled_pull` runs.
6. Only `claimed` sends one GET, with `redirect: "manual"` and an 8-second timeout.
7. The snapshot week must equal the requested week.
8. Persist receives that claim id.
9. A failure releases the claim when the database still recognizes it.
10. The JSON result has no bearer.

`POST /api/integrations/floor-command/approval` calls the existing bind. A body that supplies a store, source, or purpose is refused. `POST /api/integrations/floor-command/pull` accepts `{ "week" }` only. Cross-site `Origin` and `Sec-Fetch-Site: cross-site` are refused. Work does not call either route.

`https://deptsync-hub.vercel.app` is the only production origin. It must be HTTPS, that exact hostname, with no userinfo and no explicit port. Other `vercel.app` hosts and names containing `deptsync-hub` are refused. `https://floor-command.test` and local `localhost` / `127.0.0.1` remain usable for tests. A redirect is a failed attempt. The bearer is not sent to the redirect target.

### Verification

Disposable claim regression, Floor Command contract and route tests, authentication tests, and the Pulse unit tests listed below passed. TypeScript, ESLint, and the production build passed. The build lists the approval and pull routes. No test called `deptsync-hub.vercel.app`.

| Check | Result |
| --- | --- |
| `persistence/floorCommandObservation.pg.test.ts` | Passed, including the 004A claim echoes |
| `server/floorCommand/connection.test.ts` | 7 passed after the type fix |
| `server/floorCommand/routes.test.ts` | Passed |
| `server/auth/requireAuthenticatedUser.test.ts` | Passed |
| `persistence/floorCommandObservation.test.ts`, `projections/floorCommandObservation.test.ts`, `server/floorCommand/present.test.ts`, `components/orient/floorCommandObservation.test.tsx` | Passed |
| `persistence/pulse.test.ts`, `domain/pulse.test.ts`, `domain/pulseHostedEstablishment.test.ts`, and the three Pulse component tests | Passed, 69 tests in that combined run with the claim regression |
| TypeScript, ESLint, production build | Passed on the rerun after narrowing the wrong-store memory check |

### Gate B

Requesting preparation is **GO** only if that preparation keeps the pull flag unset, ships this application and `20261024240000` together, and does not issue a credential or bind an operator. Deploying the application without the migration makes the pull call a function the hosted database does not have. Applying the migration without this application removes the five-argument persist the previous application code calls. Executing that deploy is **NO-GO** in this tranche.
