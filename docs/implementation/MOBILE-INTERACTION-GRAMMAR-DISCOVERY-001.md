# MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001

Discovery only. No runtime behavior changed. No migrations. No UI. No commits.

Baseline: `c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a` on `main`. Working tree was clean at the start of this write.

This record inspects whether Orient’s existing canonical truths, writers, projections, and authority boundaries can support a proposed phone interaction grammar organized around three human intentions:

- LEFT — look at time (temporal viewpoint)
- CENTER — add something to Orient
- RIGHT — act on what has been established

The proposal is an interaction concept, not a prescribed three-button component design.

---

## 1. Executive finding

**Most of the proposed experience already exists architecturally.** The missing work is primarily interaction reachability, surface composition, and one already-known completion-integrity gap—not a new domain subsystem.

| Proposed piece | Classification | Evidence in one line |
| --- | --- | --- |
| Present / Day / Week / Month as one temporal viewpoint access | **ALREADY EXISTS** | `QuestionList` + `chooseQuestionNow` + per-question `places` / provenance in `OrientView` |
| Remembered Day/Week/Month places; Present non-remembering Today sample | **ALREADY EXISTS** | `remember` skips Present; Present samples Today and `bringNow` |
| Return to Now / Today / ask Present as distinct acts | **ALREADY EXISTS** | `returnToNow`, `adoptToday`, Present branch of `chooseQuestionNow` |
| Context focus as cross-question lens | **ALREADY EXISTS** | `focus: ContextFocus`; does not write anchor |
| Compact “look at time” chrome instead of four standing peer controls | **PRESENTATION ONLY** | Same authorities; bezel currently hosts question + position + focus + Capture as peers |
| “Add to Orient” as one entry that routes to existing writers | **PARTIALLY EXISTS** | Capture + Day establishment + Work operation exist; routing UI does not |
| Task / Note create from production `/` | **ALREADY EXISTS** | `CaptureSurface` → `createTask` / `createNote` |
| Timed Protected Time / Block / Commitment create from `/` | **ALREADY EXISTS** | Day `EstablishmentSurface` → three `create*` |
| All-day interval create from `/` | **EXISTS BUT NOT REACHABLE** | Same `create*` via `/schedule` sections only |
| Rich Task create (context / planned / due / MustDo at capture) | **EXISTS BUT NOT REACHABLE** | `CapturePanel` More options; production `CaptureSurface` is thinner |
| Action list powered by canonical open Tasks | **PARTIALLY EXISTS** | `loadOpenTasks` + `TaskCollection` exist; list is nested under Thread, Start-only |
| Complete Task from a compact actionable list | **EXISTS BUT NOT REACHABLE** | `completeTask` / `onCompleteTask` exist; production Complete is on thread `TaskDetail` only |
| MustDo as human-pinned / high-attention list treatment | **ALREADY EXISTS** (flag) / **PRESENTATION ONLY** (sort) | `tasks.must_do`; no product sort today; sort would not invent Priority |
| List and temporal surfaces converge on one Task | **ALREADY EXISTS** | One `tasks` row; no second calendar-task type |
| Task completion reopen / undo | **REQUIRES NEW SEMANTICS** (+ writer once named) | Schema allows `completed_at = null`; no named reopen; no writer; already P1 |
| Class-A coherence for Task + Active Thread changes | **ALREADY EXISTS** | `tasks` INSERT/UPDATE; `active_threads` INSERT/UPDATE/DELETE → canonical reread |

**Plain answer:** the grammar can be composed from existing authorities. Do not invent a second Task, a generic action-item type, a new priority concept, or a second persistence store. Resolve Task completion reopen before making completion high-frequency in a standing action list.

---

## 2. Current mobile bottom-control map

Production `/` → `app/page.tsx` → `OrientInstrument` → `OrientView`. Phone form: `matchMedia("(max-width: 959px)")` → `data-form="phone"`. Bottom chassis: `.orient-reach[data-reach="bezel"]` in `OrientView` (~933–989). Docs: `PRODUCTION-PHONE-EXPERIENCE-001.md`, `PRODUCTION-UI-001.md`, `docs/decisions/2026-10-05-production-experience-design.md`.

