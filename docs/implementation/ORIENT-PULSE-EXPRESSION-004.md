# ORIENT-PULSE-EXPRESSION-004

## Arrival authority form discovery

**Discovery + design decision publication (004A).** No schema. No migration SQL. No runtime/evaluator/UI/Android/Wear changes. No production mutation. No ARRIVAL implementation. No haptic morphology. No numeric expression-eligibility window.

**Baseline verified:** `8107f8e688b74e0decbd7982fb0b54062d57d952`  
(`HEAD` = `origin/main` at discovery inspection; published as ORIENT-PULSE-EXPRESSION-004A.)

**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient). Wealth Engine untouched.

**Prior accepted state:** `ORIENT-PULSE-ARRIVAL-TIMELINESS-PUBLISHED`  
([EXPRESSION-003](ORIENT-PULSE-EXPRESSION-003.md); semantics [EXPRESSION-002](ORIENT-PULSE-EXPRESSION-002.md)).

**Discovery verdict:** `ORIENT-PULSE-ARRIVAL-AUTHORITY-FORM-CLEAR`  
**Publication verdict:** `ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED`

---

## 0. Human product / design decision (004A)

Accepted authority grammar:

```text
source
+ source transition
+ authorized temporal relationship
+ relationship parameters
+ human Interrupt Grant
```

One grant authorizes exactly one temporal relationship.

### Accepted conceptual domain tokens

| Token | Definition |
| --- | --- |
| **`relative_before`** | Independently authorized relationship in which Orient may establish a Pulse when the selected point N before an authoritative source transition becomes true. Requires positive lead parameter. Current physically accepted Pulse authority maps to this relationship. Must **not** be renamed APPROACH without future evidence. |
| **`arrival`** | Independently authorized relationship in which Orient may establish a Pulse when the authoritative source transition itself becomes present. Has **no** lead parameter. Accepted semantically; **not** yet implemented or physically expressed. |

**APPROACH** is **not** accepted as a synonym or canonical token.

### Parameter rule

```text
relationship identity ≠ relationship parameter
```

- `relative_before` → `lead_offset_seconds` required and `> 0`
- `arrival` → lead parameter not semantically applicable
- Prefer conceptual absence/null over zero for an inapplicable parameter
- **NULL lead does NOT mean ARRIVAL.** Explicit relationship identity means ARRIVAL. Absence of lead merely means ARRIVAL does not use that parameter.
- Magic zero is **rejected** as relationship identity

Final database nullability / constraint syntax is **not** established in this documentation tranche.

---

## 1. Purpose

Discover the smallest truthful authority representation that allows Tyson to independently authorize:

```text
Reach me N before this begins
Reach me when this begins
```

without authority inheritance, source-kind vocabulary, magic-number semantics, duplicate source truth, duplicated evaluators, premature reminder architecture, or unnecessary schema complexity.

---

## 2. Current grant model (exact)

### Table: `public.pulse_interrupt_grants`

| Column | Actual semantic role (from comments + code) |
| --- | --- |
| `source_kind` | Discriminator of which sovereign source table the grant binds to (`commitment` \| `block`). Not a perceptual word. |
| `source_id` | UUID of that owned source row. Enforced by timed-source insert trigger; cleaned by source-delete cascade. |
| `transition_kind` | Names the **source transition** the relative lead is before. Accepted: `start` only. Explicitly not an approaching ontology. |
| `lead_offset_seconds` | Positive seconds **before** that source transition; relative to **current** source start; not an absolute fire timestamp. Today also accidentally carries the only accepted relationship (via `> 0`). |
| `established_at` | Instant the **human** established this authority. |
| `revoked_at` | Soft withdrawal; null = active. Only authenticated UPDATE column. |

### Effective constraints

- CHECK `source_kind in ('commitment','block')`
- CHECK `transition_kind = 'start'`
- CHECK `lead_offset_seconds > 0`
- Unique active: `(user_id, source_kind, source_id, transition_kind) WHERE revoked_at IS NULL`
- **Lead is not in the uniqueness key** — so different leads cannot coexist as two active grants today
- RLS: SELECT/INSERT; UPDATE(`revoked_at`); no authenticated DELETE
- Source DELETE → SECURITY DEFINER hard-DELETE grants by `(source_kind, source_id, user_id)`; occurrences retained (`grant_id` SET NULL)

