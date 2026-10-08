# ACT-PHYSICAL-REFINEMENT-001

Date: 2026-10-07.

Baseline HEAD: `b8886a5e95024adc729f4a1328b8e40958de7528` (main).

Prior tranche: [ACT-ACTIONABLE-ATTENTION-IMPLEMENTATION-001](./ACT-ACTIONABLE-ATTENTION-IMPLEMENTATION-001.md).

## Purpose

Bounded physical-acceptance correction for phone ACT interaction expression.
Semantic composition is unchanged.

## Physical findings

1. “Other open (N)” was unclear and visually competed with primary sections.
2. Completion replaced the row with a “Marked complete.” strip — correct, but unnatural.
3. Stewardship satisfaction needed the same crossed-off grammar.
4. Add Task from ACT closed ACT after Save, forcing reopen for the next Task.
5. Checkbox / title / Start read as disconnected controls on one Task row.

## Secondary-task language refinement

Admission unchanged: open, not MustDo, not planned for viewpoint Day.

Human expression is now quiet disclosure copy:

- `1 more task`
- `N more tasks`

Rendered as a muted text control (`orient-act-other-toggle`), not a primary ACT action card.
Expanded state still exposes inspect, Start, and direct completion.

No domain concept named “Remaining.”

## Completion acknowledgement refinement

Direct Task completion keeps the same semantic row:

- checkbox becomes checked
- title receives restrained line-through (`orient-act-title-done`)
- correction remains reachable as **Undo** (`reopenTask` / `data-still-open`)
- acknowledged row is filtered out of active open membership while shown
- ActiveThread is not restored by Undo

“Marked complete.” is no longer the primary visual event.

## Stewardship acknowledgement

Same checked + line-through row grammar.
Correction uses **Undo** → `withdrawStewardshipSatisfaction`.
Writers remain distinct from Task completion.

Zero stewardship definitions remain truthful (no Stewardship section).

## ACT-origin Add Task return

`create-task` surface may carry `returnTo: "act"`.

- ACT → Add Task sets `returnTo: "act"`
- Save / Close from that doorway returns to ACT
- ADD chooser → Task keeps `returnTo` unset (`none`) and still closes via existing `closeSurface`

No navigation-stack framework.

## Row alignment refinement

ACT rows use a coherent horizontal grid:

- fixed checkbox column aligned to content
- title/inspect remains the flexible middle target
- Start remains a distinct end control with adequate min touch size

No desktop redesign.

## Preserved semantics

Must do / Stewardship / Today / secondary open Tasks.
Resume outside ACT.
Work gates, fiscal week, MustDo, ActiveThread, persistence, and schema unchanged.

## Deferred stewardship management

No setup/editor UI, seed data, categories, scoring, or migrations.

## Tests

- `components/orient/actAttention.test.ts` — secondary admission + “N more tasks” expression
- `components/orient/lookAddAct.test.tsx` — secondary disclosure, same-row Task/stewardship acknowledgement, ACT return after Save/Cancel, ADD chooser non-ACT return, Resume/Start/inspect preservation

## Validation

- Targeted ACT / LOOK·ADD·ACT / stewardship / ActiveThread / phone — pass
- Full suite: 112 files / 967 tests — pass
- Lint — pass
- Typecheck — pass
- Production build — pass

No migration. No commit. No push. No stewardship seed data. No stewardship-management UI.

## Final verdict

**ACT-PHYSICAL-REFINEMENT-CLEAR**
