# NOTE-REVISIT-001 — Return to retained experience

Date: 2026-10-04.

Baseline: `dfe3a6db364419a1b65b92e8e6d360e32ed30039`.

## What this proves

[../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) is unchanged. This tranche is the smallest scaffold proof that Capture has memory.

An explicitly established Note can be revisited from the existing General Capture surface. The proof is not a Notes application. It is not the production Capture experience, and it does not start EXPERIENCE-001.

## Interaction

General Capture stays on Tasks, below Quick Capture. It still opens with "Hold an experience." It still closes on Leave or a successful Note or Task. Schedule does not show it. Primary navigation stays Tasks and Schedule.

Inside the open surface, "Retained experiences" is the explicit return. Those words are scaffold copy. They are not final experience language.

That control calls `loadNotes` for the signed-in user. The list renders the returned array in that order. The component does not sort it. Each retained Note shows `content` and `capturedAt`. The instant is the canonical value. It is not rewritten into a civil day, a plan, or a due date. No other Note field is shown.

A readable list is the revisit. This tranche does not keep a selected Note. The contract allows selection to mean reference only. The list does not need that state, so none was added. Nothing on a retained Note writes, edits, deletes, archives, or establishes another fact.

A successful Note or Task, and Leave, discard a visible or in-flight read. The next return is another complete `loadNotes` call. A Note kept through Capture appears on that later read because persistence returned it. The surface does not insert the Note into the list ahead of that read.

## Complete read

`loadNotes` is unchanged. Its order remains `captured_at` ascending, then `id` ascending.

A complete empty array says "No notes have been retained."

A thrown read shows the failure. It does not say that no Notes have been retained, and it does not render a collection. A short page, a missing count, a changed count, or a later-page failure stays a failed read.

## Unchanged

Expression, "Keep as a note," "This is a task," Leave, and Quick Capture keep their existing behavior. Note identity and `capturedAt` are still supplied by the establishment act. A failed Note write still retries the same authorization. No Note edit, delete, or archive. No `note_id`. No Task, temporal fact, Context, Priority, or Active Thread is established from a Note.

## Experience evidence

These observations are for the later production experience. They are not failures of the revisit contract. This record does not choose a presentation or an interaction mechanism.

### Human presentation of capturedAt

The scaffold shows the canonical instant directly. On the phone that string was `2026-10-05T01:42:07.693Z`. That string is truthful canonical data. The same observation shows that the machine representation is not an appropriate final human-facing expression of when the experience was retained.

Canonical temporal truth is not the final human presentation of that truth.

`capturedAt` stays the instant the experience was retained. This record does not change that meaning. It does not decide the final presentation. It does not introduce relative time, a civil day, locale formatting, or timezone ownership.

### Spatial continuity

Opening Retained experiences expands General Capture downward. As the collection grows, content beneath Capture moves, including This time, Work, Today, and the task content below the Capture surface.

That displacement reinforces the earlier observation in [VOICE-PROBE-001A.md](VOICE-PROBE-001A.md): interaction should preserve spatial continuity. Revealing retained experience should not unnecessarily force the human to relocate within the surrounding temporal experience.

This record does not redesign Capture. It does not choose a drawer, a sheet, a modal, an overlay, or a navigation destination.

## Tests

`components/generalCapture.test.tsx` covers the route through open Capture, a complete collection in returned order, content and `capturedAt` without added meaning, a truthful empty read, a failed read that is not emptiness, a revisit that does not write, and a newly retained Note on the next complete read. Existing Note, Task, Leave, and failed-write tests stay.

`domain/generalCapture.test.ts` still keeps Quick Capture, Schedule, and primary navigation off this return, and keeps speech, `note_id`, update, delete, archive, and sorting out of the surface.

## Exclusions

No Notes route, Notes navigation item, folders, notebooks, tags, search, filter, sort control, pin, status, title, Context, reminder, edit, delete, archive, provenance act, or `note_id`. No schema, migration, or dependency.

## NOTE-REVISIT-001A — Primary-device acceptance

Date: 2026-10-04.

Baseline: `6844e1080234348f9e3e9f6292930c0cacee45ec`.

The deployed scaffold was exercised on the Samsung Galaxy S26 Ultra. No application code was changed for this record.

Observed:

1. General Capture exposed Retained experiences.
2. Opening it returned previously established Notes that had been stored and had no human route back.
3. The recovered text included "Reminder to check the department", "Remember", and "Remember".
4. The user recognized them as previously retained experiences.
5. The path was retain an experience, leave, return later, and revisit the retained experience.
6. No standalone Notes application was required.

That is acceptance of the semantic and runtime proof: Capture has memory.

It is not acceptance of the final production Capture experience. The two observations above remain open for that later experience.

## Next Note dependency

The next Note-related semantic question is how the human explicitly establishes that a retained experience is the source of a new fact.

The question is not how to convert a Note into a Task.

The Note remains a Note. The new fact is established independently. The human authorizes that fact. The new fact may cite the originating Note. Reference alone establishes nothing.

This record does not specify that act, does not authorize storage, and does not add `note_id`.

## Acceptance

Automated validation of NOTE-REVISIT-001 was already complete before this record. NOTE-REVISIT-001A accepts the scaffold on the Samsung Galaxy S26 Ultra for the semantic and runtime proof only. Edit, delete, archive, the final Capture experience, and the establishment-from-Note act remain outside this acceptance.
