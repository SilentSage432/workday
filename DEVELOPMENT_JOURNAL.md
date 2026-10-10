# Development journal

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-005-II

Native relationship-aware silence gate candidate.

- Baseline `95f5464`; Orient production foundation already established (005-IB).
- Phone reread loads `id`/`relationship`/`source_start_at`; FCM remains id-only.
- Pronunciation gate: relative_before continues; ARRIVAL terminal claim+silence; unknown fail-closed; transient reread does not consume.
- Wear id-only transport preserved; ARRIVAL never forwarded from phone express path.
- Human ARRIVAL authority still unavailable; no morphology/freshness; no production mutation; no device install.
- Verdict target: `ORIENT-PULSE-NATIVE-ARRIVAL-SILENCE-GATE-CANDIDATE-READY`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-005-II.md](docs/implementation/ORIENT-PULSE-EXPRESSION-005-II.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-005-I

Arrival relationship foundation candidate (schema / provenance / evaluator).

- Baseline `832dc2a`; Orient `ksmhgaamyheyhefbyglb` inspected read-only; Wealth untouched.
- Production evidence: 1 grant (positive lead), 15 occurrences all `threshold_at < source_start_at`; backfill → relative_before only.
- Migration `20261010200000_pulse_authorized_temporal_relationships.sql`: relationship column, lead invariants, uniqueness+relationship, evaluator T−L vs T.
- Human Reach-me remains relative_before-only; ARRIVAL UI/native/haptic not exposed; production migration not applied.
- Verdict target: `ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-CANDIDATE-READY`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-005-I.md](docs/implementation/ORIENT-PULSE-EXPRESSION-005-I.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-005A

Arrival authority implementation design published (docs only).

- Baseline `c76a97b`; project `ksmhgaamyheyhefbyglb`.
- Accepted: `relationship` text+CHECK; relative_before/arrival; lead rules; uniqueness; occurrence provenance; id-only transport; LIFECYCLE-003/RLS preserved.
- Corrected order: 005-I foundation → 005-II native silence → 005-III human ARRIVAL UI → 005-IV eligibility+morphology.
- 005-I must not expose ARRIVAL UI or change physical pronunciation; numeric eligibility deferred; not blocking.
- Verdict: `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-005.md](docs/implementation/ORIENT-PULSE-EXPRESSION-005.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-005

Arrival authority implementation design (docs only).

- Baseline `c76a97b` = `origin/main`, clean tree; project `ksmhgaamyheyhefbyglb`.
- Design: grant/occurrence `relationship` text CHECK; relative_before lead>0; arrival lead NULL; uniqueness includes relationship; backfill all existing → relative_before.
- Evaluator branches T−L vs T; ARRIVAL physical pronunciation disabled until eligibility+morphology.
- Design verdict: `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-CLEAR` (published in 005A with corrected tranche order).

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-005.md](docs/implementation/ORIENT-PULSE-EXPRESSION-005.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-004A

Authorized temporal relationships design decision published (docs only).

- Baseline `8107f8e`; project `ksmhgaamyheyhefbyglb`.
- Accepted tokens: `relative_before` (positive lead required; maps current authority) and `arrival` (no lead parameter; not implemented).
- APPROACH rejected; magic zero / NULL-as-ARRIVAL rejected; one grant/one relationship; independent coexistence + revocation; occurrence relationship provenance required.
- Next: ORIENT-PULSE-EXPRESSION-005 Arrival authority implementation design (docs only).
- Verdict: `ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-004.md](docs/implementation/ORIENT-PULSE-EXPRESSION-004.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-004

Arrival authority form discovery (docs only).

- Baseline `8107f8e` = `origin/main`, clean tree; project `ksmhgaamyheyhefbyglb`.
- Missing concept: authorized temporal relationship (distinct from source transition and lead parameter).
- Magic zero rejected as identity; ARRIVAL is not a new transition_kind.
- Model: two grants; explicit relationship identity; lead parameter for relative_before only; occurrence carries relationship provenance.
- Discovery verdict: `ORIENT-PULSE-ARRIVAL-AUTHORITY-FORM-CLEAR` (published in 004A).

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-004.md](docs/implementation/ORIENT-PULSE-EXPRESSION-004.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-003A

Arrival expression timeliness published (docs only).

- Baseline `c33538a`; project `ksmhgaamyheyhefbyglb`.
- Durable truth lifetime ≠ physical expression lifetime; expression eligibility canonized; shared policy / local evaluation; unauthorized vs stale silence distinct.
- Numeric eligibility duration not chosen; no ARRIVAL/haptic/schema/runtime/Presence impl.
- Next boundary: ORIENT-PULSE-EXPRESSION-004 Arrival authority form discovery.
- Verdict: `ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-003.md](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-003

Arrival expression timeliness discovery (docs only).

- Baseline `c33538a` = `origin/main`, clean tree; project `ksmhgaamyheyhefbyglb`.
- Durable ARRIVAL truth may outlive physical expression usefulness; expression eligibility is separate.
- Late establishment may preserve evidence; late physical speech may remain silent; eventually-deliver-all rejected for ARRIVAL.
- Shared deterministic expression-eligibility policy; surface-specific evaluation OK; one occurrence remains one truth.
- Timeliness ≠ urgency; exact numeric window deferred; no haptic/schema/runtime/ARRIVAL impl.
- Discovery verdict: `ORIENT-PULSE-ARRIVAL-TIMELINESS-CLEAR` (published in 003A).

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-003.md](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-002A

Arrival semantic discovery published + product decision (docs only).

- Baseline `fb5cf0f`; project `ksmhgaamyheyhefbyglb`.
- Tyson accepts ARRIVAL semantic relationship for continued development; Interrupt Grant / occurrence / haptic not implemented; physical word candidate only; morphology not designed; physical acceptance not performed.
- Independent authority both directions; Commitment/Block same ARRIVAL meaning; magic zero rejected; silence principle canonized.
- Next boundary: ORIENT-PULSE-EXPRESSION-003 Arrival expression timeliness discovery.
- Verdict: `ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-002.md](docs/implementation/ORIENT-PULSE-EXPRESSION-002.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-002

Arrival semantic authority discovery (docs only).

- Baseline `fb5cf0f` = `origin/main`, clean tree; project `ksmhgaamyheyhefbyglb`.
- Current positive-lead meaning: human-authorized pre-boundary threshold became true (APPROACH not accepted name).
- ARRIVAL candidate: authoritative temporal boundary itself has become present — distinct relationship; independent authority; no inheritance.
- Candidate physical-word status earned; lead=0/haptics not implemented.
- Prefer explicit relationship identity over magic zero; silence when unauthorized is part of the language.
- Discovery verdict: `ORIENT-PULSE-ARRIVAL-SEMANTICS-CLEAR` (published in 002A).

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-002.md](docs/implementation/ORIENT-PULSE-EXPRESSION-002.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-001A

Semantic expression discovery published (docs only).

- Baseline `c3b8ce4`; project `ksmhgaamyheyhefbyglb`.
- Current word: already-established human-authorized Pulse occurrence requesting perception; “worthy of perception” rejected.
- Commitment timed-start positive-lead ≡ Block timed-start positive-lead (same perceptual meaning).
- Durable principles canonized; touch/light direction only; APPROACH/ARRIVAL/END/vocabulary-size/timings not canonized.
- Next boundary: ORIENT-PULSE-EXPRESSION-002 Arrival semantic authority discovery (not lead=0 approval; not second haptic).
- Verdict: `ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED`.

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-001.md](docs/implementation/ORIENT-PULSE-EXPRESSION-001.md).

