# STEWARDSHIP-DOORWAY-IMPLEMENTATION-001

Date: 2026-10-07.

Baseline HEAD: `c597359acd1875520396ffd56d6adbb0c7dd1284` (main).

Prior foundation:

- RECURRING-STEWARDSHIP-CONTRACT-001 / PERSISTENCE / PROJECTION
- ACT-ACTIONABLE-ATTENTION-IMPLEMENTATION-001
- ACT-PHYSICAL-REFINEMENT-001

## Purpose

Smallest human doorway so Tyson can tell Orient:

> This is something I continually steward.

No generic recurrence editor. No dashboard. No seed data. No migrations.

## Human establishment model

- **What do I steward?** — wording
- **Returns** — Each workday / Each work week
- **Context** — optional existing Context
- **Save** — `establishStewardshipDefinition`

## Doorway choice

Intent-preserving doorways:

| Entry | Behavior |
| --- | --- |
| ACT → Add Task | unchanged direct Task create; returns to ACT |
| ACT → Stewardship | establish stewardship; returns to ACT |
| ADD chooser → Task | unchanged |
| ADD chooser → Stewardship | establish stewardship |
| LOOK → Stewardship | manage list of active definitions (edit / stop stewarding) |

ACT projection is not the only management path.

## Cycle-language mapping

| Human | Internal |
| --- | --- |
| Each workday | `workday` |
| Each work week | `lowes_fiscal_week` |

ACT occurrence reading remains Workday / This week. `lowes_fiscal_week` is not shown to the human.

## Return relationship

`create-stewardship` carries `returnTo?: "act" | "stewardship-manage"`.
Save / Close returns to that surface. ADD-origin closes normally.

## Immediate ACT projection

After establish + reload, an unsatisfied occurrence appears only when Work truth admits it (Scheduled gate). Off / missing Work do not invent attention.

Mid-cycle establishment is readable via `wordingForOccurrence`: founding wording applies in the establishment cycle; later mid-cycle edits still wait for the next cycle.

## Inspection

ACT stewardship rows are inspectable. Detail shows wording, Each workday / Each work week, optional Context, and current-occurrence state when relevant.

LOOK → Stewardship lists active definitions even when ACT does not admit them (Off, satisfied, etc.).

## Edit-forward

**Edit wording** → `editStewardshipDefinitionForward` (append revision).
No history browser. Mid-cycle note when current-cycle wording differs from latest.

## Retirement

**Stop stewarding** → `retireStewardshipDefinition`.
History preserved. No unretire in V1. Not framed as Delete.

## Management reachability

Active definitions remain reachable from LOOK → Stewardship regardless of ACT admission. Satisfied and Off-day definitions remain listed while active.

No dedicated dashboard.

## Tests

- `components/orient/stewardshipDoorway.test.tsx`
- `domain/stewardship.test.ts` (cycle language + founding wording)
- existing LOOK/ADD/ACT, stewardship persistence/projection suites

## Deferred

Stewardship setup polish, unretire, history browser, categories, scoring, notifications, employee/zone models, desktop redesign.

## Physical-acceptance refinement

**STEWARDSHIP-CYCLE-SELECTION-REFINEMENT-001** (baseline `17fde71`):

Physical acceptance confirmed establishment, LOOK management, and ACT Work gating.
Remaining defect: cycle choice did not paint a clear selected state.

Correction (presentation only):

- Keep default `workday`, `aria-pressed`, and Save mapping unchanged.
- Selected cycle reuses Orient key selected vocabulary (fill, border, text) plus
  weight, inset edge, and a “Selected” label so selection is not color-alone.
- Scoped to `[data-stewardship-cycle]`. Inspect/edit flows show cycle as text
  only; no second selector to align.
- No persistence, ACT admission, Work-gate, schema, or data changes.

## Validation

- Targeted doorway / ACT / stewardship / LOOK-ADD-ACT / phone — pass
- Full suite: 113 files / 976 tests — pass
- Lint — pass
- Typecheck — pass
- Production build — pass

No migration. No commit. No push. No seeded stewardship data.

## Final verdict

**STEWARDSHIP-DOORWAY-IMPLEMENTATION-CLEAR**
