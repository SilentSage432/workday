# PRODUCTION-EXPERIENCE-DESIGN-001 — The production form of Orient

Date: 2026-10-05.

Baseline: `713c5f73763d92ab1878f51b371a5e22ff41406c`.

This record specifies the production experience. It does not implement it. It does not amend domain semantics, the encounter model, or the production-experience gate. Low-fidelity spatial prototyping stays closed. `/instrument` is evidence, not the specification.

## Decision

Accepted.

Orient is one temporal instrument. The human moves a field of time and asks that field a question. Present, Day, Week, and Month are those questions. They are not destinations.

Time occupies the territory. The Active Thread persists in reach. Controls stay in reach and expand only while in use. Detail waits in inspection.

## Production experience

The signed-in human meets one field. There is no application header, no Earlier/Later pair, no Tasks destination, and no Schedule destination. The field is the navigator. A reach bezel names the question, the place in time, the thread, the lens, and Capture. Asking a different question transforms that same field.

## Phone

Primary device: Samsung Galaxy S26 Ultra, portrait, in the mobile browser and as an installed web app. The viewport is `100dvh`, including the area around the browser chrome. Safe-area insets pad the field away from the status bar and pad the bezel away from the home indicator. The composition does not assume a hidden browser bar.

The temporal field fills the viewport above a resting bezel. The bezel is two lines: the thread, then one row of question, position, focus, and Capture. It is content-sized. It is not a navigation bar and not a reserved fraction of the screen.

The field does not sit under a title. Hours, day boundaries, and established truth are the top of the instrument.

Opening a transient surface does not change the field's scroll position. The surface opens over the field from the bezel. A strip of the field, including the position it had, stays visible above the surface. Closing the surface shows that same place.

The frequent acts sit in the bezel because the primary phone is large and one-handed use reaches the lower screen. This placement is a production decision about reach. It does not adopt the prototype's strip, its disclosures, or its header.

Landscape on the phone keeps this composition unless the viewport is wide enough for the desktop dock. The portrait instrument is the acceptance target.

## Desktop

A wide viewport is the same instrument with more of the field visible. It is not a stretched phone and not a centered narrow column.

The field takes the remaining width and the full height. A trailing dock, wide enough for the thread, the question, the position, focus, Capture, and the open transient surface, sits beside the field. The dock is the bezel's wide form. It does not overlay the field. Extra width widens the field. It does not add cards, totals, or a second product.

At Month, Direction is a leading column beside the landscape and before the dock. At Present, Day, and Week that column is absent and the field uses the width.

Pointer drag selects time on Day. The wheel or trackpad scrolls. Touch on a desktop screen uses the phone gesture grammar. The actions match the phone. The layout does not.

The breakpoint is the width at which the dock fits and the field still reads as territory. The exact pixel is tunable during implementation. Below it, the phone composition is used.

## Moving through time

The field moves. The bezel names where it is. There is no header control for Earlier or Later.

One anchor civil date is the date the human is oriented to. The bezel's position word names that place: the civil date on Present and Day, or the explicit date range on Week and Month. The word is a label of the field. Activating it opens precise relocation. It is not painted as a pair of arrows at rest.

Direct movement:

- Present and Day scroll vertically through the local clock. The scroll continues across midnight into the adjacent civil day. Crossing a day boundary moves the anchor. The new date is written once, in the clock margin, at that boundary.
- Week scrolls horizontally. The window slides by one civil day.
- Month scrolls horizontally. The window slides by one civil day. Direction does not scroll with the landscape, because Direction has no dates.

Precise relocation, only while the position word is open:

- previous and next civil day
- an exact civil date
- Today, which sets the anchor to today and does not by itself change the question

Closing it returns the bezel to rest. The field's new place remains.

If Now is outside the visible window, one locative control appears on the field edge toward Now. It says Now. Activating it brings Now into view without changing the question. On Week or Month it slides the window until today is inside it. When Now is already visible, the control is absent.

