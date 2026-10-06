# PRODUCTION-UI-001 — Production temporal instrument

Date: 2026-10-05.

Baseline: `67e12b075a1907750bcf1a31666e7a8dff78d240`.

Design: [../decisions/2026-10-05-production-experience-design.md](../decisions/2026-10-05-production-experience-design.md).

This implements the signed-in production instrument. It does not amend domain semantics, schema, or the production-experience design. It does not close operational adoption.

The first visual embodiment of this chassis was rejected in human acceptance. That rejection is recorded in [PRODUCTION-VISUAL-EMBODIMENT-001.md](PRODUCTION-VISUAL-EMBODIMENT-001.md). The interaction chassis in this record remains. The rejected skin does not.

## Architecture

`/` renders `OrientInstrument` for a signed-in session. Presentation state — question, anchor, per-question scroll, Context focus, selection, inspection, and which transient surface is open — is not stored.

The view calls the existing projections and write functions:

- Day and Present use `composeDayCanvas` and, where the question allows it, `composeWorkCapacityReading`
- Week uses `composeWeekShapeReading` for an explicit seven-date window
- Month uses `composeMonthReading` for an explicit twenty-eight-date window
- Establishment, edit, and delete use the existing Protected Time, Block, and Commitment functions
- Capture uses the existing Task and Note establishment functions
- The Active Thread uses Resume, Start, Leave, and the open-task edit and completion paths

`/schedule` remains the work-week editor, reached from inspection of Work. `/instrument` remains the historical prototype.

## Acceptance

The interaction chassis was not rejected. Its first visual embodiment was. Human visual acceptance is still required, against the corrected skin in [PRODUCTION-VISUAL-EMBODIMENT-001.md](PRODUCTION-VISUAL-EMBODIMENT-001.md). Phone acceptance of this tranche would still not be operational adoption.
