# DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001

Contract only. No direct-manipulation implementation. No runtime change. No test change. No dependency. No migration. No commit.

Baseline: `ef846d74f510a7a8b05ca798319cfa38e59045c8` on `main`, matching `origin/main`.

Discovery: [DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md).

This contract accepts a narrowed form of the discovery hypothesis. When a resolution’s spatial representation of time is truthful enough, that representation may become an instrument for proposing a temporal correction. The first implementation is desktop Week, and only for timed Protected Time, Block, and Commitment. The gesture proposes. Save establishes.

## 1. Purpose

Desktop Week already draws established timed facts on two truthful axes: a column is a civil date, and the column body is a full local day (`visibleStartMinute / 1440` inside `.orient-column-body`, identity on `data-source-kind` and `data-source-id`).

The first implementation may let a human lift one eligible fact on that surface and propose a new `startsOn`, `startLocal`, and `endLocal`. The proposal opens the existing `FactDetail` correction. Canonical truth changes only when that human Saves through the existing same-id writer.

## 2. Governing principle

Spatial manipulation proposes a correction. It does not itself establish canonical truth.

```text
gesture
  -> provisional temporal proposal
  -> existing FactDetail correction surface
  -> explicit human Save
  -> existing same-ID update writer
  -> canonical reread
  -> deterministic projection
```

Dragging expresses intent. Save exercises authority. No canonical write occurs because the pointer moved or was released.

## 3. First implementation surface

V1 is desktop Week only.

Week is the only production reading that has both axes at once. Horizontal movement names a civil date from the column. Vertical movement names a local-clock placement from the full-day fraction. Together they can propose “this established timed truth, from this date and time, to that date and time.”

The Orient Week is the seven-day window from the current anchor (`WEEK_WINDOW_DAYS`). It is not the Saturday–Friday Work fiscal week.

Out of V1, and not implemented by this contract:

| Surface | Later possibility | Why it is not V1 |
| --- | --- | --- |
| Present | none for placement | Membership is not a date or a clock. |
| Day | clock-only, on the date already shown | The signature and `DayClock` have a full-day fraction and no civil-date axis. |
| Month | civil-date only | An aperture can name a date. Its fitted vertical axis is not a stable clock. |
| Phone | separate physical design | Lift, scroll, pan, and tap already compete. |

## 4. Eligible fact types

A fact is eligible when it is a timed Protected Time, a timed Block, or a timed Commitment: `stored` carries `startsOn`, `startLocal`, and `endLocal`, and the existing `FactDetail` editor can change those three fields.

Excluded from the gesture:

- Work
- all-day facts
- Tasks
- Notes
- Active Thread
- Destination
- Priority

An ineligible territory keeps its current inspection behavior. The gesture does not start on it.

## 5. Identity preservation

A move corrects the placement of the existing fact.

The proposal and the eventual Save preserve:

- the same fact id
- the same fact type
- the same created identity and provenance
- every non-temporal attribute already on the update
- existing relationships

Block keeps purpose, Context, Task, and priority-service relationships. Commitment keeps title and `user_created`. Protected Time keeps its existing identity and semantics.

There is no duplicate, no replacement row, and no delete-then-create. The write remains `updateFromStored` into `updateProtectedTime`, `updateBlock`, or `updateCommitment`, filtered on that id.

## 6. Proposal shape

A Week manipulation proposes exactly:

- `startsOn`
- `startLocal`
- `endLocal`

It proposes no other field.

Horizontal movement is the proposed civil date: the column under the pointer, identified the way the landscape already identifies a day (`data-civil-day` on the column).

Vertical movement is the proposed local-clock placement: a position on that column’s full-day fraction.

The source of the proposal is the canonical stored temporal pair on `stored`, not the painted fragment. `projectDayCanvas` clips a timed fact to the civil date being drawn. That clip, including a height raised by the 0.012 paint floor, is not the fact’s duration.

## 7. Date semantics

The proposed `startsOn` is the civil date of the destination column.

Moving across columns changes that date. It does not create a second fact on the destination date. The same id is what `FactDetail` will save.

The Week being viewed supplies the columns. The proposal does not retarget the anchor in order to reach a date outside the visible seven.

## 8. Local-clock semantics

The proposed clocks are local `HH:MM` values derived from the stored pair plus the vertical displacement along the full-day axis.

