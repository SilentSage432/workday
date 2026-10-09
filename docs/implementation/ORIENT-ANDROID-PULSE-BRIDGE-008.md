# ORIENT-ANDROID-PULSE-BRIDGE-008

Background haptic semantic correction.

## Status

**Implemented for review (uncommitted; not installed). Haptic not yet physically accepted.**

Baseline: `171c95ad1bb7179bd51ba59347067236cde204a8`

## Prior physical evidence (007E)

Occurrence `8134b3e8-7185-46fb-8c71-c338e2caa3a9` established the autonomous native notification path.

The explicit 40ms vibrator call reached Android and was rejected:

```
Ignoring incoming vibration as process with uid=10035 is background,
attrs= VibrationAttributes{mUsage=TOUCH ...}
```

Subtype: **HAPTIC_INVOKED_BUT_NOT_PERCEIVED**

Cause: `Vibrator.vibrate(VibrationEffect)` delegates to empty
`VibrationAttributes.Builder()` → `USAGE_UNKNOWN`, which the device converted
to `TOUCH` — blocked for background processes. `AppOps VIBRATE=allow`.

Channel vibration disabled and `setSilent(true)` are unrelated; the explicit
application haptic is a separate perception expression.

## Correction

`PulseHaptic.expressOnce` now vibrates with:

- `VibrationAttributes.USAGE_NOTIFICATION` (API 30+)
- `AudioAttributes.USAGE_NOTIFICATION` fallback (API 26–29)

Preserved: 40ms, `DEFAULT_AMPLITUDE`, one invocation, silent notification channel,
`setSilent(true)`, claim/reread/WM/FCM/session semantics.

**Not used:** `USAGE_ALARM` (would bypass restrictions for the wrong semantic).

## Physical acceptance

Not marked. Requires install + one real Pulse after review/commit.
