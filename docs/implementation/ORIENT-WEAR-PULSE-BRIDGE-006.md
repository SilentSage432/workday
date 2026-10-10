# ORIENT-WEAR-PULSE-BRIDGE-006

Local NotificationManager Pulse actuator on Watch6 (implementation).

## One sentence

After watch-local exactly-once claim, Orient posts one local Pulse notification; the notification channel owns notification-class wrist haptic. Direct `Vibrator` is no longer the Pulse actuator.

## Status

**Implemented and physically accepted** on candidate `c76b982cb62a00ccb6c6bc01a540030abca445c9`.

Physical acceptance: [ORIENT-WEAR-PULSE-BRIDGE-007](ORIENT-WEAR-PULSE-BRIDGE-007.md)  
Phase finalization: [ORIENT-WEAR-PULSE-BRIDGE-008](ORIENT-WEAR-PULSE-BRIDGE-008.md)  
Verdict: `ORIENT-WEAR-PULSE-NOTIFICATION-ACTUATOR-PHYSICALLY-ACCEPTED`  
Accepted occurrence: `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72` (SM-S948U + SM-R955U)

Prior:

- ORIENT-WEAR-PULSE-NOTIFICATION-ACTUATOR-CLEAR (BRIDGE-005 discovery)
- ORIENT-WEAR-PULSE-BRIDGE-002 (MessageClient + claim edge)
- BRIDGE-004A/B/C: direct `USAGE_NOTIFICATION` reached Watch6 but ended `IGNORED_APP_OPS` (`audio=ignore`, `op=allow`); on-wrist counterfactual (`isWearing=true`) falsified off-body-only hypothesis

## Authority

```
[HOSTED] grant → temporal condition → durable pulse_occurrence
[TRANSPORT] FCM { pulse_occurrence_id } → phone
[PHONE GATE] session → JWT/RLS reread → visible → phone claim CLAIMED
[PHONE → WATCH] MessageClient /orient/pulse/express { uuid }
[WATCH] path/UUID validate
      → notification authority available?
      → SQLite claim
      → NotificationManager local Pulse notification
      → OS channel / notification infrastructure vibration
```

Watch does **not** establish Pulse truth, evaluate grants/timing, use Supabase/FCM, or hold secrets.

## Claim ordering

1. Validate path + UUID  
2. Check `POST_NOTIFICATIONS` (API 33+) + `areNotificationsEnabled()`  
3. If unavailable → `Unavailable`; **do not claim**  
4. SQLite `INSERT OR IGNORE` claim  
5. If `CLAIMED` → ensure channel → post one notification  

Rationale: claim means “won the watch-local expression boundary,” not “human perceived.” Consuming the claim when permission is already known unavailable would burn the exactly-once boundary without a legitimate expression attempt. Post-failure after a successful claim does not retry and does not fall back to direct vibrate (no-late-replay).

## Channel contract

| Field | Value |
| --- | --- |
| ID | `orient_pulse` |
| Name | Pulse |
| Description | Authorized Orient temporal reminders |
| Importance | `IMPORTANCE_DEFAULT` |
| Sound | none |
| Vibration | enabled, pattern `[0, 40]` |
| Bypass DND | false |

**Accepted fact:** the permission Activity also ensures this channel when opened; the accepted Pulse may therefore reuse a channel already created at the human permission boundary rather than creating it for the first time at Pulse time.

## Notification contract

| Field | Value |
| --- | --- |
| Category | `CATEGORY_REMINDER` |
| Title / body | Orient / Pulse |
| Auto-cancel | true |
| `setSilent(true)` | **not used** (would suppress channel haptic) |
| Identity | deterministic int from occurrence UUID |

## Human permission boundary

Minimal `WearPulsePermissionActivity` (launcher): explains wrist interruption and requests `POST_NOTIFICATIONS`. Ready / unavailable states only. Not a full companion. Not a watch face.

Wrist Attention (notification permission) is distinct from Pulse Authority (Interrupt Grant) and from Wrist Presence (install/inhabit). See [008](ORIENT-WEAR-PULSE-BRIDGE-008.md).

## Explicitly rejected

- Direct `Vibrator` / `WearPulseHaptic` as Pulse actuator  
- `FLAG_BYPASS_INTERRUPTION_POLICY` from Orient  
- `USAGE_ALARM` / `USAGE_TOUCH` masquerade  
- Privileged / accessibility / notification-listener paths  
- Mirrored phone notification as watch authority  
- Immediate cancel-to-hide after post  

## Future watch face

Local SQLite claim row remains the seam for future gold visual bloom. Face observes established perception identity; it does not gain interruption authority. NotificationManager is the actuator, not temporal truth.

## Validation (implementation tranche)

- `:app:testDebugUnitTest` / `:wear:testDebugUnitTest`  
- `:app:assembleDebug` / `:wear:assembleDebug`  
- `:wear:lintDebug` (warnings only; no errors)  
