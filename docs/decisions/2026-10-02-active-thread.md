# Active Thread storage

Date: 2026-10-02.

## Decision

V0 stores at most one Active Thread per user.

The row records the owning user, the referenced Task, and the instant the user explicitly established that thread. The primary key is `user_id`, so a second current thread cannot be inserted.

The Task reference is a foreign key on `(task_id, user_id)` to `tasks(id, user_id)`. A thread cannot point at another user's Task.

The referenced Task must be open. A before-insert-or-update trigger rejects a completed Task. Completing that Task deletes the thread row in the same transaction, through an after-update trigger on `tasks.completed_at`. The Task itself is not deleted.

Clearing the thread deletes the row. The Task stays open. Replacing the thread updates the same row. The previous Task stays open. No interruption history is stored.

Resume is not stored. It is the projection in `projections/resume.ts`.

Capture, MUST DO, a planned day, and a due date do not write this row. V0 does not retain a suspended thread for another Context.

## Context

The product already said the user establishes the thread, and that completion or explicit abandonment removes it from Resume. It had not chosen the action, the fate of the previous Task, or the storage shape. ARCHITECTURE-001 named one current thread and a composite-ownership pattern. DATA-001 used that pattern for Task and Context.

A separate active flag on Task would let several Tasks look current. A history table would record interruptions the product does not ask the user to explain. A nullable `task_id` on a profile would not exist yet, and it would mix the thread with account settings.

## Consequences

- The visible action that establishes the thread is Start, on an open Task.
- The visible action that clears it without completing the Task is Leave thread.
- Switching is another Start. The previous Task remains open.
- Completion consistency does not depend on the screen clearing its own pointer. The database removes the row before the completion update commits.
- If the open-task list no longer contains the referenced Task, Resume is absent even if a stale pointer were still in memory.
- Whether a later version should keep a suspended thread per Context stays open. V0 does not.

The schema and the live checks are in [../implementation/V0-002.md](../implementation/V0-002.md).
