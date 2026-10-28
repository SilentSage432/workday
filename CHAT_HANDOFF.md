# Chat handoff

## Current state (2026-10-28)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004B — LOCAL GATE A COMPLETE. DEPLOYMENT NOT REQUESTED TO RUN.**

The pull acquires `claim_floor_command_controlled_pull` before one GET, persists with that claim, and releases it after a failure. `https://deptsync-hub.vercel.app` is the only production origin. Approval and pull are POST routes. Work does not call them. The pull flag still has to be exactly `1`. **GO** to request Gate B preparation that ships the application and `20261024240000` together with the flag unset. **NO-GO** to deploy, migrate hosted Orient, issue a credential, bind an operator, or pull. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md).

## Previous state (2026-10-28)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004A — LOCAL CLAIM MIGRATION VALIDATED. APPLICATION GATE A NOT RESUMED.**

Disposable PostgreSQL enforces one committed controlled success per operator. `floor_command_controlled_pull_claims` holds one lease. `claim_floor_command_controlled_pull`, `release_floor_command_controlled_pull`, and the six-argument `persist_floor_command_observation` are the only write path. The five-argument persist function is dropped. The hosted project was not migrated. Routes, the origin allowlist, credentials, and the live pull were not changed. **GO** to resume local Gate A application work. **NO-GO** to apply this migration to hosted Orient before those callers pass `p_claim`. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md).

## Previous state (2026-10-28)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-004 — GATE A STOPPED. NO MIGRATION AND NO PULL ROUTE.**

`HEAD` is still `e44953b181b612fbefe8661eb58c0366f324589e`. The current attempt table can record `success_complete` or `failure` only, and `service_role` cannot write it except through `persist_floor_command_observation`. Two concurrent success calls both committed on disposable Postgres. A new connection still sees the committed success, but nothing can reserve the pull before the network call. **NO-GO** for the origin allowlist, the approval route, the pull route, and Gate B. The smallest missing persistence is a claim table plus a claim argument on persist. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_004.md).

## Previous state (2026-10-27)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-003 — ACTIVATION PLAN ONLY. LIVE INTEGRATION NO-GO.**

Production identities match the expected baselines. Floor Command is `ac533eb` / `dpl_JDGxBWMMaFpAwEbCm4kyBtrAdV6Y`. Orient is `e44953b` / `dpl_8wHGrY4J1mZu51fCJgv5h6qKdz9M`. Store `2587` week `2026-W44` is sequence `3`, revision `cedf9853523bd7f8`, with three Zebra entry confirmations and no cleared rows. The credential table is empty. The operator reports the signed-in Work checklist passed; this session did not capture that browser's network log. **GO** for a separate local implementation. **NO-GO** to deploy, issue a credential, set environment variables, bind an operator, or pull. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_003.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_003.md).

## Previous state (2026-10-26)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-002 — DARK CONSUMER DEPLOYED. WORK SMOKE OUTSTANDING.**

Production is `e44953b181b612fbefe8661eb58c0366f324589e` (`dpl_8wHGrY4J1mZu51fCJgv5h6qKdz9M`, GitHub Production `7351184912`) at https://orient-cyan.vercel.app. The three observation migrations are on `ksmhgaamyheyhefbyglb`. Bindings, handoffs, attempts, and dismissals are empty. No Floor Command env var, credential, or pull. Unauthenticated observation returns 401. Signed-in Work smoke has not been done. **NO-GO** for integration activation. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_002.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_002.md).

## Previous state (2026-10-26)

**TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-001 — CANDIDATE PREPARED. DARK DEPLOY NOT EXECUTED.**

Production is still `9ff9f847525af092926389121a2a9d640ce03fa1` (`dpl_QMfa15AVQiDDGjSYLcJjyM635Per` at https://orient-cyan.vercel.app). Observation migrations are absent on `ksmhgaamyheyhefbyglb`. Production has no `ORIENT_FLOOR_COMMAND_*` variables. The isolated candidate is local `e44953b181b612fbefe8661eb58c0366f324589e`, eight observation commits, not on `origin/main`. **GO** to request a separate dark deployment. **NO-GO** to deploy, migrate, issue a credential, or enable a pull from this tranche. Canonical: [docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_001.md](docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_001.md).

## Previous state (2026-10-25)

**TEAMLAB-INTEGRATION-RELEASE-001 — PLAN ONLY. NO-GO.**

The release plan lives in Floor Command at `docs/product/TEAMLAB_FLOOR_COMMAND_ORIENT_RELEASE_001.md`. The Orient pointer is [docs/discovery/TEAMLAB_FLOOR_COMMAND_ORIENT_RELEASE_001.md](docs/discovery/TEAMLAB_FLOOR_COMMAND_ORIENT_RELEASE_001.md). Production remains `9ff9f84`. The eight local commits are the minimum deployable set, and they are not deployed. Do not set the pull flag. Do not allow the hosted Floor Command origin in this step.

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
