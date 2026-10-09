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

Capture is an interaction, not a state. Present-moment orientation, Timeline, Week, and Pulse are projections or experience concepts, not stored primitives. Week perceives the spatial distribution of established temporal structure. It is not a row, and it is not Structure, SpokenFor, Busy, or Occupied. The decision is [docs/decisions/2026-10-05-week-contract.md](docs/decisions/2026-10-05-week-contract.md). Month perceives explicitly established directions together with that kind of structure across a broader span. It does not infer that the structure expresses the direction, and it is not a row. The decision is [docs/decisions/2026-10-05-month-contract.md](docs/decisions/2026-10-05-month-contract.md). [docs/implementation/MONTH-001.md](docs/implementation/MONTH-001.md) implements that reading and does not add a surface. Present-moment orientation composes Current Temporal Orientation and the Active Thread. It is not a row. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). Direct time selection on the day canvas is also an interaction. It is the local clock span the user is pointing at. An intended meaning on that span is the same kind of interaction: the user has named whether they mean to protect the time, choose a purpose, or add a commitment. Refining the start or end updates that same span. Neither the span nor the intention is a stored primitive. An explicit establishment action can create a Protected Time, a Block, or a Commitment from that span. Those remain the stored primitives. The action is not itself a primitive, and it does not create a generic event. An external temporal source is a provenance relationship, not a life-area primitive.

FOUNDATION-001 used Observation as a candidate primitive. That is historical. The word "observation" may appear in speech. It is not a domain primitive.

An expression is the text a human supplied. It is transient evidence, not a stored primitive. A candidate understanding may propose one canonical kind. Unresolved meaning is a legitimate result: the expression is not yet a canonical fact. The user establishes meaning by an explicit act that names one kind and authorizes one fact of that kind to be written. That act may produce one Task or one Note. It may produce nothing. A phrase does not establish a temporal fact, a Destination, or a Priority. The decision is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). Destination, Priority, and a directional relationship, defined below, are canonical semantic meanings. They are not in the primitive list above. [docs/implementation/DIRECTION-REP-001.md](docs/implementation/DIRECTION-REP-001.md) stores a Destination and a Priority downstream of one Destination. It does not store a directional relationship into an execution fact, and it does not add a production interaction. The decision is [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md). A Task or a Block may be explicitly established in service of a Priority. [docs/implementation/EXECUTION-DIRECTION-REP-001.md](docs/implementation/EXECUTION-DIRECTION-REP-001.md) stores those pairs and does not add a production interaction. The decision is [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md).

Earlier writing used "working context" for the Active Thread. That phrase is not the Context primitive.

Semantics that are still open are marked **Unresolved**.

## Context

A Context is a meaningful area of the human's life. Older sentences also say "operating mode." That phrase does not mean a mutually exclusive application mode or a system state. The decision is [docs/decisions/2026-10-05-multi-context-contract.md](docs/decisions/2026-10-05-multi-context-contract.md).

A Context is not a silo, a folder, a category, a workspace, a project, a profile, an account, or an importance system.

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

There is no current Context. Orient does not infer one from the Active Thread, from Work, from a Block, a Commitment, or Protected Time, or from whichever fact contains the instant. A Task Context and a Block Context stay properties of those facts. They do not have to agree.

**Unresolved:** multi-membership, Context administration, Destination or Priority binding, and non-Work Capacity boundaries. A suspended thread per Context remains open below.

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

A timed Commitment may carry an explicit **Interrupt Grant**: human interruption authority for the relative transition `commitment.start` with a positive lead offset. That grant is not a notification, not Must Do, and not created by establishing the Commitment. A **Pulse occurrence** is durable evidence that the authorized condition evaluated true for one grant and one source temporal identity. Expression of a Pulse is not the Pulse. [docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md](docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md) stores the first proof.

**Unresolved:** which external events become Commitments, and whether a Shift is stored as a Commitment or only presented beside one. V0-008 does not copy a Work shift into `commitments`. V0-009 presents the shift as Work Schedule truth beside Commitments. It does not store that presentation.

## Block

A Block is time the user has deliberately chosen a purpose for.

> I have chosen what this time is for.

