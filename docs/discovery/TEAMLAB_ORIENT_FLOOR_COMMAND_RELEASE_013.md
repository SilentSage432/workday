# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-013

Local implementation of the governed multi-observation contract in [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_012.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_012.md). Written 2026-10-28.

Local Orient code, one unapplied migration, and ephemeral tests. No hosted migration, deployment, production read, Floor Command pull, flag change, webhook, scheduler, or agent automation.

The production observation is unchanged by this tranche because this tranche did not connect to it.

| Field | Production value, not contacted |
| --- | --- |
| Floor Command | `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y` |
| Orient | `7a1fbfb` / `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK` |
| Store | `2587` |
| Week | `2026-W44` |
| Handoff | `fc.zebra-handoff.2587.2026-W44` |
| Sequence | `8` |
| Revision | `c3a29fab9de35ca0` |
| Accepted | `2026-10-29T00:40:17.666Z` |
| Attempt | `success_complete`, reason null |
| Pull flag | `ORIENT_FLOOR_COMMAND_PULL_ENABLED` absent |

**GO** to request a separately authorized deployment-preparation tranche.

**NO-GO** to treat this record as that preparation, to apply `20261029010000` to hosted Orient, to deploy this code, to set the pull flag, or to observe any week.

## 1. What changed

The one-shot pull is still `POST /api/integrations/floor-command/pull`. It still claims with `claim_floor_command_controlled_pull` and still returns `already_succeeded` when the operator attempt is `success_complete`. `pull.ts` and the four existing observation migrations were not edited.

The new ask is `POST /api/integrations/floor-command/observations`. The body is still exactly `{week}`. The server allocates the request id and a distinct claim id. The session supplies the operator. The binding supplies store, source, and purpose. The server does not infer `2026-W44`, `2026-W45`, or the current week.

Opening Work still uses `GET /api/integrations/floor-command/observation`. That GET does not call Floor Command. The disclosure now contains a week field and an "Observe this week" button. The button is the only client action that POSTs. `OrientInstrument` still loads the GET when Work opens and on its local clock. It does not POST.

While the pull flag is absent, the new POST returns `disabled` and does not insert a request.

## 2. Request and persistence behavior

`open_floor_command_governed_observation` creates one `in_progress` row for one operator, store, source, purpose, and ISO week. It refuses an invalid week, an unbound operator, a store that is not the binding, an unexpired legacy claim, and a second unexpired in-flight request. An expired in-flight row is closed as `failed` / `lease_expired` inside that open. The close does not GET.

`observeGovernedFloorCommandWeek` then performs one GET. Redirects are not followed. The cache mode is `no-store`. The timeout is 8 seconds. There is no retry. A body that contains the bearer is not stored. The snapshot is classified by `commit_floor_command_governed_observation`, not by the TypeScript caller.

| Outcome | When | What is kept |
| --- | --- | --- |
| `accepted_new` | No retained handoff for that week, and the snapshot is eligible | Working handoff and one history row, origin `accepted_new` |
| `unchanged` | Eligible snapshot, revision equals the retained revision, at any sequence | Snapshot, revision, sequence, and `last_successful_observed_at`. `last_checked_at` is set. `checked_sequence` advances only when the incoming sequence is higher |
| `revised` | Eligible snapshot, different revision, sequence greater than both the retained sequence and the checked high water | Previous snapshot appended first, then the working row replaced, then the new revision inserted with origin `revised` |
| `rejected` | Credential rejection, store refusal, unpublished week, withheld ordering, invalid structure, older sequence, or sequence conflict | Last accepted handoff |
| `failed` | Transport failure, timeout, redirect, or non-JSON, and a lease that expires before commit | Last accepted handoff. An expired commit writes nothing; the next open records `lease_expired` |

Eligibility uses the single returned snapshot. It requires the Orient source, the bound store, the requested week, publication `published`, synchronization `comparable`, sequence integer `>= 1`, a revision that matches freshness, the handoff id `fc.zebra-handoff.{store}.{week}`, Monday deadline policy, deadline date equal to the week start, handoff counts that match `pending`, `partial`, or `complete`, and `zebra_task_completed` false on every entry. Sequence `0` is not eligible. An unpublished week is `rejected` / `unpublished` even when other fields match. There is no second source request.

