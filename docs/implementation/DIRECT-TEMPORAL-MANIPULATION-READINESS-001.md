# DIRECT-TEMPORAL-MANIPULATION-READINESS-001

Implementation readiness only. No feature implementation. No runtime change. No test change. No schema change. No dependency. No commit.

Baseline: `ef846d74f510a7a8b05ca798319cfa38e59045c8` on `main`, matching `origin/main`.

Discovery: [DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md).

Contract: [DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md](DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md).

## 1. Baseline

The accepted commit is `ef846d74f510a7a8b05ca798319cfa38e59045c8`. `main` matches `origin/main`. Before this document, the working tree contained only the two untracked records named above.

## 2. Locked contract

V1 is desktop Week. Eligible facts are timed Protected Time, timed Block, and timed Commitment. Work, all-day facts, every other kind, phone, Present, Day, and Month stay out.

A gesture proposes `startsOn`, `startLocal`, and `endLocal` from the stored pair. Pointer release opens `FactDetail` with that proposal. Save is the existing same-id update. A gesture never writes. A pointer release never writes. The Week viewpoint does not chase. Overlap remains coexistence. There is no new persistence path, no new realtime path, and no drag library.

## 3. Current pointer ownership

Desktop Week and phone Week mount the same `Landscape` (`components/orient/Landscape.tsx`). Desktop wraps it in `.orient-desktop-resolution` when `form === "desktop"` (`OrientView`). The Week branch is `words === true`.

The Week event root is `.orient-landscape-days`. It has `onPointerDown`, `onPointerUp`, and `onWheel`. It has no `pointermove`, no `pointercancel`, no `pointerleave`, and no `setPointerCapture`.

`onPointerDown` returns unless `event.button === 0`, then stores `{ x: clientX, pointerId }` on a ref named `drag`. `onPointerUp` clears that ref. If the id matches, it sets `width` to `currentTarget.clientWidth / models.length` and `steps` to `Math.round((start.x - clientX) / width)`. A non-zero `steps` calls `onShift`. There is no pixel slop. The only threshold is half a column, because `Math.round` changes at `width / 2`.

`OrientView` passes `onShift` that ignores `0`, sets provenance to `"moved"`, and calls `shiftedAnchor`. That is the Week pan. It can change the anchor. A lift must not call it.

Fact buttons are inside `.orient-column-body`. They do not stop `pointerdown`. The event bubbles to `.orient-landscape-days`, so a press on a fact also arms the pan ref. Week fact `onClick` calls `onRefer(sharing(...))` and does not stop propagation. Month buttons stop propagation on click. Week buttons do not.

`touch-action: pan-y` is on `.orient-landscape-days`. `.orient-field` is `overflow: auto`. Noon (`::after` at 50%) and the Today mark (`.orient-now`, `z-index: 3`) are `pointer-events: none`. Week facts override the global `.orient-fact { pointer-events: none }` with `pointer-events: auto`.

There is no click suppression after a pan. A pointer-up that both rounds to a column and lands on a button can shift the window and then run the button click.

Current sequences:

| Gesture | What the code does |
| --- | --- |
| Click a fact | `pointerdown` stores `drag`. `pointerup` rounds to 0 steps. `click` runs `onRefer`. |
| Pointer down and a small move | Same, while `abs(deltaX) < width / 2`. No `pointermove` handler runs. |
| Horizontal pan | `pointerup` calls `onShift` when the delta rounds to at least one column. The click may still fire. |
| `pointercancel` | No handler. `drag` stays until a later `pointerdown` replaces it. |
| Pointer leave | No handler. A release outside `.orient-landscape-days` does not run `onPointerUp`, so `drag` stays. |
| Lost pointer capture | Capture is never taken, so this event does not occur for Week pan. |

The layer that can own a lift is that same `.orient-landscape-days` handler. A second listener on the button would compete with the pan ref. The lift is a mode of this handler, gated so it arms only for desktop Week.

## 4. Proposed state machine