| Control | User sees | Implementation | Reads | Changes | Authority | Elsewhere? | If removed from permanent bottom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Question | Compass + Present/Day/Week/Month label; sheet “Ask the field” | `data-question-control`; `QuestionList` in `Surfaces.tsx`; `QUESTION_LABEL` in `grammar.ts` | `question` | `chooseQuestion` → question, Present Today sample, place restore | Temporal resolution of one field | Same bezel on desktop | Lose standing resolution readout and primary reach to change question |
| Position | Locate + civil date or week/month span; sheet “Where in time” | `data-position`; `PositionSurface`; `positionWord` | `question`, `anchor` | Prev/next/Today/date → `onAnchor`; nested Manage Work + Sign out | Where the field is oriented | Same bezel; field also shows dates | Lose standing place name (esp. Week/Month) and primary reach for relocation / Work / sign-out |
| Context focus | Aperture + “Focus: Everything” or name | `data-focus-control`; `FocusList` | `focus`, `contexts` | `setFocus` only | Transient lens; not a current Context | Same bezel; applied in field marks | Lose only standing lens control |
| Capture | PenLine + “Capture” | `data-capture-control`; `CaptureSurface` | capture session | Opens capture; writes Task/Note | Establish Task/Note outside the clock | Same bezel on desktop | Lose standing capture seat; writers remain |
| Active Thread (conditional) | Gold Resume line | `data-active-thread`; `ThreadSurface` | `threadReading` | Start / Leave / Complete / edit | Explicit intention | Phone Present/Day: composition thread; desktop Present/Day: `DesktopReading` thread | Present/Day phone: nothing (already hidden). Exact/Week/Month: lose standing thread unless field extended |
| Exact time (adjacent, not bezel) | “Exact time” above bezel in phone reading | `PhoneContinuity` `data-exact-time` | `question`, `depth` | `depth = "exact"` | Depth into same day, not a fifth question | Desktop reading | Lose deliberate closer look at the vertical clock |

### Classification of permanent occupants

| Control | Class |
| --- | --- |
| Question | Separate semantic necessity |
| Position | State indicator + navigation affordance (nested Work / Sign out = contextual) |
| Context focus | Separate semantic necessity |
| Capture | Contextual operation with a permanent reach seat |
| Bezel Active Thread | Semantic necessity when shown; suppressed duplicate during phone Present/Day reading |
| Exact time | Navigation affordance (depth) |

Position and Capture do **not** each require permanent peer territory by ontology. Question and Focus are distinct semantic necessities. Position’s resting label is a state indicator that could live elsewhere if another truthful place-name remains visible. Capture’s write path does not depend on bezel permanence.

---

## 3. Temporal viewpoint findings

### What can consolidate safely

- One mobile affordance that opens the **same** four-question list (`QuestionList` → `chooseQuestion` / `chooseQuestionNow`).
- Fewer standing bottom peers, as long as question change, place memory, and provenance keep using existing `OrientView` machinery.
- Context focus remaining a separate control or appearing contextually—its state is already independent of question (`focus` does not write `anchor`).

### What must remain distinct

| Concern | Why |
| --- | --- |
| Present vs Day | Present does not remember a place (`remember` returns early). Asking Present samples Today, sets `follows-today`, and `bringNow`. Day remembers `{anchor, scroll, provenance}` and allows establishment (`questionAllowsEstablishment`). |
| Day / Week / Month places | Independent keys in `places.current`. Landscape shifts one question’s place without rewriting Day’s. |
| Ask Present vs Today vs Return to Now | Present changes question. `adoptToday` keeps question, sets `follows-today`. `returnToNow` keeps question, relocates to Today (Present/Day also exact + place mark). |
| Exact time | Depth (`reading` \| `exact`), not a question. |
| Provenance | Live bit + copied into each remembered place; remount follows Today again. Not a substitute for question identity. |

