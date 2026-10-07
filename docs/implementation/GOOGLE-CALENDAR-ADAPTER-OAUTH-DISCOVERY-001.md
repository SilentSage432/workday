# GOOGLE-CALENDAR-ADAPTER-OAUTH-DISCOVERY-001

Provider research + repository discovery only. No implementation. No credentials. No Google Cloud project. No migrations. No dependencies. No commit.

## Evidence class key

| Label | Meaning |
| --- | --- |
| Repository fact | Present in Orient source/docs at HEAD |
| Locked Orient decision | Accepted in EXTERNAL-TEMPORAL-* discoveries |
| Google documented behavior | Stated in current official Google documentation (URL cited) |
| Architectural inference / recommendation | Compatible with both authorities; not a Google mandate |
| Unresolved provider question | Not established from official docs or Console classification without live project |

---

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `9d2c58da4ddb4ba2016864f2e94a2457125ab3d5` |
| Tip message | `EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001: define external evidence persistence and composition` |
| `main` vs `origin/main` | Identical |
| Working tree | Clean at discovery start |
| Orient authorities | [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md); [EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md) |
| Prior verdict | `PERSISTENCE-PROJECTION-CLEAR` |

Evidence class: **repository fact**.

---

## 2. Canonical provider question

> Can Google Calendar provide the source identity, temporal shape, lifecycle, freshness/completeness evidence, and bounded observation semantics required by Orient's external temporal contract — and what is the smallest secure read-only adapter/OAuth architecture required to do so?

And:

> Which Google concepts map cleanly into Orient's provider-neutral contract, which require adapter translation, and which must remain provider-specific metadata outside Orient's core domain?

---

## 3. Authorities and evidence policy

| Authority | Role |
| --- | --- |
| **Orient** | Ownership, sovereignty, persistence, projection, isolation, observation≠publication |
| **Google official docs** | OAuth, Calendar API scopes, CalendarList, Events, sync, push, errors |

Google mechanics must not redefine Orient authority. Provider terminology (“synchronization”) remains an **observation optimization**, not bidirectional sync.

Secondary blogs/Stack Overflow were not used as canonical authority.

---

## 4. Locked Orient contract

Summarized (not reopened):

- Persistence: Connection → Observed Source → External Temporal Fact (current-state)
- Observation only; no write-back/publication/adoption/Gemini/auto Task·Commitment·capacity
- Identity: user + observed source + source event id + instance id where applicable + local UUID
- Timed: start/end instants + optional source TZ
- All-day: half-open `starts_on` / `ends_before`
- Failed refresh ≠ deletion; distinct lifecycle/freshness
- Human selects calendars; credentials server-side only
- Provider-resolved occurrences; no Orient recurrence engine
- External facts visibly external; not DTM-eligible

---

## 5. Google OAuth model

### Documented behavior

Google’s **web server application** OAuth 2.0 flow is designed for apps that can store confidential credentials and maintain state: redirect to Google → authorization code → server exchanges code for access + refresh tokens ([Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)).

| Topic | Google documented | Recommendation |
| --- | --- | --- |
| Flow | Authorization code | Use for Orient (Next.js server) |
| Client type | Web application with client secret | Confidential client |
| `access_type=offline` | Recommended for refresh without user present; refresh token returned on first exchange | **Required** for server observation while user away |
| `state` | Recommended CSRF mitigation; validate on callback | **Required** |
| Access token | Short-lived; refresh when expired | Server-only refresh |
| Refresh token | Long-lived; may stop working (revocation, policy, etc.) | Anticipate re-consent |
| Redirect URI | Exact registered HTTPS redirect | Production Orient domain + local/dev URIs as needed |
| Incremental auth | `include_granted_scopes` optional | Optional later |
| PKCE | OpenID discovery advertises `code_challenge_methods_supported` including `S256` ([OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)); web-server guide centers client secret + state | **Architectural recommendation:** PKCE (S256) as defense-in-depth alongside confidential client secret — not treated as Google’s sole mandate for web-server apps |

### Orient fit (repository fact)

ARCHITECTURE-001 already requires Next.js server for Google token exchange; browser hot path stays Supabase RLS. Google sign-in is **not** Orient login.

### Production verification

