# PRODUCTION-TEMPORAL-STABILITY-001 — Startup viewpoint and Day traversal

Date: 2026-10-05.

Baseline: `67e12b075a1907750bcf1a31666e7a8dff78d240`.

This continues the uncommitted production instrument. It does not replace [PRODUCTION-UI-001.md](PRODUCTION-UI-001.md), [PRODUCTION-VISUAL-EMBODIMENT-001.md](PRODUCTION-VISUAL-EMBODIMENT-001.md), [PRODUCTION-UI-002.md](PRODUCTION-UI-002.md), or [PRODUCTION-UI-003.md](PRODUCTION-UI-003.md). It does not amend domain semantics, schema, or persistence. It does not redesign the phone or the desktop reach.

## Human evidence

On a fresh opening, Orient repeatedly presented October 3, 2026 while authoritative today was October 5, 2026. The same date appeared on phone and desktop. The instrument could know today's civil date and still open the field on an older day.

While scrolling Day, the field jumped, shifted, and fought the hand. Crossing midnight was part of that instability.

Month's 7 × 4 composition was accepted. Quiet ground inside a Month date did not ask Day. Established material inside that date must still inspect, and must not become Ask Day.

Week's centered composition and the accepted visual identity stay.

## October 3

There is still no literal `2026-10-03` in the production instrument, and nothing reads or writes it to `localStorage`, `sessionStorage`, a query parameter, or a cookie. `/instrument` is not mounted at `/`. The Work fiscal week for Monday 2026-10-05 in `America/Boise` does start on Saturday 2026-10-03, and `workFiscalWeekStart` still belongs only to the Work schedule editor. The production instrument does not call it.

October 3 was derived.

`OrientInstrument` already set the anchor once from `orientCivilDate(new Date(), confirmedTimeZone)` after the session could read temporal settings. For `America/Boise` on 2026-10-05 that civil date is `2026-10-05`. The live interval replaces the instant and does not call `setAnchor`. UI-002 closed the second formatting path. It did not close viewpoint placement.

The vertical field mounts three civil days: the day before the anchor, the anchor, and the day after. Present then tried to bring Now into view with `mark.offsetTop`. The Now mark is `position: absolute` inside `.orient-clock`, which is `position: relative`, so `offsetTop` is the mark's place inside that one clock. An afternoon Now is a few hundred pixels into the clock, not a few hundred pixels into the three-day scroll content. The write landed inside the previous civil day. `scrollLock` covered that one write. The lock then cleared. The scroll handler treated the landing as a human crossing, called `onAnchor` for that previous day, and replaced the mounted trio. The day before that previous day was inserted above the viewport. Compensation used `offsetTop` again, this time against `.orient`, which is also `position: relative`, so the restored `scrollTop` was not the scroller's content coordinate. The viewport was left on the newly prepended day. From October 5 that day is October 3. The fiscal Saturday is the same date. It was a coincidence of the cascade, not the selector.

## Startup authority

Signed-in route `/` renders `OrientInstrument`. There is no server civil date and no hydrated anchor.

1. Auth session ready. Without a confirmed zone the instrument withholds the reading.
2. Authoritative instant: `new Date()` once at settings load, then every 30 seconds.
3. Configured zone: `loadTemporalSettings`.
4. Authoritative local civil date: `orientCivilDate`, which is `zonedLocalClock(instant, zone).civilDate`.
5. Initial question: Present. The design's Present is the day clock anchored to today, with Now in view. Question, anchor, and scroll are not stored.
6. Initial anchor: that civil date, and only when the anchor is still empty.
7. Per-question memory exists only in the open view. Present does not restore an older place. Asking Present sets the anchor to today and brings Now into view once.
8. Day, Week, and Month each remember the anchor and scroll they had when the human left them. The first visit keeps the anchor already in force. A later visit restores that question's own place.
9. The vertical field's first mounted days are yesterday, today, and tomorrow of that anchor. October 3 is not among them when today is October 5.
10. Present places Now from the mark's position in the scroll content, in the upper portion of the field. That write is locked, so it is not a day crossing. If the field has no height yet, a resize retries the same placement and then stops.
11. Nothing after that paint moves the viewpoint because the clock ticked, Now left the viewport, focus changed, Capture opened, or inspection opened.

Today and the viewpoint are different. Today is the civil date of the authoritative instant in the confirmed zone. The anchor is where the human is looking. A later clock tick updates the Now mark and does not change the anchor. The human may leave today. Return to Now, Today, a chosen civil date, Ask Day, and asking Present are explicit moves.

