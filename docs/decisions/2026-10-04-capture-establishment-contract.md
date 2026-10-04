# CAPTURE-CONTRACT-001 — Capture establishment contract

Date: 2026-10-04.

Baseline: `954768025ca1725ce4771dbb4f6b2c46d81f12f7`.

## Decision

Human expression may become canonical truth only when the user explicitly establishes it.

The contract is:

```text
expression
  -> candidate understanding, or unresolved meaning
  -> explicit human establishment, or none
  -> zero or one canonical fact
```

Expression is the text the human supplied. A candidate understanding is an optional proposal that the expression may support one existing canonical kind. Unresolved meaning is the legitimate result when no such proposal is warranted. Neither expression, nor a candidate, nor unresolved meaning is canonical truth.

The authority boundary is one explicit act. In that act the user names one canonical kind and authorizes one fact of that kind to be written. If the user does not take the act, no canonical fact exists.

One act authorizes one fact. A Note created by one act may later be cited by another act. That later act is separate, and it may authorize one further fact. An expression is not limited to a single fact for its whole life. It does not fan out into several facts in one act.

This decision does not implement a capture interaction, a parser, voice, or storage.

## Stages

Four ideas are distinct. Only the last is durable truth.

| Stage | What it is | Durability |
| --- | --- | --- |
| Expression | The text the human supplied, typed or already transcribed | Transient interaction evidence |
| Candidate understanding | A proposal of one canonical kind, or the absence of one | Transient. Non-authoritative |
| Establishment | The user's act of naming that kind and authorizing the write | The authority boundary. Not a stored primitive |
| Canonical fact | The Note, Task, or already-defined temporal fact that write creates | Persisted truth, in the table that fact already uses |

Expression, candidate understanding, and establishment are not domain primitives and are not rows. The day canvas already treats a selected span and an intended meaning as transient, and treats Save as the act that creates a Protected Time, a Block, or a Commitment. This contract uses that same separation for captured language.

## Expression

An expression is evidence presented while meaning is chosen. It is not a Note, a Task, a transcript record, or any other canonical fact. Typed text and text supplied by a speech adapter are the same expression once both are text. The capture mechanism is not part of the expression.

The expression exists as transient interaction state while the user is still choosing. That is the same class of retention as an unsaved Quick Capture draft and an unsaved temporal selection. Reload discards an unsaved Quick Capture draft. Abandoning a temporal selection discards it. The same rule applies here.

No product requirement proves that an interrupted capture must survive as durable truth. Operational voice needs the words to remain available until the user establishes or leaves. It does not require an inbox, a draft table, a transcript table, or a queue. If the interaction ends before establishment, losing the expression is acceptable, because no canonical fact was established.

## Candidate understanding

A candidate, when one exists, proposes exactly one canonical kind and the fields that kind already has. The kinds that may be proposed are Note, Task, Protected Time, Block, and Commitment. The proposal is not that fact.

A candidate has no canonical identity, no score, no rank, and no stored rationale. Selecting it, highlighting it, or leaving it visible does not write a row. It does not create a Task or a Note, reserve time, establish a Commitment, Protected Time, or Block, set Must Do, establish Priority, change the Active Thread, schedule anything, or create a reminder.

The product is not required to produce a candidate. Absence of a candidate is unresolved meaning. There is no Unresolved object to store.

A temporal proposal is compatible with this contract and is not authorized by it. Protected Time, a Block, and a Commitment keep the fields and the establishment path they already have. A phrase does not become a range, a purpose, a title, a recurrence, or an availability claim. No natural-language temporal rule is established.

## Unresolved meaning

Human expression may be ambiguous. The honest result is that the expression is not yet a canonical fact.

Unresolved meaning is that result. It is not a low confidence score, a threshold, a rank, an urgency, or an actionability judgment. It is not a Note and not a Task. Incomplete understanding may later be retained as a Note if the user establishes one. The product does not force that retention, and it does not force a Task.

## Establishment

The act that crosses the boundary names one kind and authorizes the write of one fact of that kind.

Evidence already in the product:

- On the day canvas, choosing protected time, a purpose, or a commitment is an intention. Save is the establishment. The intention is not temporal truth.
- On Quick Capture, the surface already means create a Task. Submitting that surface is the establishment. There is no second classification step.

