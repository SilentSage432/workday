# Chat handoff

## Current state (2026-10-08)

**NOTE-LIFECYCLE-001** committed/pushed at `1612b2b` and applied to hosted Orient. Hosted verification found surviving table-level UPDATE.

Working tree: **NOTE-LIFECYCLE-001A** corrective migration (not committed; not applied).

### What changed (001A)

- New migration `20261008220000_note_update_authority_correction.sql`: `REVOKE UPDATE` then `GRANT UPDATE (retired_at)`.
- Docs/tests for the privilege convergence. No app code change. No Note data change.

### Next physical step

1. Commit / push 001A when asked.
2. Apply corrective migration to `ksmhgaamyheyhefbyglb`.
3. Re-verify hosted privileges: no table UPDATE; `retired_at` UPDATE only; DELETE intact.
4. Phone/desktop physical acceptance of Retire/Delete.

### Still deferred

- Note content Edit / Unretire UI / Archive browser
- Orient Pulse / notifications / Wear OS
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
