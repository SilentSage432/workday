# CAPACITY-001 — Deterministic bounded Capacity reading

Date: 2026-10-05.

Baseline: `6e23e5e0d126675f7f959b06350d56f8fda14913`.

Contract: [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md).

This implements the deterministic Work Capacity reading. It does not add a production interaction, a visual expression, persistence, an allocator, or a scheduler. Orient is not operationally ready.

## Architecture

Three layers:

1. Work boundary resolution. An explicit civil date plus the complete Work rows resolve to one allocatable boundary, a legitimate absence, or an unresolved boundary.
2. Fact coverage. A resolved boundary plus Protected Time, Commitments, and Blocks becomes geometric covered intervals, or unresolved coverage.
3. Pure geometry. A positive boundary plus covered intervals becomes ordered remaining intervals and their elapsed milliseconds.

`projections/capacity.ts` owns the three pure functions. It does not know whether a read failed.

`components/capacityReading.ts` owns completeness. It withholds geometry when a required source failed or the loaded civil window does not cover the boundary. That split matches Current Temporal Orientation: the projection stays pure, and the component reading owns `SourceRead`.

Capacity does not call Timeline, Current Temporal Orientation, present-moment orientation, or Work orientation.

## Explicit question

The question is one civil date.

`resolveWorkCapacityBoundary` uses the Work row whose `workOn` is that date, together with the confirmed IANA zone. It does not receive a preselected row. It does not read the clock. It does not choose between today's row and an overnight row from the previous civil date.

An overnight shift is included only when the questioned date is the shift's own `workOn`. The next civil date is the tail of that shift. Asking the next date does not select the previous date's overnight shift. If that next date has no row, the result is a missing boundary.

More than one row for the questioned date is unresolved. The stored schedule is one state per date. The reading does not pick one.

## Boundary

A scheduled shift that maps to a positive instant interval is the boundary. `scheduledShiftBounds` supplies that interval. `shiftEndsNextCivilDate` decides whether the end is the next civil date. Both local ends use `instantFromZonedLocal`.

Off is `{ status: "none", reason: "off" }`. A missing row for the questioned date is `{ status: "none", reason: "missing" }`. Neither is zero Capacity.

A scheduled boundary whose local time does not occur once in the zone is unresolved. It is not zero.

Territory outside the boundary is not part of the reading. It is not marked unavailable.

## Completeness

Required evidence is Work, Protected Time, Commitments, and Blocks. Each must be a ready `SourceRead`. A ready empty collection is complete evidence.

The caller also supplies the inclusive civil window those reads actually loaded. The questioned date must lie inside that window. When the resolved boundary touches a later civil date, that date must lie inside the window too. An overnight shift therefore requires both civil dates.

A failed source, or a window that does not cover the boundary, is `incomplete`. Geometry is not called.

## Result

`incomplete` means required evidence failed or does not cover the boundary.

`none` means the evidence succeeded and no allocatable boundary applies. The reason is `off` or `missing`.

`unresolved` means the evidence succeeded and a relevant boundary or a fact that may meet it cannot be placed on the clock.

`reading` means the boundary and the utilizing facts resolved. It contains `remaining` and `remainingMs`. An empty `remaining` with `remainingMs` of 0 is known zero remaining Capacity. It is not `none`, `incomplete`, or `unresolved`.

## Geometry

Intervals are half-open: `[start, end)`.

Covered intervals are clipped to the boundary. Wholly external coverage is ignored. A clipped interval that is not positive is discarded. Coverage is sorted by start, then by end. Overlapping coverage merges. Endpoint-adjacent coverage merges, because the shared endpoint leaves no gap. Overlap is counted once. The ordered complement inside the boundary is the remaining territory.

The geometry result does not name the source fact. It does not choose a winner.

## All-day facts

An all-day Protected Time, Commitment, or Block covers the portion of the boundary that falls on that civil date. The civil date is midnight through the next midnight, using `instantFromZonedLocal` at `00:00`. An overnight boundary can therefore be covered on one of its two civil dates and remain open on the other.

If that midnight cannot be mapped and the civil date meets the boundary, coverage is unresolved.

## Overlap

Protected Time 12:00–13:00 and a Block 12:30–13:30 both stay true. Coverage is 12:00–13:30 once. The reading does not delete a fact, mark the overlap invalid, or add the two durations.

## Duration

`remainingMs` is the sum of the remaining instant lengths in milliseconds. It is elapsed time. It is not a count of wall-clock minute labels, a percentage, or a score.

On 2026-03-08 in America/Denver, a scheduled 01:00–04:00 boundary has two elapsed hours. The missing 02:00 hour is not remaining time. On 2026-11-01 in America/Denver, a scheduled 01:00–03:00 boundary has three elapsed hours. The repeated local hour is the existing `instantFromZonedLocal` instant. Capacity does not add a second rule for it.

## Task-associated Blocks

A Block with `taskId` and a Block with `taskId` null cover the same way: one Block interval. The Task is not a second duration. `taskId` is ignored by the geometry.

## Exclusions

Ordinary Tasks, `planned_on`, Due, Must Do, Priority, Active Thread, Notes, reminders, Pulse, and Current Context do not utilize Capacity. Week and Month are not implemented. No other Context receives a fabricated boundary.

## Unresolved boundaries

Other allocatable boundaries outside Work remain open. External temporal facts remain open. Whether any Commitment leaves discretionary room inside its own span remains open: this reading covers the whole Commitment. The interaction, Week expression, Month expression, and present-moment expression remain open. Task removal, Start, Adjust, Skip, Pulse, and reminders remain open.

## Tests

`projections/capacity.test.ts` covers geometry, fact coverage, the Work boundary, spring-forward elapsed time, the repeated fall-back hour, and the projection's independence from `SourceRead` and the other orientation projections.

`components/capacityReading.test.tsx` covers ready evidence, ready empty collections, failed reads, a window that misses the questioned date or an overnight tail, none, known zero, an unresolved fact, and the overnight example.
