# WORK-SCHEDULE-AUTHORITY-PATH-CONTRACT-001

Contract only. The authority path is not restored. No runtime behavior changed.

Baseline: `70fdc8783621f2a61484f4e2470ac663b630def3` on `main`. Discovery: [WORK-SCHEDULE-AUTHORITY-PATH-DISCOVERY-001.md](WORK-SCHEDULE-AUTHORITY-PATH-DISCOVERY-001.md).

## Principle

The temporal field reads established temporal truth. Work schedule management establishes one source of that truth.

It is an operation. It is not Present, Day, Week, or Month. It does not stay painted on the field. While it is open it borrows the operational surface the instrument already uses. Closing it returns to the same reading. Every saved day is still an explicit human act. Nothing infers a row.

That matches the accepted instrument. The field has no Schedule destination. Capture does not write this table. Day establishment writes Protected Time, Blocks, and Commitments, not Work rows. The borrowed surface already holds inspection, Capture, and the other operations, and the reading stays mounted.

## Where it belongs

The editor belongs in that borrowed surface, as its own operation. On desktop the surface is the existing drawer. On the phone it is the existing sheet. One `surface` state. The reading stays mounted.

It does not belong in Exact time, Capture, Direction, or Context. Navigating to `/schedule` leaves the reading and opens the old scaffold, which also edits other facts. A permanent bezel destination would make schedule a peer of the questions. The reach keeps its present meanings.

The general invocation is the words “Manage Work schedule.” They do not mean a shift is active, that this day ought to contain Work, that a missing row is Off, or that the date in view is scheduled. They are not painted on empty territory or on an Off mark.

The control lives in the position surface, beside Sign out. That surface already opens from both forms and already holds one act that is not the reading. Opening the editor does not move the viewpoint and does not treat the anchor as a work week. The editor itself is not inside the position surface. The control only opens the operation.

Inspection of a scheduled Work fact keeps a way in. “Edit the work week” becomes the same operation, not a second editor and not a navigation to `/schedule`. There is one writer: `save_work_week`.

## Which week

The editor always names the Saturday–Friday week it is editing. That week is Work’s fiscal week. It is not Orient Week. The operation does not change the question, the anchor, or Week’s geometry.

A general invocation opens the fiscal week that contains authoritative Today in the confirmed zone. That is what `/schedule` already does. The viewpoint is not used. A moved anchor is a place the human is reading, not the week they asked to maintain. Previous and Next still move by seven fiscal days.

Inspection of a scheduled fact opens the fiscal week that contains that fact’s civil date. A later invocation from an Off date would use that civil date the same way. Neither call retargets the field.

## What the operation contains

For each of the seven dates the human can set scheduled, Off, or unknown. A scheduled day has a start, an end, and Opening, Mid, or Closing. The week can be saved, and the human can ask for the previous or next fiscal week.

Unknown stays “not entered.” It is not Off, not free, and not available. Choosing unknown and saving deletes that date’s row. Off saves an explicit Off row. Scheduled saves the interval and the shift type. Those are the states `weekDraft` already has.

The old page’s day canvas, Protected Time, Blocks, Commitments, and Quick Capture stay out. They already have owners. If the zone is not confirmed, the operation says so and does not invent one. It does not become the zone editor.

## Save

Before Save, changes live in the existing week draft. Save runs `planWeekSave` and then `saveWorkWeek`. An invalid day names that day and writes nothing.

A failed save leaves the draft in place, leaves the surface open, and says the week was not saved.

A successful save reloads that week into the draft and leaves the surface open, as the current editor already stays on the week after save. The instrument then reloads Work the way it already reloads after any other write, so the mounted reading shows the new truth. Closing is a separate act.

If the human closes, or presses Escape, while the draft is dirty, the existing choice applies: save the week, discard the changes, or stay. Escape does not throw the draft away. A failed save on that path stays.

## Phone

One draft and one save. The phone sheet may edit one day of the named week at a time. The desktop drawer may show all seven. Previous, Next, and the Saturday–Friday name stay on both. Phone Present and Day continuity are not redesigned.

## `/schedule`

It stays for this restoration, as a direct route onto the same writer. Inspection stops navigating there once the operation exists. It is not a second draft model. After the operation is proven, a later tranche retires the route or makes it open the same operation. This contract does not delete it.

## Not this restoration

No recurrence, template, copy-forward, inference, or workforce scheduling. No Google Calendar import. A later calendar event may be a Commitment under another contract. It does not write `work_schedule_days`. No assistant writes a Work row. No change to Timeline, Capacity, Present, Day, Week, Month, Exact time, Direction, provenance, midnight, auth, the maker’s mark, or the reach’s meanings.

## Later tranche

Extract the week operation from the old page. Reuse `weekDraft`, `planWeekSave`, `saveWorkWeek`, and `WorkWeek`’s three states. Do not paste the stone page into the drawer.

Likely files: `OrientView.tsx`, `Surfaces.tsx`, `OrientInstrument.tsx`, and a small operation component. Tests already cover the draft and the transaction. New tests should prove a general open with no Work fact, an inspection open of the same operation on that fact’s fiscal week, an unchanged Orient anchor, a failed save that keeps the draft, and a successful save that reloads the reading. Migration count: zero.
