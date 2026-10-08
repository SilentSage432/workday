# PRODUCTION-PHONE-EXPERIENCE-001 — Phone temporal continuity

The narrow production instrument was the desktop temporal field reduced into a portrait viewport. On a Samsung Galaxy S26 Ultra in portrait, that was still spatial command of time, only smaller. This record gives the phone its own reading of the same Orient facts.

An external visual concept was used as information-architecture evidence only: a readable present, larger nearby truths, a compact shape of the day, and room for other explicit information. Its visual design, navigation, "Coming Next" authority, Context assumptions, task ranking, semantics, and cards are not part of Orient.

Desktop remains spatial command of time. Phone is temporal continuity while moving through that same time. The ontology is shared. The hierarchy is not.

## Phone Present

Present on a narrow viewport answers four questions from explicit truth:

- Where am I in time? Authoritative local civil time, and the civil date. The time is the warm locative reference. It is not an alarm and not a recommendation.
- What established reality contains Now? Every current-temporal-orientation fact that contains the authoritative instant. Work, Protected Time, Block, and Commitment can coexist. None is chosen as the activity, the winner, or the thing that matters.
- What intention am I carrying? The Active Thread, in the existing words. `Resume: <title>` when a thread is established. "No thread is established." when none is. "The thread could not be read." when the read failed. Failure is not drawn as absence. The thread may disagree with the facts that contain Now.
- What shape does the day have? The whole-day signature, from the day canvas of that civil date.

If no established truth contains Now, the reading says so. It does not invent an activity. It does not say "Current activity."

Truths that contain Now sit in one peer row. A second truth wraps beside the others. The row does not rank them. Each surface uses the existing semantic hue and a non-color contour: solid Work, dashed Protected Time, double Block, dotted Commitment. Context focus still emphasizes a matching Context-bearing fact and quiets the others in place. Neutral truths stay ordinary. Focus stores nothing and does not become a current Context.

The Active Thread is a separate gold reference, the same intention material as the bezel thread. It is not painted as a time fact. Activating it opens the existing thread inspection.

## Phone Day

Day is not a second Present. Present orients around authoritative Now. Day orients across the selected civil date: the date, the canvas facts for that date in clock order, the same whole-day signature, and entry to the precision clock. Clock order is sequence, not importance.

The Active Thread stays the human's established intention. It is not filtered to the selected date.

## Whole-day signature

`components/orient/phoneSignature.ts` maps the day canvas. It does not keep a second temporal model.

A local-clock minute is `minute / 1440` along the rail, clamped to the civil day. A fact's visible start and end use that same fraction. Overlap is both facts occupying the same interval. Inspection of a mark refers every fact that overlaps it, which is the existing shared-point inspection. Bare rail is nothing established. It is not labeled free or available. Work Off is the explicit off fact, shown as Off.

The signature draws Work, Protected Time, Block, Commitment, overlap, Off, the Now mark when the selected date is today, and the bare ground. It does not score utilization, density, busyness, or importance.

Touching a mark inspects that truth. Touching the ground opens exact Day at that minute. A keyboard activation of the ground opens exact Day without inventing minute 0. Now is a warm mark on the rail. The mark is not the hit target. The ground and the facts are buttons. A narrow fact keeps a larger invisible hit area. The visible width stays the exact fraction. Words live in the reading and in inspection, not crammed into the rail.

## Precision Day

The vertical Day canvas is unchanged in meaning. On the phone it is no longer the default reading. It is the precision surface: exact position, reference, Protected Time, Block, Commitment, bound refinement, and the existing draft handles.

The entry is explicit. **Exact time** moves closer to the same civil day. **Orientation** returns to the phone reading. This is not a pinch and not another page. A signature minute is kept on the instrument and scrolled into the upper field with the same offset used for Now. Present without a chosen minute brings Now. Day without a chosen minute aligns that civil day. Leaving Capture, inspection, or Context focus does not change the anchor or that minute.

Establishment, update, removal, and handle refinement still use the existing Day clock and the existing writes.

## Reach, Capture, Week, Month

The bezel stays the reach for question, position, Context focus, and Capture. Sign-out stays inside position. On the phone reading, the large thread lives in the composition, so the bezel does not repeat it. Exact time, Week, and Month show the bezel thread again. There is no bottom navigation bar.

Capture remains on that row. Opening it, and the keyboard inset already driven by the visual viewport, does not relocate the temporal place.

Week stays the centered seven-day signature. Month stays the rolling 7 × 4 field. A quiet Month date still asks Day. On the phone, that ask opens the Day reading for the date. Exact time then opens the canvas there. A fact still inspects and does not ask Day.

## Boundary

Shared: projections, writes, domain truth, temporal authority, Context semantics, Active Thread, Capture, inspection, establishment, and the visual identity.

Different: `components/orient/PhoneContinuity.tsx` is the phone reading. The desktop branch still mounts the vertical clock. The choice is `matchMedia("(max-width: 959px)")`, the same edge as the existing desktop layout, stored as `data-form`. Depth `reading` or `exact` applies only to phone Present and Day.

No domain module, persistence, schema, or migration changed.

Task participation in this tranche is the Active Thread only. MustDo, Today via `planned_on`, due date, Task-to-Block citation, and Direction service are different truths. They are not flattened into a list here. The Day reading can receive a later explicit task projection. It does not fake one.

The production identity is unchanged: deep navy, warm gold reference, semantic temporal hues, restrained glass, and the existing type. No logo was added. The Beacon-like mark is not canon.

Motion is the existing arrival of a question body when exact time opens. `prefers-reduced-motion` removes it. There is no ambient animation. Signature facts are not blurred. The clock tick still only updates Now. The phone reading does not run the Day scroll observer, so it cannot extend or re-anchor the field.

## Preservation

PRODUCTION-TEMPORAL-STABILITY-001 stays. Startup still orients Present to the authoritative civil date. The viewpoint is still not today. Manual Day traversal still owns the canvas scroll. Now does not chase. Capture, inspection, and Context focus still do not move the place. Return to Now is explicit. On the phone it opens exact time at Now. Month quiet ground still asks that date. Fact edits still propagate through the same projections. Draft handles still refine the open interval.

Desktop wider than 959px still shows the continuous canvas, the centered Week, the 7 × 4 Month, Direction beside Month, and the trailing dock.

## Unresolved

- The phone reading was directionally accepted, and its portrait composition is [PRODUCTION-PHONE-EXPERIENCE-001A.md](PRODUCTION-PHONE-EXPERIENCE-001A.md). A fresh phone entry now opens on Day; that change is [PRODUCTION-PHONE-EXPERIENCE-002.md](PRODUCTION-PHONE-EXPERIENCE-002.md). Desktop later adopted the same Day startup in [DESKTOP-DEFAULT-DAY-CLOSEOUT-001.md](DESKTOP-DEFAULT-DAY-CLOSEOUT-001.md); Present remains reachable through LOOK.
- A Galaxy S26 Ultra in landscape can be wider than 959px. It then receives the desktop composition. Portrait is the phone reading this tranche built.
- Richer task readings remain deferred until a product decision gives each truth its own meaning.
- Desktop drawers remain unauthorized.
- The final logo remains unimplemented.
