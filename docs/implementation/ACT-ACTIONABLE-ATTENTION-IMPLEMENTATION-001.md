# ACT-ACTIONABLE-ATTENTION-IMPLEMENTATION-001

Date: 2026-10-07.

Baseline HEAD: `4cff7f97d436180427d9b181c17321416b7ac019` (main).

Authoritative contracts:

- WORK-OPERATING-CADENCE-DISCOVERY-001
- RECURRING-STEWARDSHIP-CONTRACT-001
- RECURRING-STEWARDSHIP-PERSISTENCE-CONTRACT-001
- RUN-THE-BUSINESS-PROJECTION-DISCOVERY-001
- RECURRING-STEWARDSHIP-PERSISTENCE-IMPLEMENTATION-001

## Purpose

Evolve production phone ACT from a flat open-Task inventory into the accepted actionable-attention composition so ACT answers:

> What deserves my attention from what I already established?

## Prior ACT behavior

Phone ACT (`ActSurface` → flat task list) ordered all open Tasks as MustDo → planned for viewpoint → remaining, with inspect / Start / Complete through Task Detail. Stewardship was not projected. Other open Tasks competed as primary rows.

## New semantic composition

Stable navigation order (not algorithmic importance):

1. **Must do** — open Tasks with `mustDo = true`
2. **Stewardship** — admitted unsatisfied current-cycle stewardship occurrences
3. **Today** — open non-MustDo Tasks with `plannedOn === viewpointCivilDate`
4. **Other open** — remaining open Tasks (secondary disclosure)

Resume / ActiveThread remains outside ACT.

Task and stewardship remain distinct domain types. No flattening.

## Section admission

| Section | Admission |
| --- | --- |
| Must do | open + `mustDo` |
| Stewardship | projection helpers; Scheduled gate; unsatisfied |
| Today | open + not MustDo + `plannedOn === viewpointCivilDate` |
| Other open | open + not MustDo + `plannedOn !== viewpointCivilDate` |

MustDo Tasks planned today do not appear in Today.

Empty primary sections are omitted. Zero stewardship definitions render with no Stewardship section and no invented rows. Calm empty copy only when nothing is admitted at all: “Nothing established needs attention here.”

## Stewardship admission

Loads definitions / revisions / satisfactions through existing persistence. Projects with `readStewardshipOccurrence` and `actStewardshipWorkContext` in `components/orient/actAttention.ts`.

- Workday: active + applicable wording + operative/viewpoint Scheduled work_on + not satisfied
- Weekly: active + current Lowe's fiscal-week cycle + viewpoint/operative Work Scheduled + not satisfied
- Off / missing Work: no Work stewardship in primary ACT
- Overnight: when viewpoint is civil now, operative Scheduled `work_on` owns the workday cycle key

No occurrence materialization. No Scheduled invention.

### Viewpoint / current-date decision

ACT Tasks continue to use instrument `anchor` as `viewpointCivilDate`.

Stewardship follows the **same viewpoint (anchor)**:

- When viewpoint equals civil date of `now`, overnight uses operative Scheduled `work_on` for the workday cycle key; weekly cycle key still uses the viewpoint civil date’s fiscal week.
- When viewpoint is another day, stewardship uses that day’s Work entry (no overnight operative remap).

This keeps ACT’s Task Today and stewardship reading on one instrument relationship and avoids mixing arbitrary-anchor Task planning with “current now” stewardship silently.

## Other open secondary boundary

Collapsed disclosure: `Other open (N)`. Count is truthful. Expansion reveals the same Task row grammar (checkbox, inspect, Start). Does not compete with Must do / Stewardship / Today by default. Smallest change consistent with existing ACT visual grammar.

## Task checkbox semantics

Direct checkbox → existing `completeTask` via `onCompleteTask`. Task leaves active projection after reload. Immediate “Still open” uses `reopenTask`. Does not restore ActiveThread. Task Detail remains via row inspect. Start remains separate.

## Stewardship checkbox semantics

Direct checkbox → `satisfyStewardshipOccurrence` for exact `(definitionId, cycleKind, cycleKey)`. Row leaves stewardship projection. Withdraw uses `withdrawStewardshipSatisfaction` (“Not yet this cycle”). Does not write `completed_at`, mutate definition/revision, or convert stewardship into a Task.

## Acknowledgement

Shared correction strip: ☐ → check → “Marked complete.” / “Marked satisfied.” with Still open / Not yet this cycle. No gamification.

## ActiveThread / Resume boundary

Resume stays on phone Present reading. Completing ActiveThread Task preserves existing Task/ActiveThread writers. Stewardship cannot be Started; no stewardship ActiveThread.

## Deferred stewardship-management UI

No setup, editor, seed data, employee/zone models, or Business/Inventory/People/Environment categories. Zero production definitions remain valid.

## Tests

- `components/orient/actAttention.test.ts` — section admission, Off/missing, weekly satisfaction persistence, overnight, zero stewardship, no hard-coded categories
- `components/orient/lookAddAct.test.tsx` — Other open secondary, direct Task checkbox/correction, stewardship satisfy/withdraw, Resume outside ACT, Task Detail reachable, Start unchanged
- Existing `projections/stewardship.test.ts`, persistence, ActiveThread, Work, fiscal-week suites remain regression gates

## Files

- `components/orient/actAttention.ts` — composition + viewpoint stewardship context
- `components/orient/actTasks.ts` — re-exports
- `components/orient/Surfaces.tsx` — sectioned ActSurface, checkboxes, Other open
- `components/orient/OrientView.tsx` / `OrientInstrument.tsx` / `types.ts` — stewardship sources + satisfy/withdraw actions
- `components/orient/orient.css` — restrained ACT section/checkbox grammar
- Tests updated as above

## Explicit non-goals

No stewardship-management UI, seed data, migrations/schema changes, priority/urgency engines, gamification, desktop redesign, Work/Task/MustDo/ActiveThread/Notes/Calendar semantic changes.

## Validation

- Targeted ACT: `actAttention.test.ts`, `actTasks.test.ts`, `lookAddAct.test.tsx` — pass
- Targeted stewardship: `projections/stewardship.test.ts`, `persistence/stewardship.test.ts` — pass
- ActiveThread / fiscal-week / Orient regressions — pass
- Full suite: 112 files / 964 tests — pass
- Lint — pass
- Typecheck — pass
- Production build — pass

No commit. No push. No migration. No stewardship seed data. No stewardship-management UI.

## Final verdict

**ACT-ACTIONABLE-ATTENTION-IMPLEMENTATION-CLEAR**
