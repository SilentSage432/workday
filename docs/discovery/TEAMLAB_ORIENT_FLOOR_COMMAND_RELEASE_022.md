# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-022

Governed continuity. How Orient can stay informed about meaningful Floor Command changes through a bounded, revocable standing authorization. Written 2026-10-31 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_012.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_012.md), [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_019.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_019.md), [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_020.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_020.md), and [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_021.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_021.md).

Discovery and contract design only. No code, migration, credential, scheduler, webhook, pull flag, observation, task, commitment, or Floor Command publication change was made.

[TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_023.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_023.md), written 2026-11-01, is the later local policy record named in section 10. That record is inert. This document remains the discovery contract.

**GO** to request a later local tranche whose only product is the standing-policy record in section 10.

**NO-GO** to implement that record here, to enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, to observe any week, or to activate continuous observation.

Three labels are used below.

| Label | Meaning |
| --- | --- |
| Verified | Present in the inspected source, or recorded by RELEASE-019 or RELEASE-021. This tranche did not re-query production. |
| Proposal | A contract for a later tranche. It is not implemented. |
| Unresolved | A decision this document does not make. |

## 1. Verified current capabilities

### What was inspected

| Tree | Commit inspected on 2026-10-31 |
| --- | --- |
| Orient | `b9cd3bd762a3dd3c7dd7e9390b556a0cad56e7d0` |
| Floor Command local `main` | `404ea00` |
| Floor Command production on record | `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y` |

`ac533eb` is a separate history from local `404ea00`. The published-week route, the Sunday cron route, `vercel.json`, the snapshot composer, and the week-sequence migration are the same file contents in both commits. Production rows, the credential, and the Orient ledger were not read again on 2026-10-31. Those facts remain the RELEASE-019 and RELEASE-021 records.

### Sunday publication

Verified. Floor Command `vercel.json` schedules one cron, `0 12 * * 0`, on `/api/cron/weekly-rotation`. The route requires `CRON_SECRET`. It stages the upcoming operational week through `runWeeklyRotationForAllDepartments`. On a Sunday, `sundayStagingWeekLabel` names the ISO week of the next Monday. The route can send a department web push after a created rotation batch when web push is configured. That push goes to Floor Command department subscriptions. The cron file does not call the published-week route and does not call Orient.

The product latch `WEEKLY_ROTATION_AUTO_PUBLISH` is `true` in the inspected composer tests. Whether the hosted secret still allows a given Sunday to publish was not re-read. AUTO-008 remains the publication authority. This document does not change it.

### Published-week sequence and revision

Verified. `GET /api/integrations/floor-command/published-week` is read-only. It accepts a bearer whose hash matches `floor_command_integration_credentials` for purpose `orient_published_week_read`. A supervisor session is not accepted. The optional `store` query is checked against the credential and is not authority. Revoked, expired, wrong-purpose, and unknown tokens are 401. A mismatched store is 403. The snapshot is loaded by `floor_command_read_published_week`, one SQL statement.

`publication.status` is `published` when the snapshot contains at least one non-cleared assignment. An empty current list is `unpublished`, including a week whose assignments were all cleared onto `retired`. `freshness.revision` is a content hash. `freshness.week_sequence` comes from `floor_command_week_sequences`. A missing row is sequence `0`. The sequence advances once per committed transaction that changes assignment or confirmed-deadline facts, including bay, roster, status, name, `zebra_entered_at`, and confirmed SMART dates. A read does not advance it. `publishedWeekSynchronization` is `comparable` when ordering is established. It is `withheld` when the deadline read failed, the sequence was not proven, or the sequence raced. An unpublished week at sequence `0` can still be `comparable`.

`zebra_confirmation` is `confirmed` only when `zebra_entered_at` is present. `zebra_task_completed` is the constant `false` on every entry. Handoff status `complete` means every current assignment has a Zebra entry confirmation. It does not mean the Zebra task was finished.

The snapshot field `deadlines.commitments` holds Floor Command SMART deadline facts. Those rows are not Orient commitments.

