# FOUNDATION-002 behavioral semantics

Date: 2026-10-02.

Historical record of behavioral semantics at the end of FOUNDATION-002, when the product was still described as a workday navigator. FOUNDATION-002A generalized that scope. The behavioral distinctions in this file remain valid, except item 3's Note sentence, which [DISCOVERY-CANON-001.md](DISCOVERY-CANON-001.md) refines: a Note remains a retained fragment of experience after a later fact is established from it. Statements that make a shift, the three Work clocks, or retail the boundary of the whole product were superseded. This file is not rewritten as if the broader scope was already known.

This tranche resolves core behavioral semantics. It does not choose persistence, authentication, hosting, deployment, a speech provider, a notification provider, a grammar, a schema, or an application stack.

[FOUNDATION-001.md](FOUNDATION-001.md) is the earlier historical ledger. [FOUNDATION-002A.md](FOUNDATION-002A.md) is the later scope-generalization record. [FOUNDATION-003.md](FOUNDATION-003.md) is the current ledger. Unresolved behavioral questions below remain open unless a later record says otherwise.

Canonical behavior lives in the root documents. This file records the decisions, what they closed, and what they left open.

## Decisions established

1. **Capture is an interaction.** It is not a Task state or a lifecycle bucket. Capture may produce a Task or a Note. The distinction is preserved.
2. **A Task means action is required.** Explicitly recorded work becomes a Task immediately and need not be done at the moment of capture. A Task is general-purpose. Retail examples, including aisle and bay speech, are illustrations, not a hardcoded model. A Task may have a due boundary, a planned day or shift, an explicit reminder, a MUST DO flag, an active/resumable relationship, and completion state. Further lifecycle rules stay open where this tranche did not set them.
3. **A Note means retained information without established action.** A Note does not burden the Task list. Workday does not infer action from it.
4. **Note → Task requires explicit user intent.** The Task keeps originating context. No provenance schema is defined.
5. **Voice uses the same distinction.** Explicitly actionable speech creates a Task immediately. Speech explicitly identified as a note or observation creates a Note. Those utterances are examples, not a grammar. If Workday cannot confidently tell actionable from informational, it keeps the transcript and the user chooses Task or Note. No provider, no complete grammar, and no AI, ML, LLM, or agentic inference.
6. **MUST DO is a persistent flag** on a Task (`mustDo` true or false as conceptual semantics only). It is not a bucket, not a mutually exclusive state, not a score, and not inferred. It stays prominent until the user completes, reschedules, or removes the Task. Exact lifecycle effects of those acts may remain open.
7. **Today is temporal commitment,** not a Task type. It is work the user intentionally committed to this workday or shift. A Task may be planned for Today and still due later.
8. **Planned and due are independent.** Due answers when it needs to be completed by. Planned answers when the user currently intends to work on it. A Task may have either fact alone, both, or an explicit reminder independent of both. Changing the planned day does not silently change the due boundary.
9. **Today stays intentional.** It does not automatically collect every unresolved Task. Future-due work may exist outside Today. Other explicit facts can still make a Task relevant to NOW: an approaching reminder, a due boundary, MUST DO, or an Active Thread. Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). Those facts are not inputs to the first present-moment composition merely because they exist. The Active Thread is one of the two truths. A reminder, a due boundary, and Must Do are not.
10. **The Active Thread is the explicit working context Resume uses.** An interruption does not clear it. Workday does not detect interruptions or explain them. "Previous" is not an arbitrary earlier Task. Intentional change of context changes the Active Thread. Completion or explicit abandonment removes it from Resume.
11. **Recurring Obligation is a first-class primitive.** The definition is separate from the occurrence for a fiscal period. Completing the occurrence satisfies that period, stops burdening later shifts in the period, and leaves the definition in place. Bay Audits and Cycle Counts are current requirements, not the whole primitive. No recurrence algorithm is defined.
12. **Absolute operational time and shift-relative time both exist** and are not interchangeable. Power Hour (10:00 AM–2:00 PM) and the FSR morning target are absolute. FSR is not modeled solely as a offset from shift start. Start of shift, early shift, final hour, and closeout are shift-relative examples. Phase boundaries are not defined.
13. **Deadline, target, and objective stay distinct.** A deadline is a required completion boundary. A target is a preferred completion point and must not be silently promoted to a deadline. An objective is a desired operating condition, not automatically a Task. Thursday department readiness is an objective. FSR's morning language is a target on the clock: intended before approximately 10:00 AM, outer expectation approximately 11:00 AM.
14. **Time is context, not judgment.** Interrupted or later cadence is resumed, not shamed. Framing such as "OVERDUE BY 62 MINUTES," "YOU ARE BEHIND," or "FAILED" is rejected unless a future explicit requirement needs factual overdue status. Even then the presentation stays factual.

