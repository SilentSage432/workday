# Master roadmap (working)

## Accepted foundations (closed)

- **ORIENT-PULSE-LIFECYCLE-002** — source-deletion cascade authority correction authored (`20261010170000` SECURITY DEFINER); executable regression clear; **not production-applied**; not physical acceptance ([LIFECYCLE-002](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md))
- **ORIENT-PULSE-GENERAL-AUTHORITY-ACCEPTANCE-FINALIZED** — timed Commitment-start + timed Block-start physically accepted under one grammar on `e3ec23c` (occurrence `a2dae150`; [005](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md)); AUTHORITY-003 remains FAILED
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

- **Apply LIFECYCLE-002** — production application of `20261010170000` and UX verification that owned Commitment/Block delete succeeds when an Interrupt Grant exists. Distinct from perception re-acceptance. Basis: [LIFECYCLE-002](docs/implementation/ORIENT-PULSE-LIFECYCLE-002.md).
- **Pulse semantic expression** — before adding Task / Protected Time / further source kinds: does the existing single haptic mean the same thing for accepted Commitment-start and Block-start? Haptic language UNDESIGNED / UNIMPLEMENTED; do not map `source_kind` → pattern by presumption. Basis: [005](docs/implementation/ORIENT-PULSE-AUTHORITY-005.md).
- Historical: AUTHORITY-003 FAILED; 004 production repaired; 002 Block-start implemented — see authority docs under `docs/implementation/ORIENT-PULSE-AUTHORITY-*.md`.

## Next evidence-backed items

1. Apply LIFECYCLE-002 source-deletion authority correction to production; verify delete UX with grants
2. Pulse semantic expression discovery (Commitment vs Block haptic meaning) — before further source-kind generalization
3. Deferred: preferred perception-surface routing (phone/watch); dual expression remains first-proof behavior
4. Deferred: Orient Watch face / visual Pulse expression (observer of local claim; no interruption authority)
5. Deferred: richer Orient Watch companion
6. Deferred: generic notification icon / identity visual refinement
7. Freecess/thaw lifecycle variants (when ready)
8. Recurring-task physical acceptance (when ready)
9. Google Calendar removal reconciliation
10. Note Edit / Unretire only if evidence requires

## Standing law

- Educational clarity over optimization
- Form-factor composition may differ; semantic capabilities stay parity unless specialization is declared
- Do not reopen accepted desktop or phone LOOK foundations while correcting chrome
- Propagate awareness; re-read authority — Notes remain outside Class-A realtime for now
- Android / Wear are perception only: no authoritative reread ⇒ no perception claim
- Wrist Presence ≠ Wrist Attention ≠ Pulse Authority
- importance ≠ interruption authority; MustDo ≠ automatic Pulse authority
