# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-011

Gate D. How Orient could keep a trustworthy sense of time about Floor Command evidence across weeks and revisions. Discovery only. Completed 2026-10-28.

No production read was taken. No pull flag was set. No credential, binding, sequence, handoff, or attempt was changed. The retained `2026-W44` observation remains the last verified source snapshot. Anything Floor Command changed after `2026-10-29T00:40:17.666Z` is unverified here.

**NO-GO** to implement, to turn the pull flag back on, or to schedule another observation.

**GO** to request a separate design tranche for operator-initiated re-observation only. That tranche writes a contract. It does not migrate, deploy, or pull.

## 1. Verified current architecture

Verified means the behavior is in the code that production ran, or in the RELEASE-010 record of that run. Proposed behavior is labeled later.

### Production identities at the last observation

| System | Identity |
| --- | --- |
| Floor Command | `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y` at https://deptsync-hub.vercel.app |
| Orient during the pull | `7a1fbfb` / `dpl_4yiisVTNbpFvpGixWe8Zodwrenrf` |
| Orient after the pull | `7a1fbfb` / `dpl_F6dHd83UbZn8jgdxtxYPuYiCibcK` at https://orient-cyan.vercel.app |
| Pull flag | `ORIENT_FLOOR_COMMAND_PULL_ENABLED` absent |
| Credential | `1a418da4-1926-4c69-b6f9-334b55b82828`, store `2587`, purpose `orient_published_week_read`, not revoked |
| Binding | one operator, user `a499dd01-095e-4bb0-8db9-c284c34a2ab2` |

The enabled and disabled Orient deployments were redeploys of the same commit. This discovery did not redeploy either system.

### Producer contract

Floor Command owns publication, assignment, Zebra-entry confirmation, and confirmed SMART deadlines. `GET /api/integrations/floor-command/published-week` returns one store-week snapshot. The bearer is a store-scoped hash. A supervisor session is not accepted. The optional `store` query is checked against the credential and is not authority.

The snapshot source is `deptsync.floor-command.orient.v1`. The handoff id is `fc.zebra-handoff.{store}.{week}`. Publication status is `published` when at least one non-cleared assignment is in the snapshot, and `unpublished` when that list is empty. `zebra_confirmation` is `confirmed` only when `zebra_entered_at` is present. `zebra_task_completed` is the constant `false`. Floor Command does not observe Zebra task completion.

The content revision is a hash of the canonical snapshot facts. It is the identity of what was read. `freshness.week_sequence` is the order. It lives in `floor_command_week_sequences`, one row per store and week-starting date. A missing row is reported as sequence `0`. The sequence advances once per committed transaction that changes assignment or confirmed-deadline facts, including `zebra_entered_at`, status, roster, bay, and confirmed SMART dates. A read does not advance it. A rolled-back write does not advance it.

`publishedWeekSynchronization` is `comparable` when ordering is established and the sequence is a non-negative integer. It is `withheld` when the deadline read failed, the sequence could not be proven, or the sequence raced. An empty unpublished week with sequence `0` is still `comparable`. RELEASE-009 recorded that for `2026-W45`.

### Consumer contract

Orient pulls only through `POST /api/integrations/floor-command/pull` with a JSON body of exactly `{ "week": "<ISO week>" }`. The route requires a same-origin signed-in operator. The server chooses the store, the source, and the purpose from configuration and the binding. The client cannot.

The pull runs only when `ORIENT_FLOOR_COMMAND_PULL_ENABLED` trims to exactly `1`. The flag is checked before a claim and before the GET. With the flag absent, the route returns `disabled` and does not contact Floor Command.

`GET /api/integrations/floor-command/observation` loads the retained reading for the signed-in operator. It does not call Floor Command. Opening Work uses that GET. Work does not call the pull route.

### The retained `2026-W44` observation

RELEASE-010 committed one observation. These values were true at `2026-10-29T00:40:17.666Z`. They are the retained snapshot, not a claim that Floor Command is unchanged now.

