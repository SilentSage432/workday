# DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001

Discovery only. No drag-and-drop implementation. No library. No runtime change. No migration. No commit.

Baseline: `ef846d74f510a7a8b05ca798319cfa38e59045c8` on `main`, matching `origin/main`. The working tree was clean at the start.

The hypothesis under test: when a resolution’s spatial representation of time is truthful enough, that representation may become an instrument of authority. This record does not accept the hypothesis. It says where the current production geometry can carry a proposal, and where it would claim precision it does not have.

## 1. What production actually draws

`app/page.tsx` renders `OrientInstrument`, which renders `OrientView`.

| Question | Depth | Form | Component | Spatial axis |
| --- | --- | --- | --- | --- |
| Present | reading | phone | `PhoneContinuity` | none. Membership buttons. |
| Present | reading | desktop | `DesktopReading` | none. Membership buttons. |
| Day | reading | phone | `PhoneContinuity` | one horizontal 00:00–24:00 signature |
| Day | reading | desktop | `DesktopReading` | the same horizontal signature |
| Present or Day | exact | either | `DayClock` in `DayField.tsx` | one vertical 00:00–24:00 clock per civil date |
| Week | reading | either | `Landscape` with `words` | seven columns; vertical fraction is the full local day |
| Month | reading | either | `Landscape` without `words` | 7×4 apertures; vertical fraction is a compressed axis |

Desktop Week and Month wrap that same `Landscape` in `DesktopWindow`. The window names the span. It does not change the coordinates.

`DayClock` is not the production reading. It is the exact-depth field, used when `depth !== "reading"`. The accepted Day reading is the signature plus a clock-ordered list.

Geometry comes from `projectDayCanvas` (`projections/dayCanvas.ts`). A timed fact’s painted minutes are the Timeline intersection clipped to that civil date (`visibleMinutes` / `minuteOnSelectedDay`). `top` and `height` are those minutes divided by `DAY_AXIS_MINUTES` (1440). The stored clocks stay on `stored` for Protected Time, Block, and Commitment. Work’s `stored` is null.

`assignForegroundLanes` writes `lane` and `laneCount` onto foreground placements. No production Orient component reads `lane`. Overlapping Week, Month, and Day-clock marks share the full track width. Overlap is expressed by stacking the kind word (`labelStackIndex`) and, on button surfaces, by `overlappingFacts`, which opens every fact whose visible minutes intersect the pressed one.

### Day reading

`signaturePlacement` maps `visibleStartMinute` / `visibleEndMinute` through `minuteFraction` to `left` and `width` percentages. `DesktopSignature` and the phone signature render each timed fact as a `<button>` with `data-source-kind`, `data-source-id`, `data-start`, and `data-width`. Click calls `onRefer` and `stopPropagation`. The ground button (`data-signature-ground`) converts `clientX` to a minute with `minuteFromSignatureRatio` and enters Exact time. Keyboard activation (`event.detail === 0`) enters Exact time without inventing a minute.

The reading list beside the signature is flex/flow. `data-start-minute` is on the button. It is not a position.

### Exact Day

`DayClock` is a `position: relative` surface, `data-axis="local-clock"`, height `calc(var(--orient-hour) * 24)` with `--orient-hour: 3rem`. Hour lines sit at `hour / 24`. Facts are `<article>` elements, absolutely positioned at `top` and `height` from the projection. CSS sets `.orient-fact { pointer-events: none }`. The surface, not the article, receives the pointer. `factsUnderPointer` hit-tests article rectangles. A short tap refers to those facts. A hold then a vertical drag selects a new range. That selection is establishment of new truth, not correction of an existing row. Bounds on an open selection call `setPointerCapture` and `snapMinute` (15 minutes).

Three exact days are mounted (anchor and its neighbors). Each clock is its own vertical axis. Horizontal position inside one clock is not a civil date.

### Week

`Landscape` lays seven `orient-column` sections in a flex row, `flex: 1 1 0`. Each section has `data-civil-day`. Timed facts are `<button>`s, `position: absolute`, `top: placement.top`, `height: max(placement.height, 0.012)`. The 1.2% floor is paint only. `data-top` keeps the unfloored fraction. All-day facts are in normal flow above the clock, not on the axis.

A 22:00–02:00 fact is one row with `endsNextCivilDate`. Timeline clips it. The start date paints from 22:00 to the end of that civil day. The next civil date, when it is in the seven-day window, paints from 00:00 to 02:00. Both nodes can carry the same `data-source-kind` and `data-source-id`. The visible slice is not the stored duration.

