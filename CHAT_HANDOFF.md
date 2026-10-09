# Chat handoff

## Current state (2026-10-08)

**ORIENT-PULSE-HOSTED-ESTABLISHMENT-001** implemented in working tree (not committed; hosted migrations not applied; not deployed).

HEAD baseline for this work: `63be8c86ad5807bcac16fb617119d9e41ecaae72` (`ORIENT-PULSE-COMMITMENT-START-001` already on `main`).

### What changed

- Establishment due predicate: `now >= threshold` (`eligible | elapsed`) in `domain/pulse.ts`; client persistence uses it.
- Migration `20261008240000_pulse_hosted_establishment.sql`: `pg_cron` job, SECURITY DEFINER evaluator, `pulse_hosted_evaluator_runs`.
- Browser evaluator kept as opportunistic convergence.
- Docs: hosted establishment record + journal/roadmap/handoff updates.

### Next physical step

1. Review / commit when asked.
2. Apply Pulse migrations in order to canonical Supabase `ksmhgaamyheyhefbyglb` (`20261008230000` then `20261008240000`).
3. Inspect hosted privileges/cron job/reality vs migration text.
4. Closed-client acceptance: grant → close Orient → threshold passes → reopen → occurrence exists (no notification expected).

### Still deferred

- Push / native Android / Wear OS / haptics / watch face / service worker
- Channel permission policy
- Other Pulse source kinds
- Note content Edit / Unretire UI / Archive browser
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
