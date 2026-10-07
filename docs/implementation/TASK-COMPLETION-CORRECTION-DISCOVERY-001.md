# TASK-COMPLETION-CORRECTION-DISCOVERY-001

Discovery and semantic analysis only. No runtime behavior changed. No migrations. No UI. No commits.

Baseline: `c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a` on `main`.

Prior context: `MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md` identified irreversible Task completion as the principal blocker to a standing low-friction ACT projection. This record answers the narrower product question:

> What should it mean when the human says: “I marked this Task complete, but that was wrong. It is still open.”

This discovery does **not** authorize an implementation tranche. It names the smallest truthful correction model consistent with repository evidence.

---

## 1. Executive finding

**Yes. Orient can support truthful Task completion correction without schema change.**

The candidate semantic is consistent with repository evidence:

**Reopen / correct completion changes only `completed_at` from an instant to `null` on the same Task row.**

It does **not** automatically restore Active Thread.

Reason: Task open/closed state and current intention are already independent authorities (`tasks.completed_at` vs `active_threads`). Completing the cited Task deletes the thread by deliberate DB rule. There is no stored prior-thread history to restore. “This Task is not complete” does not mean “this is what I am doing now.” Resume/Start remains a separate explicit human act.

`completed_at` is already the open discriminator (`null` means open). Clearing it reconstructs the open Task from the preserved row. No migration, undo stack, audit log, or second Task state is required by existing product promises.

Open operational-adoption question 4 (“Can Task completion be undone or reopened?”) and the ESTABLISHED-TRUTH P1 remain the product gates; this record supplies the semantic answer those gates were waiting for.

---

## 2. Current completion path

Exact production path on `/`:

| Step | Location | Act |
| --- | --- | --- |
| 1 | `Surfaces.tsx` `TaskDetail` Complete button | `onComplete(task.id)` — one click, no confirm |
| 2 | `OrientView` → `actions.onCompleteTask` | Passes Task id |
| 3 | `OrientInstrument.onCompleteTask` | `persist(() => completeTask(client, taskId, new Date()))` |
| 4 | `toCompletionUpdate` (`contextTaskMapping.ts`) | `{ completed_at: ISO }` only |
| 5 | `completeTask` (`contextsAndTasks.ts`) | `UPDATE tasks … eq("id", id)` |
| 6 | Trigger `tasks_clear_active_thread_on_completion` | Fires when `completed_at` goes null → non-null |
| 7 | `clear_active_thread_on_completion` | `DELETE active_threads WHERE user_id AND task_id = completed Task` |
| 8 | `persist` success | `reloadToken++` |
| 9 | Class-A (optional parallel) | `tasks` UPDATE + `active_threads` DELETE → coalesced reread |
| 10 | Loaders | `loadOpenTasks` (`completed_at IS NULL`), `loadActiveThread` |
| 11 | Projections | `projectResume`, open lists, Today filter over open set |

`TaskPatch` / `updateTask` / `toTaskUpdate` never touch completion. There is no `reopenTask`. `TaskUpdateRow.completed_at` is typed as optional `string` only (not `null`) — an application typing gap for a future clear write, not a database gap.

Production Complete is thread-gated in UI (`TaskDetail` mounts for the current thread Task). Orphan `TaskLoop` can complete any open Task; same writer.

---

## 3. Completion consequences

### A. The completion itself

| Mutation | Detail |
| --- | --- |
| `tasks.completed_at` | null → supplied instant |

That is the entire application write.

### B. Deliberate consequences of completion

| Mutation | Detail |
| --- | --- |
| Active Thread row deleted | Only if that Task is the cited thread Task; same transaction; hard delete of the intention pointer |

Documented in `docs/decisions/2026-10-02-active-thread.md` and migration `20261002223000_active_thread.sql`.

### C. Derived projection consequences (after reload)

| Effect | Mechanism |
| --- | --- |
| Leaves open Task lists | `loadOpenTasks` filters `completed_at IS NULL` |
| Resume inactive | No `active_threads` row and/or Task not open → `projectResume` null |
| Leaves Today-tasks projection | `projectTodayTasks` requires open + planned civil day |
| Thread UI | Resume/thread reading becomes inactive |

### D. Irreversible / destructive

| Effect | Nature |
| --- | --- |
| Active Thread **row** | Hard deleted; no interruption/prior-thread history stored (decision: “No interruption history is stored”) |
| Task **row** | **Not** deleted |
| Product reopen | Absent → operational irreversibility of open-surface removal today |

### Unchanged by completion (not written)

