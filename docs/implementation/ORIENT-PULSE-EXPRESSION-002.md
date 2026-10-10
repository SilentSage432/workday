# ORIENT-PULSE-EXPRESSION-002

## Arrival semantic authority discovery

**Discovery + documentation publication (002A).** No runtime mutation. No schema. No Android/Wear change. No production mutation. No `lead_offset_seconds = 0` implementation. No second haptic pattern. No Arrival Interrupt Grant implemented.

**Baseline verified:** `fb5cf0fb3e126a71449495e637104df1ac82ff74`  
(`HEAD` = `origin/main` at discovery inspection; published as ORIENT-PULSE-EXPRESSION-002A.)

**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient). Wealth Engine untouched.

**Prior accepted expression state:** `ORIENT-PULSE-EXPRESSION-SEMANTICS-PUBLISHED`  
([EXPRESSION-001](ORIENT-PULSE-EXPRESSION-001.md)).

**Status of this document:** durable Arrival semantic discovery + human product decision record.  
**Haptic morphology:** not designed.  
**Physical acceptance:** not performed.

**Discovery verdict:** `ORIENT-PULSE-ARRIVAL-SEMANTICS-CLEAR`  
**Publication verdict:** `ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED`

---

## 0. Human product decision (002A)

Tyson accepts **ARRIVAL** as a valid Pulse **semantic relationship** for continued development.

**ARRIVAL means:**

> The authoritative temporal boundary itself has become present.

| Layer | Status after 002A |
| --- | --- |
| **Semantic relationship** | **Accepted for development** |
| **Interruption authority form** | **Not yet implemented** (no Arrival Interrupt Grant) |
| **Physical word** | **Candidate only** |
| **Haptic morphology** | **Not designed** |
| **Physical acceptance** | **Not performed** |

ARRIVAL is independently authorized as a concept. Authority for a positive-lead pre-boundary relationship does **not** imply ARRIVAL authority. ARRIVAL authority does **not** imply pre-boundary authority.

Commitment-start ARRIVAL and Block-start ARRIVAL have the **same** semantic meaning when independently authorized. Source type is not part of the word. Silence when a relationship is unauthorized remains correct.

**Explicitly not authorized by this decision:**

- `lead_offset_seconds = 0` implementation
- schema / runtime / evaluator changes
- an Arrival Interrupt Grant
- a second haptic pattern
- Android / Wear changes
- production mutation

---

## 1. Purpose

Determine whether ARRIVAL is a real, deterministic, human-relevant temporal relationship distinct from the currently accepted positive-lead relationship — and whether it could truthfully earn independent interruption authority and eventual status as a second Orient physical word.

Do not assume ARRIVAL exists merely because a second word is desired.

---

## 2. Current positive-lead relationship (without naming it APPROACH)

### Layers (preserved)

| Layer | What it is |
| --- | --- |
| Source temporal truth | Timed Commitment/Block civil start (`starts_on` + `start_local`) in canonical zone |
| Grant relationship | Explicit human Interrupt Grant: `transition_kind=start`, `lead_offset_seconds = L > 0` |
| Threshold truth | `threshold = T − L` where `T` is derived source start instant |
| Pulse occurrence | Durable proof that `now ≥ threshold` under unique `(grant_id, civil start, local start)` |
| Physical expression | One notification-class word: already-established authorized occurrence requesting perception |

### What becomes true at threshold

At `now ≥ T − L`, the authorized **pre-boundary threshold** has become true. That is the condition the evaluator establishes. It is not “the source is approaching” as ontology. Grant comments explicitly deny an approaching ontology; lead is a threshold offset.

### Narrowest current meaning

**B — “the human-authorized pre-boundary threshold has become true.”**

| Candidate | Verdict |
| --- | --- |
| A. “the source is approaching” | **Rejected** — not accepted ontology; APPROACH not canonized |
| B. “the human-authorized pre-boundary threshold has become true” | **Accepted as narrowest statement** |
| C. something else | Not required |

**Is APPROACH an accepted name?** **No.** Descriptive inquiry label only ([EXPRESSION-001](ORIENT-PULSE-EXPRESSION-001.md)).

---

## 3. Candidate ARRIVAL definition

