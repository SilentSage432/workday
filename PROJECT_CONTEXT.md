# Project context

This is Orient, a personal, single-user, time-aware cadence and orientation system. The repository is named `workday`. That name is an implementation and history detail. It does not define product identity. See [Naming](#naming).

The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

## Purpose

A directional statement, not final copy:

> The system helps the user regain orientation in the lived present: which established temporal truths contain this instant, and which Task the user has explicitly established as their current intention.

An earlier directional statement asked where the user is in the day, what currently matters, what the time was intended for, what they were doing before interruption, and what comes next. That wording is historical. It is not authority for present-moment orientation to decide what matters or what comes next. The still earlier sentence remains the human purpose of reorientation: externalize the user's intentions, remember what matters to them, and help them return to their intended course when life interrupts them. That return restores evidence. It is not a recommendation. The composition is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

The still earlier sentence, "externalize my work cadence… when the workday interrupts me," remains true of the Work Context. It is not the purpose of the whole product.

Work was the first deeply discovered Context, and the environment from which many temporal semantics were learned. It is not the architectural center of the product. The intended product is a multi-context temporal foundation: a system for how the user operates in time. How a Context becomes current is unresolved.

The user generally knows what they intend. The problem is staying oriented in time, and remembering what they notice instead of keeping it only in memory. The product is an external memory and orientation surface. Sophistication comes from a small set of explicit relationships, not from feature count.

## Naming

The product name is Orient. Orient is the temporal orientation system being built in this repository. The name reflects the established purpose: helping the human orient and reorient within time, established reality, and explicit intention, while preserving human authority. It is not a claim that the system decides direction, importance, priority, or action for the human.

`workday` is the repository and folder name from initial discovery. It does not define product identity. Do not rename the repository in this decision. The decision is [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md). NOW-CONTRACT-001 did not choose the name. Its composition is unchanged.

Historical documents and the user's original principle quote use "Workday." That is evidence of what the effort was called, not a competing name.

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

The product's runtime intelligence is deterministic. That is an architectural constraint, not a deferral. Orientation comes from explicit facts, temporal relationships, provenance, deterministic rules, and human-established meaning. AI, ML, LLMs, and agentic inference are outside the product architecture. They may be used to develop the software. They are not part of its runtime. They do not decide what matters, what the user should do, what time means, whether time is available, what Context is current, what should be sacrificed, how a temporal overlap is resolved, a Destination, a Priority, or whether an execution serves a larger direction. The directional semantics are [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md). A Task or a Block in service of a Priority is [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md). Interpretation may propose structure. The user establishes meaning. [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md) does not authorize a model. When an expression does not yet have enough established meaning to be a canonical fact, that unresolved result stays legitimate. The expression remains available while the interaction continues, and the user decides. The expression is not a stored transcript. Do not invent meaning. Do not infer that retained information requires action. The capture boundary is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). The deterministic record is [docs/decisions/2026-10-02-deterministic-intelligence.md](docs/decisions/2026-10-02-deterministic-intelligence.md). Operational adoption is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

## Current state

FOUNDATION-001 established the first product truth layer. FOUNDATION-002 established behavioral semantics. FOUNDATION-002A corrected scope so Work was the first Context rather than the whole product. FOUNDATION-003 canonizes Family, TeamLab, and Financial; adds Commitment, Block, Timeline, and Pulse; and defines the minimum usable system, V0.

V0 was specified as the smallest system that could generate real use. That first-use description is not the operational-adoption boundary. The user will not adopt the system while it is an MVP or a partial workflow. Phone acceptance of a tranche is not operational adoption. The contract is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). Open questions remain in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md) and in that contract. Earlier ledgers stay historical. Standalone decision records, when a future choice needs one, belong in [docs/decisions/](docs/decisions/README.md).