### Occurrence uniqueness today

`(grant_id, source_starts_on, source_start_local)`

Occurrence stores **no** `transition_kind` / `lead_offset_seconds`. Lead collapses into `threshold_at` evidence. `source_start_at` is derived boundary instant evidence.

---

## 3. What `transition_kind` means

**Verdict: A — a transition belonging to the source.**

Not a Pulse temporal relationship. Mild accidental mixture risk only insofar as today’s single accepted relationship hides behind `start` + positive lead.

If both exist:

```text
Reach me 10 minutes before this begins
Reach me when this begins
```

the source transition in **both** cases remains:

```text
start
```

**ARRIVAL does not require a new `transition_kind`.** Encoding ARRIVAL as `transition_kind='arrival'` would misname a source transition and conflate layers.

---

## 4. What `lead_offset_seconds` means

| Candidate | Finding |
| --- | --- |
| A. relationship identity | **Accidental today** — positivity invariant + sole accepted form make it behave like identity |
| B. relationship parameter | **Correct semantic role** for the positive-lead form |
| C. evaluator implementation detail | Partially — used to derive threshold |
| D. mixture | **Current reality** — parameter overloaded as identity |

For the accepted positive-lead form:

```text
threshold = source start − lead
```

**Finding:**

> The relationship is “authorized relative pre-boundary threshold.”  
> `lead_offset_seconds` is that relationship’s **parameter**, not its identity.

ARRIVAL has no lead parameter. Overloading identity into lead magnitude (including zero) is the debt EXPRESSION-002 named.

---

## 5. Missing concept

Current grant row **cannot** truthfully represent both independently authorizable statements without overloading fields:

- Unique active key allows only one active grant per `(user, source, transition)`
- `transition_kind` cannot distinguish them (both are `start`)
- `lead_offset_seconds` cannot be both “parameter of pre-boundary” and “ARRIVAL flag”

**Minimum missing semantic concept (domain language):**

> **Authorized temporal relationship** — the human-chosen relationship to a source transition for which Orient may establish a Pulse (e.g. relative pre-boundary vs arrival at the boundary).

Distinct from:

- source type (`source_kind`)
- source transition (`transition_kind`)
- lead parameter (`lead_offset_seconds`)
- delivery / haptic / expression eligibility

---

## 6. Magic-zero re-test

Conceptual model: `transition_kind=start` + `lead_offset_seconds=0`.

| Concern | Result |
| --- | --- |
| Independent authority | Weak — looks like a parameter edge of one form, not a second grantable relationship |
| Explicit relationship identity | Missing — identity inferred from magic value |
| Occurrence identity | Technically separable only if uniqueness key changes; zero alone does not name the relationship after grant cleanup (`grant_id` null) |
| Inspectability / provenance | Lossy — readers must know the convention “0 means ARRIVAL” |
| Evaluator clarity | Easy computationally; unclear semantically |
| Expression eligibility | Needs relationship identity anyway ([EXPRESSION-003](ORIENT-PULSE-EXPRESSION-003.md)) — zero does not supply it |
| Future expansion | Poor — next relationships cannot all be magic numbers |
| Migration compatibility | Tempting (widen `> 0` → `>= 0`) but encodes the wrong concept |

**Magic-zero verdict: B — computationally sufficient but semantically lossy.**

Rejected as preferred authority representation. Not “inherently invalid” as a number; invalid as **relationship identity**.

---

## 7. Explicit relationship identity

| Question | Answer |
| --- | --- |
| Needed? | **Yes** |
| What is it? | Grant authority truth of which temporal relationship was authorized |
| Also on occurrence? | **Yes as provenance** (survives `grant_id` SET NULL) |
| Evaluator? | Consumes it to choose threshold derivation |
| Presentation? | Maps to human phrases; does not invent identity |
| Originates where? | **At grant time** — human Interrupt Grant act. Never at expression time. |

---

## 8. Does current positive-lead need a name?

ARRIVAL has semantic identity. The existing form also needs explicit identity when coexistence begins — otherwise uniqueness and provenance remain overloaded on lead.

