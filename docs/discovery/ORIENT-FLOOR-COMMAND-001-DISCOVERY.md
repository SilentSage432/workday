# ORIENT-FLOOR-COMMAND-001 — External commitment consumer discovery

**Status:** DISCOVERY ONLY. No runtime, route, credential, migration, notification, or live connection.  
**Date:** 2026-10-24  
**Orient repository:** `workday`  
**Floor Command repository:** `carpet-auditor` (product name DeptSync; operator surface Floor Command)  
**Producer contract:** `carpet-auditor/docs/product/DEPTSYNC_FLOOR_COMMAND_ORIENT_001_CONTRACT.md`. Source version `deptsync.floor-command.orient.v1`.  
**This document does not amend** [PRODUCT.md](../../PRODUCT.md), [DOMAIN.md](../../DOMAIN.md), [TIME_MODEL.md](../../TIME_MODEL.md), or [ARCHITECTURE-001](../architecture/ARCHITECTURE-001.md). A later decision record would be required before any implementation.

**Verdict: NO-GO for a live connection.**

Fixture projection [ORIENT-FLOOR-COMMAND-002-PROJECTION.md](ORIENT-FLOOR-COMMAND-002-PROJECTION.md) is local only. It does not connect, persist, or notify.

---

## 1. What Orient implements today

Orient helps one person stay oriented in time they have already established. It does not manage that life, rank what matters, or act for them. The repository folder is `workday`. The product name is Orient.

The accepted runtime is one Next.js application, Supabase Auth for one provisioned user, and a dedicated Supabase project (`ksmhgaamyheyhefbyglb`). That project is not DeptSync, Wealth Engine, or any other product database. Public sign-up is off. The browser reads and writes user-owned rows under row-level security. Secrets and provider credentials stay on the server. There is no second backend, event bus, or plugin framework.

Passing time does not refetch. A projection may re-run on a local tick. A refetch happens when the user writes, when the app regains focus, or when an adapter finishes a sync. A failed load stays failed. An empty successful read is not the same thing as a failed read. `SourceRead` is either `{ status: "ready", rows }` or `{ status: "failed", message }`.

### Temporal facts Orient already stores

| Fact | Meaning | Who may change it |
| --- | --- | --- |
| Commitment | Time constrained by something the user has committed to. All-day is one civil date. Timed is a local start and end. `origin` is only `user_created`. | The user, through Orient writers |
| Block | Time the user chose a purpose for | The user |
| Protected Time | Time the user made unavailable for allocation | The user |
| Work schedule | One personal shift state per civil date: missing, Off, or Opening / Mid / Closing | The user |
| Task | Action the user explicitly recorded. Planned day, due day, Must Do, and completion stay independent | The user |
| Recurring Task | A definition that materializes an ordinary Task for a Lowe's Saturday-first fiscal week | The user establishes the definition. Completion is Task completion |
| Stewardship | A repeating responsibility in the user's words. An occurrence is derived. Satisfaction means the user gave that cycle enough attention | The user |
| Note | Retained experience. No obligation | The user |
| Active Thread | The one open Task the user explicitly established as current intention | The user. A clock boundary does not clear it |
| External temporal fact | Evidence of a Google Calendar interval. Separate store. Orient does not own it | Google, observed by a server adapter |

Timeline, Day, Week, Month, Current Temporal Orientation, and present-moment orientation are projections. They are not tables. They do not merge overlapping facts into one event, and they do not rank them. An empty present means no established fact contains that instant. It does not mean the time is free.

### Attention and interruption already implemented

Three authorities stay separate:

- **Must Do** is a flag the user sets on a Task. It is not Priority and it does not authorize interruption.
- **Stewardship satisfaction** is the user saying this cycle received enough attention. The ACT correction strip calls the undo "Not yet this cycle." That is not operational completion in another system.
- **Pulse** is durable evidence that an explicitly authorized temporal condition became true. The authorized sources today are a timed Commitment start and a timed Block start, each with a human Interrupt Grant and a positive lead, plus the later ARRIVAL relationship. Expression is a notification-class perception of an occurrence that already exists. A claim that the device expressed it is not acknowledgement and not completion. Non-acknowledgment is not failure. Silence is valid. Repeated nagging is not a Pulse. Hosted `pg_cron` may establish an occurrence while the app is closed. Android and the watch only perceive an occurrence id. They do not decide that a Pulse is allowed.

External calendar facts, Tasks, Must Do, Work, and stewardship do not authorize a Pulse by themselves.

