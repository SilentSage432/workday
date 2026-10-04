# Domain

These primitives are conceptual. Do not collapse them into one generic task model, and do not turn this document into a schema.

Known primitives:

- Context
- Cadence
- Window
- Task
- Note
- Active Thread
- Recurring Obligation
- Recurring Obligation Occurrence
- Commitment
- Block

Shift remains a valid primitive. It is known through Work. It is not the universal container of the system. A Work shift is also fixed or externally constrained time, so it can be represented as a Commitment without losing shift type or cadence.

Capture is an interaction, not a state. NOW, Timeline, and Pulse are experience concepts, not stored primitives. Direct time selection on the day canvas is also an interaction. It is the local clock span the user is pointing at. An intended meaning on that span is the same kind of interaction: the user has named whether they mean to protect the time, choose a purpose, or add a commitment. Refining the start or end updates that same span. Neither the span nor the intention is a stored primitive. An explicit establishment action can create a Protected Time, a Block, or a Commitment from that span. Those remain the stored primitives. The action is not itself a primitive, and it does not create a generic event. An external temporal source is a provenance relationship, not a life-area primitive.

FOUNDATION-001 used Observation as a candidate primitive. That is historical. Capture produces a Task or a Note. The word "observation" may appear in speech that creates a Note. Interpretation of captured language may propose structure. It does not establish a Task, a temporal fact, a Destination, or a Priority. The user establishes meaning. Destination and Priority, defined below, are conceptual meanings. They are not in the primitive list above, and they are not stored.

Earlier writing used "working context" for the Active Thread. That phrase is not the Context primitive.

Semantics that are still open are marked **Unresolved**.

## Context

A Context is a meaningful area or operating mode of the user's life. Cadence, obligations, tasks, notes, windows, blocks, commitments, and temporal structure may have particular meaning inside one.

A Context is not a silo, and it is not assumed to be a folder, category, workspace, project, profile, or account.

Established Contexts, from evidence, not an exhaustive list:

| Context | What the evidence supports |
| --- | --- |
| Work | The Lowe's operating environment: schedule, Shift, Opening / Mid / Closing, LSR, FSR, Power Hour, associate alignment, manager responsibilities, the Saturday-first fiscal week, Bay Audits, Cycle Counts, the Thursday readiness objective, department walks, customer interruptions, manager-on-duty responsibilities, and closing responsibilities. |
| Family | Responsibilities and intentionally protected time involving the user's two children, including school, school activities, appointments, family time, and caregiving reminders the user has established. |
| TeamLab | Time intentionally devoted to TeamLab projects and building. No TeamLab routine is established. |
| Financial | Time intentionally devoted to budgeting and financial stewardship. Financial truth stays with its source system. |

There is no generic Personal Context. Home, health routines, and other areas are not Contexts until evidence says so.

A Task or a Note is not required to belong to a Context.

A Destination and a Priority are not Contexts. A Context may relate to more than one Destination and more than one Priority. That relationship is not authorized.

Work is the first deeply discovered Context. Many temporal semantics were learned there. Work is not the ontology of the system. The intended product is a multi-context temporal foundation. Production adoption requires temporal orientation that can relate honestly to Family, TeamLab, and Financial. That does not mean those Contexts receive Work's cadence or Work's projections. The contract is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

**Unresolved:** whether either can belong to more than one Context or span Contexts; how the user enters or switches Context; whether Context can be inferred from established temporal facts; and how a transition between Contexts behaves. Those identity questions about folders and workspaces also remain open. Context-aware NOW is unresolved with them.

## Shift

A Shift is when the user is working. It is useful in Work because employment has scheduled start and end boundaries and shift types.

Known types: Opening, Mid, and Closing.

A shift has temporal boundaries, for example 6:00 AM → 3:00 PM. The user's actual work schedule should be enterable. Entry stays simple because the product is not workforce scheduling software. See [PRODUCT.md](PRODUCT.md) and [TIME_MODEL.md](TIME_MODEL.md).

V0 stores that personal schedule as one state per civil date: no row yet, Off, or one scheduled shift with an explicit Opening, Mid, or Closing type. Local times use the IANA time zone the user confirmed. If the end is earlier than or equal to the start, the shift continues into the next civil date. The decision is [docs/decisions/2026-10-02-work-schedule.md](docs/decisions/2026-10-02-work-schedule.md).

