# Chat handoff

## Current state (2026-10-10)

**ORIENT-PULSE-GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED** (005 / 005A)

Production candidate: `e3ec23c1126a0d7bec293c2833381e909f05081e`  
Migrations: `20261010093000` + `20261010154000` each once on `ksmhgaamyheyhefbyglb`.

Timed Commitment-start and timed Block-start are both physically accepted under the same general Interrupt Authority grammar.

Authority discovery: [docs/implementation/ORIENT-PULSE-AUTHORITY-001.md](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md)  
Block-start implementation: [docs/implementation/ORIENT-PULSE-AUTHORITY-002.md](docs/implementation/ORIENT-PULSE-AUTHORITY-002.md)  
Evaluator repair: [docs/implementation/ORIENT-PULSE-AUTHORITY-004.md](docs/implementation/ORIENT-PULSE-AUTHORITY-004.md)  
Physical acceptance: [docs/implementation/ORIENT-PULSE-AUTHORITY-005.md](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md)

### Accepted AUTHORITY-005 evidence

- Block `0b0db1c6-7d7b-4170-b446-9110fabedf61` (Block Pulse 005)
- Grant `6e9adb35-fb7d-435e-84ed-99eb1dc56b1e`
- Occurrence `a2dae150-b9db-40fd-98a3-1513725a01bd`
- Human: Watch6 haptic felt; watch notification visible; phone expression perceived; no duplicates; arrived at expected threshold/cadence

### Historical (do not conflate)

- AUTHORITY-003 **FAILED** — Block `68a7e475…` / grant `996699be…`
- Recovery occurrence `7fadd828…` is post-repair recovery only — not 003 success, not 005 evidence

### Proven (Pulse)

- Explicit Interrupt Grant + relative Commitment-start authority (prior)
- Explicit Interrupt Grant + relative Block-start authority (005)
- Hosted evaluation establishes durable Pulse with Orient fully closed
- Same perception path (dispatcher → FCM → phone claim → Wear → watch NM haptic) for both source kinds; no Block-specific downstream logic
- Distinct authorities: Wrist Presence ≠ Wrist Attention ≠ Pulse Authority
- Haptic language remains UNDESIGNED / UNIMPLEMENTED

### Next discovery boundary

Do **not** immediately add Task / Protected Time / other source kinds.

Investigate whether the existing single haptic expression carries the same perceptual meaning for accepted Commitment-start and Block-start. Do not presume `source_kind` → haptic pattern.

### Still deferred elsewhere

- Preferred perception-surface routing
- Orient Watch face / visual Pulse expression
- Richer Orient Watch companion
- Freecess/thaw lifecycle variants
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
