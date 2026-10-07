# DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001

Physical acceptance of candidate `8d001be9a275326b7f73157870d4213caa621cce` has **FAILED**.

Observed on the deployed production Desktop Week, verbatim:

> you can't grab it

The human attempted to grab/move an eligible Week fact. The fact did not enter a usable lifted/direct-manipulation state.

This document is diagnostic. It does not tune the 10px jitter floor or the 30-minute gesture quantum. It does not change the contract. No runtime correction was made, because the root cause is not proven.

**PHYSICAL ACCEPTANCE: FAILED. Remains failed until a corrected candidate is deployed and a human can grab an eligible fact.**

## Baseline

| Check | Result |
| --- | --- |
| HEAD | `8d001be9a275326b7f73157870d4213caa621cce` |
| branch | `main` |
| `origin/main` | `8d001be9a275326b7f73157870d4213caa621cce` |
| `main` vs `origin/main` | equal |
| working tree before this document | clean |

The deployed candidate is the tree that was read. `Landscape.tsx` on this commit contains `onPointerMove`, `eligiblePress`, `beginLift`, `WEEK_LIFT_JITTER_PX = 10`, and the provisional `div.orient-fact.orient-provisional`.

## What was not reproduced

There is no Playwright, Cypress, or Puppeteer dependency. `package.json` test environment is happy-dom.

The IDE browser opened a throwaway page (not in this repository) with a `button` inside a parent that logged `pointerdown`, `pointermove`, and `lostpointercapture`. The browser drag tool refused the button: it only performs an HTML5 drag, and the button has no `draggable` attribute. That refusal is a property of the automation tool. It is not evidence about pointer events. CDP pointer input was not used. A physical drag of the production Desktop Week was not executed in this session.

Do not treat the passing happy-dom tests as a physical reproduction.

## Implemented pointer path

Owner: `.orient-landscape-days` inside `Landscape`, rendered only for Week (`words === true`).

Mounted on that element:

- `onPointerDown`
- `onPointerMove`
- `onPointerUp`
- `onPointerCancel`
- `onLostPointerCapture`
- `onWheel`

`directManipulation` is `form === "desktop" && question === "week"`. Desktop is `matchMedia("(max-width: 959px)")` unmatched. The desktop Week chrome wraps this landscape in `.orient-desktop-resolution`.

A timed fact is a `<button class="orient-fact">` inside `.orient-column-body`. Its visible text is a child `<span>`. The button is an ancestor-descendant of `.orient-landscape-days`. The button has `onClick`. It has no pointer handler of its own.

Sequence as written:

1. `pointerdown` hits the button or its span and bubbles.
2. `onPointerDown` ignores the event unless `button === 0` and `isPrimary !== false`.
3. If an existing claim is already lifted, that claim is released and cleared first.
4. `eligiblePress` runs only when `words && directManipulation`.
5. Success stores `phase: "pending"` and returns. Failure stores `phase: "pan"`.
6. Pending does not call `preventDefault`, `stopPropagation`, or `setPointerCapture`.
7. `onPointerMove` returns immediately when there is no claim, the pointer id differs, or the phase is `"pan"`.
8. While pending, half-column pan is tested before lift. `columnWidth = currentTarget.clientWidth / models.length`. If `abs(dx) >= columnWidth / 2`, the claim becomes pan and the function returns. Later moves cannot lift.
9. Otherwise lift runs only when `hypot(dx, dy) > 10` and `abs(dy) > abs(dx)`.
10. `beginLift` calls `setPointerCapture` on `event.currentTarget` (the Week row), then sets `phase: "lifted"`, then `setLifted`.
11. While lifted, further moves replace the proposal when `proposalUnderPointer` changes.
12. `pointerup` in the lifted phase hit-tests `.orient-column-body` and either calls `onPropose` or clears. `onPropose` only opens FactDetail. It does not write.

## Eligibility

`eligiblePress` (`Landscape.tsx`):

