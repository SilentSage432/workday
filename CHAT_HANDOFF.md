# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-006B** — token registration serialization correction implemented (uncommitted; not installed).

Canonical candidate baseline: `699c01f`. S26 physical: auth/notifications/fcm_token yes; token_registered no until corrected APK.

**006A root cause:** client omitted `platform` on PostgREST INSERT (`encodeDefaults=false` + Kotlin default). Hosted authority correct.

Upstream production dispatcher: `30edfb7` on `main`.

Token table hosted clear: **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** (`20261009120000` on `ksmhgaamyheyhefbyglb`).

**ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — Database Webhook → authenticated dispatcher → authoritative occurrence reread → token lookup → `no_targets` when the token table is empty.

Prior Pulse acceptance unchanged: **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED**.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table live with narrow RLS / service_role SELECT
- Trusted dispatcher + webhook autonomous path through zero-target acceptance
- Native perception edge on S26 through FCM token presence; registration blocked by client serialization (diagnosed)

### In-repo native perception

- `/android` package `com.teamlab.orient`: email/password auth, FCM receive, token reconcile, authoritative occurrence reread, SQLite exactly-once local expression claim, one notification + one haptic
- Rule: no authoritative reread ⇒ no perception claim
- `google-services.json` is local-only (gitignored)
- Wear OS deferred
- 006B: required `platform=android` on wire + safe registration failure logs

### Next Pulse boundary

1. Review 006B → commit/push when requested
2. Install corrected APK on S26 (keep Tyson session) → confirm `token_registered` + one hosted row
3. Physical Pulse acceptance: FCM → one notification + one haptic; duplicates silent

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