Off means no Work shift is scheduled. It is not Protected Time, and it does not mean the civil day is available.

A shift type selects the Work cadence for that kind of shift. The work schedule and the cadence are different facts.

Because a shift is fixed employment time, Timeline shows it beside a Commitment and still shows that it is a Shift. Do not drop Opening, Mid, or Closing in that presentation. V0-009 keeps the shift as Work Schedule truth. It does not copy the row into a Commitment.

Shift does not contain the rest of the product. An Active Thread, a Task, a Note, a Block, and NOW can exist without a Shift. Completing a shift does not, by itself, end the day. What occupies the rest of a particular day is not prescribed.

## Commitment

A Commitment is time constrained by something the user has committed to.

> This time is constrained by something I have committed to.

Examples such as an appointment, a school event, or a reservation illustrate the fact. They are not a subtype catalog. The title is the user's words, required, and at most 80 characters. It is not inferred, and it is not a category.

A Commitment is not a Task, not Today, not a Work shift, and not Protected Time. It does not require an outcome or a Context. Creating, editing, or removing one does not change a Task, Today, a Block, Protected Time, the Work schedule, or the Active Thread. They may overlap.

An all-day Commitment is one civil date. A timed Commitment is a local start and local end on a civil date, read in the confirmed IANA time zone. If the end is earlier than or equal to the start, it continues into the next civil date and no further. A later change of the confirmed zone reinterprets those local times. The decision is [docs/decisions/2026-10-02-commitments.md](docs/decisions/2026-10-02-commitments.md).

`origin` records where the truth came from. A Commitment entered in this application is `user_created`. That word is provenance, not a kind of Commitment. Google Calendar may later supply an externally sourced Commitment. That source would keep authority over what this application may edit or delete. No external id, sync, or write-back is stored yet.

**Unresolved:** which external events become Commitments, and whether a Shift is stored as a Commitment or only presented beside one. V0-008 does not copy a Work shift into `commitments`. V0-009 presents the shift as Work Schedule truth beside Commitments. It does not store that presentation.

## Block

A Block is time the user has deliberately chosen a purpose for.

> I have chosen what this time is for.

The purpose is the user's words, at most 80 characters. It is required. It is not a category, a productivity score, or a copy of a Context name.

An optional Context says which area of life the Block belongs to. TeamLab and "Work on Studio" are different facts. A Block without a Context is valid. V0 does not store a Task on a Block, and a Block does not require an outcome.

A Block is not Protected Time. Protected Time means the time is unavailable for allocation. A Block means the user chose what the time is for. Creating, editing, or removing one does not change the other. They may overlap. A Block is not a Work shift, not Today, and not a Commitment.

An all-day Block is one civil date. A timed Block is a local start and local end on a civil date, read in the confirmed IANA time zone. If the end is earlier than or equal to the start, the Block continues into the next civil date and no further. A later change of the confirmed zone reinterprets those local times. The decision is [docs/decisions/2026-10-02-blocks.md](docs/decisions/2026-10-02-blocks.md).

Chosen time is not less important because nobody else imposed it.

**Unresolved:** what Start, Adjust, and Skip change when a Block and the lived day differ. Whether a later version associates Tasks with a Block remains open. Experience before V0-009 suggests a person may drag a Task into time and establish a Block for that allocation. The Task would remain a Task. That relationship is not stored. The user remains authoritative. See [PRODUCT.md](PRODUCT.md).

## Protected Time

Protected Time is time the user has deliberately made unavailable for allocation.

Protected does not mean occupied. Protected means unavailable for allocation. The interval may contain no activity. That is valid.

It is not a Block, a Commitment, a Work shift, or a Task. Work Off does not create it. A Task planned for Today does not consume it. It does not require a Context. A short label, when present, is the user's words, not a category.

An all-day entry is one civil date. A timed entry is a local start and local end on a civil date, interpreted in the confirmed IANA time zone. If the end is earlier than or equal to the start, the interval continues into the next civil date. Overlaps are kept. Recurrence is not stored. The decision is [docs/decisions/2026-10-02-protected-time.md](docs/decisions/2026-10-02-protected-time.md).

