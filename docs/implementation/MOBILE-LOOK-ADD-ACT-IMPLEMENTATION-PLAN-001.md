# MOBILE-LOOK-ADD-ACT-IMPLEMENTATION-PLAN-001

Bounded implementation plan only. No runtime behavior changed by this document. No migrations. No commits.

Accepted candidate baseline: `93c56818dfeae53daa5f477e157d6e63ef0d506b` (`TASK-CLOCK-POINT-001`).

Physical acceptance of Task clock-point is intentionally deferred. The operator could not readily find the Task interaction required to perform that acceptance on the production phone. That is direct evidence of an interaction-architecture failure. This plan reorganizes phone reach around **LOOK · ADD · ACT** before further Task physical acceptance.

Prior discovery and accepted correction:

- [MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md](MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md)
- [ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md](ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md)
- [TASK-COMPLETION-CORRECTION-001.md](TASK-COMPLETION-CORRECTION-001.md) / acceptance (Complete / Still open)
- [TASK-CLOCK-POINT-001.md](TASK-CLOCK-POINT-001.md) (automated/schema validated; physical deferred)
- [PRODUCTION-PHONE-EXPERIENCE-001.md](PRODUCTION-PHONE-EXPERIENCE-001.md)

---

## 1. Current production mobile interaction map

Production `/` → `OrientInstrument` → `OrientView`. Phone: `matchMedia("(max-width: 959px)")` → `data-form="phone"`. Fresh phone entry opens **Day** (not Present).

### Persistent / near-persistent reach

| Seat | What the operator sees | Where it lives |
| --- | --- | --- |
| Bezel row (always) | Question (Compass + Present/Day/Week/Month label) · Position (Locate + place word) · Context focus (Aperture + Focus label) · Capture (PenLine + “Capture”) | `.orient-reach[data-reach="bezel"]` → `.orient-reach-row` |
| Bezel Active Thread | Gold Resume / quiet absence line | Same bezel, **above** the row — **CSS-hidden** when `data-phone-reading="true"` (Present/Day reading) via `.orient[data-phone-reading="true"] > .orient-reach > .orient-thread { display: none }` |
| Composition Active Thread | Same thread words | `PhoneContinuity` `data-phone-thread` inside Present/Day reading |
| Exact time | “Exact time” | `PhoneContinuity` `data-region="reach"` — above bezel, only in Present/Day reading |
| Return to Now | Crosshair + “Now” | Floating when Now is off-edge (`data-return-now`) |
| Orientation | “Orientation” | Exact depth only (`data-orientation-return`) |

### What opens from those seats

| Seat | Opens |
| --- | --- |
| Question | `QuestionList` (“Ask the field”: Present / Day / Week / Month) |
| Position | `PositionSurface` (“Where in time”: prev/next/Today/date + Manage Work + Sign out) |
| Focus | `FocusList` |
| Capture | `CaptureSurface` (quick Task + general Note/Task + Notes revisit) |
| Thread (bezel or composition) | `ThreadSurface` (“Thread”: current Task detail when active; **Open tasks** toggle → `TaskCollection` Start-only) |
| Exact time | Depth `exact` on same civil day (Day canvas / establishment) |

### Where Tasks live today

Open Tasks are loaded (`loadOpenTasks`) and passed into `OrientView`, but the only production list UI is **`TaskCollection` nested under `ThreadSurface`**, behind:

1. Find Active Thread (composition on Present/Day; bezel on Exact/Week/Month), **or** open Thread somehow, **then**
2. Tap **Open tasks** (sometimes already expanded when no active/resume title), **then**
3. See Start-only rows — **no inspect/edit/complete from the list** without first **Start**ing into Active Thread, after which Complete/Edit appear on `TaskDetail`.

There is **no standing ACT seat**. Capture creates Tasks; it does not list them.

---

## 2. Exact reasons Task reachability currently fails

