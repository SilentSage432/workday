# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-023

Standing observation grant. A persistent, operator-owned policy record and its lifecycle, implemented locally on 2026-11-01 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_022.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_022.md).

The policy is inert. Creating it, approving it, inspecting it, expiring it, or revoking it changes authority status only. None of those acts reads Floor Command.

**GO** to request a later deployment-preparation tranche whose only subject is this local migration.

**NO-GO** to apply the migration to hosted Orient, to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, to perform a published-week GET, to execute an observation, or to add a scheduler.

No Floor Command file changed. The pull flag was not set. No governed observation request was created. The production ledger was not re-read.

[TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_024.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_024.md) is the later deployment-preparation record. It does not apply this migration.

## 1. Implemented policy schema

Migration `supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql`.

Two tables. `floor_command_standing_policies` is the grant. `floor_command_standing_policy_events` is append-only provenance. There is no occasion queue. Derived windows are returned with `executable: false` so a later worker cannot treat a policy row as work.

### Grant row

| Field | Rule |
| --- | --- |
| `policy_id` | UUID, generated |
| `user_id` | The operator. References `auth.users` |
| `policy_version` | Integer at least 1. Unique per operator. The next proposal after a terminal grant takes `max(version) + 1` |
| `state` | `proposed`, `approved`, `expired`, or `revoked` |
| `source` | Check constraint, exactly `deptsync.floor-command.orient.v1` |
| `store_number` | Check constraint, exactly `2587` |
| `purpose` | Check constraint, exactly `orient_published_week_read` |
| `time_zone` | IANA name frozen from the operator's confirmed `temporal_settings` row at proposal time. The client cannot send it |
| `created_at` | Proposal time |
| `effective_at` | Operator-supplied instant. Must be at or after `now() - 1 minute`, and the span must still be open |
| `expires_at` | Required. Later than `effective_at`, later than `now()` at proposal, and at most 70 days after `effective_at` |
| `approved_at`, `approved_by` | Set together on approval. `approved_by` must be the owning operator |
| `revoked_at`, `revocation_reason` | Set together on revocation. Reason is 1–200 characters and contains no control characters |
| `expired_at` | Set when an approved grant passes `expires_at` |
| `max_publication_windows` | 1 through 8, and no greater than the Sunday slots inside the span. The first N slots are the permitted windows |
| `max_publication_per_window` | Fixed at 1 |
| `max_reconciliation_per_window` | Operator choice, 0 or 1 |
| `automatic_retry_limit` | Fixed at 0 |
| Publication slot | Fixed at Sunday 12:00 UTC, the existing Floor Command cron `0 12 * * 0` |
| Window rule flags | Forced true: publication closes at the next local midnight; reconciliation, when allowed, opens at that Monday midnight and closes at the following local midnight |
| Execution flags | Forced false: `source_publication_assumed`, `writes_floor_command`, `creates_orient_temporal_records`, `observes_arbitrary_weeks` |

One open grant per operator. A partial unique index covers `proposed` and `approved`. A second proposal while one of those states is open returns `policy_open`.

The client proposal body has exactly four keys: `effectiveAt`, `expiresAt`, `maxPublicationWindows`, and `reconciliationAllowance`. Instants are UTC timestamps. Store, source, purpose, and time zone are not accepted from the client. The SQL insert writes the three contract values itself.

### Provenance row

Each event stores `event_id`, `policy_id`, `user_id`, `event_type`, `policy_version`, `actor_user_id`, `occurred_at`, `reason`, and `scope`.

`scope` is a JSON object. For `proposed` and `approved` it is computed from the frozen row and the windows function. Approval compares the stored proposed scope with a fresh computation. A difference returns `scope_changed` and leaves the row proposed. For `expired` and `revoked`, the event copies the approved scope, or the proposed scope when revocation happens before approval. A later clock fact cannot replace the scope that was approved.

The scope object records the policy id, version, operator, source, store, purpose, time zone, effective and expiration instants, the four limits, the Sunday 12:00 UTC slot, the four execution flags as false, and the window list.

### Windows

`floor_command_standing_policy_windows` walks UTC dates in the span. A publication opportunity exists only when Sunday 12:00 UTC falls inside `[effective_at, expires_at)`.

That instant is interpreted in the policy time zone. The civil date must still be Sunday. A zone where Sunday 12:00 UTC is already Monday, such as `Pacific/Auckland`, is refused with `timezone_shifts_sunday`. An abbreviation such as `MST` is refused with `timezone_invalid`. A missing or unconfirmed `temporal_settings.time_zone` returns `timezone_unconfirmed` and does not call propose.

The publication window opens at that Sunday 12:00 UTC and closes at the next local midnight, which is the start of the Monday handoff date, or at `expires_at` when that is sooner. The operational week is the ISO week of that local Monday, the same naming rule as `sundayStagingWeekLabel`.

