# TASK-COMPLETION-CORRECTION-ACCEPTANCE-001 — truthful Task reopen

Task completion correction — physically accepted.

Accepted candidate: `6cb0dac37806b3483d809967e80d314754c4e8b7`.

Implementation record: [TASK-COMPLETION-CORRECTION-001.md](TASK-COMPLETION-CORRECTION-001.md).  
Semantic discovery: [TASK-COMPLETION-CORRECTION-DISCOVERY-001.md](TASK-COMPLETION-CORRECTION-DISCOVERY-001.md).

## Physical acceptance

Production `/` was exercised through the real interface.

Observed sequence:

1. An open Task was established as the Active Thread.
2. Complete was invoked.
3. The Task completed.
4. Active Thread cleared.
5. The bounded **Still open** correction affordance appeared.
6. Still open was invoked.
7. The **same** canonical Task returned to open state.
8. Active Thread remained empty.
9. No automatic intention restoration occurred.

The human interaction was accepted as working correctly.

## Locked semantic

| Act | Meaning |
| --- | --- |
| Complete | “This Task is done.” |
| Still open / Reopen | “That completion was wrong; this Task is open.” |
| Start | “This is what I am doing now.” |

These remain independent human authorities.

Reopen corrects completion only (`completed_at` → null on the same Task row). It must not imply or restore Active Thread. Start remains a separate explicit act.

## Boundary

No migration. No ACT / action-list surface. No mobile bottom reorganization. No completed-task archive. No undo stack. `TaskPatch` / `updateTask` still do not mutate completion.

TASK-COMPLETION-CORRECTION-001 is therefore **physically accepted**.
