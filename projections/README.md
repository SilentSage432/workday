# Projections

`resume.ts` derives Resume from an Active Thread and open Tasks. It does not read the clock, the network, or Supabase.

`workDay.ts` reports whether a Work date is unknown, Off, or a scheduled shift, and whether a supplied instant is before, during, or after that shift.

`workOrientation.ts` composes that fact with Power Hour and the next established Work boundary. It does not read the clock, the network, or Supabase. It does not rank Tasks or select an Opening step.

`rankNow` is intentionally absent. NOW is not implemented.

The Work fiscal-week function that proves injected time and an explicit time zone is in `domain/time`.
