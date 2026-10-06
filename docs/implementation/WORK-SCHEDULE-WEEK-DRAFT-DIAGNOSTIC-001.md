# WORK-SCHEDULE-WEEK-DRAFT-DIAGNOSTIC-001 — one week, one Save

Physical acceptance failed. The operation is reachable. The human cannot build the week and save it once.

Reported interaction: a Save is required after every shift. The intended interaction is to edit any of the seven Saturday–Friday dates, keep those edits in one local draft, and press Save once.

No runtime behavior was changed by this diagnosis. Work schedule is not physically accepted.

## What the human is doing

1. The week opens. All seven dates are Not entered, Off, or an already stored shift. Nothing is expanded.
2. Shift on one date stores that date as `scheduled` with an empty start, an empty end, and no shift type, and expands that date’s fields (`openWorkOn`).
3. Start, end, and type write into that same date inside the week draft. Nothing is persisted.
4. Shift on another date in the same fiscal week does not ask Save, Discard, or Stay. It does not persist. It keeps the first date’s unsaved times in the draft, collapses that date’s fields, and immediately stores the newly chosen date as an empty `scheduled` day.

Save is one control, under the seven dates. It is not inside each day. It stays disabled until the draft differs from the loaded week. On success it writes the week, reloads the draft, and collapses the open date.

## Why that feels like a save per shift

`planWeekSave` walks the seven dates and refuses the whole week at the first `scheduled` date that lacks a start, an end, or Opening, Mid, or Closing. It writes nothing.

Beginning the next shift is what creates that incomplete `scheduled` date. After Saturday is complete, clicking Shift on Sunday makes Sunday an empty scheduled member. Save then names Sunday and persists neither Sunday nor the finished Saturday. The finished Saturday is still only in the local draft.

The open shift has no local Close. The historical week editor could close the fields without saving (`onOpenDay("")`) and only then showed the other days’ controls. This operation leaves every other day’s Shift control visible, and that control both moves the editor and plants an empty scheduled day.

The reliable path through the current screen is therefore: finish one shift, Save while no other date is an empty scheduled day, then begin the next shift. That is the reported loop. It is not a second writer.

Desktop uses this one-open-date interaction. The seven summaries are on screen together. The start, end, and type fields are not. Phone was allowed to focus one date. Desktop was not required to.

## Draft

`WeekDraft` is `{ order, baseline, days }`. `order` is the seven civil dates. `days` holds one draft per date: `unknown`, `off`, or `scheduled` with start, end, and shift type. `replaceDay` replaces one key and leaves the others. `weekDraftIsDirty` is true when any date differs from `baseline`.

Editing Sunday does not drop Saturday. Dirty state belongs to the week. Save already plans every changed date. Validation stops at the first invalid date, so a week with two incomplete shifts names only the earlier one.

The draft does not need to be rewritten.

## Persistence

`planWeekSave` already returns one list of changed dates. The existing draft test “keeps several day edits local until a save plan” expects Saturday cleared, Sunday Off, and Monday scheduled in one plan.

`saveWorkWeek` sends that list in one `save_work_week` call, or skips the call when the list is empty. The SQL function applies the list in one transaction, at most seven dates, each inside that fiscal week. A failed call throws “This week was not saved.” Persistence should not change.

## Boundaries

Same-week selection is not leaving the operation, not replacing the draft, and not fiscal-week navigation. Current code does not invoke Save / Discard / Stay for it, and it does not persist the previous day.

Dirty protection currently runs for Close, Escape, another surface, and Previous or Next fiscal week. That is the right set. It does not run for selecting, expanding, or collapsing a date in the open week, or for changing Scheduled, Off, Not entered, start, end, or type.

The incorrect boundary is earlier than the dirty prompt. Opening the next date writes an unfinished `scheduled` day, and that unfinished day blocks the week Save.

## Smallest correction

Keep one week draft and one Save. Do not auto-save on a date change.

In the operation only:

- Choosing another date in this Saturday–Friday week only changes which date is focused.
- A date becomes `scheduled` when its shift is entered, not when its row is opened.
- Desktop shows the week so a finished shift stays visible while the next shift is entered, then one Save plans every changed date.
- Phone may still focus one date. Switching dates keeps the unsaved edits and does not persist them.

Do not add recurrence, templates, copy-forward, another table, or another Work state.
