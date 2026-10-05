# WEEK-CONTRACT-001 — Week shape

Date: 2026-10-05.

Baseline: `6d90a0752cbf48d1a35a64d962575b442ef6b28e`.

The human question from WEEK-DISCOVERY-001 is answered. When the user zooms out to Week, they want to perceive where the week already has structure, what kind of structure it has, and where nothing has been established yet. This record canonizes that answer. It does not widen it.

## Decision

Accepted.

Week is the temporal resolution at which the human perceives the spatial distribution of established temporal structure across a bounded week.

Week answers:

- Where does temporal structure already exist?
- What kind of established temporal structure is it?
- Where has no temporal structure been established?

Week does not judge or interpret that shape for the human.

This record does not implement Week.

## Shape

Week shape is the spatial distribution of established temporal structure across the bounded temporal territory being viewed.

Shape is locative and compositional.

Shape is not density, utilization, workload, productivity, importance, priority, urgency, availability, success, adherence, optimization, or a score.

A sparse shape is not good. A dense shape is not bad. The human interprets the shape.

## Established temporal structure

"Established temporal structure" is descriptive language for temporal truths that already possess temporal territory.

It is not a new persisted or domain object. This record does not create Structure, WeekStructure, SpokenFor, Busy, or Occupied.

For the temporal model implemented now, Week may compose:

- Work schedule shifts
- Protected Time
- Commitments
- Blocks

These truths retain their existing semantic identities. Week does not flatten them into a generic busy state.

A Task-associated Block participates as the Block it already is. Its `taskId` may remain associated with the Block. The Task does not gain duration.

A Block remains the fact that means: I have chosen what this time is for. That meaning is not collapsed into a generic Week category.

## Spoken for

Earlier current sentences said a week shows where time is spoken for, where a purpose was chosen, and where nothing is established. Those sentences named a perception. They did not define a domain primitive.

"Spoken for" is not a domain primitive and is not formally defined as a category.

The current statement is the human decision: where established temporal structure exists, what kind of structure it is, and where nothing has been established.

## Nothing established

Nothing established is not available.

At Week resolution, blank or uncovered temporal territory means only that Orient has no established temporal structure represented there from the sources participating in the Week reading.

It does not mean free, available, allocatable, unused Capacity, safe to schedule, unimportant, or outside responsibility.

Availability remains governed by the Capacity contract and an applicable allocatable boundary.

This record does not manufacture persisted empty intervals.

Work Off and a missing Work row remain what Timeline already says of them. Off produces no occupied interval and is not available. A missing row is unknown schedule truth and is not occupied. Neither is stored as an empty interval.

## Overlap

Multiple established truths may describe the same temporal territory. Week preserves that.

Examples include Work and a Commitment, Work and Protected Time, Work and a Block, Protected Time and a Block, a Commitment and a Block, and Protected Time together with a Commitment and a Block.

Week does not choose a winner, infer conflict, rank the truths, flatten them into one busy interval, delete one because another overlaps, or count overlap as semantic duplication.

Each truth remains independently true.

## Timeline

Timeline composes temporal truth. It does not resolve temporal truth.

Week is a resolution-specific perception of established temporal composition. It is not a replacement Timeline. This record does not redefine Timeline and does not change Timeline inputs.

`projectTimeline` already composes the participating truths over an explicit half-open civil range: a scheduled Work shift, Protected Time, a Commitment, and a Block, including a Task-associated Block as that Block. It keeps their identities and their overlap. It does not emit an unestablished interval. Its question, "What is the shape of this time?", remains Timeline's question. It is not this Week definition.

The future Week reading reuses that composition. It still requires a thin Week-specific projection over the same established facts. Timeline does not name the supplied range as the week being asked about, and it cannot tell a source the caller failed to read from a source that completed with nothing in range. The thin projection binds the explicit bounded civil-date range, applies the completeness boundary below, and exposes the locative shape. It does not add sources, flatten facts, or calculate Capacity. WEEK-001 implements it. This record does not.

## Resolutions

These are resolutions of temporal reality.

| Resolution | Role |
| --- | --- |
| Month | Direction beside structure. Established Destinations and Priorities, together with established temporal structure of a broader span. Not an inference that the structure expresses the direction. [2026-10-05-month-contract.md](2026-10-05-month-contract.md). |
| Week | Shape. Perceive how established temporal structure is spatially distributed across the bounded week, and what kind of structure it is. |
| Day | Exact temporal manipulation. Select, refine, establish, inspect, edit, and remove precise temporal meaning. |
| Present moment | Orientation inside the lived instant. Perceive which established temporal truths contain the instant, beside the explicitly chosen Active Thread. |

This record does not design navigation, zoom, animation, or a screen.

## Day precision

Week does not automatically inherit minute-level direct selection, drag refinement, exact interval editing, Task-time establishment, exact Capacity interval manipulation, or Day fact-editing controls.

Those belong to Day unless a later decision establishes otherwise.

Week provides perception of shape. Any future Week interaction beyond perception remains unresolved.

## Tasks and civil-date facts

A Task is not a temporal interval.

