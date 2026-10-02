# Temporal projection

Date: 2026-10-02.

## Decision

NOW, Timeline, Today, Pulse, and Resume presentation are pure projections. They are not tables.

The projection functions take a domain snapshot and an injected clock. They do not read the clock, the network, or the database themselves. They do not mutate truth because time passed.

Cross-group NOW order has no function yet. UI code must not invent one.

Work cadence and known Work windows live as domain constants. The Work fiscal week is a pure function of a civil date and applies only inside Work.

Instants are stored as timestamps with time zone. Calendar dates and all-day blocks are civil dates. Shift times are local times interpreted in the user's stored IANA zone.

## Context

The product requires deterministic orientation, testable time behavior, and an unfinished NOW hierarchy. Storing NOW, or sorting it inside components, would freeze an answer the product has not made. Hidden use of the server clock would make fiscal-week and all-day bugs likely.

## Consequences

- Occurrence rows are written when a period is completed or explicitly activated. The engine does not pre-build future periods, and the passage of time does not edit the definition.
- A shift pattern stays a shift. The timeline may show it beside commitments without rewriting the row.
- Passing a target and passing a deadline are different projection facts.
- Vitest covers these functions before UI tests matter.

This does not decide what a life-day is. The operational date is an input to the engine.

Full boundary: [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md).
