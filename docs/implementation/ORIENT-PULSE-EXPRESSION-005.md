# ORIENT-PULSE-EXPRESSION-005

## Arrival authority implementation design

**Design + documentation publication (005A).** No implementation. No migration SQL written. No schema/runtime/UI/Android/Wear/production mutation. No ARRIVAL haptic morphology. No numeric expression-eligibility duration chosen.

**Baseline verified:** `c76a97b8443338628c17df9a79ae56bf5eb8dca7`  
(`HEAD` = `origin/main` at design inspection; published as ORIENT-PULSE-EXPRESSION-005A.)

**Canonical project:** `ksmhgaamyheyhefbyglb` (Orient). Wealth Engine untouched.

**Prior accepted state:** `ORIENT-PULSE-AUTHORIZED-TEMPORAL-RELATIONSHIPS-PUBLISHED`  
([EXPRESSION-004](ORIENT-PULSE-EXPRESSION-004.md); timeliness [EXPRESSION-003](ORIENT-PULSE-EXPRESSION-003.md)).

**Design verdict:** `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-CLEAR`  
**Publication verdict:** `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED`

---

## 0. Published design acceptance (005A)

### Accepted representation

| Concern | Accepted design |
| --- | --- |
| Grant column | `relationship` — `text` + CHECK |
| Values | `relative_before`, `arrival` |
| Lead | nullable; relative_before → NOT NULL and `> 0`; arrival → IS NULL |
| Active uniqueness | includes `relationship` |
| Occurrence | `relationship` provenance survives `grant_id` NULL; uniqueness remains grant/fingerprint |
| Existing rows | backfill **only** to `relative_before`; never acquire arrival |
| Evaluator | one hosted; relative_before `T − L`; arrival `T`; truth ≠ expression eligibility |
| Transport | FCM + Wear remain occurrence-id-only; reread for authority; dispatcher not sole eligibility owner |
| Lifecycle/security | LIFECYCLE-003 preserved; no authenticated grant DELETE; no RLS weakening; no native service-role; no source-specific ARRIVAL categories |

### ARRIVAL silence gate

ARRIVAL runtime semantics may exist before ARRIVAL earns a physical pronunciation. Until a physical word is separately accepted: never reuse relative_before haptic; physical expression fail/suppress closed; unknown relationships fail closed; durable occurrence truth may still exist.

### Canonical implementation order (corrected)

```text
005-I   SCHEMA / PROVENANCE / EVALUATOR FOUNDATION
005-II  NATIVE RELATIONSHIP-AWARE SILENCE GATE
005-III HUMAN ARRIVAL AUTHORITY SURFACE
005-IV  ARRIVAL EXPRESSION ELIGIBILITY + PHYSICAL MORPHOLOGY
```

**Reason:** ARRIVAL must not become human-creatable while deployed physical edges would interpret it using the existing relative_before pronunciation. Infrastructure may understand ARRIVAL before Tyson can grant it; native edges must deliberately silence ARRIVAL before the human authority surface is enabled.

**Do not expose ARRIVAL authority in production before the native silence gate is deployed and accepted.**

---

## 1. Purpose

Design the smallest safe evolution from the accepted production Pulse authority model (single implicit relationship) to explicit authorized temporal relationships supporting:

```text
relative_before
arrival
```

Preserve all accepted production behavior and evidence while making ARRIVAL implementable.

---

## 2. Exact affected-contract inventory

### Migrations (production history)

| Migration | Role |
| --- | --- |
| `20261008230000_pulse_commitment_start.sql` | Creates grants/occurrences; `lead > 0`; one-active index; RLS; realtime |
| `20261008240000_pulse_hosted_establishment.sql` | Hosted evaluator + cron |
| `20261010093000_pulse_block_start_authority.sql` | Block source_kind; timed-source trigger; cascade cleanup (later DEFINER) |
| `20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql` | Evaluator PL/pgSQL name fix |
| `20261010170000_pulse_interrupt_grants_source_delete_authority.sql` | SECURITY DEFINER cascade |

