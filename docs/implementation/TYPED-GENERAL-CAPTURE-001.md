# TYPED-GENERAL-CAPTURE-001 — Prove typed human establishment

Date: 2026-10-04.

Baseline: `932c828455b4ba01d0e4e1881d26ce3da6ea49fe`.

## What this proves

[../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md) is unchanged. This tranche proves it with typed input.

An expression stays transient until the user explicitly establishes one Note, one Task, or nothing. The tranche does not classify the text. It does not propose a candidate. It does not implement voice.

## Provisional surface

The access point is on Tasks, below Quick Capture. The resting control says "Hold an experience." That wording is provisional. It is not final navigation and not final copy. Schedule does not show it. Quick Capture stays the direct Task surface.

Leaving Tasks, reloading, or choosing Leave discards the expression. That loss is the legitimate outcome in which no fact was established.

## Expression

`domain/generalCapture.ts` holds the expression and, only after a failed Note write, the authorized Note retry. That state lives in the Tasks page component. It is not a domain primitive and it is not stored. Typing and editing call no persistence.

## Note

"Keep as a note" authorizes one Note.

The content is the expression at that act, including surrounding spaces when the text is not blank. Blank and whitespace-only text are rejected. The act reads the current instant and a new id only when this expression does not already have a failed Note authorization. `createNote` writes that id, that content, and that `capturedAt`. The id uses the existing uuid shape. The `notes.id` column already accepted a supplied uuid, so this tranche adds no migration. The database default remains unused by this write.

`capturedAt` is that act's instant. Opening the surface, typing, and rendering do not supply it.

One Note act does not create a Task.

## Failed Note retry

A failed `createNote` leaves no Note. The surface keeps the expression, the authorized id, and the authorized `capturedAt`, and shows the failure. Retrying that same expression writes the same id and the same `capturedAt`. The clock is not read again.

Editing the expression after that failure clears the authorized id and `capturedAt`. A later Note act is a new authorization, with a new id and a new instant. Changing the text and then restoring the earlier characters is still a new act, because the abandoned authorization was cleared at the edit. The abandoned attempt is not stored and has no history.

Leave, reload, and leaving Tasks also drop that transient authorization. No queue is created.

## Task

"This is a task" authorizes one ordinary Task through `taskFromExpression` and `createTask`.

The title is the expression, trimmed by the existing Task title rule. Context, planned day, due day, and Must Do stay unset: null, null, null, and false. Origin stays `user_created`. No Note is created. No Note reference is written. The Active Thread is unchanged. No time is allocated.

Task identity is still assigned inside the existing insert, by the database default. This tranche does not add a client Task id. A failed Task write keeps the expression and shows the failure. Retrying it is another insert through that same path. It does not fall back to a Note.

A successful Task is appended to the open-task collection already on the page, the same way Quick Capture reports a created Task.

## Nothing

Leave writes nothing. It clears the expression and any unpersisted Note authorization, then closes the surface. That is a successful outcome of the contract.

## Success

A successful Note or Task closes the surface and clears the expression. The Note is not shown in a list. This tranche does not add a Notes management surface.

## Exclusions

No interpretation, classification, candidate, confidence, runtime model, voice, microphone, transcript, provider, capture table, inbox, draft store, queue, Note editing, Note deletion, Note archive, Context on a Note, `note_id`, temporal parsing, reminder, recurrence, or change to Quick Capture.

## Tests

`domain/generalCapture.test.ts` covers the transient expression, blank rejection, the establishment instant, unchanged Note retry, a new attempt after an edit, Task defaults and `user_created`, and the unchanged Quick Capture, Note read, Task read, and temporal establishment paths.

`components/generalCapture.test.tsx` covers typing and editing without a write, one Note, one Task, Leave, a failed Note retry, a new Note after an edit, and a failed Task with no Note.

`persistence/note.test.ts` covers the caller-supplied Note id and `capturedAt` on insert.

## Later

[../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) decides the return to a retained Note through the conceptual Capture experience. [NOTE-REVISIT-001.md](NOTE-REVISIT-001.md) later shows that return inside this same surface. This tranche's own establishment behavior is unchanged, and it still does not add a Notes application.
