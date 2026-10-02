# Work schedule and time zone

Date: 2026-10-02.

## Decision

The user's personal Work schedule is one state per civil date.

A missing row means no schedule has been entered. An Off day is a stored row with no start, end, or shift type. A scheduled day stores a local start, a local end, and one explicit shift type: Opening, Mid, or Closing. The user chooses the type. The clock does not.

If the end time is earlier than or equal to the start time, the shift continues into the next civil date. The stored times are not swapped and are not turned into a zero-length shift.

Local times are interpreted in one IANA time zone the user confirms. That zone lives on `temporal_settings`, with the instant of confirmation. The browser may suggest a zone. It is not saved until the user confirms it. There is no broader profile.

These rows are not a calendar, a Commitment, a Block, or a store schedule. Shift position is not stored. A pure projection reports unknown, Off, or a scheduled shift, and for a scheduled shift whether a supplied instant is before, during, or after its bounds. During includes the start and excludes the end.

## Context

The phone made the permanent Capture form compete with Resume. That interaction change does not need a new table. The schedule does. ARCHITECTURE-001 already required local shift times and an explicit IANA zone, and it kept the Lowe's week inside Work. The product had not chosen how Off differs from a blank day, or what an end earlier than the start means.

One shift or Off per Work date matches the schedule the user actually described. Split shifts are not in evidence.

## Consequences

- Capture stays an interaction. It does not write the schedule, and saving a Task does not change the Active Thread.
- Family, TeamLab, and Financial do not gain shift types.
- Work cadence, Power Hour, and obligation deadlines are not projected from this table.
- A later version can add a second shift on one date only by changing the primary key. V0 cannot store that.
- An ambiguous local time, such as a repeated hour when clocks fall back, resolves to whichever instant the zone conversion round-trips first. A local time that does not occur is rejected by the projection rather than shifted silently into another hour.

The schema and the phone-driven Capture change are in [../implementation/V0-003.md](../implementation/V0-003.md).
