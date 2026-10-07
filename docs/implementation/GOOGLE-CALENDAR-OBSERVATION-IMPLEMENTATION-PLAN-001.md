# GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001

Implementation planning only. No code. No migrations. No Google resources. No credentials. No env. No dependencies. No commit.

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `0435cd603af0a3b1e085cfaf960c54da74041a00` |
| Tip message | `GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001: map Google Calendar into external observation contract` |
| `main` vs `origin/main` | Identical |
| Working tree | Clean at planning start |
| Authorities | [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md); [EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md); [GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001.md](GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001.md) |

---

## 2. Planning question

> What is the smallest safe sequence of repository changes and human configuration that gets one Orient operator from no external temporal observation to a deployed, read-only Google Calendar observation path with truthful provenance, deterministic projection, and no authority leakage?

---

## 3. Locked authority

Do not reopen. V1 is observation-only Google Calendar → provider-neutral External Temporal Facts → Present/Day/Week/Month with provenance; not sync/publication/Gemini/reminders/auto Task·Commitment·Capacity·DTM; no webhooks; no syncToken; no Orient recurrence engine.

Accepted refinement already in force: **`displayLabel`** (not absolute title).

Horizon: Orient today −7 / +42 civil days (confirmed zone).

Google query: overlap `timeMin`/`timeMax`, `singleEvents=true`, `showDeleted=true`, complete pagination.

---

## 4. Current execution architecture

### Repository fact findings

| Area | Current state |
| --- | --- |
| Runtime | Next.js App Router 16 (`app/page.tsx` → instrument); React client components for production `/` |
| API routes | **None** (`app/api/**` absent) |
| Supabase client | Browser-only `persistence/supabaseBrowserClient.ts` (`NEXT_PUBLIC_SUPABASE_URL` + publishable key) |
| Service role | **Not present** in app code |
| Env template | `.env.example` — only the two public Supabase vars |
| Auth | Email/password via browser Supabase session; `detectSessionInUrl: false` |
| Persistence | `persistence/*` loaders/writers; complete civil-window reads |
| Domain / projections | `domain/*`, `projections/*`; Timeline/CTO/Capacity/Week/Month |
| Instrument | `OrientInstrument` loads Orient sources → `OrientView`; Class A realtime via `canonicalCoherence` |
| Operations UI | LOOK → Position operations: Manage Work schedule, Sign out (borrowed sheet/drawer) |
| Deploy | Vercel from GitHub `main` (ARCHITECTURE-001); no `vercel.json` / cron today |
| Dependencies | Lean: `@supabase/supabase-js`, Next, React — **no** Google SDK |
| Integrations | `integrations/README.md` placeholder only |

**Implication:** V1 must **add** Route Handlers + a server-only Supabase path for credentials and Google calls. Hot path for Orient-owned truth stays browser RLS. Do not invent a second product architecture.

---

## 5. V1 schema plan

Three domain tables + one credential table (security-separated). Names illustrative.

### 5.1 `external_temporal_connections`

| Purpose | Authorization relationship with a provider |
| --- | --- |
| Fields | `id` uuid PK; `user_id` uuid NOT NULL; `provider_type` text NOT NULL (`google_calendar`); `status` text NOT NULL (`pending_auth` \| `connected` \| `auth_failed` \| `disconnected`); `display_label` text NULL (opaque optional); `created_at` / `updated_at` timestamptz NOT NULL |
| Ownership | `user_id` |
| Uniqueness | none beyond PK (multiple sequential connections allowed over time) |
| Indexes | `(user_id, status)` |
| RLS | authenticated select/update/delete **own rows only**; insert own — **no token columns** |
| Realtime | Optional; not required if sources/facts drive reread |

### 5.2 `external_temporal_sources`

| Purpose | Human-selected Observed Source (calendar) |
| --- | --- |
| Fields | `id` uuid PK; `user_id`; `connection_id` FK; `source_local_id` text NOT NULL; `display_name` text NOT NULL; `selected` boolean NOT NULL; `provider_access_role` text NULL; `calendar_time_zone` text NULL; `last_attempted_at` timestamptz NULL; `last_attempt_result` text NULL (`success_complete` \| `success_partial` \| `failure`); `last_successful_observed_at` timestamptz NULL; `last_successful_window_starts_on` date NULL; `last_successful_window_ends_before` date NULL; `created_at` / `updated_at` |
| Uniqueness | unique `(user_id, connection_id, source_local_id)` |
| Indexes | `(user_id, selected)`; `(connection_id)` |
| RLS | own rows select/insert/update/delete |
| Realtime | **Yes** — Class-A-like invalidation |

