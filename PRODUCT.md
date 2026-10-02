# Product

The product helps one person remain temporally oriented inside the life they have chosen. It does not manage that life. The repository is named `workday`. The product name is unresolved. See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

Behavior below is the intended product. Work examples are evidence from one Context. Interaction details that have not been decided are marked unresolved. Current questions are in [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md).

## Direction

A directional statement, not final copy:

> The system helps the user understand where they are in their day, what currently matters, what they intended this time for, what they were doing before interruption, and what comes next.

The system should know relatively few concepts and understand their relationships deeply. NOW should eventually be a deterministic projection of what is true at the current moment. Its ranking is not finalized.

Explicit facts that projection may use include current time, current date, Commitment boundaries, Block boundaries, Work shift boundaries, operational Windows, explicit reminders, due boundaries, planned work, MUST DO, the Active Thread, recurring-obligation occurrences, and Context. These are candidate inputs, not an approved order.

## Life loop

The emerging loop is descriptive. It is not a workflow the user must step through.

**Plan.** The user establishes intentional temporal structure where that is useful.

**Live.** The user lives the day.

**Interrupt.** Reality changes the intended course. The product does not require every interruption to be recorded, and it does not detect interruptions.

**Orient.** NOW and Pulse restore temporal orientation.

**Resume.** The user may return to the Active Thread.

**Transition.** The user intentionally moves into the next part of the day.

When reality and a planned Block differ, favored interactions are Start, Resume, Adjust, and Skip. They are not judgments. Resume is specified below. What Start, Adjust, and Skip write is unresolved.

## NOW

NOW is the conceptual orientation surface for the whole system, and the primary surface of V0.

NOW should eventually help answer:

1. What context am I operating in?
2. Where am I in the cadence I intended?
3. What was I doing, and what is my Active Thread?
4. What needs my attention now?
5. What comes next?

This is not a finalized interface contract. Family, TeamLab, and Financial have no discovered cadence, so question 2 stays unanswered there rather than invented. A Block can still say what the user intended the time for. A Commitment can still say what is fixed.

The product should also help the user recover what they needed to remember. That job belongs to Capture and Notes. Whether NOW itself surfaces a Note is not decided.

**Unresolved:** the attention hierarchy, including how NOW chooses a Context, and whether the user enters or switches Context, time supplies it, or some combination.

## Timeline

Timeline is an experience. It is not established as a stored primitive.

It composes the shape of a day from facts that keep their own meanings:

- Commitments
- Blocks
- Work shifts
- planned Tasks
- reminders
- relevant recurring-obligation occurrences
- meaningful Windows

It does not flatten those into a generic event. The question it serves is: "What is the shape of my day?"

Today remains the user's intentional commitment of work to the current day. It is not the Timeline, and it is not every unresolved Task. Planned Tasks may appear on the Timeline because they were planned. A Commitment or a Block may appear because it occupies time. Those are different reasons.

**Unresolved:** the boundary of "a day," and the exact composition rules. A Block may span a day without defining that boundary for the whole product.

## Pulse

A Pulse is a moment of temporal orientation. A reminder tells the user about one explicit fact or attention point. A Pulse restores a sense of where the day is.

Directional questions a Pulse may serve:

- Where am I in my day?
- What is this time intended for?
- What currently matters?
- What was I doing?
- What is next?
- How much usable time exists before the next fixed Commitment?

No notification cadence is defined. Repeated nagging is not a Pulse. Productivity pressure is not a Pulse. Opening the app, or a transition in the day, might later be Pulse moments. Exact behavior is to be discovered through use.

V0 should be capable of an in-app Pulse. It does not require push infrastructure.

## Resume and Active Thread

The Active Thread is the user's current explicit thread of intention. It does not have to belong to a Shift or a Context. The user establishes it. Work examples include a department walk, Bay Audits, Cycle Counts, a specific Task, or another cadence activity. Examples are not a fixed catalog.

A defining interaction is:

> Resume → [Active Thread]

If life interrupts the user, the thread does not disappear. The product does not detect the interruption and does not need to know why it happened.

