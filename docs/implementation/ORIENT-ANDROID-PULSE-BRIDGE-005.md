# ORIENT-ANDROID-PULSE-BRIDGE-005

Native Android perception edge for already-established Pulse occurrences.

## One sentence

A signed-in Orient Android edge receives FCM occurrence ids, authoritatively rereads `pulse_occurrences` under the user JWT, claims first local expression once, then posts one notification and one haptic.

## Status

**Implemented in repository. Device APK build requires local `google-services.json` handoff. Physical S26 acceptance not run.**

Prior:

- ORIENT-ANDROID-PULSE-NATIVE-IMPLEMENTATION-CLEAR (discovery)
- ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED (webhook → dispatcher → `no_targets`)
- ORIENT-ANDROID-PULSE-BRIDGE-003 dispatcher at `30edfb7`
- ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR

## Authority boundary

```
TEMPORAL TRUTH
→ HUMAN INTERRUPTION AUTHORITY
→ HOSTED PULSE ESTABLISHMENT
→ durable pulse_occurrence
→ Database Webhook → trusted dispatch → FCM { pulse_occurrence_id }
→ ANDROID PERCEPTION   ← this tranche
```

Android does **not** evaluate grants, Commitment timing, occurrence establishment, urgency, or escalation.

**NO AUTHORITATIVE REREAD = NO PERCEPTION CLAIM.**

## Project

| Item | Value |
| --- | --- |
| Path | `android/` (`:app` only) |
| applicationId | `com.teamlab.orient` |
| compileSdk / targetSdk | 37 |
| minSdk | 26 |
| UI | XML Views (no Compose, no Wear) |
| Auth | supabase-kt email/password + EncryptedSharedPreferences session |
| Claim store | SQLite `INSERT OR IGNORE` on `occurrence_id` (before notify/haptic) |

## Local expression claim

Claim is perception bookkeeping only — not global delivery, acknowledgment, or Pulse truth.

Order: reread success → atomic claim → notify + haptic. Duplicates after claim remain silent.

## Human config (local-only)

| File | Role |
| --- | --- |
| `android/app/google-services.json` | Firebase Android client config (gitignored; public-repo local-only) |
| `android/local.properties` | `sdk.dir` + `ORIENT_SUPABASE_PUBLISHABLE_KEY` (gitignored) |

Never place service_role, dispatch secret, Firebase Admin JSON, or Vercel/webhook credentials in Android.

## Explicitly not in this tranche

- Wear OS
- Physical S26 acceptance
- Commitment content in notifications
- Hosted schema / webhook / Vercel / Firebase console mutation
- Commit/push

## Next

1. Place `google-services.json` at `android/app/google-services.json`
2. Set publishable key in `android/local.properties`
3. `./gradlew assembleDebug` → install on S26 → physical acceptance plan from discovery
