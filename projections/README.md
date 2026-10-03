# Projections

`resume.ts` derives Resume from an Active Thread and open Tasks. It does not read the clock, the network, or Supabase.

`today.ts` derives Today from open Tasks whose planned day equals a supplied civil date. It does not read the clock, the network, or Supabase. It does not rank Tasks. The app supplies that date from the confirmed IANA zone.

`protectedTime.ts` classifies stored Protected Time against a supplied instant and confirmed time zone. It keeps current and upcoming rows in chronological order. It does not read the clock, the network, or Supabase. It does not calculate capacity or free time.

`block.ts` classifies stored Blocks the same way. It does not read Protected Time, and it does not calculate overlap, capacity, or free time.

`commitment.ts` classifies stored Commitments the same way. It does not read Protected Time, Blocks, the Work schedule, or Tasks. It does not calculate capacity, availability, or a conflict. A local time that cannot be mapped to an instant stays unresolved when the civil date can still contain the interval, and past when that date is already before yesterday. That past reading uses the civil bound, not a fabricated instant.

`timeline.ts` composes a scheduled Work shift, Protected Time, Blocks, and Commitments across a requested half-open civil range. It keeps each fact's meaning, including overlaps. It does not read the clock, the network, or Supabase. It does not calculate capacity, availability, or a conflict. The decision is [docs/decisions/2026-10-02-timeline-composition.md](../docs/decisions/2026-10-02-timeline-composition.md).

`dayCanvas.ts` asks that projection for one civil day and derives read-only visual geometry from the returned facts. It does not compose a second meaning, and it does not read the clock, the network, or Supabase. The decision is [docs/decisions/2026-10-02-day-canvas.md](../docs/decisions/2026-10-02-day-canvas.md).

`workDay.ts` reports whether a Work date is unknown, Off, or a scheduled shift, and whether a supplied instant is before, during, or after that shift.

`workOrientation.ts` composes that fact with Power Hour and the next established Work boundary. It does not read the clock, the network, or Supabase. It does not rank Tasks or select an Opening step.

`rankNow` is intentionally absent. NOW is not implemented.

The Work fiscal-week function that proves injected time and an explicit time zone is in `domain/time`.
