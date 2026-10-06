# WORK-SCHEDULE-WEEK-DRAFT-REFINEMENT-001 — construct the week, then save

Physical acceptance of Work schedule management failed because opening the next date stored an empty scheduled day. That empty day failed week validation, so a finished shift could not be saved beside it. The human had to save after every shift.

The week draft, the week-wide dirty state, and `planWeekSave` → `saveWorkWeek` → `save_work_week` were already one transaction. This correction does not change them. Migration count: zero. Timeline, Capacity, and the accepted temporal readings were not changed.

## Selection and establishment

Selecting a date and establishing Scheduled are different acts.

`openWorkOn` only chooses which member of the current Saturday–Friday draft is being edited. Changing it does not persist, does not ask Save / Discard / Stay, and does not write Scheduled, Off, unknown, a start, an end, or a shift type.

The start, end, and shift-type fields for an unknown or Off date are presentation until the human changes one of them. That change writes `scheduled` into the week draft. An opened date that is left untouched stays unknown, or stays Off, and does not block Save of its siblings.

Off and Not entered remain explicit choices. Off writes `off`. Not entered writes `unknown`, which the existing week plan clears.

## One Save

A finished shift stays on its row while another date is edited. Several completed shifts and explicit Off days stay in the same draft. One Save plans every changed date and persists them together. A scheduled date that is missing a start, an end, or Opening, Mid, or Closing still fails validation for that civil date, and nothing is written. `planWeekSave` was not taught to skip invalid scheduled rows.

Close, Escape, replacing the surface, and Previous or Next fiscal week still ask before a dirty week is abandoned. Choosing another date inside the same week does not.

Phone uses the same draft and the same Save. It may still focus one date. Switching dates does not create an empty scheduled day and does not persist.

## Acceptance

Not physically accepted. A human still needs to construct a desktop week — several shifts, an Off, an untouched date — and save once, and to do the same focused pass on the phone sheet.
