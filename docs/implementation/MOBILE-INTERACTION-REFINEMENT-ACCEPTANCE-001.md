# MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001 — remove redundant mobile decision boundaries

MOBILE-INTERACTION-REFINEMENT-001 — physically accepted.

Accepted candidate: `23c14662cebfb7c71aacc9bc7f34f93889d8048b`.

Implementation record: [MOBILE-INTERACTION-REFINEMENT-001.md](MOBILE-INTERACTION-REFINEMENT-001.md).  
Preceding architecture: [MOBILE-LOOK-ADD-ACT-001.md](MOBILE-LOOK-ADD-ACT-001.md).

## Implementation commit

`23c14662cebfb7c71aacc9bc7f34f93889d8048b` — `MOBILE-INTERACTION-REFINEMENT-001: remove redundant mobile decision boundaries`

## Automated validation

Recorded at implementation close (documentation-only acceptance tranche does not re-run the suite):

| Check | Result |
| --- | --- |
| Full suite | 793 passed / 83 files |
| Lint | Pass |
| Typecheck | Pass |
| Production build | Pass |
| Schema migration | None |

## Deployed physical evidence

Production phone was exercised after deployment of `23c1466`.

Observed and accepted:

1. LOOK hierarchy is substantially clearer.
2. LOOK dismissal no longer appears as an inline semantic row; header-level dismissal is sensible.
3. Ask the field / temporal positioning / Focus / Operations are understandable.
4. LOOK · + · ACT remains easy to navigate.
5. ADD → Task goes directly to Task creation; Quick Capture / General Capture / Task-vs-Note decision sequence is gone from declared Task creation.
6. ADD → Note goes directly to Note creation without asking whether the expression is a Task.
7. Direct Task creation is understandable.
8. New Tasks enter ACT without automatically becoming Active Thread.
9. Time-on-the-day access remains intact.
10. Operator verdict: the corrected interaction makes sense and is good to proceed.

## Accepted semantics

| Concern | Accepted meaning |
| --- | --- |
| LOOK · + · ACT | Primary phone grammar preserved |
| LOOK Close | Surface-level dismissal, not a semantic operation in the content list |
| ADD → Task | Declared Task intention; direct create via existing `createTask` |
| ADD → Note | Declared Note intention; direct create via existing `createNote` |
| Generic Capture | Remains only where expression type is undeclared |
| New Task → ACT | Canonical open-Task projection; no automatic Start |

Principle reinforced by this tranche:

> Once the human has expressed an intention, Orient should not ask them to express the same intention again.

## Parked non-blocking observation

The planned-clock control currently invokes the Android/native clock interaction.

The operator does not prefer this interaction, and it has been a recurring UX irritation, but explicitly accepts it as **non-blocking** for now.

**PARKED UX evidence only.** Not an acceptance failure. No redesign of the clock control, `LocalClockField`, or Task clock semantics is authorized by this observation. Revisit only if continued use proves sufficiently irritating.

## Boundary

No application code, schema, migration, or dependency change in this acceptance tranche. No desktop reorganization. No follow-up clock-picker tranche opened here.

MOBILE-INTERACTION-REFINEMENT-001 is therefore **physically accepted**.
