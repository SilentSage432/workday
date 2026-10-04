# Quick capture

Date: 2026-10-03.

## Decision

Typed capture creates an ordinary Task. The only required field is a non-blank title.

Context, planned day, due day, and Must Do stay optional. They are written only when the user sets them. The defaults remain null, null, null, and false. Origin remains `user_created`. The Task stays open.

Capture does not establish, replace, clear, or complete the Active Thread. Capture does not plan the Task for Today, attach it to the current Block, or create a Block, Commitment, or Protected Time.

The title field is the resting state on Tasks and on Schedule. One capture session, held for the signed-in browser session, is shared by both. Success clears that draft and leaves the field ready for another title. Failure keeps the draft. Reload still discards an unsaved draft. There is no second capture table and no capture flag on Task.

`newTaskFromCapture` followed by `createTask` is the submission boundary. A future deterministic voice parser can produce the same draft. This decision does not choose a parser, a microphone, or a grammar.

Notes, and the choice between a Note and a Task, stay unresolved. Every save in this tranche is a Task because the user is using Task capture.

## Context

The existing capture already created a normal Task, but the title was behind a closed control, and Schedule had no way to save a thought without leaving the day.

Current temporal orientation can say what contains the present instant. That reading does not decide what a new Task is for.

## Consequences

- Tasks shows the title before Resume. Schedule shows the same control and does not change the selected day or the temporal selection.
- Enter submits the form when the title is non-blank. A save already in flight is ignored. The field is disabled while that save runs.
- happy-dom does not prove the phone keyboard. The phone procedure is the check for that.

The implementation record is [../implementation/V0-017.md](../implementation/V0-017.md).