When the reconciliation allowance is 1 and the Monday midnight is still inside the span, one reconciliation window follows. It opens at that Monday 00:00 local and closes at the next local midnight, or at `expires_at` when that is sooner. The window says an outstanding Zebra task-entry confirmation would be required. It also says that fact is unknown: `outstanding_zebra_entry_known` is false. The policy does not read Zebra, and it does not treat the Sunday slot as proof that Floor Command published. `source_publication_assumed` stays false.

Every window carries `executable: false`.

The local proof checked two Denver instants directly:

| Slot | Zone offset | Publication close | Reconciliation close | Week |
| --- | --- | --- | --- | --- |
| 2026-10-25 12:00 UTC | MDT, UTC−6 | 2026-10-26 06:00 UTC | 2026-10-27 06:00 UTC | `2026-W44` |
| 2026-11-01 12:00 UTC | MST, UTC−7, after the 08:00 UTC fallback | 2026-11-02 07:00 UTC | 2026-11-03 07:00 UTC | `2026-W45` |

An allowance of 0 emits no reconciliation object.

### Authority shown on inspect

| State and clock | `authority` |
| --- | --- |
| `approved`, and `effective_at <= now() < expires_at` | `effective` |
| `approved`, and `effective_at` is still in the future | `pending` |
| `proposed`, `expired`, or `revoked` | `none` |

`effective` is a status word. It does not start a read.

## 2. Lifecycle and authorization rules

Authenticated operator routes, all `nodejs` and `force-dynamic`:

| Method and path | Act |
| --- | --- |
| `POST /api/integrations/floor-command/standing-policy` | Propose |
| `POST /api/integrations/floor-command/standing-policy/approve` | Approve one proposed id |
| `GET /api/integrations/floor-command/standing-policy` | Inspect, and expire any approved row whose `expires_at` has passed |
| `POST /api/integrations/floor-command/standing-policy/revoke` | Revoke a proposed or approved row, with a reason |
| `POST /api/integrations/floor-command/standing-policy/expire` | Expire one approved row whose `expires_at` has passed |

There is no execute, observe, or run route.

POST bodies are same-origin, using the existing Floor Command cross-site refusal. The session is the Supabase bearer through `requireAuthenticatedUserId`. The handler then calls the service-role function with `sessionForVerifiedOperator`. A malformed body is refused before authentication. An unauthenticated call returns `unauthorized`.

The database is the authority for transitions:

`proposed → approved`

`proposed → revoked`

`approved → revoked`

`approved → expired`

Any other transition raises `transition_forbidden`. Insert is allowed only as `proposed` with null approval, revocation, and expiry stamps. Delete raises `history_retained`. Update or delete of an event raises `events_immutable`.

Approval requires the row to still be `proposed`, the expiration instant to still be in the future, and the operator's binding to still be store `2587` with source `deptsync.floor-command.orient.v1` and purpose `orient_published_week_read`. A missing user, a user with no matching binding, and a binding for another store return `unauthorized` or `unbound`. Cross-operator approval returns `not_found`.

Revocation from either open state records the actor, the time, and the reason. A second revoke returns `not_revocable`. Expire before `expires_at` returns `still_effective` and leaves the row approved. After expiry, approve returns `not_proposed` and a second expire returns `not_expirable`.

Inspect lists every version for the operator, including expired and revoked history. While it holds the due rows, it moves each approved row with `expires_at <= now()` to `expired` and writes the expired event from the approved scope. That is a status transition. It is not a source read.

Material scope is frozen after insert: identity, contract, zone, instants, limits, slot, and execution flags. Changing any of them raises `scope_frozen`. A different limit or a different span is a new proposal, and it can be created only after the open grant is revoked or expired. The new row needs its own approval.

Concurrent approve and revoke are both legal while the row is proposed, and revoke remains legal after approval. The proof races both calls. The only stable final state is `revoked`, with at most one approved event and exactly one revoked event.

HTTP status: 200 for `proposed`, `approved`, `expired`, `revoked`, `inspected`, and `still_effective`; 401 for `unauthorized`; 403 for `unbound`; 400 for a bad window, a bad reason, or a bad zone; 409 for `timezone_unconfirmed`, `policy_open`, `not_proposed`, `not_revocable`, `not_expirable`, `elapsed`, `scope_changed`, and `not_found`; 503 when the service is unavailable. The response mapper drops a payload whose windows are executable, whose store or contract is wrong, whose retry limit is not 0, or whose execution flags are true.

## 3. Explicit non-execution guarantees

