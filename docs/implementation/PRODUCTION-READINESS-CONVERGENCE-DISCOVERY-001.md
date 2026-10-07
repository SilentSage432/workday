# PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001

Discovery only. No implementation. No commit.

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `2617a070171c59cd314c11a638c83a196793285d` |
| Tip message | `ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001: accept production all-day authority` |
| `main` vs `origin/main` | Identical at that SHA |
| Working tree | Clean at discovery start |

Evidence class: **repository fact** (`git rev-parse`, `git status`).

## 2. Canonical question

> What genuinely remains necessary before the operator can begin sustained real-world daily use of Orient, what can safely evolve from evidence gathered during that use, and what remains parked/future?

This is **not** “is every historical roadmap item done?” and **not** “does the app run?”

Distinguish from [docs/decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md): that contract defines **operational adoption** (depend on Orient without a knowingly incomplete parallel workflow). This discovery defines a practical **begin sustained real-world use** gate: can the operator rely on Orient during ordinary workdays and life without a known missing capability that **fundamentally breaks** the orientation/cadence loop.

## 3. Current product purpose

Reconstructed from canonical product docs and accepted production evidence. **No new purpose invented.**

### Directional statement (canonical)

From [PRODUCT.md](../../PRODUCT.md) and [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md):

> The system helps the user regain orientation in the lived present: which established temporal truths contain this instant, and which Task the user has explicitly established as their current intention.

Human purpose of reorientation (same sources): externalize intentions, remember what matters, return to an intended course after interruption by **restoring evidence**, not recommending action.

### Evaluated purpose facets (evidence)

| Facet | Repository evidence | Current product intent |
| --- | --- | --- |
| Orient to the present | [docs/decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md); production Present on `/` | Yes — Current Temporal Orientation + Active Thread |
| Position in day/week/month | Experience architecture; Week/Month contracts; accepted Present/Day/Week/Month readings | Yes — four resolutions |
| Preserve explicit intentions | Active Thread, Resume, Task Start | Yes |
| Preserve important Tasks | Tasks, Must Do, planned/due/clock-point | Yes |
| Recover after interruption | Resume / Active Thread; Capture/Notes | Yes (evidence restore, not interruption detection) |
| Established temporal commitments | Commitment primitive; Timeline composition | Yes for **Orient-established** Commitments |
| See what is coming up | Day/Week/Month landscapes; classifiers “upcoming” on scaffold lists | Partially — **Orient-established** facts and Tasks; not external calendars |
| Reminders/obligations where semantics exist | PRODUCT Reminder + Recurring Obligation named; no schema | Intended eventually; **not stored** |
| Work schedule truth | `work_schedule_days`; accepted Work authority path | Yes |
| Distinguish established vs unknown | Work Off ≠ missing; empty CTO ≠ free; integrity withhold | Yes |
| Reduce cognitive administration | Capture, LOOK·ADD·ACT, explicit Save | Yes for Orient-held truth; external re-entry remains administration |

Identity: Orient is a **temporal orientation instrument**, not a generic task list ([PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) non-goals).

Evidence class: **repository fact** (product/decision text). Acceptance of surfaces: **accepted physical evidence** where cited below.

## 4. Accepted capability baseline

Legend for classification:

- **implemented** — code/schema present on production path
- **automated validated** — tests/suite evidence in repo records
- **physically accepted** — dedicated acceptance doc or commit recording deployed physical exercise
- **partially accepted** — implemented with incomplete acceptance or known remainder
- **parked** — deferred by explicit record
- **historical/scaffold only** — old route/composition, not the instrument

