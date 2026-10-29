# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-014

Deployment compatibility and release plan for the local governed multi-observation implementation in [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_013.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_013.md). Written 2026-10-28.

Read-only inspection, an isolated database, and local checks. No hosted migration, deployment, production observation, flag change, credential change, or Floor Command change.

The published-week endpoint was not called. No Orient observation route was called.

**NO-GO** to migrate, deploy, enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, or observe under this record.

**GO** to request a later production tranche that follows section 6 exactly, starts from a reviewed commit of this working tree, and stops while the pull flag is still absent.

## 1. Verified deployment baseline

Read on 2026-10-28 from Vercel deployment metadata, Vercel environment names, and read-only SQL. Values of environment variables were not read. The Floor Command token hash was not read.

| Fact | Verified value |
| --- | --- |
| Orient deployment | `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK`, Ready, production |
| Orient alias | `https://orient-cyan.vercel.app` |
| Orient commit | `7a1fbfbd92ae026d97448bc821ea403fa20ed96b` on `main` |
| Orient deploy | CLI redeploy of that commit. Created Wed Oct 28 2026 18:40:37 GMT-0600 |
| Floor Command deployment | `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y`, Ready, production |
| Floor Command commit | `ac533ebcb9a188e8726eda6ba96ec5da1332915e` |
| Orient database | `ksmhgaamyheyhefbyglb` |
| Floor Command database | `fmeinlwhixngednabhgy` |

`supabase db push --dry-run --linked` against Orient reported one pending file and did not push it: `20261029010000_floor_command_governed_observation.sql`. Remote history already contains `20261024210000`, `20261024220000`, `20261024230000`, and `20261024240000`. `20261029010000` is absent remotely.

Hosted Orient, read without selecting snapshot bodies:

| Relation | Count |
| --- | --- |
| `floor_command_observation_bindings` | 1 |
| `floor_command_observation_handoffs` | 1 |
| `floor_command_observation_attempts` | 1 |
| `floor_command_observation_dismissals` | 0 |
| `floor_command_controlled_pull_claims` | 0 |
| `tasks` | 39 |
| `commitments` | 2 |
| `blocks` | 0 |
| `protected_time` | 0 |
| `floor_command_observation_requests` | table absent |
| `floor_command_observation_handoff_revisions` | table absent |

The handoff is `fc.zebra-handoff.2587.2026-W44`, store `2587`, week `2026-W44`, revision `c3a29fab9de35ca0`, sequence `8`, accepted `2026-10-29T00:40:17.666+00`, publication `published`, required `9`, confirmed `6`, outstanding `3`. `zebra_task_completed` true inside entries is `0`. Snapshot JSON is an object. Superseded assignments and retained deadlines are arrays. `last_checked_at` and `checked_sequence` are not columns. `open_floor_command_governed_observation` is not installed. `claim_floor_command_controlled_pull(uuid, uuid)` is installed.

The attempt is `success_complete`, reason null, with the same accepted timestamp. The binding is store `2587`, source `deptsync.floor-command.orient.v1`, purpose `orient_published_week_read`.

Credential `1a418da4-1926-4c69-b6f9-334b55b82828` is store `2587`, purpose `orient_published_week_read`, `revoked_at` null, and `expires_at` null.

Production environment names:

| Name | Production |
| --- | --- |
| `ORIENT_FLOOR_COMMAND_READ_TOKEN` | present |
| `ORIENT_FLOOR_COMMAND_STORE_NUMBER` | present |
| `ORIENT_FLOOR_COMMAND_BASE_URL` | present |
| `ORIENT_FLOOR_COMMAND_PULL_ENABLED` | absent |

The only cron name returned for a Floor Command or Pulse filter is `orient-pulse-hosted-establishment`. Its command does not contain `floor_command` or `published-week`. The deployed commit has no `vercel.json`. The governed code adds no scheduler and no webhook.

Local `HEAD` is that same Orient commit. The governed application is an uncommitted working tree. Production does not contain `POST /api/integrations/floor-command/observations`.

## 2. Schema compatibility

`20261029010000_floor_command_governed_observation.sql` adds:

- Nullable columns `last_checked_at` and `checked_sequence` on `floor_command_observation_handoffs`.
- `floor_command_observation_requests`, with one in-flight row per operator and a terminal-state check.
- Append-only `floor_command_observation_handoff_revisions`, primary key `(user_id, handoff_id, source_revision)`, origin `one_shot`, `accepted_new`, or `revised`.
- An immutability trigger on that history table.
- `open_floor_command_governed_observation` and `commit_floor_command_governed_observation`, granted to `service_role` only.
- One `INSERT ... SELECT` that copies every existing handoff into history with origin `one_shot`.

The file does not mention `floor_command_observation_attempts`, `claim_floor_command_controlled_pull`, `persist_floor_command_observation`, `tasks`, `commitments`, `blocks`, or `protected_time`.

The hosted row satisfies the history constraints: one handoff, so the history primary key cannot collide with itself; snapshot, superseded assignments, and retained deadlines have the required JSON types; the accepted timestamp is not null; sequence `8` matches the numeric pattern copied into `source_sequence`.

The migration is safe to apply once. It is not idempotent. A second execution fails on the first `ALTER TABLE` because the column already exists. That failure happens before the history `INSERT`, so a repeated run of the whole file does not add a second history row. The history `INSERT` has no `ON CONFLICT`. Do not extract that statement and run it again.

There is no `CREATE INDEX CONCURRENTLY` and no other statement that PostgreSQL refuses inside a transaction. `supabase db push` is the runner that both applies the file and records `20261029010000`. Do not apply it with `db query --file`. That path does not write `schema_migrations`, which is how `20261024240000` had to be repaired in RELEASE-006, and it can commit statement by statement.

The data work is one nullable column add and a copy of one handoff. `ADD COLUMN` of a nullable column without a default takes a brief lock on `floor_command_observation_handoffs`. It does not rewrite the row. The copy does not `UPDATE` the handoff or the attempt.

The deployed application selects this handoff column list and no new columns:

`user_id, handoff_id, store_number, operational_week, week_starting, week_ending, source_revision, source_updated_at, last_successful_observed_at, deadlines_availability, snapshot, superseded_assignments, retained_deadlines`

That select still works after the columns exist. The deployed persist statement names its own columns, so it leaves `last_checked_at` and `checked_sequence` null. The old application does not call the new functions and does not read the new tables. It remains compatible after the migration.

The new application is not compatible before the migration. `loadFloorCommandObservationStore` selects the two new columns, and `loadFloorCommandGovernedRequests` selects `floor_command_observation_requests`. Deploying it first makes `GET /api/integrations/floor-command/observation` fail.

## 3. Backfill evidence

`scripts/floor-command-governed-backfill-compatibility.sh` used an ephemeral database on port `55455`. It applied the four hosted observation migrations, then inserted stand-in Orient-owned tables and one pre-migration handoff for operator `a499dd01-095e-4bb0-8db9-c284c34a2ab2`, store `2587`, week `2026-W44`, sequence `8`, revision `c3a29fab9de35ca0`, accepted `2026-10-29T00:40:17.666Z`, attempt `success_complete`. The fixture snapshot carries those identities. It is not a copy of the nine production assignments. The hosted JSON types in section 1 are what make the production copy valid.

| Relation | Before | After |
| --- | --- | --- |
| `tasks` | 39 | 39 |
| `commitments` | 2 | 2 |
| `blocks` | 0 | 0 |
| `protected_time` | 0 | 0 |
| `bindings` | 1 | 1 |
| `handoffs` | 1 | 1 |
| `attempts` | 1 | 1 |
| `claims` | 0 | 0 |
| `requests` | absent | 0 |
| `revisions` | absent | 1 |

After the migration the history row was origin `one_shot`, sequence `8`, revision `c3a29fab9de35ca0`, observed `2026-10-29T00:40:17.666Z`. The working handoff kept that revision, sequence, and accepted time. `last_checked_at` and `checked_sequence` stayed null. The attempt stayed `success_complete` with a null reason. `claim_floor_command_controlled_pull` returned `already_succeeded` and left claims at `0`.

Running the migration file again failed because the column already exists. History stayed at 1 row.

