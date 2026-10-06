# DESKTOP-WEEK-REFINEMENT-001

Optical refinement only. Week architecture is accepted. Week semantics are accepted. This pass removes the extra Today authority on desktop Week and quiets the kind word. Physical acceptance is recorded in [DESKTOP-WEEK-ACCEPTANCE-001.md](DESKTOP-WEEK-ACCEPTANCE-001.md). This record does not change that grammar further.

Baseline: `c83f1e6e8c34635c49fe2ec914d32369ab4d68f0` on `main`. Diagnosis: [DESKTOP-WEEK-REFINEMENT-DIAGNOSTIC-001.md](DESKTOP-WEEK-REFINEMENT-DIAGNOSTIC-001.md).

## What changed

Desktop Week is the landscape inside `.orient-desktop-resolution`. Three overrides live there.

The Today column no longer paints `.orient-column[data-today="true"] .orient-column-body`. `data-today` remains.

The Week `.orient-now` element no longer paints its translucent veil. The element remains, with `aria-label="Now"`, `pointer-events: none`, and the same 1px gold stroke from 8% to 92% of the column, centered. It still mounts only when the column’s civil date is authoritative Today.

Kind words inside desktop Week columns use the existing muted ink and lose the text shadow. The word stays at the start of the span. Span geometry, overlap stacking, and hit targets are unchanged. The territory stays the primary mark.

## What stayed

The shared noon line, the seven columns, the 24-hour local-clock face, Work span fractions, overlap, empty territory, Work Off in the footer, shifting, Ask Day, inspection, and Return to Now are unchanged.

Month keeps `.orient-aperture[data-today="true"]` and `.orient-aperture .orient-now`. Phone Week still uses the unscoped column wash, because the phone is frozen and those base rules are shared. Present, Day, Exact time, Direction, the drawer, auth, provenance, midnight, the maker’s mark, and the reach are unchanged.

## State

Architecture accepted. Semantics accepted. Optical refinement implemented. Desktop Week — physically accepted.
