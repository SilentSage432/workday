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

Revealing the list extends the open Capture section downward. What follows Capture on Tasks can move. That movement is not repaired here. It is evidence for the later experience, alongside the spatial-continuity observation in [VOICE-PROBE-001A.md](VOICE-PROBE-001A.md).

## Tests

`components/generalCapture.test.tsx` covers the route through open Capture, a complete collection in returned order, content and `capturedAt` without added meaning, a truthful empty read, a failed read that is not emptiness, a revisit that does not write, and a newly retained Note on the next complete read. Existing Note, Task, Leave, and failed-write tests stay.

`domain/generalCapture.test.ts` still keeps Quick Capture, Schedule, and primary navigation off this return, and keeps speech, `note_id`, update, delete, archive, and sorting out of the surface.

## Exclusions

No Notes route, Notes navigation item, folders, notebooks, tags, search, filter, sort control, pin, status, title, Context, reminder, edit, delete, archive, provenance act, or `note_id`. No schema, migration, or dependency.

## Acceptance

Automated tests do not accept this on the primary phone. The smallest Samsung Galaxy S26 Ultra probe is: open Hold an experience, reveal retained experiences, confirm a previously retained Note shows its content and capture instant, keep one new Note, reveal again, and confirm that Note is present. Hand and layout notes from that probe are experience evidence. They are not approval of the production Capture experience.
