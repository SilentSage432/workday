# ORIENT-WEAR-PULSE-BRIDGE-007

Watch6 NotificationManager Pulse actuator — physical acceptance.

## Verdict

**ORIENT-WEAR-PULSE-NOTIFICATION-ACTUATOR-PHYSICALLY-ACCEPTED**

| Field | Value |
| --- | --- |
| Candidate | `c76b982cb62a00ccb6c6bc01a540030abca445c9` |
| Occurrence | `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72` |
| Phone | Samsung SM-S948U, API 37 |
| Watch | Galaxy Watch6 Classic SM-R955U, API 36 |
| Human watch report | WATCH HAPTIC FELT; Orient / Pulse notification appeared |

Finalization: [ORIENT-WEAR-PULSE-BRIDGE-008](ORIENT-WEAR-PULSE-BRIDGE-008.md).

## Accepted production chain

```
human timed Commitment
→ explicit Commitment-start Interrupt Grant
→ hosted Pulse establishment
→ FCM
→ authenticated phone authoritative reread
→ phone local claim
→ phone perception
→ Wear MessageClient /orient/pulse/express { pulse_occurrence_id }
→ Watch6 WearableListenerService
→ UUID validation
→ notification-authority gate
→ watch local exactly-once claim
→ local NotificationManager Pulse notification
→ Samsung/Wear notification infrastructure
→ USAGE_NOTIFICATION wrist vibration (OS-mediated)
→ physical human perception
```

## Exactly-once and expression evidence

| Step | Result |
| --- | --- |
| Hosted occurrence identity | one (`24aad0ab-…`) |
| Phone JWT/RLS reread | visible |
| Phone claim | CLAIMED once |
| Wear `send_success` | once (node `3dfe9c3b`) |
| Watch listener / UUID | path match + `payload_valid` |
| Notification authority | `POST_NOTIFICATIONS` granted; notifications enabled; worn (`isWearing=true`) |
| Watch claim | CLAIMED once |
| Channel | `orient_pulse`, `IMPORTANCE_DEFAULT`, sound none, vibration `[0,40]`, `bypassDnd=false` |
| Notification | once; category `reminder`; title/body Orient / Pulse; id `1094939423` |
| Direct Orient watch `Vibrator` | **0** invocations |
| OS vibration | SysUI/`Notification` path; usage `USAGE_NOTIFICATION`; status **FINISHED** |
| Duplicates | none observed |

Physical perception was observed for this acceptance event. Pulse architecture still does **not** treat human perception as durable acknowledgement.

## Channel creation (factual)

`orient_pulse` already existed before the accepted Pulse because `WearPulsePermissionActivity` calls `ensureChannel` when opened for the human permission boundary. The accepted Pulse used that channel successfully. This is not a physical-acceptance defect.

## Prior failed path (BRIDGE-004A–004C)

Direct app `VibratorManager` + `USAGE_NOTIFICATION` + `flags=0` was API-valid but physically suppressed on Watch6 (`audio=ignore`, `op=allow`, `IGNORED_APP_OPS`). On-wrist counterfactual (`isWearing=true`) falsified an off-body-only hypothesis. Correction: NotificationManager-mediated expression; Orient does not itself bypass interruption policy — system notification infrastructure performed the accepted vibration.

## Dual surface (first proof)

Phone and watch may both express under current first-proof policy. Preferred-surface routing is **not** accepted or implemented.
