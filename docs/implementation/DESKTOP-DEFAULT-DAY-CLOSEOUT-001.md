# DESKTOP-DEFAULT-DAY-CLOSEOUT-001

Date: 2026-10-08.

Baseline HEAD before implementation: `5ce57f82d494f9a2a0aa1d353ab87ea369cf08d0` (`main`).

Discovery authority: DESKTOP-DEFAULT-DAY-CLOSEOUT-DISCOVERY-001  
Discovery verdict: `DEFAULT-DAY-CLOSEOUT-CLEAR`

## Physical context

DESKTOP-OPERATIONAL-SPATIAL-BORROWING-001 was physically evaluated in production.
User verdict: “I love the way it feels.”

The desktop spatial/operational foundation (Day territory, lateral borrowing,
LOOK · ADD · ACT composition, borrowed-surface material) is treated as
physically accepted and is not reopened by this tranche.

Remaining friction: fresh desktop Orient opened on Present.

## Historical behavior

`OrientView` initialized question as:

```ts
readInstrumentForm() === "phone" ? "day" : "present"
```

Phone already started on Day (`PRODUCTION-PHONE-EXPERIENCE-002`).
Desktop started on Present by that historical form-factor branch.
Startup question was never persisted.

## Correction

Fresh Orient startup asks **Day** on both form factors:

```ts
useState<OrientQuestion>("day")
```

The existing phone mount safety that reasserts Day before a human chooses a
question remains.

## Preserved

- Present remains a distinct temporal question
- LOOK → Present remains fully reachable
- Present Now composition and `chooseQuestionNow` Present behavior unchanged
- Day territory, borrow shell, LOOK/ADD/ACT composition, material unchanged
- No persistence, URL state, schema, domain, or migration changes
- Phone LOOK / ADD / ACT physical grammar unchanged

## Desired relationship

Startup → Day  
LOOK → Present remains available

## Physical verification

Not claimed. Candidate requires human verification after commit / push / deploy
that fresh desktop open lands on Day and Present remains reachable via LOOK.

## Surfaces

- `components/orient/OrientView.tsx`
- startup expectations in orient tests
- `PROJECT_CONTEXT.md`
- historical “Desktop still opens on Present” statements corrected where they
  described current behavior
