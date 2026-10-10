# ORIENT-PULSE-EXPRESSION-003

## Arrival expression timeliness discovery

**Discovery + documentation publication (003A).** No ARRIVAL implementation. No haptic morphology. No numeric freshness window. No schema/runtime/evaluator/dispatcher/Android/Wear changes. No production mutation.

**Baseline verified:** `c33538a8c2d3380d5bf9b7b6402d0621bd2987a5`  
(`HEAD` = `origin/main` at discovery inspection; published as ORIENT-PULSE-EXPRESSION-003A.)

**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient). Wealth Engine untouched.

**Prior accepted state:** `ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED`  
([EXPRESSION-002](ORIENT-PULSE-EXPRESSION-002.md)).

**Status:** ARRIVAL semantic relationship accepted for development; Interrupt Grant / occurrence / haptic / physical acceptance **not** implemented. Numeric expression-eligibility duration **not** chosen.

**Discovery verdict:** `ORIENT-PULSE-ARRIVAL-TIMELINESS-CLEAR`  
**Publication verdict:** `ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED`

---

## 0. Published core finding (003A)

ARRIVAL source truth occurs at authoritative boundary `T`.

An authorized ARRIVAL occurrence may remain durable indefinitely as historical truth.

Physical ARRIVAL expression has a shorter lifetime.

**Narrowest supported learned physical meaning:**

> The boundary has become present recently enough to orient to this transition.

Therefore:

```text
DURABLE TRUTH LIFETIME
≠
PHYSICAL EXPRESSION LIFETIME
```

---

## 1. Purpose

Determine how occurrence establishment latency, dispatch latency, device delivery latency, and physical-expression latency affect the truthfulness and usefulness of physically expressing ARRIVAL.

Core question:

> Once an authoritative temporal boundary arrives at `T`, for how long may Orient truthfully and usefully physically express ARRIVAL?

Do not assume a fixed expiration window a priori. Do not pick a numeric bound without evidence.

---

## 2. Four temporal facts (must remain separate)

| Fact | Definition | What exists / can be derived today |
| --- | --- | --- |
| **A. Source truth** | Authoritative boundary occurs at `T` | Civil start + zone → `source_start_at` (and live source clocks) |
| **B. Occurrence establishment** | Orient durably records that an independently authorized ARRIVAL relationship became true | Future occurrence row; today positive-lead has `established_at`, `threshold_at`, `source_start_at` |
| **C. Delivery attempt** | A permitted perception surface is asked to express the established occurrence | Webhook → dispatcher → FCM / Wear MessageClient; no delivery ledger timestamps as product policy |
| **D. Physical expression** | Human-facing actuator actually attempts expression | Local claim clocks (`claimed_at_epoch_ms` / `expressed_at_epoch_ms`); notification + haptic attempt |

Do not conflate A–D. Delivery failure does not falsify A or B. Late D does not rewrite A or B.

---

## 3. Durable truth vs ephemeral expression

| Delay after `T` | Historical fact “boundary arrived at `T`” | Physical ARRIVAL word usefulness |
| --- | --- | --- |
| +5 seconds | True | Present-tense orientation still natural |
| +5 minutes | True | Often still transitional; usefulness declining |
| +1 hour | True | Present-tense “is here now” becomes misleading |
| Later indefinitely | May remain true forever as history | Physical ARRIVAL word generally not useful as current orientation |

**Finding: different temporal lifetimes.**

> Durable historical truth may outlive the usefulness of physical expression.

Historical truth persistence ≠ physical-expression usefulness.

---

## 4. Narrowest learned physical ARRIVAL meaning

Accepted definition: “The authoritative temporal boundary itself has become present.”

| Candidate interpretation | Disposition |
| --- | --- |
| A. “The boundary is here now.” | Too present-tense absolute if speech is late |
| B. “The boundary has arrived.” | Closest to accepted definition |
| C. “A boundary arrived recently.” | Implicit recentness introduced by physical speech timing |
| D. “An ARRIVAL occurrence exists.” | Implementation wording — reject as human meaning |
| E. other | — |

