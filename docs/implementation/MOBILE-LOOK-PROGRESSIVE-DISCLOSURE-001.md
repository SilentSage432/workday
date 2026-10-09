# MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001

Implements phone LOOK progressive disclosure from discovery MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-DISCOVERY-001 (verdict: FOUNDATION-CLEAR).

Baseline HEAD before implementation: `71388758358d41bf82e5d752d0673f5677b06d27` (`main`).

No schema migration. No persistence change. No domain change. No new dependencies.

---

## Physical evidence

On a production phone at Lowe’s, opening LOOK presented too many different kinds of capability at similar visual weight: temporal lenses, position controls, Focus alternatives, established-things doorways, schedule/source management, and Sign out. The reaction was cognitive overload (“aaaggghhh”).

The problem was not missing capability. The problem was disclosure hierarchy.

Working principle:

> LOOK should initially show the current state of orientation, not the complete inventory of ways orientation can be changed.

Orientation is not management.

---

## Phone composition before

Always-visible vertical inventory:

1. LOOK header
2. Ask the field (Present / Day / Week / Month)
3. Where in time (prev / next / Today / civil date)
4. Focus (Everything + contexts)
5. Operations (Notes, Stewardship, Recurring Tasks, Manage Work, Google Calendar, Sign out)

`data-look-role="full"`. No orientation summary. No progressive disclosure.

---

## Phone composition after

`lookComposition="phone-calm"` (`data-look-role="phone-calm"`):

1. LOOK header / lead
2. Orientation summary (`data-look-orientation`: Question · position · Focus)
3. Ask the field — **immediately visible** (existing 2×2 keys)
4. Collapsed Position disclosure — current place in summary; existing `PositionSurface` on expand
5. Collapsed Focus disclosure — current Focus in summary; existing `FocusList` on expand
6. Collapsed Operations disclosure — existing shared operations block

Native `<details>` / `<summary>` for Position, Focus, and Operations. No new React open-state. Summary rows use full action-row touch height.

Question remains orientation, not configuration — intentionally not behind a disclosure.

---

## Capabilities preserved

| Capability | Reachability |
| --- | --- |
| Present / Day / Week / Month | One-tap QuestionList (unchanged) |
| Position move / Today / civil date | Expand Position → existing controls; LOOK stays open |
| Focus change | Expand Focus → existing choices; choosing Focus closes LOOK |
| Notes / Stewardship / Recurring Tasks | Expand Operations → same nested surfaces |
| Manage Work / Google Calendar | Expand Operations → same nested surfaces |
| Sign out | Inside Operations (not primary orientation weight) |
| Close / Escape / sheet shell | Unchanged |

Nested management surfaces are not redesigned.

---

## Desktop unchanged

Desktop keeps `lookComposition="navigator-lens"`:

- orientation summary
- full Question / Position / Focus
- Operations disclosure only
- lateral borrowed territory
- existing material / width / close behavior

Phone specialization does not alter desktop LOOK composition. Regression coverage asserts no Position/Focus disclosure markers on desktop.

---

## Architecture

Shared `LookSurface` — not forked. `operationsDisclosure` boolean generalized to `LookComposition`:

- `navigator-lens` — desktop
- `phone-calm` — phone

OrientView wires `lookComposition={form === "desktop" ? "navigator-lens" : "phone-calm"}`.

Authoritative handlers remain shared: `chooseQuestion`, `moveViewpoint`, `adoptToday`, Focus choose, nested surface entry, close/return.

---

## Explicit non-goals (deferred)

- Duplicate small phone `+`
- ADD / ACT redesign
- Note deletion / lifecycle
- Orient Pulse / notifications / Wear OS
- Recurring-task physical acceptance
- Google Calendar removal reconciliation
- Desktop redesign / Day territory / Week / Month redesign
- Schema / domain / persistence

---

## Physical acceptance

Not claimed. Candidate requires human phone evaluation after commit / push / deploy (same class of use that produced the Lowe’s evidence).

## Surfaces

- `components/orient/Surfaces.tsx` (`LookSurface`, `LookComposition`)
- `components/orient/OrientView.tsx`
- `components/orient/orient.css` (phone-scoped disclosure styles)
- `components/orient/lookAddAct.test.tsx`
- `components/orient/formFactorParity.test.tsx`