NOW's deterministic attention hierarchy is required later and is not finalized. Candidate inputs were listed in PRODUCT.md at the time: current time, current date, Commitment boundaries, Block boundaries, Work shift boundaries, operational Windows, explicit reminders, due boundaries, planned work, MUST DO, the Active Thread, recurring-obligation occurrences, and Context. They are not an approved order. Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). The hierarchy was refused. It is not an open ordering. Current PRODUCT.md no longer carries that list.

## FOUNDATION-001 items resolved

| FOUNDATION-001 question | Result |
| --- | --- |
| 1. MUST DO, TODAY, and CAPTURED | Resolved. MUST DO is a flag. Today is planned commitment, not a type. Capture is an interaction, not a state. The three are not mutually exclusive Task states. A Task may be planned for Today and flagged MUST DO. |
| 3. What Resume restores | Resolved in substance. Resume restores the Active Thread, not an arbitrary previous Task and not an Observation. Stacked interruptions do not clear a thread the user has not changed. |
| 4. Observation becoming a Task | Resolved by replacement. Informational capture is a Note. Conversion to a Task is explicit. A Note that is not the user's action does not enter the Task list. DeptSync remains out of scope. |
| 8. Deadline, target, and objective | Meanings resolved. Thursday readiness is an objective. FSR's morning times are an absolute target, not a deadline. Bay Audits and Cycle Counts were already classified and stay as they were. |
| 9. FSR time anchor | Resolved. Absolute morning-clock target, not minutes after shift start, and not the same fact as Power Hour. Both remain absolute if an opening shift starts at a different time. |
| 17. Recurring obligation representation | Resolved at product level. Definition and occurrence are distinct. Completing the occurrence satisfies the period. |

Partially resolved:

| FOUNDATION-001 question | What is now decided | What remains |
| --- | --- | --- |
| 5. Reschedule and carry-forward | Planned and due do not silently change together. Reschedule is one explicit way MUST DO prominence can end. | What reschedule writes. Whether the flag itself clears. What carry-forward means. |
| 6. Shared names | Power Hour is absolute operational time. Early shift, start of shift, final hour, and closeout are shift-relative labels. Opening is a shift type. | Whether a Window with the same name also exists. Closing Readiness, early-week task execution, lunch, and afternoon are still unclassified beyond their earlier roles. |
| 7. Task timing facts | Due boundary, planned day or shift, and explicit reminder are independent Task facts. | Available-window and preferred-window rules. |
| 16. Voice | The Task/Note distinction, the uncertain-transcript fallback, and the constructs a future grammar may recognize. | The grammar, the interaction mechanics, and partial parses. |

## Remaining unresolved product questions

1. NOW's selection order. Candidates are recorded. They are not ranked. Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). There is no selection order to finish.
2. Which user action sets the Active Thread, and what happens to the prior thread when the user switches context. Completion and explicit abandonment already remove a thread from Resume.
3. How a Task's active/resumable relationship relates to the single Active Thread if those facts diverge.
4. What reschedule changes on planned day, due boundary, and the MUST DO flag. What carry-forward means across a shift, a day, and the fiscal week.
5. Which Note context must survive conversion into a Task, beyond the requirement that the Task not lose it.
6. Whether a Recurring Obligation Occurrence is also a Task.
7. Voice behavior when the utterance is clearly actionable but a date, time, reminder, or MUST DO mark is not confidently recognized. The actionable-versus-informational fallback is decided. This partial-parse case is not.
8. The complete deterministic grammar and the capture interaction's mechanics.
9. Available-window and preferred-window rules.
10. Remaining name collisions: Opening as a possible Window, Closing Readiness, early-week task execution, lunch, and afternoon. Boundaries of shift-relative phases.
11. How deadline, target, and objective are shown. FSR's intended time and outer expectation are not split into a new temporal kind and are not a deadline.
12. Schedule entry experience, and any schedule facts beyond start, end, shift type, and OFF.
13. Whether Opening prompts on a skipped step, or only remembers place through the Active Thread.
14. Which closing concerns belong to this user by default, how assignment is represented, and whether closing has an order.
15. Any Mid structure beyond Power Hour and Resume.
16. How the weekly strategy and the Thursday objective appear as context without becoming tasks, checkboxes, or catch-up enforcement.
17. Which notification candidates are in scope, and their timing, frequency, dismissal, and relationship to explicit reminders.
18. Whether any controlled vocabulary of work kinds is ever required. Retail location terms must not be hardcoded. None is established.
19. Any fuller Task lifecycle beyond the facts this tranche set.
20. Whether a future requirement will need factual overdue status, and the factual wording if it does. Punitive framing is already rejected.

