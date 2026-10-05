# Product

Orient helps one person remain temporally oriented inside the life they have chosen. It does not manage that life. The repository is named `workday`. That name does not define product identity. The product name is Orient. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md).

Behavior below is the intended product. Work was the first deeply discovered Context. Examples from Work are evidence from that Context. They are not the ontology of the system. The intended product is a multi-context temporal foundation for how the user operates in time. Interaction details that have not been decided are marked unresolved. Historical product questions are in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md). The operational-adoption boundary, and the questions it refuses to answer, are in [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

## Direction

A directional statement, not final copy:

> The system helps the user regain orientation in the lived present: which established temporal truths contain this instant, and which Task the user has explicitly established as their current intention.

The system should know relatively few concepts and understand their relationships deeply. Present-moment orientation is that deterministic composition. It is not a ranking, and it is not persisted. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

An earlier directional statement asked where the user is in the day, what currently matters, what the time was intended for, what they were doing before interruption, and what comes next. That wording is historical. It is not authority for this composition to decide what matters or what the user should do. The still earlier sentence, externalize intentions and return the user to an intended course after interruption, remains the human purpose of reorientation: restore evidence, without a recommendation.

## Sustained importance

Importance derives from relationship to where the user has established they are going, not merely from what currently demands attention. Attention is not evidence of importance.

Destination and Priority name that relationship. They are defined in [DOMAIN.md](DOMAIN.md). They do not replace time as the canvas. They are not Contexts. Their representation is unresolved. Their production implementation classification is unresolved in [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). Discovering them does not make them adoption blockers.

A strong operating foundation makes deviation easier for the human to perceive. Ordinary life contains friction. The aim is not zero disturbance. Stable foundations and explicit relationships make a departure from intended operation more legible. The human determines meaning and cause. The product does not add a Friction object, detect anomalies, or infer a cause.

The system should preserve why an established action exists when that provenance is known. Provenance is an inspectable relationship to evidence the user originated.

## Life loop

The emerging loop is descriptive. It is not a workflow the user must step through.

**Plan.** The user establishes intentional temporal structure where that is useful.

**Live.** The user lives the day.

**Interrupt.** Reality changes the intended course. The product does not require every interruption to be recorded, and it does not detect interruptions.

**Orient.** Present-moment orientation restores two kinds of evidence: the established temporal truths that contain this instant, and the Active Thread. Pulse remains a separate orientation moment. Its behavior is unresolved. Neither decides what the user should do.

**Resume.** The user may return to the Active Thread.

**Transition.** The user intentionally moves into the next part of the day.

When reality and a planned Block differ, favored interactions are Start, Resume, Adjust, and Skip. They are not judgments. Resume is specified below. What Start, Adjust, and Skip write is unresolved.

## Present-moment orientation

The smallest truthful present-moment composition is Current Temporal Orientation together with the Active Thread. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

It is a deterministic projection. It is not persisted canonical truth. It is not a table, a route, or a ranking. NOW-001 implements that projection. The eventual experience does not have to be named NOW. That experience is not designed here, and it is not built.

Current Temporal Orientation answers which established temporal truths contain the supplied current instant. The Active Thread answers what Task the user has explicitly established as their current intention. They are independent. Neither establishes, validates, ranks, or overrides the other. They may agree, disagree, overlap conceptually, or one may be absent. Keeping both preserves temporal reality and explicit human intention.

An empty Current Temporal Orientation means only that no established temporal fact contains this instant. It does not mean free, available, allocatable, unoccupied, nothing important, nothing planned, or nothing to do.

No Active Thread means only that no current Task intention has been explicitly established. The system does not infer one.

The first composition contains only those two truths. Today Tasks, all open Tasks, Must Do, Due, Planned, Notes, Destination, Priority, Cadence, reminders, Pulse, Capacity, inferred Context, current Context, upcoming temporal facts, the next Commitment, arbitrary nearby Tasks, and recommendations are not inputs merely because the data exists. A later orientation experience may include one of them only after its relationship to present orientation is independently established.

The composition does not determine what matters right now, a highest priority, urgency, a best next action, or what the user should do next. A next temporal boundary, a next temporal fact, a next planned Task, a next due Task, and the next thing the user should do are not equivalent. No next behavior is authorized.

Current Context is not inferred from the Active Thread, from Work, from a Block, a Commitment, or Protected Time, or from whichever fact contains the instant. Task Context and temporal-fact Context stay properties of those source truths. How a Context becomes current remains unresolved.

After interruption, the composition can restore the two kinds of evidence above. That is reorientation, not a recommendation. The system does not infer an interruption and does not store interruption state.

The product should also help the user recover what they needed to remember. That job belongs to Capture and Notes. Whether a later orientation experience surfaces a Note is not decided. A Note is not part of this composition.

Earlier questions — which Context is operating, where the user is in a cadence, what needs attention now, and what comes next — and the unfinished attention hierarchy are superseded as the composition. Family, TeamLab, and Financial still have no discovered cadence. A Block can still say what the user intended a span for. A Commitment can still say what is fixed. Those facts participate here only when they contain the supplied instant. The historical wording remains in the foundation ledgers.

V0-016 is the Current Temporal Orientation reading on Tasks. It is one input. NOW-001 composes it with Resume and does not change the Tasks screen. The record is [docs/implementation/NOW-001.md](docs/implementation/NOW-001.md).

## Timeline

Timeline composes temporal truth. It does not resolve temporal truth.

Time is the underlying space. Multiple established truths may describe the same time without one canceling the others.

Nothing established is not the same as available.

Timeline is a projection. It is not a stored primitive, a calendar event, or a generic event. The question it serves is: "What is the shape of this time?"

V0-009 answers that for a requested half-open civil range, not for an implied today. V0-010 draws one selected civil day of that answer on Schedule. V0-011 lets the user select a transient local-clock span on that day. V0-012 lets the user name the kind of truth they intend for that span: protect it, choose a purpose for it, or add a commitment. V0-012A places that question on the canvas with the selected range, and lets the start and end be refined before anything is established. V0-013 asks for the minimum fields of the chosen kind and writes the existing fact only after an explicit Save. The span and the intention are not themselves stored. Timeline composes four established sources and keeps their meanings:

- a scheduled Work shift, including Opening, Mid, or Closing
- Protected Time
- a Block
- a Commitment

Work Off is not occupied time. A missing Work row is unknown and is not occupied time. An overlap stays as separate facts. It is not a conflict, and no source outranks another. The decision is [docs/decisions/2026-10-02-timeline-composition.md](docs/decisions/2026-10-02-timeline-composition.md).

Planned Tasks, reminders, relevant recurring-obligation occurrences, and meaningful Windows remain intended composition sources. They are not part of the V0-009 projection. A planned Task and a Block meet time for different reasons. Today is not the Timeline.

The day surface is where the user selects time, refines it, says what that time means, and then explicitly establishes that fact. V0-013 does that for Protected Time, a Block, and a Commitment. That slice does not edit an existing fact. V0-015 later edits and deletes those three kinds. Work on the canvas stays without those actions. A week surface can show where the week is already spoken for, where a purpose was chosen, and where nothing is established. A month surface is broad orientation. Present-moment orientation is the lived instant inside established truth: Current Temporal Orientation and the Active Thread. Week, Month, and that experience are not built. They are part of the intended production system and block operational adoption. Further Week and Month interactions are unresolved, and naming those roles does not authorize building them. The present-moment decision does not design the experience. V0-016 lists, on Tasks, the established facts that contain the current instant. That list is Current Temporal Orientation. It does not rank the facts, and it does not read the Active Thread.

Experience before V0-009 suggests the user may drag a Task into time. The Task would remain a Task. The allocation would be a Block associated with that Task. That relationship is not stored.

Today remains the user's intentional commitment of work to the current day. It is not the Timeline, and it is not every unresolved Task.

**Unresolved:** the boundary of a life-day. The requested range is an explicit civil span. It does not decide that every day in the product is midnight to midnight. A Block may span a civil date without defining that boundary.

## Pulse

A Pulse is a moment of temporal orientation. A reminder tells the user about one explicit fact or attention point. A Pulse restores a sense of where the day is.

Directional questions a Pulse may serve remain unresolved. They are not the present-moment composition, and they do not authorize that composition to decide importance or a next action. "What currently matters" and "what is next" are not answers present-moment orientation gives. A next temporal boundary, a next temporal fact, a next planned Task, a next due Task, and the next thing the user should do are not the same question.

No notification cadence is defined. Repeated nagging is not a Pulse. Productivity pressure is not a Pulse. Opening the app, or a transition in the day, might later be Pulse moments. Exact behavior is to be discovered through use. Pulse is not an input to the first present-moment composition.

V0 should be capable of an in-app Pulse. It does not require push infrastructure.

## Resume and Active Thread

The Active Thread is the user's current explicit thread of intention. It does not have to belong to a Shift or a Context. The user establishes it. Work examples include a department walk, Bay Audits, Cycle Counts, a specific Task, or another cadence activity. Examples are not a fixed catalog.

A defining interaction is:

> Resume → [Active Thread]

If life interrupts the user, the thread does not disappear. The product does not detect the interruption and does not need to know why it happened.

"Previous" is not an arbitrary earlier Task. If the user intentionally changes thread, the Active Thread changes and the previous Task stays open. If that thread is completed or explicitly left, it is no longer offered for Resume. Ending a Work shift, changing Context, or reaching a Block's clock time does not by itself abandon the thread.

V0 establishes the thread with Start on one open Task. Leave thread clears it without completing the Task. The thread is that one relationship. It is not a separate active flag on the Task, and it is not inferred from MUST DO, a planned day, or a due date. It does not establish, validate, rank, or override Current Temporal Orientation. That projection does not establish the thread. The storage decision is [docs/decisions/2026-10-02-active-thread.md](docs/decisions/2026-10-02-active-thread.md). The composition is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

**Unresolved:** whether more than one Context can retain a suspended thread at the same time. V0 keeps only the one current thread.

## Reorientation

Reorientation should take seconds. After interruption, present-moment orientation restores which established temporal truths contain the instant, and which Task the user explicitly established as the Active Thread. A useful prompt may point at that thread, for example "Resume: Cycle Counts." It does not recite a backlog, choose a next action, or treat a late step as failure. The system does not infer the interruption. See [TIME_MODEL.md](TIME_MODEL.md) and [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md).

When useful, the product makes elapsed time, current position, the next Commitment, the intended Block, and the open time before the next fixed Commitment legible. Legibility is not control. That sentence is not the present-moment composition. It does not put the next Commitment into that composition, and it does not authorize a next action. A next temporal boundary, a next temporal fact, a next planned Task, a next due Task, and what the user should do next are not equivalent.

## Capture

Capture is an interaction. It is not a Task state. Capture must take seconds.

V0-017 makes typed capture a title and Save. Context, a planned day, a due day, and Must Do stay optional and explicit. Saving creates an ordinary Task. It does not start that Task, and it does not place it in the current Block, Commitment, Protected Time, or Today. The same capture is on Tasks and Schedule, and an unsaved draft stays with the signed-in session while the user moves between those two. Reload still drops an unsaved draft. Typed capture on that surface creates a Task because the surface already means create a Task. What a Note means is established. A provisional typed general-capture surface on Tasks can establish one Note, one Task, or nothing from an expression. It does not classify the text, and it is not Quick Capture. The establishment contract is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). The proof is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). No application speech stack is implemented, and no speech provider is chosen. On the primary phone, keyboard dictation supplies the expression. The probe is [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md).