## 4. Endpoint security

`POST /api/integrations/floor-command/observations` is the new route. `POST /api/integrations/floor-command/pull` is unchanged.

Both routes refuse a cross-site browser post and a body that is not exactly `{week}`. The session supplies the operator. The binding supplies store, source, and purpose. The server does not accept a caller-chosen store or week other than the one ISO week in the body.

The pull flag is read before any request row and before any fetch. Absent, or any value other than the exact characters `1`, both routes return `disabled` and do not insert a governed request. The old route does not reach its claim while the flag is off.

When the flag is on, the old route claims first. For this operator, `success_complete` makes that claim return `already_succeeded` before the GET. The new route then opens one database request and performs one GET: `redirect: "manual"`, `cache: "no-store"`, an 8-second timeout, and no retry. A bearer that appears in the response body is not sent to SQL. Classification is `commit_floor_command_governed_observation`. A mismatched or expired claim writes nothing. Unpublished weeks, including sequence `0`, are `rejected` and do not become handoffs. An equal revision records `last_checked_at` and does not replace the snapshot. A newer eligible revision appends the previous snapshot, then replaces the working row. Failure leaves the last accepted handoff.

The new functions do not insert tasks, commitments, blocks, or protected time. They do not update the attempt row. The route response does not contain the bearer. The server file does not log it.

The flag is the kill switch for both routes, not the authorization to observe. Turning it on arms the new route for the next explicit POST. It does not reopen the one-shot latch for this operator, but it does make a governed POST perform a live GET. Leave it absent through deployment. A later observation needs its own authorization after the disabled checks pass.

## 5. Local verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run lint` | passed, no findings |
| `npm run build` | passed. Local route table includes `/api/integrations/floor-command/observations`. This build was not deployed |
| Floor Command vitest | 10 files, 65 tests, passed. Includes the governed ephemeral suite and the existing one-shot suite |
| Backfill script | passed. Counts are section 3 |

Vitest printed a Node warning that `--localstorage-file` had no path. npm printed a `devdir` warning. Neither failed a check.

Not tested, and not substitutes for production verification:

- The full Orient vitest suite.
- A signed-in browser session on Work.
- Any production call to `/observation`, `/observations`, or `/pull`.
- Applying `20261029010000` to hosted Orient.
- The nine production assignment bodies inside the local fixture. Hosted JSON types were read; the bodies were not copied out.

## 6. Migration-first deployment procedure

Do not run this procedure under RELEASE-014. A later authorization has to name it. Stop at the first failed check.

1. Confirm the baseline in section 1 is still true: Orient `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK` / `7a1fbfbd92ae026d97448bc821ea403fa20ed96b`, one `2026-W44` handoff at sequence `8` / `c3a29fab9de35ca0`, attempt `success_complete`, claims `0`, requests and revisions tables absent, pull flag absent, tasks `39`, commitments `2`, blocks `0`, protected time `0`.
2. Create the reviewed commit from this working tree. The commit must contain the migration and the application together. Do not deploy uncommitted files. Do not include `.env` files.
3. From the workday repository, run `supabase db push --dry-run --linked`. The only pending migration must be `20261029010000_floor_command_governed_observation.sql`. If any other file is listed, stop.
4. Run `supabase db push --linked` for that file only. Do not use `db query --file`.
5. Read back, without selecting snapshot bodies: history count `1`, origin `one_shot`, sequence `8`, revision `c3a29fab9de35ca0`, observed `2026-10-29T00:40:17.666+00`, working handoff unchanged, `last_checked_at` null, attempt still `success_complete`, claims `0`, requests `0`, and the four Orient-owned counts unchanged. `claim_floor_command_controlled_pull` for the bound operator must return `already_succeeded` and must not insert a claim. This SQL call does not fetch Floor Command. Do not prove the latch by enabling the flag and posting to `/pull`.
6. Deploy that reviewed commit to Orient production. The migration must already be committed in the database.
7. Confirm the new deployment is Ready and holds `https://orient-cyan.vercel.app`. Confirm `ORIENT_FLOOR_COMMAND_PULL_ENABLED` is still absent. Do not set it.
8. With a signed-in operator, open Work and record the browser requests. The page may call `GET /api/integrations/floor-command/observation`. It must not call `/observations`, `/pull`, or the Floor Command published-week URL. The retained `2026-W44` handoff must still be visible.
9. `POST /api/integrations/floor-command/observations` with body `{"week":"2026-W44"}` from the production origin. Expect `disabled`. Then confirm `floor_command_observation_requests` is still `0`. If a request row exists, stop. Do not submit the week control again.
10. Stop. Do not enable the flag. Do not observe `2026-W44` or `2026-W45`.

