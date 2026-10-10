# ORIENT-PULSE-EXPRESSION-001

## Semantic expression language discovery

**Discovery + documentation publication.** No runtime mutation. No schema. No Android/Wear change. No production mutation. No haptic implementation. No additional Pulse source kinds.

**Baseline verified:** `c3b8ce4f88884ee2fa97417dfd7cb1bd2254637a`  
(`HEAD` = `origin/main` at discovery inspection; published as ORIENT-PULSE-EXPRESSION-001A.)

**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient). Wealth Engine untouched.

**Prior accepted state:** `ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED`  
([LIFECYCLE-003](ORIENT-PULSE-LIFECYCLE-003.md); general authority [AUTHORITY-005](ORIENT-PULSE-AUTHORITY-005.md)).

**Status of this document:** durable semantic-expression discovery record (published).  
**Haptic vocabulary:** still **UNDESIGNED** / **UNIMPLEMENTED**.  
**This discovery does not accept an expression vocabulary.**

**Discovery verdict:** `ORIENT-PULSE-EXPRESSION-SEMANTICS-CLEAR`  
**Publication verdict:** `ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED`

---

## 1. Purpose

Discover whether Pulse contains multiple perceptual meanings that justify a native Orient expression language.

Question answered:

> What should Orient's physical expression mean?

Not answered / not attempted:

> What vibration patterns can the watch make?

---

## 2. Current physically proven word

| Surface | Actuator | Form |
| --- | --- | --- |
| Android phone | Explicit `PulseHaptic` after local claim | One restrained notification-class one-shot (`USAGE_NOTIFICATION`; not alarm; not touch) |
| Galaxy Watch6 Classic | NotificationManager channel after watch claim | One restrained notification-class channel vibration (OS-mediated) |

Proven physical acceptance evidence includes:

- Phone native haptic (BRIDGE-008 / occurrence `76c91159…`)
- Watch Commitment-path wrist haptic (WEAR-007 / occurrence `24aad0ab…`)
- Watch Block-path wrist haptic (AUTHORITY-005 / occurrence `a2dae150…`)

No haptic vocabulary beyond that single restrained notification-class expression has been established.

---

## 3. Narrowest supported current meaning

### Hypothesis tested

> "An explicitly authorized temporal relationship has become worthy of the human's perception."

### Verdict on the hypothesis

**Directionally adjacent to occurrence authority, but too broad and value-laden for the current haptic.**

| Fragment | Evidence |
| --- | --- |
| Explicit human authorization | Interrupt Grant required; source creation alone does not authorize |
| Temporal relationship / condition | Relative positive lead before `*.start`; threshold = start − lead |
| Something became true | Hosted establishment: authorized temporal condition evaluated true |
| “Worthy of” | **Unsupported.** Repository forbids collapsing interruption into importance/judgment |
| As a statement of the *haptic* | **Overclaims.** Expression does not create or redefine Pulse; haptic language is undesigned |

### Split meanings (required)

| Layer | Evidence-backed meaning |
| --- | --- |
| **Pulse occurrence (truth)** | Durable evidence that a deterministic evaluator found an explicitly authorized temporal condition true under a unique occurrence identity |
| **Current haptic (expression)** | A perception edge expressing that already-established occurrence once, via one restrained notification-class vibration |

**Narrowest supported current haptic meaning:**

> An already-established, human-authorized Pulse occurrence is requesting perception.

It does **not** communicate *why* the occurrence exists beyond that fact, and it does **not** communicate source identity, lead magnitude, urgency, or required action.

---

## 4. What the current haptic does / does not mean

### Establishes / communicates

- That Orient is attempting one local expression of an already-established Pulse occurrence identity
- Generic Orient/Pulse presence seeking attention through a permitted notification-class surface
- Nothing source-specific (Commitment vs Block) at the physical layer

### Does **not** establish / communicate

