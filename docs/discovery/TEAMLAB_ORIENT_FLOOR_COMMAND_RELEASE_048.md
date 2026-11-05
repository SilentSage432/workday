# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-048

Targeted local remediation, security regression testing, and Git packaging for the three High readiness findings from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_047.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_047.md). Written 2026-11-04.

Local implementation authority only for R047-H1, H2, and H3. **No** production deployment, App Router evaluate mount, `vercel.json` cron, environment-variable changes, gate enablement, standing-grant approval, real-source adapter, Floor Command GET, production RPC invocation, opportunity claims, attempt marking, observation creation, temporal mutation, git commit, or push.

**PASS** for local hardening of H1/H2 and staged packaging of H3 (awaiting separately authorized commit).

**GO** to accept the local remediation and to request a separately authorized commit of the staged packaging set.

**NO-GO** to mount the evaluate route, configure cron, deploy, enable the gate, approve grants, or contact Floor Command from this record.

Labels:

| Label | Meaning |
| --- | --- |
| Implemented and verified | Present in the working tree and covered by local tests this tranche |
| Locally tested | Confirmed by typecheck/lint/build/vitest |
| Staged but not committed | In the Git index; no commit created |
| Historically reported | Cited from RELEASE-044/047 |
| Directly verified production | Read-only HTTP this tranche |
| Future recommendation | Not authorized here |

---

## 1. Executive summary

RELEASE-048 remediates the three High findings that blocked treating RELEASE-046’s unattended pathway as deployment-packaging-ready:

1. **R047-H1** — Production-compatible inspect now receives `p_as_of: null` so the database clock is authoritative. Local TypeScript window prefilter still uses a wall/test clock; the test seam may supply `asOf` only when explicitly injected.
2. **R047-H2** — Unmounted handler now matches Vercel Cron: **GET** + `Authorization: Bearer $CRON_SECRET`. Custom-header auth is rejected. POST and other methods return 405. Query parameters cannot select scope.
3. **R047-H3** — Implementation dependency closure is **staged** (29 paths) and ready for a separately authorized commit. No commit or push was performed.

Architecture preserved: trusted Cron wake → sole-policy eligibility → existing claim/attempt/governed core → injected fake source → durable evidence. Handler remains unmounted. Focused suite: **9 files / 96 tests PASS**. Build route table still lists inspect only under standing-opportunity.

---

## 2. Canonical references reviewed

RELEASE-028, 029, 033, 036, 037, 039R, 041, 044, 045, 046, 047 — reconciled against repository source, SQL, tests, and Git status. RELEASE-047 governed remediation scope.

---

## 3. Starting repository state

| Fact | Value | Class |
| --- | --- | --- |
| Repo | `/Users/silentsage/Desktop/workday` | Verified |
| HEAD before edits | `0ceeda2` (RELEASE-044 docs; ahead of origin by 1) | Verified |
| Production app (Historical) | `f96b8c0` / `dpl_6oSj4RN6gaBSsgNtNre23nFb7qEG` | Historical |
| Unattended modules | Present on disk; untracked | Verified at start |
| Claim/link migrations | Present on disk; untracked | Verified at start |
| `vercel.json` | Absent | Verified |
| App Router evaluate | Absent | Verified |

---

## 4. R047-H1 root cause and remediation

**Root cause (Verified in 047):** `evaluateStandingOpportunityUnattended` set `asOfIso = new Date().toISOString()` and `discoverStandingEligibility` passed that value as `p_as_of` into `inspect_floor_command_standing_opportunity`. Without `orient.standing_claim_test_hooks=1`, `floor_command_standing_claim_clock` raises `as_of_forbidden`.

**Remediation (Implemented and verified):**

- Split clocks: `asOfIso` (local advisory prefilter) vs `inspectAsOf` (RPC argument).
- Production path (`asOf` omitted): `inspectAsOf = null` and claim/attempt `p_as_of = null`.
- Test seam: explicit `deps.asOf` still supplies deterministic local fixtures and, when used, non-null RPC clock for ephemeral hooks only — not a production bypass.
- Map `as_of_forbidden` explicitly to `unavailable`.

**Evidence:** Unit tests assert production discover sends `p_as_of: null`, evaluate-without-`asOf` captures `inspectAsOf === null`, and test seam preserves injected `asOf`.

---

## 5. R047-H2 root cause and remediation

**Root cause:** Handler required POST + custom header `X-Orient-Floor-Command-Standing-Cron-Secret` vs `ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET`. Vercel Cron delivers **GET** + `Authorization: Bearer $CRON_SECRET`.

