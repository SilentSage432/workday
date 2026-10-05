# FOUNDATION-001 discovery ledger

Historical record of what was understood at the end of FOUNDATION-001, when the product was scoped as a workday navigator. FOUNDATION-002 resolved some items this file leaves open. FOUNDATION-002A later generalized product scope. FOUNDATION-003 later canonized further Contexts and the minimum usable system. Those later records are [FOUNDATION-002.md](FOUNDATION-002.md), [FOUNDATION-002A.md](FOUNDATION-002A.md), and [FOUNDATION-003.md](FOUNDATION-003.md). This file is not rewritten to match later decisions.

This file records what was established, what was not yet truth, and what was open at that stage.

Canonical behavior lives in the root documents. When this ledger and a canonical document disagree, the canonical document is current. This historical file stays as evidence of the earlier stage.

No architectural decision is made here. Decisions belong in [../decisions/README.md](../decisions/README.md) only after they are actually decided.

## Established truths

### Identity

- Workday is a personal, time-aware workday navigator for one user in a retail management environment.
- Purpose: externalize the user's work cadence, remember what the user notices, and return the user to the intended course when the workday interrupts them.
- The user generally knows what needs to be done. The failure mode is lost orientation and unreliable mental capture, especially observations made while walking the department.
- Known walk context: Home Decor and Flooring, aisle by aisle.
- Known operational vocabulary is Lowe's retail management: LSR (Lowe's Safe Review), FSR (Full Shelf Replenishment, formerly IRP), Manager Portal, pack-down, zoning, homes, bays, overrides, cash office, perimeter doors.
- Sophistication is accuracy to this user's behavior, not feature quantity.
- Core design principle: if using Workday becomes another task to manage, it has been designed incorrectly.

### Explicit exclusions

- Workday is not a generic to-do application, project-management platform, workforce-management system, employee scheduling system, department-management system, AI assistant, productivity scoring system, or a replacement for DeptSync.
- DeptSync is a separate product about department operations and distributed departmental work. A future observation-to-DeptSync path is conceivable and is out of scope. Do not design it in the foundation.
- Store work that somebody must do is not automatically this user's task. Closing-team responsibilities are the stated case.

### Experience

- NOW is the conceptual center and should eventually answer: where am I in my shift; what was I doing; what needs my attention right now; what comes next. Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). The sentence stays as the question this ledger asked.
- Defining interaction: Resume → previous cadence/activity.
- Capture and reorientation should take seconds. Completion should generally be one simple interaction.
- Voice capture is a major desired capability. Preferred processing is deterministic: transcription may come from the device or browser; explicit rules may recognize aisle, bay, action, priority, and date/time; unrecognized speech stays verbatim.
- The core system must not depend on AI, ML, LLMs, or agentic inference, and must not invent meaning.
- MUST DO remains prominent until the user completes, reschedules, or removes it. Priority matrices are to be avoided.
- The user will manually enter a personal schedule. The partial example is Mon 6:00–3:00 Opening, Tue OFF, Wed 8:00–5:00 Mid, Thu 11:00–8:00 Closing. UX is not established. The example does not override the Saturday-first week.
- Notification philosophy: restore orientation, avoid fatigue. A good shape is "Resume: Cycle Counts." A poor shape is repeated announcements that many tasks are overdue. Rules are not established. Candidate attention points: shift start, genuinely time-specific commitments, meaningful return-to-cadence prompts, Must Do items near shift end, shift closeout.

### Domain and time

- Primitives stay distinct: Shift, Cadence, Window, Task, Observation. Recurring obligation is a known concept whose representation is not settled.
- Shift types: Opening, Mid, Closing. Example boundaries: 6:00 AM → 3:00 PM.
- Schedule answers when the user is working. Cadence answers how the user intends to move through the shift. Cadence is generally relative to the shift.
- Three clocks: shift clock, store clock, week clock.
- Shift-clock labels: start of shift, early shift, lunch, afternoon, final hour, closeout. Phase boundaries are not defined.
- Power Hour is 10:00 AM → 2:00 PM on the store clock, independent of the user's shift. Customer focus takes precedence. Tasks remain and stay resumable.
- Fiscal week is Saturday → Friday. Do not normalize it to Monday-first.
- Deadlines, preferred completion targets, and operating objectives are distinct. Weekend availability of an obligation is not a deadline.
- Bay Audits: available weekend, required Wednesday, prefer early. Cycle Counts: available weekend, deadline Friday, prefer well before Friday. Early completion should lift the burden from later shifts.
- Opening's normal sequence is the ordered list in [CADENCE.md](../../CADENCE.md) through associate alignment, then manager and department work as available, then a more fluid afternoon.
- Mid has no rigid sequence.
- Closing concerns are the unordered list in [CADENCE.md](../../CADENCE.md). Some apply only when assigned.
- Weekly strategy: Saturday customer/sales focus as the week begins; Sunday to orient and prepare; Monday–Thursday as the execution runway; Thursday as the desired readiness boundary; weekend emphasis on sales and customer readiness rather than task catch-up.
- Principles 1–12 in [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) are canonical.

### Technical constraints already set

- Do not depend on AI, ML, LLMs, or agentic inference.
- Prefer deterministic behavior.
- Unrecognized speech remains verbatim.
- Implementation has not started. No framework, database, authentication, notification provider, voice API, host, or deployment architecture is chosen.