1. **No primary “what do I need to do?” home.** Tasks are subordinated to Active Thread (“what am I doing now?”).
2. **Default phone reading is Day.** Composition thread answers Resume, not “open Tasks.” Bezel thread is intentionally hidden on that reading, so the gold line is easy to miss as a Task gateway.
3. **List is two+ gestures deep** and labeled “Open tasks” inside “Thread,” not Tasks.
4. **Administration requires Start.** Edit, planned date, planned clock, MustDo, Context, and Complete are on `TaskDetail` for the **current thread Task**. `TaskCollection` only offers Start.
5. **Capture is the standing creation peer**, which trains “remember something” but not “see what I already established.”
6. **Four bezel peers + Exact time + conditional thread** crowd reach without giving Tasks a peer intention.
7. **Clock-point physical acceptance failed for this reason**, not because `planned_local` writers/UI fields are missing once inside edit.

Do **not** fix this with another isolated Task button bolted onto the current four-peer bezel.

---

## 3. Control-by-control classification of current mobile chrome

Legend: **A** LOOK · **B** ADD · **C** ACT · **D** contextual inside a resolution/surface · **E** secondary/settings/operations · **F** conditional · **G** obsolete/redundant as permanent chrome after reorganization.

| Current control | Class | Disposition |
| --- | --- | --- |
| Question (Compass / resolution) | **A** | Becomes LOOK primary |
| Position place readout + relocation | **A** (place) + **E** (Manage Work, Sign out nested today) | Place/relocation fold under LOOK; Work/Sign out stay operations |
| Context focus | **E** (or **D** inside LOOK sheet) | Leave permanent bezel; remain reachable |
| Capture | **B** (capability) / **G** (permanent peer seat) | Writers reused via ADD; remove standing Capture peer |
| Bezel Active Thread | **F** / **D** | Keep as intention chrome where shown; never become ACT |
| Composition Active Thread (`data-phone-thread`) | **D** | Remains in Present/Day reading |
| Exact time | **D** | Stays in Present/Day reading reach region |
| Return to Now | **F** | Unchanged behavior |
| Orientation (leave exact) | **D** | Unchanged |
| Thread “Open tasks” / `TaskCollection` | **C** (truth) / **G** (as Thread-gated home) | Promote into ACT; Thread stops owning the Task list home |
| TaskDetail Complete / Edit / Still open | **C** | Reuse from ACT inspect path (and Thread for current intention) |
| Day establishment (PT / Block / Commitment) | **B** (create) / **D** (timed selection on Day/Exact) | Routed from ADD; still established on the field |
| Work schedule operation | **E** / **B** (optional ADD route) | Keep via Position/operations; may appear in ADD chooser |

Persistent space must be earned by semantic relationship to LOOK / ADD / ACT. Peer permanence is not inherited.

---

## 4. Proposed LOOK ownership

**Human question:** “Where am I in time?”

**Owns access to:** Present · Day · Week · Month — without merging their meanings.

**Mechanism (smallest consistent with production):** LOOK left control opens the existing transient sheet hosting **`QuestionList`** (`chooseQuestion` / existing place memory / Present Today sample / `bringNow`). One tap per resolution, same as today.

**Also under LOOK (same sheet or one nested step — not four standing peers):**

- **Where in time** — reuse `PositionSurface` relocation (prev/next/Today/civil date). Resting LOOK label may show `QUESTION_LABEL[question]` (and optionally the short `positionWord` as secondary text if space allows without crowding).
- **Return behaviors** stay distinct: ask Present ≠ Today (`adoptToday`) ≠ Return to Now (`returnToNow`).
- **Context focus** — secondary action inside LOOK sheet (“Focus”) opening existing `FocusList`, **or** a single overflow/operations entry; not a fourth permanent peer.

**Does not own:** Task list, Capture, Start/Complete, Exact time (Exact remains depth into Day).

**Must not change:** remembered Day/Week/Month places; Present non-remembering; provenance; temporal precision rules; accepted Present/Day/Week/Month readings.

---

## 5. Proposed ADD ownership

**Human intention:** “I need Orient to remember something.”

ADD is a **router** to existing writers. It is not a store, not generic Event, not AI interpretation.

### Production create audit

