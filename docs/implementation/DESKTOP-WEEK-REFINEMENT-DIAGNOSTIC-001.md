# DESKTOP-WEEK-REFINEMENT-DIAGNOSTIC-001

Diagnostic only. No runtime behavior was changed. Week architecture and Week semantics passed physical inspection. Physical acceptance is not yet given. The seven-day model stays.

Baseline: `c83f1e6e8c34635c49fe2ec914d32369ab4d68f0` on `main`.

Production Week is `OrientView` asking `week`, which renders `Landscape` with `words` true, inside the desktop resolution frame. The seven models come from `explicitCivilSpan(anchor, 7)`. This record does not redesign that path.

## Current-day wash

Two paints stack on the column whose civil date equals authoritative Today.

The column wash is `.orient-column[data-today="true"] .orient-column-body`. `Landscape` sets `data-today` when `today === model.selectedDay`. `today` is `todayCivil()`, which is `orientCivilDate(now, timeZone)`. That is the civil date of the authoritative instant. It is not the anchor, not the window origin, and not the current minute.

The background is a full-height gold gradient, about 7% at the top and 5% at the bottom, transparent through the middle.

The same column also receives `.orient-column .orient-now`, a full-bleed layer with its own gold veil from 18% to 82% of the height. That layer exists only because the Now element is mounted. It is not a separate semantic flag.

[PRODUCTION-UI-003.md](PRODUCTION-UI-003.md) names this treatment: Today, when it lies in the window, is the warm locative wash, and it is not a selection. Month uses a different rule, `.orient-aperture[data-today="true"]`, for the same Today predicate. Removing the Week column background would not change hit targets, Ask Day, shifting, or inspection. `data-today` would remain.

The wash and the gold line currently identify the same civil day. The wash does not add a fact the line does not already mark, because the Week line does not encode the minute.

## Gold vertical line

`Landscape` mounts `<div data-present-mark="true" className="orient-now" aria-label="Now" />` only on the column where `today === model.selectedDay`. If Today is outside the seven-day window, or Today cannot be read, no column receives it.

`.orient-column .orient-now::after` draws the visible stroke: 1px wide, horizontally centered in the column (`left: 0; right: 0; width: 1px; margin: 0 auto`), extending from 8% to 92% of the column height. `pointer-events: none`. Nothing in Week sets `top` from the clock.

`presentMinute` returns null for Week and Month. The confirmed zone is used only to decide which civil date is Today. The line does not move as the minute changes.

Horizontal position means “this civil day.” Vertical extent means “nearly the whole local-clock column,” not the current local time.

The day clock’s Now is a different mark: a horizontal hairline on `.orient-clock` placed at the minute. Month’s Now is also different: a horizontal gold stroke at 50% of the aperture, not at the current minute.

`orientView.test.tsx` requires the present mark on the Today column and forbids it on the next civil day. No test asserts the Week stroke’s percentage box.

Contract of the element: this column is the civil date of the authoritative instant. Accessible name: Now. It is a reference. It does not own the Week, and it does not locate the minute inside the day.

## Horizontal reference

`.orient-landscape[data-distance="week"] .orient-column-body::after` draws a 1px line at `top: 50%` across every Week column, including empty ones. It is not on Month.

The column body is the 24-hour local-clock face. Timed placement uses `top = visibleStartMinute / 1440`. Fifty percent of that face is minute 720, which is 12:00 on the local clock, not the elapsed midpoint of a 23- or 25-hour civil day. The stylesheet does not compute 12:00. The axis makes the midpoint noon.

[PRODUCTION-UI-002.md](PRODUCTION-UI-002.md) calls it the shared noon line. [PRODUCTION-UI-003.md](PRODUCTION-UI-003.md) keeps it as part of the seven-day signature. It has no text label. It is not a control. No other hour tick is painted on Week.

A second, separate mark exists and was not the reported horizontal line: `.orient-column-body::before` is a faint vertical spine at 50% of each column’s width. It has no named time and no canonical sentence. It is not the noon line.

