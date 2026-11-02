# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-024

Deployment preparation for the inert standing-observation policy in [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_023.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_023.md), under the continuity contract in [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_022.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_022.md). Written 2026-11-01.

Read-only inspection of the working tree, an ephemeral database, and local checks. No hosted migration, deployment, pull-flag change, Floor Command read, governed request, or production grant.

**NO-GO** to apply `20261101120000`, to deploy, to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, to approve a production grant, or to observe from this record.

**GO** to request a separate production tranche whose only authority is section 7. That tranche re-reads the hosted baseline, applies this one migration, deploys the reviewed commit, and stops with the pull flag absent and zero standing-policy rows.

## 1. Verified implementation inventory

Local `HEAD` is `b9cd3bd762a3dd3c7dd7e9390b556a0cad56e7d0`. That is the RELEASE-021 production commit. The policy files are uncommitted. `git diff HEAD` is empty for `server/floorCommand/governedObservation.ts`, `server/floorCommand/pull.ts`, `server/floorCommand/present.ts`, `persistence/floorCommandObservation.ts`, and the existing observation, approval, and pull routes. Orient has no `vercel.json`. No component references the standing policy. Floor Command was not edited.

The working tree adds:

| Path | Role |
| --- | --- |
| `supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql` | Schema, guards, and lifecycle functions |
| `server/floorCommand/standingPolicy.ts` | Session operator, confirmed time zone, service-role RPC |
| `server/floorCommand/standingPolicyRoute.ts` | Same-origin POST, exact JSON bodies, HTTP status |
| `app/api/integrations/floor-command/standing-policy/route.ts` | `GET` inspect, `POST` propose |
| `app/api/integrations/floor-command/standing-policy/approve/route.ts` | `POST` approve |
| `app/api/integrations/floor-command/standing-policy/revoke/route.ts` | `POST` revoke |
| `app/api/integrations/floor-command/standing-policy/expire/route.ts` | `POST` expire |
| `server/floorCommand/standingPolicy.test.ts` | Route and source-scan tests |
| `persistence/floorCommandStandingPolicy.pg.test.ts` | RELEASE-023 ephemeral lifecycle |
| `scripts/floor-command-standing-policy-regression.sh` | That proof |
| `scripts/floor-command-standing-policy-regression.sql` | That proof |
| `persistence/floorCommandStandingPolicyDeployment.pg.test.ts` | This tranche's ledger proof |
| `scripts/floor-command-standing-policy-deployment-compatibility.sh` | That proof |

There is no execute, observe, or run route. Propose returns `proposed`. Approval is a second call. The client body for propose has exactly `effectiveAt`, `expiresAt`, `maxPublicationWindows`, and `reconciliationAllowance`. Store, source, purpose, and time zone are rejected as extra keys before the RPC. The time zone is read from `temporal_settings` for that user id. A missing or non-IANA zone returns `timezone_unconfirmed` and does not call propose.

The SQL insert writes source `deptsync.floor-command.orient.v1`, store `2587`, and purpose `orient_published_week_read`. A binding for any other store returns `unbound` and writes no row. `max_publication_per_window` is fixed at 1. `automatic_retry_limit` is fixed at 0. The four execution flags are fixed false, including `source_publication_assumed`.

Audit events are append-only. Approval stores the recomputed scope and refuses `scope_changed` when it differs from the proposed event. Expiration and revocation copy that approved scope. The guard trigger rejects a later change to the scope columns, a delete, and any transition other than `proposed → approved`, `proposed → revoked`, `approved → revoked`, and `approved → expired`.

The policy TypeScript, routes, and migration do not call the governed observer, the one-shot pull, or a Floor Command URL. They do not set the pull flag. They do not insert tasks, commitments, blocks, or protected time.

## 2. Migration compatibility findings

`20261101120000_floor_command_standing_observation_policy.sql` introduces:

- Tables `floor_command_standing_policies` and `floor_command_standing_policy_events`.
- Check constraints that pin the contract, store `2587`, the Sunday 12:00 UTC slot, the limit constants, and the lifecycle stamps.
- Unique `(user_id, policy_version)` and partial unique index `floor_command_standing_policies_one_open` on `proposed` and `approved`.
- Index `floor_command_standing_policy_events_policy_idx`.
- Row level security, select-own policies, and `SELECT` for `authenticated` and `service_role`. Insert, update, and delete are revoked from `public`, `anon`, `authenticated`, and `service_role`.
- Triggers `floor_command_standing_policies_guard` and `floor_command_standing_policy_events_immutable`.
- Helpers `floor_command_standing_policy_windows`, `floor_command_standing_policy_scope`, `floor_command_standing_policy_view`, and `floor_command_standing_policy_record`, not granted to `service_role`.
- Lifecycle functions `propose_floor_command_standing_policy`, `approve_floor_command_standing_policy`, `revoke_floor_command_standing_policy`, `expire_floor_command_standing_policy`, and `inspect_floor_command_standing_policies`, with execute granted to `service_role` only.

The file does not `ALTER`, `DROP`, or `TRUNCATE` an observation table. It does not mention attempts, requests, handoffs, revisions, tasks, commitments, blocks, protected time, or `cron.schedule`. At runtime, propose and approve `SELECT ... FOR UPDATE` the caller's existing binding row, and the event writer calls the existing `floor_command_observation_json_forbidden`. Those are reads of objects RELEASE-021 already has. The migration body does not replace them. The ephemeral proof stored `md5(prosrc)` for every existing public function signature and found no change after the file ran.

The current production application is `b9cd3bd`. It does not reference these tables or functions. Its handoff select already names `last_checked_at` and `checked_sequence`, which RELEASE-015 added. New tables do not change that select. The production application remains compatible after this migration.

The new routes require the functions. A request that reaches them before the migration gets an RPC error and returns 503 `unavailable`. `GET /api/integrations/floor-command/observation` does not query the new tables, so deploying the new commit before the migration does not by itself break the existing Work read. The procedure is still migration-first so the alias does not advertise routes whose functions are absent.

The migration does not rewrite observation or temporal rows. It creates empty tables. Applying it does not approve a grant and does not insert a request.

It is safe to apply once, inside one transaction. It is not idempotent. A second execution fails on `create table` because the relation already exists. That failure is the first statement, so a repeated file does not add a policy row. The ephemeral proof confirmed the ledger after that failed second run.

There is no `CREATE INDEX CONCURRENTLY` and no other statement PostgreSQL refuses inside a transaction. `supabase db push` is the runner that applies the file and records `20261101120000`. Do not apply it with `db query --file`. That path does not write `schema_migrations`, and it can commit statement by statement.

Locking: `CREATE TABLE` and `CREATE INDEX` take locks on the new relations. They do not rewrite `floor_command_observation_handoffs` or the request table. The migration does not lock those tables. A later propose or approve locks one binding row for the length of that transaction. That lock is not part of the migration.

A forced error after the file, wrapped in one transaction, rolled back. `to_regclass('public.floor_command_standing_policies')` was null. If `db push` fails, the hosted transaction should leave the same absence and should not record the version. Stop. Do not run the file again until that absence is confirmed.

If the migration commits and the later deploy fails, the new tables sit unused under the old application. Leave them. Do not drop them. The old application does not read them. Returning the alias to the deployment recorded in step 1 restores the previous application.

Cloud projects can expose new public tables to the Data API at creation. This file revokes those privileges afterward in the same migration. Step 6 checks the grants that remain. A wider grant is a stop, not a prompt to add another grant.

## 3. Authorization and RLS review

The browser path is the Supabase bearer through `requireAuthenticatedUserId`. POST routes use the existing same-origin refusal. The handler passes that user id into the service-role function. The function does not take a store, source, or purpose from the caller.

