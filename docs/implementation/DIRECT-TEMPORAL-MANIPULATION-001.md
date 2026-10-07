# DIRECT-TEMPORAL-MANIPULATION-001

Implementation of desktop Week direct temporal manipulation. Physical acceptance failed on the deployed candidate. The arbitration correction is recorded separately and is not yet deployed.

Baseline: `ef846d74f510a7a8b05ca798319cfa38e59045c8` on `main`, matching `origin/main`.

Discovery: [DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-DISCOVERY-001.md).

Contract: [DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md](DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md).

Readiness: [DIRECT-TEMPORAL-MANIPULATION-READINESS-001.md](DIRECT-TEMPORAL-MANIPULATION-READINESS-001.md).

**PHYSICAL ACCEPTANCE FAILED.** A corrected candidate is pending deployment. The production probe proved the pointer stream. The failure was gesture arbitration. See [DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md](DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md).

## Files

- `components/orient/temporalProposal.ts` — pure proposal and 30-minute quantization
- `components/orient/temporalProposal.test.ts`
- `components/orient/Landscape.tsx` — gesture mode on the existing Week pointer handler
- `components/orient/OrientView.tsx` — desktop-Week permission and FactDetail opening
- `components/orient/Surfaces.tsx` — proposal drafts
- `components/orient/orient.css` — provisional mark does not receive the pointer
- `components/orient/orientView.test.tsx`

No persistence file, `canonicalCoherence.ts`, schema, or package file changed.

## State machine

The Week row `.orient-landscape-days` still owns pointer down, move, up, cancel, lost capture, and wheel.

- **Pan.** Any primary button-0 press that is not an eligible fact. Pointer-up still shifts by `round(deltaX / columnWidth)`.
- **Pending.** Press on an eligible fact while desktop Week manipulation is enabled. Movement inside the 10px floor stays a click. Release from pending does not shift the Week.
- **Lifted.** Movement past 10px in any direction from an eligible fact. The row takes pointer capture. Pan and the wheel shift are suppressed. Release inside a column body opens FactDetail. Release anywhere else clears the gesture. A fact-origin press does not pan the Week.

There is no 220ms hold. The 10px floor is local to `Landscape.tsx`. It is not `SELECTION_MOVE_SLOP_PX`.

## Eligibility

A press can enter pending only when all of these hold: the question is Week, `form === "desktop"`, the target is a timed fact button, the kind is Protected Time, Block, or Commitment, `stored` has the clock pair, and the column’s `data-civil-day` equals `stored.startsOn`.

Work, all-day buttons, and the overnight continuation clip stay on the existing click path.

## Destination

Release hit-tests `getBoundingClientRect()` on each `.orient-column-body`. A point is inside when `left <= x < right` and `top <= y < bottom`, and the last body includes its right edge. The section’s `data-civil-day` is `startsOn`. Gaps, the column footer, and anywhere outside those rectangles cancel. The anchor is not changed while lifted, and the wheel does not shift while lifted.

Clock Y uses only that body:

```text
ratio = (clientY - body.top) / body.height
raw minute = ratio * 1440, with ratio clamped to [0, 1)
```

The bottom edge does not become minute 1440. Painted height, the 1.2% floor, labels, the Today wash, and the noon line are not read.

## Gesture precision

`WEEK_LIFT_QUANTUM_MINUTES` is 30. Legal starts are `00:00` through `23:30`. A halfway minute rounds toward the later slot. A result of 1440 becomes `23:30`. This does not call `snapMinute`.

Thirty minutes is V1 gesture precision. It is subject to physical acceptance. It is not stored-clock precision. It is not a domain invariant. FactDetail can still save any minute.

## Proposal math

`localClockDurationMinutes` is `end - start` when `end > start`, and `end - start + 1440` when `end <= start`. Equal clocks are a 24-hour continuation. The proposed end is `(quantized start + duration) mod 1440`. The grab offset is the pointer’s raw minute on the start-day body minus the stored start, measured at pointer-down. A negative adjusted start clamps to `00:00` on the destination column.