| Type | Writer | Reachable from `/` today | Safe to expose in ADD v1 |
| --- | --- | --- | --- |
| Task | `createTask` | Yes — `CaptureSurface` | **Yes** |
| Note | `createNote` | Yes — `CaptureSurface` | **Yes** |
| Protected Time (timed) | `createProtectedTime` | Yes — Day Exact + `EstablishmentSurface` | **Yes**, via route into Day/Exact establishment (not a parallel form) |
| Block (timed) | `createBlock` | Same | **Yes**, same route |
| Commitment (timed) | `createCommitment` | Same | **Yes**, same route |
| All-day PT / Block / Commitment | same `create*` | **No** on `/` — `/schedule` sections only | **No** until all-day drafts exist on `/` (do not advertise falsely) |
| Work schedule | `saveWorkWeek` | Yes — Position → Manage Work | **Optional** in ADD (“Work schedule”) or leave under operations |
| Destination / Priority | writers, no production UI | No | **No** |
| Rich Task fields at create (context/planned/due/MustDo) | writer supports; `CapturePanel` only off `/` | No on production Capture | **Defer** — create title-first; edit on ACT |

### Smallest ADD composition

Center **+** opens a chooser: **“What are you adding?”**

Human-facing choices (no ontology jargon):

1. **Task** → existing `CaptureSurface` quick/general Task path (or focus quick Task section).
2. **Note** → existing Keep-as-note / general capture path.
3. **Time on the day** → ensure Day (ask Day if needed) + Exact time depth, then existing establishment (Protected Time / Block / Commitment). Copy may say those are chosen on the day field after +.
4. **Work schedule** (optional) → existing `WorkScheduleOperation`.

Do not invent a unified create document type.

---

## 6. Proposed ACT ownership

**Human question:** “What do I need to do?”

ACT is the **predictable standing home for canonical open Tasks**.

| ACT is | ACT is not |
| --- | --- |
| Projection of `loadOpenTasks` / open `tasks` rows | ActiveThread |
| One obvious reach from normal phone entry | A second Task store |
| Inspect / edit / Start / Complete / add Task | Every temporal fact (Work, Block, Commitment, PT) |
| Same writers: `updateTask`, `completeTask`, `reopenTask`, `establishActiveThread`, `createTask` | Urgency engine, archive, history |

At minimum ACT exposes: open Tasks · title · planned civil date · optional planned clock · MustDo · Context where useful · Start · Complete · inspect/edit · add Task.

---

## 7. Exact ACT Task projection and deterministic ordering

**Source:** `tasks` where `completed_at IS NULL` via existing `loadOpenTasks` (canonical open set). Presentation sort only — **do not** change the loader’s storage order contract unless a later tranche explicitly owns that.

**Deterministic display order** (no scores, no inferred priority, no AI):

1. **MustDo open Tasks** (`mustDo === true`), preserving relative `created_at` ASC, then `id` ASC.
2. **Planned for the current civil viewpoint date** — open, not MustDo, `plannedOn === viewpointCivilDate`, same tie-break.  
   - `viewpointCivilDate` = instrument `anchor` (Day/Week/Month place; Present’s sampled Today when Present is asked).  
   - This reuses the same civil date Orient already treats as “where I am looking,” not a new urgency notion. `projectTodayTasks` remains available as the filter primitive for “planned on this civil date.”
3. **Remaining open Tasks**, same `created_at` / `id` tie-break.

Optional within bucket 2 only: if two Tasks share the same `plannedOn`, order by `plannedLocal` ASC with nulls last, then `created_at`, then `id`. Clock order is field order, not “more urgent.”

**Do not:** sort by due as priority; invent “overdue” buckets; pin inferred MustDo; hide unplanned Tasks.

**Row display:** title; “Must do” when set; `Planned YYYY-MM-DD` and `at HH:MM` when `plannedLocal` set; Context name when `contextId` resolves; Start + select-to-inspect.

---

## 8. Task inspect / edit / Start / Complete / Still open interaction path

**From normal phone entry:**

1. One tap **ACT** → Act surface (open Task projection).
2. One tap a Task row → Task inspect (reuse `TaskDetail` behavior / edit draft authority).

**From inspect (without requiring Active Thread):**

- **Edit** → existing draft fields via `updateTask` / `taskPatchFromEditDraft` (title, Context, planned day, planned clock, due, MustDo).
- **Start** → `onStartThread` / `establishActiveThread` (explicit intention only).
- **Complete** → `onCompleteTask` / `completeTask`, then **immediate Still open** correction chrome for that same id (`reopenTask`) — extend the accepted ThreadSurface pattern onto ACT inspect so high-frequency Complete keeps the named correction path. Still open does **not** re-establish Active Thread.
- **Add Task** → ADD → Task, or a direct control on ACT that opens the same Capture Task path.

