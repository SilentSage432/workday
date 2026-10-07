# MOBILE-INTERACTION-REFINEMENT-001

Implements phone interaction corrections after physical experience of [MOBILE-LOOK-ADD-ACT-001.md](MOBILE-LOOK-ADD-ACT-001.md).

Baseline: `8b2deecd42abab70a43ff2e0d5767666fc53c2d1`.

No schema migration. LOOK · + · ACT primary grammar unchanged.

---

## Physical evidence that triggered correction

On production phone after LOOK · + · ACT deployment:

1. Layout was substantially easier; LOOK · + · ACT made sense.
2. LOOK hierarchy failed: a large **Close** row sat between “Where in time” operations and Focus, interrupting semantic continuity.
3. ADD → Task opened generic Capture (Quick + General / “This is a task”), re-asking an intention the human had already expressed.

Locked principle: once the human expresses an intention, Orient must not require them to express it again.

---

## LOOK hierarchy correction

LOOK surface order:

1. Header — LOOK / “Where am I in time?” + accessible header **×** (`data-surface-close`, aria-label “Close LOOK”)
2. Ask the field — Present / Day / Week / Month
3. Where in time — prev / next / Today / civil date (**no** Close, **no** Work/Sign out inline)
4. Focus — Everything + contexts
5. Operations — Manage Work schedule / Sign out

Close is surface-level dismissal only. Escape / outside dismissal unchanged. Desktop standalone `PositionSurface` still includes its own Close + operations.

---

## Direct Task creation

ADD → Task and ACT → Add Task open `DirectTaskSurface` (`data-direct-task`).

Composition: New Task · What needs doing? · When (planned day / planned clock / due) · Context · Must do · **Add Task**.

Uses existing `createTask` / `NewTask`. Title-only remains valid. Does not Start Active Thread. On success: `onTasksChanged` + dismiss so ACT projection can reread open Tasks.

Does **not** expose Quick/General Capture classification.

---

## Direct Note creation

ADD → Note opens `DirectNoteSurface` (`data-direct-note`): New Note · content · **Add Note**.

Uses existing `createNote` / `NewNote`. No Task-vs-Note decision.

---

## Generic Capture disposition

`CaptureSurface` remains for undeclared expression.

| Reach | After this tranche |
| --- | --- |
| Phone ADD → Task / Note | **Direct** create (not Capture) |
| Phone ACT → Add Task | **Direct** Task create |
| Desktop bezel Capture peer | **Still Capture** — human has not declared Task vs Note |
| Capture writers / Notes revisit | Unchanged infrastructure |

Generic Capture is appropriate only when the human has **not** already declared what the expression is.

---

## Task temporal semantics preserved

TASK-CLOCK-POINT-001: planned day optional; planned clock optional and only with day; clearing day clears clock; not duration; not Block; not capacity. Due remains independent civil deadline. MustDo remains optional human flag.

---

## ACT preservation

ACT ordering, inspect/edit, Start, Complete, Still open unchanged. New Tasks enter via existing open-Task reload.

---

## Desktop impact

No LOOK · + · ACT redesign. Desktop Capture peer retained. Phone ADD path uses direct create also when phone form is active under existing tests.

---

## Validation

Focused direct-create + LOOK/ADD/ACT + phone/desktop + persistence/edit/reopen/coherence suites; full suite; lint; typecheck; build.

---

## Explicit non-goals

No migration · no ACT redesign · no Time-on-the-day redesign · no Capture deletion · no timer/reminder/recurrence/notification/AI/Event/urgency/due-time/Task-duration/calendar/DTM · no physical acceptance document.
