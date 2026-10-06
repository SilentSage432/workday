# DAY-ANCHOR-PROVENANCE-DISCOVERY-001

Discovery and contract. The representation is recorded in [DAY-ANCHOR-PROVENANCE-001.md](DAY-ANCHOR-PROVENANCE-001.md). That implementation does not change midnight behavior and does not persist the bit.

Baseline: `c1bbe83f010eedc0dca56a117bfe35e0715b474c` on `main`. Production `/` is canonical. Desktop Present and Day, and phone continuity, stay frozen. `/desktop-reading` stays retired. `/instrument` stays historical.

The working sentence under investigation is: Orient follows time until the human establishes a viewpoint, and once that viewpoint exists the clock cannot steal it. This record does not authorize implementing that sentence. It records what the repository already does, and the smallest distinction the existing model cannot express.

## Implementation status

[DAY-ANCHOR-PROVENANCE-001.md](DAY-ANCHOR-PROVENANCE-001.md) stores the bit beside each Day, Week, and Month place. A fresh viewpoint follows Today. The listed human moves mark that viewpoint Moved. Asking Present, Today, and Return to Now follow Today again. Midnight does not move the anchor and does not change the bit. Present's date label at midnight remains unresolved. The bit is not persisted.

## Current state

The inventory below is the model this discovery found, before the bit existed.

`OrientInstrument` holds `anchor: string | null`. The string is a civil date. `OrientView` holds, in a ref that dies with the view:

```ts
type QuestionPlace = { anchor: string; scroll: number | null };
```

One place may be remembered for `day`, `week`, and `month`. Present does not restore its place. Nothing in either structure records why the civil date was written.

A second ref, `anchorCause: "explicit" | "observe"`, is an alignment latch. Layout clears it. Scroll crossings and Week or Month shifts do not set it. It is not a provenance bit and must not be reused as one.

Authoritative Today is already a separate fact. `orientCivilDate(instant, timeZone)` is `zonedLocalClock(instant, timeZone).civilDate`. The view reads it through `todayCivil()`. The 30-second clock replaces `now` and does not write the anchor. Nothing runs at civil midnight. There is no `localStorage`, `sessionStorage`, cookie, or query parameter for the anchor.

The sentences already in force use two different words for these two facts:

- Today is the civil date of the authoritative instant in the confirmed zone. [PRODUCTION-TEMPORAL-STABILITY-001.md](PRODUCTION-TEMPORAL-STABILITY-001.md).
- The viewpoint is the anchor: where the instrument is oriented. The same record says a later clock tick updates the Now mark and does not change the anchor.
- A Day that was moved to another civil date stays there. [PRODUCTION-PHONE-EXPERIENCE-002.md](PRODUCTION-PHONE-EXPERIENCE-002.md).
- Asking Present sets the anchor to today. The field does not keep chasing Now afterward. [2026-10-05-production-experience-design.md](../decisions/2026-10-05-production-experience-design.md).
- The instrument initializes an unset anchor from the live civil date and keeps that value until an explicit move. [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md).

"Explicit move" in the stability record covers both adopting Today and naming another civil date. That word is too wide for the distinction. `anchorCause`'s "explicit" is a third, unrelated meaning.

## Anchor writes and restorations

Historical `/instrument` has a parallel anchor in `InstrumentPrototype` and `InstrumentView`. It is not production and is not part of this contract.