### Domain / persistence / UI

| Contract | Path / symbols |
| --- | --- |
| Domain types + evaluators | `domain/pulse.ts` — `InterruptGrant`, `PulseOccurrence`, lead validators, condition/threshold helpers |
| Persistence | `persistence/pulse.ts` — `establish*InterruptGrant`, `revokeInterruptGrant`, `load*`, `upsertPulseOccurrence`, column lists |
| UI | `CommitmentPulseAuthority.tsx`, `BlockPulseAuthority.tsx`, `Surfaces.tsx` (one active grant find), `OrientInstrument.tsx`, `types.ts` |
| Expression (web) | `PulseExpression.tsx`, `pulseOccurrenceStillBeforeStart` |

### Hosted / cleanup / dispatch

| Contract | Symbols |
| --- | --- |
| Evaluator | `establish_due_commitment_start_pulse_occurrences`, `run_pulse_hosted_establishment`, cron `orient-pulse-hosted-establishment` |
| Insert validation | `pulse_interrupt_grant_requires_timed_source` |
| Cleanup | `pulse_interrupt_grants_cascade_source_delete` + commitment/block AFTER DELETE triggers |
| Dispatch | `app/api/pulse/dispatch/route.ts`, `server/pulseDispatch/*` — occurrence `id, user_id` only; FCM `{pulse_occurrence_id}` |

### Native

| Contract | Behavior |
| --- | --- |
| Phone | FCM id → WorkManager → JWT reread **`id` only** → claim → notify/haptic → Wear forward |
| Wear | MessageClient id only → claim → NotificationManager; no Supabase |

### Realtime / tests

| Contract | Notes |
| --- | --- |
| Realtime | Both tables published; `canonicalCoherence.ts` reread bindings |
| Tests | `domain/pulse*.ts`, `persistence/pulse.test.ts`, pg regression shells, component pulse tests, dispatch tests, Kotlin perception/Wear contract tests |

### Lead-change today

**Revoke + establish** (no UPDATE of `lead_offset_seconds`). Privileges: `UPDATE(revoked_at)` only. Preserve this semantics.

---

## 3. Grant schema evolution (conceptual — no SQL)

### Proposed relationship column

| Decision | Value |
| --- | --- |
| Column name | **`relationship`** |
| DB type | `text not null` (after backfill) |
| Constraint | CHECK `relationship in ('relative_before', 'arrival')` |
| Enum infrastructure | **Not used** — matches `source_kind` / `transition_kind` repository convention |

### Lead nullability + compound invariant

| Decision | Value |
| --- | --- |
| `lead_offset_seconds` | **nullable** |
| Invariant | `relative_before` → `lead_offset_seconds IS NOT NULL AND lead_offset_seconds > 0` |
| Invariant | `arrival` → `lead_offset_seconds IS NULL` |
| Magic zero | **Forbidden** as ARRIVAL encoding |

Replace CHECK `pulse_interrupt_grants_lead_positive` with a relationship-aware CHECK (or equivalent trigger validation consistent with insert trigger).

### Preserved grant fields

`source_kind`, `source_id`, `transition_kind`, `relationship`, `lead_offset_seconds`, `established_at`, `revoked_at`, `user_id`, `id`.

---

## 4. Existing-grant migration strategy

All existing production grants are structurally `relative_before` (CHECK `lead > 0` since table birth; ARRIVAL never existed).

### Safe conceptual sequence

1. Add `relationship text` **nullable**, no default that invents ARRIVAL  
2. Backfill: `UPDATE … SET relationship = 'relative_before' WHERE relationship IS NULL` (all rows)  
3. Verify: zero nulls; zero non-`relative_before`; all `lead_offset_seconds > 0`  
4. `ALTER … SET NOT NULL` + CHECK known values  
5. Drop old `lead_offset_seconds > 0` / NOT NULL lead constraints as needed  
6. Add compound relationship/lead CHECK  
7. Drop `pulse_interrupt_grants_one_active_idx`; create new unique active index including `relationship`  
8. Update insert trigger to branch on relationship  
9. Update evaluator (same migration or immediately following — see §26)

