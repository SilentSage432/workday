# PROVENANCE-001 — Task provenance from retained experience

Date: 2026-10-04.

Baseline: `08bbf5336eaf8696c2855dfb5b56a12e7f3c45d5`.

## What this proves

A Task can cite zero or one originating Note. The citation is written only when the human explicitly establishes that Task. Reference to a retained Note writes nothing. The Note stays a Note.

This is a storage and scaffold proof of [../decisions/2026-10-04-provenance-contract.md](../decisions/2026-10-04-provenance-contract.md). It is not the production Capture experience, and it does not start EXPERIENCE-001.

## Storage

`tasks.originating_note_id` is a nullable uuid. Null means no originating Note was established with the Task. A value is the identity of one Note.

The foreign key is `(originating_note_id, user_id)` referencing `notes (id, user_id)`, `match simple`. A null note identity is not checked, so an ordinary Task stays valid. A supplied identity must be a Note owned by the same user. Another user's Note cannot be cited, including by a client that bypasses its own checks. Row level security on `tasks` is unchanged: insert still requires `user_id = auth.uid()`. The foreign key is the additional data-boundary check. No new grant was added. Notes still have select and insert only.

The column is not unique. Several Tasks may cite the same Note. The Note table is unchanged and does not list those Tasks.

`origin` stays `user_created`. The column is not an origin value.

The migration is `supabase/migrations/20261005020600_task_originating_note.sql`. It was authored in the repository. It was not applied to the hosted Supabase project `ksmhgaamyheyhefbyglb`.

## Note deletion

Note deletion remains undecided. The foreign key is `on delete no action`, deferred until transaction commit.

That action does not delete the Task, does not clear `originating_note_id`, and does not grant delete on `notes`. A committed delete of a cited Note fails, and the Task row is left as it was. The deferral lets account removal delete that user's tasks and notes in the one transaction `auth.users` already uses. Account removal is not a Note-deletion operation.

## Atomic establishment

`createTask` inserts one `tasks` row. When the human establishes a sourced Task, that row includes `originating_note_id` in the same insert. There is no second provenance write. If the insert fails, including a foreign-key failure, `createTask` throws and returns no Task. Ordinary establishment inserts the same row with `originating_note_id` null.

`loadOpenTasks` reads the column back. An edit of a Task does not write it.

## Scaffold

Inside the existing retained-experience list, each Note has the scaffold control "Establish a task from this". That control opens an empty task title. It does not copy the Note. "Establish this task" calls `createTask` with the human's title, `user_created`, and that Note's id. Must Do, planned day, due day, and Context stay unset. No Active Thread and no temporal fact is created.

"Leave this" and Leave write nothing. A failed insert stays on the same title and the same Note, and the surface does not say the Task was established. The Note text remains.

The words are scaffold copy.

## Excluded

No provenance on Protected Time, Block, Commitment, Active Thread, Today, Current Temporal Orientation, present-moment orientation, Timeline, Capacity, Pulse, Priority, Destination, Context, or Cadence. No Note edit, delete, or archive. No conversion wording. No prefill. No generic provenance table.

## Tests

`persistence/taskProvenance.test.ts`, `persistence/contextTaskMapping.test.ts`, `domain/generalCapture.test.ts`, and `components/generalCapture.test.tsx` cover the ordinary Task, the sourced Task, shared citation, the unchanged Note, `user_created`, reference, cancel, failure, the single insert, and the foreign key.