- `event.target` must be an `Element`. A text node returns null, which becomes pan.
- `closest("button.orient-fact")`. The inner span is handled. The tests never dispatch on that span; the production renderer does put the span inside the button.
- Rejects `.orient-fact-all-day`.
- `data-source-kind` must be `protected_time`, `block`, or `commitment`. The attribute is `data-source-kind={placement.sourceKind}`. `data-kind` is the same string and is not what eligibility reads.
- `data-source-id` is required and compared to `placement.sourceId` with `===`.
- Column date is `closest("[data-civil-day]")`, which is the `<section class="orient-column">`.
- Lookup is `model.context` plus `model.foreground` for that `selectedDay`.
- `placement.stored` must exist, `stored.startsOn === date`, and `stored` must have `startLocal` and `endLocal`.

A same-day timed Block rendered by this component can become pending. Work has no stored clock pair. An all-day fact is rejected by class. An overnight continuation painted on the next civil date fails `stored.startsOn === date`. Those three are specified exclusions. They were not re-checked against the particular fact the human touched. This session did not inspect the production DOM of that fact.

No source-kind string mismatch was found between the Week button and `isLiftKind`.

## Pointermove

`onPointerMove` is mounted on `.orient-landscape-days`, the same node as `onPointerDown`.

CSS on that node: `touch-action: pan-y`, `overflow: hidden`. `touch-action` applies to touch, not to a mouse. A mouse drag is not explained by this property. A touch drag on a viewport that is still `form === "desktop"` (width above 959px) can have its vertical movement taken as a pan. Vertical movement is the only movement that lifts. That would clear a pending claim through `onPointerCancel`. The human session was described as Desktop Week. Pointer type was not reported. This remains a hypothesis for touch, not a finding for a mouse.

`.orient-fact` sets `pointer-events: none`. `.orient-column .orient-fact` sets `pointer-events: auto` later and with higher specificity, so the Week button receives hits. `.orient-column .orient-provisional` then sets `pointer-events: none`. Noon `::after` and `.orient-now` are `pointer-events: none`. No `user-select` rule. No `draggable`. The button's `onClick` calls `stopPropagation` on the click, after pointerup. It does not replace `pointerdown` or `pointermove`.

Capture is taken only inside `beginLift`, after a move has already qualified. Until that move, the row is not the capture target. The move has to be delivered to the row by hit-testing and bubbling (React delegates the listener to the root and walks the path). This session did not observe whether a pressed fact button in Chromium or Safari delivers that `pointermove`.

## Pending to lifted, for a 15–30px mostly vertical move

Constants used by the code, not retuned here: jitter `10`, lift only when vertical distance is strictly greater than horizontal distance, pan when horizontal distance reaches half a column.

Take pointerdown at `(x0, y0)` and a later move of `dx = 8`, `dy = 24` (about 25px, mostly vertical):

- `hypot ≈ 25.3`, which is greater than 10
- `abs(dy) > abs(dx)`
- half a column on a desktop Week row is on the order of 80px or more (`clientWidth / 7 / 2`). `abs(dx) = 8` does not win the pan branch

If that `pointermove` arrives with the same `pointerId` while the claim is pending, `beginLift` runs.

A move whose horizontal distance is greater than or equal to its vertical distance does not lift, paints nothing, and leaves the fact where it was. Past half a column, the Week pans. The human report does not include direction or distance, so this branch is not established as what they did.

No earlier branch inside `onPointerMove` clears a pending claim except the half-column pan conversion. Pan does not run on pointerdown. Pointerup is not required before the lift test.

## Provisional paint, kept separate from lift

The mark is a `div.orient-fact.orient-provisional` with `data-provisional="true"`, `aria-hidden="true"`, and `data-kind` set from the lifted fact. It is rendered after the canonical button, inside `.orient-column-body` (`position: relative`).

- `position: absolute` from `.orient-fact`
- `top` and `height` are percentages of the proposal slice over 1440 minutes, with a paint floor of `0.012`
- width from `.orient-column .orient-fact`: `calc(100% - 0.24rem)`
- no z-index on the mark
- `.orient-now` on today is `z-index: 3`, `pointer-events: none`, and on desktop Week its background is `none`
- opacity `0.55` from `.orient-column .orient-provisional`
- the kind background rule matches `[data-kind="block"]` on any `.orient-fact`, including this div
- `overflow: hidden` on `.orient-fact` clips the mark to its own box; the column body does not clip with `overflow: hidden` (the Week row does)

