# Project context

This is a personal, single-user, time-aware cadence and orientation system. The repository is named `workday`. The product name is unresolved. See [Naming](#naming).

The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

## Purpose

A directional statement, not final copy:

> The system helps the user understand where they are in their day, what currently matters, what they intended this time for, what they were doing before interruption, and what comes next.

An earlier directional statement remains compatible: externalize the user's intentions, remember what matters, and help the user return to their intended course when life interrupts them.

The still earlier sentence, "externalize my work cadence… when the workday interrupts me," remains true of the Work Context. It is not the purpose of the whole product.

Work was the first deeply discovered Context, and the environment from which many temporal semantics were learned. It is not the architectural center of the product. The intended product is a multi-context temporal foundation: a system for how the user operates in time. How a Context becomes current is unresolved.

The user generally knows what they intend. The problem is staying oriented in time, and remembering what they notice instead of keeping it only in memory. The product is an external memory and orientation surface. Sophistication comes from a small set of explicit relationships, not from feature count.

## Naming

`workday` is only the repository and folder name from initial discovery. "Workday" is not the canonical product name. No final name is chosen here. Do not rename the folder in this tranche.

Historical documents and the user's original principle quote use "Workday." That is evidence of what the effort was called, not a naming decision.

## User and problem

The user wants the system to be useful for their overall daily cadence, not only for employment. They have two children.

Life outside Work, as actually stated, includes temporal responsibilities around:

- school
- school activities
- appointments
- family responsibilities
- intentionally protected time with their children
- caregiving reminders the user has established
- budgeting and financial stewardship
- TeamLab project and building time

Those are facts, not routines. No morning, evening, health, or home sequence is established. No ages, names, schools, schedules, or medical regimen is established beyond the reminder examples in [Caregiving boundary](#caregiving-boundary).

### Work

Work is the Lowe's retail management environment discovered first. Known department context for walking and capture is Home Decor and Flooring. Known workplace vocabulary includes Lowe's Safe Review, Full Shelf Replenishment, Manager Portal, pack-down, zoning, homes, and bays. No store number, job title, or org chart is established.

Within Work, the user frequently notices needed work while walking the department and currently keeps what they notice in memory. Orientation is lost through ordinary conditions: customer interruptions, associate questions, manager responsibilities, calls, overrides, store responsibilities, unexpected operational problems, and changing priorities.

Those conditions are evidence about Work. They are not a catalog of the user's whole life. Work detail remains in [CADENCE.md](CADENCE.md) and [TIME_MODEL.md](TIME_MODEL.md).

### Family, TeamLab, and Financial

Family is the user's responsibilities and intentionally protected time involving their children, including school, activities, appointments, family time, and user-established caregiving reminders.

TeamLab is time intentionally devoted to TeamLab projects and building. No TeamLab routine is established.

Financial is time intentionally devoted to budgeting and financial stewardship. The product does not own financial truth. Wealth Engine, if it holds that truth, remains authoritative for it. No integration is designed.

These Contexts are not silos. They are not an exhaustive list. There is no generic Personal Context.

## Caregiving boundary

Family includes time-sensitive caregiving responsibilities. The system may represent reminders the user has explicitly established. Examples the user named: pod-change reminders, Dexcom-related reminders, and doctor appointments.

The system must not independently interpret medical data, make treatment decisions, calculate treatment, alter care timing, infer medical urgency, or prescribe action. Its role is temporal organization and orientation around responsibilities the user has already established. This project is not medical software.

## Environment

The system is not contained by a shift. A shift is a Work fact. Other Contexts need not have shifts. Do not force the rest of life into employment-style shifts.

Some time is externally constrained. Some time is deliberately chosen and protected. The system represents both. Obligated time is not thereby more important, and chosen time is not thereby optional. The user decides what deserves protection.

Inside Work, time is also structured by store operational periods and by a Saturday-first Lowe's fiscal week. That fiscal week must not redefine the user's universal calendar. See [TIME_MODEL.md](TIME_MODEL.md).

The user already uses Google Calendar. Existing calendar truth should be able to participate later without duplicate entry as the only path. Google Calendar remains an external authority. This product must not silently claim ownership of those facts. No calendar API, account, or sync direction is chosen.

How the user intends to move through a meaningful period or Context is a cadence. The same primitive is also recurring attention and execution that can maintain conditions that matter to a Destination. Opening, Mid, and Closing are Work cadences. No cadence is established for Family, TeamLab, or Financial. See [CADENCE.md](CADENCE.md).

Interruptions are normal. Time is context, not judgment. If a planned Block begins and reality differs, the user remains authoritative. The product must not use scoring, streaks, or punitive overdue language merely because a plan was interrupted.

## Product boundaries

The product coordinates time and attention. It does not need to own every source of truth.

Each source system retains authority over its own truth. This product may eventually consume appropriately scoped temporal or attention facts, with provenance. No integration is authorized now, and no API is designed, for:

- Google Calendar, beyond the product boundary that its facts can participate later
- DeptSync, which remains a separate system about department operations and distributed departmental work
- Wealth Engine, which remains authoritative for its financial truth

Employer-owned work facts stay authoritative in their own systems. Some store responsibilities belong to other people, including the closing management team. The product must not turn every store responsibility into this user's task.

It is outside the product:

- managing the user's life for them
- a generic to-do application, including products in the shape of Todoist or Things
- a notes workspace in the shape of Notion
- a generic calendar that replaces an external calendar
- a habit tracker, streak system, or gamified score
- a life-management dashboard
- a project-management platform
- a workforce-management or employee scheduling system
- a department-management system
- an AI assistant, or medical-decision software
- a productivity scoring system

## Foundational principles

1. Time is context, not judgment.
2. Interruptions are expected operating conditions, not failures.
3. The product should preserve the user's thread of intention.
4. Capture should take seconds.
5. Reorientation should take seconds.
6. Completing something should generally require one simple interaction.
7. The system should represent reality without inventing meaning.
8. Human authority remains with the user.
9. Prefer deterministic behavior over inferred behavior.
10. Minimalism is functional, not merely visual.
11. Sophistication comes from accurate relationships, not feature quantity.
12. If using the system becomes another task the user has to manage, the design has failed.
13. Intelligence should emerge from relationships, not feature count.
14. The system should know relatively few things, but understand them deeply.
15. Importance derives from where the user has established they are going. Attention is not evidence of importance.
16. Interpretation may propose structure. The user establishes meaning.

The core design principle, in the user's earlier words: "If using Workday becomes another task I have to manage, it has been designed incorrectly."

The product's runtime intelligence is deterministic. That is an architectural constraint, not a deferral. Orientation comes from explicit facts, temporal relationships, provenance, deterministic rules, and human-established meaning. AI, ML, LLMs, and agentic inference are outside the product architecture. They may be used to develop the software. They are not part of its runtime. They do not decide what matters, what the user should do, what time means, whether time is available, what Context is current, what should be sacrificed, how a temporal overlap is resolved, or a Destination or Priority. Interpretation may propose structure. The user establishes meaning. [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md) does not authorize a model. Where speech is not recognized, or where the product cannot confidently tell actionable speech from informational speech, retain the transcript and let the user decide. Do not invent meaning. Do not infer that retained information requires action. The record is [docs/decisions/2026-10-02-deterministic-intelligence.md](docs/decisions/2026-10-02-deterministic-intelligence.md). Operational adoption is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

## Current state

FOUNDATION-001 established the first product truth layer. FOUNDATION-002 established behavioral semantics. FOUNDATION-002A corrected scope so Work was the first Context rather than the whole product. FOUNDATION-003 canonizes Family, TeamLab, and Financial; adds Commitment, Block, Timeline, and Pulse; and defines the minimum usable system, V0.

V0 was specified as the smallest system that could generate real use. That first-use description is not the operational-adoption boundary. The user will not adopt the system while it is an MVP or a partial workflow. Phone acceptance of a tranche is not operational adoption. The contract is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). Open questions remain in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md) and in that contract. Earlier ledgers stay historical. Standalone decision records, when a future choice needs one, belong in [docs/decisions/](docs/decisions/README.md).

