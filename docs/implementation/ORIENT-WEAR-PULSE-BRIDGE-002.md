# ORIENT-WEAR-PULSE-BRIDGE-002

Native Watch6 Pulse perception edge (implementation).

## One sentence

After the phone authoritatively rereads and newly claims a Pulse occurrence, it forwards only `pulse_occurrence_id` over Wear OS MessageClient; the watch dedupes locally and expresses via a local NotificationManager Pulse notification (channel-mediated haptic). See [ORIENT-WEAR-PULSE-BRIDGE-006](ORIENT-WEAR-PULSE-BRIDGE-006.md) for the actuator correction.

## Status

**Transport + claim edge implemented. Actuator corrected in BRIDGE-006 (NotificationManager). Physically accepted in BRIDGE-007 (`c76b982`); Phase 3 finalized in BRIDGE-008.**

Prior:

- ORIENT-WEAR-PULSE-NATIVE-PATH-CLEAR
- ORIENT-WEAR-PULSE-WATCH6-ENVIRONMENT-CLEAR (SM-R955U, API 36)
- ORIENT-WEAR-PULSE-BASELINE-RESTORED
- ORIENT-ANDROID-PULSE-NATIVE-PERCEPTION-ACCEPTANCE-FINALIZED

## Authority

```
[HOSTED] grant → temporal condition → durable pulse_occurrence
[TRANSPORT] FCM { pulse_occurrence_id } → phone
[PHONE GATE] session → JWT/RLS reread → visible → phone claim CLAIMED
[PHONE → WATCH] MessageClient /orient/pulse/express { uuid }
[WATCH] path/UUID validate → notification authority → SQLite claim → local Pulse notification (OS channel haptic)
```

Watch does **not** establish Pulse truth, evaluate grants/timing, use Supabase/FCM, or hold secrets.

Direct watch `Vibrator` + `USAGE_NOTIFICATION` was API-valid but physically suppressed on Watch6 (`IGNORED_APP_OPS`; on-wrist counterfactual failed). BRIDGE-006 replaces that actuator with NotificationManager.

## Modules

| Module | Role |
| --- | --- |
| `:app` | Phone perception + Wear forward after claim |
| `:wear` | Headless Wear listener + local claim + haptic |

| Wear field | Value |
| --- | --- |
| applicationId | `com.teamlab.orient` (same as phone — Data Layer identity) |
| namespace | `com.teamlab.orient.wear` |
| compileSdk / targetSdk / minSdk | 37 / 36 / 30 |
| ABI filter | `armeabi-v7a` |
| Capability | `orient_pulse_perception` |

## Transport

- Client: MessageClient
- Path: `/orient/pulse/express`
- Payload: UTF-8 canonical UUID only
- Node selection: CapabilityClient `orient_pulse_perception` + FILTER_REACHABLE + nearby; first sorted node id
- Disconnected / no node: safe log; no retry ledger; phone perception unchanged

## Watch expression (BRIDGE-006)

- Actuator: local `NotificationManager` notification on channel `orient_pulse`
- Channel: `IMPORTANCE_DEFAULT`, sound none, vibration `[0, 40]`, no DND bypass
- Human boundary: minimal Wear activity requests `POST_NOTIFICATIONS`
- Direct `WearPulseHaptic` / `VibratorManager` removed from Pulse path

## First-proof perception policy

Phone notification + phone haptic remain. Watch may also express via local notification. Double perception tolerated for diagnostic acceptance. No preferred-surface policy yet.

## Deferred

- Physical wrist acceptance (install + permission grant + one real occurrence)
- Orient Watch companion / exclusive watch-face (classic elegant near-black/navy + warm gold bloom direction recorded only; face remains observer of local claim)
- DataClient persistence, watch Supabase/FCM, surface preference policy
