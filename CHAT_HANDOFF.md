# Chat handoff

## Current state (2026-10-09)

**ORIENT-ANDROID-PULSE-BRIDGE-003** — trusted Pulse dispatcher implemented in-repo (uncommitted candidate): `POST /api/pulse/dispatch`.

Token table hosted clear: **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** (`20261009120000` on `ksmhgaamyheyhefbyglb`).

Prior Pulse acceptance unchanged: **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED**.

Human Firebase/Vercel secrets exist outside repo authority (do not inspect values). Confirm `SUPABASE_SERVICE_ROLE_KEY` is available to the deploy that serves the dispatch route.

### Proven (Pulse)

- Explicit Interrupt Grant + relative 5-minute Commitment-start authority
- Hosted evaluation establishes durable Pulse occurrence with Orient fully closed
- Owner-scoped Android FCM token table live with narrow RLS / service_role SELECT

### In-repo delivery progress (not native delivery)

- Trusted dispatcher: secret header → re-read occurrence → owner token lookup → FCM data `{ pulse_occurrence_id }`
- No Database Webhook yet; no Kotlin/Android; no physical native delivery acceptance

### Next Pulse boundary

1. Commit/push dispatcher candidate when requested  
2. Confirm Vercel `SUPABASE_SERVICE_ROLE_KEY` for dispatch  
3. Create Database Webhook `AFTER INSERT` on `pulse_occurrences` → dispatch route  
4. `/android` auth + token registration + FCM receive + notification/haptic  

### Still deferred elsewhere

- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Note Edit / Unretire UI / Archive browser