| Field | Retained value |
| --- | --- |
| Store / week | `2587` / `2026-W44` |
| Week starting | `2026-10-26` |
| Publication | published |
| Sequence | `8` |
| Revision | `c3a29fab9de35ca0` |
| Handoff | `fc.zebra-handoff.2587.2026-W44`, partial |
| Assignments | 9 current, 0 retired |
| Zebra entry | 6 confirmed, 3 outstanding |
| `zebra_task_completed` | false on every entry |
| SMART deadlines | target `2026-10-28` / final `2026-10-31`, and target `2026-10-28` / final `2026-10-29`. Both overridden. Neither required review |
| Attempt | one `success_complete`, reason null |
| Claims after commit | 0 |
| Orient-owned rows | 39 tasks, 2 commitments, 0 blocks, 0 protected time, unchanged by the pull |

### Sequence and revision semantics

The producer comparison is:

| Incoming versus retained | Decision |
| --- | --- |
| Synchronization withheld, or sequence not proven | `ordering_withheld` |
| No retained snapshot, comparable sequence | `apply` |
| Incoming sequence greater | `apply` |
| Incoming sequence smaller | `reject_older` |
| Same sequence, same revision | `replay` |
| Same sequence, different revision | `sequence_conflict` |

The consumer projection matches that order, with one difference. The same sequence and the same revision return `apply`, not a distinct `replay`. `planFloorCommandObservationWrite` then builds a write. Persistence updates the handoff row in place. An unchanged week is not stored as its own outcome.

A different revision replaces the row only when the incoming sequence is greater. The previous full snapshot is not kept. `superseded_assignments` keeps bays that disappeared between accepted observations of the same handoff. Cleared bays stay on `retired` inside the latest snapshot. Neither store is a revision history.

`reject_older` produces no write. `sequence_conflict` and `ordering_withheld` are failures. A failure write does not replace handoffs and does not clear `last_successful_observed_at`.

### The operator `success_complete` latch

`claim_floor_command_controlled_pull` has no week argument. It returns `already_succeeded` when that operator's attempt row is `success_complete`, before it considers a lease. One committed success blocks every later pull for that operator, including `2026-W45` and a later sequence of `2026-W44`.

The pull flag does not weaken the latch. Turning the flag on again still returns `already_succeeded` and does not send a GET. Deleting the attempt or the handoff to reuse the one-shot is not authorized.

This is at most one committed successful observation. It is not exactly-once HTTP delivery. A crash after the GET and before persist leaves no `success_complete` row. A crash after persist commits leaves the latch set and the claim already deleted.

### Claim acquisition, expiration, and release

One claim row exists per operator. The caller supplies a new claim id. Database `now()` starts a 15-second lease. The HTTP timeout is 8 seconds, so the lease can still cover persist after the response returns. The same claim id inside the lease does not extend it. A different claim id during the lease returns `busy`. After expiry, a new claim replaces the row.

Success persist checks the claim, the lease, the binding, the store, the source, and the sequence. It writes `success_complete` and deletes the claim in the same transaction. Release deletes the current claim only when the attempt is not `success_complete`. Release does not delete a handoff. A stale claim cannot release a replacement.

After `success_complete`, a later failure persist raises `floor_command_controlled_pull_already_succeeded`. The current contract cannot record credential rejection once the latch is spent.

### Approval and credential boundaries

Operator approval is `bind_floor_command_observation`. The signed-in user is bound to the server-configured store, `deptsync.floor-command.orient.v1`, and `orient_published_week_read`. The client does not choose those values. One binding. No second copy of store, source, or purpose is stored on the claim.

Floor Command stores only the token hash. `revoked_at` and `expires_at` fail the read with 401. A presented store that does not match the credential is 403. Orient stores the bearer in `ORIENT_FLOOR_COMMAND_READ_TOKEN`. The pull result and the Work reading do not include it. A 401 during an allowed pull is `credential_rejected` and outcome `revoked`. That path is unreachable for this operator while the latch stands, because the claim returns `already_succeeded` before the GET.

The three connection names remain configured. The pull name is absent. Absence is the off position.

### How Work displays the retained evidence

