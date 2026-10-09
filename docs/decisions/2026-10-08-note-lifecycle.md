# NOTE-LIFECYCLE-CONTRACT-001 — Retire and Delete for retained Notes

Date: 2026-10-08.

Baseline: `b69bcf9765e3caadc3c1b283f0a1b6df937ab6b9`.

Discovery: NOTE-LIFECYCLE-DISCOVERY-001 verdict **NOTE-LIFECYCLE-FOUNDATION-CLEAR**.

## Decision

A Note remains retained experience: `id`, `content`, `capturedAt`, and now lifecycle field `retiredAt`.

A Note is not a Task, not an obligation, not a completion-bearing object, not a timeline allocation, and not an archive product.

Exactly two lifecycle actions are authorized:

### Retire

Claim: this Note existed and was valid, but it no longer belongs in current operational Notes.

`retiredAt` records the retirement instant. The row remains. Content and `capturedAt` are unchanged. Task provenance citations remain unchanged.

### Delete

Claim: this Note should not exist in the Orient record.

Delete is hard deletion. It is irreversible. It requires confirmation.

## Current Notes

Operational Notes means `retiredAt === null` / `retired_at IS NULL`.

LOOK → Notes reads only that filtered complete collection.

## Provenance

`tasks.originating_note_id` → `notes (id, user_id)` remains `ON DELETE NO ACTION`.

Delete of a cited Note fails. The failure is mapped to honest application meaning: the Note is retained because a Task was established from it; Retire remains available. Citations are not cleared. Delete is not silently converted into Retire.

## Deferred and rejected

Edit remains deferred.

Rejected: Complete, Dismiss, Hide, Forget, Remove as euphemism, Archive browsing, Unretire UI in this contract's first implementation, folders, tags, search, rich text, swipe-only lifecycle gestures, Notes Class-A realtime.

## Cross-client

Notes remain outside Class-A realtime. Notes load on LOOK → Notes entry. Local lifecycle actions update local Notes truth. Another client observes authoritative state on its next Notes read.

## Consequences

- Implementation tranche [../implementation/NOTE-LIFECYCLE-001.md](../implementation/NOTE-LIFECYCLE-001.md) stores `retired_at`, grants owner `UPDATE (retired_at)` and `DELETE`, implements `retireNote` / `deleteNote`, and exposes Retire and Delete on LOOK → Notes.
- Prior representation and revisit decisions remain true for meaning and return. Their unresolved lifecycle statements are superseded here for Retire and Delete.
