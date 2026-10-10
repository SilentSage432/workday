# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-HOSTED-EVALUATOR-CORRECTION** (004; uncommitted; production **not** repaired)

Production candidate still `aa2cdcbdd216420cab8a4e30d50233b05d58ca9b` with applied `20261010093000`. Hosted cron fails on past-threshold Block grants until forward migration `20261010154000` is published and applied.

Physical Block-start acceptance (**003**): **FAILED** at hosted establishment. Perception not exercised. General Pulse authority across Commitment + Block remains **UNACCEPTED**.

Phase 2 (native phone perception) and Phase 3 (Watch6 Pulse transport /
notification-class wrist perception primitive) remain **CLOSED** for Commitment path.

Authority discovery: [docs/implementation/ORIENT-PULSE-AUTHORITY-001.md](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md)  
Block-start implementation: [docs/implementation/ORIENT-PULSE-AUTHORITY-002.md](docs/implementation/ORIENT-PULSE-AUTHORITY-002.md)  
Ambiguity correction: [docs/implementation/ORIENT-PULSE-AUTHORITY-004.md](docs/implementation/ORIENT-PULSE-AUTHORITY-004.md)

Accepted Wear candidate: `c76b982cb62a00ccb6c6bc01a540030abca445c9`  
Accepted Wear occurrence: `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72`  
Phone acceptance remains: occurrence `76c91159` on `52a8ed8`.

Failed 003 evidence (do not mutate): Block `68a7e475-7f66-4f6c-a525-aa61eeb45a78`, grant `996699be-fa97-4a5c-9d1e-a8a547fedc0f`, occurrences `0`.

### Proven (Pulse)

- Explicit Interrupt Grant + relative Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed (Commitment path; pre-002 evaluator)
- Owner-scoped Android FCM token table + trusted dispatcher + webhook (transport)
- S26 native autonomous notification + haptic perception (`76c91159`)
- Watch6 NotificationManager-mediated wrist perception (`24aad0ab` on `c76b982`)
- Distinct authorities: Wrist Presence ≠ Wrist Attention ≠ Pulse Authority
- Human Block-start source + grant via production UI (003); hosted Block occurrence **not** yet physically accepted

### Next

1. Publish 004 forward migration; apply to production; **new** human Block/grant physical acceptance (do not reuse failed 003 rows)
2. Preferred perception-surface routing (unimplemented)
3. Orient Watch face / visual Pulse expression (face = observer of local claim)
4. Richer Orient Watch companion
5. Freecess/thaw lifecycle variants (phone path incompletely proven)

### Still deferred elsewhere

- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
