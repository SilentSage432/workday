# DIRECT-TEMPORAL-MANIPULATION-ACCEPTANCE-001 — production direct temporal manipulation

DIRECT-TEMPORAL-MANIPULATION — physically accepted.

Accepted post-cleanup candidate: `343a834fd6390ea14bc3aa0f1529670e4348330d`.

Cleanup implementation: [DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001.md](DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001.md).  
Cleanup discovery: [DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md).  
Corrected arbitration: [DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md](DIRECT-TEMPORAL-MANIPULATION-GESTURE-ARBITRATION-CORRECTION-001.md).  
Original implementation: [DIRECT-TEMPORAL-MANIPULATION-001.md](DIRECT-TEMPORAL-MANIPULATION-001.md).

## Historical sequence

Preserve the actual history. Do not erase the initial failure or the diagnostic probe.

| Step | Commit / record | Outcome |
| --- | --- | --- |
| 1. Initial DTM implementation | `8d001be9a275326b7f73157870d4213caa621cce` — `DIRECT-TEMPORAL-MANIPULATION-001` | Deployed candidate |
| 2. Initial physical failure | Physical exercise of that candidate | Eligible fact could not be reliably grabbed; Week jolted horizontally |
| 3. Diagnostic investigation | `3bb26d94c2c5ad04fa5620d8747110d8f9105041` — probe; [DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md](DIRECT-TEMPORAL-MANIPULATION-BROWSER-PROBE-001.md); [DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md](DIRECT-TEMPORAL-MANIPULATION-PHYSICAL-DIAGNOSTIC-001.md) | Pointer stream reached Week; lift gated by vertical dominance |
| 4. Corrected gesture arbitration | `c31c61bd53d5c4f1b52ba00b2fe487e9e311ad9a` — `DIRECT-TEMPORAL-MANIPULATION-002` | 10px intentional movement lifts in any direction; pending release does not pan |
| 5. Successful physical manipulation | Operator exercise after correction | Grab → proposal → FactDetail → Save → same-id move (operator-stated; no formal acceptance artifact yet) |
| 6. Diagnostic probe cleanup | `343a834fd6390ea14bc3aa0f1529670e4348330d` — `DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001` | Probe chrome/state/CSS/probe tests removed; corrected DTM preserved |
| 7. Post-cleanup physical verification | Deployed production `/` → Week after `343a834` | This acceptance |

## Corrected interaction semantics

Canonical principles:

> Contact establishes subject. Movement expresses change. Release proposes result. Save exercises authority.

> Dragging expresses intent. Save exercises authority.

Production path (desktop Week only):

1. Contact on an eligible timed Protected Time, Block, or Commitment.
2. Pending while movement stays at or under the 10px intentional floor.
3. Intentional movement in any direction lifts and takes pointer capture.
4. Cross-column movement maps civil date; vertical movement maps local clock (30-minute gesture quantum).
5. Duration preserved; existing overnight / equal-clock 24h proposal semantics remain.
6. Provisional representation paints the proposal; canonical models stay until Save.
7. Release opens FactDetail with the proposal (no canonical write on release).
8. Explicit Save exercises authority via same-id update; reload/projection follows.

## Probe-cleanup discovery and implementation

Discovery: [DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md) at `e53069f1f20c382b77f355d47adf6f58b329c541`.

Implementation commit: `343a834fd6390ea14bc3aa0f1529670e4348330d` — `DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001: remove diagnostic probe residue`.

## Automated validation

Recorded at cleanup implementation close (documentation-only acceptance tranche does not re-run the suite):

| Check | Result |
| --- | --- |
| Targeted `orientView.test.tsx` + `temporalProposal.test.ts` | 49 passed |
| Full suite | 801 passed / 84 files |
| Lint | Pass |
| Typecheck | Pass |
| Production build | Pass |
| Runtime probe residue search | No matches under `components/orient` source |
| Schema migration | None |

## Deployed physical evidence

Production `/` → desktop Week was exercised after deployment of `343a834`.

Observed and accepted:

1. Diagnostic `DTM probe` chrome is gone.
2. An existing eligible timed fact remained directly manipulable.
3. The operator could grab and move the fact.
4. Release produced the expected temporal proposal through FactDetail.
5. Explicit Save remained the authority boundary.
6. The fact established its corrected temporal placement after Save (same canonical id).
7. Corrected DTM remained functional after diagnostic cleanup.
8. Operator verdict: the production interaction is acceptable — explicitly confirmed **perfect. we are good**.

## Accepted authority

| Concern | Accepted meaning |
| --- | --- |
| Subject | Contact on an eligible timed fact establishes the manipulation subject |
| Proposal | Movement + release proposes temporal placement; does not write |
| Inspection | FactDetail receives the proposal for human review |
| Save | Explicit Save is the only authority boundary for the correction |
| Same-ID | Save corrects the existing fact; does not require delete + recreate |
| Reload | Canonical reload/projection follows successful Save |
| Chrome | Production Week reads as an instrument; diagnostic probe is absent |

## Explicitly deferred / parked

Acceptance does **not** authorize:

- phone DTM
- all-day DTM
- Task DTM
- Work DTM
- DTM redesign
- gesture-threshold tuning
- Week redesign
- desktop reorganization
- all-day ↔ timed conversion

DTM may remain enabled and parked unless future real-world use produces new evidence.

## Boundary

No application code, test, schema, migration, dependency, or UX change in this acceptance tranche.

## Final verdict

DIRECT-TEMPORAL-MANIPULATION (post-cleanup production Desktop Week) is therefore **physically accepted**.

- DTM probe cleanup is **closed**.
- DTM production acceptance is **closed**.
- No additional DTM work blocks sustained use.
- Next canonical convergence-path item remains External Temporal Observation discovery + sovereignty/provenance contract (not begun here).
