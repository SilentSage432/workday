# V0-013A phone diagnostic

Date: 2026-10-03.

Baseline that failed acceptance: `d2d38a51cd10558c69eedc07fc4e960bcb0b583a`.

## Failed phone acceptance

V0-013A is not accepted. On a Samsung phone in Chrome, a touch on Protected Time that was already established before V0-013A still does not start a temporal selection. That was the acceptance condition.

## Why the automated tests were not enough

The V0-013A tests dispatch `pointerdown` on `[data-time-surface]`. `dispatchEvent` does not hit-test. Those tests show that the selection reducer runs when that element is already the event target. They do not show that a finger over an established fact makes that element the target. This diagnostic does not claim to prove browser hit-testing either. It records whatever the phone's browser actually hits.

## DOM and layer inspection

Declared structure, unchanged by this diagnostic:

```text
[data-canvas-frame]          relative, max-height 28rem
  [data-axis-scroll]         overflow-y auto, max-height 28rem
    [data-time-column]       relative, isolation isolate, height 78rem
      hour lines             absolute, pointer-events none
      article facts          absolute, pointer-events none
                             Work z-0, Protected z-[1], Block and Commitment z-10
      selection band         absolute, z-20, pointer-events none, only while selected
      [data-time-surface]    absolute, inset 0, z-[21], pointer-events auto, touch-action pan-y
  contextual wrapper         absolute, inset 0, z-30, pointer-events none, only while a selection is settled
    contextual card          pointer-events auto
```

`[data-time-surface]` is `position: absolute` with `inset: 0`. Its containing block is `[data-time-column]`, the nearest positioned ancestor. The declared box is the column's padding edge: the column height is `78rem`, and the width is the flex remainder beside the hour gutter. `isolation: isolate` on the column makes a stacking context, so `z-[21]` competes with the facts inside the column and does not escape it. The contextual surface is outside that context, at `z-30` on the frame, and is mounted only while a selection is settled.

`[data-axis-scroll]` is `overflow-y: auto`. That clips painting and hit-testing of the column to the visible scrollport. The surface scrolls with the facts. A fact that has been scrolled into view occupies coordinates inside that visible slice.

The production CSS from this build includes `.z-\[21\]{z-index:21}`, `.inset-0{inset:0}`, `.pointer-events-auto`, and `.pointer-events-none`. A missing `z-[21]` utility is not the static explanation.

The selection listener is on `[data-time-surface]` only. The fact articles are siblings, not descendants. If the hit target is an article, the event bubbles through the column and does not pass through the surface, so the React handler on the surface does not run. V0-013A depends on the surface winning hit-testing. That was not measured on the phone.

Work and Protected Time articles do not set `left` or `width`. An absolutely positioned box without those is shrink-to-fit, so the painted region can be narrower than the column. The surface is still declared full-column. The phone readout prints the used rectangles and whether the surface rectangle covers each visible fact.

No static defect here was certain enough to change the interaction. In particular, this tranche does not move the listener, change `pointer-events`, change z-index, or add another overlay. If the used surface height is 0, or `elementFromPoint` on a Protected center is not the surface, the readout will show that. Those results are not known until the phone runs this build.

## Instrumentation

Build identifier, shown at the top of the day canvas in amber monospace: `DIAG V0-013A-DIAG`. The same string is on `data-reachability-diagnostic`.

The readout has two parts:

- Geometry, measured after layout: surface and column used boxes, computed z-index, pointer-events, position, touch-action, and the four inset sides, column isolation, scroll overflow, and a hit line for each visible fact. Each hit line has the fact center, whether the surface rectangle covers the fact, and `document.elementFromPoint` at that center. One empty-candidate line uses a point near the top of the visible scrollport.
- Events. A window capture listener records pointerdown, pointerup, pointercancel, gotpointercapture, and lostpointercapture when the target is inside the day frame or the coordinates lie on the frame. pointermove is counted and sampled. A native listener on `[data-time-surface]` records the non-move events that actually reach that node, including `target` and `currentTarget`. The React `onPointerDown` records whether it was entered and whether it returned for button, inside-selection, or outside-pointer, or began the existing gesture. After the event, a microtask records `defaultPrevented` and whether the surface has pointer capture.

None of these listeners call `preventDefault` or `stopPropagation`. The gesture, dismissal, and selection reducer are the same branches as V0-013A. The new lines only record which branch ran.

## What to do on the phone

1. Open Schedule after this commit is deployed. Hard-refresh if the page was already open.
2. Confirm the amber box begins with `DIAG V0-013A-DIAG`. If that exact string is absent, the phone is not on this build. Stop and say so.
3. Scroll the day until the established Protected Time is visible. Screenshot the amber box before touching the day. That screenshot is the geometry and the `hit protected_time` line.
4. Touch empty time, if any is visible, then lift. Screenshot the event lines.
5. Touch the Protected Time and lift, the same way that failed. Screenshot the event lines. Include a short hold if that is how the failed attempt felt.
6. Repeat for Work, a Block, and a Commitment when they are on that day.
7. If the finger scrolls, screenshot that too.

DevTools are not required.

## What to send back

The full amber text from each screenshot. The useful lines are:

- `build=V0-013A-DIAG` and the `surface` / `column` / `scroll` / `stacking` lines
- every `hit ... fromPoint=` line, especially Protected Time
- `listener=window-capture` together with `target`, `currentTarget`, `fromPoint`, `stack`, and `path`
- `listener=surface-native` if it appears, and its absence if it does not
- `listener=surface-react` and any `return=` or `begin`
- `def`, `defAfter`, `cap`, `capAfter`
- `pointercancel` if it appears
- the `gesture=` and `selection=` line after the touch

## No corrective interaction change

No pointer-events change, no z-index change, no new hit overlay, and no change to gesture, selection, or dismissal behavior. No domain, schema, persistence, or Timeline change. Fact editing, moving, resizing, deleting, resize handles, capacity, conflict, and availability were not added. The only addition is this temporary readout.
