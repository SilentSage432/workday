# DATA-001 — Context and Task truth

Date: 2026-10-02.

This tranche stores the smallest durable truth needed for Context and Task. The next tranche can capture a Task, load it, and complete it. This tranche does not build that experience.

## What was modeled

- `contexts`: one row per Context owned by one user.
- `tasks`: one actionable item owned by one user, with an optional Context.

The four canonical Context names are Work, Family, TeamLab, and Financial. There is no Personal Context. A Context is not a workspace or an account.

## What was not modeled

Notes, Blocks, Commitments, Active Thread, recurring obligations, occurrences, reminders, Work shifts, Work cadence, external calendar facts, Google Calendar, notification delivery, and voice.

Note storage came later, in [../implementation/NOTE-STORAGE-001.md](../implementation/NOTE-STORAGE-001.md). That table is `notes`. It does not add `note_id` to other facts. Active Thread storage came later, in [../implementation/V0-002.md](../implementation/V0-002.md). The Work schedule and confirmed time zone came later, in [../implementation/V0-003.md](../implementation/V0-003.md). V0-004 added no table. Power Hour and the FSR boundary are constants. V0-004B adds `save_work_week`, one transaction for the changed days of a visible Work week. It does not add a table. This document describes only the Context and Task schema.

NOW, Timeline, Today, Pulse, and Resume are projections. They are not tables. Present-moment orientation is the same kind of projection: Current Temporal Orientation and the Active Thread, not a row and not a ranking. The decision is [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). Queries do not order Tasks by what deserves attention. V0-005 does not add a column or a table. Today is the open Tasks whose `planned_on` is the confirmed civil date. V0-006 adds `protected_time`. V0-007 adds `blocks`, with an optional Context reference that must belong to the same user. V0-008 adds `commitments`, with a required title and origin `user_created`. It has no Context and no Task reference. None of those tables change `tasks`. [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md) later decides that a Block may refer to one Task. [../implementation/TASK-TIME-001.md](../implementation/TASK-TIME-001.md) stores nullable `blocks.task_id`. The migration is applied on `ksmhgaamyheyhefbyglb`. TASK-TIME-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. It does not change `tasks`. V0-009 adds no table. Timeline remains a projection over those established rows. V0-010 adds no table. The day canvas is a view of that projection. The selected day is not stored. V0-011 adds no table. A direct time selection is transient interaction state and is not stored. V0-012 adds no table. An intended meaning for that selection is transient interaction state and is not stored. V0-012A adds no table. Refining that selection does not store it. V0-013 adds no table and no column. An explicit Save inserts a Protected Time, Block, or Commitment row through the tables those facts already use. [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md) adds no table and no column. An expression and a candidate understanding are transient. They are not a capture result, a draft, a transcript, or a queue. [../implementation/TYPED-GENERAL-CAPTURE-001.md](../implementation/TYPED-GENERAL-CAPTURE-001.md) adds no table. A Note insert may supply `notes.id`. That column already existed. [../implementation/DIRECTION-REP-001.md](../implementation/DIRECTION-REP-001.md) adds `destinations` and `priorities`. It does not change `tasks` or `blocks`. The migration is not applied. There is no production interaction. [../implementation/EXECUTION-DIRECTION-REP-001.md](../implementation/EXECUTION-DIRECTION-REP-001.md) adds `task_priority_service` and `block_priority_service`, and adds `blocks_id_user_key` on `(id, user_id)`. It does not add `priority_id` to `tasks` or `blocks`. That migration is not applied. There is no production interaction and no Month reading.

## Schema

Both tables use `uuid` primary keys and `timestamptz` creation times. `user_id` references `auth.users` and deletes the user's rows when that account is deleted.

`contexts`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| user_id | uuid | no | Owner |
| name | text | no | Trimmed non-blank. Unique per user |
| created_at | timestamptz | no | Instant the row was created |

A unique `(id, user_id)` exists so a Task can reference both.

`tasks`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| user_id | uuid | no | Owner |
| context_id | uuid | yes | Optional Context |
| title | text | no | Trimmed non-blank |
| created_at | timestamptz | no | Instant the row was created |
| completed_at | timestamptz | yes | Null while open |
| due_on | date | yes | Civil due date |
| planned_on | date | yes | Civil planned day |
| planned_local | time | yes | Optional local clock on planned_on; requires planned_on |
| must_do | boolean | no | Default false |
| origin | text | no | Default `user_created` |

The only index beyond keys and uniqueness is `tasks(user_id)`.

## Due representation

`due_on` is a PostgreSQL `date`. `planned_on` is a separate `date`. Neither is converted through a time zone, so a planned day does not shift when the database session zone changes.

Product examples of Task due and planned are civil days. `planned_local` is optional local clock-point intention on `planned_on` (HH:MM civil clock text in the domain). It is not duration, Block territory, a due instant, a reminder, or a UTC instant. Clearing `planned_on` clears `planned_local`. A reminder remains a separate unresolved concept.

