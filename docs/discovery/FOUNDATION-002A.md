# FOUNDATION-002A scope generalization

Date: 2026-10-02.

Historical record of the scope correction, written when Work was the only canonical Context. FOUNDATION-003 later established Family, TeamLab, and Financial from further evidence, and defined the minimum usable system. This file is not rewritten as if those Contexts were already known.

This tranche corrects product scope. It does not initialize implementation, and it does not choose persistence, authentication, hosting, deployment, a speech provider, a notification provider, a grammar, a schema, or an application stack.

[FOUNDATION-001.md](FOUNDATION-001.md) and [FOUNDATION-002.md](FOUNDATION-002.md) stay historical. They are not rewritten as if this broader scope was known then. Behavioral questions left open in FOUNDATION-002 remain open unless this file says the scope around them changed.

## Why the scope changed

Retail work was the first environment in which the user's need was deeply discovered. That discovery was real. It was then mistaken for the boundary of the product.

The underlying need is a personal, time-aware cadence and orientation system for the user's overall daily life. Work is one Context inside that system. The directional purpose is to externalize intentions, remember what matters, and help the user return to their intended course when life interrupts them. That wording is not final copy and not a name.

## Earlier truths that remain valid

From FOUNDATION-002, still canonical:

- Capture is an interaction and produces a Task or a Note.
- A Task means action is required, immediately, and not necessarily now.
- A Note retains information when action has not been established. Conversion to a Task is explicit and keeps originating information.
- Voice uses that split. Uncertain actionable-versus-informational speech stays a transcript. No grammar and no provider are chosen.
- MUST DO is a user-set flag, not a bucket or a score.
- Today is intentional temporal commitment, not every unresolved Task.
- Planned and due are independent.
- Resume returns the Active Thread. The product does not detect interruptions.
- A Recurring Obligation is a definition. A period has an occurrence. Completing the occurrence satisfies that period and leaves the definition.
- Absolute time and relative position both exist.
- Deadline, target, and objective stay distinct. A target does not become a deadline. An objective is not a Task.
- Time is context, not judgment.
- The twelve principles, the DeptSync boundary, and the rejection of inferred meaning.