**Finding:** both relationships require first-class identity for a truthful two-grant model.

**004A accepted tokens:** `relative_before` (maps current positive-lead authority) and `arrival`.  
**APPROACH** remains **not** accepted ([EXPRESSION-001](ORIENT-PULSE-EXPRESSION-001.md)).

---

## 9. Occurrence identity

Future case: same source, same start, two active grants (relative pre-boundary + ARRIVAL).

If each relationship is its own grant:

| Question | Answer |
| --- | --- |
| Does current uniqueness `(grant_id, fingerprint)` keep occurrences distinct? | **Yes** — different `grant_id` ⇒ distinct rows |
| Must occurrence persist relationship identity? | **Yes** — for provenance after grant cleanup, expression eligibility, native reread, future morphology |
| Redundant with grant_id while grant exists? | Denormalized evidence — required because `grant_id` may become null |

---

## 10. One grant vs two grants

| Model | Verdict |
| --- | --- |
| A. one grant contains multiple relationships | **Rejected** — inheritance/ambiguity; conflicts with one-grant→one-occurrence clarity |
| **B. each independently authorized temporal relationship is its own grant** | **Selected** |

Optimizes for authority clarity and independent revocation — not fewer rows.

---

## 11. Revocation

Two grants ⇒ revoke ARRIVAL leaves relative pre-boundary unchanged; reverse likewise.

Requires: distinct grant rows + uniqueness key that includes relationship identity (not only transition).

---

## 12. Source rescheduling

Current relative-grant semantics: live source start moves threshold; prior fingerprints remain; new civil identity may establish a new occurrence.

| Grant | Behavior |
| --- | --- |
| Relative pre-boundary | Follows live start; threshold = `T′ − L` |
| ARRIVAL | Follows live start; threshold = `T′` |

Relationship identity does **not** change rescheduling policy — both remain relative to authoritative source start.

---

## 13. Source deletion

LIFECYCLE-003 preserved:

- grants for deleted source hard-cleaned (DEFINER)
- occurrences retained with historical provenance (`grant_id` null)

New relationship identity does **not** weaken cleanup: cascade remains by `(source_kind, source_id, user_id)` and removes **all** grants for that source (both relationships). Occurrences keep denormalized relationship provenance.

---

## 14. Source independence

Timed Commitment and timed Block use the **identical** authority form.

Rejected: `CommitmentArrival`, `BlockArrival`, `CommitmentReminder`, `BlockReminder`, or equivalents.

---

## 15. Evaluator shape

| Option | Disposition |
| --- | --- |
| A. separate evaluator / cron | **Rejected** — duplicate scheduling |
| **B. same hosted evaluator with explicit relationship branch** | **Selected minimum** |
| C. fully generalized relationship evaluator | Acceptable evolution of B; not required first |
| D. other | — |

Preserve one hosted temporal establishment authority. Threshold derivation:

```text
relative pre-boundary → T − L   (L > 0)
ARRIVAL              → T
```

---

## 16. ARRIVAL occurrence semantics

**Minimum durable proof:**

> An explicit human grant authorized ARRIVAL for this source transition, and the authoritative boundary `T` became true under this temporal identity.

| Field | Role |
| --- | --- |
| `grant_id` | Authorizing grant (nullable after cleanup) |
| relationship identity | **Authoritative provenance of what was authorized** |
| `source_kind` / `source_id` | Provenance of sovereign source |
| `transition_kind` | Source transition (`start`) — denormalized or implied |
| civil fingerprints | Occurrence identity with grant |
| `source_start_at` | Authoritative boundary `T` evidence |
| `threshold_at` | Derived establishment threshold evidence (`T` for ARRIVAL) |
| `established_at` | When Orient established the condition |

---

## 17. Expression eligibility inputs

From EXPRESSION-003:

```text
relationship identity + authoritative T + now + shared policy
```

**Minimum native authoritative reread shape (conceptual):**

- `pulse_occurrence_id`
- relationship identity
- `source_start_at` (as `T` for timed-start ARRIVAL)

Devices must not reconstruct domain from magic lead values. Exact transport deferred.

---