**Strongest truthful candidate:**

> The authoritative temporal boundary itself has become present.

For timed source start, that boundary is the derived start instant `T` from civil date + local start + confirmed IANA timezone.

### ARRIVAL is not

| Non-meaning | Why |
| --- | --- |
| Reminder | Interrupt Grant / Pulse ≠ Reminder domain object |
| Alarm | Not alarm policy; not DND bypass |
| Urgency | Temporal presence ≠ urgency |
| Importance | Attention ≠ importance |
| MustDo | Class D ≠ interruption authority |
| “Start notification” as product category | Surface framing, not relationship truth |
| Acknowledgement request | Pulse ≠ acknowledgement |
| Action requirement | Silence remains valid |
| Lateness | ARRIVAL is not “you are late” |
| Elapsed-as-judgment | Past-threshold bookkeeping ≠ ARRIVAL meaning |

ARRIVAL must describe **temporal relationship**, not human judgment.

---

## 4. Is ARRIVAL already authoritative truth?

For timed Commitment and timed Block:

Given authoritative civil date + local start + canonical timezone, Orient can deterministically derive instant `T` via `instantFromZonedLocal` / hosted `AT TIME ZONE` correspondence for unambiguous wall times.

| Question | Finding |
| --- | --- |
| Timed Commitment has sufficient arrival truth? | **Yes** — same start identity already used for threshold derivation |
| Timed Block has sufficient arrival truth? | **Yes** — same |
| Inference required? | **No** — derivation from stored civil fields + confirmed zone |
| DST / civil ambiguity? | **Already handled** by accepted temporal model: gap throws / withhold; fold returns one deterministic instant; no new temporal semantics required for ARRIVAL discovery |

ARRIVAL-as-**authority** is still absent. Truth of `T` exists; authorization to speak at `T` does not.

---

## 5. Semantic distinctness

### Computational

Both can be represented as relative offsets from `source.start`:

- positive-lead: offset = `L > 0` → threshold `T − L`
- candidate arrival: offset = `0` → threshold `T`

Computational proximity does **not** decide semantic identity.

### Human semantic

| Relationship | Human meaning |
| --- | --- |
| Positive-lead | “The point before the boundary that I asked Orient to reach me has become true.” |
| ARRIVAL | “The boundary itself is now here.” |

These do **not** mean the same thing. One orients preparation relative to a chosen lead. The other orients to the presence of the boundary.

### Verdict

**DISTINCT SEMANTIC RELATIONSHIPS**

Reasoning: mathematical offset family membership is implementation convenience. Human temporal relationships to a boundary — “before (as I authorized)” vs “now (at the boundary)” — are different. EXPRESSION-001 already treated them as different relative relationships to the same transition if both were ever authorized. This discovery confirms that finding.

---

## 6. Human usefulness without a screen

If Tyson felt ARRIVAL without looking:

> the temporal boundary itself is now here

versus the current word under a positive-lead grant:

> the pre-boundary point I authorized has become true

**Finding:** Yes — materially different orientation is available. Preparation-window contact vs boundary-present contact can change immediate interpretation (prepare / transition / begin / release the lead window).

Not every boundary deserves both expressions. Usefulness does not force universal dual grants.

**Could interpretation/action differ?** **Yes, plausibly** — enough to satisfy EXPRESSION-001’s usefulness criterion as a candidate, not as lived product law.

---

## 7. Independent authority

**Starting rule:** NO AUTHORITY INHERITANCE UNLESS PROVEN.

| Question | Answer |
| --- | --- |
| Does “Reach me 10 minutes before this Block” authorize “Reach me when the Block begins”? | **No** |
| Does ARRIVAL authority imply positive-lead authority? | **No** |
| One grant with two expressions? | **Rejected** — would invent a second meaning without authority |
| One grant whose meaning spans both? | **Rejected** — spans distinct relationships |
| Two independently authorized temporal relationships? | **Required if both exist** |

**Independent authority required?** **Yes.**

Orient must not create ARRIVAL merely because a positive-lead grant exists.

### Reverse case

Tyson could truthfully want “Reach me when this begins” without wanting “Reach me before this begins.”

