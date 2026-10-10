# ORIENT-PULSE-AUTHORITY-001

## GENERAL INTERRUPT AUTHORITY DOMAIN DISCOVERY

Discovery only. No runtime mutation. No schema migration. No device change. No commit/push for this record.

**Baseline:** `885782989a8371b276aaef4605ec517ff50ee910` (`HEAD` = `origin/main`, clean tree at inspection).

**Prior accepted Pulse stack:** Commitment-start Interrupt Grant → hosted establishment → phone/watch perception edges. Phase 2 and Phase 3 closed ([ORIENT-WEAR-PULSE-BRIDGE-008](ORIENT-WEAR-PULSE-BRIDGE-008.md)).

**Status of this document:** discovery reasoning and classification. Recommendations are **not** accepted architecture.

---

## 1. Purpose

Discover the smallest truthful general authority model through which additional Orient temporal relationships could eventually support an explicit human **“Reach me.”**

Commitment-start is the first accepted Pulse source relationship. It is not the universal definition of Pulse.

---

## 2. Locked Pulse semantics (repository-confirmed)

A **Pulse occurrence** is the durable establishment that a deterministic evaluator found an explicitly authorized temporal condition true under a unique occurrence identity.

Pulse is **not:** Task, MustDo, importance, urgency, recommendation, notification preference, delivery, haptic, acknowledgement, proof of perception, or agent judgment.

Delivery surfaces express Pulse. They do not create or redefine Pulse.

Preserved separations (ARCHITECTURE-001 / WEAR-008 / DOMAIN.md):

- importance ≠ interruption authority
- notification permission ≠ Pulse authority
- watch presence ≠ wrist attention ≠ Pulse authority
- MustDo ≠ automatic Pulse authority
- external observation ≠ interruption authority
- agent reasoning ≠ Interrupt Grant authority

---

## 3. Current grant / evaluator / occurrence contracts

### Schema (`pulse_interrupt_grants`)

Migration: `supabase/migrations/20261008230000_pulse_commitment_start.sql`

| Column | Role |
| --- | --- |
| `id` | Grant identity |
| `user_id` | Owner |
| `source_kind` | Discriminator — **CHECK = `'commitment'` only** |
| `source_id` | Source UUID — **FK to `commitments (id, user_id)` ON DELETE CASCADE** |
| `transition_kind` | Discriminator — **CHECK = `'start'` only** |
| `lead_offset_seconds` | Positive seconds **before** transition (`> 0`) |
| `established_at` | Human authority act |
| `revoked_at` | Soft revoke; null = active |

One active grant per `(user_id, source_kind, source_id, transition_kind)` where `revoked_at is null`. Timed-Commitment insert trigger. RLS: SELECT/INSERT; UPDATE(`revoked_at`) only.

### Schema (`pulse_occurrences`)

Unique identity: `(grant_id, source_starts_on, source_start_local)`.

Fingerprints current source start at establishment. Relative grant follows live source correction → new identity may become due; prior fingerprints are not rewritten. `grant_id` ON DELETE SET NULL.

### Domain evaluator

`evaluateCommitmentStartPulseCondition` / `commitmentStartPulseIsDueForEstablishment` in `domain/pulse.ts`.

- Threshold = source start − lead
- Expression window distinction: `[threshold, start)` = `eligible`; `now >= start` = `elapsed`
- Establishment due: `eligible | elapsed` (hosted must not miss closed clients)
- Results: `withhold | inactive | not_yet | eligible | satisfied | elapsed`
- Types: `PulseSourceKind = "commitment"`, `PulseTransitionKind = "start"` only

Hosted: `establish_due_commitment_start_pulse_occurrences` + `pg_cron` (`20261008240000_pulse_hosted_establishment.sql`).

### UI path

`CommitmentPulseAuthority.tsx` on timed Commitment inspection: bounded lead choices; “Set reminder” / “Don’t remind me.” No pre-selected default.

