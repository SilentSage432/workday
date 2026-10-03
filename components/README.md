# Components

Presentation lives here. Components render domain types and projections, and they call the persistence boundary. They do not own Supabase row shapes or product ranking.

`DayCanvas` draws one selected civil day from a day-canvas model. It does not decide which facts exist. Painted Work, Protected Time, Blocks, and Commitments stay visible and read-only. A transparent layer above that paint is the pointer target for the time column, so an established fact does not block a new temporal selection. `daySelection.ts` maps a pointer on that day to a transient local-clock range and, once that range has settled, to a transient intended meaning. The settled range can be refined from the same surface. `canvasEstablishment.ts` builds a Protected Time, Block, or Commitment input from that session. The canvas does not call Supabase. `WorkSchedule` persists that input through the existing create functions after the user saves, then reloads the day.
