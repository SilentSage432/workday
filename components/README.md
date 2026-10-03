# Components

Presentation lives here. Components render domain types and projections, and they call the persistence boundary. They do not own Supabase row shapes or product ranking.

`DayCanvas` draws one selected civil day from a day-canvas model. It does not decide which facts exist, and it does not write them.