Implication: ARRIVAL can stand alone. Positive-lead can stand alone. Neither is a parameter of the other at the authority layer.

---

## 8. Source independence

If ARRIVAL exists for timed Commitment start and timed Block start, the meaning remains:

> the authorized temporal boundary has arrived

for both.

`source_kind` does **not** alter the perceptual word. Same EXPRESSION-001 principle: different sovereign sources may speak the same physical word when they establish the same human-relevant meaning.

**Source-kind affects word?** **No.**

---

## 9. Occurrence identity constraints (no redesign)

Current uniqueness: `(grant_id, source_starts_on, source_start_local)` — at most one occurrence per grant + civil start fingerprint.

| Constraint | Implication |
| --- | --- |
| One current grant has one `lead_offset_seconds` | Cannot encode both relationships in one grant row today |
| One occurrence per grant+fingerprint | One current grant **cannot** safely produce both a positive-lead occurrence and an arrival occurrence without identity collision or semantic overwrite |
| Future dual relationships | Must be **distinct occurrence identities** — almost certainly distinct grants (or an explicit relationship identity that participates in uniqueness) |

Do not redesign occurrence identity in this discovery. Constraint only: **one current grant cannot safely produce both.**

---

## 10. `transition_kind` finding

Current `transition_kind` = which **source transition** the relative lead is before. Accepted value: `start` only.

| Question | Finding |
| --- | --- |
| Are start+positive-lead and start+arrival different transition kinds? | **No** — same source transition (`start`); different temporal relationships to that transition |
| Does `transition_kind` currently represent Pulse relationship? | **No** — it names the source transition; lead encodes the relative relationship |
| Semantic debt? | **Yes, mild:** relationship-to-boundary is carried primarily by `lead_offset_seconds` (and positivity invariant), not by an explicit relationship identity. This debt matters if ARRIVAL is authorized — magic zero would overload lead further |

---

## 11. `lead_offset_seconds > 0` rationale

| Layer | Role of `> 0` |
| --- | --- |
| Historical first-proof scoping | First accepted form was positive lead only |
| Database CHECK + insert trigger | Enforce accepted form |
| Domain / hosted filters | Mirror accepted form |
| Semantic assumption | Not “zero is incoherent”; “zero is unauthorized” |
| UX | Lead choices are positive bounded minutes |
| Occurrence uniqueness | Assumes one lead per grant; does not prove zero invalid |

**Is zero inherently invalid?** **No.** It is outside accepted authority. Simply changing `> 0` to `>= 0` is **not** recommended as the semantic conclusion — that would encode a distinct relationship as a magic numeric edge case.

**Do not authorize or implement lead=0 in this discovery.**

---

## 12. Late evaluation

For positive-lead today: establishment due when `eligible | elapsed` (`now ≥ threshold`), including after source start. AUTHORITY-003/004 recovery proved late establishment of the authorized threshold occurrence after past-threshold failure — without inventing ARRIVAL.

For candidate ARRIVAL at `T`:

| Option | Finding |
| --- | --- |
| A. become true and remain eligible for establishment | **Truth establishment:** yes — once `now ≥ T`, ARRIVAL truth has become true and may still be establishable if not yet satisfied (parallel to positive-lead late recovery) |
| B. already elapsed and should not speak | **Rejected as establishment rule** — would recreate the closed-client miss class of bug |
| C. require a bounded expression window | **Expression usefulness** may warrant a window later; distinct from occurrence truth |
| D. unresolved | Expression-window policy for delayed ARRIVAL physical expression remains open; establishment truth is not |

**Separate:** occurrence truth establishment vs whether delayed physical expression remains meaningful.

---

## 13. ARRIVAL vs ELAPSED

| Concept | Meaning |
| --- | --- |
| ARRIVAL | The boundary itself has become present (candidate relationship at `T`) |
| ELAPSED (current evaluator) | Bookkeeping state: `now ≥ start` after a **positive-lead** threshold was already due — not a haptic dialect; not “lateness judgment” |

ARRIVAL must not silently mean “the start time is somewhere in the past” as judgment.

**ARRIVAL form finding:** best modeled as a **state transition at instant `T` that becomes an established historical fact** whose expression may occur later under delivery constraints — same occurrence/expression separation as today’s Pulse. Not a lingering “you are late” state. Not identical to current `elapsed` vocabulary.