**Safe consolidation is access chrome, not merging question meanings.** Collapsing Present into a remembering “phone home,” sharing one anchor across Day/Week/Month, or treating Return to Now as “go Present” would lose existing architecture.

---

## 4. Add-to-Orient findings

### Writers (canonical)

| Writer | Path |
| --- | --- |
| `createTask` | `persistence/contextsAndTasks.ts` |
| `createNote` | `persistence/note.ts` |
| `createProtectedTime` | `persistence/protectedTime.ts` |
| `createBlock` | `persistence/block.ts` |
| `createCommitment` | `persistence/commitment.ts` |
| `saveWorkWeek` | `persistence/saveWorkWeek.ts` |

Domain builders: `domain/capture.ts`, `domain/generalCapture.ts`, `establishFromSelection` in `components/canvasEstablishment.ts` (timed only).

### Production `/` create reachability

| Truth | From `/`? | How |
| --- | --- | --- |
| Task (title / expression) | Yes | `CaptureSurface` quick + general |
| Task (context / planned / due / MustDo at create) | No UI | Writer supports; `CapturePanel` More options only off `/` |
| Task from retained Note | Yes | Capture → Notes → establish |
| Note | Yes | Capture → keep as note |
| Protected Time / Block / Commitment timed | Yes | Day establishment |
| Same three, all-day | No | `/schedule` sections only |
| Work schedule | Yes | `WorkScheduleOperation` via Position / inspection |
| Destination / Priority | No | Writers, no app UI |

### One “+” without a new persistence abstraction?

**Yes.** A single entry can dispatch to:

1. existing Capture (Task / Note),
2. Day establishment (timed intervals),
3. Work schedule operation,
4. later, all-day drafts that already call the same `create*` writers on `/schedule`.

“Add” must remain a **router**, not a second canonical writer or generic record type. Block, Commitment, Protected Time, Work, Note, and Task stay sovereign.

### `/schedule`

Still a typed scaffold (`WorkSchedule` + bottom nav). Unique production-relevant create gap: **all-day** create/edit drafts. Timed create and Work save already exist on `/`. `/` does not link to `/schedule` (`orientView.test.tsx`). Retirement remains later work (`WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md`).

---

## 5. Action projection findings

### A. Task schema

`domain/task.ts` `Task`: `id`, `title`, `contextId`, `createdAt`, `completedAt`, `dueOn`, `plannedOn`, `mustDo`, `origin`, `originatingNoteId`.

Table `public.tasks` (`supabase/migrations/20261002213000_context_and_task.sql`): matching columns; `must_do` comment: user-set flag, not priority score, state, or bucket. `docs/data/DATA-001.md`.

### B. Writers

| Act | Symbol |
| --- | --- |
| Create | `createTask` |
| Update | `updateTask` (`TaskPatch`: title / context / due / planned / mustDo — **not** completion) |
| Complete | `completeTask` → `toCompletionUpdate` → only `completed_at` |
| Open read | `loadOpenTasks` (`completed_at IS NULL`, `created_at` then `id`) |

No application delete. No reopen writer.

### C. Projections / consumers

| Consumer | Role |
| --- | --- |
| `loadOpenTasks` → OrientInstrument `tasks` | Production open set |
| `projectResume` | Active Thread ∩ open Tasks |
| `projectTodayTasks` | Open ∩ `plannedOn === civilDate` — **scaffold / TaskLoop**, not production Orient “Today” viewpoint |
| `TaskCollection` / `TaskDetail` in `ThreadSurface` | Production open-list + complete UI (thread-gated Complete) |
| Timeline / CTO | Do **not** consume Tasks as intervals |
| Month `citedTasks` / `loadCitedTaskIdentities` | Id+title; **may include completed** |

### D. Independent facts

`planned_on`, `due_on`, `must_do`, Active Thread, and `completed_at` are independent (`DOMAIN.md`, `PRODUCT.md`, DATA-001). Capture does not set the thread. MustDo does not establish Today. Completion does not clear plan/due/MustDo columns.

### E–G. Completion effects