### Governed observation and history

Verified in Orient at `b9cd3bd`, and exercised once in production by RELEASE-019.

`POST /api/integrations/floor-command/observations` accepts a same-origin JSON body whose only key is `week`. The server takes the operator from the session, and the store, source, and purpose from the binding. The database allocates the request id. The route performs one GET of the published-week snapshot, then `commit_floor_command_governed_observation` writes one terminal outcome. There is no retry loop.

The route returns `disabled` unless `ORIENT_FLOOR_COMMAND_PULL_ENABLED` trims to exactly `1`. RELEASE-021 records that the name is absent. Absence is off. The same name also arms `POST /api/integrations/floor-command/pull`. That older route still returns `already_succeeded` for this operator before any GET, because the attempt row remains `success_complete`.

`GET /api/integrations/floor-command/observation` loads retained evidence. Opening Work uses that GET. `FloorCommandWorkView` does not call Floor Command on open, on the 30-second clock, or from a `useEffect`.

The request table states are `in_progress`, `accepted_new`, `unchanged`, `revised`, `failed`, and `rejected`. The `requested` state in the RELEASE-012 narrative is not a stored state. Insert is already `in_progress`. One unexpired in-flight request is allowed per operator. The lease is `floor_command_controlled_pull_lease()`, 15 seconds. The HTTP timeout is 8 seconds. An expired in-flight row is closed as `failed` / `lease_expired` by the next open, and that close-out does not call Floor Command.

Classification, for an eligible published snapshot:

| Condition | Outcome | Working handoff |
| --- | --- | --- |
| No retained handoff for that week | `accepted_new` | Insert, and append history with origin `accepted_new` |
| Incoming revision equals the retained revision, at any sequence | `unchanged` | Body, revision, sequence, and `last_successful_observed_at` stay. `last_checked_at` moves forward. `checked_sequence` advances only when the incoming sequence is greater than the retained high-water mark |
| Different revision and sequence greater than both the retained sequence and that high-water mark | `revised` | Previous body is kept in history. The working row is replaced in the same transaction |
| Different revision at the retained sequence, at a lower sequence, or at a sequence already checked for the retained revision | `rejected` (`sequence_conflict` or `older_sequence`) | Unchanged |
| Publication is not `published`, synchronization is `withheld`, or the snapshot fails the structural checks | `rejected` | Unchanged. No handoff is inserted for a week that had none |
| Transport failure, timeout, redirect, or any HTTP status other than 200, 401, and 403 | `failed` / `source_unavailable` | Unchanged |
| HTTP 401 or 403 | `rejected` / `credential_rejected` or `forbidden` | Unchanged |

`floor_command_observation_handoff_revisions` is append-only. Update and delete raise `floor_command_observation_history_immutable`. Dismissal remains per revision and is not Zebra completion. The governed functions do not update the one-shot attempt row.

RELEASE-019 recorded the only governed production request:

| Fact | Recorded value |
| --- | --- |
| Request | `879a61f2-6179-479b-a9ad-15f150db44d3` |
| Operator | `a499dd01-095e-4bb0-8db9-c284c34a2ab2` |
| Store / source / purpose | `2587` / `deptsync.floor-command.orient.v1` / `orient_published_week_read` |
| Week | `2026-W44` |
| Outcome | `unchanged`, sequence `8`, revision `c3a29fab9de35ca0` |
| Accepted time | `2026-10-29T00:40:17.666Z` |
| Last checked | `2026-10-30T13:55:56.99807Z` |
| `checked_sequence` | null |
| History | one `one_shot` row, equal to the working handoff |
| Attempt | `success_complete` |
| Credential | `1a418da4-1926-4c69-b6f9-334b55b82828`, not revoked at that record |
| Tasks / commitments / blocks / protected time | 39 / 2 / 0 / 0, unchanged by the observation |

`accepted_new` and `revised` are implemented and covered by local tests. They have not been the outcome of a production governed request. That limit is part of the verified record.