**Narrowest human meaning of the physical word:**

> The authoritative temporal boundary has become present sufficiently recently that speaking it still orients me to this transition.

Compatible with the accepted definition when expression is timely. Late speech risks converting B into misleading A.

**Split (required):**

| Layer | Meaning |
| --- | --- |
| ARRIVAL truth | Boundary occurred at `T` (durable) |
| ARRIVAL physical word | Boundary has become present **recently enough** that expression still orients to the current temporal transition |

Physical expression necessarily introduces a bounded **recentness** interpretation even though occurrence truth is an instant → historical fact.

---

## 5. Latency classes (illustrative — not numeric policy)

| Delay class after `T` | Semantic effect |
| --- | --- |
| Effectively immediate | Current orientation — ARRIVAL word truthful and useful |
| Several seconds | Still current orientation (pipeline noise) |
| ~One evaluator interval (≈ minute) | Still generally current; natural hosted lag |
| A few minutes | Transition zone — often still useful around start of a Block/Commitment |
| Materially later (tens of minutes / hours) | Shifts toward **historical notification** — present-tense physical word becomes misleading |
| After source interval progressed substantially | Historical / stale — physical ARRIVAL should remain silent |

**Finding:** The transition from current orientation to historical notification **matters**. ARRIVAL’s physical word is about temporal presence in the transition, not archival notice.

No arbitrary numeric expiration is fixed by this discovery.

---

## 6. Real pipeline latency (accepted path)

```text
authoritative source
→ hosted evaluator (~1 min cron)
→ durable Pulse occurrence
→ database webhook
→ Vercel dispatcher
→ FCM
→ phone authoritative reread
→ phone claim
→ Wear transport (best-effort)
→ watch authority gate
→ watch claim
→ notification-class physical expression
```

| Boundary | Behavior |
| --- | --- |
| Scheduling granularity | Hosted `* * * * *` — ~0–60s natural lag after due |
| Async | Webhook, Vercel, FCM, WorkManager, Wear MessageClient |
| Dispatcher retries | No delivery ledger; duplicates allowed; local claim dedupes |
| Phone offline | Work waits for network; may express late with **no** native freshness check today |
| Cold start | FCM wake + session restore (accepted path) |
| Wear disconnect | Best-effort; no Orient store-and-forward; late reconnect does not replay |
| Watch freshness | **None** today — id + claim only |
| Timestamps for lateness | `threshold_at` / `source_start_at` / `established_at`; local claim clocks; evaluator run clocks — not wired as ARRIVAL policy |

**Existing positive-lead precedent:** web already separates occurrence truth (`eligible|elapsed`) from expression eligibility (`pulseOccurrenceStillBeforeStart`). Native phone/Wear do **not** yet apply an expression window. ARRIVAL cannot inherit “eventually express whenever delivered” from native positive-lead behavior without semantic harm.

---

## 7. Hosted evaluator granularity

Minute cadence is conceptually capable of ARRIVAL.

| Requirement | Verdict |
| --- | --- |
| Exact-at-`T` execution | **Not required** |
| Bounded-after-`T` establishment | Natural consequence of cron |
| Eventual establishment | **Valid for durable truth** |

Cadence does not redefine Pulse. Do not change cron for this discovery.

---

## 8. Occurrence truth vs expression eligibility

**Supported model:**

```text
ARRIVAL occurrence  = durable truth that authorized relationship became true
expression eligibility = separate determination based on timeliness
```

Suppressing late physical expression must **not** erase or prevent durable occurrence truth. Provenance preserved.

Positive-lead already embodies this split on web. ARRIVAL needs the same split for **physical** surfaces, with a window relative to `T` (not to source end necessarily).

---

## 9. Late delivery

If occurrence was established promptly but device delivery is delayed (offline, FCM lag, process unavailable, Watch disconnect/reconnect much later):