Three phases on the existing ref. No fourth “completed” phase. A successful release clears the ref and tells `OrientView` to open `FactDetail`.

**Idle.** No pointer is claimed.

**Pending.** Primary button 0 is down on one eligible Week fact, and desktop lift is enabled. Record pointer id, origin `clientX`/`clientY`, fact identity, the stored triple, and the grab offset in section 10. Do not capture. Do not call `preventDefault`. The pan ref is this same record, so a later `pointerup` can still pan if the gesture never lifts.

**Lifted.** The gesture has become a proposal. Call `setPointerCapture` on `.orient-landscape-days`. Ignore `onShift` and `onWheel` for this pointer. Paint the provisional mark. Canonical models stay as loaded.

Transitions:

- Pending pointer-up with movement still inside the jitter floor: stay a click. `steps` is 0. The button `onClick` inspects. Clear the ref.
- Pending move that reaches half a column in X before it lifts: this pointer is a pan. Do not lift. `pointerup` keeps today’s `onShift`. Do not open `FactDetail`.
- Pending move that passes the jitter floor with vertical distance strictly greater than horizontal distance: enter lifted. From here `onShift` is forbidden.
- Lifted pointer-up inside one of the seven `.orient-column-body` rectangles: clear the ref, suppress the click that would follow, and open `FactDetail` with the proposal. Do not write.
- Lifted pointer-up with no body rectangle under the point: clear the ref, suppress the click, open nothing.
- `pointercancel`, `lostpointercapture`, Escape during lifted, unmount, or desktop lift turning off: clear the ref, release capture if held, open nothing.

Week pan remains allowed from empty track, from ineligible buttons, and from an eligible button when the horizontal move wins the half-column test first. Week pan is suppressed only after the lifted transition, and only for that pointer.

A release outside a column body cancels. It does not name an off-screen date and it does not page the window.

Escape during lifted clears local state. The desktop Escape listener in `OrientView` does not see this gesture: it is attached only while a borrowed surface is open, or while a Present/Day selection is visible. The lift listener has to be its own.

## 5. Hold and slop

| Constant | Where | Why it exists |
| --- | --- | --- |
| `SELECTION_HOLD_MS` = 220 | `components/daySelection.ts` | Touch only. A finger must rest before a day-canvas drag selects, so a flick can scroll. The comment says it is a threshold, not an inference. |
| `SELECTION_MOVE_SLOP_PX` = 10 | same file | Movement past this before the hold means the day is scrolling. |
| `SELECTION_INCREMENT_MINUTES` = 15 | same file | New-range snap. The 2026-10-02 decision sizes it to a 3.25rem hour row: 15 minutes is 0.8125rem, about 13px. Five minutes was rejected there as a few pixels. |
| Week pan | `Landscape` `Math.round(deltaX / columnWidth)` | No pixel constant. A shift starts at half a column. |
| Wheel | `Landscape` | 48px of accumulated delta, then one day. |

`DayField` uses the hold only when `pointerType === "touch"`. Mouse and pen arm selection immediately. Those constants are local to establishing a new range. Importing them into Week would let a day-selection change retune a correction gesture, and the 220ms hold exists for a scrolling day, not for desktop Week.

V1 does not use a hold. Desktop Week already distinguishes a click from a pan without one.

V1 uses two thresholds that are already implied by the code, plus one jitter floor:

- Pan stays half a column width, computed from `.orient-landscape-days`.
- Lift starts when movement passes a 10px jitter floor and vertical distance is strictly greater than horizontal distance.
- The 10px floor is the only movement floor in the instrument. It is a local number in the Week handler, not an import of `SELECTION_MOVE_SLOP_PX`, and it is not a product semantic. The first physical desktop pass may change it. It must not become 220ms by reuse.

## 6. Destination civil date

On lifted pointer-up, test `clientX`/`clientY` against `getBoundingClientRect()` of each Week `.orient-column-body`. Do not use `elementFromPoint`. The provisional mark, a fact button, and the day-ask footer can sit under the point. The body rectangle is the clock face.