### Grant schema classification (Section 4 of brief)

**C — structurally general column shape, bounded-extension required for additional sources.**

Evidence:

- Columns deliberately use `source_kind` / `source_id` / `transition_kind` / relative `lead_offset_seconds` (comments: “First proof: commitment/start only”).
- Hard constraints today: CHECK kinds, Commitment same-owner FK, timed-Commitment trigger, domain types, evaluator, UI, hosted SQL — all Commitment-start only.
- Not A (intrinsically only-Commitment in column design).
- Not B (schema itself refuses non-Commitment rows via FK/CHECK; not merely UI/evaluator).

---

## 4. Minimum general authority grammar

Repository evidence supports this grammar remaining valid:

```text
authoritative source
→ established temporal relationship
→ explicit human Interrupt Grant
→ deterministic threshold
→ Pulse occurrence
```

### Required facts before “Reach me” is truthful

Corrected from evidence (not the brief’s list blindly):

1. **Stable source identity** — UUID (or equivalently durable composite) the grant can address.
2. **Authoritative temporal fact** — human-established (or explicitly adopted) clock/date truth Orient already owns; not inferred from prose or importance.
3. **Deterministic relationship** to that fact — currently: relative positive lead before a named transition (start). Absolute standalone timestamps are a **distinct** form (see §9).
4. **Explicit human Interrupt Grant** — not implied by creating the source, MustDo, notification permission, or agent suggestion.
5. **Deterministic occurrence identity** — today: grant + civil start fingerprint + local start fingerprint; one-shot per identity.
6. **Clear invalidation / supersession** — revoke; source delete cascades grant; relative re-eval against **current** temporal identity; occurrence fingerprints do not silently rewrite.
7. **Evaluator eligibility without inference** — withhold on incomplete evidence (missing zone, non-timed, wrong kind).
8. **Unambiguous civil/zone semantics** for that relationship — confirmed `temporal_settings.time_zone` + local civil fields.

Delivery, channel, haptic, and perception remain **out of** this grammar.

---

## 5. Temporal-domain inventory (what exists)

| Object | Persisted? | Owner | Temporal fields | Pulse today |
| --- | --- | --- | --- | --- |
| Commitment | `commitments` | `domain/commitment.ts` | `starts_on`, timed `start_local`/`end_local` | **Yes — start only** |
| Block | `blocks` | `domain/block.ts` | same interval pattern + purpose/context/task | No |
| Protected Time | `protected_time` | `domain/protectedTime.ts` | same interval pattern + label | No |
| Task | `tasks` | `domain/task.ts` | optional `due_on`, `planned_on`, `planned_local`; `completed_at` | No |
| MustDo | **flag** `tasks.must_do` | Task | none of its own | No |
| Note | `notes` | `domain/note.ts` | `captured_at`, `retired_at` only | No |
| ActiveThread | `active_threads` (1/user) | `domain/activeThread.ts` | `established_at`; points at Task | No |
| Stewardship Definition | `stewardship_definitions` (+ revisions) | `domain/stewardship.ts` | cycle kind; establish/retire | No |
| Stewardship Occurrence | **derived** identity only | stewardship | `{definitionId, cycleKind, cycleKey}` | No |
| Satisfaction Fact | `stewardship_satisfactions` | stewardship | `cycle_key`, `satisfied_at` | No |
| Recurring Task Def | `recurring_task_definitions` | `domain/recurringTask.ts` | weekdays + cycle; materializes Tasks | No |
| Deadline / Target / Objective | **not tables** | TIME_MODEL meanings | closest: `due_on` / constants | No |
| Work schedule | `work_schedule_days` | `domain/workSchedule.ts` | off/scheduled + shift locals | No |
| TemporalSettings | `temporal_settings` | workSchedule | confirmed IANA zone | Zone for derivation only |
| External temporal fact | `external_temporal_facts` (+ sources/connections) | `domain/externalTemporal.ts` | timed UTC or all-day civil | No |
| Capture | **not persisted** | interaction | — | No |
| Destination / Priority | direction tables | destination/priority | `established_at` only | No |