Work facts remain valid inside the Work Context. They are listed under [Work-specific truths](#work-specific-truths-preserved).

FOUNDATION-002's unresolved behavioral questions remain unresolved. Where they mention a fiscal week, a shift, or a store window, those are Work facts, not universal ones.

## Product-scope assumptions superseded

These were treated as properties of the whole product. They are now Work discovery, or retired as universal claims.

- The product is a workday navigator, or exists only for Lowe's, retail, or employment.
- NOW begins at "where am I in my shift?"
- Shift is the top-level temporal container for everything.
- Cadence means only how the user moves through a shift type.
- The shift clock, store clock, and Lowe's week clock are the product's time model.
- The Saturday-first fiscal week is the user's universal week.
- The Active Thread is a work activity that must belong to a shift. Earlier "working context" language for that thread is not the Context primitive.
- Notes are defined by manager walks and work observations.
- Today is identical to the current workday or shift. The Work discovery used it that way. The day boundary for the broader product is open.
- The product name is Workday. The repository name `workday` remains. No product name is chosen.

## Context

Context is a new primitive: a meaningful area or operating mode of the user's life, inside which cadence, obligations, tasks, notes, windows, and time may have particular meaning.

It is not established as a folder, category, workspace, project, profile, or account.

The first and only canonical Context is **Work**.

Personal life, projects, TeamLab, and home are examples of why the primitive has to generalize. They are not canonical Contexts. The number of Contexts is unknown.

A Task or a Note is not required to belong to a Context. Whether either can belong to one, to more than one, or span Contexts is unresolved.

## Work as the first discovered Context

Preserved inside Work, and not promoted to universal behavior:

- manually entered work schedule
- Shift, with types Opening, Mid, and Closing
- opening sequence, including LSR and FSR (formerly IRP)
- Power Hour, 10:00 AM–2:00 PM, as a Work Window
- associate alignment and manager responsibilities
- Saturday-first Lowe's fiscal week and the weekly Work strategy
- Bay Audits and Cycle Counts, including weekend availability, Wednesday and Friday deadlines, and earlier preferred targets
- Thursday department-readiness objective
- department walks in Home Decor and Flooring
- customer interruptions, manager-on-duty responsibilities, and closing responsibilities, including items that apply only when assigned
- FSR as an absolute morning-clock target, not a shift-start offset and not a hard deadline

Power Hour, Bay Audits, and the fiscal week must not redefine system-wide windows, obligations, or the calendar.

## What is unknown about life outside Work

The user wants the system to serve overall daily cadence. That cadence has not been discovered.

Not established, and not to be invented from generic productivity assumptions:

- morning, evening, health, home, family, or TeamLab routines
- personal recurring obligations
- non-work cadences
- non-work Windows
- life categories
- wellness scoring, habit tracking, goals, or streaks

The product is also not a generic to-do list, calendar, habit tracker, life dashboard, project system, AI assistant, or productivity score. The distinguishing idea remains orientation, cadence, continuity, and low-friction capture.

## Product naming

Unresolved. `workday` is the repository and folder name only. Do not rename it in this tranche. A future name should fit the broader product once its identity is better understood. Historical documents keep the word Workday as the label used at the time.

## New unresolved questions

1. What non-work Contexts actually exist for this user?
2. Does every Task belong to a Context? Membership is not required. The rule is not decided.
3. Does every Note belong to a Context? Same position as the Task question.
4. Can a Task relate to more than one Context?
5. Can multiple Contexts preserve suspended Active Threads at the same time?
6. How does NOW choose a Context?
7. Does the user explicitly enter or switch Context, can time provide it, or some combination?
8. How do system-level Today and a Context-specific cadence interact?
9. What constitutes a day for the broader product?
10. How should Work schedule boundaries interact with the broader daily cadence?
11. How does transition between Work and non-Work behave?
12. Which temporal concepts are universal, and which are Context-specific?
13. What personal or daily recurring obligations actually exist?
14. What non-work cadences actually exist?
15. What should the product be named?

Also unresolved, and easy to confuse with the new primitive: provenance "context" on a Note converted to a Task is originating information. It is not a decision that the Task belongs to a Context. Whether NOW surfaces "what did I need to remember," or only Capture and Notes do, is not decided. NOW's five questions do not yet include that as a separate line.

## Scenario check

Checked without adding routines, Contexts, or a product name.

| # | Situation | Result |
| --- | --- | --- |
| 1 | Lowe's Opening shift | Represented inside Work: schedule, Opening shift, Opening cadence. |
| 2 | Power Hour 10:00 AM–2:00 PM | Represented as a Work Window. It is not a universal Window. |
| 3 | Work Task due Thursday, planned Monday | Represented. Planned and due stay independent. |
| 4 | A Note that is not necessarily Work | Represented. A Note need not belong to a Context, and Notes are not defined as work observations. |
| 5 | A Task with no Context yet | Represented. Context membership is not required. |
| 6 | An Active Thread with no Shift | Represented. A thread of intention does not require a Shift. |
| 7 | Bay Audits or Cycle Counts on the Lowe's fiscal week | Represented inside Work. That week does not set a universal calendar. |
| 8 | The Work shift ends and the day may continue | Represented only as a boundary. Ending the shift does not end the product or define the next cadence. What continues is undiscovered. The transition is unresolved. |
| 9 | NOW outside a Work shift | Represented. NOW is system-level. With no discovered non-work cadence, cadence position stays unknown rather than invented. |
| 10 | Broader system without invented life structure | Represented. The only canonical Context is Work. The excluded routines are listed and not created. |

No contradiction required an extra rule. Scenario 8 is a boundary, not a discovered after-work cadence.
