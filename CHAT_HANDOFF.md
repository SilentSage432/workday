# Chat handoff

## Current state (2026-10-24)

**ORIENT-FLOOR-COMMAND-002A — STATUS SEMANTICS — LOCAL ONLY.**

`none` is an unpublished week. `complete` is every current assignment entered in Zebra. Those sentences no longer follow a zero count. A stale or older snapshot keeps the last status and is not a fresh verification. Clearing the week does not create completion history. Still in memory only. Not mounted. No credential, table, or Pulse. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-002-PROJECTION.md](docs/discovery/ORIENT-FLOOR-COMMAND-002-PROJECTION.md).

**ORIENT-FLOOR-COMMAND-002 — FIXTURE OBSERVATION PROJECTION — LOCAL ONLY.**

A pure in-memory projection reads a Floor Command snapshot into one Monday Zebra handoff. It does not create a Task, Commitment, or stewardship satisfaction, and it does not use the Saturday-first Work week. The view is fixture-tested and is not mounted. No network, table, credential, or Pulse. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-002-PROJECTION.md](docs/discovery/ORIENT-FLOOR-COMMAND-002-PROJECTION.md).

Pulse sequence is unchanged: 005-III, then 005-IV.

## Previous state (2026-10-10)

**ORIENT-PULSE-NATIVE-ARRIVAL-SILENCE-PHYSICALLY-ACCEPTED** (EXPRESSION-005-II / 005-IIC-R2)

Accepted candidate: `50378b8d1c5603859daf8294dee8a25808943807`  
Project: `ksmhgaamyheyhefbyglb`  
Implementation: [ORIENT-PULSE-EXPRESSION-005-II](docs/implementation/ORIENT-PULSE-EXPRESSION-005-II.md)  
Session correction: [ORIENT-PULSE-EXPRESSION-005-IIE](docs/implementation/ORIENT-PULSE-EXPRESSION-005-IIE.md)

### History (do not erase)

1. **005-IIC** on `7e6fe7e` — FAILED (`silent_no_session` before ARRIVAL gate)
2. **005-IID** — background session restore race root cause clear
3. **005-IIE** — durable `loadFromStorage` single-flight correction
4. **005-IIC-R2** — physical ARRIVAL silence + relative_before regression accepted

### Still true

- ARRIVAL physical pronunciation **not** implemented
- Human ARRIVAL authority **unavailable**
- FCM + Wear remain occurrence-id-only
- Production schema untouched by acceptance

### Canonical remaining order

```text
005-III HUMAN ARRIVAL AUTHORITY SURFACE
005-IV  ARRIVAL EXPRESSION ELIGIBILITY + PHYSICAL MORPHOLOGY
```

### Next

**005-III** — human ARRIVAL authority surface when authorized (do not expose until ready).
