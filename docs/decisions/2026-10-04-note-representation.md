# NOTE-REPRESENTATION-001 — Minimum Note representation

Date: 2026-10-04.

Baseline: `54f46edb50a73da3d75ef6f1d3d5300a4ac3aa4c`.

## Decision

A Note is still the retained fragment of experience defined in [DISCOVERY-CANON-001](../discovery/DISCOVERY-CANON-001.md). This record decides only the smallest representation of that meaning. It does not store a Note, and it does not change capture.

### Domain

A Note is:

| Field | Meaning |
| --- | --- |
| `id` | Stable identity. The same Note remains after zero, one, or many later facts are established from it. |
| `content` | The retained experience, as one non-blank text. |
| `capturedAt` | The instant the experience was retained. |

`content` is required. Blank text retains nothing. No separate title is established. No length limit is established. The 80-character limit on a Block purpose or a Commitment title is a label on a temporal fact. It is not evidence about a retained experience.

`capturedAt` is an instant. It is not a civil day, not `planned_on`, not `due_on`, and not a temporal allocation. Capture time means when the experience was retained. It does not mean when something should happen, and it does not mean when an observed event occurred.

`capturedAt` is domain truth, not a substitute for row-insert time. Those instants can diverge when establishment and persistence are not the same moment. A database `created_at` does not carry this meaning, so it is not the representation. The establishment action supplies the instant, as an Active Thread supplies `established_at`.

The domain type does not include `user_id`.

### Persistence and security

A future `notes` row, when a storage tranche adds it, is:

| Column | Role |
| --- | --- |
| `id` | Primary key. `uuid`. |
| `user_id` | Owner. Not part of the conceptual Note. Required for the existing single-user row-level security rule: the signed-in user may access only rows whose `user_id` is `auth.uid()`. The application writes it from the session. |
| `content` | The domain text. Not null. Non-blank after trim, by the same honesty as a Task title. No maximum. |
| `captured_at` | The domain instant. `timestamptz`. Not null. No civil date. Not defaulted in place of the supplied instant. |

`(id, user_id)` is unique so a later fact can reference both, as a Task already can.

There is no `created_at`. Insert time is not the retained instant. There is no second timestamp to drift from `captured_at`.

Deleting the auth user removes that user's rows, as it does for every current application table. That account rule is not a Note lifecycle operation.

### Establishment

A stored Note is what the user established. Interpretation may propose structure. It does not insert a Note. A candidate, a transcript, a confidence score, and model reasoning are not columns.

No origin value is stored. Task and Commitment use `origin` because an external authority may later own a fact and limit what this application may change. No external Note authority is established. Typed entry and a future spoken entry are capture mechanisms. They are not different kinds of Note, and they are not providers. A voice-established Note is the same Note as a typed one. Provider names, devices, and transcription engines do not belong on it.

If a later source must keep authority over a Note, that is a new decision. It is not created here by copying `user_created` onto a column that can hold only one value.

### Provenance to a later fact

The Note does not list, own, or contain the facts established from it. It stays independently intact when it supports none of them, one of them, or many of them.

The relationship in canon is singular in the other direction: an established fact originated from one Note, when such a relationship exists. The smallest structure that can say that, and can be enforced, is an optional reference on the derived fact:

- same owner, `(note_id, user_id)` referencing `notes (id, user_id)`;
- null when the fact was established directly;
- at most one originating Note.

Task, Protected Time, Block, and Commitment are the established fact kinds that can carry it. Each already has its own table. A future stored fact kind can carry the same optional reference when that kind is stored. That is not a registry and not a graph.

A generic `(fact_kind, fact_id)` table cannot enforce those foreign keys. A join table with one nullable key per fact kind repeats the same reference and adds an entity the domain does not have. Putting the fact ids on the Note would make the Note own the derived facts and would mix kinds in one place. None of those is the representation.

The reference is not an `origin` value. A Task the user establishes from a Note remains `user_created`. "Converted from a note" is not a second authority. [ARCHITECTURE-001](../architecture/ARCHITECTURE-001.md) sketched that origin list and a source note id. [DISCOVERY-CANON-001](../discovery/DISCOVERY-CANON-001.md) already said the sketch was not the decision. The sketch's "converted from a note" origin is superseded here. The optional reference is the part of the sketch that remains.

