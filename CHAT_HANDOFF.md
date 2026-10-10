# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-008** — native autonomous Pulse perception
**physically accepted** on candidate `52a8ed8dea6eecb139f29d255e7b5a04a51e5f98`.

Accepted occurrence: `76c91159-465d-4f30-b9b9-6cca9d4f1c5b`

Orient can autonomously express an authorized durable Pulse through native
Android sight and touch while the user is not operating Orient.

Accepted path (cold FCM process start): hosted occurrence → dispatcher transport
→ FCM wake → session init (`Initializing` → await → `Authenticated` → refresh) →
JWT/RLS reread → local claim once → silent notification → one 40ms
`USAGE_NOTIFICATION` haptic (OS `FINISHED`; physically perceived).

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table + trusted dispatcher + webhook (transport)
- S26 native autonomous notification + haptic perception (`76c91159`)
- Session restore ordering vs auth-kt `Initializing` (008E) exercised on cold start
- Semantic observability tag `OrientPulsePerception`

### Next Pulse boundary

1. Deferred visual: generic notification icon / identity refinement
2. Deferred: Wear OS / Watch6 / perceptual language / channel policy
3. Freecess/thawed lifecycle variants not fully proven (cold-start acceptance only)

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