| Capability | State | Evidence |
| --- | --- | --- |
| Present | Implemented + physically accepted (desktop Present; phone Present continuity) | [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md); phone experience records; LOOK·ADD·ACT acceptance |
| Day | Implemented + physically accepted | Same + Exact time / establishment |
| Week | Implemented + physically accepted (desktop Week landscape) | [DESKTOP-WEEK-ACCEPTANCE-001.md](DESKTOP-WEEK-ACCEPTANCE-001.md) |
| Month | Implemented + physically accepted (desktop Month) | [DESKTOP-MONTH-ACCEPTANCE-001.md](DESKTOP-MONTH-ACCEPTANCE-001.md) |
| Direction | Schema/projection + Month column; **no production establish UI** | [DIRECTION-REP-001.md](DIRECTION-REP-001.md); Month acceptance; `OrientView` direction inspect |
| Context / Focus | Seed contexts + Focus lens implemented | Multi-context contract; FocusList on LOOK |
| Work schedule authority | Implemented + physically accepted on `/` | [WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md](WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md) |
| Protected Time / Block / Commitment | Implemented + writers + production establish/inspect/edit/delete | Timeline; FactDetail; ADD all-day acceptance |
| All-day authority | Implemented + automated + **physically accepted** | [ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001.md](ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001.md) @ `1a28a38` / accepted HEAD `2617a07` |
| Timed authority | Implemented + civil-date correction | [TIMED-FACT-CIVIL-DATE-CORRECTION-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-001.md) |
| Civil-date correction (timed + all-day) | Implemented; timed by correction tranche; all-day via all-day authority acceptance | Same |
| Task creation | Implemented + ACT/ADD paths accepted | LOOK·ADD·ACT; refinement acceptance |
| Task planned date / clock / due / MustDo | Implemented; clock-point **physically accepted** | [TASK-CLOCK-POINT-ACCEPTANCE-001.md](TASK-CLOCK-POINT-ACCEPTANCE-001.md) |
| MustDo | Implemented | Task edit / ACT |
| Task Start / ActiveThread | Implemented | Thread / ACT Start |
| Task Complete / Still open | Implemented + **physically accepted** | [TASK-COMPLETION-CORRECTION-ACCEPTANCE-001.md](TASK-COMPLETION-CORRECTION-ACCEPTANCE-001.md) |
| Notes | Create + revisit implemented; edit/delete unresolved | NOTE-REVISIT / PROVENANCE scaffolds; production ADD → Note |
| LOOK · + · ACT | Implemented + refinement **physically accepted** | [MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md](MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md) |
| Phone interaction refinement | Physically accepted | Same |
| Desktop temporal reading | Physically accepted | PRODUCTION-DESKTOP-READING-ACCEPTANCE-001 |
| Cross-client coherence | Implemented + **physically accepted** | [CROSS-CLIENT-COHERENCE-001.md](CROSS-CLIENT-COHERENCE-001.md) |
| Capacity | Deterministic reading + Day remainder bands on `/`; not a full planning UX | CAPACITY-001; `OrientView` `composeWorkCapacityReading` |
| Direct temporal manipulation | Implemented (desktop Week); probe still mounted; **no formal physical-acceptance doc after correction** | Commits `8d001be`, `3bb26d9`, `c31c61b`; probe in `Landscape.tsx` |
| Production app identity / PWA | Manifest + icons implemented; install icon physical acceptance still required per identity doc | [PRODUCTION-APP-IDENTITY-001.md](PRODUCTION-APP-IDENTITY-001.md); `app/manifest.ts` |
| `/schedule` | Historical scaffold still reachable by URL | `app/schedule/page.tsx`; Orient tests assert no `/` link |
| Google Calendar / external temporal | Boundary designed; **not implemented** | ARCHITECTURE-001; `integrations/README.md` |
| Reminders / Pulse / recurrence | Named in product; **not implemented** | PRODUCT.md; DOMAIN.md; tests reject `recurrence` on writes |
| Gemini | Deferred / out of runtime; no Calendar publication path | Deterministic-intelligence + timeline decisions |

Do not infer acceptance from implementation alone. Items without acceptance docs are not marked physically accepted.

## 5. Sustained-use readiness definition

**Sustained real-world use** (this discovery): the operator can rely on Orient during real workdays and ordinary life without encountering a **known** missing capability that makes daily use **misleading**, **unsafe**, **structurally incomplete relative to current purpose**, or **unable to run the orientation/cadence loop**.

| Class | Meaning |
| --- | --- |
| **A — Blocker before sustained use** | Absence breaks truthfulness, safety, or core loop |
| **B — May evolve during sustained use** | Useful; real use will sharpen requirements; absence does not corrupt Orient truth |
| **C — Parked / future** | Outside current readiness boundary by design |

Not A merely because desirable. Not B merely because hard.

