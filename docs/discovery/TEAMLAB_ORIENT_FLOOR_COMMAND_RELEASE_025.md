# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-025

Controlled production deployment of the inert standing-observation policy from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_024.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_024.md). Executed 2026-11-02.

Migration `20261101120000` is applied once. Application commit `f987d44` is serving production. Zero standing-policy rows exist. No new governed observation was created. `ORIENT_FLOOR_COMMAND_PULL_ENABLED` is absent.

**GO** to treat this infrastructure deployment as accepted.

**NO-GO** to approve a production standing grant, to enable the pull flag, to call the published-week route, or to create a governed observation from this record.

Floor Command was not deployed. No recovery was required.

## 1. Reviewed release commit

`f987d4443993f3fe87c5947cd78a99f2e2af0f48`

Parent `b9cd3bd762a3dd3c7dd7e9390b556a0cad56e7d0`. Message: "Add inert standing observation policy for store 2587."

| Path | Role |
| --- | --- |
| `supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql` | Schema, guards, lifecycle functions |
| `server/floorCommand/standingPolicy.ts` | Session operator, confirmed zone, service-role RPC |
| `server/floorCommand/standingPolicyRoute.ts` | Same-origin POST, exact bodies |
| `app/api/integrations/floor-command/standing-policy/**` | Propose, inspect, approve, revoke, expire |
| `server/floorCommand/standingPolicy.test.ts` | Route and source-scan tests |
| `persistence/floorCommandStandingPolicy.pg.test.ts` | RELEASE-023 ephemeral proof |
| `persistence/floorCommandStandingPolicyDeployment.pg.test.ts` | RELEASE-024 ledger proof |
| `scripts/floor-command-standing-policy-*` | Ephemeral proofs |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_022.md` | Continuity contract |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_023.md` | Local implementation |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_024.md` | Deployment plan |
| `CHAT_HANDOFF.md`, `DEVELOPMENT_JOURNAL.md`, `MASTER_ROADMAP.md` | Program records through RELEASE-024 |

Excluded: dirty edits to older ORIENT-FLOOR-COMMAND-003/004/005 discovery notes, and untracked historical release notes `001`–`021`. Existing observation routes, governed observation code, and Floor Command were unchanged.

Before the commit: source scan of the policy modules was clean of a published-week path, the pull flag, the governed observer, the one-shot pull, `cron.schedule`, and `fetch(`. Vitest passed 8 tests across the standing-policy route tests, both ephemeral database proofs, and the governed observation regression. Typecheck, lint, and `next build` passed.

`origin/main` was `b9cd3bd` before the fast-forward and is `f987d44` after it.

## 2. Migration-tool availability and dry-run evidence

Supabase CLI was installed for this tranche as Homebrew formula `supabase/tap/supabase` version `3.0.0`. The linked project is `workday` / `ksmhgaamyheyhefbyglb`, the same Orient database recorded in RELEASE-014 and RELEASE-024.

`supabase db push --dry-run --linked` before apply:

| Fact | Value |
| --- | --- |
| Target | project workday (`ksmhgaamyheyhefbyglb`) · production |
| Pending migrations | only `20261101120000_floor_command_standing_observation_policy.sql` |
| Remote history | `20261029010000` present; `20261101120000` absent |

`supabase migration list --linked` showed the same sole local-only version: `20261101120000` with an empty remote column.

No alternate apply path was used. The runner was `supabase db push`.

## 3. Production preflight

Read before the migration. The published-week route was not called. No observation route was called with a session.

| Check | Result |
| --- | --- |
| Alias | `https://orient-cyan.vercel.app` → `dpl_LzEcF65D1qQ1SChttiDGPW43aWDh` / `orient-bhbr2jp72`, Ready |
| Production aliases | cyan, project, and git-main all on that deployment |
| Local / origin | `b9cd3bd` / `b9cd3bd` before the release commit |
| Pull flag name | `ORIENT_FLOOR_COMMAND_PULL_ENABLED` absent. Present names include `ORIENT_FLOOR_COMMAND_BASE_URL`, `ORIENT_FLOOR_COMMAND_STORE_NUMBER`, and `ORIENT_FLOOR_COMMAND_READ_TOKEN`. Values were not read |
| Migration `20261029010000` | 1 row |
| Migration `20261101120000` | absent |
| Policy tables | both `to_regclass` null |
| Handoff | `fc.zebra-handoff.2587.2026-W44`, sequence `8`, revision `c3a29fab9de35ca0` |
| Accepted | `2026-10-29T00:40:17.666Z` |
| `last_checked_at` | `2026-10-30T13:55:56.99807Z` |
| `checked_sequence` | null |
| Request | `879a61f2-6179-479b-a9ad-15f150db44d3`, `unchanged`, terminal at the last-check instant |
| History | 1 `one_shot` row, same revision and sequence |
| Attempt | `success_complete`, reason null, same accepted time |
| Claims | 0 |
| Tasks / commitments / blocks / protected time | 39 / 2 / 0 / 0 |

Floor Command production on record remains `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y`. It was not inspected again and was not changed.

## 4. Migration execution and verification

`supabase db push --remote --yes` applied `20261101120000_floor_command_standing_observation_policy.sql` once.

Immediate verification:

| Check | Result |
| --- | --- |
| `schema_migrations` version `20261101120000` | 1 row |
| Tables | `floor_command_standing_policies` and `floor_command_standing_policy_events` exist |
| Policy rows | 0 |
| Event rows | 0 |
| Lifecycle functions | propose, approve, revoke, expire, inspect all present |
| Execute grants | `service_role` true; `anon` and `authenticated` false |
| Table privileges | `authenticated` and `service_role` SELECT only; INSERT/UPDATE/DELETE false; `anon` none |
| Triggers | `floor_command_standing_policies_guard`, `floor_command_standing_policy_events_immutable` |
| Store/source/purpose checks | present on the policy table |
| Handoff / request / history / attempt | unchanged from section 3 |
| Orient-owned counts | 39 / 2 / 0 / 0 |
| Claims | 0 |
| Dry-run after apply | remote database up to date |
| Pull flag | still absent |

No second apply was run. No grant was proposed.

## 5. Deployment ID and alias verification

`git push origin HEAD` fast-forwarded `origin/main` from `b9cd3bd` to `f987d44`.

GitHub Vercel status for commit `f987d44` is `success` and points at deployment `3yWeB4kag8jwaKeZwWWLy4m7ewst`.

| Fact | Value |
| --- | --- |
| Deployment | `dpl_3yWeB4kag8jwaKeZwWWLy4m7ewst` |
| URL | `https://orient-g78y9addm-tyson-zauggs-projects.vercel.app` |
| Status | Ready, production |
| Created | 2026-11-02 14:39:24 MST |
| Commit | `f987d4443993f3fe87c5947cd78a99f2e2af0f48` |
| `https://orient-cyan.vercel.app` | this deployment |
| `https://orient-tyson-zauggs-projects.vercel.app` | this deployment |
| `https://orient-git-main-tyson-zauggs-projects.vercel.app` | this deployment |
| Previous Ready deployment | `dpl_LzEcF65D1qQ1SChttiDGPW43aWDh` remains listed and was not restored |
| Pull flag | absent |

Floor Command was not deployed.

## 6. Policy authorization checks

No production grant was created or approved.

| Check | Result |
| --- | --- |
| Unauthenticated `GET /api/integrations/floor-command/standing-policy` | 401 `{"status":"unauthorized"}` |
| Cross-site `POST` propose with a foreign Origin | 403 `{"error":"Cross-site request refused."}` |
| Policy table count after those calls | 0 |
| Event table count | 0 |

A signed-in inspect was not performed. The policy count was already 0, so an inspect would have returned an empty list without writing an expiry. This tranche left that signed-in call for a later operator session and did not mint a session here.

## 7. Observation integrity checks

| Check | Result |
| --- | --- |
| Unauthenticated `GET /api/integrations/floor-command/observation` | 401 `{"error":"Sign in is required."}` |
| Request count | 1 |
| Request identity | `879a61f2-6179-479b-a9ad-15f150db44d3`, `unchanged`, sequence `8`, revision `c3a29fab9de35ca0` |
| Handoff | unchanged acceptance and last-check timestamps; `checked_sequence` null |
| History | one `one_shot` row |
| Attempt | `success_complete`, reason null |
| Claims | 0 |
| Tasks / commitments / blocks / protected time | 39 / 2 / 0 / 0 |
| Cron | `orient-pulse-hosted-establishment` still `* * * * *`. No Floor Command job was added |
| Browser `/schedule` without a session | Orient loaded and stayed on session check. No observation was submitted |

Work's retained evidence was not re-rendered in a signed-in browser in this tranche. The observation API route is live under the same authentication boundary as before. Opening Work still cannot call Floor Command from this release; no client control for the standing policy was shipped.

## 8. Final policy and request counts

| Relation | Final count |
| --- | --- |
| `floor_command_standing_policies` | 0 |
| `floor_command_standing_policy_events` | 0 |
| `floor_command_observation_requests` | 1 |
| `floor_command_observation_handoff_revisions` | 1 |
| `floor_command_controlled_pull_claims` | 0 |

No approved grant. No new governed request. Pull flag absent.

## 9. Recovery actions

None. Migration verification passed before deploy. The new deployment reached Ready and took the production aliases. The previous deployment remains available if a later tranche needs to return the alias.

## 10. Assessment

**GO** to accept this production infrastructure. The standing-policy schema and routes are live. They do not observe.

**NO-GO** to approve a production standing grant from this record.

**NO-GO** to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`.

**NO-GO** to call the published-week route or to create another governed observation.

**STOP.** Continuous observation is not active. Zero production policy rows. Zero new governed observations. The pull flag remains absent.
