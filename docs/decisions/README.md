# Decisions

Record a decision here only after it is actually made.

FOUNDATION-001 through FOUNDATION-003 wrote product truth into the canonical documents and the discovery ledgers. They did not add architecture ADRs.

ARCHITECTURE-001 recorded the runtime, persistence, projection, and delivery decisions:

- [2026-10-02-application-runtime.md](2026-10-02-application-runtime.md)
- [2026-10-02-persistence-and-auth.md](2026-10-02-persistence-and-auth.md)
- [2026-10-02-temporal-projection.md](2026-10-02-temporal-projection.md)
- [2026-10-02-boundaries-and-delivery.md](2026-10-02-boundaries-and-delivery.md)
- [2026-10-02-context-and-task-storage.md](2026-10-02-context-and-task-storage.md)
- [2026-10-02-active-thread.md](2026-10-02-active-thread.md)
- [2026-10-02-work-schedule.md](2026-10-02-work-schedule.md)
- [2026-10-02-deterministic-intelligence.md](2026-10-02-deterministic-intelligence.md)
- [2026-10-02-icon-vocabulary.md](2026-10-02-icon-vocabulary.md)
- [2026-10-02-today.md](2026-10-02-today.md)
- [2026-10-02-protected-time.md](2026-10-02-protected-time.md)
- [2026-10-02-blocks.md](2026-10-02-blocks.md)
- [2026-10-02-commitments.md](2026-10-02-commitments.md)
- [2026-10-02-timeline-composition.md](2026-10-02-timeline-composition.md)
- [2026-10-02-day-canvas.md](2026-10-02-day-canvas.md)
- [2026-10-02-direct-time-selection.md](2026-10-02-direct-time-selection.md)
- [2026-10-03-temporal-meaning-choice.md](2026-10-03-temporal-meaning-choice.md)
- [2026-10-03-contextual-temporal-handoff.md](2026-10-03-contextual-temporal-handoff.md)
- [2026-10-03-explicit-temporal-establishment.md](2026-10-03-explicit-temporal-establishment.md)
- [2026-10-03-current-temporal-orientation.md](2026-10-03-current-temporal-orientation.md)
- [2026-10-03-quick-capture.md](2026-10-03-quick-capture.md)
- [2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md)
- [2026-10-04-note-representation.md](2026-10-04-note-representation.md)
- [2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md)
- [2026-10-04-present-moment-orientation.md](2026-10-04-present-moment-orientation.md)
- [2026-10-04-product-name.md](2026-10-04-product-name.md)
- [2026-10-04-note-revisit.md](2026-10-04-note-revisit.md)
- [2026-10-04-provenance-contract.md](2026-10-04-provenance-contract.md)
- [2026-10-05-task-time-contract.md](2026-10-05-task-time-contract.md)
- [2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md)
- [2026-10-05-week-contract.md](2026-10-05-week-contract.md)
- [2026-10-05-direction-contract.md](2026-10-05-direction-contract.md)

The architecture those records point at is [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). Unresolved implementation details do not get speculative ADRs.

[2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md) is the current operational-adoption boundary. It records questions it does not answer. [../discovery/FOUNDATION-003.md](../discovery/FOUNDATION-003.md) stays the historical product ledger. [../discovery/DISCOVERY-CANON-001.md](../discovery/DISCOVERY-CANON-001.md) records later semantic discovery. It is not an implementation decision.

## What belongs here

A future decision record should state:

- the decision
- the date
- the context that forced the choice
- the consequences for product truth and for implementation

Add a record when a choice would otherwise live only in conversation history: a domain semantic that discovery left open, a notification rule, a persistence approach, an authentication approach, a voice mechanism, or a hosting model.

## What does not belong here

- Open questions answered by speculation. Product questions remain visible in [../discovery/FOUNDATION-003.md](../discovery/FOUNDATION-003.md) and, for the adoption boundary, in [2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md). Architecture questions that were left open are listed in [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). Earlier discovery files stay historical.
- Preferences that have not been adopted. Next.js, React, TypeScript, Tailwind, Supabase, and Vercel are decisions as of ARCHITECTURE-001, within the limits those records state. A speech vendor, a push vendor, and a shared database are not preferences to revive.
- Options, vendor comparisons, and proposed architectures written in advance of a choice.

If a canonical document must change because of a decision, update that document in the same change as the decision record.