## Cadence

A cadence is how the user intends to move through a meaningful period or Context. It is not a rigid schedule. It is also the recurring attention and execution through which the user maintains or advances conditions that matter to a Destination. Those are two descriptions of one primitive. Movement through a period stays valid when no Destination has been established. Recurring attention stays valid when a particular scheduled execution is disrupted. A cadence is not a list of recurring Tasks and not a set of time blocks. Interruptions are expected. The product helps the user resume rather than judging the deviation.

The discovered cadences are Opening, Mid, and Closing. They are Work-specific. Their contents are in [CADENCE.md](CADENCE.md). No cadence is established for Family, TeamLab, or Financial. A Block is not a cadence. Opening, Mid, and Closing do not require a Destination.

A cadence may use absolute time, relative position, or both. See [TIME_MODEL.md](TIME_MODEL.md).

## Window

A Window is a meaningful period during which certain behavior, attention, availability, or operating conditions apply.

Do not assume every Window belongs to Work. Do not define Windows for Family, TeamLab, or Financial without evidence.

Examples named so far, all from Work:

- Opening
- Power Hour
- Early shift
- Closing Readiness
- early-week task execution

Power Hour is a Work Window, 10:00 AM–2:00 PM. It is not a universal Window.

A Task's due boundary and explicit reminder are facts on the Task, independent of any Window. A Task may eventually also relate to an available window or a preferred window.

**Unresolved:** available-window and preferred-window rules, and whether each Work example above is a Window, a clock phase, a shift type, or more than one of these.

## Task

A Task means action is required. When the user explicitly records that something needs to be done, it becomes a Task immediately. It does not need to be performed at the moment of capture.

Aisle numbers, pack-down, zoning, customer calls, receiving follow-ups, audits, and manager work are Work examples. They are not built-in Task types.

A Task is not required to belong to a Context. **Unresolved:** whether it can belong to one, to more than one, or span Contexts. DATA-001 stores zero or one Context reference. That does not decide permanent multi-Context membership.

A Task may have:

- a due boundary or due date
- a planned day or other planned period, which in Work may be a shift
- an explicit reminder, independent of both
- a MUST DO flag
- completion state
- an optional association with a Block

These facts stay independent. Planned is not due. A Task may be due Thursday and planned for Monday. Changing the planned day or period must not silently change the due boundary.

Today is not a Task type. It means this open Task is deliberately planned for the user's current civil day: `plannedOn` equals that date. It is not every unresolved Task, and it is not the Timeline. Due, Must Do, and Active Thread stay independent of it. See [PRODUCT.md](PRODUCT.md).

MUST DO is `mustDo` true or false. The user sets it. It is not Priority, not a priority score, not a task state, and not a separate bucket. While set, the Task stays prominent until the user completes, reschedules, or removes it. DATA-001 stores that flag, a civil due date, a separate civil planned day, and a completion instant. A time-of-day due instant is not stored. See [docs/data/DATA-001.md](docs/data/DATA-001.md).

Known operations include add, edit, complete, remove, reschedule, and carry forward.