ACT shows, in a stable order and only from what the user already established: Must Do, unsatisfied stewardship for a Scheduled workday, Tasks planned for the viewpoint day, then other open Tasks. Off or a missing Work row hides stewardship from that primary surface. Resume stays outside ACT.

### External integration already implemented

Google Calendar is the first external temporal source, and it is implemented as observation:

- The human connects an account and selects calendars.
- `POST /api/external/google/observe` reads a bounded window on the server.
- A service-role transaction upserts external facts. The browser cannot write them.
- Identity is the source's own event id. A repeated observation updates the same row.
- Cancellation stays cancelled. Absence inside a completed window is a distinct lifecycle, and it is applied only after a complete successful read.
- A failed or partial refresh does not delete last-known facts and does not count as an empty calendar.
- Freshness is derived: never observed, fresh, stale after failure, stale after partial, or unavailable.
- Present admits an active external fact only when freshness is fresh and the interval contains the instant. Day and Week may still show last-known active evidence as stale.
- Correction authority on the projection is `external`. Direct manipulation does not edit these facts.
- The domain never sees Google types. `integrations/` was the intended adapter boundary. The Google adapter itself now lives under `server/googleCalendar/`. `integrations/README.md` still says Google Calendar is not implemented. That sentence is stale.

DeptSync is named in product law as a separate system. No DeptSync adapter, credential, table, or route exists in Orient. ARCHITECTURE-001 still refuses a shared database.

### Production readiness

Orient is in daily use for temporal orientation, capture, Work schedule, external calendar observation, stewardship, recurring Tasks, and Pulse delivery to the phone and watch. Operational adoption, in the sense of the adoption contract, is still open. Week and Month perception exist. Several product questions remain unresolved, including reschedule, the life-day boundary, and which external events become user-owned Commitments. None of those open questions is permission to collapse an external operational record into a Commitment.

The current Pulse sequence is human ARRIVAL authority, then ARRIVAL expression. This discovery does not insert itself ahead of that sequence, and it does not start it.

---

## 2. What this integration can reuse

Reuse the relationship, not the calendar shape.

| Existing contract | Reuse for Floor Command |
| --- | --- |
| Separate store from user-owned Commitments, Tasks, Blocks, and Protected Time | Yes. Observation must not become ownership |
| Server adapter. Browser session is not the provider credential | Yes |
| Human chooses to connect a source | Yes. No ambient coupling |
| Stable source identity, upsert in place, same revision writes nothing new | Yes. Floor Command already defines the ids and the revision |
| Failed read is not an empty source. Last complete success remains, labeled stale | Yes |
| Absence or supersession only after a complete successful read | Yes |
| Provenance stays visible. Correction authority stays with the source | Yes |
| `SourceRead` failure stays failure | Yes |
| One dedicated database. No shared Supabase project | Yes |
| Pulse law: no interruption without an explicit human grant, and one occurrence per authorized condition | Later, and only for a condition Orient is allowed to represent. Not in the first integration |
| Factual language. A passed target is not failure copy | Yes |

Do not reuse these stores as the Floor Command record:

| Store | Why it does not fit |
| --- | --- |
| `commitments` | Writers force `origin: user_created`. A Commitment is an interval the user owns. The Zebra handoff is a Monday civil deadline with a status, and it must be visible on Sunday after publication, including when Sunday is Off. An all-day Monday Commitment contains only Monday |
| `external_temporal_facts` | Timed or all-day intervals for a calendar. No handoff status, partial confirmation, review flag, store, operational week, or unavailable-deadline distinction. Putting the handoff here would show it on the calendar landscape and would hide it on Sunday |
| `tasks` and recurring Tasks | Completion would be Orient's. Recurrence is a Saturday-first fiscal week. Materializing a Task would duplicate the operational record and let a checkbox claim Zebra entry |
| Stewardship satisfaction | Means the user gave a cycle attention. The cycle is a Scheduled workday or a Saturday-first fiscal week. Off hides it. Sunday early entry would disappear on an Off Sunday. Satisfaction is not `zebra_entered_at` |
| Interrupt Grant / Pulse source kinds | Only `commitment` and `block`. An external snapshot cannot mint a Pulse by being read |

---

## 3. What is missing

