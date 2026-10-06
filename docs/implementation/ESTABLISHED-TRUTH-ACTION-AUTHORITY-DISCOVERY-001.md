# ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001

Discovery only. No runtime behavior changed. This record does not choose a production design.

Baseline: `bb23527ddc2e4cb7d4a1bf834cb6520a85dfcc51` on `main`. Working tree was clean at the start.

Production `/` renders `OrientInstrument`. Accepted Present, Day, Week, Month, phone continuity, Work schedule authority, and Orient identity stay as they are. `/schedule` remains the old scaffold. This discovery does not retire it.

Temporal territory may later expose more resolution-appropriate identity, such as work shift time, shift type, and Block identity. That observation stays parked. It is not a visual change.

## What “action” means here

The words below are the operations this repository already distinguishes. They are not a generic CRUD menu, and they are not assumed to apply to every type.

| Word | What the current code actually does |
| --- | --- |
| Edit | Change attributes of an existing row. The id stays. |
| Move / reschedule | Change temporal placement of that same row, when a writer already accepts a new placement. |
| Remove | Delete the established row, or, for a Task, the named operation that is not implemented. |
| Complete | Set `tasks.completed_at`. Meaningful for a Task. Not meaningful for an interval. |
| Carry forward | No canonical operation. Product language still calls it unresolved. |
| Undo / restore | No reversal of a committed human mutation. Unsaved drafts can be discarded. |

## Truth-type inventory

Types that can appear in, or affect, the temporal field:

| Type | Canonical representation | Persistence | What it is not |
| --- | --- | --- | --- |
| Work schedule | One row per `(user_id, work_on)` in `work_schedule_days`. Scheduled, Off, or absent. | `saveWorkScheduleEntry`, `clearWorkScheduleEntry`, and the week transaction `save_work_week`. | Not a Block. Not inferred. Already accepted. |
| Protected Time | `protected_time` row. `all_day` or `timed`. Optional label. | `createProtectedTime`, `updateProtectedTime`, `deleteProtectedTime`. | Not Capacity. Capacity is projected. |
| Block | `blocks` row. `all_day` or `timed`. Required purpose. Optional `context_id` and `task_id`. | `createBlock`, `updateBlock`, `deleteBlock`. | Not a Task. Not a shift. |
| Commitment | `commitments` row. `all_day` or `timed`. Required title. `origin` is only `user_created`. | `createCommitment`, `updateCommitment`, `deleteCommitment`. | Not an external calendar event. |
| Task | `tasks` row. Title, optional Context, `planned_on`, `due_on`, `must_do`, `completed_at`, `origin`, optional `originating_note_id`. | `createTask`, `updateTask`, `completeTask`. No delete function. No reopen function. | Not an interval. Planned day, due day, and a citing Block are different facts. |
| Must Do | `tasks.must_do`. Not a table. | Written only inside `updateTask` / `toTaskUpdate`. | Not Priority. Not a bucket. |
| Active Thread | One `active_threads` row per user: `task_id`, `established_at`. Absence of a row means no thread. | `establishActiveThread` upserts on `user_id`. `clearActiveThread` deletes the row. Completion of the cited Task deletes it in the same transaction. | Not Resume. Resume is `projectResume`. |
| Note | `notes` row: `id`, `content`, `captured_at`. | `createNote` only. Authenticated role has select and insert. | Not a temporal interval. `captured_at` is the retention instant. |
| Recurring obligation / occurrence | Not implemented. No table, no generator, no skip. | Tests on Block, Commitment, and Protected Time writes reject a `recurrence` property. | Not carry-forward. |

Adjacent records that do not occupy the field as intervals: Context (seeded names; no create or delete function in application code), Destination, Priority, and the two service tables `task_priority_service` and `block_priority_service`. Those service writers exist and no production surface calls them. Direction inspection on Month is read-only.

There is no reminder column and no reminder writer.

## Shared interval mechanics

Protected Time, Block, and Commitment share a shape and do not share a meaning.