**Still open reach:** session-local correction on the Act/inspect surface just used for Complete — **not** a completion archive or history browser. Closing ACT clears the ephemeral correction opportunity (same integrity trade as closing Thread today); do not invent a completed-task browser.

**Thread path remains** for “what am I doing now?” (composition / conditional bezel). Starting from ACT may open or refresh thread chrome; it must not be required to edit or complete.

---

## 9. Planned date + planned clock interaction path

Authority already established by TASK-CLOCK-POINT-001:

| Shape | Fields |
| --- | --- |
| Task only | no `planned_on` / `planned_local` |
| Task + day | `planned_on` |
| Task + day + clock | `planned_on` + `planned_local` |
| Task + linked Block | Block interval separately; not encoded as Task clock |

**Path:** ACT → select Task → Edit → Planned (date) → Planned clock (`type="time"`, disabled until day set) → Save → `updateTask`. Clearing day clears clock. Moving day preserves clock when clock omitted from patch (existing writer rules).

Do **not** require Active Thread. Do **not** open Exact time merely to set Task clock. Do **not** auto-create a Block from clock.

Task-linked Block establishment remains Day/Exact field authority (ADD “Time on the day” or existing canvas).

---

## 10. MustDo / pin behavior

- MustDo remains the human-established `must_do` flag.
- ACT may label it “Must do” (existing copy) or presentational “pinned” language **without** a new column.
- Toggle only via Task edit → `updateTask({ mustDo })`.
- Bucket 1 sort is presentation of that flag — not Priority, not state machine, not inferred attention.

Unresolved product questions (carry-forward, reschedule clearing MustDo) stay out of this tranche.

---

## 11. ActiveThread relationship

| Concern | Rule |
| --- | --- |
| Owns | Explicit current intention (“What am I doing now?”) |
| Does not own | “What Tasks exist?” |
| Start | Only human Start from ACT or Thread list |
| Leave | Clears thread; Task stays open |
| Complete cited Task | Existing DB trigger clears thread; Still open does not restore thread |
| Phone Present/Day | Keep composition `data-phone-thread` |
| Exact / Week / Month | Keep conditional bezel thread **or** equivalent non-ACT intention seat |
| ACT | May show a quiet “Resume: …” affordance when a thread is active, linking to ThreadSurface — optional, not required for v1 if composition/bezel remain |

ACT must never auto-Start from MustDo, plan, due, or Capture.

---

## 12. Context-focus placement

- **Remove** from permanent bezel peer row.
- **Place** as secondary control inside LOOK sheet (preferred) or an operations overflow shared with Work/Sign out.
- Semantics unchanged: transient lens; does not write `anchor`; still emphasizes matching Context-bearing temporal facts.

---

## 13. Exact Time placement

- **Remains** contextual inside Present/Day phone reading (`data-exact-time` in `data-region="reach"`).
- **Not** a fifth primary nav item.
- ADD “Time on the day” may navigate into Exact as a **router outcome**, not a duplicate permanent control.

---

## 14. Current-position placement

- Standing Position peer **leaves** permanent chrome.
- Relocation lives under LOOK (“Where in time” → existing `PositionSurface` controls).
- Field / landscape readings continue to show civil dates as they do today.
- Resting LOOK control communicates resolution (+ optional compact place word).

---

## 15. Capture disposition

| Role | Decision |
| --- | --- |
| Writers / `CaptureSurface` | **Keep** — underlying implementation for Task/Note |
| Permanent bezel “Capture” peer | **Remove** (class G as peer) |
| ADD | Routes Task/Note into CaptureSurface (or focused subsections) |
| Contextual quick capture | Optional later; not required if ADD → Task is one obvious gesture |

Do not delete working Capture capability for visual symmetry.

---

## 16. Schedule / settings / account access

| Capability | Placement after reorganization |
| --- | --- |
| Manage Work schedule | Keep on Position/relocation surface under LOOK; optional ADD entry |
| Sign out | Same operations cluster (with Work), not permanent chrome |
| `/schedule` scaffold | Unchanged; not primary phone chrome; all-day drafts remain there until a later tranche |
| Account beyond Sign out | None today — do not invent |

---

## 17. Target bottom / reach composition

**One composition — not a five/six-item nav:**