FOUNDATION-003 closed the planned pure-foundation phase. ARCHITECTURE-001 chooses the minimum runtime: Next.js, React, TypeScript, Tailwind, a dedicated Supabase project, Supabase Auth for one user, and Vercel from GitHub `main`. Projections such as NOW and Timeline are not stored. The decision records and the architecture document are in [docs/decisions/](docs/decisions/README.md) and [docs/architecture/ARCHITECTURE-001.md](docs/architecture/ARCHITECTURE-001.md).

BOOTSTRAP-001 made a runnable application shell. DATA-001 stores Context and Task for the signed-in user in the dedicated Supabase project. The schema, ownership rule, and due-date limitation are in [docs/data/DATA-001.md](docs/data/DATA-001.md). V0-001 lets that user sign in, capture a Task, see open Tasks, and complete one. V0-002 stores one Active Thread per user and shows Resume for that open Task. V0-003 keeps Capture collapsed until the user opens it, and stores a confirmed time zone plus one personal Work schedule state per civil date. V0-004 projects where a supplied instant sits relative to that schedule, Power Hour, and the next established Work boundary. V0-004A keeps the Work week as a compact reading surface and reveals day controls only in Edit week. V0-004B gives Tasks and Schedule their own routes and a bottom bar, keeps Capture closed until it is opened, and saves a Work week in one transaction. V0-005 shows the open Tasks deliberately planned for the confirmed civil day, and can set or clear that plan. V0-006 stores Protected Time the user has made unavailable for allocation, on the Schedule surface beside the Work week. V0-007 stores a Block as time the user has chosen a purpose for, also on Schedule, and does not treat it as Protected Time. V0-008 stores a user-created Commitment as time constrained by something the user has committed to, also on Schedule, and does not treat it as a Block, Protected Time, or a Work shift. V0-009 composes a Timeline from a scheduled Work shift, Protected Time, Blocks, and Commitments. It is a projection, not a table. V0-010 draws one selected civil day of that projection on Schedule. V0-011 lets the user select a transient local-clock span on that day. V0-012 lets the user name a transient intended meaning for that span. V0-012A keeps that handoff on the day canvas and lets the same span be refined by the minute. V0-013 can establish that span as Protected Time, a Block, or a Commitment, and only after an explicit Save. The span and the intention are still not stored by themselves. NOW is still not built. The slices through V0-013 are recorded in [docs/implementation/V0-001.md](docs/implementation/V0-001.md) through [docs/implementation/V0-013.md](docs/implementation/V0-013.md). V0-014 makes an established fact addressable. V0-015 can edit or delete a Protected Time, a Block, or a Commitment. V0-016 lists the established facts that contain the current instant. That list is not NOW. V0-017 makes typed quick capture the resting state on Tasks and Schedule. Those records are [docs/implementation/V0-014.md](docs/implementation/V0-014.md) through [docs/implementation/V0-017.md](docs/implementation/V0-017.md). Week and Month are not built, and they block operational adoption. Their further interactions are unresolved. DISCOVERY-CANON-001 records what a Note is, the conceptual meanings of Destination and Priority, and a refinement of Cadence that keeps the earlier definition. It does not implement them. The record is [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md).