- Identity is the row `id`. `update*` filters on `id` and `user_id` and writes the new attributes onto that row. `created_at` is not in the write. A successful edit is not a replacement row.
- `defineProtectedTime`, `defineBlock`, and `defineCommitment` accept `all_day` or `timed`, and a civil `startsOn`. A timed row whose end is earlier than or equal to its start continues into the next civil date. That is still one `startsOn`.
- Production establishment (`establishFromSelection`) always builds `kind: "timed"`. Production update (`updateFromStored`) keeps the stored `startsOn` and also forces `kind: "timed"`. The production editor can change clock bounds, label, purpose, title, Block Context, and Block Task citation. It cannot change the civil date, and it cannot turn a timed fact into an all-day fact.
- The old sections on `/schedule` call the same update functions with a draft that includes a date field and an all-day or timed choice. That is an identity-preserving civil-date change, and an identity-preserving kind change. It is not a second persistence model.
- Overlap is allowed. There is no exclusion constraint. Timeline packs foreground lanes. A shared boundary does not overlap. Capacity merges covered time once. A write is not rejected because another fact already occupies that time.
- Deletes are hard deletes of that user’s row. They are immediate after confirmation. There is no tombstone.
- After a production write, `OrientInstrument` increments a reload token and reads again. Capacity is `projectCapacity` over the new rows. Nothing derived is stored, so a Protected Time change does not need a second Capacity write.

`block_priority_service` references `blocks` with `ON DELETE NO ACTION`. A committed delete of a Block that serves a Priority fails, and the Block remains. Production has no establish or withdraw control for that pair, so ordinary use does not create the row. The failure is latent.

## Block

| Authority | What exists |
| --- | --- |
| Create | `createBlock`. Production Day establishment, after the human chooses Block, purpose, optional Context, and optional open Task. `/schedule` Day canvas does the same timed create. `BlocksSection` can also create all-day and can set the civil date. Its form does not show a Task control; a new draft’s `taskId` is null, and an edit keeps the draft’s existing `taskId`. |
| Edit | `updateBlock` on the same id. Production inspection: purpose, Context, cited Task, start, end. Civil date stays. `/schedule` canvas edit uses `updateFromStored` and keeps the stored Task citation without a control to change it. `BlocksSection` can change date, kind, times, Context, and purpose. |
| Move | Same-day clock change, including a midnight crossing, is an edit of `start_local` / `end_local` on the same `starts_on`. A different civil date is an `updateBlock` that `BlocksSection` already sends. Production `updateFromStored` does not. There is no drag and no resize handle. |
| Remove | `deleteBlock`. Production: “Delete this fact”, then “Confirm delete”. Canvas: “Delete this Block?”. Section: “Remove this block?”. All three are hard deletes. All-day rows have no `stored` placement, so the canvas and the production Edit button do not open them. Production Delete does not require `stored`, so an all-day Block that is listed can be deleted from `/`. The canvas delete requires `stored`, so it cannot. |
| Complete | Not a Block operation. |
| Carry forward | None. |
| Undo | None. A failed delete leaves the row. |

Task citation belongs to the Block. Many Blocks may cite one Task. The Task does not store those Blocks. Clearing the citation is an edit that sets `task_id` null. Deleting the Block does not delete the Task. Deleting the Task is not implemented; the foreign key is `ON DELETE NO ACTION`, so a committed Task delete would fail while any Block still cites it.

Context on a Block is optional. Purpose is not copied from the Context name. Context focus on the field changes emphasis only.

## Commitment

| Authority | What exists |
| --- | --- |
| Create | `createCommitment`. Production Day establishment asks for a title. `defineCommitment` sets `origin` to `user_created`. The canvas does the same. `CommitmentsSection` can also create all-day and can set the civil date. |
| Edit | `updateCommitment` on the same id. Production and canvas: title and clock, civil date unchanged, origin rewritten through `defineCommitment` as `user_created`. Section: title, date, kind, and clock. |
| Move | Same split as Block. Clock on the same `starts_on` from production. Another civil date only from `CommitmentsSection`. |
| Remove | `deleteCommitment`. Same confirmation pattern as Block. No dependents in schema. |
| Complete | Not a Commitment operation. |
| Carry forward | None. |
| Undo | None. |