Gesture is not the only path. The position word, its date field, Today, and the Now control are explicit controls. Dragging the field is the direct path.

Nothing about movement establishes truth. A scroll is not a selection.

## Resolution

The bezel shows one word: Present, Day, Week, or Month. That word is how the current question is perceived. Activating it lists the four questions over the field. The field stays in place behind the list. Choosing one transforms the field and closes the list. Keyboard and assistive technology reach the same list.

The anchor civil date is kept, except that asking Present sets the anchor to today.

Each question remembers its own scroll. Returning to a question restores that scroll and that anchor. Asking Present is the exception: it also brings Now into the upper portion of the field, clear of the bezel. The field does not keep chasing Now afterward. Now's mark moves with the clock. The human's place stays until they move it or ask again.

What changes is the question, the admitted material, and the interaction authority. The underlying facts do not change. The transition is not a zoom. Pinch does not change resolution.

| Question | Field | Authority | What recedes | What becomes perceptible |
| --- | --- | --- | --- | --- |
| Present | The Day clock, anchored to today, Now in view | Reference and inspection. Not establishment | The meaning chooser and Save | Truths that contain Now, and the thread already in the bezel |
| Day | The exact local clock for the anchor | Reference, refinement, establishment, edit, delete | Direction | Minute bounds, Capacity remainder inside a real Work boundary, all-day truth outside the clock |
| Week | Seven civil dates as one shape | Perception and fact reference. Not minute selection and not establishment | Purpose text, Capacity remainder, establishment | Kind, bounds, co-occupation, and bare days across the window |
| Month | Twenty-eight civil dates as a landscape, with Direction beside it | Perception and inspection. Not time manipulation and not establishment | Minute precision and Capacity | Broader structure, and retained Direction off the clock |

Asking Day from a Week or Month day opens Day on that civil date. That is a change of question, not an editor inside the shape.

Hold-then-drag selects minutes only on Day. On Present, the same gesture names a transient interval for reference and does not offer a meaning or Save. On Week and Month, movement pans the window.

## Windows, not new boundaries

Week is asked over seven consecutive civil dates beginning at the anchor. Month is asked over twenty-eight consecutive civil dates beginning at the anchor. Both ranges are explicit and are labeled with their actual dates.

These windows are the question being asked. They are not a canonized Monday week, not Work's Saturday–Friday fiscal week, not a Gregorian month, and not four Weeks gathered as the definition of Month. Work's fiscal week remains a Work fact. This record does not amend the Week or Month contracts' refusal of a universal boundary. Sliding the window asks a neighboring range.

## Present and the Active Thread

Present answers where the human is in established temporal reality. The Active Thread answers which intention was explicitly retained. They stay independent. They may agree or disagree. Disagreement is ordinary. Neither ranks the other.

Present is the Day clock under present authority. It is not a dashboard, a list of what matters, or a next action. Truths that contain Now stay in their places. The Now mark passes through them and does not elect one.

The thread is the first line of the bezel.

- An open retained Task reads `Resume:` and the Task title, at ordinary weight.
- No thread reads `No thread is established.` Absence stays visible and is quieter than a retained thread.
- A failed thread read stays at ordinary weight and says the thread could not be read. It does not imitate absence.
- A retained Task that is no longer open says the thread is recorded and the Task is not open.

Activating the thread inspects that Task. Inspection can complete it or edit its established fields through the existing Task actions. It can also open the open-task collection. That collection is transient inspection, not a destination. It is not painted at rest. Today, `planned_on`, Due, and Must Do may appear on a Task there. They do not appear on the temporal field. Must Do on a Task is the human's attention flag. It is not Priority and not a temporal claim.

The thread is not a recommendation and not Coming Next.

## Context focus

The bezel reads `Focus: Everything` or `Focus:` and the Context name. Activating it lists Everything and the loaded Contexts. Choosing one collapses the list. The choice is transient interface state. It is not stored. It is not a current Context. It does not switch a workspace.

Work, Family, TeamLab, and Financial are seeds, not a closed list. The list is the Contexts the read actually returned.

