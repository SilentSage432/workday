# NOTE-STORAGE-001A — Correct the Notes migration syntax

Date: 2026-10-04.

Baseline: `3d7ebb06acf06fa6d609a9251d7f455c16d470b6`.

## What failed

[NOTE-STORAGE-001](NOTE-STORAGE-001.md) is unchanged as a storage decision. Its migration file was executed against the dedicated production Supabase project and PostgreSQL rejected it:

```text
ERROR: 42601: syntax error at or near "."
LINE 25:
comment on constraint public.notes_id_user_key on public.notes is
```

A later inspection of `information_schema.tables` found no `public.notes` row. The failed statement is a comment. It runs after `create table`, and the rejected script did not leave a Notes table behind. No partial table had to be reconciled.

## Correction

`COMMENT ON CONSTRAINT` takes the constraint name, then `ON`, then the table. The constraint name is not schema-qualified. The table may be. The official form is in the PostgreSQL `COMMENT` synopsis: `CONSTRAINT constraint_name ON table_name`. The example is `COMMENT ON CONSTRAINT bar_col_cons ON bar`.

The file now says:

```sql
comment on constraint notes_id_user_key on public.notes is
  'Same-owner identity a later fact can reference. This migration does not add that reference.';
```

The comment text is the same. The table, columns, constraints, index, row-level security, grants, revokes, and policies are the same. No second migration was added. The original filename and timestamp stay.

## What this does not change

Note meaning, the establishment contract, persistence behavior, and application behavior are unchanged. Update and delete stay ungranted. No provenance column was added. Production Supabase was not modified by this repair.

## Lesson

A migration file committed in the repository is not evidence that the deployed database has applied it. Production readiness for a schema change is the deployed database after a successful execution, not the presence of the file.
