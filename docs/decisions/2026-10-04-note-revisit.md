# NOTE-REVISIT-CONTRACT-001 — Return to retained experience

Date: 2026-10-04.

Baseline: `8a40f665900c93d47fcee2e04269e7ca57abd28c`.

## Decision

A Note remains the retained fragment of experience already defined in [DOMAIN.md](../../DOMAIN.md) and [DISCOVERY-CANON-001](../discovery/DISCOVERY-CANON-001.md). This record does not change that definition.

That definition already holds that a Note preserves experience while understanding is being formed, and that it carries no inherent obligation. Incomplete understanding remains legitimate information. Canonical Note truth remains `id`, `content`, and `capturedAt`.

Revisit does not add meaning to the Note. It gives the human an earned way back to retained experience.

When the user explicitly establishes a Note, that retained experience remains directly revisitable. The conceptual Capture experience provides that access.

Capture is the place where an experience may be retained. It is also the place from which previously retained experience can be revisited.

That relationship is:

```text
Capture has memory.
```

The phrase names the relationship. It is not a domain object, a table, a column, or a second store.

This record does not establish a standalone Notes application. It does not implement a surface.

## Retained-experience collection

The way back exposes the complete canonical Note collection.

For each Note, what may be truthfully exposed is `content` and `capturedAt`.

The order is the retrieval order `loadNotes` already uses: `captured_at` ascending, then `id` ascending. The id remains the tie-break when two Notes share a capture instant. [NOTE-STORAGE-001](../implementation/NOTE-STORAGE-001.md) established that order. This record does not replace it.

No ordering by importance, relevance, a recency score, Context, inferred actionability, or urgency is established.

A complete empty collection means only that no Notes have been retained.

A failed or incomplete Note read is not that emptiness. The complete-read rule already in force stays in force. The collection is treated as complete only when the read reports the whole set. A short page, a missing count, a changed count, or a later-page failure remains a failed read. It must not be presented as an empty collection.

## Reference

Selecting or opening a retained Note means the human is referring to this retained experience.

That reference does not edit the Note, delete it, archive it, convert it into a Task, establish a Task, establish another fact, mark it important, make it current, establish the Active Thread, schedule it, assign a Context, establish Priority, or establish temporal meaning.

The reference may later be the interaction from which the user explicitly establishes another fact. That later act is not specified here and is not authorized here.

## Provenance

A later explicitly established fact may eventually cite an originating Note. The Note remains intact. The Note does not become the later fact. The Note does not list the facts derived from it.

The visible act that establishes a fact from a Note is not specified. Revisit comes first. Evidence from that return may inform the later contract. No `note_id` column is added. Provenance storage stays unimplemented.

## Edit, delete, and archive

Note editing is not required for operational adoption.

Note deletion is not required for operational adoption.

Archive is not required for operational adoption.

Those three remain outside the operational-adoption boundary until their semantics are independently established. This record does not decide those semantics. It does not make a Note permanently immutable, and it does not make a Note undeletable. It does not add an update path, a delete path, or an archive.

## Not a Notes application

Revisitability is an earned return through Capture to retained experience. It is not a Notes product.

This record does not require or introduce a standalone Notes application, Notes as a primary navigation destination, folders, notebooks, tags, search, archive, statuses, a title plus a body, Context membership, reminders on Notes, sorting controls, filtering controls, pinning, importance, AI interpretation, embeddings, a generic fact graph, or a destructive conversion of a Note into a Task.

The production experience may later choose a visual form. The semantic requirement is only the earned way back through Capture.

## Experience boundary

This record does not design the production interaction. It does not specify cards, drawers, sheets, tabs, buttons, icons, animations, glass, a desktop layout, or a phone layout.

"Through the conceptual Capture experience" is the semantic relationship. It is not a mandate for a particular component or screen.

A later scaffold may implement the smallest honest proof of this relationship. That proof would not be the final experience, and it would not start EXPERIENCE-001.

## Production classification

[2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md) records the closure:

- Note revisit semantics are resolved.
- Note revisit runtime is unimplemented.
- Note edit is not required for operational adoption.
- Note delete is not required for operational adoption.
- Note archive is not required for operational adoption.
- The provenance establishment act remains unresolved.
- Provenance storage and runtime remain unimplemented.
- Notes remain required retained experience. They are not a Notes application.

Unrelated production blockers stay where that contract already places them.

## Context

[VOICE-PROBE-001A](../implementation/VOICE-PROBE-001A.md) showed that a successful Note write can leave the retained experience with no earned way back. PRODUCTION-AUDIT-002 treated that absence as an operational-adoption blocker. The Note could be stored and completely read. The product had not said where the human returns to it.

[2026-10-04-note-representation.md](2026-10-04-note-representation.md) left edit, delete, archive, and immutability unresolved. This record answers only the return. It leaves those lifecycle questions unresolved, and it takes them out of the operational-adoption boundary.

## Consequences

- Living product statements point here for the return to a retained Note.
- No application behavior, schema, migration, dependency, grant, or visual design follows from this file.
- A later runtime proof, if one is authorized, uses `loadNotes` and does not add Note meaning.
- The act that establishes a later fact from a Note remains a separate decision.

## Rejected

A Notes application, a Notes navigation destination, folders, notebooks, tags, search, archive as a revisit feature, statuses, title plus body, Context on the Note, reminders on Notes, user-facing sort, user-facing filter, pinning, importance, recency as priority, relevance ranking, actionability ranking, urgency ranking, AI interpretation of the collection, embeddings, a generic fact graph, destructive Note-to-Task conversion, edit, delete, an immutability rule, a `note_id` column, and a designed production Capture.

## Unresolved

The visible act that establishes a later fact from a referred Note. The column that act would write. Whether content may be edited, and what an edit would mean for a fact that cites the Note. Whether the user can delete or archive a Note. Any status, version history, or immutability rule. The visual form of the return. Spatial continuity.
