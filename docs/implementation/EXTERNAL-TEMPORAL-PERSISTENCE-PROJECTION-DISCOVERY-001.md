# EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001

Discovery / contract design only. No implementation. No migration. No schema change. No Google/OAuth work. No commit.

## Evidence class key

| Label | Meaning |
| --- | --- |
| Existing repository fact | Present in source, tests, migrations, or docs at HEAD |
| Locked prior decision | Accepted in [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md) |
| New architectural decision | Decided in this discovery from repository patterns + locked authority |
| Unresolved provider-specific question | Deferred to Google adapter / OAuth discovery |

---

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `236b1a7d55c824be125331dc9aff1dfec50edb62` |
| Tip message | `EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001: establish sovereignty and provenance contract` |
| `main` vs `origin/main` | Identical at that SHA |
| Working tree | Clean at discovery start |
| Canonical authority | [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md) |
| Prior verdict | `CONTRACT-CLEAR-WITH-PROVIDER-QUESTIONS` |

Evidence class: **existing repository fact**.

---

## 2. Canonical question

> What is the smallest provider-neutral representation Orient must persist so externally observed temporal evidence can retain source identity, provenance, temporal shape, lifecycle, and freshness — and how should that evidence enter Present / Day / Week / Month without impersonating Orient-owned truth?

Answer must be concrete enough for an implementation plan, remain provider-neutral, and keep Google-specific fields out of Orient core.

---

## 3. Locked prior authority

Do not reopen unless repository evidence contradicts (none found that reverses these):

| Lock | Content |
| --- | --- |
| Ownership | External evidence stays externally owned; Orient owns observation relationship + retained evidence + projection |
| V1 shape | Selected sources → bounded read-only observation → provenance → externally-owned facts → deterministic projection |
| V1 non-goals | Sync, Calendar-as-DB, silent adoption, publication, write-back, Orient correction, Gemini, reminders, auto Task/Commitment, auto capacity block |
| Freshness | Failed refresh ≠ deletion; states remain distinct |
| Correction | Read-only in Orient V1 |
| Capacity | External presence does not automatically reduce capacity |
| Recurrence | Provider-resolved occurrences in-window; no Orient recurrence engine |
| Source selection | Human selects calendars/sources |
| DTM | External facts not eligible |
| Gemini | Observation ≠ publication; no Gemini in observation V1 |

Evidence class: **locked prior decision**.

---

## 4. Current persistence architecture

### Canonical Orient-owned temporal tables (repository fact)

| Table | Role |
| --- | --- |
| `protected_time` | Orient-owned unavailable-for-allocation intervals |
| `blocks` | Orient-owned chosen-purpose intervals |
| `commitments` | Orient-owned constrained time; `origin = user_created` only |
| `work_schedule_days` | Orient-owned Work schedule per civil date |
| `tasks` | Actions; planned/due/clock; not Timeline intervals |
| `active_threads` | Current Task intention |
| `temporal_settings` | Confirmed IANA zone (not Class A realtime) |
| Direction / notes / contexts | Adjacent; not Timeline intervals |

No external-fact / calendar / connection table exists among the 14 migrations.

### Persistence pattern (repository fact)

- Browser Supabase client under RLS (`persistence/*`).
- Domain define/validate in `domain/*`; row↔domain in `persistence/*`.
- Temporal loads use complete-read discipline (`completeRead.ts`, page size 1000) with civil date windows on `starts_on`.
- Writers force Commitment `origin: user_created`; readers reject other origins.
- Indexes commonly `(user_id, starts_on)`.
- Migrations: forward-only `supabase/migrations/YYYYMMDDHHMMSS_name.sql`.
- RLS: `user_id = auth.uid()` select/insert/update/delete (table-dependent grants).
- Class A realtime: `protected_time`, `blocks`, `commitments`, `work_schedule_days`, `tasks`, `active_threads` via `canonicalCoherence.ts` + publication migration.
- Server boundary reserved for secrets/adapters (`ARCHITECTURE-001`); hot path today is browser→Supabase.

### Projection inputs today (repository fact)

| Surface | Inputs |
| --- | --- |
| Timeline | workSchedule, protectedTime, blocks, commitments |
| CTO / Present | same four |
| Day / Week / Month | Timeline composition (+ Direction on Month) |
| Capacity | Work boundary + covered from **PT, Block, Commitment only** (`capacityCoverage`) |
| DTM | timed Orient `protected_time` \| `block` \| `commitment` only (`isLiftKind`) |