Limitation: a Task cannot yet say it is due at a specific clock time. A later nullable `timestamptz` can be added beside `due_on` without rewriting the date. Until that exists, do not encode a time inside `due_on`.

This choice is recorded in [../decisions/2026-10-02-context-and-task-storage.md](../decisions/2026-10-02-context-and-task-storage.md).

## Ownership

Every application row has `user_id`. The application writes that value from the signed-in Supabase user, not from a caller-supplied owner.

A Task's Context reference is a foreign key on `(context_id, user_id)` to `contexts(id, user_id)`. If `context_id` is null, the reference is not checked. Deleting a Context sets only `context_id` to null, so the Task remains with its owner.

An ordinary foreign key on `context_id` alone would not prevent a cross-owner reference.

## Row level security

RLS is enabled on `contexts` and `tasks`. The `authenticated` role may select, insert, update, and delete only rows whose `user_id` is `auth.uid()`. Insert and update also check the new row. There is no policy for `anon`. The service-role key is not used by the application.

Deleting a Context or a Task is allowed for the owner. Deleting a Context unassigns its Tasks. It does not delete them.

## Provenance

`tasks.origin` is `user_created` for a Task the user captured directly. The check constraint allows only that value.

A recurring definition and an external source remain possible future origins. Those objects do not exist, so this tranche does not add foreign keys to them. Widening the check for one of those authorities would be a later migration.

A Task established from a Note stays `user_created`. [../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md) does not record that relationship by widening `origin`. It is an optional reference on the Task. [../decisions/2026-10-04-provenance-contract.md](../decisions/2026-10-04-provenance-contract.md) decides when that reference becomes true: only as part of explicit Task establishment from the retained Note. [../implementation/PROVENANCE-001.md](../implementation/PROVENANCE-001.md) stores `tasks.originating_note_id` for that reference. The committed migration was applied to `ksmhgaamyheyhefbyglb`, and the hosted column and same-owner foreign key were verified. `notes` is stored by [../implementation/NOTE-STORAGE-001.md](../implementation/NOTE-STORAGE-001.md). [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) does not add a column to `notes`. The return to a Note uses the existing complete read.

Contexts have no origin column. They are the user's own rows, created by the seed.

## Canonical Context seed

`seed_canonical_contexts(uuid)` inserts Work, Family, TeamLab, and Financial for one user. The unique `(user_id, name)` makes the insert idempotent.

A trigger on `auth.users` runs that function after a user is created. The migration also runs it for users who already exist. The functions are security definer, with an empty `search_path`, and execute is revoked from `public`, `anon`, and `authenticated`. Clients cannot seed another account or call the function directly.

## Migration strategy

`supabase/migrations/20261002213000_context_and_task.sql` is the canonical schema. It was applied to the dedicated project with `supabase db push`. Do not treat a dashboard-only edit as history.

Local CLI link state under `supabase/.temp/` is ignored. `.env.local` is ignored.

## TypeScript mapping

Domain types live in `domain/context.ts` and `domain/task.ts`. They do not include `user_id`. Ownership belongs to the session.

Database row shapes live in `persistence/contextTaskRows.ts`. `persistence/contextTaskMapping.ts` maps between them. Civil dates pass through as `YYYY-MM-DD`. An instant string is rejected for `dueOn` and `plannedOn`. An update writes only the fields the caller changed, so due and planned cannot overwrite each other.

`persistence/contextsAndTasks.ts` is the boundary the next tranche should call:

- `loadContexts`
- `createTask`
- `loadOpenTasks`
- `updateTask`
- `completeTask`
- `reopenTask`

`loadOpenTasks` returns rows with `completed_at` null, ordered by `created_at` so the list is stable. That order is not a NOW ranking. `completeTask` writes only the completion instant supplied by the caller. `reopenTask` writes only `completed_at` null on the same row. It does not restore Active Thread. See [../implementation/TASK-COMPLETION-CORRECTION-001.md](../implementation/TASK-COMPLETION-CORRECTION-001.md).

## Auth bootstrap

The data layer expects one provisioned user. Public registration is not a product feature. No auth UI is included. The account is created in the Supabase dashboard: Authentication, Users, Add user, with email and password, and email confirmation marked confirmed. The user types the password there. This repository does not store it.

After that insert, the trigger creates the four Contexts.

## Unresolved data questions

- Whether a Task may eventually belong to more than one Context.
- Whether a Task due boundary later needs a clock time in addition to `due_on`.
- What reschedule and carry-forward write, and whether either clears MUST DO.
- The confirmed IANA time zone is stored in `temporal_settings`. That table is not a profile catalog. Projections receive the stored zone as an input.
- Whether the owner should be prevented from deleting a canonical Context.
