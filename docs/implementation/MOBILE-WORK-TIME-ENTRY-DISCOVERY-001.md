# MOBILE-WORK-TIME-ENTRY-DISCOVERY-001

Discovery only. No fix. No runtime change. No test change. No migration.

Baseline: `2baf64efb5ec4896f67d1b6a6283c1e486804f9f` on `main`, matching `origin/main`. The working tree was clean at the start.

Labels: **observed**, **repository**, **inference**, **unknown**.

## Observed

On a Samsung Galaxy S26 Ultra, editing a Work shift time in production Work schedule opened Android’s large native analog clock-face time picker. The clock occupies a large part of the phone and requires interaction with the clock face before the time is confirmed.

That interaction is rejected for Orient. The remembered direction is compact: tap a time and type an exact time, or use a simple hour and minute selector, then confirm. This record does not redesign Work schedule.

The same symptom was parked, without investigation, in [TIMED-FACT-CIVIL-DATE-CORRECTION-PHYSICAL-DIAGNOSTIC-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-PHYSICAL-DIAGNOSTIC-001.md) and [TIMED-FACT-CIVIL-DATE-CORRECTION-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-001.md).

## Production path

Production `/` is `app/page.tsx`, which renders `OrientInstrument`.

`Manage Work schedule` lives in `PositionSurface` (`components/orient/Surfaces.tsx`), beside Sign out. It calls `onManageWork`. `OrientView` wires that to `openWork(today)`, which sets the borrowed surface to `{ kind: "work", weekStart: workFiscalWeekContaining(today) }`.

Inspection of a scheduled Work fact shows `Edit the work week`. That button calls `onManageWork(fact.sourceId)`, and `openWork` opens the fiscal week that contains that civil date. It does not navigate to `/schedule`.

The borrowed surface is the existing dialog. `readInstrumentForm` uses `matchMedia("(max-width: 959px)")`. Phone gets `data-borrowed-surface="sheet"`. Desktop gets `data-borrowed-surface="drawer"`. Both mount the same `WorkScheduleOperation`.

`WorkScheduleOperation` loads the Saturday–Friday week through `onLoad` → `loadWorkSchedule`, builds a `WeekDraft` with `weekDraftFromEntries`, and writes only from `persist` → `planWeekSave` → `onSave` → `saveWorkWeek` → `save_work_week`.

Each of the seven dates is a row. `Shift` or `Edit` sets `openWorkOn`. That flag only chooses which date’s fields are shown. It does not call `replaceDay`.

When the row is open, `ShiftFields` renders Start, End, and Shift type. Start and End call `onChange`, which `replaceDay`s that date in the week draft as `state: "scheduled"`. Off and Not entered are separate buttons. Save is the week button at the bottom of the operation, plus Save inside the dirty-week prompt.

## Exact Work start and end mechanism

`ShiftFields` in `components/orient/WorkScheduleOperation.tsx` is the only production control that edits a Work shift time.

```317:331:components/orient/WorkScheduleOperation.tsx
        <input
          aria-label={`Start for ${label}`}
          type="time"
          value={start}
          onChange={(event) => onChange({ ...day, start: localTimeToTwelveHour(event.target.value) })}
        />
      </label>
      <label className="orient-note">
        End
        <input
          aria-label={`End for ${label}`}
          type="time"
          value={end}
          onChange={(event) => onChange({ ...day, end: localTimeToTwelveHour(event.target.value) })}
        />
```

There is no `step`, `min`, `max`, or `inputmode`. `.orient-surface input` in `components/orient/orient.css` sets size, border, background, color, font, and padding. It does not set `appearance`. The user agent keeps its native time widget.

Value chain, all **repository**:

| Stage | Representation |
| --- | --- |
| Stored row | `start_local` / `end_local` as `HH:MM` |
| Week draft | `TwelveHourClock`: hour 1–12 or null, minute 0–59 or null, `AM` or `PM` |
| Input `value` | `twelveHourToLocalTime(...)` → `HH:MM`, or `""` when hour or minute is null |
| `change` | `localTimeToTwelveHour(event.target.value)` back into the draft |
| Visible day line | the same `HH:MM` pair plus Opening, Mid, or Closing |
| Save | `planWeekSave` converts the clock with `twelveHourToLocalTime` and calls `scheduledWorkDay` |

`localTimeToTwelveHour("")` returns the empty clock. `parseLocalTime` accepts `HH:MM` and an optional trailing `:SS`, and keeps the minute. A native time value is therefore a local-clock draft value. An incomplete clock fails later, inside `planWeekSave`, with “A shift needs a start, an end, and Opening, Mid, or Closing.” Nothing is written.

`ShiftFields` has no phone branch and no desktop branch.

## Root cause

**Repository:** the element is `<input type="time">`.