### Provenance today (repository fact)

- Commitment/Task `origin` = `user_created` only.
- Task←Note `originating_note_id`.
- Timeline `sourceKind` = semantic primitive kind, **not** external provenance; Google is not a Timeline source.

---

## 5. Source persistence boundary

### Decision (new architectural decision)

V1 needs a persisted provider-neutral **source/connection model** using **both** concepts as separate records:

| Record | Represents |
| --- | --- |
| **Connection** | Provider account authorization/relationship |
| **Observed Source** | One human-selected calendar/source under that connection |

This is option **C** from the brief (both through separate records).

### Why not A or B alone

- One provider account exposes multiple calendars (**locked**: human selects which).
- Connection can exist before calendars are selected (OAuth complete, selection pending).
- Observation freshness and bounded windows attach naturally to a **selected source**, not only the account.
- Avoids generalized plugin framework: two thin tables for the first adapter, provider-neutral columns only.

Tokens/secrets are **not** stored on these domain rows; Connection may later hold a **server-side secret reference** (opaque id). Exact token store is **unresolved provider-specific** / server ops.

---

## 6. Connection vs observed source

### Semantically distinct: Yes

| Concept | Meaning |
| --- | --- |
| **Connection** | Authorization/relationship through which Orient may ask a provider for evidence |
| **Observed Source** | Particular temporal source the human selected (e.g. one calendar) |

### Persistence

Represent **both separately**. Observed Source references Connection. Selection, observation window, and per-calendar freshness live on Observed Source. Connection status (connected / disconnected / auth-expired) lives on Connection and may degrade all its sources.

---

## 7. External fact persistence model

### Decision (new architectural decision)

**C — current-state row per external source fact/occurrence + observation metadata on the fact and on the Observed Source.**

Not append-only event sourcing (**B**). Not fact-only without source-level observation state (**A** alone).

### Rationale

- Matches locked prior: repeated observation updates one record by source identity; provenance is not an event log ([ARCHITECTURE-001](../architecture/ARCHITECTURE-001.md); prior discovery).
- Product purpose is orientation, not audit analytics.
- Source-level observation metadata is required for “latest successful bounded observation” and failed-refresh semantics.

---

## 8. External identity

### Provider-neutral uniqueness contract (new architectural decision)

Logical unique key for a current-state fact:

```text
(user_id, observed_source_id, source_event_id, source_instance_id)
```

Where:

| Element | Role |
| --- | --- |
| `user_id` | Orient operator ownership / RLS |
| `observed_source_id` | Selected calendar/source (includes connection lineage) |
| `source_event_id` | Provider-local event identity (opaque string) |
| `source_instance_id` | Null for non-instance facts; set for provider-resolved occurrence identity |

### Distinguishes

| Case | How |
| --- | --- |
| Same event observed again | Same key → update in place |
| Different event, same calendar | Different `source_event_id` |
| Same provider event on different selected calendars | Different `observed_source_id` (do not auto-merge) |
| Recurring occurrence | Distinct `source_instance_id` (and/or instance-specific event id as adapter supplies) |
| Separate provider accounts | Different Connection → different Observed Sources |
| Reconnect | Same Connection/Source stable Orient ids when reconnected; facts re-keyed by source-local ids under that source |

### Identity layers

| Layer | Role |
| --- | --- |
| Database primary identity | Orient-local UUID wrapper id (§9) |
| Source-local unique identity | Logical key above |
| Uniqueness constraint | Unique on logical key |

No Google field names in core. Adapter maps provider fields into opaque strings.

---

## 9. Local wrapper identity

### Decision (new architectural decision)

**Yes — each externally observed fact receives an Orient-local stable UUID (`id`) as primary key.**

### Distinctions

| | |
| --- | --- |
| **Local row identity** | Persistence/addressing convenience |
| **Truth ownership** | Remains external; wrapper id never means Orient owns the event |

### Benefits retained without ownership claim

- React keys / inspection addressing
- Future optional linking/adoption references
- Stable update target when provider version tokens change
- Reconnect updates by source key while keeping or rebinding wrapper per uniqueness rules