RELEASE-021 deployed the Work presentation as `dpl_LzEcF65D1qQ1SChttiDGPW43aWDh` at `https://orient-cyan.vercel.app`. The section separates originally observed, last checked, and retained sequence and revision. It says the reading is retained evidence. The unchanged sentence says Floor Command can still change later. Source changes since the last check are described as not known.

### Scheduling and notification infrastructure

Verified. These clocks exist. None of them observes Floor Command.

| Mechanism | Owner and behavior | Floor Command observation |
| --- | --- | --- |
| Floor Command Vercel cron `0 12 * * 0` | Sunday publication and optional department web push | Does not call Orient |
| `floor_command_week_sequences` triggers | Order committed assignment and deadline facts inside Floor Command | A later authorized read can see the new sequence. Nothing notifies Orient |
| Orient `pg_cron` job `orient-pulse-hosted-establishment`, schedule `* * * * *` | Establishes Pulse occurrences for commitment and block starts the operator already authorized | The command does not mention Floor Command. Reusing it would mix Pulse authority with an external read |
| Orient instrument, 30-second clock and visibility recovery | Advances the local clock and requests a throttled Google Calendar observation | The Floor Command Work view is not on that path |
| Google Calendar `observeSelectedGoogleSources` | Selected calendars, 15-minute throttle, also forced by the operator | A different source contract. It is not a Floor Command grant |
| Published-week GET | Read-only snapshot | No outbound signal, webhook, or shared event bus |

Orient has no `vercel.json`. There is no background worker whose job is to observe Floor Command.

### Operator identity and authorization

Verified. The observation caller is the signed-in `auth` user. `open_floor_command_governed_observation` requires a binding row for that user whose source is `deptsync.floor-command.orient.v1` and whose purpose is `orient_published_week_read`. The bound store must equal the server-configured store. The client does not send the store, the source, the purpose, the credential, or a request id.

The binding is permission to ask. Each request is permission to read once. A terminal request does not authorize another GET. The pull flag is a deployment kill switch. A set flag with no POST creates no request.

The Floor Command bearer lives in `ORIENT_FLOOR_COMMAND_READ_TOKEN` on the Orient server. Floor Command stores the hash. Work responses are refused if they contain a token-shaped key. The governed read rejects a body that contains the bearer.

### Source and temporal boundaries

Verified.

Floor Command owns published bay assignments, Zebra task-entry confirmation (`zebra_entered_at`), and confirmed SMART deadlines. Orient owns tasks, commitments, blocks, protected time, and the confirmed IANA zone used to render an instant. The governed observation server does not insert those Orient temporal rows. Pulse grants are not created from a Floor Command read.

A future assistant is not a party to the current routes. RELEASE-012 already says an agent proposal is not a request row, not a claim, and not a GET. No delegation table exists.

## 2. Observation strategy comparison

Observation frequency is how often Orient is allowed to GET the published-week snapshot. Notification frequency is how often the operator is asked to look. They are different budgets. An unchanged check can be recorded with no notification. A notification without a committed observation would claim a source change Orient has not retained.

