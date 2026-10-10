# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED**

Published from baseline `8107f8e688b74e0decbd7982fb0b54062d57d952`  
Project: `ksmhgaamyheyhefbyglb`

Record: [ORIENT-PULSE-EXPRESSION-004](docs/implementation/ORIENT-PULSE-EXPRESSION-004.md)

### Accepted authority grammar (design only — not implemented)

```text
source + source transition + authorized temporal relationship
+ relationship parameters + human Interrupt Grant
```

One grant = one temporal relationship.

| Token | Meaning |
| --- | --- |
| `relative_before` | Pulse when selected point N before source transition becomes true; positive lead required; maps current accepted authority |
| `arrival` | Pulse when source transition itself becomes present; no lead parameter; not implemented |

**APPROACH** not accepted. Magic zero rejected as identity. NULL lead does **not** mean ARRIVAL.

Same `start` transition may have independently active `relative_before` and `arrival` grants. Independent revocation. Occurrence provenance must identify relationship even if `grant_id` becomes NULL. Existing grants map to `relative_before`; existing occurrences must not be reclassified as ARRIVAL; no silent authority expansion.

### Still true (do not conflate)

**ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED** — [EXPRESSION-003](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md)

**ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED** — [EXPRESSION-002](docs/implementation/ORIENT-PULSE-EXPRESSION-002.md)

**ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED** — [EXPRESSION-001](docs/implementation/ORIENT-PULSE-EXPRESSION-001.md)

**ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED** / **GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED**

### Next tranche

**ORIENT-PULSE-EXPRESSION-005 — ARRIVAL AUTHORITY IMPLEMENTATION DESIGN** (discovery/design only — no implementation; no haptic; no numeric eligibility window unless required for coherence)

### Still deferred elsewhere

- Preferred perception-surface routing
- Orient Watch face / visual Pulse / ambient Presence
- Richer Orient Watch companion
- Freecess/thaw lifecycle variants
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
