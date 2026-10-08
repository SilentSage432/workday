# GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-001

Bounded Tranche 4 implementation. First real external temporal observation path.

## Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD at start | `508282dfd890c36ad0b5ffe1e0b91fb3beddd30c` |
| Tip message | `GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-ACCEPTANCE-001: accept production provider relationship` |
| `main` vs `origin/main` | Identical at start |
| Working tree at start | Clean |
| Prior tranche | Tranche 3 OAuth + source selection (physically accepted, CLOSED) |
| Plan authority | [GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md](GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md) |

## Observation boundary

Selected Google calendar
→ bounded `events.list`
→ pure Google→provider-neutral mapping
→ transactional external Fact persistence
→ separate external `SourceRead`
→ Timeline / Present / Day / Week / Month composition

**Google establishes Google temporal truth. Orient observes evidence of that truth. Persistence location does not transfer ownership.**

## Selected-source authority

Observation operates only on `external_temporal_sources` with `selected=true` for the owned connected Google Connection.

- No CalendarList inference
- No primary / accessRole inference
- Zero selected Sources → truthful successful no-op (not an error)

## Horizon computation

`server/googleCalendar/horizon.ts`

- Orient today −7 civil days through +42 civil days inclusive
- `windowEndsBefore = today + 43`
- `timeMin` / `timeMax` = Orient-zone midnights of those civil bounds as RFC3339 UTC Z
- Matches Google overlap semantics (`end > timeMin` AND `start < timeMax`)

## Provider query semantics

`server/googleCalendar/events.ts` — direct HTTPS `events.list`:

- `singleEvents=true`
- `showDeleted=true`
- `orderBy=startTime` (provider convenience only)
- complete pagination (fail → partial/failure, never empty success)
- no `googleapis` dependency

## Mapper

`server/googleCalendar/mapEvent.ts` — pure; no DB; no Orient writers.

| Google | Provider-neutral |
| --- | --- |
| timed `dateTime` | `start_at` / `end_at` instants + optional source TZ |
| all-day `date` | half-open `starts_on` / `ends_before` |
| `summary` / restricted | `displayLabel` or `Private event` / `Busy (external)` |
| `status=cancelled` | lifecycle `cancelled` (not strengthened to `deleted`) |
| `eventType` / `transparency` | metadata only |
| occurrence | `source_event_id` + `source_instance_id` from `originalStartTime` when series present |

Google DTOs never enter `domain/` or projections.

## Identity

Stable identity: `(user, source, source_event_id, source_instance_id)`.

- Recurring: `source_series_id = recurringEventId`; instance key from `originalStartTime`
- No cross-calendar merge; no title/time fuzzy dedupe
- Repeat observation updates the same wrapper row

## Recurrence

Provider-resolved via `singleEvents=true`. No Orient RRULE engine. One observed occurrence → one Fact.

## Cancellation

`cancelled` → Orient `cancelled`. Excluded from active landscape. Not silently `deleted`.

## Bounded absence

Only after **successful complete** observation persistence with `apply_absence=true`.

Means: not present in that complete bounded provider result.

Does **not** apply after auth/provider/partial/malformed failure or disconnect.

## Transactionality

Migration `supabase/migrations/20261008010000_persist_external_source_observation.sql`:

- `persist_external_source_observation(...)` — security definer, **service_role only**
- Upserts facts + optional absence + source health in one transaction
- Non-complete attempts update attempt evidence only; no absence; no fact mutation
- Success is claimed only after this RPC returns

Authenticated grants on `external_temporal_facts` remain **SELECT-only** (unchanged).

## Source health / freshness

Source fields updated: `last_attempted_at`, `last_attempt_result`, `last_successful_observed_at`, successful window bounds.

Freshness via existing `deriveExternalObservationFreshness` — no confidence scores.

## Observe endpoint

`POST /api/external/google/observe`

- Authenticate Orient human
- Open/refresh credential server-side
- Observe each selected Source
- Return safe summary only (no tokens, no raw Google Event DTOs)

## Multi-source result

Per-Source summaries. Global success is not claimed when any Source fails. `reconnectRequired` when authorization invalid.

## Observation triggers

| Trigger | Behavior |
| --- | --- |
| Selection save | Client calls canonical observe with `force=true` after successful save (selection route stays free of observation logic) |
| Manual | **Refresh observed calendars** in Google management surface |
| Load / visibility | Throttled observe (`force=false`); server min interval **15 minutes** per Source |

