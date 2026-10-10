# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED**

Published from baseline `c33538a8c2d3380d5bf9b7b6402d0621bd2987a5`  
Project: `ksmhgaamyheyhefbyglb`

Discovery record: [ORIENT-PULSE-EXPRESSION-003](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md)

### Published timeliness law (not implemented)

```text
DURABLE TRUTH LIFETIME ≠ PHYSICAL EXPRESSION LIFETIME
```

Physical meaning: “The boundary has become present recently enough to orient to this transition.”

**Expression eligibility** — whether an already-established occurrence may still be physically expressed without misleading present-oriented speech. Does not create/erase truth, change authority, or imply urgency/importance/MustDo.

- One shared deterministic eligibility policy; surfaces may evaluate it at different times
- Phone timely / Watch later-stale → one occurrence, one truth
- Late establishment may preserve durable truth; late delivery does not auto-justify speech
- Unauthorized silence ≠ stale silence; silence may preserve truth better than late speech
- Numeric eligibility duration **not** chosen; haptic/visual morphology **not** designed

**Not done:** ARRIVAL Interrupt Grant, occurrence form, haptic, schema/runtime, lead=0, Presence.

### Still true (do not conflate)

**ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED** — [EXPRESSION-002](docs/implementation/ORIENT-PULSE-EXPRESSION-002.md)

**ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED** — [EXPRESSION-001](docs/implementation/ORIENT-PULSE-EXPRESSION-001.md)

**ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED** / **GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED**

### Next discovery boundary

**ORIENT-PULSE-EXPRESSION-004 — ARRIVAL AUTHORITY FORM DISCOVERY**

How should “Reach me when this begins” be represented alongside “Reach me N before this begins” without magic zero, duplicated source semantics, or authority inheritance? Smallest truthful relationship identity and grant model before any ARRIVAL implementation. Do **not** choose a numeric eligibility window unless authority semantics genuinely require it.

### Still deferred elsewhere

- Preferred perception-surface routing
- Orient Watch face / visual Pulse expression / ambient Presence
- Richer Orient Watch companion
- Freecess/thaw lifecycle variants
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
