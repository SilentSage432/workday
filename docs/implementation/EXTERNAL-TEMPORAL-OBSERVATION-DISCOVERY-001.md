# EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001

Discovery only. No implementation. No commit. No Google Calendar, OAuth, migration, or adapter code.

## Evidence class key

| Label | Meaning |
| --- | --- |
| Repository fact | Present in source, tests, migrations, or docs at HEAD |
| Physical acceptance evidence | Acceptance document / commit recording deployed exercise |
| Architectural inference | Compatible with architecture and decisions; not implemented or contracted in full detail |
| Operator strategic intent | Stated in the discovery brief or convergence brief; not a prior written Orient Gemini/publication contract |
| Provider-specific unknown | Requires Google (or other provider) documentation / adapter discovery; not established from this repository |

---

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `984a3709eab50f1a3a6cbef1ef031dfba305fc14` |
| Tip message | `DIRECT-TEMPORAL-MANIPULATION-ACCEPTANCE-001: accept production direct manipulation` |
| `main` vs `origin/main` | Identical at that SHA |
| Working tree | Clean at discovery start |
| Canonical convergence authority | [PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md](PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md) |
| DTM production acceptance | CLOSED (acceptance at this HEAD) |
| Next convergence-path item | This discovery: External Temporal Observation + sovereignty/provenance contract |

Evidence class: **repository fact** (`git rev-parse`, `git status`).

---

## 2. Canonical question

> What does it mean for Orient to observe temporal truth established by an external sovereign source without claiming ownership or correction authority over that truth?

And:

> What is the smallest external-temporal contract required so Google Calendar can later become Orient's first observation adapter without becoming Orient's database or domain model?

This is an **authority / provenance** discovery. Google Calendar is the first intended adapter. The contract describes the **relationship**, not Google semantics in Orient's core.

---

## 3. Existing external-time evidence

Legend for classification in this section:

- **A — canonical existing decision** — later architecture / adoption / code constraints treat as binding
- **B — architectural intention** — designed boundary, not implemented
- **C — historical idea** — earlier wording; do not silently promote
- **D — absent / unresolved**

### 3.1 Product / domain language

| Claim | Class | Evidence |
| --- | --- | --- |
| External temporal source supplies facts and keeps provenance; Orient must not silently claim ownership | **A** | [TIME_MODEL.md](../../TIME_MODEL.md); [DOMAIN.md](../../DOMAIN.md); [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md) |
| Google Calendar is the first identified external temporal source | **A** (identity of first source) | Same |
| User already uses Google Calendar; duplicate entry must not be the only path | **A** (product pressure) | PROJECT_CONTEXT |
| A Google Calendar event “may be represented as a Commitment” | **C → refined by A** | DOMAIN / TIME_MODEL / FOUNDATION-003 use Commitment wording; later ARCHITECTURE-001 and operational adoption require a **separate external-fact store** and forbid copying into user-owned Commitment |
| Reading and writing back are separate undecided authorities | **A** (separation) / **D** (neither chosen until this path) | TIME_MODEL; ARCHITECTURE-001 |
| Bidirectional sync not required / not V0 | **A** | [2026-10-02-boundaries-and-delivery.md](../decisions/2026-10-02-boundaries-and-delivery.md); operational adoption; ARCHITECTURE-001 |
| Interoperability boundary required before operational adoption; connecting every calendar not required | **A** | [2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md) |
| “An external fact is not a user-created Commitment” | **A** | operational adoption |
| External calendar event is not automatically a reminder | **A** | [PRODUCT.md](../../PRODUCT.md) |
| FOUNDATION-001 “Observation” as domain primitive | **C** (historical; DOMAIN: not a domain primitive) | DOMAIN.md |

### 3.2 Architecture / data

| Claim | Class | Evidence |
| --- | --- | --- |
| Adapter under `integrations/` only may know Google API | **A / B** (rule A; code empty B) | ARCHITECTURE-001; [integrations/README.md](../../integrations/README.md) |
| Domain sees external temporal fact: source name, external id, interval, provenance — not OAuth types | **B** | ARCHITECTURE-001 |
| User-owned commitments and external facts are different stores | **A** (decision) / **B** (store absent) | ARCHITECTURE-001; boundaries-and-delivery |
| Calendar event not copied into commitment, not turned into reminder, not marked user-owned | **A** | ARCHITECTURE-001 |
| Timeline may show both with provenance visible | **B** | ARCHITECTURE-001 |
| Adapter failure leaves user-owned rows unchanged; failed refresh must not delete internal truth; must not present stale cache as fresh read | **A** | ARCHITECTURE-001 |
| Tokens/secrets server-side only; never `NEXT_PUBLIC_`, never browser bundle, never repo | **A** | ARCHITECTURE-001 |
| Google sign-in is not app login; later Google OAuth is calendar access only | **A** | ARCHITECTURE-001 |
| Anticipated external calendar facts in DATA-001 “not in this tranche” list | **B / D** | [DATA-001.md](../data/DATA-001.md) — no table/migration |
| Provenance as small source fields on affected rows, not event log | **A** | boundaries-and-delivery; ARCHITECTURE-001 |
| Which calendar events enter the external-fact store automatically | **D** | ARCHITECTURE-001 open questions; operational adoption open Q10 |

