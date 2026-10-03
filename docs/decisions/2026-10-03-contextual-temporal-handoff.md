# Contextual temporal handoff

Date: 2026-10-03.

## Decision

Gesture provides speed. Precise controls provide accuracy.

That sentence is interaction evidence from this tranche. It is not a domain invariant.

The emerging sequence is:

Grab time, refine time, establish meaning, provide the meaning-specific information, then explicitly establish the truth.

V0-012A proves only the first three. It stops before the fields that would establish a fact, and it does not persist anything.

## Phone evidence

V0-011's gesture still stands: a brief hold, a vertical drag, release, and an upward drag all select a portion of the day.

V0-012's meanings still stand: Protect this time, Choose a purpose, and Add a commitment.

Real use of that chooser felt like something had just shown up above the calendar. The expected continuation is different. The user selects time inside the canvas, releases, and the next step stays with that time. The selected region should remain visible. The user should be able to refine it, then say what it means.

After a region exists, the natural reaction is that the region itself stays manipulable. The specific instinct was that grabbing the bottom of the region would adjust its end. That is evidence for a later tranche. This one does not add resize handles. The relationship between vertical scrolling, a new selection, and a top or bottom edge is its own question. Precise start and end controls are the refinement mechanism until that question is earned.

A tap on the already selected band no longer starts a replacement selection. The band is not a handle. A press outside it can still select a new range.

## Surface

When a selection settles, a contextual surface opens over the day canvas. It is not a disappearing notification, not a full-screen takeover, and not another block of content above the calendar. It is owned by the day canvas. It is not `position: fixed`.

The surface shows the selected range, the same start and end as editable controls, the local-clock sentence when one exists, and the question "What does this time mean?" Refinement is available and not required. The three choices stay immediately reachable. Clear removes the range, the intention, and the surface. There is no second control that does the same thing.

The selection band stays on the axis. The surface is centered in the visible canvas so the release continues in that field. It can cover much of that field. The written range inside the surface is what keeps the territory identifiable when the card is tall.

## One selection

The transient selection remains `{ civilDate, startMinute, endMinute }`. Editing the controls updates that value. The band is drawn from it. There is no second range.

An edit that is incomplete, empty, reversed, or outside this civil day does not change the selection and is not reordered into a valid range. The controls keep the attempt, and a sentence says which of those it is. The band stays on the last valid range.

A new gesture still replaces the range and clears the intended meaning. Refining the current range does not. Change meaning still clears only the intention.

Stored local times are `HH:MM`. The existing hour, minute, and AM/PM fields already edit that precision, including a minute such as 07. The gesture still snaps to 15 minutes. That snap is not a rule about what a stored time may be. The smallest accepted refined range is one minute. The end of the civil day remains minute 1440, named "end of this civil day", because 12:00 AM is also the start of the day.

## What this tranche refuses

No migration, persisted selection, persisted intention, Timeline change, semantic creation, resize handle, edge drag, fact edit, Task, Work as a meaning, Capacity, availability, free or busy, conflict, priority, Month, Week, NOW, current-time line, auto-scroll, haptics, or a broad visual redesign.

Opening Manage schedule, changing the civil day, refreshing source truth, and changing the confirmed time zone still dismiss the surface with the selection.

The next question, after this surface has been used on a phone, is: "What is the minimum meaning-specific information required before the user can explicitly establish each kind of temporal truth?"

Known current hypotheses, not built here: Protected Time may need only the range, and its optional label has to be inspected first. A Block requires a purpose; Context may be optional. A Commitment requires a title.

The direct-manipulation hypothesis recorded here, also not built, is that the top edge of the band would adjust the start and the bottom edge would adjust the end.

## Consequences

- `DayCanvas` owns the surface. `daySelection.ts` still owns the one selection and the intention.
- `refine` changes minutes only when the local order is valid, and it keeps `intendedMeaning`.
- A press inside the current band does not start a gesture.
- DST sentences still describe the local range. A refined minute inside a spring-forward gap or a repeated fall-back hour is still named. No instant is kept.

The tranche record is [../implementation/V0-012A.md](../implementation/V0-012A.md).
