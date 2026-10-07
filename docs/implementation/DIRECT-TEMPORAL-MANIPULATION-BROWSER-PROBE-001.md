# DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001

Temporary diagnostic instrumentation. No gesture fix. No commit.

Candidate under test: `8d001be9a275326b7f73157870d4213caa621cce`.

Physical acceptance of that candidate is **FAILED**. The observation was: "you can't grab it".

The previous diagnostic, [DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md](DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md), did not prove a root cause. Static inspection cannot tell these apart:

1. `pointerdown` reaches the Week row and pending begins, but the browser does not deliver the `pointermove` required to lift.
2. `pointermove` arrives and lift begins, then pointer capture or `lostpointercapture` destroys the lifted claim.
3. Lift succeeds and the provisional mark is not perceptible.
4. Some other browser-visible pointer transition explains the failure.

This probe records one real Desktop Week attempt so a human can report which of those happened.

## What was added

Desktop Week only (`words` and `directManipulation`). Phone Week and Month do not mount it.

A fixed readout, `.orient-dtm-probe`, sits at the top-right of the viewport. It is visually subordinate. The card itself has `pointer-events: none`. Only the **Reset probe** button accepts a click. The readout is not inside `.orient-landscape-days`, so it is not a target of the Week pointer handlers.

The trace lives in Landscape React state. It is cleared on the next primary `pointerdown`, and by **Reset probe**. Nothing is written to Supabase, `localStorage`, or `sessionStorage`. Fact ids are not shown. The target line is the element tag and class only.

Lines:

- `down`, `eligible`, `pending`
- `target`, `pointer`, `type`
- `moves`, `dx`, `dy`, `dist`
- `pending-at-move`, `pan-half`, `jitter`, `vertical`
- `qualified`, `lift`
- `capture-try`, `capture-threw`, `capture`
- `lost-capture` with the claim phase at the time the event fired
- `cancel` with the claim phase at that time
- `up` with the claim phase, plus `column` and `proposal`
- `proposal-init` (beginLift had a non-null proposal)
- `provisional` (a `[data-provisional]` node was in the Week row, or the current render still has one)
- `detail` (OrientView passed a proposal into the FactDetail surface)

`qualified` is the existing lift test: movement past 10px, vertical distance strictly greater than horizontal distance, and the half-column pan branch did not win. `lift` means `beginLift` ran. `capture` means `hasPointerCapture(pointerId)` was true immediately after `setPointerCapture` returned. `proposal` means pointer-up called `onPropose`. `detail` means that callback reached `setSurface` with the proposal.

## Behavior was not intentionally changed

The instrumentation does not stop propagation, prevent default, capture earlier, release capture, or change `touch-action`, `pointer-events` on facts, `user-select`, the 10px floor, the 30-minute quantum, pan, click suppression, eligibility, provisional geometry, or release.

`beginLift` still calls `setPointerCapture` in the same place, then sets the lifted claim, then reads the proposal once and passes it to the existing paint update. After a successful `setPointerCapture`, it reads `hasPointerCapture`. That read is wrapped so a throw cannot skip the paint update. The `captured` flag stored on the claim is still only the result of `setPointerCapture` returning.

Recording calls `setState` so the readout can update. That re-renders Landscape. The Week row ref callback is unchanged. The claim ref is unchanged.

## How to exercise it

On the deployed Desktop Week, wider than 959px:

1. Confirm the top-right card title is `DTM probe` and the first lines read `down no`.
2. Press **Reset probe** so the card is clear.
3. Make one grab attempt on one eligible timed Block, Protected Time, or Commitment. Use the same gesture that failed before. Release it.
4. Do not start a second press. A new press replaces the trace.
5. Read the card and report every line.

Leave FactDetail as the attempt left it. **Reset probe** clears the card only. It does not close FactDetail and it does not write the fact.

## Physical evidence

Pending. This document does not interpret a browser attempt. Physical acceptance remains **FAILED** until a human grabs an eligible fact on a corrected candidate.

## Removal

Delete the probe, `probeDetailOpen`, `onProbeDetailClear`, `.orient-dtm-probe`, and the probe test after the physical reading is recorded. Do not leave it in the product.
