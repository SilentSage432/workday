# Chat handoff

## Current state (2026-10-24)

**ORIENT-FLOOR-COMMAND-005 — WORK PRESENTATION — LOCAL ONLY. NO-GO.**

The retained Floor Command observation is shown beside the Work schedule. The signed-in route loads that operator's binding and does not pull. A disabled pull stays labeled as retained. Cleared and removed assignments stay distinct from completion. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-005_WORK_PRESENTATION.md](docs/discovery/ORIENT-FLOOR-COMMAND-005_WORK_PRESENTATION.md).

**ORIENT-FLOOR-COMMAND-004 — CONNECTION BOUNDARY — LOCAL ONLY. NO-GO.**

An operator approval binds the signed-in user to the server-configured store, the Floor Command source, and the read-only purpose. The bearer is an environment secret and is not returned to the client. The pull stays disabled unless `ORIENT_FLOOR_COMMAND_PULL_ENABLED=1`, and `deptsync-hub.vercel.app` is refused. Source-reported cleared assignments stay visible as retired. The Work surface now shows the retained reading; see 005. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-004_CONNECTION_BOUNDARY.md](docs/discovery/ORIENT-FLOOR-COMMAND-004_CONNECTION_BOUNDARY.md).

**ORIENT-FLOOR-COMMAND-003 — INTEGRATION READINESS — AUDIT ONLY. NO-GO.**

`main` is five commits ahead of `origin/main` `9ff9f84`. The observation can accept a later week sequence and can keep the last snapshot when a read is withheld. There is no operator approval, server token, pull, or mounted view. Floor Command's read is not yet one database snapshot. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-003-READINESS.md](docs/discovery/ORIENT-FLOOR-COMMAND-003-READINESS.md).

**ORIENT-FLOOR-COMMAND-002A — WEEK SEQUENCE ORDERING — LOCAL ONLY. NOT APPLIED.**

A sequenced Floor Command snapshot is ordered by `week_sequence`, not by a source clock. Sequence 0 can become sequence 1 without a source time. A lower sequence is rejected. The same sequence with a different content hash is a conflict and keeps the retained snapshot. A withheld read is a failure and does not refresh. Dismissal still does not complete the handoff. No route, credential, or poll. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-002A-ORDERING.md](docs/discovery/ORIENT-FLOOR-COMMAND-002A-ORDERING.md).

**ORIENT-FLOOR-COMMAND-003 — DURABLE OBSERVATION STORAGE — LOCAL ONLY. NOT APPLIED TO PRODUCTION.**

The Floor Command reading can be stored apart from Commitments, Tasks, stewardship, and Pulse. One operator has one server-owned store binding, one snapshot per handoff id, one latest attempt, and a separate dismissal of one revision. A failed read keeps the snapshot. A missing source time does not count as a newer revision. No route, credential, poll, or notification was added. Live connection remains **NO-GO**. Canonical: [docs/discovery/ORIENT-FLOOR-COMMAND-003-PERSISTENCE.md](docs/discovery/ORIENT-FLOOR-COMMAND-003-PERSISTENCE.md).

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
