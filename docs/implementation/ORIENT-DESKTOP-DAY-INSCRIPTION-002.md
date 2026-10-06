# ORIENT-DESKTOP-DAY-INSCRIPTION-002

Physical inspection later accepted this inscription. It is production desktop Day. The Day-anchor diagnostic below remains diagnostic only. Provenance is not implemented. [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md) is the production record.

This was a presentation correction on the desktop reading candidate, plus a read-only Day-anchor diagnostic. It was not, at the time it was written, acceptance, and it did not yet replace `/`.

Physical inspection rejected the vertical field in [ORIENT-DESKTOP-DAY-FIELD-001.md](ORIENT-DESKTOP-DAY-FIELD-001.md). The semantic model from that tranche stays. The invented second dimension does not.

## Day inscription

Desktop Day remains one temporal dimension. Horizontal position is civil time from 00:00 to 24:00.

The rejected field is gone: the clamped rail height, the top and bottom field edges, the inner vertical ticks that did not meet a baseline, the paired horizontal contours, and the empty vertical territory.

What remains is one baseline, four major civil-time references (12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM), and established spans drawn as single strokes in the existing hues. A span's width is still its share of the local clock. Overlapping strokes share that line. Unmarked time stays unmarked. Now is a warm-gold reference on the line only when the selected day is today. Exact time stays under the inscription and still opens the existing Day clock.

## Unchanged

Desktop Present, phone reading, Week, Month, Direction, the Exact time frame, the drawer, the bottom reach, DayClock, projections, auth bootstrap, and Day-anchor behavior are unchanged.

## Day-anchor diagnostic

No anchor behavior was changed. The evidence below is the current code.

The label "Mon, Oct 5" is `formatCivilDateLabel("2026-10-05")`. Desktop Day prints that label from the anchor. Quiet Now and the inscription's Now render only when `zonedLocalClock(now, timeZone).civilDate` equals that anchor. A Day that shows Mon, Oct 5 and no Now is an anchor of `2026-10-05` while the live clock's civil date is a different day.

A fresh `OrientInstrument` mount sets the anchor once, and only if it is still empty, from `orientCivilDate(new Date(), confirmedTimeZone)`. That function is `zonedLocalClock(instant, zone).civilDate`. Temporal settings supply the zone, not a selected day. There is no server civil date, query parameter, cookie, `localStorage`, or `sessionStorage` for the anchor.

Desktop `OrientView` starts on Present. The first visit to Day keeps the anchor already in force. Leaving a question stores `{ anchor, scroll }` in a ref on that view. Returning to Day restores that stored anchor when it differs. Asking Present is the question change that sets the anchor to the live civil date. Previous day, next day, Today, a typed civil date, Ask Day, and a Week or Month shift are the other explicit writes. The 30-second clock replaces `now` and does not call `setAnchor`. Nothing runs at civil midnight.

On the desktop candidate's Present and Day reading, field scroll does not rename the anchor. Exact time leaves that reading and uses the existing clock, where a scroll crossing can rename it. Returning from Exact time does not put the anchor back.

The in-memory anchor survives switching among Present, Day, Week, and Month in the same view. It does not survive a new `OrientInstrument` mount: refresh, a cold browser start, or sign-out then sign-in. Sign-out unmounts the signed-in shell. The next sign-in mounts a new instrument and initializes the empty anchor from the live civil date. A browser that restores a still-living page can keep the React state; the application does not store it.

There is no separate fresh-entry rule. A Day place saved while it was today is restored later as that same civil date, including after midnight, for as long as the view lives. A new mount has no saved place. The code does not record whether a human moved the anchor or whether the saved day is still today.

A cold mount at about 5:36 AM on Tuesday, Oct 6, in a zone where that instant is Oct 6, initializes to `2026-10-06`. The physical Day that showed Mon, Oct 5 was therefore not that cold initialization. It was the anchor already held by the mounted instrument: the value set when that mount began, or a later explicit move, and then left in place because the clock does not replace it. The repository cannot tell which of those two histories produced the screenshot. Both paint the same Day, and both omit Now once the live civil date is Oct 6.

No fresh-Day rule was implemented.