---

## 14. Candidate physical word status

Applying EXPRESSION-001 criteria:

| Criterion | ARRIVAL |
| --- | --- |
| Deterministic authoritative truth | Yes (at `T`), if independently authorized |
| Human-relevant | Yes |
| Useful without screen | Yes (candidate) |
| Source-independent when meaning matches | Yes |
| Changes interpretation/action | Yes (plausibly) |
| Learnable by recognition | Yes (in principle; morphology undesigned) |
| Independently authorized | **Required** — not inherited; not yet authorized |
| Compatible with future visual morphology | Directionally yes |

### Word status

**EARNS CANDIDATE WORD STATUS**

**Why:** ARRIVAL is a distinct deterministic temporal relationship that can be useful without a screen and can change orientation relative to the positive-lead relationship. It satisfies semantic criteria for *candidate* wordhood **contingent on independent human Interrupt Grant authority**.

002A accepts ARRIVAL as a **semantic relationship for development**. Physical word remains **candidate only**. Morphology not designed. Interrupt Grant form not implemented. Physical acceptance not performed.

---

## 15. Haptic morphology

**Not specified.** No pulses, durations, amplitudes, rhythms, waveforms, Android effects, Wear patterns, or visual animations.

Semantic language precedes physical morphology.

---

## 16. Composition

A source could eventually support:

```text
independently authorized pre-boundary relationship
→ time passes
→ independently authorized arrival relationship
```

without either implying the other.

**Strongest truthful framing:**

> Two independent Pulse occurrences (two grants / two occurrence identities), not one grant with two expressions.

Perceptually, if both are authorized and expressed, a human may experience a temporal sequence of two words. Runtime must not over-poeticize that into a single “sentence object.” Composition is sequential independent speech, not inherited dual expression.

**Two-word sentence or independent occurrences?** **Independent occurrences** (perceptual sequence optional, not a schema entity).

---

## 17. Silence

| Authorization | At arrival | Before arrival |
| --- | --- | --- |
| Only positive-lead | **Nothing** (no ARRIVAL speech) | Speak when threshold true |
| Only ARRIVAL | Speak when boundary present | **Nothing** |
| Neither | Nothing | Nothing |
| Both (independent) | Speak under ARRIVAL grant | Speak under positive-lead grant |

**Silence finding:** Silence is necessary. Orient must not speak a relationship it was not authorized to speak.

**Supported durable formulation:**

> Orient's language includes knowing when it has not been authorized to speak.

---

## 18. Agent boundary

| Agent may | Agent may not |
| --- | --- |
| Reason that Tyson may benefit from ARRIVAL | Create ARRIVAL authority |
| Recommend that Tyson authorize ARRIVAL | Reinterpret a positive-lead grant as ARRIVAL permission |
| | Select a stronger haptic word |
| | Infer urgency / importance |

Confirmed. No agent implementation.

---

## 19. Minimum future authority model

**Selected: B — ARRIVAL deserves an explicit relationship identity rather than magic zero.**

| Option | Disposition |
| --- | --- |
| A. relative lead model with zero | Computationally possible; **semantically weak** — collapses distinct relationships into a numeric edge |
| B. explicit relationship identity | **Preferred** — preserves distinctness; avoids magic zero; matches independent authority |
| C. `transition_kind` alone | **Insufficient** — both are `start`; transition ≠ relationship-to-boundary |
| D. current model insufficient | Partially true today; solved by B, not by inventing unrelated architecture |

**New schema likely required?** **Likely yes before an Arrival Interrupt Grant can exist** — at minimum an explicit relationship discriminator (and grant/occurrence identity rules that allow both without collision). Exact shape deferred. Do not implement in this publication.

002A accepts the semantic relationship for development; it does **not** approve schema or grant implementation.

---

## 20. Minimum future UX authority language

Clearest human authority language (conceptual, no screens):

```text
Reach me 10 minutes before
Reach me when this begins
```

These should be perceived as **separate choices**. “Reach me” alone is insufficient without an explicit temporal relationship.