**Remediation (Implemented and verified):**

| Aspect | Behavior |
| --- | --- |
| Method | GET only → else 405 |
| Env | `CRON_SECRET` |
| Auth | `Authorization: Bearer <secret>` via `extractBearerToken` + `secretsMatch` |
| Missing/wrong/empty/malformed Bearer | 401 |
| Unconfigured secret | 503 fail closed |
| Custom header only | 401 |
| Operator Bearer mismatch | 401 |
| Any query string | 400 `forbidden_field` |
| Missing adapter | 503 |
| Cache | `Cache-Control: no-store` |
| Export | `handleStandingOpportunityEvaluateGet` (unmounted) |

Cron credential still cannot bypass gate/policy/claim/attempt.

---

## 6. R047-H3 packaging inventory

### Required implementation closure (staged)

| Path | Role |
| --- | --- |
| `server/floorCommand/standingExecution.ts` | Governed claim/attempt/execute core |
| `server/floorCommand/standingExecution.test.ts` | Core unit proofs |
| `server/floorCommand/standingSourceAdapter.ts` | Fake adapter seam |
| `server/floorCommand/standingExecutionIntent.ts` | Observe target + evaluate action |
| `server/floorCommand/standingUnattended*.ts` | Config/auth/windows/eligibility/evaluate/route |
| `server/floorCommand/standingUnattended*.test.ts` | Unattended unit proofs |
| `supabase/migrations/20261103160000_*.sql` | Claims + gate SQL |
| `supabase/migrations/20261103210000_*.sql` | Observation link SQL |
| `persistence/floorCommandStanding*.pg.test.ts` | Ephemeral SQL regressions |
| `scripts/floor-command-standing-*.sh/.sql` | Regression/compatibility scripts |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_046.md` | Prior implementation record |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_047.md` | Governing audit |
| `docs/discovery/TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_048.md` | This record (staged with journals) |

### Intentionally excluded from staging

| Path class | Reason |
| --- | --- |
| Historical untracked RELEASE_001–045 discovery docs (except 046/047) | Outside H3 dependency closure; avoid blanket staging |
| `ORIENT-FLOOR-COMMAND-003/004/005` and `RELEASE_025` working-tree edits | Unrelated operator work |
| `.env*`, credentials, `.vercel/` | Secrets / local link state (gitignored) |
| App Router evaluate route / `vercel.json` | Must not exist; not created |

---

## 7. Files modified

| File | Change |
| --- | --- |
| `standingUnattendedConfig.ts` | Env → `CRON_SECRET` |
| `standingUnattendedAuth.ts` | Bearer extraction + compare |
| `standingUnattendedEligibility.ts` | `inspectAsOf` split; `as_of_forbidden` mapping |
| `standingUnattendedEvaluate.ts` | Production `inspectAsOf/rpcAsOf = null` |
| `standingUnattendedEvaluateRoute.ts` | GET handler; query reject; no POST auth path |
| `standingUnattendedEvaluate.test.ts` | Vercel auth + H1 clock + prior regressions |
| `floorCommandStandingExecutionDeployment.pg.test.ts` | Isolation asserts GET handler symbol |
| Journals / roadmap / RELEASE-048 | Documentation |

---

## 8. Files staged

Exact staged set at end of tranche (see also §18): 29 packaging paths for implementation/tests/migrations/scripts/046–047 docs, plus RELEASE-048 and continuity docs after documentation write.

**No commit. No push.** Operator must separately authorize commit.

---

## 9. Files intentionally excluded

See §6. Unrelated discovery edits and historical untracked releases remain unstaged.

---

## 10. Inspection RPC compatibility evidence

| Check | Result | Class |
| --- | --- | --- |
| SQL clock rejects non-null `p_as_of` without test GUC | Unchanged; still enforced | Historical SQL + 047 |
| Production unattended discover sends `p_as_of: null` | PASS | Locally tested |
| Evaluate without `asOf` → `inspectAsOf === null` | PASS | Locally tested |
| Eligible path can reach `eligible_now` under simulated RPC | PASS | Locally tested |
| Hosted production inspect RPC not invoked | Confirmed by non-use | Verified process |

---

## 11. Cron authentication evidence

Covered in `standingUnattendedEvaluate.test.ts` (Vercel Cron authentication describe): valid GET/Bearer → adapter_required; missing/wrong/empty/malformed Bearer; POST/PUT/DELETE/PATCH/HEAD 405; custom-header-only 401; unconfigured 503; query scope 400; auth failure skips evaluate; secret not reflected.

