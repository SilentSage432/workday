# ORIENT-PULSE-EXPRESSION-005-II

## Native relationship-aware silence gate

**Physically accepted** on corrected candidate `50378b8d1c5603859daf8294dee8a25808943807`
(005-IIC-R2).

**Original silence-gate candidate:** `7e6fe7e41cd69b52c6072554a2b7e0d53225d753`  
**Production foundation:** `ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-PRODUCTION-ESTABLISHED`  
**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient)

---

## Acceptance history (preserve failure)

| Tranche | Result |
| --- | --- |
| **005-IIC** (first attempt, `7e6fe7e`) | **FAILED** — WorkManager hit `Initializing` → 8s timeout → `silent_no_session` before ARRIVAL gate |
| **005-IID** | Root cause clear — auth-kt lifecycle background wipe; Worker awaited without durable restore |
| **005-IIE** (`50378b8`) | Session authority correction — single-flight `loadFromStorage` when Initializing |
| **005-IIC-R2** | **PHYSICALLY ACCEPTED** on `50378b8` |

Do not rewrite the first 005-IIC failure as success.

---

## Status markers

| Concern | Status after 005-IIC-R2 |
| --- | --- |
| ARRIVAL native semantic recognition | **Accepted** |
| ARRIVAL physical pronunciation | **Intentionally absent / not implemented** |
| ARRIVAL terminal silence | **Physically accepted** |
| Human ARRIVAL authority | **Unavailable** |
| Numeric ARRIVAL freshness eligibility | **Not chosen / not implemented** |
| ARRIVAL haptic morphology | **Not implemented** |
| Background session restoration (005-IIE) | **Physically exercised** |
| relative_before phone + Watch | **Regression physically accepted** |
| Production schema | **Untouched** |

---

## Native pipeline

```text
FCM {pulse_occurrence_id}
→ OrientFirebaseMessagingService
→ PulsePerceptionScheduler / WorkManager
→ PulsePerceptionWorker
→ SessionRestore (durable load when Initializing)
→ OccurrenceReread (JWT) → id, relationship, source_start_at
→ PerceptionAuthority (+ PulsePronunciationGate)
→ ExpressionClaimStore (SQLite)
→ phone PulseNotification + PulseHaptic   [relative_before only]
→ WearPulseForwarder MessageClient id-only
→ WearPulseListenerService
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

---

## 005-IIC-R2 physical evidence (summary)

**Devices:** SM-S948U API 37 (`R3GYC07NBZN`); SM-R955U API 36 (Watch6).

**Session correction (warm/background):** Worker observed `Initializing` →
`load_from_storage_started` → `found=yes` → `Authenticated` → refresh after
Authenticated → JWT reread. No Activity foreground required for Worker recovery.

**ARRIVAL (accepted occ `76688b52-…`, grant fixture cleaned):** authoritative
reread `relationship=arrival` → pronunciation unavailable → claim →
`silent_arrival_no_pronunciation`. Tyson: nothing on phone or Watch. Replay:
`already_claimed` / still silent.

**relative_before regression (occ `f43049f7-…`):** background session restore →
reread → claim → phone notify+haptic → Wear forward → Watch claim +
notification-mediated express. Tyson: haptic on phone and Watch.

---

## Wear architecture

Id-only MessageClient preserved. Watch has no Supabase/relationship reread.
ARRIVAL never reaches phone `express`, so never forwards.

---

## Remaining / next

- Human ARRIVAL authority surface (**005-III**)
- ARRIVAL expression eligibility + physical morphology (**005-IV**)
- ARRIVAL physical pronunciation remains **not** implemented