The purpose is the user's words, at most 80 characters. It is required. It is not a category, a productivity score, or a copy of a Context name.

An optional Context says which area of life the Block belongs to. TeamLab and "Work on Studio" are different facts. A Block without a Context is valid. V0 does not store a Task on a Block, and a Block does not require an outcome.

A Block is not Protected Time. Protected Time means the time is unavailable for allocation. A Block means the user chose what the time is for. Creating, editing, or removing one does not change the other. They may overlap. A Block is not a Work shift, not Today, and not a Commitment.

An all-day Block is one civil date. A timed Block is a local start and local end on a civil date, read in the confirmed IANA time zone. If the end is earlier than or equal to the start, the Block continues into the next civil date and no further. A later change of the confirmed zone reinterprets those local times. The decision is [docs/decisions/2026-10-02-blocks.md](docs/decisions/2026-10-02-blocks.md).

Chosen time is not less important because nobody else imposed it.

A Block may refer to zero or one existing Task. That reference means the human chose this time for executing that action. The Task does not acquire a start, an end, or a duration. Many Blocks may refer to one Task. The Task does not list them. A Block without a Task remains valid. Purpose stays the user's words and is not the Task title. The reference is not provenance. [docs/implementation/TASK-TIME-001.md](docs/implementation/TASK-TIME-001.md) stores `blocks.task_id`. The migration is applied on `ksmhgaamyheyhefbyglb`, and TASK-TIME-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production interaction. The decision is [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md).

