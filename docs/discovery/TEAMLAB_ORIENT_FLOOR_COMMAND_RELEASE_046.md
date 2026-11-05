# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-046

Local-only unattended entry point and fake-source execution proof. Written 2026-11-04 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_045.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_045.md) and the standing-execution lineage through RELEASE-044.

Local implementation, adversarial unit tests, isolation proofs, and documentation only. **No** production deployment, Vercel Cron activation, standing-execution gate enablement, pull-flag enablement, hosted migrations, production env changes, standing-policy approval, production RPC invocation, Floor Command GET, governed production observation, or temporal mutation.

**PASS** for local unattended wake pathway with fake-source governed execution.

**GO** to accept the local proof as the implementation boundary for a later separately authorized readiness / dark-deploy tranche.

**NO-GO** to mount the evaluate route in App Router for production, enable cron, enable the gate, approve grants, or contact Floor Command from this record.

Labels:

| Label | Meaning |
| --- | --- |
| Implemented | Present in local repository and covered by tests this tranche |
| Unmounted | HTTP handler exists as a server module; not under `app/api` |
| Proposed | Future production wiring |
| Limitation | Residual gap deferred to a later authorized tranche |

## 1. Executive summary

RELEASE-046 implements a **local unattended standing-evaluation pathway**:

**Trusted scheduler credential → deterministic eligibility discovery → `executeStandingFloorCommandObservationForOperator` (existing claim → revalidate → hardened attempt → governed open → injected adapter → commit → link) → classified outcome.**

The scheduler credential authorizes **wake identity only**. Observation authority remains the conjunctive DB chain. All end-to-end source behavior uses `createFakeStandingSource` (including throw/timeout/malformed modes). No real Floor Command GET occurs.

The HTTP handler is **intentionally unmounted** (`standingUnattendedEvaluateRoute.ts` only). Adding `app/api/.../evaluate/route.ts` now would make the next production deploy expose an execution surface. RELEASE-045/048 already scheduled dormant route wiring as a separately authorized step. Production build route table still lists inspect only under standing-opportunity; `vercel.json` remains absent.

## 2. Implementation inventory

| Component | Path | Role |
| --- | --- | --- |
| Cron config | `standingUnattendedConfig.ts` | Env + header names |
| Scheduler auth | `standingUnattendedAuth.ts` | Fail-closed secret compare via Pulse `secretsMatch` |
| Window helpers | `standingUnattendedWindows.ts` | Select among SQL-frozen windows at injected clock |
| Eligibility | `standingUnattendedEligibility.ts` | Gate + sole approved policy + inspect RPC |
| Orchestrator | `standingUnattendedEvaluate.ts` | Discover → existing execution core → map outcomes |
| HTTP handler | `standingUnattendedEvaluateRoute.ts` | POST-only; **Unmounted** |
| Core export | `standingExecution.ts` | `executeStandingFloorCommandObservationForOperator` |
| Observe target | `standingExecutionIntent.ts` | `StandingObserveTarget`, `STANDING_EVALUATE_ACTION` |
| Fake source | `standingSourceAdapter.ts` | Added `throw` mode for ambiguous dispatch |

## 3. Files changed

| File | Change |
| --- | --- |
| `server/floorCommand/standingExecution.ts` | Export operator-id sequence runner; shared `StandingObserveTarget` |
| `server/floorCommand/standingExecutionIntent.ts` | Observe target + evaluate action constant |
| `server/floorCommand/standingSourceAdapter.ts` | `throw` fake mode |
| `server/floorCommand/standingUnattendedConfig.ts` | **New** |
| `server/floorCommand/standingUnattendedAuth.ts` | **New** |
| `server/floorCommand/standingUnattendedWindows.ts` | **New** |
| `server/floorCommand/standingUnattendedEligibility.ts` | **New** |
| `server/floorCommand/standingUnattendedEvaluate.ts` | **New** |
| `server/floorCommand/standingUnattendedEvaluateRoute.ts` | **New** (unmounted) |
| `server/floorCommand/standingUnattended*.test.ts` | **New** |
| `persistence/floorCommandStandingExecutionDeployment.pg.test.ts` | Assert evaluate not under App Router |
| Journals / roadmap / this document | Updated |