## 2026-10-10 — ORIENT-PULSE-EXPRESSION-001

Pulse semantic expression language discovery (docs only).

- Baseline `c3b8ce4` = `origin/main`, clean tree; project `ksmhgaamyheyhefbyglb`.
- Narrowest current haptic meaning: already-established authorized Pulse occurrence requesting perception — not “worthy of,” not source-kind, not urgency.
- Commitment-start and Block-start: same perceptual meaning from different sovereign sources; source-kind-as-language rejected.
- Minimum model: one semantic expression; no new schema/authority; vocabulary not accepted.
- Discovery verdict: `ORIENT-PULSE-EXPRESSION-SEMANTICS-CLEAR` (published in 001A).

Record: [docs/implementation/ORIENT-PULSE-EXPRESSION-001.md](docs/implementation/ORIENT-PULSE-EXPRESSION-001.md).

## 2026-10-10 — ORIENT-PULSE-LIFECYCLE-003 / 003A

Pulse source-deletion lifecycle physically accepted and finalized.

- Candidate `413da67`; migration `20261010170000` live once; function SECURITY DEFINER.
- Tyson deleted Block pulse 003 (`68a7e475…`) via normal production Orient UI; prior `42501` did not appear; Block disappeared.
- Grant `996699be…` hard-cleaned; occurrence `7fadd828…` retained (`grant_id` NULL) with full temporal provenance.
- Soft revoke vs source-delete hard-cleanup semantics preserved; no authenticated grant DELETE; AUTHORITY-005 evidence untouched.
- Optional human Commitment deletion not performed. Lifecycle defect CLOSED. Next boundary: Pulse semantic expression.