`title`, `context_id`, `planned_on`, `due_on`, `must_do`, `origin`, `originating_note_id`, Block `task_id` citations, Month cited Task identity pairs. Month may still name a completed cited Task (`loadCitedTaskIdentities` does not filter `completed_at`).

---

## 4. Information preservation

### What survives completion (still on the Task row)

Everything needed to reconstruct an open Task except the open discriminator:

- id, title, context, planned, due, MustDo, origin, originating Note reference, created_at

### What is lost at completion

| Lost | Should reopen care? |
| --- | --- |
| Active Thread membership (row deleted) | **No** — intention is separate; no prior-thread store exists to restore truthfully |
| Ability to read “was this the thread?” after the fact | **No** — product deliberately stores no interruption history |

### If `completed_at` is later cleared to null

| Concern | Finding |
| --- | --- |
| Open Task reconstructable? | **Yes** — all open-relevant fields remain |
| Previous completion instant | **Cleared** with the column |
| Completion/reopen cycle history | **Not stored** today; clearing does not erase a promised audit trail because none exists |
| Docs treat `completed_at` as | **Both** current open/closed discriminator **and** the completion instant **while completed** (`2026-10-02-context-and-task-storage.md`: “`completed_at` null means open”; migration: “Null while open. When set, the instant…”) |

**No repository requirement** promises durable completion-cycle history, an audit log, or retention of mistaken completion instants after correction. Inventing an audit log for reopen is not required for truthful correction.

Clearing a mistaken `completed_at` is consistent with “that completion was wrong”: the instant should not remain as durable evidence that the Task is (or was truthfully) complete.

---

## 5. ActiveThread relationship

| # | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 1 | Explicit human authority? | **Yes** — Start | Decision, PRODUCT, DOMAIN, `establishActiveThread` |
| 2 | Task creation implies thread? | **No** | Capture/`createTask` do not write `active_threads` |
| 3 | `planned_on` implies thread? | **No** | Independent facts; resume tests |
| 4 | MustDo implies thread? | **No** | Same |
| 5 | Completion clears only cited Task’s thread? | **Yes** | Trigger `WHERE task_id = new.id`; `activeThreadAfterCompletion` |
| 6 | Remember prior thread after delete? | **None** | “No interruption history” |
| 7 | Auto-restore on reopen violate human authority? | **Yes** | Would invent intention without Start |
| 8 | Reopen leave open + expose Start? | **Yes** | Matches existing Start / `projectResume` |

### Evidence-backed decision

**Reopen must not restore Active Thread.**

After correction:

- Task is open again (`completed_at` null).
- `active_threads` stays absent (or stays pointing at some other open Task if a different Task was completed — production UI rarely hits that path).
- Operator may Start the reopened Task explicitly if it is current intention.
- That Start is a **new** establishment (`established_at` anew), which already matches recovery after Leave/Complete in existing docs.

**Hypothesis accepted:** completion correction and current-intention establishment stay distinct.

---

## 6. Semantic distinction

Architecture already supports keeping these acts distinct. Do not collapse them into one undo mechanism.

| Act | Meaning | Owner today | Writes |
| --- | --- | --- | --- |
| **Complete** | “This Task is done.” | `completeTask` | `completed_at` → instant; trigger may delete cited thread |
| **Reopen / correct completion** | “That completion was wrong; this Task is open.” | *unnamed; no writer* | Should be `completed_at` → null only |
| **Start / Resume** | “This is what I am doing now.” | `establishActiveThread` / `projectResume` | Thread upsert / projection |
| **Leave** | “I am not holding this intention.” | `clearActiveThread` | Delete thread; Task stays open |
| **Remove** | “This Task should no longer exist / participate.” | Named, unimplemented | Would delete Task (FK can cascade thread) |
| **Carry-forward / reschedule** | “Still open; temporal intention changes.” | Unresolved | Would touch plan/due (and maybe MustDo); must not establish thread |

Complete ≠ Reopen ≠ Start ≠ Remove ≠ Carry-forward.

---

## 7. Naming recommendation

Existing docs circulate “reopen” as the unnamed gap (`operational-adoption`, ESTABLISHED-TRUTH, TASK-EDIT exclusions). Product UI language for the forward act is **Complete**.