- Completion is **not** reversible in product (see §7).
- Completing the cited Task: DB trigger `tasks_clear_active_thread_on_completion` deletes `active_threads` in the same transaction (`20261002223000_active_thread.sql`). Client reloads via `persist` / Class-A.
- Open list / Resume: Task leaves open set. Timeline unchanged (no Task intervals). Blocks citing the Task remain. Month may still name a completed cited Task.

### H. Coherence

Class-A: `canonicalChangeBindings` includes `tasks` INSERT/UPDATE and `active_threads` INSERT/UPDATE/DELETE (`components/orient/canonicalCoherence.ts`). Publication: `20261006235000_class_a_realtime_publication.sql`. Local `persist` increments `reloadToken` immediately after `completeTask`.

### I. Drift

List vs temporal representations can diverge **by design**: open Tasks ≠ timeline intervals; a Block may still cite a completed Task; Month identity is not open-only. A truthful action list must project **open Tasks**, not invent a second “calendar task.” No duplicate persistence exists today. Drift risk would come from a new parallel store or from implying Block/Commitment are checklist items.

### Can Tasks power the proposed list?

**Yes, as a projection of canonical open Tasks.** Existing `TaskCollection` already renders title, MustDo, planned, due, and Start. Missing for the proposal: standing reach, Complete (and edit) without requiring Start-as-thread-first for non-current Tasks (writer already allows `completeTask` on any id; production UI couples Complete to the thread’s `TaskDetail`).

---

## 6. MustDo findings

| Question | Finding |
| --- | --- |
| What is MustDo? | Persistent **human-established** attention flag (`DOMAIN.md`, `PRODUCT.md`, migration comment, Capture/edit checkboxes). |
| Inferred urgency / AI / score? | **No.** Explicitly forbidden. |
| Replacement for Priority? | **No.** Priority is a separate domain type; Destination/Priority writers have no production create UI. |
| Can it serve human-pinned / high-attention action-list treatment? | **Yes**, truthfully as the existing flag. UI language “pin” need not invent a new concept. |
| Sorting open Tasks with MustDo first | **Presentation only**, if display-only and does not write new truth, invent a bucket, or treat MustDo as Priority/state. Open order today is `created_at` (+ id). |
| Unresolved | Whether reschedule clears MustDo; carry-forward meaning (`PRODUCT.md` / `DOMAIN.md`). |

Do **not** create a new priority field because the UI says “pin.”

---

## 7. Task completion integrity findings

| Topic | Evidence |
| --- | --- |
| Schema | `completed_at timestamptz` null while open |
| Writer | `completeTask` → `{ completed_at }` only |
| Production UI | `TaskDetail` Complete → `OrientInstrument.onCompleteTask` → `completeTask(..., new Date())` |
| Confirmation | **None** (one click) |
| Immediate | Yes; then `persist` reload |
| Active Thread | Cleared by DB trigger when that Task completes |
| Cross-client | Task UPDATE + active_threads DELETE → Class-A reread |
| Historical row | Preserved; plan/due/mustDo/title/context/origin unchanged |
| Reversible today? | **No** |
| Reopen schema change? | **Not required** to store open again (`completed_at = null`) |
| Existing update path? | **No** — `TaskPatch` / `updateTask` cannot clear completion |
| Named reopen? | **No** — ESTABLISHED-TRUTH discovery: reopen not named; removal named but unimplemented |
| Tests | `contextTaskMapping.test.ts` (`toCompletionUpdate`); `capture.test.ts`; `resume.test.ts`; `today.test.ts`; `taskEdit.test.tsx`; `openTasks.test.ts`; `activeThread.test.ts`; `blockTask.test.ts` |

**P1 already recorded** in `ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md`:

> Task completion is one click and cannot be reversed. There is no reopen. A mistaken Complete removes the Task from every open surface.

The proposed action list would make that P1 **more operationally acute**. This discovery does not implement undo/reopen; it records that a standing complete-from-list surface should not ship ahead of a named correction path unless product explicitly accepts irreversible high-frequency completion.