Wrapper id is **not** a Commitment/Block/PT id and must not share those tables.

---

## 10. Timed representation

### Problem with forcing Orient `starts_on` + `start_local` + `end_local`

Orient timed facts: one owning civil date; overnight at most into the **next** civil date; zone is confirmed Orient zone on `temporal_settings`, not per row (**repository fact**).

External timed events may span longer, carry source TZ, or use absolute instants. Forcing Orient shape can lose truth (**locked prior**).

### Decision (new architectural decision)

Smallest truthful V1 timed external representation:

| Field | Purpose |
| --- | --- |
| `temporal_kind = timed` | Discriminator |
| `start_at` (`timestamptz`) | Inclusive start instant as observed/normalized by adapter |
| `end_at` (`timestamptz`) | Exclusive or inclusive end per adapter contract; must be documented as half-open **exclusive end** in Orient persistence for geometry consistency with Capacity/Timeline instant intervals |
| `source_time_zone` (nullable IANA text) | Source-reported zone when known; display/inspection honesty |
| Optional opaque `provider_temporal_payload` | **Not required V1**; avoid unless adapter discovery proves need |

Projection into Orient civil days uses Orient’s confirmed zone to compute day intersections (may yield unresolved local display if needed — follow Timeline honesty: do not invent fake locals).

Do **not** require Orient `starts_on`/`start_local`/`end_local` as the storage shape for external timed facts.

**Unresolved provider-specific:** how Google encodes end inclusivity, floating times, and TZ — adapter maps into `start_at`/`end_at`/`source_time_zone`.

---

## 11. All-day representation

### Decision (new architectural decision)

External all-day uses a **half-open civil-date span**, not Orient’s single-date all-day row:

| Field | Purpose |
| --- | --- |
| `temporal_kind = all_day` | Discriminator |
| `starts_on` | First civil date included |
| `ends_before` | First civil date **not** included (exclusive end) |
| `source_time_zone` / calendar-context (nullable) | When provider date semantics need a context |

### Consequences

- One-day all-day: `ends_before = starts_on + 1 day`.
- Multi-day all-day: one fact spanning dates; **not** split into fake Orient Commitment rows.
- No invented `00:00–24:00` clocks.
- Projection includes the fact on each Orient civil day `D` where `starts_on ≤ D < ends_before` (in the date semantics agreed for that fact).

Exclusive-end semantics match Timeline’s civil range language (`startsOn` included, `endsBefore` excluded) (**repository fact**).

---

## 12. Recurring occurrence representation

### Decision (new architectural decision)

Each provider-resolved occurrence in the observation window persists as **one external fact instance**:

| Field | V1 |
| --- | --- |
| Occurrence temporal values | Required (timed or all-day shape) |
| `source_instance_id` | Required when provider distinguishes instances |
| `source_series_id` (optional opaque) | **Optional** — useful for inspection; not an Orient recurrence engine |
| Recurrence rule body | **Not stored / not required** for V1 |

Series editing, skip, and Orient Recurring Obligation remain out of scope.

---

## 13. Descriptive metadata

### Decision (new architectural decision) — data minimization

| Field | Class |
| --- | --- |
| Title / summary | **A — required** for meaningful orientation (empty → adapter supplies fallback label like “Untitled external event”, still external) |
| Source calendar display name | **A — required** on Observed Source (not necessarily duplicated per fact) |
| Location | **B — defer** |
| Description / notes body | **B — defer** (privacy surface) |
| Organizer / attendees / RSVP | **C — unnecessary V1** |
| Provider visibility/privacy flag | **B — defer** unless adapter must hide title; then title may be redacted string |

Private/restricted provider events: adapter may persist redacted title; Orient must not invent details.

---

## 14. Lifecycle model

Avoid one giant ambiguous `status`.

### Fact-row lifecycle (new architectural decision)

Persist an explicit **fact lifecycle** enum-like set:

| State | Meaning |
| --- | --- |
| `active` | Present in latest successful complete observation (or equivalently affirmed by source) |
| `cancelled` | Source explicitly reported cancellation |
| `deleted` | Source explicitly reported deletion/tombstone |
| `absent_from_window` | Missing from latest **successful complete** observation covering its relevant window |

### Not on the fact row alone

