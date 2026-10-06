# DAY-ANCHOR-PROVENANCE-001

Records whether a viewpoint follows Today or has been moved. Temporal behavior is unchanged. Midnight does not move an anchor. The bit is not persisted.

Contract: [DAY-ANCHOR-PROVENANCE-DISCOVERY-001.md](DAY-ANCHOR-PROVENANCE-DISCOVERY-001.md).

## Representation

The anchor remains a civil-date string. `OrientInstrument` still owns that string and still samples it once, while it is empty, from Today.

`OrientView` owns the bit. A fresh mount follows Today.

```ts
type ViewpointProvenance = "follows-today" | "moved";

type QuestionPlace = {
  anchor: string;
  scroll: number | null;
  provenance: ViewpointProvenance;
};
```

Day, Week, and Month each remember one place. Present does not. The live bit is rendered as `data-viewpoint` on the instrument so a test can read it. Nothing in the stylesheet uses that attribute. `anchorCause` is still the alignment latch.

## Writes

These mark the viewpoint in force Moved, and they write the anchor only when they already did:

- Previous, Next, and a typed civil date
- Ask Day, which also stores Day's place as moved before the question changes
- A Week or Month shift, which marks that question only
- An exact-time scroll that crosses into another civil date

These follow Today, and they write the anchor only when they already did:

- Asking Present
- Today
- Return to Now

Entering Exact time, leaving it through Orientation, a clock tick, and civil midnight do not change the bit. A typed date that happens to be Today is Moved. Today and Return to Now follow Today even when the anchor is already that date, and in that case they do not call `onAnchor`.

A Week or Month shift does not rewrite Day's remembered place. Ask Day remembers the landscape question first, with that question's own bit, then stores Day as moved.

## Restoration

`remember` copies anchor, scroll, and the bit for Day, Week, and Month. It does not copy Present.

Returning to a remembered question restores that bit even when the civil date already matches, so a moved Today is not reread as follows Today. A place that follows Today stays that way when midnight makes its stored date differ from the new Today. The clock does not rewrite the stored date or the bit.

A question visited for the first time keeps the anchor already in force and does not invent a bit of its own. Its bit is whatever the viewpoint in force already was, until one of the writes above.

## Midnight

No new midnight law. A clock tick updates Now. Midnight does not rewrite the anchor, a remembered place, or the bit.

After midnight this state is valid:

```text
anchor = yesterday
provenance = follows Today
```

It means the viewpoint was never moved, and its sampled Today has become historical. This tranche does not correct it.

## Present

Asking Present samples Today with the existing write, follows Today, and does not restore a historical Present place. Present's date label still follows the anchor while membership follows the live instant. That midnight split remains unresolved.

## Persistence

The bit lives in component state and in the view's place ref. Refresh, a cold start, and sign-out then sign-in mount a new view. The new view follows Today and does not restore the previous date. Nothing is written to storage.

## Evidence

`components/orient/viewpointProvenance.test.tsx` proves the bit:

- a fresh viewpoint follows Today
- Previous, Next, a typed date, and a typed Today mark Day moved
- Ask Day marks Day moved, Present follows Today, and Day restores moved
- a Week shift and a Month shift mark that question moved and restore Day as follows Today
- an exact-time civil-date crossing marks the viewpoint moved, and Orientation leaves it moved
- Today and Return to Now follow Today, including a Today click that does not write the same date again
- a moved date that later equals Today stays moved across a question round trip
- midnight leaves both a following viewpoint and a moved viewpoint unchanged, and does not write the anchor
- a new mount restores neither the previous date nor the previous bit

Existing phone, desktop, temporal-origin, field-scroll, and Orient view tests were not rewritten. They still pass, including phone Day remaining on the prior civil date after midnight, passive ticks, the October 8 Present round trip, desktop Present, desktop Day, and Exact time return.