## 4. Scheduler entry-point design

**Implemented (Unmounted):** `handleStandingOpportunityEvaluatePost`

| Rule | Behavior |
| --- | --- |
| Method | POST only → 405 otherwise |
| Auth | `X-Orient-Floor-Command-Standing-Cron-Secret` vs `ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET` |
| Body | Empty or `{ "action": "evaluate_standing_opportunity" }` only |
| Forbidden body fields | policyId, week, store, source, URLs → 400 `forbidden_field` |
| Adapter | **Required injection**; missing → 503 `adapter_required` (no network default) |
| Cache | `Cache-Control: no-store` |
| Operator JWT | Cannot substitute for cron secret |

**Proposed future wiring:** `app/api/integrations/floor-command/standing-opportunity/evaluate/route.ts` calling this handler with a real adapter — only after a separately authorized dark deploy / readiness release. **Not done here.**

## 5. Authentication boundary

| Case | Result |
| --- | --- |
| Secret unconfigured | 503 `unconfigured` |
| Missing header | 401 `unauthorized` |
| Wrong secret | 401 `unauthorized` |
| Correct fake secret | Proceeds (tests) |
| Bearer without cron header | 401 |
| Constant-time compare | SHA-256 digests via existing `secretsMatch` |

Credential does **not** authorize observation; gate/policy/claim/attempt still decide.

## 6. Eligibility evaluator

`discoverStandingEligibility`:

1. `floor_command_standing_execution_gate_is_open`  
2. List `state=approved` policies for store `2587` / source / purpose; filter effective interval at `asOf`  
3. `0` → `no_approved_policy`; `>1` → `policy_conflict` (no arbitrary pick)  
4. Load frozen windows from latest `approved` policy event (`scope.windows`)  
5. Select open windows (`opens_at <= asOf < closes_at`); prefer publication  
6. Call `inspect_floor_command_standing_opportunity` for DB-authoritative status  
7. Map inspect statuses to no-ops or `eligible` with server-built `StandingObserveTarget`

Does not use the inspection UI or accept caller policy/week fields.

## 7. Operational-week handling

- Week identity comes from **SQL-frozen** window JSON (`operational_week`), authored with `America/Boise` close semantics and Sunday 12:00 UTC open.  
- TypeScript only selects among those bounds at an injected `asOf`.  
- Tests cover pre-open, in-window, post-close, Boise MST vs MDT close offsets, duplicate wakes in-window, and publication preference.  
- No hard-coded UTC−6/UTC−7 constants for eligibility.

## 8. Existing execution-core reuse evidence

Eligible path calls **only** `executeStandingFloorCommandObservationForOperator` → same `runStandingSequence` as the operator confirmation path:

`claim → revalidate → record_*_source_attempt → open_governed → adapter → commit → link`

Verified in unit tests by RPC call order and by absence of a second claim/attempt implementation.

## 9. Fake-source adapter design

`createFakeStandingSource` modes used: `snapshot`, `timeout`, `credential_rejected`, `forbidden`, `malformed`, `throw`.

- Tests assert invocation counts.  
- No `fetch(` in standing execution / unattended modules for a default transport.  
- Handler refuses to run without an injected adapter.

## 10. Failure classifications

| Status | Meaning | `observed` |
| --- | --- | --- |
| `gate_disabled` | Gate off | false |
| `no_approved_policy` | Zero fixed-scope approvals | false |
| `policy_conflict` | Multiple approvals | false |
| `not_yet_eligible` / `expired` / `revoked` | Timing / lifecycle | false |
| `already_claimed` / `already_attempted` | Consumed | false |
| `observation_committed` | Governed success outcomes | **true** |
| `source_failure` | `failed` / `rejected` commit | false |
| `dispatch_ambiguous` | Attempted but classification incomplete | false |
| `claim_rejected` / `attempt_rejected` / … | Mapped where possible; residual explicit | false |

No-op is never reported as successful observation (`observed: false` unless committed success class).

## 11. At-most-once evidence

- Unique claim + write-once attempt remain the DB boundary (reused).  
- Duplicate wake after `already_attempted` discovery does not call execute/adapter.  
- Concurrent wakes: one may commit; the other maps `already_claimed` — only one observing success.  
- Ambiguous adapter throw after attempt → `dispatch_ambiguous`, not success, not auto-retry.