| Concern | Lives on |
| --- | --- |
| Stale because refresh failed | Observed Source observation state (+ fact remains last-known `active`/`cancelled`/etc.) |
| Source disconnected | Connection (+ Observed Source) |
| Source access lost / auth expired | Connection |
| Derived “admitted to current projection” | Projection policy from fact lifecycle + source freshness |

### Projection derivation examples

- Fact `active` + source last success recent → normal presentation.
- Fact `active` + source refresh failed → last-known/stale presentation (or withheld from CTO per §24).
- Fact `cancelled` / `deleted` / `absent_from_window` → not active constraint in CTO; may remain inspectable per policy.

---

## 15. Observation run / snapshot model

### Decision (new architectural decision)

**B + minimal window metadata on Observed Source — not a generic job system.**

Persist on each Observed Source at least:

| Field | Purpose |
| --- | --- |
| `last_attempted_at` | Last observation attempt |
| `last_attempt_result` | `success_complete` \| `success_partial` \| `failure` (names illustrative) |
| `last_successful_observed_at` | Last **complete successful** observation |
| `last_successful_window_starts_on` / `ends_before` | Bounded window of that success |
| Optional opaque provider sync cursor | **Provider-specific later**; nullable |

**No** separate observation-run history table for V1 (**not A** alone; **not full C** job log). Epistemic integrity needs source-level success/partial/failure + window, not analytics.

Partial success must not authorize “absent_from_window” transitions for facts outside the successfully covered subset (**new architectural decision**).

---

## 16. Bounded absence

### Statement that persistence must support

> This fact was present under prior successful observation, but was not present in the latest **successful complete** observation whose window covers the fact’s relevant temporal placement.

### Required metadata

- Observed Source identity
- Fact source identity
- Prior presence (row existed as `active`)
- Latest successful complete window bounds
- Completeness flag = complete (not partial/failure)
- Fact’s temporal placement intersects that window (so absence is in-scope)

### Treatment (new architectural decision)

| Action | V1 |
| --- | --- |
| Set lifecycle `absent_from_window` | Yes, only under successful complete in-window conditions |
| Hide from normal “active landscape” projection | Yes |
| Remain inspectable as last-known evidence | Yes (for a retention window — exact purge TTL **unresolved product policy**) |
| Equate to `deleted` | **No** |
| Apply on failed/partial observation | **No** |

---

## 17. Freshness model

### Persist (truth)

| Evidence | Persist? |
| --- | --- |
| Fact `last_observed_at` | Yes |
| Optional provider version token/updated-at (opaque) | Yes when adapter supplies |
| Source `last_successful_observed_at` / attempt fields | Yes (§15) |
| Connection health | Yes |
| Observation window of last success | Yes |

### Derive (projection)

| Question | How |
| --- | --- |
| Fresh enough for normal presentation | Policy over timestamps + source health — **not** a stored score |
| Last-known/stale | Fact still held; source success older than policy or last attempt failed |
| Not admitted | Lifecycle not active, or source disconnected, or policy excludes stale from that surface |

### Thresholds

Exact “N hours” freshness thresholds are **product policy**, not persistence truth. Persist clocks; do not invent confidence percentages.

### CTO admission policy boundary (§24)

Default V1 recommendation: **CTO admits only `active` facts whose Observed Source last success is not in failed/unavailable state** — i.e. not merely last-known after failed refresh. Day/Week may still show last-known with stale provenance. Exact hours threshold remains open product policy; the **boundary** is defined here.

---

## 18. Disconnect semantics

### Decision (new architectural decision)

| Action | Effect |
| --- | --- |
| Disconnect observation | Connection → disconnected; Observed Sources under it stop observing |
| Retained external **fact rows** | **Remove** (observation cache cleared) for that connection |
| Orient-owned truth | **Unchanged** |
| Tokens/secrets | Revoked/discarded server-side (mechanism → Google discovery) |

### Rationale

- External rows are retained **evidence cache**, not Orient-established history.
- Clearing cache on intentional disconnect minimizes privacy retention.
- Clearing is **not** “the world deleted those events”; it is “Orient no longer retains observation.”
- Distinct from failed refresh (which must **not** delete — **locked**).

Reconnect starts clean observation; no automatic rewrite of Orient Commitments.

Human-selectable retain-on-disconnect is **not** V1.

---

## 19. RLS / ownership

### Decision (new architectural decision)