Stored precision remains the minute. The column’s pixels are not that precision. Section 14 refuses to treat one pixel as one minute, and it refuses to install a snap interval in this contract.

`establishmentBlocked` and the existing `defineProtectedTime` / `defineBlock` / `defineCommitment` validation still govern the proposal once it is in `FactDetail`. A local minute that does not occur, or that occurs twice, on the destination civil date is still refused by that existing gate. The gesture does not choose which repeated hour is meant.

## 9. Duration and overnight semantics

A move preserves the existing local-clock duration relationship. Duration is not a stored column. It is the relationship between `start_local` and `end_local`.

A same-day pair keeps its local delta. `09:00–10:30` moved so the start is `13:00` proposes `13:00–14:30`.

An overnight pair stays overnight. `timedBlockEndsNextCivilDate`, and the matching Protected Time and Commitment rules, are `end` minutes `<=` start minutes, meaning continuation into the next civil date. `22:00–02:00` moved onto another civil date proposes that same local pair on the new `startsOn`. The continuation still falls on the following civil date. The times are not swapped. A later edit inside `FactDetail` can change the proposal; the gesture itself does not.

The two painted slices of an overnight fact are two clips of one stored pair. Grabbing either clip proposes from that stored pair. It does not propose a duration equal to the visible slice.

Elapsed milliseconds across a daylight-saving boundary are not the stored relationship. The row stores local clocks. Existing validation remains the authority for whether those clocks occur.

## 10. Explicit Save authority

Pointer release does not write.

A completed spatial proposal opens the existing `FactDetail` correction surface with the proposed civil date, start clock, and end clock. The human may Save or abandon the correction.

Save uses the existing update authority: `updateFromStored`, then `OrientInstrument.onUpdate`, then the matching `update*` function, then `reloadToken` only after success. A failed Save keeps the editor and does not reload, as it does today.

V1 adds no Move / Cancel confirmation. `FactDetail` is both the precision correction surface and the explicit authority boundary.

Abandoning the surface, or leaving it without Save, leaves canonical rows unchanged.

## 11. Viewpoint behavior

Direct manipulation does not move the temporal viewpoint.

The Week on screen stays the Week on screen. Anchor provenance is unchanged. The gesture does not pan the window in order to follow the fact.

If the proposed placement, once saved, no longer belongs to the rendered reading, canonical reprojection may omit it. The instrument does not chase the moved fact.

## 12. Provisional-state semantics

While the pointer is down, the moved representation is provisional. It is not established truth.

No database write occurs during the gesture. Canonical projection state is not mutated in order to paint it. `projectDayCanvas` continues to describe the stored facts.

The implementation may hold the smallest local gesture state required to paint the proposal: which fact, and the proposed `startsOn`, `startLocal`, and `endLocal`. That state is interaction state. It is not a second temporal store, not a Timeline fact, and not a table.

## 13. Overlap semantics

Overlap remains coexistence of temporal truths.

A direct move does not resolve collisions, reject a placement because another fact occupies it, rank facts, infer availability, push another fact, or rearrange neighbors.

Empty track is not available time. Unmarked time is not an established opening.

## 14. Precision distinctions

Three precisions stay distinct.

| Precision | What it is in Week |
| --- | --- |
| Stored | Minute `HH:MM` on the row, written only by the existing Save. |
| Representation | A full-day fraction, minute / 1440, with a paint floor that does not change `data-top`. |
| Gesture | Whatever physical movement the pointer can actually indicate on a column whose height is often below one pixel per minute. |

This contract does not canonize a snap interval. One physical pixel is not one minute. The existing 15-minute establishment increment (`SELECTION_INCREMENT_MINUTES`, `snapMinute`) is evidence about selecting a new range. It is not authority for this move.

The implementation-readiness tranche determines the smallest deterministic gesture quantization that is physically usable and semantically defensible. Until that tranche, no snap policy is part of the product contract.

## 15. Pointer-model boundary

V1 is desktop Week. The implementation uses the Pointer Events already in the production instrument, unless implementation-readiness finds a blocker in those events. No drag or gesture dependency is added by default.

The gesture must be distinguishable from:

- an ordinary click, which still inspects
- an intentional hold and lift, which manipulates
- the existing Week pan, which still moves the window

This contract does not set a hold duration or a movement slop. Those numbers belong to implementation evidence. The exact-day values, 220ms and 10px, establish a new range. They are not the lift contract.