- The lifecycle functions do not insert into `floor_command_observation_requests` and do not call `claim_floor_command_controlled_pull` except where the proof itself calls the claim to show the latch is unchanged.
- Their source, scanned in the ephemeral database, does not contain `floor_command_observation_requests`, `published-week`, `pg_net`, `cron.schedule`, or `http_get`.
- The policy TypeScript and this migration do not contain `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, `observeGovernedFloorCommandWeek`, `pullFloorCommandPublishedWeek`, `cron.schedule`, or a `fetch(` call. The unit test stubs `fetch` and expects it to stay uncalled.
- A missing time zone returns `timezone_unconfirmed` after reading `temporal_settings` only.
- Approval writes `approved` and an approved event. It does not open a governed request.
- Windows are derived facts with `executable: false`. Nothing in this tranche selects approved policies in order to read Floor Command.
- No `vercel.json` was added in Orient. No cron, webhook, retry loop, or background reader was added.
- The policy cannot write Floor Command, cannot create an Orient task, commitment, block, or protected-time row, and cannot name an arbitrary week as authority. The week strings inside windows are labels for the Sunday slots that fall in the approved span.
- Passing Sunday 12:00 UTC does not set `source_publication_assumed`.
- The one-shot attempt row stays `success_complete`. After approval, `claim_floor_command_controlled_pull` still returns `already_succeeded` and inserts no claim.
- The existing `POST /api/integrations/floor-command/observations` body remains `{ week }` only. This tranche does not call it.
- No policy action sets the pull flag. The flag remains the gate on the existing reader, and this tranche does not turn it on.

The proof's request count stayed 0 across proposal, approval, revocation, expiry, inspection, and the concurrent race. The pull-claim count for the owner stayed 0.

## 4. Migration details

File: `supabase/migrations/20261101120000_floor_command_standing_observation_policy.sql`.

Applied only to an ephemeral local PostgreSQL cluster by `scripts/floor-command-standing-policy-regression.sh`. The cluster is created with `initdb`, listens on `ORIENT_PG_STANDING_POLICY_PORT` (default `55456`), and is deleted on exit. The script applies the existing observation, sequence, approval, claim, and governed migrations first, then this file. It was not applied to hosted Orient. No production connection string was used.

The migration enables row level security, revokes table DML from `public`, `anon`, `authenticated`, and `service_role`, and grants `SELECT` to `authenticated` and `service_role`. Select policies allow a row only when `user_id` is `auth.uid()`. There is no insert, update, or delete policy.

`propose_floor_command_standing_policy`, `approve_floor_command_standing_policy`, `revoke_floor_command_standing_policy`, `expire_floor_command_standing_policy`, and `inspect_floor_command_standing_policies` are security definer. Execute is revoked from `public`, `anon`, and `authenticated`, and granted to `service_role`. The window, scope, view, and record helpers are not granted to `service_role`.

A valid proposal must contain at least one Sunday 12:00 UTC slot, so a test cannot propose a grant that is already expired. The expiry proof therefore commits an approved grant, then in a later transaction disables `floor_command_standing_policies_guard` as the database owner, sets `expires_at` one millisecond before `now()`, and re-enables the trigger. The application role cannot do that. The expired event still copies the approved scope, which the proof compares for equality. An application update of `max_reconciliation_per_window`, a delete of the policy, an update of an event, and a state rewind from `revoked` or `expired` back to `approved` are all rejected.

Deleting an `auth.users` row that owns a policy would also hit `history_retained` before the cascade. This tranche does not delete operators.

## 5. Security review

The routes reuse the governed observation controls: same-origin POST, bearer session, service-role RPC, and no client-supplied store. The binding check is stricter than the binding table. The binding table allows the published-week source and purpose for a store the credential names. This policy additionally requires store `2587`. A binding for store `1999` returns `unbound` and writes no row.

Propose takes an advisory transaction lock on the operator id before the open-grant check. A unique violation on the partial index also returns `policy_open`.

Scope approval is the proposed event's JSON compared with a recomputation. JSON equality ignores key order. A mismatch refuses approval. Expiration and revocation then keep that approved object rather than deriving a new one.

The scope is passed through `floor_command_observation_json_forbidden` before the event insert. The response mapper rejects executable windows and any true execution flag, so a drifted row cannot be presented as an authorized read.

`authenticated` cannot execute propose or approve. The proof sets the role inside a block and expects `insufficient_privilege`.

The policy table has no `operational_week`, `weeks`, `bearer`, `token`, or `credential` column. The route responses in the unit test do not contain those secret words.

Inspect's expiry of due rows is the operator's own GET. It does not accept a week, a store, or a source. It cannot be used as a generic execution endpoint.

What this review does not change: the pull flag still arms both the one-shot route and the governed observation route. This policy does not replace that gate. A future executor would be a new use of `service_role` and is not present here.

## 6. Local test evidence

Run on 2026-11-01 in `/Users/silentsage/Desktop/workday`.

Ephemeral policy proof, `bash scripts/floor-command-standing-policy-regression.sh`, exit 0, port 55456. Markers:

`UNAUTHORIZED_POLICY_OK`, `INVALID_SCOPE_OK`, `APPROVAL_EXPLICIT_OK`, `REVOKE_DURABLE_OK`, `EXPIRE_TERMINAL_OK`, `SCOPE_FROZEN_OK`, `NO_OBSERVATION_REQUEST_OK`, `NO_SOURCE_READ_OK`, `WINDOWS_LOCAL_OK`, `CONCURRENT_POLICY_OK`, `STANDING_POLICY_OK`.

Vitest 4.1.11, `npx vitest run server/floorCommand/standingPolicy.test.ts persistence/floorCommandStandingPolicy.pg.test.ts persistence/floorCommandGovernedObservation.pg.test.ts`:

3 files, 7 tests, all passed. The standing-policy file covers unauthenticated refusal, a body that tries to choose the store, approval, revocation, expiry, a missing time zone that does not call propose, and the source scan. The standing-policy database file re-ran the script above and required every marker. The existing governed observation file re-ran `scripts/floor-command-governed-observation-regression.sh` on port 55454 and required `GOVERNED_OBSERVATION_OK` together with its existing outcome markers. That governed script was not edited.

`npm run typecheck` (`next typegen && tsc --noEmit`) passed.

`npm run lint` passed.

`npm run build` (Next.js 16.3.8) compiled, finished TypeScript, and generated the pages. The new routes are dynamic:

- `/api/integrations/floor-command/standing-policy`
- `/api/integrations/floor-command/standing-policy/approve`
- `/api/integrations/floor-command/standing-policy/revoke`
- `/api/integrations/floor-command/standing-policy/expire`

The build also listed the existing observation, approval, and pull routes. This tranche did not deploy that build.

## 7. Compatibility with the existing governed observation path

The governed route, classifier, history trigger, lease, and one-shot claim function are unchanged. The regression that proves `accepted_new`, `unchanged`, `revised`, unpublished rejection, sequence conflict, failure, the claim fence, unauthorized SQL, and concurrent requests passed after this migration was added to the policy cluster and, separately, in its own cluster without this migration.

The policy cluster inserts one `success_complete` attempt for the owner and then shows that approval leaves `claim_floor_command_controlled_pull` at `already_succeeded`.

Opening Work still uses `GET /api/integrations/floor-command/observation`. No Work control was added for this policy. A standing grant is not a substitute for the explicit named-week POST. That POST remains the only implemented observation, and it still returns `disabled` unless the pull flag is exactly `1`. The flag was not enabled.

`accepted_new` and `revised` stay locally tested outcomes. This policy does not put them into production.

## 8. Remaining design decisions

1. The governed route still refuses every observation unless the pull flag is exactly `1`, and that same name still arms the one-shot route. This tranche does not choose a replacement gate and does not turn the flag on.
2. RELEASE-022 left the publication-window length open. This tranche closes it for the policy record: Sunday 12:00 UTC through the next local midnight, with at most one reconciliation window through the following local midnight when the operator sets the allowance to 1. An executor, if one is ever authorized, has to honor these instants.
3. Automatic retry is fixed at 0. No `minimum_gap` is stored, because no second GET is authorized by this record.
4. The reconciliation window does not know whether a Zebra task-entry confirmation is outstanding. A later reader would have to learn that from a governed snapshot. This policy cannot start that read.
5. Which `revised` fields deserve attention, and how Work would say so, is still open. No attention sentence and no notification were added.
6. Associate-name retention in observation history is unchanged. Policy rows do not copy those names.
7. A fully cleared Floor Command week remains unpublished. This tranche does not change that producer rule.
8. The production ledger, credential, and pull-flag absence were not re-read on 2026-11-01. They remain the RELEASE-019 and RELEASE-021 records.
9. `accepted_new` and `revised` have not been production governed outcomes. A standing grant must not be their first production use.
10. The agent contracts in RELEASE-022 section 10 remain names. This policy grants a future assistant nothing: no bearer, no service-role use, and no temporal write.
11. Hosted application of `20261101120000` is a separate decision. Local success on an empty cluster is not that decision.

## 9. Recommendation for a deployment-preparation tranche

**GO** to request a later tranche that prepares deployment of this migration only: review the hosted schema order, confirm the production ledger again, and leave the pull flag absent. That tranche may plan the apply. It may not execute an observation.

**NO-GO** to apply `20261101120000` to hosted Orient from this record.

**NO-GO** to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`.

**NO-GO** to call the published-week route, to create a governed request, or to treat an approved policy as authority to observe.

**NO-GO** to add a scheduler, a webhook, a retry, or an executor.

**STOP.** The grant exists only on the local migration and the ephemeral proof. Continuous observation is not active.