Work renders a closed disclosure. The production posture is `retained`, because the pull flag is off. The sentence is: retained from the last accepted read for store `2587`, and live reading is off, so this is not a new check.

Inside that disclosure, the observation status is still `fresh` whenever the last attempt is `success_complete`. There is no age test. RELEASE-010 saw: accepted at `2026-10-29T00:40:17.666Z`, and this screen did not request a new read. The handoff summary is "3 of 9 still to enter in Zebra," plus "6 confirmed in Zebra. 3 still to enter." Publication is stated as published. The Monday Zebra-entry deadline is shown. Per-bay rows stay inside a second disclosure. "Entered in Zebra" means `zebra_entered_at` was present. It does not mean the Zebra task was completed.

The posture `current` exists in code and means something narrower: the pull flag is on and the last attempt succeeded. It still says the screen did not request a new read. Production is not in that posture.

A failed attempt with a retained handoff is `stale`: the last accepted read is not current, and the failure reason is shown. A failed attempt with no handoff is `unavailable`. Those paths describe a failure before the latch. They do not describe the production row, which is `success_complete`.

Dismissing a revision hides it. The button says the revision was not marked complete. Dismissal is not wired as a Work action in the retained view's dismiss control unless a caller passes one. Hiding is not Zebra completion and not an Orient task.

Work does not create a Task, Commitment, Block, Protected Time, stewardship row, or Pulse grant.

### Existing schedulers and events

| Mechanism | What it does | Floor Command observation |
| --- | --- | --- |
| Floor Command Vercel cron `0 12 * * 0` on `/api/cron/weekly-rotation` | Sunday 12:00 UTC publication of the upcoming operational week, behind `CRON_SECRET` and the auto-publish latch | Does not call Orient. A configured web push notifies Floor Command devices about a created rotation batch. That push is not an integration event. |
| `floor_command_week_sequences` triggers | Advance the store-week sequence when assignment or deadline facts commit | A later authorized read can see the new sequence. Nothing notifies Orient. |
| Orient `pg_cron` job `orient-pulse-hosted-establishment` | Establishes authorized Pulse occurrences for commitment and block starts | Not an integration scheduler. Reusing it would mix Pulse authority with an external read. |
| Orient instrument `setInterval` of 30 seconds | Local clock tick | Does not call the pull. |
| Published-week GET | Read-only snapshot | No outbound signal, no Orient webhook, no shared event bus. |

Orient has no `vercel.json` cron. There is no background worker whose job is to observe Floor Command.

## 2. Cadence-model comparison

More frequent synchronization is not more trustworthy. The retained reading is already honest about when it was accepted. A cadence has to earn the credential use, the operator's attention, and a change to the one-shot latch.

| | A. Operator-initiated | B. Scheduled | C. Source-triggered |
| --- | --- | --- | --- |
| What happens | The operator names a week and requests one read. | Orient GETs on a clock under an approved cadence. | Floor Command tells Orient that published evidence changed, and Orient then reads. |
| Operational cost | One GET when a person asks. Zero while nobody asks. | One GET per approved tick, including weeks that did not change. | A new outbound path on every sequence advance, then a GET. Zebra confirmations during a week can advance the sequence many times. |
| Complexity | Extends the pull that already exists. The latch must learn a week and a sequence. | Needs a non-interactive authority, a bounded clock, and a stop when approval or the credential is gone. None of that exists. | Needs Floor Command to know Orient, a second credential direction, and a durable "changed" signal. The sequence trigger is not that signal. |
| Reliability | Fails closed. If the operator does not ask, the old reading remains labeled as retained. | A missed tick looks like silence. A stuck tick becomes background activity. The Sunday cron already has a different job and must not grow this one. | A missed signal looks like "unchanged." Delivery of the signal becomes a second source of truth. |
| Security | Keeps the signed-in operator, the same-origin POST, the flag, and the store-scoped bearer. | The session that approved the pull is not present on a clock. A service identity would be a new authority. | Floor Command would hold a way to invoke Orient, or Orient would poll a new change feed. Either widens the trust boundary. |
| Freshness | As fresh as the last request. The operator can see the gap. | A tick can be newer than a person's question and still be hours old. The display must not call that live. | Can be close to the committing write. Still a retained read after the GET returns. |
| Human attention | The person decides the reading matters. Work stays quiet between requests. | A schedule competes with attention unless the result is withheld when nothing changed. | Every Zebra confirmation and deadline edit can become an interruption. That is the opposite of a governed cadence. |