### 5.3 `external_temporal_facts`

| Purpose | Current-state externally owned temporal evidence |
| --- | --- |
| Fields | `id` uuid PK (wrapper); `user_id`; `source_id` FK; `source_event_id` text NOT NULL; `source_instance_id` text NULL; `source_series_id` text NULL; `temporal_kind` text (`timed` \| `all_day`); timed: `start_at`/`end_at` timestamptz; all-day: `starts_on`/`ends_before` date; `source_time_zone` text NULL; `display_label` text NOT NULL; `lifecycle` text (`active` \| `cancelled` \| `deleted` \| `absent_from_window`); `provider_etag` text NULL; `provider_updated_at` timestamptz NULL; `provider_event_type` text NULL; `provider_transparency` text NULL; `last_observed_at` timestamptz NOT NULL; `created_at` / `updated_at` |
| Shape constraint | timed XOR all-day fields |
| Uniqueness | unique `(user_id, source_id, source_event_id, coalesce(source_instance_id,''))` |
| Indexes | timed: `(user_id, start_at, end_at)`; all-day: `(user_id, starts_on, ends_before)`; `(source_id, lifecycle)` |
| RLS | authenticated **select** own rows; **no** insert/update/delete for authenticated (server/service writes only) — or allow none from browser writers |
| Realtime | **Yes** |

### 5.4 `external_provider_credentials` (not a temporal domain table)

| Purpose | Sealed Google OAuth material |
| --- | --- |
| Fields | `connection_id` uuid PK/FK; `user_id`; `ciphertext` bytea/text NOT NULL; `key_version` text NOT NULL; `scopes` text NOT NULL; `access_token_expires_at` timestamptz NULL; `updated_at` |
| RLS | **No grants to `anon`/`authenticated`**. Service role / server only |
| Realtime | **Never publish** |

Every field above has a V1 reason (identity, observation integrity, projection, or security). No description/HTML/attendees columns.

---

## 6. Credential storage architecture

### Decision: **Option A**

Dedicated Supabase credential table inaccessible to normal clients + **application-layer authenticated encryption** (AES-GCM) using a Vercel server secret.

| Concern | Placement |
| --- | --- |
| Ciphertext | `external_provider_credentials.ciphertext` |
| Encryption key | Vercel env `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY` (server-only) |
| Decryptors | Next.js Route Handlers / server modules only |
| Unencrypted metadata | `connection_id`, `user_id`, `scopes`, `access_token_expires_at`, `key_version` |
| Refresh path | Server decrypts → refresh Google token → re-encrypt refresh (+ optional access cache) → update row |
| Delete/revoke | Server decrypts for revoke call → delete credential row → mark Connection disconnected → delete facts for connection |

### Service-role boundary

**Yes — required.** Introduce `persistence/supabaseServerClient.ts` (name illustrative) that creates a service-role client from `SUPABASE_SERVICE_ROLE_KEY` **only on the server**.

Controls:

- Never import into client components / `NEXT_PUBLIC_` bundle.
- Use only for: credential CRUD; upserting external facts/sources after verified user; never as a general browser bypass for Orient-owned tables from the client.
- Every write path must first authenticate the Orient user (Bearer session JWT validated via user-scoped client or `auth.getUser(jwt)`), then scope mutations to that `user_id`.

No other secret store exists in-repo; do not add Vault/KMS unless A fails review.

---

## 7. OAuth route plan

Likely App Router paths (illustrative):

| Path | Role |
| --- | --- |
| `app/api/external/google/connect/route.ts` | Begin OAuth: create/ensure Connection `pending_auth`; generate `state` (+ PKCE verifier); store server-side (encrypted cookie or short-lived DB row bound to `user_id`); redirect to Google |
| `app/api/external/google/callback/route.ts` | Validate `state`; exchange code; encrypt tokens; set Connection `connected`; redirect to `/` with success marker |
| `app/api/external/google/calendars/route.ts` | Enumerate CalendarList (server Google call) |
| `app/api/external/google/sources/route.ts` | PATCH select/unselect Observed Sources; trigger observation |
| `app/api/external/google/observe/route.ts` | Canonical observation entry (throttled) |
| `app/api/external/google/disconnect/route.ts` | Revoke + clear cache + disconnect |

### Session binding

