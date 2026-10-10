# ORIENT-PULSE-EXPRESSION-005-II

## Native relationship-aware silence gate

**Candidate publication.** Native phone/Wear perception only.

**Baseline:** `95f5464d6153532838d737f2a18044c22a507a50`  
**Production foundation:** `ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-PRODUCTION-ESTABLISHED`  
**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient)

---

## Status markers

| Concern | Status after 005-II candidate |
| --- | --- |
| ARRIVAL native semantic recognition | **Implemented** |
| ARRIVAL physical pronunciation | **Intentionally absent** |
| ARRIVAL terminal silence | **Deliberate accepted candidate behavior** |
| Human ARRIVAL authority | **Unavailable** |
| Numeric ARRIVAL freshness eligibility | **Not chosen / not implemented** |
| ARRIVAL haptic morphology | **Not implemented** |
| Physical acceptance | **Not performed** |
| Production schema / grants | **Untouched by this tranche** |

---

## Native pipeline (inspected)

```text
FCM {pulse_occurrence_id}
→ OrientFirebaseMessagingService
→ PulsePerceptionScheduler / WorkManager
→ PulsePerceptionWorker
→ OccurrenceReread (JWT) → pulse_occurrences id, relationship, source_start_at
→ PerceptionAuthority (+ PulsePronunciationGate)
→ ExpressionClaimStore (SQLite)
→ phone PulseNotification + PulseHaptic   [relative_before only]
→ WearPulseForwarder MessageClient id-only
→ WearPulseListenerService
→ WearPulsePerceptionPipeline
→ Wear local claim → WearPulseNotification (OS haptic)
```

---

## Behavior

| Relationship | Gate | Claim | Phone express | Wear forward |
| --- | --- | --- | --- | --- |
| `relative_before` | pronunciation available | yes | existing notify+haptic | yes (after claim) |
| `arrival` | pronunciation unavailable | yes (terminal) | no | no |
| unknown / incomplete | fail closed | yes (terminal) | no | no |
| transient reread failure | retry | no | no | no |

Unknown choice: authoritative row visible but closed parse fails →
`SuppressUnrecognizedRelationship` → claim/consume → silence (never default to relative_before).

---

## Wear architecture solution

Id-only MessageClient preserved. Watch has no Supabase/relationship reread.

ARRIVAL cannot use Watch pronunciation because the phone never reaches `express`
(and therefore never forwards) for pronunciation-unavailable relationships.

Wear unit tests prove: id-only payload, no Supabase authority in Wear sources,
no direct Vibrator actuator.

---

## Non-goals

- Human ARRIVAL UI (005-III)
- ARRIVAL morphology / freshness window (005-IV)
- FCM or Wear payload expansion
- Production migration / ARRIVAL grant creation
- Device install / physical acceptance
