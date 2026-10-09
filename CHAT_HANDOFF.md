# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-005** — native Android Pulse perception edge implemented under `android/` (uncommitted candidate).

Upstream production dispatcher: `30edfb7` on `main`.

Token table hosted clear: **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** (`20261009120000` on `ksmhgaamyheyhefbyglb`).

**ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — Database Webhook → authenticated dispatcher → authoritative occurrence reread → token lookup → `no_targets` when the token table is empty.

Prior Pulse acceptance unchanged: **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED**.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table live with narrow RLS / service_role SELECT
- Trusted dispatcher + webhook autonomous path through zero-target acceptance

### In-repo native perception (not physical device acceptance)

- `/android` package `com.teamlab.orient`: email/password auth, FCM receive, token reconcile, authoritative occurrence reread, SQLite exactly-once local expression claim, one notification + one haptic
- Rule: no authoritative reread ⇒ no perception claim
- `google-services.json` is local-only (gitignored); device APK build waits on human file handoff at `android/app/google-services.json`
- Wear OS deferred

### Next Pulse boundary

1. Place `android/app/google-services.json` + publishable key in `android/local.properties`
2. `assembleDebug` / install on S26 Ultra
3. Physical acceptance: signed-in target → FCM → one notification + one haptic; duplicates silent
4. Commit/push Android candidate when requested

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