Work is the same button chrome. Inspection does not open the timed editor. See the Work boundary below.

Today is a full-column wash (`data-present-mark`, `top: 0; bottom: 0`), not a minute mark. Noon is `.orient-column-body::after` at `top: 50%`, `pointer-events: none`. On a full-day fraction, 50% is minute 720. It is decoration.

The landscape’s own pointer is a window pan: pointer-up moves the anchor by `round(deltaX / columnWidth)` days. Fact buttons do not stop `pointerdown`, so a drag that starts on a fact also reaches that pan.

### Month

`monthClockAxis` takes every timed placement in the 28-day window, pads 8%, and refuses a span shorter than 180 minutes. An empty window is 0–1440. `monthVisualSpan` maps minutes into that axis and applies a 1.5% height floor (`MONTH_MARK_FLOOR`). The axis is recomputed from whoever is established. The same local minute is not a stable Y when another fact enters or leaves the window.

Civil date is the aperture (`data-civil-day`, role `gridcell`). Horizontal cell identity is truthful. Vertical position inside the cell is the compressed axis. Month does not paint a stable full-day coordinate system, so a vertical gesture cannot truthfully mean “this clock.”

A gesture that moved a fact into another aperture and changed only `startsOn`, leaving `startLocal` and `endLocal`, would match the stored shape and would not use the compressed Y. That is a civil-date proposal. It is not supported by the current interaction. The geometry could name the destination date. It cannot honestly name a new clock.

### Present

Present reading is the membership list: one button per fact that contains the authoritative instant, plus the clock words. There is no rectangle whose X or Y is a local minute or a civil date. Exact Present still mounts `DayClock` for the anchor neighborhood, because exact depth leaves the reading branch. That clock is a precision view of the day, not Present’s own coordinate system. A placement gesture there would be using Day’s axis while the question is Present.

## 2. Existing correction authority

Timed Protected Time, Block, and Commitment share one path.

1. A reading or landscape button calls `onRefer` (`OrientView.referTo`).
2. `InspectionSurface` / `FactDetail` in `components/orient/Surfaces.tsx` reads `stored` from the day-canvas model.
3. Edit keeps `dateDraft`, `startDraft`, and `endDraft` in component state. They are `startsOn` and `HH:MM`.
4. Save parses both clocks, builds one `updateFromStored` (`components/canvasEstablishment.ts`), and awaits `onUpdate`.
5. `OrientInstrument.onUpdate` calls `updateProtectedTime`, `updateBlock`, or `updateCommitment` with that id and input, then increments `reloadToken`.
6. The load effect reads canonical rows again and `projectDayCanvas` / Timeline project them.

`updateFromStored` keeps `id` and the timed kind. `startsOn`, `startLocal`, and `endLocal` are replaced together. `defineProtectedTime`, `defineBlock`, and `defineCommitment` normalize the civil date and the local clocks. The Supabase updates filter on `id` and `user_id` (`persistence/protectedTime.ts`, `persistence/block.ts`, `persistence/commitment.ts`). A failed Save sets the alert, leaves `editing` true, and does not increment the reload token, because `persist` throws before `setReloadToken`.

`establishmentBlocked` runs on the draft range. On a 24-hour civil day the clock is ordinary. On a shorter or longer civil day, an absent or repeated local minute refuses the write. An ordinary overnight pair (`end` local minutes `<=` start) does not scan as a reversed selection on a 24-hour day, so the existing Save already accepts it.

Date and both clocks are one Save from the human’s point of view. There is no second persistence path for these three kinds.

A later gesture can terminate in this path when it can produce `id`, `startsOn`, `startLocal`, and `endLocal` for a timed Protected Time, Block, or Commitment, and then call `updateFromStored` → `onUpdate`. It cannot do that for Work: `storedFact` returns null, and `FactDetail` renders “Edit the work week” instead of the clock fields.

All-day facts have no Edit control and no start/end drafts.

## 3. Duration

A timed row stores `starts_on`, `start_local`, and `end_local`. It does not store a duration. Duration on one painted day is derived: Timeline resolves instants, then the canvas clips them to the civil date.

`timedBlockEndsNextCivilDate`, and the matching Protected Time and Commitment functions, are `end` minutes `<=` start minutes. The shift continues into the next civil date. The times are not swapped.

What the representation can do, without a new field:

