# MULTI-CONTEXT-CONTRACT-001 — Context across one temporal reality

Date: 2026-10-05.

Baseline: `bf29ae3c6ba4ea579c238d664a8ccfc1e41b1027`.

Discovery: MULTI-CONTEXT-CLOSURE-DISCOVERY-001.

Older sentences call a Context a meaningful area or operating mode. This record keeps the area and retires the mode. "Operating mode" does not mean a mutually exclusive application mode or a system state.

## Decision

Accepted.

A Context is a meaningful area of the human's life.

Orient represents one human moving through one temporal reality. Context does not partition that reality.

Work, Family, TeamLab, and Financial are canonical seed Contexts from evidence. They are not an exhaustive closed enum. There is no generic Personal Context.

Work is the first deeply discovered operating environment. Work is not the ontology of Orient.

This record does not add a runtime, a schema change, a migration, a projection change, a route, a control, or Context administration.

## What Context is not

A Context is not a silo, a folder, a category, a workspace, a project, a profile, an account, a mutually exclusive application mode, an importance system, or a second hierarchy.

## One temporal reality

Context does not partition Timeline, Week, Month, the clock, the calendar, or present orientation.

Facts associated with different Contexts may coexist and overlap on the same temporal canvas. Context does not create parallel temporal worlds. A difference of Context is not, by itself, conflict, invalidity, or double-booking.

## Explicit references

A Task may carry zero or one explicit Context reference. A Block may carry zero or one explicit Context reference. Absence is valid and complete.

A fact does not require a Context merely because it exists.

Null means no Context reference has been established on that fact. It does not mean Personal, unknown, uncategorized work, incomplete, or error.

## Task and Block

Task Context and Block Context are independent truths.

A Task-associated Block does not inherit the Task's Context, does not assign its Context to the Task, and does not require Context agreement. The two may share a Context, carry different Contexts, carry a Context on only one side, or both carry none.

This record adds no propagation.

## Context-neutral facts

For this foundational boundary, these remain Context-neutral:

- Note
- Commitment
- Protected Time
- Destination
- Priority
- Task to Priority service
- Block to Priority service
- Must Do
- `planned_on`
- Due
- Active Thread

Context is not added for symmetry or for filtering convenience.

A Note preserves experience while understanding is forming. Requiring a Context could force an interpretation before the human has made one. This record does not authorize a Note Context. It is not a permanent prohibition on every future relationship.

A Destination is not a Context. A Priority is not a Context. They are not Context containers.

## Direction

Direction does not require a Context binding to be true.

A Destination or a Priority may use words the human understands as Work, Family, TeamLab, Financial, more than one of those, or something else. Orient does not assign a Context relationship from those words.

Orient does not infer a Direction's Context from a Task Context, a Block Context, repeated execution, a service relationship, or temporal placement.

A Task or a Block in service of a Priority still requires no Context agreement. Matching Context does not establish that service. A different Context does not invalidate it. The service does not assign a Context to the Priority, the Destination, the Task, or the Block.

Whether Direction ever gains an explicit Context relationship stays outside this contract.

## Work-specific ontology

A fact that carries the Context Work is not the same thing as a primitive that exists only as Work.

These remain Work-specific:

- Shift and the Work schedule
- Opening, Mid, and Closing
- the Lowe's Saturday-first fiscal week
- the Work Capacity boundary
- LSR
- FSR
- Power Hour
- associate alignment

Family, TeamLab, and Financial do not receive copies of those primitives. Symmetry is not a requirement.

## Capacity

A scheduled Work shift can bound a Work Capacity reading. The shift is not itself Capacity.

Other Contexts do not gain an allocatable boundary by existing. This record does not invent a Family shift, a TeamLab shift, a Financial shift, a universal daily Capacity, or a global free-time reading.

Non-Work Capacity boundary types remain unresolved. That gap does not block Experience Architecture.

## No current Context

Orient has no persisted current Context and no inferred current Context.

Orient does not infer one from the current time, a Shift, a Block, a Commitment, Protected Time, the Active Thread, a Task, or whichever temporal fact contains the present instant.

