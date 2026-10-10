# ORIENT-ANDROID-PULSE-BRIDGE-008

Background haptic semantic correction + session restoration ordering (008E).

## Status

**008 haptic: implemented on `main` (`4b33c4b`); not yet physically accepted.**  
**008E session ordering: implemented for review (uncommitted; not installed).**

Baseline for 008E: `4b33c4b29f235e736e4d513e3be36b293d76dfa9`

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

## Correction (008)

`PulseHaptic.expressOnce` vibrates with:

- `VibrationAttributes.USAGE_NOTIFICATION` (API 30+)
- `AudioAttributes.USAGE_NOTIFICATION` fallback (API 26–29)

Preserved: 40ms, `DEFAULT_AMPLITUDE`, one invocation, silent notification channel,
`setSilent(true)`, claim/reread/WM/FCM semantics.

**Not used:** `USAGE_ALARM` (would bypass restrictions for the wrong semantic).

## Physical acceptance attempt after 008 install (008C)

Occurrence `c3267981-1c7c-49c5-b3e0-4b97bccacdc3` failed before expression.

The failed physical haptic acceptance attempt **did not exercise** the haptic correction.

First failed boundary: **session establishment** (`SESSION_NOT_ESTABLISHED` / `silent_no_session`).

No authoritative SELECT, claim, notification, or haptic.

## Root cause (008D)

Invalid Orient ordering against auth-kt 3.8.0:

- `SessionStatus.Initializing` is the pre-restoration state
- persisted-session restoration is owned by `AuthImpl.init()` + `autoLoadFromStorage`
- `refreshCurrentSession()` requires an already-loaded current session
- while `Initializing`, `currentSessionOrNull()` is null
- Orient waited ≤8s for Authenticated/NotAuthenticated, then **always** called
  `refreshCurrentSession()` — including when still `Initializing`
- library threw `IllegalStateException("No refresh token found in current session")`

Freecess thaw was observed in the failed run context; **Freecess itself is not
established as the root cause.**

## Correction (008E)

Worker-time `SessionRestore` / `ensureSessionLoaded`:

1. Await terminal initialization via `auth.awaitInitialization()` within the
   existing 8s bound
2. On timeout / unresolved → **no refresh** → fail closed (silence)
3. On `NotAuthenticated` → **no refresh** → silence
4. On `Authenticated` (after leaving `Initializing`) → existing refresh may run
5. Already terminal Authenticated/NotAuthenticated → early return (unchanged)

Invariant: `refreshCurrentSession()` is never invoked while status is `Initializing`.

`autoLoadFromStorage` remains the owner of persisted-session restoration.
No MainActivity dependency, no second store, no FCM authority, no RLS weakening.

Observability: `initialization_wait_entered`, `initialization_resolved class=…`,
`initialization_timed_out`.

## Physical acceptance

Haptic **not** marked accepted. Requires 008E review → commit → update-install →
one real Pulse that clears session establishment and reaches expression.