- Same civil date, 09:00–10:30, start moved to 13:00. The local delta is 90 minutes. 13:00–14:30 is another valid local pair. `updateFromStored` can write it in one update. The geometry of a full-day fraction can propose that pair. This discovery does not decide that the product must preserve the delta.
- 22:00–02:00 moved onto another civil date, clocks unchanged. `startsOn` changes. `end <= start` still means the next civil date. The row can represent that. The painted slices on the old and new dates follow from Timeline. A gesture that grabbed only the visible tail (00:00–02:00) and treated that height as the whole fact would be using the clip, not the stored pair.
- A move that keeps elapsed milliseconds through a DST boundary is not what the row stores. The row stores local clocks. `selectionLocalClock` can refuse a pair that does not occur or occurs twice. A gesture must not invent which repeated hour is meant.

`minuteToLocalText` maps minute 0 and minute 1440 both to `00:00`. A clipped “end of this civil day” is not itself a stored end clock.

## 4. Day feasibility

Two Day instruments exist.

**Reading signature.** X is a full-day fraction. `minuteFromSignatureRatio` already turns a ground click into a minute, for Exact time, not for correction. Fact buttons are the inspection targets. A horizontal drag of a fact would share the rail with click-to-inspect and with the ground’s Exact-time click. The rail width is the field width. CSS does not fix it. Pixels per minute are `railWidth / 1440`. On a narrow phone that is a fraction of a pixel. Minute-level finger placement is finer than the paint. Fifteen minutes is on the order of a few pixels when the rail is a few hundred pixels wide. The signature can propose a clock on the date it is already showing. It has no second axis for a civil date.

**Exact `DayClock`.** Y is a full-day fraction on a surface `72rem` tall (`3rem × 24`). At a 16px root that is 1152px, about 0.8px per minute, about 12px per 15 minutes. `minuteFromPointerY` and `ratioFromVisiblePointer` already exist, and they clamp to the visible scrollport. The surface scrolls inside `.orient-field` (`overflow: auto`, and the clock’s `touch-action` is `pan-y` until a selection sets `touch-action: none`). Existing articles are not the drag target (`pointer-events: none`). Overlaps share the track; hit testing returns every rectangle under the point. A provisional CSS `top` could move a copy without writing. Doing that inside the current pointer reducer would collide with hold-to-select and tap-to-refer (`SELECTION_HOLD_MS` 220, `SELECTION_MOVE_SLOP_PX` 10). Those thresholds belong to establishing a new range. Reusing them as “lift this fact” would change that contract.

Day can support a clock proposal on one civil date. It cannot, by itself, mean “move this fact to another date,” except by leaving the clock and using another control.

## 5. Week feasibility

Week is the only production surface that simultaneously has a stable civil-date axis and a full-day clock axis.

- Column: `data-civil-day` on a flex child. Pointer X compared with column rectangles names a civil date. Seven equal columns. The Orient week starts at the anchor. It is not the Work fiscal week.
- Clock: `placement.top === visibleStartMinute / 1440` inside `.orient-column-body`. Pointer Y on that box, divided by its height, is a full-day fraction. The painted height may be larger than the true fraction because of the 0.012 floor.
- Identity is on the button: `data-source-kind`, `data-source-id`.
- Overlaps occupy the same horizontal track. A pointer does not land in a private lane.
- The pan gesture and the fact button share the pointer sequence.
- The Today wash and the noon line do not receive pointers. They are not hit targets. The noon line can still be mistaken for a snapping guide if a later design treats 50% as special. The code does not snap to it.

Week is the strongest current candidate for a two-dimensional proposal. That is a statement about which axes exist, not a statement that the pixels are honest at one-minute resolution, and not permission to drag. Column height follows the field. CSS gives the week row `min-height: 18rem` and `flex: 1`. Pixels per minute are `columnBodyHeight / 1440`, often well under one pixel. A finger cannot reliably choose a minute there. A contract that allowed Week to propose a placement would have to say what precision that proposal is allowed to claim.

## 6. Month feasibility

Civil-date movement is geometrically nameable: the aperture’s `data-civil-day` is the date. Preserving `startLocal` and `endLocal` while changing `startsOn` is the same update `FactDetail` already performs when only the date field changes. Month’s compressed Y is not required for that proposal.