`09:00–10:30` moved to a `13:00` start proposes `13:00–14:30`. `22:00–02:00` kept at `22:00` on another date stays `22:00–02:00`. `22:00–02:00` moved to `23:30` proposes `23:30–03:30`.

## Overnight

Both clips keep the same source id and the same `stored` pair. Only the clip whose column date equals `stored.startsOn` lifts. The continuation clip still inspects. Duration comes from the stored pair, not from either painted clip.

## Overlap

DOM order and `sharing` are unchanged. The button that receives the pointer is the only lift candidate. A click that never lifts still opens every fact whose visible minutes intersect. A move may overlap other facts. Empty track is not treated as available.

## Provisional rendering

The canonical button stays at its projected `data-top`. A `div` with `data-provisional`, `aria-hidden="true"`, and `pointer-events: none` is painted from the local proposal. It is not a button. Its height may use the same 0.012 paint floor as other Week marks, and that height is not read back into minutes. If the relationship crosses midnight and the next civil date is already on screen, a second slice is painted there from minute 0. Canonical models are not mutated.

## FactDetail

The facts surface carries an optional proposal. Click inspection leaves it null. A successful release sets it and opens the editor. Drafts initialize from the proposal. The prose interval still comes from `describe` and the stored fact. Save still calls `updateFromStored` and `actions.onUpdate`. Close drops the surface. Nothing writes the proposal into `stored`.

## Save authority

Pointer move and pointer release do not call `onUpdate` or `onAnchor`. Save is the existing explicit button. The update keeps the same id, kind, and non-temporal fields.

## Cancellation

Local state clears, with no FactDetail and no write, on pointer cancel, lost pointer capture, Escape while lifted, release in a gap, footer, or outside the bodies, the Week row leaving the tree, and desktop permission turning off. Permission is `form === "desktop" && question === "week"`. Crossing below 960px sets `form` to phone and cancels an in-flight lift. Phone Week cannot start one.

## Accessibility

The fact remains a button with its accessible name, focus, click, and keyboard activation. A pointer-generated click after a lift or cancel is swallowed so it does not replace the proposal or open inspection by accident. A click with `detail === 0` still inspects. The provisional node is hidden from assistive technology. There is no `aria-grabbed`, `aria-dropeffect`, or keyboard drag.

## Coherence

`canonicalCoherence.ts` is unchanged. A Save still goes through the existing writers for `protected_time`, `blocks`, and `commitments`.

## Viewpoint

A lift, a release, opening FactDetail, and Save do not call `onAnchor`. A horizontal pan that wins before a lift still calls the existing shift. If a later reload omits the fact from the current Week, the projection drops it. The gesture does not chase it.

## Test evidence

- `temporalProposal.test.ts`: 7 passed
- `orientView.test.tsx`: 41 passed, including click inspection, the keyboard Edit/Save path, Work, all-day, overnight continuation, jitter, vertical lift, horizontal pan, cross-column proposal, zero writes on move and release, same-id Save, abandon, overnight relationship, overlap, anchor stability, pointer cancel, lost capture, Escape, gap, footer, outside, desktop-permission loss, and phone Week
- `viewpointProvenance.test.tsx`: 11 passed, including a Week shift
- `civilDateCorrection.test.tsx`: 12 passed
- `canvasEstablishment.test.ts`: 2 passed
- Full suite: 77 files, 756 tests, passed
- `npm run lint`, `npm run typecheck`, and `npm run build` passed

## Physical acceptance

Pending. The questions for a desktop pass:

- Does a vertical lift feel like the intended distinction from a click and from a Week pan?
- Is the 10px jitter floor appropriate?
- Is a 30-minute gesture start controllable and useful on the Week columns people actually see? If it is only a twitch, the constant can become 60. It should not become finer than 30 in this version.
- Does Week pan still feel normal, including a horizontal drag that starts on a fact?
- Does click-to-inspect still feel normal?
- Does the provisional mark, beside the canonical button, communicate a proposal clearly enough?
- Does release opening FactDetail, with Save still required, feel like the right authority boundary?