**A is the only model that fits the proven authority.** B and C are not justified. The Sunday publication and the mid-week Zebra confirmations are real, and they do not require Orient to be present for them. The sequence already lets a later read tell a new publication from an unchanged week.

B would also be the wrong owner of time. Orient's hosted clock establishes Pulse occurrences for commitments and blocks the operator already authorized. Floor Command evidence is not a Pulse grant.

C would make Floor Command call into Orient, or would make the sequence trigger an integration side effect. The trigger's job is to order facts inside Floor Command. Giving it a second job couples publication to a consumer.

## 3. Freshness-state definitions

Two layers. The source snapshot says what Floor Command had committed at `read_at`. Orient's reading says what Orient has since done with that snapshot. Work must show both, and it must not collapse them into "current."

### Source facts, copied from Floor Command

| Fact | Meaning |
| --- | --- |
| Current source evidence | A snapshot whose `read_at`, sequence, and revision were just returned by an authorized GET. It is current only for that response. |
| Previously observed evidence | The handoff row Orient still holds: sequence, revision, `last_successful_observed_at`, and the snapshot body. |
| Evidence that may have changed | Not knowable from age. Orient can say this only after a newer comparable sequence is read, or after a read fails and therefore cannot prove the retained sequence. Absence of a new read is "not rechecked," not "changed." |
| Evidence that is unavailable | The producer returned `availability: unavailable`, or synchronization `withheld`, or the GET failed. The previous snapshot stays. |
| Unpublished week | `publication.status` is `unpublished` because no non-cleared assignment was in the snapshot. Sequence may still be `0` and synchronization may still be `comparable`. |
| Revised published week | The same handoff id, a greater sequence, and a different revision, after a published snapshot is accepted. |
| Unchanged published week | The same handoff id, the same sequence, and the same revision. The producer calls this `replay`. The consumer currently treats it as another `apply`. |
| Failed observation attempt | `last_attempt_result` is `failure` with a reason. If a handoff exists, it remains the last accepted snapshot. |

`zebra_task_completed: false` is a source fact on every entry. A handoff status of `complete` means every current assignment has `zebra_entered_at`. It does not mean the associate finished the Zebra task.

### What Work should say

The production sentences already refuse to pretend that opening Work is a new read. They still overload the word fresh. `projectFloorCommandObservation` sets `fresh` for every `success_complete`, with no clock and no new GET. Inside a `retained` posture, the handoff then says "Accepted at {time}." That timestamp is true. The status name `fresh` is not a live-truth claim, and Work should stop using it that way.

A later presentation, when separately authorized, should say:

- Observed at `{last_successful_observed_at}`.
- Source revision `{revision}`, sequence `{sequence}`.
- This is the retained Floor Command reading. This screen did not read Floor Command again.
- When the last attempt failed: the retained reading is still the last accepted one, and the attempt failed because `{reason}`.
- When the week is unpublished: Floor Command had not published this week at the time of the reading.
- When Zebra entry is confirmed: entered in Zebra at `{zebra_entered_at}`. Not shown as task completion.

The posture `current` should not mean "the pull flag is on." A flag is permission to read. It is not evidence that a read just happened.

## 4. Weekly transition model

Dates below are the Floor Command week contract. Store time in the Sunday runner is America/Denver. The cron instant is 12:00 UTC Sunday, which is 06:00 MDT or 05:00 MST.

### `2026-W44` to `2026-W45`

`2026-W44` starts Monday `2026-10-26` and ends Sunday `2026-11-01`. The retained observation is that week, sequence `8`, revision `c3a29fab9de35ca0`.

