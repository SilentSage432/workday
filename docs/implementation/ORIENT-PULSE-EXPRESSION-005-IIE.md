# ORIENT-PULSE-EXPRESSION-005-IIE

## Background session authority restoration correction

**Candidate published** at `50378b8d1c5603859daf8294dee8a25808943807`.  
**Physically exercised** in 005-IIC-R2 ARRIVAL silence acceptance.

**Baseline before correction:** `7e6fe7e41cd69b52c6072554a2b7e0d53225d753`  
**Diagnostic:** `ORIENT-PULSE-BACKGROUND-SESSION-RACE-ROOT-CAUSE-CLEAR` (005-IID)  
**First physical attempt:** `ORIENT-PULSE-NATIVE-ARRIVAL-SILENCE-PHYSICAL-ACCEPTANCE-FAILED` (005-IIC)  
**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient)

---

## Status markers

| Concern | Status |
| --- | --- |
| 005-IIC first attempt | **FAILED** (historical; upstream session) |
| 005-IID root cause | **Clear** |
| Session authority correction | **Published** (`50378b8`) |
| Physical exercise of correction | **Yes** (005-IIC-R2 warm/background Worker) |
| BRIDGE-008 refresh-after-Authenticated | **Preserved** |
| `enableLifecycleCallbacks` | **Unchanged (still default true)** |
| 005-II silence gate | **Physically accepted on corrected candidate** |

---

## Root cause (005-IID)

auth-kt Android lifecycle (`enableLifecycleCallbacks` default true) can set
process-wide `SessionStatus` to `Initializing` on `ProcessLifecycleOwner.onStop`.
Foreground `onStart` reloads via `loadFromStorage()`.

`PulsePerceptionWorker` shared the same `OrientSupabase` / Auth client but
`SessionRestore` only awaited initialization. After a warm/background wipe there
may be **no** restoration in flight, so the 8s await timed out →
`silent_no_session` before authoritative occurrence reread. ARRIVAL silence was
never reached on the first 005-IIC attempt.

---

## Correction

When status is non-terminal (`Initializing`):

1. Request restoration (trace)
2. Under a process-wide restore **mutex** (single-flight among Orient consumers):
   - re-check terminal (peer may have finished)
   - `auth.loadFromStorage()` through `SessionRestore.Gateway`
   - if storage had no session → fail closed without waiting for lifecycle
   - if session present / refresh may be in flight → `awaitInitialization()`
3. Only the caller that performed restore may apply BRIDGE-008 refresh after
   `Authenticated`
4. Peer waiters that observe terminal after the mutex treat that as early-return
   (no second refresh)

### Timeout

Still `SessionRestore.INITIALIZATION_TIMEOUT_MS = 8_000`.

Bounds the single-flight critical section: explicit `loadFromStorage` plus any
subsequent await of an in-flight terminal transition. Duration unchanged.

---

## Physical evidence (005-IIC-R2)

Warm/background Worker (same process, Activity not resumed for recovery):

```text
status_class=Initializing
→ restoration_requested
→ load_from_storage_started
→ load_from_storage_converged found=yes
→ initialization_resolved Authenticated
→ refresh_attempted / refresh_result ok=yes
→ authenticated_user available=yes
→ authoritative SELECT
```

Observed on ARRIVAL occ `9ec94474-…` and relative_before occ `f43049f7-…`.

---

## Not changed

- Pulse relationship / pronunciation / ARRIVAL suppression
- Wear / haptics / morphology
- Human ARRIVAL UI
- Encrypted session storage authority
- One process / one `OrientSupabase` / one Auth