| Candidate | Current haptic meaning? | Why |
| --- | --- | --- |
| Commitment | **No** | Transport/expression carry occurrence id only; no Commitment content |
| Block | **No** | AUTHORITY-005: occurrence-id path only; no Block-specific perception logic |
| Reminder (domain) | **No** | Interrupt Grant ≠ Reminder primitive; OS `CATEGORY_REMINDER` / UI “Remind me” are surface words, not Pulse identity |
| Urgency | **No** | Explicitly forbidden; FCM high priority is wake transport only |
| Importance | **No** | `importance ≠ interruption authority` |
| MustDo | **No** | MustDo ≠ automatic Pulse authority |
| Alarm | **No** | Not `USAGE_ALARM`; must not masquerade as alarm / DND bypass |
| Immediate action required | **No** | Silence remains valid; no prescribed action |
| Acknowledgement required | **No** | Pulse ≠ acknowledgement; claim ≠ perceived |
| Delivery success | **No as Pulse meaning** | Claim/notify/haptic are expression bookkeeping |
| Perception success | **No as durable meaning** | Human feeling was acceptance evidence only; not stored Pulse truth |

### Occurrence truth ≠ physical expression

```text
TEMPORAL TRUTH
→ INTERRUPT GRANT (authority)
→ DETERMINISTIC CONDITION
→ PULSE OCCURRENCE (truth)
→ DELIVERY / PHYSICAL EXPRESSION (perception attempt)
```

Expression of a Pulse is not the Pulse. A felt haptic does not prove delivery success as institutional truth, and does not become acknowledgement.

---

## 5. End-to-end semantic trace

```text
authoritative temporal source
→ Interrupt Grant
→ deterministic temporal condition
→ Pulse occurrence
→ dispatcher
→ phone authoritative reread
→ local phone claim
→ Wear transport
→ watch notification gate
→ local watch claim
→ notification-class physical expression
```

| Boundary | Available | Intentionally discarded / not carried | Authority forward | Expression renderer knows |
| --- | --- | --- | --- | --- |
| Temporal source | Timed civil start; ownership; title/purpose | Importance, MustDo, urgency never enter | Owned timed start identity | N/A |
| Interrupt Grant | `source_kind`, `source_id`, `transition_kind=start`, positive `lead_offset_seconds` | Absolute fire time; delivery channel; source title; “approaching” ontology | Human interruption authority for relative start | N/A (grant UX only) |
| Condition | `not_yet` / `eligible` / `elapsed` / … | Source content; delivery intent | Due-for-establishment when threshold reached | N/A |
| Occurrence | id + fingerprints + `threshold_at` + `source_start_at` + `source_kind` / `source_id` | `transition_kind`, `lead_offset_seconds` (collapsed into threshold evidence); delivery/perception state | Durable authorized-condition-true identity | Web can join live sources; native cannot yet |
| Dispatcher | occurrence id (+ owner for token routing) | Entire occurrence semantics | Transport wake only | N/A |
| Phone reread | occurrence id visible under JWT/RLS | All occurrence columns except id | “May claim expression if Visible” | id only |
| Phone claim | occurrence id | — | Won phone-local exactly-once expression boundary | id only |
| Wear transport | occurrence id on `/orient/pulse/express` | Everything else | Not Pulse authority | id only |
| Watch gate | OS notification permission / enabled | — | Wrist Attention only (not Interrupt Grant) | permission snapshot |
| Watch claim → expression | occurrence id | — | Won watch-local expression boundary | id + fixed “Orient” / “Pulse” copy + one channel pattern |

**Downstream native expression currently knows only:**

> this authorized Pulse occurrence exists (by id) and won a local expression claim

It does **not** know enough to distinguish meaning beyond that without a new deliberate semantic contract.

---

## 6. Information available by layer

### At occurrence (authoritative row)

`id`, `user_id`, `grant_id` (nullable after source deletion), `source_kind`, `source_id`, `source_starts_on`, `source_start_local`, `threshold_at`, `source_start_at`, `established_at`.

Not on occurrence: `transition_kind`, `lead_offset_seconds` (grant-only; lead collapsed into `threshold_at` evidence).

### At phone expression

FCM + JWT reread + claim + notify/haptic: **`pulse_occurrence_id` only.**  
Generic copy: “Orient Pulse” / “An established Pulse is present.”  
One restrained haptic. No `source_kind`, lead, title, or threshold.

### At Wear expression

MessageClient payload: **occurrence id only.**  
Watch has no Supabase reread.  
Notification: “Orient” / “Pulse” + channel-mediated restrained vibration.

### Web in-app expression (parallel, richer)

May show live source title/purpose + fingerprinted start local time while grant still active and before start. Still not a haptic language; still not urgency/importance.

---

## 7. Four dimensions — separation

