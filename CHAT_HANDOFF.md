# Chat handoff

## Current state (2026-10-08)

**ORIENT-PULSE-COMMITMENT-START-001** implemented in working tree (not committed; migration not applied hosted).

HEAD baseline before this work: `92a7a18` (NOTE-LIFECYCLE-001A already on `main`).

### What changed

- Domain evaluator + Interrupt Grant / Pulse occurrence vocabulary (`domain/pulse.ts`)
- Migration `20261008230000_pulse_commitment_start.sql` (grants + occurrences, narrow privileges, realtime publication)
- Persistence establish/revoke/ensure occurrence
- Timed Commitment inspection: explicit remind / don’t remind
- Restrained in-app Pulse expression
- Docs: implementation record + PRODUCT/DOMAIN/roadmap/journal updates

### Next physical step

1. Review / commit when asked.
2. Apply migration to hosted Supabase.
3. Phone/desktop acceptance: set reminder on timed Commitment, wait for threshold with Orient open, confirm one occurrence + expression; revoke; move start before/after occurrence.

### Still deferred

- Push / native Android / Wear OS / haptics / watch face / service worker
- Channel permission policy
- Other Pulse source kinds (Protected Time, Blocks, Tasks, Work, Google)
- Note content Edit / Unretire UI / Archive browser
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