Focus changes emphasis in place.

- A Context-bearing fact in focus keeps ordinary material.
- A Context-bearing fact outside the focus stays on its minutes, quiets in place, and remains referable. Quiet is lower contrast, a dotted contour, and the word quiet in its accessible name. It does not disappear.
- A Block with no Context stays ordinary.
- Protected Time and a Commitment stay ordinary. They are not assigned a Context by the lens.
- A Work shift stays ordinary when the focus is Work and quiets otherwise. Work Off is a Work fact and follows that emphasis. The lens does not invent Off.
- The thread, Notes, and Direction are not temporal paint and are not removed by the lens.

Everything lifts the quieting. Failed Context reads say the focus could not be read and do not pretend the lens is Everything.

## Capture and Notes

Capture is a word in the bezel. It is always one action away. At rest it has no panel.

Invoking it opens the transient surface. The field's scroll stays. The surface offers the two existing acts and the memory of Notes.

Quick Capture: a title and Save establish one Task. The act does not infer time, Context, Due, Must Do, or the Active Thread.

General Capture: an expression, then one explicit act, establishes one Note, one Task, or nothing. The phone keyboard's dictation may fill the expression. Orient does not add a microphone.

Notes are retained experience inside that surface. A Note is not placed on the clock because of when it was captured. Selecting a Note refers to it. A separate explicit act may establish a Task that cites it. The Note remains. This record does not add Note edit, delete, or archive.

Closing Capture returns the resting bezel and the same temporal place.

When the keyboard is open, the surface sits above it using the visual viewport. The field is not scrolled to chase the keyboard. The position word remains available. Dismissing the keyboard leaves the surface as the human left it until they close Capture.

## Reference, establishment, inspection

Short tap on established paint refers to every fact whose territory contains that point. There is no topmost winner.

Hold, then drag, on Day refers to time, including through paint. Movement before the hold settles scrolls. A pointer drag on Day selects. The wheel scrolls. The existing selection thresholds are reused. This record does not canonize new millisecond or pixel constants.

A temporal selection is transient. It is not a fact and not an availability claim. While it is open, either bound can be dragged on the field. Exact start and end can be edited as local times. Those fields can hold precision finer than the gesture. Snapping the gesture to fifteen minutes is a convenience. It is not the stored ontology. At rest, established facts do not wear handles.

On Day the sequence is: refer to time, refine the bounds, choose Protected Time or a Block or a Commitment, provide what that meaning requires, and Save. Work is not a meaning for an arbitrary span. A Task is not a meaning. A Block may cite one open Task. The purpose is the human's words. The Task title is not copied into the purpose.

Save is the sentence that the draft is now true. It is explicit, in the transient surface, and unavailable until the meaning is complete. Cancel, Close, or leaving the draft writes nothing. The field does not auto-save.

A short tap opens inspection in the transient surface: kind, the human's words, the exact interval, Context when the fact has one, and a Task citation when the Block has one. Edit makes a draft of that fact. Save writes the draft. Delete asks for an explicit confirmation, then removes the fact. The territory remains. Undo stays unresolved and has no control.

Present can inspect and can name a referred interval. It cannot Save a new temporal fact. Week and Month can inspect a fact and can ask Day. They cannot select minutes or Save temporal truth.

## Temporal field

The field is a flat ground and a local clock. Temporal position maps to clock position. Kind is told by contour, a short word when the space holds it, and hue. Hue is never the only signal.

Day and Present paint, for a fact, the kind word and quiet when the lens applies. Purpose, title, and the full interval stay in the accessible name and in inspection. They are not repeated inside the mark when the clock already places it.

All-day truth sits in a band outside the timed clock, on that civil day. It does not cover the hours. The band shows the kind. Inspection holds the rest.

The Now mark is a hairline through whatever occupies that instant, horizontal on the Day clock and vertical on a Week or Month day. The word Now is in the accessible name. The containing facts are not enlarged.