Week and Month windows are `explicitCivilSpan` of their own anchor. They are not a fiscal week. While Month is showing, its 28-day window does not replace the mounted Day span. `/schedule` still owns `workFiscalWeekStart`.

## Day scroll

These paths assign `scrollTop` or `scrollLeft`:

- Present entry, Return to Now, and the one-shot resize retry place the Now mark.
- Ask Day, Today, previous, next, and a typed civil date align that civil day when the question is Present or Day.
- Returning to Day restores that question's scroll when the saved anchor is still the anchor.
- Returning to Week or Month restores that question's horizontal scroll.
- Reaching the edge of the mounted days prepends or appends one civil day, then puts the same pixels back in `useLayoutEffect`.

These paths do not assign scroll position:

- the 30-second clock
- Now moving off screen
- measuring which edge the Now control belongs on
- Context focus
- opening or closing Capture
- opening or closing inspection
- observing a civil date under the probe
- a projection refresh that follows an anchor change

Observing a date that is already mounted updates the anchor and leaves the mounted days in place. The field is no longer rebuilt around the new date, so midnight traversal does not remove the day above the hand. The edge extension is the only growth, and it compensates before paint. Unmeasured days, which share one content top, are not treated as a crossing.

The Now control sits on the field stage, outside the scroll content, so its appearance does not change scroll height. The capacity gloss is painted over the day instead of inserting a line that would push the clock down when the anchor day changes. `.orient-field` and each `.orient-day` set `overflow-anchor: none`. The evidence is the old rebuild: it deleted a day above the viewport while a microtask also wrote `scrollTop`, which is the situation native overflow anchoring also corrects. The rebuild is gone. The property keeps the edge compensation from being corrected a second time. It is not a substitute for the rebuild fix.

The Present and Day question body is no longer forced to `height: 100%`. That lock made the scrollport the height of the viewport while the clocks overflowed it. Week and Month still fill the field so the centered Week and the 7 × 4 Month keep their frame.

## Month

The 7 × 4 geometry is unchanged. Each date's quiet ground is a button labeled Ask Day for that civil date. It does not take the coordinate's hover chrome. The coordinate button still asks Day. Established facts are buttons above the ground, with `pointer-events: auto`, and their clicks do not propagate into Ask Day. Month facts previously inherited `pointer-events: none` from the day clock, so a physical tap could pass through the fact. Keyboard focus reaches the ground and each fact separately.

Week still asks Day from its coordinate. Direction is untouched.

## Day handles

PRODUCTION-UI-003's start and end handle drag is still the implementation in `DayField`. This tranche does not change that file. The handle test still requires the field scroll to stay put during a drag.

## Console

`components/orient/Landscape.tsx` parses. The reported `Unterminated regexp literal` was a Fast Refresh splice during an edit. It is not present in the file, and the Orient tests import that module.

## Deferred evidence

Not implemented here.

Phone. The current phone Day and Present still behave like a shrunken desktop canvas. Responsive shrinking is not the intended phone strategy. The candidate under discussion is: authoritative Now, the established truths that contain Now, the Active Thread on its own, readable present-orientation surfaces, a compressed whole-day signature, and the exact vertical Day canvas only when the human wants precision. Tasks would appear through explicit established authority. This is not canon.

Desktop. Permanent side regions recompose the instrument between questions. A later discussion should separate semantic adjacency, such as Direction beside Month, from invoked reach, such as Capture, relocation, inspection, and account. No drawer is authorized.

## Physical acceptance

1. Close and reopen `/`. Confirm the confirmed zone's civil date. Confirm the field is not opened on October 3. Repeat on a wide desktop viewport and an S26-sized portrait viewport.
2. On Day, scroll well away from Now. Wait through a clock update. The place stays.
3. Scroll across a civil midnight. The motion stays continuous.
4. Open and close Capture. The place stays.
5. Open and close inspection. The place stays.
6. Change Context focus. The place stays.
7. Press Now. The field moves to Now.
8. Open Month. Tap quiet ground on one date. The same instrument asks Day for that date.
9. Return to Month. Tap an established fact. Inspection opens. The question stays Month.
10. On Day, drag a draft's start and end handles. The interval changes. The field does not jump.
11. Clear the console. Exercise Present, Day, Week, Month, Capture, and inspection. No parse, runtime, or hydration error reproduces.

The human later accepted the startup orientation and the continuous Day traversal physically. Those fixes stay. The October 3 incident stays closed unless new physical evidence reopens it. Phone composition is a later record, [PRODUCTION-PHONE-EXPERIENCE-001.md](PRODUCTION-PHONE-EXPERIENCE-001.md). This is not operational adoption. The rest of the production body is still uncommitted.
