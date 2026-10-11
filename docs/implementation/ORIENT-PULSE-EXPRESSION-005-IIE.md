# ORIENT-PULSE-EXPRESSION-005-IIE

## Background session authority restoration correction

**Candidate publication.** Native session authority only.

**Baseline:** `7e6fe7e41cd69b52c6072554a2b7e0d53225d753`  
**Diagnostic:** `ORIENT-PULSE-BACKGROUND-SESSION-RACE-ROOT-CAUSE-CLEAR` (005-IID)  
**Failed physical acceptance (unchanged):** `ORIENT-PULSE-NATIVE-ARRIVAL-SILENCE-PHYSICAL-ACCEPTANCE-FAILED` (005-IIC)  
**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient)

---

## Status markers

| Concern | Status after 005-IIE |
| --- | --- |
| 005-IIC physical acceptance | **Still FAILED** (not rerun) |
| Failure locus | **Upstream session authority** (before ARRIVAL gate) |
| Background durable restore | **Corrected at SessionRestore** |
| BRIDGE-008 refresh-after-Authenticated | **Preserved** |
| `enableLifecycleCallbacks` | **Unchanged (still default true)** |
| 005-II silence-gate semantics | **Unchanged; still candidate** |
| Physical acceptance | **Not performed this tranche** |
| Production / fixtures | **Untouched** |

---

## Root cause (005-IID)

auth-kt Android lifecycle (`enableLifecycleCallbacks` default true) can set
process-wide `SessionStatus` to `Initializing` on `ProcessLifecycleOwner.onStop`.
Foreground `onStart` reloads via `loadFromStorage()`.

`PulsePerceptionWorker` shared the same `OrientSupabase` / Auth client but
`SessionRestore` only awaited initialization. After a warm/background wipe there
may be **no** restoration in flight, so the 8s await timed out →
`silent_no_session` before authoritative occurrence reread. ARRIVAL silence was
never reached.

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

### Not changed

- Pulse relationship / pronunciation / ARRIVAL suppression
- Wear / haptics / morphology
- Human ARRIVAL UI
- Encrypted session storage authority
- One process / one `OrientSupabase` / one Auth

---

## Observability (`OrientPulsePerception`)

Added (class/boolean only; no secrets):

- `restoration_requested`
- `load_from_storage_started`
- `load_from_storage_converged found=yes|no|error`

Retained: status class, wait entered, resolved, timed out, refresh, authenticated user.

---

## Concurrency reasoning

auth-kt `loadFromStorage` is not Orient-serialized. Concurrent
`ensureSessionLoaded` callers share `SessionRestore`'s `Mutex` so one
authoritative restore converges them. Auth's own cold `autoLoadFromStorage` may
still race a Worker restore; both target the same Auth/storage and converge on
terminal status. No second Auth client.

---

## Validation

- `:app:testDebugUnitTest` — 79 tests, 0 failures (includes 17 `SessionRestoreTest`)
- `:app:assembleDebug` — success
- Wear source unchanged

---

## Next

Install candidate and re-run **005-IIC** physical ARRIVAL silence acceptance.
Do not claim silence-gate acceptance from prior `silent_no_session` runs.
Preserve existing 005-IIC fixtures until that replay.
