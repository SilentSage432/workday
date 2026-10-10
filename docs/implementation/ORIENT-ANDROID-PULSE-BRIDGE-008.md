# ORIENT-ANDROID-PULSE-BRIDGE-008

Background haptic semantic correction + session restoration ordering.

## Status

**Physically accepted** on candidate `52a8ed8dea6eecb139f29d255e7b5a04a51e5f98`.

Accepted occurrence: `76c91159-465d-4f30-b9b9-6cca9d4f1c5b`

Verdict: **ORIENT-ANDROID-PULSE-NATIVE-HAPTIC-PHYSICALLY-ACCEPTED**

## Architectural milestone

Orient can autonomously express an explicitly authorized durable Pulse through
native Android sight and touch while the user is not actively operating Orient.

Authority chain (preserved):

1. human authorization (Interrupt Grant)
2. deterministic temporal condition
3. durable hosted Pulse occurrence
4. transport of occurrence identity (FCM is transport only — not authority)
5. authenticated native reread under the user JWT
6. RLS visibility
7. atomic local expression claim
8. native notification
9. one restrained haptic

The native client is a **perception edge**. It does not evaluate temporal
eligibility and does not create the Pulse. Notification delivery does not create
the Pulse.

## Evidence hierarchy (accepted occurrence)

1. **Direct physical perception** — user reported the haptic was felt.
2. **OS vibration evidence** — `VibratorManagerService`:
   `VibrationAttributes{mUsage=NOTIFICATION}`, AppOp allow, effect
   `Step{amplitude=-1.0, duration=40}`, ended `FINISHED` (no background reject).
3. **Native trace** (`OrientPulsePerception`) — session restore → JWT SELECT
   visible → claim once → notification posted → haptic attempted/invoked →
   `decision=expressed`.
4. **Hosted/transport evidence** — durable occurrence identity transported via
   dispatcher (`POST /api/pulse/dispatch`) → FCM cold process wake → single
   successful `PulsePerceptionWorker` attempt.

## Session correction (008E) — physically exercised

Cold FCM process start path:

```
Initializing
→ initialization_wait_entered
→ initialization_resolved Authenticated
→ refresh_attempted / refresh_result ok=yes
→ authenticated_user available=yes
```

Refresh occurred only after Authenticated. No refresh while Initializing.

**Qualification:** this acceptance run was a **cold FCM process start**. Do not
claim every Samsung Freecess/thawed lifecycle is proven. The prior
Freecess-associated failure (`c3267981`) exposed invalid session ordering, which
is corrected; Freecess itself was never established as the root cause.

## Haptic correction (008) — physically accepted

`PulseHaptic.expressOnce` uses notification-class vibration:

- `VibrationAttributes.USAGE_NOTIFICATION` (API 30+)
- `AudioAttributes.USAGE_NOTIFICATION` fallback (API 26–29)
- 40ms, `DEFAULT_AMPLITUDE`, one invocation

Prior failure (`8134b3e8`): OS saw `TOUCH` and rejected background vibration
(**HAPTIC_INVOKED_BUT_NOT_PERCEIVED**). Accepted run: OS saw `NOTIFICATION` and
finished the effect; user perceived it.

## Prior failed attempt (008C)

Occurrence `c3267981-1c7c-49c5-b3e0-4b97bccacdc3` failed at session establishment
before expression (invalid refresh while `Initializing`). Haptic correction was
not exercised on that run.

## Deferred

Generic Android notification icon / white-circle identity — visual refinement
only; **not** part of this acceptance. Wear OS / Watch6 remains deferred.