### 3.3 Current persistence / domain code

| Claim | Class | Evidence |
| --- | --- | --- |
| Commitment `origin` only `user_created`; writers force that; readers reject other origins | **A** (implemented) | migrations `commitments`; `domain/commitment.test.ts`; `persistence/commitment.test.ts`; ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY |
| No `google_event_id`, sync token, external-fact table | **A** (absence) | migrations (14 SQL files); persistence tests forbid `google_` |
| Timeline projection forbids google/gemini coupling | **A** | `projections/timeline.test.ts` |
| No OAuth, adapter, or calendar client code | **A** | `integrations/` README only |
| Task/Block/PT writers reject `recurrence` | **A** | domain tests |

### 3.4 Projections today

| Surface | Participating established sources | External |
| --- | --- | --- |
| Timeline | Work schedule, Protected Time, Block, Commitment | None |
| Present / CTO | Work shift (when containing), PT, Block, Commitment | None |
| Day / Week / Month | Same Timeline kinds (+ Direction on Month) | None |
| Capacity | Utilizing: PT, Commitment, Block inside Work-shift boundary | None |
| DTM eligibility | Timed Orient-owned PT / Block / Commitment only | Explicit non-goal: external calendar manipulation |

### 3.5 Convergence / strategic

| Claim | Class | Evidence |
| --- | --- | --- |
| External temporal observation is next strategic item for intended multi-context “what is coming up?” | **A** (convergence verdict) | PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001 |
| Observation first; not bidirectional sync; not Gemini; not import-as-Commitment | **A** (convergence reconstruction) / **architectural inference** for tranche shape | Same §8–§10, §23 |
| Publication-to-Calendar-for-Gemini | **Operator strategic intent** + architectural compatibility; **no designed contract** | Convergence §11 |
| Gemini in Orient runtime | **A — forbidden** | [2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md) |

### 3.6 Summary classification

| Topic | Verdict |
| --- | --- |
| Sovereignty: external source retains ownership | **A** |
| Separate external-fact store | **A** decision / **B** unimplemented |
| Observation (read) as first authority direction | **B** strongly implied by architecture + convergence; **not** a shipped feature |
| Import into Orient-owned Commitment by default | **Rejected by A** (ARCHITECTURE / adoption); older DOMAIN Commitment wording is **C** |
| Sync / conflict / deletion / which events | **D** detail |
| Gemini publication | **Operator strategic intent**; reserve separation only |
| Freshness / observation window / multi-day external shapes | **D** |

Do not promote DOMAIN’s “externally sourced Commitment” row model over ARCHITECTURE-001’s separate store. This discovery treats the separate-store rule as the governing later decision.

---

## 4. Sovereign temporal source definition

### Terminology (minimum semantic vocabulary)

Orient needs an explicit concept equivalent to a **Temporal Source** (name flexible; meaning required):

| Question | Semantic answer a Source must provide |
| --- | --- |
| Who/what established this temporal fact? | The external sovereign system (e.g. Google Calendar), not Orient |
| Who owns its canonical state? | That source (and its account/calendar policies) |
| Who may correct it? | The owning source’s correction path; not Orient’s ordinary fact writers |
| How did Orient observe it? | Read-only observation through an adapter (relationship kind: observation) |
| When was it last observed? | Observation freshness / last successful observation evidence |
| What source-local identity allows re-recognition? | Stable source-local identity within a selected source calendar |

Related but distinct:

| Term | Meaning |
| --- | --- |
| **Temporal Source** | Connected observation relationship to one external sovereign calendar/account surface Orient has been authorized to observe |
| **Externally observed temporal fact** | Evidence Orient holds about a source-owned interval, with provenance; not an Orient Commitment/Block/PT |
| **Orient-established temporal fact** | Protected Time, Block, Commitment, Work schedule (and Task temporal intention fields) owned under Orient writers |
| **Observation relationship** | Human-authorized link: Orient may observe selected source calendars; disconnectable without rewriting Orient-owned history |

### Existing coverage

| Concept | Covers Temporal Source? |
| --- | --- |
| Commitment `origin` | Partial / misleading if widened to store Google rows as Commitments — rejected by separate-store rule |
| Task←Note provenance | Different problem (user-originating evidence citation) |
| Timeline `sourceKind` | Semantic kind of Orient primitive, explicitly “not provenance”; Google is “still not a source” today |
| `integrations/` adapter | Intended sole Google-knowing boundary; empty |

**Conclusion:** current repository concepts **name** external temporal sources but do **not** yet embody a Temporal Source. Minimum vocabulary above is required. No types/schema in this discovery.

---

## 5. Orient-owned vs externally-observed truth