### Guarantees

- No existing grant gains ARRIVAL  
- No active grant lost; no revoked grant reactivated  
- Timestamps / source refs unchanged  
- Accepted relative_before behavior preserved  

### Verification assertions

- Count grants = count `relationship = 'relative_before'`  
- No `arrival` rows after backfill  
- All relative_before leads `> 0`  
- Active uniqueness allows at most one active per `(user, source_kind, source_id, transition_kind, relationship)`  

---

## 5. Active-grant uniqueness

### Future unique identity

```text
UNIQUE (user_id, source_kind, source_id, transition_kind, relationship)
WHERE revoked_at IS NULL
```

Permits one active `relative_before` **and** one active `arrival` for the same source `start`. Prevents duplicate active grants for the same relationship.

### relative_before lead-change semantics

**Preserve revoke + establish** (current UI/runtime). Do not invent in-place lead mutation. Changing N = revoke old relative_before grant, establish new relative_before grant with new lead.

---

## 6. Occurrence relationship provenance

| Decision | Value |
| --- | --- |
| Column name | **`relationship`** |
| Type | `text not null` (after backfill) |
| CHECK | `in ('relative_before', 'arrival')` |
| Uniqueness | **Unchanged** — `(grant_id, source_starts_on, source_start_local)` remains sufficient because each relationship has its own `grant_id` |
| `grant_id ON DELETE SET NULL` | **Preserved** |
| Historical retention | **Preserved** |

### Backfill

All existing occurrences → `relative_before`.

**Evidence:** every occurrence was established under a grant that could only satisfy `lead_offset_seconds > 0`; ARRIVAL never existed. Optional corroboration: `threshold_at < source_start_at` for all historical rows.

No historical exception path identified from repository/schema history.

---

## 7. Historical occurrence truth

**Verified structurally: yes — all existing occurrences map truthfully to `relative_before`.**

No production ARRIVAL grants/occurrences have ever existed. Backfill is evidence-preserving, not reclassification.

---

## 8. Occurrence identity

| Concern | Design |
| --- | --- |
| Dual grants same start | Distinct `grant_id` ⇒ distinct uniqueness rows |
| Add relationship to uniqueness? | **No** — unnecessary redundancy |
| Provenance after grant deletion | `relationship` column retained when `grant_id` null |

Separate uniqueness from provenance.

---

## 9. Evaluator branching

One hosted evaluator remains authoritative (`establish_due_commitment_start_pulse_occurrences` / `run_pulse_hosted_establishment`).

| Relationship | Threshold | Due when |
| --- | --- | --- |
| `relative_before` | `T − lead` | `now >= threshold` (`eligible \| elapsed` as today) |
| `arrival` | `T` | `now >= T` (establishment due including late recovery) |

### Preserve

- Civil/timezone derivation unchanged  
- Live source reschedule follows current start  
- Satisfied when occurrence exists for grant + fingerprint  
- Duplicate evaluator ticks converge (upsert / existence skip)  
- No magic zero  

### Keep separate

Evaluator establishes **occurrence truth**.  
Expression eligibility decides **physical expressibility** ([EXPRESSION-003](ORIENT-PULSE-EXPRESSION-003.md)).

Do not encode physical freshness in the evaluator.

---

## 10. relative_before bit-for-bit preservation

Must remain unchanged for existing grants:

- Threshold = start − lead  
- Timezone/civil semantics  
- Evaluator states / due predicate  
- Occurrence creation + uniqueness  
- Rescheduling / revoke / source deletion  
- Hosted cron cadence  
- Dispatcher path  
- Phone + Watch expression for relative_before  

### Regression equivalence

Domain tests + pg evaluator regression + persistence privilege/uniqueness tests prove relative_before path identical after relationship becomes explicit (default `relative_before`).

---

## 11. ARRIVAL authority creation contract

