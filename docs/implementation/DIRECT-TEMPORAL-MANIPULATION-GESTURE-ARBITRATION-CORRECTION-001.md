# DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001

Physical acceptance remains **FAILED**. This correction is not deployed.

Implementation candidate: `8d001be9a275326b7f73157870d4213caa621cce`.

Instrumented candidate that produced the trace: `3bb26d94c2c5ad04fa5620d8747110d8f9105041`.

## Physical evidence

The human pressed an eligible timed Block on Desktop Week and tried to move it. The Block stayed still. On release, the Week jolted horizontally. The Block did not move.

The probe reported, approximately:

```
down yes
eligible yes
pending yes
target span
pointer 1
type mouse
moves 33
dx 858.6
dy -224.8
dist 887.5
pending-at-move no
pan-half no
jitter yes
vertical no
qualified no
lift no
capture-try no
capture-threw no
capture no
lost-capture no
cancel no
up yes (pending)
column no
proposal-init no
proposal no
provisional no
detail no
```

## What the code does with that trace

`pointerdown` on the span resolved an eligible fact and stored `phase: "pending"`. Thirty-three `pointermove` events reached the Week handler. Distance 887.5 is past the 10px floor (`jitter yes`).

The lift condition at that time was:

```
hypot(dx, dy) > 10 && abs(dy) > abs(dx)
```

`abs(-224.8)` is not greater than `abs(858.6)`, so `vertical` is no, `qualified` was no, and `beginLift` did not run. Capture was never attempted. No provisional node mounted. `onPropose` was not called. FactDetail did not open.

`up yes (pending)` is the claim phase at pointer-up. The non-lifted pointer-up path, including a still-pending fact-origin claim, then runs:

```
steps = round((downX - upX) / columnWidth)
if (steps !== 0) onShift(steps)
```

That is the Week jolt. The Block stays where it was painted because the gesture never lifted.

`pan-half no` means the half-column conversion did not record as true on the last sample that computed it. Together with `up yes (pending)`, the claim was still the fact-origin pending claim at release, so the navigation shift ran on that claim.

`pending-at-move no` says the last `pointermove` was not classified as pending. A claim that is still pending on pointer-up would normally have recorded `pending-at-move yes` on its last pending move. That one field does not line up with `up yes (pending)`. It does not change the release path. The release label is the phase `onPointerUp` used, and that phase was pending.

The earlier guesses that the browser never delivered `pointermove`, or that capture or `lostpointercapture` destroyed a lift, are not this failure. `moves 33`, `lift no`, and `capture-try no` close them.

## Corrected arbitration

Week territory and an eligible fact are different origins.

- A press that does not resolve an eligible timed fact stays `phase: "pan"`. Pointer-up still shifts the Week anchor by `round(deltaX / columnWidth)`.
- A press on an eligible timed fact stays pending while movement is at or under 10px. Pointer-up clears the claim and does not shift the Week. The click still inspects. Keyboard activation still inspects.
- Once that fact-origin movement passes 10px in any direction, `beginLift` runs. Horizontal displacement chooses the civil date. Vertical displacement chooses the clock. The half-column pan branch does not run for this claim. `abs(dy) > abs(dx)` does not gate it.

Pointer capture still starts inside `beginLift`, after the 10px threshold. It was not moved earlier. The 30-minute quantum is unchanged. Proposal, Save, and eligibility are unchanged.

## Acceptance

**PHYSICAL ACCEPTANCE FAILED / CORRECTION PENDING DEPLOYMENT.**

The DTM probe stays on Desktop Week for the next physical pass. `qualified` now means the 10px floor was crossed. `vertical` and `pan-half` remain visible and do not decide the gesture.
