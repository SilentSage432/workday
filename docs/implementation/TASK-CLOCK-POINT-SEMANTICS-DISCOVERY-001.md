# TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001

Discovery only. No runtime behavior changed. No migrations. No UI. No commits for this record.

Baseline after Phase 1 closeout: `cf36c3717e05bd8fd81c4b72e50b82e55801165b` on `main` / `origin/main`.

Prior committed discovery: [ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md](ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md) (verdict B: ACT mostly composable; clock-point without duration unresolved).

Core question:

> Is “do this Wednesday at 2 PM” a truthful temporal statement Orient should be capable of remembering without forcing the human to invent duration?

---

## 1. Executive finding

**Yes — Orient needs a first-class concept of Task clock-point intention.**

That concept does **not** exist today.

| Statement | Representable today without overclaim? |
| --- | --- |
| Civil-date intention | Yes — `Task.planned_on` |
| Temporal territory (start–end) | Yes — Block / Commitment / Protected Time / Work shift |
| Clock-point intention (local time, no end) | **No** |

No existing type can truthfully store “I intend to do/start this at 2 PM” **without** also claiming interval territory (Block/Commitment/Protected Time all require start **and** end) or discarding the clock (`planned_on` only).

Equal start/end clocks on timed facts are **not** zero-duration points — they mean a **24-hour continuation** into the next civil date (`timed*EndsNextCivilDate`, direct-temporal-manipulation readiness). Using a Block to fake a point would **violate** Block overnight/duration semantics and invent territory.

Therefore the ACT boundary question resolves as: **date + single local time can be a complete Task temporal statement** once clock-point intention is named and owned. It must **not** auto-create a Block, invent duration, consume Capacity, or Start Active Thread.

This is a **bounded missing Task temporal precision**, not a generic Event, not a Reminder (unresolved and different), and not a reason to redesign Block/Commitment.

---

## 2. Existing temporal vocabulary

| Type / surface | Can it mean “intend to do/start at 2 PM” without claiming 2 PM→later territory? |
| --- | --- |
| Task | Action required. No clock field. |
| `planned_on` | Civil-day intention only. Clock discarded if only this is used. |
| `due_on` | Civil-date deadline. Not planning clock. Not an instant (DATA-001). |
| Block | Chosen purpose over a **timed interval** (or all-day). Requires start+end when timed. Territory. Optional Task cite. |
| Commitment | Constrained time over a **timed interval** (or all-day). Requires start+end when timed. No Task cite. |
| Protected Time | Unavailable for allocation over an interval. Territory / exclusion. Not an action. |
| Work schedule | Shift / Off / unknown for a civil day. Boundary context, not Task intention. |
| Active Thread | Current intention pointer. Explicit Start. Not a schedule clock. |
| Present / authoritative Now | Instant orientation over facts that **contain** Now. Does not store Task clocks. |
| Day / Week / Month | Project established temporal **structure** (Work, PT, Commitment, Block). Ordinary Tasks / `planned_on` are not territory. |
| Exact Time | Depth into the Day clock canvas — resolution/navigation, not a Task field. |
| Direct temporal manipulation | Moves/resizes timed **interval** facts; preserves duration; equal clocks ≠ point. |
| Reminder | Named in product/docs as the place for “time of day that needs attention”; **not stored**. Different from planning intention (notification vs when I intend to act). |

**Audit conclusion for “I intend to do/start this at 2 PM” without territory:** none of the above can hold that truth today.

---

## 3. Point vs interval

Orient already distinguishes, or can distinguish:

| Concept | Existing? | Carrier |
| --- | --- | --- |
| CIVIL-DATE INTENTION — Task belongs on a date | **Yes** | `Task.planned_on` |
| TEMPORAL TERRITORY — start/end established | **Yes** | Timed Block / Commitment / Protected Time; Work shift as boundary |
| EXTERNAL/PERSONAL COMMITMENT — obligation at established time | **Yes** (interval form) | Commitment (still requires end when timed) |
| CLOCK-POINT INTENTION — action intended to begin/occur at a local clock | **No** | — |

Absence of CLOCK-POINT INTENTION is **not** a reachability issue. Writers and UI cannot expose what the model cannot store. It is a **genuine bounded semantic gap** exposed by ACT’s need for high-frequency Task temporal establishment — and by ordinary human statements that name a clock without naming an end.

**First principle (accepted here as discovery stance):** Orient must not display more temporal precision than established truth supports, and must not invent temporal territory from a clock point. A point and an interval are different truths.

---

## 4. Example classification

### Six product-utility examples