| # | Function | Trigger | Value written | What it represents | Clock may replace it | Survives question change | Survives remount | Persisted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `OrientInstrument` settings effect, `setAnchor((current) => current ?? orientCivilDate(...))` | Confirmed zone arrives. Runs once. Writes only while the anchor is still empty. | Civil date of `new Date()` in that zone. | Sample of Today. The human has not moved. | No. Later ticks call `setNow` only. The `??` also refuses a second sample. | Yes, as the live string. | No. A new mount samples again. | No. |
| 2 | `chooseQuestion` when `next === "present"` | Human asks Present. | `orientCivilDate(clock, timeZone)` if it differs. | A human act whose value is a fresh sample of Today. Present does not restore `places.current.present`. | No, after the sample. Asking Present again samples again. | The Day, Week, or Month place remembered on the way out is kept. Present's own previous date is not restored. | No. | No. |
| 3 | `chooseQuestion` for Day, Week, or Month | Human returns to that question and its remembered anchor differs. | `places.current[next].anchor`. | Restoration of a civil date. The place does not record whether that date was a Today sample or a move. | No. | Yes, until another write. | No. The ref dies. | No. |
| 4 | `askDay` | Ask Day on a Week coordinate or a Month date. | That column's civil date. Also writes `places.current.day` immediately. | The human moved Day to a named civil date. | No. | Yes. | No. | No. |
| 5 | `relocate` from Position surface: Previous, Next | Human activates those controls. `relocate` sets the alignment latch, then `onAnchor`. | `shiftedAnchor(anchor, -1)` or `+1`. | The human moved the viewpoint by one civil date. | No. | Remembered when that question is left. | No. | No. |
| 6 | `relocate` from Today | Human activates Today. | `todayCivil()`. | A human act whose value is a fresh sample of Today. The question does not change. | No, after the sample. | Same as any other live anchor. | No. | No. |
| 7 | `relocate` from the typed date | The date input matches `YYYY-MM-DD`. | That string. | The human moved the viewpoint to a named civil date. | No. | Remembered when that question is left. | No. | No. |
| 8 | `returnToNow` | Human activates Now, and Today differs from the anchor. Present and Day also set depth to exact and ask the field to place Now. Week and Month only relocate. | Today. | A human act whose value is a fresh sample of Today. The question does not change. On Week or Month the window then begins on Today, because the span begins at the anchor. | No, after the sample. | Same as any other live anchor. | No. | No. |
| 9 | `onFieldScroll` → `viewpointAfterScroll` | A scroll on Present or Day while depth is exact, the probe's civil date differs, and the scroll lock is clear. Reading depth returns first. Week and Month return before this write. | The observed civil date. The latch is not set. | The human moved the exact-time clock across a civil date. Accepted Present and Day readings do not take this path. Leaving Exact time does not put the previous date back. | No. | The new date is the live anchor and is remembered on leave. | No. | No. |
| 10 | Landscape `onShift` | Pointer-up or wheel on Week or Month. Does not go through `relocate`. | `shiftedAnchor(anchor, steps)`. | The human moved that question's window origin. Day's remembered place is not overwritten by the shift. | No. | Week or Month remembers the origin it had when left. Day remembers its own. | No. | No. |

These paths do not write the anchor: the 30-second clock, civil midnight itself, focus, Capture, inspection, the thread, entering or leaving Exact time, a signature click that only supplies a minute, the first visit to a question with no remembered place, a question return whose remembered anchor already matches, a resize that sets the phone's first question to Day, and edge extension of `daySpan`.

`remember` writes the ref only. It copies the current civil date and scroll. It does not copy a reason, because none is stored.

## Provenance ambiguity

Two histories produce the same string.

1. The mount sampled Today, the clock later crossed midnight, and nothing moved the viewpoint.
2. The human moved the viewpoint to that same civil date.

[ORIENT-DESKTOP-DAY-INSCRIPTION-002.md](ORIENT-DESKTOP-DAY-INSCRIPTION-002.md) already recorded that the repository cannot tell those histories apart. This tranche confirms that, path by path. Restoration copies the string into the same ambiguity.

There is a second, narrower split on Present. Desktop and phone Present compose membership from the live instant (`composeCurrentTemporalReading({ instant: now })`). The civil-date label is `formatCivilDateLabel(anchor)`. After midnight, with an unmoved anchor, the membership follows the new instant and the label still names the previous civil date. Day does not split that way: Day's facts and label both follow the anchor, and quiet Now is omitted once Today and the anchor differ. That omission is accepted phone behavior.