Provenance is the `origin` column and the check `origin = 'user_created'`. `requireCommitmentOrigin` rejects anything else, including while reading. There is no external id column and no Google writer. An externally sourced future Commitment cannot be stored as this row without a new origin. The current update path would not be a safe writer for that origin, because `toCommitmentWrite` always passes the input through `defineCommitment`, which forces `user_created`. Absence of an external row is not permission to invent one. Nothing in this repository overwrites a human Commitment from an outside source.

## Protected Time

| Authority | What exists |
| --- | --- |
| Create | `createProtectedTime`. Production Day establishment. Label is optional. Canvas matches that timed create. `ProtectedTimeSection` adds all-day and a civil date. |
| Edit | `updateProtectedTime` on the same id. Production and canvas: label and clock, civil date unchanged. Section: label, date, kind, and clock. |
| Move | Same split as Block. |
| Remove | `deleteProtectedTime`. Same confirmation pattern. |
| Complete | Not a Protected Time operation. |
| Carry forward | None. |
| Undo | None. |

Capacity reads Protected Time, Commitments, and Blocks as coverage of an already-resolved boundary. A Block’s Task citation is not a second interval. Present and Day show remainder from that projection. A successful production write reloads the rows, and the next projection uses them. Week and Month also read the reloaded rows. There is no stored Capacity to recompute.

## Task

A Task is not a temporal interval. `planned_on` and `due_on` are independent civil dates. Neither is a reminder. Neither places a Block.

| Authority | What exists |
| --- | --- |
| Create | `createTask`. Production Capture: quick capture sends the session draft (the visible field is the title; the initial draft’s Context, planned day, due day, and Must Do are empty). General capture can keep a Note, establish a Task from the expression, or establish a Task that cites one retained Note. `origin` is `user_created`. `/schedule` still mounts `QuickCapture`. `TaskLoop` is not mounted by a route. |
| Edit | `updateTask` / `taskPatchFromEditDraft`: title, Context, `plannedOn`, `dueOn`, `mustDo`. Empty optional fields clear. The patch cannot set `completed_at`, `origin`, or `originating_note_id`. Production edit is the Task detail of the current thread only. Other open Tasks in that surface have Start, not Edit. `TaskLoop` and `TaskEditForm` edit any open Task they list. That component is orphaned. |
| Planned-day movement | An edit of `plannedOn`, or `TaskLoop`’s “Plan for Today” / “Move to Today”, which writes `plannedOn` to the confirmed civil date. “Move to Today” is hidden when the Task is already planned for that date (`todayPlanAction` returns `remove`, and the button renders nothing). It does not clear the plan. It does not change `dueOn`. |
| Due-day movement | The due field on the same edit draft. Independent of `plannedOn`. |
| Reminder movement | Not implemented. |
| Must Do | The checkbox on that same draft. See below. |
| Complete | `completeTask` sets `completed_at` only. It does not clear Must Do, planned day, or due day. The Task leaves `loadOpenTasks`. Production Complete is on the current thread’s Task, with no confirmation. `TaskLoop` can complete a listed open Task without first making it the thread. |
| Reopen | No function clears `completed_at`. `TaskPatch` has no completion field. Completed Tasks are not loaded into the instrument. The database update policy would allow an update, and no application writer does it. Reopen is not a named operation. |
| Remove | Named in product language. No `deleteTask`. RLS grants `delete` on `tasks` to `authenticated`. The application does not call it. A committed delete would fail while a Block cites the Task (`ON DELETE NO ACTION`) or a `task_priority_service` row cites it. If those were absent, `active_threads` would cascade. |
| Carry forward | None. Changing `plannedOn` to a later date is an edit of that one field. It is not a named carry-forward, and it does not move a Block. |
| Undo | None. |

Production reachability for edit and complete depends on Active Thread. Start replaces the thread (`upsert` on `user_id`). Complete of that Task then deletes the thread. The previous thread is not restored. The domain `completeTask` itself does not require the Task to be current. The coupling is the production surface.

## Must Do

`must_do` is a boolean the human sets. It is stored on the Task. Prominence in the product text lasts until the human completes, reschedules, or removes the Task. What reschedule writes, and whether it clears the flag, is still unresolved in `DOMAIN.md` and the operational-adoption decision.