Human meaning: **Reach me when this begins.**

Minimum authenticated establish:

- Explicit human act  
- Owned timed source  
- `transition_kind = start`  
- `relationship = arrival`  
- `lead_offset_seconds = NULL`  
- Independent of relative_before  
- No delivery surface / haptic / urgency / MustDo  

Domain/persistence APIs: e.g. `establishArrivalInterruptGrant({ sourceKind, sourceId, establishedAt })` (name flexible). UI: minimum interaction contract only — separate control from relative_before lead select.

---

## 12. ARRIVAL revocation contract

Human meaning: **Don't reach me when this begins.**

Soft-revoke ARRIVAL grant only (`UPDATE revoked_at`). Must not revoke relative_before. Reverse likewise. Preserve soft-revoke inspectability.

---

## 13. Source rescheduling

| Relationship | Before occurrence | Behavior |
| --- | --- | --- |
| `relative_before` | T1 → T2 | Follows live T2; threshold = T2 − lead |
| `arrival` | T1 → T2 | Follows live T2; threshold = T2 |

No new grant required for time change alone (current relative-grant semantics).

### Post-occurrence reschedule edge

**Document current accepted behavior:** fingerprints freeze at establishment; new civil identity may establish a new occurrence under the same grant; prior occurrence remains historical. No new ARRIVAL-specific policy invented. Flag for acceptance tests to reconfirm both relationships.

---

## 14. Source deletion lifecycle

LIFECYCLE-003 preserved:

```text
source DELETE → DEFINER cleanup removes ALL grants for (source_kind, source_id, user_id)
occurrences retained; grant_id SET NULL; relationship provenance retained
```

No authenticated grant DELETE. No ARRIVAL-specific cleanup path. No RLS weakening.

---

## 15. Security / RLS

| Path | Effect of design |
| --- | --- |
| Authenticated INSERT/UPDATE revoke | Same ownership; INSERT must include relationship; still no DELETE |
| DEFINER cleanup | Unchanged privilege shape; deletes all relationships for source |
| Hosted evaluator | Service role / DEFINER as today; relationship-aware thresholds |
| Dispatcher | Still cannot invent grants; id routing only |
| Native | JWT reread only; no grant-write; Watch no Supabase |

Relationship identity must not create privilege escalation.

---

## 16. Domain types

Narrow closed identity:

```text
type PulseRelationship = "relative_before" | "arrival"
```

Live on: grant rows, occurrence rows, domain types, evaluator inputs, native reread DTOs.

Do not create a rules DSL. Keep DB tokens out of human UI copy (“Reach me when this begins”).

---

## 17. Dispatcher design

**Selected: A** — keep dispatcher transport unchanged; FCM carries occurrence id only; authoritative native/web reread obtains relationship + `T`.

Optional later: B dispatcher stale pre-filter — optimization only, never sole eligibility owner ([EXPRESSION-003](ORIENT-PULSE-EXPRESSION-003.md)).

---

## 18. Phone authoritative reread

Preserve trust model: FCM id → JWT reread authoritative fields.

**Minimum future Visible read for expression-capable relationships:**

- `id`  
- `relationship`  
- `source_start_at` (authoritative `T`)  

Optional: `threshold_at` for diagnostics. Never treat push payload as authority.

For first ARRIVAL tranche with physical pronunciation **disabled**, reread may still load relationship to fail-closed suppress ARRIVAL expression while allowing relative_before unchanged.

---

## 19. Wear transport

**Strong preference preserved:** occurrence-id-only MessageClient payload.

Watch must not gain Supabase/service-role authority.

### Minimum eligibility path without inventing Wear authority

1. Phone evaluates shared eligibility (and ARRIVAL pronunciation gate) **before** claim/express/forward.  
2. Phone must **not** forward ARRIVAL while physical pronunciation is disabled.  
3. When morphology later accepted: phone forwards only after eligibility pass; Watch may re-check if/when it has trusted fields — first morphology tranche must solve Watch inputs (e.g. phone attaches non-authoritative hint only if reread-confirmed, or Watch receives expanded trusted path without service role).  