A selection is an outline on the ground. It does not use a fact's hue.

Work is a shift on the clock, not a coat of paint over the whole day. Work Off, when that read is complete, is the word Off in that day's margin. Off is not free and not a filled day. A missing Work schedule is incomplete evidence, not Off and not an empty life.

## Co-occupation

Facts that share minutes each occupy the full width of those minutes. They are stacked as translucent layers, not packed into lanes. Lane packing would imply exclusivity. Overlap is not conflict, not a winner, and not a double-booking error.

The layers stay coextensive. Their words do not. Kind words are stacked so each remains readable. On Week and Month the words yield first: contour and hue carry kind, and inspection carries the words when the cell cannot hold them. The accessible name still names every fact.

A short tap on shared territory lists every fact there. Choosing one inspects it. The others stay listed. Hold-then-drag on Day still reaches the time underneath.

Week and Month use the same coextensive layers inside each day. They do not invent a second overlap model. At Month distance the layers may be too small for words. They remain individually present in inspection and in the accessible name.

## Typed silence

Four conditions stay distinct. Color is not the distinction.

| Condition | Field | Words |
| --- | --- | --- |
| Nothing established | Bare ground and clock marks. No fill. | No availability word. Inspection does not call it free. |
| Unavailable for allocation | The Protected Time fact itself. | Kind: Protected. Protected does not mean occupied. |
| Allocatable remainder | A hatch inside a valid Work Capacity boundary, only on Present and Day, only where the reading is complete and the shift is uncovered by a utilizing fact. | One gloss for the whole field: hatched time inside the shift is allocatable remainder. The words are not repeated in every band. The hatch is not used outside the boundary. |
| Incomplete evidence | The affected reading is withheld. | The surface says what could not be read. |

Bare ground and hatched remainder must remain distinguishable. Neither is called free. Week and Month do not paint the hatch and do not show a Capacity total. Work Off is the margin word Off, not hatch and not bare-as-available.

## Week

Week is one horizontal shape: seven dated columns, time running vertically inside each column, kind and overlap intact, bare days bare. It is not seven Day editors, not a density map, and not a count of events.

A short tap refers to the facts in that territory. Asking Day from a column opens that civil date. No workload, utilization, or availability is added.

## Month and Direction

Month is the landscape of the twenty-eight-date window plus a Direction plane beside it. Beside means adjacent. On the phone the plane is stacked under the landscape and scrolls inside itself. On the desktop it is the leading column. It is not a header, not a score, and not a track aligned to dates. No line connects a name to a day.

The landscape keeps kind and co-occupation and drops minute editing. Nothing established stays bare.

Direction shows retained names only.

- A Destination is a name. It has no date, bar, count, or brightness.
- A Priority is a name downstream of the Destination in the retained pair. It is not ranked against other Priorities.
- Inspecting a Priority may list a Task or a Block explicitly in service of it, when that read is complete. The list is the relationship. It is not progress. Coexistence on the landscape is not that relationship.
- A withdrawn relationship is absent.
- A Task or a Block with no such relationship stays ordinary.

Month does not establish a Destination, a Priority, or a directional relationship. Those acts stay with their own establishment paths. This record adds no control that would pretend otherwise.

If a directional read is incomplete or the storage is not available, the plane says the direction could not be read. It does not show an empty life and it does not show an add button. A complete empty read says no direction is established. That sentence is not an invitation control.

## Visual language

One instrument, one type family: the system interface face. No display face and no imported brand font. Temporal numerals are tabular. Kind labels are the same face, smaller. Inspection and Direction use the same face at reading size. Hierarchy comes from role and position. Exact sizes are tunable. Density stays high enough that the clock, not the type, dominates.

Color identifies kind and state. It does not identify importance, Priority rank, urgency, success, failure, or progress. The kinds that earn a persistent hue are Work, Protected Time, a Block, a Commitment, a transient selection, and the Now line. Contexts do not receive time-colors. Focus is emphasis, not a palette. Exact hue values are tunable. Each pair of kinds must remain distinguishable without hue, by contour:

- Work: solid
- Protected Time: dashed
- Block: double
- Commitment: dotted
- Selection: outline only
- Quiet under a lens: the kind's contour, dotted again, and lowered contrast
- Remainder hatch: a neutral hatch, not a kind hue

The first production surface is light. A dark scheme may follow the same rules later. It is not required to implement the instrument. Text and essential contours meet ordinary contrast expectations on the ground and on the translucent layers.

Material is flat. Established facts are translucent so shared minutes remain jointly visible. The exact opacity is tunable within the range where one layer is legible and two overlapping layers both remain perceptible. Translucency is earned by co-occupation. Blur, glass, gradient, and shadow are not used. Depth from stacking means coexistence. It does not mean rank, importance, or a Direction relationship.

Weight distinguishes a field condition from a bounded fact, and a retained thread from the absence of one. Longer duration is already larger on the clock. It is not more important. A Commitment does not outweigh a Block.

Past truth stays in place at slightly lower contrast. It remains legible and referable. It is not failure. Future truth uses the same material as the present day. Bare future is not available. The Now line is the only locative accent. It has no authority and no pulse.

## Motion

Motion reports a real change. There is no ambient movement, shimmer, decorative pulse, or coming-next animation.

| Change | Motion | Reduced motion |
| --- | --- | --- |
| Now advances | The hairline moves to the new instant. The field does not follow. | The hairline updates in place. |
| The human moves the field | The field tracks the gesture. | Instant position change if the platform already suppresses motion. |
| Question changes | Admitted material changes in place. The anchor stays, except Present. The motion must not look like a zoom. | Instant replacement. |
| A selection or a bound moves | The outline tracks the hand or the edited time. | Instant update. |
| Save | The outline becomes the durable kind layer. | Instant replacement. |
| Delete | The layer leaves. The ground remains. | Instant removal. |
| Focus changes | Emphasis shifts on the same facts. | Instant emphasis. |
| Capture, inspection, relocation, or the question list opens or closes | The surface appears or leaves. The field does not scroll. | Instant appearance or removal. |
| Return to Now | The field moves until Now is in view. | Instant jump. |

## Identity

Orient's identity is a reference through layered time: one locative line, several truths, no referee. The production UI and any later mark should belong to that idea.

This record does not draw a logo. It rejects a clock badge, a calendar glyph, a checkmark, a lightning bolt, an AI sparkle, and an assistant figure as the identity.

## Accessibility

The bezel controls and the transient actions have a touch target at least as large as a common finger target. Exact pixels are tunable above that floor.

Kind, quiet, remainder, selection, Off, and incomplete evidence are each distinguishable without color.

The accessible name of a temporal fact includes its kind, its human words, its interval, and quiet when the lens applies, even when the painted mark shows only the kind. Now's accessible name includes Now. Hatched remainder describes allocatable remainder inside the shift. Shared territory announces every fact.

Reading order begins with the thread, the question, and the position, then the field, then an open transient surface. The visual bezel may sit at the bottom. Recovery of intention does not depend on reaching the end of the clock.

The question list, position controls, focus list, Capture, inspection, and establishment are keyboard operable. Focus is visible. Exact times can be typed. Delete confirmation is a control, not a gesture. Reduced motion follows the table above. Overlap inspection is a list, not a z-order contest.

An open keyboard does not move the temporal place. Transient surfaces are labeled as transient. Closing them returns focus to the control that opened them.

## Incomplete evidence

A failed or incomplete read is not an empty life.

- The field withholds a temporal reading it cannot complete and names the failed read.
- A complete empty temporal reading is bare ground.
- Direction incomplete stays an incomplete plane.
- Direction complete and empty says no direction is established.
- A failed thread read is not the quiet absence sentence.
- A failed Context read does not become Everything.
- A failed Save leaves the draft in the surface and says the write did not happen.
- Sign-in remains the existing gate.

