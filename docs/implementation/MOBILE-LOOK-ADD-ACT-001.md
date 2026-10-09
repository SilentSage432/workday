# MOBILE-LOOK-ADD-ACT-001 — Phone LOOK · + · ACT reachability

Implements the accepted plan [MOBILE-LOOK-ADD-ACT-IMPLEMENTATION-PLAN-001.md](MOBILE-LOOK-ADD-ACT-IMPLEMENTATION-PLAN-001.md).

Baseline before this tranche: `afb740d76f1a04b3637c140088e95511907413ba` (plan commit on `main`).

Candidate before the plan: `93c56818dfeae53daa5f477e157d6e63ef0d506b`.

This tranche reorganizes **reachability and composition** only. No new domain semantics. No schema migration.

---

## Implemented composition

Phone permanent bezel (`data-form="phone"`):

| Seat | Label | Icon | Control |
| --- | --- | --- | --- |
| Left | LOOK | Compass | `data-look-control` |
| Center | + (Plus glyph only; no text sibling) | Plus | `data-add-control` (emphasized hit target) |
| Right | ACT | ListTodo | `data-act-control` |

Row marker: `data-reach-grammar="look-add-act"`.

Desktop bezel is **unchanged**: Question · Position · Focus · Capture.

---

## LOOK ownership

LOOK opens `LookSurface` (`data-look-surface`):

1. `QuestionList` — Present / Day / Week / Month (existing `chooseQuestion` / place memory / provenance)
2. `PositionSurface` — Where in time, Today, Manage Work, Sign out
3. `FocusList` — Context focus

Human question: “Where am I in time?”

---

## ADD ownership

Center + opens `AddChooser` (“What are you adding?”):

| Choice | Route |
| --- | --- |
| Task | Existing `CaptureSurface` |
| Note | Existing `CaptureSurface` |
| Time on the day | Day/Present Exact depth → existing establishment |
| Work schedule | Existing `WorkScheduleOperation` |

Does **not** advertise all-day create, Destination, Priority, or generic Event.

Capture remains implementation capability; Capture is **not** a permanent phone peer.

---

## ACT ownership

ACT opens `ActSurface` (`data-act-surface`).

Human question: “What do I need to do?”

Source: canonical open Tasks (`loadOpenTasks` / `tasks` prop). Not ActiveThread. Not a second store.

One tap from normal phone entry. Inspect/edit/Complete without Start.

---

## Deterministic Task ordering

`orderActTasks` in `components/orient/actTasks.ts`:

1. MustDo open Tasks (`created_at` ASC, `id` ASC)
2. non-MustDo planned for `viewpointCivilDate` (= instrument `anchor`), by `plannedLocal` ASC with nulls last, then `created_at` / `id`
3. remaining open Tasks (`created_at` ASC, `id` ASC)

No urgency, overdue inference, AI, or inferred MustDo.

---

## Task inspect / edit path

ACT row select → inspect (`data-act-inspect`) → Edit → Save via existing `updateTask` / `taskPatchFromEditDraft`.

Editable: title, Context, planned date, planned clock, due, MustDo.

---

## Start relationship

Start remains explicit (`data-act-start` on row; inspect Start optional).

Uses `onStartThread` / establish Active Thread.

Opening ACT, inspecting, editing plan/clock/MustDo does **not** auto-Start.

---

## Complete / Still open

Complete from ACT inspect uses `completeTask`.

Immediate bounded **Still open** (`reopenTask`) for the same Task id.

Still open does **not** restore Active Thread.

No completion archive/history.

---

## ActiveThread relationship

Thread answers “What am I doing now?”

Composition thread and conditional bezel thread retained.

ThreadSurface no longer hosts the canonical open-Task list. Secondary **ACT** link opens the shared Act surface.

Resume / Leave / thread Complete+Still open remain.

---

## Capture reuse

`CaptureSurface` writers unchanged. Phone reach is ADD → Task/Note → CaptureSurface.

---

## Task clock-point reachability

TASK-CLOCK-POINT-001 fields reachable as:

ACT → Task → Edit → Planned date → Planned clock → Save

Semantics unchanged. No interval territory. No auto-Block.

---

## Contextual chrome retained

Exact time, composition Active Thread, conditional bezel thread, Return to Now, Orientation — unchanged ownership; not promoted into the triad.

---

## Desktop impact

No LOOK · + · ACT mirror.

Desktop keeps Question / Position / Focus / Capture.

Shared `ActSurface` / `TaskDetail` available via Thread → ACT link so open-Task inspect/edit/complete does not require Start-only list nesting.

Temporal readings unchanged.

---

## Tests

- `components/orient/actTasks.test.ts` (new)
- `components/orient/lookAddAct.test.tsx` (new)
- `components/orient/phoneExperience.test.tsx`
- `components/orient/orientView.test.tsx`
- `components/orient/desktopReading.test.tsx`
- Existing completion correction, capture, provenance, coherence suites remain authoritative for writers

---

## Explicit non-goals

No migration · no timer/reminders/recurrence/notifications · no AI · no generic Event · no calendar integration · no phone DTM · no Present/Day/Week/Month semantic redesign · no second Task store · no physical acceptance document in this tranche.