For **first implementation** (ARRIVAL speech disabled): Wear path unchanged for relative_before; ARRIVAL never forwarded.

---

## 20. Shared expression eligibility policy placement

Do **not** choose numeric duration now.

### Placement design

| Layer | Role |
| --- | --- |
| Canonical definition | TypeScript domain module (single source of policy function signature + future duration constant) |
| Kotlin | Mirror with **contract tests** asserting identical rule inputs/outputs against TS fixtures (repository-appropriate across language boundary) |
| Dispatcher | Optional pre-filter calling same rule later — not sole authority |
| Surfaces | Evaluate at expression time with authoritative `T` + `now` |

Until duration accepted: policy function returns **ineligible for physical ARRIVAL pronunciation** (hard suppress), while occurrence truth remains establishable.

---

## 21. Claim ordering

Inspected current order: reread → claim → express → (phone) forward.

### Required future order

```text
authoritative reread
→ relationship validation (fail closed if unknown)
→ expression eligibility (+ pronunciation-enabled gate)
→ atomic claim/consume when decision is terminal for this surface
→ express if eligible and pronunciation enabled
```

| Case | Claim? |
| --- | --- |
| Transient reread failure | **No** — retry (existing max attempts) |
| Unknown/invalid relationship | **No express**; fail closed; do not teach wrong word |
| Deterministic stale / pronunciation-disabled suppress | **Consume opportunity** (no later replay) — aligns EXPRESSION-003 |
| Already claimed | Silent |
| Eligible + pronunciation enabled | Claim then express |

Separate validation failure vs stale suppress vs successful expression in traces.

---

## 22. ARRIVAL without second haptic

**Yes — ARRIVAL runtime/authority may exist before a second haptic word.**

### How physical pronunciation stays disabled

| Gate | Behavior |
| --- | --- |
| `relationship = arrival` | Occurrence may establish; web may show inspectable evidence if desired |
| Physical phone/Wear ARRIVAL expression | **Hard-disabled** until morphology + eligibility duration accepted |
| `relative_before` | Continues existing notification-class haptic (unchanged word) |

**Critical:** ARRIVAL must **not** reuse relative_before’s haptic path — that would teach the wrong word. Suppression must be relationship-aware, not “generic Pulse express.”

Acceptance boundary A–D can close without E (morphology).

---

## 23. Physical acceptance staging (canonical)

Preserve: implement → automated validation → review → commit/push candidate → apply migration → deploy/install → physical acceptance → finalize docs.

| Stage | Acceptance |
| --- | --- |
| **A** | Schema/authority representation coexistence |
| **B** | Existing relative_before regression |
| **C** | Controlled ARRIVAL occurrence establishment |
| **D** | Native ARRIVAL recognition + deliberate silence |
| **E** | Human ARRIVAL authority creation |
| **F** | ARRIVAL expression eligibility |
| **G** | Second-word physical morphology |

Do not collapse semantic/runtime acceptance into physical-language acceptance. Morphology (G) is not required for 005-I through 005-III.

---

## 24. PostgreSQL regression plan

Executable cases required before migration trust:

1. Existing relative_before grant semantics preserved  
2. Existing grants backfill to `relative_before` only  
3. relative_before requires positive lead  
4. arrival rejects non-null lead  
5. relative_before + arrival coexist on same source/start  
6. Duplicate active relative_before rejected  
7. Duplicate active arrival rejected  
8. Independent revoke  
9. Cross-user isolation  
10. Source rescheduling both relationships  
11. Source deletion removes both grants  
12. Historical occurrences retained  
13. Occurrence relationship retained after grant deletion  
14. Authenticated grant DELETE remains forbidden  
15. Evaluator threshold relative_before = T − L  
16. Evaluator threshold arrival = T  
17. Duplicate evaluator execution converges  
18. No existing row gains ARRIVAL after backfill  

---

## 25. Application / native test plan

