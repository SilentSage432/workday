# PROVENANCE-CONTRACT-001 — Establishment from retained experience

Date: 2026-10-04.

Baseline: `5980d86befae140b369a6d2437810e485e611b9a`.

## Decision

Provenance records the source relationship of an explicitly established fact. It does not determine the meaning of the source.

A retained Note may be referred to by the human. While referring to that Note, the human may explicitly establish a new Task. If the human explicitly establishes that Task from the retained experience, the Task may record the originating Note as provenance.

The relationship is:

```text
retained experience
  -> human reference
  -> human understanding
  -> explicit establishment of a new Task
  -> the Task cites the originating Note
```

The relationship is not a Note becoming another fact. The Note remains intact.

This record does not implement that relationship. It does not add a column, a table, or a surface.

## Reference and provenance

Reference and provenance are different.

Reference means the human is referring to this retained experience. [2026-10-04-note-revisit.md](2026-10-04-note-revisit.md) already gives reference that meaning. Reference is transient. It establishes nothing, creates nothing, and mutates nothing. It assigns no meaning, creates no provenance record, and does not establish responsibility or temporal meaning. Opening, selecting, or otherwise referring to a Note does not create provenance.

Provenance means this explicitly established fact was established from this retained experience. Provenance becomes true only as part of the explicit establishment of the new fact.

## Human authority

The source Note does not authorize the new fact. The Note's wording does not authorize it. Orient does not infer establishment because Note text appears actionable.

"Reminder to check the department" remains only a Note unless the human explicitly establishes a Task.

The system does not infer a Task, responsibility, Must Do, Priority, urgency, a due date, a planned date, a Context, temporal placement, the Active Thread, a reminder, a Commitment, a Block, or Protected Time from a Note.

Human establishment remains the authority boundary. The new Task is authorized only by the human's explicit establishment of that Task, under the Task contract that already exists.

## Independence

The new Task is independently canonical. Its identity and meaning come from Task establishment. The source Note does not become the Task. The source Note does not lose its identity. The source Note remains revisitable after the Task is established. The Task's lifecycle is independent of the Note's lifecycle.

This record does not decide Note edit, delete, or archive. It does not decide what a future Note deletion would do to a citing Task.

## Direction

Provenance direction is:

```text
established Task -> originating Note
```

The relationship answers where this established Task came from. The Note does not own a list of derived facts. There is no bidirectional relationship graph. The Note is not a project, a container, or a parent.

One Note may still be cited by more than one Task. Each citation belongs to that Task. The Note does not collect them.

## Cardinality

A newly established Task has zero or one originating Note.

That is the cardinality already required by [2026-10-04-note-representation.md](2026-10-04-note-representation.md): at most one originating Note, absent when the fact was established directly. No established requirement needs more than one source Note on one fact. This record does not authorize multiple source Notes, Note chains, fact-to-fact provenance, an arbitrary source graph, or a generic many-to-many relationship.

Absence of an originating Note means only that no originating Note was explicitly established as provenance for this Task. It does not mean the Task had no inspiration, context, history, or external cause.

## Eligible fact

The eligible fact is a Task.

Evidence already in canon:

- [PRODUCT.md](../../PRODUCT.md) already says the user may later establish a Task from a Note only by explicit intent, and that the Note is not replaced.
- [2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md) already says one explicit act establishes one ordinary Task. The title is the non-blank text the human establishes as the action. Origin stays `user_created`. Context, planned day, due day, and Must Do stay at their existing defaults unless the human sets them by an explicit control that already means those fields. The act does not start the Active Thread and does not create a Block, a Commitment, or Protected Time.
- A Task's required field is that human-established title. The Note does not have to supply it. The human can establish the Task under that existing boundary while referring to the Note.

[2026-10-04-note-representation.md](2026-10-04-note-representation.md) also names Protected Time, Block, and Commitment as fact kinds that can hold an optional reference, because each already has a table. [2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md) says that if the user later establishes one of those from a Note, the later fact cites the Note. The same contract says a phrase does not become a range, a purpose, a title, or an availability claim, and it leaves unresolved how, if ever, language lawfully supplies the fields a temporal fact already requires.

Those three kinds are not eligible here.

- Protected Time is established from a selected range by the existing Save. The range is required. A Note has no range.
- A Block is established from a selected range and a purpose by the existing Save. The range is required. Context is not inferred.
- A Commitment is established from a selected range and a title by the existing Save. The range is required. Its `origin` stays the authority field it already is.

Their establishment paths begin from selected time, not from reference to a retained Note. Naming them as possible carriers was structural. It is not a completed human-establishment path from retained experience. This contract does not authorize Note provenance on Protected Time, a Block, or a Commitment. A later decision would be required before one of those facts cites a Note.

The same refusal covers Active Thread, Today, Current Temporal Orientation, present-moment orientation, Timeline, Capacity, Pulse, Priority, Destination, Context, and Cadence. They are not independently created facts for which Note-origin provenance is already established. This record does not add them for symmetry.

## Content

The Note preserves the original retained experience. The human may understand or express the Task differently. Provenance identifies the source. It does not imply that the Task title equals the Note content, that the two mean the same thing, that text was extracted from the Note, or that Task fields were filled from the Note.

A future scaffold may not prefill candidate text from the Note under this record. That is an interaction question, and it is not authorized here.

## Origin and provenance

`origin` and Note provenance are different, and this record does not rename `origin`.