**Repository:** the same symptom was already attributed to that element. [V0-004B.md](V0-004B.md) records that real phone use after V0-004A found “Android's clock-face time picker” fighting repeated shift entry, and removed `<input type="time">` from Work schedule editing.

**Repository:** commit `bb23527` (`WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001`) created `WorkScheduleOperation` with `type="time"` on Start and End. `WorkWeek` was left on `LocalTimeField`. A search of the tree finds `type="time"` only in `WorkScheduleOperation.tsx`.

**Observed:** on the Galaxy S26 Ultra, activating that control presents the large analog clock.

**Inference:** Android’s user agent, for an HTML time input, supplies that clock. Orient does not draw a clock face. The dialog’s confirm is what fires `change`. Cancelling that dialog leaves the input value, and therefore the week draft, unchanged.

No other production time control can open that clock, because no other production time control is `type="time"`.

## Regression scope

The analog picker is platform behavior of one HTML primitive. In this tree that primitive is used only by production Work start and end.

Scope for a later implementation tranche: **Work-schedule-specific**.

Other production time paths do not share the element. Sharing a different time mechanism is not a reason to change them.

## Production time-entry inventory

Reached from `/` unless noted.

| Control | Component | Mechanism | `type="time"` | Native time UI | Custom Orient control | Reach |
| --- | --- | --- | --- | --- | --- | --- |
| Work shift start | `ShiftFields` | `<input type="time">` | yes | yes, the Android analog clock | no | production `/` |
| Work shift end | `ShiftFields` | `<input type="time">` | yes | yes | no | production `/` |
| Work shift type | `ShiftFields` | `<select>` | no | native select, not a clock | no | production `/` |
| Interval start / end while establishing a timed fact | `EstablishmentSurface` | `<input>` with no type, so text | no | text keyboard | no | production `/`, Day, after a time selection |
| Fact start / end while editing timed Protected Time, Block, or Commitment | `FactDetail` | `<input>` with no type, value is stored `HH:MM` | no | text keyboard | no | production `/` inspection |
| Exact Time | `PhoneContinuity`, `DesktopReading` | button `data-exact-time` | no | none | depth of the reading | production `/` |
| Fact date, civil date, planned day, due day | position, fact edit, task edit | `<input type="date">` | no | native date UI | no | production `/` |
| Work start / end on `/schedule` | `WorkWeek` → `LocalTimeField` | three `<select>`s: hour, minute, AM/PM | no | native select UI | `LocalTimeField` | route `/schedule` still mounts `WorkSchedule` |
| Timed Block, Commitment, Protected Time on `/schedule` | `BlocksSection`, `CommitmentsSection`, `ProtectedTimeSection` | `LocalTimeField` | no | native select UI | `LocalTimeField` | `/schedule` only |
| Day-canvas time refinement and fact edit on `/schedule` | `TimeBoundControl` in `DayCanvas` | readable clock plus earlier/later buttons and an AM/PM button | no | none | steppers local to `DayCanvas` | `/schedule` only |
| Prototype fact start / end | `InstrumentView` | untyped text inputs | no | text keyboard | no | `/instrument`, not `/` |

All-day facts on `/` have no Edit control and no start or end fields. Work inspection on `/` has no time fields; it opens the week operation. Capture, tasks, notes, and direction have no clock fields. Task planned and due days are civil dates.

`LocalTimeField` and `TimeBoundControl` are absent from the `/` tree. Tests for Blocks, Commitments, Protected Time, the day canvas, and `mobileInteraction` still require those older surfaces to contain no `type="time"`.

## Historical compact-entry evidence

### Physically motivated, then shipped: hour, minute, and AM/PM selects

**Classification: historical implementation that answered a physical rejection. Still mounted on `/schedule`. Not the production `/` Work control.**

V0-003 (`912cafa`) stored Work with `<input type="time">`. V0-004A kept phone use of that schedule page. V0-004B (`187d3f4`) added `components/LocalTimeField.tsx` and `components/twelveHourTime.ts`, and `WorkWeek` still uses them:

```290:291:components/WorkWeek.tsx
      <LocalTimeField label="Start" value={day.start} onChange={(start) => onChange({ ...day, start })} />
      <LocalTimeField label="End" value={day.end} onChange={(end) => onChange({ ...day, end })} />
```

`LocalTimeField` is a fieldset of three selects. Hour is 1–12, minute is 00–59, and the third select is AM or PM. `commit` refuses a clock `twelveHourToLocalTime` cannot accept. Each change returns a `TwelveHourClock`. The week draft and `planWeekSave` stay the persistence boundary. `components/mobileInteraction.test.tsx` is named “uses direct time fields instead of a clock-face input” and asserts `WorkWeek` has no `type="time"`.