- Domain parse of relationship identity  
- Human grant creation contracts (both relationships)  
- Independent revoke  
- Existing Reach-me / Remind-me relative_before unchanged  
- Occurrence authoritative reread fields  
- ARRIVAL parsing + fail-closed unknown relationship  
- Pronunciation-disabled / stale suppression  
- Claim ordering (transient vs terminal suppress)  
- Phone/Watch same-policy contract fixtures (when eligibility duration exists)  
- Occurrence-id-only transport preserved  

---

## 26. Migration / runtime rollout order (canonical)

Aligned to corrected tranche order (§0 / §29):

| Step | Tranche | What |
| --- | --- | --- |
| 1 | **005-I** | Schema/provenance/evaluator foundation; domain/persistence types for schema; relative_before path explicit; **no ARRIVAL UI**; ARRIVAL not human-creatable in production |
| 2 | **005-II** | Native relationship-aware silence gate (phone/Wear recognize ARRIVAL and suppress; relative_before haptic unchanged) |
| 3 | **005-III** | Human ARRIVAL authority surface (Reach me when this begins / revoke) — only after 005-II accepted |
| 4 | **005-IV** | Expression eligibility duration + physical morphology |

### Backward compatibility

- Temporary `DEFAULT 'relative_before'` on grant insert may aid cutover; never invent arrival.  
- Web deploy for relative_before explicit writes should accompany 005-I.  
- Controlled ARRIVAL establishment for regression/acceptance may use non-UI paths under test — not normal production UI.  
- Future implementation must inspect exact production migration state before writing SQL.  

No production migration is authorized by this publication tranche.

---

## 27. Failure / correction strategy

| Failure mode | Detection | Correction |
| --- | --- | --- |
| Uniqueness conflict | Insert errors; coexistence tests fail | Forward fix index definition |
| Constraint/backfill failure | Migration abort; verify counts | Fix forward migration; do not destructive rollback |
| Evaluator ambiguity | Cron errors (AUTHORITY-004 class) | Forward SQL repair |
| Old-client incompatibility | Establish failures / missing column | Deploy web with M1; temporary DEFAULT relative_before |
| Native unknown relationship | Fail-closed suppress / crash | N1 fail-closed; never express unknown as relative_before |
| Provenance mismatch | Occurrence relationship null/wrong | Forward backfill/repair |
| Source cleanup regression | 42501 or leftover grants | LIFECYCLE regression shell; forward DEFINER fix |

Prefer **forward-only** correction after production migration. Destructive rollback unsafe once dual grants/occurrences exist.

---

## 28. Is numeric ARRIVAL eligibility blocking?

**No.**

Authority/schema/evaluator/occurrence implementation can proceed safely **before** choosing exact ARRIVAL physical-expression eligibility duration.

**Design:** ARRIVAL physical pronunciation remains **disabled** until eligibility duration **and** morphology are accepted. Occurrence truth and Interrupt Grant form do not depend on the numeric window.

Do not invent a number to unblock implementation.

---

## 29. Canonical implementation tranches

| Tranche | Name | Scope | Must NOT | Acceptance |
| --- | --- | --- | --- | --- |
| **005-I** | ARRIVAL RELATIONSHIP FOUNDATION | Grant/occurrence `relationship`; evidence-preserving backfill to relative_before; relationship/lead constraints; active uniqueness; hosted evaluator branching; domain/persistence types for schema/evaluator; source cleanup compatibility; PostgreSQL + relative_before app regressions | Expose ARRIVAL UI; create ARRIVAL via normal production UI; change phone/Watch pronunciation; teach second haptic; choose numeric eligibility; enable stale ARRIVAL speech; add delivery-surface selection; weaken RLS/lifecycle | A + B (+ controlled C under regression, not human-grantable) |
| **005-II** | NATIVE RELATIONSHIP-AWARE SILENCE GATE | Phone/Wear recognize `arrival` / unknown; deliberate silence; relative_before haptic unchanged | Human ARRIVAL UI; morphology; numeric eligibility | D |
| **005-III** | HUMAN ARRIVAL AUTHORITY SURFACE | Reach me when this begins / revoke; independent of relative_before | Morphology; enabling wrong haptic | E |
| **005-IV** | ELIGIBILITY + PHYSICAL MORPHOLOGY | Shared eligibility duration + second-word morphology | — | F + G |