| Dimension | Meaning | Current owner |
| --- | --- | --- |
| **AUTHORITY** | May Orient reach Tyson for this temporal relationship? | Human Interrupt Grant |
| **DELIVERY** | Through which permitted physical surface may an already-authorized Pulse be expressed? | Phone / Wear perception edges (no preferred-surface policy yet) |
| **EXPRESSION** | What should the physical expression communicate? | **Undesigned** — currently one generic notification-class word |
| **PRESENCE** | How does Orient inhabit a physical surface between contacts? | Wrist Presence (install/inhabit); watch face future observer |

### Separation intact?

**Yes, as architecture.** WEAR-008 and AUTHORITY-001 keep Pulse Authority / Wrist Attention / Wrist Presence distinct. Occurrence comments deny delivery/urgency/ack identity.

### Existing conflations found (not repaired)

| Hazard | Nature |
| --- | --- |
| `WearPulseNotificationAuthority` naming | Sounds like Interrupt Grant; is OS notification gate only |
| UI “Remind me” (Commitment) vs “Reach me” (Block) | Authority UX language difference; not expression vocabulary |
| OS `CATEGORY_REMINDER` | Platform category, not Orient Reminder domain object |
| Phone copy “An established Pulse is present” | Casual “present”; not Wrist Presence authority |
| “Perception” overloaded | Edge role vs human feeling vs claim bookkeeping |

None of these invent haptic language. They are naming/surface hazards to preserve when designing expression later.

---

## 8. Source kind as language — verdict

Candidate model:

> Commitment → one haptic · Block → another · Task → another

**Rejected as semantic language.**

Reasons:

1. `source_kind` is a persistence/authority discriminator, not a human-perceptual relationship.
2. Delivery was deliberately source-agnostic (occurrence id only).
3. AUTHORITY-005 proved Block expression needed no Block-specific logic.
4. Feeling Commitment-start vs Block-start without looking would encode implementation category, not a usable temporal relationship.
5. Repository standing instruction: do not presume `source_kind` → pattern.

### Commitment-start vs Block-start perceptual meaning

| Relationship | Authority grammar | Physical expression path | Human-relevant meaning at expression |
| --- | --- | --- | --- |
| timed Commitment + start + positive lead | Same general grammar | Same occurrence-id path | Authorized timed-start threshold became true |
| timed Block + start + positive lead | Same general grammar | Same occurrence-id path | Authorized timed-start threshold became true |

**Finding: B — the same perceptual meaning arising from different sovereign sources.**

They are different sovereign sources and different authority rows. They are not different haptic words under current evidence. Different sovereign sources may speak the same physical word when they establish the same human-relevant meaning.

---

## 9. Candidate perceptual distinctions

Examples in the brief were prompts only — not approved vocabulary.

| Candidate | Authoritative truth? | Already represented? | Deterministic? | Source-independent? | Useful without screen? | Changes interpretation/action? | Learnable? | Truthful across sources? | Requires inference? | Earns a word now? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Authorized condition became true (current Pulse) | Yes — occurrence | Yes | Yes | Yes | Yes (attention to Orient temporal contact) | Yes — orients attention | Yes | Yes | No | **Already the one word** |
| Approach (threshold before start under positive lead) | Yes as grant/threshold form | Yes as lead>0 only form today | Yes | Yes | Possibly | Possibly vs arrival | Possibly | Yes | No | **Not as second word yet** — currently the only authorized form; collapsed into the one word |
| Arrival (at temporal boundary / lead=0) | **Not expressible today** | No | Would be if authorized | Yes if authorized | Possibly | Possibly | Possibly | Yes if authorized | No | **Rejected for now** — authority grammar requires `lead_offset_seconds > 0` |
| Boundary / transition family (`start` vs future `end`) | Partially — `transition_kind` exists, only `start` accepted | Only `start` | Yes if extended | Yes | Possibly | Possibly | Possibly | Yes | No | **Deferred** — no second transition accepted |
| Source-kind identity | Schema only | Yes on rows; discarded at delivery | Yes | No (by definition) | Encodes implementation | Misleading | Yes as codebook, not language | No | No | **Rejected** |
| Urgency / importance / MustDo | Not Pulse truth | Explicitly excluded | N/A | N/A | Would invent severity | Harmful | N/A | No | **Yes — forbidden inference** | **Rejected** |
| “Nearing” as graduated intensity by lead magnitude | Lead choices exist (5/15/30/60) | On grant only; discarded at occurrence | Lead is deterministic; intensity mapping is not semantic truth | Could be | Counting/decoding risk | Weak — lead choice already human-selected | Poor if counted | Ambiguous | Intensity invents weight | **Rejected as intensity language** |
| Something newly true vs already-true replay | Occurrence uniqueness | Unique identity per grant+civil start | Yes | Yes | Weak — expression is once locally | Low | Low | Yes | Retries are delivery, not new truth | **No separate word** — exactly-once expression already handles this |

