# Master roadmap (working)

## Recently completed (candidate / pending physical acceptance)

- **ORIENT-ANDROID-PULSE-BRIDGE-006B** — client fix so token INSERT always serializes `platform=android` (uncommitted; not installed)
- **ORIENT-ANDROID-PULSE-BRIDGE-006A** — S26 registration failure diagnosed: wire omitted `platform`; hosted authority correct
- **ORIENT-ANDROID-PULSE-BRIDGE-005** — native Android perception edge (`android/`) at `699c01f`; S26 auth/notifications/FCM established
- **ORIENT-ANDROID-PULSE-BRIDGE-003** — trusted dispatcher on `main` (`30edfb7`); zero-target autonomy accepted via Database Webhook
- **ORIENT-PULSE-COMMITMENT-START-001** — first human-authorized Pulse (timed Commitment start + interrupt grant + durable occurrence + in-app expression); tables live on hosted with hosted-establishment.

## Accepted foundations (closed)

- **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001** — hosted `pg_cron` establishes authorized Pulse occurrences with Orient fully closed; physically accepted (`b8ba8b8`)
- **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** — `orient_device_push_tokens` live
- **ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — webhook → dispatch → `no_targets` with empty token table
- **NOTE-LIFECYCLE-001** / **001A** — Retire + Delete physically accepted; hosted authority clear after `92a7a18` (historical acceptance documented late; does not supersede Pulse)
- Desktop Day territory + LOOK / ADD / ACT operational borrowing
- Phone Day / temporal continuity foundation
- Day as canonical fresh startup (phone + desktop); Present via LOOK
- Phone LOOK progressive disclosure (MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001)
- Center ADD plus correction (MOBILE-CENTER-PLUS-CORRECTION-001)

## Next evidence-backed items

1. Review/commit 006B → install corrected APK on S26 → confirm hosted token row under Tyson RLS
2. Physical Pulse perception acceptance (FCM → one notification + one haptic)
3. Deferred: Wear OS / channel policy / in-app Pulse visual refinement
4. Recurring-task physical acceptance (when ready)
5. Google Calendar removal reconciliation
6. Note Edit / Unretire only if evidence requires

## Standing law

- Educational clarity over optimization
- Form-factor composition may differ; semantic capabilities stay parity unless specialization is declared
- Do not reopen accepted desktop or phone LOOK foundations while correcting chrome
- Propagate awareness; re-read authority — Notes remain outside Class-A realtime for now
- Android is perception only: no authoritative reread ⇒ no perception claim
