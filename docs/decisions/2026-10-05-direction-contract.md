# DIRECTION-CONTRACT-001 — Human-established direction

Date: 2026-10-05.

Baseline: `97c9b1b0418e26d9d04cde16682cef6655cc147c`.

DIRECTION-DISCOVERY-001 found the chain already named in prose: Destination, then Priority, then cadence or execution, then observable reality. The repository could not preserve a particular Destination, a particular Priority downstream of it, or an explicit human-established link from that direction into execution. This record defines the minimum semantics of that link. It does not choose representation, storage, or a surface.

## Decision

Accepted.

A directional relationship records that the human explicitly established that one already-established truth exists in service of a larger human-established direction.

The relationship is explicit, inspectable, and deterministic. Orient does not infer it, score it, or rank it. Both related truths stay what they are.

This record does not implement the relationship. [../implementation/DIRECTION-REP-001.md](../implementation/DIRECTION-REP-001.md) later stores a Destination and a Priority downstream of one Destination. It does not store a directional relationship into execution. It does not add a production interaction. The migration is not applied by that record.

## Destination

Destination is where the human is deliberately trying to take some part of life or reality.

A Destination may be a desired condition, a direction of development, or something continuously approached rather than binary-completed.

A Destination is human-established. It is not inferred. It need not be binary-completable, need not have a deadline, and need not have a metric. It does not inherently occupy temporal territory.

A Destination is not a Task, a Block, a Priority, a Context, or a Deadline. It is not automatically a Target. It is not automatically an Objective.

## Priority

Priority is a condition or area of sustained attention whose continued health materially advances an established Destination and therefore deserves repeated execution.

Priority is downstream of Destination. It is human-established. It is not inferred. It is not urgency, salience, recency, or frequency. It is not high, medium, or low. It is not a score. It is not Must Do, Due, Planned, a Task, a Block, or the Active Thread. It does not inherently occupy temporal territory. It may remain relevant across many days or weeks. Completing an execution fact does not binary-complete the Priority.

This record does not decide whether one Priority may serve more than one Destination.

## Cadence

Cadence remains intended movement through a meaningful period or Context. The same primitive may describe recurring attention or execution toward conditions that matter to a Destination.

Cadence is not a rigid schedule, a streak, a score, a list of recurring Tasks, or a collection of Blocks. It does not itself create Tasks, Blocks, or Occurrences. Deviation does not invalidate it. It must not be graded.

Work remains the first discovered Cadence. This record invents none for Family, TeamLab, Financial, or any later Context.

## Execution remains sovereign

A directional relationship does not change the meaning of an execution fact.

- A Task does not gain duration.
- A Block remains chosen temporal purpose.
- A task-associated Block remains one Block referring to one Task.
- A Commitment remains constrained time.
- Protected Time remains unavailable for allocation.
- `planned_on` remains a civil-day intention.
- Due remains a civil-date deadline.
- Must Do remains an explicit attention flag.
- The Active Thread remains explicit current intention.
- A recurring Obligation and its Occurrence keep their existing meanings.

## Directional relationship

The relationship answers why this execution was deliberately established in the larger picture.

It does not mean the downstream fact guarantees progress, is sufficient, or brings a Destination closer. Time spent does not prove importance. Completion does not prove the Destination is closer. Repetition does not prove Priority. Orient does not agree with the human's reasoning by preserving the relationship, and it does not recommend continuing it.

This record does not name a stored object, define a table, or authorize arbitrary edges. It is not a graph.

## Causal direction

The human-established meaning runs in one direction:

```text
Destination
  -> Priority
  -> Cadence and/or Execution
  -> observable lived reality
```

That is a semantic direction. It is not necessarily a persisted hierarchy.

Reverse inference is rejected:

- a Task does not establish a Destination
- a Block does not establish a Priority
- a repeated action does not establish a Priority
- Must Do does not establish a Priority
- Due does not establish a Priority
- the Active Thread does not establish a Priority
- attention does not establish importance
- time spent does not establish importance
- temporal density does not establish importance
- current activity does not establish a Destination

## Optionality

Strategic ancestry is optional.

Not every Task, Block, Commitment, Protected Time, Note, appointment, obligation, or other temporal fact must serve a Destination or a Priority. A fact without directional ancestry remains fully valid. Orient must not demand strategic justification for ordinary life.

## Provenance and temporal purpose

Three questions stay distinct.

Note-to-Task provenance answers where this Task came from.

A task-associated Block answers what this chosen time is for.

A directional relationship answers why this execution was deliberately established in the larger picture.

A directional relationship is not provenance.

## Context

Destination is not a Context. Priority is not a Context. Current Context does not establish either. Work examples do not make these concepts Work-only. Lowe's semantics are not copied into Family, TeamLab, Financial, or future Contexts.

Whether Destination requires a Context, whether Priority requires a Context, whether a Destination may span Contexts, whether Priority inherits Context, and how a Context-filtered directional reading would work remain unresolved.

## Objective, Target, and Deadline

Destination, Objective, Target, and Deadline stay distinct. A Destination is not automatically due-dated or binary-completable. Thursday readiness remains an Objective. The Full Shelf Replenishment morning language remains a Target. Any finer boundary among Destination, Objective, and Target, beyond that refusal to collapse them, remains unresolved.

## Progress

Activity is not proof of progress.

This contract gives Orient no authority to calculate progress toward a Destination. It does not authorize percentages, progress bars, accumulated-time progress, Task-count progress, cadence-adherence progress, milestone scoring, success, failure, Priority health, Destination health, effectiveness, or sufficiency. Those remain human interpretation unless a later decision establishes otherwise.

## Historical truth

A later change in direction must not retroactively rewrite independently established historical facts. Historical execution remains historically true.

This record does not define Destination or Priority lifecycle, deletion, archival, abandonment, supersession, or replacement.

## Month

[2026-10-05-month-contract.md](2026-10-05-month-contract.md) now decides Month's question. Week shape still cannot supply directional meaning. Temporal structure still does not imply a Destination or a Priority. Month may show explicitly established Destinations and Priorities beside established temporal structure. It must not infer that the structure expresses the direction. Expression is not progress, causality proven by activity, or success.

[2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md) decides the execution relationship: a Task or a Block may be explicitly established in service of a Priority. There is no execution-to-Destination edge. Withdrawal removes that relationship and does not rewrite the execution. Month does not create the relationship, and this record does not store it.

## Human authority

Orient must not infer a Destination, a Priority, directional ancestry, why something matters, whether an execution fact advances a Destination, whether a Destination is succeeding, whether a Priority is healthy, whether more time should be allocated, whether something should be abandoned, whether one Destination outranks another, what matters now, or what happens next.

Orient preserves an explicit human-established relationship while the human retains it. Withdrawal of an execution-to-Priority relationship removes that relationship and does not rewrite the execution. The human retains interpretation and authority. [2026-10-05-execution-direction-contract.md](2026-10-05-execution-direction-contract.md) decides that withdrawal.

## Non-goals

This contract does not create goal tracking, OKRs, habit tracking, productivity scoring, project management, strategic planning automation, performance scoring, time accounting, automatic prioritization, automatic planning, recommendations, a generic relationship graph, or AI or LLM inference.

## Unresolved

- persistence representation and schema
- whether one Priority may serve more than one Destination
- Destination lifecycle and Priority lifecycle
- editing, removal, archival, abandonment, supersession, and replacement of those endpoints
- Context binding and multi-context directional behavior
- the finer boundary among Destination, Objective, and Target
- whether Cadence explicitly relates to a Priority
- interaction and visual expression
- Month reading mechanics, Month boundary, and Month UI
- progress semantics, if a later decision ever authorizes them
