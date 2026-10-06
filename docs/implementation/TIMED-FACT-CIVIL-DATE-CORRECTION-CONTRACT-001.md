# TIMED-FACT-CIVIL-DATE-CORRECTION-CONTRACT-001

Contract only. The capability is not implemented and not accepted.

Baseline: `bb23527ddc2e4cb7d4a1bf834cb6520a85dfcc51` on `main`.

Accepted discovery: [ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md).

Production `/` can already edit and delete an existing timed Protected Time, Block, or Commitment. `updateFromStored` forwards the `startsOn` it is given and forces `kind: "timed"`. `FactDetail` is the caller that passes `stored.startsOn`, so the civil date does not change. `updateProtectedTime`, `updateBlock`, and `updateCommitment` already write `starts_on` on that same `id`. The `/schedule` sections prove that write. They are evidence only.

No schema change and no persistence redesign are required. If an implementation cannot meet the identity and relationship invariants below with those writers, it stops. It does not delete and recreate.

## Correction semantic

Changing the civil date corrects the temporal placement of the existing fact. It does not create a replacement fact.

| Invariant | Contract |
| --- | --- |
| Identity | The database `id` is unchanged. `created_at` is not in the write row, so it stays. |
| Type | The meaning stays Protected Time, Block, or Commitment. |
| Kind | The update remains `timed`. |
| Attributes | Label, purpose, or title change only when the human edits that existing field. |
| Relationships | Block Context, Block Task citation, and any `block_priority_service` pair stay unless the human edits Context or Task through the controls that already exist. |
| Placement | The human-selected civil date, and the clock if the human also edits it, are what change. |
| Projection | After a successful save, the existing reload runs. Timeline and Capacity read the new rows. Neither function is edited. |

Delete remains the existing confirmed delete. Move is not delete followed by create.

## Eligible facts

This authority applies only to an existing timed fact already opened in production fact inspection:

- Protected Time
- Block
- Commitment

`FactDetail` shows Edit only when `describe` returns `stored`. Timed placements carry `stored`. All-day listings and Work do not.

## Excluded

Work schedule, Task planned day, Task due day, Active Thread, Note, all-day Protected Time, all-day Block, all-day Commitment, recurrence, reminders, carry-forward, copy-forward, undo, Task reopen, drag-and-drop, and external calendar evidence.

An all-day fact keeps today’s production behavior. This contract does not add Edit for it and does not convert it to timed.

## Inspection owns the correction

Fact inspection already owns clock and type-specific correction. Civil date belongs in that same edit.

The human inspects the timed fact, chooses Edit, and sees the civil date as a placement field beside the existing start and end fields. Save is the existing Save on that form. Cancel writes nothing.

There is no new destination, no link to `/schedule`, and no drag.

Desktop and phone already render this same `FactDetail` and the same `onUpdate`. One date field on that form is the whole composition. There is no phone-only writer and no phone continuity redesign.

## Placement fields

Editable together, as one draft, before Save:

- civil date, initialized from `stored.startsOn`
- local start, the existing start field
- local end, the existing end field

Plus the attribute controls that edit already has: Protected Time label, Block purpose, Block Context, Block Task, Commitment title.

Changing the date does not reset the clock fields. Changing the clock does not reset the date field.

The unresolved-clock gate stays `establishmentBlocked(selectionLocalClock(...))`. The clock question uses the draft civil date, not the stored date. A date-only edit therefore re-asks that question on the selected day. It does not rewrite the clock to get past the gate. If the gate refuses, Save does not call `update*`, and the stored row stays. That is the current refusal, pointed at the draft date.

Ordinary 24-hour days stay `ordinary`, as they do now. This contract does not add a new midnight or daylight-saving rule.

## Date only

Leaving start and end untouched moves the same local-clock placement onto the selected civil date.

Tuesday 9:00–10:00 saved as Thursday, with those clock fields unchanged, persists as Thursday 9:00–10:00 on the same `id`.