On a Task, `origin` is `user_created`. [DATA-001](../data/DATA-001.md) and [2026-10-02-context-and-task-storage.md](2026-10-02-context-and-task-storage.md) use that value for a Task the human established in this application. The check constraint allows only that value. A recurring definition or an external authority may later be a different origin. Neither exists now. [ARCHITECTURE-001](../architecture/ARCHITECTURE-001.md) uses `origin` for which authority a fact comes from.

On a Commitment, `origin` is the same kind of field. A Commitment entered here is `user_created`. An external source, if one is later connected, would keep authority over what this application may edit or delete. [DOMAIN.md](../../DOMAIN.md) states that. Timeline `sourceKind` is not that field. It names which primitive a projected fact came from.

Note provenance is informational source. It answers which retained experience the human explicitly established this Task from. It does not say who holds authority over the Task. A Task established from a Note remains `user_created`. "Converted from a note" is not an origin value. The optional reference on the Task is the source. It is not a second authority.

Protected Time and a Block do not have an `origin` field. This record does not add one.

## Atomicity

If the human authorizes establishment of a Task with an originating Note, the canonical result includes both the Task and that provenance relationship. The system must not tell the human that a sourced Task was established if the Task persisted and the authorized provenance did not.

If establishment fails, the Note is unchanged. Its identity, content, and `capturedAt` stay as they were. The failure does not edit, delete, archive, or consume the Note.

A Task established with no originating Note is a complete success. Missing provenance in that case means the human did not establish a source Note. It does not mean the write failed.

This record states that semantic atomicity. It does not choose a SQL mechanism.

## Revisit after establishment

The originating Note remains revisitable after the Task is established. Later revisiting the Note does not mean the Task is active, does not mean the Task is incomplete, does not mean the Note was consumed, does not mean the Note was resolved, and does not change the Note's meaning.

The Note does not gain a derived-fact collection.

## No conversion

The act is establishment of a new Task from a retained experience, with the Task citing the originating Note.

This record rejects convert-to-Task, turn-into-Task, promote, move-to-Tasks, consume, and resolve-by-creating-a-Task. Those formulations make the Note into something else. Older records that used "conversion" for the explicit act are superseded in that wording. They remain historical. The Note stays a Note.

No final button copy is chosen.

## Interaction

The semantic interaction is:

1. The human refers to a retained Note.
2. The human deliberately chooses to establish a Task from that retained experience.
3. The human establishes the Task under the existing Task authority boundary.
4. The resulting Task records the originating Note as provenance.

The physical interaction remains an experience question. This record does not choose a button, menu, gesture, drawer, sheet, modal, long press, swipe, drag, desktop arrangement, phone arrangement, glass treatment, animation, or icon.

## Storage

This record adds no `note_id`, foreign key, provenance table, source table, relationship graph, migration, SQL, or persistence method.

The representation a later storage tranche can implement without reopening these semantics is the one [2026-10-04-note-representation.md](2026-10-04-note-representation.md) already stated, narrowed to the eligible fact: an optional reference on the Task to one Note owned by the same user, absent when the Task was established directly. The reference is not an `origin` value. The Note does not store the Task id. The first storage of that reference still must not cascade into the Task and must not clear itself if a Note disappears. Note deletion remains undecided, and account removal remains the existing account rule. Those storage constraints are already recorded. This contract does not apply them, and it does not place the reference on Protected Time, a Block, or a Commitment.

## Operational adoption

[2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md) records the closure:

- Provenance semantics are resolved.
- Provenance storage is unimplemented.
- Provenance runtime is unimplemented.
- The provenance interaction is unresolved until implementation and experience work.
- Provenance is not a completed production capability.
- Notes are not fully closed for operational adoption.
- Note edit, delete, and archive stay outside that boundary. Their semantics stay undecided.

## Context

NOTE-REVISIT-001A left one Note-related semantic blocker: how the human explicitly establishes that a retained experience is the source of a new fact. Reference alone established nothing. The Note had to remain intact. Destructive conversion was already forbidden. The optional reference on a derived fact was already the representation, and it was not stored.

The audit before this record found no material contradiction with those constraints. The earlier naming of four fact kinds is preserved above and is not treated as eligibility.

## Consequences

- Living product statements point here for establishment from a retained Note.
- No application behavior, schema, migration, dependency, or visual design follows from this file.
- A later storage tranche can add the optional reference on a Task without reopening this relationship.
- That tranche is not authorized here.

## Rejected

Destructive Note-to-Task conversion. Inference of a Task or of any other fact from Note wording. Multiple source Notes on one fact. Fact-to-fact provenance. A source graph. A list of derived facts on the Note. Using `origin` as the Note citation. Text equality between Note and Task. Prefill from Note content. Note provenance on Protected Time, a Block, a Commitment, or any non-Task object named above. A chosen interaction. A column or a migration.

## Unresolved

The physical interaction. Whether any later experience offers text before the human establishes the Task. Note edit, delete, archive, and any effect of a future Note deletion on a citing Task. Note provenance for any fact other than a Task.

## Later

[../implementation/PROVENANCE-001.md](../implementation/PROVENANCE-001.md) stores the relationship as nullable `tasks.originating_note_id`, one insert with the Task, and a same-owner foreign key that does not cascade or clear. The scaffold control is "Establish a task from this", with an empty title. PROVENANCE-001A records that the committed migration was applied to `ksmhgaamyheyhefbyglb` and that the Samsung Galaxy S26 Ultra accepted the scaffold. The physical interaction remains unresolved. Note deletion remains unresolved.
