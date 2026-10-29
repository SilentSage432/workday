# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-012

Governed multi-observation design contract. Written 2026-10-28 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_011.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_011.md).

Contract only. No code, migration, credential change, pull, scheduler, webhook, or autonomous read was added. The production observation below is unchanged.

**GO** to request a separately authorized local implementation of this contract.

**NO-GO** to apply that implementation to hosted Orient, to set `ORIENT_FLOOR_COMMAND_PULL_ENABLED`, or to perform another Floor Command read in that tranche.

## 1. Contract purpose and invariants

Orient may later observe Floor Command again only when the signed-in operator asks for one named week. Each ask is one observation request. The request authorizes one read and one terminal record. It does not authorize a later read.

The proven one-shot stays closed.

| Field | Production value, left intact |
| --- | --- |
| Store | `2587` |
| Week | `2026-W44` |
| Handoff | `fc.zebra-handoff.2587.2026-W44` |
| Sequence | `8` |
| Revision | `c3a29fab9de35ca0` |
| Accepted | `2026-10-29T00:40:17.666Z` |
| Attempt | `success_complete`, reason null |
| Pull flag | `ORIENT_FLOOR_COMMAND_PULL_ENABLED` absent |
| Latch | The operator-wide one-shot is consumed |

Invariants:

1. The existing handoff row, its snapshot, its sequence, its revision, and `last_successful_observed_at` stay. A migration may copy them into history. It must not delete them, rewrite the snapshot, or change those four facts.
2. The existing attempt row stays `success_complete`. Nothing in the new path updates `last_attempt_result` on that row. A later failure must not clear it. Deleting it, or teaching `claim_floor_command_controlled_pull` to ignore it, is forbidden. That function still returns `already_succeeded` before any lease and before any GET.
3. The old pull route stays the one-shot route. The new behavior is a new request record and a new database function. Turning the pull flag on does not reopen the one-shot.
4. One request authorizes one GET of one store-week. A second week, or the same week again, requires a new explicit request.
5. An unpublished week never becomes `accepted_new`, `unchanged`, or `revised`.
6. Equal source revision never creates a revised handoff.
7. A failed or rejected request leaves the last accepted handoff in place.
8. Opening Work reads Orient. It does not call Floor Command.
9. No request creates a Task, Commitment, Block, Protected Time, or Pulse grant.
10. Orient does not schedule Floor Command reads. An agent proposal is not a request.

At most one successful terminal record is committed per request id. That is not exactly-once HTTP delivery. The GET may happen and the response may be lost. A lost response does not authorize the server to try again by itself.

## 2. Observation request identity

The client body remains a named week and nothing else: `{ "week": "<ISO week>" }`. The client does not send the store, the source, the purpose, a credential, or a request id.

The server creates the request when, and only when, all of the following are true:

- The caller is the signed-in operator.
- The POST is same-origin.
- The deployment flag trims to exactly `1`. Absence still means no request row and no GET.
- The operator's binding matches the server store, source `deptsync.floor-command.orient.v1`, and purpose `orient_published_week_read`.
- The week matches `^\d{4}-W\d{2}$`.
- That operator has no unexpired in-flight Floor Command read.

The server then allocates the request. The stored identity is:

| Part | Source |
| --- | --- |
| Request id | New UUID created in the database transaction. Not chosen by the client. |
| Operator | `auth` user id from the session. |
| Source | `deptsync.floor-command.orient.v1` from the binding. |
| Store | Binding store, which must equal the server-configured store. For this operator that store is `2587`. |
| ISO week | The week in the body. The server does not substitute the current week, `2026-W44`, or `2026-W45`. |
| Purpose | `orient_published_week_read`. |
| Scope | One GET of `/api/integrations/floor-command/published-week` for that store and week, then one terminal classification. |
| Claim id | A second UUID for the lease. Distinct from the request id. |

The same binding may be used for many requests. The binding is permission to ask. Each request is the permission to read once. A committed observation of `2026-W44` does not cover `2026-W45`. A committed observation of sequence `8` does not cover sequence `9`. The operator asks again, in a new POST, or no read occurs.

## 3. Authorization lifecycle

```text
eligible POST
  -> requested
  -> in_progress          (lease held)
  -> accepted_new
   | unchanged
   | revised
   | failed
   | rejected
```