A Task without a Block occupies no clock territory.

`planned_on` remains a civil-day intention. It does not occupy temporal territory.

Due remains a civil-date deadline. It does not occupy temporal territory.

Must Do remains an explicit attention flag. It is not Priority. It does not occupy temporal territory.

Ordinary Tasks, `planned_on`, Due, and Must Do are not Week temporal structure merely because they have week-relevant dates.

Whether Week later exposes those civil-date facts in some non-territorial way remains unresolved.

## Capacity

This record does not create a weekly Capacity aggregate.

[2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md) remains in force. Capacity is currently one explicit civil-date question. An applicable Work shift may establish the allocatable boundary. The result may be incomplete, none, unresolved, or a reading. Known zero remains distinct from no boundary. Remaining intervals remain distinct per reading.

Week shape is not the sum of `remainingMs`, a utilization percentage, an available-hours total, free/busy, or a Capacity score.

A future Week experience may potentially expose individual Capacity readings. That expression remains unresolved.

Week shape does not depend on Capacity.

## Cadence

Cadence remains intended movement, not a rigid schedule.

Week shape may make established temporal structure legible. It does not thereby grade cadence, infer adherence, infer failure, create recurring appointments, auto-allocate territory, or perform catch-up enforcement.

The discovered Lowe's weekly strategy remains Work-context evidence. It is not a global Week rule.

## Priority and Destination

Destination, then Priority, then cadence or execution, is the semantic direction in [2026-10-05-direction-contract.md](2026-10-05-direction-contract.md). Week shape does not supply that direction.

Attention is not evidence of importance.

Week shape does not infer or display Priority or Destination from temporal structure.

A large Block is not more important because it is large. A repeated fact is not automatically Priority. A dense day is not more important than a sparse day.

Priority and Destination remain outside the Week temporal-structure reading unless a later decision establishes otherwise.

## Human authority

Week may establish deterministic observations about temporal structure.

It may not decide what matters, what should happen next, which day is overloaded, which day is underused, what should move, what should be sacrificed, what unused territory should contain, whether the week is good or bad, whether cadence succeeded, or which Context is current.

Orient makes the shape legible. The human interprets it.

## Week boundary

Work has an established Saturday–Friday fiscal week. That boundary belongs to Work.

No universal life-wide Week boundary has been established. Family, TeamLab, and Financial do not inherit Work's week boundary. No alternative generic Monday–Sunday boundary is canonical.

The future Week reading may operate over an explicit bounded civil-date range representing the week being asked about.

The mechanism by which a life-wide or default Week boundary is selected remains unresolved. This record does not solve it. It does not create Context-specific week boundaries.

## Epistemic integrity

Absence of data is not retrieval failure.

If a Week reading claims that nothing is established here, every source required for that claim must have been successfully read for the relevant bounded period.

A failed or incomplete source must not be rendered as absence.

Future Week composition therefore needs a fail-closed completeness boundary. This record does not design that result type.

## Work context

Work-specific evidence stays Work-specific. It does not become Week ontology.

Work currently has a Saturday–Friday fiscal week, a shift clock, a store clock, a week clock, a discovered weekly operating rhythm, Bay Audit concepts, Cycle Count concepts, and a Thursday readiness objective.

Only facts actually represented by the current temporal model may participate as established temporal structure.

Weekend customer intensity, Sunday line-up, Monday meeting pressure, the Monday–Thursday runway, Bay Audits, Cycle Counts, and Thursday readiness are not hardcoded into the Week reading. They remain Work discovery, cadence, or obligation concepts according to their current canonical status.

## Recurring obligations

Recurring Obligation and Occurrence remain canonical concepts. They are not yet implemented.

Week does not depend on recurrence implementation in order to define shape. This record does not fabricate occurrences.

When recurrence exists, its participation in temporal composition must be established separately.

## Production

Week remains a production requirement. [../implementation/WEEK-001.md](../implementation/WEEK-001.md) implements the deterministic reading and does not add a production interaction. The Week surface still blocks operational adoption.

This record closes the semantic meaning of Week shape. WEEK-001 closes the deterministic reading.

It does not close production Week interaction, production Week visual expression, generic or life-wide week-boundary selection, Week Capacity expression, recurrence, Month, multi-context behavior, the final phone experience, or the final desktop experience.

Operational adoption is not closed.

## Unresolved

- Any Week interaction beyond perception. The deterministic reading is [../implementation/WEEK-001.md](../implementation/WEEK-001.md).
- Production Week visual expression.
- How a life-wide or default Week boundary is selected.
- Whether Week later exposes `planned_on`, Due, or Must Do in a non-territorial way.
- Week expression of individual Capacity readings.
- Recurrence's later participation in temporal composition.
- Month interaction beyond perception. The question is [2026-10-05-month-contract.md](2026-10-05-month-contract.md).
- Multi-context behavior, and which Context is current.
- The final phone experience and the final desktop experience.

## Not authorized

No runtime, projection, UI, schema, migration, dependency, weekly Capacity aggregate, recurrence implementation, Month implementation, Context-specific week boundary, or life-wide week-boundary selection follows from this record.