**Unresolved:** what Start, Adjust, and Skip change when a Block and the lived day differ. What a future Task removal would do to Blocks that refer to that Task. The bounded Capacity reading is decided in [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md). [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. Other allocatable boundaries are not defined.

## Protected Time

Protected Time is time the user has deliberately made unavailable for allocation.

Protected does not mean occupied. Protected means unavailable for allocation. The interval may contain no activity. That is valid.

It is not a Block, a Commitment, a Work shift, or a Task. Work Off does not create it. A Task planned for Today does not consume it. It does not require a Context. A short label, when present, is the user's words, not a category.

An all-day entry is one civil date. A timed entry is a local start and local end on a civil date, interpreted in the confirmed IANA time zone. If the end is earlier than or equal to the start, the interval continues into the next civil date. Overlaps are kept. Recurrence is not stored. The decision is [docs/decisions/2026-10-02-protected-time.md](docs/decisions/2026-10-02-protected-time.md).

## Cadence

A cadence is how the user intends to move through a meaningful period or Context. It is not a rigid schedule. It is also the recurring attention and execution through which the user maintains or advances conditions that matter to a Destination. Those are two descriptions of one primitive. Movement through a period stays valid when no Destination has been established. Recurring attention stays valid when a particular scheduled execution is disrupted. A cadence is not a list of recurring Tasks, not a set of time blocks, not a streak, and not a score. It does not itself create a Task, a Block, or an Occurrence. Deviation does not invalidate it, and it is not graded. Interruptions are expected. The product helps the user resume rather than judging the deviation.

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

A Task may carry zero or one explicit Context reference. Absence is complete. It is not Personal, unknown, or an error. **Unresolved:** whether one Task may carry more than one Context. DATA-001 stores at most one reference. That storage does not decide multi-membership.

A Task may have:

- a due boundary or due date
- a planned day or other planned period, which in Work may be a shift
- an explicit reminder, independent of both
- a MUST DO flag
- completion state
- time the human later chooses for it, as one or more Blocks that refer to the Task, not as coordinates on the Task. The decision is [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md)

These facts stay independent. Planned is not due. A Task may be due Thursday and planned for Monday. Changing the planned day or period must not silently change the due boundary.

Today is not a Task type. It means this open Task is deliberately planned for the user's current civil day: `plannedOn` equals that date. It is not every unresolved Task, and it is not the Timeline. Due, Must Do, and Active Thread stay independent of it. See [PRODUCT.md](PRODUCT.md).

MUST DO is `mustDo` true or false. The user sets it. It is not Priority, not a priority score, not a task state, and not a separate bucket. While set, the Task stays prominent until the user completes, reschedules, or removes it. DATA-001 stores that flag, a civil due date, a separate civil planned day, an optional local planned clock on that day, and a completion instant. The planned clock is intention to do or start the Task at that local time. It is not duration, Block territory, a due instant, or a reminder. A time-of-day due instant is not stored. See [docs/data/DATA-001.md](docs/data/DATA-001.md) and [docs/implementation/TASK-CLOCK-POINT-001.md](docs/implementation/TASK-CLOCK-POINT-001.md).

Known operations include add, edit, complete, remove, reschedule, and carry forward.

The resumable relationship is the Active Thread, not a second flag on the Task. See [Active Thread](#active-thread).

**Unresolved:** what reschedule writes, whether it clears MUST DO, and what carry-forward means.

No controlled vocabulary of work kinds is established. A Task is not a medical order.

## Note

A Note is a retained fragment of experience: something the user observed, learned, thought, or was told, captured so its meaning can be revisited later.

A Note carries no inherent obligation to act. It may remain informational indefinitely. Incomplete understanding is legitimate information. A Note is not a Task, not an unfinished Task, and not a low-priority Task. Capturing a Note does not create an obligation and does not establish temporal allocation. Language inside a Note that suggests action does not establish that action. Capture time is when the experience was retained. It is not when something should occur.

A Note does not burden the Task list and is not required to belong to a Context. While referring to a Note, the human may explicitly establish a Task from that retained experience. The Note stays independently intact. One Note may be cited by zero, one, or many later Tasks. Each Task holds zero or one originating Note, and the Note does not list those Tasks. Provenance records that source relationship. It does not determine the Note's meaning, and it is not hidden model reasoning. Older records call that explicit act conversion. The Note is not consumed. The decision is [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md).

The retained experience is one non-blank text. The Note has a stable identity. The instant it was retained is capture time, not a civil day and not a plan. For a Note established from an expression, that instant is the establishment act, not the earlier typing or speech, and not insertion time. The Note does not store a separate title, a Context, a capture mechanism, or a second capture timestamp. Lifecycle field `retiredAt` records when a valid Note left current operational Notes; null means current. A Task may hold an optional reference to one originating Note. The Note does not list those Tasks. A Task established directly has no such reference. A user-established Task remains `user_created`; the reference is not a different origin. The Task title need not equal the Note content. Protected Time, a Block, and a Commitment are not cited from a Note by this relationship. The representation is [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). Lifecycle is [docs/decisions/2026-10-08-note-lifecycle.md](docs/decisions/2026-10-08-note-lifecycle.md). The establishment boundary is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). The source relationship is [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md). Storage of that Note is [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md). Lifecycle runtime is [docs/implementation/NOTE-LIFECYCLE-001.md](docs/implementation/NOTE-LIFECYCLE-001.md).

Revisit does not invent a Notes product. When the user explicitly establishes a Note, that retained experience remains directly revisitable while current. Production return is LOOK → Notes. "Capture has memory" remains the conceptual relationship. The exposed collection is the complete operational read from `loadNotes`: current Notes only (`retired_at` null), capture instant ascending, then identity ascending. That order is retrieval order. A complete empty collection means no current Note has been retained. A failed or incomplete read is not an empty collection. What may be shown of each Note is its content and its capture instant. Selecting or opening a Note means the human is referring to that retained experience. Reference alone does not edit content, establish a Task or another fact, mark importance, make the Note current, establish the Active Thread, schedule, assign Context, establish Priority, or establish temporal meaning. Provenance begins only when the human explicitly establishes a Task from that retained experience. The Note remains a Note if that Task cites it. Retire leaves current operational Notes without destroying the row. Delete permanently removes an uncited Note. A cited Note cannot be deleted while provenance exists; Retire remains available. The return is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md) and [docs/implementation/NOTE-RETURN-001.md](docs/implementation/NOTE-RETURN-001.md). Lifecycle is [docs/decisions/2026-10-08-note-lifecycle.md](docs/decisions/2026-10-08-note-lifecycle.md).