### Orient-established truth (current)

Canonical Orient-owned temporal facts applicable here:

- Protected Time
- Block
- Commitment (`origin: user_created` only today)
- Work schedule
- Task temporal intention (planned/due/clock/MustDo — not Timeline intervals)

### Decision

**B — retain external fact as externally-owned temporal evidence and project it alongside Orient truth.**

Not **A** (convert into Orient-owned canonical fact by default).

### Justification (evidence)

1. ARCHITECTURE-001: different stores; calendar event not copied into commitment; not marked user-owned.
2. Operational adoption: external fact ≠ user-created Commitment; provenance stays visible.
3. ESTABLISHED-TRUTH discovery: current Commitment writers cannot safely hold external origin; `defineCommitment` forces `user_created`.
4. Sovereignty principle: resemblance of shape (14:00–15:00 interval) ≠ ownership of Commitment semantics.
5. Older DOMAIN/TIME_MODEL “may be represented as a Commitment” is **historical/looser wording** refined by the separate-store rule — do not re-open conversion-as-default.

### Optional later authority transition

**Adoption / import** (explicit human authority transition that creates or links Orient-owned truth) may exist later. It is **not** observation and is **not** required for V1. Coexistence is the default (§14).

---

## 6. Observation / import / sync / publication / correction definitions

| Operation | Definition |
| --- | --- |
| **Observation** | Orient reads evidence owned elsewhere, stores/projects it as externally owned with provenance, and does not claim correction ownership. |
| **Import / Adoption** | Explicit authority transition whereby external evidence becomes (or is deliberately copied/linked into) Orient-owned truth. Requires human-authorized act; not silent. |
| **Synchronization** | Two systems attempt to maintain corresponding mutable state (often bidirectional). Collapsing observation into “calendar sync” is refused. |
| **Publication** | Orient exposes selected **Orient-owned** truth outward under an explicit contract. Separate from observation. |
| **Correction** | An authority changes canonical truth. For external facts, the owning source corrects; Orient does not silently correct them as Orient rows. |

### First Google Calendar tranche

| Operation | In first tranche? |
| --- | --- |
| Observation | **Yes** — required |
| Import / Adoption | **No** (defer; may be later explicit) |
| Synchronization | **No** |
| Publication | **No** (reserve separation only; §30) |
| Correction in Orient of external truth | **No** |

**Verification:** Architecture defers read and write-back separately; bidirectional sync not V0; convergence “Observation first.” Repository evidence supports **observation-first**. Do not call this “calendar sync.”

---

## 7. Source identity

### What Orient semantically needs (provider-neutral)

Minimum identity for an observed external fact:

| Element | Role |
| --- | --- |
| Provider / source type | Which sovereign system (e.g. google_calendar) |
| Account / connection identity | Which Orient observation relationship / linked account |
| Source calendar identity | Which calendar within that account was selected for observation |
| Source event identity | Source-local id that re-identifies the same event |
| Recurrence-instance identity | Only if/when instances are observed as distinct occurrences (later) |
| Source version token | Optional etag / updated timestamp **if** adapter can supply — for freshness/change detection, not invent fields |
| Observation timestamp | When Orient last successfully observed this fact (or its absence/status) |

### What makes two observations the same external fact?

Same **(provider, account/connection, source calendar, source event identity)** — and, when instances are in scope, the same **instance identity**. Repeated observations update recognition of that external fact; they do not mint a new Orient Commitment id.

Exact Google field mapping is **provider-specific unknown** → adapter discovery.

---

## 8. Provenance contract

### Minimum provenance Orient must preserve

| Field class | Required for truthful observation |
| --- | --- |
| Source system | Yes |
| Source-local identity | Yes |
| Observed-at (last successful observation) | Yes |
| Source-reported temporal values | Yes (as reported / as adapter normalized without inventing precision) |
| Source-reported timezone / date semantics | Yes, enough to avoid silent reinterpretation as Orient civil rules without evidence |
| Source-reported status (cancelled, etc.) when meaningful | Yes when provider supplies it |
| Freshness / staleness evidence | Yes (distinguish fresh vs last-known vs fetch-failed) |
| Whether ever adopted into Orient authority | Yes as absence/false for V1; later if adoption exists |

### Can an externally observed fact ever appear indistinguishable from an Orient-established fact?

**No — not under a truthful contract.**

Evidence:

- Architecture requires provenance visible and different stores.
- Operational adoption requires the boundary can tell external fact from user-created Commitment.
- Timeline today uses `sourceKind` for Orient primitives; external participation must remain a distinct provenance/ownership signal (exact UI not designed here).
- Current Commitment path only stores `user_created`; widening that path to hide externality would violate sovereignty.

Architectural inference: projection may place external intervals beside Orient facts; **ownership must remain inspectable**.

---

## 9. Temporal shapes

Classify for eventual Google observation capability. First tranche need not implement every **A**.