## Midnight cases

Existing law, already tested: a clock tick does not write the anchor, including across civil midnight, and an unmoved phone Day stays on the date it opened with. The investigated sentence would treat an unmoved viewpoint differently from a moved one. The code cannot. Where the two disagree, this record does not choose a new behavior.

1. Open at 11:55 and never move Day. Midnight passes. The anchor stays on the opening civil date. Phone Day, which is the fresh phone question, keeps that date, drops quiet Now, and does not call `onAnchor`. Desktop opens on Present: the time label and the membership follow the new instant, and the date label stays on the opening anchor. This satisfies "the clock does not move the anchor" and "the field does not chase Now." It does not follow Today while the view remains open. The acceptance record says that absence of midnight movement is current behavior, and that the distinction is not implemented.

2. The human selects yesterday at 11:55. Midnight passes. The anchor stays on yesterday. The clock does not replace it. Today, Now, and asking Present can, because those are later human acts that sample Today. The stored value is indistinguishable from case 1.

3. The human selects tomorrow. The clock ticks. The anchor stays on tomorrow. Same rule as case 2. A tick is not a move.

4. The human asks Present while Day holds a historical date. Present writes Today when it differs, and brings Now into view once. Day's remembered place remains the historical date. Asking Day again restores it. Present does not become that historical instant. This satisfies "asking Present sets the anchor to today." After that sample, Present is again a frozen civil date, so a later midnight while remaining on Present is case 1.

5. The human moves Day, leaves for Week, and later returns to Day. Leaving Day stores `{ anchor, scroll }`. A Week shift writes the live anchor and does not rewrite Day's place. Returning restores Day's civil date when it differs. This satisfies "each question remembers its own anchor." The restored date has no recorded reason. The clock still cannot replace it, because the clock replaces nothing.

6. Day was only the opening sample. The human leaves for Week and returns after midnight. The same restore path runs. The remembered civil date is the old Today. Returning shows that date, not the new Today. This satisfies the current remember rule and the current no-midnight-movement rule. It does not implement "an unmoved viewpoint follows Today." The code cannot tell case 6 from case 5.

7. The application remounts after midnight. Sign-out unmounts the signed-in shell. Refresh and a cold start do the same. The next mount samples the new Today into an empty anchor. Remembered places are gone. A browser that restores a still-living page can keep the React state; the application does not store it. This satisfies "the anchor is not persisted." Keeping a moved viewpoint across remount would add persistence. That is not authorized.

8. Exact time. Entering it, choosing a minute on the signature, and returning through Orientation do not write the anchor. A scroll that crosses a civil date on the exact-time clock does write the observed date, and Orientation does not undo it. Accepted reading depth cannot take that path: `onFieldScroll` returns while depth is `reading` for Present or Day. The design sentence that crossing midnight moves the anchor belongs to that clock, not to the accepted Present and Day readings.

## Explicit navigation

Moves that name a civil date other than a fresh Today sample: Previous, Next, a typed date, Ask Day, a Week or Month shift, and an exact-time day crossing.

Acts that sample Today: the initial mount, asking Present, Today, and Return to Now. They are human acts except the mount. Their value is Today, not a departed place. After the sample they freeze, under current law.

Observing a clock tick does not move the viewpoint and is not one of those acts. Focus, Capture, inspection, and the thread do not either.

The first visit to Week or Month, with no remembered place, keeps the anchor already in force. That is not a new write. If that anchor was Day's date, the window begins there until the human shifts it or Day's place is restored on return.

## Present

Asking Present samples Today and does not restore a previous Present place. While Present stays open, the anchor does not follow later midnights. Membership still follows the live instant. The date label follows the anchor. The acceptance sentence that Present's civil date supports authoritative Now has no midnight rule that resolves that split. The motion rule that Now's advance does not move the field is the rule the code implements.

