# Development journal

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-008

Background haptic semantic correction (uncommitted; not installed).

- 007E: autonomous native notification path established; explicit 40ms haptic invoked then ignored (`background` + `TOUCH`).
- Cause: bare `vibrate(VibrationEffect)` → empty attributes → UNKNOWN→TOUCH.
- Fix: `VibrationAttributes.USAGE_NOTIFICATION` (not `USAGE_ALARM`); duration/amplitude/silent notification unchanged.
- Haptic not marked physically accepted.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-007B

Native perception semantic observability only (uncommitted; not installed).

- First autonomous Pulse reached FCM/WorkManager; worker success collapsed Silent subtypes — 007A inconclusive.
- Tag `OrientPulsePerception`: session/refresh/user, SELECT visibility, decision enums, claim/notify/haptic — no secrets.
- Runtime semantics unchanged vs `54724f0`.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-007.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-007.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-006B

Client serialization correction for native token registration (uncommitted).

- S26 physical state: auth/notifications/fcm_token yes; token_registered no.
- Root cause: `TokenRow.platform` Kotlin default omitted under PostgREST `encodeDefaults=false`; hosted `platform` NOT NULL — authority correct.
- Fix: required `platform` on write model; always `"android"`; wire-contract unit test; safe failure class/status logs (no secrets).
- No schema/RLS/service_role change. No APK install yet.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-006.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-006.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-005

Native Android Pulse perception edge under `android/` (package `com.teamlab.orient`).

- Auth: supabase-kt email/password; session in EncryptedSharedPreferences; publishable key only.
- FCM data `{ pulse_occurrence_id }` → WorkManager → session load/refresh → SELECT `pulse_occurrences.id` under user JWT → SQLite INSERT OR IGNORE claim → one notification + one 40ms haptic.
- Token reconcile against `orient_device_push_tokens` when session + token both exist; logout best-effort DELETE then signOut.
- Readiness: authenticated + POST_NOTIFICATIONS + FCM token + registration success.
- `google-services.json` gitignored (public repo local-only). Unit tests 22/22 without that file; device assemble awaits human handoff.
- Wear OS deferred. No service_role / dispatch secret / Firebase Admin on device.
- Upstream zero-target autonomy already accepted (webhook path live).

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-005.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-005.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-003

Trusted Pulse dispatcher (server-only).

- Route: `POST /api/pulse/dispatch` with header `X-Orient-Pulse-Dispatch-Secret`.
- Re-reads `pulse_occurrences` under service_role; ownership from hosted row only.
- Loads owner `orient_device_push_tokens`; FCM data payload `{ pulse_occurrence_id }` only; Android priority high.
- `firebase-admin` server dependency; `FIREBASE_SERVICE_ACCOUNT_JSON` + dispatch secret from env (never logged/committed).
- No delivery ledger; no stale-token DELETE (service_role remains SELECT-only on tokens).
- Database Webhook later accepted through **ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED**; Android perception is BRIDGE-005.
- Prerequisite: `SUPABASE_SERVICE_ROLE_KEY` must be present on the host serving the route.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-003.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-003.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-002

Hosted device push token authority for future Android Pulse delivery.

- Table: `public.orient_device_push_tokens` (android-only platform, globally unique `fcm_token`, owner-scoped RLS).
- Migration: `20261009120000_orient_device_push_tokens.sql` — revoke-first privileges; authenticated own CRUD; intended `service_role` SELECT only; DB-controlled `updated_at` trigger.
- Domain contract: `domain/devicePushToken.ts` (registration/refresh semantics; no web writer; cross-user reassignment rejected).
- Explicitly not included: dispatcher, webhook, FCM send, Kotlin/Android project, hosted apply.
- Pulse grant/occurrence/evaluator tables untouched.
- Human Firebase/Vercel secrets exist outside repo; values not inspected.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-002.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-002.md).

## 2026-10-08 — NOTE-LIFECYCLE-001 historical physical acceptance (docs repair)

Late documentation of Note Lifecycle physical acceptance that already occurred on Tyson’s Samsung phone after corrected candidate `92a7a18` / deployment `dpl_5zSfHQNK9dGniZRNjgQRHTrg1hqK`.

- Semantics unchanged: Retire = was valid, leave current Notes, row remains; Delete = must not exist (uncited only); Current Notes = not retired.
- Hosted authority after `20261008220000`: **NOTE-LIFECYCLE-HOSTED-AUTHORITY-CLEAR** (table UPDATE no; UPDATE(`retired_at`) yes; DELETE/SELECT/INSERT yes).
- Physical: Retire worked; uncited Delete confirm/cancel; cited Delete protected with Retire still available.
- Tyson: “BOOM!!! works so good”
- Edit / Unretire / Archive browser remain deferred.
- Documented after later Pulse hosted-establishment acceptance; does not reopen or supersede Pulse.

Records: [docs/implementation/NOTE-LIFECYCLE-001.md](docs/implementation/NOTE-LIFECYCLE-001.md), [docs/implementation/NOTE-LIFECYCLE-001A.md](docs/implementation/NOTE-LIFECYCLE-001A.md).