## 6. Current daily-use loop

Using **only** capabilities that exist today on production `/`:

1. **Open Orient** (PWA or browser) → authenticate (Supabase session).
2. **Morning / return orientation** — Present (desktop) or Day entry (phone) shows established truths containing Now + Active Thread when set.
3. **Temporal position** — LOOK → Day / Week / Month to see Work geometry, Protected Time, Blocks, Commitments across the span.
4. **Work schedule** — Manage Work / Work operation establishes or corrects the fiscal week (`save_work_week`).
5. **Tasks / MustDo** — ACT lists open Tasks; planned date/clock, due, MustDo, Start, Complete, Still open.
6. **Establish intentions** — ADD → Task / Note; Day Exact / Time on the day → Protected Time, Block, Commitment (timed or all-day).
7. **Start current intention** — Start → Active Thread; Resume after interruption.
8. **Correct truth** — FactDetail edit (civil date, clocks, all-day same-kind); Delete with confirm; Task Still open after Complete.
9. **Broader direction** — Month reads established Direction beside structure when Destination/Priority/service pairs exist (establish UI largely absent).

## 7. Where the loop breaks

Exact break points against the intended loop:

| Break | Nature |
| --- | --- |
| **External commitments invisible** | Anything that lives only in Google Calendar (or other external calendars) does not appear in Present/Day/Week/Month unless re-entered as Orient Commitments. |
| **No attention delivery** | Orient can store planned/due/MustDo/Commitments but does not pulse or notify when attention is useful. Operator must open the instrument. |
| **No recurrence** | Repeating Work/life obligations require repeated manual establishment (Work week save covers Work shifts; not general recurrence). |
| **“What is coming up?” incomplete for life outside Orient** | Day/Week/Month answer this for Orient-established facts + Tasks; they do not compose external evidence. |
| **Direction establishment thin** | Month can show Direction; production creation of Destination/Priority/service is not an ordinary daily path. |
| **DTM probe chrome** | Desktop Week still shows `DTM probe` UI when direct manipulation is on (`Landscape.tsx` `probing = words && directManipulation`). |
| **Zone confirmation orphaned** | Confirmed IANA zone save remains on `/schedule` `WorkSchedule` (`saveTemporalSettings`); production Orient surfaces do not relocate it. |
| **Task remove / Note edit-delete / generic undo / carry-forward** | Named or historical gaps; not required to run the loop if Complete/edit suffice. |
| **All-day ↔ timed conversion** | Deferred; same-kind correction accepted. |

None of these corrupt stored Orient rows by themselves. The **structural** incompleteness for multi-context life is external time + attention delivery.

## 8. External temporal contract findings

| Layer | State |
| --- | --- |
| Product boundary | External temporal source keeps provenance; Orient must not silently claim ownership ([TIME_MODEL.md](../../TIME_MODEL.md), [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)) |
| Architecture | Adapter under `integrations/`; separate external-fact store; domain sees source name, external id, interval, provenance ([ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)) |
| Operational adoption | Interoperability **boundary** required; **connecting every calendar not required**; Google may be first proof ([2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md)) |
| Code | `integrations/README.md`: “Google Calendar is not implemented.” No OAuth, no adapter, no external-fact table migration |
| Tests | Timeline tests forbid google/gemini coupling in projection source |

**Designed vs discussed:** Boundary rules and deferred store shape are **designed** in architecture/decisions. API, sync direction, conflict rules, and participation set are **explicitly undecided**. No stub adapter beyond the empty integrations folder.

## 9. Google Calendar findings

| Question | Finding |
| --- | --- |
| Connected? | No |
| Schema for external facts? | Anticipated in ARCHITECTURE-001 / DATA-001; **no migration** |
| Import/sync/export code? | None |
| Commitment origin | Only `user_created` |
| Product stance | User already uses Google Calendar; facts should later participate without duplicate entry as the only path |
| Write-back | Separate deferred decision; bidirectional sync not V0 / not required by adoption contract |

Evidence class: **repository fact**. Strategic desire for Gemini visibility: **operator-stated strategic intent** in this discovery brief (not a prior calendar publication contract).

## 10. Google Calendar sovereignty boundary

