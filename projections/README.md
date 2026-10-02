# Projections

`resume.ts` derives Resume from an Active Thread and open Tasks. It does not read the clock, the network, or Supabase.

`rankNow` is intentionally absent. NOW is not implemented.

The Work fiscal-week function that proves injected time and an explicit time zone is in `domain/time`.