---

## 8. ActiveThread interaction

| Act | Effect |
| --- | --- |
| Start | `establishActiveThread` — explicit; not inferred from MustDo/plan/due/capture |
| Leave | Clears thread; Task stays open |
| Complete cited Task | DB deletes `active_threads` for that user/task; Resume goes inactive after reread |
| Complete other Task | Thread unchanged (unless it was that Task) |
| Production list Start | `TaskCollection` → `onStart` replaces thread |
| Production Complete | Only on current thread’s `TaskDetail` today |

Present-moment composition keeps CTO and Active Thread independent (`PRODUCT.md`, present-moment decision). An action list of open Tasks must not become a second “current intention” or auto-set the thread.

---

## 9. Cross-client coherence findings

For Task create/update/complete and Active Thread establish/clear/delete-on-complete:

- Initiating client: `persist` / `onTasksChanged` → `reloadToken` → `loadOpenTasks` + `loadActiveThread`.
- Other active clients: Realtime Class-A notice → coalesced `requestCanonicalReload` → same loaders → `OrientView` projects.

Realtime is awareness only; authority is the canonical reread (`CROSS-CLIENT-COHERENCE-001.md`, publication contract). An action-list Complete would converge the same way as today’s thread Complete. No second store is required for multi-client consistency.

---

## 10. Desktop ownership findings

Desktop uses the same bezel reach under the field (`data-form="desktop"`), with Present/Day composition in `DesktopReading`. Do **not** assume phone topology should copy to desktop.

| Capability | Natural desktop owner today |
| --- | --- |
| Resolution / question | Same `data-question-control` / `QuestionList` |
| Anchor / date | Same `data-position` + field / Landscape |
| Context focus | Same `data-focus-control` |
| Capture / Add | Same `data-capture-control` → `CaptureSurface` (drawer) |
| Task access / completion | `data-desktop-thread` on Present/Day; bezel thread on Week/Month; `ThreadSurface` |
| Fact creation | Day / Exact → `EstablishmentSurface` |
| Work schedule | Position “Manage Work schedule” + Work inspection → `WorkScheduleOperation` |

Semantic ownership is already shared. Phone reorganization of bottom gravity does not, by itself, force a desktop redesign. Desktop retains persistent spatial territory the phone lacks.

---

## 11. Genuine architecture gaps

### Semantic / domain

- Task **reopen / undo** not named; product meaning unresolved (P1 adjacency).
- Task **removal** named, unimplemented.
- Carry-forward undefined (including MustDo interaction).
- Recurrence / reminders / Pulse unresolved.
- Whether reschedule clears MustDo unresolved.

### Authority / writer

- No `reopenTask` (or equivalent clear-`completed_at`) writer.
- No Task delete writer (RLS allows DELETE; app does not).
- `TaskPatch` cannot express completion correction.

### Reachability

- All-day create/edit only via `/schedule` sections.
- Rich Task create fields only via `CapturePanel` (not production CaptureSurface).
- Complete / edit non-thread Task from a list: writers exist; production Complete UI is thread-detail-bound; `TaskCollection` is Start-only and nested under Thread.
- Destination / Priority create: writers, no UI (out of scope for this grammar unless explicitly added later).

### Presentation

- Four standing bezel peers vs three human intentions.
- No standing action-oriented open-Task projection on phone bottom.
- Open-task order not MustDo-first (presentation choice).
- Bezel thread suppressed on phone Present/Day (intentional de-duplication).

**Not gaps:** new Task table, calendar-event truth, inferred MustDo, second coherence channel, Present/Day merge, or AI ranking.

---

## 12. Production-readiness relationship

