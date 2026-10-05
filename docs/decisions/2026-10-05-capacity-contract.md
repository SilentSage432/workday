# CAPACITY-CONTRACT-001 — Bounded temporal Capacity

Date: 2026-10-05.

Baseline: `1f677fcac1cc9c9e23ace6356bea624f9834551c`.

## Decision

Accepted.

Capacity describes the portion of an established allocatable temporal territory that remains unutilized and therefore available for the human to allocate.

Capacity is a deterministic reading of established truth. In this repository a projection is that kind of reading: a pure function of supplied facts, not a table, and not a mutation of those facts. Capacity is a projection in that sense. It is not Timeline. It is not Current Temporal Orientation. It is not present-moment orientation.

It is not a persisted object, a Task property, a Context property, a score, a utilization percentage, a productivity metric, a free/busy status, a ranking, a recommendation, an allocator, a scheduler, or an inferred intention.

This record does not implement the reading.

## Established allocatable temporal territory

An established allocatable temporal territory is the outer temporal boundary within which unused territory can carry availability meaning.

The boundary is a human-established fact. Blank clock space outside such a boundary makes no Capacity claim.

No new persisted object is created for the boundary. The boundary is a fact Orient already stores, read for this purpose.

For the Work model that already exists, a scheduled Work shift may establish the temporal boundary within which Work Capacity can be read.

The shift is not itself Capacity. Every minute of the shift is not an independent availability fact. The shift establishes the bounded territory. Inside it, utilization and remaining availability can be read. Work Off does not establish Work Capacity. A missing Work schedule does not establish Work Capacity. Territory outside the shift does not become unavailable. It does not participate in that Work Capacity reading.

That is a bounded reading. It is not a statement about the rest of the user's life.

## Two silences

Older records use "unestablished" for any time with no fact on it. This contract splits that word.

Unbounded territory: Orient has no established allocatable boundary that makes an availability claim possible. The result is no Capacity reading. Nothing established, globally, is not available. Empty canvas territory, by being blank, is not free time.

Established allocatable territory: a human-authorized boundary exists, and allocation has meaning inside it. A portion of that boundary covered by no utilizing fact remains available for allocation within that reading. The availability is the deterministic consequence of the boundary and of what does not cover the portion. It is not a new stored fact, and it is not an assumption about the clock outside the boundary.

"Unscheduled time must not automatically be interpreted as allocatable time" stays true of territory that has no such boundary. A scheduled shift is not unscheduled territory.

## Utilization

Utilized, for this reading, means clock territory inside the relevant boundary that is already covered so it cannot be treated as remaining for discretionary allocation.

Utilization is not a domain object.

Inside a Work Capacity reading, covered territory is not remaining available Capacity when it is covered by:

- Protected Time. It is unavailable for allocation. It is not occupied by that sentence. It still cannot count as remaining available Capacity.
- A Commitment. It remains time constrained by something the human committed to. That meaning stays distinct from Protected Time. In the reading, the covered clock territory is utilized, so it is not remaining discretionary Capacity.
- A Block. It remains time the human chose a purpose for. The Block does not calculate what remains. The Capacity reading treats the clock territory the Block covers as utilized, so that territory is not remaining discretionary Capacity.
- A Task-associated Block. The effect is the effect of the Block. `taskId` says which established Task the chosen time is for. It is not a second duration. The Task is not subtracted again.

Protected Time, a Commitment, and a Block stay different facts. Sharing this reading's exclusion does not make them the same fact.

An open Task, `planned_on`, a due date, Must Do, Priority, the Active Thread, and a Note do not utilize territory. None of them has a duration from this contract. No duration is inferred.

## Overlap

Several truths may cover the same clock territory. Both remain true. Capacity does not delete either, choose a winner, or call the overlap invalid.

Semantic coexistence is not the same thing as geometric coverage. If a later reading states a remaining duration, overlapping utilized intervals count as the clock territory they cover, once. They are not summed as if each source consumed its own copy of the same minutes. This record does not define source precedence. It does not implement interval arithmetic.

A Protected Time from 12:00 to 13:00 and a Block from 12:30 to 13:30 are two truths. The covered territory is not ninety minutes of consumption inside a sixty-minute overlap.

## Work example

A scheduled shift from 08:00 to 17:00 establishes the bounded Work territory. Inside it:

- a Commitment from 09:00 to 10:00
- Protected Time from 12:00 to 13:00
- a Block from 14:00 to 15:00

are not part of remaining discretionary Work Capacity.

Other unutilized portions inside that boundary may remain available for allocation. The human named 11:00–12:00 and 16:00–17:00 as such portions. Those two intervals are examples. This record does not claim they are the only remaining portions, and it does not state a total of remaining hours.

