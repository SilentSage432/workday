# EXECUTION-DIRECTION-CONTRACT-001 — Execution in service of a Priority

Date: 2026-10-05.

Baseline: `c1198369fd03269f667343c7aa64aae2cae89df2`.

[2026-10-05-direction-contract.md](2026-10-05-direction-contract.md) defined a directional relationship and left its execution endpoints open. [2026-10-05-month-contract.md](2026-10-05-month-contract.md) then refused to treat coexistence as that relationship. Discovery has now chosen the endpoints, the cardinality, and withdrawal. This record states those semantics. [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md) later stores the pairs. The migration is not applied. This record does not add a surface.

## Decision

Accepted.

An already-established Task, or an already-established Block, may be explicitly established by the human in service of an already-established Priority.

"In service of" records that intended placement in the larger picture. It claims no successful service and no outcome.

The relationship creates neither endpoint and changes neither endpoint's meaning. Orient does not infer it. While it is retained, it is inspectable and deterministic. It is optional. It carries no rank, no score, and no progress claim.

This record does not implement the relationship. [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md) stores a Task pair and a Block pair. It does not add a production interaction.

## Eligible execution

The execution side is a Task or a Block.

A Task-associated Block is not a third kind. It remains a Block. It may carry its own relationship only when the human explicitly establishes that relationship. The Task citation does not supply it.

This contract does not make these eligible: a Commitment, Protected Time, a Work shift, Cadence, the Active Thread, a Note, Must Do, `planned_on`, or Due.

A Block does not need a Task in order to carry the relationship.

## Priority is the endpoint

The directional endpoint is a Priority.

There is no execution-to-Destination relationship. A Priority's existing Destination ancestry stays an independent truth. If Task T is in service of Priority P, and Priority P is downstream of Destination D, Orient may know those two relationships. It must not manufacture Task T in service of Destination D. The same holds for a Block.

Whether one Priority may serve more than one Destination remains the open question on Priority. It does not add an execution-to-Destination edge.

## Cardinality

```text
Task  -> Priority    zero or many
Block -> Priority    zero or many
Priority -> Tasks    many may serve one Priority
Priority -> Blocks   many may serve one Priority
```

Each explicit execution-Priority pair is one relationship. Adding Priority B does not replace Priority A.

Absence means only that no execution-direction relationship is retained. It does not mean meaningless, unimportant, low priority, distraction, wasted time, or misaligned.

## No inheritance

A Task's relationship does not give that relationship to a Block.

A Block's relationship does not give that relationship to a Task.

Block-to-Task does not carry directional meaning in either direction.

Sharing a Priority does not change a Block's purpose. Sharing a Task does not change a Priority.

No relationship is inferred from adjacency, citation, Destination ancestry, completion, temporal overlap, Context, Must Do, Due, `planned_on`, or the Active Thread. Several Priorities that name the same Destination do not create these relationships.

## Distinct questions

Four questions stay distinct.

Note-to-Task provenance answers where this Task came from.

A task-associated Block answers what this chosen time is for.

Destination-to-Priority answers which larger direction this sustained attention was established downstream of.

Task-or-Block-to-Priority answers why this execution was deliberately established in the larger picture.

This contract does not collapse those predicates. It is not a generic relationship graph, and it does not authorize arbitrary edges.

## Progress

The relationship does not mean the execution advanced the Priority, that the Destination advanced, or that progress occurred. It does not mean the execution succeeded, was effective, was sufficient, or was aligned in hindsight. It does not mean the Priority became healthier, the Destination became closer, the time was valuable, or the human is on track.

Task completion does not change that. Block duration does not change that. Passage of the Block does not change that. Repetition does not change that.

Activity is not proof of progress.

## Time and Capacity

A Task relationship does not give the Task temporal territory.

A Block relationship does not change the Block's interval, purpose, Task citation, overlap, Capacity coverage, or temporal identity. A related Block is not more important than an unrelated Block.

A Priority does not become an interval. A Destination does not become an interval.

## Establishment

The relationship requires an explicit human act. Both endpoints must already exist. The act may come after either endpoint was created.

Capture language does not establish it. Creation order does not establish it. A shared Context does not establish it. A shared Destination does not establish it.

If a later representation records an establishment instant, that instant is the human act. It is not priority order, importance, a deadline, progress, or row-insert time. This record does not choose that representation. The relationship can be true without the instant being retained.

## One pair, one relationship

The same execution-Priority pair is one relationship.

Repeating the establishment act for that pair does not create a second relationship, a second event, or an establishment count.

After withdrawal, a later explicit act may establish that same pair again. The result is one relationship. The withdrawn relationship is not restored as history.

## Withdrawal

When the human explicitly says this Task, or this Block, is no longer in service of this Priority, Orient removes that relationship.

Orient does not retain it. There is no historical relationship state, no formerly-related state, no `withdrawn_at`, and no relationship event history. This is not event sourcing.

Withdrawal does not delete or rewrite the Task, the Block, the Priority, or Destination ancestry. It does not change Block-to-Task. It does not change Note-to-Task provenance. It does not mean failure, misalignment, or wasted effort.

## Completion and passage

Task completion does not withdraw the relationship. A completed Task may remain related until the human explicitly withdraws it.

Passage of a Block's interval does not withdraw the relationship. A past Block may remain related until the human explicitly withdraws it.

Execution lifecycle and this relationship's lifecycle are independent. Priority lifecycle does not follow execution lifecycle.

## Month

[2026-10-05-month-contract.md](2026-10-05-month-contract.md) may perceive explicit direction beside temporal structure. Where this relationship is retained, Month may also perceive that the Task or the Block is in service of that Priority.

Month still must not infer expression, progress, success, alignment, trajectory, sufficiency, or effectiveness. Coexistence is still not this relationship. A withdrawn relationship leaves Month nothing to say about that pair.

This record does not implement a Month reading.

## Context

Context agreement is not required. This contract does not bind a Destination or a Priority to a Context, and it does not infer the relationship from matching Context.

Whether a Destination or a Priority is Context-bound, and whether one Destination spans Contexts, remain unresolved.

## Representation

The relationship is its own semantic truth. This record chooses no schema.

The semantics imply these constraints for a later representation:

- Zero or many rules out a single Priority foreign key on a Task or a Block.
- A Task-Priority pair and a Block-Priority pair stay distinguishable.
- Pair uniqueness is meaningful.
- A generic arbitrary graph is rejected.
- Withdrawal removes the relationship.
- No historical relationship state is required.

[../implementation/DIRECTION-REP-001.md](../implementation/DIRECTION-REP-001.md) stores Destination and Priority. [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md) stores this relationship as two pair tables. It does not add `priority_id` to a Task or a Block.

## Non-goals

No runtime, schema, migration, persistence, UI, route, Month projection, or change to Destination or Priority storage follows from this record. Cadence is not given this relationship. Commitment, Protected Time, and Work shift are not given this relationship.

## Unresolved

- Any production interaction. The pair tables are [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md). The migration is not applied.
- Whether one Priority may serve more than one Destination.
- Whether Cadence explicitly relates to a Priority.
- Context binding of Destination and Priority.
- Destination lifecycle and Priority lifecycle, including editing and removal of those endpoints.
- Month reading mechanics and Month visual expression.