V0-004B describes this as the repair for the Android clock face. The record does not contain a later sentence that a human re-accepted those selects on a phone after they shipped. [V0-013.md](V0-013.md) says the selects remained on Manage schedule after the canvas left them.

### Canvas selects, then steppers

**Classification: historical canvas implementation. The minute wheel was reported as too granular. The steppers were not exercised on the user’s phone in that tranche.**

V0-012A reused the hour, minute, and AM/PM selects for selection refinement. V0-013 records that, on a phone, activating a select opens the native picker immediately, and the minute select has sixty values. The canvas then showed the time as text, with earlier and later buttons for hour and minute, and a button that toggles AM/PM. Those controls do not open a picker or the keyboard. They live in `TimeBoundControl` inside `DayCanvas`, which `/` does not mount.

### Typed exact time on production `/`

**Classification: current production mechanism for timed facts. Accepted on desktop and in Chrome device mode for civil-date correction. A deployed Samsung pass of that correction was still outstanding in that record.**

`EstablishmentSurface` keeps interval start and end as text. `minuteToLocalText` writes `HH:MM`. `applyTimes` publishes a refined selection only when `parseLocalTime` succeeds. Typed text that is not yet a local time stays in the fields.

`FactDetail` edits `startLocal` and `endLocal` as text. Parse happens when that fact’s Save runs. That Save is the fact’s own persistence boundary. It is a different authority from the Work week.

The visible range elsewhere uses `formatLocalTimeLabel`, which is `en-US` 12-hour text. The editable fact fields themselves are 24-hour `HH:MM`.

### Exact Time

**Classification: a reading depth, not a time-entry control.**

The Exact Time button changes depth and may carry a touched minute into the field. It does not edit a stored clock.

### What this evidence does not authorize

Do not copy `DayCanvas` steppers into Work because they exist. Do not point production Work back at `/schedule`. Do not replace fact editing, establishment, or Exact Time in order to fix the Work clock.

## Desktop

**Repository:** Start and End are the same `type="time"` elements on both forms. The form split chooses sheet or drawer only.

**Inference:** a desktop user agent presents its own time widget for that element. Orient has no second clock component that desktop could be showing. Android’s analog dialog is the phone user agent’s presentation of this element. This discovery did not open a desktop browser.

**Repository:** [WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md](WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md) accepts the operation: fiscal week, draft, one Save, mounted reading. It does not record a separate verdict on the desktop time widget. The analog clock was parked later, from the phone.

Replacing `type="time"` on both forms would change the desktop widget that is present during that accepted operation. Keeping it only on the phone form would leave desktop on the user-agent control. Neither choice is recorded as a decision.

The existing split is viewport `matchMedia`, already used for sheet versus drawer. A user-agent string is unnecessary if a later tranche branches at all.

## Work authority invariants

Confirmed in the current operation, the week draft, and the acceptance record. A time-entry change has to leave them in place.

- Work schedule is an operation on the borrowed surface. It is not Present, Day, Week, or Month.
- The editor week is Saturday–Friday, from `workFiscalWeekDates`.
- The draft contains all seven dates.
- One Save is the authority boundary: `planWeekSave` → `saveWorkWeek` → `save_work_week`.
- `openWorkOn` does not persist and does not write a day state.
- Unknown stays unknown until start, end, or shift type changes. The open fields for an unknown or Off date are `blankScheduled()` until that change. Focus alone does not establish Scheduled.
- A meaningful edit writes `scheduled` into the draft only.
- Start, end, and shift type all participate. A scheduled draft missing any of them fails `planWeekSave`, and nothing is written.
- `shiftEndsNextCivilDate` treats end earlier than or equal to start as continuation into the next civil date. That function is domain. `WorkScheduleOperation` does not display the sentence. `WorkWeek` on `/schedule` does, by calling the same function.
- Off, Not entered, and several shifts can sit in one dirty draft.
- Close, Escape, replacing the surface, and Previous or Next fiscal week ask Save, Discard, or Stay before a dirty week is abandoned. Choosing another date inside the week does not.
- A successful Save reloads the week, clears `openWorkOn`, leaves the operation open, and refreshes the mounted reading through `OrientInstrument`’s persist reload. The viewpoint is not an input to `openWork` from Manage Work schedule, and inspection does not retarget the field.

The time control remains draft manipulation. Its `onChange` must not call `onSave`.

## Candidate intervention boundary

Evidence is strong enough to name the boundary. It is not an implementation, and it does not choose the widget.

Change only the Start and End presentation inside `ShiftFields`.

The value contract already in the repository:

```text
current TwelveHourClock
    → human edits a local clock
    → valid TwelveHourClock returned through the existing onChange
    → replaceDay updates the week draft
```

`planWeekSave`, `scheduledWorkDay`, `shiftEndsNextCivilDate`, and `saveWorkWeek` stay the authorities for completeness, overnight continuation, and persistence.