One establishment act may produce one Task or one Note, or the interaction may produce nothing. The product preserves the distinction between a retained experience and an explicit action. Neither result is required to belong to a Context. The expression before that act is not either result.

When the user explicitly establishes a Note, that retained experience remains directly revisitable through the conceptual Capture experience. Capture is where an experience may be retained, and it is where previously retained experience can be revisited. "Capture has memory" names that relationship. It is not a stored object and not a Notes application. The return exposes the complete Note collection from `loadNotes`, in that function's existing retrieval order. A complete empty collection means no Note has been retained. A failed or incomplete read is not an empty collection. What may be shown of each Note is its content and its capture instant. Selecting or opening a Note means the human is referring to that retained experience. The reference does not edit, delete, archive, or establish another fact. Provenance begins only when the human explicitly establishes a Task from that retained experience. The decision is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). The source relationship is [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md). The scaffold proof is [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md). NOTE-REVISIT-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. It is not the production Capture experience. The phone showed the canonical instant directly, and opening the collection moved the content below Capture. This paragraph does not choose a presentation or a layout.

A captured experience may not yet contain enough for the user to know what should happen. Further observation, questioning, learning, or reflection may produce sufficient understanding. Action is not established because imperative language appears, because software classifies text as actionable, because a parser detects a verb, or because an interpretation believes something sounds like a Task.