## 18. Legacy compatibility

| Artifact | Compatibility |
| --- | --- |
| Existing positive-lead grants | Remain relative pre-boundary only; must **not** silently gain ARRIVAL |
| Existing occurrences | Remain threshold-at-lead evidence; must not be reclassified as ARRIVAL |
| Introducing relationship identity later | Likely **default/backfill** existing grants+occurrences as relative pre-boundary; not ARRIVAL |
| Versioning | Optional; default interpretation sufficient if exhaustive and one-way |

---

## 19. Future DB constraints (conceptual — no SQL)

Necessary to prevent invalid combinations:

- Known relationship identity set only
- Relative pre-boundary ⇒ `lead_offset_seconds > 0`
- ARRIVAL ⇒ no positive lead parameter (null / absent / constrained zero-only-if-explicitly-paired — prefer **null/absent parameter**, not magic zero identity)
- Unique active: `(user_id, source_kind, source_id, transition_kind, relationship)` where `revoked_at is null`
- Reject unknown relationships

Relational CHECKs can preserve this cleanly once identity exists.

---

## 20. UI authority model (no screens)

Minimum human-facing choices:

```text
Reach me N before this begins
Reach me when this begins
```

| Question | Answer |
| --- | --- |
| Can both coexist? | **Yes** |
| Either imply the other? | **No** |
| Independent revocation visible/actionable? | **Yes — required** |

Do not expose database terminology (`source_kind`, relationship tokens) as UX.

---

## 21. “Reach me” grammar

Orient’s human authority grammar is becoming:

```text
Reach me + temporal relationship
```

not:

```text
reminder type | delivery channel
```

Consistent with accepted Pulse Interrupt Grant authority. Do not generalize to unsupported source kinds here.

---

## 22. Expansion pressure

Proposed representation adds relationships **one earned identity at a time** (bounded known set).

Avoids:

- source-kind explosion
- magic-number expansion
- schema redesign per word
- generic rule-engine complexity

Enough extensibility; not an abstract rules engine.

---

## 23. Agent boundary

| Agent may | Agent may not |
| --- | --- |
| Recommend a specific temporal relationship authority | Create grant without explicit human act |
| | Infer ARRIVAL from pre-boundary (or reverse) |
| | Combine grants / strengthen authority |
| | Select delivery surface as semantic authority |
| | Select haptic morphology |

Confirmed.

---

## 24. Security / RLS implications

| Concern | Implication |
| --- | --- |
| User ownership | Unchanged — `user_id = auth.uid()` |
| Authenticated grant create/revoke | Same surface: INSERT + UPDATE(`revoked_at`); still no DELETE |
| Source cleanup | Same DEFINER cascade by source identity (all relationships for that source) |
| Service-role evaluator | Still establishes occurrences; must respect relationship-aware threshold rules |
| Native read | Still JWT/RLS; reread fields widen for eligibility, not for inventing authority |

No new privileged human DELETE of grants. No weakening of LIFECYCLE-003.

---

## 25. Minimum authority model

### Semantic model

```text
one Interrupt Grant =
  one source
  + one source transition
  + one authorized temporal relationship
  + that relationship's parameters
```

Therefore the same source transition may have independently active grants for `relative_before` and `arrival`. Neither implies the other. Either may be revoked without changing the other.

One grant → one temporal relationship → at most one occurrence per grant + civil fingerprint.

### Conceptual data shape (not migration SQL)

| Kind | Fields |
| --- | --- |
| **Authoritative** | `user_id`, `source_kind`, `source_id`, `transition_kind`, **relationship** (`relative_before` \| `arrival`), `lead_offset_seconds` (required iff `relative_before`), `established_at`, `revoked_at` |
| **Derived** | threshold: `relative_before` → `T − L`; `arrival` → `T` |
| **Presentation** | “Reach me N before this begins” / “Reach me when this begins”; revoke copy per relationship |

Unique active key must include relationship identity.

---

## 26. Minimum occurrence model

Preserve `(grant_id, source_starts_on, source_start_local)` identity and source-deletion retention.

Add minimum provenance:

| Field | Necessity |
| --- | --- |
| relationship identity | **Required** provenance |
| `source_start_at` | Authoritative `T` evidence (already exists) |
| `threshold_at` | Derived evidence (already exists; equals `T` for ARRIVAL) |
| `source_kind` / `source_id` | Retain |
| `transition_kind` | Optional denormalized evidence if useful; not a substitute for relationship identity |

Do not redesign unrelated fields.

---

## 27. Occurrence provenance + compatibility (canonized)

A durable Pulse occurrence must preserve enough provenance to identify the authorized temporal relationship that became true even if its grant later no longer exists.

Preserve accepted lifecycle: source deletion may remove grants; historical occurrences remain; `grant_id` may become NULL; relationship provenance must remain truthful.

| Compatibility | Requirement |
| --- | --- |
| Existing accepted grants | Conceptually map to **`relative_before`** |
| Existing accepted occurrences | Must **not** be reclassified as ARRIVAL |
| Existing authority | Must **not** silently gain ARRIVAL permission |
| Future migration | Preserve Commitment/Block authority, occurrence history, source-deletion lifecycle, RLS/security |

---

## 28. Durable principles

### Canonized (supported)

1. **Source transition and Pulse relationship are separate concepts.**
2. **A relationship parameter is not relationship identity.**
3. **Independently revocable authority deserves independently identifiable grants.**
4. **One grant authorizes one temporal relationship.**
5. **Occurrence provenance must identify what relationship was authorized.**
6. **Semantic identity should not be inferred from magic parameter values when explicit identity materially improves truth.**
7. **New Pulse relationships are added one at a time as they earn semantic existence, not through a generic rule engine.**
8. **Human authority language describes the relationship, not the delivery mechanism.**

Also preserved: relationship identity is not delivery identity; not haptic morphology; source type is not relationship identity.

EXPRESSION-001–003 principles remain intact.

### Rejected / deferred

| Statement | Disposition |
| --- | --- |
| Magic zero as ARRIVAL identity | **Rejected** |
| NULL lead means ARRIVAL | **Rejected** — identity is explicit |
| ARRIVAL as new `transition_kind` | **Rejected** |
| One grant holding both relationships | **Rejected** |
| Source-specific arrival categories | **Rejected** |
| APPROACH as synonym/canonical token | **Rejected** |
| Conceptual tokens `relative_before` / `arrival` | **Accepted (004A)** |
| Final DB nullability / constraint SQL | **Deferred** to EXPRESSION-005 |
| Numeric expression-eligibility window | **Deferred** (EXPRESSION-003) |
| ARRIVAL Interrupt Grant / physical expression | **Not implemented** |

---

## 29. Open questions (implementation design)

1. Lead parameter representation for `arrival` grants (null vs absent column strategy) — prefer absence/null conceptually
2. Backfill mechanics when relationship identity is introduced
3. Minimal native reread column set
4. Numeric ARRIVAL expression-eligibility duration (unless 005 requires coherence)

---

## 30. Next tranche

**ORIENT-PULSE-EXPRESSION-005 — ARRIVAL AUTHORITY IMPLEMENTATION DESIGN**

Completed as design and published: [ORIENT-PULSE-EXPRESSION-005.md](ORIENT-PULSE-EXPRESSION-005.md) (`ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED`). Canonical order: 005-I foundation → 005-II native silence → 005-III human ARRIVAL UI → 005-IV eligibility+morphology.

---

## 31. Documentation / mutation boundary

| Action | Done? |
| --- | --- |
| Create discovery record | Yes |
| Publish design decision (004A) | Yes |
| Accept conceptual tokens `relative_before` / `arrival` | Yes |
| Implement schema / migrations / runtime / ARRIVAL | **No** |
| Choose numeric eligibility window | **No** |

---

## 32. Final verdict

**Discovery:** `ORIENT-PULSE-ARRIVAL-AUTHORITY-FORM-CLEAR`  
**Publication:** `ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED`

Authorized temporal relationships are first-class. The first two conceptual identities are `relative_before` and `arrival`, both relative to source transition `start`. One grant authorizes one relationship. Lead is a parameter of `relative_before` only. Magic zero and NULL-as-ARRIVAL are rejected. Occurrence provenance must name the relationship. APPROACH is not accepted.
