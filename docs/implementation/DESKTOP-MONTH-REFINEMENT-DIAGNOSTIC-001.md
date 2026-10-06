# DESKTOP-MONTH-REFINEMENT-DIAGNOSTIC-001

Diagnostic only. No runtime behavior changed. Month is not physically accepted.

Human inspection passed the 28-day landscape, Direction, compression as a concept, territory, Work Off, empty dates, date grammar, the reach, the maker’s mark, and the Today aperture wash. It did not accept the midpoint gold stroke. It asked what the clock-range line under the window heading is.

Baseline: `9ed629c412216ce75636b2ad1b57b90246aad3ad` on `main`. Prior inspection: [DESKTOP-MONTH-PHYSICAL-INSPECTION-001.md](DESKTOP-MONTH-PHYSICAL-INSPECTION-001.md).

## Clock-range label

The heading `Oct 6 – Nov 2` is `DesktopWindow`. The line under it is not that heading.

`Landscape` builds one shared axis with `monthClockAxis` from every timed placement in the twenty-eight dates. It prints that axis only when the axis is shorter than the full local day:

```tsx
<p className="orient-axis" data-clock-axis="true">
```

`clockLabel` floors each endpoint to a local-clock minute and formats it with `formatLocalTimeLabel`. A reading of `4:34 AM – 5:55 PM` is minute 274 through minute 1075 of that axis. Those minutes are not a second clock. They are the axis the apertures already use.

The axis is the earliest and latest established timed minute in the window. If that span is shorter than three hours, it is widened around its middle to three hours, then shifted back inside the local day. Eight percent of that span is then added at each end, still clamped to the local day. The printed times include that pad. They are not the raw start and end of the earliest and latest fact.

`monthVisualSpan` maps every aperture with those same endpoints. The top of every temporal field is the printed start. The bottom is the printed end. The label is the legend for that shared vertical coordinate.

The minutes come from `zonedLocalClock` on each fact, in the confirmed zone. The label formats those clock minutes. It does not sample the current instant.

An empty timed window keeps minute 0 through minute 1440, and the paragraph is omitted. Week never builds this axis, because Week keeps the full local-day face.

The paragraph is not a control. Pointer shifting is on the month grid, not on this line.

`temporalOrigin.test.ts` and `orientView.test.tsx` lock the numeric axis. [PRODUCTION-UI-003.md](PRODUCTION-UI-003.md) names the earliest-to-latest mapping, the three-hour floor, and the 8% pad. The visible sentence is that axis, written out.

Classification: semantically required and physically appropriate. Preserve it, including its absence on a full-day axis.

## Today wash

`.orient-aperture[data-today="true"]` paints the wash. `data-today` is true when the civil date equals authoritative Today. The wash does not depend on the present-mark node. Human inspection accepted it as “this civil-date aperture is Today.” It stays. Month does not inherit Week’s vertical line.

## Midpoint stroke

The month branch of `Landscape` mounts `<div data-present-mark="true" className="orient-now" aria-label="Now" />` only on Today’s aperture. `.orient-aperture .orient-now::after` draws a 1px gold stroke at `top: 50%` of the aperture field. `pointer-events: none`. Nothing reads it for a click, a shift, or Return to Now. Return to Now looks for `.orient-clock [data-present-mark]`.

`presentMinute` returns null for Month. `monthClockAxis` and `monthVisualSpan` do not read the node. Fifty percent of the field is the middle of the compressed axis. It is not the current local minute. It is noon only when that axis happens to place noon at its middle.

The wash already names the civil date. The stroke adds an intra-day position Month does not have. The element’s own faint veil is part of that node, not the accepted aperture wash.

`orientView.test.tsx` requires `data-present-mark` on Month’s Today cell. That expectation records the node. It does not prove the stroke is a minute.

The accessible name is Now. A screen reader is told that a Now exists. The geometry does not locate it. Removing the stroke and keeping the named element would keep the false claim. Today’s civil date is already the Ask Day name. `data-today` is not spoken. No separate accessible “today” is required to justify leaving a node called Now.

Classification of the stroke and of that accessible name: semantically misleading. They claim a precision Month does not represent.

## Resolutions

Present lets authoritative Now own the composition. Day may place Now on a real 24-hour axis. Week’s gold line marks the civil day and does not mark the minute. Month can mark Today with the aperture wash. A coordinate on the compressed axis would claim an intra-day Now the axis is not showing. That reading matches the code and the Month contract’s refusal to become a minute canvas.

## Phone

Phone Present and Day do not use this aperture. Phone Month does. The node and the stroke are in the shared month branch, not under `.orient-desktop-resolution`. Hiding the stroke only on desktop would leave phone Month saying Now. The correction belongs to Month at both forms. It must not touch phone Present, Day, or Exact time.

## Later pass

Preserve the clock-range label and the aperture wash. Do not render Month’s present-mark element. Do not retitle it Now. Do not place a stroke on the current minute.

The runtime file is `components/orient/Landscape.tsx`, month branch only. The aperture wash rule stays. Week’s present mark stays.

`orientView.test.tsx` should expect `data-today` on Month’s Today and no `data-present-mark` there. A Week assertion should keep Week’s present mark, so the shared landscape cannot lose it. The day-clock Now test stays.

[PRODUCTION-UI-003.md](PRODUCTION-UI-003.md) already describes the wash and the axis. It does not need a stroke sentence until a later pass records that Month no longer mounts Now.