---

## 6. Source classification

| Source / relationship | Class | Why |
| --- | --- | --- |
| Timed Commitment **start** (± lead before) | **A** (accepted) | Exact local start; human-established; relative grant proven |
| Timed Commitment **end** | **C** | `end_local` is interval territory; end-as-interrupt-transition not established |
| All-day Commitment | **B** | Date exists; no clock for exact threshold without new time establishment |
| Timed Block **start** (± lead before) | **A** | Same civil+local start authority as Commitment; purpose band is Orient-native |
| Timed Block **end** | **C** | End exists as territory bound; interrupt-transition not established |
| All-day Block | **B** | No clock |
| Timed Protected Time **start** | **A** | Authoritative start clock; exclusion boundary can warrant explicit interrupt |
| Timed Protected Time **end** | **C** | Same end caution as Block/Commitment |
| All-day Protected Time | **B** | No clock |
| Task with `planned_on` + `planned_local` | **A** | Clock-point intention is first-class ([TASK-CLOCK-POINT-001](TASK-CLOCK-POINT-001.md)); grant would be separate from plan truth |
| Task date-only (`planned_on` / `due_on` only) | **B** | Civil day ≠ exact haptic threshold; do not invent a clock |
| Task with no temporal point | **B** / effectively **D** until time established | Nothing to threshold |
| Completed Task | **C** for eligibility rules | Completion exists; whether open-only is required for grants is undecided; MustDo/completion ≠ authority |
| Recurring Task **definition** | **D** as Pulse engine | Recurrence owned by recurring domain; do not build recurring notification engine in Pulse |
| Recurring Task **materialized occurrence Task** | **A** if that Task has clock-point; else **B** | Grant attaches to materialized Task identity, not definition cadence |
| MustDo (alone) | **D** | Attention flag; no temporal truth; ≠ interruption authority |
| Stewardship Definition / cadence | **D** | Cadence ≠ notification generator |
| Stewardship Occurrence (derived) | **C** | Identity exists but not persisted row; cycle boundaries ≠ exact interrupt clocks without more work |
| Satisfaction Fact | **D** | Records sufficient attention; unsatisfied ≠ failed; not an interrupt source |
| Note | **D** | Capture/retire instants; prose time is not temporal truth |
| ActiveThread | **D** | Attention continuity; resume ≠ interrupt |
| External temporal observation | **C** (eventually grantable only via explicit Orient grant) | Observation ≠ authority; removal reconciliation still deferred (CHAT_HANDOFF) |
| Work schedule day / shift | **D** as Pulse source | Contextual temporal truth; not candidate interrupt source by default |
| Absolute timestamp “about” an object | **B** then distinct form | Not equivalent to relative relationship with object’s own temporal truth |

Restraint preferred: Class A set is small.

---

## 7. Specific findings

### Commitment

Useful truthful relationships **already established for Pulse:** relative lead **before start** only.

`end_local` is required for timed territory/overnight semantics. That does **not** establish `commitment.end` as an interrupt transition. Do not invent end because a timestamp exists.

“At start” (lead = 0) is **not** expressible today (`lead_offset_seconds > 0`).

### Task

| Shape | Pulse readiness |
| --- | --- |
| Exact clock (`planned_on` + `planned_local`) | **Sufficient temporal truth** for an explicit grant relative to that point — Class A. Migration comment: clock-point is **not** itself a reminder; Interrupt Grant remains separate authority. |
| Date only | **Cannot** support exact haptic without Tyson establishing a clock. Do not infer one. |
| No temporal point | No threshold. |
| Completed | Grant eligibility vs completion needs a later rule; completion does not today touch Pulse. |
| Recurring occurrence | Prefer grant on materialized Task (one-shot identity), not definition. |
| MustDo | **Does not** change Pulse eligibility. MustDo ≠ automatic interruption authority. |