Interpretation may propose structure. The user establishes meaning. A useful conceptual sequence is experience, capture, interpretation, human establishment, and execution. It is not a required workflow. Not every capture passes through every stage.

Future typed or spoken capture may be interpreted into candidate structure where the user's expression supports it: observations, retained information, candidate actions, temporal references, possible durations, unresolved information, or other explicitly supported structure. Those are proposals. They are not a canonical Task, Block, Commitment, Priority, Destination, or other domain truth until the user establishes them. No language model, speech provider, parser, confidence algorithm, or interpretation interface is chosen. A later decision would be required before an external proposer could supply a candidate. That proposer would not be temporal or domain authority, and it would not establish importance, Priority, availability, current Context, Tasks, temporal meaning, what should be sacrificed, or what the user should do. The deterministic runtime remains the authority.

Text capture was enough for the earliest usable system. "Voice does not block first use" is that historical gate. Voice capture remains part of the intended production system. On the primary phone it is keyboard dictation into the expression, and that acquisition no longer blocks adoption as missing technology. The production experience still does. Spoken capture follows the same distinction once the user has established which result they mean:

- An action the user explicitly establishes becomes a Task immediately. It does not have to be done at the moment of capture. Work illustrations: "Call the customer tomorrow." "Finish the manager verification today." "Remind me at two to check with receiving."
- Speech the user explicitly retains as experience becomes a Note. Work illustrations: "Note: manager wants us to revisit this display." "Observation: this area may need a different approach." The word "observation" here is speech, not a domain primitive.