**Unresolved:** whether content may be edited; Unretire UI; Archive browsing. Edit remains deferred. [docs/decisions/2026-10-05-multi-context-contract.md](docs/decisions/2026-10-05-multi-context-contract.md) does not authorize a Note Context. Absence is the represented state. Whether a Note may someday carry a Context relationship remains open, and that contract does not create one. The semantic relationship from a retained Note to a Task is decided. A Task may hold `originatingNoteId`. [docs/implementation/PROVENANCE-001.md](docs/implementation/PROVENANCE-001.md) stores that column. Cited-Note deletion remains rejected under `ON DELETE NO ACTION`; Retire preserves that citation. The reasoning for the meaning is [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md).

## Active Thread

The Active Thread is the user's current explicit thread of intention. Resume offers that thread while its Task is still open. It answers which Task the user has explicitly established as their current intention. It is not required to belong to a Shift, a Block, or a Context. It does not establish, validate, rank, or override Current Temporal Orientation, and that projection does not establish the thread. Product behavior is in [PRODUCT.md](PRODUCT.md). V0 stores one thread per user. See [docs/decisions/2026-10-02-active-thread.md](docs/decisions/2026-10-02-active-thread.md). The composition is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

The user establishes it with an explicit action on one open Task. Capture, MUST DO, a planned day, a due date, and the passage of time do not. The product does not invent the thread by detecting an interruption. A Block's start, a Context change, and a shift boundary do not replace or clear it.

Switching the thread leaves the previous Task open. Clearing it leaves the Task open. Completing the referenced Task clears the thread and keeps the completed Task. V0 does not retain a second, suspended thread for another Context.

**Unresolved:** whether a later version should retain a suspended thread per Context.

## Recurring Obligation

A Recurring Obligation is a repeating responsibility definition. It is not inherently work-specific. No definition outside Work, with availability and a deadline, has been discovered. Do not invent one. User-established caregiving reminders are reminders. They are not given a recurrence period here.

Current Work requirements:

| Definition | Becomes available | Deadline | Preferred target |
| --- | --- | --- | --- |
| Bay Audits | Saturday | Wednesday | early |
| Cycle Counts | Sunday | Wednesday | well before Wednesday |

Those weekdays use the Lowe's Saturday-first fiscal week. That week does not define a universal calendar. See [CADENCE.md](CADENCE.md) and [TIME_MODEL.md](TIME_MODEL.md).

The definition activates an occurrence for a period. Completing the occurrence satisfies that period and leaves the definition. The completed occurrence no longer burdens the rest of the period. In Work, that means later shifts in the period.

A Recurring Obligation occurrence for these weekly concrete Work cases is a **materialized ordinary Task** for that Lowe's fiscal week. Completion is Task completion for that occurrence only. The next week receives a new Task. Recurrence does not reset one Task.

## Caregiving reminders

Pod-change reminders, Dexcom-related reminders, and doctor appointments are examples the user stated. Appointments are Commitments. The reminders are explicit user-established attention points.

They do not authorize the product to interpret medical data, calculate treatment, alter care timing, infer urgency, or prescribe action.

## Destination

A Destination is where the human is deliberately trying to take some part of life or reality. It may be a desired condition, a direction of development, or something continuously approached rather than a binary finish line. It may evolve as the user learns. It is human-established and is not inferred.

A Destination is the reference against which sustained importance can be understood. The user must have some sense of where they are going before Priority can have directional meaning. It need not be binary-completable, need not have a deadline, and need not have a metric. It does not inherently occupy temporal territory.

A Destination is not a Task, a Block, a Priority, a Context, or a Deadline. It is not automatically a Target and not automatically an Objective. Target and Objective remain temporal meanings in [TIME_MODEL.md](TIME_MODEL.md). A Target is a preferred completion point. An Objective is a desired operating condition and may contextualize Tasks. Thursday department readiness and the Full Shelf Replenishment morning language are not reclassified.

[docs/implementation/DIRECTION-REP-001.md](docs/implementation/DIRECTION-REP-001.md) stores a Destination as its identity, the human's words, and the instant that act established it. That instant is not a deadline or a temporal interval. The storage adds no production interaction. Work illustrations of where the user is trying to go are evidence, not a taxonomy. They are kept in [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md). The decision is [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md).

## Priority