### Deterministically supported (as facts, not as vocabulary)

- Authorized timed-start threshold reached (current Pulse)
- Positive relative lead before start (current grant form)
- Distinct evaluator windows `eligible` vs `elapsed` (establishment/expression-window bookkeeping — **not** designed haptic dialects)

### Unsupported / inferred — rejected

- Urgency, importance, MustDo, priority, alarm, immediate action, acknowledgement demand
- Source-kind codebook
- Graduated intensity by lead minutes
- Anthropomorphic “Orient decided this is worthy”

---

## 10. Lead time and approach / arrival

Current accepted grants use **positive** relative lead offsets only.

| Question | Finding |
| --- | --- |
| Are “five minutes before” and a future “at the boundary” merely threshold parameters? | As **authority forms**, they would be different relative relationships to the same transition. As **current expression**, all positive leads collapse to one word; lead magnitude is not expressed. |
| Can APPROACH vs ARRIVAL be grounded in deterministic Pulse truth? | **APPROACH-like form:** yes today (positive lead). **ARRIVAL form:** not today — lead=0 unauthorized. |
| Does current authority grammar support both as haptic words? | No. Grammar supports only positive lead. ARRIVAL would require new human-authorized grant form before any expression language could truthfully speak it. |

**Do not implement lead=0. Do not approve lead=0 authority in this discovery.**

Semantic note only: if a future human decision authorizes an at-boundary relationship, *then* APPROACH vs ARRIVAL becomes the strongest candidate pair for a second haptic word — because it is a relationship to time, not a database category.

---

## 11. Language vs intensity

| Encoding candidate | Evidence for haptic intensity? |
| --- | --- |
| Urgency | **None** — forbidden inference |
| Importance | **None** — attention ≠ importance |
| MustDo | **None** — Class D attention flag ≠ interruption authority |
| Priority | **None** |
| Source type | **None** — rejected as language |

Preserved:

> attention ≠ importance  
> interruption authority ≠ urgency

**Intensity does not belong in the semantic language on current evidence.** Stronger/longer/multiple vibration would invent severity Orient does not possess. A second *word* (distinct relationship) is categorically different from a louder first word.

---

## 12. Definition — haptic word

**Adopted refinement:**

> A haptic word is a deliberately distinguishable physical expression of a specific, deterministic, human-relevant temporal relationship that Orient has established under explicit human authority, understandable without decoding an implementation category.

A haptic word must **not** merely be:

- an event type
- database `source_kind`
- notification category
- arbitrary vibration pattern
- severity invented by Orient
- delivery channel
- UI label translated into vibration

### Minimum criteria before a distinction earns a word

1. Grounded in authoritative, deterministic Orient truth (not inference)
2. Human-relevant without a screen
3. Source-independent when the relationship is the same
4. Changes likely interpretation or action in ordinary use
5. Learnable by recognition, not conscious counting of pulses
6. Expressible under existing or explicitly newly authorized grant grammar
7. Shareable in principle with a future visual morphology (same semantic event)
8. Narrower than “Pulse exists” in a way Tyson can use

---

## 13. Learnability / vocabulary size

From Orient constraints (wrist, closed-app, one occurrence identity, educational clarity):

| Finding | Conclusion |
| --- | --- |
| Tiny vocabulary preferable? | **Yes.** Wrist language must remain recognizable under motion and divided attention. |
| What makes two words distinguishable? | Distinct temporal relationships, not counted taps encoding enums. |
| Counting pulses as codebook? | **High risk** — turns Orient into a notification toy / Morse layer; rejects learnability-by-recognition. |
| Recognition vs conscious decoding? | Language should become recognizable through repeated truthful use. |
| Practical upper bound? | **No defensible exact integer yet.** Prefer “as small as truth requires,” starting at one. A second word must earn existence; a third even more so. |

