# ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-ACCEPTANCE-001 — production all-day authority

ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001 — physically accepted.

Accepted candidate: `1a28a387d0066d4a6b84ce85e568f1c46218e0cf`.

Implementation record: [ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001.md](ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001.md).  
Discovery: [ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-DISCOVERY-001.md).

## Implementation commit

`1a28a387d0066d4a6b84ce85e568f1c46218e0cf` — `ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001: expose all-day production authority`

## Automated validation

Recorded at implementation close (documentation-only acceptance tranche does not re-run the suite):

| Check | Result |
| --- | --- |
| Focused establishment/authority tests | 11 passed |
| Relevant regression set | 58 passed |
| Full suite | 802 passed / 84 files |
| Lint | Pass |
| Typecheck | Pass |
| Production build | Pass |
| Schema migration | None |

## Deployed physical evidence

Production `/` was exercised after deployment of `1a28a38`.

Observed and accepted:

1. Phone ADD exposes **All day**.
2. All-day establishment is understandable and reachable from production `/`.
3. An all-day temporal fact can be created without using `/schedule`.
4. All-day establishment does not require invented start/end clock values.
5. The established fact is reachable through the normal Orient experience.
6. The fact can be inspected from production `/`.
7. FactDetail exposes correction for the all-day fact.
8. Civil-date correction works through the production experience.
9. Correction preserves the existing fact rather than requiring delete + recreate.
10. No clock semantics are introduced during same-kind all-day correction.
11. Existing remove authority remains usable through Delete → confirmation.
12. Operator verdict: the production interaction is acceptable — explicitly confirmed **we are good**.

## Accepted authority

| Concern | Accepted meaning |
| --- | --- |
| Establish | Production `/` establishes all-day Protected Time, Block, and Commitment through existing `create*` writers |
| Inspect | Established all-day facts are reachable and inspectable through the normal Orient experience |
| Same-ID correct | FactDetail Edit corrects the existing row via existing `update*` writers |
| Civil-date correct | Moving civil date corrects placement on the same id; no invented clocks |
| Remove | Delete → confirmation → existing hard `delete*` remains authoritative |
| Clocks | Same-kind all-day create/correct do not invent start/end locals |

## Explicitly deferred

Acceptance does **not** authorize:

- all-day ↔ timed conversion
- `/schedule` retirement
- zone-save relocation
- desktop reorganization
- Android/native clock refinement
- recurrence
- reminders
- Pulse
- generic undo
- carry-forward
- external calendar integration

All-day ↔ timed conversion remains intentionally deferred.  
`/schedule` remains unchanged and unretired.

## Boundary

No application code, test, schema, migration, dependency, or UX change in this acceptance tranche.

ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-001 is therefore **physically accepted**. The physical acceptance boundary is closed.