`requested` and `in_progress` are the only non-terminal states. The five outcomes are terminal. A terminal request cannot be claimed again and cannot authorize another GET.

| State | Who moves it | What is true |
| --- | --- | --- |
| Requested | The insert transaction | The operator asked for this week. No GET has been sent. |
| In progress | The same transaction, or the next statement in it | This operator holds the only Floor Command lease. `claimed_at` is database `now()`. The lease is 15 seconds. The same claim id does not extend it. |
| Accepted new | Persist, same transaction as history insert | This week had no accepted handoff. The snapshot is published and eligible. The working handoff is inserted. |
| Unchanged | Persist | The read was eligible and the source revision equals the retained revision. The snapshot body stays. |
| Revised | Persist, same transaction as history append | The read was eligible, the sequence is greater, and the revision differs. The previous snapshot is appended to history, then the working row is replaced. |
| Failed | Persist or a later claim's close-out | The read did not complete. The working handoff stays. |
| Rejected | Persist | The response was ineligible. The working handoff stays. This includes unpublished, withheld, unauthorized scope, older sequence, and same-sequence conflict. |

A POST that fails eligibility does not insert a request. Those refusals are `disabled`, `unauthorized`, `unbound`, `invalid_week`, or `busy`. They are not terminal observation outcomes, because no observation was authorized.

Busy means this operator already holds an unexpired lease. The new POST does not start a second GET. After 15 seconds the lease is dead. The next explicit POST closes the expired request as `failed` with reason `lease_expired`, then opens the new request. Closing an expired lease does not call Floor Command.

The pull flag is a deployment kill switch. It is not an observation authorization. A set flag with no POST creates no request. A POST with the flag absent creates no request.

## 4. Publication eligibility

Eligibility is judged on the single snapshot returned by the one authorized GET. This contract adds no second route, no HEAD, no sequence probe, and no producer change.

Before any accepted outcome, the snapshot must satisfy all of these:

| Check | Required value |
| --- | --- |
| Source | `deptsync.floor-command.orient.v1` |
| Store | The bound store, `2587` for the current operator |
| Week | `snapshot.operational_week` equals the requested week |
| Publication | `published` |
| Synchronization | `comparable` |
| Sequence | Integer `>= 1`. Sequence `0` is a week with no committed mutation and is ineligible. |
| Revision | Non-empty, and equal to `freshness.revision` inside the snapshot |
| Handoff id | `fc.zebra-handoff.{store}.{week}` |
| Handoff | `deadline_policy` is `monday_of_operational_week`. `deadline_date` equals `week_starting`. Status is `pending`, `partial`, or `complete`. `required_count > 0`. `confirmed_count + outstanding_count = required_count`. Status matches those counts. |
| Zebra completion | Every entry has `zebra_task_completed` false |
| Credential material | The body contains no bearer and no token field |

`published` means the producer put at least one non-cleared assignment in `entries`. An empty week can still be `comparable` at sequence `0`. That response is `rejected`, reason `unpublished`. The request ends. It is not `accepted_new`, `unchanged`, or `revised`. A later POST for a published week is a new request and is still allowed.

A week whose assignments were all cleared is also `unpublished` in the current producer, with rows on `retired`. This contract rejects that response and keeps the last accepted handoff. The request record stores the seen sequence and revision so the attempt is explainable. Those values do not become the working handoff.

`ordering_withheld`, a wrong week, a wrong source, a wrong store, a sequence older than the retained sequence, and the same sequence with a different revision are `rejected`. They do not replace the handoff.

## 5. Outcome state machine

Classification uses the retained handoff for that store-week. The first matching row wins. The legacy attempt row is not an input, except that the old route still refuses when it is `success_complete`.

| Order | Condition | Outcome | Working handoff | This request |
| --- | --- | --- | --- | --- |
| 1 | Lease expires before persist | `failed`, reason `lease_expired` | Unchanged | The late worker cannot commit |
| 2 | Transport failure, timeout, non-JSON body, redirect, or any HTTP status other than 200, 401, and 403 | `failed` | Unchanged | Terminal. No success |
| 3 | 401, 403, unpublished, withheld, invalid structure, wrong week, wrong source, or wrong store | `rejected` | Unchanged | Terminal. No success |
| 4 | No retained handoff for the week, and the snapshot is eligible | `accepted_new` | Insert the snapshot | Terminal success for this request only |
| 5 | Eligible snapshot, and the incoming revision equals the retained revision | `unchanged` | Body, sequence, revision, and original observed-at stay | Terminal. Sets `last_checked_at` |
| 6 | Eligible snapshot, different revision, and the sequence is less than or equal to the retained sequence or the high-water mark for that retained revision | `rejected` | Unchanged | Terminal. No success |
| 7 | Eligible snapshot, different revision, and the sequence is greater than both the retained sequence and that high-water mark | `revised` | Previous body appended to history, then replaced | Terminal success for this request only |