The dates, times, and reminder language in those illustrations are not extracted. Establishing the Task does not establish them.

No capture grammar is established. Wording that suggests action, a note, a date, a time, a reminder, or Must Do does not establish those facts. A future decision would be required before any deterministic reading of them. No speech provider is chosen. No AI, ML, LLM, or agentic system is temporal or domain authority. A candidate does not establish meaning.

When an expression does not yet have enough established meaning to be a canonical fact, that unresolved result is legitimate. The expression stays available, verbatim, while the interaction continues. The user may establish a Note, a Task, or nothing. The expression is not a stored transcript. Incomplete understanding is legitimate information. A Note may retain it when the user establishes that Note. The product does not force that retention.

**Unresolved:** whether a Note may be edited, deleted, or archived. Those three are outside operational adoption until their semantics are independently established. That placement does not make a Note immutable or undeletable. The semantic relationship from a retained Note to a Task is decided in [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md). Storage, runtime, and the physical interaction are not. Final placement and final wording of general capture, and any future grammar, remain open. The return to a retained Note is accepted as scaffold proof on the Samsung Galaxy S26 Ultra. It is not the production Capture experience. A speech provider is not required for the primary phone. The probe is [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md). The establishment contract is [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md). The typed proof is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). The minimum Note representation is [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md). The return is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). That Note can be stored and read. There is no Notes application. Quick Capture does not guess a date, a time, a reminder, or Must Do.

## Task, Note, Today, and MUST DO

A Task means action is required. Explicitly recorded action becomes a Task immediately. It does not have to be done now. It is not a retail type, a project, or a medical instruction. It is not required to belong to a Context.

A Note is a retained fragment of experience, defined in [DOMAIN.md](DOMAIN.md). It carries no inherent obligation. It does not burden the Task list. The product must not infer action from it. It is not required to belong to a Context. It may remain informational indefinitely, and it remains intact if the user later establishes a fact from it.

The user may later establish a Task from a Note only by explicit intent. The Note is not replaced. The Task keeps an inspectable relationship to the originating Note when the human establishes that relationship. The Task title need not equal the Note content. The Task remains `user_created`. "Context" in older sentences about originating information means provenance, not necessarily the Context primitive. The reference lives on the Task. The decisions are [docs/decisions/2026-10-04-note-representation.md](docs/decisions/2026-10-04-note-representation.md) and [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md).