```
┌──────────────────────────────────────────────┐
│  temporal reading (maximum field territory)  │
│  [Exact time]          ← Present/Day only    │
│  [composition thread]  ← Present/Day only    │
├─────────────┬──────────────┬─────────────────┤
│    LOOK     │      +       │      ACT        │
│  (Compass)  │   (Plus)     │   (ListTodo)    │
└─────────────┴──────────────┴─────────────────┘
```

| Control | Label | Icon (existing `lucide-react`) | Selected / expanded |
| --- | --- | --- | --- |
| LOOK | Current `QUESTION_LABEL` or “Look” + question | `Compass` (reuse) | `aria-expanded` when question/LOOK sheet open; `aria-current` optional for “looking” mode |
| ADD | visually center-emphasized **+** | `Plus` (already used in schedule sections) | Momentary; opens chooser; not a standing mode that replaces LOOK/ACT |
| ACT | “Act” or “Tasks” | `ListTodo` (already in scaffold `BottomNav`) | `aria-expanded` when Act surface open |

**Selected-state behavior:** LOOK and ACT are mutually exclusive expanded sheets (same `surface` machine as today). Opening one closes the other. ADD opens a short-lived chooser sheet (`surface.kind` extension). Field remains underneath; sheets stay `orient-surface` / borrowed drawer pattern — **do not** replace the temporal reading with a full-screen dashboard.

**Conditional chrome outside the triad:** Exact time, composition/bezel thread, Return to Now, Orientation — unchanged ownership.

---

## 18. Component reuse map

| Need | Reuse |
| --- | --- |
| Resolution chooser | `QuestionList`, `chooseQuestion` / place memory in `OrientView` |
| Relocation / Work / Sign out | `PositionSurface` |
| Context focus | `FocusList` |
| Task/Note create | `CaptureSurface` |
| Timed interval create | `EstablishmentSurface` + Day Exact selection |
| Work week | `WorkScheduleOperation` |
| Open Task rows | Promote/refactor `TaskCollection` |
| Inspect / edit / Complete | Promote/refactor `TaskDetail` + edit draft helpers |
| Still open | Same correction pattern as `ThreadSurface` |
| Writers | `createTask`, `createNote`, `updateTask`, `completeTask`, `reopenTask`, `establishActiveThread`, interval `create*`, `saveWorkWeek` |
| Open set | `loadOpenTasks` |
| Planned-for-date filter helper | `projectTodayTasks` (display composition only) |
| Icons | `Compass`, `Plus`, `ListTodo`, existing thread/Exact affordances |
| Coherence | Existing Class-A `tasks` / `active_threads` bindings |

New presentation: thin **ActSurface** (and possibly **AddChooser**) composing the above — not new persistence.

---

## 19. Files / components expected to change during implementation

| Area | Likely touch |
| --- | --- |
| Phone bezel chrome | `components/orient/OrientView.tsx` |
| Styles for triad / center + | `components/orient/orient.css` |
| Surfaces | `components/orient/Surfaces.tsx` — ActSurface, AddChooser; export/refactor TaskCollection / TaskDetail; ThreadSurface stops being sole Task list home |
| Types / surface kind | `components/orient/types.ts`, `Surface` union in OrientView |
| Grammar labels (if needed) | `components/orient/grammar.ts` |
| Phone reading (thread/Exact only if wiring ADD→Exact) | `components/orient/PhoneContinuity.tsx` |
| Instrument actions | `components/orient/OrientInstrument.tsx` only if new action wiring needed (prefer existing) |
| Tests | `phoneExperience.test.tsx`, `orientView.test.tsx`, new act-surface tests, capture/thread correction tests updated for paths |
| Docs | this plan’s acceptance record; brief PRODUCTION-PHONE / PRODUCT cross-links when implemented |

No schema migrations in this tranche.

---

## 20. Explicit components / semantics that must NOT change