| Concern | In Orient code | In Orient docs | In the Floor Command contract | Missing |
| --- | --- | --- | --- | --- |
| Externally sourced calendar intervals | Yes. Google observation | Yes | Not this payload | A non-calendar operational snapshot |
| Source-linked identity | Yes, for calendar events and for Note→Task citation | Yes | Yes. `fc.publication`, `fc.zebra-handoff`, `fc.assignment`, `fc.deadline` | Orient persistence for those ids |
| Proposed versus confirmed | Unconfirmed meaning is not established. The user establishes facts | Capture may propose; the user establishes | Unconfirmed SMART suggestions are omitted. Confirmed and confirmed-needs-review are included | Nothing to invent. Orient shows only what the snapshot includes |
| Temporal deadline | Task due day. Commitment interval. Recurring Task weekday | Deadline, target, and objective stay distinct | Handoff deadline is Monday's civil date, no clock. SMART target and final are separate civil dates | A reading that can show a deadline before the deadline date, without turning a target into a deadline |
| Recurring operational responsibility | Stewardship and Recurring Task, fiscal week | Cadence is not a generated Task | One handoff per store per ISO operational week | ISO-week identity. Orient's fiscal week must not be used as this key |
| Revision tracking | Calendar provider version token. Stewardship wording revisions. Pulse source fingerprints | Provenance fields, not an event log | `freshness.revision`, 16 hex chars. `read_at` is not part of it | Orient storing the last revision |
| Superseded or cancelled | External lifecycle `cancelled`, `deleted`, `absent_from_window`. Note retire | External absence rules | Cleared rows are `retired`. Deleted rows vanish. Reconciliation lists removed ids. Orient must keep history | Supersede-without-delete for an observed handoff |
| User acknowledgement | Pulse claim is not acknowledgement. ACT's "marked satisfied" is stewardship | Pulse law | Floor Command keeps no Orient acknowledgement log | A personal seen/dismissed mark for one revision |
| Completion evidence from the source | No | DeptSync remains authoritative | `zebra_entered_at` means the supervisor confirmed the Zebra task was typed. `zebra_task_completed` is always false | Orient must display that evidence and must not write it |
| Read endpoint and read-only credential | No | "No integration is authorized" | `authorizeFloorCommandOrientRead` is a pure function. No route, no credential | Both, on the Floor Command side |
| Store-scoped pull | No | Architecture allows a future narrow adapter | Pull snapshot. No webhook in that design | The adapter |

---

## 4. Floor Command contract mapping

The producer contract is present. This discovery does not invent a second schema. It consumes the snapshot `composeFloorCommandOrientRead` already returns.

The composer is local. It is not an HTTP route. It is not deployed. The contract's own release line is NO-GO before the Sunday 2026-10-25T12:00Z publication run, and the contract is not part of that run.

A ready snapshot carries:

- Store number, operational week label, Monday `week_starting`, Sunday `week_ending`
- Publication id and `unpublished` or `published`. Published means at least one current, non-cleared Sunday assignment
- One handoff id per store per week, with status `none`, `pending`, `partial`, or `complete`, the Monday deadline date, and counts
- One entry per current bay: assignment id, bay, department, roster id or null, display name, Zebra confirmation, and `zebra_task_completed: false`
- Deadline commitments only when a date pair is confirmed. `review_required` stays on the commitment. A failed deadline read sets `deadlines.availability` to `unavailable` and does not wipe the publication
- Retired cleared rows
- Reconciliation, when the caller passes the previous projection: added, removed, reassigned, deadline added/removed, and whether the revision matches
- Freshness: `read_at`, `source_updated_at`, `revision`

An unavailable read is `assignments_unavailable`, `invalid_week`, or `store_required`. That result is not an unpublished week.

Identity rules already fixed by the producer:

| Object | Id | Changes |
| --- | --- | --- |
| Publication | `fc.publication.{store}.{week}` | Store digits ignore leading zeros. `2587` and `02587` are one store |
| Handoff | `fc.zebra-handoff.{store}.{week}` | One per store-week, not one per bay |
| Bay | `fc.assignment.{sunday_bay_assignments.id}` | The id survives a roster change on that row |
| SMART commitment | `fc.deadline.{store}.{week}.{roster_specialist_id}` | Only after confirmation |

The operational week is an ISO week, Monday through Sunday (`isoWeekCalendarRange`). For `2026-W44`, Monday is `2026-10-26` and that Monday is the handoff deadline. Sunday publication can be completed early. No shift clock is included. Typical workdays are not in the payload.

Orient's Work week is Saturday through Friday. Those weeks are not interchangeable. A Floor Command week must be stored and shown as the ISO week in the snapshot. Stewardship's `lowes_fiscal_week` and Recurring Task's fiscal cycle must not become this identity.