The local times written are the canonical times the current clock fields would already write on a same-day save that does not edit them. The date change does not apply a second normalization.

## Date and clock together

One Save may change both, because both are draft fields on the same form.

Tuesday 9:00–10:00 edited to Thursday 11:00–12:00, then Save, is one `update*` of that `id`.

A same-day clock edit, with the date left as it was, stays the edit production already performs.

## Overnight

An existing timed fact whose end is earlier than or equal to its start continues into the next civil date. That rule stays on `startsOn` plus the two local times.

A date-only move keeps both local times, so the continuation moves with the new `startsOn`. Tuesday 22:00–06:00 becomes Thursday 22:00–06:00, still one row, still continuing into the following civil date. The clock is not pulled back onto a single civil date because the date changed.

If the human also edits the clock so the end is after the start, the fact stops crossing midnight because the clock draft says so. That is an explicit clock edit, not a side effect of the date.

## Identity and Block relationships

`updateBlock` updates `blocks` where `id` and `user_id` match. It does not insert a second Block.

`toBlockWrite` sends `starts_on`, `kind`, `start_local`, `end_local`, `context_id`, `purpose`, and `task_id`. A date-only save sends the Context, purpose, and Task already held by the edit draft. Those columns are replaced with the same values. They are not cleared because `starts_on` changed.

`block_priority_service` is a different table, keyed by `(block_id, priority_id)`. `updateBlock` does not write it. The Block `id` does not change, so the pair, including `established_at`, stays. This contract does not establish or withdraw a pair.

The current writers can meet this. No stop, and no clone.

## Commitment provenance

`defineCommitment` sets `origin` to `user_created`. `updateCommitment` writes that origin. For a row production can already edit, the stored origin is already `user_created`, so the update restates it. `created_at` is not written. The id stays.

The move does not assign a new origin, clear provenance, or accept an external origin. No calendar integration.

## Protected Time and Capacity

`updateProtectedTime` changes `starts_on` on that row. Capacity is `projectCapacity` over Protected Time, Commitments, and Blocks after the existing reload. The old civil date loses that coverage. The new civil date gains it. Overlap is still merged once. Nothing is stored or reconciled by hand. `projectCapacity` is not edited.

The same reload updates Timeline. Timeline’s placement rules are not edited.

## Viewpoint

Save does not call `onAnchor`. It does not change the question, the scroll position, or viewpoint provenance. `onUpdate` only runs the existing `update*` and then increments the reload token.

The human can be reading Tuesday, move a Block to Thursday, and remain on Tuesday.

The fact then stops painting on a day it no longer intersects. That is truthful. The instrument does not follow it.

Present and Day compose the anchor day and its two neighbors. Week and Month compose their existing windows. The load window stays `experienceLoadWindow(anchor)`. A fact whose new date is outside that window is absent from this reading and still present in the database. A later viewpoint whose window includes that date shows the same `id`. Save does not widen the window and does not move the anchor to keep the fact on screen.

Inspection Save today closes the editor and leaves the inspection open. That stays. If the reloaded models no longer contain the fact, the open inspection can no longer describe it. The implementation does not move the viewpoint to restore that description.

## Save and failure

Before Save, the date and clock are draft state. The stored fact is unchanged. Changing the date does not auto-save.

On Save, production calls the existing type-specific `update*` with the draft, same `id`, `kind: "timed"`. Success reloads through the current token. The editor closes, as it does today.

If the writer throws, `persist` does not increment the token. The canonical row stays. The editor stays open, the draft stays, and the existing alert reports the failure. The viewpoint stays. The UI does not show the fact on the new date until a reload has read that row.

## Historical code

Use as evidence: `ProtectedTimeSection`, `BlocksSection`, and `CommitmentsSection` pass a draft `startsOn` into the same `update*` functions and keep the id. Their date field is the proof that the writers already do this.

Do not mount those sections, do not link `/` to `/schedule`, and do not copy their all-day controls or their twelve-hour draft types.

