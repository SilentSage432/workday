# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004

**Status:** RELEASE-004 stopped before application code. RELEASE-004A then added a local claim migration and verified it on disposable PostgreSQL. Application Gate A has not resumed. Hosted Orient was not migrated.

**Date:** 2026-10-28

**Base:** `e44953b181b612fbefe8661eb58c0366f324589e`

**Guarantee:** At most one successful controlled observation is committed for the authorized one-shot operation. This is not exactly-once HTTP delivery.

**Recommendation:** **GO** to resume local application Gate A on top of this migration. **NO-GO** to apply the migration to hosted Orient, deploy, issue a credential, bind an operator, change environment, or pull.

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

Application TypeScript still calls the five-argument RPC from `recordFloorCommandObservation` and from the pull failure writer. Those files were not changed. Hosted Orient still has the old function until a later, separate migration. The local tests do not import those callers.

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