| | Operator-initiated | Scheduled bounded polling | Publication-triggered notification | Hybrid: occasion plus reconciliation |
| --- | --- | --- | --- | --- |
| What it is | The signed-in operator names one week and POSTs once. This is the implemented path. | A clock GETs under a cadence while a grant exists. | Floor Command emits a change signal, and Orient then reads. | A standing grant allows one read inside a named occasion, plus a later read if that occasion did not finish, and the operator can still POST. |
| Operational complexity | Already deployed and disabled by the absent pull flag. | Needs a non-interactive executor, occasion limits, and a stop when the grant or the credential is gone. None of that exists. | Needs a new outbound path from Floor Command. The sequence trigger and the department web push are not that path. | Same executor as a bounded schedule, with the occasion named in the grant. No new Floor Command sender is required for the first shape. |
| Latency | The gap lasts until a person asks. The Work copy already says source changes since the last check are not known. | A tick can be hours after publication and still earlier than a person's question. The Sunday cron already occupies Floor Command's daily Vercel slot. | Can be close to the committing write. Zebra confirmations and deadline edits advance the sequence many times in a week, so the signal rate is much higher than the publication rate. | The publication occasion can sit after the known Sunday slot. Mid-week sequence advances wait for a reconciliation occasion or for the operator. |
| Reliability | Fails closed. No request means the prior handoff stays, labeled as retained. | A missed tick is silence. Silence does not prove the source is unchanged. A stuck tick becomes background activity. | A missed signal is also silence. The signal then becomes a second account of what Floor Command committed, beside the sequence. | A missed occasion stays an open gap until a read commits or the attempt budget ends. The read, not the clock and not the signal, classifies the source. |
| Credential exposure | The bearer is used only while the flag is on and a person POSTs. | The bearer is used on every tick, including weeks that did not change. The browser session is absent, so the grant itself would be the authority. | Floor Command would need a way to invoke Orient, or Orient would poll a new feed. Either direction is a new trust boundary. The existing bearer stays server-side only if Orient still pulls. | The bearer is used only inside an occasion the operator already approved, and only up to the attempt cap. |
| Hosting constraints | Fits the current serverless request. One GET, an 8-second timeout, and a 15-second lease. | Orient has no Vercel cron. Floor Command's only cron is the Sunday publication. Orient's minute `pg_cron` job belongs to Pulse. A resident poller does not exist on these hosts. | A webhook needs a new public Orient route and a credential Floor Command can hold. That route does not exist. | A later executor still needs a host that can wake for an occasion. That host is not authorized by this document. The policy can be stored before any host is chosen. |
| Failure recovery | One request, one attempt. The next explicit POST may try again. A lost response does not retry itself. | Needs a retry budget. Without one, a Sunday timeout looks like a week that was never published. | Needs the same budget, because a lost signal is not a stored observation. | The attempt budget is part of the grant. Exhausting it stops the occasion and leaves the last accepted handoff in place. |
| Operator burden | One press per week the operator cares about. Accurate, and it does not scale past the operator's attention. | The press moves to grant, expiry, and revocation. Every tick still has to stay quiet when nothing changed. | The operator must also understand a new sender. Every Zebra confirmation can become an interruption if notification follows the signal. | The operator approves the grant and can revoke it. Presses remain available. Notifications stay rarer than reads. |

Proposal. The hybrid is the continuity architecture in section 3. Operator-initiated observation remains the only implemented authority and remains available whether or not a grant exists. Scheduled polling of every sequence is not the design. A publication webhook is not required for the first standing grant, and it is not justified while the sequence already lets a later read tell a new publication from an unchanged week.

## 3. Recommended continuity architecture

Proposal, except where a sentence is marked verified.

Orient stays informed by retaining the published-week snapshot under the RELEASE-012 classification, which is already implemented. A later standing grant may authorize Orient to create those same requests without a fresh press, inside limits the operator sets. The grant does not authorize a new source, a new classifier, or a write to Orient's temporal records.

The grant has two occasion kinds:

1. Publication occasion. One store, one ISO week that the grant names, inside a window that opens when Floor Command's Sunday publication slot has passed and closes at the grant's deadline. The expected read is the week `sundayStagingWeekLabel` would name for that Sunday. The grant stores that week explicitly when the occasion is armed. Orient does not infer a different week from the civil clock at read time.
2. Reconciliation occasion. At most one additional read of a week that already has a retained handoff, when that handoff still has an outstanding Zebra entry count and the handoff's `deadline_date` is still ahead of the operator's confirmed clock. This catches a missed publication read and a later assignment or Zebra-entry change without following every sequence advance.

A third path stays verified and unchanged: the operator may POST a named week. That POST does not require a standing grant. A standing grant does not satisfy the POST. They are separate authorizations that share one classifier.

Notification is a later presentation of a committed outcome. It is not part of the read. Section 6 says which outcomes can deserve attention. Unchanged evidence is recorded and stays quiet.