Orient may deterministically describe the remaining unutilized territory inside that boundary. Describing it is not allocating it.

## Authority

Capacity may answer:

- How much of this established territory remains unutilized?
- Which portions of this established territory remain available for allocation?

Capacity does not answer, by authority:

- What should the human do with it?
- Which Task deserves it?
- What matters most?
- Which Block should move?
- Which Commitment should be sacrificed?
- What should be scheduled next?

Capacity observes the consequences of established truth. The human establishes a new allocation. After the human establishes a Block or another utilizing fact, a later reading can change because the underlying truth changed. The reading does not create that fact.

No allocator, auto-scheduler, optimization, or recommendation follows.

## No reading

When no applicable allocatable boundary has been established, Orient does not calculate availability from blank space.

No entered Work schedule, Work Off, clock territory with no applicable boundary, and Family, TeamLab, or Financial territory whose boundary type is not yet decided are the same kind of result.

The result is not zero Capacity. It is not unlimited Capacity. No Capacity reading is established for that question.

## Context

Work is the first case in which an explicit temporal boundary already exists. Family, TeamLab, and Financial do not gain shifts, do not inherit Opening, Mid, or Closing, do not treat non-Work time as allocatable, and do not receive a fabricated boundary.

The reading must be able to accept another explicitly established allocatable boundary later. This record does not define those boundary types. Work is not the ontology of Capacity.

Current Context is not required when the relevant boundary is already explicit. This record does not infer Current Context.

## Resolution

Capacity is grounded in temporal territory, so a later projection may show the same reading across resolutions. This record does not define that expression.

Month remains landscape. Week remains shape. Day remains the exact temporal canvas. Present-moment orientation remains orientation inside the lived moment. How Capacity is shown at each resolution is later work.

## Timeline and orientation

Timeline composes temporal truth. It does not resolve temporal truth. It does not calculate Capacity. It may supply the established facts a Capacity reading needs. It does not become that reading.

Current Temporal Orientation still answers which established temporal truths contain the instant. It does not label that instant free or available.

Present-moment orientation remains Current Temporal Orientation and the Active Thread. Capacity is not added to either projection by this record.

## Not free/busy

Capacity is not a calendar free/busy status.

Protected Time can be unavailable for allocation without being occupied. Work Off is not busy and is not automatically free. Blank territory outside an allocatable boundary makes no claim. Overlapping truths stay independently meaningful. A Block is a chosen purpose, not a generic busy mark. A Commitment is a constraint. Capacity is relative to an established allocation boundary.

An explanation may call a named portion inside a boundary free only as ordinary speech about that example. The canonical words are available for allocation, remaining available territory, and unutilized territory.

## Determinism

The same established allocatable boundary, the same relevant established truths, and the same civil-time interpretation produce the same reading.

No AI, LLM, ML, or agentic inference. No inferred importance, urgency, or availability outside the boundary. No inferred Current Context.

## What earlier sentences now mean

[2026-10-02-protected-time.md](2026-10-02-protected-time.md) says availability is established, not assumed, and that unscheduled time must not automatically be interpreted as allocatable time. The establishment is the allocatable boundary and the utilizing facts. The remaining portion is derived inside that boundary. Global silence is still not availability.

[2026-10-05-task-time-contract.md](2026-10-05-task-time-contract.md) says the Work schedule is temporal context, not available capacity. The shift is still not Capacity. It can bound a Work Capacity reading.

That contract says a Block does not calculate what remains. The Block still does not. This reading may treat the territory the Block covers as utilized.

That contract says a Commitment is constrained and is not defined as Protected Time. Both can exclude covered territory from remaining discretionary Capacity. They remain different facts.

That contract says unestablished time makes no capacity claim, and empty canvas territory is not free. That stays true of territory outside an applicable boundary, and of blank paint that has not been read against a boundary. Unused territory inside an established allocatable boundary can remain available within that reading.

A Task-associated Block may be one explicit input to this reading because it is a Block. The relationship is still not itself Capacity.

## Unresolved

- What other facts can establish an allocatable boundary outside Work.
- What an external temporal fact does to a Capacity reading.
- Whether any Commitment ever leaves part of its covered territory in remaining discretionary Capacity.
- The interaction that shows Capacity.
- Week expression, Month expression, and present-moment expression.
- Final visual grammar.
- What Task removal does to Blocks that cite the Task.
- Start, Adjust, and Skip.
- Whether Capacity participates in Pulse.
- Whether a reminder interacts with Capacity.

## Not authorized

No schema, migration, runtime reading, allocator, scheduler, Week surface, Month surface, inferred Current Context, or visual design follows from this record.