One canonical implementation: `observeSelectedGoogleSources`.

## Production SourceRead wiring

`OrientInstrument` loads separately:

- `externalConnections`
- `externalSources`
- `externalFacts`

Failed external read does **not** erase Orient-owned readiness. External evidence is omitted when incomplete.

## Timeline / Present / Day / Week / Month

Existing provider-neutral composition consumes external Facts:

- Timeline `sourceKind: "external_temporal"`, `correctionAuthority: "external"`
- Present/CTO: active + freshness `fresh` only
- Day/Week: last-known stale admitted with stale flag
- Month: shared Timeline composition
- Coexistence with Orient facts; no fuzzy dedupe

## Minimum visible provenance

- Day/Week kind label uses source display name (or “External”)
- Dotted contour (`kindContour`)
- Fact inspection note: “From an external calendar. Read-only in Orient.”
- No full FactDetail redesign (Tranche 5)

## Read-only interaction

External facts: `stored = null` → not editable; not removable; not DTM-liftable (`isLiftKind` excludes `external_temporal`).

## Capacity / DTM / Task / Work isolation

Unchanged. External Facts never enter `capacityCoverage`. No observation writers to Task / ActiveThread / Work / Commitment / Block / PT. Architectural tests guard observation modules.

## Disconnect external-cache behavior

`disconnectGoogleCalendarForUser` calls `clear_external_facts_for_connection` before selection clear / disconnect mark. Remote revoke failure does not prevent local evidence withdrawal. Orient-owned tables untouched.

## Failure / UI semantics

Management surface distinguishes: never observed · observing · success · success zero events · partial · failed/last-known retained · reconnect required.

No “Sync” / “Imported” language.

## Security

- Authenticated user + owned Connection + selected Sources only
- Credential open/refresh server-side
- Calendar ID URL-encoded
- Pagination bounded
- Provider text sanitized/truncated
- No token logging / no raw Google body to browser
- Fact writes service-role RPC only

## Database / RLS

Provider-neutral RPCs only. No Google-specific schema. No broadening of authenticated Fact write grants. Hosted table-level privilege watchpoint left untouched (not casually revoked in this tranche).

## Realtime

Not added. Production rereads external evidence after observation completion / disconnect. Tranche 6 owns publication.

## Tests

Mapper · events adapter · horizon · observe orchestration · persistence RPC contract · disconnect cache clear · projection isolation (existing) · production load · UI observation states · architecture guards.

## Validation

| Check | Result |
| --- | --- |
| Targeted observation tests | Pass |
| Full `npm test` | Pass (919) |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (no real Google secrets required for build) |

## Files changed (summary)

- `server/googleCalendar/{events,mapEvent,horizon,observe,observationPersistence}.ts` (+ tests)
- `app/api/external/google/observe/route.ts`
- `supabase/migrations/20261008010000_persist_external_source_observation.sql`
- `components/orient/{OrientInstrument,OrientView,ExternalCalendarsOperation,externalCalendarsApi,types,DesktopReading,PhoneContinuity,Surfaces}.tsx`
- `components/{currentTemporalReading,weekReading,monthReading}.ts`
- `projections/dayCanvas.ts` (source display name as kind label)
- disconnect / status / sources / config / types / httpJson updates
- architecture + UI + load tests
- this document

## Deviations from accepted plan

1. **Selection→observe trigger**: client-side after save (not inside selection route) to avoid coupling — documented and uses the same canonical observe endpoint.
2. **Throttle**: conservative **15 minutes** (plan allowed 5–15); force bypass for manual/selection.
3. **Module path**: `server/googleCalendar/` (Tranche 3 location) rather than plan’s illustrative `integrations/googleCalendar/`.
4. **Tranche 5 visual inspection**: only minimum provenance; richer inspection deferred.

## Deferred (Tranche 5 / 6 / 7)

- Richer external Fact inspection UI
- Realtime publication + coherence bindings
- Vercel cron
- syncToken / webhooks / Gemini / reminders / Calendar writes / adoption / external DTM

## Final verdict

## GOOGLE-OBSERVATION-CLEAR

Observation implementation is sound and ready for architectural review / preservation / deployment / physical provider acceptance.

No real Google account reconnect, no real Google calls, and no production external Facts were created during this implementation.
