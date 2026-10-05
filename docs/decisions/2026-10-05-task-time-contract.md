# TASK-TIME-CONTRACT-001 — Time deliberately given to a Task

Date: 2026-10-05.

Baseline: `93528a55bfaa1052e40dca734aade06b74f316ab`.

## Decision

Accepted.

When the human deliberately gives some of their time to executing an existing Task, the Task does not acquire temporal coordinates. The human establishes a Block for that time. The Block may refer to the Task.

The Block remains a Block. The Task remains a Task.

This record does not store the reference, add a column, or change a projection.

## What was interrogated

The candidate was that allocating time to a Task is not a temporal identity on the Task. It is a temporal intention that may refer to the Task, and the existing Block is that intention because a Block already means: "I have chosen what this time is for."

Repository authority supports that carrier.

- [../../DOMAIN.md](../../DOMAIN.md) defines a Task as action required, and a Block as time the user has chosen a purpose for. Those are different primitives.
- [2026-10-02-blocks.md](2026-10-02-blocks.md) keeps Block independent of Protected Time. Purpose is the user's words. V0 stores no Task on a Block.
- [2026-10-02-protected-time.md](2026-10-02-protected-time.md) makes time unavailable for allocation. That is not "I chose this time for executing this action."
- [2026-10-02-commitments.md](2026-10-02-commitments.md) constrains time by something the user has committed to. That is not the same choice.
- [2026-10-02-today.md](2026-10-02-today.md) keeps `planned_on` as a civil-day intention. Planning Today does not reserve time.
- [2026-10-02-timeline-composition.md](2026-10-02-timeline-composition.md) composes temporal truth and does not resolve it. A due date or a planned day does not make a Task a temporal interval. Overlap is geometric. Conflict is not inferred.
- [2026-10-03-current-temporal-orientation.md](2026-10-03-current-temporal-orientation.md) and [2026-10-04-present-moment-orientation.md](2026-10-04-present-moment-orientation.md) keep a current Block from establishing the Active Thread, and keep the Task out of the temporal-fact list.
- [2026-10-04-provenance-contract.md](2026-10-04-provenance-contract.md) limits provenance to where an explicitly established Task came from. That is a different question from what a period of time is for.
- Earlier day-canvas, timeline, and temporal-meaning records treat dragging a Task into time as evidence that the Task would remain a Task and the allocation would be a Block. They do not store that relationship. This contract gives that evidence its semantic meaning. It does not implement the gesture.

## Conflicts left visible

[../discovery/FOUNDATION-003.md](../discovery/FOUNDATION-003.md) says a Block "may have Tasks." That plural sketch is not current cardinality. One Block cites zero or one Task.

[../../DOMAIN.md](../../DOMAIN.md) listed "an optional association with a Block" among facts a Task may have. That wording put a singular association on the Task. Current authority puts the reference on the Block. Zero, one, or many Blocks may refer to the same Task. The Task does not hold one Block.

[2026-10-02-blocks.md](2026-10-02-blocks.md) says no Task is stored on a Block. That remains true of storage as of this decision. It is not a permanent semantic prohibition. The reference is decided here and is not implemented by this record. [../implementation/TASK-TIME-001.md](../implementation/TASK-TIME-001.md) later stores it. TASK-TIME-001A accepts the hosted schema and the Samsung Galaxy S26 Ultra scaffold. The scaffold is not the final interaction.

Timeline's later-source note still says planned Tasks may someday be composed. This contract does not add Tasks to Timeline. A Block that refers to a Task remains a Block. `planned_on` remains a civil day, not an interval.

The adoption sequence "plan Tasks against actual temporal reality" is not an allocator. This contract names the relationship that can record time the human chose for a Task. It does not define Capacity.

## Meanings

A Task answers: what action is the user responsible to execute?

A Block answers: what has the user chosen this time for?

A Task-associated Block answers: which already-established action did the user choose this time for?

The purpose text remains the user's words. It stays required. It is not a category, and it is not replaced by the Task. The Task title is not copied into the purpose. The purpose does not edit the Task. Context on the Block and Context on the Task stay independent. Neither is inferred from the other.

Absence of a Task reference means only that this Block does not cite a Task. A Block with only a purpose remains legitimate.

Protected Time, a Commitment, and a Work shift do not receive this reference.

## Cardinality

```text
Block -> zero or one Task
Task  -> zero to many Blocks may refer to it
```

The reference belongs to the Block. The Task does not list those Blocks. There is no relationship graph, no allocation entity, and no second schedule object.

One Task may be cited by separate Blocks. Monday 14:00–15:00 and Tuesday 13:00–14:00 may each refer to "Complete quarterly report." Those are two periods the human chose for the same responsibility. They are not one duration, and they are not summed into a duration on the Task.

A Block does not require a Task. A Task does not require a Block.

## planned_on

`planned_on` remains day-level intention concerning accomplishment of a Task. It is not precise temporal allocation.

A Block on another civil day may refer to a Task whose `planned_on` is Wednesday. Both facts remain. Orient does not move the Block, clear `planned_on`, or rewrite either fact to hide the difference. Human interpretation may find them in tension. The system does not resolve that tension.

An all-day Block is still a Block. It does not write `planned_on`.

## Completion

Task completion and temporal allocation stay independent unless the human explicitly changes both.

Completing a Task does not remove, complete, or rewrite an associated Block. A Block that referred to the Task remains the record that the human chose that time for that action. The Block has no completion of its own from this contract.