What the code does: the edit draft can set or clear the flag without changing planned day or due day. Completion does not write the flag. The open-task read hides a completed Task, so the flag is no longer shown. The stored boolean on the completed row is whatever it was. There is no separate Must Do mutation.

Production: the checkbox is inside Edit on the current thread’s Task. Capture does not expose it. `TaskLoop`’s edit form has the same checkbox and is not on a route.

## Active Thread

| Authority | What exists |
| --- | --- |
| Establish | `establishActiveThread`. One row. A new Start replaces `task_id` and `established_at`. The database rejects a missing Task, another user’s Task, or a completed Task. |
| Change | The same upsert. There is no second thread and no history of the previous one. |
| Clear | `clearActiveThread` deletes the row. Production label: “Leave thread”. No confirmation. |
| Complete | Not a thread operation. Completing the cited Task runs `clear_active_thread_on_completion` in that update. The Task row remains, with `completed_at` set. If the completed Task is not the thread’s Task, the trigger does not delete the thread. Production cannot take that path, because Complete is only rendered for the thread’s Task. `TaskLoop` can. |
| Recovery | Start the Task again. That is a new `established_at`. Leaving and starting are not an undo stack. |
| Interruption | No extra mutation. Replacing the thread is the interruption. Nothing automatic returns the previous Task. |

The thread is explicit current intention. Resume is a projection over that row and an open Task. If the row exists and the Task is not among open Tasks, the instrument says the thread is recorded and its Task is not open. It does not invent a replacement Task.

Desktop Present and Day use the desktop thread control. Phone Present and Day use the phone thread control, and the bezel thread control is also present because it is hidden only while desktop reading is active. Week and Month keep the bezel thread control. All of them open the same `ThreadSurface`.

## Recurring obligation / occurrence

Not implemented. Not production-ready.

There is no obligation table, no occurrence table, no materializer, no skip, no edit of a series, and no “this occurrence only” writer. Carry-forward has no relationship to recurrence because neither concept is implemented. Caregiving reminders in earlier discovery text were not stored as obligations.

## Remove / delete

| Path | Kind | Confirmation | Dependents | Reachable from `/` |
| --- | --- | --- | --- | --- |
| `deleteProtectedTime` | Hard, immediate | Production two-step button. Canvas question. Section question. | None in schema. | Yes, for a listed or placed fact. |
| `deleteBlock` | Hard, immediate | Same. | Priority service blocks the delete. Task is kept. | Yes, except a served Block fails closed. Ordinary `/` cannot create that service. |
| `deleteCommitment` | Hard, immediate | Same. | None. | Yes. |
| `clearWorkScheduleEntry` / week save `unknown` | Hard delete of that civil date’s row | The accepted week operation has its own unsaved-draft discard. | Intervals are not deleted with it. | Yes, through the accepted Work schedule surface. Not reopened here. |
| `clearActiveThread` | Hard delete of the thread row | None. | Task remains. | Yes. |
| Task delete | Granted by RLS. No application function. | None, because it is not invoked. | Would fail if a Block or task-priority pair cites it. Would cascade the thread if it succeeded. | No. |
| Note delete | Not granted. | — | A citing Task uses `ON DELETE NO ACTION`. | No. |
| Priority-service withdraw | Hard delete of the pair. No `withdrawn_at`. | No production control. | Endpoints stay. | No. |
| Account removal | `ON DELETE CASCADE` from `auth.users`, with deferred checks so that user’s rows can go in one transaction. | Outside this instrument. | — | Not an in-app action. |

Production fact delete does not withdraw a priority service first. If such a row existed, the human would see the failed write and the fact would remain. That is a safeguard against a dangling pair, and it is also an unreachable repair: there is no production withdraw.

All-day delete from `/` is possible. All-day delete from the `/schedule` canvas is not, because that confirm requires `stored`. The sections can remove all-day rows.

## Undo / restore

No undo stack. No toast undo. No soft-delete flag. No tombstone. No event log that can reverse a write. Execution-direction withdrawal is documented as a delete without history.