**Finding:** “Eventually deliver everything” is **not** compatible with ARRIVAL physical semantics.

A late device must not turn historical truth into misleading present-tense expression.

Compare current architecture: local claim/dedupe prevents duplicate speech, but does **not** currently suppress stale speech. Future ARRIVAL must add eligibility before expression attempt.

---

## 10. Late establishment

| Question | Answer |
| --- | --- |
| Durable establishment materially after `T` valid? | **Yes** — parallel to positive-lead `elapsed` / AUTHORITY-003/004 recovery of historical eligible authority |
| Physical expression always valid after late establishment? | **No** — may be stale even if newly established |

Different answers are required. Recovery evidence supports late **truth**; it does not license late **speech**.

---

## 11. Restart / recovery / outage

If hosted establishment was unavailable around `T` and recovers later:

**Selected: A / D composition**

- Establish durable historical occurrence when still authorized and identity unmet (**preserve evidence**).
- Physically express only if still within expression eligibility at expression time (**bounded lateness for speech**).
- If outside eligibility → durable truth + physical silence.

Reject: refuse occurrence entirely (loses provenance). Reject: always express late (misleading present tense).

---

## 12. Expression eligibility (canonized)

ARRIVAL requires the minimum concept **EXPRESSION ELIGIBILITY**.

Expression eligibility determines whether an already-established occurrence may still be physically expressed without turning durable historical truth into misleading present-oriented speech.

Expression eligibility:

- does **not** create occurrence truth
- does **not** erase occurrence truth
- does **not** change authority
- does **not** imply urgency
- does **not** imply importance
- does **not** imply MustDo
- does **not** alter source truth

**Minimum definition:**

> Expression eligibility is the deterministic determination that speaking an already-established ARRIVAL occurrence now would still communicate temporal presence of the boundary, rather than a historical notice.

Terminology: **expression eligibility** — pairs with existing occurrence / claim vocabulary; avoids inventing a “freshness product.”

---

## 13. Where timeliness policy lives

| Owner candidate | Verdict |
| --- | --- |
| A. Interrupt Grant | No — grant authorizes relationship, not delivery clock policy |
| B. Pulse occurrence | Holds authoritative `T` / evidence; does not alone decide speech at device time |
| C. Hosted evaluator | Establishes truth; must not suppress occurrence for lateness |
| D. Dispatcher | May optionally withhold transport of already-stale occurrences; must not redefine truth; cannot cover post-dispatch device delay alone |
| E. Perception surface alone | Must evaluate at expression time, but must not invent independent temporal semantics |
| **F. Shared deterministic Pulse expression policy** | **Yes — authoritative policy** |
| G. other | — |

**Sovereignty:**

| Who | Role |
| --- | --- |
| Knows authoritative `T` | Occurrence evidence (`source_start_at` for timed start ARRIVAL) |
| Knows current time | Expression evaluator at decision time (hosted optional filter + each surface) |
| Determines expression remains valid | Shared pure policy: `eligible = f(now, T, policy)` |
| Must not reinterpret occurrence truth | Devices/dispatcher — visibility/claim ≠ rewriting Pulse |

Avoid duplicating divergent temporal semantics independently across phone and Watch: **one policy function**, evaluated when each surface would speak.

---

## 14. Delivery surface consistency

If phone receives ARRIVAL while timely and Watch receives it after the expression window:

- Phone may express
- Watch remains silent

**Valid.** One shared semantic occurrence; surface-specific **expression eligibility** at different wall times. Not two truths.

---

## 15. Claim semantic constraints (no redesign)

Claim should mean narrowly:

> This surface consumed its one expression opportunity for this occurrence.

Not:

> This occurrence was successfully perceived / remains globally delivered.

Constraints for future ARRIVAL:

1. Evaluate expression eligibility **before** claiming when suppressing stale speech.
2. If ineligible (stale): do not physically express; consume the opportunity so reconnect does not replay stale ARRIVAL later (aligns with watch no-late-replay spirit).
3. Unavailable permission today already avoids claiming before a legitimate attempt — keep that distinction: **cannot attempt** ≠ **stale suppress**.
4. Claim remains ≠ acknowledgement ≠ Pulse truth.