Supported by architecture (conceptual → intended adapter shape), **not** implemented:

```
External calendar truth
        ↓
explicit provenance / external-fact store (adapter only knows Google)
        ↓
Orient temporal observation / Timeline / (later) CTO when containing Now
```

And separately deferred:

```
Selected Orient-established temporal truth
        ↓
explicit publication contract (not designed in detail)
        ↓
Google Calendar
        ↓
external consumers (e.g. Gemini) — not Orient authority
```

| Concern | Repository stance |
| --- | --- |
| Observation | Anticipated; read deferred |
| Synchronization | Bidirectional sync **not** required; not “calendar sync” as one blob |
| Import | Must not copy into Commitment as user-owned |
| Canonical ownership | Orient owns Orient semantics; Google owns Google events |
| Publication | Write-back named as separate authority; not designed |
| Correction authority | External source keeps edit/delete when external (undecided detail) |
| Conflict handling | Undecided |
| Deletion | Adapter failure must not delete Orient rows |
| Provenance | Required and visible |

**Inference:** Sovereignty-preserving observation is architecturally supported. Publication-to-Calendar-for-Gemini is **compatible with** deferred write-back language but is **not** a designed contract yet.

## 11. Gemini visibility analysis

| Question | Finding |
| --- | --- |
| Repo anticipation of Gemini-through-Calendar? | Gemini appears as **deferred / excluded** from runtime and as “not introduced” for voice; **no** Calendar→Gemini publication design |
| Could Calendar be an external publication surface? | Architecturally plausible if Orient **publishes selected** facts with explicit contract; Google remains non-canonical for Orient |
| What could be published without surrendering authority? | Human-selected Orient Commitments/Blocks/Work-derived intervals — **inference**, not a decided set |
| Should Gemini ever be authoritative over Orient? | **No** — deterministic core locked ([2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md); adoption contract) |
| Direct Gemini integration required? | **No** for visibility-via-Calendar strategy |

**Strategic importance of Calendar beyond convenience:** Yes — Calendar can be (1) **observation** of external obligations into Orient orientation, and (2) optionally a **publication surface** for assistant visibility without AI inside Orient. Evidence for (1) is product/architecture. Evidence for (2) is architectural compatibility + **operator-stated intent**, not a written Orient contract.

## 12. Reminder / attention findings

| Exists | Does not exist |
| --- | --- |
| Product definition of Reminder (attention point; caregiving examples) | Reminder table/column/writer |
| Task planned/due/MustDo, Commitment intervals, CTO | Notification infrastructure, push, in-app reminder surface |
| Distinction: Reminder ≠ planned clock ([TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md](TASK-CLOCK-POINT-SEMANTICS-DISCOVERY-001.md)) | Automatic attention at useful moment |

**Can sustained use begin before active reminders/notifications?**  
**Yes**, for orientation-by-opening: Present/Day/Week/Month + ACT + Work schedule already restore evidence when the operator engages the instrument.

**When does absence prevent role fulfillment rather than reduce convenience?**  
When the job is **attention delivery** for time-critical established responsibilities (PRODUCT caregiving reminders) without the operator opening Orient. That is a **fulfillment gap for that sub-role**, not corruption of established Orient truth. Push is future per adoption contract; in-app Pulse/reminders are “required but unresolved” for **operational adoption**, classified here as **B** for beginning Orient-driven days, with caregiving attention as strategic pressure toward earlier reminder design during use.

## 13. Pulse findings

Pulse is a **named orientation moment**, distinct from a single-fact reminder ([PRODUCT.md](../../PRODUCT.md)). Architecture sketches `PulseProjection`. **No production Pulse**, no cadence, no in-app Pulse surface.

Classification: **C / B** — evolve from use; not a truth-corruption blocker for beginning daily Orient use. Operational adoption still lists Pulse as required-but-unresolved for *full* adoption; this discovery’s sustained-use gate does not treat it as A.

## 14. Recurrence findings

| Question | Answer |
| --- | --- |
| Canonical semantics? | Recurring Obligation + Occurrence named in DOMAIN / architecture |
| Schema/support? | **None**; writes reject `recurrence` property (domain tests) |
| Manual establishment enough to begin? | **Yes** for Work via accepted week save; life rhythms via repeated Commitment/Block/Task establishment |
| Classification | **B** (ergonomics from use) / not A |

