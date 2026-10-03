# Direct time selection

Date: 2026-10-02.

## Decision

The user manipulates time before establishing what that time means.

V0-011 lets the user select a span of local civil time on the Day canvas. The selection records the civil date and the local start and end. It has no semantic kind, purpose, title, Context, or provenance.

A selected time range is transient interaction state. It is not Protected Time, a Block, a Commitment, a Task, Today, the Active Thread, availability, capacity, or a Timeline fact. It is not added to [DOMAIN.md](../../DOMAIN.md) as a stored primitive. Nothing about it is written to Supabase. There is no `selections` table and no migration.

Selection means "this is the time I am referring to." It does not mean the time is free, available, or safe to allocate. The user may select any portion of the timed canvas, including time that already holds Work, Protected Time, a Block, a Commitment, an overlap, or nothing established. Overlap with those facts is not a conflict. The gesture does not snap around them, subtract them, or warn.

## Interaction

The primary surface is a phone. Pointer Events cover touch, mouse, and pen in one path. No gesture library and no drag-and-drop library are added. Existing facts are not dragged or resized.

The timed column scrolls. A vertical finger movement can mean scroll or selection. Ordinary scrolling stays available. The distinction is:

- Touch: the finger must rest for 220ms, inside a 10px movement slop, before a drag selects time. Movement beyond that slop before the hold completes is a scroll. The hold is then ignored. 220ms is an interaction threshold, not an inference, and it is not a multi-second long-press.
- Mouse and pen: a press selects immediately. A drag adjusts the range. Those pointers do not scroll the day by dragging.

A tap, or a press that does not move onto another boundary, selects one snapping increment: 15 minutes. Nothing is persisted, so the tap does not create a fact.

The timed surface receives the gesture, including where a fact is drawn. Timed facts are not pointer targets in this tranche. Their accessible names stay in the tree. The all-day region is not selectable. There is no "select whole day" action and no all-day creation.

There is no edge auto-scroll. A drag is clamped to the visible intersection of the timed surface and the 28rem scrollport. Hours that are scrolled out of view are not selected until the user scrolls to them.

## Time

The visual grid is hourly. Selection snaps to 15 local minutes. An hour row is 3.25rem, so 15 minutes is 0.8125rem, about 13px at a 16px root. That is coarse enough for a finger and fine enough for ordinary planning. Five minutes would be a few pixels. The hourly lines stay hourly. No 15-minute grid is drawn.

Snapping is nearest increment. A halfway minute rounds toward the later boundary. The two boundaries are ordered, so a drag upward from 9:00 PM to 7:00 PM is 7:00 PM–9:00 PM. Direction has no semantic meaning.

The minimum range is one increment. A zero-length range is not created. The range is clamped to this civil clock, from 00:00 through the next civil midnight. It does not cross into another civil date.

Pointer position is evidence. The stored selection is the civil date plus local minutes. Rendering maps those minutes back onto the axis. Pixel coordinates are not the selection.

## Day, tools, and refresh

Selection belongs to one civil day. Previous day, Next day, and Today clear it when the civil day changes. The same clock range is not copied onto the next day. Today does not navigate when the selected day is already the confirmed civil date, so that control is not shown and does not clear a selection by itself.

Opening Manage schedule clears the selection. Closing it does not restore one. A successful Work-week save, or a successful Protected Time, Block, or Commitment save or remove, reloads the day and clears the selection. A changed confirmed time zone clears it as well, because the token that holds the selection includes that zone.

## Appearance

The selection is a translucent band with a light top and bottom edge. It is not the Work wash, the Protected hatch, a Block card, or a Commitment card. It does not say available, free, or open. The local range is written out, for example "6:00 PM – 9:00 PM". Clear removes it. A new gesture replaces it.

A short range stays as thin as its clock span. It does not use the fact display floor. The written range remains outside the scrollport.

## DST

Selection keeps the local clock range. It does not fabricate an instant and does not choose which occurrence of a repeated hour is meant. On a spring-forward day, a range that includes a local minute that does not occur is identified with the sentence "Part of this local clock range does not occur." On a fall-back day, a range that includes a repeated local minute is identified with "Part of this local clock range occurs twice." Neither sentence is an alert, and neither blocks the gesture. An ordinary hour on those dates is left unmarked. Before a later tranche can create temporal truth from a selection, that creation must validate the local time. V0-011 does not create anything, so it does not perform that validation as a gate.

## Accessibility

The written range is in the page, including the words "Selected time". Clear is a button named "Clear selected time". The selection band is hidden from assistive technology so it does not cover fact names. Creating a selection is pointer-only in this tranche. There is no second keyboard range control.

## What this tranche refuses

No migration, persisted selection, Timeline fact, Context, kind, purpose, title, Protected Time, Block, Commitment, Task, Task and Block relationship, fact drag, fact resize, all-day selection, cross-day selection, edge auto-scroll, Month, Week, NOW, current-time line, Capacity, availability, free time, conflict, priority, recurring obligations, reminders, Pulse, notifications, Google Calendar, Gemini, OAuth, synchronization, voice, watch app, service worker, AI, or a broad visual redesign.

The next earned question, not answered here, is: "What does this time mean?" Later answers may include protecting the time, choosing what it is for, or adding a Commitment. Allocating a Task into time remains later than that.

## Context

V0-010 made one civil day spatially true and left it read-only. The phone can now point at a portion of that day. The scaffolding is still scaffolding. This tranche does not restyle the canvas.

## Consequences

- `components/daySelection.ts` owns the pure mapping and the gesture rules. `DayCanvas` owns the pointer events.
- The selection is local to the day session. Changing the civil day, opening management, or reloading source truth remounts that session empty.
- `happy-dom` is a test dependency so pointer events can be exercised without a signed-in browser. It is not a runtime dependency.
- DST identification is a reading of the existing zone conversion. The `Date` used to ask the question is not kept.

The tranche record is [../implementation/V0-011.md](../implementation/V0-011.md).

## Later

V0-012 asks "What does this time mean?" after a settled selection. The answer is a transient intended kind: protect the time, choose a purpose, or add a commitment. It is not stored, and it does not create a fact. See [2026-10-03-temporal-meaning-choice.md](2026-10-03-temporal-meaning-choice.md).

V0-012A keeps that gesture and adds minute refinement of the same range. See [2026-10-03-contextual-temporal-handoff.md](2026-10-03-contextual-temporal-handoff.md).