| Known remaining work | Intersection with this proposal |
| --- | --- |
| **Task completion reopen/undo (P1)** | Directly amplified: action list makes Complete easier and more frequent. Prefer naming reopen before standing one-click list completion. |
| **Civil-date correction of timed facts (P1)** | Orthogonal to bottom grammar; still required for ordinary placement correction. |
| **`/schedule` retirement** | Unblocks retiring the only all-day create UI unless all-day drafts are brought to `/` first. “Add” routing should not depend on `/schedule` long-term. |
| **All-day creation/edit reachability (P2)** | Center “Add” is incomplete for interval kinds until all-day is reachable on `/` or intentionally deferred. |
| **Carry-forward / remove / undo** | Action list must not invent carry-forward; remove/reopen remain separate boundaries. |
| **Recurrence / reminders / Pulse** | Out of scope; do not fold into action list. |
| **External temporal contract** | Orthogonal. |
| **Final hardening / acceptance** | Phone grammar is presentation + reachability on top of accepted field; does not replace hardening. |

---

## 13. Minimal implementation boundary

If product accepts this direction later, the **smallest plausible tranche** (not opened here):

1. **Do not** add tables, generic action items, or a second Task representation.
2. Reuse `loadOpenTasks`, `completeTask`, `updateTask`, `createTask` / `createNote`, `QuestionList` / `chooseQuestionNow`, `CaptureSurface` or a thin router into it, and Class-A reload.
3. Phone presentation: collapse standing bottom peers into intention-shaped reach that still opens existing surfaces (question list; add router; open-Task projection).
4. Action projection: promote an open-Task list that calls existing writers; MustDo-first sort as presentation only; Complete only after reopen policy is decided (or explicitly accept irreversible Complete).
5. Keep Present/Day/Week/Month semantics and place memory unchanged.
6. Keep desktop spatial ownership; do not mirror phone chrome by default.
7. Defer all-day create reachability to the `/schedule` retirement / all-day tranche unless Add must advertise all-day immediately.

Prefer resolving **named Task completion correction** (schema already allows null `completed_at`; needs product name + writer + Active Thread rules) before or with high-frequency list Complete.

---

## 14. Recommendation

**B. Small semantic gap should be resolved first.**

Why not A alone: the temporal viewpoint and Add router are already architecturally supported as interaction/reachability work (**A**-shaped). The proposed **right** intention—standing, low-friction Task completion—collides with the already-documented P1 that completion is one-click and irreversible. That is a small semantic/writer gap relative to inventing new architecture, but it should be resolved (or explicitly accepted) before the action list makes mistaken Complete cheap and frequent.

Why not C: canonical Task, MustDo, writers, projections, Active Thread triggers, and Class-A reread already exist. No significant new domain architecture is required for the grammar itself.

Why not D: the proposal does not require collapsing sovereign types, inventing availability from absence, replacing MustDo with inference, or merging Present into Day—provided implementation stays within existing authorities.

**Summary stance:** compose the phone grammar from existing Orient truths; treat MustDo as the human pin; route Add to existing writers; project open Tasks for action; fix completion reopen semantics before celebrating frictionless Complete.

---

## Relationship to Orient principles

| Principle | Verdict |
| --- | --- |
| Human authority | Supported: MustDo, Capture, Start, Complete are human acts. |
| Deterministic truth | Supported: list and field reread the same rows. |
| Sovereign domain types | Supported if Add routes without a generic event type. |
| Unestablished ≠ available | Untouched if action list is Tasks, not empty timeline slots. |
| Temporal resolution | Supported if questions stay distinct under consolidated access. |
| Viewpoint provenance | Supported if places/provenance machinery is reused. |
| Established-truth correction | Tension: completion lacks correction path (P1). |
| Active Thread | Supported if list does not auto-establish thread. |
| Context focus | Supported as independent lens. |
| MustDo | Supported as human attention flag / pin treatment. |
| Canonical reread / Class-A | Supported for Task and thread changes. |
| Direct temporal manipulation | Orthogonal; remains field authority. |
| Phone continuity vs desktop spatial command | Supported: phone may reorganize reach without forcing desktop symmetry. |

No genuine contradiction from control placement alone. Genuine tension: high-frequency Complete without reopen.

---

## Files inspected