Record: [docs/implementation/ORIENT-PULSE-LIFECYCLE-003.md](docs/implementation/ORIENT-PULSE-LIFECYCLE-003.md).

## 2026-10-10 — ORIENT-PULSE-LIFECYCLE-002

Source-deletion cleanup authority correction (later production-established and physically accepted).

- Symptom after AUTHORITY-005: authenticated delete of owned Commitment/Block with Interrupt Grant failed `permission denied for table pulse_interrupt_grants` (SQLSTATE `42501`).
- Cause: `20261010093000` replaced Commitment FK `ON DELETE CASCADE` with INVOKER trigger DELETE while authenticated intentionally lacks DELETE on `pulse_interrupt_grants` (soft revoke only).
- Forward migration `20261010170000_pulse_interrupt_grants_source_delete_authority.sql`: SECURITY DEFINER + `search_path = public`, same narrow predicate; no authenticated DELETE grant; no DELETE RLS; triggers unchanged.
- Executable PostgreSQL regression proves INVOKER failure, then Commitment/Block cleanup, occurrence retention (`grant_id` NULL), soft revoke, direct DELETE forbidden, cross-user isolation.
- Runtime/UI/device untouched by the correction. Physical acceptance: LIFECYCLE-003.

Record: [docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md).

## 2026-10-10 — ORIENT-PULSE-AUTHORITY-005 / 005A

General Pulse authority physically accepted and finalized.

- Timed Commitment-start (prior) + timed Block-start (005) under one grammar on `e3ec23c`.
- Block Pulse 005: Block `0b0db1c6…`, grant `6e9adb35…`, occurrence `a2dae150…`; Orient out of execution; hosted establish at threshold; one phone claim / one watch claim / one watch post; Tyson felt Watch6 haptic; notification visible; phone perceived; no duplicates.
- AUTHORITY-003 remains FAILED; recovery `7fadd828…` distinct and non-retroactive.
- Next boundary: Pulse semantic expression (shared haptic meaning?) before more source kinds. Haptic language undesigned.

Record: [docs/implementation/ORIENT-PULSE-AUTHORITY-005.md](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md).

## 2026-10-10 — ORIENT-PULSE-AUTHORITY-004

Hosted evaluator PL/pgSQL ambiguity correction after failed Block-start physical acceptance.