Completing a Task before, during, or after that Block does not by itself change the Block. The human may still explicitly change either fact.

## Active Thread

Giving time to a Task does not establish the Active Thread.

Choosing a time for a Task and explicitly establishing current intention are different acts. A Block's start still does not replace or clear the thread. Changing the thread does not create, move, or remove a Block.

## Facts this relationship does not establish

A Task-associated Block does not establish Must Do, Priority, urgency, a due date, `planned_on`, a reminder, Context, or completion.

It does not infer them from the Task, and the Task's existing values do not flow onto the Block.

## Overlap

Association does not change overlap.

A Task-associated Block may overlap Protected Time, a Commitment, a Work shift, or another Block. Those remain separate truths. Overlap is not a conflict, not a warning, and not a statement that the time was available. The Block does not release, split, or shorten Protected Time.

Unestablished time remains not available time. Empty canvas territory remains not free. [2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md) later distinguishes silence outside an allocatable boundary from unutilized territory inside one. This record does not make that distinction.

## Current Temporal Orientation

A Block that contains the instant already participates in Current Temporal Orientation. The Task reference is part of what that Block is for. It does not add the Task, Must Do, Priority, or the Active Thread as members of that orientation.

Present-moment orientation stays Current Temporal Orientation and the Active Thread. This relationship does not rank them and does not make them match.

Timeline is unchanged. It still does not include Tasks as intervals. Carrying a Task reference on a composed Block is not authorized by this record.

## Not provenance

Provenance answers where an explicitly established fact came from. For a Task, that is zero or one originating Note.

Block to Task answers what the chosen time is for. The Task is not the origin of the Block. The Block is not evidence the Task came from. The human authorizes both facts. This is not generic provenance, and it does not cite a Note from a Block.

## Duration

A Block has temporal extent. The Task does not acquire a start, an end, or a duration. Several Blocks that refer to one Task do not become that Task's duration.

## Lifecycle

Task lifecycle and Block lifecycle stay independent.

- Moving or resizing a Block changes when the human chose to give that time. The Task does not become a different Task. `planned_on` is not rewritten.
- Removing a Block removes that temporal intention. The Task remains. This record does not add a deletion mechanic. Existing Block removal still does not remove a Task.
- Editing the Task title, Context, planned day, due day, or Must Do does not rewrite the Block.
- Changing `planned_on` does not move Blocks.
- Changing Must Do does not alter Blocks.
- Changing the Active Thread does not alter Blocks.
- Editing the Block purpose does not edit the Task.

What a future Task removal would do to Blocks that refer to that Task is unresolved. This record does not cascade and does not clear the reference.

Start, Adjust, and Skip, when a Block and the lived day differ, remain unresolved.

## Two ways to establish the same truth

The canonical result is one explicit human act: a Block for a temporal range whose reference is an existing Task, with purpose still the user's words.

Two physical entries can establish that same result.

- Task first. The human takes an existing Task and places it on a precise range.
- Time first. The human selects a range and chooses that the time is for an existing Task.

Both mean the same domain relationship. Neither is a screen, a gesture, or a stored interaction. This record does not design either one. It does not authorize copying the Task title into the purpose. It does not authorize creating the Task from the time, or creating the Block from `planned_on`.

Reference to a Task, without the establishment act, establishes nothing.

## Capacity

This relationship is not Capacity.

Protected Time remains unavailable for allocation. A Commitment remains constrained time. A Block remains chosen purpose. The Work schedule remains temporal context, not available capacity. Unestablished time makes no capacity claim. A Task-associated Block does not prove that surrounding time is available. Empty canvas territory is not free. Those sentences are this record. The later bounded reading is cited below.

No allocator, auto-scheduler, optimization, inferred availability, or recommendation follows from the reference.

A Task-associated Block may later be one explicit input to deterministic Capacity reasoning. That reasoning is not defined here. [2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md) later defines the bounded reading. The shift can bound it and is not itself Capacity. A Block still does not calculate what remains. The reading may treat covered territory as utilized. Capacity still blocks operational adoption until that reading exists in the product.

## Human authority

The reference becomes true only by explicit human establishment.

Not authorized: automatic scheduling of a Task; a Block created from `planned_on`; `planned_on` created from a Block; inferred duration; inferred purpose; inferred current intention; an automatic Active Thread; automatic rescheduling; automatic conflict resolution; automatic Capacity allocation.

A future bounded external interface may request establishment. That interface is not part of this contract.

## Unresolved

- What Capacity means. Answered for the bounded reading by [2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md). The reading is not built here.
- What Task removal does to Blocks that refer to that Task.
- Start, Adjust, and Skip.
- The interaction that supplies the Block purpose when the human gives time to a Task.
- Whether a later projection shows the Task reference on a Block.
- Reschedule and carry-forward. They do not, by this contract, move Blocks.

TASK-TIME-001 later stores the reference and proves the time-first scaffold. TASK-TIME-001A, in that same record, accepts the hosted schema on `ksmhgaamyheyhefbyglb` and the Samsung Galaxy S26 Ultra establishment path. The semantic contract is unchanged. The scaffold is not the final interaction. Task removal, Start, Adjust, Skip, Task-first placement, and the production experience remain unresolved. The bounded Capacity reading is [2026-10-05-capacity-contract.md](2026-10-05-capacity-contract.md). It is not built by this record.