These existing mechanisms stay in their current jobs:

- The Sunday cron publishes. It does not gain an Orient callback.
- The sequence triggers order Floor Command facts. They do not gain an integration side effect.
- Pulse establishment stays on commitment and block starts.
- Google visibility observation stays on selected calendars.
- `ORIENT_FLOOR_COMMAND_PULL_ENABLED` stays the kill switch for the human POST and the one-shot route. It is not the standing grant. See the unresolved coupling in section 9.

No component in this architecture creates a Task, Commitment, Block, Protected Time, or Pulse grant from a snapshot.

## 4. Standing authorization model

Proposal. No table, column, or route in the inspected tree stores this policy.

A standing authorization is one row the signed-in operator creates by an explicit same-origin action. The client sends the bounds. The server fills identity from the session and the binding. A policy id in a later request body is not authority.

| Field | Rule |
| --- | --- |
| Policy id | Database UUID. Not chosen by the client. |
| Grantor | The signed-in operator. Must equal the binding's user id. |
| Source | `deptsync.floor-command.orient.v1` only. |
| Store | The bound store only. For the current binding that store is `2587`. |
| Purpose | `orient_published_week_read` only. |
| Contract | One GET of `/api/integrations/floor-command/published-week` for that store and one named week, then the existing terminal classification. |
| Weeks | An explicit list of ISO weeks, or one publication week copied onto the occasion when the operator arms it. An open-ended "current week" is not a stored value. |
| Window | `not_before` and `not_after` timestamps on each occasion. A read outside the window does not start. |
| Maximum frequency | One GET per occasion attempt. Occasions do not stack. A publication occasion and a reconciliation occasion are the only automatic occasions, and each week has at most one of each. |
| Expiration | `expires_at` is required. A policy with no expiry is refused. Expiry ends future occasions and leaves retained evidence in place. |
| Revocation | The operator sets `revoked_at`. Revocation ends future occasions immediately. It does not delete handoffs, history, or request rows. Removing the binding has the same effect as revocation for future reads. |
| Retry and backoff | Inside one request, retry remains zero. The policy may allow a later new request for the same occasion after `minimum_gap`, and only while attempts remain. `minimum_gap` is at least 15 minutes. The cap is small and stored on the policy. Credential rejection spends the policy: no further automatic attempt. |
| Audit | Every delegated GET is still a `floor_command_observation_requests` row, plus the policy id and the occasion id. Grant, revoke, suspend, and expiry are their own append-only events. |
| Emergency suspension | `suspended_at` on the policy, set by the operator. A deployment-level continuity suspension, distinct from the pull flag, refuses to open a delegated request even if the policy is active. Suspension does not delete evidence. |
| Unpublished or unavailable | The existing `rejected` / `unpublished` and `failed` / `source_unavailable` outcomes apply. They do not become `unchanged` or `accepted_new`. They consume an attempt. When attempts remain and the window is still open, one later request is allowed. When the window or the cap is gone, the occasion closes. |
| Temporal writes | Forbidden. The policy does not insert or update tasks, commitments, blocks, protected time, Pulse grants, dismissals, or any Floor Command table. |

The human POST stays the only path that can observe a week the policy does not name. Delegated execution uses the same open and commit functions. It does not call `claim_floor_command_controlled_pull`.

## 5. Change-detection semantics

The classifier in section 1 is the detection rule. A standing grant does not add a second rule. The following map is verified behavior, with the gap named where the current system cannot see the condition.

