# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-047

Independent security audit, architectural verification, and deployment-readiness assessment of the RELEASE-046 local unattended observation pathway. Written 2026-11-04 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_045.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_045.md), [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_046.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_046.md), and the standing-execution lineage through RELEASE-044.

Read-only inspection, local non-mutating verification, and documentation only. **No** source-code edits, test modifications, SQL migrations, route mounting, `vercel.json` changes, scheduler creation, cron activation, production deployment, environment-variable changes, standing-policy approval, execution-gate activation, pull-flag activation, production inspection RPC invocation, opportunity claims, attempt marking, Floor Command GET, observation creation, temporal mutation, or automatic notifications.

**PASS** for local unattended architecture safety under the stated acceptance criteria, with documented High readiness gaps that block dark mount / scheduler activation until separately authorized local hardening.

**GO** to accept this audit and to request a later **local hardening / packaging** tranche before any dormant evaluate-route deploy.

**NO-GO** from this record to mount the evaluate route, deploy it dark, configure/activate cron, enable the gate, approve grants, or contact Floor Command.

Labels:

| Label | Meaning |
| --- | --- |
| Verified | Confirmed this tranche by source inspection, local commands, or read-only HTTP |
| Historical | Cited from prior release records |
| Assumption | Not independently re-verified this tranche |
| Gap | Incomplete test or evidence surface |
| Recommendation | Architectural advice; not an implementation authorization |

---

## 1. Executive summary

RELEASE-046’s local unattended pathway preserves the RELEASE-045 authorization boundaries: **scheduler credential = wake identity only**; observation authority remains the conjunctive DB chain (gate → sole approved fixed-scope policy → frozen window → claim → revalidate → Window-A attempt mark → governed open → injected adapter → commit → link). The HTTP handler remains unmounted. Fake-source containment holds. Critical safety tests pass. Production evaluate/execute paths still return **404**.

Two **High** readiness findings block treating the pathway as deployment-ready without further local work:

1. **R047-H1 — Production inspect clock misuse.** Unattended discovery always passes a non-null `p_as_of` (wall-clock ISO) into `inspect_floor_command_standing_opportunity`. Without `orient.standing_claim_test_hooks=1`, the claim clock returns `as_of_forbidden`, which maps to `unavailable`. The path **fails closed** (safe) but would never reach `eligible_now` in production until fixed. Unit tests inject discovery and therefore do not catch this.
2. **R047-H2 — Vercel Cron platform mismatch.** Platform-verified behavior sends `Authorization: Bearer $CRON_SECRET` on **GET** cron invocations. The handler requires **POST** and authenticates only `X-Orient-Floor-Command-Standing-Cron-Secret` vs `ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET`. As designed, native Vercel Cron would not authenticate successfully even if a route were mounted later.

Additional High packaging gap: the standing executor, fake/unattended modules, and claim/link migration files remain **untracked** in git; deploying the current committed HEAD cannot expose evaluate, but also cannot ship the pathway.

**Verdict distinction:** local architecture safety **PASS**; deployment-preparation readiness **NO-GO** until remediations land in a separately authorized tranche.

---

## 2. Canonical references reviewed

| Artifact | Role in this audit |
| --- | --- |
| RELEASE-022 | Standing continuity design; grant ≠ observation |
| RELEASE-028 | Conjunctive authority; claim before GET; gate ≠ pull flag |
| RELEASE-029 | Durable opportunity claims; gate default off |
| RELEASE-032 | Operator standing execution sequence discovery |
| RELEASE-033 | Fake-source standing execution core |
| RELEASE-036 | Execution-boundary readiness; inspect vs execute |
| RELEASE-037 / 039R | Window-A attempt reauth + hosted inspect RPC |
| RELEASE-040–044 | Inspect API/UI dark deploy; production baseline |
| RELEASE-045 | Unattended architecture contract (Verified against code) |
| RELEASE-046 | Local unattended implementation record (Verified against code; discrepancies noted) |

Documentation was treated as prior decisions, not proof. Source, SQL, tests, build route table, and read-only production HTTP were authoritative.

---

## 3. Repository and commit identity

