# FOUNDATION-003 minimum usable system

Date: 2026-10-02.

Historical product record for the close of pure foundation. ARCHITECTURE-001 later chose the implementation architecture in [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md). This file is not rewritten as if that stack had already been chosen.

This tranche canonizes life evidence gathered after FOUNDATION-002A and defines V0, the smallest system worth using for a real day. It does not build that system. It does not choose a framework, database, host, authentication, notification provider, speech provider, or calendar API.

[FOUNDATION-001.md](FOUNDATION-001.md), [FOUNDATION-002.md](FOUNDATION-002.md), and [FOUNDATION-002A.md](FOUNDATION-002A.md) stay historical.

This closes the planned pure-foundation phase. After review and acceptance, the expected next tranche is ARCHITECTURE-001. That tranche may evaluate a web framework, TypeScript, styling, PWA behavior, persistence, Supabase, authentication, deployment, Vercel, a notification path, the Google Calendar boundary, offline behavior, migration discipline, and provenance representation. Those names are an agenda. They are not decisions.

## Why this tranche exists

FOUNDATION-002A generalized the product and refused to invent life outside Work. The user then gave actual evidence. The product also needs a minimum usable shape before architecture, so implementation is chosen against requirements rather than habit.

The directional purpose, not final copy:

> The system helps the user understand where they are in their day, what currently matters, what they intended this time for, what they were doing before interruption, and what comes next.

The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

Added principles:

- Intelligence should emerge from relationships, not feature count.
- The system should know relatively few things, but understand them deeply.
- If using the system becomes another task the user has to manage, the design has failed.

## Evidence canonized

The user has two children. Stated temporal responsibilities outside Work:

- school
- school activities
- appointments
- family responsibilities
- intentionally protected time with their children
- caregiving reminders the user established
- budgeting and financial stewardship
- TeamLab project and building time

Named caregiving examples: pod-change reminders, Dexcom-related reminders, doctor appointments.

No routine was inferred from this list. No medical meaning was inferred from the reminder names.

## Contexts

Canonical, not exhaustive, and not silos:

| Context | Evidence |
| --- | --- |
| Work | The previously discovered Lowe's environment. Unchanged in substance. |
| Family | Children, school, activities, appointments, protected family time, and user-established caregiving reminders. |
| TeamLab | Time intentionally devoted to TeamLab projects and building. |
| Financial | Time intentionally devoted to budgeting and financial stewardship. |

No generic Personal Context. Tasks and Notes may remain unassigned. Whether one item may permanently belong to several Contexts is unresolved.

FOUNDATION-002A's statement that only Work was canonical is superseded by this evidence. That file stays as the record of the earlier stage.

## New primitives

**Commitment.** Time that is fixed or externally constrained. Examples include appointments, school activities, scheduled events, and a Work shift. A Commitment is not necessarily a Task. It may come from an external source. Subtypes are not cataloged.

**Block.** Time the user deliberately reserves. "I have chosen what this time is for." Examples include protected family time, TeamLab build time, budgeting time, and a day reserved for a chosen purpose. A Block may have start and end, may span a day, may relate to a Context, and may have Tasks. It does not require Tasks or a productivity outcome.

Obligated time and chosen time are both represented. Neither is a rank of importance. The user decides what is protected.

Shift remains a Work primitive. A shift can be represented as a Commitment and still keep its type and cadence. Timeline must not flatten that into one generic event. Whether the shift is stored as a Commitment or only presented as one is unresolved.

## Experience concepts

**Timeline** composes the shape of a day from Commitments, Blocks, Work shifts, planned Tasks, reminders, relevant recurring-obligation occurrences, and meaningful Windows. It is not established as a stored primitive. Today remains intentional planned commitment. Today is not the Timeline.

**Pulse** is a moment of orientation. A reminder is one explicit fact. No Pulse cadence, nagging, or productivity pressure is established. In-app Pulse is enough for the earliest V0.

**External temporal source.** Supplies facts and keeps provenance. Google Calendar is the first identified source. An event may be represented as a Commitment and may participate in Timeline, NOW, and Pulse. Read and write-back are separate authority decisions. Neither is chosen. The product must not claim ownership of external facts. Manual commitments can exist first. The first running app need not include Google Calendar.

Wealth Engine and DeptSync keep authority over their own truth. No integration and no API.

## Caregiving boundary

The system may hold reminders the user explicitly established. It must not interpret medical data, decide treatment, calculate treatment, alter care timing, infer medical urgency, or prescribe action. This is not medical software.

## Life loop

Plan, live, interrupt, orient, resume, transition. Descriptive, not a required workflow. Not every interruption is recorded. The product does not detect interruptions.

When a Block and reality differ, the favored interactions are Start, Resume, Adjust, and Skip. Resume is specified. Start, Adjust, and Skip are not.

## V0

Required capabilities: NOW; Today and Timeline; text Capture of Task or Note; Tasks with create, edit, complete, due boundary, planned day, MUST DO, and optional Context; Notes with explicit conversion and provenance; Blocks; Commitments; explicit Active Thread and Resume; the four Contexts without workspace administration; manual Work schedule and the discovered Work cadence without a cadence editor; a minimal representation of repeating responsibilities and explicit reminders; in-app Pulse; a product boundary for Google Calendar.