---

## 16. Silence distinctions (canonized)

A stale ARRIVAL occurrence may remain durable and inspectable while physical surfaces remain silent.

Silence may occur for different truthful reasons:

| Reason | Meaning |
| --- | --- |
| **A. Unauthorized silence** | Orient was never authorized to express that temporal relationship |
| **B. Stale silence** | The relationship was authorized and occurrence truth exists, but physical expression is no longer timely enough to communicate its intended meaning |

These reasons must **not** be semantically conflated even though both result in no physical expression.

> Silence may preserve truth more accurately than late speech.

---

## 17. Human authority / configurable freshness

Should Tyson choose “only for N minutes”?

**Finding: not required as human grant administration.** Prefer reducing administration. Freshness is expression policy about truthful speech, not a second human temporal relationship.

Do not expose implementation policy unless lived evidence later proves humans need to author different windows.

---

## 18. Urgency guardrail

Confirmed:

> Timeliness is not urgency.

A shorter expression window must **not** imply more important, stronger haptic, MustDo, or alarm semantics. Timeliness only answers whether the physical word still communicates its semantic relationship.

---

## 19. Instant vs recentness

ARRIVAL truth = instant transition at `T` → durable historical fact.

ARRIVAL physical word = requires bounded recentness to remain orienting rather than archival.

Refine without contradicting EXPRESSION-002:

> ARRIVAL occurrence truth does not expire. ARRIVAL physical expression eligibility does.

---

## 20. Fixed vs derived window

| Option | Disposition |
| --- | --- |
| One universal Pulse ARRIVAL expression-eligibility policy | **Preferred** |
| Derived from evaluator cadence alone | Insufficient as sole rule (cadence ≈1 min is lag, not usefulness bound) |
| Derived from source duration | Possible later; not required by current evidence; risks source-kind leakage |
| Source-kind-specific | **Rejected** unless future evidence requires |
| User-configurable | **Rejected** for now (administration) |
| Surface-specific **policy** | **Rejected** — same policy; surface-specific **evaluation time** OK |
| Pick a number now | **Deferred** — no evidence-backed exact duration yet |

Illustrative guidance only (not policy): window should tolerate natural ~1 minute establishment lag; should not extend to hour-scale “materially later” present-tense speech.

---

## 21. Minimum future implementation implications

Without implementing:

| Need | Implication |
| --- | --- |
| Explicit semantic relationship identity on grant/occurrence | **Likely yes** (from EXPRESSION-002) — distinguish ARRIVAL from positive-lead |
| Authoritative boundary `T` on occurrence | **Yes** — timed start ARRIVAL can use `source_start_at` as `T` |
| Dispatcher needs relationship + `T` | Optional optimization to skip already-stale transport; not sufficient alone |
| Device reread of authoritative occurrence fields | **Likely yes** for ARRIVAL — today’s id-only reread cannot compute eligibility |
| Centralized eligibility | Shared policy definition; may pre-filter at dispatch; **must** re-check at surface expression time |
| Current timestamps support lateness math | **Yes** for `now − source_start_at` / `established_at − source_start_at` once relationship known |
| New schema | Likely for relationship identity; not necessarily new time columns if `source_start_at` is `T` |
| Android/Wear changes | Likely when ARRIVAL is implemented — eligibility before claim/express |
| Numeric window constant | Deferred — human/design decision after this clear model |

Do not design beyond semantics.

---

## 22. Future touch + light

If ARRIVAL is stale and haptic expression is suppressed:

A future watch face may still **observe** temporal state (ambient presence / gold illumination of what is temporally true) without performing momentary ARRIVAL speech.

| Mode | Stale ARRIVAL |
| --- | --- |
| Momentary expression (haptic / notification-class word) | Suppress |
| Ambient temporal presence (face observer) | May still compose institutional state — not the ARRIVAL word |