Two existing presentations can satisfy that contract. This discovery does not pick one.

1. `LocalTimeField`. It already takes and returns `TwelveHourClock`, and it is the control V0-004B put in place of the Android clock for Work. On a phone, a `<select>` opens the platform picker. V0-013 recorded the sixty-minute picker as too granular for the canvas, and left the selects on Manage schedule. That wheel is a different native UI from the analog clock.

2. The untyped `HH:MM` text fields already used by `EstablishmentSurface` and `FactDetail`. They match tap-and-type. They speak `HH:MM`, so Work would convert with `localTimeToTwelveHour` only after `parseLocalTime` succeeds. Invalid intermediate text has to stay in the field. Calling `localTimeToTwelveHour` on a partial string throws. Fact Save must not be copied: that Save persists a fact. Work still waits for the week Save.

`TimeBoundControl` is a third, weaker candidate. It avoids native pickers. V0-013 says those steppers were not exercised on the phone, and moving many minutes takes repeated taps.

A phone-only presentation is warranted only if the desktop user-agent time control is intentionally kept. That intention is not written down. One shared presentation is equally consistent with V0-004B, which replaced the clock on the schedule surface for every viewport.

## Accessibility and input requirements to preserve

Taken from the current operation and the draft rules. A new control should stay smaller than the analog clock.

- The fields are named Start and End, with accessible names `Start for ${civil date}` and `End for ${civil date}`.
- The current value is visible as `HH:MM` on the day line once both ends and a shift type exist. While incomplete, the line says Shift.
- The stored and drafted value is a real local clock at minute precision. `TwelveHourClock` is 12-hour internally. The operation’s input value and day line are 24-hour `HH:MM`. Other Orient readings use `formatLocalTimeLabel` (`en-US`, 12-hour). The Android clock follows the phone locale. A replacement has to keep one of these representations and convert through the existing functions.
- Keyboard use on desktop and touch use on the phone both need a way to set the clock. The current phone path’s only touch affordance is the native dialog.
- An incomplete clock is an invalid scheduled draft. The alert is the existing week sentence, on that civil date. The time fields themselves have no separate invalid style.
- Opening the fields does not move focus in the current operation. V0-004A did move focus to the start field on the old page. That older focus move is not current `/` behavior.
- Cancelling the native dialog does not emit `change`, so the draft stays. A replacement that commits on every key or select needs an equivalent way to abandon an unfinished clock without writing Scheduled, or it must keep unfinished text outside the draft until it is valid.
- The native dialog’s Set is a confirmation of the clock into the draft. It is not persistence. Week Save remains the only persistence confirmation. Off, Not entered, and shift type do not have their own Set step.

## Implementation test surface

Do not add these tests in this tranche. The smallest later set:

- Phone-form Work start can be changed without an `input[type="time"]`.
- Phone-form Work end can be changed the same way.
- An exact hour and minute land in the week draft as the existing `TwelveHourClock` / `HH:MM`.
- That edit sets `data-work-state="scheduled"`. Opening Shift without a change leaves `unknown`.
- No `onSaveWorkWeek` call happens before the week Save.
- An end earlier than or equal to the start still saves through the existing overnight rule.
- Abandoning an unfinished clock does not dirty the draft, if the chosen control has a cancel.
- Desktop behavior matches the choice made for desktop.
- The existing work-schedule authority tests in `components/orient/orientView.test.tsx` still pass. `enterShift` / `setField` currently set one element, `aria-label="Start for …"`, through `HTMLInputElement`. A select group or a text field with a different name changes that harness.

`components/weekDraft.test.ts`, `components/twelveHourTime.test.ts`, and `persistence/saveWorkWeek.test.ts` already cover the semantics the control must not reimplement.

## Unresolved

- Which compact control the human wants on the phone: typed `HH:MM`, or hour / minute / AM-PM. Both exist. Neither is the analog clock.
- Whether the desktop user-agent time widget should remain.
- Whether a phone minute `<select>` of sixty values is acceptable for Work. V0-013 rejected that picker for the canvas and did not re-test it on a phone for the schedule.
- Whether the production operation should show “continues after midnight.” The rule already applies at save. The production editor does not say it. `/schedule` does.
- Which Android browser on the Galaxy S26 Ultra drew the clock. Chrome and Samsung Internet both use the platform time dialog for `type="time"`. The element is identified either way.
- This discovery did not physically re-open desktop Work schedule.

## Out of scope

Cross-client coherence, Supabase Realtime, drag and drop, civil-date correction, Week and Month visuals, Present and Day visuals, Work persistence semantics, recurrence, reminders, Task reopen and undo, carry-forward, `/schedule` retirement, Google Calendar, external temporal sources, and AI. No redesign of the other time controls.