Browser calls connect with `Authorization: Bearer <supabase access_token>` (from `getSession()`), or HttpOnly session cookie if SSR auth is added later. **Smallest fit today:** Bearer from existing browser session — no new auth dependency required for V1.

Callback binds via validated `state` → stored `user_id` (state must be unforgeable and single-use).

No tokens returned to browser JSON.

PKCE S256: generate `code_verifier` with state; send `code_challenge`; exchange with verifier.

---

## 8. Google adapter boundary

### Module

`integrations/googleCalendar/` (server-only):

- `oauth.ts` — authorize URL, exchange, refresh, revoke  
- `calendarList.ts` — enumerate  
- `observe.ts` — bounded `events.list` pagination  
- `mapEvent.ts` — pure Google → provider-neutral fact  

### Dependency recommendation

**Direct HTTPS to Google OAuth + Calendar REST** for V1 (no `googleapis` package).

Rationale: surface is tiny (token + calendarList.list + events.list + revoke); repo is dependency-lean; keeps Google types out of `domain/`.

Official client remains optional later if burden grows.

Port shape (conceptual): `observeSource({ calendarId, timeMin, timeMax, accessToken }) → { pagesComplete, events[] }`.

---

## 9. Source-selection plan

### Surface

Extend LOOK → **Position operations** (existing borrowed sheet/drawer beside Manage Work / Sign out):

- **External calendars** (or **Google Calendar**) opens a borrowed operational surface

### Surface contents

Connect / reconnect · connection status · list calendars · select/unselect · last observation health · Disconnect · manual Refresh

Not a new temporal question. Not a top-level Orient domain. Borrows space only while open (same pattern as Work schedule operation).

Likely files: `Surfaces.tsx` / `OrientView.tsx` + new `components/orient/ExternalCalendarsOperation.tsx` (illustrative).

---

## 10. Observation execution

### Entry

Single server function/route: `observeSelectedSources(userId, options?)`.

### Horizon

From Orient confirmed zone “today”:

- `windowStartsOn = today − 7`
- `windowEndsBefore = today + 43` (42 days future inclusive ⇒ exclusive end +43)
- Convert to Google `timeMin`/`timeMax` RFC3339 with mandatory offset (UTC Z)

### Per selected source

1. Ensure fresh access token (refresh if needed).  
2. `events.list` with `singleEvents=true`, `showDeleted=true`, `orderBy=startTime`, window bounds.  
3. Paginate until no `nextPageToken`; any page error → `success_partial`/`failure`, **stop absence logic**.  
4. Map events → facts; upsert by identity; preserve wrapper `id`.  
5. On **success_complete**: mark in-window prior `active` facts not seen → `absent_from_window`.  
6. Update source attempt/success/window/completeness fields.

### Transactions

Prefer: per-source transaction (upsert batch + absence marks + source health) so one calendar failure does not roll back another.

---

## 11. Refresh triggers

| Trigger | V1 |
| --- | --- |
| After source selection change | Yes — server observe |
| Manual Refresh in operations surface | Yes |
| Instrument load / visibility return | Browser calls **throttled** server observe endpoint (not Google from browser) |
| Periodic | See §12 |

**Canonical path:** only the server observe endpoint talks to Google. Enforce per-source min interval (e.g. 5–15 minutes) to prevent multi-client hammering.

---

## 12. Scheduling decision

### Recommendation

**A then B:**

1. **Before first physical acceptance of the observation path:** connect/selection + throttled load/visibility + manual refresh (**no cron required**).  
2. **Before calling sustained daily-use ready:** add **Vercel Cron** hitting the observe endpoint ~ every **3 hours** (conceptual).

Cron is not needed to prove correctness; it is needed for reasonable currency without opening the app. Configure only after base observation works.

---

## 13. Google event mapper

Pure function in `integrations/googleCalendar/mapEvent.ts`:

| Input | Output |
| --- | --- |
| Google Event (+ calendar context) | Provider-neutral external fact draft |

Handles: timed/all-day/multi-day/overnight/TZ/instances/cancelled/restricted/`displayLabel` fallback/`etag`/`updated`/`eventType`/`transparency`.

**Must not:** create Task/Commitment/Block; touch Capacity/Work; infer importance/availability.

Fallback label examples (copy polish later): `Private event`, `Busy (external)`.

---

## 14. Cancellation / deletion precision

### Decision (adapter mapping; no new contract refinement)

