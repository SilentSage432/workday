# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED**

Published from baseline `c76a97b8443338628c17df9a79ae56bf5eb8dca7`  
Project: `ksmhgaamyheyhefbyglb`

Design record: [ORIENT-PULSE-EXPRESSION-005](docs/implementation/ORIENT-PULSE-EXPRESSION-005.md)

### Accepted design (not implemented)

- `relationship` text + CHECK: `relative_before` / `arrival`
- Lead: relative_before `> 0` NOT NULL; arrival NULL
- Uniqueness includes relationship; occurrence provenance survives grant deletion
- Backfill existing rows → relative_before only; no silent expansion
- One evaluator: relative_before `T−L`, arrival `T`
- FCM + Wear remain id-only
- ARRIVAL may exist before physical pronunciation; must never reuse relative_before haptic; unknown fail closed
- LIFECYCLE-003 / RLS preserved
- Numeric eligibility **not** blocking 005-I; not chosen

### Canonical implementation order

```text
005-I   SCHEMA / PROVENANCE / EVALUATOR FOUNDATION
005-II  NATIVE RELATIONSHIP-AWARE SILENCE GATE
005-III HUMAN ARRIVAL AUTHORITY SURFACE
005-IV  ARRIVAL EXPRESSION ELIGIBILITY + PHYSICAL MORPHOLOGY
```

**005-I must NOT** expose ARRIVAL UI, change phone/Watch pronunciation, teach a second haptic, or choose numeric eligibility. ARRIVAL remains unavailable as normal human-grantable production authority after 005-I.

### Still true (do not conflate)

**ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED** — [EXPRESSION-004](docs/implementation/ORIENT-PULSE-EXPRESSION-004.md)

**ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED** — [EXPRESSION-003](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md)

**ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED** / **EXPRESSION-SEMANTICS-PUBLISHED**

**ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED** / **GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED**

### Next implementation tranche

**ORIENT-PULSE-EXPRESSION-005-I** — when explicitly authorized. Inspect production migration state before writing SQL.

### Still deferred elsewhere

- Preferred perception-surface routing
- Orient Watch face / visual Pulse / ambient Presence
- Richer Orient Watch companion
- Freecess/thaw lifecycle variants
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
