# ORIENT-ANDROID-PULSE-BRIDGE-006

S26 physical endpoint establishment + token-registration diagnostic/correction.

## Status

**006A diagnosed. 006B client serialization correction implemented (uncommitted). Physical reinstall / re-reconcile not run.**

Candidate baseline: `699c01fad109dba4ed342f3c04a4f4490706530e`

## Physical failure observed (006 / 006A)

On S26 Ultra, package `com.teamlab.orient`:

| Signal | Value |
| --- | --- |
| auth | yes |
| notifications | yes |
| fcm_token | yes |
| token_registered | no |

Hosted `public.orient_device_push_tokens` remained empty for the authenticated owner under normal RLS (no service_role repair).

## Exact serialization root cause (006A)

`DeviceTokenRegistrar.TokenRow` defined:

```kotlin
val platform: String = "android"
```

supabase-kt / kotlinx.serialization PostgREST path uses `encodeDefaults = false`.

Therefore INSERT/UPDATE JSON omitted `platform`.

Hosted column `platform` is `NOT NULL` with check `platform = 'android'`.

Postgres rejected the insert (`23502` class). Client collapsed the exception to `token_registered = no` with no useful log.

## Hosted authority

Hosted table, RLS, and privileges were **correct**. Authenticated own CRUD under user JWT remains the intended path. No schema/RLS broadening required.

## Client correction (006B)

- `platform` is a required constructor argument (no Kotlin default).
- Insert/update always builds `TokenRow(..., platform = "android")`.
- Wire contract regression test serializes with `encodeDefaults = false` and asserts `user_id`, `fcm_token`, `platform="android"` present; `updated_at` absent.
- Companion test documents that a default-valued `platform` is omitted under the same policy.
- Safe failure logs: operation name + exception class + optional HTTP status. No FCM token, JWT, password, credentials, or request bodies.

## Explicitly not in 006B

- Commit / push
- APK install / S26 mutation
- Manual token insert
- Schema / RLS / service_role change
- FCM send / Pulse creation / Wear

## Next

Rebuild + install corrected APK on S26 → reconcile under Tyson session → confirm one hosted android token row → continue physical Pulse acceptance.