- `app/page.tsx`
- `components/orient/OrientInstrument.tsx`
- `components/orient/OrientView.tsx`
- `components/orient/Surfaces.tsx`
- `components/orient/grammar.ts`
- `components/orient/canonicalCoherence.ts`
- `components/orient/PhoneContinuity` / `DesktopReading` (via tests and prior contracts)
- `components/CapturePanel.tsx`, `components/TaskLoop.tsx`, `components/TaskEditForm.tsx`, `components/TaskFacts.tsx`
- `domain/task.ts`, `domain/taskEdit.ts`, `domain/capture.ts`, `domain/generalCapture.ts`, `domain/activeThread.ts`
- `persistence/contextsAndTasks.ts`, `persistence/contextTaskMapping.ts`, `persistence/contextTaskRows.ts`, `persistence/citedTaskIdentity.ts`
- `projections/today.ts`, `projections/resume.ts`, `projections/presentMomentOrientation.ts`, `projections/timeline.ts`, `projections/month.ts`
- `DOMAIN.md`, `PRODUCT.md`, `docs/data/DATA-001.md`
- `docs/decisions/2026-10-05-production-experience-design.md`, `2026-10-02-active-thread.md`, `2026-10-03-operational-adoption.md`
- `docs/implementation/ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md`
- `docs/implementation/CROSS-CLIENT-COHERENCE-001.md`, `CROSS-CLIENT-COHERENCE-DISCOVERY-001.md`, `CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md`, `CROSS-CLIENT-COHERENCE-REALTIME-READINESS-001.md`
- `docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md`, `PRODUCTION-UI-001.md`, `DAY-ANCHOR-PROVENANCE-001.md`, `TYPED-GENERAL-CAPTURE-001.md`, `TASK-EDIT-001.md`, `TASK-INTEGRITY-001.md`, `WORK-SCHEDULE-AUTHORITY-PATH-001.md` / acceptance
- `docs/discovery/FOUNDATION-002.md`

## Tests inspected

- `components/orient/orientView.test.tsx`
- `components/orient/phoneExperience.test.tsx`
- `components/orient/desktopReading.test.tsx`
- `components/orient/viewpointProvenance.test.tsx`
- `components/orient/canonicalCoherence.test.tsx`
- `components/orient/temporalOrigin.test.tsx`
- `persistence/contextTaskMapping.test.ts`, `openTasks.test.ts`, `activeThread.test.ts`, `blockTask.test.ts`, `citedTaskIdentity.test.ts`
- `domain/capture.test.ts`, `domain/taskEdit.test.ts`, `domain/generalCapture.test.ts`
- `projections/today.test.ts`, `projections/resume.test.ts`
- `components/taskEdit.test.tsx`, `components/generalCapture.test.tsx`

## Migrations inspected

- `supabase/migrations/20261002213000_context_and_task.sql`
- `supabase/migrations/20261002223000_active_thread.sql`
- `supabase/migrations/20261005020600_task_originating_note.sql`
- `supabase/migrations/20261005092200_block_task.sql` (Block↔Task citation; does not redefine Task completion)
- `supabase/migrations/20261006235000_class_a_realtime_publication.sql`

## Unresolved questions

1. Should production accept irreversible Complete on a standing action list, or must reopen be named and written first?
2. If reopen is named, does it re-establish Active Thread, leave thread empty, or offer Resume separately?
3. Should “Add” advertise all-day interval create before `/schedule` retirement brings those drafts to `/`?
4. Should production Capture gain `CapturePanel`’s optional Task fields, or stay title/expression-first with edit-after?
5. Is MustDo-first ordering the accepted presentation for the action list, or only a “Must do” badge without sort change?
6. Does Completing from the list require confirmation once Complete becomes high-frequency?
7. Should non-thread Task Complete remain reachable without Start (writer already allows), reversing today’s thread-detail coupling?
8. How should phone bottom treat Context focus and civil-date position if they leave permanent peer territory—contextual only, or still somewhere standing?

## Git status

```
On branch main
Your branch is up to date with 'origin/main'.
HEAD: c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a

(working tree clean at discovery start; this file is the only intended addition from this discovery)
```

End of discovery. No implementation performed.