## Week and Month restoration

Day, Week, and Month each remember the anchor they had when left. Present is the exception. A shift changes only the live anchor. Returning to Day restores Day's place when it differs, which is how Week and Month are prevented from replacing Day. Returning to Week or Month restores that window's origin and its horizontal scroll. If Day was never visited, it has no place, and the first visit to Day keeps whatever origin Week or Month left in force.

Return to Now on Week or Month, when Today is outside the window, sets the anchor to Today. The window then starts on Today. When Today is already inside the window, the Now control is absent and the origin stays.

## Remount and persistence

No persistence exists. The design lists the question, the anchor, and each question's scroll as interface state that is not stored. Absence of a moved viewpoint after refresh is current law. A provenance flag that survived remount would be persistence. It is not required by any established product rule.

## Smallest representation

The missing fact is one bit on the live viewpoint and on each remembered place: whether that viewpoint still follows Today, or has been moved.

- Mount: follows Today.
- Previous, Next, typed date, Ask Day, exact-time day crossing: moved.
- Week or Month shift: that question's viewpoint is moved. Day's remembered place is unchanged.
- Asking Present, Today, and Return to Now: follows Today again.
- `remember` copies the bit with the civil date. Restoration copies it back.
- Present does not need a remembered place. It samples Today on entry.

The bit lives beside the place the view already keeps. The instrument can continue to store a civil-date string. The view already owns the places, and the parent learns the date only through `onAnchor`. Lifting the bit into the instrument, or replacing the string with a richer value, adds an owner without a new fact. A separate provenance store, a history, or event sourcing would record more than the distinction.

`anchorCause` does not fit. It means "align this day on the next layout," and layout clears it.

One bit is enough. Week and Day are already different places. Restoration is a copy, not a third value. Adopting Today is the following side of the same bit, not a third side.

What the bit does not decide: when `follows Today` is true and civil midnight passes while the view is still open, current law keeps the sampled date, and an accepted phone test locks that. The investigated sentence would advance it. That is a behavior choice. It is not another stored value. This discovery does not make the choice.

## Terminology

Use the words the repository already uses.

- **Today** — the civil date of the authoritative instant. Recomputed. Not stored on the anchor.
- **Viewpoint** — the anchor civil date for the question in force.
- **Follows Today** — the viewpoint is still that sample.
- **Moved** — the human has oriented the viewpoint to a civil date of its own.

Do not store "explicit," "automatic," "manual," "pinned," or "human." "Explicit" already means three different things in this area. A click on Today is a human act and still follows Today. A clock tick is not a move.

## Candidate invariants

Supported by current evidence:

- A clock tick, including civil midnight, is not a move. It does not write the anchor. Accepted phone Day proves the unmoved case across midnight.
- Merely observing that tick does not establish a moved viewpoint.
- Previous, Next, a typed date, Ask Day, a Week or Month shift, and an exact-time day crossing do move the viewpoint.
- Asking Present samples Today and does not restore a historical Present instant. Day's moved place survives that round trip.
- Restoration must keep the meaning of the place it restores. The current place cannot, because it stores only the civil date.
- The anchor is not persisted. Remount samples Today. A moved viewpoint does not survive remount, and that absence must not be turned into persistence.

Incomplete, or not yet a rule:

- "Authoritative Now may advance without stealing a moved viewpoint." True of the current clock, and weaker than current law: the clock also does not steal an unmoved viewpoint.
- "A fresh viewpoint follows Today." True at mount. False for an open view across midnight, by the accepted phone test and by the acceptance record. The invariant needs a bound: at mount, not while a living view still holds the previous sample. Whether a later tranche removes that bound is an acceptance decision, not a discovery conclusion.
- "The field does not chase Now" and "Present's civil date supports Now" are both written. Across midnight on an unmoved Present they describe different surfaces: the anchor stays, the membership follows the instant, the date label stays with the anchor. Neither sentence was given a midnight case that resolves the label.