| Fact | Value | Class |
| --- | --- | --- |
| Repository | `/Users/silentsage/Desktop/workday` → `SilentSage432/workday` | Verified |
| Local HEAD | `0ceeda2` — “Record RELEASE-044 controlled inspection production deploy.” | Verified |
| Branch | `main` ahead of `origin/main` by 1 (docs commit) | Verified |
| Production app commit (Historical + alias) | `f96b8c0` / `dpl_6oSj4RN6gaBSsgNtNre23nFb7qEG` | Historical (044/045); evaluate/execute 404 re-Verified |
| Production alias | `https://orient-cyan.vercel.app` | Verified (HTTP) |
| `vercel.json` | Absent | Verified |
| App Router evaluate | Absent under `standing-opportunity/` (inspect only) | Verified |
| Unattended / executor modules | Present on disk; **untracked** | Verified |
| Claim/link SQL files | Present on disk; **untracked** (hosted historically; files not in git) | Verified |
| Inspect/Window-A migration | `20261104180000` tracked | Verified |

No production mutations. No production inspect RPC with valid credentials.

---

## 4. Unattended call graph

```
[Future] Vercel Cron / operator curl
   │
   ▼
handleStandingOpportunityEvaluatePost          standingUnattendedEvaluateRoute.ts
   │  method === POST else 405
   │  verifyStandingSchedulerCredential        standingUnattendedAuth.ts
   │     readStandingCronSecret                standingUnattendedConfig.ts
   │     secretsMatch (SHA-256 + timingSafeEqual)  server/pulseDispatch/auth.ts
   │  readEvaluateBody — empty or {action:evaluate_standing_opportunity} only
   │  require injected StandingSourceAdapter else 503 adapter_required
   ▼
evaluateStandingOpportunityUnattended          standingUnattendedEvaluate.ts
   │  discoverStandingEligibility              standingUnattendedEligibility.ts
   │     floor_command_standing_execution_gate_is_open
   │     list approved fixed-scope policies (2587 / source / purpose)
   │        0 → no_approved_policy; >1 → policy_conflict
   │     load frozen windows from latest approved event
   │     selectOpenStandingWindows             standingUnattendedWindows.ts
   │     inspect_floor_command_standing_opportunity  (advisory)
   │  if eligible →
   ▼
executeStandingFloorCommandObservationForOperator  standingExecution.ts
   │  claim_floor_command_standing_opportunity
   │  revalidate_floor_command_standing_opportunity_claim
   │  record_floor_command_standing_opportunity_source_attempt  (Window-A)
   │  open_floor_command_governed_observation
   │  StandingSourceAdapter(...)               injected; fake in tests
   │  commit_floor_command_governed_observation
   │  link_floor_command_standing_opportunity_observation
   ▼
mapExecutionResult → StandingUnattendedEvaluateResult (observed true only on success class)
```

**Verified:** No alternate App Router import of evaluate/execute. Operator path still requires session + confirmation echo via `executeStandingFloorCommandObservation`; unattended path never uses confirmation echo and never registers a route.

---

## 5. Scheduler authentication findings

| Check | Result | Evidence |
| --- | --- | --- |
| Missing header | 401 `unauthorized` | `standingUnattendedEvaluate.test.ts` |
| Wrong secret | 401 | same |
| Secret unconfigured / empty | 503 `unconfigured` (fail closed) | `readStandingCronSecret` + test |
| Correct fake secret | Proceeds to adapter requirement | test |
| Unsupported method | 405 | test |
| Bearer without cron header | 401 | test — operator JWT cannot substitute |
| Constant-time compare | SHA-256 digests + `timingSafeEqual` | `secretsMatch` |
| Caller-supplied policy/week/URLs | 400 `forbidden_field` | body allowlist |
| Credential ≠ observation authority | Gate/policy/claim/attempt still decide | call graph |
| Secret redaction in responses | Auth responses expose status only; `detail` stripped from evaluate JSON | `redactEvaluateResult` |
| Vercel Cron native auth | **Not compatible as implemented** | Platform docs: `Authorization: Bearer $CRON_SECRET` on GET |

