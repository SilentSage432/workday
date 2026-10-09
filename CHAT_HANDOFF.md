# Chat handoff

## Current state (2026-10-08)

Implemented **NOTE-LIFECYCLE-001** (working tree; commit/push when asked). Hosted migration **not** applied.

Baseline before work: `b69bcf9765e3caadc3c1b283f0a1b6df937ab6b9`.

### What changed

- Notes gain `retired_at` / `retiredAt`.
- Owner `UPDATE (retired_at)` + DELETE grants and RLS for Notes.
- `retireNote` / `deleteNote`; operational `loadNotes` = current only.
- LOOK → Notes: Retire (no confirm), Delete (confirm). Cited Delete fails honestly; Retire remains.
- Docs: lifecycle decision + implementation; DOMAIN and related Note docs updated.

### Accepted foundations (do not reopen)

- Desktop Day territory / LOOK / ADD / ACT / lateral borrow / material
- Phone Day temporal continuity
- Phone LOOK progressive disclosure (physically accepted)
- Center ADD plus correction (physically accepted)

### Next physical step

1. Review and apply migration `20261008210000_note_lifecycle.sql` to hosted Supabase.
2. Commit / push / deploy when asked.
3. Verify on phone/desktop: Retire removes from LOOK → Notes; Delete confirms and removes uncited; cited Delete explains and keeps Note.

### Still deferred

- Note content Edit / Unretire UI / Archive browser
- Orient Pulse / notifications / Wear OS
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
