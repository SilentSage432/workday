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

Capture is an interaction, not a state. NOW, Timeline, and Pulse are experience concepts, not stored primitives. An external temporal source is a provenance relationship, not a life-area primitive.

FOUNDATION-001 used Observation as a candidate primitive. That is historical. Capture produces a Task or a Note. The word "observation" may appear in speech that creates a Note.

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

**Unresolved:** whether either can belong to more than one Context or span Contexts; how the user enters or switches Context; and how a transition between Contexts behaves. Those identity questions about folders and workspaces also remain open.

## Shift

A Shift is when the user is working. It is useful in Work because employment has scheduled start and end boundaries and shift types.

Known types: Opening, Mid, and Closing.

A shift has temporal boundaries, for example 6:00 AM → 3:00 PM. The user's actual work schedule should be enterable. Entry stays simple because the product is not workforce scheduling software. See [PRODUCT.md](PRODUCT.md) and [TIME_MODEL.md](TIME_MODEL.md).

V0 stores that personal schedule as one state per civil date: no row yet, Off, or one scheduled shift with an explicit Opening, Mid, or Closing type. Local times use the IANA time zone the user confirmed. If the end is earlier than or equal to the start, the shift continues into the next civil date. The decision is [docs/decisions/2026-10-02-work-schedule.md](docs/decisions/2026-10-02-work-schedule.md).

A shift type selects the Work cadence for that kind of shift. The work schedule and the cadence are different facts.

Because a shift is fixed employment time, Timeline may show it as a Commitment and still show that it is a Shift. Do not drop Opening, Mid, or Closing in that presentation.

Shift does not contain the rest of the product. An Active Thread, a Task, a Note, a Block, and NOW can exist without a Shift. Completing a shift does not, by itself, end the day. What occupies the rest of a particular day is not prescribed.

## Commitment

A Commitment is time that is fixed or externally constrained.

Examples: appointments, school activities, scheduled events, and a Work shift. Doctor appointments named by the user are Commitments. Examples are not a subtype catalog.

A Commitment is not necessarily a Task. It may come from an external source. Manual creation is also allowed. Provenance must say which is which. The product must not claim ownership of an externally sourced Commitment.

**Unresolved:** the subtype list, which external events become Commitments, and whether a Shift is stored as a Commitment or only presented as one.

## Block

A Block is time the user deliberately reserves.

> I have chosen what this time is for.

Examples: protected family time, TeamLab build time, budgeting time, and an entire day reserved for a chosen purpose.

A Block may have a start and end, may span an entire day, may relate to a Context, and may have Tasks associated with it. It does not require Tasks. It does not require a productivity outcome.

Protected time with the user's children is not a checklist. Chosen time is not less important because it was not externally imposed.

**Unresolved:** what Start, Adjust, and Skip change when a Block and the lived day differ. The user remains authoritative. See [PRODUCT.md](PRODUCT.md).

## Cadence

A cadence is how the user intends to move through a meaningful period or Context. It is not a rigid schedule. Interruptions are expected. The product helps the user resume rather than judging the deviation.

The discovered cadences are Opening, Mid, and Closing. They are Work-specific. Their contents are in [CADENCE.md](CADENCE.md). No cadence is established for Family, TeamLab, or Financial. A Block is not a cadence.

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

MUST DO is `mustDo` true or false. The user sets it. It is not a priority score, a task state, or a separate bucket. While set, the Task stays prominent until the user completes, reschedules, or removes it. DATA-001 stores that flag, a civil due date, a separate civil planned day, and a completion instant. A time-of-day due instant is not stored. See [docs/data/DATA-001.md](docs/data/DATA-001.md).

Known operations include add, edit, complete, remove, reschedule, and carry forward.

The resumable relationship is the Active Thread, not a second flag on the Task. See [Active Thread](#active-thread).

**Unresolved:** what reschedule writes, whether it clears MUST DO, and what carry-forward means.

No controlled vocabulary of work kinds is established. A Task is not a medical order.

## Note

A Note means information worth retaining when action has not been established.

A Note does not burden the Task list and is not required to belong to a Context. The user may explicitly convert a Note into a Task. The resulting Task must not lose the originating information. DATA-001 can record that a Task was created directly by the user. It does not yet store conversion from a Note, because Notes are not stored.

**Unresolved:** which parts of the Note must be kept.

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
| Shift | is fixed employment time and may be represented as | Commitment |
| Shift type | selects | a Work cadence |
| Block | is chosen time and may relate to | a Context |
| Block | may have, and does not require | Tasks |
| External temporal source | may supply, with provenance | Commitment |
| Google Calendar | is the first identified | external temporal source |
| Capture | may produce | Task or Note |
| Note | may be explicitly converted into, keeping originating information | Task |
| Task | may be planned independently of | its due boundary |
| Task | may carry a user-set flag | MUST DO |
| Active Thread | is the thread offered by | Resume |
| Recurring Obligation | activates, for a period | an occurrence |
| Completed occurrence | satisfies, and stops burdening the rest of | that period |
| Timeline | composes, without flattening | Commitment, Block, Shift, planned Task, reminder, occurrence, Window |
| Pulse | orients; a reminder reports | one explicit fact |
| Objective | may contextualize, and is not automatically | Task |

**Unresolved:** NOW's selection order, Context switching, multi-Context membership, a suspended thread per Context beyond the one current thread V0 stores, occurrence-versus-Task, Commitment subtypes, external write-back, and the lifecycle gaps marked above. They are listed in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md).
