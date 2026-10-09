# NOTE-LIFECYCLE-001 — Retire and Delete for retained Notes

Date: 2026-10-08.

Baseline: `b69bcf9765e3caadc3c1b283f0a1b6df937ab6b9`.

Implementation commit: `1612b2b848d754953ae2a0fe6e2bc489b091b469`.

Decision: [../decisions/2026-10-08-note-lifecycle.md](../decisions/2026-10-08-note-lifecycle.md).

Discovery: NOTE-LIFECYCLE-DISCOVERY-001 verdict **NOTE-LIFECYCLE-FOUNDATION-CLEAR**.

## Status

**NOTE-LIFECYCLE-001: PHYSICALLY ACCEPTED**

Hosted authority after correction: **NOTE-LIFECYCLE-HOSTED-AUTHORITY-CLEAR** ([NOTE-LIFECYCLE-001A.md](NOTE-LIFECYCLE-001A.md)).

This acceptance was documented late (after later Orient work, including hosted Pulse establishment). It does not reopen or supersede newer accepted Pulse state.

## What this implements

Human authority over Notes they established:

- **Retire** — “was valid; leave the current Notes collection; row remains.”
- **Delete** — “must not exist” (hard removal; only when no Task cites the Note).

Current Notes means: not retired (`retiredAt === null` / `retired_at IS NULL`).

Retire requires no confirmation. Delete requires confirmation.

A provenance-protected Note cited by a Task cannot be deleted; that Note may still be retired.

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

Original tranche did not apply hosted. Later hosted application and authority correction are recorded in [NOTE-LIFECYCLE-001A.md](NOTE-LIFECYCLE-001A.md).

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

## Hosted authority

Hosted application of this migration exposed surviving table-level UPDATE privilege; [NOTE-LIFECYCLE-001A.md](NOTE-LIFECYCLE-001A.md) converges authority with `REVOKE UPDATE` then `GRANT UPDATE (retired_at)`.

## Physical acceptance (historical)

Completed on Tyson’s Samsung phone after the corrected production candidate was live.

### Retire
- Retire worked with no confirmation.
- Note left Current Notes.
- Underlying Note row remained.

### Uncited Delete
- Delete presented confirmation.
- Cancel path exercised.
- Confirm path exercised.
- Confirmed deletion removed the uncited Note.

### Provenance-protected Delete
- A Note cited by a Task was tested.
- Delete was refused/protected.
- Note remained; citing Task remained.
- Retire remained available and worked.

Acceptance reaction:

> BOOM!!! works so good

**Not accepted / deferred:** Edit, Unretire UI, Archive browser, Notes Class-A realtime, Complete/Dismiss/Hide, new lifecycle states.

## Production evidence (historical)

| Item | Value |
| --- | --- |
| Corrected candidate | `92a7a18c0c8c9cbc5d39793f97ebb3fedd047f3c` (`NOTE-LIFECYCLE-001A`) |
| Deployment | `dpl_5zSfHQNK9dGniZRNjgQRHTrg1hqK` |
| Surface | Production READY / canonical Orient alias used for physical acceptance |

This records completed historical production evidence. It is not a new deploy or re-verification.