**Distinction:** Local fail-closed secret auth is Verified. Equivalence to Vercel’s managed cron credential delivery is **not** Verified and is currently mismatched (R047-H2). A valid scheduler secret must never, and does not, substitute for a standing policy.

---

## 6. Independent execution-gate findings

| Check | Result |
| --- | --- |
| Gate independent of scheduler auth | Verified — auth then eligibility; gate RPC first in discovery |
| Gate independent of inspection UI | Verified — no Standing Coordination import |
| Gate independent of pull flag | Verified — no `ORIENT_FLOOR_COMMAND_PULL_ENABLED` read on unattended/execution path |
| Gate independent of adapter | Verified — gate checked before execute/adapter |
| Gate independent of policy approval | Verified — SQL gate table separate; attempt re-locks gate |
| Checked before durable claim | Verified — `discoverStandingEligibility` returns `gate_disabled` before execute |
| Rechecked at attempt mark | Verified — `record_*_source_attempt` locks gate `FOR UPDATE` and refuses if disabled |
| Env vs DB inconsistency | App has no standing-execution env enable; DB gate is authoritative (Verified). Pull flag is orthogonal. |

A scheduler request with a valid secret and disabled gate cannot authorize a source attempt: discovery no-ops, and even if discovery were bypassed, claim/attempt SQL still refuse.

---

## 7. Sole-policy selection findings

`discoverStandingEligibility`:

1. Requires gate open.
2. Lists `state=approved`, store `2587`, fixed source/purpose, `revoked_at IS NULL`, then filters effective interval at `asOfIso` in TypeScript.
3. `0` → `no_approved_policy`; `>1` → `policy_conflict` (no arbitrary pick) — Verified in unit tests.
4. Loads frozen windows from latest `approved` policy event; selects open half-open intervals; prefers `publication_opportunity`.
5. Calls inspect RPC; maps statuses; only `eligible_now` proceeds.

| Scenario | Behavior | Class |
| --- | --- | --- |
| Zero grants | `no_approved_policy` | Verified (unit) |
| One valid grant | Continues to windows/inspect | Verified (code) |
| Multiple grants | `policy_conflict` | Verified (unit) |
| Revoked / expired / wrong scope | Filtered or inspect-mapped | Verified (code + inspect SQL) |
| Stale eligibility | Inspect advisory; claim/attempt authoritative | Verified |
| Conflicting open weeks | `unavailable` / `multiple_open_weeks` | Verified (code) |

**Advisory vs authority:** Inspect output is not treated as a reservation. Execute still claims. Residual: production non-null `p_as_of` prevents `eligible_now` (R047-H1).

---

## 8. Operational-week and timezone findings

| Topic | Finding |
| --- | --- |
| Week identity | From SQL-frozen window JSON (`operational_week`), not caller fields | Verified |
| Open | Sunday 12:00 UTC (Historical SQL; TS selects bounds) |
| Close | Next local midnight `America/Boise` (Historical SQL; MST/MDT close offsets tested in TS) |
| DST | Window unit tests cover MST vs MDT close UTC offsets | Verified |
| Duplicate wakes in-window | Same open set; at-most-once via claim uniqueness | Verified (unit + SQL design) |
| Missed wakes | After `closes_at` → expired/unavailable; `automatic_retry_limit = 0` | Historical + code |
| Vercel schedule expressibility | Prefer frequent wakes across `[opens_at, closes_at)`; exact plan limits **Assumption** pending ops confirmation | Recommendation |

No schedule was created or activated.

---

## 9. Claim and attempt transaction findings

Existing core reused exclusively via `executeStandingFloorCommandObservationForOperator` → `runStandingSequence`.

| Invariant | Status |
| --- | --- |
| Unique `(policy_id, operational_week, opportunity_kind)` | Verified in SQL |
| Write-once `source_attempted_at` + trigger freeze | Verified in SQL |
| Window-A lock order claim → policy → gate with live reauth | Verified in `20261104180000` |
| No second source attempt after mark | Verified (SQL + mapping tests) |
| Unattended introduces new race? | No new DB race found; same residual post-attempt revoke window as operator path | Verified |
| Unattended concurrency unit test | Maps claim race with mocked `execute` — does **not** replace ephemeral SQL concurrency proofs | Gap |