- AUTHORITY-003: human Block + grant OK; hosted establishment failed (`source_starts_on` ambiguous); zero occurrence; perception not exercised. Failed Block `68a7e475…` / grant `996699be…` preserved.
- Forward migration `20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql` renames colliding locals (`v_source_starts_on` / `v_source_start_local`). Historical `20261010093000` left immutable.
- Ephemeral PostgreSQL regression reproduces ambiguity then proves Block + Commitment exactly-once establishment.
- Later applied in production (004B) on `e3ec23c`; autonomous cron recovered. Physical acceptance is AUTHORITY-005.

Record: [docs/implementation/ORIENT-PULSE-AUTHORITY-004.md](docs/implementation/ORIENT-PULSE-AUTHORITY-004.md).

## 2026-10-10 — ORIENT-PULSE-AUTHORITY-002C

Live-history migration correction after 002B production establishment blocked.

- Production remained pre-002; `20261010093000` never applied.
- Canonical predecessor already owns `blocks_id_user_key` via `20261005170800_execution_direction.sql` (`UNIQUE (id, user_id)`).
- Corrected migration removes duplicate `ADD CONSTRAINT blocks_id_user_key` and documents the dependency.
- No production schema mutation; no physical acceptance.

## 2026-10-10 — ORIENT-PULSE-AUTHORITY-002

Timed Block-start Interrupt Grant implemented as second authorized Pulse source relationship (source generalization proof).

- Baseline `4197d471f78fd8a74bfabab02c56791f770b8265`; published candidate `86be59f`.
- Migration `20261010093000_pulse_block_start_authority.sql` authored; **not** applied to production (002B blocked on duplicate constraint).
- Positive relative lead before timed Block start only; Commitment-start unchanged; delivery/device untouched.
- Physical acceptance not declared.

Record: [docs/implementation/ORIENT-PULSE-AUTHORITY-002.md](docs/implementation/ORIENT-PULSE-AUTHORITY-002.md).

## 2026-10-10 — ORIENT-PULSE-AUTHORITY-001

General Interrupt Authority domain discovery (no runtime/schema/device mutation).

- Baseline `885782989a8371b276aaef4605ec517ff50ee910`; grant schema classified **C** (general columns, Commitment-start hard constraints).
- Grammar retained: authoritative source → temporal relationship → explicit Interrupt Grant → deterministic threshold → Pulse occurrence.
- Class A in principle beyond Commitment-start includes timed Block/PT start and Task `planned_on`+`planned_local`; MustDo/Note/ActiveThread/work schedule/external-without-grant remain non-sources or deferred.
- Smallest recommended first generalization (discovery only, not accepted architecture): timed Block start with relative lead.
- Verdict: `ORIENT-PULSE-GENERAL-AUTHORITY-MODEL-CLEAR`.

Record: [docs/implementation/ORIENT-PULSE-AUTHORITY-001.md](docs/implementation/ORIENT-PULSE-AUTHORITY-001.md).

## 2026-10-10 — ORIENT-WEAR-PULSE-BRIDGE-008

Watch6 Pulse transport / native wrist perception primitive finalized.

- Verdict: `ORIENT-WEAR-PULSE-NATIVE-WRIST-PERCEPTION-ACCEPTANCE-FINALIZED`
- Phase 2 (phone native perception) and Phase 3 (Watch6 wrist perception primitive) both closed.
- Authorities separated: Wrist Presence ≠ Wrist Attention ≠ Pulse Authority.
- Watch remains perception edge (`pulse_occurrence_id` only); face remains future observer; generalized sources and preferred-surface routing remain unimplemented direction.

Record: [docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-008.md](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-008.md).

## 2026-10-10 — ORIENT-WEAR-PULSE-BRIDGE-007

Watch6 NotificationManager Pulse actuator physically accepted (`c76b982`).

- Occurrence `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72` on SM-S948U + SM-R955U: full production chain → watch claim once → local Orient/Pulse notification → OS `USAGE_NOTIFICATION` haptic `FINISHED` → human WATCH HAPTIC FELT + notification visible.
- Direct Orient watch `Vibrator` count = 0; SysUI/notification infrastructure mediated vibration.
- `orient_pulse` channel may pre-exist from permission Activity `ensureChannel` (factual; not a defect).
- Perception observation is not durable acknowledgement.

