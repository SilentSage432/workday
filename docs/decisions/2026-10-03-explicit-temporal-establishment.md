# Explicit establishment of selected temporal truth

Date: 2026-10-03.

## Decision

A transient selection and an intended meaning are not temporal truth.

The user authorizes persistence by an explicit final action. Selecting a range, choosing a meaning, refining the range, and filling fields do not write a row.

That action is labeled Save. Saving is the word already used when Protected Time, a Block, or a Commitment is established from Manage schedule. It is not a new domain primitive, and it is not one generic event. Save on the canvas calls the existing create path for the chosen kind.

## Phone evidence

Real use of V0-012A on a phone carried these observations into this tranche:

- Hold, drag, and release still feel natural.
- Choosing a purpose or adding a commitment reaches an obvious dead end. The user expects the interaction to continue until the fact is established.
- The user expects an explicit Save.
- After a successful Save, the surface should close, the transient selection should disappear, and the new fact should remain on the canvas.
- Tap outside the surface, and an X, are the natural ways to abandon an unsaved interaction. Clear remains useful. At this stage Close, outside tap, and Clear reach the same unsaved state. The difference is the affordance, not a second persistence rule.
- The precise time controls are capable, and they feel overly eager on a phone. Pressing one appeared to enter a highly granular editing state immediately. Precision should be available without those controls hijacking the interaction.
- The user values selecting time that already contains an established fact and giving that same territory additional meaning. Established temporal truth does not close that territory. Overlap is not a conflict.

Real use of this tranche on a phone then separated two claims that had been traveling together:

- Domain overlap is legal. A new Protected Time, Block, or Commitment can be saved over Work and over other established facts. Save is not refused, and nothing is marked a conflict.
- Canvas reachability is a different question. After Protected Time was saved, the contextual surface closed, the transient selection disappeared, and the hatched fact remained. A new touch on that rendered region did not start a temporal selection. The same territory had been selectable before the fact was painted there.

Established temporal truth must not make its underlying temporal territory unreachable. That is an interaction invariant. It is not a claim that an established fact can never itself become interactive. Talking about an existing fact — editing it, moving it, resizing it, or deleting it — remains unresolved. V0-013A restores the ability to refer to the time. It does not invent fact interaction.

## What is asked

Protected Time needs the selected range. Its label stays optional and secondary.

A Block needs a purpose. Context stays optional, defaults to none, and is never inferred. No Task is created.

A Commitment needs a title. No attendees, location, notes, recurrence, reminders, or calendar fields are asked.

The selected bounds stay visible and editable until Save. Refining them keeps the meaning and the fields for that meaning. Changing the meaning clears fields that no longer apply.

## Unresolved local clocks

Persistence stores local `HH:MM` text. It does not choose an instant. If the selected range does not occur, or occurs twice, Save stays unavailable. No instant is fabricated, and no fall-back occurrence is chosen. Ordinary hours on those civil days can still be saved. This tranche does not decide a new DST policy.

## What this tranche refuses

No migration, new table, new column, or generic event table. No auto-save. No conflict, capacity, availability, free/busy, or priority. Existing facts stay read-only. Resize handles stay deferred. The canvas time controls are steppers so a phone does not open a native minute wheel. Manage schedule keeps its existing time fields.

The tranche record is [../implementation/V0-013.md](../implementation/V0-013.md).

V0-013A corrects canvas reachability after the phone evidence above. The time column keeps a pointer layer above the painted facts. Those facts stay visible. Domain overlap is unchanged. See [../implementation/V0-013A.md](../implementation/V0-013A.md).

Phone evidence on the diagnostic build then separated time and truth as two ways of referring. Established temporal truth remains traversable as time: a hold can still begin on it and paint through it. It is also addressable as truth: a short tap on the painted fact refers to that fact. The distinction is interaction, not domain priority. See [../implementation/V0-014.md](../implementation/V0-014.md).

A later phone session accepted that reference for an existing Protected Time and showed that the reference by itself left the fact unusable. User-created Protected Time, Blocks, and Commitments can now be edited explicitly, and deleted only after confirmation. Save is the authority boundary for the change. The existing row keeps its identity and kind. A Commitment update keeps user_created. Work schedule lifecycle stays separate. Overlap stays legal. Temporal reachability stays: a hold through a fact still refers to time, and a scroll that begins on a fact still scrolls. Direct manipulation of a fact is not established. See [../implementation/V0-015.md](../implementation/V0-015.md).