The seven sections already carry `data-civil-day`. The body is the child `.orient-column-body`. Columns are equal flex items (`flex: 1 1 0`) separated by `gap: 0.15rem`, and by `gap: 0.35rem` from the `min-width: 960px` rule. The gap is not a column.

A point is inside a body when `left <= x < right` and `top <= y < bottom`, except the last body, which includes its right edge. That keeps a shared edge from matching twice. The flex gap means neighboring bodies do not share an edge. A point in the gap matches none.

The footer (`.orient-column-foot`, the Ask Day button) is outside the body. A release there cancels, even though the section has a civil date. There is no truthful clock at that Y. A release outside all seven bodies cancels. No nearest-column guess. No date beyond the seven. No change to the anchor while lifted, so the seven dates cannot change under the pointer.

## 7. Destination local clock

Map Y only through the destination `.orient-column-body` rectangle.

```text
ratio = (clientY - body.top) / body.height
ratio = clamp to [0, 1)
rawMinute = ratio * 1440
```

The half-open top of the range makes the bottom edge approach minute 1440 and never land on it. A stored start has to be `HH:MM` with hour `00`–`23`. `minuteToLocalText` maps both `0` and `1440` to `00:00`, so a start must not be produced by passing 1440 through that function. The raw minute here is in `[0, 1440)`.

Do not read the fact’s painted height, the `0.012` floor, the label’s `marginTop`, the Today wash, or the noon line. Noon is `top: 50%` and `pointer-events: none`. It is not a snap target.

The top edge is `00:00`. The bottom edge, after quantization in the next section, is the last legal quantum at or below minute 1439.

## 8. Quantization

Pixels for N minutes are `N * bodyHeight / 1440`. The root below is 16px, so a rem is 16px. These are CSS heights, not a measured screenshot.

| Minutes | Body at its 8rem floor (128px) | Body when the desktop row is 16rem and the foot is 2.75rem + 0.25rem (208px) | Body at 32rem (512px), inside the flex range |
| --- | ---: | ---: | ---: |
| 1 | 0.09 | 0.14 | 0.36 |
| 5 | 0.44 | 0.72 | 1.78 |
| 10 | 0.89 | 1.44 | 3.56 |
| 15 | 1.33 | 2.17 | 5.33 |
| 30 | 2.67 | 4.33 | 10.67 |
| 60 | 5.33 | 8.67 | 21.33 |

The desktop row is `min-height: 16rem` and `flex: 1 1 auto` with `max-height: none` under `.orient-desktop-resolution`. It grows with the field. The 8rem figure is the body floor. The 208px figure is that row floor minus the foot. The 32rem figure is a height the flex row can take. It is not an observed window.

The 2026-10-02 decision accepted about 13px as a controllable 15-minute step on a day axis of 3.25rem per hour, and called five minutes a few pixels. Week has no 3.25rem hour. At every height in the table, 15 minutes is a few pixels. One, five, and ten minutes are below a pixel or barely one.

V1 gesture quantum is 30 minutes. On a 32rem body it is about 11px, near the size that decision already treated as controllable. At the row floor it is about 4px, which is the case that physical tuning may reject. If that pass finds 30 minutes is only a twitch in the windows people use, the constant becomes 60. It does not become 15 or finer.

The constant is local to the proposal helper. It is not `SELECTION_INCREMENT_MINUTES` and it does not call `snapMinute`. `snapMinute` can return 1440, which is a selection end, not a start clock.

Legal proposed starts are `0, 30, 60, …, 1410`. Round the clamped raw start to the nearest of those. A tie at a halfway minute rounds toward the later slot, matching `snapMinute`’s tie comment, then a result of 1440 becomes 1410. `00:00` is the top. `23:30` is the bottom. FactDetail remains free to edit any minute before Save.

## 9. Proposal math

No existing function builds a moved pair. `timedBlockEndsNextCivilDate` is the predicate `end` minutes `<=` start minutes. `localMinutes` and `parseLocalTime` read a clock. `minuteToLocalText` collapses `<= 0` and `>= 1440` to `00:00`. `normalizeLocalRange` treats equal clocks as an empty selection. The fact rule treats equal clocks as a continuation. The selection helpers must not be used.