## 15. `/schedule` findings

| Concern | Current truth |
| --- | --- |
| Reachable from `/`? | **No** in-app link (`orientView` tests) |
| Reachable by URL? | **Yes** — `app/schedule/page.tsx` + BottomNav Tasks/Schedule |
| Unique remaining authority | **Zone confirm/save** via `saveTemporalSettings` in `components/WorkSchedule.tsx` (`id="time-zone"`). Production Orient Position/LOOK exposes Manage Work + Sign out, not zone save |
| Work week writer | Also on production Work operation (accepted); `/schedule` is no longer unique for Work |
| All-day / kind change / civil date | Production `/` now covers all-day establish/correct/delete; `/schedule` sections remain alternate UI including kind change |
| Prevents sustained use? | **No** — cleanup debt + confusion if typed; unique zone path is friction for zone *change*, not daily loop if zone already confirmed |

Classification: **C** retirement cleanup; zone-save relocation **B** (or small hardening if zone change is needed before use).

## 16. Established-truth authority findings

After timed civil-date correction, all-day authority acceptance, Task Still open, Task clock-point, all-day establishment, and existing deletes:

| Establishable | Inspect | Correct | Remove/reverse |
| --- | --- | --- | --- |
| Timed PT/Block/Commitment | Yes | Yes (clocks + civil date) | Delete confirm |
| All-day PT/Block/Commitment | Yes | Same-kind + civil date | Delete confirm |
| Work week | Yes | Week operation | Day → unknown via week save |
| Task fields / Complete | Yes | Edit; Still open | **No Task remove writer** |
| Active Thread | Yes | Start / Leave | Leave (no undo) |
| Note | Revisit | **Edit/delete unresolved** | No |
| Direction / service pairs | Month/inspect thin | No ordinary establish/withdraw UI | Block delete blocked if service pair exists |
| All-day ↔ timed | — | **Deferred** | — |

**Readiness:** No remaining asymmetry found that **ordinarily** makes daily use unsafe or strands truth for the accepted field (prior P0 in ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY closed by later tranches for civil date, reopen, all-day). Residual: Task remove (named, unimplemented), kind conversion, Note mutate, Direction writers, generic undo — **B/C**, not A.

## 17. DTM findings

| Stage | Evidence |
| --- | --- |
| Initial candidate | `8d001be` DIRECT-TEMPORAL-MANIPULATION-001 |
| Physical failure | Recorded in DTM-001 / physical diagnostic |
| Diagnostic probe | `3bb26d9`; [DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md](DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md) |
| Corrected candidate | `c31c61b` DIRECT-TEMPORAL-MANIPULATION-002; arbitration correction doc; commit body: “Physical acceptance remains pending” |
| Formal acceptance doc after success | **Absent** in repository |
| Probe in tree | **Present** — `.orient-dtm-probe` whenever desktop Week + `directManipulation` (`OrientView` enables for `form === "desktop" && question === "week"`) |

**Repository fact:** Probe cleanup was required by the probe doc (“Delete the probe… after the physical reading”) and was **not** done.  
**Operator-stated history** in this brief (successful physical manipulation / parked working state) is **not** backed by an acceptance markdown at HEAD.

Classification:

- DTM feature: **partially accepted / parked working** — leave enabled only if operator accepts probe chrome; otherwise cleanup before calling production “clean”
- Probe cleanup: **A for hardening / production cleanliness** (user-visible diagnostic), not a domain-truth blocker
- Production-safe to leave enabled: **functionally** yes if Save still gates writes; **operationally** probe is inappropriate for sustained use chrome

## 18. Desktop findings

Accepted desktop Present/Day/Week/Month readings exist. Desktop organization revisit is expected by operator (**operator-stated**) and deferred in all-day acceptance.

Classification: **B** — sufficient for sustained use; refinement without blocking the learning phase. Evidence: acceptance docs; no repo claim that desktop layout blocks daily use.

## 19. Phone/PWA/reliability findings

