# NOTE-STORAGE-001 — Persist and completely read canonical Notes

Date: 2026-10-04.

Baseline: `0431ba0cb4bb8260cff8ea98b15a30efd6b84579`.

## Accepted representation

[../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md) is unchanged. This tranche stores that Note. It does not add a surface that establishes one.

## Domain

`domain/note.ts` defines a Note as `id`, `content`, and `capturedAt`.

`content` is one text. Blank and whitespace-only text are rejected. Text that contains a non-whitespace character is kept, including surrounding spaces.

`capturedAt` is an instant. The establishment caller supplies it. Persistence does not read a clock.

`user_id` is not a domain field.

## Persistence

`public.notes` has `id uuid`, `user_id uuid`, `content text`, and `captured_at timestamptz`. `captured_at` is required and has no default. There is no `created_at`.

`notes_content_not_blank` rejects content whose trim is empty. That check does not rewrite stored text.

`notes_id_user_key` is unique on `(id, user_id)`. A later fact can reference that pair and stay with the same owner. This migration does not add `note_id` to Task, Protected Time, Block, Commitment, or any other table.

## Ownership

Row level security is enabled. `public` and `anon` have no privileges.

`authenticated` is granted `select` and `insert`. Policies `notes_select_own` and `notes_insert_own` require `user_id = (select auth.uid())`.

Other application tables also grant `update` and `delete` because those product operations exist, and they add matching owner policies. Note editing and deletion are unresolved, so Notes do not receive those grants or policies. The application exposes `createNote` and `loadNotes` only.

Account deletion still cascades through `user_id`. That is not a Note-delete operation.

## Complete read

`loadNotes` uses `readCompleteDateRows`. The query asks for an exact count and pages at the existing page size. The array is returned when its length matches the reported total.

A missing count, a short page, a changed count, a later-page error, or a final length mismatch throws. The prefix is not returned.

## Order

Rows are ordered by `captured_at` ascending, then `id` ascending. The id is a pagination tie-break when two Notes share a capture instant. That order is retrieval order. It is not importance, and a later Note is not more important because it is later.

## Create

`createNote` stores an already-established Note. It writes the supplied `capturedAt` as `captured_at`. It does not use insertion time, the civil date, or a planned day.

Invalid content throws before the insert.

## Tests

`domain/note.test.ts` covers identity, blank and whitespace content, unchanged meaningful text, and the capture instant.

`persistence/note.test.ts` covers mapping, the create payload, a complete empty collection, a multi-page collection, capture order and the id tie-break, the complete-read failures, the select/insert ownership boundary, the absence of an update or delete path, and the unchanged Quick Capture, open-task, and complete-read sources.

## Exclusions

No Note surface. No edit, delete, archive, or revision. No Quick Capture change. No interpretation, voice, transcript, or provider. No Context. No provenance column on a later fact. No Task lifecycle change.

## Later

[NOTE-STORAGE-001A.md](NOTE-STORAGE-001A.md) corrects the constraint comment in this same migration file. Production rejected a schema-qualified constraint name, and `public.notes` was absent afterward. The storage decision is unchanged. [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) uses this complete read, and this retrieval order, as the return to retained experience. [NOTE-REVISIT-001.md](NOTE-REVISIT-001.md) calls this read from General Capture and does not change the order or add a write.