| Shape | Class | Notes |
| --- | --- | --- |
| Timed event | **A** — required for truthful bounded observation | Core Google event shape |
| All-day event (single civil date) | **A** | Maps conceptually nearer Orient all-day; still external |
| Multi-day all-day event | **A** for truth if present in window; representation **must not** be forced into Orient’s single-civil-date all-day Commitment/PT/Block without loss | Orient all-day is one civil date ([commitments decision](../decisions/2026-10-02-commitments.md)); external multi-day needs its own temporal span semantics |
| Overnight timed event | **A** | Orient timed facts already continue at most into next civil date; external overnight must be represented without false clipping if source spans further — detail in implementation discovery |
| Timezone-aware event | **A** | Confirm zone vs source zone interaction is open detail |
| Floating / local-time event | **B** or **C** until provider semantics known | Provider-specific unknown |
| Cancelled / deleted event evidence | **A** (status distinction) | See §12 |
| Recurring series / instances | **A** as **provider-resolved instances in window**; Orient recurrence engine **C** unsupported | §23 |

Do not force external shapes into existing Orient types if truth would be lost.

---

## 10. External identity model

### Decision

Externally observed facts have:

1. **Their own identity namespace** (external / observation store), keyed by source identity (§7);
2. Optionally an Orient **wrapper / record id** for persistence and projection addressing — which **must never collide** with Protected Time / Block / Commitment / Work ids;
3. **No** reuse of Commitment row ids for external events.

### Repeated observation of the same external event

**Update one observed record (or replace a current snapshot) keyed by source identity**, while preserving:

- provenance,
- last-observed metadata,
- and enough lifecycle evidence for cancellation/absence/staleness.

Full observation **history log** is not required by architecture’s “not an event log” provenance stance. Optional history is deferred unless implementation discovery proves need.

Do not create schema here.

---

## 11. Freshness / staleness

External observation is not timeless Orient-established truth.

Orient must distinguish at least:

| State | Meaning |
| --- | --- |
| Freshly observed | Contained in latest successful observation for its source/window |
| Previously observed, not recently refreshed | Last-known evidence; freshness inspectable; not claimed as just-fetched |
| Source fetch failed | Observation attempt failed; prior evidence (if any) is stale-or-last-known, **not** deleted |
| Source unavailable | Same epistemic class as fetch failed for “current truth” claims |
| Absent from latest **successful** bounded observation | Candidate disappearance **within that window** — not global deletion proof (see §12) |
| Explicitly cancelled/deleted by source | Source-reported status when available |

### Epistemic principle (repository)

Month/Week integrity: absence of data is not evidence that nothing was established; failed/short reads must not present as empty complete landscapes ([month-contract](../decisions/2026-10-05-month-contract.md), [week-contract](../decisions/2026-10-05-week-contract.md)). Architecture: failed refresh must not present stale cache as a fresh read; must not delete internal truth.

### Answer

> If Google Calendar cannot be reached today, may Orient conclude yesterday's observed event no longer exists?

**No.** Failure to refresh is not evidence of deletion. Orient may retain last-known observed evidence with inspectable staleness/uncertainty, or withhold “current external landscape” claims per integrity patterns — but must not treat unreachable source as empty calendar.

Exact freshness thresholds / UX polish: **unresolved** (provider-neutral implementation discovery).

---

## 12. Disappearance / deletion / cancellation

| Case | What Orient may truthfully conclude |
| --- | --- |
| 1. Source explicitly reports cancellation | Event is cancelled **per source report** (status preserved); not Orient deletion of Orient truth |
| 2. Source explicitly reports deletion / tombstone | Source no longer has that event **as reported**; record lifecycle accordingly; still not Orient-owned delete |
| 3. Previously observed event absent from a **successful** bounded query | Absent from that successful window observation — may mark unobserved-in-window / candidate gone **within query scope**; not proof of global nonexistence outside window |
| 4. Provider fetch fails | **No conclusion** about event existence change; retain last-known with failed-refresh provenance |
| 5. Permission / account / calendar access disappears | Observation relationship degraded/unavailable; do not rewrite Orient-owned history; external evidence becomes inaccessible or stale per policy — not silent wipe presented as “user deleted everything” |
| 6. Observation window changes and event falls outside it | Out of observed horizon; **not** deletion |

These cases are **not equivalent**.

---

## 13. Correction authority

> May Orient directly edit an externally-owned observed event?

**Default: No.**

| Path | V1 |
| --- | --- |
| Read-only in Orient | **Yes** (default) |
| Correction at owning source | **Yes** (human uses Google Calendar / source UI) |
| Explicit adoption transferring/copying into Orient authority | Later only; not V1 |
| Future action adapter requesting correction at source without Orient ownership | Possible later; **distinct** from Orient owning the correction |

Distinguish:

- **Orient owning a correction** — uses Orient writers on Orient-owned rows (PT/Block/Commitment/Work).
- **Orient invoking an owning system’s correction capability** — write-back / action adapter; deferred; not observation V1.

