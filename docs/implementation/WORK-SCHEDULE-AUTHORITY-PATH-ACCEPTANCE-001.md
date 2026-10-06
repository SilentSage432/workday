# WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001 — Work schedule authority

Work schedule management — physically accepted.

The temporal field reads established temporal truth. Work schedule management establishes one source of that truth. It is an operation. It is not Present, Day, Week, or Month.

Human inspection of production `/` reached the operation with no Work fact, constructed a Saturday–Friday week without saving between shifts, kept several shifts in the unsaved draft, set Off explicitly, left other dates Not entered, and saved once. The established Work then appeared in the mounted reading. Week showed the Work territories. Month showed the corresponding apertures.

## Authority

`Manage Work schedule` sits in the position surface, beside Sign out. It is available when no Work fact exists, when the day is Off, and when Work is entirely unestablished. It opens the Saturday–Friday fiscal week that contains authoritative Today. It does not move the viewpoint, the question, or viewpoint provenance.

Inspection of a scheduled Work fact still says `Edit the work week`. That control opens the same operation, on the fiscal week that contains the fact’s civil date. It does not go to `/schedule`.

The operation borrows the existing surface. Desktop uses the right-side drawer. Phone uses the sheet. The reading stays mounted. One writer serves both. Production `/` no longer depends on `/schedule` for Work authority. `/schedule` remains a temporary direct route. Retirement is a later tranche.

## Week draft

The fiscal week is one draft and one Save.

Selecting another date in that week only changes which date is being edited. It does not persist, does not ask Save / Discard / Stay, does not move the Orient viewpoint, and does not create an empty scheduled day. A date becomes Scheduled when its start, end, or shift type is changed. Unsaved edits on the other dates remain. Off and Not entered stay explicit. One Save then plans every changed date.

Save is `planWeekSave` → `saveWorkWeek` → `save_work_week`, one transaction. A scheduled date that lacks a start, an end, or Opening, Mid, or Closing still fails validation, and nothing is written. Success reloads the week into the draft, leaves the operation open, and refreshes the mounted reading through the existing reload boundary. The viewpoint stays. Failure keeps the draft, leaves the operation open, and says the week was not saved.

Close, Escape, replacing the surface, and Previous or Next fiscal week still ask Save, Discard, or Stay before a dirty week is abandoned.

## States

Unknown, shown as Not entered, is the absence of a Work row. It is not Off, not free, and not available. Off is an explicit row with no Work interval. Scheduled is an explicit start, end, and Opening, Mid, or Closing. The timeline derives the Work interval from that row.

No migration was added.

## Parked

Month shows established Work geometry. Week names that territory with the word Work. A later resolution may carry more identity where the resolution can support it — a shift time, a shift type, a Block’s identity, or another established label. Orient must not expose more information density or temporal precision than the current resolution can truthfully support. That observation is not implemented here. Week labels, Month labels, Work block contents, and temporal geometry stay as accepted.