On a general capture interaction, the surface has not already named a kind. Typing, editing, and the presence of a candidate are on the near side of the boundary. The establishment act itself names Note or Task and authorizes that write. One control may do both, because the required text is already the expression. A prior selection of a candidate is not a substitute for the act.

A temporal fact is established only when its already-required fields are present and the user authorizes that kind's existing write. This decision does not add a second way to manufacture those fields from a sentence.

## Note

A Note established from an expression uses the representation in [2026-10-04-note-representation.md](2026-10-04-note-representation.md): `id`, `content`, and `capturedAt`. No field is added.

`content` is the non-blank text the user retains in the establishment act. That text may be the expression, the expression after the user edited it, or candidate text the user accepts by establishing it. The act retains that text. An interpretation does not replace it.

`capturedAt` is the instant of that act: the instant the experience is retained as a Note. The act supplies it. It is not the earlier instant of typing or speech, not a transcription time, and not database insertion time. If the user edits before the act, the retained instant is still the act. If the write succeeds later, `capturedAt` remains the supplied instant. Expression time is not stored beside it.

[NOTE-STORAGE-001](../implementation/NOTE-STORAGE-001.md) already persists an established Note and does not read a clock. This decision names which instant the caller supplies. It does not add a Note surface.

## Task

A Task still means action is required. The user establishes that they are responsible to execute it. Imperative or action-suggestive wording does not.

A Task established from a general capture expression is an ordinary Task. The title is the non-blank text the user establishes as the action. Origin stays `user_created`. Context, planned day, due day, and Must Do stay at their existing defaults unless the user sets them by an explicit control that already means those fields. A candidate does not fill them from language. The Task stays open. The act does not start the Active Thread and does not create a Block, Commitment, Protected Time, plan, or reminder.

Direct establishment is legitimate. The expression does not have to become a Note first.

## Provenance

When the user first establishes a Note, and later establishes a Task, Protected Time, Block, or Commitment from that Note, the later fact cites the Note. The citation is the optional reference already decided on the derived fact. That reference is still not a column.

When the user establishes a fact directly from transient expression, no Note is created to hold provenance. The reference stays absent. Every capture does not create a Note. The path expression, then Note, then Task is not required.

## Quick Capture

Quick Capture remains a specialized shortcut. The user entered a surface whose meaning is already create a Task. Submission still establishes an ordinary Task and still does not establish a Note. This decision does not change that surface, its session draft, or its write path. The record remains [2026-10-03-quick-capture.md](2026-10-03-quick-capture.md).

A general capture interaction is the case where the supplied text has not already been given a kind by the surface. Quick Capture is not that case.

## Interpretation

Inside this product, interpretation is user-directed structural choice, plus validation of shapes that are already established.

Deterministic code may keep the supplied text, reject a blank Note or a blank Task title by the existing rules, and present the explicit outcomes: establish a Note, establish a Task, or establish nothing. It may also pass a temporal fact through that fact's existing write when the required fields were collected by the path already decided for that fact.

No capture grammar is established. Deterministic code does not assign Note or Task from wording, and it does not read a date, a time, a reminder, Must Do, Context, Priority, or a temporal range out of an expression.

Runtime intelligence stays deterministic. AI, LLM, ML, and agentic inference stay outside the canonical runtime. This decision does not authorize a model, a parser, a speech provider, or an interpretation interface. [2026-10-02-deterministic-intelligence.md](2026-10-02-deterministic-intelligence.md) is unchanged in that constraint.

A later decision could authorize a bounded proposer outside that runtime. If it does, the proposer may supply a candidate understanding and nothing else. The proposal stays inspectable as a proposal. It does not cross establishment. Private reasoning, embeddings, and model confidence are not retained and are not authority. Canonical authority does not depend on that proposer existing.

## Voice

Voice remains downstream. This decision does not design it and does not choose a provider.

The stages separate as follows.

| Stage | Boundary |
| --- | --- |
| Speech capture | Outside the domain. An adapter may exist later. None is chosen. |
| Transcription | Outside the domain. It may produce text, or it may fail. The text has no canonical authority because a speech service produced it. |
| Expression | Inside the product. Typed text and transcribed text are the same evidence. |
| Candidate understanding | Inside the product, as transient non-authoritative state. |
| Establishment | Inside the product. The human authority boundary. |
| Canonical fact | An existing Note, Task, or temporal fact. |