---

## 14. Relationship to visual expression

Principle evaluated:

> “Pulse is one temporal event expressed simultaneously through touch and light.”

**Finding:** Directionally retained by WEAR-008 (haptic + restrained gold temporal illumination may eventually form one perceptual event). **No visual contract accepted.** Watch face remains observer.

**Shared-language principle (discovery strength: strong as direction, not as accepted contract):**

```text
Pulse semantic meaning
→ haptic morphology
→ visual/gold morphology
```

not:

```text
Pulse → unrelated vibration → unrelated animation
```

**Future expression-renderer contract (semantic only):**

- Input: a source-agnostic **expression semantic identity** derived from authoritative temporal relationship facts (not Commitment/Block labels)
- Plus: occurrence identity for exactly-once / provenance
- Must not require domain implementation categories to choose morphology
- Must not invent urgency/importance

Do not design the watch face here.

---

## 15. Relationship to Orient's intelligence

| Claim | Truthful? |
| --- | --- |
| Orient establishes deterministic truth | Yes — evaluator + occurrence |
| Orient possesses authority to request perception | Only when human Interrupt Grant (and surface permission) allow |
| A physical device expresses that established meaning | Yes — perception edge |
| Orient “understands” and “intends” like a mind | **No** — anthropomorphism unsupported |

**Strongest truthful framing:**

> Orient may express only what its established truth and human authority allow it to say. Physical surfaces perform that expression; they do not think, judge, or invent meaning.

Expression is institutional speech under grant, not cognition.

---

## 16. Agent boundary

```text
agent recommendation
  ≠ human Interrupt Grant
  ≠ Pulse semantic meaning
  ≠ physical expression
```

Required boundary:

1. Agents may reason that Tyson *might* want interruption.
2. Agents must not create Interrupt Grants, Pulse occurrences, or haptic meanings.
3. Only an explicit human grant authorizes Pulse.
4. Expression morphology may speak only authorized semantic identity — never agent urgency/importance.

No agent implementation in this tranche.

---

## 17. Minimum semantic expression model

**Selected: A — Pulse currently has exactly one semantic expression and needs no model yet.**

| Element | Status |
| --- | --- |
| Authoritative | Interrupt Grant + occurrence establishment of authorized timed-start threshold |
| Derived | Threshold instant from start − lead (evidence); not a second word |
| Presentation | One restrained notification-class haptic + generic copy; web title join |
| Who establishes authority | Human (grant) |
| Who establishes occurrence truth | Hosted deterministic evaluator |
| Who chooses expression morphology today | Fixed restrained actuator (not a vocabulary chooser) |
| Semantic identity placement | **Occurrence time establishes truth; expression time may only speak an identity already licensed by grant+occurrence.** No expression-time invention. |

**Not selected now:**

- **B** — small expression-semantic classification — only if a second authorized temporal relationship (e.g. future ARRIVAL / `end`) earns a word
- **C** — `transition_kind` alone — insufficient; only `start` exists; and kind alone is not yet multi-valued human language
- **D** — other model — unnecessary

**New schema required?** No for current one-word truth.  
**New authority required?** No for current meaning. (Future ARRIVAL/`end` would.)  
**Vocabulary accepted?** **No.**

---

## 18. First proposed physical language experiment

**Name:** Single-word adequacy trial (no second pattern).

**Design:**

1. Continue using the existing accepted single notification-class haptic for ordinary authorized Commitment-start and Block-start Pulses.
2. Do not add patterns, source-kind codes, or lead=0.
3. After several lived occurrences of each accepted relationship, Tyson judges:
   - Did the same physical word remain truthful for both?
   - Was any *relationship* (not source category) missing that would have changed action without looking?
4. Success criterion for “one word sufficient”: same word remained adequate; no earned second meaning.
5. If a missing relationship is named, it must be stated as a temporal relationship candidate — not as Commitment-vs-Block — before any morphology work.

**Constraints satisfied:**

- Uses existing accepted Pulse authority
- Does not generalize source kinds to create vocabulary
- Does not encode Commitment vs Block
- Reversible (status quo continues)
- Permits physical human judgment
- Preserves one-occurrence identity and authority boundaries
- Avoids turning the watch into a notification toy

