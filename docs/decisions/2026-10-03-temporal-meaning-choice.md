# Temporal meaning choice

Date: 2026-10-03.

## Decision

See time, refer to time, then establish what that time means.

The user manipulates time before establishing what that time means.

V0-011 proved the middle step: a settled local-clock range means "this is the time I am referring to." Real use on a phone confirmed the gesture. A brief hold, a vertical drag, and an upward drag all select a portion of the day, and that selection feels natural. The gesture stays.

V0-012 asks the next question, beside that range: "What does this time mean?"

The three answers are intentions, not facts:

- Protect this time. The user means to establish that this time is unavailable for allocation.
- Choose a purpose. The user means to choose what this time is for.
- Add a commitment. The user means that this time is constrained by something they have committed to.

Work is not one of those answers. A Work shift has its own civil date, shift status or type, and local bounds, including Off and an unknown day. It is not an arbitrary meaning for a selected span. Its management path stays where it is.

A Task is not one of those answers. A Task remains an action required. A later allocation might become a Block associated with a Task. That relationship is not designed here and is not stored.

## Interaction state

The session may hold a selection and an intended meaning together:

```text
selection: { civilDate, startMinute, endMinute } | null
intendedMeaning: "protected_time" | "block" | "commitment" | null
```

The selection value itself stays a civil date and local minutes. The meaning sits beside it. There is no Meaning Choice entity, no provenance, and no database enum.

Choosing a meaning does not save it. It shows that both the time and the kind were understood:

- Protected time. Unavailable for allocation.
- Block. What this time is for.
- Commitment. An established constraint.

No label, purpose, Context, or title is collected. Change meaning clears only the intention and keeps the range. Clear means the user is no longer referring to this time, so it removes the range and the intention. A new selection replaces both and asks the question again. Previous day, Next day, Today, opening Manage schedule, and a source-truth refresh clear both. A cancelled gesture, or a touch that turns out to be a scroll, restores the previous range and the previous intention.

The question appears only after a selection has settled, directly under the written range. It is not a permanent toolbar, and it does not send the user to Manage schedule.

## Overlap, capacity, and DST

The question stays available when the range crosses Work, Protected Time, a Block, a Commitment, or several of those at once. No choice is disabled. Protected Time does not win. Overlap is not called a conflict, and the range is not called available, free, or open.

Nothing established is not the same as available. The chooser does not claim capacity.

A spring-forward gap and a repeated fall-back hour keep the sentences from V0-011. The user may still name an intention. The local range is not turned into an instant, and a repeated hour is not silently chosen. Persistence later has to validate that local time. This tranche does not persist.

## Manage schedule

Manage schedule stays on the page, in the same place, as the explicit CRUD scaffold. Opening it clears the direct-manipulation session, including any intended meaning. The forms are not prefilled.

The separate Work, Protected Time, Block, and Commitment controls were necessary before the canvas could manipulate temporal truth directly. Real use of the page suggests some of those controls may later become redundant, because the user can manipulate the time they are already looking at. That is direction. Manage schedule becomes less important only when the canvas has earned the ability to perform its responsibilities. This tranche does not remove it, relocate it, or redesign the Schedule page.

## What this tranche refuses

No migration, persisted intention, Timeline fact, semantic creation, Protected Time, Block, Commitment, Work shift, Task, Task and Block relationship, form prefilling, fact editing, fact move, fact resize, all-day selection, cross-day selection, edge auto-scroll, Month, Week, NOW, current-time line, Capacity, availability, free time, conflict, priority, ranking, recurring obligations, reminders, Pulse, notifications, Google Calendar, Gemini, OAuth, synchronization, voice, watch app, service worker, AI, or a broad visual redesign.

The next earned question, not answered here, is: "What information is minimally required to establish that truth?"

Known current answers, not built here:

- Protected Time. The selected range may be sufficient. Optional labeling already exists and has to be inspected before that form is designed.
- Block. A purpose is required. Context may be optional.
- Commitment. A title is required.

## Context

V0-011 left the selected range without a kind. Phone use earned the gesture. The management sections under the day are still the place where facts are created. This tranche only proves the handoff from a selected time to a named kind.

## Consequences

- `components/daySelection.ts` still owns the session. `intendedMeaning` is cleared by the same reducer that clears or replaces the range.
- `DayCanvas` renders the question and the three actions. It does not call Supabase or Timeline.
- The day session remounts empty when the civil day or the discard token changes, so navigation, Manage schedule, and a source refresh cannot keep a stale intention.

The tranche record is [../implementation/V0-012.md](../implementation/V0-012.md).
