# MONTH-CONTRACT-001 — Month perception

Date: 2026-10-05.

Baseline: `893b210a30e3ad2a86fc56bbc92938cd2cc76fdc`.

Month had a role name, landscape, and no question. Week already answers where established temporal structure is, what kind it is, and where none has been established. Direction is now an explicit human establishment: Destination, then Priority. This record does not store the link from direction into an execution fact. This record gives Month the question those facts can support. It does not define that link. [2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md) later does, and this record does not implement it.

## Decision

Accepted.

Month is the temporal resolution at which the human perceives the directions they have explicitly established, together with the established temporal structure of a broader span, at a distance from immediate execution.

Month answers:

- Which Destinations and Priorities have I explicitly established?
- What established temporal structure exists across this broader span, and what kind is it?
- Where, in that span, has no temporal structure been established?

Month does not answer whether any of that structure expresses, advances, or completes a direction. The human may look for that. Orient does not decide it.

This record does not implement Month. [../implementation/MONTH-001.md](../implementation/MONTH-001.md) implements the deterministic reading and does not add a production interaction.

## What was interrogated

The candidate was that Month is where the human perceives how deliberately established directions are expressed through the lived time they are constructing.

"Expressed" is not adopted as a system claim. [2026-10-05-direction-contract.md](2026-10-05-direction-contract.md) already refuses to let expression mean progress, causality proven by activity, or success. Temporal structure does not imply a Destination or a Priority. Seeing both in one reading is not a relationship between them.

This record did not choose the execution endpoints. [2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md) later decides them: a Task or a Block may be explicitly established in service of a Priority, with no inheritance between them and no execution-to-Destination edge.

## Week

Week perceives the spatial distribution of established temporal structure. It does not display Destination or Priority. It does not infer importance from size, repetition, or density.

Month is not a longer Week. It is not four or five Weeks gathered together. A span's length does not make a reading a Month reading. The question does.

Week remains the resolution for shape alone. Month is the resolution that admits explicit directional truth into the same perception as temporal structure, and still refuses to connect them by inference.

## Direction

Month may include a Destination and a Priority because the human established them. A Priority remains downstream of one Destination in the stored pair. That storage does not decide whether one Priority may serve more than one Destination.

Month must not infer a Destination, a Priority, or a directional relationship from a Task, a Block, a repeated action, Must Do, Due, `planned_on`, the Active Thread, attention, time spent, temporal density, or current activity.

A Destination and a Priority do not occupy temporal territory because they exist. Month must not draw them as intervals.

## Execution in service of a Priority

The chain runs Destination, then Priority, then cadence or execution, then observable lived reality. That direction is semantic. It is not a license to infer the last step backward.

[2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md) decides the explicit relationship. [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md) stores a Task pair and a Block pair. Month may perceive that relationship where it is retained. This record does not read those tables. Month must not say a Commitment, Protected Time, a Work shift, or any other fact is in service of a Priority under that contract. Coexistence is not the relationship. A withdrawn relationship is not retained, so Month has no historical pair to perceive.

"In service of" remains intended placement. It is not expression, progress, or success.

## Optional ancestry

Not every Task, Block, Commitment, Protected Time, Note, appointment, obligation, or other temporal fact must serve a Destination or a Priority. A fact without that ancestry remains fully valid. Month must not demand strategic justification for ordinary life, and it must not hide a fact because it has no directional ancestry.

## Progress

Activity is not proof of progress.

Month has no authority to calculate or display progress, success, failure, health, trajectory, sufficiency, alignment, effectiveness, a completion percentage, whether enough time was spent, or whether the human is on track. Those remain human interpretation unless a later decision establishes otherwise, and that decision would need its own evidence and human authority. This record does not provide them.

## Temporal structure

The temporal truths that may appear are the same kinds Week may compose: a Work schedule shift, Protected Time, a Commitment, and a Block. A Task-associated Block participates as the Block. The Task does not gain duration. Kinds stay distinct. Overlap stays overlap. Nothing established is not availability. Work Off and a missing Work row stay what they already are.

Month does not need minute-level precision to answer its question. Exact intervals remain the source truth. Month perceives them at a distance. It does not become a minute canvas, and it does not flatten those facts into a density, a count, or a summary bar.

Timeline's question remains "What is the shape of this time?" Month's question is not that question asked over more days. Month needs its own projection because it must include explicit directional truth and must fail closed on both the directional reads and the temporal reads. [../implementation/MONTH-001.md](../implementation/MONTH-001.md) builds that projection. It reuses Timeline for placement and inherits Timeline's identities, overlap, and look-behind. It does not treat the result as directional meaning. This record does not build that projection.

## Destination beyond the span

A Destination has no start, end, or deadline because it is included in a Month reading. The reading does not mean the Destination begins in the span, ends in the span, is due in the span, or should be completed in the span. No Quarter, Year, or multi-year resolution is introduced. Month can show a direction that outlasts the span without becoming a longer horizon.

