# TIMED-FACT-CIVIL-DATE-CORRECTION-001

ACCEPTED.

Baseline: `bb23527ddc2e4cb7d4a1bf834cb6520a85dfcc51` on `main`.

Discovery: [ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md).

Contract: [TIMED-FACT-CIVIL-DATE-CORRECTION-CONTRACT-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-CONTRACT-001.md).

## What was missing

Production inspection could edit the clock and the type-specific attributes of an existing timed Protected Time, Block, or Commitment. Save called `updateFromStored` with `stored.startsOn`, so the civil date could not change. The `update*` writers already accepted a new `starts_on` on the same id. The gap was production reachability.

## What this does

Changing the civil date corrects the placement of that existing timed fact. It does not create a replacement.

`FactDetail` holds a civil-date draft, initialized from `stored.startsOn`. The control is a date field beside the existing start and end fields, shown only while Edit is open on a stored timed fact. Changing the date does not write. Save passes the draft date into `updateFromStored` and into `selectionLocalClock`.

`updateProtectedTime`, `updateBlock`, and `updateCommitment` are unchanged. There is no new persistence function and no migration.

The id stays. `created_at` is not in the write. Kind stays `timed`. Label, purpose, title, Block Context, and Block Task change only when those existing controls change. `updateBlock` does not write `block_priority_service`, so a priority pair and its `established_at` stay with the same Block id. A Commitment update still restates `origin: user_created`.

A date-only save keeps the local start and local end. One Save may change the date and the clock together. A save that leaves the date alone is the previous clock edit. An overnight fact, end earlier than or equal to start, keeps those local times, so the continuation moves with the new `startsOn`. The unresolved-clock gate is asked of the draft date. It does not rewrite the clock. If it refuses, `update*` is not called.

## Capacity and viewpoint

A successful save still reloads through the existing token. Capacity is the next `projectCapacity` read of the reloaded rows. The old date loses that coverage. The new date gains it. `projectCapacity` was not edited.

Save does not call `onAnchor`. Question, anchor, and viewpoint provenance stay. The field stops painting the fact where it no longer intersects. If the reloaded models no longer contain the fact, the inspection closes instead of describing an empty fact. The viewpoint does not follow the fact.

If the writer throws, the reload token does not increment, the editor stays open, the draft stays, and the existing alert reports the failure.

## Excluded

All-day facts still have no Edit control and are not converted to timed. Work schedule inspection does not gain the date field. Task planned day, Task due day, Active Thread, Note, recurrence, and external calendar evidence are untouched. `/schedule` sections and `DayCanvas` are unchanged. Day canvas remains date-frozen.

No Task reopen, Task deletion, carry-forward, undo, reminder, copy-forward, drag, or calendar integration.

## Migrations

Zero.

## Acceptance

Accepted. Changing the civil date corrects the temporal placement of the existing timed fact. It does not create a replacement.

The accepted facts are timed Protected Time, timed Block, and timed Commitment. The same id, `created_at`, and timed kind stay. An untouched local clock stays. Date and clock may change in one Save. Overnight continuation stays. Block purpose, Context, Task, and priority-service relationships stay. Commitment provenance stays. Protected Time Capacity follows the existing reload. The viewpoint does not move. The fact leaves a reading that no longer contains it. A failed Save keeps the draft and the editor. All-day facts stay outside this edit.

Fact inspection is the authority. Present, Day, Week, Month, and the phone production reading use the same `FactDetail`. The edit form shows Date, Start, and End for an eligible timed fact. There is no Week-specific or Month-specific editor, and no second correction path.

Desktop physical inspection exercised the candidate. The Date authority was visible and usable, and the interaction looked and felt correct. Chrome responsive device mode inspected the mobile presentation and interaction. That form looked and felt correct. Automated phone production-path tests stay green.

A deployed Samsung device has not exercised this commit. Confirmation on that device may happen after deployment. It does not hold this tranche open.

The earlier missing-Date observation is recorded in [TIMED-FACT-CIVIL-DATE-CORRECTION-PHYSICAL-DIAGNOSTIC-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-PHYSICAL-DIAGNOSTIC-001.md). That session was executing a pre-candidate `FactDetail` module. No Week-specific defect existed.

Two later production-readiness observations stay parked and untouched: cross-client coherence, and the Android Work schedule analog clock. Neither is part of this correction.
