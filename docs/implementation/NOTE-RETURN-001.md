# NOTE-RETURN-001 — LOOK → Notes return path

Date: 2026-10-07.

Baseline: `6c9874f4fa5ccf2494780a42ddb571472cd5d87f`.

Discovery: [NOTE-LIFECYCLE-DISCOVERY-001](../discovery/) verdict **NOTE-LIFECYCLE-INCOMPLETE** (chat discovery; this tranche closes the named gap).

## Discovery cause

Production Orient offered **ADD → Note** via `DirectNoteSurface` → `createNote`. The Note persisted correctly. Phone LOOK · ADD · ACT had no practical return: Capture was removed from the phone bezel, `OrientInstrument` does not load Notes, and Notes do not enter Present / Day / Week / Month / Timeline / ACT.

## Retained-fragment semantic

Unchanged. A Note remains a retained fragment of experience: `id`, `content`, `capturedAt`. It carries no inherent obligation, temporal allocation, due date, lifecycle/status, importance, or action requirement.

## Missing human relationship

If Orient offers a way to remember something, Orient must offer a way to return to what the human asked it to remember.

Smallest missing relationship: **return to retained Notes after ADD → Note**.

## Why return belongs under LOOK

LOOK inspects where the human is and what Orient already holds in view. Returning to retained Notes is inspection of memory, not establishment and not an action obligation.

- **ADD** remains establishment (`DirectNoteSurface` unchanged).
- **LOOK → Notes** is inspection / revisit.

Notes is an operation inside LOOK. It is not a new permanent bezel control.

## Implementation

`LookSurface` Operations exposes **Notes** (`data-look-notes`). Choosing it opens `NotesSurface` (`surface.kind = "notes"`).

`NotesSurface`:

- loads on open via on-demand `loadNotes` (complete collection, `captured_at` / `id` order);
- shows loading, empty, retained collection, or failure;
- does not treat failure as emptiness;
- reuses the same retained-note presentation as Capture (`RetainedNotesCollection`);
- preserves explicit **Establish a task from this** → `taskFromRetainedNote` → `originating_note_id`.

`OrientInstrument` still does not load Notes globally. Notes do not become Timeline facts and do not enter Present, Day, Week, Month, ACT, Capacity, or DTM.

## Task-from-Note authority

Unchanged. The human must choose establishment. The Note remains a Note. The Task may cite `originatingNoteId`. No automatic action inference.

## Desktop

Desktop Capture → Notes remains through `CaptureSurface` and the shared `RetainedNotesCollection`. No desktop navigation redesign. LOOK → Notes is available wherever `LookSurface` is shown (phone LOOK · ADD · ACT).

## Explicit non-goals (this tranche)

No Note edit, folders, tags, notebooks, search, sorting controls, pinning, favorites, markdown editor, AI summarization/classification, automatic Task extraction, temporal assignment, Note → ActiveThread/Context/Shift automation, realtime Note subscription, or new provenance model. No schema migration in this tranche.

Later: [../decisions/2026-10-08-note-lifecycle.md](../decisions/2026-10-08-note-lifecycle.md) and [NOTE-LIFECYCLE-001.md](NOTE-LIFECYCLE-001.md) add Retire and Delete on this LOOK → Notes surface without changing the return path.

## Tests

- `components/orient/noteReturn.test.tsx` — LOOK → Notes entry, DirectNote persistence path, on-demand load, order, empty/failure, Task-from-Note provenance, isolation, no edit/delete.
- `components/orient/lookAddAct.test.tsx` — Notes under LOOK operations; LOOK → Notes vs ADD → Note; grammar intact.

## Validation

- Targeted: `noteReturn.test.tsx`, `lookAddAct.test.tsx`, `directCreate.test.tsx` — pass
- Full suite: 108 files / 932 tests — pass
- Lint — pass
- Typecheck — pass
- Production build — pass

## Files changed

- `components/orient/Surfaces.tsx` — LOOK Notes operation; `RetainedNotesCollection`; `NotesSurface`; Capture reuse.
- `components/orient/OrientView.tsx` — `notes` surface kind; LOOK expanded while Notes open.
- `components/orient/noteReturn.test.tsx` — new.
- `components/orient/lookAddAct.test.tsx` — LOOK Notes coverage.
- `docs/implementation/NOTE-RETURN-001.md` — this record.

## Final verdict

**NOTE-RETURN-CLEAR**

ADD → Note still establishes. LOOK → Notes returns to retained Notes on phone without a Notes application and without temporal projection participation.