## Boundary

No Gregorian month, fiscal month, or counted run of weeks is canonical. Work's Saturday–Friday week is not a Month boundary. Family, TeamLab, and Financial do not inherit one.

How a Month span is selected remains unresolved. A future reading may be asked over an explicit bounded civil range. The range is the question's window. It is not the definition of Month.

## Context

Destination is not a Context. Priority is not a Context. Month does not require a current Context, and it does not assign one. [2026-10-05-multi-context-contract.md](2026-10-05-multi-context-contract.md) decides that there is no current Context and that Month stays Context-neutral. Whether a Destination or a Priority is Context-bound, and whether one Destination spans Contexts, remain unresolved. This record does not answer them.

## Capacity

Month is not a Capacity aggregate. It does not produce monthly free hours, utilization, available-day counts, or a workload score. Capacity still exists only inside an established allocatable boundary. Silence outside that boundary is not available. A Work shift may bound a Work reading and is not itself Capacity. No universal multi-context Capacity boundary exists.

## What may participate

| Truth | Participation |
| --- | --- |
| Destination | Directly. Explicit human establishment. Not an interval. |
| Priority | Directly, as downstream of the Destination it names. Not an interval. |
| Work shift | Directly, as temporal structure. Not as direction. |
| Protected Time | Directly, as temporal structure. Not as direction. |
| Commitment | Directly, as temporal structure. Not as direction. |
| Block | Directly, as temporal structure. Where explicitly established, also as in service of a Priority. The Task reference does not create that relationship. |
| Cadence | Does not participate. Work cadence is not copied outward, and it is not graded. |
| Task | Does not participate as territory. Where explicitly established, as in service of a Priority. Not an interval. |
| Must Do | Does not participate. It is not Priority. |
| `planned_on` | Does not participate. It is not territory and not Priority. |
| Due | Does not participate. It is not Priority and not a Destination. |
| Note | Does not participate. Provenance is not direction. |
| Active Thread | Does not participate. It is not Priority and not a temporal fact. |
| Capacity | Does not participate. |
| Context | Unresolved. Month does not infer it and does not bind direction to it. |

## Epistemic completeness

Absence of data is not evidence that nothing was established.

A claim that no Destination is established requires a complete Destination read. A claim that no Priority is established requires a complete Priority read. A claim that no temporal structure of a participating kind is established requires a successful read of each required temporal source for the span being asked. A failed or short read is an incomplete Month reading. It must not be presented as an empty landscape. A complete empty directional read means no such direction has been established. A complete empty temporal read means no temporal structure of those kinds has been established in the span. Neither emptiness means the life lacks meaning, and neither is availability.

## Interaction authority

Month is authorized as perception.

It is not authorized by this record to establish a Destination, a Priority, a temporal fact, or a directional relationship, and it is not authorized to manipulate time. Those acts stay with the establishment paths that already own them. Navigation into a finer resolution, and any later interaction beyond perception, remain unresolved. This record does not design a surface.

## Human authority

Month may make deterministic observations about explicitly established directions and about established temporal structure.

It may not decide what matters, what happens next, which direction outranks another, whether a direction is succeeding, whether a Priority is healthy, whether more time should be allocated, or whether something should be abandoned. There is no current Context for it to choose.

Orient makes the established truths legible. The human interprets them.

## Rejected

Month is not a conventional calendar month, a giant Day, or a collection of Weeks. It is not a goal tracker, an OKR dashboard, a productivity dashboard, a progress dashboard, or a project-management roadmap. It is not a deadline board, a Capacity or utilization report, an activity heatmap, or a picture that infers life direction from activity.

## Non-goals

No UI, route, schema, migration, dependency, change to Destination or Priority storage, monthly Capacity aggregate, recurrence implementation, or life-wide Month boundary follows from this record. [../implementation/MONTH-001.md](../implementation/MONTH-001.md) implements the deterministic reading. This record does not. The execution-direction semantics are [2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md). This record does not implement them.

## Unresolved

- The deterministic Month reading is [../implementation/MONTH-001.md](../implementation/MONTH-001.md). This record does not implement it. Span selection, visual expression, and interaction remain open below.
- Whether one Priority may serve more than one Destination.
- How a Month span is selected.
- Any Month interaction beyond perception, including navigation.
- Month visual treatment. Direction beside structure is [2026-10-05-experience-architecture.md](2026-10-05-experience-architecture.md). The exact composition of that adjacency remains open.
- Context binding of Destination and Priority.
- Whether Cadence ever becomes a Month input.
- Recurrence's later participation.
- Exact phone and desktop spatial composition. The device roles are [2026-10-05-experience-architecture.md](2026-10-05-experience-architecture.md).