Record: [docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-007.md](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-007.md).

## 2026-10-09 — ORIENT-WEAR-PULSE-BRIDGE-006

Watch Pulse actuator corrected to NotificationManager (later physically accepted in 007).

- Direct Watch6 `USAGE_NOTIFICATION` vibrator was API-valid but physically suppressed (`IGNORED_APP_OPS` / `audio=ignore`; on-wrist 004C falsified off-body-only hypothesis).
- Watch expression path: authority check → SQLite claim → local `orient_pulse` channel notification (`IMPORTANCE_DEFAULT`, sound none, vibration `[0,40]`); OS owns haptic.
- Minimal `WearPulsePermissionActivity` requests `POST_NOTIFICATIONS`. `WearPulseHaptic` removed.
- Claim ordering: do not consume exactly-once claim when notification authority already unavailable. Face remains observer of local claim.
- Automated tests/assemble/lint green on publication candidate `c76b982`.

Record: [docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-006.md](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-006.md).

## 2026-10-09 — ORIENT-WEAR-PULSE-BRIDGE-002

Native Watch6 Pulse perception edge implemented (not physically accepted).

- `:wear` headless module: `applicationId` `com.teamlab.orient`, namespace `com.teamlab.orient.wear`, SDK 37/36/30, ABI `armeabi-v7a`.
- Phone forwards only after JWT/RLS reread + phone claim CLAIMED via MessageClient path `/orient/pulse/express` (capability `orient_pulse_perception`).
- Watch: WearableListenerService → SQLite INSERT OR IGNORE → expression actuator later corrected in BRIDGE-006 to NotificationManager. No Supabase/FCM/evaluator/secrets on watch.
- First proof tolerates phone + watch double perception. Watch face / companion UI deferred.
- Environment: SM-R955U API 36 cleared in BRIDGE-001B; baseline restored in 001C.

Record: [docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-002.md](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-002.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-008I

Native autonomous Pulse perception physically accepted (`52a8ed8`).

- Occurrence `76c91159-465d-4f30-b9b9-6cca9d4f1c5b`: cold FCM wake → session init await → Authenticated → refresh → JWT/RLS SELECT visible → claim once → silent notification → one 40ms `USAGE_NOTIFICATION` haptic (`FINISHED`; physically perceived).
- Milestone: Orient autonomously expresses an authorized durable Pulse through native Android sight and touch while the user is not operating Orient.
- FCM is transport only; native client is perception edge (not a second temporal evaluator).
- Freecess/thaw variants not fully proven. Generic notification icon still deferred.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-008E

Background session restoration ordering correction on `main` (`52a8ed8`).

- 008C: Pulse `c3267981` failed at session establishment; haptic correction not exercised.
- 008D: root cause — `ensureSessionLoaded` called `refreshCurrentSession()` while still `Initializing` (auth-kt 3.8.0 throws).
- 008E: await `awaitInitialization()` within 8s bound; refresh only after Authenticated; timeout/NotAuthenticated fail closed without refresh.
- Physically exercised on accepted cold-start Pulse `76c91159`. Freecess not claimed as root cause.

Record: [docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md](docs/implementation/ORIENT-ANDROID-PULSE-BRIDGE-008.md).

## 2026-10-09 — ORIENT-ANDROID-PULSE-BRIDGE-008

Background haptic semantic correction on `main` (`52a8ed8`; physically accepted).

- 007E: autonomous native notification path established; explicit 40ms haptic invoked then ignored (`background` + `TOUCH`).
- Cause: bare `vibrate(VibrationEffect)` → empty attributes → UNKNOWN→TOUCH.
- Fix: `VibrationAttributes.USAGE_NOTIFICATION` (not `USAGE_ALARM`); duration/amplitude/silent notification unchanged.
- Physically accepted on occurrence `76c91159` (OS `NOTIFICATION` / `FINISHED` + direct perception).

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