`unchanged` is the outcome whenever the incoming revision equals the retained revision. That includes a higher sequence number and a lower one. The canonical facts did not change, so the working snapshot is not rewritten and no source change is recorded. The request stores the sequence that was checked. `last_checked_at` moves forward. The retained sequence does not move backward. If the checked sequence is greater than the retained sequence, that checked sequence becomes the high-water mark for the same revision.

`revised` requires a sequence greater than both the retained sequence and that high-water mark, and a different revision. The new snapshot becomes the retained evidence. The previous snapshot remains addressable by its own revision.

A different revision at the retained sequence, or at a sequence already checked for the retained revision, is `sequence_conflict`. A different revision at a lower sequence is `older_sequence`. Both are `rejected`. The retained revision stays.

A success outcome consumes only that request. `failed` and `rejected` consume the request as a terminal non-success. They do not consume a future request, and they do not consume the frozen one-shot record. The operator may POST again. The server will not POST for them.

No outcome retries the GET. One request, one attempt.

## 6. Freshness and provenance rules

These clocks are different facts.

| Fact | Meaning | Updated when |
| --- | --- | --- |
| Last successful observation time | When the retained snapshot body was accepted. For `2026-W44` this remains `2026-10-29T00:40:17.666Z` until a `revised` or a first `accepted_new` replaces that body. | `accepted_new`, `revised` |
| Last checked time | When an eligible read returned the same revision. | `unchanged` |
| Last attempted time | When this request reached a terminal state, including failure and rejection. | Every terminal outcome |
| Source sequence and revision | The identity of the retained body. | `accepted_new`, `revised` |
| Age | Render-time distance from the successful observation time to the supplied clock. Not stored. Not a source change. | Never stored |
| Source changes known | Only a committed `revised` outcome, by comparing the history revision with the new revision. | `revised` |
| Checked recently | `last_checked_at` or the successful observation time is what Work may cite. A failure does not count as a check. | Successful classification only |

A successful GET is evidence about the source at `read_at` inside that response. After persist, that evidence is retained. Work must not call it a live Floor Command reading. The word `fresh` is not an outcome and is not a Work status.

The instant is stored in UTC. Work renders it in the operator's confirmed IANA zone, `temporal_settings.time_zone`. The zone abbreviation is part of the sentence, because this instant falls on the previous civil date in America/Denver. This contract did not re-read the operator's stored zone. If the confirmed zone is `America/Denver`, the retained instant renders as October 28 at 6:40 PM MDT:

> Observed October 28 at 6:40 PM MDT. Source sequence 8, revision c3a29fab9de35ca0. This is retained evidence, not a live Floor Command reading.

If the confirmed zone is missing or invalid, Work shows `2026-10-29T00:40:17.666Z` and says the time zone is unconfirmed. It does not assume Denver.

Age is stated as time since that observation, together with whether a later check happened:

> Not checked since October 28 at 6:40 PM MDT. Source changes since then are not known.

After an `unchanged` check:

> Observed October 28 at 6:40 PM MDT. Last checked {local time with zone}. Source sequence 8, revision c3a29fab9de35ca0. The source revision was the same. This is retained evidence, not a live Floor Command reading.

Forbidden sentences include "Everything is up to date," "current," and any sentence that treats a passed Monday or a complete entry handoff as Zebra task completion.

## 7. Historical retention model

The tables that exist cannot carry this contract. `floor_command_observation_attempts` is one row per operator and is frozen by section 1. `floor_command_observation_handoffs` is one working row per handoff id and overwrites that row. The claim table has no week and no request id.

A later implementation needs two new durable records. This tranche does not create them.