**Next implementation tranche:** **005-I** only — after explicit implementation authorization.

After 005-I, ARRIVAL remains **unavailable** as normal human-grantable production authority.

### 005-I migration safety requirement

Future implementation must inspect exact current production migration state before writing SQL. Migration must be forward-safe and evidence-preserving. Required proof includes: existing grants/occurrences backfilled only to relative_before; no ARRIVAL authority created by migration; relative_before threshold preserved; active relative_before preserved; revoked remain revoked; source cleanup accepted; occurrence `grant_id` SET NULL lifecycle accepted; authenticated grant DELETE forbidden; Commitment/Block source-independent; duplicate evaluator converges; arrival branch can establish correct occurrence truth under controlled regression **without** making ARRIVAL human-creatable.

---

## 30. Durable implementation invariants

### Canonized

1. Existing authority must never silently expand.  
2. Existing occurrences must never silently acquire ARRIVAL meaning.  
3. Relationship identity originates at grant time.  
4. Occurrence preserves relationship provenance independently of grant survival.  
5. One grant authorizes one relationship.  
6. One evaluator establishes all accepted Pulse temporal relationships.  
7. Expression eligibility cannot create or erase occurrence truth.  
8. Push transport carries occurrence identity, not authority.  
9. Native surfaces re-read authoritative/trusted truth before expression.  
10. Unknown relationship identities fail closed.  
11. Stale deterministic suppression consumes the local expression opportunity.  
12. A new semantic relationship may exist before it earns a physical pronunciation.  
13. **Human authority for a new relationship must not be exposed before deployed perception edges can safely interpret or suppress it.**  

### Rejected / deferred

| Choice | Disposition |
| --- | --- |
| Magic zero / NULL-as-identity | Rejected |
| Relationship in occurrence uniqueness | Rejected (unnecessary) |
| Dispatcher as sole eligibility owner | Rejected |
| ARRIVAL reusing relative_before haptic | Rejected |
| Human ARRIVAL UI before native silence gate | Rejected |
| Numeric eligibility duration in 005-I | Deferred (not blocking) |
| Haptic morphology in 005-I–III | Deferred |
| Wear Supabase authority | Rejected |
| Generic rules engine | Rejected |

---

## 31. Open questions

1. Temporary DEFAULT `'relative_before'` on grant insert during 005-I cutover — keep or drop after?  
2. Exact ARRIVAL UI copy placement (005-III)  
3. Whether web in-app should show ARRIVAL occurrence evidence while pronunciation disabled  
4. Watch eligibility input path for 005-IV  
5. Numeric eligibility duration (005-IV)  

---

## 32. Recommended immediate next action

Authorize **ORIENT-PULSE-EXPRESSION-005-I** (schema/provenance/evaluator foundation) when ready to implement — still no ARRIVAL UI; still no native pronunciation change; still no haptic morphology; still no numeric eligibility duration.

---

## 33. Documentation / mutation boundary

| Action | Done? |
| --- | --- |
| Create design record | Yes |
| Publish design (005A) with corrected order | Yes |
| Write migration SQL / change runtime | **No** |
| Choose numeric eligibility / haptic | **No** |

---

## 34. Final verdict

**Design:** `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-CLEAR`  
**Publication:** `ORIENT-PULSE-ARRIVAL-IMPLEMENTATION-DESIGN-PUBLISHED`

Canonical order: 005-I foundation → 005-II native silence → 005-III human ARRIVAL authority → 005-IV eligibility + morphology. ARRIVAL must not become human-creatable until native edges can deliberately silence it. relative_before remains the only production-grantable relationship through 005-I.