| Layer | Recommendation | Why |
| --- | --- | --- |
| Domain / writer | **`reopenTask`** | Symmetrical to `completeTask`; names the Task returning to open; already used in repo discovery language |
| Alternate domain phrase (docs) | “correct completion” | Clarifies meaning when “reopen” might be misread as Resume |
| Human-facing UI | Prefer **“Still open”** or **“Not complete”** over “Undo” | States corrected truth; avoids implying a generic undo stack |
| Avoid as primary name | “Undo completion”, “Mark incomplete” | Undo suggests stack; “incomplete” sounds like a third status |

Orient meaning to preserve: **correction of a false completion claim**, not restoration of intention, not removal, not reschedule.

Internal writer `reopenTask` + human copy that says the Task is still open is consistent.

---

## 8. Writer recommendation

Smallest future authority boundary (not implemented here):

| Question | Recommendation |
| --- | --- |
| Own named writer? | **Yes** — `reopenTask(client, id)` |
| Expand `TaskPatch` with `completedAt`? | **No** — would let ordinary edit mutate completion and blur authority |
| Symmetrical with `completeTask`? | **Yes** — Complete sets instant; Reopen clears to null |
| Mapping helper | e.g. `toReopenUpdate()` → `{ completed_at: null }` (mirror `toCompletionUpdate`) |
| Touch Active Thread? | **No** — do not call `establishActiveThread` or invent restore |
| RLS | Already grants owner `UPDATE` on `tasks` |
| Migration | **None** — column already nullable; triggers only fire on null→non-null |
| Reload / coherence | Same as Complete: `persist` → `reloadToken`; Class-A already observes `tasks` UPDATE (and does not need a new binding for reopen). Active Thread unchanged on reopen → no thread DELETE/INSERT from this act |
| Failure | Match existing writers: throw; `persist` does not increment token if write fails; canonical truth unchanged |
| Idempotence | Reopening an already-open Task: either no-op success or explicit reject; prefer fail-closed “Task is already open” only if product wants strictness — not required for truth |
| Reject Start on completed | Existing trigger already enforces; after reopen, Start works again |

Prefer explicit authority (`completeTask` / `reopenTask`) over generic patch power — matches `DATA-001` boundary style and ESTABLISHED-TRUTH preference for named acts.

Application typing note: `TaskUpdateRow.completed_at` currently optional `string` only; a future reopen mapping must allow SQL null. That is a TypeScript/persistence typing change, not a database migration.

---

## 9. Cross-client behavior

Scenario:

1. Phone completes Task → `completed_at` set; cited thread deleted.
2. Laptop Class-A / visibility reread → Task absent from open set; Resume inactive if that was the thread.
3. Phone reopens Task → `completed_at` null; **thread still absent**.
4. Laptop reread → Task returns to open set; Resume still inactive until some client Starts.

Existing Class-A bindings already include `tasks` INSERT/UPDATE and `active_threads` INSERT/UPDATE/DELETE (`canonicalCoherence.ts`). Publication includes those tables. **No coherence architecture change is required** for reopen-as-completion-correction.

If reopen does not restore thread (recommended): both clients converge on “open Task, no Active Thread” — truthful and consistent with Leave-then-open.

---

## 10. Action-list readiness implication

From `MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md`: a standing ACT projection of open Tasks with low-friction Complete needs a recovery path.

**Architecturally required before one-tap Complete is safe enough to expose frequently:**

1. Named product meaning for completion correction (this record).
2. Named writer `reopenTask` that clears `completed_at` only.
3. A reachable correction affordance from the same human workflow that can Complete (exact UI out of scope here).
4. Explicit rule: reopen does not Start the thread.

**Confirmation dialog:** not required by architecture if correction is immediate, truthful, and reachable. Confirmation is a presentation choice, not a semantic necessity. Prefer correction over friction when the correction path exists.

MustDo-first sort remains presentation-only and independent of reopen.

This discovery resolves the semantic blocker for ACT; it does not design the list.

---

## 11. Minimal acceptance matrix

Future tests / physical acceptance only (not implemented here):

| # | Case | Expect |
| --- | --- | --- |
| 1 | Open Task → Complete | Leaves `loadOpenTasks` / open projection |
| 2 | Complete current Active Thread Task | `completed_at` set; `active_threads` row deleted; Resume inactive |
| 3 | Completed Task → Reopen | Returns to open projection; same id |
| 4 | Reopen after cited completion | Does **not** recreate `active_threads` |
| 5 | Reopen preserves | title, context, planned, due, MustDo, origin, originating Note id |
| 6 | Block citing Task | Remains intact across Complete and Reopen |
| 7 | Cross-client Complete | Peer reread shows completed / open list without Task |
| 8 | Cross-client Reopen | Peer reread shows open Task; thread still absent unless Start happened |
| 9 | Failed reopen | Canonical row unchanged; no false open state |
| 10 | Start after reopen | Allowed; new `established_at`; Resume returns |

