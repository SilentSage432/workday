# NOTE-LIFECYCLE-001A — Hosted UPDATE authority correction

Date: 2026-10-08.

Baseline: `1612b2b848d754953ae2a0fe6e2bc489b091b469`.

Correction commit: `92a7a18c0c8c9cbc5d39793f97ebb3fedd047f3c`.

Parent: [NOTE-LIFECYCLE-001.md](NOTE-LIFECYCLE-001.md).

## Status

Hosted verification verdict: **NOTE-LIFECYCLE-HOSTED-AUTHORITY-CLEAR**

Physical acceptance of Retire/Delete followed this correction and is recorded on the parent document (documented late; does not supersede later Pulse acceptance).

## What happened

`20261008210000_note_lifecycle.sql` was applied once to `ksmhgaamyheyhefbyglb`. Schema, RLS, DELETE, provenance, and existing Notes were correct.

Hosted privilege inspection then showed `authenticated` still held **table-level UPDATE** on `public.notes`, so `content`, `captured_at`, `id`, and `user_id` remained updatable at the privilege layer. That violates deferred Edit.

## Root cause

PostgreSQL grants are additive.

The lifecycle migration granted `UPDATE (retired_at)` and `DELETE`. It did not revoke historical table-level UPDATE.

Repository evidence: hosted default privileges grant `authenticated` every table privilege at creation. Later tables that need a narrower surface revoke from `authenticated` first (see `20261005163000_direction.sql` and `20261005170800_execution_direction.sql`). `20261004180000_notes.sql` revoked only from `public` and `anon`, then granted `SELECT`/`INSERT`. Table-level UPDATE from default privileges therefore survived. Do not rewrite that historical migration; this forward correction converges hosted authority.

## Correction

Migration `supabase/migrations/20261008220000_note_update_authority_correction.sql`:

```sql
revoke update on table public.notes from authenticated;
grant update (retired_at) on table public.notes to authenticated;
```

Preserved: DELETE, SELECT, INSERT, `notes_update_own`, `notes_delete_own`, Task provenance FK, Note rows, `retired_at` definition.

Edit remains deferred. No production Note data is changed by this SQL.

## Verified hosted authority (after correction)

On canonical `ksmhgaamyheyhefbyglb`, authenticated privileges on `public.notes`:

| Privilege | Result |
| --- | --- |
| table-level UPDATE | NO |
| UPDATE(`retired_at`) | YES |
| UPDATE(`content`) | NO |
| UPDATE(`captured_at`) | NO |
| UPDATE(`id`) | NO |
| UPDATE(`user_id`) | NO |
| DELETE | YES |
| SELECT | YES |
| INSERT | YES |

Existing owner policies remained intact. Task provenance FK continued to protect cited Notes from deletion.

Verdict: **NOTE-LIFECYCLE-HOSTED-AUTHORITY-CLEAR**

## Production candidate

Correction commit `92a7a18c0c8c9cbc5d39793f97ebb3fedd047f3c` was the production candidate for physical acceptance (deployment `dpl_5zSfHQNK9dGniZRNjgQRHTrg1hqK`). See parent physical-acceptance record.