What can be abandoned before a write:

- Fact edit and Task edit: Cancel writes nothing.
- Work week draft: Discard restores the loaded baseline. That is not a reversal of `save_work_week`.
- A temporal selection: discard drops the selection. It does not delete a fact.
- Day canvas and production surfaces reload after a successful write. They do not keep the previous row.

Irreversible once committed, from production `/`:

- Delete of Protected Time, Block, or Commitment, after the confirm step.
- `completeTask`. One click. The open Task disappears. The thread row goes with it when it was the cited Task. Must Do and the civil dates remain on the completed row and cannot be edited from `/`, because completed Tasks are not loaded.
- Leave thread. The previous `established_at` is gone.
- Start of a different Task. The previous thread is replaced.
- A Work week save. Accepted path. Discard applies only before save.

`restoreBaseline` in `WorkScheduleOperation` is the unsaved-draft discard named above.

## Carry forward

Searched as carry forward, move unfinished, defer, reschedule, replan, tomorrow, and next period.

There is no function, table, or production control by that name. `DOMAIN.md`, `PRODUCT.md`, `DATA-001`, and the operational-adoption decision still list carry-forward as unresolved, including its effect on Must Do.

The nearest existing writes, which are not that concept:

- `plannedOn` edit, including “Move to Today” on the unmounted `TaskLoop`. That changes one Task’s planned civil date. It does not move due, a Block, a Commitment, or Protected Time.
- Clock edits and, on `/schedule` only, civil-date edits of an interval. Those are placement edits of that fact.
- Replacing the Active Thread. That changes current intention. It does not move unfinished work into a later period.

Carry-forward is missing. Inventing it here would be a new concept. Types that could even be discussed later, because they represent unfinished or retained human intention, are an open Task and an unfinished Block the human still means to keep. A Commitment, Protected Time, Work row, Note, and a completed Task do not become carry-forward merely because they have dates. This record does not define the operation.

## Production desktop reachability

`/` mounts `OrientInstrument` with no bottom bar.

| Action | How the human reaches it |
| --- | --- |
| Establish timed Protected Time, Block, or Commitment | Day only. Select time, choose meaning, Save. Present can refer and can open the establishment surface only to say that Present does not establish. Week and Month do not establish. Exact time keeps the Day clock, so the same Day establishment is available at that depth. It is not a different writer. |
| Inspect a fact | Present, Day, Week, and Month call `onRefer`. Overlapping facts list first. |
| Edit a timed fact | Inspection, Edit, Save. Work offers “Edit the work week”, which opens the accepted week surface, not `/schedule`. |
| Edit an all-day fact | The Edit button is absent, because listed facts have `stored: null`. |
| Delete Protected Time, Block, or Commitment | Inspection, including all-day. Work has no fact delete. |
| Change a fact’s civil date | Not on `/`. |
| Capture a Task or Note | Bezel Capture. |
| Thread, edit the current Task, complete it, leave, start another | Desktop thread control on Present and Day. Bezel thread control on Week and Month. |
| Edit or complete a Task that is not the thread | Start it first. That replaces the thread. |
| Work schedule | Accepted week surface from position, from “Edit the work week”, and from the position surface’s work action. |

Canonical mutations with no production invocation:

- Civil-date and all-day writes that `update*` and the section drafts already perform.
- `deleteTask`, which does not exist as a function.
- Reopen, which does not exist.
- `establishBlockPriorityService`, `withdrawBlockPriorityService`, `establishTaskPriorityService`, `withdrawTaskPriorityService`.
- `createDestination`, `createPriority`. No application component calls them.
- `clearWorkScheduleEntry` as a direct call. The accepted week save expresses unknown by deleting through `save_work_week`.

## Production phone reachability

Phone and desktop share `OrientActions` and the same surfaces. Phone Present and Day use `PhoneContinuity` for reference and the thread. Capture, question, position, focus, fact inspection, Day establishment, fact edit, fact delete, Task edit, complete, and Work schedule use the same callbacks.

There is no phone-only mutation and no phone-only absence among those actions. The missing civil-date edit, all-day edit, Task removal, reopen, carry-forward, and undo are missing on both.

