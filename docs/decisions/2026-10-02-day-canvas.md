# Day temporal canvas

Date: 2026-10-02.

## Decision

Time is the canvas.

V0-010 renders one selected civil day on `/schedule` from `projectTimeline`. The day is the first visual resolution because that is where begin, end, duration, overlap, all-day truth, and an overnight tail become concrete.

The canvas is read-only. It does not select time, drag, resize, or write. Month, week, and NOW are not built. There is no current-time line.

Timeline composes temporal truth. It does not resolve temporal truth.

Nothing established is not the same as available.

No migration, table, or persisted canvas state is added. The selected day is local UI state.

## Day

The caller asks Timeline for the half-open civil range `[D, D + 1)`. The next date is the next civil date. It is not `D` plus 24 elapsed hours.

Timed truth continues at most into the next civil date, so the caller must include the previous civil day's timed rows. `dayCanvasWorkQuery` loads Work schedule rows from that previous date through `D`, inclusive. Protected Time, Blocks, and Commitments are loaded whole by their existing loaders, which include that previous day. The canvas does not prefilter those rows to `D` before `projectTimeline`. Timeline still decides which facts meet the day.

A confirmed IANA time zone is required. The canvas reuses the Schedule confirmation control. It does not read the browser zone, and it does not add a settings surface. Without a confirmed zone, the day is not positioned.

## Geometry

Visual position uses the local clock of the Timeline `intersection`, mapped onto 24 equal clock-hour rows from midnight to the next midnight. Those rows scroll inside the day, starting at midnight. The scroll does not jump to a working-hour range. Height follows that visible duration. Source bounds stay on the label. A clipped overnight fact keeps the source date and the source local times.

All-day facts stay in a separate region. They are not drawn as 00:00–24:00 cards.

If a timed fact's intersection is unresolved, or the visible minutes cannot be read, the fact stays in an "Unresolved time" region with its stored local text. It is not given a guessed hour. That region is uncertainty, not an error.

The axis is local clock labels. It does not scale a fact by elapsed milliseconds. On a spring-forward day, a resolved 1:00–3:00 span occupies two clock hours even though elapsed time is one hour. The missing local hour is not invented as a fact. On a fall-back day, the repeated hour is not drawn twice. Placement uses the existing first round-trip. A civil day whose two midnights are not 24 elapsed hours apart says so. If those midnights cannot be resolved, the timed axis is not drawn.

Empty clock space is unlabeled. It is not free, available, open, or capacity.

## Overlap and treatment

Overlap is not a conflict. Facts are not merged, and no kind outranks another.

Work and Protected Time are provisional context layers, full width, painted so a hatch can remain visible over a wash. Blocks and Commitments are provisional foreground facts. Overlapping foreground facts share width by a deterministic lane packing: the lowest lane whose interval has already ended, with a shared boundary left unoccupied. Equal starts break the tie by source id. That order is stability, not importance. Lane count belongs to the overlap cluster.

These treatments are visual and revisable. They are not domain priority. A short fact may use a minimum display height. `data-minutes` remains the true duration.

Work may later feel more like background context than a foreground card. Protected Time may later feel more like an underlying region than a card. V0-010 does not settle that.

## What this tranche refuses

No time selection, click-to-create, drag, resize, Task input, Task and Block association, capacity, availability, free-gap calculation, conflict, priority, NOW, current-time line, month view, week view, calendar library, or canvas persistence.

The mature day surface should eventually let the user manipulate time and establish what that time means: select or drag a range, establish Protected Time, a Block, or a Commitment, inspect or edit existing truth, move or resize a deliberate allocation, and drag a Task into time, possibly with a Task and Block relationship. That is direction. It is not implemented here.

## Context

V0-009 composed the four facts and left the day-shaped screen unbuilt. Schedule was still four management sections. The phone needs to see the geometry before manipulation is worth designing.

## Consequences

- `/schedule` leads with the day canvas. Tasks and Schedule remain the only bottom-navigation destinations.
- Work week editing, Protected Time, Blocks, Commitments, and time-zone confirmation stay on the page, behind "Manage schedule", and keep their behavior.
- `projections/dayCanvas.ts` derives geometry from Timeline facts. It does not compose a second meaning.
- The first usage can now show whether Work and Protected Time should stay layered behind Blocks and Commitments.

The tranche record is [../implementation/V0-010.md](../implementation/V0-010.md).

## Later

V0-011 adds a transient local-clock selection on this canvas. The canvas still does not create or edit temporal facts. See [2026-10-02-direct-time-selection.md](2026-10-02-direct-time-selection.md).

V0-012 records a transient intended meaning for that selection. It still does not create a fact. See [2026-10-03-temporal-meaning-choice.md](2026-10-03-temporal-meaning-choice.md).

V0-012A places that handoff on the canvas and lets the same selection be refined. See [2026-10-03-contextual-temporal-handoff.md](2026-10-03-contextual-temporal-handoff.md).