Vertical movement inside the aperture is misleading. The axis is fit to the facts currently in the 28-day window, padded, and floored at three hours. It is not 1440 stable minutes. A Y on that axis does not survive the next projection if the set of facts changes. Intra-cell clock dragging would claim a coordinate system Month does not have.

## 7. Present feasibility

The Present reading has no placement coordinate system. Membership is “this fact contains the authoritative instant,” in document flow. Moving a button in that list would not mean a new clock or a new date.

Exact Present shows Day clocks because exact depth is shared. Using those clocks to correct a fact would be Day’s axis, under the Present question. Present itself does not offer a truthful manipulation surface.

## 8. Work authority

Work territories use the same referral button or article as other facts. They do not use the same correction writer.

`storedFact` returns null for `work_schedule`. `FactDetail` shows “Edit the work week,” which opens `WorkScheduleOperation` on the Saturday–Friday fiscal week. The write is `planWeekSave` → `saveWorkWeek` → `save_work_week`. A shift also has Opening, Mid, or Closing. Off and unknown are row states, not an interval. One Save commits the week.

A pointer that updated `start_local` and `end_local` on one Work row would skip the fiscal-week draft, the shift type, Off and unknown, and the week transaction. Nothing in the geometry distinguishes Work’s authority. The kind does. Direct movement of Work is out of scope for a fact-correction gesture.

## 9. Pointer, touch, and scroll

Production already uses Pointer Events. There is no drag library, no `draggable` attribute, and no `user-select` rule in `orient.css`.

| Surface | Pointer behavior |
| --- | --- |
| Exact `DayClock` | pointer down/move/up/cancel on the clock. Touch: 220ms hold and 10px slop before a drag selects a new range. Early movement scrolls. `setPointerCapture` is used on the selection-bound handles. |
| Week and Month `Landscape` | pointer down/up pans the anchor by column widths. Wheel accumulates 48px, then shifts one day. `touch-action: pan-y` on the week row and the month grid. |
| Day/Present signature | click on a fact button inspects. Click on the ground enters Exact time at the pointer minute, or without a minute from the keyboard. |
| `.orient-field` | `overflow: auto`. Week and Month scroll with the page; the landscape itself hides overflow. |

`/schedule` `DayCanvas` and `/instrument` use the same selection model. They are not the production reading. Their tests assert the absence of `draggable`.

Desktop click-to-inspect is a button click. A later drag has to begin from that same button without firing inspection, or inspection and the gesture will both run. Phone Week already splits vertical scroll (`pan-y`), horizontal window pan, and tap-to-inspect. A lift gesture needs a distinction from those three. The exact-day hold and slop are an existing distinction for establishing a new range. They are not evidence that the same numbers should lift an existing fact. This discovery does not choose a timing.

Pointer Events can be one code path for mouse, touch, and pen. The production instrument already depends on that for selection and for landscape pan. A second gesture library would add a recognizer beside those handlers. It would not supply the coordinate conversion or the correction writer.

## 10. Accessibility

FactDetail remains the non-pointer correction. Date, Start, and End are labeled text fields. Save is explicit. That path does not depend on a gesture.

On the reading signature, Week, and Month, timed facts are `<button>` elements with `aria-label`s that include the kind and the interval. They are in tab order. Enter or Space activates inspection the same way a click does.

On exact Day, timed facts are `<article>` elements with `aria-label` and `pointer-events: none`. They are not keyboard controls. Referral there is pointer hit-testing. The ground and the membership lists are the keyboard way into a fact on the reading surfaces.

A naive drag would add problems the buttons do not have: a gesture with no keyboard equivalent, a moving target that loses focus, a provisional position that assistive technology cannot see if it is only a CSS transform, and a drop that persists without the labeled Save. The existing Edit path can stay the precise, non-pointer authority. A spatial gesture would be an additional way to propose values, not a replacement.

## 11. Provisional and canonical patterns

Three patterns already separate a human draft from a write.

| Pattern | Draft | Authority boundary | Write |
| --- | --- | --- | --- |
| `FactDetail` | date and clock strings, plus the fact’s own fields | the fact’s Save | `updateFromStored` → `onUpdate` |
| Work week | `WeekDraft` for seven fiscal dates | the week Save, or Save on the dirty-week prompt | `planWeekSave` → `saveWorkWeek` |
| Establishment | `SelectionSession` plus meaning fields | Save on the establishment surface | `createProtectedTime` / `createBlock` / `createCommitment` |

None of them write because a pointer moved. Selection refine updates the transient session only. Work and fact edits update component state only.