An unauthenticated call returns `unauthorized`. A user who is not in `auth.users` returns `unauthorized`. A binding other than store `2587` with the published-week source and purpose returns `unbound`. Cross-operator approve returns `not_found`. Propose does not set `approved_at`. Approve is a separate function, and it records `approved_by` as the owning operator together with `approved_at`.

The ephemeral proof, as `service_role`, could not insert a policy row and could not update one. As `authenticated`, it could not execute propose. With the request JWT set to another user, that role saw zero policy rows. With the owner's JWT, it saw the retained revoked row. That is the select-own policy.

`service_role` can execute the five lifecycle functions, and those functions trust the user id argument. That is the same server boundary as the governed open and commit functions. The route is what binds the argument to the session. A person holding the service-role key can call the function directly. That key can already open governed observations. This migration does not give that key a Floor Command read it did not have, because these functions do not read Floor Command. Acceptance must not use the service-role key to propose or approve.

A superuser can disable the guard trigger. The expiry proof in RELEASE-023 does that on purpose, and only as the database owner. The application roles cannot. Hosted dashboard SQL runs with that owner authority. The production tranche must not use the dashboard to insert or approve a grant.

`GET` inspect expires an approved row whose `expires_at` has passed, then returns the history. That is a status write, not a source read. Production acceptance therefore counts the policy table before any signed-in inspect. The count has to be zero. If it is not zero, stop. Do not call inspect, and do not approve.

A revoked or expired row cannot return to `approved`. The proof approved, revoked, and then received `not_proposed` on a second approve. Concurrent approve and revoke are covered by the RELEASE-023 proof: both calls can run, and the stable end state is `revoked`, with at most one approved event and exactly one revoked event. An approved row and a revoked row do not both remain effective.

## 4. Temporal-window verification

The publication slot is Sunday 12:00 UTC. That is the Floor Command cron `0 12 * * 0`, not Sunday noon in Denver. The close is the next local midnight in the policy time zone, which is Monday 00:00 local, stored as an absolute timestamp. The operational week is the ISO week of that local Monday. On a Sunday, `sundayStagingWeekLabel` names the ISO week of the next Monday. The window label uses that Monday.

The zone is frozen from the operator's confirmed `temporal_settings.time_zone` at proposal. A later settings change does not rewrite the row. The client cannot send a zone. Abbreviations such as `MST` are refused. A zone where Sunday 12:00 UTC is already Monday, such as `Pacific/Auckland`, is refused with `timezone_shifts_sunday`.

America/Denver was checked on the ephemeral database:

| Sunday 12:00 UTC | Local offset | Publication close | Reconciliation close | Week |
| --- | --- | --- | --- | --- |
| 2026-10-25 | MDT, UTC−6 | 2026-10-26 06:00 UTC | 2026-10-27 06:00 UTC | `2026-W44` |
| 2026-11-01 | MST, UTC−7, after the 08:00 UTC fallback | 2026-11-02 07:00 UTC | 2026-11-03 07:00 UTC | `2026-W45` |

The November close is one hour later in UTC because local midnight is later after the fallback. The open instant stays Sunday 12:00 UTC. For Denver, that open is Sunday 06:00 MDT or Sunday 05:00 MST. The civil date of the open is still Sunday, so the zone is accepted.

Each kept Sunday slot has one publication opportunity. `max_publication_per_window` cannot be anything but 1. The operator may include 1 to 8 such slots, and the span cannot exceed 70 days. The first N slots inside the span are the ones kept. That is the RELEASE-023 limit. It is not an unbounded poll, and it is not a single slot for every future grant. A grant of one window is an operator choice of `maxPublicationWindows: 1`.

When the reconciliation allowance is 1, one reconciliation window follows each kept publication window, from Monday 00:00 local through the next local midnight, and only while that open still falls inside `expires_at`. The allowance is 0 or 1. The window says an outstanding Zebra task-entry confirmation would be required, and it says that fact is unknown. The policy does not read Zebra. `automatic_retry_limit` is 0.

