# TASK-EDIT-001 — Edit established Task fields

Date: 2026-10-04.

Baseline: `3b27d499301857a35a2b7a4b165770229aaea1bd`.

## Authorized fields

An open Task can be edited on Resume, Today, and the open-task list. The editable fields are the ones `TaskPatch` already accepts:

- title
- optional Context
- planned day
- due day
- Must Do

Save sends those five fields through the existing `updateTask`. The Task id does not change. Completion, origin, and creation time are not part of the edit.

## Save and Cancel

The draft is transient UI state. Canonical Task truth stays as loaded until Save.

Save validates the draft, then calls `updateTask`. A successful result replaces that Task in the open collection. Today and Resume read that collection; they do not keep a second copy of the Task.

Cancel discards the draft and writes nothing.

While a draft is open, another edit waits. Plan, remove-from-Today, and Complete wait on the Task being edited, so those writes cannot replace the draft or be overwritten by Save. Leaving or starting a thread is unchanged.

## Validation

The title is required. A blank title is not written. A planned day and a due day are civil dates or empty. Empty clears that day. A time-of-day value is rejected by the existing date mapping. Context is one of the loaded Contexts, or none.

## Today

Today remains the open Tasks whose `plannedOn` is the confirmed civil date. Setting, changing, or clearing `plannedOn` changes that membership. Changing `plannedOn` does not change `dueOn`. Changing `dueOn` does not change `plannedOn`. This is not a reschedule operation and does not carry a Task forward.

## Active Thread

Editing the referenced Task does not establish, clear, or replace the Active Thread. Resume reads the Task from the open collection, so a successful Save shows the updated title, Context, planned day, due day, and Must Do on that same thread.

## Failure

A rejected update leaves the draft in place and says the Task is unchanged. The edited values are not shown as established Task truth. Save can be tried again. Cancel can still discard the draft.

## Tests

`domain/taskEdit.test.ts` covers the draft and the patch, including title, Context, independent planned and due days, and Must Do. `components/taskEdit.test.tsx` covers the edit surface, Cancel, a failed Save, Today membership, the Active Thread, Resume, completion, and the unchanged capture and complete-read paths.

## Exclusions

No schema, migration, or dependency. No Task deletion, reopen, reschedule, or carry-forward. No Note, voice, Destination, Priority, current Context, NOW, Week, Month, recurrence, reminder, Pulse, Capacity, calendar, ranking, or visual redesign. No second Active Thread.