**Unresolved:** whether a Note may be edited, deleted, or archived. Those operations are outside operational adoption until their semantics are independently established, and that placement does not make a Note immutable or undeletable. The source relationship is decided. Its storage, runtime, and physical interaction are not. Whether a Task or Note can belong to one Context, to more than one, or span Contexts remains open. Absence of a Context remains representable. The return to a retained Note is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md).

Today means this Task is deliberately planned for the user's current civil day. That relationship is `planned_on` equal to the civil date of a supplied instant in the confirmed IANA time zone. It is not stored separately. Due, Must Do, Active Thread, and the day the Task was created do not establish it. It is not Priority, and it is not a rank. It does not reserve time. In the Work discovery, that commitment was described as the workday or shift. Today is not identical to a Shift. How Today meets a Context cadence remains unresolved. See [docs/implementation/V0-005.md](docs/implementation/V0-005.md).

Planned and due stay independent. A Task may be due Thursday and planned for Monday. Changing the plan must not silently change the due boundary.

An open Task's title, optional Context, planned day, due day, and Must Do can be edited. Save is the write. Cancel writes nothing. That edit does not complete the Task, remove it, or replace the Active Thread. Reschedule and carry-forward stay unresolved. The record is [docs/implementation/TASK-EDIT-001.md](docs/implementation/TASK-EDIT-001.md).

MUST DO is a persistent attention flag the user sets. It is not Priority, not a bucket, not a score, and not inferred urgency. It stays prominent until the user completes, reschedules, or removes the Task.

Completing something should generally require one simple interaction. Avoid priority matrices. V0 does not add a stack of priority levels. Priority, as defined in [DOMAIN.md](DOMAIN.md), is not that stack.

**Unresolved:** what reschedule writes, whether it clears MUST DO, and what carry-forward means.

## Work schedule and cadence

The user needs to enter a personal work schedule manually, enough for V0 to know shift boundaries. This is a Work fact. It is not a universal life calendar and not workforce scheduling software.

Conceptual shape:

| Day | Time | Shift type |
| --- | --- | --- |
| Mon | 6:00–3:00 | Opening |
| Tue | OFF | |
| Wed | 8:00–5:00 | Mid |
| Thu | 11:00–8:00 | Closing |

This example is partial. It does not make Monday the user's universal week. Inside Work, the Lowe's fiscal week begins Saturday. That fact does not redefine any other calendar. See [TIME_MODEL.md](TIME_MODEL.md).

Opening, Mid, and Closing remain meaningful. The user chooses the type. It is not inferred from the clock. V0-004 can name the operative shift and, during an Opening shift, whether the FSR intended-before boundary is still ahead. It does not turn cadence steps into Tasks, and it does not sequence Mid or Closing. See [CADENCE.md](CADENCE.md) and [docs/implementation/V0-004.md](docs/implementation/V0-004.md).

The entry surface is one Work fiscal week at a time. Each civil date is either not entered, Off, or one scheduled shift. Off is not the same fact as a date with nothing entered. Viewing that week and editing it are distinct modes. Saving a week is one action. Tasks and Schedule are the current primary navigation surfaces. A confirmed IANA time zone interprets the local times. The storage decision is [docs/decisions/2026-10-02-work-schedule.md](docs/decisions/2026-10-02-work-schedule.md). The compact reading surface is [docs/implementation/V0-004A.md](docs/implementation/V0-004A.md).

From the schedule, while the user is in Work, the product should eventually understand shift start, shift end, shift type, remaining shift time, which Work cadence applies, and which Work windows intersect the shift. V0-004 says the operative position, the Power Hour state, and the next established boundary. Remaining shift time, and any cadence step beyond the FSR boundary, are still not projected.

**Unresolved:** how a shift boundary meets the rest of that day, and any schedule fact beyond the date, the local bounds, the explicit shift type, and Off.

## Protected Time

Protected Time is time the user has deliberately made unavailable for allocation. Protected does not mean occupied. It is not Work Off, not a Task plan, and not a claim that any remaining hour is free. The Schedule surface can show it beside the Work week without making it a Work setting. See [docs/implementation/V0-006.md](docs/implementation/V0-006.md).

A Block is time the user has deliberately chosen a purpose for. It is not Protected Time, and neither changes the other. See [docs/implementation/V0-007.md](docs/implementation/V0-007.md).