This discovery does not choose what a drop does. The existing patterns imply the tradeoffs:

- Writing on drop would be a new authority boundary. The fact and week editors both wait for an explicit Save.
- A Move / Cancel prompt would be a new confirmation. Dirty-week Save / Discard / Stay and fact delete’s second press are nearby, and neither is a spatial drop.
- Opening `FactDetail` with the proposed date and clocks would reuse the correction that already exists, including validation, the DST gate, the error alert, and the keyboard fields. The gesture would propose. Save would remain the write.

## 12. Precision

Three different precisions are already in the code. They are not the same number.

- **Representation.** Stored clocks are minute `HH:MM`. The canvas fraction is minute / 1440. Month then remaps those minutes onto a fitted axis. The Week and Month height floors change paint, not the stored minutes.
- **Input.** `FactDetail` accepts any valid `HH:MM`. Exact-day selection snaps a new range to 15 minutes (`SELECTION_INCREMENT_MINUTES`, `snapMinute`). That snap is documented as a gesture increment for selection, not as a rule about stored precision. V0-012A says the same. Work’s typed field is also any valid minute, with no snap.
- **Gesture.** Pixels per minute depend on the box. Exact Day is about 0.8px per minute at a 16px root (72rem / 1440). The Day signature and the Week column are `box / 1440` and are often a fraction of a pixel per minute. A finger can indicate a region. It cannot reliably indicate one minute on those surfaces.

No snap interval is chosen here.

## 13. Cross-client coherence

`protected_time`, `blocks`, and `commitments` are Class A tables in `canonicalCoherence.ts`, with INSERT and UPDATE subscriptions plus unfiltered DELETE. `updateProtectedTime`, `updateBlock`, and `updateCommitment` update those tables. A successful `onUpdate` also reloads the writing client through `reloadToken`. Other subscribed clients reread and re-project. A correction that uses those writers does not need a new realtime channel or a new publication.

`work_schedule_days` is also Class A. That does not make a Work-row poke a valid correction. The accepted Work write remains `save_work_week`.

## 14. Dependencies

`package.json` runtime dependencies are `@supabase/supabase-js`, `lucide-react`, `next`, `react`, and `react-dom`. No drag, gesture, or animation library is installed. Native Pointer Events are already the production primitive for selection and for landscape pan. A library would supply gesture recognition and hit testing that this repository has so far written itself, next to coordinate rules that a library does not know. This discovery does not add one.

## 15. Semantic matrix

|  | Civil date | Local clock | Duration preservation | Pointer truthfulness | Touch | Precision risk | Discovery status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Present | The list is not a date axis. | The list is not a clock axis. | Not a placement surface. | A button move would not be a time. | Tap inspects. | A gesture would invent a coordinate. | not applicable |
| Day reading | One date is already chosen. The signature has no date axis. | `signaturePlacement` is minute / 1440 on X. | A horizontal delta can propose a new local pair on that date. The clip is not the stored overnight pair. | Fact buttons and the ground share the rail. | Tap inspects. The field scrolls vertically. | `railWidth / 1440` is usually below one pixel. | plausible but requires contract |
| Day exact | Each clock is one date. Neighbor clocks are separate axes, not a date gesture. | Y is minute / 1440 on a 72rem clock. | Same as the reading, with a taller axis. | The pointer currently selects a new range or refers to a fact. | `pan-y` versus hold-to-select already conflict by design. | About 0.8px per minute. Fifteen minutes is about 12px. | plausible but requires contract |
| Week | Column `data-civil-day` is a date. | Column-body Y is minute / 1440, with a paint floor. | A column change can propose `startsOn`. A Y change can propose clocks. Overnight must use the stored pair, not one clipped slice. | Pan and click already consume the pointer. Overlaps share the track. | `pan-y`, horizontal pan, and tap already compete. | `columnHeight / 1440` is usually below one pixel. | plausible but requires contract. Strongest two-axis candidate. |
| Month | Aperture `data-civil-day` can name a date. | Compressed, data-dependent axis. | Date-only, keeping both local clocks, matches the row. Vertical movement does not. | Cells are real. Intra-cell Y is not a stable clock. | Same pan and tap as Week, on a 7×4 grid. | Vertical placement would claim precision the axis discarded. | civil date: plausible but requires contract. Clock: misleading / unsupported. |

## 16. Fact-type matrix