---

## 10. Dispatch ambiguity analysis

`source_attempted_at` authorizes at most one source attempt. It does **not** prove HTTP transmission (SQL comment + sequencer order).

| Failure window | Durable evidence | Classification | Auto retry GET? | Local recovery |
| --- | --- | --- | --- | --- |
| Claim acquired, no attempt | Claim `claimed` | claim/revalidate outcomes | Soft until attempt | Revalidate/attempt under authority |
| Attempt marked, dispatch not started | `source_attempted_at` set | attempt authorized; may later be ambiguous | **Prohibited** | Close helpers only |
| Dispatch started, no response | Attempt set; adapter may throw/timeout | `dispatch_ambiguous` / `source_failure` | **Prohibited** | Operator investigation |
| Response received, commit fails | Opened request; close reason | `dispatch_ambiguous` | **Prohibited** | Commit/close; not new GET |
| Observation committed, link incomplete | Terminal outcome + `linkStatus` | `observation_committed` / `source_failure` still returned with link status | Link retry local only | `link_*` under service role |

Fake `throw` after open maps to `dispatch_ambiguous` with `observed: false` — Verified. Exactly-once HTTP is **not** claimed.

---

## 11. Fake-source containment

| Check | Result |
| --- | --- |
| Required injection | Missing adapter → 503; evaluate throws if omitted | Verified |
| `createFakeStandingSource` | No `fetch`; modes include throw/timeout/malformed | Verified |
| No default network in standing/unattended modules | Static absence of `fetch(` in sequencer (standingExecution tests) | Verified |
| Real adapter future | Can wrap transport without changing claim/attempt order; must not require pull flag | Recommendation |
| Tests vs production credentials | Unit tests use fake adapter + scripted RPCs | Verified |

---

## 12. Real-source readiness matrix

Assessed without invoking Floor Command. Reusable controls live primarily in `config.ts` / `governedObservation.readOnce` / pull path.

| Control | Classification |
| --- | --- |
| Fixed HTTPS production host allowlist (`deptsync-hub.vercel.app`) | Already implemented (config) |
| HTTPS required; credentials in URL refused | Already implemented |
| Lookalike host refusal | Already implemented |
| `redirect: "manual"` | Already implemented (`readOnce`) |
| Timeout 8s | Already implemented |
| Bearer not returned from config descriptors | Already implemented |
| Schema / synchronization classification | Already implemented (commit path) |
| Standing adapter wrapping `readOnce` **without** pull flag | **Missing** — `observeGovernedFloorCommandWeek` still requires `pullEnabled` |
| Explicit response-size ceiling | Partially / inherited limitation |
| Store + operational-week binding in adapter request | Partially — target carries week; adapter args fix store `2587` |
| Revision/sequence handling | Already implemented in governed commit |
| Provenance / run audit distinct from human observe | Missing (Proposed in 045) |
| Error classification after attempt | Partially — unattended mapping present; real transport not wired |
| Logging redaction for tokens | Partially — evaluate redacts `detail`; transport must keep token out of logs |
| Independence from `ORIENT_FLOOR_COMMAND_PULL_ENABLED` | Required; standing core already independent; real adapter must not call pull-gated observe |

**No real Floor Command GET occurred.**

---

## 13. Route and deployment exposure audit

| Surface | Result | Class |
| --- | --- | --- |
| `app/api/.../standing-opportunity/evaluate` | Absent | Verified |
| `vercel.json` cron | Absent | Verified |
| Local production build route table | Inspect present; evaluate/execute absent | Verified |
| App routes import unattended/execute | Forbidden by isolation tests | Verified |
| Production POST evaluate | **404** | Verified (read-only curl) |
| Production POST execute | **404** | Verified |
| Production POST inspect (unauth) | **401** `{"status":"unauthorized"}` | Verified (non-consuming) |
| Deploy current committed HEAD | Would **not** include untracked unattended modules; would **not** expose evaluate | Verified |
| Minimum future dark-deploy changes (not performed) | (1) git-package executor/unattended + claim/link files if needed, (2) mount evaluate route calling handler with fail-closed adapter wiring, (3) keep gate off / cron absent / env pin, (4) fix R047-H1 before expecting eligibility | Recommendation |