Note deletion is not a product operation. The reference must not cascade into the derived fact, and it must not clear itself when a Note disappears. Those outcomes would either destroy the fact or destroy the inspectable relationship. Both are unauthorized. The storage that first adds the reference uses restrict / no action toward the Note. Account removal still has to delete the user's rows; that mechanism must not become a user-facing delete of a Note.

Quick Capture is unchanged. It still creates a Task with no Note reference. Existing Tasks are not reinterpreted as Notes.

### Context

A Note is not required to belong to a Context. Requiring one would reject incomplete understanding, which is legitimate information. Unassigned Notes stay valid.

Whether a Note may belong to one Context, to more than one, or span Contexts is the same open membership question already recorded for a Task or a Note. Contexts can give a retained experience a particular meaning. That sentence does not establish a foreign key. This decision does not add `context_id`.

### Lifecycle left unresolved

Representation stores the retained experience. It does not decide what may later be done to it.

Unresolved, and not implied by this record:

- whether content may be edited;
- if it may, whether an edit rewrites the retained experience that later facts cite;
- whether an earlier wording must be kept;
- whether the user can delete or archive a Note;
- any status, version history, or immutability rule.

No update path and no delete path are authorized. Immutability is not decided either. The single `content` field is the retained experience as established. It is not a history log.

## Context

Operational adoption requires Notes. Their meaning is settled. Voice was still waiting on a capture-result contract. That contract needed a Note to exist as a determinate thing, and it needed to know where a later fact records the Note it came from. Those two questions are the ones this record answers. [2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md) is the later contract.

[DATA-001](../data/DATA-001.md) stores no Note. [2026-10-03-quick-capture.md](2026-10-03-quick-capture.md) still creates only a Task.

## Consequences

- The next implementation tranche, NOTE-STORAGE-001, can create and read a Note without guessing edit, delete, Context, capture choice, or voice.
- That tranche is storage only: the domain type, the `notes` row above, create, and read. It does not change Quick Capture, does not add Note interface, and does not add `note_id` to fact tables. Nothing can yet establish a fact from a Note, and zero later facts is already valid.
- The tranche that first lets the user establish a Task, Protected Time, Block, or Commitment from a Note adds the optional reference on that fact. It does not add a list to the Note, and it does not widen `origin`.
- Candidates, confirmation, and an unestablished expression are not Note columns. [2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md) decides them and adds no Note field.
- A spoken Note, once the user establishes it, uses this same representation.

## Later

[2026-10-04-capture-establishment-contract.md](2026-10-04-capture-establishment-contract.md) applies this representation to general capture. `capturedAt` is the instant the user establishes the Note. An expression and a candidate remain outside the Note. Neither is a column. [../implementation/TYPED-GENERAL-CAPTURE-001.md](../implementation/TYPED-GENERAL-CAPTURE-001.md) establishes that Note from typed expression and supplies the existing `id` on insert. It does not add a field, a lifecycle, or a Notes management surface. [2026-10-04-note-revisit.md](2026-10-04-note-revisit.md) decides that an established Note stays revisitable through Capture. It adds no field. It does not decide edit, delete, archive, or immutability. Those three operations are outside operational adoption until a later decision. That placement does not make a Note immutable or undeletable. [2026-10-04-provenance-contract.md](2026-10-04-provenance-contract.md) decides the establishment relationship. The eligible fact is a Task. The optional reference stays on that Task, not on the Note, and it is still not a column. Protected Time, a Block, and a Commitment do not receive that relationship from the later contract. This record's naming of those three carriers stays historical.

## Rejected

Title plus body, folders, notebooks, tags, categories, status, priority, due, planned day, reminder, temporal allocation, attachments, formatting, checklists, embeddings, confidence, model reasoning, inferred action, interpretation state, capture-mechanism origin, provider identity, sharing, assignees, roles, a provenance event log, and a generic fact graph.
