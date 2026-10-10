# Master roadmap (working)

## Accepted foundations (closed)

- **ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED** — EXPRESSION-005/005A on baseline `c76a97b`; `relationship` text+CHECK; order 005-I foundation → 005-II native silence → 005-III human ARRIVAL UI → 005-IV eligibility+morphology; ARRIVAL UI forbidden until native silence ([EXPRESSION-005](docs/implementation/ORIENT-PULSE-EXPRESSION-005.md))
- **ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED** — EXPRESSION-004/004A on baseline `8107f8e`; tokens `relative_before` + `arrival`; one grant/one relationship; lead parameter of relative_before only; magic zero / APPROACH / NULL-as-ARRIVAL rejected ([EXPRESSION-004](docs/implementation/ORIENT-PULSE-EXPRESSION-004.md))
- **ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED** — EXPRESSION-003/003A on baseline `c33538a`; durable truth ≠ physical expression lifetime; expression eligibility canonized; shared policy / local evaluation; numeric window deferred ([EXPRESSION-003](docs/implementation/ORIENT-PULSE-EXPRESSION-003.md))
- **ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED** — EXPRESSION-002/002A on baseline `fb5cf0f`; ARRIVAL semantic relationship accepted for development; independent authority; candidate word only; no grant/haptic/lead=0 impl ([EXPRESSION-002](docs/implementation/ORIENT-PULSE-EXPRESSION-002.md))
- **ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED** — EXPRESSION-001/001A docs on baseline `c3b8ce4`; current word = authorized occurrence requesting perception; Commitment ≡ Block same word; source-kind/intensity rejected; durable expression principles canonized; vocabulary still undesigned ([EXPRESSION-001](docs/implementation/ORIENT-PULSE-EXPRESSION-001.md))
- **ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED** — LIFECYCLE-001/002/003 closed; `20261010170000` SECURITY DEFINER live; Block pulse 003 UI delete physically accepted on `413da67` (occurrence `7fadd828` retained; [003](docs/implementation/ORIENT-PULSE-LIFECYCLE-003.md) / [002](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md))
- **ORIENT-PULSE-GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED** — timed Commitment-start + timed Block-start physically accepted under one grammar on `e3ec23c` (occurrence `a2dae150`; [005](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md)); AUTHORITY-003 establishment remains FAILED historically

- **ORIENT-WEAR-PULSE-NATIVE-WRIST-PERCEPTION-ACCEPTANCE-FINALIZED** — Phase 3 closed; Watch6 notification-class wrist perception on `c76b982` (occurrence `24aad0ab`; [007](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-007.md) / [008](docs/implementation/ORIENT-WEAR-PULSE-BRIDGE-008.md))
- **ORIENT-WEAR-PULSE-NOTIFICATION-ACTUATOR-PHYSICALLY-ACCEPTED** — NM actuator + OS `USAGE_NOTIFICATION` FINISHED + human WATCH HAPTIC FELT
- **ORIENT-WEAR-PULSE-BRIDGE-006** — Watch6 NotificationManager actuator published (`c76b982`); direct Vibrator removed
- **ORIENT-ANDROID-PULSE-NATIVE-HAPTIC-PHYSICALLY-ACCEPTED** — Phase 2 closed; autonomous native sight + touch on S26 (`52a8ed8`; occurrence `76c91159`)
- **ORIENT-ANDROID-PULSE-BRIDGE-008 / 008E** — `USAGE_NOTIFICATION` haptic + auth-kt initialization ordering; physically accepted on `52a8ed8`
- **ORIENT-ANDROID-PULSE-NATIVE-NOTIFICATION-PATH-ESTABLISHED** — autonomous notify on S26 (007E); haptic later accepted in 008
- **ORIENT-PULSE-HOSTED-ESTABLISHMENT-001** — hosted `pg_cron` establishes authorized Pulse occurrences with Orient fully closed; physically accepted (`b8ba8b8`)
- **ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR** — `orient_device_push_tokens` live
- **ORIENT-ANDROID-PULSE-ZERO-TARGET-AUTONOMY-ACCEPTED** — webhook → dispatch → `no_targets` with empty token table
- **ORIENT-ANDROID-PULSE-S26-ENDPOINT-ESTABLISHED** — authenticated token registration on S26
- **ORIENT-ANDROID-PULSE-BRIDGE-003** — trusted dispatcher on `main` (`30edfb7`)
- **ORIENT-PULSE-COMMITMENT-START-001** — first human-authorized Pulse (timed Commitment start + interrupt grant + durable occurrence + in-app expression)
- **NOTE-LIFECYCLE-001** / **001A** — Retire + Delete physically accepted; hosted authority clear after `92a7a18` (historical acceptance documented late; does not supersede Pulse)
- Desktop Day territory + LOOK / ADD / ACT operational borrowing
- Phone Day / temporal continuity foundation
- Day as canonical fresh startup (phone + desktop); Present via LOOK
- Phone LOOK progressive disclosure (MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001)
- Center ADD plus correction (MOBILE-CENTER-PLUS-CORRECTION-001)

## Discovery / next Pulse boundary

- **ORIENT-PULSE-EXPRESSION-005-I** — ARRIVAL relationship foundation (schema/provenance/evaluator) when authorized; no ARRIVAL UI; no native pronunciation change; no haptic; no numeric eligibility. Basis: [EXPRESSION-005](docs/implementation/ORIENT-PULSE-EXPRESSION-005.md).
- Then 005-II native silence → 005-III human ARRIVAL authority → 005-IV eligibility + morphology.
- Historical: AUTHORITY-003 FAILED; 004 production repaired; 002 Block-start implemented — see authority docs under `docs/implementation/ORIENT-PULSE-AUTHORITY-*.md`.

## Next evidence-backed items

1. ORIENT-PULSE-EXPRESSION-005-I — relationship foundation implementation when authorized (inspect production migrations first; no ARRIVAL UI)
2. Deferred: preferred perception-surface routing (phone/watch); dual expression remains first-proof behavior
3. Deferred: Orient Watch face / visual Pulse expression / ambient Presence (observer; momentary ARRIVAL word distinct; no Presence authorized)
4. Deferred: richer Orient Watch companion
5. Deferred: generic notification icon / identity visual refinement
6. Freecess/thaw lifecycle variants (when ready)
7. Recurring-task physical acceptance (when ready)
8. Google Calendar removal reconciliation
9. Note Edit / Unretire only if evidence requires

## Standing law

- Educational clarity over optimization
- Form-factor composition may differ; semantic capabilities stay parity unless specialization is declared
- Do not reopen accepted desktop or phone LOOK foundations while correcting chrome
- Propagate awareness; re-read authority — Notes remain outside Class-A realtime for now
- Android / Wear are perception only: no authoritative reread ⇒ no perception claim
- Wrist Presence ≠ Wrist Attention ≠ Pulse Authority
- importance ≠ interruption authority; MustDo ≠ automatic Pulse authority