| Condition | How Orient tells | What is retained |
| --- | --- | --- |
| First publication | `accepted_new` when that week has no working handoff and the snapshot is eligible and `published` | New working row and a history row. A prior `rejected` / `unpublished` request for that week does not block this, because it did not insert a handoff. |
| Unchanged evidence | `unchanged` when the incoming revision equals the retained revision | The accepted body and its original observation time stay. `last_checked_at` records the check. A higher sequence with the same revision is still unchanged. |
| Revised evidence | `revised` when the revision differs and the sequence is greater than the retained sequence and the high-water mark | The previous snapshot remains addressable by its revision. The new snapshot becomes the working row. |
| Unpublished evidence | `rejected` / `unpublished` when `publication.status` is not `published`, including a fully cleared week | No new handoff. A handoff already accepted for that week stays. The request stores the sequence and revision that were seen, when the body parsed. |
| Unavailable evidence | `failed` / `source_unavailable`, or `rejected` / `ordering_withheld` when the producer could not prove order | The last accepted handoff stays. The failure is not a check of the revision. |
| Stale retained evidence | There is no stored stale bit. Age is the distance from `last_successful_observed_at` or `last_checked_at` to the operator's clock. Work already says source changes since that time are not known. | The snapshot remains the last accepted evidence. Age does not rewrite it and does not prove that it changed. |
| Source errors | `failed` or `rejected` with the specific reason: credential rejected, forbidden, invalid snapshot, conflicting sequence, older sequence, lease expired | The working handoff stays. The request row is the audit. |
| Missed publication events | No publication event is stored on either side. A silent Sunday is not evidence of a missed publication and not evidence that the week is unchanged. | Only a later authorized read can classify the week. `unpublished` at that read means the snapshot had no current assignment at `read_at`. It does not by itself mean the cron failed. `accepted_new` on a later read means the publication is now retained, and the earlier silence was a missed observation. |

Absence of a new observation is an open gap. It is not `unchanged`. The word `fresh` is not an outcome.

Provenance rules that stay in force:

- `last_successful_observed_at` moves on `accepted_new` and `revised` only.
- `last_checked_at` moves on `unchanged` only.
- A failed or rejected request does not move either clock on the handoff.
- History rows are not rewritten when a later revision arrives.
- Dismissal of an older revision does not hide the new one.

## 6. Attention stewardship principles

Proposal. The implemented Work surface already shows the retained handoff, the last check, and the latest terminal sentence. It does not notify, and it does not create work. A standing grant keeps that split.

An observation is information Orient has retained. Attention is a later decision that the operator should see a sentence. The default is silence.

| Source condition | Attention |
| --- | --- |
| `unchanged` | No attention. The check is available in the retained section. |
| `accepted_new` for a week that is `published` | Attention is warranted. This is the first retained copy of that week's assignments. The sentence names the week, the sequence, and the revision. It does not create a task. |
| `revised`, and the current entries differ by bay, roster, or assignment identity | Attention is warranted. The sentence names the new revision and that the bay assignment changed. The previous revision remains in history. |
| `revised`, and the only difference is inside facts the operator was not asked to act on | Informational. Recorded on the handoff. No attention by default. Which fields count as action is unresolved in section 9. Outstanding Zebra count and the Monday entry deadline are the facts that can cross into attention. |
| Outstanding Zebra entry confirmation | Attention is warranted only when the retained handoff has `outstanding_count > 0` and `deadline_date` is still ahead. The sentence says those entries are still to enter in Zebra. `zebra_task_completed` remains false. Handoff status `complete` is not task completion. |
| `failed` or `rejected` while a Monday entry deadline is still ahead and the last accepted reading is what the operator would use | Attention is warranted. The sentence names the reason and says the reading still shown is the last accepted one. |
| `failed` or `rejected` with no approaching handoff deadline | Informational. The retained section already has a sentence for the unsuccessful attempt. |
| Unpublished week inside a publication occasion | Informational, and specific: the authorized read did not find a published week. That sentence does not say the Sunday cron failed. |
| Credential rejected | Attention is warranted, and the standing policy suspends. The sentence asks the operator to deal with the credential. It does not rotate the credential by itself. |

Attention is a Work sentence about retained evidence. It is not a Task, a Commitment, a Block, a Protected Time, a Pulse grant, a web push, or a Floor Command write. Dismissal of a revision may hide that revision's attention. Dismissal does not confirm Zebra entry and does not complete a Zebra task.