Name-only published rows are included with a null roster id. Orient must not invent an associate id. The producer still counts them in the handoff. Whether a null roster should block the handoff is an open operational choice on the Floor Command side. Orient displays the null and the count it was given.

---

## 5. Recommended architecture

**Pull the snapshot through a narrow read-only adapter. Do not add a push. Do not add a second system between them.**

### Compared

| | A. Orient pulls a scoped snapshot | B. Floor Command emits a publication event, then Orient reads | C. A mediating integration service |
| --- | --- | --- | --- |
| Authentication | A store-scoped read credential Orient holds on the server. Not issued today | Same credential, plus a way to authenticate the event | Another credential boundary and another place to store it |
| Store isolation | The credential names the store. The client does not choose a store. The snapshot's store must match | The event can be mis-scoped unless the later read repeats the same check | Easy to widen into a general bus |
| Freshness | As fresh as the last successful pull. Focus and an explicit refresh match Orient's existing refetch rule | Wakes Orient sooner after Sunday publication. The event is still not the snapshot | No freshness gain over A |
| Reliability | A missed poll only delays attention until the next successful read | Needs retry, signature, and replay protection. A lost event must still be recovered by a pull | More failure points |
| Retry and idempotency | Same revision is the same information. Upsert by source id | The event must not create a commitment. The following read uses the same revision rule | Same rule, more machinery |
| Revision handling | Caller passes the previous projection. The composer returns the diff | Same, after the read | Same |
| Offline | Last complete snapshot remains, marked stale. No offline queue exists in Orient, and this integration should not add one | An event received with no following read must not change the snapshot | Same constraint |
| Notification timing | No notification falls out of the pull. Attention is the in-app reading. A Pulse would be a later, explicit grant | Tempting to treat the event as a notification. That would bypass Interrupt Grant law | Same temptation |
| Operational complexity | One read path. Matches the producer contract, which already says Floor Command will not push | A new outbound path in Floor Command during the week AUTO-008 is about to publish for the first time | A third runtime |
| Security exposure | One server-held read secret, one store | A public receiver, signatures, and the read secret | Both, plus a service that can see both products |

A is the smallest path that matches both architectures. The adapter is the `integrations/` boundary ARCHITECTURE-001 already requires: the only code that knows Floor Command's request shape. That is the useful part of C. C as a separate service is rejected.

B can be reconsidered only after a pull exists and a real delay is shown. The event would carry an id, the way FCM carries a Pulse occurrence id. It would not carry assignment rows. It would not authorize a notification by itself.

### What Orient would persist

One observation record per connected user and store, not a task database:

- Connection state: not connected, connected, auth failed, disconnected
- Last attempt result and last successful `read_at`
- The last complete snapshot, normalized by the producer ids
- The last `revision` and the previous entry ids, roster ids, and deadline ids needed to ask for reconciliation
- A personal attention mark: which revision the user has seen or dismissed

The browser would receive that observation through a `SourceRead`. It would not receive the Floor Command credential. Authenticated users would not write operational rows. A server transaction would upsert them, following the Google observation rule: a non-complete attempt updates attempt evidence only.

Orient would not persist bank data, PINs, phone numbers, typical workdays, shift times, or roster rows the snapshot does not already contain.

### What Orient would display

On a Work reading, as evidence from Floor Command, for the current published week and any earlier week whose handoff is still `pending` or `partial`:

- One line for the handoff: week label, Monday deadline date, status, and the outstanding count
- The bay list as read-only detail inside that one handoff, not as separate Orient Tasks
- Confirmed SMART target and final dates, with review called out when `review_required` is true
- Provenance: Floor Command owns this. The user cannot edit it here

The line is visible on Sunday after a successful observation of a published week, even when Sunday is Off. It is not admitted by "does this interval contain now," and it is not admitted by the stewardship Scheduled-workday gate.

Present-moment orientation does not gain a new input from this reading. The handoff does not become the Active Thread. It does not rank above a Commitment or a Block.

Copy stays factual. "4 of 12 still to enter in Zebra." "Floor Command could not be read." "These dates need review in Floor Command." No overdue count, no failure label, no inferred urgency.

### Notification

The first integration has no notification and no new Pulse source.