| Example | Forced end/duration? | Day-only `planned_on`? | As Commitment? | As equal-clock Block? | Classification |
| --- | --- | --- | --- | --- | --- |
| Call Mom at 6 PM | Distorts (call isn’t a reserved band) | Discards 6 PM | Overstates obligation | Violates Block = 24h if equal clocks | **Clock-point Task intention** (missing) |
| Order prescription at 9 AM | Distorts | Discards 9 AM | Overstates | Violates | **Clock-point Task intention** (missing) |
| Submit report at 3 PM | Distorts unless human also reserves work time | Discards 3 PM | Wrong type | Violates | **Clock-point** ± optional later Block |
| Check oven at 5:30 PM | Strongly distorts | Discards precision | Wrong | Violates | **Clock-point Task intention** (missing) |
| Put trash out at 8 PM | Distorts | Discards | Wrong | Violates | **Clock-point Task intention** (missing) |
| Start laundry at 7 PM | Distorts | Discards | Wrong | Violates | **Clock-point** (start intention, not territory) |

Requiring invented duration for these would force false territory. Reducing to day-only would discard human-established precision. Treating them as Commitments would overstate “constrained by commitment.” Zero-duration/equal-time Blocks are **not available** as points under existing overnight rules.

### Six statement distinctions (from the brief)

| # | Statement | Truthful representation **today** |
| --- | --- | --- |
| 1 | Call dentist Wednesday. | Task + `planned_on` = Wednesday. |
| 2 | Call dentist Wednesday at 2 PM. | **No complete truthful store.** Closest incomplete: Task + `planned_on` (loses 2 PM). Forcing Block/Commitment invents end and type. |
| 3 | Call dentist Wednesday from 2 PM to 2:30 PM. | Task + timed Block citing Task (territory). Purpose human-authored. |
| 4 | I have a dentist appointment Wednesday at 2 PM. | **Commitment** if human means constrained obligation — but timed Commitment still needs an end today. Point-only appointment is also incomplete for Commitment storage. Not a Task by that wording. |
| 5 | Protect Wednesday 2–3 PM for calling insurance. | **Protected Time** 2–3 (unavailability). Separate Task “call insurance” may exist; PT does not cite Task. |
| 6 | Start working on TeamLab at 2 PM. | Clock-point **intention** missing as Task precision; “Start” as Active Thread is a **different** explicit act and must not auto-fire at 2 PM. Optional Block if territory reserved. |

Meanings are **not** forced into one symmetry. (4) and (2) can look similar on a clock and still differ (Commitment vs Task intention) — commitments decision already states that.

---

## 5. Task ownership

If CLOCK-POINT INTENTION is named, the smallest semantic shape (conceptual only):

| Question | Answer |
| --- | --- |
| Task-owned truth? | **Yes** — it is precision on when the human intends to act on **that Task**, parallel to `planned_on` as day precision. |
| Block-owned? | **No** — Block is territory (purpose + interval). |
| Other existing relationship? | **No** adequate carrier. Reminder is unresolved and means attention ping, not planning intention. |
| Requires duration? | **No.** |
| Implies availability / Capacity consumption? | **No** (see §6). |
| Implies Active Thread? | **No.** |
| Implies Commitment? | **No.** |
| Implies MustDo? | **No.** |
| Alters due semantics? | **No** — due stays civil-date deadline; must not encode plan clock in `due_on`. |

Association with civil day: a local clock without a civil day is incomplete in Orient’s civil-time model. Conceptually it belongs **with date intention** (same Task, same planned civil day), not as a free-floating instant that replaces due. Exact column shape is **not** prescribed here.

Task-time contract remains: giving **territory** to a Task is still a Block citation. Clock-point would not put start/end/duration on the Task as territory coordinates.

---

## 6. Capacity implication

**Hypothesis confirmed by existing Capacity contract.**

Capacity utilization inside a Work boundary is covered by:

- Protected Time
- Commitment
- Block (including Task-associated Block — effect of the Block only)

Explicitly **do not** utilize:

> An open Task, `planned_on`, a due date, Must Do, Priority, the Active Thread, and a Note… None of them has a duration from this contract. No duration is inferred.

(`docs/decisions/2026-10-05-capacity-contract.md`; same in `CAPACITY-001.md`.)

A Task clock-point with no duration would have **no interval to cover**. It must **not** consume Capacity. Only an established utilizing interval fact would.

---

## 7. Projection implication

If a clock-point Task were legitimate:

| Resolution | May claim | Must not claim |
| --- | --- | --- |
| ACT / Task list | Task planned on date; intended clock (when set) | That time is reserved / busy / a band |
| Day | Optional **point** mark or Task-oriented annotation at that minute | Interval territory / lane occupancy as if a Block |
| Week / Month | Optional non-territorial annotation or omission at coarse resolution | Interval shape / utilization / “structure” as Block/Commitment |
| Timeline | Tasks remain non-intervals (current rule) unless a separate non-territorial channel is later defined | Composing a fake short Block |
| Capacity | No change from open Task / planned | Point as coverage |
| Exact Time | Depth into Day clock; may help place a point mark later | Not the storage of the point |

**A clock point must not visually masquerade as interval territory.** Final visuals are out of scope; the claim boundary is the deliverable.

---

## 8. Task ↔ Block relationship

Truthful progression (composition, not auto-sync):

```text
Task: "Call dentist"
  → planned date: Wednesday          (civil-date intention)
  → optional clock point: 2 PM       (clock-point intention — missing today)
  → optional Block: 2:00–2:30 PM     (temporal territory, may cite Task)
```

These are **not** competing identities if kept independent:

| Fact | Says |
| --- | --- |
| Clock point | When I intend to do/start the action |
| Block | What clock territory I chose for that purpose / Task |

**Coexistence:** Allowed in principle (same pattern as `planned_on` coexisting with a Block on another day — contract already refuses auto-resolution of tension).

**Automatic synchronization:** Forbidden by task-time human-authority rules (no Block from `planned_on`, no `planned_on` from Block). Same rule should extend to clock-point ↔ Block.

**Product rule needed later (not invented here):** when both exist and disagree (point 2 PM, Block 3–4), Orient may show both truths; it must not silently rewrite either. Whether UI warns is presentation.

Neither supersedes the other by ontology: point is intention precision; Block is territory.

---

## 9. Editing / correction transitions

Conceptual trace (what truth changes):

| Transition | Task truth | Block truth |
| --- | --- | --- |
| Wednesday (date only) | `planned_on` = W; no clock | none |
| → Wednesday at 2 | same date + clock-point 2:00 | none |
| → Wednesday at 3 | clock-point → 3:00 | none |
| → Thursday at 3 | `planned_on` → Thu; clock 3:00 | none |
| → Thursday 3–3:30 | Task date/clock may stay; **new/updated Block** territory | Block create/update (cite Task) |
| → Thursday only | clear clock-point; keep `planned_on` Thu | Block removed or left (human choice — independent) |

ACT can stay intelligible if the editor treats:

- date / optional clock → **Task** patch
- start–end territory → **Block** write
- never one field that secretly means both

---

## 10. Due / MustDo / ActiveThread boundaries

| Concern | Rule |
| --- | --- |
| Due | Civil-date only today. “Intend at 2 PM” ≠ “due at 2 PM.” Encoding plan clock in `due_on` would corrupt deadline meaning (DATA-001 forbids stuffing time into `due_on`). |
| MustDo | Independent attention flag. Clock-point does not set or clear it. |
| Active Thread | Clock-point does **not** mean currently active. Reaching 2 PM must **not** establish Active Thread. Only explicit Start/Resume. No automatic execution. |

Repository evidence supports these independences for existing Task temporal fields; clock-point must inherit the same pattern.

---

## 11. ACT implication

**Principal product answer:**

Future ACT **can truthfully accept** as a complete Task temporal statement:

```text
Call dentist
Wednesday
2:00 PM
```

**without** requiring Start+End / Duration — **if and only if** clock-point intention is established as Task-owned precision that does not create territory.

ACT **must still require** interval (or Commitment / Protected Time) when the human’s meaning is territory, appointment constraint, or protection — those remain separate establishments.

ACT **must not**:

- invent an end to “complete” the clock
- auto-create a Block from date+time
- treat the phrase as Commitment without human choice when wording is ambiguous (e.g. “appointment”)
- conflate with due clock or reminders

Ambiguous natural language (“dentist at 2”) may still need a human choice between Task clock-point and Commitment — that is **routing when meaning is unclear**, not proof that clock-point itself is illegitimate for clear action phrases (“Call Mom at 6”).

---

## 12. Persistence impact

Discovery only — **no migration authored.**

Supporting the semantic would require **schema + writer + mapping** work on Task (or an equally Task-owned carrier), because no column/type holds local clock planning intention today.

Smallest likely boundary (conceptual):

1. Optional local clock precision associated with the Task’s planned civil-date intention.
2. Named create/update path that cannot set completion, thread, Block, Commitment, or Capacity.
3. Clear-null independent of `planned_on` / `due_on` / `must_do` (exact nulling rules = product later).
4. Projections updated so open-Task reads expose the field; Timeline/Capacity unchanged in utilization rules.
5. No Block/Commitment schema change required for the point itself.

