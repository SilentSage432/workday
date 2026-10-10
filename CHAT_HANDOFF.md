# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-008E** — background session restoration ordering (uncommitted; not installed).

008 haptic (`USAGE_NOTIFICATION`) is on `main` at `4b33c4b` but **not physically accepted**.
Pulse `c3267981` failed first at session establishment (`Initializing` → invalid refresh →
`silent_no_session`); haptic path was not reached.

008E awaits auth-kt `awaitInitialization()` within the worker bound; refreshes only from
`Authenticated`; timeout / `NotAuthenticated` remain silent without refresh.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table + trusted dispatcher + webhook
- S26 endpoint + autonomous native notification expression (8134b3e8)
- Semantic observability tag `OrientPulsePerception`

### Next Pulse boundary

1. Review/commit 008E → update-install S26 (preserve session)
2. One real Pulse → confirm session restore + haptic perceived under background delivery
3. Deferred: Wear OS / perceptual language / channel policy

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
