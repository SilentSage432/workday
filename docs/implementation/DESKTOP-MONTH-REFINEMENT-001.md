# DESKTOP-MONTH-REFINEMENT-001

Month no longer mounts a Now inside an aperture. Physical acceptance is recorded in [DESKTOP-MONTH-ACCEPTANCE-001.md](DESKTOP-MONTH-ACCEPTANCE-001.md). This record does not change that grammar further.

Baseline: `9ed629c412216ce75636b2ad1b57b90246aad3ad` on `main`. Inspection: [DESKTOP-MONTH-PHYSICAL-INSPECTION-001.md](DESKTOP-MONTH-PHYSICAL-INSPECTION-001.md). Diagnosis: [DESKTOP-MONTH-REFINEMENT-DIAGNOSTIC-001.md](DESKTOP-MONTH-REFINEMENT-DIAGNOSTIC-001.md).

## What changed

The month branch of `Landscape` no longer renders `data-present-mark`, `.orient-now`, or `aria-label="Now"`. The stroke at 50% of the aperture field was the middle of the compressed axis. `presentMinute` is null for Month, so that stroke was not the current minute. Naming the node Now told assistive technology that a coordinate existed. Hiding the stroke would have left that claim. The node is absent.

Phone Month uses the same branch, so it loses the same unsupported node. Phone Present, Day, and Exact time are untouched.

## What stayed

`data-today` and `.orient-aperture[data-today="true"]` still mark the civil date of the authoritative instant. The accepted aperture wash stays. Week still mounts its civil-day present mark. Day still places Now on the 24-hour clock. Present is unchanged.

The compressed axis, its three-hour floor, its 8% pad, and the printed legend stay. A full local day still omits that legend. Direction, the 7×4 window, territory, overlap, Work Off, empty dates, Ask Day, and the reach stay.

Orient does not display more temporal precision than the resolution can support. Month can say which aperture is Today. It does not place the instant inside that aperture.

## State

Accepted Month grammar is unchanged aside from this removal. The midpoint Now claim is gone. Desktop Month — physically accepted.