A later Pulse is allowed only if the user explicitly grants interruption for one relationship, for example the Monday civil boundary while the handoff is still `pending` or `partial`. That grant is not created by publication, by Must Do, or by a repeated pull. One grant and one handoff identity mint at most one occurrence for that condition. A later week is a different handoff id. An identical revision does not mint another. Dismissing or failing to tap the notification does not complete the handoff and does not schedule a nag.

### Completion

The handoff is complete only when the snapshot says `complete` or `none`. `complete` means every current required row has `zebra_entered_at`. `none` means there is no current published assignment. Associate Zebra-task completion is never in the snapshot. Orient does not mark either one.

SMART dates are shown. Orient does not complete them.

### Return

The action on the handoff is to open Floor Command This Week, `/dashboard` on the Floor Command host, where Zebra confirmation already lives. Orient does not embed a second confirmation control. No stable deep link to one bay is part of this contract.

### Unavailable source

If the read is unavailable, keep the last complete snapshot and mark it stale. If none exists, show that Floor Command could not be read. Do not show an empty week, an unpublished week, or a completed handoff. If a ready snapshot says deadlines are unavailable, keep the publication and the handoff, keep the last confirmed deadlines, and say the dates could not be read.

### Before activation

All of the following are required. None of them is done.

1. Floor Command exposes a read of this snapshot, and only this snapshot, behind `authorizeFloorCommandOrientRead`.
2. A store-scoped read-only credential exists. It cannot publish, assign, change deadlines, or set `zebra_entered_at`. It is not a supervisor session copied into Orient.
3. The credential lives only on the Orient server. It is not in the browser bundle and not in `NEXT_PUBLIC_` configuration.
4. The snapshot store matches the credential store after the same zero-stripping rule.
5. Fixture tests show: same revision does not add a row; unavailable does not clear the last snapshot; a removed id is superseded and its acknowledgement remains; a reassignment updates the same entry id and clears the old acknowledgement because the revision changed; Sunday Off still shows a pending handoff.
6. The user has explicitly connected the source.
7. AUTO-008's first publication has been verified, and this integration is not shipped inside that publication change.

---

## 6. Authority and security

Floor Command remains the authority for publication, assignment, Zebra-entry confirmation, and SMART dates.

The user remains the authority for connecting the source, for dismissing a revision, and for any future Interrupt Grant. Dismissal does not write back.

Orient must not:

- Publish assignments or call the Sunday cron
- Change roster ownership or bay assignment
- Change SMART dates or confirm a suggestion
- Set or clear `zebra_entered_at`
- Treat `assignment_status: "completed"` or a user tap as Zebra task completion
- Fill a missing name, roster id, bay, or date
- Treat an unavailable read as unpublished, empty, or complete
- Insert a second handoff or a second bay when the source id is unchanged
- Open a Pulse because a snapshot arrived
- Share a database, a service-role key, or a user session with Floor Command

Associate display names in the snapshot are operational labels for the supervisor's own reading. They are not Orient accounts, and they are not a reason to create people, Tasks, or stewardship rows.

---

## 7. Data lifecycle

Acknowledgement means the user has seen or dismissed one revision. It is stored on the observation. It is not a Pulse claim, not stewardship satisfaction, and not Zebra confirmation. A new revision clears that mark. The old mark stays on the old revision so history is inspectable.

| Situation | Orient behavior |
| --- | --- |
| 1. Newly published week | First complete snapshot with `publication.status: published` and a new handoff id. Show the handoff. Outstanding count comes from the snapshot. No Pulse |
| 2. Pending Zebra handoff | Status `pending`. Keep it visible through Sunday and Monday until a later snapshot says otherwise |
| 3. Partial Zebra entry | Status `partial`. Update counts in place. The handoff id does not change. The handoff remains outstanding |
| 4. All entries confirmed | Status `complete`. Leave the attention surface. Keep the observation. Do not infer that associates finished the Zebra tasks |
| 5. Reassignment after publication | Same entry id, new roster id, Zebra confirmation back to unconfirmed, new revision. Update the entry. The previous acknowledgement does not cover the new revision |
| 6. Removed or replaced bay | A cleared row moves to `retired` and appears in `removed_entry_ids`. Mark that observation superseded and keep its acknowledgement. A replacement is a new assignment id. A row that disappears without a retired record is the same removal, and only after a complete successful read |
| 7. Confirmed SMART deadlines | Show target and final dates on the matching roster, including when the handoff is already complete. They are not the Monday handoff deadline |
| 8. SMART deadlines requiring review | `review_required` stays visible. Orient does not confirm or edit the dates. The supervisor returns to Floor Command |
| 9. Unavailable Floor Command data | As in the failure section. A deadline-only failure does not change handoff status |
| 10. Repeated identical snapshot | `matches_previous_revision` true. No new row, no cleared acknowledgement, no notification |
| 11. A new operational week | A new handoff id. The previous handoff stays as it was. A new week does not complete the previous one. The new pending handoff is the primary line. An older pending or partial handoff remains visible |
| 12. User acknowledgement or dismissal | Record the revision only. Status, counts, and Zebra evidence stay whatever Floor Command last said. Dismissal hides that revision's attention line until the revision changes or the handoff is still outstanding and a later explicit grant says the Monday boundary was reached |