`DayCanvas` keeps `startsOn` on its draft and does not show a date control. Leave that canvas alone. This authority is production `FactDetail` only.

Reuse `updateFromStored` as it stands: it already puts the supplied `startsOn` on a timed input. The production change is the caller passing the draft date, and passing that same date into `selectionLocalClock`. Do not add a second update operation.

## Outside this contract

Carry-forward, generic undo, Task completion and reopen, recurrence, reminders, copy-forward, drag-and-drop, external calendar integration, AI, a general rescheduling framework, Work schedule authority, all-day editing, and the parked temporal-territory labels.

Present, Day, Week, Month, Exact Time, Direction, Timeline rules, Capacity rules, viewpoint provenance, midnight behavior, phone continuity, auth, Orient identity, and bottom reach stay as they are. The field re-projects the moved row.

## Answers

1. Fact inspection owns civil-date correction, inside the existing Edit and Save.
2. Existing timed Protected Time, Block, and Commitment.
3. All-day facts are excluded. Current production behavior for them stays.
4. The new editable field is the fact’s civil date, beside the existing local start and local end.
5. Date only: the same canonical local start and end move to the selected civil date.
6. Date and clock in one draft: one Save writes both on that same `id`.
7. The fact retains the same `id` and the same `created_at`.
8. Block Context is retained unless the human changes the existing Context control.
9. Block Task citation is retained unless the human changes the existing Task control.
10. Priority-service pairs are retained. `updateBlock` does not write that table, and the Block id stays.
11. Commitment `origin` stays `user_created`. The update restates that origin. It does not create a new provenance.
12. Moved Protected Time changes derived Capacity on the old date and the new date after reload. `projectCapacity` is unchanged.
13. Save does not move the viewpoint.
14. The fact disappears from a day it no longer intersects. If it falls outside the current models or load window, this reading does not follow it. The row remains.
15. A failed update does not reload, does not close the editor, does not change the viewpoint, and shows the existing failure alert. The draft remains.
16. Desktop and phone use the same `FactDetail` and the same `onUpdate`.
17. Reuse the three `update*` writers and the existing `startsOn` argument of `updateFromStored`. Do not reuse the section components. Do not change `DayCanvas`.
18. Outside scope: the excluded types and operations listed above.

## Smallest implementation

Not started by this contract.

One production change: in `FactDetail`, hold a civil-date draft initialized from `stored.startsOn`, show it only while editing a stored timed fact, and pass it to `updateFromStored` and to `selectionLocalClock` on Save.

Expected runtime files when that work is opened:

- `components/orient/Surfaces.tsx`
- tests for that inspection

`components/canvasEstablishment.ts` already forwards `startsOn` and forces `timed`. Change it only if a comment or a call site would otherwise keep claiming the civil date cannot change. Do not give it a new operation.

Do not change `persistence/protectedTime.ts`, `persistence/block.ts`, or `persistence/commitment.ts` unless a type error forces a signature that already accepts `startsOn`. Do not add a migration.

`DayCanvas` is not part of the production invocation. Leave it date-frozen.

Tests to add with the implementation, not with this contract:

- Protected Time: same id, new civil date, same local clock when the clock fields are untouched, and Capacity’s next projection follows the reloaded row without a change to `projectCapacity`.
- Block: same id, new civil date, purpose retained, Context retained, Task retained, and no write to `block_priority_service`.
- Commitment: same id, new civil date, title retained, `origin` still `user_created`.
- Kind remains `timed`.
- A same-day clock edit still updates only the clock.
- One Save may change date and clock together.
- A thrown `update*` leaves the editor open, does not reload, and does not report success.
- Anchor, question, and viewpoint provenance stay.
- The same date control and the same `onUpdate` payload are available in the shared inspection used by desktop and phone.
- Work schedule rows are not written.
- Timeline and Capacity functions are not edited.
- An all-day fact still has no Edit control and is not converted to timed.

Migration count: zero.