**Existing source kinds sufficient for experiment?** Yes — as two sovereign sources speaking the same word.  
**Watch-face dependency?** No.

Do **not** implement this experiment here. It remains an optional lived check; the next discovery boundary is ORIENT-PULSE-EXPRESSION-002 (Arrival semantic authority), not a second haptic pattern.

---

## 19. Durable language principles (canonized)

These reviewed principles are durable Orient expression law:

1. **Source type is not a haptic word.**
2. **An Orient haptic word communicates a relationship, not a database object.**
3. **Different sovereign sources may speak the same physical word when they establish the same human-relevant meaning.**
4. **A new physical word must earn existence by communicating a distinction Tyson can use without looking at a screen.**
5. **Orient may express only what established truth and human authority allow it to say.**
6. **Attention is not importance.**
7. **Interruption authority is not urgency.**

Intensity is not semantic language on current evidence (consequence of 6–7; not a separate vocabulary).

### Direction only — not an accepted contract

> One semantic event may eventually be expressed coherently through touch and light.

Retained as direction (WEAR-008). No visual contract. No watch-face morphology accepted.

### Explicitly not canonized

| Statement | Disposition |
| --- | --- |
| Source-kind → pattern codebook | **Rejected** |
| Lead minutes → intensity | **Rejected** |
| MustDo/importance → stronger haptic | **Rejected** |
| Current haptic means “worthy of perception” | **Rejected** — implies judgment Pulse did not establish |
| APPROACH as accepted vocabulary | **Not canonized** — descriptive inquiry label only |
| ARRIVAL as accepted vocabulary | **Not canonized** — unauthorized / undiscovered |
| END / transition families as vocabulary | **Not canonized** |
| Exact vocabulary-size integer | **Not canonized** |
| Haptic timings / visual morphology | **Not specified** |

**Accepted temporal relationship form today:** positive relative lead before timed `*.start` only.  
**Arrival / lead=0:** remains unauthorized and undiscovered.

---

## 20. Documentation / mutation boundary

| Action | Done? |
| --- | --- |
| Create this discovery record | Yes |
| Publish as documentation (001A) | Yes |
| Mark expression vocabulary accepted | **No** |
| Modify accepted authority docs substantively | **No** (cross-ref via handoff/roadmap only) |
| Runtime / schema / Android / Wear / production | **No** |
| Haptic patterns / lead=0 / new source kinds | **No** |

---

## 21. Deferred questions (not canonized)

Preserve as open discovery only — do **not** treat as accepted vocabulary or authority:

1. Is “the authorized temporal boundary has arrived” a distinct human-relevant relationship from the positive-lead threshold relationship? (→ ORIENT-PULSE-EXPRESSION-002)
2. Should a future `transition_kind=end` (or other transition) ever earn a word, or remain silent?
3. When preferred-surface routing arrives, does expression semantic identity stay shared while delivery chooses surface?
4. What exact visual morphology pairs with the one current word — deferred to watch-face work.
5. Exact vocabulary size; haptic timings; intensity semantics — none accepted.

Positive lead currently provides the **only** accepted temporal relationship form. Arrival / lead=0 remains unauthorized and undiscovered.

Section 18’s single-word adequacy trial remains an optional lived check, not the next discovery boundary.

---

## 22. Next discovery boundary

**ORIENT-PULSE-EXPRESSION-002 — ARRIVAL SEMANTIC AUTHORITY DISCOVERY**

Core question:

> Is “the authorized temporal boundary has arrived” a deterministic, human-relevant relationship distinct from the currently accepted positive-lead threshold relationship, and if so, can it truthfully earn independent interruption authority and eventually a distinct physical word?

This is **not** approval of lead=0.  
This is **not** approval of a second haptic pattern.  
This is **not** source-kind generalization.

Continue deferring: preferred-surface routing, watch-face visual Pulse, richer companion, further source kinds.

---

## 23. Final verdict

**Discovery:** `ORIENT-PULSE-EXPRESSION-SEMANTICS-CLEAR`  
**Publication:** `ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED`

Pulse currently has one truthful physical word: expression of an already-established authorized occurrence. Commitment timed-start positive-lead and Block timed-start positive-lead express the same perceptual meaning. Source kind is not a language. Intensity is not a language. A second word must earn existence from a distinct deterministic temporal relationship under human authority — not from database categories.