| Record | Role |
| --- | --- |
| Observation request | One row per authorized ask. Holds operator, store, source, purpose, week, request id, claim id, lease time, terminal outcome, reason, attempted time, and the sequence and revision that were seen. |
| Handoff revision history | Append-only. One row per accepted snapshot body, keyed by operator, handoff id, and revision. |

The working handoff table remains the single retained snapshot per store-week. History is the provenance. Work reads the working row plus the request record.

| Event | Working handoff | History | Request |
| --- | --- | --- | --- |
| The production one-shot, already stored | Stays the `2026-W44` row at sequence `8`, revision `c3a29fab9de35ca0` | A later migration may insert one history row that copies those exact values and labels the origin `one_shot`. The copy is not a new observation. | None. The frozen attempt remains the proof. |
| First observation of a week that has no working row | Insert | Insert the same body in the same transaction | `accepted_new` |
| Unchanged | No change to body, revision, sequence, or successful observation time | No new body | `unchanged`, and `last_checked_at` is set on the working row |
| Revised | Replace the working body with the new snapshot | Append the previous body first, in the same transaction. If that append fails, the replacement fails. | `revised` |
| Failed | No change | No change | `failed`, with the existing failure reason when one is known |
| Rejected, including a late unpublished read of an earlier week | No change | No change | `rejected`, plus the sequence and revision seen, when the body parsed |
| Newly published later week | Insert only that week's handoff | Insert only that week's body | `accepted_new` for that week. `2026-W44` stays. |

`2026-W45` is not observed by this contract. When the operator later names it, eligibility still requires `published`. An unpublished response is `rejected` and does not insert a handoff.

Late changes to `2026-W44` are a `revised` outcome only when a new request returns a greater sequence and a different revision. Until that request exists, the retained sequence `8` remains the displayed source evidence.

Dismissal stays per revision. A new revision is not hidden because an older revision was dismissed. Dismissal still does not mean Zebra completion.

## 8. Concurrency and recovery contract

The database is the lock. Process memory is not.

- One unexpired in-flight request per operator, enforced by a uniqueness constraint. A second week cannot be read while the lease holds.
- The claim id must match. A stale claimant's persist raises and writes nothing.
- Lease length stays 15 seconds, measured by database `now()`. The HTTP timeout stays 8 seconds.
- The same claim id inside the lease does not extend it.
- Persist of `accepted_new`, `unchanged`, or `revised` requires the unexpired claim, the bound store, the requested week, and the eligibility rules in section 4. The terminal outcome and the handoff change commit together. The claim row is deleted in that transaction.
- A different revision at a lower sequence, at the retained sequence, or at a sequence already checked for the retained revision, cannot update the working handoff.
- An equal revision cannot update the working handoff at any sequence.
- An expired worker cannot write a success after the lease. The next operator POST marks that request `failed` / `lease_expired` inside the transaction that opens the new request. That close-out performs no GET.
- The route issues one GET. It does not loop, back off, or schedule a retry.
- A repeated persist of a request id that is already terminal returns the stored outcome and does not GET.
- A new POST after a lost HTTP response is a new request id, because the client cannot present the old one. If the first request had committed `unchanged` or `revised`, the second read classifies from the retained evidence. It does not duplicate a handoff body when the revision is unchanged.

The legacy claim function remains in force for the old route. The new function must refuse to run when an unexpired legacy claim exists, and the legacy function continues to return `already_succeeded` for this operator without calling the new function.

## 9. Work presentation semantics

Work reads the retained handoff and the latest terminal request. The observation GET does not call Floor Command. There is no pull on open, on the 30-second clock, or on focus.

For the production reading, before any new request:

| Shown | Sentence or value |
| --- | --- |
| Week | `2026-W44` |
| When | Observed October 28 at 6:40 PM MDT, when the confirmed zone is `America/Denver` |
| Sequence and revision | Sequence `8`, revision `c3a29fab9de35ca0` |
| Zebra entry | `6` confirmed in Zebra. `3` still to enter. |
| Zebra task completion | Not shown as complete. Each entry remains not completed. |
| SMART deadlines | Target `2026-10-28`, final `2026-10-31`. Target `2026-10-28`, final `2026-10-29`. Both overridden. Neither needed review. |
| Age | Not checked since that observation. Source changes since then are not known. |
| Status | Retained evidence from the one-shot. No unchanged, revised, or failed follow-up exists. |
| Live versus retained | "This is retained evidence, not a live Floor Command reading." |

