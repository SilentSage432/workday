# DESKTOP-OPERATIONAL-SPATIAL-BORROWING-001

Date: 2026-10-08.

Baseline HEAD before implementation: `17b0fb883a40400db2014119568b82a44e8caf4a` (`main`).

Discovery authority: DESKTOP-OPERATIONAL-SPATIAL-BORROWING-DISCOVERY-001  
Discovery verdict: `DESKTOP-OPERATIONAL-SPATIAL-BORROWING-FOUNDATION-CLEAR`

## Purpose

Establish the first coherent desktop operational spatial model for LOOK · ADD · ACT now that the resting desktop Day territory is physically accepted.

## Accepted foundations (not reopened)

- Desktop Day horizontal temporal territory (DESKTOP-DAY-SPATIAL-TERRITORY-001 + PHYSICAL-REFINEMENT-001)
- Cross-form-factor semantic convergence (LOOK · ADD · ACT capabilities shared)
- One shared `surface` state machine

## Model

### One operational shell

LOOK, ADD, ACT, and nested operations continue to use the single borrowed surface dialog. Desktop specialization is physical composition, not duplicated domain logic.

### Temporary lateral borrow

On desktop only:

```
RESTING:   [                TEMPORAL WORLD                ]
OPERATING: [         TEMPORAL WORLD         ][ OPERATION ]
CLOSED:    [                TEMPORAL WORLD                ]
```

The temporal/world region yields a bounded right-side column. The operation participates in layout (`grid-area: operation`). It does not overlay/cover the field.

Hooks:

- `data-spatial-borrow="true|false"`
- `data-borrow-mode="lateral"`
- `data-borrowed-operation` (surface kind or establish/refer)
- `data-borrow-width="standard|tight"` (ADD family uses tight)

Borrow width guidance:

- standard: `min(28rem, 36vw)`
- tight (ADD family): `min(22rem, 30vw)`
- field floor: `minmax(20rem, 1fr)` (Month keeps Direction + field floors)

No scrim. No modal takeover (`aria-modal="false"`). No permanent dock. Closing releases the column; the world reclaims it. DesktopReading / Landscape stay mounted where current semantics permit.

### Desktop surface material

Desktop borrowed territory uses a restrained opaque Orient surface (`#141820`, no `backdrop-filter`). Phone sheet glass remains phone-scoped.

### LOOK — navigator + lens first

Desktop LOOK first screen answers “How do I want to look at my temporal world?”

Primary (always visible):

- Ask / temporal question (Present · Day · Week · Month)
- Where in time
- Focus

Secondary (progressive disclosure via `<details data-look-operations-disclosure>`):

- Notes, Stewardship, Recurring Tasks, Manage Work schedule, Google Calendar, Sign out

Current orientation is summarized in `data-look-orientation` (question · position · Focus). Capabilities are unchanged.

Phone LOOK remains the full always-visible list (no disclosure redesign).

### ADD — chooser first

AddChooser remains the first operation. ADD decides WHAT; temporal paths may establish WHEN. No direct empty-field create. ADD family uses the tighter borrow width. Semantics unchanged.

### ACT — temporary actionable attention

ACT occupies borrowed territory while the temporal world remains perceptible. Must do · Stewardship · Today · Other open · Start · complete/reopen · inspect/edit · planning preserved. Not a permanent sidebar, dashboard, KPI surface, or capacity inventory. Silence remains unmarked.

## Zero-reorientation contract

Opening and closing LOOK / ADD / ACT without intentionally changing temporal state preserves question, anchor, Focus, depth, relevant scroll/Now relationship, membership layout, ActiveThread, and opener focus. DesktopReading is not remounted merely to release borrow.

Close paths: Close control, Escape, standing-control toggle (existing).

## Compatibility

Works over Present, today’s Day, non-today Day, Week, and Month. Week DTM selection/lift/drag/Escape ownership is unchanged (one Escape owner). Month Direction stays outside the borrowed column.

## Explicit non-goals

Phone LOOK/ADD/ACT redesign; resting Day redesign; Week/Month redesign; permanent sidebar; dashboard/KPI; glassmorphism; animation spectacle; Note deletion; Pulse; Wear OS; recurrence/schema/domain changes; new dependencies.

## Physical acceptance

Not claimed. Candidate requires human desktop judgment after commit / push / deploy.

## Surfaces

- `components/orient/OrientView.tsx`
- `components/orient/Surfaces.tsx` (LookSurface progressive disclosure)
- `components/orient/orient.css`
- `components/orient/desktopReading.test.tsx`
- `components/orient/formFactorParity.test.tsx`
- `PROJECT_CONTEXT.md`