### Block / Protected Time

Start/end are real Orient territory facts, not mere paint. **Start** has enough semantic authority for an explicit interrupt grant (Class A). **End** needs separate semantic establishment (Class C). Whether those relationships “belong” in Orient’s interrupt domain: yes for start-with-grant; not automatic; not every territory fact must offer Reach me in UI.

### Stewardship

Definition/cadence must not become a notification generator. Derived occurrence identity is real but weaker than a persisted timed row. Satisfaction is a separate fact. Preserve: unsatisfied ≠ failed; no shame/rollover.

### Note / ActiveThread / Work schedule

Remain non-Pulse sources under current semantics (Class D), unless a **separate** temporal relationship is established.

### External

External observation may become a Pulse source **only** through an explicit Orient human grant (never automatically). Current identity/lifecycle is mature for observation projection, but **removal reconciliation remains deferred** — do not generalize Pulse onto external facts until that authority story is sound.

---

## 8. “Reach me” semantics (language only)

**Accurate candidate meaning:**

> Authorize Orient to establish one or more Pulse occurrences when this explicitly selected temporal relationship becomes true.

Under the current one-shot model, “one or more” means at most one occurrence per grant+temporal-identity; a moved source identity may legitimately establish another.

**Must NOT mean:**

- make important / MustDo / prioritize
- notify everywhere / guarantee perception / alarm
- acknowledge
- infer a useful reminder time
- let Orient or an agent choose when to interrupt
- create delivery/channel policy
- parse Note prose for reminder intent
- turn external observation into authority without grant

Additional exclusions: not Capacity utilization; not Active Thread Start; not proof the human acted.

---

## 9. Relative vs absolute authority

| Form | Status |
| --- | --- |
| **A. Relative** — source temporal fact ± deterministic offset | **Accepted today** (lead before Commitment start) |
| **B. Absolute** — standalone timestamp chosen by Tyson | **Not modeled**; distinct authority form |
| **C. Both, semantically distinct** | Cleanest long-term reading |

**“Reach me about this Task tomorrow at 2:30”:**

- If 2:30 **is** (or becomes) Task `planned_local` on that date → relative (or at-point) grant against **Task clock-point intention**.
- If 2:30 is interrupt time **without** claiming plan intention → Pulse source is a **newly established temporal relationship about the Task**, not “the Task” as if it already owned that clock.

Do not treat an arbitrary timestamp attached to any object as equivalent to a relationship with that object’s existing temporal truth.

---

## 10. Edits / identity

Commitment pattern already solves relative supersession without rewriting occurrence history:

- Grant addresses source UUID + transition + lead.
- Occurrence identity fingerprints **current** start at establishment.
- Moving start → new fingerprint can become due under same active grant.
- Delete source → CASCADE removes grant; occurrence `grant_id` set null.
- Revoke → no future establishment.

Generalized sources with the same civil+local fingerprint shape can reuse this pattern. A separate “source-temporal-version” entity is **not required** for the first isomorphic generalization. Absolute authority forms or external identities may need stronger versioning later — unresolved, not blocking Block-start.

Task completion / clearing `planned_local` / reclassification: eligibility rules must be explicit before Task grants ship (open question).

---

## 11. One-shot vs recurring

Initial generalization should remain:

```text
ONE explicit grant → ONE deterministic occurrence identity
```

even when the source concept is recurring. Domain ownership of recurrence stays outside Pulse. Prefer attaching grants to **materialized** occurrence Tasks (or other established instances), not to cadence definitions as a recurring notifier.

---

## 12. Agent boundary

Architecture / DOMAIN: agent/interpretation may propose structure; human establishes meaning. Agent may later **surface** a possible grant. Tyson must explicitly establish Interrupt Grant. Evaluator stays deterministic. Agent must not choose hidden thresholds or transform importance into interruption authority.

---

## 13. Delivery separation