Inspect remains conceptually separate from evaluate.

---

## 14. Adversarial test evidence

Focused suite (same set as RELEASE-046): **9 files / 84 tests PASS** (re-Verified).

### Authentication (unit)

Missing / wrong / unconfigured secret, unsupported method, Bearer substitution, correct secret still requires adapter, forbidden body fields — **covered**.

### Policy / eligibility (unit)

Gate/policy/window/claim no-ops; `policy_conflict` — **covered** via injected discovery. Live ephemeral discoverStandingEligibility against real inspect with `p_as_of=null` — **Gap** (exposes R047-H1).

### Scheduling (unit)

Early/late/DST/duplicate open-set — **covered** in windows tests. Concurrent wake — **partial** (mocked execute). Real DB concurrent claim — inherited ephemeral regressions, not re-run as a mandatory gate this tranche beyond deploy-compat script inside the 84-test set.

### Execution (unit + inherited SQL)

Gate/revoke mapping, already_attempted, fake timeout/malformed/throw → non-success — **covered**. Hardened attempt SQL — present in deploy-compat ephemeral script within suite.

### Isolation

No pull flag, no App Router evaluate, no vercel.json, no adapter fallback — **covered**.

**Test-name caution:** Concurrent “one source dispatch” test mocks `execute` and counts claimCalls; it validates mapping/orchestration, not Postgres uniqueness by itself.

---

## 15. Exact verification commands and results

| Command | Outcome |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** — standing-opportunity shows `inspect` only |
| `npx vitest run` on unattended evaluate/windows, standingExecution, inspect route, standingPolicy, routes, governedObservation, StandingCoordination, deploy isolation | **PASS — 9 files / 84 tests** |
| Read-only `POST …/standing-opportunity/evaluate` | **404** |
| Read-only `POST …/standing-opportunity/execute` | **404** |
| Read-only unauth `POST …/standing-opportunity/inspect` | **401** |

No tests were modified. No production state changed.

---

## 16. Risk register

| ID | Severity | Evidence | Affected | Reproduction / test | Remediation | Blocks next? |
| --- | --- | --- | --- | --- | --- | --- |
| R047-H1 | **High** | `evaluateStandingOpportunityUnattended` sets `asOfIso = now` and passes it to inspect; clock forbids non-null `p_as_of` without test GUC | `standingUnattendedEvaluate.ts`, `standingUnattendedEligibility.ts`, `floor_command_standing_claim_clock` | Code trace; absent null-`asOf` integration test | Pass `p_as_of: null` to inspect/claim in production; keep ISO clock only for local window selection; add regression | **Yes** for any gate-on evaluation; latent under gate-off dark mount |
| R047-H2 | **High** | Vercel Cron = GET + `Authorization: Bearer CRON_SECRET`; handler = POST + custom header | `standingUnattendedAuth.ts`, `standingUnattendedEvaluateRoute.ts` | Platform docs vs code | Align method + credential contract with chosen wake mechanism before cron enable; do not trust UA alone | **Yes** for scheduler configure/activate |
| R047-H3 | **High** | Executor/unattended/claim/link artifacts untracked | git status | `git status --short` | Separately authorized packaging commit before any evaluate deploy | **Yes** for dark evaluate deploy packaging |
| R047-M1 | **Medium** | No `VERCEL_ENV=production` (or project) pin on evaluate handler | evaluate route module | Code absence vs RELEASE-045 proposal | Add env pin before mount | Yes for dark deploy to shared project |
| R047-M2 | **Medium** | Eligibility discovery lacks ephemeral DB proof; unit tests inject discover | eligibility module | Gap vs claim/attempt ephemeral suites | Add discoverStandingEligibility integration with null clock | Recommended before activation |
| R047-M3 | **Medium** | Concurrent unattended unit test mocks execute | `standingUnattendedEvaluate.test.ts` | Test inspection | Rely on SQL uniqueness; optionally add true parallel evaluate against ephemeral DB | No for architecture PASS |
| R047-M4 | **Medium** | Link failure still returns completed with `linkStatus` | `standingExecution.ts` | Code | Ensure operator visibility treats incomplete link distinctly | Observability |
| R047-L1 | **Low** | Per-policy claim uniqueness allows new policy → new claim same week after deliberate re-approve | SQL unique key | Doc | Document operator discipline / future stronger uniqueness if required | No |
| R047-L2 | **Low** | Post-attempt revoke cannot retract in-flight GET | Design residual | 036/045 | Document only | No |
| R047-L3 | **Low** | `source_response_at` semantics ≈ link time | link SQL | Doc | Clarify naming in operator materials | No |

