# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-LIFECYCLE-002** — source deletion authority correction authored (not production-applied).

Baseline: `d33e3f1a2c89987e8bce611b97c71602b7bf549a`  
Linked Orient project: `ksmhgaamyheyhefbyglb`

Forward migration: `supabase/migrations/20261010170000_pulse_interrupt_grants_source_delete_authority.sql`  
Makes `pulse_interrupt_grants_cascade_source_delete()` SECURITY DEFINER with pinned `search_path`. Restores Commitment/Block source-delete grant cleanup without granting authenticated DELETE on grants.

Executable proof: `scripts/pulse-source-deletion-authority-regression.sh`  
Record: [docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md)

**Do not claim physical acceptance.** Migration not applied to production. Production AUTHORITY-005 evidence rows not mutated.

### Prior accepted Pulse state (still true; do not conflate)

**ORIENT-PULSE-GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED** (005 / 005A) on candidate `e3ec23c`:

- Migrations live: `20261010093000` + `20261010154000`
- Block Pulse 005: Block `0b0db1c6…`, grant `6e9adb35…`, occurrence `a2dae150…`
- AUTHORITY-003 remains FAILED; recovery `7fadd828…` is not 005 evidence

Authority docs:

- [001](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md)
- [002](docs/implementation/ORIENT-PULSE-AUTHORITY-002.md)
- [004](docs/implementation/ORIENT-PULSE-AUTHORITY-004.md)
- [005](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md)
- Lifecycle correction: [LIFECYCLE-002](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md)

### Next boundary

1. Apply LIFECYCLE-002 migration to production when ready; verify source delete UX with grant present (do not treat as Pulse perception re-acceptance).
2. Pulse semantic expression discovery (shared haptic meaning for Commitment vs Block) before more source kinds — still deferred and distinct from this lifecycle fix.

### Still deferred elsewhere

- Preferred perception-surface routing
- Orient Watch face / visual Pulse expression
- Richer Orient Watch companion
- Freecess/thaw lifecycle variants
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