Ordinary epistemic boundaries use a plain statement. Alarming chrome is reserved for a write that failed or a session that is absent, where the human must act. A withheld reading is not an error costume.

## Familiarity, rejection, and original grammar

Reuse, because they lower cost: a vertical local clock, direct dragging, short tap, an explicit Save, a date field, confirmation before delete, the system keyboard and its dictation, and a transient surface that closes.

Reject, because they carry the wrong meaning: a dashboard, a task-manager home, peer Tasks and Schedule destinations, bottom navigation as identity, a calendar of editable events, lane packing, free/busy, a workspace switcher, an OKR board, progress bars, heatmaps, Coming Next, pinch-as-zoom, a standing header of arrows, glass as a style, and an AI frame.

Original to Orient: one field transformed by a question; movement by moving the field; a reach bezel that does not own the territory; coextensive layers with separated words; typed silence; Now as a line through truths; a thread that may disagree with Now; Direction beside the landscape rather than on it.

## Implementation map

PRODUCTION-UI-001 builds this instrument as the signed-in experience. This record does not build it and does not delete the scaffold.

Replace when that experience is accepted: the Tasks and Schedule split, the bottom bar, the narrow centered column, management panels as the primary composition, and `/instrument` as a place the human must open. Until acceptance, those stay.

Retain from the scaffold and the prototypes as behavior, not as components: direct selection through paint, short-tap reference to every fact at a point, explicit Save, transient Context focus, scroll stability when a control opens, typed silence, co-occupation, Present as location plus an independent thread, Week as shape, and Month as landscape beside Direction.

`components/prototype/` is disposable. Do not promote it by restyling it. The production surface is a new composition over existing domain, projection, and persistence functions.

Likely surface boundary: one signed-in instrument view and its transient surfaces. Presentation renders. It does not recompute battle facts, Capacity, Week shape, or Month. Those stay in the projections that already own them.

Leave untouched: domain meaning, schema, migrations, row-level security, and the existing create, update, and delete functions. UI-only state, not stored: the question, the anchor, each question's scroll, focus, an open selection draft, the inspection target, whether Capture or relocation or the question list is open.

Implement immediately against current runtime:

- Present and Day from the day composition, including overlap and the present instant
- Week shape for an explicit seven-date range
- Month's temporal landscape for an explicit twenty-eight-date range
- Work Capacity remainder only where that reading is complete
- Protected Time, Block, and Commitment establishment, edit, and delete
- A Block's optional Task citation
- Quick Capture, general Capture, Note revisit, and Task provenance
- The Active Thread and Resume
- Open-task inspection, Task edit, and completion
- The existing Work-week editor, reached from inspection of Work, not from a Schedule tab
- Context focus from the loaded Contexts
- Sign out, inside the relocation surface, not at rest

Treat honestly as absent, with no control:

- Establishing a Destination, a Priority, or an execution relationship from Month. Perceive them only from a complete read. Incomplete storage stays an incomplete plane.
- Recurrence and occurrences
- Pulse and notifications
- Google Calendar and any other external temporal source
- Note edit, delete, and archive
- Undo
- A universal Capacity boundary outside Work
- Drag-and-drop of Tasks onto time. Giving time to a Task remains the Block path already specified.

Design accommodates later adjacency for those future truths. The first UI does not draw them.

## Decisions closed by this record

Phone composition, desktop composition, field movement, precise relocation, resolution change, Present, the Active Thread's place, Context focus, Capture, establishment, inspection, overlap, typed silence, Week, Month, Direction's adjacency, the visual rules above, and the reach bezel.

## Tunable during implementation

Exact spacing, type sizes, easing, opacity, hue values, contour thickness, the desktop breakpoint, the phone Direction plane's height, and microcopy that preserves the sentences specified here. Window lengths of seven and twenty-eight are decisions, not tuning. Replacing them with a Monday week or a Gregorian month would reopen this record.

## Not authorized

No UI, CSS, component, route, asset, domain change, projection change, persistence change, schema, migration, test, or dependency follows from this record. Operational adoption remains open.