## 2026-10-08 — ORIENT-PULSE-HOSTED-ESTABLISHMENT-001 physical acceptance

Closed-client hosted Pulse establishment physically accepted on production Orient.

- Hosted apply on `ksmhgaamyheyhefbyglb`: `20261008240000` live; `20261008230000` present once; verdict `ORIENT-PULSE-HOSTED-AUTHORITY-CLEAR`.
- Cron job `orient-pulse-hosted-establishment` (`* * * * *`) observed succeeding; run log recorded success.
- Physical proof: timed Commitment + explicit 5-minute grant → Orient fully closed on phone and desktop through threshold and start → reopen already showed the Pulse expression.
- Tyson: “it fucking worked. when i opened it back up, that notification was there already”
- Meaning preserved: hosted evaluation established the occurrence without an open client; re-entry expression is not native delivery.
- Non-blocking finding retained: `service_role` platform-default surplus on new functions/run-log; authenticated/anon/public remain closed.
- Kotlin / Android notification / haptic / Wear not started and not accepted.

Record: [docs/implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md](docs/implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md).

## 2026-10-08 — ORIENT-PULSE-HOSTED-ESTABLISHMENT-001

Sovereign hosted Pulse occurrence establishment without an open Orient client.

- Mechanism: Postgres `pg_cron` + SECURITY DEFINER SQL evaluator (Edge Function / Vercel cron rejected as larger).
- Semantic correction: establishment due when `now >= threshold` (`eligible | elapsed`); expression window remains `[threshold, start)`.
- Migration: `20261008240000_pulse_hosted_establishment.sql` — evaluator, run log, minute cron job.
- Browser evaluator retained as opportunistic convergence under uniqueness.
- Delivery / Kotlin / push / Wear deferred.

Record: [docs/implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md](docs/implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md).

## 2026-10-08 — ORIENT-PULSE-COMMITMENT-START-001

First human-authorized Pulse proof.

- Domain: Interrupt Grant, Pulse occurrence, deterministic Commitment-start evaluator (`[threshold, start)`).
- Migration: `pulse_interrupt_grants` + `pulse_occurrences`; narrow privileges (revoke defaults first); same-owner Commitment cascade; occurrence fingerprint retention; realtime reread publication.
- Persistence: establish/revoke grant; idempotent occurrence ensure.
- UI: timed Commitment remind / don’t remind; restrained in-app expression; dismiss is expression-only.
- No push, Wear, haptics, service worker, or channel policy.
- Hosted migration not applied.

Record: [docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md](docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md).

## 2026-10-08 — NOTE-LIFECYCLE-001A

Corrective forward migration after hosted verification: revoke table-level `UPDATE` on `public.notes` from `authenticated`, then re-grant `UPDATE (retired_at)`. Lifecycle-001 applied and was semantically correct in isolation; additive grants left historical table-level UPDATE in place. Not applied to hosted yet.

Record: [docs/implementation/NOTE-LIFECYCLE-001A.md](docs/implementation/NOTE-LIFECYCLE-001A.md).

## 2026-10-08 — NOTE-LIFECYCLE-001

Implemented Retire + Delete for retained Notes from NOTE-LIFECYCLE-DISCOVERY-001.

- Domain: `retiredAt` on `Note`; `NoteCitedError` for cited Delete.
- Migration: `retired_at`, owner `UPDATE (retired_at)` + `DELETE` grants and policies (not applied to hosted project in this tranche).
- Persistence: operational `loadNotes` filters `retired_at IS NULL`; `retireNote`; `deleteNote`.
- UI: LOOK → Notes exposes Retire (no confirm) and Delete (confirm). Provenance FK unchanged.
- Edit, Unretire UI, Archive browser, Notes Class-A realtime deferred.
- Pulse remains next major exploration after physical acceptance.

Record: [docs/implementation/NOTE-LIFECYCLE-001.md](docs/implementation/NOTE-LIFECYCLE-001.md). Decision: [docs/decisions/2026-10-08-note-lifecycle.md](docs/decisions/2026-10-08-note-lifecycle.md).

## 2026-10-08 — MOBILE-CENTER-PLUS-CORRECTION-001

Phone center ADD showed Lucide Plus stacked above a redundant text `+`. Removed the phone text sibling; kept one Plus glyph, `aria-label="ADD"`, and desktop Plus+ADD. No CSS. Physical phone verification still required after deploy.

Record: [docs/implementation/MOBILE-CENTER-PLUS-CORRECTION-001.md](docs/implementation/MOBILE-CENTER-PLUS-CORRECTION-001.md).

## 2026-10-08 — MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001

Phone LOOK progressive disclosure after real-world overload at Lowe’s.

- Shared `LookSurface` gains `LookComposition`: `navigator-lens` (desktop) / `phone-calm` (phone).
- Phone initial LOOK: orientation summary, immediate Present/Day/Week/Month, collapsed Position / Focus / Operations via native `<details>`.
- Desktop LOOK composition left unchanged.
- No schema, persistence, domain, or dependency changes.
- Physically accepted in production (“that is much better”).

Record: [docs/implementation/MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001.md](docs/implementation/MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001.md).