A Commitment is time constrained by something the user has committed to. It is not a Block and not Protected Time. V0-008 stores a user-created Commitment on Schedule. It does not connect Google Calendar. See [docs/implementation/V0-008.md](docs/implementation/V0-008.md).

## Reminders

A reminder is an explicit attention point the user establishes. Caregiving examples the user named are pod-change reminders, Dexcom-related reminders, and doctor appointments. Appointments are Commitments. The reminders are not medical advice. The product must not interpret device data, change care timing, or infer urgency. An external calendar event is not automatically a reminder.

No non-work Recurring Obligation, with a defined availability and deadline, is established. V0 must be capable of representing repeating responsibilities and explicit reminders. The first implementation of that capability may be minimal. No recurrence algorithm is chosen.

## Notifications

Notifications and Pulses should restore orientation. They should not create fatigue. No rule is established.

Candidates noticed in Work, not universal rules: shift start, genuinely time-specific commitments, meaningful return-to-cadence prompts, MUST DO items near shift end, and shift closeout.

A good notification might say "Resume: Cycle Counts." A poor strategy repeatedly announces that many tasks are overdue.

**Unresolved:** which candidates are in scope, and any timing, frequency, or dismissal behavior.

## Operational adoption

The user will not operationally adopt this system at work, or as their personal temporal system, while it is an MVP, a partial workflow, or good enough for first use. The contract is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

Phone acceptance of a tranche is engineering evidence. It is not that adoption.

Planning against temporal reality is part of the intended system: protect time, acknowledge existing Commitments, choose what remaining time is for, then plan Tasks against actual temporal reality. Capacity semantics are unresolved. Timeline does not calculate Capacity. Unestablished time is not available. Protected does not mean occupied.

Production interaction and visual experience are required after the underlying semantics are sufficiently complete. The current scaffolding is investigative. This statement does not start a redesign.

## Minimum usable system

V0 is the historical name for the smallest system that could generate real use. Text and in-app behavior were described as enough to start. Voice, push, and Google Calendar were allowed to follow that first usable core. That first-use gate is superseded for operational adoption by the contract above. The numbered list remains the record of what V0 named. It is not permission to adopt an unfinished system, and it is not permission to implement an item whose meaning is still unresolved.

1. **NOW.** Present-moment orientation. The first composition is Current Temporal Orientation and the Active Thread. NOW-001 implements that projection. The experience is not built. It does not rank, and it does not choose what the user should do. The earlier attention hierarchy is not that composition. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). The record is [docs/implementation/NOW-001.md](docs/implementation/NOW-001.md).
2. **Today / Timeline.** Today is the open Tasks planned for the confirmed civil day. Timeline composes a scheduled Work shift, Protected Time, a Block, and a Commitment for a requested civil range, with those meanings intact. V0-010 shows one civil day of that projection. V0-011 can select a transient local-clock span on that day. V0-012 can name a transient intended meaning for that span. V0-012A can refine that span on the canvas before the meaning is chosen, and can still refine it afterward. V0-013 can establish the span as Protected Time, a Block, or a Commitment after an explicit Save. It does not edit an existing fact. Planned Tasks are not on that projection yet.
3. **Capture.** Create a Task or a Note quickly, or establish nothing. Text was sufficient for first use. Voice does not block that historical first use. On the primary phone, keyboard dictation supplies spoken expression text, and that acquisition does not block adoption as missing technology. What a Note means is established. The establishment contract is decided. A provisional typed proof exists. No application speech stack is implemented. Transcription is not chosen.
4. **Tasks.** Create, edit, complete, an optional due boundary, a planned day, MUST DO, and a Context when the user assigns one. Not project management.
5. **Notes.** Create and retain a Note. An explicitly established Note remains directly revisitable through the conceptual Capture experience. That return is accepted as scaffold proof on the Samsung Galaxy S26 Ultra. It is not the production Capture experience, and it is retained experience, not a Notes application. The human may explicitly establish a Task from a retained Note, and that Task may cite the Note. The Note remains. The semantic relationship is decided. Storage, runtime, and the physical interaction are not. The minimum representation is decided, and that Note can be stored and read. A provisional typed path can establish one Note from an expression. Edit, delete, and archive are not required for operational adoption, and their semantics are not decided. The return is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). The source relationship is [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md). The scaffold proof is [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md).
6. **Blocks.** Reserve a time range, or potentially a whole day. A Block may relate to a Context. It does not require Tasks or an outcome.
7. **Commitments.** Time constrained by something the user has committed to. User-created rows exist. External calendar sourcing may follow.
8. **Active Thread / Resume.** The user explicitly sets the thread. The system can offer Resume on return. No automatic interruption detection.
9. **Contexts.** Work, Family, TeamLab, and Financial. No workspace administration. Unassigned Tasks and Notes remain allowed. Permanent membership in several Contexts is not decided.
10. **Work schedule.** Manual entry sufficient to know shift boundaries. Opening, Mid, and Closing stay meaningful.
11. **Work cadence.** The discovered cadence can participate in orientation. Do not build a cadence editor first.
12. **Recurring obligations and reminders.** The system can represent repeating responsibilities and explicit reminders. The first cut may be minimal.
13. **Pulse.** Architecturally capable of orientation moments. The earliest behavior may be in-app only.
14. **External calendar readiness.** Leave a clean boundary for Google Calendar. The historical V0 gate did not require that integration before the app could run, and it did not decide the API. Operational adoption still does not require Google to be connected. It does require the interoperability boundary in the contract. Do not decide the API here.