`provisionalSlices` returns nothing when `lifted.proposal` is null. `proposalUnderPointer` is null when the pointer is outside every column-body rect. A lift that begins with a null proposal mounts no mark until a later move hits a column.

If the quantized proposal is the stored interval, the mark occupies the same rectangle as the canonical button at 55% opacity. The canonical button stays. A displacement smaller than one 30-minute quantum does not move the rectangle. That can look like nothing. It is not evidence that lift failed, and it is not evidence that the quantum is what the human hit. Those two outcomes are not distinguished by the report "you can't grab it".

## Test realism

The desktop Week gesture tests live in `components/orient/orientView.test.tsx` (`dispatchWeek`, `weekPoint`, `layWeek`).

What they do:

- Build a `PointerEvent` with `bubbles: true`, `button: 0`, `isPrimary: true`, and explicit `clientX` / `clientY`.
- `dispatchEvent` that event on the fact **button**.
- Stub `.orient-landscape-days.clientWidth` to `700`.
- Stub each column body `getBoundingClientRect` to `x = index * 100`, `width = 90`, `height = 1440`.

What happy-dom does with capture (`Element.setPointerCapture`): it adds the pointer id to a set. It does not dispatch `lostpointercapture` or `gotpointercapture`. `releasePointerCapture` deletes the id.

The lift test that passes moves from `(40, 600)` to `(42, 780)`: `dx = 2`, `dy = 180`. That is far past 10px and almost purely vertical, on a stub column that is 1440px tall. It asserts a `[data-provisional]` element exists. It does not assert computed position, opacity, stacking, or that a person could see the mark move.

These tests can pass while a browser still cannot start a lift, because:

- Delivery is `dispatchEvent` on the button. The browser's hit test, implicit capture, and decision to fire `pointermove` during a button press are not involved.
- `event.target` is the button. The inner span is not the target.
- Geometry is fake, so a zero or clipped production box cannot fail the test.
- Capture side effects cannot cancel the lift. `onLostPointerCapture` clears a lifted claim, and this harness never emits that event by itself.
- A real `pointermove` reports `button === -1`. The tests send `button: 0`. The move handler does not read `button`, so this difference does not by itself fail the production path. It is still a synthetic event.

## Root cause

**Not proven.**

| Class | Status |
| --- | --- |
| A. Eligibility never enters pending | Not proven. The code can pending a same-day timed Block. The production fact was not inspected. |
| B. Pending never receives usable movement | Not proven. The handler is mounted. Capture starts only after a qualifying move. Browser delivery during a button press was not observed. |
| C. Movement arrives but never lifts | Not proven for a 15–30px mostly vertical move. That move lifts if it is delivered while pending. A more-horizontal move does not lift; the human trajectory is unknown. |
| D. Lift occurs but the mark is not perceivable | Not proven. The mark can be a 55% duplicate of the canonical rectangle until the 30-minute quantum changes the top. No lifted DOM was observed in the browser. |
| E. Another concrete cause | Not assigned. No other cause was proven. |

Two mechanisms remain open and must not be "fixed" from this document:

1. The row does not capture the pointer until after the lift test. If the browser does not deliver `pointermove` to that row while the button is pressed, pending never lifts. happy-dom cannot show this.
2. `onLostPointerCapture` clears a lifted claim. `beginLift` sets capture before it sets `phase: "lifted"`. The pointer-events specification processes a pending capture change before the next pointer event, not inside `setPointerCapture`. If that next step fires `lostpointercapture` at a previous capture target and the event bubbles to the row after the phase is lifted, the lift is cleared and the mark disappears. Mouse pointers do not take implicit capture on `pointerdown`. Touch pointers do. happy-dom does not fire the event at all, so the tests cannot catch this.

## Correction

None. The defect is not proven, and a runtime change would be a guess. The 10px floor and the 30-minute quantum were not changed.

## Validation

No runtime change, so the focused gesture tests, `temporalProposal` tests, Week/viewpoint tests, full suite, lint, typecheck, and production build were not re-run for this diagnostic.

## Files

- `docs/implementation/DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md` (this file)

No application source was modified.