| Area | Finding | Class |
| --- | --- | --- |
| Canonical `/` | Production instrument | OK |
| Auth | AUTH-BOOTSTRAP-RELIABILITY-001 in force | OK |
| Supabase session | Persisted email/password; no Calendar OAuth login | OK |
| PWA | Manifest standalone, icons; maskable deferred; install icon physical re-add may be needed | B polish |
| Phone viewport | LOOK·ADD·ACT accepted | OK |
| Cross-client | Physically accepted realtime reload | OK |
| Stale routes | `/schedule`, `/instrument` remain | C cleanup |
| Loading/error | Integrity withhold patterns for temporal + open tasks | OK / B harden |
| Visibility reconnect | Coherence visibility reread | OK |
| Service worker / offline | Explicitly deferred; **not** an established offline requirement | C |
| DTM probe | User-visible on desktop Week | Harden |
| Diagnostics | DTM probe is the clear production diagnostic remainder | Harden |

No invented offline requirement.

## 20. Data/migration/provenance findings

| Area | Finding |
| --- | --- |
| Migrations in repo | 14 SQL files under `supabase/migrations/`, including realtime publication and `task_planned_local` |
| Hosted alignment | Prior docs record human-applied publication and task_id / planned_local on canonical project; this discovery did **not** re-query hosted SQL |
| RLS | Owner policies on application tables (architecture + migrations) |
| Canonical writers | Production `/` uses shared persistence modules; `/schedule` shares many writers |
| Second sources of truth | No calendar cache; Direction service tables loadable but little production write UI |
| Provenance | Task←Note citation; Commitment origin; no external provenance rows |
| Integrity | P0-INTEGRITY / TASK-INTEGRITY closed silent truncation for named collections |

**No known integrity defect found that makes sustained use unsafe** at repository-evidence level. Hosted drift not re-verified in this discovery (label: **unknown without live query**).

## 21. “What is coming up?” assessment

| Source | Effectiveness today |
| --- | --- |
| Orient-established PT/Block/Commitment | Strong on Day/Week/Month + inspection |
| Tasks (planned/due/MustDo/clock) | Strong via ACT; not Timeline intervals |
| Work schedule | Strong when week entered |
| External commitments | **None** unless manually duplicated into Orient |
| Reminders | **None** |
| Recurring obligations | **None** as series; manual repeats only |

**Verdict of this test:** Orient answers “what is coming up?” well for **truth the operator has established inside Orient**. It answers poorly for **life already held in Google Calendar**. That gap is the primary strategic pressure for external temporal observation before the **intended multi-context** daily-use phase — distinct from whether Orient-only Work days can already run.

## 22. Readiness matrix

| Capability / gap | Current state | Before sustained use | During sustained use | Parked/future | Rationale |
| --- | --- | --- | --- | --- | --- |
| Google Calendar / external temporal contract | Boundary designed; no adapter | Strategic-pre-use for intended life loop* | Observation v1 may still deepen | Bidirectional sync, conflict productization | External obligations otherwise invisible |
| Gemini-through-Calendar visibility | Conceptual only | — | — | Yes (no Orient AI) | Publication surface optional after observation/publication contracts |
| Reminders | Unimplemented | — | Yes (cadence from use) | Push provider | Attention delivery; not truth corruption |
| Pulse | Unimplemented | — | Yes | Push-backed Pulse | Orientation moment; evolve from use |
| Recurrence | Unimplemented | — | Yes | Series/skip editors | Manual Work week + re-entry sufficient to begin |
| `/schedule` retirement | Scaffold remains | — | Cleanup | — | Not blocking; confusion debt |
| Zone-save relocation | Unique on `/schedule` | Harden if zone change needed | Relocate with retirement | — | Only unique `/schedule` authority found |
| All-day ↔ timed conversion | Deferred; writers exist on scaffold | — | Yes if needed | — | Same-kind authority accepted |
| Remaining established-truth authority | Task remove; Note mutate; Direction UI; kind convert | — | Yes | Generic patterns | No ordinary A asymmetry left |
| Carry-forward | Unresolved meaning | — | Yes | — | Semantics need use evidence |
| Generic undo | Not required | — | — | Yes | Still open / edit / delete confirm suffice |
| DTM probe cleanup | Probe still mounted | **Yes** | — | — | User-visible diagnostic |
| DTM feature enablement | Working candidate; formal acceptance doc missing | Document/accept or park chrome | Refine gesture | Phone DTM | Leave enabled after probe removal if Save-gated |
| Desktop organization | Accepted readings; revisit expected | — | Yes | — | Usable; not blocking |
| Final route cleanup | `/schedule`, `/instrument` | — | Yes | — | Debt |
| Auth/error/loading hardening | Bootstrap + integrity patterns | Light polish only | Yes | — | No known A defect |
| Cross-client reliability | Physically accepted | — | Monitor | — | Already at acceptance |
| External calendar conflict/provenance semantics | Undecided detail | Discovery with Calendar tranche | — | Full conflict product | Must not collapse into “sync” |
| Final production acceptance/hardening | Many tranche acceptances; no single “daily use” gate doc | Short physical pass after probe (+ Calendar if chosen) | Continuous | Operational adoption remainder | Close cleanliness |
| Capacity planning UX | Remainder on Day | — | Yes | Allocators | Reading exists; not A |
| Direction establishment UX | Thin | — | Yes | — | Month reads; create path weak |
| Offline / service worker | Deferred | — | — | Yes | Never established as requirement |
| Task removal | Named, no writer | — | Yes | — | Complete covers most cases |
| Voice beyond device dictation | Dictation proven | — | — | App speech stack | Not blocker |

