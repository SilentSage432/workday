# Current temporal orientation

Date: 2026-10-03.

NOW-CONTRACT-001 later places this projection beside the Active Thread as the first present-moment composition. This projection remains one independent truth. It is still not the composition by itself, still not persisted, and still not `rankNow`. The sentence below that this projection is not NOW stays true of the projection alone. See [2026-10-04-present-moment-orientation.md](2026-10-04-present-moment-orientation.md).

## Decision

`projectCurrentTemporalOrientation` returns the established temporal facts that contain a supplied instant.

The facts stay distinct: Work schedule, Protected Time, Block, and Commitment. More than one may contain the same instant. The projection keeps all of them. It does not choose a winner, rank them, merge them into one event, or describe the overlap as a conflict.

Absence of a fact is an empty result. The projection does not label that instant free, available, open, unscheduled, or unallocated. Unestablished time is not available time.

Work contributes at most the shift that existing Work orientation already treats as the current schedule, and only while that shift contains the instant. Power Hour, FSR, opening steps, and the next boundary stay in Work orientation. This projection does not replace that reading.

The Active Thread is not an input. A current Block does not establish a thread. A thread does not create a temporal fact.

This projection is a primitive a future NOW can use. It is not NOW. There is no `/now` route and no `rankNow`.

The words "a future NOW" record this 2026-10-03 decision, when the composition was still open. They are not authority to treat the composition as undecided, or to add `rankNow`. The projection remains one input. The experience that might later be called NOW is still unbuilt and does not have to use that name.

Timeline is unchanged. Its input is still a civil range, not an instant.

## Context

After V0-015, Resume already answers which Task the user explicitly started. Work orientation already places a shift. The day canvas already draws established time. Those truths did not meet, so a changing day could not be read next to current intention.

The classifiers for Protected Time, Blocks, and Commitments already say whether a row is current. Work orientation already says whether the instant is during the current shift. The new projection calls those functions. It does not invent a second interval rule.

## Consequences

- Tasks shows this reading next to Resume. The two sections stay separate. The screen does not say they must match.
- Schedule does not gain the Active Thread in this tranche.
- The pure function takes the instant from its caller. The Tasks screen supplies a new instant at each minute boundary, and again when the page becomes visible. Stored local times are minute resolution, so a one-second timer is not used.
- A missing confirmed time zone uses the same refusal as Today. The browser zone is not a fallback.
- No schema, no Task behavior, and no Task-to-Block association.

The implementation record is [../implementation/V0-016.md](../implementation/V0-016.md).