Public apps requesting scopes that access user data may need verification; reading Calendar events is cited as a sensitive-scope example ([Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)). **Personal use / testing** exceptions exist (tester list, unverified-app screen, capped users). Exact Console classification of each scope string is confirmed in Cloud Console during human setup (**unresolved until project exists**).

---

## 6. Minimum scopes

### V1 recommendation (Google documented + least privilege)

**Primary V1 scope (sufficient alone for enumeration + event read):**

`https://www.googleapis.com/auth/calendar.readonly`

Meaning: “See and download any calendar you can access using your Google Calendar” ([Choose Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth)).

Authorized for:

- `calendarList.list` ([CalendarList: list](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list))
- `events.list` ([Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list))
- `calendars.get` ([Calendars: get](https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get))

### Narrower alternative (optional)

If Console verification pressure favors narrower scopes:

| Scope | Purpose |
| --- | --- |
| `https://www.googleapis.com/auth/calendar.calendarlist.readonly` | Enumerate subscribed calendars |
| `https://www.googleapis.com/auth/calendar.events.readonly` | View events on calendars |

`calendar.readonly` remains the simplest single-scope V1 choice; it does **not** grant create/update/delete.

### Explicitly not requested

`calendar`, `calendar.events` (write), ACL scopes, settings write, freeBusy-only (insufficient for titles/orientation).

### Sensitivity / verification

- Official Calendar auth page requires declaring scopes and notes verification for public apps accessing user data.
- Sensitive-scope verification doc uses “reading events stored in Google Calendar” as a sensitive-scope example.
- Exact sensitive vs restricted badge for `calendar.readonly` is **Console-confirmed at setup** (not invent a badge here).
- For Orient’s single-operator personal use, testing mode / personal-use exception may defer full verification (**Google documented exceptions**).

---

## 7. Calendar enumeration

### Documented behavior

`GET /calendar/v3/users/me/calendarList` returns calendars on the user’s list with pagination (`pageToken`, `nextPageToken`) ([CalendarList: list](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list); [CalendarList resource](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList)).

| Google field | Use for Orient selection |
| --- | --- |
| `id` | Stable Observed Source `sourceLocalId` (opaque; often email-shaped for primary) |
| `summary` / `summaryOverride` | Display name for selection/provenance |
| `primary` | Hint only; do not auto-select |
| `accessRole` | Whether event details vs free/busy-only visibility |
| `hidden` / `selected` | UI hints; **not** Orient selection authority |
| `timeZone` | Calendar default TZ (provider metadata) |
| `deleted` | List-entry deletion when `showDeleted` |

### Mapping

Google CalendarList entry → candidate for human selection → selected entry becomes Orient **Observed Source** under Connection.

**Do not** auto-observe all calendars (**locked**).

`minAccessRole=reader` (optional) can exclude freeBusy-only calendars that cannot supply event details — architectural recommendation.

---

## 8. Connection identity

### Question

> Can Orient maintain a Google Calendar Connection without requesting identity/profile scopes beyond Calendar access?

### Answer

**Yes for V1.**

| Approach | Decision |
| --- | --- |
| Request `openid` / `email` / `profile` | **Not required** for V1 observation |
| Connection identity | Orient-local Connection UUID + provider type `google_calendar` + opaque server credential reference |
| Account “label” | Optional: primary calendar id or summary from CalendarList after connect — treat as **opaque display**, not verified email claim |
| Reconnect same Google account | Without `openid` `sub`, reliable account matching is weak → **prefer new Connection + re-selection** (§30) |

Calendar API does not replace OpenID account identity. Primary calendar `id` often looks like an email but must not be treated as an authorized profile claim without OpenID scopes.

---

## 9. Bounded event listing

### Documented `events.list` semantics