One pure helper owns this and nothing else:

```text
durationMinutes(startLocal, endLocal):
  start = localMinutes(parseLocalTime(startLocal))
  end = localMinutes(parseLocalTime(endLocal))
  if end <= start: return end - start + 1440
  return end - start

propose(stored, destinationCivilDate, proposedStartMinute):
  duration = durationMinutes(stored.startLocal, stored.endLocal)
  start = quantize to the 30-minute set, already in 0..1410
  end = (start + duration) mod 1440
  return {
    startsOn: destinationCivilDate,
    startLocal: HH:MM(start),
    endLocal: HH:MM(end)
  }
```

Equal clocks yield duration 1440, so the proposed end equals the proposed start, and `end <= start` still means the next civil date. There is no zero-length timed pair in this rule. A 24-hour continuation is that equal pair. It is not an empty fact.

Examples:

- `09:00–10:30` has duration 90. A proposed start of `13:00` returns `13:00–14:30` on the destination date.
- `22:00–02:00` has duration 240. The same clocks on another `startsOn` stay `22:00–02:00`. A later start of `23:30` returns `23:30–03:30`, and `03:30 <= 23:30` keeps the continuation.
- A start clamped to `23:30` with a 90-minute relationship returns `23:30–01:00`. The date stays the destination column. The continuation is the next civil date by the existing rule.
- The helper does not consult the time zone. A pair that does not occur, or occurs twice, still opens `FactDetail`. `establishmentBlocked` refuses it at Save, as it does today.

`startsOn` is the column’s `data-civil-day` string, already the civil date the landscape rendered. The helper does not add days to it.

## 10. Overnight handling

An overnight fact is placed on each civil date it intersects. Both buttons carry the same `data-source-kind` and `data-source-id`. Both are `<button>` elements. `stored` on each placement is `storedFact`: the canonical `startsOn`, `startLocal`, and `endLocal`, not the clip. The continuation’s `visibleStartMinute` is 0. Its painted top is midnight, not the canonical start. `clipped` is true when the Timeline bounds differ from the intersection.

V1 may lift only the button whose column `data-civil-day` equals `stored.startsOn`. The continuation button still clicks through `onRefer`. It does not lift. Using its painted top as the canonical start would be false, and the contract assigns `startsOn` to the destination column rather than to “where the grabbed instant lands.” A second meaning for the tail is not required to make V1 true.

On the start-day button, the grab offset is the pointer’s raw minute on that body minus the stored start minute, measured at pointer-down. The proposed start is the destination raw minute minus that offset, then clamped into `[0, 1440)` and quantized. A negative result becomes `00:00` on the destination column. It does not move `startsOn` to the previous day. The duration helper then runs. The point under the cursor can leave the grabbed pixel when the start hits that clamp. That is the cost of refusing an off-screen date.

## 11. Overlap handling

`placements` are `[...model.context, ...model.foreground]`. Context is Work, then Protected Time. Foreground is Block and Commitment. Later siblings paint later. Week facts set no `z-index`. The topmost button under the point receives the click. `.orient-now` is above them and does not receive the pointer.

`sharing` returns every placement on that column whose visible minutes intersect the pressed one, including the pressed fact. `referTo` opens the overlap list when that set has more than one address. Covered facts are inspected through that list. They are not given a private hit target.

V1 does not add lanes, a chooser, or a new hit test. A click still calls `sharing`. A lift starts only for the button that received the pointer, and only when that button is an eligible start-day clip. If the topmost button is Work, the gesture does not lift, and the click still opens whatever `sharing` already opened. Facts underneath are not lifted from a press that hit something else.

## 12. Provisional paint

Local state while lifted:

```text
pointerId
origin client point
sourceKind, sourceId
stored startsOn, startLocal, endLocal
grabOffsetMinutes
proposal startsOn, startLocal, endLocal
```

