# DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001

Discovery only. No implementation. No commit.

Addresses item 1 of the sustained-use path in [PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md](PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md).

## 1. Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD | `722fbb7f343f5ef414e76291fa4e46ea67beb98b` |
| Tip message | `PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001: define path to sustained use` |
| `main` vs `origin/main` | Identical |
| Working tree | Clean at discovery start |

Evidence class: **repository fact**.

## 2. Canonical question

> Exactly what diagnostic/probe artifacts from the DTM investigation remain in the current production repository/runtime, which of them are safe to remove, and what is the minimum cleanup required without altering the corrected DTM interaction?

**Answer:** The only runtime residue is temporary Desktop Week instrumentation added in `3bb26d9` and left mounted after `c31c61b`: React probe state, note* helpers, fixed `.orient-dtm-probe` chrome, OrientView `probeDetailOpen` wiring, probe CSS, and probe-asserting tests. Corrected gesture arbitration (10px intentional movement → lift in any direction; pending release does not pan) is production code and must stay. Minimum cleanup removes diagnostic-only surface/state/CSS/tests while preserving the corrected pointer state machine, proposal geometry, FactDetail handoff, and Save authority.

## 3. DTM history

| Stage | Commit | What changed |
| --- | --- | --- |
| Initial DTM | `8d001be9a275326b7f73157870d4213caa621cce` | Desktop Week lift/propose: `temporalProposal.ts`, Landscape gesture modes, OrientView `directManipulation` + `onPropose`, FactDetail proposal drafts, provisional CSS, semantic tests. Physical acceptance **failed** (“can't grab it”). |
| Diagnostic probe | `3bb26d94c2c5ad04fa5620d8747110d8f9105041` | Pure instrumentation: `DtmProbe` state, `note*` recorders, fixed readout chrome, `probeDetailOpen` props, `.orient-dtm-probe` CSS, probe test. Doc claimed gesture behavior unchanged; added `setState` re-renders for the readout and `hasPointerCapture` read used only for the card. |
| Corrected DTM | `c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a` | **Structural** arbitration fix: after 10px intentional movement, `beginLift` runs regardless of vertical dominance; pending pointer-up clears without Week pan. Probe `qualified` display updated to match. Probe chrome retained for next physical pass. Commit body: “Physical acceptance remains pending.” |

### Probe additions by kind

| Kind | From probe commit? | Later required by correction? |
| --- | --- | --- |
| Visual/debug chrome (`.orient-dtm-probe`) | Yes | No |
| Gesture-state display / counters | Yes | No |
| Event instrumentation (`noteDown` / `noteMove` / …) | Yes | No (correction only changed production `if (intentional) beginLift`) |
| State instrumentation (`probe`, `probeDetailOpen`) | Yes | No |
| Logging to console / network | No such logging found | — |
| Test-only probe evidence | Yes | Partial: correction test still asserts probe text for `qualified` / `vertical` |
| Structural arbitration change | No — that is `c31c61b` | Yes — production |

**Operator-stated history** (this brief): corrected interaction was physically exercised successfully (grab → proposal → cross-column → FactDetail → Save → same-id move). **Repository fact:** no `*ACCEPTANCE*` document closes DTM; `DIRECT-TEMPORAL-MANIPULATION-001.md` and the gesture-arbitration doc still say acceptance failed / pending.

## 4. Current production DTM path

Desktop only: `OrientView` sets `directManipulation={form === "desktop" && question === "week"}`.

1. **Contact** — `onPointerDown` on `.orient-landscape-days`; primary button 0.
2. **Subject** — `eligiblePress`: timed Protected Time / Block / Commitment button with stored clock pair; column `data-civil-day` equals `stored.startsOn`.
3. **Pending** — claim stores pointer id, origin, fact identity, grab offset.
4. **Threshold** — `WEEK_LIFT_JITTER_PX` (10): `intentional = hypot(dx,dy) > 10` → `beginLift` (**any direction**; vertical dominance is not a gate).
5. **Capture** — `setPointerCapture` on the Week row; `captured` flag from that call succeeding.
6. **Movement** — `proposalUnderPointer` → column body date + Y→minute → grab-adjusted start → `proposeTemporalPlacement` (30-minute quantum, duration preserved, equal clocks = 24h).
7. **Provisional** — `[data-provisional]` / `.orient-provisional` paint; canonical models unchanged.
8. **Release** — column body hit → `onPropose(fact, proposal)`; else cancel. Pending release: clear claim, **no** `onShift`. Territory pan: `round(deltaX / columnWidth)` → `onShift`.
9. **FactDetail** — `setSurface({ kind: "facts", …, proposal })`; Save uses existing same-id update path.
10. **Reload** — existing persist/reload; no DTM-specific persistence.

**Diagnostic-only overlays on that path:** every `note*` call, probe state updates (including on pan moves), `hasCapture` local used only for `noteLift`, `latchProvisional`, probe aside render, `probeDetailOpen` / `setProbeDetailOpen(true)`.

## 5. Complete probe artifact inventory

| # | File | Symbol / artifact | Runtime? | Mounted / reachable? | Operator-visible? | Required by corrected DTM? | Safe to remove? | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `components/orient/Landscape.tsx` | props `probeDetailOpen`, `onProbeDetailClear` | Runtime | Desktop Week | Indirect (feeds `detail` line) | No | Yes | Probe commit; comment “Temporary Desktop Week probe” |
| 2 | `Landscape.tsx` | `probe` state, `probing`, `origin` ref | Runtime | Desktop Week | Via chrome | No | Yes | Same |
| 3 | `Landscape.tsx` | `describeTarget`, `provisionalNodeMounted`, `noteDown`, `noteMove`, `noteLift`, `noteLost`, `noteCancel`, `noteUp`, `latchProvisional`, `resetProbe` | Runtime | Desktop Week | Via chrome / Reset | No | Yes | Only write probe state |
| 4 | `Landscape.tsx` | `beginLift` `hasCapture` / `hasPointerCapture` read | Runtime | Desktop Week | Via `capture` line | No — `captured` on claim still from `setPointerCapture` try | Yes | Used only in `noteLift` |
| 5 | `Landscape.tsx` | pending-branch `width` / `panHalf` / `vertical` locals for `noteMove` | Runtime | Desktop Week | Via card | No — arbitration uses only `intentional` | Yes with noteMove | Dead for production after probe removal |
| 6 | `Landscape.tsx` | aside `.orient-dtm-probe`, `data-dtm-probe`, Reset `data-dtm-reset`, `formatProbe` / `shownProbe` / `provisionalMountedNow` | Runtime | Desktop Week | **Yes** (fixed top-right) | No | Yes | BROWSER-PROBE-001 |
| 7 | `Landscape.tsx` | `DtmProbe` type, `emptyProbe`, `formatProbe`, `yn` | Runtime helpers | With chrome | Yes (text) | No | Yes | Bottom of Landscape.tsx |
| 8 | `Landscape.tsx` | `cancelManipulation` → `latchProvisional()` | Runtime | On cancel | Via card | No | Yes (call only) | Probe commit wrapped paint clear |
| 9 | `components/orient/OrientView.tsx` | `probeDetailOpen` state; pass-through props; `setProbeDetailOpen(true)` in `onPropose` | Runtime | Desktop Week propose | Via `detail yes` | No | Yes | Probe commit (+4 lines) |
| 10 | `components/orient/orient.css` | `.orient-dtm-probe`, `pre`, `button` | Runtime | With chrome | Yes | No | Yes | Probe commit |
| 11 | `orientView.test.tsx` | `it("records a synthetic desktop week attempt on the temporary probe")` | Test | CI | N/A | No | Yes (delete test) | Probe commit |
| 12 | `orientView.test.tsx` | Probe `textContent` expects inside `lifts an eligible block when horizontal movement dominates…` | Test | CI | N/A | No — underlying gesture asserts are production | Remove probe asserts; keep provisional / anchors / FactDetail | Correction commit |
| 13 | `orientView.test.tsx` | Phone test `expect(...[data-dtm-probe]).toBeNull()` | Test | CI | N/A | No after cleanup | Remove assertion | Probe-era guard |
| 14 | Docs | BROWSER-PROBE-001, PHYSICAL-DIAGNOSTIC-001, GESTURE-ARBITRATION-CORRECTION-001, DTM-001 status lines | Docs | N/A | N/A | Historical | Keep as C; update status only in cleanup/acceptance tranche | Repo |
| 15 | Convergence discovery | Mentions probe mounted | Docs | N/A | N/A | Historical | Keep | PRODUCTION-READINESS-… |
| 16 | `fieldScroll.test.ts` / Day-anchor “probe” wording | Unrelated scroll “probe” | — | — | — | — | **Not a DTM probe artifact** | Different meaning |

**Not found:** `console.log` / debug in Landscape or temporalProposal; persistence of probe data; network telemetry; feature flags; env checks; phone probe mount.

## 6. Artifact classification A/B/C/D

### A. REMOVE — diagnostic only

- Landscape probe props, state, refs, note* helpers, probe type/formatters, probe aside JSX
- `hasCapture` / `hasPointerCapture` diagnostic read in `beginLift`
- `latchProvisional` and its call from `cancelManipulation`
- pending-branch locals used only to feed `noteMove` (`width`, panHalf/vertical packaging)
- OrientView `probeDetailOpen` state and wiring / `setProbeDetailOpen`
- `.orient-dtm-probe*` CSS
- Probe-only test and probe textContent assertions

### B. KEEP — corrected production interaction

- `directManipulation` gate
- Pointer claim phases; `WEEK_LIFT_JITTER_PX`; `intentional → beginLift`
- Pending release without pan; territory pan; wheel suppression while lifted
- `setPointerCapture` / `captured` on claim; Escape cancel; click suppression
- `eligiblePress`, `proposalUnderPointer`, `proposeTemporalPlacement`, provisional paint
- FactDetail proposal + Save same-id update
- `.orient-provisional` CSS
- `temporalProposal.ts` / `.test.ts`
- Semantic DTM tests (acquisition, cross-column, overnight, Save, phone non-DTM)

### C. TEST/DOC EVIDENCE — keep unless harmful

- Implementation / discovery / contract / readiness / physical-diagnostic / browser-probe / gesture-arbitration docs
- Convergence discovery DTM section
- Do not delete historical docs in cleanup; optionally annotate status when acceptance lands

### D. AMBIGUOUS

**None.** No probe-originated structural fix remains that production still needs beyond the explicit `c31c61b` arbitration (already B).

## 7. Visible production chrome

| Question | Finding |
| --- | --- |
| Where | Fixed top-right viewport card, outside `.orient-landscape-days` |
| Resolution | Desktop Week only (`words && directManipulation`) |
| Phone | Not mounted (`directManipulation` false) |
| Layout | Overlay (`position: fixed; z-index: 40`); does not reflow Week columns; card `pointer-events: none` except Reset |
| Language | Implementation jargon: `qualified`, `pan-half`, `capture-threw`, `proposal-init`, etc. |
| Sustained-use risk | Reads as a diagnostic console on the instrument; confuses production chrome |

**Minimum removal for instrument reading:** unmount the aside + Reset + all state that exists only to feed it. No Week redesign.

## 8. Runtime logging / telemetry

| Concern | Finding |
| --- | --- |
| `console.*` | None in Landscape / OrientView DTM path / temporalProposal |
| High-volume logging | No console spam; probe uses React `setState` on moves (re-render cost only) |
| Leaves browser | No |
| Persisted | No (`localStorage` / `sessionStorage` / Supabase) — matches BROWSER-PROBE-001 |
| Privacy | Trace shows element tag/class, pointer id/type, deltas — not fact ids; still inappropriate production chrome |

## 9. CSS / layout findings

- Delete `.orient-dtm-probe`, nested `pre`, nested `button` (≈ `orient.css` 2285–2316).
- Keep `.orient-column .orient-provisional` from initial DTM.
- No spacing restore needed beyond unmounting the fixed overlay.

## 10. Test findings

| Test | Role | Cleanup |
| --- | --- | --- |
| Semantic DTM suite (propose, provisional, pan territory, cross-column, overnight Save, Escape, phone no DTM, …) | Protects corrected DTM | **Keep** |
| `lifts an eligible block when horizontal movement dominates…` | Protects correction; currently also asserts probe strings | **Keep** behavior asserts; **drop** `probe().textContent` lines |
| `records a synthetic desktop week attempt on the temporary probe` | Diagnostic visibility only | **Delete** entire test |
| Phone `data-dtm-probe` null assert | Guard that phone lacks probe | **Remove** with probe (redundant after A) |

After cleanup, coverage must still protect: fact acquisition, proposal, cross-column date, time mapping, cancel, FactDetail proposal, Save authority, same-id update, non-DTM phone behavior.

## 11. Documentation / acceptance provenance

| Document | Status at HEAD |
| --- | --- |
| Discovery / contract / readiness | Present |
| Implementation DTM-001 | Present; still says **PHYSICAL ACCEPTANCE FAILED** |
| Physical diagnostic | Present; superseded for root cause |
| Browser probe | Present; instructs deletion after reading |
| Gesture arbitration correction | Present; says acceptance failed / correction pending; “probe stays” |
| Formal DTM acceptance | **Absent** |

Convergence finding verified: corrected DTM physically exercised per **operator-stated** evidence; **no formal acceptance artifact** in repo.

**Post-cleanup requirement:** **A** — cleanup implementation → deploy → physical verification → one final DTM acceptance artifact.  
Reason: cleanup changes production runtime/chrome; prefer fresh verification over documentation-only closure of stale “FAILED” docs.

Do not create that acceptance artifact in this discovery.

## 12. Phone boundary

- `directManipulation` is false on phone; probe already unmounted.
- Cleanup must not enable phone DTM or alter LOOK · + · ACT.
- Phone Week remains pan/inspect only.

## 13. Temporal / domain boundary

Cleanup must **not** change: proposal semantics, 30-minute quantum, duration preservation, overnight / equal-clock 24h, FactDetail correction, Save authority, same-id update, PT/Block/Commitment/Work/all-day/Task/capacity/Week projection.

Any change to those is **OUT OF SCOPE** for this tranche.

## 14. Minimum cleanup tranche

Smallest plan:

1. **`Landscape.tsx`** — Remove probe props, state, helpers, aside JSX, types/formatters; strip `note*` calls; remove `hasCapture` block; remove `latchProvisional` from cancel; simplify pending move to `intentional` + `beginLift` only; leave corrected arbitration and production gesture path intact.
2. **`OrientView.tsx`** — Remove `probeDetailOpen` state, Landscape probe props, `setProbeDetailOpen` in `onPropose`.
3. **`orient.css`** — Delete `.orient-dtm-probe*` rules only.
4. **`orientView.test.tsx`** — Delete temporary probe test; strip probe assertions from correction test; drop phone probe null assert.
5. **Docs (optional in same tranche or acceptance follow-on)** — Short implementation note that probe was removed; leave historical probe docs; do not invent acceptance here.

No Week redesign, no desktop reorg, no Calendar work, no DTM redesign.

## 15. Post-cleanup acceptance requirement

**A:** cleanup → deployed physical verification → `DIRECT-TEMPORAL-MANIPULATION-ACCEPTANCE-001` (or equivalent) recording parked-working acceptance without probe chrome.

## 16. Readiness after cleanup

### A. NO — DTM can remain enabled and parked after cleanup/acceptance.

Evidence-backed: corrected arbitration is in production code; Save remains authority; no remaining production-risk issue identified beyond probe chrome itself. Desired refinements (phone DTM, gesture polish) are not blockers.

Next sustained-use path item after cleanup/acceptance: **External temporal observation discovery + sovereignty/provenance contract**.

## 17. Evidence references

- Commits: `8d001be`, `3bb26d9`, `c31c61b`, baseline `722fbb7`
- `components/orient/Landscape.tsx`, `OrientView.tsx`, `orient.css`, `temporalProposal.ts`, `orientView.test.tsx`
- [DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md](DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md](DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-001.md](DIRECT-TEMPORAL-MANIPULATION-001.md)
- [DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md](DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md)
- [PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md](PRODUCTION-READINESS-CONVERGENCE-DISCOVERY-001.md)

### Evidence class key

| Label | Meaning |
| --- | --- |
| Repository fact | Present at HEAD |
| Operator-stated | Successful physical exercise after correction (this brief); not closed by acceptance markdown |
| Architectural inference | None required beyond classification |
