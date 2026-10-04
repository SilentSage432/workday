# DATA-001 — Context and Task truth

Date: 2026-10-02.

This tranche stores the smallest durable truth needed for Context and Task. The next tranche can capture a Task, load it, and complete it. This tranche does not build that experience.

## What was modeled

- `contexts`: one row per Context owned by one user.
- `tasks`: one actionable item owned by one user, with an optional Context.

The four canonical Context names are Work, Family, TeamLab, and Financial. There is no Personal Context. A Context is not a workspace or an account.

## What was not modeled

Notes, Blocks, Commitments, Active Thread, recurring obligations, occurrences, reminders, Work shifts, Work cadence, external calendar facts, Google Calendar, notification delivery, and voice.

Active Thread storage came later, in [../implementation/V0-002.md](../implementation/V0-002.md). The Work schedule and confirmed time zone came later, in [../implementation/V0-003.md](../implementation/V0-003.md). V0-004 added no table. Power Hour and the FSR boundary are constants. V0-004B adds `save_work_week`, one transaction for the changed days of a visible Work week. It does not add a table. This document describes only the Context and Task schema.

NOW, Timeline, Today, Pulse, and Resume are projections. They are not tables. Queries do not order Tasks by what deserves attention. V0-005 does not add a column or a table. Today is the open Tasks whose `planned_on` is the confirmed civil date. V0-006 adds `protected_time`. V0-007 adds `blocks`, with an optional Context reference that must belong to the same user. V0-008 adds `commitments`, with a required title and origin `user_created`. It has no Context and no Task reference. None of those tables change `tasks`. V0-009 adds no table. Timeline remains a projection over those established rows. V0-010 adds no table. The day canvas is a view of that projection. The selected day is not stored. V0-011 adds no table. A direct time selection is transient interaction state and is not stored. V0-012 adds no table. An intended meaning for that selection is transient interaction state and is not stored. V0-012A adds no table. Refining that selection does not store it. V0-013 adds no table and no column. An explicit Save inserts a Protected Time, Block, or Commitment row through the tables those facts already use.

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
| must_do | boolean | no | Default false |
| origin | text | no | Default `user_created` |

The only index beyond keys and uniqueness is `tasks(user_id)`.

## Due representation

`due_on` is a PostgreSQL `date`. `planned_on` is a separate `date`. Neither is converted through a time zone, so a planned day does not shift when the database session zone changes.

Product examples of Task due and planned are civil days. A reminder is the established place for a time of day, and reminders are not stored here. V0 therefore does not invent a due instant.

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

Note conversion, a recurring definition, and an external source are future origins. Those objects do not exist, so this tranche does not add foreign keys to them. Widening the check is a later migration.

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

`loadOpenTasks` returns rows with `completed_at` null, ordered by `created_at` so the list is stable. That order is not a NOW ranking. `completeTask` writes only the completion instant supplied by the caller.

## Auth bootstrap

The data layer expects one provisioned user. Public registration is not a product feature. No auth UI is included. The account is created in the Supabase dashboard: Authentication, Users, Add user, with email and password, and email confirmation marked confirmed. The user types the password there. This repository does not store it.

After that insert, the trigger creates the four Contexts.

## Unresolved data questions

- Whether a Task may eventually belong to more than one Context.
- Whether a Task due boundary later needs a clock time in addition to `due_on`.
- What reschedule and carry-forward write, and whether either clears MUST DO.
- The confirmed IANA time zone is stored in `temporal_settings`. That table is not a profile catalog. Projections receive the stored zone as an input.
- Whether the owner should be prevented from deleting a canonical Context.
