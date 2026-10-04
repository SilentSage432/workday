# Time model

The product is time-aware. Time is context, not judgment. An intended cadence that was interrupted is not a failure. The product helps the user resume. It does not use punitive framing merely because an intended step happened later than planned.

Undesirable framing includes "OVERDUE BY 62 MINUTES," "YOU ARE BEHIND," and "FAILED," unless a future explicit requirement genuinely needs factual overdue status. Even then, presentation stays factual rather than judgmental. Passing a preferred target does not silently create a hard deadline.

No complete universal temporal ontology is defined here.

## System-level time

The product needs to be able to represent temporal facts such as:

- absolute clock time
- calendar date
- planned periods
- deadlines
- targets
- objectives
- recurring periods
- time structures that belong to a particular Context
- relative cadence position, where a cadence has one

This list is not a finished model. It does not create a universal week, a universal day boundary, or routines for Family, TeamLab, or Financial.

Commitments, Blocks, reminders, and external calendar facts are further temporal facts. They are defined in [DOMAIN.md](DOMAIN.md). Timeline composes established temporal facts without erasing their differences. See [PRODUCT.md](PRODUCT.md).

The civil day used by Today is the calendar date of a supplied instant in the confirmed IANA time zone. It is not the UTC date and not the server's local date. A browser suggestion is not that confirmed zone.

**Unresolved:** which of these facts are universal and which exist only inside a Context; what constitutes a day beyond that confirmed civil date; how system-level Today interacts with a Context cadence; and how a Work shift's start and end interact with the rest of that day.

## Obligated and chosen time

Some time is externally constrained or obligated. Some time is deliberately chosen and protected.

A Commitment means this time is constrained by something the user has committed to. A Block is the chosen case. A Work shift remains a Shift with a type and a cadence. Timeline presents that shift beside a Commitment as Work Schedule truth. It must not flatten those facts into one generic event, and it does not store a shift as a Commitment row.

Obligated does not mean more important. Chosen does not mean optional. The user establishes what deserves protection. Protected time with the user's children is not a checklist and is not a lesser kind of time because nobody else imposed it.

Availability is established, not assumed. Unscheduled time must not automatically be interpreted as allocatable time. Protected Time is time the user has deliberately made unavailable for allocation. It is not a statement that the rest of the day is free. Protected does not mean occupied. A Block is a separate fact: time the user has chosen a purpose for. It does not make that time protected, and it does not calculate what remains.

Planning against temporal reality is part of the intended production system, in this order: protect time, acknowledge existing Commitments, choose what remaining time is for, then plan Tasks against actual temporal reality. Capacity blocks operational adoption until its meaning is resolved. That meaning is not resolved here. This paragraph is not an allocator, not a definition of availability, and not a Task-allocation rule. Timeline does not calculate Capacity. The contract is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

Timeline composes temporal truth. It does not resolve temporal truth. Time is the underlying space. Multiple established truths may describe the same time without one canceling the others. Nothing established is not the same as available. V0-009 projects a scheduled Work shift, Protected Time, a Block, and a Commitment across a requested civil range. V0-010 draws one selected civil day of that projection. Empty canvas space is not available time. V0-011 lets the user point at a local clock span on that day. The user manipulates time before establishing what that time means. V0-012 lets the user name the intended kind for that span. V0-012A keeps the question on the canvas and lets the same span be refined by the minute. Gesture snapping at 15 minutes is an interaction limit, not the precision of a stored local time. The span and the kind are transient interaction state until the user explicitly establishes them. V0-013 writes a Protected Time, a Block, or a Commitment through those existing facts, and only from that action. Overlap with an established fact does not close the territory or become a conflict. The decisions are [docs/decisions/2026-10-02-timeline-composition.md](docs/decisions/2026-10-02-timeline-composition.md), [docs/decisions/2026-10-02-day-canvas.md](docs/decisions/2026-10-02-day-canvas.md), [docs/decisions/2026-10-02-direct-time-selection.md](docs/decisions/2026-10-02-direct-time-selection.md), [docs/decisions/2026-10-03-temporal-meaning-choice.md](docs/decisions/2026-10-03-temporal-meaning-choice.md), [docs/decisions/2026-10-03-contextual-temporal-handoff.md](docs/decisions/2026-10-03-contextual-temporal-handoff.md), and [docs/decisions/2026-10-03-explicit-temporal-establishment.md](docs/decisions/2026-10-03-explicit-temporal-establishment.md).

If a Block's clock time arrives and life is different, the user remains authoritative. The product favors Start, Resume, Adjust, and Skip over judgment. Exact effects of Start, Adjust, and Skip are not defined. Resume is defined in [PRODUCT.md](PRODUCT.md).

The product should make elapsed time, current position, the next Commitment, the intended Block, and the open interval before the next fixed Commitment legible when that helps orientation. That requirement is not permission to nag. Notification overload is a failed design. No Pulse cadence is defined.

## External temporal sources

An external temporal source supplies time-related facts and keeps provenance. The product must not silently claim ownership of those facts.

Google Calendar is the first identified source. The user already uses it. A Google Calendar event may later be represented as a Commitment and participate in Timeline, NOW, and Pulse. Reading that truth and writing back to the calendar are separate authority decisions. Neither direction, nor any API or account model, is chosen.

A Commitment entered in this application is stored with origin `user_created`. Google Calendar is not connected. No event id, sync token, or write-back is stored. When an external source exists, that source keeps authority over edit and delete. That authority is not decided here.

Wealth Engine and DeptSync are other systems in the user's ecosystem. Each keeps authority over its own truth. No integration is authorized. This product coordinates time and attention. It does not need to become those systems.

## Work-context clocks