`/schedule` is not inside phone continuity. It is the old shell with `BottomNav`. Typing the URL still opens it. `/` does not link to it (`orientView` tests assert no `/schedule` anchor).

## Historical surfaces

| Surface | Route | Mutations still valid | Production invocation | Composition |
| --- | --- | --- | --- | --- |
| `WorkSchedule` Day canvas | `/schedule` | Same create, update, and delete as `/`, through `establishFromSelection` and `updateFromStored`. Timed only. Civil date frozen. Canvas delete and edit require `stored`, so all-day is out. Task citation on a Block is preserved, not edited. | Missing. `/` uses `EstablishmentSurface` and `FactDetail` instead. | The canvas contract matches production. The page chrome does not. Safe to keep citing the writers. Not safe to treat the page as the instrument. |
| `ProtectedTimeSection`, `BlocksSection`, `CommitmentsSection` | `/schedule` only | Same three writers. Extra: civil date, all-day, and kind change, same id. Block section does not edit Task citation. Confirm-before-remove. | Missing from `/`. | The drafts are the only UI that already changes `startsOn` and kind. The visual shell is obsolete. The draft-to-input functions are compatible with current `define*` and `update*`. |
| `TaskLoop`, `TodayPlan`, `TaskEditForm` | No route. Tests render `TaskLoop` directly. | `updateTask`, `completeTask`, `establishActiveThread`, `clearActiveThread`. Edit and complete are not limited to the current thread. “Plan for Today” and “Move to Today” write `plannedOn` only. | Missing. | The writers are the canonical ones. The loop is an old composition. “Move to Today” is not carry-forward and is not a fact move. |
| `InstrumentPrototype` | `/instrument` | Same interval create, update, and delete as `OrientInstrument`. `AppFrame` gives it a full-viewport shell and does not mount it at `/`. | Not production. | Parallel composition of the same writers. |
| `BottomNav` | Every signed-in route except `/` and `/instrument` | Links Tasks and Schedule. On `/` the Tasks link is not shown. | The Schedule destination is the old page. | Obsolete as a way back into the accepted field’s maintenance. Still the only in-app link onto the sections. |
| `QuickCapture` on `/schedule` | `/schedule` | `createTask`. | Production Capture is the invocation. | Writer is current. |

Nothing here is restored.

## Provenance and authority

Human authority is the explicit Save, Start, Leave, Complete, Delete confirm, Capture choice, and Work week save. The instrument does not infer a row from activity, from overlap, or from an empty read.

Deterministic projection covers Timeline placement, Capacity remainder, Resume, today-membership of `plannedOn`, and Direction’s read of service pairs. Those reads do not write.

Provenance that is stored: Commitment `origin`, Task `origin`, Task `originating_note_id`, Active Thread `established_at`, and service-pair `established_at` when a pair exists. Note `captured_at` is the Note’s own retention instant.

No path found that lets external evidence overwrite human-established truth. No external Commitment origin can pass the check constraint. No calendar sync exists.

Absence is not permission. A missing Work row stays unknown on the accepted path. A missing Active Thread row is no thread. A failed read is withheld. Overlap does not authorize a delete. A completed Task is not treated as deleted.

No production mutation found that violates those rules. The latent case is a Block delete blocked by a service pair the instrument can display (“Serves priority”) and cannot withdraw. Display is a read. The pair would have to be inserted outside production UI.

## Gap classification

