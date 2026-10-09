# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-002** — hosted device push token authority implemented in-repo (uncommitted candidate). Migration `20261009120000_orient_device_push_tokens.sql` **not applied** hosted.

Prior Pulse acceptance unchanged: **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED** on `ksmhgaamyheyhefbyglb` (`b8ba8b8`).

Discovery/contracts accepted: **ORIENT-ANDROID-PULSE-NATIVE-PATH-CLEAR**, **ORIENT-ANDROID-PULSE-TRANSPORT-CONTRACT-CLEAR**.

Human Firebase/Vercel secret setup exists outside repo authority (do not inspect values).

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Post-start due-establishment works; reopen shows in-app expression of the already-established occurrence

### In-repo delivery progress (not native delivery)

- Owner-scoped `orient_device_push_tokens` schema + RLS + domain registration contract
- No dispatcher, webhook, FCM send, Kotlin, or phone mutation in this tranche

### Not started / not accepted (Pulse delivery)

- Hosted apply + privilege inspection of token table
- Dispatcher route / Database Webhook / FCM send
- Kotlin companion / native Android notification / haptic
- Wear OS / Watch6 / watch face
- Final in-app Pulse visual treatment
- Broader Pulse source kinds

### Next Pulse boundary

1. Commit/push candidate when requested → hosted apply + inspect `service_role` on token table  
2. Hosted dispatcher + webhook  
3. `/android` auth + token registration + FCM receive + notification/haptic

### Still deferred elsewhere

- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