`2026-W45` starts Monday `2026-11-02`. At the RELEASE-009 recompute it had no sequence row, sequence `0`, publication `unpublished`, handoff `none`, and synchronization `comparable`. This discovery did not recompute it. If it is still unpublished, a pull of it under the current consumer would be eligible to commit `success_complete` for an empty week and would spend the operator latch. That is why `2026-W45` must not be requested while this latch exists, and why a later contract must not treat an unpublished comparable snapshot as an accepted operational week.

### Sunday automatic publication

`sundayStagingWeekLabel` on a Sunday in the store timezone returns the upcoming Monday's ISO week. The 2026-11-01 12:00 UTC cron, if the store schedule still opens and the auto-publish latch is still on, is the runner that publishes `2026-W45`. The 2026-10-25 run published `2026-W44` in that same shape. Publication writes assignments. Those writes advance that week's sequence. Orient is not in the path.

### Monday operational handoff

`deadline_policy` is `monday_of_operational_week`. `deadline_date` is the Monday the week starts (`week_starting`), not the Sunday the cron ran. For `2026-W44` that Monday was `2026-10-26`. For `2026-W45` it is `2026-11-02`. The handoff counts are Zebra-entry counts. Monday is the entry deadline in the snapshot. It is not a task-completion deadline, and it is not an Orient commitment.

The retained `2026-W44` reading was taken after that Monday, at `2026-10-29T00:40:17.666Z`, with 3 entries still unconfirmed. That remainder is source evidence from that instant.

### Changes during the week

Each of these advances the sequence of the week whose row changed, and changes the revision, when the write commits:

| Change | Source effect | Orient until a later authorized read |
| --- | --- | --- |
| Zebra entry confirmation | `zebra_entered_at` set. Confirmation becomes `confirmed`. Handoff counts move among pending, partial, and complete. | Retained counts stay. Task completion stays false. |
| SMART deadline change | Confirmed target, final date, override, or review flag changes on `associate_week_deadlines`. | Retained dates stay. A failed deadline read on a later pull would keep the last confirmed dates and mark deadlines unavailable. |
| Retirement | Status `cleared` removes the bay from current entries and lists it under `retired` with reason `cleared`. | Not visible until a greater sequence is accepted. |
| Reassignment | Roster or bay change advances the sequence. A row with no `zebra_entered_at` is unconfirmed. | Not visible until a greater sequence is accepted. |
| Late edit of an earlier week | The sequence is keyed by store and `week_starting`. A late edit of `2026-W44` increments `2026-W44` only. | It can replace the retained `2026-W44` snapshot only when the incoming sequence is greater. It does not authorize reading `2026-W45`. |

A fully cleared week has no current entries, so the composer reports publication `unpublished` and handoff `none`, while cleared rows remain on `retired`. That shape is still Floor Command evidence. It is not Orient completion.

## 5. Proposed observation lifecycle

The names in the mission split across two owners. The integration mechanism records authority and the attempt. Orient's temporal interpretation is computed when Work renders. It is not a second workflow and not a scheduler.

| State | Owner | Meaning |
| --- | --- | --- |
| Authorized | Integration | A binding exists for this operator, store, source, and purpose, and the server credential is configured. The pull flag is a separate permission, currently off. |
| Due for observation | Temporal interpretation, only if a later contract defines it | Not a row. Not a cron. A due state that fires by itself is model B. Under model A, nothing is due until the operator asks. Monday's handoff date may be shown as a source date. It does not create a due job. |
| Observation in progress | Integration | The claim lease is held. At most one claim per operator. |
| Accepted | Integration | Persist committed a snapshot for that handoff at a sequence and revision, with `success_complete` for that observation. Today's latch uses this word for the operator's only success. A later contract has to scope it to the store-week observation, not to the operator forever. |
| Unchanged | Integration result | Same sequence and same revision as the retained handoff. Record the attempt. Do not rewrite the snapshot and do not mint a new success that blocks other weeks. The consumer does not do this yet. |
| Failed | Integration | The attempt failed. The retained snapshot stays. The reason is one of the existing failure reasons. |
| Stale | Temporal interpretation | Today this means the last attempt failed and a snapshot remains. Keep that meaning. Do not add a clock-based stale. Age is not evidence that Floor Command changed. |
| Revoked | Integration | The credential returned 401, or the binding no longer matches store, source, and purpose. The retained snapshot stays visible as retained. Further pulls stop. |