External Connection, Observed Source, and External Fact rows use the same **`user_id` + `auth.uid()`** RLS ownership model as other application tables (**repository fact** pattern).

Semantic requirements:

- Authenticated owner can select/insert/update/delete own external rows (writers may be server-only for some mutations — see §36).
- No cross-user read.
- Anon/public revoked.
- Provider tokens never in these tables as plaintext columns.

Exact SQL policies not written here.

---

## 20. Realtime relationship

### Decision (new architectural decision)

External Observed Source + External Fact tables **should join** realtime publication for cross-client invalidation when the server adapter writes them, following Class A invalidation patterns (`reloadToken` / `canonicalCoherence`).

| Question | Answer |
| --- | --- |
| Can observation updates happen server-side while clients are open? | Yes (ARCHITECTURE: adapter writes external store) |
| Should phone/laptop converge without manual refresh? | Yes, same coherence goal for orientation evidence |
| Are they Class-A “Orient-owned” truth? | **No ownership claim** — but they are **Class-A-like temporal evidence for convergence** |
| Create publication migration now? | **No** (this discovery only) |

Connection table: optional publish; fact/source changes are the critical invalidation signal.

Do not use realtime payloads as a second domain store — invalidation → reread only (**repository fact** pattern).

---

## 21. Read API boundary

### Decision (new architectural decision)

**A / C hybrid:** extend Orient loading with a **separate** `SourceRead` (or equivalent) for external evidence; **merge only inside projection composition**, never flatten into Commitment/Block arrays at persistence.

| Layer | Behavior |
| --- | --- |
| Persistence load | `loadExternalTemporalFacts(window)` / `loadExternalTemporalSources()` separate from Orient loaders |
| Instrument services | Separate ready/failed channel(s) beside work/PT/blocks/commitments |
| Projection | Explicit external input; ownership preserved |
| Integrity | Failed external read must not present as “zero external facts” complete emptiness for claims that require that source |

Do not merge rows at persistence boundary (**not B**).

---

## 22. Domain type boundary

### Conceptual types (do not implement here)

```text
ExternalTemporalConnection
  id, userId, providerType, accountLabel/opaqueAccountId,
  connectionStatus, createdAt, updatedAt
  // no OAuth types, no tokens

ExternalTemporalSource
  id, userId, connectionId,
  sourceLocalId, displayName, selected,
  observation window + attempt/success metadata (§15)

ExternalTemporalFact
  id (wrapper), userId, sourceId,
  sourceEventId, sourceInstanceId?, sourceSeriesId?,
  temporal: TimedExternalFact | AllDayExternalFact,
  title,
  lifecycle (§14),
  lastObservedAt, providerVersion?,
  // provenance implied by source + lifecycle + timestamps
```

### Discriminated temporal shape

**One** `ExternalTemporalFact` with **timed | all_day** variants is sufficient (mirrors Orient kind discrimination without sharing tables).

Provider-specific fields stay in `integrations/` mapping only.

---

## 23. Timeline composition

### Decision (new architectural decision)

Timeline remains “composes temporal truth; does not resolve.”

| Choice | Decision |
| --- | --- |
| Accept external facts as distinct input? | **Yes** — new input array |
| Become existing Commitment variant? | **No** |
| New TimelineFact variant? | **Yes** — e.g. `sourceKind: "external_temporal"` (name illustrative) carrying wrapper id, title, temporal geometry, provenance/freshness/lifecycle summary |
| Parallel projection type only? | Rejected as primary — would force Day/Week/Month to re-implement composition; higher blast radius |

### Blast-radius control

- Extend `projectTimeline` inputs; keep existing four Orient inputs unchanged in meaning.
- Ordering tie-break may place external after Orient kinds (presentation only, not importance) — exact order open to implementation tranche.
- Overlap remains coexistence.

Do not modify code in this discovery.

---

## 24. Present / CTO composition

### Rule (new architectural decision)

External timed/all-day facts participate in CTO when:

1. Lifecycle is `active`;
2. Interval/date span **contains** the supplied instant (all-day: Orient civil date of instant within `[starts_on, ends_before)`);
3. Observed Source / Connection admit freshness for CTO (**§17**: not failed/unavailable disconnect);
4. Result retains external provenance (distinct fact variant, not Commitment).

### Stale in CTO?

