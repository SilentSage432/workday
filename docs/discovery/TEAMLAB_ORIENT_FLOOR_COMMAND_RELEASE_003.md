# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-003

**Status:** Activation plan only. The check-then-write latch below is not sufficient. RELEASE-004A now has a local claim migration; application Gate A has not resumed. No production write, credential, environment change, approval binding, deployment, or live pull was performed. Canonical follow-up: [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md).

**Date:** 2026-10-27

**Recommendation:** **GO** for a separate local implementation tranche (Gate A). **NO-GO** for Gate B and every later gate until that gate's own prerequisites are met. Live integration remains off.

Floor Command keeps assignments, section ownership, Zebra entry confirmations, deadlines, and operational history. Orient keeps temporal orientation, Work, Commitments, Blocks, Protected Time, Tasks, Stewardship, Active Threads, and Pulse. A retained observation is evidence. It is not authority to assign, confirm, clear, or complete work in either system.

## 1. Verified production baselines

Re-read on 2026-10-27. The expected identities are the live identities. Planning continues on these baselines.

### Floor Command

| | Live value |
| --- | --- |
| Alias | https://deptsync-hub.vercel.app |
| Deployment | `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y`, Ready, production, source `cli` |
| Deployment URL | https://deptsync-g9l1b5eap-tyson-zauggs-projects.vercel.app |
| Recorded SHA | `ac533ebcb9a188e8726eda6ba96ec5da1332915e` |
| Recorded message | `Let the published-week route authenticate its own bearer.` |
| Created | 2026-10-27T03:33:19Z |
| Database | `fmeinlwhixngednabhgy`, PostgreSQL 17.6 |
| Local branch that contains the SHA | `release/floor-command-orient-001` |
| Local `main` | `404ea00a70100218044bac8bbfbe216696198214`. This is not the deployed app. |

Vercel deployment metadata carries that SHA. GitHub's Production deployment list still ends at `9aec9f9` / deployment `7284842692`, because this release was uploaded by the CLI. The alias inspect is the live identity. GitHub does not currently have commit `ac533eb`.

Unauthenticated probes, with no bearer and no cron secret:

| Request | Result |
| --- | --- |
| `GET /api/integrations/floor-command/published-week?week=2026-W44` | 401 `{"error":"unauthorized"}` |
| `HEAD` on that path | 401, empty body |
| `POST` on that path | 401 `{"error":"Unauthorized"}` |
| `GET .../published-week/extra` | 401 `{"error":"Unauthorized"}` |
| `GET /api/store-locations` | 401 `{"error":"Unauthorized"}` |
| `GET /api/cron/weekly-rotation` | 401 `{"error":"Unauthorized"}` |
| `GET /dashboard` | 307 to `/login?next=%2Fdashboard` |
| `GET /login` | 200 |

The lowercase `unauthorized` body is the integration handler. The capital `Unauthorized` body is the hub gate, except the cron route, whose own handler uses that capital form. The published-week GET therefore reaches its own authentication handler.

### Orient

| | Live value |
| --- | --- |
| Alias | https://orient-cyan.vercel.app |
| Deployment | `dpl_8wHGrY4J1mZu51fCJgv5h6qKdz9M`, Ready, production, source `git` |
| Deployment URL | https://orient-o5qm96ei9-tyson-zauggs-projects.vercel.app |
| SHA | `e44953b181b612fbefe8661eb58c0366f324589e` |
| Git source | GitHub `main`, commit message `ORIENT-FLOOR-COMMAND-005: show the retained Floor Command week beside Work without pulling it.` |
| GitHub Production | `7351184912`, created 2026-10-27T05:32:26Z |
| Created | 2026-10-27T05:31:49Z |
| Expected database | `ksmhgaamyheyhefbyglb` |
| Local `main` and `origin/main` | The same SHA |

`GET /api/integrations/floor-command/observation` with no session returned 401 `{"error":"Sign in is required."}`. `GET /` and `GET /instrument` returned 200.