Canonical models and `projectDayCanvas` stay untouched. The original button stays where the projection put it. A second node is painted from the proposal: `top` is `startMinute / 1440`, and the height on that column is the visible part of the relationship on that date, divided by 1440. The `0.012` floor may be applied the same way canonical Week marks apply it, and that painted height is never read back into minutes.

If the relationship crosses midnight and the next civil date is already one of the seven columns, a second provisional slice may be painted there from minute 0. If that date is not in the seven, it is not painted and the window is not moved.

The provisional node is not a button. It is removed when the ref clears. Nothing is written.

## 13. FactDetail proposal injection

`FactDetail` initializes `dateDraft`, `startDraft`, and `endDraft` with `useState(stored…)`. Those initializers do not follow later stored changes. `editing` starts false. The displayed interval comes from `describe`, which reads `stored`.

Do not write the proposal into `stored` or into the day-canvas model.

Add an optional proposal on the facts surface only: `{ startsOn, startLocal, endLocal }`. `referTo` leaves it absent. The lift path sets it and sets `chosen` to that one fact. `FactDetail` uses it solely as the initial draft and starts in `editing` when the proposal is present and `stored` is a timed fact of the same id. The prose interval stays the stored interval. The fields show the proposal. Save already reads the drafts and calls `updateFromStored`. Close and Escape call `finishClose`, which drops the surface. The proposal existed only there.

If `describe` reports the fact missing, the existing effect closes the surface. The proposal closes with it.

## 14. Cancellation

Each of these clears the gesture ref, releases capture if this pointer holds it, removes the provisional node, and does not call the propose callback:

- `pointercancel`
- `lostpointercapture`
- Escape while lifted
- pointer-up outside every column body, including the gap and the column foot
- `Landscape` unmount
- desktop lift turning off, including a question change away from Week and a form change to phone

Canonical rows are untouched because none of these paths call `onUpdate`.

## 15. Desktop boundary

`readInstrumentForm` is `matchMedia("(max-width: 959px)")`. Phone is below 960px. Desktop is 960px and wider. The listener updates `form`. It does not unmount `Landscape` on Week. The desktop wrapper appears and disappears around the same component. Gesture state inside `Landscape` would otherwise survive the breakpoint.

`OrientView` passes lift permission only when `form === "desktop"` and the question is Week. Phone Week passes permission false, so a press there only pans and clicks, as it does now. An effect clears the gesture ref when permission becomes false. A pointer that is still down after the breakpoint does not open `FactDetail`.

Leaving Week unmounts `Landscape` because that branch is replaced. Unmount clears the ref. Present, Day, and Month never receive the permission.

## 16. Accessibility

Week facts stay `<button>` elements with `aria-label={accessibleFactName(...)}`, `type="button"`, and tab order. Click, Enter, and Space still run `onRefer`. `FactDetail` stays the labeled date, start, end, and Save path. V1 adds no keyboard drag.

The repository has no `draggable`, no `aria-grabbed`, and no `aria-dropeffect`. Those drag attributes are obsolete ARIA. Do not add them.

The provisional node is visual. It is `aria-hidden` so assistive technology does not announce a second fact. The original button remains the named control, in its canonical position, for the whole gesture.

## 17. Test architecture

Pure math in a new `components/orient/temporalProposal.test.ts`:

- `09:00–10:30` to a `13:00` start yields `13:00–14:30` on the given date.
- `22:00–02:00` onto another date keeps `22:00–02:00`.
- A start at `23:30` with a 90-minute relationship yields `23:30–01:00`.
- Equal clocks stay a 1440-minute continuation, not an empty range.
- Quantizing the bottom edge yields `23:30`, never `24:00`.
- The helper’s source does not import the Supabase writers.

Pointer and authority tests extend `components/orient/orientView.test.tsx`, which already renders Week and dispatches pointers. Geometry has to be stubbed with `getBoundingClientRect`, the way `viewpointProvenance.test.tsx` stubs day boxes. `components/orient/viewpointProvenance.test.tsx` already asserts that a landscape shift marks the anchor moved. A pan that starts on empty track, and a horizontal pan that wins on a fact, still belong there or in the Week section of `orientView.test.tsx`.