Source: [Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

| Parameter | Documented meaning |
| --- | --- |
| `calendarId` | Calendar identifier (`primary` or CalendarList `id`) |
| `timeMin` | Lower bound (**exclusive**) for an event’s **end** time |
| `timeMax` | Upper bound (**exclusive**) for an event’s **start** time |
| Window semantics | Events that **overlap** `(timeMin, timeMax)` in the sense: `end > timeMin` AND `start < timeMax` |
| `singleEvents` | Expand recurring into instances; omit underlying masters |
| `orderBy=startTime` | Allowed only when `singleEvents=true` |
| `showDeleted` | Include `status=cancelled` |
| `timeZone` | Response TZ; default calendar TZ |
| `pageToken` / `nextPageToken` | Pagination |
| `nextSyncToken` | Present on last page when complete |
| `eventTypes` | Optional filter; unset returns all types |
| `maxResults` | Default 250; max 2500; incomplete pages signaled by `nextPageToken` |

**Critical:** filtering is **overlap-aware**, not “starts inside window only.” Overnight / long events that straddle the horizon remain eligible if they overlap.

RFC3339 timestamps with mandatory offset required for `timeMin`/`timeMax`.

### Orient mapping

Each observation sets `timeMin`/`timeMax` from Orient’s observation horizon in a fixed offset (typically UTC Z) derived from the rolling civil window in Orient’s confirmed zone (**adapter translation**).

V1 observation parameters (recommendation):

```text
singleEvents=true
orderBy=startTime
showDeleted=true   # see lifecycle §15
timeMin / timeMax  # bounded horizon
```

---

## 10. Recurrence / instance expansion

### Documented behavior

- Recurring masters vs instances ([Calendars and events](https://developers.google.com/workspace/calendar/api/concepts/events-calendars); [Recurring events](https://developers.google.com/workspace/calendar/api/guides/recurringevents)).
- `singleEvents=true` expands occurrences for `events.list`.
- Instance fields: own `id`, `recurringEventId`, `originalStartTime` (uniquely identifies instance within series even if moved).

### Answer

> Can Google provide concrete provider-resolved occurrences within Orient's bounded window without Orient implementing recurrence?

**Yes** — use `singleEvents=true` (and/or `events.instances` if needed later). Orient does **not** parse RRULE for V1.

### Identity mapping

| Orient concept | Google field |
| --- | --- |
| `source_event_id` | Event `id` (instance id when expanded) |
| `source_instance_id` | Serialized `originalStartTime` when `recurringEventId` present; else null |
| optional series id | `recurringEventId` (provider metadata / optional column) |

Do not use title/time as identity. `iCalUID` is shared across instances of a series and across systems — **not** Orient’s primary per-occurrence key ([Events resource](https://developers.google.com/workspace/calendar/api/v3/reference/events)).

---

## 11. Timed semantics

### Documented EventDateTime

- Timed events use `start.dateTime` / `end.dateTime` ([Calendars and events](https://developers.google.com/workspace/calendar/api/concepts/events-calendars)).
- `end` is **exclusive** ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)).
- Offset required in `dateTime` unless `timeZone` explicitly set.
- Single events may attach IANA `timeZone`; recurring expansion requires a TZ.
- Times may be expressed with offset, named zone, or UTC `Z`.

### Mapping to Orient

| Orient | Google |
| --- | --- |
| `start_at` | Parse `start.dateTime` → timestamptz |
| `end_at` | Parse `end.dateTime` → timestamptz (exclusive end preserved) |
| `source_time_zone` | Prefer `start.timeZone` / `end.timeZone` when present; else calendar TZ |

Provider metadata (not core): differing start/end zones for travel events; `endTimeUnspecified`.

Floating/local without offset: adapter must resolve using Google’s rules / calendar TZ before persisting instants; residual ambiguity → unsupported/quarantine (**adapter**).

---

## 12. All-day semantics

### Documented behavior

- All-day uses `start.date` / `end.date` (yyyy-mm-dd).
- Timezone field has **no significance** for all-day events ([Calendars and events](https://developers.google.com/workspace/calendar/api/concepts/events-calendars)).
- `end` is exclusive ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)).
- Single-day example pattern in concepts: start `2015-06-01`, end `2015-06-02`.
- All-day matching against `timeMin`/`timeMax` uses **calendar time zone** to interpret day bounds ([Calendars and events](https://developers.google.com/workspace/calendar/api/concepts/events-calendars)).

### Mapping

| Orient | Google |
| --- | --- |
| `starts_on` | `start.date` |
| `ends_before` | `end.date` |

Maps **naturally** to Orient’s half-open civil span. No invented clocks.

Retain calendar `timeZone` as provider metadata for explaining window membership, not as Orient civil-day ownership.

---

## 13. Event identity

| Google | Semantics (documented) | Orient use |
| --- | --- | --- |
| Event `id` | Opaque; unique per calendar; instances have distinct ids | `source_event_id` |
| `iCalUID` | RFC5545 UID; shared by all occurrences of a series | Provider metadata only (not primary key) |
| `recurringEventId` | Parent series id on instances | Optional series id |
| `originalStartTime` | Stable instance key within series | Feeds `source_instance_id` |
| Across calendars | Related copies may differ in `id` | Distinct Observed Sources → distinct facts (no auto-merge) |

Moving events between calendars: treat as identity under the **Observed Source** being observed; do not invent cross-calendar merge.

---

## 14. Version / change evidence

| Google field | Retain? |
| --- | --- |
| `etag` | Yes — opaque `providerVersion` / change token |
| `updated` | Yes — provider-updated timestamp metadata |
| `sequence` | Optional provider metadata |

These do **not** imply Orient ownership. Useful for detecting unchanged repeats.

---

## 15. Cancellation / deletion

### Documented behavior ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events) `status`)

`status` values: `confirmed` (default), `tentative`, `cancelled`.

**`cancelled` means “cancelled (deleted)”** with two documented subtypes:

1. **Cancelled recurring exceptions** — instance should not be presented; store for lifetime of parent; guaranteed fields: `id`, `recurringEventId`, `originalStartTime`.
2. **All other cancelled events** — represent **deleted** events; clients should remove local copies; eventually disappear; only `id` guaranteed.

`showDeleted=true` or incremental sync returns cancelled entries; default list omits them.

### Orient mapping (adapter translation)

| Google evidence | Orient lifecycle |
| --- | --- |
| `status=confirmed` / `tentative` | `active` (tentative may be provider metadata flag) |
| `cancelled` + `recurringEventId` present | `cancelled` |
| `cancelled` without recurring instance pattern | `deleted` |
| Missing from successful complete bounded window (not returned as cancelled) | `absent_from_window` |

Google does **not** expose a separate “deleted” status string; distinction is documented via cancelled subtypes. Do not invent a third Google status.

---

## 16. Incremental synchronization

### Documented behavior ([Synchronize resources efficiently](https://developers.google.com/workspace/calendar/api/guides/sync))

- Initial full list → persist `nextSyncToken` (last page only).
- Later list with `syncToken` returns changes including deletes.
- Cannot combine `syncToken` with `timeMin`/`timeMax`/`orderBy`/etc.
- `410` → wipe store + full resync (`fullSyncRequired`).
- Per-calendar events collection.

### Orient terminology

Google “sync” = **observation optimization**. Does **not** authorize bidirectional sync or write-back (**locked**).

---

## 17. Full-window vs sync-token strategy

| Strategy | Pros | Cons |
| --- | --- | --- |
| **A. Bounded full `events.list` each refresh** | Direct completeness for window; natural bounded absence; simpler lifecycle | More bandwidth |
| **B. Initial bounded full + syncToken incremental** | Efficient deltas | Incremental ignores time bounds; store grows; 410 wipe complexity; harder rolling-horizon absence |

### V1 recommendation

**A — bounded full window observation per refresh** with `singleEvents=true`, complete pagination, `showDeleted=true`.

Defer syncToken optimization to a later tranche after V1 physical acceptance. If adopted later, still call the product relationship **observation**.

---

## 18. Pagination / completeness

### Documented

- Incomplete page ⇒ non-empty `nextPageToken` ([Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)).
- `nextSyncToken` only when no further pages.
- Page failure / mid-traversal error ⇒ incomplete.

### Adapter rule (aligns with Orient)

> A source observation is **complete** only after every required page succeeds and no `nextPageToken` remains.

Otherwise mark `success_partial` or `failure`. **Must not** apply `absent_from_window` on partial/failed observation (**locked**).

---

## 19. Private / restricted events

### Documented

`accessRole=reader`: “Private events will appear … but event details will be hidden” ([Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) response `accessRole`; CalendarList `accessRole`).

Visibility values include `private` / `confidential` ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)).

### Contract refinement required

Prior persistence discovery said title/summary is required for orientation. Google may expose **temporal occupancy without a usable summary**.

**Refinement:** core display field is **`displayLabel`**:

- use `summary` when present and non-blank;
- otherwise adapter supplies a truthful fallback such as `Busy (external)` / `Private event` (exact copy later);
- never invent private details Google withholds.

This is a **provider-neutral contract refinement** (title → display label when permitted).

---

## 20. Transparency / free-busy

### Documented

`transparency`: `opaque` (Busy) / `transparent` (Available) ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)).

### Decision

Retain as **optional provider metadata** only.

**Must not** feed Orient Capacity (**locked**). Google Busy ≠ Orient Protected Time / Commitment utilization.

---

## 21. Event types

### Documented

`eventType`: `default`, `outOfOffice`, `focusTime`, `workingLocation`, `fromGmail`, `birthday`, … ([Events](https://developers.google.com/workspace/calendar/api/v3/reference/events); [Event types](https://developers.google.com/workspace/calendar/api/guides/event-types)). Unset list returns all types.

### V1 decision

- Observe **all temporal types** returned in the bounded window (no silent type ontology in Orient core).
- Persist `eventType` as provider metadata.
- Do not map Google types to Orient Commitment/Block/PT/Work.
- Optional later exclusion (e.g. workingLocation noise) is product policy after use — not V1 hard filter unless cognitive noise proves severe in acceptance.

---

## 22. Timezone behavior

| Layer | Rule |
| --- | --- |
| Orient civil Day/Week/Month | Confirmed Orient `temporal_settings` zone (**repository fact**) |
| Google calendar TZ | Default for list response / all-day window matching |
| Event TZ | Attach when present; recurring expansion TZ required by Google |
| Assumption forbidden | Calendar TZ ≠ Orient confirmed TZ |

Adapter projects instants into Orient civil geometry using Orient’s zone; retains Google TZ fields for inspection.

---

## 23. Observation horizon

### Recommendation (architectural)

Rolling window relative to Orient “today” in the confirmed zone:

| Bound | V1 recommendation |
| --- | --- |
| Past | **7** civil days before today |
| Future | **42** civil days after today (covers ~Month 28/35 field + buffer) |

Rationale: present orientation + upcoming awareness + short recovery past; avoid all-history. Convert to `timeMin`/`timeMax` UTC/RFC3339 for `events.list`.

Not syncToken-driven for V1 (§17). Configurable later if needed.

---

## 24. Refresh cadence

### Quotas

Per-user / project rate limits exist; exact numbers are **project-specific** in Cloud Console ([Handle API errors](https://developers.google.com/workspace/calendar/api/guides/errors); manage quotas). Do not invent numeric quotas here.

### Semantic cadence (recommendation)

Trigger bounded observation when:

1. Connection completes / sources selected or changed;
2. Server periodic refresh on the order of **hours** (e.g. 1–6h) while connected;
3. Orient visibility/reconnect path may request server refresh (not browser Google calls);
4. Optional explicit “refresh external” later.

Not second-by-second. Exponential backoff on 403/429 rate limits.

---

## 25. Push notifications / webhooks

### Documented ([Push notifications](https://developers.google.com/workspace/calendar/api/guides/push))

- Watch channels per resource; HTTPS endpoint with valid cert.
- Notifications are **headers only** — **no event body**; client must call API again.
- Channel expiration/renewal (manual re-`watch`); not 100% reliable.
- Events watches are **per calendar**.

### Decision

**B — useful later; unnecessary for V1.**

V1 uses bounded polling/refresh. Webhooks add ops complexity without removing API reads.

---

## 26. Error mapping

| Google | Orient semantic |
| --- | --- |
| 401 authError | Connection auth failure → refresh; if refresh fails, re-consent |
| 403 forbidden / access | Source access loss / permission problem |
| 403/429 rateLimitExceeded | Observation failed/deferred; backoff; **not** empty facts |
| 404 calendar | Source missing / access loss |
| 410 fullSyncRequired | If using syncToken later: full resync; for V1 full-window: treat as provider signal to retry full window |
| 5xx backendError | Provider unavailable / observation failed |
| Mid-pagination failure | `success_partial` or `failure` — not complete |

API error must **not** produce “successful empty calendar” (**locked** / integrity).

---

## 27. Token storage

### Requirements (locked + ARCHITECTURE-001)

Server-only; never `NEXT_PUBLIC_`; never browser; never ordinary external fact/source domain rows; never repository; never logs.

### Recommendation

| Item | Store |
| --- | --- |
| Refresh token | Server-only credential store (separate table or secret backend), encrypted at rest with server key from Vercel/env |
| Access token | Optional cache with expiry; may be ephemeral in server memory |
| Expiry / scopes granted | Beside credentials |
| Connection metadata | Ordinary Connection row (no token plaintext) |

**Application-layer encryption** of refresh tokens in Supabase is recommended so even service misconfiguration is harder to exfiltrate; alternatively a dedicated secret manager. Exact mechanism is implementation — credentials must not be readable via normal authenticated RLS select of temporal facts.

Server adapter uses service role / server path to write external facts after Google calls; browser reads facts under user RLS only.

---

## 28. Server / browser boundary

| Must be server-side | Browser may receive |
| --- | --- |
| OAuth start/callback + code exchange | Connection status |
| Token refresh / revoke | Selectable calendar metadata (id, summary, primary, accessRole) |
| All Calendar API calls | Observation health / freshness semantics |
| Credential storage | External temporal facts + projections |
| Future webhooks (if any) | Never Google bearer/refresh tokens |

---

## 29. Disconnect / revocation

| Action | Behavior |
| --- | --- |
| Orient disconnect | Clear external fact cache for Connection; mark disconnected; stop observation (**locked**) |
| Provider revoke | Call `POST https://oauth2.googleapis.com/revoke` with refresh/access token ([OpenID Connect API Reference](https://developers.google.com/identity/openid-connect/reference); web-server revoke docs) on **full disconnect** — recommended |
| User revokes in Google Account | Next refresh/API → 401 → Connection auth failure; clear/stop observation; Orient-owned truth unchanged |
| Refresh invalid | Same as auth failure path |

---

## 30. Reconnect

Without OpenID `sub`, do **not** guess account identity from calendar titles.

**V1 recommendation:** reconnect creates a **new Connection**; prior disconnected Connection remains historical or is replaced explicitly by human action; human re-selects Observed Sources.

Optional later: add `openid` (not `email`/`profile`) solely for stable `sub` matching — out of V1 minimum.

---

## 31. Calendar removal / access loss

| Signal | Mapping |
| --- | --- |
| CalendarList entry missing / `deleted` | Observed Source access loss / unlisted — **not** mass event deletion by itself |
| `events.list` 404 | Source access loss |
| `accessRole` degraded to freeBusyReader | Details hidden; may still see busy blocks with redacted labels |
| Hidden calendar | Still observable if previously selected and API allows; selection remains human authority |

CalendarList absence ≠ proof each prior event was cancelled; combine with observation results carefully.

---

## 32. Google → Orient mapping table

| Google concept/field | Adapter interpretation | Orient concept | Persisted? | Notes |
| --- | --- | --- | --- | --- |
| OAuth grant + refresh token | Server credential | Connection auth | Credential store | Not domain fact row |
| CalendarList entry | Selectable source | Observed Source candidate | Source row when selected | Human selects |
| `calendar.id` | Opaque source local id | Observed Source `sourceLocalId` | Yes | |
| `summary` / `summaryOverride` | Display name | Source display name | Yes | |
| `timeZone` (calendar) | Calendar TZ | Provider metadata | Yes on source | ≠ Orient zone |
| `primary` | Hint | Metadata | Optional | No auto-select |
| `accessRole` | Detail visibility | Source metadata | Yes | Private detail rules |
| Event `id` | Occurrence/event id | `source_event_id` | Yes | |
| `recurringEventId` | Series id | Optional series id | Optional | |
| `originalStartTime` | Instance key | `source_instance_id` | When instance | |
| `iCalUID` | Cross-system UID | Provider metadata | Optional | Not primary key |
| `status=confirmed/tentative` | Active-ish | `active` (+ tentative flag) | Yes | |
| `status=cancelled` | Cancelled instance or deleted | `cancelled` or `deleted` | Yes | §15 |
| `etag` / `updated` | Version evidence | providerVersion / updatedAt | Yes | |
| `start.dateTime` / `end.dateTime` | Timed exclusive end | `start_at` / `end_at` | Yes | |
| `start.timeZone` / `end.timeZone` | Source TZ | `source_time_zone` | Optional | |
| `start.date` / `end.date` | All-day exclusive end | `starts_on` / `ends_before` | Yes | |
| `summary` | Title when permitted | `displayLabel` | Yes | Fallback if absent |
| `visibility` | Privacy | Provider metadata | Optional | |
| `transparency` | Busy/free UI | Provider metadata | Optional | Never Capacity |
| `eventType` | Google type | Provider metadata | Optional | |
| `nextPageToken` | Pagination | Transient | No | Completeness gate |
| `nextSyncToken` | Incremental cursor | Deferred V1 | Later | Observation opt |
| 410 sync invalidation | Full resync signal | Deferred with syncToken | Later | |

---

## 33. Contract pressure test

| Class | Items |
| --- | --- |
| **A. Clean mappings** | CalendarList→Observed Source; timed/all-day exclusive ends; `singleEvents` occurrences; overlap `timeMin`/`timeMax`; OAuth offline web-server; server token boundary |
| **B. Adapter-only translations** | Cancelled subtype → Orient cancelled vs deleted; RFC3339 window from civil horizon; displayLabel fallback; instance id serialization |
| **C. Provider metadata only** | transparency, eventType, iCalUID, reminders[], attendees, description HTML, conferenceData |
| **D. Provider-neutral refinement required** | **Display label when provider permits** (replaces absolute “title required”) — §19 |
| **E. Cannot truthfully represent** | None that block V1 observation; Google collapses cancel/delete into `status=cancelled` with documented subtype rules — representable via adapter mapping |

---

## 34. Google V1 adapter contract

Smallest concrete behavior:

1. **Connect** — start OAuth (`calendar.readonly`, `access_type=offline`, `state`, redirect).
2. **Authorize** — server exchanges code; store encrypted refresh token; create Connection.
3. **Enumerate** — `calendarList.list` complete pages → selection UI data.
4. **Human selects** Observed Sources (calendar ids).
5. **Observe** — per selected calendar, bounded `events.list` (`singleEvents`, `showDeleted`, `timeMin`/`timeMax`).
6. **Resolve occurrences** — via `singleEvents` (no Orient RRULE engine).
7. **Paginate completely** — fail closed if incomplete.
8. **Map** → provider-neutral External Temporal Facts + source observation metadata.
9. **Persist** current-state upsert by source identity; update repeats in place.
10. **Lifecycle** — active / cancelled / deleted / absent_from_window per §15–16.
11. **Failure/staleness** — preserve last-known on failure; never equate failure to empty success.
12. **Disconnect** — revoke token (best effort), clear fact cache, mark disconnected.

---

## 35. Google V1 non-goals

- No event create/update/delete  
- No bidirectional sync / write-back / publication / Gemini  
- No provider reminder delivery; no Orient reminders  
- No attendee/RSVP/ACL/settings mutation  
- No automatic Task/Commitment/MustDo/ActiveThread/Capacity/DTM  
- No Orient recurrence engine  
- No webhook infrastructure in V1  
- No generic plugin framework  
- No Google types in `domain/`  

---

## 36. Human setup requirements (do not perform now)

### A. One-time human setup

- Google Cloud project (new or existing)  
- Enable Google Calendar API  
- OAuth consent screen (External or Testing; support email; privacy policy URI when required)  
- OAuth Client ID type **Web application**  
- Authorized redirect URI(s) for production (+ local if used)  
- Note Client ID + Client secret  
- Test users if Publishing status = Testing  
- Verification path if/when leaving personal/testing exception  

### B. Repository implementation (later)

- Server OAuth routes + adapter + schema + projection wiring  

### C. Deployment configuration

- Vercel/server env: client id/secret, redirect URI, token encryption key  
- Supabase server credentials for adapter writes  
- Never commit secrets  

---

## 37. Security threat check

| Threat | Control (conceptual) |
| --- | --- |
| Refresh-token theft | Encrypt at rest; server-only; rotate keys; revoke on disconnect |
| Browser token exposure | Never send tokens to client; no `NEXT_PUBLIC_` secrets |
| OAuth CSRF | Cryptographic `state`; bind to session; reject mismatch |
| Redirect URI abuse | Exact allowlisted HTTPS URIs |
| Token logging | Redact; no token in logs/analytics |
| Credentials in domain rows | Separate credential store |
| Overbroad scopes | `calendar.readonly` only |
| Source-selection escalation | Persist only human-selected calendar ids |
| RLS leakage | `user_id` policies; server writes scoped to user |
| Malicious HTML in description | Do not persist description V1; sanitize if ever shown |
| Oversized summary | Truncate to safe display limit |
| Stale authorization | Handle 401; force re-consent |
| Disconnect failure | Still clear local cache/credentials best-effort; mark disconnected |

---

## 38. Provider-specific test contract

### Pure adapter mapping

Timed; all-day; multi-day; recurring occurrence (+ cancelled instance); private/restricted (redacted label); timezone; identity (`id`/`recurringEventId`/`originalStartTime`); etag/updated.

### Observation

Pagination complete; page failure ≠ empty success; initial + repeated observation; bounded absence only after complete success; auth failure; access loss; disconnect cache clear.

### Security

No token in browser payloads; no token in domain fact reads; state validation; RLS ownership; server-only credential path.

(Sync-token tests deferred with strategy B.)

---

## 39. Recommended implementation plan

1. Preserve this discovery (commit when requested).  
2. Provider-neutral schema/domain/persistence for Connection / Observed Source / External Fact (+ displayLabel refinement).  
3. Secure Google Connection/OAuth (server routes, encrypted token store, state).  
4. Calendar enumeration + human selection.  
5. Bounded observation adapter (`events.list` full-window).  
6. Timeline/CTO/Day/Week/Month composition + isolation tests.  
7. Read-only inspection + normal-projection provenance.  
8. Realtime invalidation membership for external tables.  
9. Human Google Cloud / Vercel configuration.  
10. Automated validation + deployed physical acceptance.

Keep Google SDK usage confined to `integrations/` / server modules.

---

## 40. Final verdict

## GOOGLE-ADAPTER-CLEAR-WITH-CONTRACT-REFINEMENT

Google’s documented semantics map cleanly enough into Orient’s external temporal contract for bounded implementation planning, **after one explicit provider-neutral refinement**:

> Persist/orient on **`displayLabel`** (summary when permitted; truthful fallback when private/restricted details are hidden), rather than requiring a provider-supplied title in all cases.

Cancellation vs deletion is representable via Google’s documented `cancelled` subtypes (adapter translation), not a blocker.

Not **GOOGLE-ADAPTER-NOT-CLEAR**: OAuth offline web-server flow, read-only scope, overlap window, all-day exclusive end, and `singleEvents` occurrence expansion are documented and sufficient for V1 observation.

Not **GOOGLE-ADAPTER-CLEAR** alone: the displayLabel refinement must be accepted into the provider-neutral contract before/at schema implementation.

---

## 41. Official Google evidence references

| Topic | URL |
| --- | --- |
| Calendar API scopes | https://developers.google.com/workspace/calendar/api/auth |
| OAuth scopes list | https://developers.google.com/identity/protocols/oauth2/scopes |
| OAuth web server apps | https://developers.google.com/identity/protocols/oauth2/web-server |
| OAuth overview | https://developers.google.com/identity/protocols/oauth2 |
| Sensitive scope verification | https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification |
| OAuth policy compliance | https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance |
| API Services User Data Policy | https://developers.google.com/terms/api-services-user-data-policy |
| OpenID Connect | https://developers.google.com/identity/openid-connect/openid-connect |
| OpenID Connect API reference (revoke) | https://developers.google.com/identity/openid-connect/reference |
| Events: list | https://developers.google.com/workspace/calendar/api/v3/reference/events/list |
| Events resource | https://developers.google.com/workspace/calendar/api/v3/reference/events |
| CalendarList resource | https://developers.google.com/workspace/calendar/api/v3/reference/calendarList |
| CalendarList: list | https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list |
| Calendars: get | https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get |
| Calendars and events concepts | https://developers.google.com/workspace/calendar/api/concepts/events-calendars |
| Recurring events | https://developers.google.com/workspace/calendar/api/guides/recurringevents |
| Events: instances | https://developers.google.com/workspace/calendar/api/v3/reference/events/instances |
| Incremental sync | https://developers.google.com/workspace/calendar/api/guides/sync |
| Push notifications | https://developers.google.com/workspace/calendar/api/guides/push |
| Events: watch | https://developers.google.com/workspace/calendar/api/v3/reference/events/watch |
| Handle API errors | https://developers.google.com/workspace/calendar/api/guides/errors |
| Event types | https://developers.google.com/workspace/calendar/api/guides/event-types |

### Orient repository references

- [EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-OBSERVATION-DISCOVERY-001.md)
- [EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md](EXTERNAL-TEMPORAL-PERSISTENCE-PROJECTION-DISCOVERY-001.md)
- [docs/architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md)
- `integrations/README.md`