The resumable relationship is the Active Thread, not a second flag on the Task. See [Active Thread](#active-thread).

**Unresolved:** what reschedule writes, whether it clears MUST DO, and what carry-forward means.

No controlled vocabulary of work kinds is established. A Task is not a medical order.

## Note

A Note is a retained fragment of experience: something the user observed, learned, thought, or was told, captured so its meaning can be revisited later.

A Note carries no inherent obligation to act. It may remain informational indefinitely. Incomplete understanding is legitimate information. A Note is not a Task, not an unfinished Task, and not a low-priority Task. Capturing a Note does not create an obligation and does not establish temporal allocation. Language inside a Note that suggests action does not establish that action. Capture time is when the experience was retained. It is not when something should occur.

A Note does not burden the Task list and is not required to belong to a Context. The user may later establish a Task or another supported fact from a Note by explicit intent. The Note stays independently intact. One Note may support zero, one, or many later facts. A derived fact must be able to retain an inspectable relationship to the originating Note when that relationship exists. Provenance here is user-originating evidence. It is not hidden model reasoning. Older records call that explicit act conversion. Conversion does not consume the Note.

The retained experience is one non-blank text. The Note has a stable identity. The instant it was retained is capture time, not a civil day and not a plan. The Note does not store a separate title, a Context, or a capture mechanism. A later fact holds an optional reference to that one originating Note. The Note does not list those facts. A fact established directly has no such reference. A user-established Task remains `user_created`; the reference is not a different origin. The decision is [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). Storage of that Note, without a surface and without a fact reference, is [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md).

**Unresolved:** Note editing, deletion, and the rest of its lifecycle; whether a Note belongs to one Context, to more than one, or spans Contexts. Absence of a Context remains valid. The reasoning for the meaning is [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md).

## Active Thread

The Active Thread is the user's current explicit thread of intention. Resume offers that thread while its Task is still open. It is not required to belong to a Shift, a Block, or a Context. Product behavior is in [PRODUCT.md](PRODUCT.md). V0 stores one thread per user. See [docs/decisions/2026-10-02-active-thread.md](docs/decisions/2026-10-02-active-thread.md).

The user establishes it with an explicit action on one open Task. Capture, MUST DO, a planned day, a due date, and the passage of time do not. The product does not invent the thread by detecting an interruption. A Block's start, a Context change, and a shift boundary do not replace or clear it.

Switching the thread leaves the previous Task open. Clearing it leaves the Task open. Completing the referenced Task clears the thread and keeps the completed Task. V0 does not retain a second, suspended thread for another Context.

**Unresolved:** whether a later version should retain a suspended thread per Context.

## Recurring Obligation

A Recurring Obligation is a repeating responsibility definition. It is not inherently work-specific. No definition outside Work, with availability and a deadline, has been discovered. Do not invent one. User-established caregiving reminders are reminders. They are not given a recurrence period here.

Current Work requirements:

| Definition | Becomes available | Deadline | Preferred target |
| --- | --- | --- | --- |
| Bay Audits | weekend | Wednesday | early |
| Cycle Counts | weekend | Friday | well before Friday |

Those weekdays use the Lowe's Saturday-first fiscal week. That week does not define a universal calendar. See [CADENCE.md](CADENCE.md) and [TIME_MODEL.md](TIME_MODEL.md).

The definition activates an occurrence for a period. Completing the occurrence satisfies that period and leaves the definition. The completed occurrence no longer burdens the rest of the period. In Work, that means later shifts in the period. No recurrence algorithm is defined.

**Unresolved:** whether an occurrence is also a Task.

## Caregiving reminders

Pod-change reminders, Dexcom-related reminders, and doctor appointments are examples the user stated. Appointments are Commitments. The reminders are explicit user-established attention points.

They do not authorize the product to interpret medical data, calculate treatment, alter care timing, infer urgency, or prescribe action.

## Destination

A Destination describes where the user is deliberately trying to take some part of their life or reality. It may be a desired condition, a direction of development, or something continuously approached rather than a binary finish line. It may evolve as the user learns.

A Destination is the reference against which sustained importance can be understood. The user must have some sense of where they are going before Priority can have directional meaning.

A Destination is not a Target and not an Objective. Those remain temporal meanings in [TIME_MODEL.md](TIME_MODEL.md). A Target is a preferred completion point. An Objective is a desired operating condition and may contextualize Tasks. This discovery does not collapse the three, and it does not reclassify Thursday department readiness or the Full Shelf Replenishment morning language.

A Destination is not a Context. It is not yet a stored primitive. No lifecycle, completion rule, metric, hierarchy, or schema is defined. Work illustrations of where the user is trying to go are evidence of the relationship, not a taxonomy. They are kept in [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md).

**Unresolved:** exact representation, and the boundary with Objective and Target beyond the refusal to collapse them.

## Priority

Priority is a condition or area of sustained attention whose continued health materially advances an established Destination and therefore deserves repeated execution over time.

Priority describes what repeatedly matters to movement toward a Destination. It is downstream of Destination. Concrete execution underneath a Priority may change as reality changes. A Priority is not itself necessarily a Task. Concrete actions can establish, restore, or maintain the condition it names.

Priority is not high, medium, or low. It is not a numeric score, an inferred ranking, urgency, recency, frequency, a due date, or algorithmic importance. Priority is not Must Do, not Due, not Planned, not a Block, and not the Active Thread. Attention is not evidence of importance. An interruption that gains attention does not gain Priority. Something may need to happen without being the best use of the user's personal execution.

Something may need doing without needing this user. Something may need this user without needing this user now. The user may determine that another person should execute something while the user retains responsibility for follow-up or outcome. Delegation and follow-up are an unresolved semantic relationship. They do not authorize another user, an employee account, workforce management, or a delegation workflow.

No automatic prioritization is authorized. Priority is not yet a stored primitive.

The conceptual relationship is Destination, then Priority, then cadence or repeated execution, then observable reality. That relationship is not a persisted hierarchy. Not every Task requires a Priority. Not every Note requires a Destination. Not every Priority requires a metric. Not every Destination requires completion criteria.

**Unresolved:** representation, lifecycle, relationship to Context, whether a Task explicitly relates to a Priority, and whether cadence explicitly relates to a Priority.

## External temporal source

An external temporal source supplies time-related facts and retains provenance.

Google Calendar is the first identified example. Conceptually, a Google Calendar event is an externally sourced temporal fact, may be represented as a Commitment, and may participate in Timeline, NOW, and Pulse.

Reading externally owned truth and writing back to that source are separate authority decisions. Neither is chosen. The product must not silently mark an external fact as its own.

Wealth Engine and DeptSync may eventually supply scoped facts under the same provenance rule. No integration is authorized, and no API is designed. Each source keeps authority over its own truth.

## Known relationships

Objective in this table is a temporal meaning, not an extra primitive. Timeline and Pulse are experiences.

| From | Relationship | To |
| --- | --- | --- |
| Work, Family, TeamLab, Financial | are established, non-exhaustive | Contexts |
| Task or Note | is not required to belong to | a Context |
| Work schedule | states boundaries and type of | Shift |
| Shift | is fixed employment time and may be presented beside | Commitment |
| Shift type | selects | a Work cadence |
| Block | is chosen purpose and may relate to | a Context |
| Block | is not required to contain, and V0 does not store | a Task |
| External temporal source | may supply, with provenance | Commitment |
| Google Calendar | is the first identified | external temporal source |
| Capture | may produce | Task or Note |
| Interpretation | may propose, and does not establish | structure |
| Note | may, by explicit user establishment, support while remaining intact | a later Task or other established fact |
| Destination | is not | a Target, an Objective, or a Context |
| Priority | is sustained attention downstream of | a Destination |
| Priority | is not | Must Do, Due, Planned, a Block, or the Active Thread |
| Cadence | may also be recurring attention toward conditions that matter to | a Destination |
| Task | may be planned independently of | its due boundary |
| Task | may carry a user-set flag | MUST DO |
| Active Thread | is the thread offered by | Resume |
| Recurring Obligation | activates, for a period | an occurrence |
| Completed occurrence | satisfies, and stops burdening the rest of | that period |
| Timeline | composes, without flattening | Commitment, Block, Shift, planned Task, reminder, occurrence, Window |
| Pulse | orients; a reminder reports | one explicit fact |
| Objective | may contextualize, and is not automatically | Task |

V0-009 implements that composition for a scheduled Work shift, Protected Time, a Block, and a Commitment. V0-010 draws one civil day from it and does not resolve overlap. Planned Tasks, reminders, occurrences, and Windows remain future sources. A shift is not projected as a Commitment. The decisions are [docs/decisions/2026-10-02-timeline-composition.md](docs/decisions/2026-10-02-timeline-composition.md) and [docs/decisions/2026-10-02-day-canvas.md](docs/decisions/2026-10-02-day-canvas.md).

**Unresolved:** NOW's selection order, Context switching, multi-Context membership, a suspended thread per Context beyond the one current thread V0 stores, occurrence-versus-Task, external write-back, and the lifecycle gaps marked above. They are listed in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md). Commitment has no subtype catalog. Destination representation and Priority representation remain unresolved in [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md). Note representation, and the reference from a later fact to its originating Note, are decided in [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). A Note can be stored and read. Editing and deletion remain unresolved. There is no establishment surface, and no fact yet cites a Note. That discovery does not define Capacity, NOW composition, or a ranking.