Cover:

1. A click on an eligible fact still inspects.
2. A Work button does not lift.
3. An all-day button does not lift.
4. Movement while pending performs no persistence call.
5. Pointer-up performs no persistence call.
6. A successful release opens `FactDetail` with the proposed date and clocks, and the prose still shows the stored interval.
7. Save calls the existing update with the same id.
8. Close without Save leaves the update uncalled.
9. A horizontal release changes `startsOn` to that column and keeps the relationship.
10. A vertical release changes the clocks and keeps the relationship.
11. An overnight start-day clip keeps `end <= start` when the relationship crosses midnight.
12. A click on an overlap still opens the overlap list. A lift moves only the button that was hit.
13. A lift does not call `onAnchor`.
14. `pointercancel` opens no `FactDetail`.
15. Escape while lifted opens no `FactDetail`.
16. A release in the gap or the foot opens no `FactDetail`.
17. The coherence module and the update functions are not edited. No new channel is subscribed.
18. A horizontal pan that reaches half a column still shifts, including one that begins on a fact and never lifts.
19. Click-to-inspect still runs when the pointer never lifts.
20. The existing keyboard Edit / date / start / end / Save path still works with no proposal attached.

The continuation clip of an overnight fact clicks to inspect and does not lift.

## 18. Expected implementation files

| File | Added responsibility | Must not take |
| --- | --- | --- |
| `components/orient/temporalProposal.ts` (new) | Duration relationship, 30-minute quantization, the three-field proposal. | DOM, writers, `FactDetail`, snap from `daySelection`. |
| `components/orient/temporalProposal.test.ts` (new) | The pure cases in section 17. | Rendering. |
| `components/orient/Landscape.tsx` | The three-phase ref, capture, provisional node, click suppression after a lift, `onPropose`. | Persistence, anchor changes while lifted, Month, phone. |
| `components/orient/OrientView.tsx` | Pass desktop-Week permission. On propose, open the facts surface with the optional proposal. | Minute math, a second writer. |
| `components/orient/Surfaces.tsx` | Initial drafts and `editing` from the optional proposal. | Writing the proposal into `stored`, changing `save`. |
| `components/orient/orientView.test.tsx` | The pointer and authority cases. | A new harness. |
| `components/orient/orient.css` | Only if the provisional node needs a data attribute to be found. No motion. | A new visual language. |

No generic drag framework. No gesture service. No change to `persistence/`, `canonicalCoherence.ts`, `package.json`, or schema.

## 19. Implementation invariants

- A gesture and a pointer release do not call `updateProtectedTime`, `updateBlock`, `updateCommitment`, or `onAnchor`.
- The proposal is only `startsOn`, `startLocal`, and `endLocal`, computed from the stored pair and the destination body.
- The same id and kind reach `updateFromStored` on Save. Non-temporal fields stay on that update.
- Only a timed Protected Time, Block, or Commitment button whose column date equals `stored.startsOn` can lift, and only when `form === "desktop"` and the question is Week.
- Work, all-day, and the overnight continuation clip cannot lift.
- Lifted state suppresses Week pan and the wheel shift. Pending state does not.
- A release outside the seven bodies cancels.
- Escape, cancel, lost capture, unmount, and leaving desktop Week clear local state only.
- The original button remains the accessible control. The provisional node is hidden from assistive technology.
- Quantization is the local 30-minute set. It is not `snapMinute`.
- Overlap inspection stays `sharing`.

## 20. Readiness decision

READY TO IMPLEMENT.

The mechanics above are enough to build V1 without reopening the contract. The 30-minute quantum and the 10px jitter floor are interaction constants, not temporal semantics. The first physical desktop pass may raise the quantum to 60 minutes, or change the jitter floor. It may not introduce a hold from `SELECTION_HOLD_MS`, a 15-minute reuse, a phone path, a Work path, or a write on release.