Discovery only. No Presence behavior created.

---

## 23. Agent boundary

| Agent may | Agent may not |
| --- | --- |
| Recommend ARRIVAL authority | Override deterministic expression eligibility |
| | Reinterpret lateness as urgency |
| | Force delivery because Tyson “should know” |

Confirmed.

---

## 24. Durable principles

### Canonized (supported)

1. **Durable truth may outlive the usefulness of physical expression.**
2. **Establishment truth and expression eligibility are separate.**
3. **A late device must not turn historical truth into misleading present-tense expression.**
4. **Silence may preserve truth more accurately than late speech.**
5. **Delivery latency must not redefine occurrence semantics.**
6. **One occurrence may be timely on one surface and stale on another without becoming two truths.**
7. **Timeliness is not urgency.**
8. **Recovery should preserve evidence without necessarily replaying stale physical expression.**

EXPRESSION-001/002 principles remain intact.

### Rejected / deferred

| Statement | Disposition |
| --- | --- |
| Exact numeric expression window | **Deferred** — model clear; duration not yet evidence-fixed |
| User-configured freshness as grant field | **Rejected for now** |
| Source-kind-specific timeliness | **Rejected** |
| Exact-at-`T` establishment required | **Rejected** |
| Eventually express all ARRIVAL deliveries | **Rejected** |
| Suppress/delete late occurrence truth | **Rejected** |
| Dispatcher as sole eligibility owner | **Rejected** |
| ARRIVAL haptic morphology | **Not designed** |

---

## 25. Deferred questions (not established)

Do **not** establish in this publication:

- exact eligibility duration
- user-configurable freshness
- source-kind-specific freshness
- surface-specific freshness **policy** (surface-specific **evaluation** of one shared policy remains allowed)
- exact-at-`T` requirement
- eventually-express-all behavior
- haptic morphology
- visual morphology

Future ambient Presence remains separate from momentary ARRIVAL expression: a stale momentary word may be suppressed while a future ambient surface could still truthfully represent current/historical temporal state. **No Presence implementation is authorized.**

Open for later design:

1. Exact expression-eligibility duration (or derived rule)
2. Whether dispatch should pre-filter clearly stale ARRIVAL as optimization
3. Exact device reread field set for ARRIVAL eligibility (minimal)
4. Interaction of ARRIVAL eligibility with future ambient watch-face presence

---

## 26. Next discovery boundary

**ORIENT-PULSE-EXPRESSION-004 — ARRIVAL AUTHORITY FORM DISCOVERY**

Core question:

> How should Tyson's independent authority “Reach me when this begins” be represented alongside the existing positive-lead authority “Reach me N before this begins” without encoding ARRIVAL as magic zero, duplicating source semantics, or allowing authority inheritance?

Determine the smallest truthful relationship identity and grant model before any ARRIVAL implementation.

Do **not** choose a numeric expression-eligibility window during that discovery unless authority semantics genuinely require it.  
Do **not** implement ARRIVAL, haptic morphology, schema, or production mutation as part of 004 discovery itself.

---

## 27. Documentation / mutation boundary

| Action | Done? |
| --- | --- |
| Create this discovery record | Yes |
| Publish as documentation (003A) | Yes |
| Canonize expression eligibility + silence distinctions | Yes |
| Implement ARRIVAL / haptic / schema / runtime | **No** |
| Pick numeric window as accepted law | **No** |

---

## 28. Final verdict

**Discovery:** `ORIENT-PULSE-ARRIVAL-TIMELINESS-CLEAR`  
**Publication:** `ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED`

ARRIVAL occurrence truth may persist indefinitely; ARRIVAL physical expression must not. Expression eligibility is a separate shared deterministic policy, evaluated locally at each surface without becoming surface-specific semantic policy. Late establishment may preserve evidence; late speech may remain silent. Unauthorized silence and stale silence are distinct. Timeliness is not urgency. Exact window duration remains deferred.
