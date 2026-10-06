# PRODUCTION-UI-002 — Temporal origin, Week signature, Month landscape

Date: 2026-10-05.

Baseline: `67e12b075a1907750bcf1a31666e7a8dff78d240`.

This continues the uncommitted production instrument from [PRODUCTION-UI-001.md](PRODUCTION-UI-001.md) and [PRODUCTION-VISUAL-EMBODIMENT-001.md](PRODUCTION-VISUAL-EMBODIMENT-001.md). It does not replace that chassis or that visual identity. It does not amend domain semantics, schema, or the production-experience design.

## Temporal integrity

Human visual acceptance found that Orient treated October 3, 2026 as today, and that the same date appeared to govern every day.

There is no literal `2026-10-03` in the production instrument. `zonedLocalClock` of the machine instant `2026-10-05T21:19Z` in `America/Boise` is `2026-10-05`. The same instant's Work fiscal week starts on Saturday `2026-10-03`, because `workFiscalWeekStart` counts back to Saturday. That function belongs to the Work schedule editor. The instrument was not calling it.

What the instrument did do:

- It initialized the anchor through `civilDateInTimeZone`, a second formatting path beside the `zonedLocalClock` path the view already used for today, Present, and Now.
- Present forced the field back onto the Now mark whenever the anchor changed, and the scroll listener treated that move as the human crossing into another day.
- The civil-date label was `position: sticky`, so one date could remain visually in force across the days underneath it.

The anchor now comes from `orientCivilDate`, which is `zonedLocalClock(...).civilDate`. The live clock updates that instant and does not move the anchor. Present brings Now into view once, without rewriting the place the human has chosen. Each civil day carries its own date. October 3 remains the fiscal-week origin for the Work schedule, and a historical fixture in tests and evidence. It is not production today.

## Week

The seven-day signature was accepted as a direction and rejected as a composition because permanent Ask Day and Refer controls outranked the structure.

The established material is now the subject. A shared noon line runs across the seven days. A day is asked by its coordinate. A truth is referred by touching that truth. Overlap still opens every fact that shares the interval. Week does not edit minutes and does not establish.

## Month

Removing the spreadsheet was accepted. The landscape was not: material sat in a small cluster, and twenty-eight date controls formed a rail.

Month maps recorded local minutes onto the height of the field. The axis is the earliest and latest established timed minute in the 28-day window, padded, and never shorter than three hours. An empty window keeps the full local day. A mark has a small visibility floor. Recorded duration is unchanged. The clock bounds are labeled when the axis is not the full day. The date coordinate is the Ask Day control. Its chrome appears on hover, focus, and press.

Direction stays the warmer serif column beside that landscape.

## Present and Day

The continuous field, Now, materials, bezel, and controls stay. The date label is no longer sticky, so one civil date cannot cover the days after it. Present no longer chases Now after the human has moved.

Human visual acceptance of Week and Month is still required. This is not operational adoption.