"Previous" is not an arbitrary earlier Task. If the user intentionally changes thread, the Active Thread changes and the previous Task stays open. If that thread is completed or explicitly left, it is no longer offered for Resume. Ending a Work shift, changing Context, or reaching a Block's clock time does not by itself abandon the thread.

V0 establishes the thread with Start on one open Task. Leave thread clears it without completing the Task. The thread is that one relationship. It is not a separate active flag on the Task, and it is not inferred from MUST DO, a planned day, or a due date. The storage decision is [docs/decisions/2026-10-02-active-thread.md](docs/decisions/2026-10-02-active-thread.md).

**Unresolved:** whether more than one Context can retain a suspended thread at the same time. V0 keeps only the one current thread.

## Reorientation

Reorientation should take seconds. A useful prompt points at the thread to resume, for example "Resume: Cycle Counts." It does not recite a backlog, and it does not treat a late step as failure. See [TIME_MODEL.md](TIME_MODEL.md).

When useful, the product makes elapsed time, current position, the next Commitment, the intended Block, and the open time before the next fixed Commitment legible. Legibility is not control.

## Capture

Capture is an interaction. It is not a Task state. Capture must take seconds.

Capture produces either a Task or a Note. The product preserves that distinction. Neither result is required to belong to a Context.

Text capture is enough for the earliest usable system. Voice remains a major desired capability and does not block first use. Voice follows the same distinction:

- An explicitly actionable utterance becomes a Task immediately. It does not have to be done at the moment of capture. Work illustrations: "Call the customer tomorrow." "Finish the manager verification today." "Remind me at two to check with receiving."
- Speech the user explicitly marks as information becomes a Note. Work illustrations: "Note: manager wants us to revisit this display." "Observation: this area may need a different approach." The word "observation" here is speech, not a domain primitive.

A deterministic grammar may eventually recognize actionable language, "note," "observation," due dates, relative dates, explicit times, reminders, and MUST DO. The grammar is not defined. No speech provider is chosen. No AI, ML, LLM, or agentic interpretation is part of the system.

If the product cannot confidently tell actionable from informational, it preserves the transcript and the user chooses Task or Note. Unrecognized speech stays verbatim.

**Unresolved:** the capture mechanics, the grammar, and a clear action whose date, time, reminder, or MUST DO mark cannot be confidently read.

## Task, Note, Today, and MUST DO

A Task means action is required. Explicitly recorded action becomes a Task immediately. It does not have to be done now. It is not a retail type, a project, or a medical instruction. It is not required to belong to a Context.

A Note means information worth retaining when action has not been established. A Note does not burden the Task list. The product must not infer action. A Note is not required to belong to a Context.

The user may later convert a Note into a Task only by explicit intent. The Task keeps the originating information. "Context" in that sentence means provenance, not necessarily the Context primitive. No schema for that provenance is defined.

**Unresolved:** which originating information must be kept; whether a Task or Note can belong to one Context, to more than one, or span Contexts. Absence of a Context remains representable.

Today is intentional temporal commitment for the current day. It does not automatically collect every unresolved Task. In the Work discovery, that commitment was described as the workday or shift. Today is not identical to a Shift. What a day is, and how Today meets a Context cadence, is unresolved.

Planned and due stay independent. A Task may be due Thursday and planned for Monday. Changing the plan must not silently change the due boundary.

MUST DO is a persistent attention flag the user sets. It is not a bucket, a score, or inferred urgency. It stays prominent until the user completes, reschedules, or removes the Task.

Completing something should generally require one simple interaction. Avoid priority matrices. V0 does not add a stack of priority levels.

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

The entry surface is one Work fiscal week at a time. Each civil date is either not entered, Off, or one scheduled shift. Off is not the same fact as a date with nothing entered. A confirmed IANA time zone interprets the local times. The storage decision is [docs/decisions/2026-10-02-work-schedule.md](docs/decisions/2026-10-02-work-schedule.md).

From the schedule, while the user is in Work, the product should eventually understand shift start, shift end, shift type, remaining shift time, which Work cadence applies, and which Work windows intersect the shift. V0-004 says the operative position, the Power Hour state, and the next established boundary. Remaining shift time, and any cadence step beyond the FSR boundary, are still not projected.