## 12. Concurrency and revocation tests

Covered in `standingUnattendedEvaluate.test.ts`:

- Dual wake with claim race mapping  
- Attempt rejected as `authorization_revoked` / `gate_disabled` / `source_already_attempted`  
- Post-commit duplicate wake via `already_attempted` discovery  

Hardened attempt SQL itself remains proven by existing ephemeral deployment/execution regressions (Inherited).

## 13. No-op behavior

Scheduler wake may return gate/policy/window/claim no-ops with HTTP 200 and `observed: false`. Auth failures use 401/503. Successful observation is only `observation_committed`.

## 14. Manual pull independence

- Unattended path never reads `ORIENT_FLOOR_COMMAND_PULL_ENABLED`.  
- Execution core already independent of the pull flag (RELEASE-033).  
- Tests assert call transcripts lack pull env references.

## 15. Inspection UI independence

- No import of Standing Coordination / inspect client.  
- Evaluate does not call the inspect App Router route.  
- Eligibility may call the inspect **RPC** server-side (advisory pre-check), then claim for consumption.

## 16. Production isolation verification

| Check | Result |
| --- | --- |
| `vercel.json` | Absent |
| App Router `…/standing-opportunity/evaluate` | Absent |
| Production build route table | Inspect present; evaluate/execute absent |
| App routes import unattended/execute | Forbidden by isolation tests |
| Hosted migration / env / deploy this tranche | None |
| Real Floor Command GET | None |

**Limitation:** This tranche did not re-curl cyan; isolation is proven by **no deploy** + absent App Router path + build output. Prior RELEASE-044 recorded execute **404** on cyan for commit `f96b8c0`.

## 17. Exact test commands and results

| Command | Outcome |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; no evaluate route |
| `npx vitest run` (unattended evaluate/windows, standingExecution, inspect route, standingPolicy, routes, governedObservation, StandingCoordination, deploy isolation) | PASS — **9 files / 84 tests** |

## 18. Known limitations

1. Evaluate HTTP handler is unmounted — full HTTP integration in a running Next server is not proven in production wiring.  
2. Eligibility `.from()` discovery against a live ephemeral DB is not a dedicated new shell regression; unit tests inject discover/execute. Existing claim/attempt ephemeral suites remain the DB concurrency authority.  
3. Real standing source adapter (wrapping `readOnce` without pull flag) is still Proposed.  
4. `asOf` on inspect/claim requires DB test hooks outside unit mocks.  
5. Multi-grant conflict returns no-op rather than a selection UI.  
6. Reconciliation unattended cadence intentionally deferred (publication preferred).

## 19. Risks and required hardening before production wake

1. Mount evaluate route only in a dark-deploy tranche with gate still off.  
2. Implement real adapter without enabling pull flag.  
3. Add Vercel Cron + secret only after gate enable is separately authorized.  
4. Commit still-untracked claim/link/executor git hygiene as needed for deploy packaging.  
5. Add ephemeral DB proof for discoverStandingEligibility against real inspect/claim if readiness requires it.  
6. Pin evaluate to production env to refuse preview/cron misfires.

## 20. PASS/FAIL verdict

**PASS** — Local unattended wake pathway exists; scheduler auth fails closed; eligibility is DB-governed with sole-policy selection; existing execution core is reused; duplicate wakes cannot double-dispatch under the tested mappings; revocation/gate refusal at attempt boundary is preserved in outcome mapping; fake-source observations produce truthful classifications; pull flag and inspect UI are not required; no temporal creation; local verification green; production unchanged and evaluate route unmounted.

## 21. GO/NO-GO recommendation for the next release

**GO** to accept RELEASE-046’s local unattended proof.

**GO** to request a later readiness tranche that packages git hygiene / dark-deploy planning for a **dormant** evaluate route (gate off, cron absent) — without activating execution.

**NO-GO** from this record to:

- Mount or deploy the evaluate route  
- Add `vercel.json` cron  
- Enable standing-execution gate or pull flag  
- Approve production grants  
- Contact Floor Command  
- Apply hosted migrations  

**STOP** after this record. Do not begin RELEASE-047 without explicit operator authorization.