DTM contract already lists external calendar manipulation as a non-goal; eligibility is Orient timed PT/Block/Commitment only.

---

## 14. Relationship to Orient truth

Real life may contain both an external Calendar event and an Orient Block/Commitment about the same real-world thing.

| Approach | V1 |
| --- | --- |
| Automatic deduplication | **No** |
| Automatic fuzzy matching | **No** |
| Explicit linking | **Not required** for V1 |
| Adoption | **Not required** for V1 |
| Relationship declaration | Defer |
| **Simple coexistence** | **Yes — safest first contract** |

Principle: accurate relationships, not feature count (PROJECT_CONTEXT). Timeline already allows multiple truths over the same time without canceling ([timeline-composition](../decisions/2026-10-02-timeline-composition.md)).

---

## 15. Present projection

Present answers which **established** temporal truths contain Now (+ Active Thread).

### Decision

Externally observed temporal facts **should participate in Current Temporal Orientation when**:

- they are in an observeable lifecycle state that still asserts temporal presence (not cancelled-as-absent),
- their source-reported interval **contains** the supplied instant (same containment idea as Commitments),
- and the observation evidence is admissible under freshness rules (fresh or explicitly last-known-with-staleness — exact admission rule deferred to implementation discovery; failed refresh must not invent containment).

They participate as **externally observed facts**, **not** as Orient Commitments.

Cancelled facts do not contain Now as active constraint. Stale last-known may still be shown only with inspectable uncertainty — detail deferred; principle: do not present stale as fresh.

Overlaps with Orient facts: **keep all**; no priority winner (present-moment contract).

Provenance/ownership **must remain distinguishable** in the composition (inspectability required; visual polish not designed here).

Active Thread is unchanged; external events do not create threads.

---

## 16. Day projection

External facts project into Day as additional temporal structure beside Work/PT/Block/Commitment:

| Shape | Projection semantics |
| --- | --- |
| Timed | Place by source-reported local/absolute interval on the civil day being asked, without converting into Commitment |
| All-day (single date) | All-day band for that civil date; remains external |
| Multi-day | Appear on each civil date of the span that intersects the Day being asked, without collapsing to a single Orient all-day row |
| Timezone boundary | Preserve source semantics; do not silently rewrite into confirmed zone in a way that invents false instants (align with Timeline unresolved-time honesty) |
| Overlap with Orient truth | Coexist; no conflict resolution |
| Stale evidence | May appear only with freshness/provenance inspectable; incomplete external read must not pretend complete external emptiness |

No UI design.

---

## 17. Week projection

External facts **may** participate in Week’s spatial temporal field as **observed structure**, with kind/provenance distinct from Orient kinds.

| Concern | Decision |
| --- | --- |
| Timed placement | Yes, as external observed intervals |
| All-day representation | Yes, as external all-day / multi-day spans |
| Overlaps | Preserve; no winner |
| DTM boundary | **Critical:** spatial appearance does **not** confer DTM eligibility |
| DTM eligibility | Remains **Orient-owned timed Protected Time / Block / Commitment only** ([DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001](DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md)). Do not modify DTM in this discovery. |

External facts are inspectable as external; not Save-corrected through Orient Commitment writers.

---

## 18. Month projection

External facts may contribute to Month’s broader temporal landscape as **structure at a distance**, same participation family as Week’s temporal kinds once observation exists — still with external provenance.

Respect temporal-precision principles: Month does not invent minute precision the source lacks; does not flatten into density scores; does not redesign Month’s Direction-beside-structure question.

Absence of external observation must not be presented as “no external life structure” unless the observation relationship and required reads completed successfully for that claim.

---

## 19. Capacity relationship

Capacity utilizes clock territory inside an established allocatable boundary (Work shift today) covered by **Protected Time, Commitment, or Block** ([capacity-contract](../decisions/2026-10-05-capacity-contract.md)).

A Calendar event does **not** necessarily mean unavailable/allocatable-utilized time (dentist vs birthday vs optional vs informational).

### Decision

**B / C hybrid, stated as C for safety:**

- **Do not automatically reduce Capacity** from mere external observation (**B** alone is too absolute only if adoption later classifies utilization — prefer **C**).
- **C — reduce Capacity only after explicit adoption/classification** into an Orient utilizing fact (or a future explicit “counts as utilizing” authority — not invented here).

Mere presence of an observed external event **never** silently becomes Commitment utilization.

---

## 20. Task relationship

An external event:

| Creates | Automatically? |
| --- | --- |
| Task | **No** |
| MustDo | **No** |
| ActiveThread | **No** |
| Commitment | **No** |

Establishment remains human-explicit (capture / ADD / Day Exact). PRODUCT: external calendar event is not automatically a reminder. Same boundary applies to Tasks.

---

## 21. Work relationship

External Calendar events **may coexist** with Work schedule truth on the same clock territory.

Google Calendar **must not** silently become Work schedule authority. Work Off / unknown / shift rows remain Orient Work writers only.

