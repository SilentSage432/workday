# ORIENT-WEAR-PULSE-BRIDGE-002

Native Watch6 Pulse perception edge (implementation).

## One sentence

After the phone authoritatively rereads and newly claims a Pulse occurrence, it forwards only `pulse_occurrence_id` over Wear OS MessageClient; the watch dedupes locally and expresses one 40ms notification-class wrist haptic.

## Status

**Implemented in repository. Not physically accepted. Not installed on Watch6.**

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
[WATCH] path/UUID validate → SQLite claim → one USAGE_NOTIFICATION haptic
```

Watch does **not** establish Pulse truth, evaluate grants/timing, use Supabase/FCM, or hold secrets.

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

## Watch haptic

- API 36 path: `VibratorManager` + `VibrationEffect.createOneShot(40, DEFAULT_AMPLITUDE)` + `VibrationAttributes.USAGE_NOTIFICATION`
- minSdk 30 keeps AudioAttributes notification fallback below API 33 for lint-clean builds
- No watch notification, sound, or alarm usage

## First-proof perception policy

Phone notification + phone haptic remain. Watch may also haptic. Double perception tolerated for diagnostic acceptance. No preferred-surface policy yet.

## Deferred

- Physical wrist acceptance
- Orient Watch companion / exclusive watch-face (classic elegant near-black/navy + warm gold bloom direction recorded only)
- DataClient persistence, watch notifications, watch Supabase/FCM, surface preference policy