Later outcomes add one sentence:

| Latest request | Additional sentence |
| --- | --- |
| `unchanged` | "Last checked {local time with zone}. The source revision was the same." |
| `revised` | "This replaces the reading observed {previous local time}, sequence {previous sequence}, revision {previous revision}." |
| `failed` | "Last attempt {local time with zone} did not complete ({reason}). The reading still shown is the last accepted one." |
| `rejected` | "Last attempt {local time with zone} was not accepted ({reason}). The reading still shown is the last accepted one." |

Reasons stay specific: credential rejected, Floor Command unreachable, unpublished week, snapshot withheld, conflicting sequence, older sequence, store refused. A missing reason uses "Floor Command could not be read."

The posture named `current` is removed from the contract. A pull flag is not a reading. Per-bay rows stay inside the existing details disclosure. "Entered in Zebra" remains the label for `zebra_entered_at`. The Monday date remains the Zebra-entry deadline.

The control that creates a request is a separate explicit action. It sends the week the operator named. It is absent from the observation GET. This contract does not place that control on the open of Work.

## 10. Human-versus-agent authority boundaries

| Actor | Authority |
| --- | --- |
| Operator | Decides the week and performs the POST. That POST is the only authorization to read. |
| Orient | Stores the request, performs the one GET, classifies the snapshot, and renders retained evidence against the operator's confirmed clock. |
| Floor Command | Remains the authority for publication, assignment, Zebra task-entry confirmation, and confirmed SMART deadlines. |
| Personal agent, later | May propose that an observation be requested. The proposal is not a request row, not a claim, and not a GET. |
| Delegated agent execution | Not defined here. A later delegation contract would have to be authorized separately. This contract gives the agent no POST. |

Orient does not choose the week from the calendar, from Monday, or from the Sunday publication cron. The Sunday cron and the Pulse `pg_cron` job stay out of this path.

No classification inserts an Orient-owned task or commitment. Outstanding Zebra entries stay Floor Command facts inside the retained snapshot.

## 11. Minimum future implementation requirements

A later tranche may implement this contract locally only if it does all of the following:

1. Leave `claim_floor_command_controlled_pull`, `release_floor_command_controlled_pull`, and the current `persist_floor_command_observation` success behavior in place. The existing `success_complete` row still blocks the old route.
2. Add the request record and the append-only handoff history. Copy the existing `2026-W44` snapshot into history without changing it.
3. Add a new server entry point that creates a request only from an explicit same-origin POST of a named week, and only while the flag is exactly `1`.
4. Perform one GET, then classify with section 5. Refuse unpublished before any accepted outcome.
5. On `unchanged`, set `last_checked_at` and do not replace the snapshot.
6. On `revised`, append the previous snapshot and replace the working row in one transaction.
7. On `failed` and `rejected`, leave the working handoff in place.
8. Change Work to the sentences in section 9. Stop treating `success_complete` as `fresh`.
9. Keep the observation GET free of any Floor Command call.
10. Add tests for the frozen one-shot, unpublished rejection, equal revision, greater sequence with a different revision, same-sequence conflict, older sequence, lease expiry, stale claim, and the absence of task and commitment writes.

That tranche still does not set the flag, does not call production Floor Command, and does not apply the migration to hosted Orient. A production observation remains a later gate after that local implementation exists.

## 12. Explicit unresolved decisions

1. No agent delegation contract exists. This document does not choose its shape.
2. Work is required to name the immediately previous accepted revision after `revised`. A longer visible history is not specified.
3. The stored confirmed time zone was not re-read. The Denver sentence is the rendering rule for `America/Denver`, not a new observation of the operator's setting.
4. A fully cleared week remains `rejected` / `unpublished` until Floor Command's own publication rule changes. This contract does not change that producer rule.
5. When a local implementation may be deployed, and when the flag may be turned on for one operator request, are later gates. They are not granted here.

## 13. Recommendation

**GO** to request a local implementation tranche whose boundary is section 11.

**NO-GO** to treat this document as that implementation. **NO-GO** to migrate hosted Orient, enable the pull flag, schedule a read, or observe `2026-W44` or `2026-W45` from this tranche.

The one-shot remains the production authority until that later implementation is separately authorized and, after it, until a further gate allows one explicit operator request.

**STOP.**