**Default V1: No.** After failed refresh, last-known external facts do **not** enter CTO as if current. They may remain on Day/Week with stale provenance. Exact time threshold for “fresh” remains product policy; the admission **boundary** is defined.

### Overlaps

Keep all containing facts; no winner (**locked** / present-moment contract).

---

## 25. Day composition

| Case | Mapping |
| --- | --- |
| Timed intersecting selected civil day | Include with geometry clipped/intersected to that day in confirmed zone; full bounds retained for inspection |
| Single-day all-day | All-day band when day in span |
| Multi-day all-day | Same fact contributes all-day on each included day |
| Midnight-crossing timed | Intersect each civil day; do not convert to Orient overnight-only model |
| Timezone conversion | Project via confirmed zone for placement; preserve `source_time_zone` for inspection |
| Stale | May show with stale provenance if source failed; distinct from active |
| Cancelled / deleted / absent_from_window | Not in normal Day landscape; inspectable per retention |

No Day redesign.

---

## 26. Week composition

Reuse Timeline external participation over the Week civil range.

| Preserve | |
| --- | --- |
| Temporal geometry | Yes |
| Coexistence | Yes |
| No mandatory extra lanes merely for externality | Yes |
| External provenance | Yes |
| DTM eligibility | **Never** from Week placement |

Multi-day all-day: semantically present on each civil column in span even if final visual treatment is later polish.

No Week redesign.

---

## 27. Month composition

### Classification (new architectural decision)

**Include via shared Timeline composition when Timeline accepts external facts** — Month already reuses Timeline structure (**repository fact**). No separate Month-only external subsystem.

Not a reason to delay Google discovery. Visual density polish may follow Present/Day/Week, but **semantic contribution is not deferred** once Timeline input exists.

Respect distance precision; do not invent minute UI.

---

## 28. Inspection semantics

### Minimum answers

| Question | V1 answer surface |
| --- | --- |
| What is this? | Title + external kind |
| When is it? | Timed instants or all-day date span |
| Where did Orient learn it? | Provider type + source calendar name |
| Who owns it? | External source (not Orient) |
| Last observed? | `last_observed_at` + source success time |
| Current vs last-known? | Derived freshness |
| Can I edit it here? | **No** |

### FactDetail vs distinct mode (new architectural decision)

**Distinct read-only external inspection mode** is semantically cleaner than overloading `FactDetail`, which is wired to Orient writers/delete/DTM Save paths (**repository fact**). Shared chrome may exist later; authority mode must be read-only external.

---

## 29. Visual differentiation requirement

### Decision (new architectural decision)

External ownership/provenance must be **perceivable in normal Present/Day/Week/(Month) projection**, not inspection-only.

Inspection-only would violate the invariant that external truth must never be indistinguishable from Orient-established truth (**locked**).

No colors/layout specified here — only the semantic requirement.

---

## 30. Capacity isolation

### Trace (repository fact)

`composeWorkCapacityReading` → `capacityCoverage({ protectedTime, blocks, commitments })` only.

### Enforcement boundary (new architectural decision)

1. **Type boundary:** `capacityCoverage` / Work Capacity composers must **not** accept `ExternalTemporalFact[]`.
2. **Composition boundary:** even after Timeline includes external facts, Capacity must continue to cover only Orient PT/Block/Commitment.
3. **Tests:** assert external intervals do not change remaining geometry.

No accidental utilization via Timeline merge.

---

## 31. DTM isolation

### Trace (repository fact)

`isLiftKind` allows only `protected_time` | `block` | `commitment`; requires timed Orient stored clocks; Work ineligible; all-day ineligible.

### Enforcement (new architectural decision)

Eligibility-by-**Orient domain authority** / existing lift kinds only. External Timeline variant is simply not a lift kind. **No** `if google` branches.

---

## 32. Task / ActiveThread isolation

### Boundary (new architectural decision)

External loaders/composers never call Task/ActiveThread/MustDo writers. ACT lists continue to read Tasks only. External facts are not Tasks and do not set `planned_on` / `due_on` / MustDo / Complete / Still open.

Architectural enforcement: no domain function maps ExternalTemporalFact → Task automatically; tests forbid coupling.

---

## 33. Work isolation

External evidence **must not** write `work_schedule_days` or influence `save_work_week`.

