# WEEK-001 — Deterministic Week shape reading

Date: 2026-10-05.

Baseline: `06f34d6d23dc38e04f885aba1b238df11d305521`.

Contract: [../decisions/2026-10-05-week-contract.md](../decisions/2026-10-05-week-contract.md).

This implements the deterministic Week shape reading. It does not add a production interaction, a visual expression, a page, a route, persistence, or a week-boundary policy. Orient is not operationally ready.

## Architecture

Two layers:

1. `projections/weekShape.ts` binds an explicit half-open civil range to `projectTimeline` and returns that range with Timeline's facts. It does not place shifts, Protected Time, Commitments, or Blocks. It does not know `SourceRead`.
2. `components/weekReading.ts` owns evidence completeness. It withholds Timeline until Work, Protected Time, Commitments, and Blocks are ready and the declared load covers the span Timeline can see. That split matches Capacity and Current Temporal Orientation.

Week does not call Capacity, Current Temporal Orientation, present-moment orientation, or Work orientation. It does not infer current Context.

## Explicit question

The caller supplies `{ startsOn, endsBefore }`, the confirmed IANA zone, the four source reads, and the inclusive civil window those reads actually loaded.

`startsOn` is included. `endsBefore` is excluded. The range is not today, this week, or now. The reading does not read the clock. It does not select the Work fiscal week, Monday–Sunday, or Sunday–Saturday.

The complete result carries the canonical range that was answered.

The Week contract permits an explicit bounded civil-date range and leaves life-wide week-boundary selection unresolved. It does not require seven civil dates. This reading does not add that constraint. An invalid range is not rewritten into a different week. A date that is not `YYYY-MM-DD`, or not a real calendar day, throws from the existing civil-date parser. A range whose start is not before its end throws the same error Timeline throws: "A timeline range must start before it ends."

## Participating sources

The facts are Timeline's facts:

- a scheduled Work shift
- Protected Time
- a Commitment
- a Block

A Task-associated Block is that Block. `taskId` travels with it. The Task is not a second fact.

Ordinary Tasks, `planned_on`, Due, Must Do, the Active Thread, Notes, Priority, Destination, Cadence, recurring obligations, Capacity, reminders, and Pulse are not inputs.

## Completeness

Required evidence is Work, Protected Time, Commitments, and Blocks. Each must be a ready `SourceRead`. A ready empty collection is complete evidence. A failed source is incomplete. The successful subset is not passed to Timeline.

The caller also supplies the inclusive civil window those reads actually loaded. Completeness is that declaration. It is not inferred from which dates happen to appear in the arrays. A missing Work row inside a complete window remains a missing row.

## Loaded window

`weekLoadedSpan` is the inclusive civil span the window must cover.

Timed truth continues at most into the next civil date, so the civil day before `startsOn` is the whole look-behind. The last included day is the civil day before `endsBefore`. A fact owned on the exclusive end date does not meet the range. An overnight tail of a fact owned on the last included day is stored on that day. The window therefore runs from the day before `startsOn` through the last included day. A wider window is still complete. A window that misses the look-behind, or the last included day, is incomplete, even when an overnight row is already sitting in the array.

This is the Timeline loading contract. It is not a new one.

## Result

`incomplete` means a required source failed, or the declared window does not cover the span.

`complete` means the evidence succeeded. `facts` are the Timeline facts that meet the range, in Timeline's order, with Timeline's identities, placement, and overlap. The result has no duration total, utilization, rank, or Capacity field.

A fact Timeline cannot place stays in that list with Timeline's unresolved bounds and intersection. The reading does not add a top-level unresolved status, and it does not invent an instant.

## Nothing established

A complete reading whose `facts` are empty means no established temporal structure from the participating sources meets the bounded period.

It does not mean free, available, allocatable, unused Capacity, or safe to schedule. The reading does not emit an empty, busy, occupied, or available fact.

## Work

A scheduled shift remains a Work fact. Work Off produces no fact. A missing Work row produces no fact. Neither becomes available, Protected Time, empty structure, or Capacity. The explicit range is the question boundary. It is not a Capacity boundary, and it is not inferred from Work.

## Overlap

Overlap stays as Timeline left it. Work, Protected Time, a Commitment, and a Block that cover the same territory are four facts. Week does not choose a winner, union them, split one around another, rank them, infer conflict, or add their durations.

## Time

Placement, clipping, overnight continuation, the spring-forward gap, and the repeated fall-back hour are Timeline's. On 2026-03-08 in America/Denver, a 01:00–04:00 shift remains two elapsed hours. On 2026-11-01 in America/Denver, a 01:00–03:00 commitment remains three elapsed hours under `instantFromZonedLocal`. Week adds no minute-of-day rule.

## Exclusions

No Week page, route, grid, gesture, color, or navigation. No Month. No recurrence. No weekly Capacity. No schema, migration, or dependency. No universal week boundary. No current Context.

## Unresolved

Production Week interaction and visual expression. How a life-wide or default Week boundary is selected. Whether Week later exposes `planned_on`, Due, or Must Do without giving them territory. Week expression of individual Capacity readings. Recurrence's later participation. Month. Multi-context behavior. The final phone experience and the final desktop experience.

## Tests

`projections/weekShape.test.ts` covers Timeline reuse, the explicit range, an empty composition, overlap, a Task-associated Block, spring-forward, fall-back, an unplaceable local time, Work Off, a rejected inverted range, and the projection's independence from `SourceRead`, Capacity, and the Work fiscal week.

`components/weekReading.test.ts` covers ready empty evidence, each source kind, all four together, overlap, the Task reference, each failed source, a window that misses the look-behind, a non-fiscal range, Work Off, a missing Work row, an overnight shift, both DST dates, and the absence of a Capacity field or a synthetic empty fact.