Voice does not block first use. Push notification infrastructure does not block first use. Google Calendar does not block the first run.

### Not V0

AI, LLM, ML, agentic behavior, scoring, streaks, gamification, complex analytics, project hierarchy, complex tagging, team collaboration, workforce management, automatic medical interpretation, automatic interruption detection, elaborate customization, many priority levels, broad integrations, DeptSync integration, Wealth Engine integration, bidirectional Google Calendar sync, a watch app, and a native mobile app.

PWA or browser capabilities are not authorized here.

### Acceptance

One complete real day as the user's primary orientation layer, without a second task system to hold the intended cadence. External systems may remain the authorities for calendar commitments, employer-owned work facts, and Wealth Engine's financial truth.

### Experience check

| Step | Result |
| --- | --- |
| Open the system; NOW places the user in the day | Representable as a projection of known facts. The ranking of those facts is still open, so "where" is not a finished layout. |
| Timeline shows a Commitment, a Block, planned Tasks, and a shift when one exists | Representable. They stay different kinds of facts. |
| Capture a Task in seconds and mark MUST DO | Representable. Text capture and the flag are both in V0. |
| Establish an Active Thread, leave, return, Resume | Representable. The user sets the thread. The product does not detect the interruption. |
| A Block ends and the next Commitment is visible | Representable when those boundaries are known. No formula for "usable time" is canonized beyond the boundaries themselves. |
| Transition without judgment | Representable. Start, Resume, Adjust, and Skip are the favored interactions. Only Resume has specified behavior. |

No step required a new rule that contradicts an existing one. The open ranking and the undefined Adjust/Skip effects do not block the description of the day.

## FOUNDATION-002A questions this tranche changed

| Earlier question | Result |
| --- | --- |
| What non-work Contexts exist? | Partially answered. Family, TeamLab, and Financial are canonical. The list is not exhaustive. Personal is not a Context. |
| What personal recurring obligations exist? | Not answered as obligations. Caregiving reminders exist. No period, availability, or deadline was stated, so none was created. |
| What non-work cadences exist? | Still none. Blocks and Commitments are not cadences. |
| Does every Task or Note belong to a Context? | Still open. Unassigned remains representable. V0 may record a Context when the user assigns one. |
| Can one item belong to several Contexts? | Still open. |
| What is a day? | Still open. Timeline speaks of the current day, and a Block may span a day, without defining the boundary. |

Behavioral questions left open in FOUNDATION-002 remain open unless this file or the canonical documents changed their scope. Work clocks, the fiscal week, and retail vocabulary stay inside Work.

## Remaining product questions

1. NOW's selection order, including Commitment and Block boundaries among the candidate facts.
2. How a Context becomes current: explicit switch, time, or both.
3. Whether a Task or Note can belong to more than one Context.
4. Whether several Contexts can retain suspended Active Threads.
5. What a day is, and how Today meets a Context cadence and a shift.
6. How a shift boundary interacts with Blocks and Commitments around it.
7. Commitment subtypes, and whether a Shift is stored as a Commitment.
8. Which Google Calendar events become Commitments, if any do automatically.
9. What Start, Adjust, and Skip write.
10. When a Pulse happens.
11. Which originating Note information must survive conversion.
12. What reschedule and carry-forward write, including the MUST DO flag.
13. Whether a recurring-obligation occurrence is also a Task.
14. Any non-work cadence, Window, or Recurring Obligation not yet evidenced.
15. The product name.

## Remaining technical questions

None were decided. Persistence, authentication, local and offline behavior, PWA architecture, notification delivery, phone and watch notifications, speech-to-text, voice grammar, deployment, hosting, and whether any server is necessary all remain open.

ARCHITECTURE-001 may evaluate them. FOUNDATION-003 does not.

The familiar Next.js, React, TypeScript, and Tailwind direction is still a preference. Supabase, Vercel, and a Google Calendar API are named only as possible subjects of that later tranche.

## Contradictions found and how they were held

1. **002A allowed only Work as a Context.** New evidence adds Family, TeamLab, and Financial. The old ledger stays historical. No Personal Context was added to paper over the gap.
2. **A shift is a primitive, a Commitment example, and a separate Timeline ingredient.** Current canon keeps the shift's type and cadence when it is shown as fixed time. Storage is unresolved rather than collapsed.
3. **V0 names "Today / Timeline" together.** Today stays planned commitment. Timeline stays the shape of the day. They are not one event type.
4. **The product is not a generic calendar, and Google Calendar should participate.** Participation means provenance-preserving use of external facts. It does not mean replacing Google Calendar or owning its events. Sync direction is undecided.
5. **Caregiving reminders could have been forced into Recurring Obligations.** No period was stated, so they stay reminders. Doctor appointments stay Commitments.
6. **"The shape of my day" coexists with an undefined day boundary.** The experience can be described. The boundary was not invented.
7. **A Block's clock time could have replaced the Active Thread.** It does not. The user remains authoritative, consistent with no automatic interruption detection.

## Naming and phase

`workday` remains the temporary repository name. No product name was chosen. No folder was renamed.

Pure product foundation, as planned, ends with this tranche. Architecture and scaffolding wait for review. Nothing in this tranche authorizes application code.