Google documents `status=cancelled` as “cancelled (deleted)” with recurring-exception subtypes ([Events resource](https://developers.google.com/workspace/calendar/api/v3/reference/events) — already cited in Google discovery).

**V1 Google mapper rule:**

1. If `status` is `confirmed` or `tentative` → Orient `active` (optional tentative metadata).  
2. If `status` is `cancelled` **and** `recurringEventId` is present → Orient `cancelled` (instance cancellation).  
3. If `status` is `cancelled` **and** `recurringEventId` absent → Orient `cancelled` **or** `deleted` only after mapper tests lock the Events-doc subtype rule; **default safer V1:** map to `cancelled` and exclude from active landscape (do not require Orient `deleted` for Google).  
4. Missing from successful complete window → `absent_from_window`.

**No provider-neutral lifecycle refinement** beyond accepted `displayLabel`. If implementers cannot defend rule (3) with Google docs + fixtures, keep Google on `{active, cancelled, absent_from_window}` only.

---

## 15. Persistence update algorithm

For one source, after complete success:

```text
for each mapped fact:
  upsert on (user_id, source_id, source_event_id, source_instance_id)
  preserve existing id on conflict
  set last_observed_at, provider version fields, lifecycle from mapper
  set temporal + displayLabel fields

mark absent:
  among facts for this source where lifecycle was active
  and fact temporally intersects last_successful_window
  and identity not in this observation set
  → lifecycle = absent_from_window

update source health = success_complete + window bounds + timestamps
```

On partial/failure: update attempt/failure fields only; **no** absence marks; retain rows.

Disconnect: delete facts for connection; delete credentials; set connection disconnected; sources unselected or retained as disconnected metadata (recommend: keep source rows with `selected=false` for UX labels, or delete — **prefer delete sources+facts** for privacy minimization, keep Connection row as `disconnected` history).

---

## 16. Domain types

Provider-neutral in `domain/externalTemporal.ts` (illustrative):

- `ExternalConnection`
- `ObservedTemporalSource`
- `ExternalTemporalFact` = timed \| all_day
- `ExternalFactLifecycle`
- `SourceObservationHealth` / attempt result enums

Google DTOs stay under `integrations/googleCalendar/types.ts` — never imported by `domain/` or `projections/` except via mapped facts.

---

## 17. Read path

**Target production shape** (after observation exists — not Tranche 1 runtime wiring):

Extend `OrientInstrument` / `OrientSources`:

| Addition | Shape |
| --- | --- |
| `externalFacts: SourceRead<ExternalTemporalFact>` | Separate from PT/Block/Commitment |
| `externalSources: SourceRead<ObservedTemporalSource>` | Health/provenance |
| `externalConnections` | Optional status for operations UI |

Loaders: `persistence/externalTemporal*.ts` using **browser** client for **select** of facts/sources (RLS). Credentials never loaded in browser.

Do **not** concatenate into Commitment arrays.

Integrity: failed external read ≠ ready empty when claiming external landscape completeness for that connection.

Tranche 1 may add persistence/read mapping and pure composition signatures; it must not wire fixture external facts into the production instrument for demonstration.

---

## 18. Timeline / projection

| Surface | Change |
| --- | --- |
| `projectTimeline` | New input `externalFacts`; emit distinct `sourceKind: "external_temporal"` (name final in impl) with provenance/freshness/lifecycle summary |
| CTO / Present | Include active external facts containing Now **only if** owning source `last_attempt_result` is not failure and connection connected; **exclude stale-after-failed-refresh** |
| Day / Week | Include via Timeline; allow last-known with stale flag when source failed |
| Month | Shared Timeline composition; no Month subsystem |

No view redesign — composition + quiet provenance markers only.

---

## 19. Visual provenance

Minimum (no aesthetic redesign):

- Distinct external marker/kind word (e.g. source calendar short label or “External”)
- Stale cue when showing last-known on Day/Week
- Orient PT/Block/Commitment/Work remain visually their existing kinds

Quiet. Perceivable in normal Present/Day/Week/Month — not inspection-only.

---

## 20. Read-only inspection

**Distinct read-only mode** (shared shell OK; **not** Orient `FactDetail` edit/delete/Save).

Shows: displayLabel; when (timed/all-day); source/calendar name; provider; last observed; fresh/stale; “Owned by Google Calendar”; “Edit in Orient: No”.

Clicking external fact opens this mode; never `updateCommitment` / DTM Save.

---

## 21. Capacity isolation

Unchanged: `capacityCoverage` / `composeWorkCapacityReading` take only Work + PT + Block + Commitment.

Plan: do not pass external facts; add tests that fixture external intervals leave remaining Ms unchanged.

No transparency mapping.

---

## 22. DTM isolation

Unchanged: `isLiftKind` = protected_time \| block \| commitment.

External `sourceKind` never lift-eligible. No `if google`.

---

## 23. Task / ActiveThread / Work isolation

- No writers from mapper/observe to tasks/active_threads/work_schedule_days  
- ACT / Task lists unchanged  
- Tests forbid coupling symbols (`createTask`, `saveWorkWeek`) in google/external observe modules  

---

## 24. Realtime

| Table | Publish? |
| --- | --- |
| `external_temporal_facts` | Yes |
| `external_temporal_sources` | Yes |
| `external_temporal_connections` | Optional |
| `external_provider_credentials` | **Never** |

Extend `canonicalCoherence` bindings for facts/sources (user-filtered INSERT/UPDATE/DELETE as appropriate). Invalidation → existing `reloadToken` reread. No payload-as-store.

---

## 25. Google Cloud human setup

Perform **by the human** outside Cursor chat; never paste secrets into the agent.

| When | Steps |
| --- | --- |
| Before OAuth tranche physical use | Create/select GCP project; enable Calendar API; OAuth consent (Testing + test user = operator); Web application client; redirect URIs (`https://<prod>/api/external/google/callback`, local if needed) |
| Before deploy observe | Set Vercel server env: client id/secret, redirect URI, encryption key, service role key |
| Later if leaving Testing | Verification / sensitive-scope flow as applicable |

Safe secret entry: Vercel dashboard / `vercel env` CLI / local `.env.local` (gitignored) — not chat.

Schema/domain/projection work may begin **before** GCP setup.

---

## 26. Environment contract

| Name (proposed) | Class |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public-safe (existing) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public-safe (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**, server-only |
| `GOOGLE_OAUTH_CLIENT_ID` | server-only (often treated secret-ish; keep server-only) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | **secret** |
| `GOOGLE_OAUTH_REDIRECT_URI` | server-only |
| `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY` | **secret** |
| Optional cron secret header | **secret** |

No values in plan. Extend `.env.example` with **names only** during implementation (empty).

---

## 27. Migration order

1. **Migration A — provider-neutral temporal tables** (`connections`, `sources`, `facts`) + RLS + indexes.  
2. **Migration B — credentials table** with **zero** authenticated grants + comment.  
3. **Migration C — realtime publication** add facts + sources only (after hosted Class A pattern).

Keep B separate for security review. Do not publish credentials.

---

## 28. Test plan

### Pure domain/mapper

Identity; repeat update; timed; all-day; multi-day; overnight; TZ; instance; displayLabel fallback; cancelled mapping.

### Persistence

Uniqueness; wrapper preservation; complete vs partial; absence; disconnect clear; user isolation; credential table not selectable as authenticated.

### Projection

Present admission/stale exclusion; Day/Week/Month; overlap coexistence; provenance kind; Capacity unchanged; DTM ineligible; no Task/Work side effects.

### OAuth/security

State mismatch reject; PKCE exchange path (unit); token never in public JSON; refresh; revoke; service-role module not imported from client tests’ import graph.

### Realtime

Bindings include external facts/sources; exclude credentials.

---

## 29. Physical acceptance plan

Follow: implement → automate → review → commit/push main → deploy → **then** physical acceptance → acceptance doc.

Deployed proofs:

1. Connect Google (Testing)  
2. Select calendar(s)  
3. Timed external fact appears with provenance  
4. All-day external fact appears  
5. Phone + laptop converge without manual refresh (realtime/visibility)  
6. External fact not editable / not DTM-liftable  
7. Orient Commitment/Block still editable  
8. Capacity unchanged when only external event covers Work territory  
9. Disconnect clears external cache; Orient rows remain  

---

## 30. Implementation tranches

| # | Purpose | Likely touch | Schema | Out of scope |
| --- | --- | --- | --- | --- |
| **1** | Provider-neutral foundation: schema/domain/persistence + pure projection composition + fixture-driven isolation tests | `domain/`, `persistence/`, `projections/`, tests | Migration A | Google, OAuth, credentials, service-role, production instrument wiring, UI, realtime, cron |
| **2** | Credential store + AES-GCM helpers + server Supabase client | `persistence/supabaseServerClient.ts`, crypto module, Migration B, env example names | Migration B | Google calls |
| **3** | OAuth connect/callback/disconnect + CalendarList + selection UI | `app/api/external/google/*`, `integrations/googleCalendar/oauth|calendarList`, ExternalCalendarsOperation | — | Observation mapping |
| **4** | Bounded observe + mapper + upsert algorithm + triggers/throttle | `observe.ts`, `mapEvent.ts`, observe route, instrument refresh hook | — | Cron, webhooks |
| **5** | Visual provenance + read-only inspection + production external SourceRead wiring | Landscape/Surfaces/inspect, `OrientInstrument` | — | Redesign |
| **6** | Realtime publication + coherence bindings | Migration C, `canonicalCoherence` | Migration C | — |
| **7** | Vercel cron + human GCP/Vercel secrets + physical acceptance record | `vercel.json` or dashboard cron, acceptance doc | — | syncToken, write APIs |

Exact later tranche boundaries may be refined by implementation evidence without reopening product semantics.

Next implementation task after this plan: **EXTERNAL-TEMPORAL-CORE-IMPLEMENTATION-001** (refined Tranche 1).

---

## 31. First implementation tranche

### Exact first cut: **Tranche 1 — Provider-neutral external temporal core (fixtures in tests only, no Google)**

**Purpose**

Prove **storage → domain representation → deterministic projection → authority isolation** without pretending externally observed truth exists before an actual external observation path exists.

**Why first**

- Locks ownership/isolation/projection before secrets and OAuth complexity.  
- Reviewable without GCP.  
- Unblocks parallel human Google Cloud setup.  
- Fails closed on Capacity/DTM/Task if composition is wrong — cheapest time to catch authority leakage.

**Tranche 1 SHOULD establish**

- provider-neutral schema (Migration A: connections, sources, facts — not credentials)
- provider-neutral domain types including `displayLabel`
- provider-neutral persistence/read mapping
- deterministic external temporal projection/composition machinery
- Timeline external variant as required for pure composition
- CTO/Day/Week/Month projection behavior at pure/testable boundaries where current architecture permits
- fixture-driven tests
- authority-isolation tests (Capacity / DTM / Task / ActiveThread / Work)

**Tranche 1 SHOULD NOT yet establish**

- Google code
- OAuth
- credential table / security implementation
- service-role client
- production external source or observation endpoint
- fake external production data or visible pseudo-Google facts
- source-selection UI
- production `OrientInstrument` external read wiring merely to expose fixture data
- production provenance chrome
- external Fact inspection UI
- realtime publication
- cron

Fixtures belong in tests, not the production instrument. A small production-neutral composition signature change is allowed when required by repository structure. Do not manufacture external truth for runtime demonstration.

**Physical acceptance:** Tranche 1 is architecture/test evidence; it does not require fake physical external-calendar acceptance. Google physical acceptance occurs only after the real provider path exists.

---

## 32. Blockers / dependencies

| Kind | Item | Blocks? |
| --- | --- | --- |
| Repository | None for Tranche 1 | No |
| Architectural | displayLabel already accepted | No |
| Provider config | GCP OAuth client | Blocks physical OAuth/observe, **not** Tranche 1 |
| Secret | Service role + encryption key + Google client secret | Blocks Tranche 2–4 deploy, not Tranche 1 coding |
| Deployment | Vercel env | Blocks deployed acceptance |
| Physical acceptance | After deployed candidate | Later |

---

## 33. Final verdict

## IMPLEMENTATION-READY

Architecture, provider mapping, `displayLabel` refinement, credential approach, and tranche order are sufficiently defined to begin **Tranche 1**.

Not **IMPLEMENTATION-READY-AFTER-CONTRACT-REFINEMENT** — the only required refinement (`displayLabel`) is already accepted.

Not **IMPLEMENTATION-BLOCKED** — Google Cloud secrets are a human dependency for later tranches, not a barrier to the first schema/projection cut.

---

## 34. Evidence references

- [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md)
- [EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md)
- [GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001.md](GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001.md)
- [docs/architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)
- [CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md](CROSS-CLIENT-COHERENCE-PUBLICATION-CONTRACT-001.md)
- `persistence/supabaseBrowserClient.ts`, `components/orient/OrientInstrument.tsx`, `components/orient/Surfaces.tsx`, `components/orient/canonicalCoherence.ts`
- `projections/timeline.ts`, `projections/capacity.ts`, `components/capacityReading.ts`
- `.env.example`, `package.json`, `app/` (no `api/` yet)
