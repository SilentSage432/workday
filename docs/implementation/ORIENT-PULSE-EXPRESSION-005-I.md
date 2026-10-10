# ORIENT-PULSE-EXPRESSION-005-I

## Arrival relationship foundation implementation

**Candidate publication.** Schema / provenance / evaluator foundation only.

**Baseline:** `832dc2a94f58f8e1cddf33f8bc13111dc5ca87ce`  
**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient)  
**Wealth Engine untouched:** `nklmgzxxdhuvqayhcigp`

**Design basis:** [ORIENT-PULSE-EXPRESSION-005](ORIENT-PULSE-EXPRESSION-005.md)  
(`ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED`)

---

## Status markers

| Concern | Status after 005-I candidate |
| --- | --- |
| ARRIVAL relationship foundation | **Implemented in candidate** |
| ARRIVAL human authority exposed | **NOT exposed** |
| ARRIVAL native pronunciation | **NOT supported** |
| ARRIVAL physical acceptance | **NOT performed** |
| Production migration applied | **NOT applied** |
| Vercel / native install | **NOT performed** |

---

## Production inspection (read-only, before edit)

Linked Orient project `ksmhgaamyheyhefbyglb` via `supabase db query --linked` and migration list:

- Remote migrations match repo through `20261010170000` (no 005-I yet).
- `pulse_interrupt_grants.relationship` absent.
- Active uniqueness: `(user_id, source_kind, source_id, transition_kind) WHERE revoked_at IS NULL`.
- `lead_offset_seconds` NOT NULL + CHECK `> 0`.
- Occurrence `grant_id` FK `ON DELETE SET NULL`; uniqueness `(grant_id, source_starts_on, source_start_local)`.
- Historical counts: **1** grant (all positive lead; 0 null/nonpositive); **15** occurrences; **all** `threshold_at < source_start_at`.
- Zero contradictory evidence for relative_before-only backfill.

Wealth Engine project was listed but never queried/mutated.

---

## What changed

### Domain

- Closed `PulseRelationship`: `relative_before` | `arrival`
- `InterruptGrant` / `PulseOccurrence` carry `relationship`
- Lead nullable; invariants enforced by `requireGrantLeadForRelationship`
- Evaluator branches: relative_before `T − L`; arrival `T` (identity authoritative; not inferred from lead)
- Unknown relationship fails closed

### Persistence

- Column lists include `relationship`
- Human Reach-me / Reminder inserts **explicitly** write `relationship = relative_before`
- Active-grant lookup for human establish filters `relative_before` only
- Occurrence upsert persists grant relationship provenance

### UI

- Surfaces find only `relative_before` grants for Reminder / Reach me
- Web expressible pulses exclude non-`relative_before` occurrences
- No ARRIVAL control, no “Reach me when this begins”, no arrival establish API

### Migration

`supabase/migrations/20261010200000_pulse_authorized_temporal_relationships.sql`

- Grant + occurrence `relationship` text + CHECK
- Backfill all existing → `relative_before` only (runtime asserts zero ARRIVAL)
- Compound relationship/lead CHECK
- Active uniqueness includes `relationship`
- Insert trigger relationship-aware
- One hosted evaluator with relationship branch
- LIFECYCLE-003 DEFINER cleanup left unchanged (deletes all grants for source)

### Regression

`scripts/pulse-arrival-relationship-foundation-regression.sh` (+ vitest wrapper)

---

## Explicit non-goals (deferred)

- 005-II native relationship-aware silence
- 005-III human ARRIVAL authority surface
- 005-IV expression eligibility window + second haptic morphology
- Dispatcher / FCM / Wear payload changes
- Android / Wear client changes
- Production migration apply / deploy / physical acceptance

---

## Validation (candidate)

Automated: TypeScript, lint, vitest (including PostgreSQL ephemeral regression), production build — see commit report.

Production: untouched by this tranche.