### Verification gaps that are not observed drift

The Supabase token that read Floor Command is not authorized to query `ksmhgaamyheyhefbyglb`. This session did not re-count Orient's observation tables or Orient's Tasks, Commitments, Blocks, or Protected Time. The last count is RELEASE-002: bindings, handoffs, attempts, and dismissals were 0 after the dark deploy.

This session did not re-list Vercel environment names. RELEASE-002 recorded that production omitted `ORIENT_FLOOR_COMMAND_READ_TOKEN`, `ORIENT_FLOOR_COMMAND_STORE_NUMBER`, `ORIENT_FLOOR_COMMAND_BASE_URL`, and `ORIENT_FLOOR_COMMAND_PULL_ENABLED`.

The deployed Orient source still refuses `https://deptsync-hub.vercel.app` as a base URL, and no HTTP route calls the pull. A base URL set to that host would still be treated as unconfigured until the allowlist change in Gate A is deployed. Gate B must re-read the Orient database counts and re-list those four names before that code ships.

## 2. Signed-in Work acceptance

The operator reports that the signed-in Work checklist from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_002.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_002.md) passed:

1. Sign in.
2. Open Work. The Floor Command disclosure is closed. Its summary says Floor Command is not approved.
3. The schedule still loads and week navigation still works.
4. No request goes to `deptsync-hub.vercel.app`.
5. No Task, Commitment, Block, or Protected Time is created from the disclosure.

That report is the operator's observation of the UI. This session did not watch the signed-in browser and did not capture its network log. Absence of an outbound Floor Command request during that session has not been technically verified.

Independent evidence from this session:

- The signed-out observation route returns 401 and its source, `loadFloorCommandWorkReading`, does not call Floor Command.
- The ten scripts referenced by the signed-out homepage include `/api/integrations/floor-command/observation`. They do not include `pullFloorCommandPublishedWeek`, `approveFloorCommandConnection`, `ORIENT_FLOOR_COMMAND_READ_TOKEN`, `deptsync-hub.vercel.app`, or `/api/integrations/floor-command/pull`.
- The deployed Work view is a closed `<details>` element. The unapproved summary in source is `Floor Command · not approved`. The sentence inside it is `Floor Command is not approved for this account.` The Floor Command link renders only for a visible retained handoff.
- There is still no production route that can start a pull.

The signed-out script list does not prove what additional chunks a signed-in Work view loaded. Schedule navigation and the disclosure sentence were not exercised by this inspection.

## 3. Activation blockers

All of the following are true on deployed `e44953b`.

### The production origin is refused

`usableBaseUrl` in `server/floorCommand/config.ts` returns null when the hostname is `deptsync-hub.vercel.app`. `describeFloorCommandConnection` then returns `{ status: "unconfigured" }`. The same function accepts other HTTPS origins and local HTTP, strips the value to `url.origin`, and rejects embedded usernames and passwords. The refusal is covered by `server/floorCommand/connection.test.ts`.

### The pull has no production-callable route

`pullFloorCommandPublishedWeek` is exported from `server/floorCommand/pull.ts` and is called by tests. The only Floor Command HTTP route is `GET /api/integrations/floor-command/observation`. That route loads the retained reading. `components/orient/floorCommandWorkApi.ts` calls that GET with the Orient session token. It does not receive the Floor Command bearer.

`approveFloorCommandConnection` likewise has no HTTP route. A configured server cannot record a binding until a route or another server entry calls it.

### An approved binding is required and is not yet possible in production

`approveFloorCommandConnection` reads the signed-in operator from the Supabase session. The store comes from `ORIENT_FLOOR_COMMAND_STORE_NUMBER`. The caller cannot pass a store, a source, or a purpose. The server calls `bind_floor_command_observation` with:

- source `deptsync.floor-command.orient.v1`
- purpose `orient_published_week_read`
- the normalized store
- `approved_at`

