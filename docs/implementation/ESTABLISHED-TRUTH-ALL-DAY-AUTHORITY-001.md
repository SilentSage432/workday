# ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001

Implementation tranche. Reachability/composition only. No schema, migrations, or domain expansion.

---

## 1. Baseline

| Item | Value |
| --- | --- |
| HEAD at start | `d660216aab26ef0f5a8f2b1701ac20ba6cc48bb0` |
| Branch | `main == origin/main` |
| Working tree | Clean at start |
| Discovery | [ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-DISCOVERY-001.md) |
| Discovery verdict | **B — canonical authority exists; production reachability is incomplete** |

---

## 2. Discovery authority

Discovery established that create/update/delete writers, all-day domain kinds, projections, inspect, and remove already work on production `/`. The gap was timed-only establishment helpers and FactDetail edit gated on timed `stored`.

This tranche closes that gap without new writers or tables.

---

## 3. Scope

Make all-day Protected Time, Block, and Commitment:

1. establishable from production `/` (phone + desktop);
2. correctable via FactDetail same-ID update (including civil date);
3. still removable via existing delete confirmation;

without `/schedule`, without Capture routing, without Work Off reclassification, and without LOOK · + · ACT redesign.

---

## 4. Production establishment path

`AllDayEstablishmentSurface` → `establishAllDay` → `actions.onEstablish` → existing `createProtectedTime` / `createBlock` / `createCommitment`.

Surface fields: civil date (defaults to current anchor), type chooser (PT / Block / Commitment), type-specific fields only. No clocks.

---

## 5. Phone reachability

ADD → **All day** (`data-add-choice="all-day"`) → `create-all-day` surface.

Preserves LOOK · + · ACT. Does not add a navigation peer.

Timed path remains **Time on the day** → Exact. After choosing All day, the surface does not re-ask timed vs all-day.

---

## 6. Desktop reachability

Present/Day reading reach row: **All day** (`data-all-day-establish`) beside Exact time → same `AllDayEstablishmentSurface`.

No LOOK · + · ACT mirror. Capture peer unchanged.

---

## 7. Protected Time composition

Create/edit: civil date + optional label. `kind: "all_day"`. No start/end locals.

---

## 8. Block composition

Create: civil date + required purpose + optional Context. Task citation not offered on create (matches `/schedule` sections).

Edit: purpose, Context, Task citation preserved/correctable. Same id.

---

## 9. Commitment composition

Create/edit: civil date + required title. Origin remains `user_created` via `defineCommitment`.

---

## 10. FactDetail all-day edit composition

When canvas `stored` is timed-null, FactDetail resolves the all-day row from OrientSources (canonical loaded rows). Edit opens date + type fields only (`data-fact-edit="all-day"`). Save uses `updateFromAllDayStored`.

---

## 11. Same-ID correction behavior

`updateFromAllDayStored` → `onUpdate` → `update*` with the existing id. Fact type and relationships preserved. Not delete+recreate.

---

## 12. Civil-date correction

Date field corrects `startsOn` on the same row. No clocks invented. Viewpoint does not chase the moved fact (existing production behavior preserved).

---

## 13. All-day ↔ timed conversion disposition

**Intentionally deferred.** Persistence and `/schedule` sections support kind change; production FactDetail does not expose conversion in this tranche. Same-kind all-day correction is complete. Conversion would need an explicit clock-establishment / clock-removal decision model beyond the timed-shaped edit already present.

---

## 14. Remove authority preservation

Unchanged: Delete this fact → Confirm delete → `onRemove` → hard `delete*`. Removable for all-day without requiring Edit.

---

## 15. Projection preservation

No Present/Day/Week/Month/capacity redesign. All-day facts continue listing in `model.allDay`; capacity continues existing civil placement for all-day rows.

---

## 16. Work boundary

Work schedule path untouched. Work Off is not an all-day PT/Block/Commitment.

---

## 17. `/schedule` boundary

`/schedule` not retired, not redirected. Zone save stays there. Sections remain historical scaffold.

---

## 18. Tests

| File | Coverage |
| --- | --- |
| `components/canvasEstablishment.test.ts` | `establishAllDay` / `updateFromAllDayStored` |
| `components/orient/allDayAuthority.test.tsx` | phone ADD, desktop reach, create×3, edit, remove, ADD regress, projection/capacity regress, no conversion UI |
| `components/orient/civilDateCorrection.test.tsx` | all-day civil-date same-id correction (replaces “no Edit”) |
| `components/orient/lookAddAct.test.tsx` | All day in ADD chooser |

---

## 19. Validation

Recorded in the implementation return report: focused tests, full suite, lint, typecheck, production build.

---

## 20. Deviations

None relative to discovery gap B. Conversion deferred by design (§13).

---

## 21. Explicit non-goals

Schema/migrations; generic Event; recurrence/reminders/notifications; `/schedule` retirement; zone-save relocation; Work Off as all-day interval; Capture routing for typed all-day establishment; all-day↔timed conversion UI; phone/desktop redesign; Task/ActiveThread/capacity/Present redesign; physical acceptance document.

---

End of implementation document. No commit in this turn.
