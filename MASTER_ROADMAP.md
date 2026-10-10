# Master roadmap (working)

## Recently completed (candidate / pending physical acceptance)

- **ORIENT-WEAR-PULSE-BRIDGE-006** — Watch6 Pulse actuator = local NotificationManager (`orient_pulse` channel); direct Vibrator removed; not physically accepted
- **ORIENT-WEAR-PULSE-BRIDGE-002** — native Watch6 Pulse transport/claim edge implemented (`:wear` + phone MessageClient forward after claim); actuator corrected in 006
- **ORIENT-ANDROID-PULSE-BRIDGE-007** — observability on `main` (`171c95a`); first Pulse reread failure diagnosed
- **ORIENT-ANDROID-PULSE-BRIDGE-006** — token registration serialization fix on `main` (`54724f0`); S26 endpoint established
- **ORIENT-ANDROID-PULSE-BRIDGE-005** — native Android perception edge (`android/`)
- **ORIENT-ANDROID-PULSE-BRIDGE-003** — trusted dispatcher on `main` (`30edfb7`); zero-target autonomy accepted via Database Webhook
- **ORIENT-PULSE-COMMITMENT-START-001** — first human-authorized Pulse (timed Commitment start + interrupt grant + durable occurrence + in-app expression); tables live on hosted with hosted-establishment.

## Accepted foundations (closed)

- **ORIENT-ANDROID-PULSE-NATIVE-HAPTIC-PHYSICALLY-ACCEPTED** — autonomous native sight + touch on S26 (`52a8ed8`; occurrence `76c91159`); FCM transport only; cold-start path; Freecess/thaw variants not fully proven
- **ORIENT-ANDROID-PULSE-BRIDGE-008 / 008E** — `USAGE_NOTIFICATION` haptic + auth-kt initialization ordering; physically accepted on `52a8ed8`
- **ORIENT-ANDROID-PULSE-NATIVE-NOTIFICATION-PATH-ESTABLISHED** — autonomous notify on S26 (007E); haptic later accepted in 008
- **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001** — hosted `pg_cron` establishes authorized Pulse occurrences with Orient fully closed; physically accepted (`b8ba8b8`)
- **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** — `orient_device_push_tokens` live
- **ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — webhook → dispatch → `no_targets` with empty token table
- **ORIENT-ANDROID-PULSE-S26-ENDPOINT-ESTABLISHED** — authenticated token registration on S26
- **NOTE-LIFECYCLE-001** / **001A** — Retire + Delete physically accepted; hosted authority clear after `92a7a18` (historical acceptance documented late; does not supersede Pulse)
- Desktop Day territory + LOOK / ADD / ACT operational borrowing
- Phone Day / temporal continuity foundation
- Day as canonical fresh startup (phone + desktop); Present via LOOK
- Phone LOOK progressive disclosure (MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001)
- Center ADD plus correction (MOBILE-CENTER-PLUS-CORRECTION-001)

## Next evidence-backed items

1. Physical acceptance: ORIENT-WEAR-PULSE-BRIDGE-006 Watch6 local Pulse notification + channel haptic (implemented, not installed)
2. Deferred: generic notification icon / identity visual refinement
3. Deferred: Orient Watch companion / exclusive watch-face / channel policy / in-app Pulse visual refinement
4. Recurring-task physical acceptance (when ready)
5. Google Calendar removal reconciliation
6. Note Edit / Unretire only if evidence requires

## Standing law

- Educational clarity over optimization
- Form-factor composition may differ; semantic capabilities stay parity unless specialization is declared
- Do not reopen accepted desktop or phone LOOK foundations while correcting chrome
- Propagate awareness; re-read authority — Notes remain outside Class-A realtime for now
- Android is perception only: no authoritative reread ⇒ no perception claim