## Remaining unresolved technical questions

None of these were decided in this tranche.

1. Persistence and data storage.
2. Authentication requirements for a personal single-user application.
3. Local and offline behavior.
4. PWA architecture. PWA remains a likely direction, not a decision.
5. Notification delivery.
6. Phone and watch notification relationship.
7. Speech-to-text mechanism.
8. Deterministic voice grammar.
9. Deployment and hosting.
10. Whether any server infrastructure is necessary.

The familiar Next.js, React, TypeScript, and Tailwind direction remains a preference, not a decision.

## New ambiguities

1. **Reschedule ends MUST DO prominence, and its edits are unspecified.** Prominence lasts until completion, rescheduling, or removal. Planned and due stay independent. The tranche does not say whether reschedule clears the flag, moves the plan, moves the due boundary, or does more than one of those.
2. **An occurrence is actionable, and Task means action is required.** The occurrence is its own completable concept. The tranche does not say it is a Task. Both descriptions can be true only if a later decision relates them.
3. **FSR has two morning points inside one target.** Intended before approximately 10:00 AM, and an outer expectation of approximately 11:00 AM. Neither is a deadline. They were not given separate temporal kinds.
4. **Partial voice confidence.** The mandated fallback covers uncertainty between Task and Note. It does not cover a clearly actionable utterance whose date, reminder, or MUST DO mark cannot be read confidently.
5. **One Active Thread, and a Task that may also be "active/resumable."** Resume follows the Active Thread. The extra Task relationship is named and not defined. Prior-thread retention on an intentional switch is also undefined.
6. **Shared names that this tranche classified only in part.** Classifying Power Hour and early shift by clock kind does not decide whether matching Window objects exist.

## Candidate questions for the next tranche

- Validate a NOW ordering against realistic workday scenarios. Do not treat the candidate list as that ordering. Superseded as composition authority by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). No ordering was authorized.
- Define how the user sets and replaces an Active Thread, including the prior thread.
- Decide whether a period occurrence is a Task, and what the user sees after early completion.
- Define reschedule and carry-forward without coupling planned and due.
- Define partial voice confidence without inventing meaning and without writing the full grammar.

## Scenario check

Checked against the semantics above. No contradiction forced an extra rule.

| # | Situation | Result |
| --- | --- | --- |
| 1 | Due Thursday, planned Monday | Represented. Independent facts. Monday Today shows it because it was planned there. Due stays Thursday. |
| 2 | Planned for Today and MUST DO | Represented. Today is commitment. MUST DO is a flag. Both may be set. |
| 3 | Spoken actionable item with a due date | Represented when both the action and the date are confident: immediate Task plus due boundary. Partial confidence, clear action but unclear date, is ambiguity 4. No rule was invented for it. |
| 4 | Informational manager-walk capture | Represented as a Note. It does not enter the Task list. |
| 5 | That Note later becomes a Task | Represented. Explicit conversion. Originating context is kept. The field list is intentionally undefined. |
| 6 | Work begins, an interruption happens, Resume is offered later | Represented when the user had explicitly set the Active Thread. The interruption does not clear it. Workday does not detect the interruption. |
| 7 | Weekly obligation becomes available, is completed early, and leaves later shifts | Represented. Definition activates an occurrence; completion satisfies the period; later shifts in that period are clear; the definition remains. |
| 8 | Opening start changes; Power Hour stays 10:00 AM | Represented. Shift boundaries and Power Hour are different absolute facts. |
| 9 | A preferred target passes | Represented. A target does not become a deadline. Punitive overdue language is not authorized. Display when the clock passes the FSR points is still open. |
| 10 | Thursday readiness | Represented as an objective. It is not a Task. |
