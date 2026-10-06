# WORK-SCHEDULE-AUTHORITY-PATH-DISCOVERY-001

Discovery only. No runtime behavior changed. This record does not choose a production design.

Baseline: `70fdc8783621f2a61484f4e2470ac663b630def3` on `main`.

## What a Work schedule is

A Work schedule row is one human-established state for one civil date, in `work_schedule_days`. The primary key is `(user_id, work_on)`. A date has one row or none.

A scheduled row stores `start_local`, `end_local`, and a shift type the human chose: Opening, Mid, or Closing. If the end is earlier than or equal to the start, the shift continues into the next civil date. The times are not swapped.

Work Off is a row with `day_state = 'off'` and null times and shift type. It is explicit. It is not an interval.

A missing row is unknown. It is not Off, not occupied, and not available. [2026-10-02-work-schedule.md](../decisions/2026-10-02-work-schedule.md). The Week contract says the same.

A Work temporal interval is what Timeline projects from a scheduled row. `workFact` returns nothing for Off. The interval is not stored.

A Block and a Commitment are other tables. Capture does not write the schedule. Nothing in this repository infers a Work row from activity, from a Block, or from an external calendar.

There is no recurrence, template, or copy-forward. Cadence is not projected from this table.

## Persistence

`loadWorkSchedule` reads `work_on` inside a civil window. `saveWorkScheduleEntry` upserts one row. `clearWorkScheduleEntry` deletes one row. No production component calls those two writers.

`saveWorkWeek` calls `save_work_week`. That function accepts at most seven changes, and each date must fall in `[week_start, week_start + 7)`. `unknown` deletes the row. `off` and `scheduled` upsert. One transaction.

The editor’s week is the Lowe’s fiscal week: Saturday through Friday, from `workFiscalWeekStart`. Orient’s Week is a different window. It starts at the anchor and is not that Saturday.

Local times are interpreted in the confirmed zone on `temporal_settings`. The zone is not copied onto the schedule row. A later zone confirmation reinterprets the same local times.

Changing a row changes the next read. Blocks, Commitments, and Protected Time stay. Nothing derived is stored, so nothing has to be rewritten.

## `/schedule`

`app/schedule/page.tsx` renders `WorkSchedule` and a link back to `/`. Signed-in `/` does not mount `BottomNav`. `/schedule` does, inside the old stone shell.

`WorkSchedule` confirms the zone, loads the fiscal week that contains now, and edits seven days through `WorkWeek`. Edit week, then each day can become scheduled, Off, or unknown. Save week writes only the dirty days. Previous and Next move by seven days. The same page still paints the old day canvas and still creates, edits, and deletes Protected Time, Blocks, and Commitments.

The domain contracts still hold. The page is the old scaffold, not the accepted Orient instrument.

## Who can reach it

Production `/` has one link: fact inspection of a `work_schedule` fact says “Edit the work week” and goes to `/schedule`. That fact exists only for a scheduled shift. Off is not a fact. A missing row is not a fact. Present shows Work only when the shift contains Now. Week and Month can inspect a painted shift. Desktop Day does not label Off.

`CurrentTime` also links to `/schedule`, and only to confirm a zone. It lives in `TaskLoop`. `/` does not render `TaskLoop`.

No bezel item, Capture action, Exact-time control, or Context control writes a Work row. Day establishment writes Protected Time, Blocks, and Commitments. The production design says the field has no Schedule destination, and that `/schedule` remains the editor reached from inspection of Work.

So the writer is functional. The production path to it disappears when there is no scheduled shift to inspect. Typing `/schedule` still opens it.

Phone Orient uses the same inspection link. The mutations do not depend on the form factor. `/schedule` itself is the old page, with the bottom bar, and it is not inside phone continuity.

## Consumers

Present, Day, Week, Month, Exact time, and phone continuity all read the loaded rows through Timeline or `offFor`. Capacity remainder, on Present and Day, uses a scheduled shift as a boundary and does not invent one. Current temporal orientation and the Work-day projection do the same. A failed Work read withholds the reading. It is not shown as an empty schedule.

## Entire schedule

What exists is one fiscal week of explicit days, saved together, then the next week. What does not exist is a repeating pattern, a template, or an open date range in one write.

## Boundaries, not a design

Capture must not become the schedule writer. The schedule decision already refuses that. Exact time refines a selection. It does not own a civil-date row. Context and Direction are not this table.

The write that already exists is `save_work_week` behind `/schedule`. The production invocation that already exists is Work inspection, and it cannot start from Off or from nothing entered.

Google Calendar is not this restoration. [TIME_MODEL.md](../../TIME_MODEL.md) allows a later calendar event to be a Commitment. It does not allow that source to replace a Work row. No such writer exists.

## Gap

The domain and the week write are present. Production reachability is missing when no scheduled fact is on the field. The only maintenance UI is the old scaffold, still compatible with the rows and not part of the accepted instrument. Phone has the same missing invocation. Recurrence is absent, and it is not required to restore week entry.

## Smallest later restoration

Reuse `WorkScheduleEntry`, `work_schedule_days`, `planWeekSave`, and `save_work_week`. Do not add a table. Do not infer rows.

Keep `/schedule` until a production invocation can establish a week from nothing and from Off, not only from an existing shift. Do not rebuild the fiscal-week transaction to match Orient’s anchor window in that same step. Desktop and phone can share that write. Their composition can differ.

Do not design the screen here.