- Present / Day / Week / Month meanings, place memory, provenance, Return to Now / Today / ask Present distinctions
- Accepted phone Present/Day readings and Day/Week/Month visual semantics (no redesign)
- Exact time as depth, not a fifth question
- Active Thread establishment rules and DB completion trigger
- Complete / Still open / Start separation ([TASK-COMPLETION-CORRECTION-001](TASK-COMPLETION-CORRECTION-001.md))
- `planned_on` / `planned_local` / Block independence ([TASK-CLOCK-POINT-001](TASK-CLOCK-POINT-001.md))
- MustDo as human flag (not Priority)
- Timeline kinds: Work, Protected Time, Block, Commitment — Tasks are not intervals
- Class-A canonical reread model
- Desktop spatial command identity (no mechanical phone mirror)
- No new Task store, generic Event, AI ranking, urgency score, timer, reminders, recurrence, notifications, calendar sync, phone DTM, schema changes

---

## 21. Desktop impact

Desktop already has: same bezel peers, Capture, Thread (composition on Present/Day; bezel otherwise), Day establishment, Position → Work/Sign out.

**Do not** mirror LOOK·ADD·ACT chrome mechanically.

**Minimal necessity:** ensure desktop Task administration is not *worse* than today. Preferred small fix in the same tranche if cheap: allow Task inspect/edit/complete from an open-Task projection **without** requiring Start — either by adding a desktop Act entry (e.g. bezel or Thread “Open tasks” upgraded to full inspect) **or** upgrading `TaskCollection` shared by Thread/ACT.

If desktop already reaches Tasks via Thread adequately for operators, preserve bezel layout and only share ActSurface internals. Identify residual desktop Task-nesting as **optional follow-up**, not a desktop redesign.

---

## 22. Implementation slices (dependency order)

| Slice | Deliverable | Depends on |
| --- | --- | --- |
| **0** | Freeze acceptance: this plan accepted; clock-point physical remains deferred | — |
| **1** | Phone bezel → LOOK / + / ACT shell; LOOK wires `QuestionList`; Capture/Focus/Position peers removed from permanent row; Position+Focus reachable from LOOK operations | 0 |
| **2** | ActSurface: ordered open Task projection; row → inspect; Edit via existing draft/`updateTask`; Start; Complete + Still open; Add Task → Capture path | 1, existing reopen |
| **3** | ADD chooser: Task / Note → CaptureSurface; “Time on the day” → Day+Exact; optional Work; do not advertise all-day | 1 |
| **4** | ThreadSurface: keep intention detail; demote “Open tasks” to secondary link into ACT or shared collection (avoid two competing homes) | 2 |
| **5** | Desktop: shared inspect-without-Start if needed; no phone-nav mirror | 2 |
| **6** | Automated tests + phone physical acceptance of LOOK·ADD·ACT; **then** resume TASK-CLOCK-POINT physical acceptance via ACT edit | 2–5 |

Slice 2 is the critical product fix for Task hunting.

---

## 23. Automated acceptance matrix

| # | Assertion |
| --- | --- |
| A1 | Phone form bezel exposes LOOK, ADD (+), ACT — not Capture/Focus/Position as permanent peers |
| A2 | LOOK opens Present/Day/Week/Month; choosing each preserves existing place/provenance behavior (reuse existing question tests) |
| A3 | ACT opens without Active Thread established; lists open Tasks from canonical source |
| A4 | ACT ordering: MustDo → planned-for-anchor → remaining; stable id/`created_at` ties |
| A5 | Selecting a Task opens inspect/edit; Save calls `updateTask` (planned day, planned clock, MustDo, Context) |
| A6 | Complete from ACT inspect offers Still open for same id; Still open calls `reopenTask`; does not Start |
| A7 | Start from ACT calls thread establishment only |
| A8 | ADD → Task/Note reaches existing create writers; no new persistence module |
| A9 | ADD does not offer all-day interval create until reachable on `/` |
| A10 | Present/Day phone reading still shows Exact time + composition thread; bezel thread remains suppressed on phone reading |
| A11 | Return to Now / Orientation / ask Present / Today behaviors unchanged |
| A12 | Class-A / reload stubs still cover Task + thread writes |
| A13 | No schema migration in tranche |

---

## 24. Physical phone acceptance matrix