The binding table has no token column. `authenticated` cannot execute the bind. The same operator, store, source, and purpose can be approved again. A different store raises `floor_command_observation_already_bound`.

`pullFloorCommandPublishedWeek` returns `unbound` when that row is missing, and `wrong_store` when the bound store differs from the server store. It returns `disabled` when the configuration is present and `ORIENT_FLOOR_COMMAND_PULL_ENABLED` is not exactly `1`. It returns `unauthorized` when no Orient user is signed in. It returns `invalid_week` unless the requested label matches `YYYY-Www`. It does not choose the week from the clock.

### The bearer stays on the server

`readFloorCommandReadToken` reads `ORIENT_FLOOR_COMMAND_READ_TOKEN` behind `assertServerOnly`. The pull sends it only as `Authorization: Bearer` to the producer, with an eight-second timeout. The approval result and the pull result omit it. A response body that contains the token is stored as an invalid snapshot, and the previous handoff is kept.

### What the consumer checks, and what it does not recompute

On a ready body, `floorCommandReadFromBody` requires `availability: "ready"`, source `deptsync.floor-command.orient.v1`, `synchronization` of `comparable` or `withheld`, and `isFloorCommandSnapshot`. That shape check requires a store, an ISO week, publication status, the Monday handoff policy, and `zebra_task_completed === false` on every current entry. Cleared rows must use `reason: "cleared"`.

`applyFloorCommandRead` then compares the snapshot store with the bound store. `week_sequence` orders the handoff. A missing sequence or `synchronization: "withheld"` records `ordering_withheld` and keeps the previous snapshot. A lower sequence returns the previous memory and does not write an attempt. The same sequence with the same revision may be replayed. The same sequence with a different revision records `sequence_conflict` and keeps the previous snapshot. A higher sequence replaces that one handoff.

The consumer stores `freshness.revision` as an opaque identity. It does not recompute the producer's SHA-256 content hash. It also does not require `snapshot.operational_week` to equal the week it requested. Gate A adds that week check. Gate D compares the stored revision with a fresh producer-side composition. Orient does not gain a second copy of the hash algorithm.

### Failure keeps the last good observation

`noteFloorCommandObservationFailure` keeps the retained handoffs and changes the attempt. The SQL failure branch updates `floor_command_observation_attempts` and returns before it reads or writes `floor_command_observation_handoffs`. A transport error, timeout, non-OK status, invalid body, withheld synchronization, or sequence conflict follows that path. An older sequence does not write at all, so the previous snapshot and the previous attempt both remain.

The handoff primary key is `(user_id, handoff_id)`. A later comparable read of the same handoff updates that row. The write must still include every retained handoff id, or the function raises `floor_command_observation_incomplete_retention`.

`recordFloorCommandObservation` writes only through `persist_floor_command_observation`. It does not insert Tasks, Commitments, Blocks, Protected Time, stewardship rows, or Pulse grants.

## 4. Smallest activation change

Gate A is local. It does not deploy, and it does not call production.

### Allow the verified origin

In `usableBaseUrl`, accept `https://deptsync-hub.vercel.app` when the protocol is HTTPS, the hostname is exactly `deptsync-hub.vercel.app`, the port is empty, and the URL has no username or password. Continue to return `url.origin`, so a path or query cannot widen the target.

Keep rejecting:

- `http://deptsync-hub.vercel.app`
- any other port
- a hostname that only contains that name, such as `deptsync-hub.vercel.app.example`
- embedded userinfo

Other HTTPS origins may remain usable for disposable local tests. The production procedure sets the base URL to exactly `https://deptsync-hub.vercel.app`.

Update the connection test that currently expects that host to be unconfigured. Add the rejected lookalikes above.

### Keep the server-only credential

Do not add the bearer to a client component, a browser bundle, a binding column, an observation payload, or a log. The new routes call the existing server functions. Their JSON responses use the existing result types, which omit the token. Tests continue to assert that `components/orient/floorCommandWorkApi.ts`, `components/orient/OrientInstrument.tsx`, and the observation route do not reference `pullFloorCommandPublishedWeek` or `ORIENT_FLOOR_COMMAND_READ_TOKEN`.