Observation frequency and notification frequency stay apart. A publication read plus one reconciliation can both commit as `unchanged` and produce no attention. Two revisions in one week still produce at most the attention of the latest accepted revision, not one interruption per sequence number.

## 7. Failure and recovery boundaries

Verified behavior of one request, which a standing grant must keep:

- The GET happens at most once per request id.
- A terminal request returns its stored outcome and does not GET again.
- A persist after the 15-second lease writes nothing. The next open records `lease_expired` without a source read.
- A crash after a successful GET and before commit leaves `in_progress` until the lease expires. The response may be lost. That loss does not authorize an automatic second GET.
- `failed` and `rejected` leave the working handoff in place.
- The one-shot `success_complete` row is not cleared by a governed failure.

Proposal for occasions:

| Failure | Recovery |
| --- | --- |
| `source_unavailable` or `unpublished` inside an open window, attempts remaining | One new request after `minimum_gap`. New request id. Same occasion. |
| Attempt cap reached, or the window has ended | The occasion closes. The gap stays visible. No further delegated GET for that occasion. |
| `credential_rejected` | Suspend the policy. Do not retry. Do not revoke the Floor Command credential from Orient. |
| `forbidden`, `sequence_conflict`, `older_sequence`, `invalid_snapshot` | No automatic retry. The request is the explanation. The operator may POST a new request. |
| `lease_expired` | The request is already terminal. It consumes an attempt. It does not start another GET by itself. |
| Executor crash after commit | The request is terminal. A later wake sees the terminal row and does not read again for that attempt. |
| Source stays unpublished after the cap | Orient retains the rejection. It does not invent assignments, and it does not mark the week unchanged. |

Backoff is a gap between requests. It is not a loop inside the 8-second timeout, and it does not extend the lease.

Recovery never rewrites an accepted history row. Recovery never treats a missing request as `unchanged`.

## 8. Security and privacy considerations

Verified controls that a standing grant has to keep:

- The bearer stays in the Orient server environment. The browser receives the Supabase session, not the Floor Command token.
- Floor Command stores a hash and can revoke or expire it. The published-week route then returns 401.
- Request and history rows are selectable by the owning user under row level security. Open and commit execute as `service_role` only.
- The governed rejection refuses a snapshot whose source, store, or week does not match the request, and it refuses a snapshot that contains forbidden credential material.
- Associate names, roster ids, bay ids, and Zebra entry timestamps are inside the retained snapshot and inside history.

Proposal.

A delegated executor is a new use of `service_role` without a browser session. The policy row is the operator's authorization for that use. The executor may open a request only for the grantor's user id, the bound store, and a week already written on an open occasion. It does not accept a week from an outside caller. It does not log the bearer.

The pull flag must not be turned on to mean "the standing grant is active." That flag also arms the one-shot route. The one-shot route is latched for this operator, and the latch is not a substitute for a separate continuity suspension.

Suspension and revocation stop future GETs. They do not erase associate names already retained. History remains append-only. A later retention limit for those copies is unresolved.

The standing grant does not widen readers. A future assistant may read the operator's retained observations only under a separate contract. It does not receive the bearer, the service-role key, or permission to insert temporal rows.

Google's visibility-triggered observation is the wrong pattern for this source. Attaching Floor Command to that 15-minute recovery would observe without an occasion and would mix two source contracts.

Pulse's minute job is the wrong host. A Floor Command read inside `run_pulse_hosted_establishment` would make external evidence look like an authorized temporal condition.

The Sunday web push is the wrong notification channel. It addresses Floor Command devices about a rotation batch. It is not an Orient attention surface, and it must not gain the published-week body.

## 9. Unresolved architectural decisions

