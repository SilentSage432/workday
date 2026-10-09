# ORIENT-ANDROID-PULSE-BRIDGE-007

First autonomous native Pulse forensic + perception observability.

## Status

**007 diagnosed → 007B/C observability on `171c95a` → 007D installed → 007E second Pulse established native notification path.**

First failed physical Pulse baseline: `54724f005a15f5ebc127b3e8e3c3cdcbbcec4c97`  
Observability candidate: `171c95ad1bb7179bd51ba59347067236cde204a8`

## Physical trace (007)

Causal chain for occurrence `e37a4d4a-785c-43c0-93f5-96645bd5c17b`:

hosted occurrence → webhook → authenticated dispatcher → FCM → S26 receipt → WorkManager → `PulsePerceptionWorker` SUCCEEDED once → **no** ExpressionClaim DB → **no** notification → **no** haptic.

**FIRST FAILED BOUNDARY:** `AUTHORITATIVE_REREAD_FAILED`

Worker `Result.success()` collapses Silent and Expressed, so 54724f0 did not preserve enough semantic evidence to distinguish worker-time:

- `SilentNoSession`
- `SilenceOccurrenceNotVisible`

## 007A

Subtype not retrospectively observable without new instrumentation.

## 007B — observability only

Adds safe semantic log lines under tag **`OrientPulsePerception`**.

Stages (enums/booleans/status classes only; occurrence UUID allowed for correlation):

| Stage | Evidence |
| --- | --- |
| session | restore entered, status class, refresh attempted/result, authenticated user available |
| reread | select attempted, select result ok/visible or safe error class/status |
| decision | `silent_no_session` / `silent_occurrence_not_visible` / `retry_transient` / `silent_retry_exhausted` / `expressed` / `silent_already_claimed` |
| expression | claim attempted/result, notification attempted/posted/failed, haptic attempted/invoked/failed |

**Does not change** session/refresh/retry/reread/claim/notify/haptic/WorkManager/FCM/hosted authority.

## 007E — second physical Pulse

Autonomous path succeeded through native notification for occurrence
`8134b3e8-7185-46fb-8c71-c338e2caa3a9`. Explicit haptic reached Android but was
rejected as background + `TOUCH` usage → **HAPTIC_INVOKED_BUT_NOT_PERCEIVED**.

Correction: [ORIENT-ANDROID-PULSE-BRIDGE-008](ORIENT-ANDROID-PULSE-BRIDGE-008.md)
(notification-class `VibrationAttributes` only; haptic not yet physically accepted).
