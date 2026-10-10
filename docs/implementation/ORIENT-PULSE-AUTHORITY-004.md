# ORIENT-PULSE-AUTHORITY-004

## Hosted evaluator PL/pgSQL ambiguity correction

**Baseline candidate:** `aa2cdcbdd216420cab8a4e30d50233b05d58ca9b`

**Failed physical acceptance:** `ORIENT-PULSE-BLOCK-START-PHYSICAL-ACCEPTANCE-FAILED` (AUTHORITY-003)

**Status:** Source correction only. Forward migration **not** applied to production. Physical general authority remains **UNACCEPTED**.

---

## What AUTHORITY-003 proved and did not prove

Succeeded through the human instrument:

- Timed Block `68a7e475-7f66-4f6c-a525-aa61eeb45a78` (“Block pulse 003”)
- Explicit Interrupt Grant `996699be-fa97-4a5c-9d1e-a8a547fedc0f` (`block` / `start` / lead `300`)
- Expected threshold `2026-10-10T15:25:00Z` under `America/Boise`

Failed at hosted establishment:

- `pg_cron` job `orient-pulse-hosted-establishment` errored every minute at/after threshold
- Error: `column reference "source_starts_on" is ambiguous` in  
  `po.source_starts_on = source_starts_on`
- Matching `pulse_occurrences` for that grant: **0**
- Perception path (dispatcher → FCM → phone → Wear → watch) was **not** exercised
- Failed Block/grant rows are preserved as evidence; do not mutate them to look successful

---

## Defect

In `establish_due_commitment_start_pulse_occurrences` as shipped by `20261010093000`:

- PL/pgSQL locals `source_starts_on` / `source_start_local` share names with `pulse_occurrences` columns
- Ambiguity surfaces at **execution** (past-threshold EXISTS / also ON CONFLICT target), not at `CREATE FUNCTION`
- Commitment-only predecessor used qualified `c.starts_on` / `c.start_local` in EXISTS and did not hit this class

---

## Correction

Forward migration: `supabase/migrations/20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql`

- Replaces the hosted function body only
- Renames colliding locals to `v_source_starts_on` / `v_source_start_local` (ON CONFLICT column targets cannot be block-qualified)
- Does **not** edit historical `20261010093000`
- Does **not** change grant/threshold/occurrence identity, timezone, cron name/schedule, or delivery

Executable regression: `scripts/pulse-hosted-evaluator-ambiguity-regression.sh` (ephemeral PostgreSQL; also asserted from `domain/pulseHostedEvaluatorAmbiguity.pg.test.ts`).

---

## Explicit non-claims

- Not physical generalization acceptance
- Not haptic-language work
- Not production apply
- Not repair of the failed AUTHORITY-003 Pulse