|  | Stable identity | Existing correction writer | Date correction | Clock correction | Duration | Direct-manipulation authority |
| --- | --- | --- | --- | --- | --- | --- |
| Protected Time | `id` on the button and in `updateProtectedTime` | `updateFromStored` → `updateProtectedTime` | `startsOn` in the same update | `startLocal` / `endLocal` in the same update | Derived from the local pair, including `end <= start` | Compatible with the existing fact Save. All-day rows have no clock editor. |
| Block | same | `updateBlock` | same | same | same | Same. Purpose, Context, and Task stay on the update input. A gesture that dropped them would be a different write. |
| Commitment | same | `updateCommitment` | same | same | same | Same. Title and `user_created` stay on the input. |
| Work | `sourceId` is the civil date of the row, not a fact UUID in `stored` | `save_work_week` through the fiscal-week draft | Not through `FactDetail` | Not through `FactDetail` | Shift times plus shift type. Off and unknown are not intervals. | Incompatible. A spatial write would bypass the week transaction. Out of scope. |

## 17. Smallest architecture the repository can hold

The code can support this shape, and no wider one, without a second writer:

```text
established timed fact (Protected Time, Block, or Commitment)
  -> pointer gesture on a truthful axis
  -> provisional startsOn, startLocal, endLocal
  -> existing validation (define* and establishmentBlocked)
  -> explicit human authority, the same Save FactDetail already uses
  -> updateProtectedTime / updateBlock / updateCommitment
  -> reloadToken and the Class A reread
  -> projectDayCanvas
```

Reuse unchanged: `updateFromStored`, the three update functions, `persist` / `reloadToken`, Class A subscriptions, `minuteFraction`, `minuteFromSignatureRatio`, `minuteFromPointerY`, `data-source-kind` / `data-source-id`, and `FactDetail` as the non-pointer editor.

A small new model would be the provisional placement while the pointer is down: which fact, and the proposed date and clocks. It is interaction state. It is not a table and not a Timeline fact. CSS can show it. Canonical rows stay unchanged until Save.

What must not become a second system: a new update function, a Work write, a snap policy, collision handling, a duration column, a Month clock mapping, or a gesture library that owns the meaning of the drop.

## 18. Unresolved questions

- Whether a drop writes immediately, asks Move / Cancel, or opens `FactDetail` with the proposal. The repository has the third pattern. This record does not choose.
- Whether Week’s two axes are allowed to propose a minute, given sub-pixel columns, or only a coarser proposal that the fact editor then shows exactly.
- Whether Day’s signature or exact clock may propose a clock change with no date change.
- Whether a Month aperture may propose a date change that keeps both local clocks.
- How a gesture is distinguished from tap-to-inspect, Week/Month pan, and field scroll. The 220ms / 10px pair is for new selection, not for lifting a fact.
- How an overnight fact is grabbed when two columns show two clips of one id.
- Whether overlapping full-width tracks can be grabbed unambiguously.
- Whether a provisional position must be in the accessibility tree before any implementation.

## 19. Risks

- Treating the visible clip as the stored duration, especially across midnight.
- Treating Month’s fitted axis as a clock.
- Treating empty track as available time. The signature’s accessible name already says unmarked time is not established. Remainder hatching is allocatable remainder inside a shift, not a drop target defined here.
- Letting a fact drag also pan the Week window.
- Persisting on pointer-up and bypassing `FactDetail`’s DST gate and labeled fields.
- Moving Work with the fact writer.
- Reusing the 15-minute selection snap as if it were the stored precision.
- Painting a floor height and then converting that painted box back into minutes.

## 20. Next contract only

`DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001` should decide the proposal, not build the gesture.

It should decide:

- which of the plausible surfaces may originate a proposal: Week as the only two-axis candidate, Day as clock-only, Month as date-only, Present excluded;
- that the only eligible rows are timed Protected Time, Block, and Commitment, same id, same kind;
- that Work, all-day facts, resize, duplication, multi-select, and collision policy are outside the contract;
- that a proposal is `startsOn`, `startLocal`, and `endLocal`, with overnight still meaning `end <= start`, and that elapsed-millisecond duration is not the stored quantity;
- which explicit authority boundary accepts the proposal before `onUpdate`. Discovery does not pick immediate write, a new confirm, or `FactDetail`. The contract has to pick one;
- that Class A coherence is reused and not redesigned;
- that no snap interval is adopted unless the contract gives it a meaning distinct from representation precision.

It should not specify pixel thresholds, animations, or a dependency.
