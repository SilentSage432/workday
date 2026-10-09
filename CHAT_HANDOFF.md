# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-007B** — perception semantic observability (uncommitted; not installed).

S26 endpoint established (`54724f0`). First autonomous Pulse: FCM+WorkManager ran; AUTHORITATIVE_REREAD_FAILED; subtype SilentNoSession vs NotVisible inconclusive until `OrientPulsePerception` logs from next Pulse.

Prior: **006** token registration corrected at `54724f0`.

**006A root cause:** client omitted `platform` on PostgREST INSERT (`encodeDefaults=false` + Kotlin default). Hosted authority correct.

Upstream production dispatcher: `30edfb7` on `main`.

Token table hosted clear: **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** (`20261009120000` on `ksmhgaamyheyhefbyglb`).

**ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — Database Webhook → authenticated dispatcher → authoritative occurrence reread → token lookup → `no_targets` when the token table is empty.

Prior Pulse acceptance unchanged: **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED**.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table live with narrow RLS / service_role SELECT
- Trusted dispatcher + webhook autonomous path through FCM to S26
- S26 endpoint established; first autonomous Pulse stopped at authoritative reread (subtype pending observability)

### In-repo native perception

- `/android` package `com.teamlab.orient`: email/password auth, FCM receive, token reconcile, authoritative occurrence reread, SQLite exactly-once local expression claim, one notification + one haptic
- Rule: no authoritative reread ⇒ no perception claim
- `google-services.json` is local-only (gitignored)
- Wear OS deferred
- 007B: `OrientPulsePerception` semantic logs (session/reread/decision/expression)

### Next Pulse boundary

1. Review/commit 007B → install observability APK (preserve Tyson session)
2. One real Pulse → capture `OrientPulsePerception` decision subtype
3. Correct proven defect → physical notification + haptic acceptance

### Still deferred elsewhere

- Wear OS / Watch6
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