\*See §23–§25: Calendar is **not** a technical A-blocker for Orient-established Work days; it **is** strategically necessary for the intended multi-context “what is coming up?” loop.

## 23. Minimum path to daily use

Ordered sequence of work that **genuinely** belongs before calling the intended sustained-use phase open:

### Path statement (dual)

1. **Technically**, nothing in the Orient-established Work/Task/temporal loop **fundamentally** blocks beginning daily use after a small hardening pass (DTM probe cleanup; optional zone-save reachability).
2. **Strategically**, for the **intended** multi-context daily-use loop (life commitments already held in Google Calendar), **external temporal observation** should precede declaring that loop complete.

### Ordered minimum (governing intended loop)

1. **DTM probe cleanup**  
   - Why: user-visible diagnostic on production Desktop Week.  
   - Discovery first: no.  
   - Deps: none.  
   - Scope: remove probe UI/state/tests per BROWSER-PROBE-001; keep Save-gated DTM.

2. **External temporal observation discovery + contract** (Google Calendar first)  
   - Why: closes “what is coming up?” for external obligations without making Calendar Orient’s database.  
   - Discovery first: **yes**.  
   - Deps: sovereignty rules already in ARCHITECTURE-001.  
   - Scope: observation + provenance + participation set; **not** bidirectional sync; **not** Gemini; **not** import-as-Commitment.

3. **Bounded Calendar observation implementation** (post-contract)  
   - Why: adapter + external-fact store + Timeline (and later CTO-when-containing) composition.  
   - Discovery first: completed by step 2.  
   - Deps: OAuth server-side, migrations, RLS.  
   - Smallest truthful scope: read-only observation of selected calendars/events with visible provenance.

4. **Final production physical pass**  
   - Why: confirm daily loop on phone + desktop after probe removal and (if shipped) Calendar observation.  
   - Scope: acceptance record only.

### Explicitly not on the minimum path

Reminders, Pulse, recurrence, `/schedule` retirement, desktop reorganization, Gemini, carry-forward, generic undo, all-day↔timed conversion, offline/service worker, Direction full UX — **use-phase or parked**.

## 24. Use-phase learning backlog

Ordered: better learned from real use than pre-use speculation.

1. Desktop organization / density  
2. Reminder cadence and which facts deserve attention points  
3. In-app Pulse moments (open app, transitions)  
4. Carry-forward meaning (including Must Do)  
5. Recurrence ergonomics (Work vs life)  
6. Interaction density (LOOK·ADD·ACT refinements)  
7. All-day ↔ timed conversion UX  
8. Task remove vs Complete-only practice  
9. Note edit/delete/archive needs  
10. Direction establishment habits  
11. Capacity expression beyond Day remainder  
12. Zone-save relocation packaging with `/schedule` retirement  

## 25. Final convergence verdict

## READY-AFTER-EXTERNAL-TIME

