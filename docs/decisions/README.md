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

The architecture those records point at is [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). Unresolved implementation details do not get speculative ADRs.

## What belongs here

A future decision record should state:

- the decision
- the date
- the context that forced the choice
- the consequences for product truth and for implementation

Add a record when a choice would otherwise live only in conversation history: a domain semantic that discovery left open, a notification rule, a persistence approach, an authentication approach, a voice mechanism, or a hosting model.

## What does not belong here

- Open questions. Product questions remain in [../discovery/FOUNDATION-003.md](../discovery/FOUNDATION-003.md). Architecture questions that were left open are listed in [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). Earlier discovery files stay historical.
- Preferences that have not been adopted. Next.js, React, TypeScript, Tailwind, Supabase, and Vercel are decisions as of ARCHITECTURE-001, within the limits those records state. A speech vendor, a push vendor, and a shared database are not preferences to revive.
- Options, vendor comparisons, and proposed architectures written in advance of a choice.

If a canonical document must change because of a decision, update that document in the same change as the decision record.