External events inside a Work shift are **additional observed temporal facts**, not shift replacements, not automatic Off, not Capacity utilization by default (§19).

---

## 22. Attention / reminder relationship

Distinguish:

| Thing | V1 observation |
| --- | --- |
| Observing an event | In scope |
| Observing provider reminder configuration | **Deferred / unnecessary** for V1 observation |
| Orient delivering a reminder | Out of scope (Orient has no active attention-delivery system) |
| Provider delivering its own reminder | Outside Orient; not Orient authority |

Classification: provider reminder metadata is **B — safely deferred** / unnecessary for first observation contract. PRODUCT already separates appointments (Commitments) from reminders; external event ≠ automatic Orient reminder.

---

## 23. Recurrence relationship

Google recurring events must not force Orient to implement a recurrence engine.

### Desired contract (provider-neutral)

A bounded observation adapter may observe **provider-resolved event instances** within an observation window and store/project those occurrences as externally owned facts with source identity (including instance identity when needed).

Orient does **not** own the recurrence rule. Orient does not claim series editing authority.

This is semantically sound: it parallels “Timeline sees occurrences, not definitions” direction in architecture for future recurring obligations, without implementing Orient recurrence.

Series-level editing, skip, and Orient Recurring Obligation remain out of scope.

---

## 24. Observation window

Orient purpose: present orientation, upcoming awareness, recovery/cadence — not historical archive.

### Recommendation

Use a **bounded rolling (or fixed past+future) horizon** sufficient for Present / near Day / Week / Month awareness. Prefer **smallest useful** window. Avoid all-history ingestion. Future-only is insufficient for Present containment of ongoing events that started earlier.

**Exact day counts are not hard-coded here.** Choose concrete horizon during Google adapter discovery / provider-neutral persistence discovery unless product evidence appears sooner.

---

## 25. Failure model

| Failure | Orient continues to know | Orient stops claiming |
| --- | --- | --- |
| Auth expires | Orient-owned truth unchanged; last-known external evidence with relationship-degraded provenance | That external landscape is currently authorized/fresh |
| Provider unavailable / timeout | Same | Freshness of external set |
| Partial response | Only what was successfully observed; mark incompleteness | Completeness of the external window |
| One calendar fails | Other selected calendars’ last successful evidence; failed calendar marked failed | Unified “all calendars ok” |
| Account disconnected / permissions revoked | Orient-owned history intact; observation relationship ended/degraded | Ongoing observation of that source |
| Malformed provider event | Skip/quarantine that event; do not invent interval | Truth of that event |
| Unsupported temporal shape | Do not coerce into false Orient shape; omit or mark unsupported with provenance | False precision / false kind |

Key: failed refresh ≠ deletion; incomplete ≠ empty; Orient-owned rows unchanged (ARCHITECTURE-001).

Retries/backoff: implementation detail — out of scope here.

---

## 26. Source selection

A Google account may contain many calendars. Automatic observation of **all** calendars risks sovereignty confusion and cognitive noise (birthdays, holidays, shared noise).

### Decision

V1 requires **explicit human selection** of which external calendars (Temporal Sources) Orient observes. Do not auto-observe every calendar.

Settings UI not designed here.

---

## 27. Human authority

| Authority | Human controls |
| --- | --- |
| Connecting a source | Yes |
| Selecting calendars | Yes |
| Disconnecting | Yes |
| Visibility in Orient | Yes (observation relationship / selection) |
| Adoption | Later, if ever; explicit |
| Publication | Later, if ever; explicit; separate |

Distinguish:

- Authority over **Orient’s observation relationship** (connect, select, disconnect, visibility).
- Authority over the **external event itself** (remains with the source / Google account policies).

Disconnecting observation must **not** rewrite historical Orient-owned truth.

---

## 28. Google Calendar V1 contract

Verified against evidence (not accepted automatically from the brief).

**Google Calendar V1 MUST:**

1. Act as a **server-side adapter** under `integrations/` only.
2. Observe **human-selected** calendar(s) only.
3. Perform **bounded read-only observation** within a chosen horizon.
4. Persist/project facts as **externally owned** with **explicit provenance** and source identity.
5. Compose those facts into Present / Day / Week / Month **deterministically**, distinguishable from Orient-owned facts.
6. Leave Orient-owned rows unchanged on adapter failure.
7. Keep tokens/secrets off the browser bundle and out of ordinary domain records.
8. Refuse Orient-side correction of external events; refuse DTM eligibility.

**Google Calendar V1 MUST NOT** expand into sync/publication/Gemini/Tasks — see §29.

This matches ARCHITECTURE-001 + operational adoption + convergence path.

---

## 29. Google Calendar V1 non-goals