## Implementation boundary

Do not implement this bit in the same tranche as a visual or phone change. A later tranche that only records the bit, without letting midnight rewrite a following viewpoint, preserves accepted behavior. A later tranche that lets a following viewpoint advance at midnight changes accepted phone behavior and needs its own acceptance. It still must not persist the bit, must not redesign Present, Day, Week, Month, Exact time, Capture, or the drawer, and must not change auth.

Likely files when that later tranche is authorized:

- `components/orient/OrientView.tsx` — the place type, `remember`, `chooseQuestion`, `askDay`, `relocate`, `returnToNow`, the exact-time scroll write, and the Week or Month shift.
- New tests beside the orient view tests. Not `OrientInstrument`, unless a review decides the instrument must own the bit. The recommendation here is that it must not.
- This record, to say the bit exists.

Files that protect accepted behavior and should not be edited in order to make the distinction true:

- `components/orient/DesktopReading.tsx`
- `components/orient/PhoneContinuity.tsx`
- `components/orient/orient.css`
- `components/AppFrame.tsx`
- `app/page.tsx`

## Tests

Already proving portions of this behavior:

- `components/orient/temporalOrigin.test.tsx` — the clock interval does not call `setAnchor`. Present, Today, and Now sample authoritative today. A clock advance does not move a viewpoint that is already Today. Asking Week does not move a non-today anchor. Asking Present then does.
- `components/orient/phoneExperience.test.tsx` — a fresh phone opens on Day for the anchor it was given. Advancing `now` from October 5 18:30Z to October 6 01:00Z keeps October 5, drops quiet Now, and does not call `onAnchor`. Passive ticks do not change the question or the anchor. After Month asks October 8, Present samples the anchor's Today and Day returns to October 8.
- `components/orient/orientView.test.tsx` — asking Week does not move the anchor; asking Present samples today. Ask Day writes that date. An exact-time scroll can write the observed civil date and a later clock change does not write another. Now, Today, and a typed date write. Week and Month visits do not replace Day's place when the anchor never diverged. The instrument source has no `localStorage` or `sessionStorage`.
- `components/orient/desktopReading.test.tsx` — Day on another civil date does not draw Now. Exact time entry and Orientation return do not write the anchor.
- `components/orient/fieldScroll.test.ts` — an unmeasured field and a programmatic observation do not yield a date. The same civil date does not rewrite the viewpoint.

These expectations encode the ambiguity: the phone midnight test and the "clock does not call `setAnchor`" test treat an unmoved viewpoint and a moved viewpoint the same, because both are a string the clock does not touch. No test restores an unmoved Day after midnight and expects the new Today. No test states that a moved Day and an unmoved Day are different facts.

Minimum tests for a later implementation, after the behavior choice:

- A moved viewpoint stays on its civil date across a midnight tick.
- Remembering Day, shifting Week, and returning restores the moved Day date and does not adopt the Week origin.
- Remembering an unmoved Day and returning after midnight does whatever the accepted choice says. If the choice remains "do not advance," the existing phone test stays the proof and this case only needs to show the bit was not set.
- Asking Present, Today, and Now sample Today and clear the moved bit.
- Previous, Next, a typed date, Ask Day, a Week or Month shift, and an exact-time crossing set the moved bit. Orientation return does not clear a crossing.
- Remount does not restore the bit or the date.
- A clock tick does not set the moved bit.

Tests that stay untouched unless a later acceptance explicitly revises them: the phone entry midnight assertion, the passive-clock question assertion, the October 8 Present-and-Day round trip, the desktop Present and Day reading assertions, and the exact-time return that does not move the anchor.

## Out of scope

No new runtime behavior, no visual change, no phone change, no auth change, no persistence, no navigation history, no event sourcing, and no inferred intent.
