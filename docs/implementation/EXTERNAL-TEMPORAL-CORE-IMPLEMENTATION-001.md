# EXTERNAL-TEMPORAL-CORE-IMPLEMENTATION-001

Bounded Tranche 1 implementation. Provider-neutral external temporal foundation only.

## Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD at start | `e642e6e2ea765ec12ef61d350282f07b4cb17df5` |
| Plan authority | [GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md](GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md) |
| Discovery authorities | EXTERNAL-TEMPORAL-OBSERVATION / PERSISTENCE-PROJECTION / GOOGLE-CALENDAR-ADAPTER-OAUTH discoveries |
| Working tree at start | Clean; `main == origin/main` |

## Implemented boundary

**In scope**

- Provider-neutral schema for Connection / Observed Source / External Temporal Fact
- Domain vocabulary including `displayLabel`
- Persistence/read mapping (no credentials)
- Pure Timeline / Present / Day / Week / Month composition support
- Provenance fields retained on projection output
- Fixture-driven and authority-isolation tests

**Out of scope (explicit)**

- Google / OAuth / credentials / encryption / service-role client
- Production OrientInstrument external SourceRead wiring
- Provenance UI chrome / inspection UI
- Realtime publication / cron
- Env vars / secrets / dependencies
- Fake runtime external data

Fixtures exist only in tests.

## Schema

Migration: `supabase/migrations/20261007200000_external_temporal.sql`

### `external_temporal_connections`

- `id`, `user_id`, `provider_type`, `status` (`pending_auth` \| `connected` \| `auth_failed` \| `disconnected`)
- optional `display_label`
- `created_at` / `updated_at`
- RLS: authenticated select/insert/update/delete own rows
- No token/secret columns

### `external_temporal_sources`

- `id`, `user_id`, `connection_id` (same-owner FK)
- opaque `source_local_id`, `display_name`, `selected`
- optional `provider_access_role`, `source_time_zone`
- observation evidence: `last_attempted_at`, `last_attempt_result`, `last_successful_observed_at`, successful window dates
- unique `(user_id, connection_id, source_local_id)`
- RLS: authenticated CRUD own rows

### `external_temporal_facts`

- local wrapper `id` (addressing only; not Orient ownership)
- source identity: `source_event_id`, nullable `source_instance_id`, optional `source_series_id`
- uniqueness: unique index on `(user_id, source_id, source_event_id, coalesce(source_instance_id, ''))`
- discriminant `temporal_kind`: timed XOR all-day shape constraint
- timed: `start_at` / exclusive `end_at`
- all-day: `starts_on` / exclusive `ends_before` (`ends_before > starts_on`)
- `display_label`, `lifecycle`, opaque provider version metadata
- `last_observed_at`
- RLS: authenticated **select** own rows only (writes deferred to future server observation)

No `external_provider_credentials` table.

## Invariants

- Timed and all-day shapes cannot mix.
- All-day multi-day remains one fact.
- Local UUID ≠ ownership.
- `absent_from_window` is a distinct lifecycle; not synonym of deleted/cancelled.
- Fact table has no authenticated write grants in this tranche.
- Credential column names never appear on domain read surfaces.

## Domain vocabulary

`domain/externalTemporal.ts`

- `ExternalConnection`
- `ObservedTemporalSource`
- `ExternalTemporalFact` = `ExternalTimedFact` \| `ExternalAllDayFact`
- lifecycle + observation attempt result enums
- `displayLabel` / freshness derivation / Present vs Day-Week admission helpers
- No Google DTOs; no Task/Commitment/Block inheritance

## Persistence/read boundary

`persistence/externalTemporal.ts`

- Separate loaders for connections / sources / facts
- Defensive `rowTo*` mapping; malformed rows throw
- Never merges into PT/Block/Commitment/Work/Task reads
- No credential fields; no service-role client

## Timeline composition

`projectTimeline` accepts optional:

- `externalTemporalFacts`
- `externalTemporalContext` (sources + connection status for freshness)

New `sourceKind: "external_temporal"` carrying:

- `displayLabel`, `observedSourceId`, `sourceDisplayName`
- `lifecycle`, `freshness`, `stale`
- `correctionAuthority: "external"`

Overlaps coexist; no dedupe against Orient-owned facts.

## Present / Day / Week / Month

| Surface | Behavior |
| --- | --- |
| Present / CTO | Active + freshness `fresh` only; stale-after-failed-refresh excluded; timed contains Now; all-day contains civil day |
| Day | Via Timeline; stale last-known admitted; `stored` is null (not editable Orient fact) |
| Week | Via `projectWeekShape` → Timeline |
| Month | Shared Timeline; no separate subsystem |

Production call sites may omit external arrays (default empty). No OrientInstrument fixture wiring.

## Provenance preservation

Projection output retains external ownership markers and source/freshness evidence for later UI. No visual chrome in this tranche.

## Authority isolation

- Capacity inputs unchanged; no external slot; source isolation test
- DTM `LiftKind` remains PT/Block/Commitment only
- Domain/persistence do not write Task / ActiveThread / Work / Commitment / PT / Block

## Tests

- `domain/externalTemporal.test.ts`
- `persistence/externalTemporal.test.ts`
- `projections/externalTemporalComposition.test.ts`
- Existing Timeline/CTO/Capacity suites remain green (CTO tie-break expectation updated for fifth kind)

## Validation

| Check | Result |
| --- | --- |
| Targeted external + related projection tests | Pass |
| Full `npm test` | 831 passed |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |

## Files changed

- `supabase/migrations/20261007200000_external_temporal.sql` (new)
- `domain/externalTemporal.ts` (+ test)
- `persistence/externalTemporal.ts` (+ test)
- `projections/timeline.ts`, `currentTemporalOrientation.ts`, `dayCanvas.ts`, `weekShape.ts`, `month.ts`, `presentMomentOrientation.ts`
- `projections/externalTemporalComposition.test.ts` (new)
- `projections/timeline.test.ts`, `currentTemporalOrientation.test.ts` (exact-input / tie-break updates)
- Exhaustive kind handling: `components/factAddress.ts`, `components/orient/grammar.ts`, `components/orient/phoneSignature.ts`, `components/CurrentTime.tsx`, `components/orient/Surfaces.tsx`, `components/prototype/instrumentModel.ts`, `components/prototype/InstrumentView.tsx`
- This document

## Explicitly deferred

Tranche 2 credentials/crypto/service-role; Tranche 3 OAuth + selection UI; Tranche 4 observe/mapper; Tranche 5 provenance/inspect UI + production SourceRead wiring; Tranche 6 realtime; Tranche 7 cron/deployed Google acceptance.

## Deviations from accepted plan

1. Fact provider version column named `provider_version_token` (provider-neutral) rather than `provider_etag`.
2. Source timezone column named `source_time_zone` (aligned with fact field) rather than `calendar_time_zone`.
3. Production UI modules received minimal exhaustive-kind handling so TypeScript remains sound when `external_temporal` exists; no fixture data is loaded at runtime.

## Final implementation verdict

## CORE-IMPLEMENTATION-CLEAR

Provider-neutral external temporal foundation is implemented and validated within the accepted Tranche 1 boundary. Ready for architectural review before commit/push.