**Unresolved:** how a shift boundary meets the rest of that day, and any schedule fact beyond the date, the local bounds, the explicit shift type, and Off.

## Reminders

A reminder is an explicit attention point the user establishes. Caregiving examples the user named are pod-change reminders, Dexcom-related reminders, and doctor appointments. Appointments are Commitments. The reminders are not medical advice. The product must not interpret device data, change care timing, or infer urgency. An external calendar event is not automatically a reminder.

No non-work Recurring Obligation, with a defined availability and deadline, is established. V0 must be capable of representing repeating responsibilities and explicit reminders. The first implementation of that capability may be minimal. No recurrence algorithm is chosen.

## Notifications

Notifications and Pulses should restore orientation. They should not create fatigue. No rule is established.

Candidates noticed in Work, not universal rules: shift start, genuinely time-specific commitments, meaningful return-to-cadence prompts, MUST DO items near shift end, and shift closeout.

A good notification might say "Resume: Cycle Counts." A poor strategy repeatedly announces that many tasks are overdue.

**Unresolved:** which candidates are in scope, and any timing, frequency, or dismissal behavior.

## Minimum usable system

V0 is the smallest system that can generate real use. It is specified here and not built. Text and in-app behavior are enough to start. Voice, push, and Google Calendar may follow after the core is coherent.

1. **NOW.** A useful projection of the current day from facts the system knows. The full attention hierarchy stays open.
2. **Today / Timeline.** The shape of the current day, with semantic differences intact.
3. **Capture.** Create a Task or a Note quickly. Text is sufficient. Voice does not block first use.
4. **Tasks.** Create, edit, complete, an optional due boundary, a planned day, MUST DO, and a Context when the user assigns one. Not project management.
5. **Notes.** Create, retain, and convert explicitly to a Task while keeping provenance.
6. **Blocks.** Reserve a time range, or potentially a whole day. A Block may relate to a Context. It does not require Tasks or an outcome.
7. **Commitments.** Represent fixed or external time. Manual creation may exist first. External calendar sourcing may follow.
8. **Active Thread / Resume.** The user explicitly sets the thread. The system can offer Resume on return. No automatic interruption detection.
9. **Contexts.** Work, Family, TeamLab, and Financial. No workspace administration. Unassigned Tasks and Notes remain allowed. Permanent membership in several Contexts is not decided.
10. **Work schedule.** Manual entry sufficient to know shift boundaries. Opening, Mid, and Closing stay meaningful.
11. **Work cadence.** The discovered cadence can participate in orientation. Do not build a cadence editor first.
12. **Recurring obligations and reminders.** The system can represent repeating responsibilities and explicit reminders. The first cut may be minimal.
13. **Pulse.** Architecturally capable of orientation moments. The earliest behavior may be in-app only.
14. **External calendar readiness.** Leave a clean boundary for Google Calendar. Do not require that integration before the app can run. Do not decide the API.

### Not in V0

Excluded unless later evidence changes priority:

- AI assistant, LLM inference, ML, and agentic behavior
- productivity scoring, streaks, gamification, and complex analytics
- project-management hierarchy, complex tagging, and team collaboration
- workforce management
- automatic medical interpretation or care decisions
- automatic interruption detection
- elaborate customization and many priority levels
- broad integrations, including DeptSync, Wealth Engine, and bidirectional Google Calendar sync
- a watch application or a native mobile application

Browser or PWA capabilities may eventually fit. They are not authorized by this tranche.

### Experience the model must be able to describe

The user opens the system. NOW says where they are in the day. The Timeline can show a fixed Commitment, a protected Block, planned Tasks, and a Work shift when one exists. The user captures a Task in seconds and marks it MUST DO. They establish an Active Thread. They are interrupted. They return. NOW can offer Resume. A Block ends. The next Commitment is visible. The system helps the transition without judging them.

That day is the target. It is not implemented here.

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
- Turning targets, objectives, or interrupted cadence into punitive status language