---

## 12. Execution-gate regression evidence

Gate-disabled discovery/evaluate returns `observed: false` without adapter invoke; HTTP path with valid Cron + gate_disabled returns 200 no-op. Claim/attempt still re-check gate in SQL core (unchanged).

---

## 13. Claim/attempt regression evidence

Happy-path RPC order unchanged. Concurrent mapping, revoke/gate attempt mapping, already_attempted duplicate wake, and standingExecution unit/ephemeral suites remain green within the focused 96-test set (deploy-compat ephemeral included).

---

## 14. Fake-source containment

Adapter still required; omit → 503. Fake modes timeout/throw/malformed/credential/forbidden covered. No default `fetch` in standing sequencer. Pull flag unused.

---

## 15. At-most-once and ambiguity evidence

Unique claim + write-once attempt reused. Adapter throw → `dispatch_ambiguous`, `observed: false`, `sourceDispatches: 1`. No automatic retry after attempt mark.

---

## 16. Exact verification commands and results

| Command | Outcome |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** — evaluate route absent; inspect present |
| Focused vitest (unattended evaluate/windows, standingExecution, inspect route, standingPolicy, routes, governedObservation, StandingCoordination, deploy isolation) | **PASS — 9 files / 96 tests** |
| Production evaluate exposure this tranche | Not re-curled; repository build route table + absent App Router path Verified; cyan evaluate **404** remains Historical from RELEASE-047 |

---

## 17. Test count

| Baseline | Result |
| --- | --- |
| RELEASE-047 focused | 84 |
| RELEASE-048 focused | **96** (+12 auth/clock/query regressions) |

---

## 18. Git tracking and staging status

| State | Detail |
| --- | --- |
| Staged | Implementation closure listed in §6 (index populated) |
| Committed | **None** this tranche |
| Pushed | **None** |
| H3 status | Corrected as **staged awaiting separately authorized commit** |
| Secret scan of staged diff | No live credential patterns found |

Proposed commit message (not executed):

```
Harden unattended standing evaluate for Vercel Cron and package local core.

Use CRON_SECRET Bearer GET auth, null inspect p_as_of on the production path,
and stage the standing executor/claim/link dependency closure without mounting
a route or enabling cron.
```

---

## 19. Production isolation evidence

| Check | Result |
| --- | --- |
| App Router evaluate mounted | No |
| `vercel.json` cron | Absent |
| Production deploy this tranche | None |
| Production env changed | None |
| Hosted migration applied | None |
| Standing grant approved | None |
| Gate enabled | None |
| Production claim/attempt/GET | None |
| Temporal mutation | None |
| Cyan evaluate GET | Historical 404 (RELEASE-047); not re-exercised this tranche |
| Local build evaluate route | Absent (Directly verified) |

---

## 20. Remaining risks or gaps

| ID | Severity | Note |
| --- | --- | --- |
| R048-M1 | Medium | Staged set not yet committed — deploy artifact incomplete until operator authorizes commit |
| R048-M2 | Medium | Production env pin (`VERCEL_ENV`) still deferred (047-M1) — required before dark mount |
| R048-M3 | Medium | Real standing adapter still missing — required before first real GET |
| R048-L1 | Low | Local advisory wall clock vs DB `now()` can disagree slightly; inspect/claim remain authoritative |
| R048-L2 | Low | Historical discovery docs 001–045 remain untracked outside this packaging set |

---

## 21. PASS/FAIL verdict

**PASS** — R047-H1 corrected; R047-H2 corrected; R047-H3 corrected as staged-not-committed; production-compatible inspect no longer supplies forbidden wall-clock `p_as_of` on the unattended production path; Vercel GET/Bearer auth fails closed; Cron credential cannot substitute for standing authority; claim/attempt safeguards intact; fake-source containment intact; 96 focused tests pass; handler unmounted; no cron configured; production unchanged.

---

## 22. GO/NO-GO recommendation for RELEASE-049

**GO** to accept RELEASE-048’s local hardening and staged packaging.

**GO** to request a separately authorized **git commit** (and only then a later dark-deploy readiness / dormant-route tranche).

**NO-GO** from this record to:

- Commit or push without new operator authorization
- Mount or deploy the evaluate route
- Add `vercel.json` cron or set production `CRON_SECRET`
- Enable standing-execution gate or pull flag
- Approve grants
- Contact Floor Command
- Begin automatic temporal creation

**STOP** after this record. Do not begin RELEASE-049 without explicit operator authorization.