Consistent with existing Orient grant language spirit (Commitment “Remind me” / Block “Reach me” + lead select) — extended only when an Arrival Interrupt Grant form is designed/implemented.

---

## 21. Durable principles

### Canonized (supported)

1. **Before and now are different relationships to a temporal boundary.**
2. **Mathematical proximity does not imply semantic sameness.**
3. **Authority to speak before a boundary does not imply authority to speak at the boundary.**
4. **Authority to speak at the boundary does not imply authority to speak before it.**
5. **Silence is part of Orient's language.**
6. **A physical word is earned by semantic distinction, not actuator capability.**
7. **Arrival is about temporal presence, not urgency.**

EXPRESSION-001 principles remain intact (source type ≠ word; relationship not DB object; same meaning → same word across sources; new word must earn screenless usefulness; express only truth + authority; attention ≠ importance; authority ≠ urgency).

### Rejected / deferred

| Statement | Disposition |
| --- | --- |
| ARRIVAL semantic relationship for development | **Accepted (002A)** |
| ARRIVAL physical word accepted / morphology designed | **Deferred** — candidate only; not designed |
| Arrival Interrupt Grant implemented | **Deferred** — not implemented |
| `lead_offset_seconds = 0` implementation | **Rejected for this tranche** |
| Magic `lead=0` as preferred model | **Rejected** as semantic encoding |
| Positive-lead implies ARRIVAL | **Rejected** |
| ARRIVAL implies positive-lead | **Rejected** |
| Source-specific ARRIVAL words | **Rejected** |
| Exact expression window after late ARRIVAL | **Next discovery — EXPRESSION-003** |
| Haptic / visual morphology | **Deferred** |
| Physical acceptance of ARRIVAL | **Not performed** |

---

## 22. Cross-reference to EXPRESSION-001

EXPRESSION-001 deferred ARRIVAL / lead=0 as unauthorized and undiscovered, and named this tranche as next boundary. This discovery answers the semantic question without altering EXPRESSION-001’s durable principles.

Narrow note: EXPRESSION-001’s optional single-word adequacy trial remains optional lived check; it is not required to accept or reject ARRIVAL’s semantic distinctness.

---

## 23. Open questions

1. Exact explicit relationship identity representation (name/shape) for a future Arrival Interrupt Grant?
2. Expression-window / timeliness policy for ARRIVAL physical expression after `T`? (→ EXPRESSION-003)
3. Interaction with future `end` transition (separate discovery)?
4. Preferred-surface routing when both relationships are authorized?

---

## 24. Next discovery boundary

**ORIENT-PULSE-EXPRESSION-003 — ARRIVAL EXPRESSION TIMELINESS DISCOVERY**

Completed as discovery: [ORIENT-PULSE-EXPRESSION-003.md](ORIENT-PULSE-EXPRESSION-003.md) (`ORIENT-PULSE-ARRIVAL-TIMELINESS-CLEAR`). Durable ARRIVAL truth may outlive physical expression; expression eligibility is a separate shared deterministic policy; exact numeric window deferred; no ARRIVAL implementation.

---

## 25. Documentation / mutation boundary

| Action | Done? |
| --- | --- |
| Create this discovery record | Yes |
| Publish as documentation (002A) | Yes |
| Accept ARRIVAL semantic relationship for development | Yes (002A product decision) |
| Implement Arrival Interrupt Grant / occurrence / haptic | **No** |
| Authorize / implement `lead_offset_seconds = 0` | **No** |
| Runtime / schema / Android / Wear / production | **No** |

---

## 26. Final verdict

**Discovery:** `ORIENT-PULSE-ARRIVAL-SEMANTICS-CLEAR`  
**Publication:** `ORIENT-PULSE-ARRIVAL-SEMANTICS-PUBLISHED`

ARRIVAL is a distinct deterministic temporal relationship (“the authoritative temporal boundary itself has become present”) from the accepted positive-lead relationship (“the human-authorized pre-boundary threshold has become true”). Tyson accepts ARRIVAL as a semantic relationship for continued development. Interruption authority form is not implemented. Physical word remains candidate only. Morphology is not designed. Physical acceptance is not performed. Independent authority, silence, and explicit relationship identity (not magic zero) remain required.