No **Critical** finding: no verified path to unauthorized source execution, duplicate attempt under tested invariants, credential exposure in responses, or production activation from this tree.

---

## 17. Required remediation (not implemented)

Before a dormant evaluate-route dark deploy (future 048-class work):

1. Fix inspect/claim clock wiring (R047-H1).
2. Package untracked standing executor + unattended modules (+ claim/link SQL files as needed) into git under explicit authorization (R047-H3).
3. Design mount wiring that still requires injected adapter and fails closed without a real adapter; keep gate off; no cron.
4. Add production/project env pin (R047-M1).

Before scheduler configuration/activation:

5. Align HTTP method and credential header with the actual wake platform (R047-H2). Prefer dedicated standing secret; do not conflate with browser sessions.

Before gate enable / first real GET (later releases):

6. Implement real standing adapter independent of pull flag.
7. Add eligibility integration regression with production clock (`p_as_of` null).
8. Confirm Vercel plan cron interval limits for multi-wake Sunday window coverage.

---

## 18. Deployment-readiness assessment

| Decision | Verdict |
| --- | --- |
| Safe to continue local implementation / hardening | **YES** |
| Safe to mount a disabled execution route | **NO** until R047-H1 addressed for correctness and R047-H3 packaged; gate-off alone is insufficient justification to mount without env pin + fail-closed adapter wiring |
| Safe to deploy that route dark | **NO** from this record |
| Safe to configure scheduler authentication | **NO** until R047-H2 contract redesigned |
| Safe to activate scheduler | **NO** |
| Safe to enable execution gate | **NO** |
| Safe to perform first real-source GET | **NO** |

A local architecture PASS does **not** authorize any production action.

---

## 19. PASS/FAIL verdict

**PASS** — Against RELEASE-047 acceptance criteria:

- Scheduler authentication fails closed (local design).
- Execution gate remains independently authoritative and is rechecked at attempt marking.
- Policy selection is deterministic and non-arbitrary (sole-policy / conflict).
- Claim and attempt invariants remain enforced by the reused DB core.
- Duplicate wakes cannot produce duplicate source attempts under uniqueness + attempt write-once.
- Revocation and gate disablement remain enforced at attempt marking.
- Dispatch ambiguity is truthfully preserved (`observed: false`).
- Fake-source containment is verified.
- Unattended handler remains unmounted; build and production HTTP show no evaluate route.
- No production execution route introduced; no real Floor Command request; no production state changed.
- Critical safety tests in the established 84-test focused set pass.

**Conditional:** High readiness gaps (R047-H1/H2/H3) must be closed before dark mount or scheduler work. They do not convert this audit into FAIL because they fail closed or concern unmounted/unactivated surfaces.

---

## 20. Explicit GO/NO-GO recommendation for RELEASE-048

**GO** to accept RELEASE-047 as the independent audit record.

**GO** to request a separately authorized **local hardening + packaging** tranche that remediates R047-H1, packages git hygiene (R047-H3), designs Vercel-compatible wake auth (R047-H2) without activating cron, and optionally adds eligibility integration coverage — **without** mounting or deploying.

**NO-GO** to treat RELEASE-048 as an immediate dark evaluate-route production deploy until those remediations are complete and a new readiness record authorizes mount/deploy.

**NO-GO** from this record to:

- Mount or deploy the evaluate route
- Add `vercel.json` cron
- Enable standing-execution gate or pull flag
- Approve production grants
- Contact Floor Command
- Apply hosted migrations
- Mutate temporal records

**STOP** after this record. Do not begin RELEASE-048 without explicit operator authorization.
