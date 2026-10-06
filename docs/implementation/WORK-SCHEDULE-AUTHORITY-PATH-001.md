# WORK-SCHEDULE-AUTHORITY-PATH-001 — production Work schedule authority

Engineering restoration. Physical acceptance is still pending.

The temporal field reads established temporal truth. Work schedule management establishes one source of that truth. It is an operation. It is not Present, Day, Week, or Month, and it does not replace the reading.

## Gap

Production `/` could inspect a scheduled Work fact and follow that inspection to `/schedule`. It could not establish a Work week when no scheduled fact existed, when the day was Off, or when Work was entirely unestablished. The canonical week writer already existed. The missing piece was a production invocation.

## Writer

The operation reuses the existing week draft and the existing transaction:

`planWeekSave` → `saveWorkWeek` → `save_work_week`.

No table, migration, recurrence, template, copy-forward, or inferred Work was added. Migration count: zero. `/schedule` still mounts `WorkSchedule` and remains a temporary direct route on the same writer. Retirement is a later tranche.

## Invocation

General authority is the control `Manage Work schedule` in the position surface, beside Sign out. It is present with no Work fact, with Off, and with Work entirely unestablished. It does not move the anchor, the question, or viewpoint provenance.

Its first week is the Saturday–Friday Work fiscal week that contains authoritative Today (`workFiscalWeekContaining`). It does not read the remembered Day, the Orient Week anchor, the Month anchor, or the selected viewpoint.

Inspection of a scheduled Work fact still says `Edit the work week`. That control opens the same operation on the Saturday–Friday week that contains the fact’s civil date. It does not navigate to `/schedule`.

## Surface

The operation borrows the existing surface. Desktop uses the right-side drawer. Phone uses the sheet. The reading stays mounted. One surface owns the operation. There is one editor and one writer for both forms.

The editor names the Saturday–Friday span. Each of the seven civil dates is unknown, Off, or scheduled. Unknown is shown as “Not entered” and is not Off. Off is an explicit row with no interval. Scheduled keeps a start, an end, and Opening, Mid, or Closing. Changes stay in the draft until Save. An invalid draft names the civil date, writes nothing, and stays open for correction.

Save reloads the persisted week into the draft, leaves the surface open, and refreshes the mounted reading through the existing `persist` / `reloadToken` boundary. A failed save leaves the surface open, keeps the draft, and says the week was not saved.

A dirty close — Close, Escape, or another surface replacement — offers Save, Discard, and Stay. Escape does not discard. Previous and Next move seven civil days inside the editor only. A dirty week asks the same Save / Discard / Stay choice before the editor week changes.

Phone uses that same draft and the same writer. Seven dates stay in one week. One day opens for its start, end, and shift type so the sheet can hold the week. Phone continuity stays mounted.

An unconfirmed zone still withholds the reading. The operation does not invent a zone and does not become the zone editor.

## Boundary

Timeline calculations, Capacity calculations, Present, Day, Week, Month, Exact Time, Direction, phone continuity, viewpoint provenance, midnight behavior, auth, Orient identity, and bottom-reach semantics were not changed.

## Physical inspection

Not accepted yet. Desktop still needs a human pass of the general invocation with no Work fact, the named fiscal week, all seven day states, a scheduled edit, Off, unknown, a dirty close, a successful save, and the reading remaining mounted behind the drawer. Phone still needs a human pass of the general invocation, whether the week is legible, save, close, and continuity remaining intact.
