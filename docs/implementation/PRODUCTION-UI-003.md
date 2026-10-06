# PRODUCTION-UI-003 — Month map, Week center, Day handles

Date: 2026-10-05.

Baseline: `67e12b075a1907750bcf1a31666e7a8dff78d240`.

This continues the uncommitted production instrument. It does not replace [PRODUCTION-UI-001.md](PRODUCTION-UI-001.md), [PRODUCTION-VISUAL-EMBODIMENT-001.md](PRODUCTION-VISUAL-EMBODIMENT-001.md), or [PRODUCTION-UI-002.md](PRODUCTION-UI-002.md). It does not amend domain semantics.

## Month

Human inspection: “Month's layout looks like a long ass week.”

The 28-day row was one Week stretched sideways. A familiar calendar arrangement is presentation, not a semantic failure. Month now paints the same rolling 28 civil dates as a 7 × 4 field. The rows are consecutive dates in the explicit window. They are not a Gregorian month, not four Week objects, and not a Sunday-aligned calendar. A window that runs Mon, Oct 5 – Sun, Nov 1 occupies those 28 positions and crosses the month boundary without being named “October.”

Each position is an aperture. Established Work, Protected Time, Block, and Commitment keep their kind material. Overlap still inspects every fact that shares the interval. Work Off stays the word Off. The date coordinate asks Day. The material refers. Today, when it lies in the window, is the existing warm locative wash. It is not a selection.

The UI-002 clock mapping still places recorded minutes inside each aperture: earliest-to-latest established minute, at least three hours, 8% pad, 1.5% visibility floor. The floor does not change source truth. Phone and desktop use the same 7 × 4 geometry at different scale. Direction stays the warmer serif plane beside the field, stacked under it on the phone and leading it on the desktop.

## Week

The signature was beginning to work and sat too high, because the full local day filled the field and daytime material collected at the top.

The seven-day signature is unchanged: shared local-day axis, noon line, direct date and fact interaction, no Ask Day or Refer furniture. The composed object, coordinates included, is framed in the middle of the field. Quiet field remains above and below it.

## Day handles

The start and end handles rendered and did nothing useful. `dragBound` ran only on pointer down. It sampled the minute already under the handle, published one refine, and never listened for pointer move. The selection could not be spread apart.

A handle drag now captures the pointer, follows move, and snaps with the existing fifteen-minute gesture snap. The other bound stays fixed. Typed fields follow a successful drag. A typed time still refines the geometry and does not snap. `refineSelection` still refuses an empty, reversed, or out-of-day range and leaves the last valid draft in place. Pointer cancel stops the drag and does not apply the cancelled point. The field scroll is not moved. The hit target is 2.75rem with `touch-action: none`. The visible bar stays small.

## Preserved

The dark field, gold orientation, kind materials, glass instrumentation, Outfit, Newsreader, Now, and the reach bezel stay. Today is still `zonedLocalClock` of the authoritative instant. October 3 is not production today.

Human production acceptance is still required.