## Work labels

On Week, `words` is true, so each timed button renders `placement.kindLabel`. For a Work shift, `kindWord` returns `Work`. The button’s box is the span: `top` and `height` are the local-clock fractions, with a visual floor of `0.012`. The word is a span at the top of that box (`marginTop` is `labelStackIndex * 0.7rem`, which is 0 for a lone span), left-aligned. It is not centered in the territory and it is not a separate start-time label.

The button is the hit target. The word is not a second control. Clicking it refers every fact whose minutes overlap that span. `overflow: hidden` can clip a stacked label in a short or narrow block. Month mounts the same buttons and hides the words.

The visible word is the kind. Hue and the solid contour also identify Work. The Week contract requires the kind to remain readable rather than collapse into a generic occupied state. The accessible name already carries kind, words, and interval. The painted `Work` is the visible kind at this resolution.

## Work Off

`offFor` is true when a loaded Work row for that civil date has `state === "off"`. Week renders a non-interactive `<span data-work-off="true">Off</span>` in the column footer, above the Ask Day control. CSS uppercases it. It is not a placement, not an all-day fact, and not a button.

That matches the Week contract: Off produces no occupied interval and is not available. A missing Work row produces no Off and no span.

Month uses the same predicate and the same word, pinned to the aperture’s lower right. Desktop Day does not render it. `desktopReading.test.tsx` keeps Off off desktop Day and on Week, Month, and Exact time.

## Spatial grammar

Seven equal columns. Horizontal position is the civil day in the explicit window that starts at the anchor. It is not time of day, and it is not a fiscal week.

Vertical position inside a column is local-clock minute divided by 1440. The top is 00:00 and the bottom is the next local midnight. A Work shift’s box is that fraction of the column. Thursday and Friday differ when their established start and end differ. The sizing is not decorative.

Overlap keeps every truth. Each keeps its own box. A click collects every placement whose visible minutes intersect. Nothing is ranked or removed. Empty column body means no participating timed or all-day fact. The noon line and the vertical spine still paint there. They do not mean free, available, or unused. Capacity remainder is not composed for Week.

## Bottom reach

At desktop width the Week grid is field, then reach. The reach is the thread, the question word Week, the position span, Context focus, and Capture. Those controls do not feed the landscape geometry.

## Classification

| Mark | Class | Why |
| --- | --- | --- |
| Current-day wash | C | It is the documented Today wash, and it is not a selection. On Week it identifies the same civil day as the gold line, which does not encode the minute. The full-column tint is extra authority, not an extra fact. |
| Gold Now line | A | It is the present mark for authoritative Today. Physical inspection already reads it as reference. Its Week geometry marks the day, not the minute. That limit stays recorded. The line stays. |
| Horizontal noon line | A | It is the documented shared noon line: the midpoint of the 24-hour local-clock face. It is quiet, unlabeled, and not a control. |
| Work labels | B | The kind word is how Week keeps Work identifiable. The territory already carries the shape. The painted word sits at the start edge and is optically weaker than the span. |
| Work Off | A | Off is schedule truth with no occupied interval. The footer word is the legitimate Week representation. It must not become an all-day block. |

## Smallest later refinement

Do not redesign Week. A later visual pass may:

- Remove or quiet the Week column wash and the veil behind the gold stroke, and keep the 1px Now line and `data-today`.
- Quiet the painted kind word without moving the span, without removing the word, and without changing overlap stacking.

Leave the noon line, the Work Off footer, column geometry, clock fractions, navigation, phone, Present, Day, Month, Direction, the drawer, auth, provenance, midnight, the maker’s mark, and the reach.

The file that would change is `components/orient/orient.css`. Existing presence tests for `data-today`, the present mark, the kind word, and Off should keep passing. [PRODUCTION-UI-003.md](PRODUCTION-UI-003.md) would need one sentence when the wash is actually reduced, because it currently names that wash as Today.