## 7. Disabled-state acceptance matrix

These are the checks for the later tranche. This tranche executed only the rows marked here.

| Check | Safe method | This tranche |
| --- | --- | --- |
| Pull flag absent | Vercel environment names, values unread | Done. The name is absent |
| Retained evidence still stored | SQL identity columns, not the published-week route | Done. Section 1 |
| Latch still spent | `claim_floor_command_controlled_pull` returns `already_succeeded` and claims stay `0` | Proved on the isolated database. Do it on the hosted database only after the migration, still without a GET |
| Work shows the handoff and does not observe | Signed-in Work, network log has no published-week request | Not run. Would be step 8 |
| New route disabled and writes nothing | One same-origin POST while the flag is absent, then `requests` count `0` | Not run. The route is not deployed. Would be step 9 |
| Old route does not GET while the flag is absent | Do not enable the flag to find out. The code returns `disabled` before claim and before fetch | Not called in production |
| No new scheduler or webhook | Cron command text and the deployed tree | Done. Pulse cron does not mention Floor Command. No `vercel.json` |

## 8. Rollback and recovery

No rollback was executed.

| Situation | Action |
| --- | --- |
| `db push` fails | The runner's transaction rolls the file back and does not record the version. The current deployment keeps serving. Fix the cause and push the same file. Do not delete the handoff or the attempt |
| Migration succeeds, deploy never starts | Leave the schema. The current deployment's column list still works. History holds the `one_shot` copy. Do not drop it |
| Deploy fails before the alias moves | Production stays on `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK`. Same as the row above |
| New deployment is aliased and then faults | Point the alias back at `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK`. That application does not select the new columns. Leave the tables and the history row |
| New deployment is healthy and the flag is absent | This is the intended stop. Disabled POSTs do not create requests. No rollback is required |
| Someone deployed the new application before the migration | `GET /observation` will fail on the missing column or table. Recovery is to apply the migration, or to return the alias to `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK`. Do not drop observation rows to make the error stop |

Never, as a rollback:

- Delete or update the `2026-W44` handoff.
- Delete the `success_complete` attempt.
- Delete the `one_shot` history row, or `UPDATE` it. The trigger rejects that update.
- Drop `floor_command_observation_handoff_revisions` after the copy exists.
- Set the pull flag in order to test the old route.
- Revoke the credential.

There is no down migration. A destructive schema reversal would be a separate authorization and is not part of this plan.

## 9. Remaining risks

- The governed code is uncommitted. Deploying `main` as it exists on the remote deploys `7a1fbfb` without this behavior. The later tranche has to commit first.
- A lost response after a future live GET, plus another POST, is a second request. The flag has to stay off so that case cannot happen during deployment.
- The old pull route can still accept an unpublished week for an operator who has not yet succeeded. This operator has succeeded. Do not delete that attempt.
- Enabling the flag arms governed POSTs even though this operator's one-shot route stays latched.
- The local fixture does not reproduce the nine production assignment bodies. The hosted JSON types were checked; the copy itself has not run on hosted data.
- Work's new sentences ship only with the new deployment. Until that deploy, production Work still uses the previous wording.
- `orient-pulse-hosted-establishment` remains scheduled for Pulse. It does not read Floor Command. Do not reuse it as an observation trigger.

## 10. Recommendation

**NO-GO** to migrate, deploy, enable the pull flag, or observe from RELEASE-014.

**GO** to request a separate production tranche whose authority is section 6 and nothing beyond it. That tranche commits this tree, pushes only `20261029010000`, deploys that commit after the migration, proves the disabled matrix, and stops with the pull flag absent.

**STOP.**
