# MOBILE-WORK-TIME-ENTRY-001 — typed Work clock

The production Work start and end fields no longer use `<input type="time">`. The human types `HH:MM`. Week Save is still the only write.

Physically accepted on a Samsung Galaxy S26 Ultra. Candidate `aec0f0ead88f6a2da4892e7f5749fa07d0fd5061`.

Discovery: [MOBILE-WORK-TIME-ENTRY-DISCOVERY-001.md](MOBILE-WORK-TIME-ENTRY-DISCOVERY-001.md).

Baseline: `2baf64efb5ec4896f67d1b6a6283c1e486804f9f` on `main`.

## Regression

On a Samsung Galaxy S26 Ultra, editing a Work shift opened Android’s analog clock. Orient did not draw that clock. Production `/` used `<input type="time">` only on Work start and end, in `ShiftFields`.

V0-004B had already removed that element from the historical schedule editor after the same Android clock-face picker. Commit `bb23527` reintroduced it when `WorkScheduleOperation` was added. `WorkWeek` on `/schedule` stayed on `LocalTimeField`.

## Accepted interaction

Start and end are text fields. The same fields are used on the phone sheet and the desktop drawer. There is no user-agent branch and no viewport branch.

```text
Start
[ 09:00 ]

End
[ 17:30 ]
```

The human taps or clicks the field and types a 24-hour local clock: `07:00`, `09:30`, `13:15`, `17:45`, `23:00`. There is no analog face, native time picker, hour/minute wheel, AM/PM select, or stepper.

`LocalTimeField` was not reused. It is three selects. On a phone those selects open a platform picker, and V0-013 already found the sixty-minute wheel too granular. This correction is typed text.

`DayCanvas` `TimeBoundControl` was not reused. Those steppers live on `/schedule`, were not exercised on the phone in V0-013, and are a different interaction from typing a clock.

Production fact establishment and fact edit already type `HH:MM`. They were not reused as the control. Establishment publishes a selection on each successful parse. Fact edit keeps text until that fact’s own Save, which persists. Work must keep unfinished text out of the week draft and must not gain a per-field Save. The new field follows that `HH:MM` language and uses the confirmation rules below.

## Boundary

`canonicalLocalClock` answers one question: is this text `HH:MM` from 00:00 through 23:59? Surrounding spaces are removed. Unpadded hours, seconds, and impossible hours or minutes are not a clock.

`LocalClockField` holds the text while the field is being edited. It calls `onCommit` with a canonical `HH:MM` only. It does not know Scheduled, Off, unknown, overnight continuation, or Save.

`ShiftFields` still converts with `localTimeToTwelveHour` and `twelveHourToLocalTime`. The week draft remains `TwelveHourClock`. No clock type was migrated.

## Editing

Typing is provisional. The week draft does not change on each key.

Enter commits when the text is a canonical clock. Enter on invalid or incomplete text leaves that text in the field and does not change the draft.

Blur commits a canonical clock, including after trimming. Blur of invalid or incomplete text puts the previous established value back. An empty established clock stays empty. Nothing in the field invents `00:00`.

Escape, while the text differs from the established value, restores that value and does not continue to the operation’s leave prompt. Escape on an unchanged field still reaches that prompt.

There is no modal Set. Opening Shift or Edit still only sets `openWorkOn`. A committed start or end still writes `scheduled` into the week draft through the existing `onChange`.

## Persistence and overnight

A committed clock is draft state. `onSave` runs from the week Save button: `planWeekSave` → `saveWorkWeek` → `save_work_week`.

`end <= start` still continues into the next civil date inside `shiftEndsNextCivilDate` and `scheduledWorkDay`. The field does not interpret that. The editor still does not say “continues after midnight.”

## Accessibility

The accessible names stay `Start for <civil date>` and `End for <civil date>`. The visible labels stay Start and End.

The input is `type="text"`. `inputMode="text"` keeps a keyboard that can type the colon. A numeric pad was not used, because many of those pads have no colon, and the value is a clock string rather than a bare number. `pattern` describes `HH:MM`. `autoComplete`, `autoCorrect`, and `autoCapitalize` are off. `spellCheck` is off. `enterKeyHint` is `done`.

Focus uses the existing `.orient-surface :focus-visible` outline. An established time is the input’s value, not a placeholder. A missing time is an empty field beside Start or End.

## Tests

`components/orient/workTimeEntry.test.tsx` covers the absence of `type="time"`, one field for both forms, provisional typing, Enter, blur, invalid hour, invalid minute, incomplete text, Escape, Scheduled only after a real edit, no save on confirmation, and an overnight week write through the existing plan.

`components/orient/orientView.test.tsx` confirms a typed clock with Enter so the existing week-authority cases still drive the draft.

## What did not change

Timed Block, Commitment, and Protected Time entry. Exact Time. Date inputs. `/schedule`. `/instrument`. Work fiscal-week rules. Work persistence. Cross-client coherence. Drag and drop. Civil-date correction. Present, Day, Week, and Month readings.

## Acceptance

Physically accepted.

The human exercised candidate `aec0f0ead88f6a2da4892e7f5749fa07d0fd5061` on a Samsung Galaxy S26 Ultra. Work Start and End did not open the Android analog clock-face picker. The typed `HH:MM` interaction was used, and the human found it substantially better. 24-hour entry was explicitly accepted. An AM/PM input is not required. No further interaction adjustment was requested.

The same fields are what the laptop shows. This pass did not include a separate laptop observation.