`source_publication_assumed` is false on the row and on every window. `executable` is false. A window that has opened is a calendar fact. It is not evidence that Floor Command published.

## 5. Non-execution evidence

Inspected paths: propose, approve, inspect, revoke, and expire, in SQL and in the route handlers.

- The migration and the policy modules do not contain the published-week path, `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, `observeGovernedFloorCommandWeek`, `pullFloorCommandPublishedWeek`, `cron.schedule`, or a `fetch(` call. The unit test stubs `fetch` and expects no call.
- The lifecycle functions' source, checked by the RELEASE-023 database proof, does not contain `floor_command_observation_requests`, the published-week path, `pg_net`, `cron.schedule`, or `http_get`.
- After propose, approve, inspect, and revoke, the request count was still 1 and the request identity was unchanged. No second history row was written. The attempt stayed `success_complete`. `claim_floor_command_controlled_pull` still returned `already_succeeded` and left claims at 0.
- The proof ended with zero rows in `approved`. The one local grant was revoked.
- Tasks, commitments, blocks, and protected time stayed 39, 2, 0, and 0.
- No scheduler, webhook, or worker selects these policies. Orient still has no `vercel.json`. The existing Pulse job `orient-pulse-hosted-establishment` is unchanged by this file. Do not attach Floor Command observation to it.

## 6. Local regression results

Run on 2026-11-01 in `/Users/silentsage/Desktop/workday`. The database was ephemeral, on port `55457` for the deployment proof and on the existing ports for the other proofs. No hosted connection was used. The Supabase CLI is not installed in this environment, so `supabase db push --dry-run --linked` was not run. Section 7 step 4 is the stop gate that runs it.

The fixture is the recorded RELEASE-019 and RELEASE-021 identity, not a copy of the nine production assignments. `claim_id` is the stand-in `00000000-0000-4000-8000-000000000244` because the request record did not include one, and no claim row was inserted.

`scripts/floor-command-standing-policy-deployment-compatibility.sh` exited 0 and printed:

`LEDGER_BEFORE_OK`, `MIGRATION_ONCE_OK`, `LEDGER_PRESERVED_OK`, `LIFECYCLE_INERT_OK`, `WINDOWS_DENVER_OK`, `EXISTING_FUNCTIONS_UNCHANGED_OK`, `DIRECT_WRITE_REFUSED_OK`, `SECOND_APPLY_STOPPED_OK`, `FAILED_TRANSACTION_ROLLED_BACK_OK`, `DEPLOYMENT_COMPATIBILITY_OK`.

Preserved through the migration and through the local lifecycle:

| Fact | Value |
| --- | --- |
| Handoff | `fc.zebra-handoff.2587.2026-W44` |
| Sequence | `8` |
| Revision | `c3a29fab9de35ca0` |
| Accepted | `2026-10-29T00:40:17.666Z` |
| Last check | `2026-10-30T13:55:56.99807Z` |
| `checked_sequence` | null |
| Request | `879a61f2-6179-479b-a9ad-15f150db44d3`, `unchanged`, terminal at the last-check instant |
| History | 1 row, origin `one_shot`, same snapshot, superseded assignments, and retained deadlines as the working handoff |
| Attempt | `success_complete`, reason null, attempted and successful at the accepted instant |
| Claims | 0 |
| Tasks / commitments / blocks / protected time | 39 / 2 / 0 / 0 |

Vitest 4.1.11, four files, 8 tests, all passed: the standing-policy route tests, the RELEASE-023 database proof, this deployment proof, and the existing governed observation proof. The governed script was not edited.

`npm run typecheck` passed. `npm run lint` passed. `npm run build` (Next.js 16.3.8) passed and listed the four standing-policy routes as dynamic. That build was not deployed.

Hosted Orient was not re-read on 2026-11-01. The last hosted record remains RELEASE-021: alias `https://orient-cyan.vercel.app`, deployment `dpl_LzEcF65D1qQ1SChttiDGPW43aWDh`, commit `b9cd3bd`, pull flag absent, migration `20261029010000` present, and the ledger in the table above. Floor Command production on record remains `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y`. This tranche did not contact it.

## 7. Exact migration-first deployment procedure

This section is the procedure for a later authorization. Do not start it from this record.

Every step is read-only until step 5. Step 5 and step 7 each require their own authorization. If a stop gate fails, do not continue, do not set the pull flag, and do not create a grant.

### 1. Verify the baseline

From the workday repository:

- Record `git rev-parse HEAD`, `git status`, and the commit on `origin/main`.
- Read the production deployment for `https://orient-cyan.vercel.app`. Record the deployment id, commit, and Ready state. Record the previous deployment id as well. Do not redeploy.
- Confirm the linked Supabase project is Orient. The project id recorded in RELEASE-014 was `ksmhgaamyheyhefbyglb`. If the link points somewhere else, stop.

Read-only SQL, `SELECT` only. Do not pass the migration file to `db query`.

- `supabase_migrations.schema_migrations` contains `20261029010000`.
- It does not contain `20261101120000`.
- One handoff: `fc.zebra-handoff.2587.2026-W44`, revision `c3a29fab9de35ca0`, sequence `8` inside the snapshot, accepted `2026-10-29T00:40:17.666Z`, `last_checked_at` `2026-10-30T13:55:56.99807Z`, `checked_sequence` null.
- One request: `879a61f2-6179-479b-a9ad-15f150db44d3`, state `unchanged`.
- One history row, origin `one_shot`.
- One attempt, `success_complete`, reason null.
- Claims `0`.
- Record the counts of tasks, commitments, blocks, and protected time. RELEASE-021 recorded 39 / 2 / 0 / 0. If those counts differ, stop and reconcile the difference before any migration. Do not overwrite them.

If any observation identity differs from that list, stop. The ephemeral fixture is not authority for a changed hosted row.

### 2. Confirm the pull flag is absent

List production environment names. Do not print values. `ORIENT_FLOOR_COMMAND_PULL_ENABLED` must be absent. If the name is present, stop. Do not change it.

### 3. Commit only the reviewed implementation

Commit the policy migration, the standing-policy server and routes, their tests, the two ephemeral scripts and the RELEASE-023 SQL, and the discovery records `022`, `023`, and `024`, plus the journal, handoff, and roadmap entries that belong to those records.

Do not commit `.env` files. Do not commit the untracked historical release notes that are not part of this list. `CHAT_HANDOFF.md`, `DEVELOPMENT_JOURNAL.md`, and `MASTER_ROADMAP.md` were already dirty before RELEASE-022. Read the diff and leave unrelated edits unstaged.

The commit must match the tree that passed section 6. Do not deploy uncommitted files.

### 4. Verify hosted migration history

`supabase db push --dry-run --linked`.

The only pending file must be `20261101120000_floor_command_standing_observation_policy.sql`. If another file is listed, stop. If this file is not listed, stop and reconcile `schema_migrations` before doing anything else. Do not delete a migration row.

### 5. Apply the migration once

This step needs a separate authorization. Until that authorization exists, stop here.

`supabase db push --linked` for that one pending file. Do not use `db query --file`. Do not run the file a second time. If the command fails, stop and use section 9. Do not propose a grant to "see if it worked."

### 6. Verify schema and preserved evidence

Read-only SQL:

- Both new tables exist.
- `schema_migrations` contains `20261101120000` once.
- `anon`, `authenticated`, and `service_role` have `SELECT` on both tables and do not have `INSERT`, `UPDATE`, or `DELETE`.
- Execute on the five lifecycle functions is `service_role` only.
- The handoff, request, history row, attempt, and claim count match step 1.
- `count(*)` from `floor_command_standing_policies` is 0.
- Task, commitment, block, and protected-time counts match step 1.

If the policy count is not 0, stop. Do not approve, revoke, or expire that row from this procedure.

### 7. Deploy the reviewed commit

This step needs a separate authorization. Deploy the commit from step 3. Do not set environment variables. Do not redeploy an older commit over it except through section 9.

### 8. Verify the alias

`https://orient-cyan.vercel.app` serves the new deployment. Record the new deployment id and confirm the commit sha. Status is Ready. The deployment id from step 1 is still available for a return.

### 9. Confirm the lifecycle is present and unused

Do not `POST` propose, approve, revoke, or expire.

- An unauthenticated `GET /api/integrations/floor-command/standing-policy` returns 401.
- The policy count is still 0. Only then may a signed-in `GET` of that route run. The response is `inspected` and the policy list is empty. If it is not empty, stop.
- Do not submit Observe this week. Do not call `POST /api/integrations/floor-command/observations` or `POST /api/integrations/floor-command/pull`.

### 10. Confirm no observation was created

The request count is still 1. The request id is still `879a61f2-6179-479b-a9ad-15f150db44d3`. Its state is still `unchanged`. History is still one `one_shot` row. Claims are still 0. The attempt is still `success_complete`.

### 11. Confirm the pull flag is still absent

The production environment name `ORIENT_FLOOR_COMMAND_PULL_ENABLED` is still absent. No new cron was added. The Pulse job is still the only scheduled database job for this concern, and its command still does not read Floor Command.

Then stop.

## 8. Production acceptance matrix

Reads are allowed in the later tranche. Writes in the last column are not part of preparation and are not authorized by this record.

| Check | How to read it | Pass | This preparation | Later write |
| --- | --- | --- | --- | --- |
| Migration present | `schema_migrations` version `20261101120000` once | One row after step 5 | Not applied to hosted Orient | The `db push` in step 5 |
| Deployment identity | Alias metadata | New deployment, commit from step 3, Ready | Local `HEAD` is still `b9cd3bd`; the policy is uncommitted | The deploy in step 7 |
| Handoff intact | Select the one handoff | Id, sequence `8`, revision `c3a29fab9de35ca0`, accepted and last-check timestamps unchanged, `checked_sequence` null | Proven on the fixture | None |
| Request intact | Select requests | One row, the recorded id, `unchanged` | Proven on the fixture | None |
| History intact | Select revisions | One `one_shot` row | Proven on the fixture | None |
| Latch spent | Select the attempt | `success_complete`, reason null | Proven. The ephemeral proof also called the claim function and got `already_succeeded` with claims still 0 | Do not call the claim function on hosted Orient. Read the attempt row |
| Orient-owned counts | `count(*)` on tasks, commitments, blocks, protected time | Equal to the step 1 counts | Fixture stayed 39 / 2 / 0 / 0 | None |
| Schema shape | Catalog and grants | Tables exist. No insert, update, or delete for the API roles. Execute is `service_role` only | Proven locally, including refused service-role insert and update | None |
| Authentication | Unauthenticated `GET` the policy route | 401 | Route test returned 401 without a session | The unauthenticated GET in step 9 |
| Scope | Policy count and, only if it is 0, a signed-in inspect | Count 0, then an empty list | Local lifecycle ended revoked, not approved | Do not POST a grant |
| No approved grant | `count(*)` where state = `approved` | 0 | Proven | Do not approve |
| No source read | Request count and claim count | Unchanged from step 1 | Proven. No published-week call | Do not call Floor Command |
| No new request | Request primary key | Still `879a61f2-6179-479b-a9ad-15f150db44d3` | Proven | Do not POST an observation |
| No scheduled work | `vercel.json` absent. Cron names unchanged | No Floor Command reader | No `vercel.json` in the working tree. Migration has no `cron.schedule` | None |
| No temporal mutation | Counts from step 1 | Unchanged | Fixture counts unchanged | None |
| Pull flag | Environment names | `ORIENT_FLOOR_COMMAND_PULL_ENABLED` absent | Not re-listed on 2026-11-01. RELEASE-021 recorded it absent | Do not set it |

## 9. Recovery and rollback

There is no down migration. Dropping the new tables is not part of this plan.

| Situation | What to do |
| --- | --- |
| Step 1 identity does not match the recorded ledger | Stop. Do not migrate. Re-read and write a new record. Do not "correct" the handoff |
| Pull flag name is present | Stop. Do not edit the variable |
| Dry-run lists any other file | Stop. Do not push |
| `db push` fails | Stop. Confirm the version is absent and `floor_command_standing_policies` is absent. Do not run the file again. Do not switch to `db query --file` |
| The file was applied with `db query --file` and stopped midway | Stop. Do not rerun it. Inspect which objects exist and whether `schema_migrations` lacks the version. A repair is a separate authorization |
| Migration succeeded and deploy failed | Leave the tables. They are empty if step 6 passed. Return the alias to the deployment id from step 1. Do not drop the tables and do not create a grant |
| A policy row exists in production | Stop. Do not approve it. Do not call inspect if it is approved and past `expires_at`, because inspect would write an expiry. Removal or revocation needs a separate authorization |
| Someone deployed the new commit before the migration | Observation `GET` can still read the existing columns. The new policy routes return 503 until the functions exist. Stop, return the alias if the migration is not authorized, or apply step 5 before any policy call if it is authorized. Do not paper over the 503 by setting the pull flag |
| A governed request count changes | Stop. Do not send another observation. Do not enable the pull flag |

A return to the previous deployment does not remove a committed migration. The previous application ignores the new tables. That is the rollback.

## 10. Remaining risks and blockers

1. Hosted Orient was not re-read on 2026-11-01, and the Supabase CLI was not available here. Step 1 and step 4 are blockers for the execution tranche until they pass. They are not a reason to apply the file from this record.
2. The local snapshot carries the recorded identities and empty assignment arrays. It is not the nine production assignment bodies. The hosted `SELECT` in step 1 is the check that the real row still matches the recorded identity. This tranche did not read that body.
3. `claim_id` on the fixture is a stand-in. The hosted request's `claim_id` was not in the RELEASE-019 table. Step 1 must not require the stand-in. It must require the request id, state, sequence, and revision.
4. The service-role key can pass any user id into the lifecycle functions. The route does not. Acceptance must not use that key to create a grant.
5. A platform owner can disable the guard. The application roles cannot.
6. Signed-in inspect writes an expiry for a due approved row. The production count has to be zero before that GET.
7. A grant may cover up to eight Sunday slots inside 70 days. Each slot has one publication opportunity and at most one reconciliation opportunity. Changing that to a single slot forever would be a different migration. This plan does not change it.
8. The pull flag still arms both the one-shot route and the governed route. This plan does not choose a replacement gate and does not turn the flag on. An approved policy still cannot observe while the flag is absent.
9. `accepted_new` and `revised` have not been production governed outcomes. This deploy must not be their first use.
10. The Pulse job remains scheduled for Pulse. It must not gain a Floor Command read.
11. The confirmed time zone in production was not re-read. If it is missing, propose returns `timezone_unconfirmed` and writes nothing. If it is a valid IANA zone other than `America/Denver`, the windows follow that zone. Denver is the proven calendar. The execution tranche does not need to propose in order to deploy.
12. Unrelated dirty journal text and untracked historical notes are easy to sweep into the commit. Step 3 exists to prevent that.

## 11. Recommendation

**GO** to request a separate production tranche that follows section 7 and stops at step 11.

**NO-GO** to apply `20261101120000` from this record.

**NO-GO** to deploy the working tree from this record.

**NO-GO** to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`.

**NO-GO** to approve a production standing grant, to call the published-week route, or to create a governed observation.

**STOP.** The policy remains local. Continuous observation is not active.