Three clocks were discovered in Work. They remain valid there. They are not the time model of the whole product. They do not apply themselves to life outside Work.

### Shift clock

The shift clock is where the user is inside today's scheduled Work shift.

Named positions:

- start of shift
- early shift
- lunch
- afternoon
- final hour
- closeout

The Work schedule supplies today's start, end, and shift type. See [PRODUCT.md](PRODUCT.md). V0-003 stores those facts. V0-004 can say whether a supplied instant is before, during, or after the operative shift, including a shift that continues after midnight. It does not define the phase boundaries below. Remaining shift time is a Work fact NOW should eventually be able to reflect while that shift is underway.

**Unresolved:** the boundaries of these positions. No durations or clock times are defined for them. "Lunch" has no established time. These labels are a Work form of relative position, not a required shape for every Context.

### Store clock

The store clock names operational periods that exist whether or not the user is on shift. It is a Work clock.

Known period:

**Power Hour, 10:00 AM → 2:00 PM.**

Power Hour is a Work Window. It is not a universal system Window. During Power Hour the intended Work condition is customer focus rather than task focus. Tasks do not disappear during Power Hour. The Active Thread remains, and the product can offer Resume when the user becomes available. V0-004 projects that Window as before, during, or after on the civil date of a supplied instant. It does not clear the thread when the Window begins.

### Week clock

The employer uses a fiscal week that begins on Saturday:

**Saturday → Sunday → Monday → Tuesday → Wednesday → Thursday → Friday**

Inside Work, this must not be silently normalized to a Monday-first week.

This week does not redefine the user's universal calendar. Google Calendar does not either. No universal week shape is established, and the Lowe's week must not be copied onto Family, TeamLab, or Financial.

The user's current Work operating strategy, which the product should be able to tell apart from deadlines:

| Span | Strategy |
| --- | --- |
| Saturday | Fiscal week begins. Weekend, customer, and sales focus. |
| Sunday | Useful opportunity to begin orienting and preparing work for the coming execution days. |
| Monday–Thursday | Primary runway for department task execution: pack-down, zoning, filling homes, preparing bays, manager obligations, and discovered operational work. |
| Thursday | Desired department readiness boundary. This is an objective, not a deadline and not a Task. |
| Weekend | Ideally emphasize sales and customer readiness rather than catching up on unfinished task work. |

This is the user's Work strategy, not a scoring policy, not a life calendar, and not a set of automatic penalties.

**Unresolved:** how the product reflects this strategy inside Work. See [CADENCE.md](CADENCE.md).

## Deadlines, targets, and objectives

These are different system-level meanings. Do not collapse them. Every established instance below was discovered in Work. That does not make the meanings themselves retail-only, and it does not create matching instances outside Work.

| Kind | Meaning | Established instance |
| --- | --- | --- |
| Deadline | A completion boundary associated with a requirement | Bay Audits: Wednesday. Cycle Counts: Friday. Both use the Lowe's fiscal week. |
| Target | A preferred completion point. It may be earlier than a deadline. It does not become a deadline on its own. | Bay Audits: early. Cycle Counts: well before Friday. FSR: morning-clock target, intended before approximately 10:00 AM, with an outer expectation of approximately 11:00 AM. |
| Objective | A desired operating condition. It is not automatically a Task and is not a checkbox. It may contextualize Tasks. | Thursday department readiness, so weekend Work attention can emphasize customers and sales. Weekend sales and customer readiness. Power Hour customer focus. |

Availability is a further timing fact for the known Work obligations: Bay Audits and Cycle Counts become available on the weekend. Availability is not a deadline.

Do not harden "approximately," "early," or "well before" into exact clock rules. Do not silently convert a target or an objective into a hard deadline.

Destination, defined in [DOMAIN.md](DOMAIN.md), is not another row in this table. A Destination is where the user is deliberately trying to take some part of life or reality. It is not a Deadline, not a Target, and not an Objective. Thursday readiness remains an Objective. Full Shelf Replenishment's morning language remains a Target. Neither is reclassified as a Destination. The boundary among Destination, Objective, and Target, beyond that refusal to collapse them, is unresolved.

**Unresolved:** how the product shows the distinction. FSR's two morning points are both part of its absolute target language. They are not reclassified here as a deadline plus a target, and they are not given a fourth temporal kind. Thursday readiness is a Work objective, not a Task.

## Absolute time and relative position

The product supports absolute clock time. It also supports relative cadence position where a cadence has one. They are not interchangeable.

**Absolute time** stays put when a shift start changes. Work cases:

- Power Hour, 10:00 AM → 2:00 PM, a Work Window
- Full Shelf Replenishment, a Work opening responsibility whose target is on the morning clock: intended before approximately 10:00 AM, outer expectation approximately 11:00 AM. This is not modeled solely as a number of minutes after shift start. Different opening shifts may begin at different times while that clock expectation still applies.
- Entered shift boundaries, such as 6:00 AM → 3:00 PM
- Fiscal weekdays for Work obligation deadlines, including Wednesday and Friday
- The Saturday-first order of the Lowe's fiscal week, inside Work only

**Relative position** describes a place inside a cadence or, in Work, inside a shift. Work examples include start of shift, early shift, final hour, and closeout. Lunch and afternoon remain named shift-clock positions from earlier discovery. Exact boundaries for relative phases are not defined. Do not copy shift phases into Contexts that have no shift.

## What this is for

When the user is in Work, the three clocks locate the shift, the store day, and the fiscal week. They are one Context's time structure.

They do not answer NOW for the whole product by themselves. NOW's first question is which Context is operating. They do not set a universal week. A clock phase does not replace the Active Thread.

They do not, by themselves, decide notifications, shame the user for an interrupted plan, or assign store work to this user.