### Not in V0

The list below is the historical V0 exclusion. "Unless later evidence changes priority" does not waive deterministic temporal authority. AI, LLM, ML, and agentic inference still do not decide what time means. See [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md).

Excluded unless later evidence changes priority:

- AI assistant, LLM inference, ML, and agentic behavior as the product's authority. That item is not a deferral.
- productivity scoring, streaks, gamification, and complex analytics
- project-management hierarchy, complex tagging, and team collaboration
- workforce management
- automatic medical interpretation or care decisions
- automatic interruption detection
- elaborate customization and many priority levels
- broad integrations, including DeptSync, Wealth Engine, and bidirectional Google Calendar sync
- a watch application or a native mobile application

Browser or PWA capabilities were not authorized by the original V0 text. ARCHITECTURE-001 later required a mobile viewport, a web app manifest, and home-screen metadata. That installability requirement stands. A service worker stays deferred.

### Experience the model must be able to describe

The user opens the system. Present-moment orientation can show which established temporal truths contain the instant, and the Active Thread when one has been explicitly established. The Timeline can show a fixed Commitment, a protected Block, planned Tasks, and a Work shift when one exists. The user captures a Task in seconds and marks it MUST DO. They establish an Active Thread. They are interrupted. They return. Resume can offer that same thread. A Block ends. The system helps the transition without judging them.

That day is the experience this section describes. It is not implemented here. The sentence that once made the next Commitment visible as part of this return is historical. It does not authorize next behavior, and it does not put the next Commitment, Must Do, or planned Tasks into the first present-moment composition.

### Acceptance

The user should be able to use the system for one complete real day as their primary orientation layer, without a second task system to hold the cadence they intended.

External authorities may remain. Google Calendar may remain authoritative for existing calendar commitments. Work systems remain authoritative for employer-owned facts. Wealth Engine remains authoritative for its financial truth. This product coordinates time and attention.

## Non-goals

- Managing the user's life, or inventing their routines
- Generic task management as the product's identity
- A generic calendar, habit tracker, streak system, wellness score, or life-management dashboard
- Project, workforce, department, or employee scheduling systems
- Scoring productivity or punishing an interrupted plan
- Acting as an AI assistant, or inferring meaning the user did not supply
- Medical interpretation, treatment decisions, or inferred clinical urgency
- Replacing DeptSync or Wealth Engine, or integrating with them in this phase
- Replacing Google Calendar, or claiming ownership of its events
- Assigning every store responsibility to this user
- Hard-coding the domain around aisle, bay, or other retail vocabulary
- Treating Lowe's facts as universal life rules
- A generic Personal Context, or any Context without evidence
- Reducing protected family time to a checklist
- Treating chosen time as less important because it was not imposed
- Inferring action from informational capture
- Inferring Priority from attention, urgency, recency, or frequency
- A Friction object, anomaly detection, or an inferred cause of deviation
- Turning targets, objectives, or interrupted cadence into punitive status language