Reminders, recurrence, due-instants, and timers remain **out of this boundary**.

---

## 13. Genuine risks

| Risk | Mitigation stance |
| --- | --- |
| Point drawn as a short Block band | Forbidden by precision principle |
| Auto Block / invented duration from ACT | Forbidden |
| Conflating with Commitment (“appointment”) | Keep types sovereign; ask when human meaning is constraint vs action |
| Conflating with due-at-clock | Keep `due_on` civil; do not overload |
| Conflating with Reminder | Reminder = attention ping (unresolved); clock-point = plan intention |
| Point + Block disagreement | Allow coexistence; no auto-sync (same as planned_on vs Block) |
| Capacity wrongly reduced | Do not treat point as utilizing coverage |
| Active Thread at clock time | No automation |
| Using equal-clock Block as “point” | Violates 24h continuation semantics — never |

---

## 14. Recommendation

**B. First-class Task clock-point intention is a legitimate bounded semantic gap and should be established before ACT implementation.**

Why B:

- Utility examples show humans routinely establish a clock without an end; forcing duration **distorts** truth.
- Day-only `planned_on` **discards** precision the human established.
- Commitment / Block / Protected Time **overclaim** territory or wrong meaning.
- Equal-clock Block is **not** a point under existing rules.
- Capacity contract already treats Tasks as non-utilizing — a point fits that stance.
- ACT’s high-frequency home needs to remember date+time without lying about calendar bands.

Why not A: Requiring interval for all clock precision forces invented territory and fights the first principle.

Why not C: No existing type holds the truth without overclaim or loss.

Why not D as the primary answer: Some phrases are ambiguous (appointment vs call), and ACT may ask **in those cases**; but the statement class “do this at 2 PM” is not inherently always ambiguous. Making Orient ask every time would punish clear action intention and still wouldn’t create a store for the answer “Task clock-point.”

**Ordering:** Name and store Task clock-point semantics (bounded tranche) before standing ACT promises date+time add. ACT chrome itself remains reachability/presentation on top of that truth.

---

## 15. Unresolved human-authority questions

1. Exact persistence shape (how local clock attaches to planned civil day; null/clear rules when date clears).
2. When ACT should offer Commitment vs Task clock-point for appointment-like wording (routing UX, not ontology of clock-point itself).
3. Whether Day/Week/Month show a non-territorial point mark in v1 of the semantic, or ACT-only first.
4. Whether a future due-instant (DATA-001 open question) is ever related — default: keep independent.
5. Reminder vs clock-point: confirm product never merges them when reminders are eventually named.

---

## 16. Repository evidence

### Docs

- `docs/implementation/ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md`
- `docs/implementation/TASK-TIME-001.md`, `CAPACITY-001.md`, `DIRECT-TEMPORAL-MANIPULATION-READINESS-001.md`
- `docs/decisions/2026-10-05-task-time-contract.md`, `2026-10-05-capacity-contract.md`, `2026-10-02-today.md`, `2026-10-02-blocks.md`, `2026-10-02-commitments.md`, `2026-10-02-context-and-task-storage.md`, `2026-10-05-week-contract.md`
- `docs/data/DATA-001.md`
- `DOMAIN.md`, `PRODUCT.md`
- Production Exact Time / Day notes in `PRODUCTION-PHONE-EXPERIENCE-001.md` / related

### Code

- `domain/task.ts`, `domain/block.ts`, `domain/commitment.ts`, `domain/protectedTime.ts`
- `projections/capacity.ts`, `projections/today.ts`
- `persistence/contextsAndTasks.ts`, `persistence/block.ts`
- Timed overnight predicates; selection minimum 15 minutes (`components/daySelection.ts`)

### Tests / migrations (via prior + spot check)

- Capacity / Block overnight / task-time tests already establish interval-only utilization and equal-clock continuation
- `supabase/migrations/20261002213000_context_and_task.sql` (`planned_on` / `due_on` comments; no clock plan field)

---

## 17. Git status

```
Phase 1 (completed before this discovery):
  Commit: cf36c3717e05bd8fd81c4b72e50b82e55801165b
  Message: ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001: establish Task temporal relationships
  Pushed: origin/main
  Tree clean after push; main == origin/main

Phase 2 (this file only; not committed per guardrails):
  Untracked: docs/implementation/TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md
```

### Timer boundary

Clock-point intention has **no required relationship** to a future timer. Timer must not justify this semantic. Default: **none**.

End of discovery. No implementation performed.
