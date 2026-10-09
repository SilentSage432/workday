# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-008** — background haptic semantic correction (uncommitted; not installed).

Native autonomous **notification** path established (007E) on candidate `171c95a`:
occurrence `8134b3e8-7185-46fb-8c71-c338e2caa3a9` → dispatch → FCM → WM → reread → claim → notify.

Haptic subtype: **HAPTIC_INVOKED_BUT_NOT_PERCEIVED** — OS ignored background `TOUCH` usage.
008 replaces attributes with `VibrationAttributes.USAGE_NOTIFICATION` only.

Prior: 007B/C observability committed (`171c95a`); 007D S26 update-install; 006 endpoint; dispatcher `30edfb7`.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table + trusted dispatcher + webhook
- S26 endpoint + autonomous native notification expression
- Semantic observability tag `OrientPulsePerception`

### Next Pulse boundary

1. Review/commit 008 → update-install S26 (preserve session)
2. One real Pulse → confirm haptic perceived under background delivery
3. Deferred: Wear OS / perceptual language / channel policy

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