A repeated commit of an already terminal request returns the stored outcome and does not write again. A lost HTTP response plus a new operator POST is a new request. This is not exactly-once network delivery.

The new functions do not update `floor_command_observation_attempts`.

## 3. Historical evidence

`floor_command_observation_handoff_revisions` is append-only. The primary key is operator, handoff id, and source revision. A row stores the original sequence, revision, observed time, origin, and snapshot. `UPDATE` and `DELETE` raise `floor_command_observation_history_immutable`.

Applying the migration copies each existing handoff into that table with origin `one_shot`. The copy does not change the working snapshot, sequence, revision, or `last_successful_observed_at`. `last_checked_at` and `checked_sequence` are added null.

On a revision, the previous body is inserted with `ON CONFLICT DO NOTHING` before the working row is replaced, in the same transaction. A `one_shot` origin is not rewritten to `accepted_new`. If the history insert fails, the replacement fails.

The ephemeral proof inserted a `2026-W44` handoff at sequence `8`, revision `c3a29fab9de35ca0`, accepted `2026-10-29T00:40:17.666Z`, with `success_complete`, then applied the migration. The working row and the attempt row stayed. The history row was `one_shot`. Later failed and rejected requests on that operator did not change the snapshot. That fixture used the production identities and one local entry. It is not a copy of the nine production assignments. Hosted apply will copy the real row that is already stored.

## 4. Concurrency and security

One unexpired in-flight request per operator is enforced by a partial unique index and by locking the in-progress rows. Two overlapping opens leave one `opened` and one `busy`.

A commit whose claim id does not match raises `floor_command_governed_observation_claim_mismatch` and writes nothing. A commit after the 15-second database lease raises `floor_command_governed_observation_claim_expired` and writes nothing. The next explicit open closes that row as `lease_expired`. There is no sweeper.

`authenticated` cannot execute open or commit. Writes go through the security-definer functions, which are granted to `service_role` only. The client cannot name the store, source, or request id. Cross-site POSTs are refused. A body with any key besides `week` is refused before a request exists. Flag off, a missing session, an invalid week, an unbound operator, and a wrong store do not insert a request.

The new path does not create tasks, commitments, blocks, or protected time. It does not modify Floor Command. It does not schedule a read. The agent has no POST and no delegation contract.

The old pull still accepts an unpublished comparable snapshot as `success_complete`. That behavior is unchanged on purpose. The new path rejects it. Enabling the flag does not reopen the one-shot latch.

## 5. Work language

A retained week is status `retained`. The pull flag no longer produces a `current` posture. The required sentence for the production instant, when `temporal_settings.time_zone` is `America/Denver`, is:

> Observed October 28 at 6:40 PM MDT. Source sequence 8, revision c3a29fab9de35ca0. This is retained evidence, not a live Floor Command reading.

If the zone is missing or invalid, the UTC instant is shown and the zone is named unconfirmed. The age line says the week has not been checked since the observation, or names the last check. An unchanged request adds that the source revision was the same. A revised request names the immediately previous observation time, sequence, and revision. A failed or rejected request names the attempt and says the reading still shown is the last accepted one.

Zebra handoff status, the Monday deadline, confirmed and outstanding entry counts, and SMART dates stay in the disclosure. None of those sentences treat a complete handoff or a passed Monday as Zebra task completion. The words "current" and "up to date" are not used for this reading.

## 6. Tests

`npm run typecheck` passed (`next typegen && tsc --noEmit`).

Vitest passed for the governed and existing Floor Command suites: 9 files and 64 tests, then the existing one-shot persistence file on its own.

- `projections/floorCommandEvidenceCopy.test.ts`
- `projections/floorCommandObservation.test.ts`
- `persistence/floorCommandObservation.test.ts`
- `persistence/floorCommandGovernedObservation.pg.test.ts`
- `server/floorCommand/governedObservation.test.ts`
- `server/floorCommand/present.test.ts`
- `server/floorCommand/connection.test.ts`
- `server/floorCommand/routes.test.ts`
- `components/orient/floorCommandObservation.test.tsx`
- `persistence/floorCommandObservation.pg.test.ts` (existing one-shot script, re-run after this implementation)

