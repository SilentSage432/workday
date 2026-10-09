# MOBILE-CENTER-PLUS-CORRECTION-001

Implements the phone center ADD duplicate-plus correction from MOBILE-CENTER-PLUS-DISCOVERY-001 (verdict: CORRECTION-CLEAR).

Baseline HEAD before implementation: `830e5f8e6b3b94097d182b9943809a4d5ce92c0f` (`main`).

No schema migration. No persistence change. No domain change. No new dependencies. No CSS change.

---

## Physical observation

On the phone standing bezel, the center ADD control showed one large circular target with two stacked plus marks (glyph above a small text `+`), which looked redundant and off-center.

MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001 remains physically accepted and is not reopened by this tranche.

---

## Cause

One authoritative button `[data-add-control]` rendered both:

1. Lucide `<Plus aria-hidden="true" className="orient-glyph" />`
2. Phone-only text `<span>+</span>`

`.orient-control` uses a centered column flex layout, so the two marks stacked. Desktop correctly used Plus + visible `ADD` label.

---

## Correction

Phone: keep Lucide Plus only; do not render the redundant text `+`.

Desktop: unchanged — Plus icon + `ADD` label.

Accessible name remains `aria-label="ADD"`. Glyph stays `aria-hidden`. Same `onClick`, `aria-expanded`, circular phone hit target, and ADD chooser.

Existing flex centering centers the single glyph; no CSS adjustment was required.

---

## Explicit non-goals

Phone LOOK, ADD chooser redesign, ACT, Note lifecycle, Pulse, Wear OS, desktop operational borrowing, schema/domain/persistence.

---

## Physical acceptance

Not claimed. Candidate requires human phone verification after commit / push / deploy.

## Surfaces

- `components/orient/OrientView.tsx`
- `components/orient/lookAddAct.test.tsx`
- `components/orient/formFactorParity.test.tsx`