Visual coexistence on the same civil day/shift territory is allowed without relationship inference (overlap = coexistence).

---

## 34. Error / loading / partial-data contract

Expose distinct semantics (names illustrative):

| State | Meaning |
| --- | --- |
| `sources_none_connected` | No Connection / no selected sources |
| `sources_connected_never_observed` | Selected but no successful observation yet |
| `external_loading` | Observation or initial load in progress |
| `external_ready_empty` | Successful complete observation; zero facts in window |
| `external_ready_with_facts` | Successful; facts present |
| `external_stale_last_known` | Facts held; source refresh failed or success aged out per policy |
| `external_refresh_failed` | Attempt failed; may accompany stale facts |
| `external_partial` | Partial success; completeness false — do not treat as full-window absence authority |
| `external_read_failed` | Browser/store read failed — withhold complete-empty claims |

UI chrome not designed. Integrity: failed ≠ empty (**repository fact** P0 pattern).

---

## 35. Migration shape (design only — no SQL)

Smallest likely tranche: **three entities**.

| Entity | Necessary because |
| --- | --- |
| **External temporal connection** | Account-level auth relationship; disconnect/auth-expired; provider type; opaque account id; no tokens |
| **External temporal source** | Human-selected calendar; selection; observation window/freshness/attempt completeness |
| **External temporal fact** | Current-state observed evidence with wrapper id, source identity key, temporal shape, lifecycle, title, last_observed |

### Why not fewer

- Collapsing connection+source loses multi-calendar selection clarity.
- Collapsing source observation metadata into each fact duplicates freshness and weakens bounded-absence authority.
- Observation-run history table omitted in V1 (metadata on source suffices).

### Key constraints (conceptual)

- PK UUID on each entity
- `user_id` not null + RLS
- Fact unique `(user_id, source_id, source_event_id, source_instance_id)`
- Fact FK to source; source FK to connection
- Check constraints for timed vs all_day shape mutual exclusion
- Indexes for `(user_id, time range)` appropriate to timed/all-day queries (exact index design in implementation)

Realtime publication membership: later migration, modeled on Class A six-table contract expansion.

---

## 36. Repository module boundary

| Concern | Recommended home |
| --- | --- |
| Domain types / validators | `domain/externalTemporal*.ts` (provider-neutral) |
| Persistence row mapping / loads | `persistence/externalTemporal*.ts` |
| Timeline/CTO/Day composition extensions | `projections/*` (+ reading composers in `components/*`) |
| Adapter interface (observe window → domain facts) | `integrations/` with provider-neutral port types imported from domain — Google module only knows Google |
| OAuth tokens / secrets | Next.js server-only routes/modules; **never** `NEXT_PUBLIC_`; never domain fact rows |
| Browser | Read external tables under RLS; may not hold provider refresh tokens |

No new top-level plugin framework directory. No directories created in this discovery.

Server writers for observation upserts may be required so tokens never enter the browser — **implementation detail** for Google tranche; provider-neutral upsert semantics should still be expressible as pure functions over domain facts.

---

## 37. Test contract

### Provider-neutral (required before trusting adapter integration)

Deterministic tests for:

- Stable logical identity + in-place repeated observation update
- Timed projection / containment
- Single-day and multi-day all-day span inclusion
- Overnight / multi-day timed instant span across civil days
- Timezone intersection honesty (confirmed zone projection)
- Stale vs fresh derivation inputs
- Failed refresh does not delete facts / does not mark `absent_from_window`
- Bounded absence only after successful complete window
- Cancellation / deletion lifecycle projection exclusion from active landscape
- External + Orient overlap coexistence
- Capacity unchanged when external facts present
- No Task/MustDo/ActiveThread coupling
- DTM eligibility rejects external sourceKind
- Source isolation (per-source facts)
- Disconnect clears facts without touching Orient rows
- Read integrity: failed external SourceRead ≠ ready empty

RLS: integration/hosted verification later (same pattern as other tables).

### Google-adapter tests

Separate suite after adapter discovery: field mapping, pagination, auth failure, instance expansion — not in provider-neutral suite.

---

## 38. Implementation tranches

### Recommended decomposition (minimize ceremony)