The new ephemeral database uses port `55454` and does not contact Floor Command. It proved:

1. First published observation (`accepted_new`).
2. Unchanged repeated observation, including a second commit of the same request that does not rewrite `last_checked_at`.
3. Revised observation with the previous snapshot kept and immutable.
4. Unpublished week rejection, including sequence `0`, with no handoff written.
5. Sequence regression (`older_sequence`) after a higher retained sequence.
6. Conflicting revision at the checked high water (`sequence_conflict`).
7. Transport failure leaves the accepted snapshot. The TypeScript test covers one timeout and no retry.
8. Concurrent opens: one opened, one busy, one in-flight row.
9. Stale claim and expired lease write nothing. The next open records `lease_expired`.
10. An unsigned caller and `authenticated` cannot execute the functions. A cross-site POST and an extra body key do not observe.
11. The observation GET test does not call `fetch`. The presentation source does not contain the published-week path.
12. After the migration, `claim_floor_command_controlled_pull` still returns `already_succeeded`, creates no claim, and the governed path does not change that attempt row.

The component test renders the disclosure. A signed-in browser pass was not run. Opening the hosted app would read production Orient, which this tranche does not authorize.

## 7. Compatibility with existing production data

The migration adds nullable columns and a history copy. It does not rewrite `snapshot`, `source_revision`, or `last_successful_observed_at`. The existing attempt row is not in the migration's write set. The old pull's column list does not mention the new columns, so a later one-shot persist leaves them untouched.

Hosted Orient does not have the new columns or the requests table. Deploying this application first would make `GET /api/integrations/floor-command/observation` select columns and a table that are absent. That GET would fail until the migration is applied. This tranche does not apply it.

The production flag is absent. This code, if deployed with the flag still absent, would refuse a new observation before inserting a request. The old pull route would still be latched. Neither of those statements authorizes the deploy.

## 8. Unresolved risks

- A crash after the GET and before commit leaves the request `in_progress` until the lease expires and a later explicit open closes it. The source may have answered. Orient does not promise that the answer was stored.
- A lost response followed by another POST is a second request and can perform a second GET. That is a new operator action, not a retry of the first request.
- The old pull route can still accept an unpublished week if something calls it before the latch is spent. The production latch is already spent. The new route is the path that rejects unpublished weeks.
- Work names only the latest terminal request for each week. Older request rows remain in the table for audit and are not all rendered.
- The local `2026-W44` fixture is identity-shaped. It does not reproduce the nine production assignments. The hosted copy will.
- No rate limit was added on the new route beyond one in-flight request and the kill switch.
- This code is not deployed. Production Work still uses the previous presentation until a later deployment.

## 9. Future deployment prerequisites

A later tranche has to authorize each of these. This record does not.

1. Review this migration and this application as one pair. Apply `20261029010000_floor_command_governed_observation.sql` to hosted Orient before deploying the application that selects `last_checked_at`, `checked_sequence`, and `floor_command_observation_requests`.
2. Confirm the history copy of the existing `2026-W44` handoff is origin `one_shot` and that the working row's revision, sequence, and accepted time are unchanged.
3. Confirm the attempt row is still `success_complete` and that `claim_floor_command_controlled_pull` still returns `already_succeeded`.
4. Leave `ORIENT_FLOOR_COMMAND_PULL_ENABLED` unset in that deployment. Absence is off. The flag is a kill switch, not the authorization to observe.
5. A pull, including the first governed observation of any week, requires an authorization after that deployment. This record does not request one.

## 10. Recommendation

**GO** for a separately authorized deployment-preparation tranche. Its job is to review this local pair and to write the hosted order above. It does not apply the migration, deploy, set the flag, or read Floor Command unless that later authorization says so explicitly.

**NO-GO** to migrate hosted Orient, deploy this code, enable the pull flag, or observe from this tranche.

**STOP.**
