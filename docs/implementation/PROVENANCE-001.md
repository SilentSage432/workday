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

The migration is `supabase/migrations/20261005020600_task_originating_note.sql`. Hosted application and device acceptance are recorded in PROVENANCE-001A below.

## Note deletion

The foreign key is `on delete no action`, deferred until transaction commit.

That action does not delete the Task and does not clear `originating_note_id`. A committed delete of a cited Note fails, and the Task row is left as it was. The deferral lets account removal delete that user's tasks and notes in the one transaction `auth.users` already uses. Account removal is not a Note-deletion operation.

Later current state: [../decisions/2026-10-08-note-lifecycle.md](../decisions/2026-10-08-note-lifecycle.md) and [NOTE-LIFECYCLE-001.md](NOTE-LIFECYCLE-001.md) authorize owner Delete for uncited Notes and Retire for leaving current operational Notes. The provenance FK remains authoritative; cited Delete maps to honest application failure and does not clear citations.

## Atomic establishment

`createTask` inserts one `tasks` row. When the human establishes a sourced Task, that row includes `originating_note_id` in the same insert. There is no second provenance write. If the insert fails, including a foreign-key failure, `createTask` throws and returns no Task. Ordinary establishment inserts the same row with `originating_note_id` null.

`loadOpenTasks` reads the column back. An edit of a Task does not write it.

## Scaffold

Inside the existing retained-experience list, each Note has the scaffold control "Establish a task from this". That control opens an empty task title. It does not copy the Note. "Establish this task" calls `createTask` with the human's title, `user_created`, and that Note's id. Must Do, planned day, due day, and Context stay unset. No Active Thread and no temporal fact is created.

"Leave this" and Leave write nothing. A failed insert stays on the same title and the same Note, and the surface does not say the Task was established. The Note text remains.

The words are scaffold copy.

## Excluded

No provenance on Protected Time, Block, Commitment, Active Thread, Today, Current Temporal Orientation, present-moment orientation, Timeline, Capacity, Pulse, Priority, Destination, Context, or Cadence. No Note content edit. No conversion wording. No prefill. No generic provenance table. Note Retire/Delete arrive later in [NOTE-LIFECYCLE-001.md](NOTE-LIFECYCLE-001.md) without weakening this FK.

## Tests

`persistence/taskProvenance.test.ts`, `persistence/contextTaskMapping.test.ts`, `domain/generalCapture.test.ts`, and `components/generalCapture.test.tsx` cover the ordinary Task, the sourced Task, shared citation, the unchanged Note, `user_created`, reference, cancel, failure, the single insert, and the foreign key.

## PROVENANCE-001A

Date: 2026-10-04.

Baseline: `0dcb44e1bd94f96591d777507da102045fe03404`.

This section records hosted schema evidence and primary-device acceptance. It does not change the scaffold.

### Hosted schema

At the implementation commit the migration was authored and not yet applied. It was then applied manually, exactly as committed, to the canonical Orient Supabase project `ksmhgaamyheyhefbyglb`.

Direct inspection of that database showed:

| Observation | Value |
| --- | --- |
| `column_name` | `originating_note_id` |
| `data_type` | `uuid` |
| `is_nullable` | `YES` |
| `constraint_name` | `tasks_originating_note_same_owner` |
| `constraint_definition` | `FOREIGN KEY (originating_note_id, user_id) REFERENCES notes(id, user_id) DEFERRABLE INITIALLY DEFERRED` |

The displayed constraint definition did not repeat `MATCH SIMPLE` or `ON DELETE NO ACTION`. Those clauses are in the committed migration that was applied. Hosted persistence now supports Task to zero or one originating Note, with same-owner enforcement. Note deletion semantics remain unresolved.

### Samsung Galaxy S26 Ultra

The deployed scaffold was exercised on the Samsung Galaxy S26 Ultra. The user confirmed the end-to-end probe is good.

The path was: retained Note, refer to the retained experience, "Establish a task from this", independently author the Task title, "Establish this task", a canonical Task is established, return to retained experiences, and the originating Note remains intact and revisitable.

That is acceptance of the semantic and runtime scaffold proof. It is not acceptance of the final production Capture experience.

The probe confirms: retained experience, human understanding, explicit establishment of a new Task, the Task preserves originating Note provenance, and the Note survives as a Note. The Task is not the Note. The Note was not converted, consumed, resolved, or mutated. The human established the Task independently.

Reference alone establishes nothing. Entering sourced Task establishment establishes nothing. The human authors the Task title. Note content does not become the title. The Note does not authorize the Task. The Task remains `user_created`. Provenance is informational source. It is not establishment authority.

Sourced establishment does not establish Must Do, Priority, urgency, a planned date, a due date, Context, the Active Thread, a reminder, or temporal placement.

Successful sourced establishment is one Task insert that includes `originating_note_id`. There is no second provenance write. The hosted schema enforces that a non-null originating Note belongs to the same user as the Task.

The scaffold controls are not the final production interaction. The canonical capture instant remains truthful and is not a final human presentation. Opening retained experiences can still displace surrounding temporal content. Neither observation chooses a presentation or a layout.