Priority is a condition or area of sustained attention whose continued health materially advances an established Destination and therefore deserves repeated execution over time.

Priority describes what repeatedly matters to movement toward a Destination. It is downstream of Destination. It is human-established and is not inferred. Concrete execution underneath a Priority may change as reality changes. A Priority is not itself necessarily a Task. Concrete actions can establish, restore, or maintain the condition it names. It does not inherently occupy temporal territory. It may remain relevant across many days or weeks. Completing an execution fact does not binary-complete it.

Priority is not high, medium, or low. It is not a numeric score, an inferred ranking, urgency, salience, recency, frequency, a due date, or algorithmic importance. Priority is not Must Do, not Due, not Planned, not a Block, and not the Active Thread. Attention is not evidence of importance. An interruption that gains attention does not gain Priority. Something may need to happen without being the best use of the user's personal execution.

Something may need doing without needing this user. Something may need this user without needing this user now. The user may determine that another person should execute something while the user retains responsibility for follow-up or outcome. Delegation and follow-up are an unresolved semantic relationship. They do not authorize another user, an employee account, workforce management, or a delegation workflow.

No automatic prioritization is authorized. [docs/implementation/DIRECTION-REP-001.md](docs/implementation/DIRECTION-REP-001.md) stores a Priority as its identity, the human's words, the one Destination it was established downstream of, and the instant of that act. Whether one Priority may serve more than one Destination is not decided and is not represented. The storage adds no production interaction.

## Directional relationship

A directional relationship records that the human explicitly established that one already-established truth exists in service of a larger human-established direction. For execution, that truth is a Task or a Block, and the direction is a Priority. The relationship is inspectable while it is retained. Orient does not infer it, score it, or rank it. Both truths stay what they are. The relationship is not proof of progress, sufficiency, or importance. It is not provenance, and it is not a graph. It does not create an execution-to-Destination edge.

The semantic direction is Destination, then Priority, then cadence or execution, then observable lived reality. That direction is not necessarily a persisted hierarchy. A Task does not establish a Destination. A Block, a repeated action, Must Do, Due, the Active Thread, attention, time spent, temporal density, and current activity do not establish a Priority or a Destination. A Task and a Block do not inherit a Priority relationship from each other.

Strategic ancestry is optional. Not every Task, Block, Commitment, Protected Time, Note, appointment, obligation, or other temporal fact must serve a Destination or a Priority. A fact without that ancestry remains fully valid. Not every Priority requires a metric. Not every Destination requires completion criteria. Activity is not proof of progress.

A later change in direction must not rewrite the Task, the Block, or any other independent fact. Historical execution remains historically true. When the human withdraws a Task or a Block from a Priority, that relationship is removed and is not retained as history.

The decisions are [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md) and [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md).

**Unresolved:** whether one Priority may serve more than one Destination, Destination and Priority lifecycle, editing and removal of those endpoints, Context binding, whether Cadence explicitly relates to a Priority, and any finer boundary among Destination, Objective, and Target. The execution-to-Priority pairs are stored. What a later deletion of a cited Task, Block, or Priority does remains the deferred foreign key: a committed delete of a cited endpoint fails, and the pair row is left as it was. That is not an endpoint-lifecycle decision.

## External temporal source

An external temporal source supplies time-related facts and retains provenance.

