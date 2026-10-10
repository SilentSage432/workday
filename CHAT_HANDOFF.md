# Chat handoff

## Current state (2026-10-09)

**ORIENT-WEAR-PULSE-BRIDGE-006** — Watch6 Pulse actuator is **NotificationManager**
(implemented; automated validation green; **not installed; not physically accepted**).

Phone authority gate unchanged (BRIDGE-008 physically accepted). After phone
claim CLAIMED: MessageClient `/orient/pulse/express` + UUID → watch authority
check → SQLite dedupe → one local Pulse notification (channel vibration
`[0,40]`). Capability `orient_pulse_perception`. Modules `:app` + `:wear`
(`applicationId` `com.teamlab.orient`).

Direct watch `Vibrator` / `USAGE_NOTIFICATION` reached the device but was
suppressed (`IGNORED_APP_OPS`); on-wrist counterfactual failed (BRIDGE-004C).
Notification permission is the human wrist-interruption boundary.

Prior phone acceptance: occurrence `76c91159` on `52a8ed8` (cold FCM path).

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table + trusted dispatcher + webhook (transport)
- S26 native autonomous notification + haptic perception (`76c91159`)
- Session restore ordering vs auth-kt `Initializing` (008E) exercised on cold start
- Semantic observability tag `OrientPulsePerception`
- Watch6 environment clear (SM-R955U API 36); Wear transport + NM actuator in repo

### Next Pulse boundary

1. Physical Watch6 Pulse acceptance (install + grant watch notification permission + one real occurrence)
2. Deferred visual: generic notification icon / identity refinement
3. Deferred: Orient Watch companion / exclusive watch-face (face observes local claim; no interruption authority)
4. Freecess/thawed lifecycle variants not fully proven (cold-start acceptance only)

### Still deferred elsewhere

- Orient Watch face / Watch section UI
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