Confirmed. Authority = may this temporal relationship produce a Pulse? Delivery = where/how an already-established Pulse seeks perception. Phone/watch routing, haptics, copy, FCM, face — out of scope here.

---

## 14. Smallest recommended first generalization

**Timed Block start with relative positive lead before start.**

Why:

- Strong existing temporal truth (same timed local start model as Commitment)
- Minimal new semantics (isomorphic to accepted Commitment-start)
- Preserves human authority (explicit grant; Block creation alone never interrupts)
- Exercises generalized `source_kind` without opening recurrence, external reconciliation, completion rules, or absolute timestamps
- Can reuse proven phone/watch delivery path once occurrence exists
- Avoids Task clock-point’s separate reminder-vs-plan distinction and completion eligibility decisions
- Avoids Protected Time’s exclusion-nuance as the first proof

Not chosen: exact-clock Task (also Class A, but more semantic surface); Commitment end; external; stewardship cadence.

---

## 15. Schema evolution assessment

For timed Block start:

**B — bounded extension to existing `pulse_interrupt_grants`.**

Widen `source_kind` / ownership validation (Commitment-only FK cannot remain the sole same-owner path); keep relative lead + transition `start`; extend domain types/evaluator/hosted function in kind-dispatched branches. Not a greenfield authority entity.

**`pulse_occurrences`:** uniqueness `(grant_id, source_starts_on, source_start_local)` can remain for start-fingerprint sources. Likely **no identity-model change** for Block start. `source_kind` CHECK would widen.

---

## 16. UI consequence discovery (no design)

Interaction grammar: *Touch time to talk about time. Touch established truth to talk about that truth.* ([direct-time-selection](../decisions/2026-10-02-direct-time-selection.md))

For first Block generalization:

| Question | Answer |
| --- | --- |
| What Tyson touches | The established timed Block (truth), not empty time |
| What Orient exposes | Block purpose/bounds; whether an active start grant exists |
| Deterministic truthful choices | Bounded lead-before-start options (same spirit as Commitment); establish / revoke |
| Must NOT offer | Invented clocks for all-day Blocks; end-as-start; MustDo; delivery/channel picks; inferred “useful” times; agent-chosen thresholds |
| Grant visibility/revocation | Parallel to Commitment: inspectable active grant + explicit revoke (“Don’t remind me” / Reach-me revoke language later) |

---

## 17. Major risks

- Collapsing plan intention (`planned_local`) with Interrupt Grant
- Inventing clocks for date-only facts
- Treating MustDo / importance / external observation as authority
- Building a recurring notification engine inside Pulse
- Offering Commitment/Block **end** because `end_local` exists
- Silent stale grants after completion/clear without eligibility rules
- Mixing delivery routing into authority work
- Polymorphic FK mistakes weakening same-owner integrity

## 18. Open semantic questions

1. Should lead = 0 (“at start” / “at planned clock”) become a first-class relationship, or stay positive-lead-only?
2. Absolute authority form entity vs Task clock-point establishment for “about this Task at T”?
3. Completed / cleared-clock Task grant eligibility?
4. Protected Time start in product UI — offer or withhold despite Class A?
5. External grant only after removal-reconciliation maturity?
6. Whether occurrence identity columns should eventually rename from Commitment-start vocabulary when more transitions exist?

---

## 19. Verdict

**ORIENT-PULSE-GENERAL-AUTHORITY-MODEL-CLEAR**

The general grammar holds; Commitment-start is a bounded instance; inventory and Class A/B/C/D classifications are evidence-backed; smallest next source relationship is timed Block start with relative lead; schema path is bounded extension; delivery remains separate. Open questions are scoped and do not block model clarity.

---

## 20. Mutation ledger (this discovery)

| Concern | Result |
| --- | --- |
| Runtime source mutation | No |
| Schema mutation | No |
| Device mutation | No |
| Hosted mutation | No |
| Commit | No |
| Push | No |
| Discovery document | This file |