1. The governed route refuses every observation unless the pull flag is exactly `1`. A standing executor cannot run while that remains true unless the flag is turned on, which also arms the one-shot route. This document does not choose the replacement gate.
2. The publication window length is not fixed. The cron is 12:00 UTC. The store gate uses the store time zone. The copy of `sundayStagingWeekLabel` onto an occasion has to be specified before any executor exists.
3. Whether a standing grant may include the reconciliation occasion, or only the publication occasion, is an operator-policy choice this document does not default.
4. The numeric attempt cap above the required floor of one GET per request, and the exact `minimum_gap` above the 15-minute floor, are not chosen.
5. Which `revised` field differences deserve attention, beyond bay or roster identity and an outstanding Zebra count before `deadline_date`, is not chosen.
6. Attention as a Work sentence is the proposal. A separate perception channel is not designed. Pulse is not that channel.
7. How long history keeps associate names after revocation is not chosen. This tranche does not delete them.
8. A fully cleared week remains `unpublished` in the producer. This document does not change that rule. RELEASE-012 left the same point open.
9. Production ledger values in section 1 were not re-read on 2026-10-31. A later tranche that touches hosted data has to read them again.
10. `accepted_new` and `revised` are locally implemented and have not been production governed outcomes. A standing grant should not be the first production use of those outcomes.
11. The agent contracts in section 10 are names and boundaries. Their request and approval shapes are not specified.

## 10. Long-term agent relationship and next boundary

### What a future assistant may use

Proposal. Not an agent implementation.

A future assistant may read Orient's retained Floor Command observations to understand what the operator has already accepted about a store-week: the working snapshot, its sequence and revision, the history of accepted revisions, and the terminal request that produced them. That reading is evidence with a timestamp. It is not a live Floor Command query. The assistant does not invent a publication, a bay assignment, a Zebra entry, or a Zebra task completion that the retained snapshot does not contain.

The assistant may say which of those retained facts fall inside the operator's upcoming days, using Orient's confirmed time zone and the deadline dates copied from Floor Command. That statement is temporal relevance. It is not a scheduled commitment.

These contracts would have to exist before the assistant could go further. None of them exists today.

| Contract | What it would authorize | What it would refuse |
| --- | --- | --- |
| Temporal relevance | Explain which retained Floor Command facts fall on the operator's upcoming civil days. | A source read. A new temporal row. |
| Proposed scheduling | Offer a commitment or block the operator could accept. | Inserting that row. Treating the offer as accepted. |
| Operator approval | A separate explicit act that creates the Orient temporal record. | Using the standing observation grant as that act. |
| Confirmed scheduling | The row Orient writes after that approval. | Writing Floor Command, or marking Zebra entered. |
| Rescheduling | An operator-approved change to an Orient commitment or block. | Changing the Floor Command assignment or SMART deadline. |
| Cancellation | An operator-approved end to an Orient commitment or block. | Clearing a Sunday assignment or inferring that the work was done. |
| Source acknowledgment | A Floor Command confirmation, which remains `zebra_entered_at` in Floor Command. | Orient setting that timestamp, or treating handoff `complete` as Zebra task completion. |

The standing observation grant is not any of those contracts. The assistant coordinates by asking for the contract that matches the act. It does not assume the operator's authority because a policy row exists.

### Recommended next implementation boundary

A local policy tranche is justified only as a record of the grant. It is justified because the human path, the classifier, and the history already exist, and the missing piece is an explicit, expiring, revocable authorization that cannot read by itself.

That tranche, if separately requested, may:

1. Add the policy, occasion, and audit records from section 4.
2. Refuse a policy with no `expires_at`, no store binding, or any source other than the published-week contract.
3. Prove that creating, revoking, suspending, and expiring a policy performs no GET and writes no task, commitment, block, protected time, or Pulse grant.
4. Prove that a delegated open is impossible in that tranche because no executor is included.
5. Leave `ORIENT_FLOOR_COMMAND_PULL_ENABLED` unset, leave the one-shot attempt frozen, and leave Floor Command's publication cron unchanged.

That tranche may not add a cron, a webhook, a continuity flag, a notification, or a call to the published-week route. An executor, if it is ever justified, is a later gate after this policy record exists and after section 9 item 1 has a written answer.

**NO-GO** to treat this document as that tranche.

**STOP.** Continuous observation is not active. The pull flag remains absent. No new governed request is authorized.