Optional edge: Complete a non-thread Task (if UI ever allows) leaves other thread intact; Reopen that Task does not touch the other thread.

---

## 12. Dependencies

| Parked / remaining work | Blocks reopen? |
| --- | --- |
| Task removal | **No** — different act |
| Carry-forward / reschedule | **No** |
| Recurrence / reminders / Pulse | **No** |
| `/schedule` retirement | **No** |
| All-day creation | **No** |
| External temporal sources | **No** |
| Direct temporal manipulation | **No** |
| Civil-date correction of timed facts (P1) | **No** — parallel |
| Mobile LOOK·ADD·ACT chrome | **No** — reopen unblocks ACT safety; chrome can follow |

**Keep this tranche narrow:** same-row completion correction + explicit Start remains separate.

Operational adoption still lists reopen among lifecycle gaps; naming and implementing this correction closes question 4 without solving remove/carry-forward.

---

## 13. Recommendation

**A. Reopen can be implemented as a bounded same-row correction with no migration.**

Why:

- Schema already represents open as `completed_at IS NULL`.
- Completion already preserves the Task row and all independent fields.
- Active Thread independence forbids auto-restore; that simplifies the writer.
- Class-A already observes Task UPDATE.
- No product promise requires completion-history retention that clearing would violate.
- Alternatives fail the evidence: **B** (history/schema first) invents stores the product refused; **C** (existing mechanism) — none exists; **D** (broader redesign) is unnecessary for this sentence of human truth.

**Accepted semantic (tested hypothesis):**

> Reopen corrects Task completion only (`completed_at` → null). It does not restore Active Thread. Start/Resume remains an explicit later act if the operator wants current intention.

---

## Files inspected

- `docs/implementation/MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md`
- `docs/implementation/ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md`
- `docs/implementation/TASK-EDIT-001.md`, `TASK-INTEGRITY-001.md`, `TASK-TIME-001.md`, `V0-002.md`, `V0-005.md`, `MONTH-001.md`
- `docs/decisions/2026-10-02-active-thread.md`, `2026-10-02-context-and-task-storage.md`, `2026-10-03-operational-adoption.md`
- `docs/data/DATA-001.md`
- `DOMAIN.md`, `PRODUCT.md`
- `domain/task.ts`, `domain/activeThread.ts`, `domain/capture.ts`
- `persistence/contextsAndTasks.ts`, `persistence/contextTaskMapping.ts`, `persistence/contextTaskRows.ts`, `persistence/activeThread.ts`
- `components/orient/OrientInstrument.tsx`, `OrientView.tsx`, `Surfaces.tsx`, `canonicalCoherence.ts`
- `projections/resume.ts`, `projections/today.ts`
- `components/TaskLoop.tsx` (orphan complete path)

## Tests inspected

- `persistence/contextTaskMapping.test.ts`
- `persistence/openTasks.test.ts`
- `persistence/activeThread.test.ts`
- `persistence/blockTask.test.ts`
- `persistence/citedTaskIdentity.test.ts`
- `domain/capture.test.ts`
- `projections/resume.test.ts`
- `projections/today.test.ts`
- `components/taskEdit.test.tsx`

## Migrations inspected

- `supabase/migrations/20261002213000_context_and_task.sql` (`completed_at`, `must_do` comments)
- `supabase/migrations/20261002223000_active_thread.sql` (open-task guard; clear-on-completion trigger)
- `supabase/migrations/20261006235000_class_a_realtime_publication.sql` (via Class-A contracts; `tasks` / `active_threads` publication)

## Unresolved questions

1. Human-facing label exact copy: “Still open” vs “Not complete” vs “Reopen” — presentation, not domain.
2. Where correction is first exposed (thread detail only vs action list vs both) — UI tranche.
3. Whether reopen of an already-open id is no-op or error — minor writer policy.
4. Whether a short-lived “just completed” presentation aid is desired — optional UX, not required for truth.
5. Task **removal** remains a separate named-but-unimplemented boundary; do not fold into reopen.

## Git status

```
On branch main
Your branch is up to date with 'origin/main'.
HEAD: c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a

Untracked (pre-existing from prior discovery):
  docs/implementation/MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md

Untracked (this discovery):
  docs/implementation/TASK-COMPLETION-CORRECTION-DISCOVERY-001.md
```

End of discovery. No implementation performed.
