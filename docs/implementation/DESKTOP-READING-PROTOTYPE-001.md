# DESKTOP-READING-PROTOTYPE-001 — Desktop reading candidate

Superseded as a separate route. [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md) promotes the accepted Present and Day to production `/` and retires `/desktop-reading`. The paragraphs below record the inspection candidate.

This was a visual and interaction candidate. It was not, at the time it was written, a replacement for the production desktop, and it was not yet accepted.

Production `/` still renders `OrientInstrument` with composition `production`. At desktop width that still opens on Present and mounts the vertical clock. `/instrument` is unchanged historical evidence.

The candidate is the signed-in route `/desktop-reading`. It renders the same `OrientInstrument` and the same production reads and writes, with composition `desktop-reading`.

## Seam

`DesktopReading` mounts only when the form is desktop, the composition is `desktop-reading`, the depth is reading, and the question is Present or Day.

Phone Present and Day still mount `PhoneContinuity`. Phone Exact time, desktop Exact time, and the production desktop still mount the existing `DayClock`. `DayField.tsx` is unchanged. Week and Month still mount `Landscape`.

The candidate does not add a temporal model. Present membership is `composeCurrentTemporalReading`. Day order and the signature fractions are the day canvas plus `phoneSignature.ts`.

## Composition

Upper left is orientation. Present leads with authoritative local time. Day leads with the selected civil date, and shows quiet Now only when that date is today.

Established truth uses the same membership and hues. Present shows every truth that contains Now, as peers. Day shows the selected date's facts in clock order. The Active Thread is a separate line in the reading and is omitted from the reach while that line is present.

The signature is one civil day across the width. Unmarked time stays unmarked. Exact time opens `DayClock`. Orientation returns to the reading and does not change the question or the anchor.

At 960px and wider, the candidate replaces the 22rem rail with a quiet bottom reach for question, position, Context focus, and Capture. The same transient `surface` state becomes a right-hand drawer. Direction stays beside Month. It is not moved into the drawer.

## Drawer

The drawer is the existing dialog. On this candidate at desktop width it is explicitly non-modal (`aria-modal="false"`), because the temporal reading stays mounted and perceivable. Escape closes it. Focus moves to the dialog when it opens and returns to the invoking control when Escape closes it. Focus is not trapped. A trap would claim the field is unavailable.

The phone sheet does not receive Escape handling, a focus move, or `aria-modal`.

## Boundary

No domain change, no write change, no schema change. Reschedule, carry forward, recurrence, reminders, and Pulse are not in this candidate.

## Refinement

DESKTOP-READING-REFINEMENT-001 does not replace this candidate and does not accept it. Present still leads with Now. Day still leads with the selected civil date. Week and Month keep Landscape and add the selected span above it: the seven dates, or the twenty-eight-date window. Direction stays in its Month column.

A Day fact contained in the selected civil day shows clock times only. A fact that leaves that day keeps the dates in its source interval.

The signature is a quiet inscription on a line. The Now reference has no circular handle. Exact time remains a control into the existing Day clock. On the desktop candidate, Orientation, the civil date, and the words Exact time sit in a frame above that clock so they do not share the midnight labels.

[ORIENT-DESKTOP-PRESENT-STRUCTURAL-SEPARATION-001.md](ORIENT-DESKTOP-PRESENT-STRUCTURAL-SEPARATION-001.md) removes the whole-day signature from desktop Present. Desktop Day keeps that signature. [ORIENT-DESKTOP-DAY-FIELD-001.md](ORIENT-DESKTOP-DAY-FIELD-001.md) gave the Day signature vertical depth. Physical inspection rejected that depth. [ORIENT-DESKTOP-DAY-INSCRIPTION-002.md](ORIENT-DESKTOP-DAY-INSCRIPTION-002.md) keeps Day as one 00:00–24:00 inscription. [ORIENT-DESKTOP-DAY-PHYSICAL-POLISH-001.md](ORIENT-DESKTOP-DAY-PHYSICAL-POLISH-001.md) removes Work Off from that inscription and quiets the baseline. Phone reading is unchanged. Desktop Present is unchanged.