| # | Operator check |
| --- | --- |
| P1 | From cold phone entry (Day), without hunting: one tap ACT shows open Tasks |
| P2 | One tap a Task opens inspect/edit |
| P3 | Set planned day + planned clock + MustDo + Context; Save; reread shows them — **this unblocks TASK-CLOCK-POINT physical** |
| P4 | Complete → Still open restores open Task; thread not auto-restored |
| P5 | Start establishes Resume; Leave clears intention; Task remains on ACT |
| P6 | ADD → Task creates; appears on ACT after reload |
| P7 | LOOK switches Present/Day/Week/Month without losing accepted reading character |
| P8 | Exact time still reachable from Present/Day reading; Orientation returns |
| P9 | Focus and civil relocation still reachable without permanent peers |
| P10 | Operator never needs Active Thread merely to find or edit Tasks |

---

## 25. Risks / unresolved implementation questions

1. **LOOK sheet density** — QuestionList + Position + Focus in one sheet vs nested steps; prefer one sheet with clear sections to avoid a second hunt.
2. **ADD “Time on the day”** — how much guidance before Exact selection; must not invent a form that bypasses canvas establishment.
3. **All-day create** — intentionally omitted from ADD until `/` hosts drafts; operators may still need `/schedule` for all-day.
4. **Ephemeral Still open** — clearing ACT loses correction opportunity; acceptable per existing Thread pattern; confirm product acceptance for ACT.
5. **ACT vs Thread dual homes** — demote Thread’s Open tasks carefully so Start-from-thread remains possible without two divergent list UIs.
6. **Desktop Act** — how minimal to keep scope phone-first.
7. **Label copy** — “Act” vs “Tasks”; prefer human clarity (“Tasks”) if “Act” is jargon; grammar name remains ACT in architecture.
8. **Center + hit target** — must stay obvious with thumb reach and safe-area; CSS emphasis without five-item crowding.
9. **Working tree** — candidate commit is clean baseline; local uncommitted TASK-CLOCK-POINT edits may already be present in the operator’s tree and should be reconciled before implementation starts.

None of these block the semantic readiness of LOOK·ADD·ACT composition from existing authorities.

---

## 26. Final verdict

### READY TO IMPLEMENT

**Why not blocked:**

- Canonical Task, writers, open load, MustDo, planned day, planned clock, Complete, **Still open / reopen**, Active Thread, Capture, QuestionList, establishment, and Class-A reread already exist.
- Prior grammar discovery’s reopen gap is closed and physically accepted.
- Clock-point schema/UI fields exist; failure was **reachability**, which this plan addresses by making ACT the standing Task home and inspect/edit independent of Active Thread.
- All-day ADD advertising is an explicit non-goal for v1, not a blocker for Task reachability.

**Implementation must not** add isolated Task buttons, new stores, or temporal-reading redesigns. Ship slices 1–2 first; resume Task clock-point physical acceptance only after P1–P3 pass.

---

## Relationship to Orient principles

| Principle | Plan stance |
| --- | --- |
| Human authority | LOOK / ADD / ACT are human intentions; Start / Complete / MustDo remain explicit |
| Deterministic truth | ACT projects open Tasks; sort uses stored fields only |
| Sovereign types | ADD routes; no generic Event |
| Temporal resolution | LOOK access only; meanings preserved |
| Active Thread | Intention ≠ Task inventory |
| Established-truth correction | Still open retained on ACT Complete |
| Phone continuity vs desktop spatial command | Phone chrome reorganized; desktop not mirrored |

---

## Files inspected for this plan

- `components/orient/OrientView.tsx`, `Surfaces.tsx`, `PhoneContinuity.tsx`, `orient.css`, `grammar.ts`, `OrientInstrument.tsx`, `types.ts`
- `components/BottomNav.tsx`, `TaskEditForm.tsx`
- `persistence/openTasks.test.ts`, `reopenTask.test.ts`, `contextsAndTasks.ts` (via docs)
- `projections/today.ts`
- `docs/implementation/MOBILE-INTERACTION-GRAMMAR-DISCOVERY-001.md`, `ACT-TASK-TIME-RELATIONSHIP-DISCOVERY-001.md`, `TASK-COMPLETION-CORRECTION-001.md`, `TASK-CLOCK-POINT-001.md`, `PRODUCTION-PHONE-EXPERIENCE-001.md`
- `DOMAIN.md` (Task / Active Thread / MustDo / Today)

## Git posture at plan write

- Intended baseline: `93c56818dfeae53daa5f477e157d6e63ef0d506b`
- This document is the only deliverable of this planning turn
- **Do not commit** this plan unless explicitly requested

End of plan. No implementation performed.