FOUNDATION-003 closed the planned pure-foundation phase. ARCHITECTURE-001 chooses the minimum runtime: Next.js, React, TypeScript, Tailwind, a dedicated Supabase project, Supabase Auth for one user, and Vercel from GitHub `main`. Projections such as NOW and Timeline are not stored. The decision records and the architecture document are in [docs/decisions/](docs/decisions/README.md) and [docs/architecture/ARCHITECTURE-001.md](docs/architecture/ARCHITECTURE-001.md).

BOOTSTRAP-001 made a runnable application shell. DATA-001 stores Context and Task for the signed-in user in the dedicated Supabase project. The schema, ownership rule, and due-date limitation are in [docs/data/DATA-001.md](docs/data/DATA-001.md). V0-001 lets that user sign in, capture a Task, see open Tasks, and complete one. V0-002 stores one Active Thread per user and shows Resume for that open Task. V0-003 keeps Capture collapsed until the user opens it, and stores a confirmed time zone plus one personal Work schedule state per civil date. V0-004 projects where a supplied instant sits relative to that schedule, Power Hour, and the next established Work boundary. V0-004A keeps the Work week as a compact reading surface and reveals day controls only in Edit week. V0-004B gives Tasks and Schedule their own routes and a bottom bar, keeps Capture closed until it is opened, and saves a Work week in one transaction. V0-005 shows the open Tasks deliberately planned for the confirmed civil day, and can set or clear that plan. V0-006 stores Protected Time the user has made unavailable for allocation, on the Schedule surface beside the Work week. V0-007 stores a Block as time the user has chosen a purpose for, also on Schedule, and does not treat it as Protected Time. V0-008 stores a user-created Commitment as time constrained by something the user has committed to, also on Schedule, and does not treat it as a Block, Protected Time, or a Work shift. V0-009 composes a Timeline from a scheduled Work shift, Protected Time, Blocks, and Commitments. It is a projection, not a table. V0-010 draws one selected civil day of that projection on Schedule. V0-011 lets the user select a transient local-clock span on that day. V0-012 lets the user name a transient intended meaning for that span. V0-012A keeps that handoff on the day canvas and lets the same span be refined by the minute. V0-013 can establish that span as Protected Time, a Block, or a Commitment, and only after an explicit Save. The span and the intention are still not stored by themselves. NOW is still not built. The slices through V0-013 are recorded in [docs/implementation/V0-001.md](docs/implementation/V0-001.md) through [docs/implementation/V0-013.md](docs/implementation/V0-013.md). V0-014 makes an established fact addressable. V0-015 can edit or delete a Protected Time, a Block, or a Commitment. V0-016 lists the established facts that contain the current instant. That list is Current Temporal Orientation. It is one input to present-moment orientation, not the composition. V0-017 makes typed quick capture the resting state on Tasks and Schedule. Those records are [docs/implementation/V0-014.md](docs/implementation/V0-014.md) through [docs/implementation/V0-017.md](docs/implementation/V0-017.md). WEEK-001 reads Week shape for an explicit civil range and does not add a production interaction. The record is [docs/implementation/WEEK-001.md](docs/implementation/WEEK-001.md). The Week surface and Month are not built, and they block operational adoption. Week interactions beyond perception remain unresolved. Month's question is decided in [docs/decisions/2026-10-05-month-contract.md](docs/decisions/2026-10-05-month-contract.md). Month interactions beyond that perception remain unresolved. DISCOVERY-CANON-001 records what a Note is, the discovered meanings of Destination and Priority, and a refinement of Cadence that keeps the earlier definition. It does not implement them. The record is [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md). DIRECTION-CONTRACT-001 canonizes Destination, Priority, and the explicit directional relationship. The record is [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md). DIRECTION-REP-001 stores a Destination and a Priority downstream of one Destination. It does not store a link into an execution fact, and it does not add a production interaction. The migration is not applied. The record is [docs/implementation/DIRECTION-REP-001.md](docs/implementation/DIRECTION-REP-001.md). TASK-INTEGRITY-001 makes the open-task read complete. Today and the open-task list use that collection only after the read succeeds. The record is [docs/implementation/TASK-INTEGRITY-001.md](docs/implementation/TASK-INTEGRITY-001.md). TASK-EDIT-001 lets an open Task's title, Context, planned day, due day, and Must Do be edited. Save is the write. Cancel writes nothing. The record is [docs/implementation/TASK-EDIT-001.md](docs/implementation/TASK-EDIT-001.md). NOTE-REPRESENTATION-001 decides the minimum Note: one non-blank text, a stable identity, and the instant it was retained. A later fact may cite that Note. The record is [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). NOTE-STORAGE-001 stores that Note for the signed-in user and reads the collection only when the read is complete. Capture is unchanged. There is no Note surface, and no fact yet cites a Note. The record is [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md). NOTE-STORAGE-001A corrects invalid comment syntax in that same migration. It does not change the Note. The record is [docs/implementation/NOTE-STORAGE-001A.md](docs/implementation/NOTE-STORAGE-001A.md). CAPTURE-CONTRACT-001 decides how an expression becomes a candidate or unresolved meaning, and how an explicit human act establishes one Note, one Task, or nothing. It adds no storage and does not authorize voice. The record is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). TYPED-GENERAL-CAPTURE-001 proves that contract with a provisional typed surface on Tasks. The expression stays transient. One act establishes one Note, one Task, or nothing. It does not classify text, add voice, or add a Notes management surface. Quick Capture remains direct Task establishment. The record is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). VOICE-CAPABILITY-001 examined how speech could become that expression and chose no provider. VOICE-PROBE-001A passed on the Samsung Galaxy S26 Ultra: the phone keyboard's dictation became editable expression text, and an explicit act kept a Note. No speech stack was added. The production experience remains open for spatial continuity. The return to a kept Note is decided, and its runtime is not built. The record is [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md). NOW-CONTRACT-001 decides present-moment orientation: Current Temporal Orientation and the Active Thread, as independent truths, not a stored NOW and not a ranking. The experience is not designed and does not have to be named NOW. The record is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). The product name is Orient. The repository and technical identifiers are not renamed. The record is [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md). NOW-001 composes Current Temporal Orientation and Resume as one deterministic projection. It does not persist that composition, rank the two truths, or change the Tasks screen. The record is [docs/implementation/NOW-001.md](docs/implementation/NOW-001.md). NOTE-REVISIT-CONTRACT-001 decides the return to a retained Note: the conceptual Capture experience has memory. An established Note stays directly revisitable as the complete `loadNotes` collection. Selecting it means the human is referring to that retained experience. NOTE-REVISIT-001 proves that return inside the existing General Capture surface. "Retained experiences" reads the complete `loadNotes` collection and shows each Note's content and capture instant. NOTE-REVISIT-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. It is not the production Capture experience, and not a Notes application. PROVENANCE-CONTRACT-001 decides how the human explicitly establishes that a retained experience is the source of a new Task. While referring to a Note, the human may establish a Task that cites that Note. The Note remains intact. Reference alone establishes nothing. The Task remains `user_created`. PROVENANCE-001 stores `tasks.originating_note_id` in one Task insert. The committed migration was applied to `ksmhgaamyheyhefbyglb`, and the hosted column and same-owner foreign key were verified. PROVENANCE-001A accepts the scaffold on the Samsung Galaxy S26 Ultra: a retained Note stayed intact after the human established a Task from it. The scaffold is not the production interaction. The required Note chain is closed. TASK-TIME-CONTRACT-001 decides that giving time to an existing Task establishes a Block that may refer to that Task. The Task does not acquire temporal coordinates. TASK-TIME-001 stores nullable `blocks.task_id` and a time-first scaffold that does not copy the Task title. The migration is applied on `ksmhgaamyheyhefbyglb`. TASK-TIME-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production interaction. The bounded Capacity reading is [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md). [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. A Task is not a Block. Unestablished time is not available. The record is [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md). Edit, delete, and archive are outside operational adoption until their semantics are independently established. That placement does not make a Note immutable. The records are [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md), [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md), and [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md).