| Gap | Class |
| --- | --- |
| Identity-preserving civil-date change of Protected Time, Block, and Commitment exists in `update*` and in the `/schedule` sections. Production `updateFromStored` keeps `startsOn`. | C. The section UI is also E: still functional, old composition, contracts compatible. |
| All-day create and edit exist in the sections. Production establishment is timed only. Production Edit does not open all-day. Production Delete of a listed all-day fact does exist. | C for create and edit. E for the sections. |
| Task removal is named and has no writer. | A and B. |
| Reopen is not a named operation and has no writer. | I for the meaning. B for the missing writer once a meaning exists. |
| Carry-forward has no canonical meaning and no writer. | I. |
| Recurrence, occurrence, skip, and reminder are absent. | A. Not required by this discovery. |
| Complete and Leave have no confirmation and no reversal. | H. |
| Fact delete has a confirm step and no reversal. | H for the missing reversal. The confirm exists. |
| Edit and complete of a non-current Task require Start, which replaces the thread. The writers themselves do not. `TaskLoop` calls them without that coupling and is unmounted. | D for the coupling. E for `TaskLoop`. |
| Priority-service establish and withdraw have writers and no production control. A served Block cannot be deleted until the pair is gone. | C, and H for the delete that fails with no in-app repair. Not hit by ordinary production writes. |
| Destination and Priority creation have writers and no UI. | C. They are not field intervals. |
| Note edit and delete are unresolved. Update and delete are not granted. | I, and the grant matches that. Notes are not field intervals. |
| Phone does not lack a separate copy of the production actions above. | Not G. |
| `/instrument` repeats the interval writers outside `/`. | E. |
| Canvas all-day edit and delete never had `stored`, so they are not a hidden production feature. | F for all-day on the canvas. The timed canvas path is still compatible. |

Work schedule authority is not a gap in this record.

## Production-readiness

P0 — none found that ordinary production use corrupts or unsafely strands truth. Deletes that can run are confirmed. A Block cited by a priority service fails closed. Completion and the thread clear commit together. External overwrite does not exist. Capacity is not a stored twin of Protected Time.

P1 — correction that `/` cannot make while keeping the established thing:

- A timed Protected Time, Block, or Commitment cannot change civil date. The human can delete it and create another id. That is a different act. The same-id write already exists and production does not call it with a new `startsOn`.
- Task completion is one click and cannot be reversed. There is no reopen. A mistaken Complete removes the Task from every open surface.

P2 — friction, and the instrument can still be operated:

- All-day facts can be deleted from `/` and cannot be created or edited there. Timed establishment covers the Day field’s current create path.
- Editing or completing a Task that is not the thread replaces the thread first. Start is explicit. The previous thread is not restored afterward.
- Fact delete cannot be undone after confirm.
- Leave thread cannot be undone.
- “Move to Today” exists only on the unmounted task loop. The current thread’s planned-day field can still be edited.

P3 — later, and not required to operate the accepted field:

- Carry-forward, once it has a meaning.
- Recurrence, skip, and reminders.
- Priority-service establish and withdraw.
- Destination and Priority creation.
- Note edit and delete.
- A generic undo log. Not proposed here.
- The parked temporal-territory label question.

## Smallest later tranche

Change one existing timed fact’s civil date through the update that already keeps the id.

Scope: Protected Time, Block, and Commitment. Production inspection on `/`, desktop and phone, because they already share the surface. `updateProtectedTime`, `updateBlock`, and `updateCommitment` stay the writers. Kind stays `timed`. Clock bounds, label, purpose, title, Block Context, and Block Task citation stay the edits they already are. A successful save still reloads, so Capacity and the field read the same row.

Why this one: it is the ordinary placement correction. The domain and the database already accept a new `starts_on` on that id. Production freezes the date in `updateFromStored`. Doing it does not define carry-forward, reopen, recurrence, or undo, and it does not replace the accepted Work week writer.

Leave Task removal and reopen for a later boundary. Removal is named and unimplemented. Reopen is not named. Those are semantics, not a frozen date on an existing form.

Do not build that tranche from `BlocksSection`. Do not route it through `/schedule`. Do not delete and recreate.

Likely files when that tranche is actually opened:

- `components/canvasEstablishment.ts` (`updateFromStored` currently copies `startsOn` and forces `timed`)
- `components/orient/Surfaces.tsx` (`FactDetail` saves that update)
- `components/DayCanvas.tsx` only if the old canvas must not drift from the same contract; it is not the production invocation
- Persistence is already `persistence/protectedTime.ts`, `persistence/block.ts`, `persistence/commitment.ts`
- Tests around fact update: production inspection on desktop and phone, same id, new `startsOn`, kind unchanged, a failed save leaves the row, Capacity still projected, Work schedule save untouched, Present still does not establish

This discovery does not open that tranche.