## Assumptions that must not become truth

These appeared as preferences, examples, or future possibilities. They are not product or architecture decisions.

- Next.js, React, TypeScript, Tailwind CSS, a particular component architecture, mobile-first layout, and PWA are a stated familiarity and a likely direction. They are not a decision to adopt that stack, and they are not initialized.
- Device or browser speech-to-text is an allowed source of transcription, not a selected API or browser feature set.
- Example utterances are illustrations of capture, not a finished grammar and not seeded tasks.
- MUST DO, TODAY, and CAPTURED are discovered labels, not an approved enum or workflow.
- The Monday–Thursday schedule sketch is an illustration, not a default week and not evidence for a Monday-first calendar.
- "Early shift," "Opening," "Power Hour," and "Closing Readiness" appearing as window examples does not prove they are Window records distinct from clocks and shift types.
- A possible later handoff from Observation to DeptSync is not a requirement and not a design.
- Candidate notification moments are not rules.
- Approximate FSR times are not exact deadlines.
- The weekly strategy is not an automated enforcement or catch-up policy.
- Former name IRP is not a second replenishment concept. The name is FSR.
- Nothing in this tranche authorizes a database schema, TypeScript domain model, API, component tree, or deployment diagram.

## Unresolved product questions

1. What are the semantics of MUST DO, TODAY, and CAPTURED? Are they states, flags, capture buckets, or a mix, and are they mutually exclusive? MUST DO is also described as a persistent mark.
2. What selection and ordering rules let NOW answer its four questions? Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). This ledger does not contain that answer.
3. What does Resume restore — a cadence step, a task, an observation, or a thread — and what is "previous" after stacked interruptions?
4. When and how does an Observation become a Task, and what form does an observation keep when it is not this user's work?
5. What do reschedule and carry-forward mean across a shift, a day, and the fiscal week?
6. When a name is shared — Opening, Early shift, Power Hour, Closing Readiness, early-week task execution — is that a Window, a clock phase, a shift type, or more than one?
7. What are the actual rules for a task's available window, preferred window, due boundary, and explicit reminder?
8. How will the product show deadlines, preferred completion targets, and operating objectives as different facts? FSR's approximate morning times and Thursday's desired readiness boundary are not classified. Bay Audits and Cycle Counts are.
9. Is FSR's intended completion anchored to shift-relative cadence, to the 10:00 AM Power Hour boundary, or to the clock?
10. What is the schedule entry experience, and which facts are required beyond start, end, shift type, and OFF?
11. Does Opening's sequence only get remembered, or does Workday also prompt when the user skips or is pulled out of a step?
12. Which closing concerns belong to this user by default, how is "when assigned" represented, and does the user's closing cadence have an order?
13. What, if anything, structures a Mid shift beyond Power Hour and returning to intended work when available?
14. How should the weekly operating strategy appear so it stays context rather than enforced catch-up?
15. Which notification candidates are in scope, and what timing, frequency, and dismissal behavior do they have? How do explicit task reminders relate?
16. What is the voice capture interaction, and which constructs must a deterministic grammar recognize? Verbatim retention of unrecognized speech is already decided.
17. How does early completion of a recurring obligation stop burdening later shifts, and is the obligation its own primitive, a task generator, or both?
18. Do observed actions such as pack-down, zoning, empty home, and follow-up stay free text, or is a controlled vocabulary required? None is established. Do not invent one.
19. What are the boundaries of shift-clock positions (start of shift, early shift, lunch, afternoon, final hour, closeout)?

## Unresolved technical questions

1. Persistence and data storage.
2. Authentication requirements for a personal single-user application.
3. Local and offline behavior.
4. PWA architecture. PWA is a likely direction, not a decision.
5. Notification delivery.
6. Phone and watch notification relationship.
7. Speech-to-text mechanism.
8. Deterministic voice grammar.
9. Deployment and hosting.
10. Whether any server infrastructure is necessary.

The familiar web stack named in the project brief (Next.js, React, TypeScript, Tailwind CSS, component architecture, mobile-first, likely PWA) stays a preference until a decision record says otherwise.

## Ambiguities found in the source brief

Recorded so later work does not "clean them up" by choosing silently.

1. **MUST DO is described two ways.** It is a mark that keeps a task prominent, and it is one of the three approximate labels MUST DO / TODAY / CAPTURED. The brief says not to overformalize. Question 1 stays open.
2. **Shared names across primitives.** Opening, Early shift, Power Hour, Closing Readiness, and early-week execution are used as window examples and also as shift types or clock concepts. Question 6 stays open.
3. **Relative cadence and absolute FSR times.** Cadence is generally shift-relative, while FSR completion is stated in clock time beside Power Hour's 10:00 AM start. Question 9 stays open.
4. **Closing "mirrors" opening without a sequence.** The mirror is conceptual. The closing list is concerns, not steps, and some items are conditional. Question 12 stays open.
5. **Two wordings of the failure principle.** "Another task I have to manage, it has been designed incorrectly" and "another task to manage, the design has failed" are the same principle in two registers. Both are kept. They are not competing rules.
6. **Schedule sketch versus fiscal week.** The sketch starts on Monday and omits Friday–Sunday. It is an example of entry, not a redefinition of the Saturday-first week.
