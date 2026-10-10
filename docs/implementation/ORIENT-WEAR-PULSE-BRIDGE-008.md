# ORIENT-WEAR-PULSE-BRIDGE-008

Watch6 Pulse transport / native wrist perception — acceptance finalization.

## Verdict

**ORIENT-WEAR-PULSE-NATIVE-WRIST-PERCEPTION-ACCEPTANCE-FINALIZED**

Physical acceptance record: [ORIENT-WEAR-PULSE-BRIDGE-007](ORIENT-WEAR-PULSE-BRIDGE-007.md)  
Actuator implementation: [ORIENT-WEAR-PULSE-BRIDGE-006](ORIENT-WEAR-PULSE-BRIDGE-006.md)  
Accepted candidate: `c76b982cb62a00ccb6c6bc01a540030abca445c9`  
Accepted occurrence: `24aad0ab-fe60-4d2f-8ab3-55e1ab240e72`

## Phase status

| Phase | Status |
| --- | --- |
| Phase 2 — Native phone perception | **CLOSED** (`ORIENT-ANDROID-PULSE-NATIVE-PERCEPTION-ACCEPTANCE-FINALIZED` / S26 occurrence `76c91159`) |
| Phase 3 — Watch6 Pulse transport / native wrist perception primitive | **CLOSED** (this document) |

Accepted primitive:

```
human-authorized temporal relationship
→ autonomous hosted establishment
→ phone authority boundary
→ Wear transport
→ legitimate watch notification-class expression
→ physical wrist perception
```

This closes the **primitive**, not the full Orient Watch experience.

## Distinct authorities

| Authority | Meaning |
| --- | --- |
| Wrist Presence | Orient may inhabit the watch (install / companion surface). |
| Wrist Attention | Tyson explicitly grants OS notification authority so Orient may request notification-class wrist perception (`POST_NOTIFICATIONS` + notifications enabled). |
| Pulse Authority | A specific temporal relationship receives an explicit human Interrupt Grant. |

These are distinct.

- Installation does not imply notification authority.
- Notification permission does not imply arbitrary Pulse authority.
- A watch face must not imply interruption authority.

Durable formulation:

> Orient may inhabit the wrist without possessing the authority to interrupt it.

> Granting Orient notification permission allows the system to express an otherwise-authorized Pulse through the wrist; it does not authorize the Pulse itself.

## Watch role — perception edge

The Watch6 is a **perception edge**. It does **not**:

- evaluate temporal conditions  
- create Pulse occurrences or Interrupt Grants  
- decide importance  
- authenticate against Supabase / hold service-role authority  
- receive Commitment data through the current Pulse transport  
- infer urgency  
- acknowledge human perception as durable state  

Current Wear payload remains only `pulse_occurrence_id`.  
Local watch SQLite claim remains the exactly-once **expression** boundary (not perception acknowledgement).

## Failed path and correction (preserved learning)

Direct watch `VibratorManager` + `USAGE_NOTIFICATION` was API-valid but Watch6-suppressed (`IGNORED_APP_OPS`; on-wrist 004C). Correction: after watch claim, post one legitimate local NotificationManager Pulse notification; OS/Samsung notification infrastructure mediates notification-class vibration. Orient does not claim privileged interruption bypass.

## Future watch face (not implemented)

Seam: local established Pulse identity → future face may observe → visual expression may accompany the accepted notification-class haptic.

The face remains an **observer**. It does not become Pulse authority, notification authority, evaluator, or transport authority. Direction retained: haptic + restrained gold temporal illumination may eventually form one perceptual event. No visual contract is accepted yet.

## General Pulse-source direction (not implemented)

Commitment-start is the **first accepted source relationship** for Pulse. Pulse itself is not semantically limited to Commitments.

Future Orient domains may earn explicit Interrupt Grants only where their semantics support temporal truth (examples may include Tasks, deadlines/targets, Protected Time, Stewardship — **only if later warranted**). Not every object receives reminders.

Preserve:

- importance ≠ interruption authority  
- MustDo ≠ automatic Pulse authority  
- A source object must not learn how to vibrate the watch  

General relationship (architecture direction, not capability):

```
authoritative source truth
→ temporal condition
→ explicit Interrupt Grant
→ Pulse occurrence
→ permitted perception surfaces
```

## Delivery boundary (not implemented)

Current first-proof behavior may express on both phone and watch. That is accepted for the primitive. Preferred-surface routing (watch-preferred, phone fallback, etc.) remains future and distinct from temporal truth, Interrupt Grant authority, and Pulse occurrence identity. No routing policy is accepted yet.

## Remaining future Watch work

- Generalized Pulse-source authorization beyond Commitment-start  
- Preferred perception-surface routing  
- Watch-face implementation and visual Pulse expression  
- Richer Orient Watch companion experience  
- Freecess/thaw lifecycle variants (phone path still incompletely proven)