### Require the approved binding

Add `POST /api/integrations/floor-command/approval`.

- Runtime `nodejs`.
- The existing Orient session is required.
- The body cannot choose a store, source, or purpose.
- The handler calls `approveFloorCommandConnection`.
- Success returns the store, source, and purpose.
- `unconfigured`, `unauthorized`, `already_bound`, and `unavailable` stay distinct.
- This route does not pull.

### One controlled pull

Add `POST /api/integrations/floor-command/pull`.

- Runtime `nodejs`.
- The existing Orient session is required.
- The JSON body supplies `week` and nothing else. The week must match `YYYY-Www`.
- The handler calls `pullFloorCommandPublishedWeek` for that week.
- Before accepting a ready snapshot, the pull rejects a snapshot whose `operational_week` differs from the requested week. That rejection is an invalid snapshot: the attempt is a failure, and any previous handoff stays.
- If that operator already has `last_attempt_result = success_complete`, the route returns without calling Floor Command. A failed attempt does not trip this latch, so an unavailable producer can be retried until one read is accepted.
- The response contains the pull outcome and no bearer.

Do not call this route from Work, from the observation GET, from a timer, or from a cron entry. Orient gains no scheduled pull. The pull flag remains off unless it is exactly `1`. With the flag unset, the route can authenticate and still returns `disabled` before any outbound request.

Two overlapping requests can both pass the success latch before either records success. Gate D sends one request. The pull flag is removed immediately after that request returns. This change does not add a polling loop to close that race.

No database migration is required for this change. The binding, attempt, and handoff tables already exist.

## 5. Floor Command producer readiness

Read-only. No credential was issued.

| Check | Result |
| --- | --- |
| `floor_command_integration_credentials` | Present, row-level security on, 0 rows |
| Purpose constraint | `purpose = 'orient_published_week_read'` |
| Store constraint | `store_number ~ '^[1-9][0-9]*$'` |
| Token storage | `token_hash` must be 64 lowercase hex characters and is unique |
| Table ACL | `service_role=arwDxtm/postgres`. That is select, insert, update, truncate, references, trigger, and maintain. The delete bit is absent. `anon` and `authenticated` are absent. |
| Published-week route | Live GET reaches the handler and returns 401 without a bearer |
| Internal composer | `floor_command_read_published_week('2587', '2026-W44', '2026-10-26')` returned store `2587`, week `2026-W44`, sequence `3`, 9 assignments, and 0 deadlines |
| Zebra and completion | 3 of the 9 rows have `zebra_entered_at`. All 9 remain `assigned`. The composer sets `zebra_task_completed` to false on every current entry. |
| Cleared rows | 0 for this week |
| AUTO-008 | `vercel.json` at `ac533eb` schedules only `0 12 * * 0` to `/api/cron/weekly-rotation`. That file and the cron route do not reference the published-week reader or the credential table. |

The internal call used the management role `postgres`, which the function allows together with `service_role`. It was not an integration-bearer read. The function is a single select. The sequence value it returned matched the sequence row read before the call.

Expiry and revocation were not exercised with a live token, because issuing one is outside this tranche. In the deployed authorizer, a missing, unknown, wrong-purpose, expired, or revoked credential becomes HTTP 401 `{"error":"unauthorized"}`. Orient therefore cannot tell expiry from revocation. A requested store that differs from the credential store becomes HTTP 403 `{"error":"forbidden"}`. The store on the credential is the store that is read. The query parameter is only a check. A null `expires_at` does not expire.

`service_role` can truncate the credential table. The activation procedure does not truncate it. Revocation sets `revoked_at`. Rotation, when a later gate needs it, inserts a new hash and points `replaced_by_id` at that row after revoking the old one.