Typed and spoken input become identical at expression. Before that point they are different transports. After that point the domain does not record which transport was used. There is no VoiceNote, VoiceTask, spoken origin, or provider-specific Note or Task.

Speech itself establishes neither a Task nor a Note. A transcription failure produces no expression and no canonical fact.

Voice must not be the first implementation of this contract. A typed interaction proves it first. Voice, when it is later designed, reuses the proved act.

## Failure and abandonment

| What happened | Canonical result |
| --- | --- |
| No useful candidate can be proposed | Unresolved meaning. No fact. |
| The user edits the expression before establishment | The expression is the edited text. A candidate from the previous text has no authority. No fact. |
| The user cancels or abandons the interaction | No fact. The transient expression is discarded. |
| The user establishes a fact and the write succeeds | That one fact exists. |
| The user establishes a fact and the write fails | No durable fact. The failure stays visible. The interaction keeps the authorized kind, the authorized text, and, for a Note, the supplied `capturedAt`, so the same act can be written again. No queue is created. Leaving or reloading discards that transient authorization, and still no fact exists. |
| Transcription fails | No expression. No fact. |

An attempted write is not abandonment. Abandonment is the user leaving before a successful write. Neither one invents a stored capture result.

## Persistence

This contract adds no table and no column. A capture-result row, an inbox, a draft table, a transcript table, and an unprocessed queue are not required. Note, Task, Protected Time, Block, and Commitment keep their own storage. Expression and candidate understanding are not stored.

## Consequences

- The smallest next implementation is TYPED-GENERAL-CAPTURE-001. It proves this contract with typed input. It holds an expression as transient state. It does not classify the text. One explicit act establishes one Note through the existing Note write, with `content` equal to the text the user retains and `capturedAt` equal to the instant of the act, or establishes one Task through the existing Task write, with a non-blank title and the defaults used when no optional Task fields are set, and with no Note reference. The interaction can also end with no row. Quick Capture stays as it is. The tranche does not add voice, a parser, a provider, a table, a `note_id` column, Note editing, Note deletion, or a temporal reading of language.
- Voice stays unauthorized until that typed proof exists.
- Living statements that told the product to preserve a transcript, or to judge confidence, now mean this contract: the expression stays available during the interaction, unresolved meaning is legitimate, and the user establishes any fact.

## Rejected

A capture-result table, an inbox, a draft table, a transcript table, an unprocessed queue, confidence scores, probabilistic thresholds, hidden ranking, inferred urgency, actionability scores, chain-of-thought storage, embeddings as canonical meaning, model confidence as authority, behavioral inference, inferred Priority, inferred Must Do, automatic scheduling, automatic Context assignment, automatic Task creation from Note language or from imperative wording, a required expression-to-Note-to-Task path, VoiceNote, VoiceTask, a spoken Task origin, a typed Note ontology, and any speech or model provider.

## Unresolved

Note editing, deletion, and the rest of Note lifecycle. The visible form of the establishment act. Where a typed general-capture interaction sits. Speech capture, transcription, and any provider. Whether a later decision authorizes a bounded proposer. Any future deterministic grammar. How, if ever, language lawfully supplies the fields a temporal fact already requires. The column that cites an originating Note, which is added only by the tranche that first establishes a fact from a Note.

## Context

Notes can be stored and read. Quick Capture establishes a Task directly. The day canvas establishes a temporal fact only on Save. [DISCOVERY-CANON-001](../discovery/DISCOVERY-CANON-001.md) left the interpretation-result contract open and said candidates are proposals. Older ledgers said that uncertain speech keeps a transcript and that the product chooses when it is confident. Those sentences described a fallback. They did not establish a transcript store, a score, or a grammar. This record is the contract they were waiting on.

## Later

[../implementation/TYPED-GENERAL-CAPTURE-001.md](../implementation/TYPED-GENERAL-CAPTURE-001.md) proves this contract with typed input. The surface is provisional, on Tasks, below Quick Capture. It establishes one Note, one Task, or nothing. It does not classify text, add storage, or implement voice. Final placement and final wording remain open. Note lifecycle remains unresolved. [../implementation/VOICE-PROBE-001A.md](../implementation/VOICE-PROBE-001A.md) shows that, on the primary phone, keyboard dictation supplies the same expression. Speech still establishes nothing by itself. No provider and no origin field were added.