Do not add a generic observation engine. The tables that already exist are the binding, the handoff, the attempt, the dismissal, and the claim. A later design may add a week to the attempt. It should not add a bus, a queue, or a Pulse grant.

## 6. Concurrency and security

The production latch stays as it is. The notes below are constraints on a future design. They are not a migration.

- Replace the operator-wide latch by extending what `success_complete` scopes to. Do not delete the existing attempt or handoff to reset it. A new contract accepts another observation only through a new function that still refuses this operator's current row until that function exists. Shipping the new function is a later authorization.
- One in-flight claim per operator remains enough. Overlapping weeks do not need overlapping GETs. `busy` already covers the overlap. The lease stays longer than the 8-second timeout and still expires, so a crash can be retried without a sweeper.
- A retry after a crash is allowed only when no `success_complete` was committed for that observation and the lease is expired. The Floor Command GET does not mutate Floor Command. Repeating it is safe. Repeating it inside one operator gesture is not required.
- Historical revisions: accepting a greater sequence may replace the working snapshot. If the design keeps the previous revision, that is an append of the prior snapshot, not an overwrite that forgets the sequence. The current table keeps one row per handoff id. Whether to append is an unresolved decision. Until it is decided, the working copy remains the latest accepted sequence only, and Work says so.
- Older evidence: incoming sequence less than retained produces no write. Same sequence and a different revision is a conflict and produces no replacement. A clock timestamp is not the order.
- Credential revocation: a 401 does not delete the snapshot. It must become recordable even after an earlier success. Today's persist cannot do that. A future failure after success may mark the credential unusable and must not clear `last_successful_observed_at` or downgrade the accepted snapshot into a fabricated empty week.
- Operator approval: every pull still requires the signed-in operator who holds the binding. A schedule would need a different authority. This design does not create one.
- Duplicate commitments: the observation write path does not insert tasks, commitments, blocks, or protected time. A later observation of the same bay must not start doing so. Reconciliation ids stay inside the Floor Command snapshot.
- Unbounded activity: model A has no loop. The flag remains default-off. A disabled flag returns before the claim. An unpublished week must not be a committing success. A comparable sequence of `0` with publication `unpublished` is the hazard RELEASE-009 already recorded.

## 7. Temporal value

Orient can understand only what the snapshot already states, plus a labeled comparison with Orient-owned time. It does not gain Floor Command's authority by reading it.

### Source facts already in the retained snapshot

- Which published bays are still awaiting Zebra entry, and which have `zebra_entered_at`.
- The Monday entry-deadline date on the handoff.
- Confirmed SMART target and final dates, whether those dates were overridden, and whether Floor Command marked them as needing review.
- Cleared bays versus bays that disappeared between accepted observations.
- The sequence and the revision, so a later read can tell a new publication from the same one.

### Interpretations Orient could show later, still without creating rows

These are not source facts. They are readings across two authorities. They stay out of Tasks and Commitments.

- The retained outstanding count, restated as responsibilities awaiting Zebra entry at the time of the observation.
- A SMART final date placed beside the operator's own Work schedule or protected time, described as a possible overlap. Orient does not decide which one wins.
- After a second accepted observation of the same week: which bays became confirmed, which were cleared, and which deadline dates moved. The producer already computes added, removed, and reassigned ids when it is given a previous projection. Orient today stores superseded bays, not that full reconciliation. A diff is available only after a later observation exists.
- An unpublished week shown as "not published at the time of the reading," which tells the operator there is no handoff yet.

Zebra task completion is not in the snapshot. Orient must not infer it from a complete handoff, a passed Monday, or a SMART final date.

## 8. Reusable versus domain-specific mechanisms

The Floor Command path already demonstrates a few mechanisms that could apply to another sovereign system later. They are not a framework. Each source still needs its own contract, credential purpose, and snapshot.