Several Context-bearing truths may coexist at that instant. No Context wins because it contains now.

There is no canonical question left of the form "which Context is current." Experience focus, below, is not that question.

## Present orientation

Present orientation remains a composition of independent truths.

At one instant Orient may retain a Work shift that contains now, Protected Time that contains now, a TeamLab Block that contains now, and an Active Thread citing a Task with another Context or with none. Orient does not resolve those truths into one Context.

## Timeline, Week, and Month

Timeline remains one canvas. Where a Block explicitly carries `contextId`, that identity may travel with the Block fact. Context does not change placement, overlap, source identity, or temporal truth. Timeline is not partitioned by Context.

Week remains a complete reading of established temporal structure for its supplied range. It does not need a current Context to be complete. A future experience may focus what is perceptible. That focus does not change Week's canonical facts.

Month remains Context-neutral. It does not need a Context binding to be truthful. Destinations, Priorities, Timeline facts, execution-direction relationships, and cited Task identity stay under their existing semantics. An experience lens is not Month's domain truth.

## Capture

Capture does not require a Context. "Call the dentist" may be a Task with no Context reference. General capture does not infer a Context from wording. Fast capture does not gain a mandatory Context-selection step.

## Active Thread

The Active Thread is explicit current intention. It is not current Context. It has no Context field of its own.

If the cited Task carries a Context, that Context remains the Task's. The thread does not copy it. Changing a Context does not replace or clear the thread.

A suspended thread per Context stays outside this closure.

## Overlap

Cross-Context overlap is ordinary coexistence. These are valid:

- a Work Block overlapping Family Protected Time
- a TeamLab Block overlapping a Work shift
- a Work Task cited by a Block with no Context
- a Context-neutral Task cited by a TeamLab Block
- a Task and a Block carrying different Contexts

Protected Time in the first case is still Protected Time. It does not become a Family Context reference because a person describes it as family time. Family, if recorded, is an explicit reference on a fact that already carries one.

## Experience focus

Experience focus is not domain truth.

A future act in the spirit of "show me Work" may focus the experience over facts that explicitly carry Work or that already are Work-specific. It does not establish a current Context, rewrite facts, change Timeline, or create a workspace.

"Show me everything" does not switch Context. It lifts that lens from the same reality.

How Context-neutral facts behave under a lens is an Experience Architecture question. This record does not design the control.

## Authority

Orient may say that a Task carries a Context, that a Block carries a Context, that a Task or Block carries no Context reference, and that a temporal fact preserves an explicitly stored Context reference.

Orient may not infer which Context matters most, which one wins, which one the human is really in, that Work outranks Family, that an interruption changes importance, that duration proves importance, or that containment of the present instant establishes a current Context.

## Representation

The stored shape, unchanged by this record:

- a Context is a user-owned row
- it has a stable id, a non-blank name unique for that user, and `created_at`
- signup seeds Work, Family, TeamLab, and Financial
- a Task or a Block may reference one of those rows, or none

Context is not a Postgres enum, a fixed exhaustive type, a generic taxonomy, a hierarchy, or a workspace model.

Deleting a Context currently sets a citing `context_id` to null and leaves the Task or Block. That is existing storage behavior. It is not a product decision to administer Contexts.

## Experience Architecture

After this contract, no known remaining foundational semantic ambiguity blocks primary Orient Experience Architecture.

Orient is not production-complete. Recurrence, reminders, Pulse, notification delivery, external temporal interoperability, voice ergonomics, production hardening, final production acceptance, and non-Work Capacity boundaries, where a later requirement demands them, stay later. They must respect this ontology.

## Outside this contract

- Context creation, rename, archive, delete, merge, and reclassification as product semantics
- multi-membership
- hierarchical Contexts
- a suspended Active Thread per Context
- Destination or Priority bound to a Context
- non-Work Capacity boundary types
- the exact treatment of Context-neutral facts under an experience lens

## Unresolved

- Whether one fact may carry more than one Context.
- Destination and Priority Context binding.
- Context administration and lifecycle.
- Non-Work Capacity boundary types.
- How an experience lens treats Context-neutral facts.
- A suspended Active Thread per Context.
