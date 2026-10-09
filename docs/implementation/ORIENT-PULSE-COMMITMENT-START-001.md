# ORIENT-PULSE-COMMITMENT-START-001

First human-authorized Pulse proof: timed Orient-native Commitment start.

## Definition

A **Pulse occurrence** is the durable establishment that a deterministic evaluator found an explicitly authorized temporal condition true under a unique occurrence identity.

Expression does not create or redefine a Pulse. Delivery channels are deferred.

## Layers preserved

TEMPORAL TRUTH → TEMPORAL CONDITION → INTERRUPTION AUTHORITY → PULSE POLICY → DELIVERY CHANNEL

This tranche implements truth, condition, authority, occurrence, and restrained in-app expression only. Channel permission remains deferred. No push, Wear OS, haptics, service worker, or native delivery.

## Source scope

- `source_kind = commitment`
- `transition_kind = start`
- Timed Orient-native Commitment only
- All-day, Protected Time, Blocks, Tasks, Work, Stewardship, recurring, Google: not authorized

## Schema

Migration: `supabase/migrations/20261008230000_pulse_commitment_start.sql`

### `pulse_interrupt_grants`

Explicit human interruption authority. Relative lead before Commitment start. Soft revoke via `revoked_at`.

- Same-owner FK to `commitments (id, user_id)` **ON DELETE CASCADE** (future authority disappears with source)
- One active grant per `(user_id, source_kind, source_id, transition_kind)` (`revoked_at is null`)
- Privileges: revoke defaults from `authenticated`, then `SELECT`, `INSERT`, `UPDATE (revoked_at)` only
- Timed-only insert trigger

### `pulse_occurrences`

Durable occurrence evidence.

- Unique `(grant_id, source_starts_on, source_start_local)`
- Fingerprints retained when live Commitment later moves
- `grant_id` **ON DELETE SET NULL** so Commitment→grant cascade does not erase occurrence provenance
- Privileges: revoke defaults, then `SELECT`, `INSERT` only — no UPDATE/DELETE

Realtime publication added for reread awareness. Payloads are never authority.

## Evaluator

`evaluateCommitmentStartPulseCondition` in `domain/pulse.ts`.

Expression window: `[threshold, start)` where `threshold = start − lead`.

Results: `withhold | inactive | not_yet | eligible | satisfied | elapsed`.

Establishment due predicate (`commitmentStartPulseIsDueForEstablishment`): `eligible | elapsed` — i.e. `now >= threshold` under an active grant and current timed identity. Hosted establishment requires that correction so a closed client cannot permanently miss an authorized threshold. See [ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md](ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md).

No approaching / overdue / missed / urgent vocabulary.

## Invariants

- Temporal truth never implies interruption authority
- Representation never implies interruption authority
- Pulse occurrence requires explicit human grant
- Evaluator is deterministic with injected clock/zone
- Incomplete evidence withholds
- Delivery/expression does not establish Pulse
- One grant + temporal identity → at most one occurrence
- Relative grant follows source correction
- Revoked grant creates no future occurrence
- Non-acknowledgment is not failure
- External observation does not grant interruption
- Agent reasoning does not grant interruption
- Channel permission remains deferred
- Silence remains valid

## UI

- Timed Commitment inspection: explicit “Remind me / Set reminder” with bounded lead choices; no pre-selected default
- Active grant: “Don’t remind me”
- In-app expression: restrained status near the instrument; optional dismiss is expression hygiene only

## Hosted

Pulse table migration was authored here. Sovereign hosted occurrence establishment without an open client is [ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md](ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md). Neither migration is applied by this record's original tranche; apply status follows the hosted-establishment record.
