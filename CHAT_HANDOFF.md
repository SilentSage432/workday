# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-NATIVE-ARRIVAL-SILENCE-GATE-CANDIDATE** (EXPRESSION-005-II)

Baseline: `95f5464d6153532838d737f2a18044c22a507a50`  
Project: `ksmhgaamyheyhefbyglb`  
Production foundation: `ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-PRODUCTION-ESTABLISHED`

Implementation: [ORIENT-PULSE-EXPRESSION-005-II](docs/implementation/ORIENT-PULSE-EXPRESSION-005-II.md)

### Implemented in candidate

- Phone authoritative reread: `id`, `relationship`, `source_start_at`
- Closed native `PulseRelationship` (`relative_before` / `arrival`)
- Pronunciation gate: relative_before expresses; ARRIVAL terminal silence; unknown fail-closed
- FCM + Wear remain occurrence-id-only
- ARRIVAL never phone-notifies, haptics, or Wear-forwards
- Human ARRIVAL authority still unavailable
- Physical acceptance not performed

### Canonical remaining order

```text
005-III HUMAN ARRIVAL AUTHORITY SURFACE
005-IV  ARRIVAL EXPRESSION ELIGIBILITY + PHYSICAL MORPHOLOGY
```

Do **not** expose ARRIVAL UI until native silence candidate is installed/accepted as required by the acceptance plan.

### Still true

**ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-PRODUCTION-ESTABLISHED** — 005-IB  
**ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED** — EXPRESSION-005/005A  
**ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED** — EXPRESSION-004

### Next

Physical acceptance of 005-II silence gate (install candidate; controlled ARRIVAL under test auth; prove silence + relative_before unchanged), then **005-III** human ARRIVAL authority when authorized.