The sequence trigger advances once per committed transaction that changes assignment or deadline facts. A published-week read does not advance it. The Sunday cron remains the publisher. The next scheduled invocation is 2026-11-01T12:00Z and is expected to stage the following week, not to rewrite `2026-W44`. A supervisor Zebra confirmation or assignment edit can still advance sequence `3` before Gate D. Gate D reads the sequence again immediately before the pull.

## 6. First-read acceptance

The candidate week is `2026-W44`, store `2587`, week starting `2026-10-26` and ending `2026-11-01`.

As of the internal read on 2026-10-27, the producer composer returns:

| Field | Value |
| --- | --- |
| Source | `deptsync.floor-command.orient.v1` |
| Publication | `fc.publication.2587.2026-W44`, `published` |
| Handoff | `fc.zebra-handoff.2587.2026-W44` |
| Handoff status | `partial` |
| Counts | required 9, confirmed 3, outstanding 6 |
| Deadline | `2026-10-26`, policy `monday_of_operational_week` |
| Sequence | `3` |
| Ordering | `established`, no gaps |
| Synchronization | `comparable` |
| Revision | `cedf9853523bd7f8` |
| Source updated | `2026-10-26T21:16:26.188979+00:00` |
| Retired | empty |
| Deadlines | `ready`, 0 commitments |
| `zebra_task_completed` | `false` on every current entry |

The revision is the first 16 hex characters of the producer's canonical SHA-256. It does not include `read_at`. It changes when the canonical assignment facts change. It is the expected revision only while the nine rows below are unchanged. Gate D recomputes it from a fresh internal read and stops if either the sequence or the revision differs from the pull response.

Confirmed Zebra entry, status still `assigned`:

| Assignment | Associate | Zebra entered |
| --- | --- | --- |
| `aac129be-65c7-4c97-9a27-2b6ca978b847` | Nick | `2026-10-26T21:14:23.654+00:00` |
| `51c0e4f2-d50b-4a38-ab60-acbea5dc443f` | Nick | `2026-10-26T21:15:24.514+00:00` |
| `1d5e0676-e5fc-4d6e-905d-96d2c5d36c71` | Nick | `2026-10-26T21:16:25.92+00:00` |

Unconfirmed, status `assigned`, `zebra_entered_at` null:

| Assignment | Associate |
| --- | --- |
| `1a3e4801-ceeb-4ac8-bcc9-babba7035a4a` | Tracy |
| `931a9a17-148a-46f4-a9f7-b2c91cbb58d3` | Tracy |
| `6a3de19d-510f-42ce-bfd4-f8e7539a6350` | Tracy |
| `e94e8293-bedb-47e3-ab4f-87ab55119b61` | Tyson |
| `63795a02-de92-42ba-aabd-d785c0bdfc36` | Tyson |
| `7b65e307-171f-43dd-8a41-8794c886b7d4` | Tyson |

Assignment count for the store remains 39. The latest `updated_at` outside this week remains `2026-10-04 11:33:36.908+00`.

Gate D acceptance:

- One observation handoff for `fc.zebra-handoff.2587.2026-W44`.
- Store `2587`, week `2026-W44`, sequence and revision equal to the fresh internal read.
- The three Nick rows are `confirmed`. The six Tracy and Tyson rows are `unconfirmed`.
- Every current entry has `zebra_task_completed: false`. Handoff status `partial` is Zebra-entry progress. It does not create a completed Task.
- `retired` is empty. There is no cleared row to display as cleared, and no removed row to display as superseded.
- The handoff table has one row for that operator and handoff id.
- Tasks, Commitments, Blocks, Protected Time, stewardship, Active Threads, and Pulse counts match the pre-pull count.
- Floor Command credential count stays 1 after issuance, or returns to the revoked count if the credential is revoked in the same gate. Assignment rows, sequence, and `updated_at` match the pre-pull read.
- The pull flag is unset after the one response. A second pull request does not leave Orient, and the producer sequence does not advance because of the read.

## 7. Credential lifecycle

This tranche does not generate or store a token.