- No Calendar-as-database for Orient domain truth
- No silent adoption into Orient-owned PT/Block/Commitment/Work/Task
- No bidirectional sync
- No automatic dedupe / fuzzy match
- No automatic Task / MustDo / ActiveThread / Commitment creation
- No automatic Capacity blocking / utilization
- No Gemini integration inside Orient
- No AI/LLM runtime authority
- No publication / write-back
- No Orient correction of external truth
- No Orient recurrence engine (provider-resolved instances only, if any)
- No reminder delivery; no requirement to ingest provider reminder config
- No plugin framework for speculative multi-provider infrastructure ([ARCHITECTURE-001](../architecture/ARCHITECTURE-001.md): no plugin framework)

---

## 30. Gemini boundary

Operator strategic intent: selected Orient temporal truth may eventually publish to Google Calendar so Gemini can observe it **outside** Orient, without Gemini becoming Orient authority.

### What this discovery reserves

- **Observation** and **publication** remain separate authority decisions and separate pipelines.
- Google Calendar as observation source ≠ Google Calendar as publication sink.
- Gemini must never become Orient temporal authority (deterministic intelligence decision).
- No Gemini-specific tables, prompts, or runtime modules for V1.

### Does Calendar observation V1 require any Gemini-specific architecture?

**No.** Evidence: deterministic intelligence forbids AI runtime authority; convergence found no Calendar→Gemini publication design; ARCHITECTURE treats write-back as separate deferred decision. Observation V1 must only avoid collapsing into a design that would make later publication impossible (e.g. treating Google as Orient’s database, or bidirectional sync as the only integration shape).

---

## 31. Semantic data requirements

Persistence would eventually need (semantic only; no schema):

| Bucket | Minimum information |
| --- | --- |
| Source metadata | Provider type; connection/account id; selected calendar id; human selection state; connection status |
| External fact identity | Source event id; instance id when applicable; Orient wrapper id in separate namespace |
| Temporal values | Timed vs all-day; start/end or date span; timezone/date semantics as observed |
| Provenance | Source system; source-local ids; ownership = external; not user_created Commitment |
| Observation freshness | Last successful observation time; last attempt; success/failure; staleness signal |
| Lifecycle / status | Active / cancelled / deleted-tombstone / absent-from-successful-window / unsupported |
| Display-safe descriptive metadata | Title/summary as source-reported (privacy surface detail deferred) |
| Optional future relationship / adoption | Absent in V1; reserve that silent null ≠ “adopted” |

Do not name new tables unless a later design already canonizes names. ARCHITECTURE anticipates a separate external-fact store without locking table names here.

---

## 32. Security / privacy boundary

Architectural level only:

| Topic | Contract |
| --- | --- |
| Minimum provider permissions | Prefer least privilege for **read-only calendar observation** |
| Read-only Calendar scope sufficient for V1? | **Yes, as architectural intent** — exact Google scope strings are **provider-specific unknown** → defer to Google adapter discovery (do not guess) |
| Token / secrets boundary | Server-side only; never repo; never `NEXT_PUBLIC_`; never ordinary Orient domain fact rows |
| Browser vs server | Browser holds Orient session (Supabase); calendar tokens stay server/adapter side (ARCHITECTURE-001) |
| Provider tokens in domain records | **Never** |
| Logging | Must not log tokens or unnecessary event payload secrets; follow existing secret discipline |
| Disconnect / revocation | Human can disconnect; tokens revoked/discarded; Orient-owned truth unchanged; external observation stops |

No OAuth implementation in this discovery.

---

## 33. External-time acceptance invariants

Future implementation must satisfy:

1. **Every external fact is provably external** — ownership/provenance inspectable; never indistinguishable from Orient-established truth.
2. **Source ownership is never silently transferred** into Orient-owned PT/Block/Commitment/Work/Task.
3. **Failed refresh cannot masquerade as deletion** (or as a fresh empty calendar).
4. **Repeated observation preserves source identity** — same external fact updates in place by source key.
5. **External evidence cannot silently create** Orient Tasks, MustDo, ActiveThread, or Commitments.
6. **External observation cannot silently change Capacity** utilization.
7. **External facts cannot be DTM-corrected** as Orient-owned truth.
8. **Disconnecting observation does not rewrite** historical Orient-owned truth.
9. **Publication is separate from observation** — V1 implements neither publication nor sync.
10. **Gemini is not part of Orient authority.**
11. **Adapter failure leaves user-owned rows unchanged.**
12. **Stale cache must not be presented as a fresh read.**
13. **Absence from a failed fetch ≠ absence from the world.**
14. **Only human-selected calendars are observed.**
15. **Domain code does not import Google OAuth/API types** — adapter boundary holds.

---

## 34. Unresolved questions

### A. Provider-neutral external-time contract / implementation discovery

| Question |
| --- |
| Concrete observation horizon (past/future bounds) |
| Exact freshness threshold and whether stale last-known appears in CTO by default |
| Multi-day all-day representation in Timeline/Day/Week projections without coercing Orient all-day types |
| Overnight / longer-than-next-civil-date external timed spans vs Orient timed model limits |
| Whether Orient wrapper ids are UUIDs in a new store vs other addressing |
| Tombstone retention duration after source deletion |
| Incomplete multi-calendar aggregation completeness rules for Week/Month empty claims |
| Display-safe descriptive field set (title only vs description) — privacy surface |
| Whether a later explicit adoption/link primitive is wanted after coexistence ships |
| How Present labels ownership without UI redesign thrash |