Google Calendar is the first identified example. Conceptually, a Google Calendar event is an externally sourced temporal fact, may be represented as a Commitment, and may participate in Timeline, present-moment orientation, and Pulse. In present-moment orientation that participation is only as a Commitment that contains the supplied instant. It is not a ranking input and not a next action.

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
| Expression | is transient evidence and is not | a canonical fact |
| Candidate understanding | may propose, and does not establish | one canonical kind |
| Capture | may, by one explicit establishment act, produce | one Task, one Note, or nothing |
| Interpretation | may propose, and does not establish | structure |
| Note | may, by explicit user establishment, support while remaining intact | a later Task or other established fact |
| Destination | is not | a Target, an Objective, a Deadline, or a Context |
| Priority | is sustained attention downstream of | a Destination |
| Priority | is not | Must Do, Due, Planned, a Block, or the Active Thread |
| Cadence | may also be recurring attention toward conditions that matter to | a Destination |
| Directional relationship | records an explicit human establishment that one truth exists in service of | a larger human-established direction |
| Task or Block | may, by a separate explicit act, exist in service of | a Priority |
| That pair | is one relationship; withdrawal removes it and does not rewrite | the Task, the Block, or the Priority |
| Task or Block in service of a Priority | does not create | an execution-to-Destination relationship |
| Directional relationship | is not | provenance, progress, a score, or a graph |
| Task, Block, Commitment, Protected Time, Note, or other temporal fact | need not serve | a Destination or a Priority |
| Task | may be planned independently of | its due boundary |
| Task | may carry a user-set flag | MUST DO |
| Active Thread | is the thread offered by | Resume |
| Active Thread | answers, and does not establish a temporal fact | the user's explicit current Task intention |
| Current Temporal Orientation | answers, for a supplied instant, and does not rank | which established temporal truths contain it |
| Present-moment orientation | composes, without persisting or ranking | Current Temporal Orientation and the Active Thread |
| Recurring Obligation | activates, for a period | an occurrence |
| Completed occurrence | satisfies, and stops burdening the rest of | that period |
| Timeline | composes, without flattening | Commitment, Block, Shift, planned Task, reminder, occurrence, Window |
| Week | perceives, without judging or flattening, across an explicit bounded civil range | where established temporal structure exists, what kind it is, and where nothing is established |
| Month | perceives, without inferring expression or progress | explicitly established direction beside established temporal structure |
| Pulse | orients; a reminder reports | one explicit fact |
| Objective | may contextualize, and is not automatically | Task |

V0-009 implements that composition for a scheduled Work shift, Protected Time, a Block, and a Commitment. V0-010 draws one civil day from it and does not resolve overlap. Planned Tasks, reminders, occurrences, and Windows remain future sources. A shift is not projected as a Commitment. The decisions are [docs/decisions/2026-10-02-timeline-composition.md](docs/decisions/2026-10-02-timeline-composition.md) and [docs/decisions/2026-10-02-day-canvas.md](docs/decisions/2026-10-02-day-canvas.md).

**Unresolved:** multi-Context membership, a suspended thread per Context beyond the one current thread V0 stores, occurrence-versus-Task, external write-back, and the lifecycle gaps marked above. They are listed in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md). Commitment has no subtype catalog. Destination and Priority semantics are decided in [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md). A Task or a Block in service of a Priority, including withdrawal of that relationship, is decided in [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md). [docs/implementation/EXECUTION-DIRECTION-REP-001.md](docs/implementation/EXECUTION-DIRECTION-REP-001.md) stores those pairs. Destination and Priority lifecycle, and Context binding, remain unresolved. The migration is not applied. [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md) remains the discovery record. Note representation, and the reference from a later fact to its originating Note, are decided in [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). A Note can be stored and read. The capture establishment contract is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). A provisional typed surface can establish one Note or one Task from an expression, or establish nothing. That proof is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). The return to a retained Note is decided in [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). The scaffold proof is [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md). The Samsung Galaxy S26 Ultra accepted that scaffold. It is not the production Capture experience. Edit, delete, and archive remain unresolved and are outside operational adoption. There is no Notes application, and no fact yet cites a Note. Present-moment orientation is decided in [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). It is Current Temporal Orientation and the Active Thread. It is not a ranking. NOW-001 implements that projection. The encounter model is [docs/decisions/2026-10-05-experience-architecture.md](docs/decisions/2026-10-05-experience-architecture.md). The surface is not built. The composition does not have to be named NOW. The record is [docs/implementation/NOW-001.md](docs/implementation/NOW-001.md). That discovery does not define Capacity. The bounded reading is [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md). [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. Week shape is decided in [docs/decisions/2026-10-05-week-contract.md](docs/decisions/2026-10-05-week-contract.md). [docs/implementation/WEEK-001.md](docs/implementation/WEEK-001.md) implements that reading and does not add a production interaction. The Week surface is not built. A life-wide Week boundary, and Week interactions beyond perception, remain unresolved. The earlier "NOW selection order" is not current authority.