Issuance, in a later authorized gate:

1. Generate one token with the existing `generateIntegrationCredential` helper. The plaintext is shown once. Floor Command stores only the SHA-256 hash.
2. The row's purpose is `orient_published_week_read`. The store is `2587`. Set `expires_at` to the end of the Gate D window. Leave `revoked_at` null.
3. Transfer the plaintext once into Orient's server environment as `ORIENT_FLOOR_COMMAND_READ_TOKEN`. The channel is a secret manager or a direct server-environment entry. It is not a chat paste, a source file, a browser bundle, a client log, or an observation row.
4. Set `ORIENT_FLOOR_COMMAND_STORE_NUMBER` to `2587` and `ORIENT_FLOOR_COMMAND_BASE_URL` to `https://deptsync-hub.vercel.app`. Leave `ORIENT_FLOOR_COMMAND_PULL_ENABLED` unset.
5. The signed-in operator calls the approval route once. Confirm one binding row for that user, store `2587`, the v1 source, and `orient_published_week_read`.

Revocation sets `revoked_at`. The next pull receives 401, records `credential_rejected`, and keeps the last snapshot. Expiry uses the same Orient outcome. Emergency disablement is either revocation or setting the pull flag to any value other than `1`. Both stop a new outbound read. Neither deletes the last observation.

An invalid, withheld, or unreachable producer response records a failed attempt and preserves the last handoff. Before the first success, that last handoff is empty. After success, the success latch refuses another network read until a separately authorized change removes that latch. Recovery from a failed first attempt is another single authorized pull while the flag is `1` and no success has been recorded.

Rollback of the application does not by itself revoke the credential or drop the observation. Those are separate authorized actions.

## 8. Release gates

### Gate A — Local implementation and regression

**Prerequisites.** This plan. Baselines in section 1 still describe production. The work starts from Orient `e44953b`.

**Change.** Section 4 only. Tests use disposable tokens and a local or fake origin. One test may name `https://deptsync-hub.vercel.app` as an allowed origin string. No test calls that host.

**Acceptance.** The production origin configures when the token and store are present. Lookalike hosts stay unconfigured. The pull flag still defaults off. The approval and pull routes require an Orient session. The pull route fetches only when the flag is `1`, the binding matches, the week matches, and no successful attempt exists. A failed fetch keeps the previous handoff. Work's GET still does not pull. Typecheck, the Floor Command connection tests, and the observation persistence regression pass.

**Stop.** A test needs a production token, a production database, or a live request to `deptsync-hub.vercel.app`.

**Rollback.** The branch is local. Production Orient remains `e44953b`.

### Gate B — Dark consumer deployment

**Prerequisites.** Gate A is reviewed. A fresh read shows the four `ORIENT_FLOOR_COMMAND_*` names still absent. Orient observation counts are re-read on `ksmhgaamyheyhefbyglb`. Floor Command is still `ac533eb` with an empty credential table.

**Change.** Deploy the reviewed Orient commit with those variables absent. Do not issue a credential. Do not set the pull flag.

**Acceptance.** The new approval and pull routes return the unconfigured or unauthorized responses without a session, and they do not call Floor Command. Existing unauthenticated Orient routes behave as they do on `e44953b`. Observation tables remain empty.

**Stop.** Any of the four variables is present, the credential table is not empty, or the deploy SHA is not the reviewed commit.

**Rollback.** Redeploy `dpl_8wHGrY4J1mZu51fCJgv5h6qKdz9M` / `e44953b`. That app does not call the new routes. It also does not drop observation rows. While those rows are empty, no observation restore is required.

### Gate C — Credential and operator approval

**Prerequisites.** A separate authorization to write one credential hash and to set Orient server variables. Gate B is accepted.

**Change.** Section 7 through the approval call. The pull flag stays unset.

**Acceptance.** One credential row, store `2587`, the required purpose, a hash, an expiry, and no revocation. Orient has the token only in server environment. One binding row exists. A pull request returns `disabled` and Floor Command shows no new assignment write. The sequence is unchanged by this gate.

