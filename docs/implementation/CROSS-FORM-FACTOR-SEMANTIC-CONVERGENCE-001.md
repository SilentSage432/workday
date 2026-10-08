# CROSS-FORM-FACTOR-SEMANTIC-CONVERGENCE-001

Date: 2026-10-08.

Baseline HEAD before implementation: `27fbfff29723b40f132ff42bdbf003fcba345c00` (`main`).

Prior audit: CROSS-FORM-FACTOR-PARITY-DISCOVERY-001 (architectural divergence: phone LOOK · ADD · ACT vs desktop Question · Position · Focus · Capture).

## Purpose

Restore **one Orient semantic architecture** across phone and desktop.

Law:

> Orient's ontology, authority boundaries, and established human capabilities remain consistent across form factors. Layout, density, navigation mechanics, and interaction affordances may adapt to the physical device.

Form-factor-specific capability must be **explicit** (`specialization` in the registry) or its absence is a defect.

## Scope (this tranche)

Semantic / capability parity only.

- Desktop permanent chrome converges to **LOOK · ADD · ACT**
- Shared surfaces reused (`LookSurface`, `AddChooser`, `ActSurface`, stewardship/recurring/Notes/Work/external)
- Desktop Task establish routes through **DirectTask** (not thinner Capture)
- Standing desktop ACT doorway (Thread → ACT no longer the normal discovery path)
- Capability registry + dual-form parity tests

## Out of scope / deferred

**DESKTOP-SPATIAL-EXPERIENCE-REFINEMENT** (later):

- DesktopReading visual/dimensional redesign
- Membership fact hierarchy / card weight on desktop
- Day rail dimensionality
- Central-field spatial composition
- Shadow/card/gradient fashion

Also deferred: Recurring Task physical acceptance (paused until this candidate is deployed and checked on both forms). Schema/materialization unchanged.

## Form-factor purposes preserved

| Form | Role |
| --- | --- |
| Phone | Continuity, touch, one-handed LOOK · + · ACT geometry |
| Desktop | Spatial command, denser LOOK / ADD / ACT labels, Week DTM, DesktopReading unchanged |

Desktop does **not** clone phone bezel hit targets. Phone emphatic circular ADD stays phone-scoped CSS.

## Desktop chrome

**Before:** Question · Position · Focus · Capture

**After:** LOOK · ADD · ACT (`data-reach-grammar="look-add-act"`)

Legacy Capture is not a top-level peer. `CaptureSurface` remains in the codebase for historical/writer reuse but is not opened from production `/` chrome. Establishment uses ADD → DirectTask / DirectNote / … Notes return uses LOOK → Notes.

## Capability registry

`components/orient/formFactorCapabilities.ts`

Declares phone/desktop doorways. Explicit specialization:

- `desktop-week-dtm` — DIRECT-TEMPORAL-MANIPULATION-CONTRACT-001 V1 is desktop Week only

## Tests

- `components/orient/formFactorParity.test.tsx` — both forms, LOOK/ADD/ACT reachability
- Existing LOOK/ADD/ACT, stewardship, recurring, note-return, desktop-reading suites updated for converged chrome

## SEMANTIC PARITY + FORM-FACTOR-SPECIFIC COMPOSITION

Same ontology and human capabilities on both forms. Different physical expression allowed. Accidental phone-only operational maturity after MOBILE-LOOK-ADD-ACT-001 is closed by this tranche for doorways named in the registry.
