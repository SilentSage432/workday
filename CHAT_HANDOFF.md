# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-BLOCK-START-MIGRATION-CORRECTION-CLEAR** (002C; uncommitted; production still pre-002)

Phase 2 (native phone perception) and Phase 3 (Watch6 Pulse transport /
notification-class wrist perception primitive) remain **CLOSED**.

Authority discovery: [docs/implementation/ORIENT-PULSE-AUTHORITY-001.md](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md)  
Block-start implementation: [docs/implementation/ORIENT-PULSE-AUTHORITY-002.md](docs/implementation/ORIENT-PULSE-AUTHORITY-002.md)  
Baseline for 002: `4197d471f78fd8a74bfabab02c56791f770b8265`

Accepted Wear candidate: `c76b982cb62a00ccb6c6bc01a540030abca445c9`  
Accepted Wear occurrence: `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72`  
Phone acceptance remains: occurrence `76c91159` on `52a8ed8`.

### Proven (Pulse)

- Explicit Interrupt Grant + relative Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table + trusted dispatcher + webhook (transport)
- S26 native autonomous notification + haptic perception (`76c91159`)
- Watch6 NotificationManager-mediated wrist perception (`24aad0ab` on `c76b982`)
- Distinct authorities: Wrist Presence ≠ Wrist Attention ≠ Pulse Authority
- General authority grammar clarified; Commitment-start first, Block-start second (local impl)

### Next

1. Publish 002C corrected migration; apply hosted `20261010093000`; then physical Block-start acceptance
2. Preferred perception-surface routing (unimplemented)
3. Orient Watch face / visual Pulse expression (face = observer of local claim)
4. Richer Orient Watch companion
5. Freecess/thaw lifecycle variants (phone path incompletely proven)

### Still deferred elsewhere

- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