**Stop.** The plaintext appears in a repository, a client response, or an observation row. The purpose or store differs. The pull flag is set during this gate.

**Rollback.** Revoke the credential. Remove the four Orient variables. The binding row can remain; it contains no token. Deleting it is a separate database action. Revocation does not restore a plaintext token, so a later attempt needs a new issuance.

### Gate D — First controlled read

**Prerequisites.** A separate authorization for one pull of store `2587` and one named week. Immediately before the pull, recompute sequence and revision from `floor_command_read_published_week`. If they differ from section 6, the acceptance values are the fresh ones, and the pull still has to match those fresh values.

**Change.** Set `ORIENT_FLOOR_COMMAND_PULL_ENABLED` to `1`. Send one authenticated pull for the chosen week. Capture the response. Unset the flag before any second attempt.

**Acceptance.** Section 6, using the fresh sequence and revision. One producer request. One retained handoff. No native Orient work rows. No Floor Command assignment, sequence, or credential mutation caused by the read.

**Stop.** The response week, store, sequence, or revision differs from the fresh internal read. The body is withheld or invalid. Any current entry has `zebra_task_completed` other than false. A second outbound request is observed. The pull flag is still set after the response is captured.

**Rollback.** Unset the flag and, if the read must not be repeatable, revoke the credential. The retained snapshot stays. Removing it is a separate authorized delete. The success latch will refuse another pull after a successful write; clearing that latch is also a separate authorization. A failed pull leaves no snapshot to remove and may be retried only under a new authorization.

### Gate E — Ongoing operation

**Prerequisites.** A future decision that another read is wanted. This plan does not make that decision and does not choose a cadence.

**Change.** None in Gate A. A recurring pull, a Work button that pulls, or removal of the success latch requires its own reviewed change.

**Acceptance.** Defined by that later decision.

**Stop.** Treating this plan as permission to poll.

**Rollback.** Leave the success latch and the unset pull flag in place. That is the current resting state after Gate D.

## 9. Recovery and rollback

| Condition | What stays | What stops the next read |
| --- | --- | --- |
| Producer timeout, 5xx, or invalid JSON | Last handoff, if one exists | Pull flag off, or credential revoked |
| HTTP 401 | Last handoff. Attempt reason `credential_rejected` | The credential is already expired or revoked |
| HTTP 403 | Last handoff. Attempt reason `forbidden` | The credential store and the requested store disagree |
| Withheld synchronization or sequence conflict | Last comparable snapshot | Success latch if a prior success exists; otherwise the flag can authorize one retry |
| Older sequence | Last snapshot, and the previous attempt is not rewritten | The producer response is ignored |
| Accepted read | The new snapshot replaces that handoff id only | Unset the flag. The success latch refuses another fetch |
| Wrong application deploy | Observation tables remain | Redeploy the previous Orient deployment. Revoke the credential if the new code should not be reachable |

Previous deployments available for application rollback:

- Floor Command before the ingress exception: `dpl_4MqWAGNYd6KHuxyC2Bu81KvHfqE3` / `a3a34c9`. On that deployment the hub gate answers the published-week path, so a bearer does not reach the handler. The credential table and sequence row would remain.
- Orient before this consumer: `dpl_QMfa15AVQiDDGjSYLcJjyM635Per` / `9ff9f84`. That app does not read the observation tables.

Neither rollback revokes a credential or deletes an observation. Database recovery for Orient's older public data remains the RELEASE-002 `public` backup. That backup predates the observation tables and is not a full copy of `auth`.

## 10. Decision

**GO** for a separate local implementation of section 4.

**NO-GO** for production deployment, credential issuance, environment changes, approval binding, and any live pull.

No material drift was found in the live Floor Command deployment, the live Orient deployment, the Floor Command credential table, or the current `2026-W44` facts. The Orient database and the four Orient environment names were not re-read in this session. Gate B stops until they are.
