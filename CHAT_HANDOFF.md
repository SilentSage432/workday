# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-GENERAL-AUTHORITY-MODEL-CLEAR** (discovery only)

Phase 2 (native phone perception) and Phase 3 (Watch6 Pulse transport /
notification-class wrist perception primitive) remain **CLOSED**.

Authority discovery: [docs/implementation/ORIENT-PULSE-AUTHORITY-001.md](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md)  
Baseline inspected: `885782989a8371b276aaef4605ec517ff50ee910`

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
- General authority grammar clarified; Commitment-start is first source relationship, not Pulse itself
- Discovery recommendation (not accepted architecture): smallest next source = timed Block start + relative lead

### Next (not the closed primitive)

1. Implement generalized Interrupt Grant only after accepting a first non-Commitment source (discovery points at timed Block start)
2. Preferred perception-surface routing (unimplemented)
3. Orient Watch face / visual Pulse expression (face = observer of local claim)
4. Richer Orient Watch companion
5. Freecess/thaw lifecycle variants (phone path incompletely proven)
6. Deferred visual: generic notification icon / identity refinement

### Still deferred elsewhere

- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
