# Commitments

Date: 2026-10-02.

## Decision

A Commitment is time constrained by something the user has committed to.

Protected Time means: "I have made this time unavailable for allocation."

A Block means: "I have chosen what this time is for."

A Commitment means: "This time is constrained by something I have committed to."

Those facts are independent. Creating, editing, or removing one does not change the other. They may overlap.

## Context

Protected Time says the time is unavailable for allocation. A Block says what the user chose the time for. Neither says that the time is constrained by an established commitment. A dentist appointment and a chosen TeamLab block can look similar on a clock and still be different facts.

A Commitment is not a Task, not Today, and not a Work shift. The existing Work schedule stays the Work-specific primitive. A later Timeline may present a shift beside a Commitment. This decision does not copy shift rows into `commitments`.

A Commitment can be named without a Context. "Dentist" is enough. Optional Context on a Block does not justify the same column here.

## Provenance

`origin` is separate from the title and from `kind`. A Commitment created in this application is `user_created`, the same word Tasks already use for a fact the user entered here. The check constraint allows only that value. Widening it is a later migration, as it is for Tasks.

The column exists so the model does not claim that every future Commitment was typed into this application. It does not add a Google event id, a calendar id, a sync token, or a write-back rule. Those belong to an external-source tranche that does not exist yet.

Every row this tranche can store was created here, so this application may edit and remove it. When an external source arrives, that source's authority decides what may be edited, deleted, or only observed. That question stays open.

## Consequences

- `commitments` is its own table. It is not a generic event table and it does not share rows with `protected_time`, `blocks`, or the Work schedule.
- Title is required, at most 80 characters, and written by the user. There is no category, status, note, location, or attendee list.
- There is no `context_id` and no Task association.
- All-day is a civil date. Timed is local start and end on a civil date, read in the confirmed IANA zone. An end at or before the start continues into the next civil date only.
- A later confirmed-zone change reinterprets these local times. External calendar time-zone provenance is not solved here.
- A stored local time that cannot be mapped to an instant is unresolved while its civil date can still contain the interval. If that date is already before yesterday, the row is past, because a timed interval cannot stay open further than the next civil date. That reading does not invent an instant.
- Overlaps are kept. Nothing recurs. Past rows stay stored and stay off the default Schedule list.
- Schedule shows Commitments as another section. That stack is scaffolding. The later direction is one temporal canvas composed from these distinct facts. This decision does not build that canvas.
- Timeline and capacity are not calculated.

The interaction is in [../implementation/V0-008.md](../implementation/V0-008.md).