## 16. Accessibility boundary

Direct manipulation is an additional spatial instrument. It is not the only way to correct a timed fact.

`FactDetail` remains the non-pointer, keyboard-accessible precision path. Date, Start, End, and Save stay available without a drag. V1 does not require a simulated keyboard drag.

Existing Week fact buttons keep focusability, accessible names, and click-to-inspect. Enter and Space still open inspection. The gesture must not remove that path in order to own the pointer sequence.

## 17. Coherence reuse

No new coherence architecture.

`protected_time`, `blocks`, and `commitments` are already Class A, including UPDATE, in `canonicalCoherence.ts`. After the human Saves through the existing writer, the writing client reloads through `reloadToken`, and other active Orient clients reread through the accepted realtime invalidation where it applies, then re-project. A correction that uses those writers needs no new publication and no new channel.

## 18. Work exclusion

Work is drawn on Week and can be inspected. It is not eligible.

`storedFact` returns null for `work_schedule`. `FactDetail` offers “Edit the work week,” which opens `WorkScheduleOperation`. The write is `planWeekSave` → `saveWorkWeek` → `save_work_week` for the Saturday–Friday fiscal week, including shift type and Off / unknown.

A spatial update of one Work interval would bypass that draft, that shift type, those row states, and the week transaction. Geometry does not separate Work’s authority. The kind does. Direct manipulation of Work is outside V1 and outside this correction path.

## 19. V1 non-goals

This contract does not include:

- phone drag
- Day drag
- Month drag
- Present drag
- Work drag
- all-day drag
- Task drag
- resizing
- duration handles
- copy or duplicate gestures
- multi-select
- collision resolution
- automatic scheduling
- availability inference
- recommendations
- AI, machine learning, or language models
- recurrence
- reminders
- a new database schema
- a new realtime system
- a drag-and-drop library
- animation or polish
- haptics
- Google Calendar
- external calendar manipulation

## 20. Acceptance invariants

Any implementation of this contract is wrong if any of the following fails:

- A gesture alone never writes canonical truth.
- Pointer release alone never writes canonical truth.
- The same fact id survives the correction.
- The same fact type survives the correction.
- The Week viewpoint does not chase the fact.
- Anchor provenance is unchanged by the gesture.
- Only timed Protected Time, timed Block, and timed Commitment are eligible.
- Work cannot be manipulated through this path.
- All-day facts, Tasks, Notes, Active Thread, Destination, and Priority cannot be manipulated through this path.
- The proposal contains only `startsOn`, `startLocal`, and `endLocal`.
- Existing non-temporal attributes and relationships survive, including Block purpose, Context, Task, and priority-service relationships, and Commitment title and `user_created`.
- The proposal is derived from the stored temporal pair, not from a clipped or floor-heightened paint fragment.
- Overnight meaning survives: `end <= start` still continues into the next civil date.
- No duration column is introduced.
- `FactDetail` opens populated with the proposed date and clocks.
- Save remains explicit and uses the existing same-id update.
- An abandoned proposal changes nothing canonical.
- Overlap remains coexistence. The move does not resolve, reject, rank, or push other facts.
- Empty space is not treated as available.
- No new realtime path is added.
- No new persistence path is added.
- Existing click-to-inspect remains available.
- Existing keyboard correction through `FactDetail` remains available.
- V1 does not require a keyboard drag.
- No snap interval is treated as already canonized by this contract.

## 21. Unresolved implementation mechanics

Product meaning for V1 is closed by the sections above. These mechanics are not:

- The smallest deterministic quantization from pointer Y to a local minute, given `columnBodyHeight / 1440`.
- The hold and movement threshold that separates inspect, lift, and the existing Week pan, without adopting the exact-day 220ms / 10px pair by default.
- How pointer capture interacts with the landscape pan handler when the target is a fact button.
- How a grab chooses one fact when several full-width territories contain the same point.
- How a grab on either painted clip of one overnight id reads the single stored pair.
- How provisional paint is drawn from local gesture state without mutating canonical projection.
- How a provisional placement is exposed, if it must be exposed at all, without becoming a second control that replaces click-to-inspect.

Those belong to the implementation-readiness tranche. They do not reopen the surface, the eligible kinds, the proposal shape, the Save boundary, or the Work exclusion.