---

## 8. Failure behavior

| Failure | Result |
| --- | --- |
| Assignment read unavailable | Do not replace the snapshot. Attention says Floor Command could not be read |
| Invalid week or missing store | Same. Do not invent the current ISO week from the civil clock and then show it as unpublished |
| Deadline read unavailable inside an otherwise ready snapshot | Keep publication and handoff. Say dates are unavailable. Do not drop last confirmed dates and do not relabel them unconfirmed |
| Auth failure | Connection becomes unusable. Last snapshot stays, labeled unavailable. Do not fall back to a supervisor session |
| Snapshot store does not match the credential | Reject the read. Do not merge it into the connected store |
| Partial network failure before the transaction commits | Attempt evidence only, same as a non-complete Google observation |
| Offline with a prior snapshot | Show the stale snapshot. Do not queue a Zebra confirmation |
| Offline with no prior snapshot | Show unread. Do not show an empty handoff |
| Repeated pull of the same records | One revision, one row |

---

## 9. Proposed implementation tranches

| Tranche | Where | What | Now |
| --- | --- | --- | --- |
| 001 | This document | Consumer discovery | Done. No code |
| 002 | Orient, only after a named authorization | Pure projection over a fixture snapshot. Proves the lifecycle table, week identity, and acknowledgement. No network, no table, no UI route, no Pulse | NO-GO until authorized |
| 003 | Floor Command, separate authorization | Read route and store-scoped read-only credential. Not part of the W44 publication | NO-GO |
| 004 | Orient, after 002 and 003 | Server pull on focus and explicit refresh. Persist the last complete snapshot. In-app reading and return link | NO-GO |
| 005 | Orient, only if the user wants interruption | One explicit Interrupt Grant for the Monday boundary of one handoff. No repeat on the same revision | NO-GO. Not part of the minimum integration |

The minimum integration that provides real value is tranche 004's reading: the supervisor can see the unpublished-versus-published distinction, the Monday handoff, partial progress, review-needed dates, and a way back to This Week. Tranche 005 is not required for that value.

---

## 10. Unresolved decisions

- The read route, credential issuance, and credential storage are not designed in either repository. They are a Floor Command security tranche.
- Whether a name-only bay should count as outstanding is still the producer's open choice. Orient will follow the snapshot's counts.
- A future rule that moves the handoff deadline to an earlier confirmed working shift, never later than Monday, is written in the producer contract and is not implemented. Orient must not invent that shift.
- Whether the in-app line lives inside ACT as its own section, or on the Work reading beside the shift, is an experience decision. It must not be a stewardship row and must not be a Task checkbox. This discovery does not choose the layout.
- Whether a dismissed revision reappears only on change, or also at the Monday boundary without a Pulse, is undecided. The safe default is: dismissal holds for that revision, and the Monday boundary does nothing until an explicit grant exists.
- `integrations/README.md` is stale about Google Calendar. Correcting it is out of scope here.
- This discovery does not choose a Pulse relationship name, a lead, or a haptic.

---

## 11. GO / NO-GO

**NO-GO for a live connection, production mount, credential creation, schema, and notification work.** The later fixture projection is [ORIENT-FLOOR-COMMAND-002-PROJECTION.md](ORIENT-FLOOR-COMMAND-002-PROJECTION.md). It does not open that connection.

Reasons:

- Orient has no Floor Command adapter, and Floor Command has no read route or read-only credential.
- The producer snapshot is local and is excluded from the upcoming publication run.
- Existing Orient stores would either claim ownership or hide the Sunday handoff.
- A notification engine is not required for the first useful reading, and the current Pulse sources do not allow one.

The producer contract can stay the source of the snapshot. The consumer contract, when implementation is authorized, is a read-only observation of that snapshot under the lifecycle in this document.