| Order | Tranche | Before Google discovery? |
| --- | --- | --- |
| 0 | This discovery preserved | — |
| 1 | **Google adapter / OAuth discovery** (map provider → this contract) | **Next** — does not require empty tables first |
| 2 | Provider-neutral domain types + persistence migration + loaders + observation upsert semantics (still no Google SDK if using fixtures) | After or interleaved once mapping is known enough for indexes/window defaults |
| 3 | Timeline + CTO + Day/Week/(Month) composition + capacity/DTM isolation tests | With or immediately after (2) |
| 4 | Read-only inspection + visible provenance differentiation | After composition |
| 5 | Realtime publication membership + canonical bindings for external tables | When server writes exist |
| 6 | Google adapter implementation + physical acceptance | Last |

### Verdict on “implementation-first”

Building empty provider-neutral schema **before** Google discovery is **not required** to specify OAuth/scopes/field mapping against this contract. Prefer **Google discovery next**, then one bounded implementation that lands schema + projection + adapter together — or schema+projection with fixture adapter immediately before Google code if parallelization helps.

Avoid large infrastructure with no first consumer: the “consumer” of this contract is the Google adapter discovery document itself.

---

## 39. Google adapter discovery questions

Hand these to the next discovery (fresh provider documentation; do not answer from memory):

1. Exact OAuth scopes for read-only calendar observation  
2. Auth/consent flow and account linking UX constraints  
3. Token storage/refresh/revocation mechanism (server-side)  
4. Calendar enumeration API and identifiers for Observed Source `sourceLocalId`  
5. How selected calendar ids remain stable across rename  
6. Event list API semantics for bounded windows  
7. Recurring-instance expansion / instance ids  
8. Pagination and completeness signals  
9. Sync tokens / incremental observation vs full window poll  
10. Cancellation vs deletion vs omission behaviors  
11. Updated / etag / version tokens for `providerVersion`  
12. Timezone and all-day (exclusive end date) representation  
13. Floating/local-time events  
14. Private/restricted event field visibility  
15. Rate limits and backoff expectations  
16. Partial failure modes (one calendar, truncated pages)  
17. Reconnect / disconnect / permission-revoked behavior  
18. Recommended default observation horizon given API constraints  
19. Whether webhook/push notification is available/needed for V1 (assume poll unless docs compel)  
20. Mapping from Google event → `ExternalTemporalFact` fields defined here  

---

## 40. Final verdict

## PERSISTENCE-PROJECTION-CLEAR

The provider-neutral persistence/projection architecture is **sufficiently defined** to proceed to **Google Calendar adapter / OAuth discovery**.

Not **IMPLEMENTATION-FIRST**: empty tables are not a prerequisite for specifying provider mapping into this contract.

Not **NOT-CLEAR**: ownership separation, identity, timed/all-day shapes, lifecycle/freshness split, Timeline/CTO participation, and isolation boundaries are decided at contract level.

Remaining unknowns are **provider-specific** or **product-policy thresholds** (exact freshness hours, tombstone retention TTL), not fundamental Orient persistence contradictions.

---

## 41. Evidence references

### Locked / product

- [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md)
- [PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md](PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md)
- [docs/architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)
- [docs/decisions/2026-10-02-boundaries-and-delivery.md](../decisions/2026-10-02-boundaries-and-delivery.md)
- [docs/decisions/2026-10-02-timeline-composition.md](../decisions/2026-10-02-timeline-composition.md)
- [docs/decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md)
- [docs/decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md)
- [docs/decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md)

### Implementation / coherence

- [CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md](CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md](DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001.md)
- [P0-INTEGRITY-001.md](P0-INTEGRITY-001.md)
- [CAPACITY-001.md](CAPACITY-001.md)

### Code / migrations inspected

- `persistence/commitment.ts`, `protectedTime.ts`, `block.ts`, `workSchedule.ts`, `completeRead.ts`
- `domain/commitment.ts` (and PT/Block parallels)
- `projections/timeline.ts`, `currentTemporalOrientation.ts`, `capacity.ts`
- `components/capacityReading.ts`, `currentTemporalReading.ts`
- `components/orient/OrientInstrument.tsx`, `canonicalCoherence.ts`, `Landscape.tsx` (`isLiftKind`)
- `supabase/migrations/20261003040000_commitments.sql`, `20261003020000_protected_time.sql`, `20261006235000_class_a_realtime_publication.sql`
- `integrations/README.md`