**Why:** Internal Orient is sufficiently mature to run an Orient-established orientation/cadence loop (Present/Day/Week/Month, Work authority, temporal facts including all-day, Tasks with clock-point and Still open, LOOK·ADD·ACT, cross-client coherence). The **intended** daily-use loop is still **meaningfully incomplete** for multi-context life because external temporal awareness (Google Calendar observation with provenance) is absent: the operator cannot truthfully answer “what is coming up?” for obligations that already live outside Orient without duplicate entry.

**Also required as hardening (not the naming of the verdict):** remove the Desktop Week DTM probe before treating production chrome as sustained-use ready.

**Not chosen:**

- **READY-NOW** — probe chrome remains; intended “coming up” loop incomplete for external time.  
- **READY-AFTER-HARDENING** alone — understates Calendar’s role for the intended life loop (while still true that hardening is small and Calendar is not a data-corruption blocker).  
- **NOT-YET-READY** — would overstate remaining *internal* domain gaps; those are largely B/C.

**Dual statement required by this discovery:**  
Calendar is **not** a technical A-blocker that makes Orient-held truth unsafe. Calendar observation **is** strategically necessary before the intended multi-context sustained-use phase is complete.

## 26. Evidence references

### Product / architecture / decisions

- [PRODUCT.md](../../PRODUCT.md)
- [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)
- [TIME_MODEL.md](../../TIME_MODEL.md)
- [DOMAIN.md](../../DOMAIN.md)
- [docs/architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)
- [docs/data/DATA-001.md](../data/DATA-001.md)
- [docs/decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md)
- [docs/decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md)
- [docs/decisions/2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md)
- [docs/decisions/2026-10-02-boundaries-and-delivery.md](../decisions/2026-10-02-boundaries-and-delivery.md)
- [docs/decisions/2026-10-02-timeline-composition.md](../decisions/2026-10-02-timeline-composition.md)

### Acceptance / implementation

- [ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001.md](ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001.md)
- [MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md](MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md)
- [TASK-CLOCK-POINT-ACCEPTANCE-001.md](TASK-CLOCK-POINT-ACCEPTANCE-001.md)
- [TASK-COMPLETION-CORRECTION-ACCEPTANCE-001.md](TASK-COMPLETION-CORRECTION-ACCEPTANCE-001.md)
- [WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md](WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md)
- [PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md)
- [DESKTOP-WEEK-ACCEPTANCE-001.md](DESKTOP-WEEK-ACCEPTANCE-001.md)
- [DESKTOP-MONTH-ACCEPTANCE-001.md](DESKTOP-MONTH-ACCEPTANCE-001.md)
- [CROSS-CLIENT-COHERENCE-001.md](CROSS-CLIENT-COHERENCE-001.md)
- [CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md](CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md)
- [PRODUCTION-APP-IDENTITY-001.md](PRODUCTION-APP-IDENTITY-001.md)
- [ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md) (partially superseded by later corrections)
- [DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md](DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md](DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md)
- [WORK-SCHEDULE-AUTHORITY-PATH-CONTRACT-001.md](WORK-SCHEDULE-AUTHORITY-PATH-CONTRACT-001.md)

### Code / migrations (sampled)

- `components/orient/OrientView.tsx`, `Landscape.tsx`, `OrientInstrument.tsx`, `Surfaces.tsx`
- `components/WorkSchedule.tsx` (`saveTemporalSettings`)
- `app/schedule/page.tsx`, `app/manifest.ts`
- `integrations/README.md`
- `persistence/contextsAndTasks.ts` (`reopenTask`; no `deleteTask`)
- `supabase/migrations/*.sql` including `20261006235000_class_a_realtime_publication.sql`, `20261007100600_task_planned_local.sql`

### Evidence class key

| Label | Meaning |
| --- | --- |
| Repository fact | Present in source, tests, migrations, or docs at HEAD |
| Accepted physical evidence | Acceptance document / commit recording deployed exercise |
| Architectural inference | Compatible with architecture but not implemented or contracted in detail |
| Operator-stated strategic intent | Stated in this discovery brief; not a prior written Orient Gemini contract |
| Unknown | Would require live hosted inspection not performed here |
