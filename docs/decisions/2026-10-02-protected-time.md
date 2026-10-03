# Protected Time

Date: 2026-10-02.

## Decision

Protected Time is time the user has deliberately made unavailable for allocation.

Protected does not mean occupied. Protected means unavailable for allocation.

Availability is established, not assumed. Unscheduled time must not automatically be interpreted as allocatable time.

Work Off is not Protected Time and does not imply availability.

## Context

The product is moving toward planning in which unavailable time is established before discretionary work is allocated. Blocks, Commitments, Timeline, and capacity are not that fact. Work Off only says that no Work shift is scheduled.

## Consequences

- `protected_time` stores one explicit entry. It is not a generic event table.
- An all-day entry is the civil date. A timed entry is local start and end on a civil date, read in the confirmed IANA zone. An end at or before the start continues into the next civil date.
- A label is optional user text. There is no category enum and no Context.
- Overlaps are kept. Nothing recurs. Past rows stay stored and stay off the default Schedule list.
- Creating or removing Protected Time does not write a Task, Today, the Work schedule, or the Active Thread.
- A Block remains time the user reserves for a purpose. A Commitment remains fixed or external time. Neither is implemented here. Capacity is not calculated.

The interaction is in [../implementation/V0-006.md](../implementation/V0-006.md).
