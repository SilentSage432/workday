# NOTE-LIFECYCLE-001 — Retire and Delete for retained Notes

Date: 2026-10-08.

Baseline: `b69bcf9765e3caadc3c1b283f0a1b6df937ab6b9`.

Decision: [../decisions/2026-10-08-note-lifecycle.md](../decisions/2026-10-08-note-lifecycle.md).

Discovery: NOTE-LIFECYCLE-DISCOVERY-001 verdict **NOTE-LIFECYCLE-FOUNDATION-CLEAR**.

## What this implements

Human authority over Notes they established:

- **Retire** — leave current operational Notes; preserve the row and any Task provenance.
- **Delete** — permanently remove an uncited Note from the Orient record.

Edit remains deferred. No Archive browser. No Unretire UI. No Notes Class-A realtime.

## Domain

`Note` is `id`, `content`, `capturedAt`, `retiredAt`.

Current operational Note: `retiredAt === null`.

`NoteCitedError` names cited-Note deletion without foreign-key jargon.

## Schema

Migration `supabase/migrations/20261008210000_note_lifecycle.sql`:

- adds `retired_at timestamptz` (null = current);
- grants column-level `update (retired_at)` and table-level `delete` to `authenticated` (not unrestricted table UPDATE; content Edit remains deferred);
- policies `notes_update_own`, `notes_delete_own`.

Existing SELECT/INSERT authority preserved. Existing rows remain current (`retired_at` null).

`tasks_originating_note_same_owner` stays `ON DELETE NO ACTION`. No cascade. No SET NULL.

**Hosted migration is not applied by this tranche.** Apply only after review.

## Persistence

- `loadNotes` — complete read of `retired_at IS NULL`, order `captured_at`, `id`.
- `retireNote` — sets `retired_at` only while currently null; preserves content and capture instant.
- `deleteNote` — hard delete; maps provenance FK failure to `NoteCitedError`.

## UI

Shared LOOK → Notes → `NotesSurface` / `RetainedNotesCollection`:

- **Retire** — no confirmation; removes from current collection; stays on Notes.
- **Delete** — confirmation (“This permanently deletes the Note.”) with Delete / Cancel.
- Cited Delete failure shows: retained because a Task was established from it; Retire instead.
- “Establish a task from this” unchanged.

Phone and desktop share the same semantic actions. No swipe-only controls. No lifecycle controls in ADD or ACT.

## Cross-client

Notes remain outside Class-A realtime. On-open `loadNotes` plus local state update after lifecycle actions. Another client sees truth on its next Notes open.

## Tests

- `domain/note.test.ts`
- `persistence/note.test.ts`
- `components/orient/noteReturn.test.tsx` lifecycle coverage
- provenance FK preservation in `persistence/taskProvenance.test.ts`

## Explicit non-goals

Edit, Unretire UI, Archive browser, search, folders, tags, rich text, attachments, AI interpretation, Pulse, Notes Class-A publication, phone LOOK redesign, center ADD, ACT, desktop foundation.

## Later

Hosted application of this migration exposed surviving table-level UPDATE privilege; [NOTE-LIFECYCLE-001A.md](NOTE-LIFECYCLE-001A.md) converges authority with `REVOKE UPDATE` then `GRANT UPDATE (retired_at)`. Physical acceptance of Retire and Delete follows that correction. Pulse remains the next major exploration after physical acceptance.