Reusable only as a pattern, copied narrowly when a second source is separately authorized:

- Operator approval of a server-configured source. The client does not choose the scope.
- A purpose-locked credential. The source stores a hash. The consumer holds the bearer on the server.
- An enable flag that defaults to absent, checked before any network call.
- One short claim lease per operator, acquired before the read and released on failure.
- A source-owned sequence plus a content revision. The consumer rejects older and conflicting evidence.
- A retained snapshot that is not a user-owned commitment.
- A failed read that keeps the last accepted snapshot and says why.
- A Work surface that shows observed-at and does not refresh on open.

Domain-specific to Floor Command, and not to be generalized now:

- The published-week route, the ISO week, the store number, and the Zebra handoff id.
- `zebra_entered_at` versus task completion.
- SMART deadline rows and the Monday entry deadline.
- The Sunday rotation cron and the week-sequence triggers.
- The decision that an empty comparable week is not an accepted handoff.

Wealth Engine remains the authority for financial truth. This design does not read balances, items, or financial credentials. Carb Buddy remains the authority for its own records. This design does not read care data. Orient's Pulse cron remains the authority for establishing an authorized commitment or block occurrence. It is not a transport for either system.

A second integration is justified only after this Floor Command cadence has a contract of its own. Building the shared layer first would invent infrastructure the second source has not asked for.

## 9. Risks and unresolved decisions

Risks if the current latch is left in place:

- The retained `2026-W44` reading drifts from Floor Command, and Work can still show observation status `fresh` inside posture `retained`. The sentences say the screen did not recheck. The status name overclaims.
- `2026-W45` publication will not appear in Orient. That is safe. It is also a permanent gap until a new contract exists.
- Turning the pull flag on does not create a second observation. It returns `already_succeeded`. The risk is an operator believing the flag reopens the read.

Risks if a later tranche gets the contract wrong:

- Accepting an unpublished comparable week spends authority on an empty handoff.
- Treating same-sequence replay as a new `success_complete` can block a real later week if the latch stays operator-wide.
- Recording a failure after success by clearing the snapshot would destroy the only verified reading.
- A clock-based stale state would tell the operator that evidence changed when Orient only knows that time passed.
- Attaching the Sunday cron or the Pulse job to the pull would start background reads without a new authority decision.
- Creating a task per outstanding bay would duplicate Floor Command and violate the observation boundary that RELEASE-010 held.

Unresolved, and required before any implementation:

1. Whether `success_complete` becomes per store-week observation, or per accepted sequence, and how the existing operator row is preserved rather than deleted.
2. Whether an unpublished snapshot is refused before persist, or stored as an explicit non-acceptance that does not satisfy the handoff.
3. Whether an unchanged replay writes anything.
4. Whether the previous revision of a handoff is appended or replaced.
5. How a 401 after a prior success is stored without opening another pull loop.
6. The Work sentences that replace status `fresh` for a retained success.
7. Whether a named week in the POST remains the operator's choice, with no default week inferred by the server.

## 10. Recommended next boundary

**NO-GO** for implementation, migration, a pull, a flag change, credential rotation, or another observation.

**GO** for a separately authorized design tranche. Its only output is a contract for model A: the operator requests one named week, Orient performs one authorized read, and Work labels the result as retained evidence with its observation time and source revision.

That contract is in scope only for:

- scoping a committed observation so a later published week, and a later sequence of a retained week, can be accepted without deleting the `2026-W44` row
- refusing an unpublished week as a committing success
- defining unchanged, revised, failed, and revoked as the states in section 5
- Work copy that shows observed-at, sequence, and revision, and that does not call a retained success fresh
- keeping tasks, commitments, blocks, protected time, and Pulse untouched

That contract is out of scope for a scheduler, a Floor Command webhook, a change to the Sunday cron, a change to the sequence triggers, a Pulse job, a second credential purpose, Wealth Engine, Carb Buddy, and any production apply.

If that design is not requested, the trustworthy steady state is the one RELEASE-010 left: one retained `2026-W44` observation, the pull flag absent, and the operator latch spent.

**STOP.**