### B. Google Calendar adapter discovery

| Question |
| --- |
| Exact OAuth scopes and consent surfaces |
| Token storage mechanism (server secret store shape) |
| Google event field mapping into semantic identity/temporal values |
| Cancelled vs deleted vs missing-from-list behaviors in Google API |
| Recurring instance ids / expanded instances API mechanics |
| Floating time / timezone edge cases |
| Which Google calendars appear in selection lists |
| Rate limits, pagination, sync tokens vs bounded poll ( mechanization ) |
| Malformed/unsupported event handling specifics |
| Partial calendar failure behavior in Google responses |

---

## 35. Recommended implementation sequence

Smallest truthful sequence after this discovery:

1. **Preserve this discovery** (document only; no commit until requested).
2. **Provider-neutral external temporal persistence + projection contract** (implementation discovery / thin design): store semantics, projection participation, freshness/lifecycle, invariants — still no Google hard-coding in `domain/`.
3. **Google Calendar adapter + OAuth discovery** (provider-specific): scopes, token storage, field mapping, horizon defaults, selection.
4. **Bounded implementation**: adapter + external store + read path + Present/Day/Week/Month composition + automated tests for invariants.
5. **Automated validation** (domain/projection/persistence tests; no silent Commitment conversion).
6. **Deployed physical acceptance**.

Avoid building generalized plugin infrastructure for one adapter (ARCHITECTURE-001).

If sequencing pressure appears, do not implement Google before the provider-neutral ownership/freshness contract is written — otherwise Google shapes will leak into Orient core.

---

## 36. Final verdict

## CONTRACT-CLEAR-WITH-PROVIDER-QUESTIONS

**Core sovereignty/provenance semantics are clear** enough to proceed to bounded **provider-neutral** implementation design:

- observe, do not own;
- separate external evidence from Orient-established facts;
- coexistence without auto-dedupe;
- observation ≠ import ≠ sync ≠ publication ≠ correction;
- Capacity/Tasks/Work/DTM/Gemini boundaries;
- failure ≠ deletion.

**Google-specific API/OAuth/lifecycle/horizon field mapping** remain **provider questions** and require a Google adapter discovery before coding the adapter, migrations that encode Google columns into domain types, or OAuth configuration.

Not **CONTRACT-CLEAR** alone — would understate unresolved Google mechanics and concrete horizon/freshness thresholds.

Not **CONTRACT-NOT-CLEAR** — the fundamental Orient domain question (own vs observe; separate store; no silent Commitment) is resolved by governing architecture against older Commitment-wording ambiguity.

---

## 37. Evidence references

### Product / domain / time

- [PRODUCT.md](../../PRODUCT.md)
- [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)
- [DOMAIN.md](../../DOMAIN.md)
- [TIME_MODEL.md](../../TIME_MODEL.md)

### Architecture / data / decisions

- [docs/architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)
- [docs/data/DATA-001.md](../data/DATA-001.md)
- [docs/decisions/2026-10-02-boundaries-and-delivery.md](../decisions/2026-10-02-boundaries-and-delivery.md)
- [docs/decisions/2026-10-02-timeline-composition.md](../decisions/2026-10-02-timeline-composition.md)
- [docs/decisions/2026-10-02-commitments.md](../decisions/2026-10-02-commitments.md)
- [docs/decisions/2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md)
- [docs/decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md)
- [docs/decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md)
- [docs/decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md)
- [docs/decisions/2026-10-05-week-contract.md](../decisions/2026-10-05-week-contract.md)
- [docs/decisions/2026-10-05-month-contract.md](../decisions/2026-10-05-month-contract.md)
- [docs/discovery/FOUNDATION-003.md](../discovery/FOUNDATION-003.md)

### Implementation / acceptance / convergence

- [PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md](PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md)
- [ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md](DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-ACCEPTANCE-001.md](DIRECT-TEMPORAL-MANIPULATION-ACCEPTANCE-001.md)
- [CAPACITY-001.md](CAPACITY-001.md)
- [P0-INTEGRITY-001.md](P0-INTEGRITY-001.md)

### Code / migrations / integrations (inspected)

- `integrations/README.md` (Google Calendar not implemented)
- `projections/timeline.ts` / `timeline.test.ts` (no google/gemini; four Orient sources)
- `projections/presentMomentOrientation.ts`
- `components/orient/Landscape.tsx` (`isLiftKind`: PT/Block/Commitment only)
- `domain/commitment.test.ts`, `persistence/commitment.test.ts` (`user_created` only; reject `google_calendar`)
- `supabase/migrations/*.sql` (no external-fact / calendar tables among 14 migrations)
